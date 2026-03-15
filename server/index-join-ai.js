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
const { VolcStartVoiceChatClient, getComponentConfig, getS2SConfig, CHARACTER_CONFIGS } = require('./volc-start-voicechat');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ==================== 配置 ====================

const AI_MODE = process.env.AI_MODE || 's2s'; // 'component' 或 's2s'
const PORT = parseInt(process.env.PORT) || 3000;
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

// ==================== ⭐ AI 加入房间（新接口） ====================

app.post('/api/join-ai', async (req, res) => {
    try {
        const { roomId, character, targetUserId } = req.body;
        
        console.log('\n🤖 AI joining room:', { roomId, character, targetUserId });
        
        if (!roomId || !character) {
            return res.status(400).json({ 
                error: 'roomId and character are required',
                success: false
            });
        }
        
        const charConfig = CHARACTER_CONFIGS[character];
        
        // 生成任务 ID（确保唯一性）
        const taskId = `task_${roomId}_${Date.now()}`;
        
        let result;
        
        if (AI_MODE === 'component') {
            // ========== 分组件模式 ==========
            console.log(`🔧 [分组件模式] AI joining room: ${roomId}`);
            
            const config = getComponentConfig({
                asrAppId: process.env.VOLC_ASR_APP_ID,
                asrToken: process.env.VOLC_ASR_TOKEN,
                llmEndpointId: process.env.VOLC_LLM_ENDPOINT_ID,
                ttsAppId: process.env.VOLC_TTS_APP_ID,
                ttsToken: process.env.VOLC_TTS_TOKEN,
                ttsVoiceType: charConfig.ttsVoiceType,
                systemPrompt: charConfig.systemPrompt,
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
                welcomeMessage: `Hi! I'm ${charConfig.name}. Let's learn English together!`,
                idleTimeout: 180
            });
            
        } else {
            // ========== 端到端模式 ==========
            console.log(`🎯 [端到端模式] AI joining room: ${roomId}`);
            
            const config = getS2SConfig({
                s2sAppId: process.env.VOLC_S2S_APP_ID,
                s2sToken: process.env.VOLC_S2S_TOKEN,
                modelVersion: process.env.VOLC_S2S_MODEL_VERSION || 'O',
                systemRole: charConfig.systemRole,
                speakingStyle: charConfig.speakingStyle,
                speaker: charConfig.s2sSpeaker,
                outputMode: parseInt(process.env.VOLC_S2S_OUTPUT_MODE || '0')
            });
            
            result = await client.startVoiceChatS2S({
                appId: process.env.VOLC_APP_ID,
                roomId,
                taskId,
                targetUserId,
                s2sConfig: config,
                welcomeMessage: `Hi! I'm ${charConfig.name}. Let's learn English together!`,
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
            characterName: charConfig.name,
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

const server = app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║   English Friend - StartVoiceChat Server             ║
║   (Frontend Creates Room Flow)                       ║
║                                                      ║
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
process.on('SIGTERM', async () => {
    console.log('\n👋 正在关闭服务...');
    
    // 关闭所有活跃会话
    for (const [roomId, session] of sessions) {
        try {
            await client.stopVoiceChat({
                appId: process.env.VOLC_APP_ID,
                roomId,
                taskId: session.taskId
            });
        } catch (e) {
            console.error(`❌ 关闭房间 ${roomId} 失败:`, e.message);
        }
    }
    
    server.close(() => {
        console.log('✅ 服务已关闭');
        process.exit(0);
    });
});
