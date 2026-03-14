// 阿里云百炼 + RTC 服务端（全栈版 + HTTPS）
// 支持：前端静态文件 + WebSocket + API + 百炼 ASR 实时语音识别 + 百炼 Qwen 对话
// 使用前请安装依赖：npm install express cors dotenv crypto ws https websocket-client

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const WebSocket = require('websocket-client');
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

// ASR WebSocket 连接存储（sessionId → ASR WebSocket）
const asrConnections = new Map();

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
            bailian: process.env.DASHSCOPE_API_KEY && !process.env.DASHSCOPE_API_KEY.includes('sk-xxx') ? 'configured' : 'not configured',
            llm_model: process.env.LLM_MODEL || 'qwen-plus',
            asr_model: process.env.ASR_MODEL || 'qwen3-asr-flash-realtime',
            websocket: 'enabled'
        },
        activeSessions: sessions.size,
        activeAsrConnections: asrConnections.size,
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

// ==================== 阿里云百炼 Qwen API 调用 ====================

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
        
        // 调用百炼 Qwen 生成回应
        const model = process.env.LLM_MODEL || 'qwen-plus';
        const reply = await callQwenAPI(messages, model);
        
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
                await recognizeSpeech(data.audio, sessionId, ws);
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

// 语音识别（阿里云百炼 qwen3-asr-flash-realtime 实时 ASR）
class RealtimeASR {
    constructor(sessionId, ws, onFinalText) {
        this.sessionId = sessionId;
        this.ws = ws;  // WebSocket 连接到前端
        this.onFinalText = onFinalText;  // 最终识别文本回调
        this.asrWs = null;
        this.isConnected = false;
        this.lastTranscript = '';
    }

    async connect() {
        const apiKey = process.env.DASHSCOPE_API_KEY;
        const wsUrl = process.env.ASR_WS_URL || 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime';
        
        if (!apiKey) {
            throw new Error('DASHSCOPE_API_KEY not configured');
        }

        return new Promise((resolve, reject) => {
            try {
                this.asrWs = new WebSocket(wsUrl + '?model=qwen3-asr-flash-realtime', {
                    headers: {
                        'Authorization': 'Bearer ' + apiKey,
                        'OpenAI-Beta': 'realtime=v1'
                    }
                });

                this.asrWs.on('open', () => {
                    console.log('✅ ASR WebSocket connected for session:', this.sessionId);
                    this.isConnected = true;

                    // 发送会话配置
                    const sessionUpdate = {
                        type: 'session.update',
                        session: {
                            input_audio_format: 'pcm',
                            sample_rate: 16000,
                            input_audio_transcription: {
                                language: 'en'  // 英语识别
                            },
                            turn_detection: {
                                type: 'server_vad',
                                threshold: 0.0,
                                silence_duration_ms: 400
                            }
                        }
                    };

                    this.asrWs.send(JSON.stringify(sessionUpdate));
                    resolve();
                });

                this.asrWs.on('message', (data) => {
                    try {
                        const event = JSON.parse(data.toString());
                        
                        // 实时识别结果（流式）- 可选推送给前端
                        if (event.type === 'conversation.item.input_audio_transcription.text') {
                            const text = event.text || '';
                            this.lastTranscript = text;
                            // 可选：推送实时字幕给前端
                            // this.ws.send(JSON.stringify({ type: 'asr_partial', text: text }));
                        }
                        
                        // 最终识别结果 - 触发对话
                        if (event.type === 'conversation.item.input_audio_transcription.completed') {
                            const transcript = event.transcript || '';
                            console.log('🎤 ASR Final:', transcript);
                            
                            if (this.onFinalText && transcript.trim()) {
                                // 触发对话流程
                                this.onFinalText(transcript, this.sessionId);
                            }
                        }

                        // 语音开始/结束事件
                        if (event.type === 'input_audio_buffer.speech_started') {
                            console.log('🗣️ Speech started for session:', this.sessionId);
                            // 可以推送"思考中"状态给前端
                        }
                        
                        if (event.type === 'input_audio_buffer.speech_stopped') {
                            console.log('🔇 Speech stopped for session:', this.sessionId);
                        }

                    } catch (error) {
                        console.error('❌ ASR parse error:', error);
                    }
                });

                this.asrWs.on('error', (error) => {
                    console.error('❌ ASR WebSocket error:', error);
                    reject(error);
                });

                this.asrWs.on('close', (code, reason) => {
                    console.log('🔌 ASR WebSocket closed:', code, reason);
                    this.isConnected = false;
                });

            } catch (error) {
                console.error('❌ Failed to create ASR WebSocket:', error);
                reject(error);
            }
        });
    }

