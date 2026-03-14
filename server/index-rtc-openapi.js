// 阿里云百炼 + 火山 RTC OpenAPI 实时对话服务端
// 架构：WebSocket 控制信令 + RTC 音视频流 + OpenAPI 服务端推流

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const WebSocket = require('websocket');
const { VolcRTCClient } = require('./volc-rtc-client');
const { synthesizeSpeech, testTTS } = require('./tts-client');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ==================== HTTPS 配置 ====================

const USE_HTTPS = process.env.USE_HTTPS === 'true';
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT) || 3443;
const HTTP_PORT = parseInt(process.env.PORT) || 3000;

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
            console.log('✅ Self-signed certificates generated:', certPath, keyPath);
        }
        
        server = https.createServer(httpsOptions, app);
    } catch (error) {
        console.error('❌ Failed to setup HTTPS:', error.message);
        console.log('🔓 Falling back to HTTP');
        server = http.createServer(app);
    }
} else {
    server = http.createServer(app);
    console.log('🔓 HTTP mode (set USE_HTTPS=true to enable HTTPS)');
}

wss = new WebSocketServer({ server });

// 会话存储
const sessions = new Map();

// 火山 RTC OpenAPI 客户端
const rtcClient = new VolcRTCClient({
    appId: process.env.VOLC_APP_ID,
    appKey: process.env.VOLC_APP_KEY,
    region: 'cn-north-1'
});

// ==================== 服务前端静态文件 ====================

const frontendPath = path.join(__dirname, '..');
console.log('📁 Serving frontend from:', frontendPath);

app.use(express.static(frontendPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

// 服务 uploads 目录（用于推流音频）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 健康检查
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            bailian: process.env.DASHSCOPE_API_KEY && !process.env.DASHSCOPE_API_KEY.includes('sk-xxx') ? 'configured' : 'not configured',
            rtc: process.env.VOLC_APP_ID && !process.env.VOLC_APP_ID.includes('your_') ? 'configured' : 'not configured',
            llm_model: process.env.LLM_MODEL || 'qwen-plus',
            websocket: 'enabled'
        },
        activeSessions: sessions.size,
        frontend: 'served'
    });
});

// SPA 路由支持
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

console.log('✅ Frontend static files configured');

// ==================== RTC Token 生成 ====================

function generateRTCToken(roomId, uid = 'bot') {
    const appId = process.env.VOLC_APP_ID;
    const appKey = process.env.VOLC_APP_KEY;
    
    if (!appId || !appKey) {
        throw new Error('Please set VOLC_APP_ID and VOLC_APP_KEY in .env file');
    }
    
    const now = Math.floor(Date.now() / 1000);
    const expire = now + 3600;
    
    const payload = {
        app_id: appId,
        room_id: roomId,
        uid: uid,
        expire: expire
    };
    
    const signature = crypto
        .createHmac('sha256', appKey)
        .update(JSON.stringify(payload))
        .digest('hex');
    
    return Buffer.from(JSON.stringify({
        ...payload,
        signature
    })).toString('base64');
}

// ==================== 火山 RTC OpenAPI 集成 ====================

