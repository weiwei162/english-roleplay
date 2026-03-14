// 火山 RTC 实时对话式 AI 服务端 v2
// 支持两种模式：
// 1. 端到端语音大模型（内置 ASR+LLM+TTS）
// 2. 自定义 ASR+LLM+TTS（百炼 Qwen + Edge TTS）

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const WebSocket = require('websocket');
const { VolcRTCClient, CHARACTER_PERSONAS } = require('./volc-rtc-client-v2');
const { synthesizeSpeech } = require('./tts-client');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ==================== HTTPS 配置 ====================

const USE_HTTPS = process.env.USE_HTTPS === 'true';
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT) || 3443;
const HTTP_PORT = parseInt(process.env.PORT) || 3000;

// AI 模式配置：'end-to-end' 或 'custom'
const AI_MODE = process.env.AI_MODE || 'end-to-end';

let server;
let wss;

if (USE_HTTPS) {
    const certPath = process.env.SSL_CERT_PATH || './ssl/cert.pem';
    const keyPath = process.env.SSL_KEY_PATH || './ssl/key.pem';
    
    let httpsOptions = {};
    
    try {
        if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
            httpsOptions = {
                cert: fs.readFileSync(certPath),
                key: fs.readFileSync(keyPath)
            };
            console.log('✅ HTTPS certificates loaded');
        } else {
            console.warn('⚠️  SSL certificates not found, generating self-signed...');
            const pems = require('crypto').generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
            });
            
            httpsOptions = {
                key: pems.privateKey,
                cert: pems.publicKey
            };
            
            const sslDir = path.dirname(certPath);
            if (!fs.existsSync(sslDir)) {
                fs.mkdirSync(sslDir, { recursive: true });
            }
            fs.writeFileSync(keyPath, pems.privateKey);
            fs.writeFileSync(certPath, pems.publicKey);
            console.log('✅ Self-signed certificates generated');
        }
        
        server = https.createServer(httpsOptions, app);
    } catch (error) {
        console.error('❌ Failed to setup HTTPS:', error.message);
        server = http.createServer(app);
    }
} else {
    server = http.createServer(app);
    console.log('🔓 HTTP mode');
}

wss = new WebSocketServer({ server });

// 会话存储
const sessions = new Map();

// RTC 客户端
const rtcClient = new VolcRTCClient({
    appId: process.env.VOLC_APP_ID,
    accessKey: process.env.VOLC_ACCESS_KEY,
    secretKey: process.env.VOLC_SECRET_KEY,
    region: 'cn-north-1'
});

// ==================== 服务前端静态文件 ====================

const frontendPath = path.join(__dirname, '..');
console.log('📁 Serving frontend from:', frontendPath);
console.log(`🤖 AI Mode: ${AI_MODE === 'end-to-end' ? '端到端模式' : '自定义模式'}`);

app.use(express.static(frontendPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

// 服务 uploads 目录（自定义模式用）
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 健康检查
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            rtc: process.env.VOLC_ACCESS_KEY ? 'configured' : 'not configured',
            bailian: process.env.DASHSCOPE_API_KEY ? 'configured' : 'not configured',
            aiMode: AI_MODE
        },
        activeSessions: sessions.size
    });
});

// SPA 路由支持
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

console.log('✅ Frontend configured');

// ==================== Token 生成 ====================

function generateRTCToken(roomId, uid = 'bot') {
    return rtcClient.generateToken(roomId, uid);
}

// ==================== 创建房间 ====================