    sendAudio(audioBase64) {
        if (!this.isConnected || !this.asrWs) {
            console.warn('⚠️ ASR WebSocket not ready');
            return;
        }

        try {
            const event = {
                type: 'input_audio_buffer.append',
                audio: audioBase64
            };
            this.asrWs.send(JSON.stringify(event));
        } catch (error) {
            console.error('❌ Failed to send audio to ASR:', error);
        }
    }

    async close() {
        if (this.asrWs) {
            // 发送结束事件
            try {
                this.asrWs.send(JSON.stringify({
                    type: 'session.finish'
                }));
            } catch (e) {
                // ignore
            }

            // 关闭连接
            await new Promise(resolve => {
                this.asrWs.close();
                setTimeout(resolve, 500);
            });
            this.asrWs = null;
            this.isConnected = false;
        }
    }
}

// 语音识别（创建 ASR 连接）
async function recognizeSpeech(audioBase64, sessionId, ws) {
    // 检查是否已有 ASR 连接
    let asr = asrConnections.get(sessionId);
    
    if (!asr) {
        // 创建新的 ASR 连接，传入最终文本回调
        asr = new RealtimeASR(sessionId, ws, async (text, sessionId) => {
            console.log('🎤 ASR Final Text:', text);
            // 触发对话流程
            const response = await processChildSpeech(text, sessionId);
            
            // 发送回应给前端
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'response',
                    text: response.text,
                    roomId: response.roomId,
                    token: response.token
                }));
            }
        });
        
        try {
            await asr.connect();
            asrConnections.set(sessionId, asr);
        } catch (error) {
            console.error('❌ Failed to connect ASR:', error);
            return;
        }
    }

    // 发送音频块到 ASR
    asr.sendAudio(audioBase64);
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

    // 调用百炼 Qwen 生成回应
    const model = process.env.LLM_MODEL || 'qwen-plus';
    const reply = await callQwenAPI(messages, model);

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
            bailian: process.env.DASHSCOPE_API_KEY && !process.env.DASHSCOPE_API_KEY.includes('sk-xxx') ? 'configured' : 'not configured',
            llm_model: process.env.LLM_MODEL || 'qwen-plus',
            asr_model: process.env.ASR_MODEL || 'qwen3-asr-flash-realtime',
            websocket: 'enabled'
        },
        activeSessions: sessions.size,
        activeAsrConnections: asrConnections.size,
        frontend: 'served'
    });
});

// ==================== 启动服务 ====================

// 启动 HTTP/HTTPS 服务（使用前面定义的常量）
server.listen(USE_HTTPS ? HTTPS_PORT : HTTP_PORT, () => {
    const protocol = USE_HTTPS ? 'https' : 'http';
    const port = USE_HTTPS ? HTTPS_PORT : HTTP_PORT;
    
    const llmModel = process.env.LLM_MODEL || 'qwen-plus';
    const asrModel = process.env.ASR_MODEL || 'qwen3-asr-flash-realtime';
    const bailianConfigured = process.env.DASHSCOPE_API_KEY && !process.env.DASHSCOPE_API_KEY.includes('sk-xxx');
    
    console.log(`
╔══════════════════════════════════════════════════════╗
║   English Friend AI Server - Alibaba Bailian Edition ║
║                                                      ║
║   🔒 Protocol:  ${USE_HTTPS ? 'HTTPS (Secure)   ' : 'HTTP (Insecure)'}                        ║
║   🌐 Frontend:  ${protocol}://localhost:${port}${' '.repeat(33 - protocol.length - String(port).length)}║
║   🔌 WebSocket: ${protocol.replace('http', 'ws')}://localhost:${port}${' '.repeat(33 - protocol.length - String(port).length)}║
║   📡 API:       ${protocol}://localhost:${port}/api${' '.repeat(29 - protocol.length - String(port).length)}║
║                                                      ║
║   ☁️ Bailian:  ${bailianConfigured ? '✅ configured     ' : '❌ not configured'}║
║   🤖 LLM:      ${llmModel.padEnd(18)}║
║   🎤 ASR:      ${asrModel.padEnd(18)}║
║                                                      ║
║   ✨ Features:                                        ║
║   ✓ 前端静态文件服务（无需 Python）                    ║
║   ✓ 阿里云百炼 Qwen 大模型对话                         ║
║   ✓ 阿里云百炼实时 ASR 语音识别                        ║
║   ✓ WebSocket 实时通信                                 ║
║   ✓ 支持 RTC 双向音频（可选火山引擎）                   ║
║   ${USE_HTTPS ? '✓ HTTPS 加密连接' : '  设置 USE_HTTPS=true 启用 HTTPS'}                          ║
╚══════════════════════════════════════════════════════╝

🚀 现在只需一个命令启动所有服务！
📱 浏览器访问：${protocol}://localhost:${port}
🔑 健康检查：${protocol}://localhost:${port}/health
    `);
});
