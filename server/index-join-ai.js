#!/usr/bin/env node
/**
 * 火山引擎 StartVoiceChat API 服务端 - AI 加入房间模式
 * 
 * 流程：
 * 1. 前端创建 RTC 房间并加入
 * 2. 前端调用 /api/join-ai 将 AI 加入房间
 * 3. 后端调用 StartVoiceChat API，AI 加入已存在的 RTC 房间
 * 4. 结束时调用 /api/leave-room 结束 AI 对话
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { VolcStartVoiceChatClient, getComponentConfig, getS2SConfig, CHARACTER_CONFIGS } = require('./volc-start-voicechat');
const { combineCharacterAndScenePrompt, getScenePrompt } = require('./prompts');
const { generateToken, generateWildcardToken, verifyToken } = require('./token-generator');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ==================== 配置 ====================

const AI_MODE = process.env.AI_MODE || 's2s'; // 'component' 或 's2s'
const PORT = parseInt(process.env.PORT) || 3000;

// HTTPS 配置
const USE_HTTPS = process.env.USE_HTTPS === 'true';
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT) || 3443;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || './ssl/cert.pem';
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || './ssl/key.pem';

const frontendPath = path.join(__dirname, '..');

// 初始化客户端
const client = new VolcStartVoiceChatClient({
    accessKey: process.env.VOLC_ACCESS_KEY,
    secretKey: process.env.VOLC_SECRET_KEY,
    region: 'cn-north-1'
});

// 会话存储
const sessions = new Map();

// ==================== 静态文件 ====================

console.log('📁 Serving frontend from:', frontendPath);
console.log(`🤖 AI Mode: ${AI_MODE === 'component' ? '分组件模式' : '端到端模式 (S2S)'}`);
console.log('🔄 Flow: Frontend creates room → AI joins via backend');

app.use(express.static(frontendPath, {
    maxAge: '1d',
    etag: true
}));

// ==================== 健康检查 ====================

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        config: {
            aiMode: AI_MODE,
            volcConfigured: !!(process.env.VOLC_ACCESS_KEY && process.env.VOLC_SECRET_KEY),
            rtcConfigured: !!(process.env.VOLC_APP_ID && process.env.VOLC_APP_KEY)
        },
        activeSessions: sessions.size,
        flow: 'frontend-creates-room'
    });
});

// ==================== ⭐ 获取前端配置（新接口） ====================

app.get('/api/config', (req, res) => {
    // 返回前端需要的配置信息
    res.json({
        success: true,
        config: {
            appId: process.env.VOLC_APP_ID,
            // 可以添加其他前端需要的配置
            aiMode: AI_MODE,
            features: {
                enableVideo: true,
                enableASR: true,
                enableTTS: true
            }
        }
    });
});

// ==================== ⭐ 获取 RTC Token（新接口） ====================

app.get('/api/token', (req, res) => {
    try {
        const { roomId, uid, wildcard } = req.query;
        
        if (!uid) {
            return res.status(400).json({ 
                error: 'uid is required',
                success: false
            });
        }
        
        // 通配 Token 或普通 Token
        let token;
        let targetRoomId = roomId || '*';
        
        if (wildcard === 'true') {
            // 生成通配 Token（可以加入任意房间）
            token = generateWildcardToken(
                process.env.VOLC_APP_ID,
                process.env.VOLC_APP_KEY,
                uid,
                86400 // 24 小时
            );
            console.log('🔑 Generated wildcard token for:', uid);
        } else {
            // 生成普通 Token（只能加入指定房间）
            if (!roomId) {
                return res.status(400).json({
                    error: 'roomId is required (or use wildcard=true)',
                    success: false
                });
            }
            token = generateToken(
                process.env.VOLC_APP_ID,
                process.env.VOLC_APP_KEY,
                roomId,
                uid,
                86400 // 24 小时
            );
            console.log('🔑 Generated token for:', { roomId, uid });
        }
        
        res.json({
            success: true,
            roomId: targetRoomId,
            uid,
            token,
            appId: process.env.VOLC_APP_ID,
            expireIn: 86400, // 24 小时
            wildcard: wildcard === 'true'
        });
    } catch (error) {
        console.error('❌ Generate token error:', error);
        res.status(500).json({ 
            error: error.message,
            success: false
        });
    }
});

// ==================== ⭐ AI 加入房间（新接口） ====================

app.post('/api/join-ai', async (req, res) => {
    try {
        const { roomId, character, targetUserId, scene } = req.body;
        
        // 默认场景为 zoo
        const sceneId = scene || 'zoo';
        
        console.log('\n🤖 AI joining room:', { roomId, character, targetUserId, scene: sceneId });
        
        if (!roomId || !character) {
            return res.status(400).json({ 
                error: 'roomId and character are required',
                success: false
            });
        }
        
        // 组合角色和场景提示词
        const combinedConfig = combineCharacterAndScenePrompt(CHARACTER_CONFIGS[character], sceneId);
        const sceneConfig = getScenePrompt(sceneId);
        
        // 生成任务 ID（确保唯一性）
        const taskId = `task_${roomId}_${Date.now()}`;
        
        let result;
        
        if (AI_MODE === 'component') {
            // ========== 分组件模式 ==========
            console.log(`🔧 [分组件模式] AI joining room: ${roomId}, Scene: ${sceneId}`);
            
            const config = getComponentConfig({
                asrAppId: process.env.VOLC_ASR_APP_ID,
                asrToken: process.env.VOLC_ASR_TOKEN,
                llmEndpointId: process.env.VOLC_LLM_ENDPOINT_ID,
                ttsAppId: process.env.VOLC_TTS_APP_ID,
                ttsToken: process.env.VOLC_TTS_TOKEN,
                ttsVoiceType: combinedConfig.ttsVoiceType,
                systemPrompt: combinedConfig.systemPrompt,
                asrResourceId: process.env.VOLC_ASR_RESOURCE_ID,
                ttsResourceId: process.env.VOLC_TTS_RESOURCE_ID
            });
            
            result = await client.startVoiceChatComponent({
                appId: process.env.VOLC_APP_ID,
                roomId,
                taskId,
                targetUserId,
                asrConfig: config.ASRConfig,
                llmConfig: config.LLMConfig,
                ttsConfig: config.TTSConfig,
                welcomeMessage: sceneConfig.welcomeMessage,
                idleTimeout: 180
            });
            
        } else {
            // ========== 端到端模式 ==========
            console.log(`🎯 [端到端模式] AI joining room: ${roomId}, Scene: ${sceneId}`);
            
            const config = getS2SConfig({
                s2sAppId: process.env.VOLC_S2S_APP_ID,
                s2sToken: process.env.VOLC_S2S_TOKEN,
                modelVersion: process.env.VOLC_S2S_MODEL_VERSION || 'O',
                systemRole: combinedConfig.systemRole,
                speakingStyle: combinedConfig.speakingStyle,
                speaker: combinedConfig.s2sSpeaker,
                outputMode: parseInt(process.env.VOLC_S2S_OUTPUT_MODE || '0')
            });
            
            result = await client.startVoiceChatS2S({
                appId: process.env.VOLC_APP_ID,
                roomId,
                taskId,
                targetUserId,
                s2sConfig: config,
                welcomeMessage: sceneConfig.welcomeMessage,
                idleTimeout: 180
            });
        }
        
        // 保存会话
        sessions.set(roomId, {
            character,
            taskId,
            targetUserId,
            aiMode: AI_MODE,
            createdAt: Date.now()
        });
        
        console.log(`✅ AI joined room: ${roomId}, TaskId: ${taskId}`);
        
        res.json({
            roomId,
            taskId,
            character,
            characterName: CHARACTER_CONFIGS[character].name,
            scene: sceneId,
            aiMode: AI_MODE,
            success: true,
            message: 'AI character joined room successfully'
        });
        
    } catch (error) {
        console.error('❌ Join AI error:', error);
        res.status(500).json({ 
            error: error.message,
            success: false
        });
    }
});

// ==================== 离开房间 ====================

app.post('/api/leave-room', async (req, res) => {
    try {
        const { roomId, taskId } = req.body;
        
        console.log('\n👋 Leaving room:', { roomId, taskId });
        
        const session = sessions.get(roomId);
        if (session && session.taskId) {
            await client.stopVoiceChat({
                appId: process.env.VOLC_APP_ID,
                roomId,
                taskId: session.taskId
            });
            sessions.delete(roomId);
            console.log(`✅ Room closed: ${roomId}`);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Leave room error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== 获取角色列表 ====================

app.get('/api/characters', (req, res) => {
    const characters = Object.entries(CHARACTER_CONFIGS).map(([key, config]) => ({
        id: key,
        name: config.name,
        description: config.systemPrompt.substring(0, 100) + '...'
    }));
    
    res.json({ characters });
});

// ==================== 获取 Token（可选） ====================

app.get('/api/token', (req, res) => {
    try {
        const { roomId, uid } = req.query;
        
        if (!roomId || !uid) {
            return res.status(400).json({ error: 'roomId and uid required' });
        }
        
        const token = client.generateToken(roomId, uid);
        
        res.json({
            roomId,
            uid,
            token,
            appId: process.env.VOLC_APP_ID
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== SPA 路由 ====================

app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// ==================== 启动服务 ====================

// 创建 HTTP 重定向服务器（HTTPS 模式下）
let httpServer;
let httpsServer;

if (USE_HTTPS) {
    // 读取 SSL 证书
    let sslOptions;
    try {
        sslOptions = {
            key: fs.readFileSync(SSL_KEY_PATH),
            cert: fs.readFileSync(SSL_CERT_PATH)
        };
        console.log('✅ SSL 证书加载成功');
    } catch (error) {
        console.error('❌ SSL 证书加载失败:', error.message);
        console.log('⚠️  降级到 HTTP 模式');
        sslOptions = null;
    }
    
    if (sslOptions) {
        // 创建 HTTPS 服务器
        httpsServer = https.createServer(sslOptions, app);
        
        httpsServer.listen(HTTPS_PORT, () => {
            console.log(`
╔══════════════════════════════════════════════════════╗
║   English Friend - StartVoiceChat Server             ║
║   (Frontend Creates Room Flow) - HTTPS Mode          ║
║                                                      ║
║   🔒 Protocol:  HTTPS                                ║
║   🌐 Frontend:  https://localhost:${HTTPS_PORT}${' '.repeat(33 - String(HTTPS_PORT).length)}║
║   📡 API:       https://localhost:${HTTPS_PORT}/api${' '.repeat(29 - String(HTTPS_PORT).length)}║
║   🔑 Health:    https://localhost:${HTTPS_PORT}/health${' '.repeat(28 - String(HTTPS_PORT).length)}║
║                                                      ║
║   🤖 AI Mode:   ${AI_MODE === 'component' ? '分组件 (ASR+LLM+TTS)' : '端到端 (S2S)'}${' '.repeat(23 - (AI_MODE === 'component' ? 16 : 9))}║
║   🎮 RTC:       ${process.env.VOLC_APP_ID ? '✅ configured' : '❌ not configured'}${' '.repeat(23 - (process.env.VOLC_APP_ID ? 14 : 17))}║
║   🔄 Flow:      Frontend → Create Room → AI Joins    ║
║                                                      ║
║   ✨ API Endpoints:                                   ║
║   - POST /api/join-ai    (AI joins room)             ║
║   - POST /api/leave-room (Leave & stop AI)           ║
║   - GET  /api/characters (Get character list)        ║
║   - GET  /api/token      (Get RTC token)             ║
║                                                      ║
║   ✨ 5 种角色：Emma, Tommy, Lily, Mike, Rose          ║
╚══════════════════════════════════════════════════════╝

🚀 HTTPS 服务已启动！
📱 浏览器访问：https://localhost:${HTTPS_PORT}
🔧 模式：${AI_MODE === 'component' ? '分组件' : '端到端'}
🔄 流程：前端创建房间 → AI 加入
🔐 SSL 证书：${SSL_CERT_PATH}
            `);
        });
        
        // 创建 HTTP 服务器用于重定向
        httpServer = http.createServer((req, res) => {
            res.writeHead(301, { 'Location': `https://localhost:${HTTPS_PORT}${req.url}` });
            res.end();
        });
        
        httpServer.listen(PORT, () => {
            console.log(`🔀 HTTP 重定向：http://localhost:${PORT} → https://localhost:${HTTPS_PORT}`);
        });
    } else {
        // 降级到 HTTP 模式
        startHttpServer();
    }
} else {
    // 纯 HTTP 模式
    startHttpServer();
}

// 启动 HTTP 服务器
function startHttpServer() {
    const server = app.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════════════════════╗
║   English Friend - StartVoiceChat Server             ║
║   (Frontend Creates Room Flow)                       ║
║                                                      ║
║   🔒 Protocol:  HTTP (Insecure)                      ║
║   🌐 Frontend:  http://localhost:${PORT}${' '.repeat(34 - String(PORT).length)}║
║   📡 API:       http://localhost:${PORT}/api${' '.repeat(30 - String(PORT).length)}║
║   🔑 Health:    http://localhost:${PORT}/health${' '.repeat(29 - String(PORT).length)}║
║                                                      ║
║   🤖 AI Mode:   ${AI_MODE === 'component' ? '分组件 (ASR+LLM+TTS)' : '端到端 (S2S)'}${' '.repeat(23 - (AI_MODE === 'component' ? 16 : 9))}║
║   🎮 RTC:       ${process.env.VOLC_APP_ID ? '✅ configured' : '❌ not configured'}${' '.repeat(23 - (process.env.VOLC_APP_ID ? 14 : 17))}║
║   🔄 Flow:      Frontend → Create Room → AI Joins    ║
║                                                      ║
║   ✨ API Endpoints:                                   ║
║   - POST /api/join-ai    (AI joins room)             ║
║   - POST /api/leave-room (Leave & stop AI)           ║
║   - GET  /api/characters (Get character list)        ║
║   - GET  /api/token      (Get RTC token)             ║
║                                                      ║
║   ✨ 5 种角色：Emma, Tommy, Lily, Mike, Rose          ║
╚══════════════════════════════════════════════════════╝

🚀 服务已启动！
📱 浏览器访问：http://localhost:${PORT}
🔧 模式：${AI_MODE === 'component' ? '分组件' : '端到端'}
🔄 流程：前端创建房间 → AI 加入
        `);
    });
    
    // 优雅关闭
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));
}

// 优雅关闭函数
function gracefulShutdown(server) {
    console.log('\n👋 正在关闭服务...');
    
    // 关闭所有活跃会话
    for (const [roomId, session] of sessions) {
        try {
            client.stopVoiceChat({
                appId: process.env.VOLC_APP_ID,
                roomId,
                taskId: session.taskId
            });
        } catch (e) {
            console.error(`❌ 关闭房间 ${roomId} 失败：`, e.message);
        }
    }
    
    server.close(() => {
        // 如果启用了 HTTPS，也关闭 HTTP 服务器
        if (httpServer) {
            httpServer.close();
        }
        console.log('✅ 服务已关闭');
        process.exit(0);
    });
}