app.post('/api/create-room', async (req, res) => {
    try {
        const { roomId, character } = req.body;
        
        if (!roomId) {
            return res.status(400).json({ error: 'roomId is required' });
        }
        
        const characterConfig = CHARACTER_PERSONAS[character || 'emma'];
        
        // 生成孩子的 Token
        const childToken = rtcClient.generateToken(roomId, 'child');
        
        let aiResult;
        
        if (AI_MODE === 'end-to-end') {
            // ========== 模式 1：端到端 ==========
            aiResult = await rtcClient.startVoiceChat({
                roomId,
                userId: `ai_${character || 'emma'}`,
                persona: characterConfig.persona,
                language: characterConfig.language,
                enableNoiseReduction: true,
                enableVAD: true
            });
        } else {
            // ========== 模式 2：自定义 ==========
            const callbackUrl = `${process.env.PUBLIC_URL || 'http://localhost:3000'}/api/asr-callback`;
            
            aiResult = await rtcClient.startVoiceChatCustom({
                roomId,
                userId: `ai_${character || 'emma'}`,
                asrLanguage: 'en-US',
                callbackUrl: callbackUrl,
                enableNoiseReduction: true,
                enableVAD: true
            });
        }
        
        console.log(`🏠 Room created: ${roomId}, AI TaskId: ${aiResult.TaskId}`);
        
        // 保存会话
        sessions.set(roomId, {
            character: character || 'emma',
            aiTaskId: aiResult.TaskId,
            aiMode: AI_MODE,
            createdAt: Date.now()
        });
        
        res.json({
            roomId,
            token: childToken,
            appId: process.env.VOLC_APP_ID,
            character: character || 'emma',
            aiTaskId: aiResult.TaskId,
            aiMode: AI_MODE
        });
    } catch (error) {
        console.error('❌ Create room error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== 自定义模式：ASR 回调处理 ====================

app.post('/api/asr-callback', async (req, res) => {
    const { RoomId, UserId, Text, Status } = req.body;
    
    console.log(`📝 [自定义] ASR Callback: Room ${RoomId}, User ${UserId}, Text: ${Text}`);
    
    if (Status === 'success' && Text) {
        await handleChildSpeechCustom(RoomId, Text, UserId);
    }
    
    res.json({ success: true });
});

// 自定义模式：处理孩子说话（ASR → Qwen → TTS → 推流）
async function handleChildSpeechCustom(roomId, text, userId) {
    const session = sessions.get(roomId);
    if (!session) {
        console.warn('⚠️ Session not found for room:', roomId);
        return;
    }
    
    console.log(`📝 [自定义] Child said: "${text}"`);
    
    try {
        // 1. 百炼 Qwen 生成回复
        const characterConfig = CHARACTER_PERSONAS[session.character];
        const messages = [
            { role: 'system', content: characterConfig.persona },
            { role: 'user', content: text }
        ];
        
        const reply = await callQwenAPI(messages, process.env.LLM_MODEL || 'qwen-plus');
        console.log(`🤖 [自定义] AI reply: "${reply.substring(0, 50)}..."`);
        
        // 2. Edge TTS 合成
        const ttsAudio = await synthesizeSpeech(reply, session.character);
        console.log(`🔊 [自定义] TTS generated: ${ttsAudio.length} bytes`);
        
        // 3. 保存音频文件
        const filename = `tts_${Date.now()}.mp3`;
        const filepath = path.join(__dirname, 'uploads', filename);
        fs.writeFileSync(filepath, ttsAudio);
        
        // 4. 获取可访问 URL
        const audioUrl = `${process.env.PUBLIC_URL || 'http://localhost:3000'}/uploads/${filename}`;
        
        // 5. 推送到 RTC 房间
        await rtcClient.pushAudioStream({
            roomId,
            userId: `ai_${session.character}`,
            audioUrl: audioUrl,
            duration: Math.ceil(ttsAudio.length / 16000 / 2) // 估算时长
        });
        
        console.log(`✅ [自定义] Response pushed to room ${roomId}`);
        
    } catch (error) {
        console.error('❌ [自定义] Error processing speech:', error);
    }
}

// 百炼 Qwen API 调用
async function callQwenAPI(messages, model = 'qwen-plus') {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    
    if (!apiKey) {
        throw new Error('DASHSCOPE_API_KEY not configured');
    }
    
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: messages
        })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Qwen API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

// ==================== 离开房间 ====================

app.post('/api/leave-room', async (req, res) => {
    try {
        const { roomId } = req.body;
        
        const session = sessions.get(roomId);
        if (session && session.aiTaskId) {
            await rtcClient.stopVoiceChat(session.aiTaskId);
            sessions.delete(roomId);
            console.log(`👋 Room ${roomId} closed`);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Leave room error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== WebSocket 实时通信 ====================

wss.on('connection', (ws, req) => {
    console.log('🔌 WebSocket client connected');

    let sessionId = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            // 初始化会话
            if (data.type === 'init') {
                sessionId = data.sessionId || 'session_' + Date.now();
                sessions.set(sessionId, { 
                    messages: [], 
                    ws: ws,
                    character: data.character || 'emma'
                });
                
                ws.send(JSON.stringify({
                    type: 'init_ok',
                    sessionId: sessionId
                }));
                
                console.log('📝 Session initialized:', sessionId);
            }

            // 文字输入（备用方案）
            if (data.type === 'text') {
                if (!sessionId) {
                    sessionId = 'session_' + Date.now();
                    sessions.set(sessionId, { messages: [], ws: ws, character: 'emma' });
                }

                const session = sessions.get(sessionId);
                console.log(`💬 Text message: "${data.text}"`);
                session.messages.push({ role: 'user', content: data.text });
            }

        } catch (error) {
            console.error('❌ WebSocket message error:', error);
            ws.send(JSON.stringify({ error: error.message }));
        }
    });

    ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        if (sessionId) {
            sessions.delete(sessionId);
        }
    });
});

// ==================== 启动服务 ====================

server.listen(USE_HTTPS ? HTTPS_PORT : HTTP_PORT, () => {
    const protocol = USE_HTTPS ? 'https' : 'http';
    const port = USE_HTTPS ? HTTPS_PORT : HTTP_PORT;
    
    const rtcConfigured = process.env.VOLC_ACCESS_KEY && process.env.VOLC_SECRET_KEY;
    const bailianConfigured = process.env.DASHSCOPE_API_KEY;
    
    console.log(`
╔══════════════════════════════════════════════════════╗
║    English Friend - RTC Real-time AI Server v2       ║
║                                                      ║
║   🔒 Protocol:  ${USE_HTTPS ? 'HTTPS (Secure)   ' : 'HTTP (Insecure)'}                        ║
║   🌐 Frontend:  ${protocol}://localhost:${port}${' '.repeat(33 - protocol.length - String(port).length)}║
║   🔌 WebSocket: ${protocol.replace('http', 'ws')}://localhost:${port}${' '.repeat(33 - protocol.length - String(port).length)}║
║   📡 AI Mode:   ${AI_MODE === 'end-to-end' ? 'End-to-End     ' : 'Custom        '}                       ║
║                                                      ║
║   🎮 RTC AI:   ${rtcConfigured ? '✅ configured     ' : '❌ not configured'}║
║   ☁️ Bailian:  ${bailianConfigured ? '✅ configured     ' : '❌ not configured'}║
║                                                      ║
║   ✨ Features:                                        ║
║   ✓ 火山 RTC 实时对话式 AI                             ║
║   ✓ 模式 1: 端到端（内置 ASR+LLM+TTS）                 ║
║   ✓ 模式 2: 自定义（百炼 Qwen + Edge TTS）             ║
║   ✓ 5 种角色人设（Emma/Tommy/Lily/Mike/Rose）          ║
║   ✓ WebSocket 实时通信                                 ║
║   ${USE_HTTPS ? '✓ HTTPS 加密连接' : '  设置 USE_HTTPS=true 启用 HTTPS'}                          ║
╚══════════════════════════════════════════════════════╝

🚀 实时 AI 对话服务已启动！
📱 浏览器访问：${protocol}://localhost:${port}
🔑 健康检查：${protocol}://localhost:${port}/health
🔧 AI 模式：${AI_MODE === 'end-to-end' ? '端到端' : '自定义'}
    `);
});
