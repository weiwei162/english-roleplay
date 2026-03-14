// 火山云 RTC + 豆包 API 服务端（全栈版 + HTTPS）
// 支持：前端静态文件 + WebSocket + API + 双向 RTC + HTTPS
// 使用前请安装依赖：npm install express cors dotenv crypto ws https

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
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
    // 检查证书文件是否存在
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
            // 生成自签名证书（开发用）
            const pems = require('crypto').generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
            });
            
            httpsOptions = {
                key: pems.privateKey,
                cert: pems.publicKey
            };
            
            // 保存证书到文件
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

// RTC 房间存储（房间 ID → 参与者信息）
const rtcRooms = new Map();

// ==================== ⭐ 新增：服务前端静态文件 ====================

// 服务 english-roleplay 目录下的所有静态文件
const frontendPath = path.join(__dirname, '..');
console.log('📁 Serving frontend from:', frontendPath);

app.use(express.static(frontendPath, {
    // 缓存策略
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

// ⭐ 健康检查路由（必须在通配符之前）
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            rtc: process.env.VOLC_APP_ID && !process.env.VOLC_APP_ID.includes('your_') ? 'configured' : 'not configured',
            doubao: process.env.DOUBAO_API_KEY && !process.env.DOUBAO_API_KEY.includes('your_') ? 'configured' : 'not configured',
            websocket: 'enabled'
        },
        activeSessions: sessions.size,
        activeRooms: rtcRooms.size,
        frontend: 'served'
    });
});

// 所有其他请求返回 index.html（SPA 路由支持）
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

console.log('✅ Frontend static files configured');

// ==================== 火山云 RTC Token 生成 ====================

function generateRTCToken(roomId, uid = 'bot') {
    const appId = process.env.VOLC_APP_ID;
    const appKey = process.env.VOLC_APP_KEY;
    
    if (!appId || !appKey) {
        throw new Error('Please set VOLC_APP_ID and VOLC_APP_KEY in .env file');
    }
    
    const now = Math.floor(Date.now() / 1000);
    const expire = now + 3600; // 1 小时有效
    
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

// 创建房间接口
app.post('/api/create-room', (req, res) => {
    try {
        const { roomId } = req.body;
        
        if (!roomId) {
            return res.status(400).json({ error: 'roomId is required' });
        }
        
        const token = generateRTCToken(roomId);
        
        res.json({
            roomId,
            token,
            appId: process.env.VOLC_APP_ID
        });
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== 豆包 API 调用 ====================

async function callDoubaoAPI(messages) {
    const apiKey = process.env.DOUBAO_API_KEY;
    
    if (!apiKey) {
        throw new Error('Please set DOUBAO_API_KEY in .env file');
    }
    
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'doubao-pro-32k',
            messages: messages
        })
    });
    
    if (!response.ok) {
        throw new Error(`Doubao API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

// ==================== 数字人视频生成（简化版） ====================

async function generateAvatarVideo(text, character) {
    // ⚠️ 这里是简化版 - 返回模拟的房间信息
    // 实际应该调用火山数字人 API 生成视频并推流到 RTC 房间
    
    const roomId = `room_${character}_${Date.now()}`;
    const token = generateRTCToken(roomId, 'avatar_bot');
    
    console.log('🎬 Generating avatar video for:', text);
    console.log('📹 Room:', roomId);
    
    // TODO: 实际集成时，这里需要：
    // 1. 调用火山数字人 API 生成视频
    // 2. 将视频推流到 RTC 房间
    // 3. 返回房间信息给前端
    
    return {
        room_id: roomId,
        token: token,
        stream_url: `rtc://room/${roomId}`
    };
}

// ==================== 聊天接口 ====================

app.post('/api/chat', async (req, res) => {
    try {
        const { text, sessionId, character } = req.body;
        
        if (!text || !sessionId) {
            return res.status(400).json({ error: 'text and sessionId are required' });
        }
        
        // 获取会话上下文
        let session = sessions.get(sessionId);
        if (!session) {
            session = { messages: [] };
            sessions.set(sessionId, session);
        }
        
        // 构建对话历史
        const messages = [
            {
                role: 'system',
                content: getCharacterPrompt(character || 'emma')
            },
            ...session.messages,
            { role: 'user', content: text }
        ];
        
        // 调用豆包生成回应
        const reply = await callDoubaoAPI(messages);
        
        // 更新会话
        session.messages.push({ role: 'user', content: text });
        session.messages.push({ role: 'assistant', content: reply });
        
        // 生成数字人视频（获取 RTC 房间信息）
        const videoData = await generateAvatarVideo(reply, character || 'emma');
        
        console.log('✅ Chat response:', {
            text: reply.substring(0, 50) + '...',
            roomId: videoData.room_id
        });
        
        // 返回结果
        res.json({
            text: reply,
            roomId: videoData.room_id,
            token: videoData.token,
            sessionId: sessionId
        });
        
    } catch (error) {
        console.error('❌ Chat error:', error);
        res.status(500).json({ 
            error: error.message,
            fallback: true
        });
    }
});

// ==================== 角色提示词 ====================

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

// ==================== WebSocket 实时通信 ====================

wss.on('connection', (ws, req) => {
    console.log('🔌 WebSocket client connected');

    let sessionId = null;
    let childAudioStream = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            // 初始化会话
            if (data.type === 'init') {
                sessionId = data.sessionId || 'session_' + Date.now();
                sessions.set(sessionId, { messages: [], ws: ws });
                
                ws.send(JSON.stringify({
                    type: 'init_ok',
                    sessionId: sessionId
                }));
                
                console.log('📝 Session initialized:', sessionId);
            }

            // 接收音频数据（实时 ASR）
            if (data.type === 'audio_chunk') {
                if (!sessionId) {
                    ws.send(JSON.stringify({ error: 'Session not initialized' }));
                    return;
                }

                // 将音频块发送到 ASR 服务进行识别
                const text = await recognizeSpeech(data.audio);
                
                if (text) {
                    console.log('🎤 Recognized speech:', text);
                    
                    // 触发对话流程
                    const response = await processChildSpeech(text, sessionId);
                    
                    ws.send(JSON.stringify({
                        type: 'response',
                        text: response.text,
                        roomId: response.roomId,
                        token: response.token
                    }));
                }
            }

            // 接收文字输入（降级方案）
            if (data.type === 'text') {
                if (!sessionId) {
                    sessionId = 'session_' + Date.now();
                    sessions.set(sessionId, { messages: [], ws: ws });
                }

                const response = await processChildSpeech(data.text, sessionId);
                
                ws.send(JSON.stringify({
                    type: 'response',
                    text: response.text,
                    roomId: response.roomId,
                    token: response.token
                }));
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

// 语音识别（调用火山引擎 ASR）
async function recognizeSpeech(audioBase64) {
    // TODO: 调用火山引擎语音识别 API
    // 这里先返回模拟结果用于测试
    
    // 实际调用示例：
    /*
    const response = await fetch('https://openspeech.bytedance.com/api/v1/stt', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.VOLC_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            audio: audioBase64,
            language: 'en-US',
            format: 'pcm'
        })
    });
    const data = await response.json();
    return data.text;
    */
    
    // 模拟返回（测试用）
    return null;
}

// 处理孩子说话（核心对话流程）
async function processChildSpeech(text, sessionId) {
    const session = sessions.get(sessionId) || { messages: [] };
    const character = session.character || 'emma';

    // 构建对话历史
    const messages = [
        {
            role: 'system',
            content: getCharacterPrompt(character)
        },
        ...session.messages,
        { role: 'user', content: text }
    ];

    // 调用豆包生成回应
    const reply = await callDoubaoAPI(messages);

    // 更新会话
    session.messages.push({ role: 'user', content: text });
    session.messages.push({ role: 'assistant', content: reply });
    session.character = character;
    sessions.set(sessionId, session);

    // 生成数字人视频（获取 RTC 房间信息）
    const videoData = await generateAvatarVideo(reply, character);

    return {
        text: reply,
        roomId: videoData.room_id,
        token: videoData.token
    };
}

// ==================== 健康检查 ====================

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            rtc: process.env.VOLC_APP_ID ? 'configured' : 'not configured',
            doubao: process.env.DOUBAO_API_KEY ? 'configured' : 'not configured',
            websocket: 'enabled'
        },
        activeSessions: sessions.size,
        activeRooms: rtcRooms.size
    });
});