// 创建房间接口
app.post('/api/create-room', async (req, res) => {
    try {
        const { roomId, character } = req.body;
        
        if (!roomId) {
            return res.status(400).json({ error: 'roomId is required' });
        }
        
        // 使用火山 RTC OpenAPI 生成 Token
        const childToken = rtcClient.generateToken(roomId, 'child');
        
        console.log(`🏠 Room created: ${roomId}, character: ${character}`);
        
        res.json({
            roomId,
            token: childToken,
            appId: process.env.VOLC_APP_ID,
            character: character || 'emma'
        });
    } catch (error) {
        console.error('❌ Create room error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 上传音频文件到可访问 URL（用于推流）
async function uploadTTSAudio(audioBuffer) {
    const filename = `tts_${Date.now()}.mp3`;
    const filepath = path.join(__dirname, 'uploads', filename);
    
    if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
        fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
    }
    
    fs.writeFileSync(filepath, audioBuffer);
    
    const audioUrl = `${process.env.PUBLIC_URL || 'http://localhost:3000'}/uploads/${filename}`;
    
    console.log(`📤 TTS audio uploaded: ${audioUrl}`);
    return audioUrl;
}

// 服务端推流（让角色"说话"）
async function pushStreamToRoom(roomId, audioBuffer, uid = 'server_bot') {
    try {
        const audioUrl = await uploadTTSAudio(audioBuffer);
        const result = await rtcClient.startPushStream(roomId, audioUrl, uid);
        console.log(`✅ Push stream to room ${roomId}:`, result);
        return result;
    } catch (error) {
        console.error('❌ Push stream error:', error.message);
        throw error;
    }
}

// ASR 回调接口（火山引擎会调用这个接口通知识别结果）
app.post('/api/asr-callback', (req, res) => {
    const { RoomId, UserId, Text, Status } = req.body;
    
    console.log(`📝 ASR Callback: Room ${RoomId}, User ${UserId}, Text: ${Text}`);
    
    if (Status === 'success' && Text) {
        handleChildSpeech(RoomId, Text, UserId);
    }
    
    res.json({ success: true });
});

// ==================== 百炼 Qwen API 调用 ====================

async function callQwenAPI(messages, model = 'qwen-plus') {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    
    if (!apiKey) {
        throw new Error('Please set DASHSCOPE_API_KEY in .env file');
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

// 角色提示词
function getCharacterPrompt(character) {
    const prompts = {
        emma: `你是一位温柔的英语老师 Miss Emma，和 5 岁中国小朋友对话。
               引导他们说英语，句子要短，用词简单，多鼓励。
               使用表情符号让对话更有趣。`,
        
        tommy: `你是 Tommy，一个 5 岁的美国小男孩，和小朋友交朋友。
                用简单的英语聊天，活泼好动，喜欢玩游戏。
                使用表情符号和简短的句子。`,
        
        lily: `你是 Lily，一个 7 岁的活泼小姐姐，带小朋友学英语。
               热情开朗，喜欢唱歌、画画、讲故事。
               用温暖鼓励的语气，使用表情符号。`,
        
        mike: `你是 Coach Mike，一个阳光的运动教练。
               教小朋友运动相关的英语，积极正面。
               使用充满活力和鼓励的语言。`,
        
        rose: `你是 Grandma Rose，慈祥的老奶奶。
               给小朋友讲故事，教他们生活常识。
               语气温柔缓慢，充满爱心。`
    };
    
    return prompts[character] || prompts.emma;
}

// 处理孩子说话（核心对话流程）
async function handleChildSpeech(roomId, text, userId) {
    const session = sessions.get(roomId);
    if (!session) {
        console.warn('⚠️ Session not found for room:', roomId);
        return;
    }
    
    console.log(`📝 Child said: "${text}"`);
    
    try {
        // 1. 大模型生成回复
        const messages = [
            { role: 'system', content: getCharacterPrompt(session.character) },
            { role: 'user', content: text }
        ];
        
        const reply = await callQwenAPI(messages, process.env.LLM_MODEL || 'qwen-plus');
        console.log(`🤖 AI reply: "${reply.substring(0, 50)}..."`);
        
        // 2. TTS 合成
        const ttsAudio = await synthesizeSpeech(reply, session.character);
        console.log(`🔊 TTS generated: ${ttsAudio.length} bytes`);
        
        // 3. 推送到 RTC 房间
        await pushStreamToRoom(roomId, ttsAudio, 'server_bot');
        console.log(`✅ Response sent to room ${roomId}`);
        
    } catch (error) {
        console.error('❌ Error processing speech:', error);
    }
}

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

            // 接收文字输入
            if (data.type === 'text') {
                if (!sessionId) {
                    sessionId = 'session_' + Date.now();
                    sessions.set(sessionId, { messages: [], ws: ws, character: 'emma' });
                }

                const session = sessions.get(sessionId);
                await handleChildSpeech(sessionId, data.text, 'websocket_user');
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
    
    const llmModel = process.env.LLM_MODEL || 'qwen-plus';
    const bailianConfigured = process.env.DASHSCOPE_API_KEY && !process.env.DASHSCOPE_API_KEY.includes('sk-xxx');
    const rtcConfigured = process.env.VOLC_APP_ID && !process.env.VOLC_APP_ID.includes('your_');
    
    console.log(`
╔══════════════════════════════════════════════════════╗
║  English Friend - RTC OpenAPI + Bailian AI Server   ║
║                                                      ║
║   🔒 Protocol:  ${USE_HTTPS ? 'HTTPS (Secure)   ' : 'HTTP (Insecure)'}                        ║
║   🌐 Frontend:  ${protocol}://localhost:${port}${' '.repeat(33 - protocol.length - String(port).length)}║
║   🔌 WebSocket: ${protocol.replace('http', 'ws')}://localhost:${port}${' '.repeat(33 - protocol.length - String(port).length)}║
║   📡 API:       ${protocol}://localhost:${port}/api${' '.repeat(29 - protocol.length - String(port).length)}║
║                                                      ║
║   ☁️ Bailian:  ${bailianConfigured ? '✅ configured     ' : '❌ not configured'}║
║   🤖 LLM:      ${llmModel.padEnd(18)}║
║   🎮 RTC:      ${rtcConfigured ? '✅ configured     ' : '❌ not configured'}║
║                                                      ║
║   ✨ Features:                                        ║
║   ✓ 前端静态文件服务                                   ║
║   ✓ 火山 RTC OpenAPI 服务端推流                        ║
║   ✓ 阿里云百炼 Qwen 大模型对话                         ║
║   ✓ 阿里云百炼 ASR 语音识别（可选）                    ║
║   ✓ Edge TTS 语音合成                                  ║
║   ✓ WebSocket 实时通信                                 ║
║   ${USE_HTTPS ? '✓ HTTPS 加密连接' : '  设置 USE_HTTPS=true 启用 HTTPS'}                          ║
╚══════════════════════════════════════════════════════╝

🚀 全双工实时对话服务已启动！
📱 浏览器访问：${protocol}://localhost:${port}
🔑 健康检查：${protocol}://localhost:${port}/health
    `);
});
