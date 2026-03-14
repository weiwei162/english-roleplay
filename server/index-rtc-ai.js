// 火山 RTC 实时对话式 AI 服务端
// 架构：RTC 内置 AI + WebSocket 控制 + 百炼备用

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const WebSocket = require('websocket');
const { VolcRTCClient, CHARACTER_PERSONAS } = require('./volc-rtc-client');
const { synthesizeSpeech } = require('./tts-client');
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

// 健康检查
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            rtc: process.env.VOLC_APP_ID && !process.env.VOLC_APP_ID.includes('your_') ? 'configured' : 'not configured',
            bailian: process.env.DASHSCOPE_API_KEY && !process.env.DASHSCOPE_API_KEY.includes('sk-xxx') ? 'configured' : 'not configured'
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
    const appId = process.env.VOLC_APP_ID;
    const appKey = process.env.VOLC_APP_KEY;
    
    if (!appId || !appKey) {
        throw new Error('Please set VOLC_APP_ID and VOLC_APP_KEY');
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

// ==================== RTC 实时对话式 AI ====================

// 创建房间并开启 AI 对话
app.post('/api/create-room', async (req, res) => {
    try {
        const { roomId, character } = req.body;
        
        if (!roomId) {
            return res.status(400).json({ error: 'roomId is required' });
        }
        
        const characterConfig = CHARACTER_PERSONAS[character || 'emma'];
        
        // 生成孩子的 Token
        const childToken = rtcClient.generateToken(roomId, 'child');
        
        // 开启 AI 对话
        const aiResult = await rtcClient.startVoiceChat({
            roomId,
            userId: `ai_${character || 'emma'}`,
            persona: characterConfig.persona,
            language: characterConfig.language
        });
        
        console.log(`🏠 Room created: ${roomId}, AI TaskId: ${aiResult.TaskId}`);
        
        // 保存会话
        sessions.set(roomId, {
            character: character || 'emma',
            aiTaskId: aiResult.TaskId,
            createdAt: Date.now()
        });
        
        res.json({
            roomId,
            token: childToken,
            appId: process.env.VOLC_APP_ID,
            character: character || 'emma',
            aiTaskId: aiResult.TaskId
        });
    } catch (error) {
        console.error('❌ Create room error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 离开房间
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

// 切换角色
app.post('/api/switch-character', async (req, res) => {
    try {
        const { roomId, character } = req.body;
        
        const session = sessions.get(roomId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const characterConfig = CHARACTER_PERSONAS[character];
        
        // 更新 AI 对话配置
        await rtcClient.updateVoiceChat(session.aiTaskId, {
            persona: characterConfig.persona,
            language: characterConfig.language
        });
        
        session.character = character;
        sessions.set(roomId, session);
        
        console.log(`🔄 Character switched to ${character} in room ${roomId}`);
        
        res.json({ success: true, character });
    } catch (error) {
        console.error('❌ Switch character error:', error);
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

                // 文字模式使用百炼 API（备用）
                const session = sessions.get(sessionId);
                console.log(`💬 Text message: "${data.text}"`);
                
                // AI 会通过 RTC 自动回复，这里只需记录
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
    
    const rtcConfigured = process.env.VOLC_APP_ID && !process.env.VOLC_APP_ID.includes('your_');
    const bailianConfigured = process.env.DASHSCOPE_API_KEY && !process.env.DASHSCOPE_API_KEY.includes('sk-xxx');
    
    console.log(`
╔══════════════════════════════════════════════════════╗
║    English Friend - RTC Real-time AI Server          ║
║                                                      ║
║   🔒 Protocol:  ${USE_HTTPS ? 'HTTPS (Secure)   ' : 'HTTP (Insecure)'}                        ║
║   🌐 Frontend:  ${protocol}://localhost:${port}${' '.repeat(33 - protocol.length - String(port).length)}║
║   🔌 WebSocket: ${protocol.replace('http', 'ws')}://localhost:${port}${' '.repeat(33 - protocol.length - String(port).length)}║
║   📡 API:       ${protocol}://localhost:${port}/api${' '.repeat(29 - protocol.length - String(port).length)}║
║                                                      ║
║   🎮 RTC AI:   ${rtcConfigured ? '✅ configured     ' : '❌ not configured'}║
║   ☁️ Bailian:  ${bailianConfigured ? '✅ configured     ' : '❌ not configured'}║
║                                                      ║
║   ✨ Features:                                        ║
║   ✓ 火山 RTC 实时对话式 AI（内置 ASR+NLP+TTS）          ║
║   ✓ 5 种角色人设（Emma/Tommy/Lily/Mike/Rose）          ║
║   ✓ 阿里云百炼备用方案                                ║
║   ✓ WebSocket 实时通信                                 ║
║   ${USE_HTTPS ? '✓ HTTPS 加密连接' : '  设置 USE_HTTPS=true 启用 HTTPS'}                          ║
╚══════════════════════════════════════════════════════╝

🚀 实时 AI 对话服务已启动！
📱 浏览器访问：${protocol}://localhost:${port}
🔑 健康检查：${protocol}://localhost:${port}/health
    `);
});