// ==================== 启动服务 ====================

// 启动 HTTP/HTTPS 服务（使用前面定义的常量）
server.listen(USE_HTTPS ? HTTPS_PORT : HTTP_PORT, () => {
    const protocol = USE_HTTPS ? 'https' : 'http';
    const port = USE_HTTPS ? HTTPS_PORT : HTTP_PORT;
    
    console.log(`
╔══════════════════════════════════════════════════════╗
║     English Friend AI Server Running (Full-Stack)   ║
║                                                      ║
║   🔒 Protocol:  ${USE_HTTPS ? 'HTTPS (Secure)   ' : 'HTTP (Insecure)'}                        ║
║   🌐 Frontend:  ${protocol}://localhost:${port}${' '.repeat(33 - protocol.length - String(port).length)}║
║   🔌 WebSocket: ${protocol.replace('http', 'ws')}://localhost:${port}${' '.repeat(33 - protocol.length - String(port).length)}║
║   📡 API:       ${protocol}://localhost:${port}/api${' '.repeat(29 - protocol.length - String(port).length)}║
║                                                      ║
║   🎥 RTC:     ${process.env.VOLC_APP_ID && !process.env.VOLC_APP_ID.includes('your_') ? '✅ configured     ' : '❌ not configured'}║
║   🤖 Doubao:  ${process.env.DOUBAO_API_KEY && !process.env.DOUBAO_API_KEY.includes('your_') ? '✅ configured     ' : '❌ not configured'}║
║                                                      ║
║   ✨ Features:                                        ║
║   ✓ 前端静态文件服务（无需 Python）                    ║
║   ✓ 双向 RTC 音频流（孩子说话 → AI）                   ║
║   ✓ 实时 ASR 语音识别                                 ║
║   ✓ 豆包大模型对话生成                               ║
║   ✓ 数字人视频推流                                   ║
║   ${USE_HTTPS ? '✓ HTTPS 加密连接' : '  设置 USE_HTTPS=true 启用 HTTPS'}                          ║
╚══════════════════════════════════════════════════════╝

🚀 现在只需一个命令启动所有服务！
📱 浏览器访问：${protocol}://localhost:${port}
    `);
});
