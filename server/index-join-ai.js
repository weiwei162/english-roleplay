#!/usr/bin/env node
/**
 * 火山引擎 StartVoiceChat API 服务端 - AI 加入房间模式
 * 集成 OpenAI 兼容 LLM
 * 
 * 流程：
 * 1. 前端创建 RTC 房间并加入
 * 2. 前端调用 /api/join-ai 将 AI 加入房间
 * 3. 后端调用 StartVoiceChat API，AI 加入已存在的 RTC 房间
 * 4. 结束时调用 /api/leave-room 结束 AI 对话
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import { VolcStartVoiceChatClient, getComponentConfig, getS2SConfig, getCustomLLMConfig, CHARACTER_CONFIGS } from './volc-start-voicechat.js';
import { combineCharacterAndScenePrompt, getScenePrompt } from './prompts.js';
import { generateToken, generateWildcardToken, verifyToken } from './token-generator.js';
import { register, login, authMiddleware, optionalAuth } from './auth.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ==================== 配置 ====================

const AI_MODE = process.env.AI_MODE || 's2s'; // 'component', 's2s', 或 'custom'
const PORT = parseInt(process.env.PORT) || 3000;

// HTTPS 配置
const USE_HTTPS = process.env.USE_HTTPS === 'true';
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT) || 3443;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || './ssl/cert.pem';
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || './ssl/key.pem';

const frontendPath = path.join(__dirname, '..', 'frontend');

// 初始化客户端
const client = new VolcStartVoiceChatClient({
    accessKey: process.env.VOLC_ACCESS_KEY,
    secretKey: process.env.VOLC_SECRET_KEY,
    region: 'cn-north-1'
});

// 会话存储
const sessions = new Map();

// ==================== pi-agent-core 集成（真实 Agent） ====================

import { Agent } from '@mariozechner/pi-agent-core';
import { getModel } from '@mariozechner/pi-ai';

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai';
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_BASE_URL = process.env.LLM_BASE_URL;
const LLM_CUSTOM_PROVIDER = process.env.LLM_CUSTOM_PROVIDER || 'openai'; // 自定义 BASE_URL 时的提供商

// 获取模型（支持内置提供商和自定义 OpenAI compatible 服务）
function getLLMModel() {
    // 如果有自定义 BASE_URL，使用 openai-completions 兼容模式
    if (LLM_BASE_URL) {
        return {
            id: LLM_MODEL,
            name: LLM_MODEL,
            api: 'openai-completions',
            provider: LLM_CUSTOM_PROVIDER,
            baseUrl: LLM_BASE_URL,
            reasoning: false,
            input: ['text', 'image'],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 16384
        };
    }
    // 使用内置提供商
    return getModel(LLM_PROVIDER, LLM_MODEL);
}

const TEACHER_SYSTEM_PROMPT = `You are a friendly and encouraging English teacher for kids aged 6-10.

Your role:
- Speak in simple, clear English
- Use short sentences (under 30 words)
- Be patient and supportive
- Use emojis 🦁🌟🎉
- Ask follow-up questions
- Praise frequently

Always respond in English only.`;

// 工具定义（pi-agent-core 格式）
const dictionaryTool = {
    name: 'dictionary',
    description: 'Look up the meaning of an English word for kids',
    parameters: {
        type: 'object',
        properties: {
            word: { type: 'string', description: 'The English word to look up' }
        },
        required: ['word']
    },
    execute: async ({ word }) => {
        const definitions = {
            'lion': 'A big yellow cat that roars. King of animals! 🦁',
            'elephant': 'A very big gray animal with a long nose (trunk). 🐘',
            'giraffe': 'A very tall animal with a long neck. 🦒',
            'monkey': 'A playful animal that loves bananas. 🐵',
            'apple': 'A red or green fruit. Crunchy and sweet! 🍎',
            'banana': 'A yellow curved fruit. Monkeys love it! 🍌'
        };
        return { word, definition: definitions[word.toLowerCase()] || 'A special word!', example: `Example: "The ${word} is fun!"` };
    }
};

const pronunciationTool = {
    name: 'pronunciation_score',
    description: 'Score the pronunciation of an English word',
    parameters: {
        type: 'object',
        properties: {
            text: { type: 'string', description: 'The text to score' }
        },
        required: ['text']
    },
    execute: async ({ text }) => {
        const score = Math.floor(Math.random() * 20) + 80;
        const feedback = score >= 95 ? "Perfect! 🌟" : score >= 90 ? "Excellent! 👏" : "Great job! 👍";
        return { score, feedback };
    }
};

const TOOLS = [dictionaryTool, pronunciationTool];

// Agent 会话管理
const piAgents = new Map();

function getOrCreateAgent(sessionId) {
    if (!piAgents.has(sessionId)) {
        const agent = new Agent({
            initialState: {
                systemPrompt: TEACHER_SYSTEM_PROMPT,
                model: getLLMModel(),
                thinkingLevel: 'off',
                tools: TOOLS,
                messages: []
            }
        });
        piAgents.set(sessionId, agent);
    }
    return piAgents.get(sessionId);
}

// ==================== 静态文件 ====================

console.log('📁 Serving frontend from:', frontendPath);
console.log(`🤖 AI Mode: ${AI_MODE === 'component' ? '分组件模式' : AI_MODE === 'custom' ? '第三方 LLM (OpenAI)' : '端到端模式 (S2S)'}`);
console.log('🔄 Flow: Frontend creates room → AI joins via backend');

app.use(express.static(frontendPath, {
    maxAge: '1d',
    etag: true
}));

// ==================== 配置接口 ====================

app.get('/api/config', (req, res) => {
    res.json({
        success: true,
        config: {
            appId: process.env.VOLC_APP_ID || '',
            aiMode: AI_MODE,
            llmProvider: AI_MODE === 'custom' ? LLM_PROVIDER : 'N/A',
            llmModel: AI_MODE === 'custom' ? LLM_MODEL : 'N/A',
            volcConfigured: !!(process.env.VOLC_APP_ID && process.env.VOLC_APP_KEY),
            rtcConfigured: !!(process.env.VOLC_APP_ID && process.env.VOLC_APP_KEY),
            authEnabled: true
        }
    });
});

// ==================== 健康检查 ====================

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        config: {
            aiMode: AI_MODE,
            llmProvider: AI_MODE === 'custom' ? LLM_PROVIDER : 'N/A',
            llmModel: AI_MODE === 'custom' ? LLM_MODEL : 'N/A',
            volcConfigured: !!(process.env.VOLC_ACCESS_KEY && process.env.VOLC_SECRET_KEY),
            rtcConfigured: !!(process.env.VOLC_APP_ID && process.env.VOLC_APP_KEY),
            authEnabled: true
        },
        activeSessions: sessions.size,
        piAgentSessions: piAgents.size,
        flow: 'frontend-creates-room'
    });
});

app.get('/pi-agent/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'pi-agent-core',
        provider: LLM_PROVIDER,
        model: LLM_MODEL,
        timestamp: new Date().toISOString(),
        activeAgents: piAgents.size
    });
});

// ==================== Chat API (pi-agent-core) ====================

app.post('/v1/chat/completions', async (req, res) => {
    const requestId = `pi-${Date.now()}`;
    const timestamp = Math.floor(Date.now() / 1000);
    
    const {
        messages = [],
        stream = false,
        session_id = 'default'
    } = req.body;
    
    const sessionId = session_id || `session_${Date.now()}`;
    const agent = getOrCreateAgent(sessionId);
    
    try {
        const userMessage = messages.filter(m => m.role === 'user').pop();
        if (!userMessage) {
            return res.status(400).json({ error: 'No user message' });
        }
        
        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Request-ID', requestId);
            
            let assistantMessage = '';
            
            const unsubscribe = agent.subscribe((event) => {
                if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_delta') {
                    const delta = event.assistantMessageEvent.delta;
                    assistantMessage += delta;
                    
                    res.write(`data: ${JSON.stringify({
                        id: requestId,
                        object: 'chat.completion.chunk',
                        created: timestamp,
                        model: LLM_MODEL,
                        choices: [{
                            index: 0,
                            finish_reason: null,
                            delta: { content: delta }
                        }]
                    })}\n\n`);
                }
            });
            
            await agent.prompt(userMessage.content);
            await agent.waitForIdle();
            unsubscribe();
            
            res.write(`data: ${JSON.stringify({
                id: requestId,
                object: 'chat.completion.chunk',
                created: timestamp,
                model: LLM_MODEL,
                choices: [{ index: 0, finish_reason: 'stop', delta: {} }]
            })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
            
        } else {
            let assistantMessage = '';
            
            const unsubscribe = agent.subscribe((event) => {
                if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_delta') {
                    assistantMessage += event.assistantMessageEvent.delta;
                }
            });
            
            await agent.prompt(userMessage.content);
            await agent.waitForIdle();
            unsubscribe();
            
            res.json({
                id: requestId,
                object: 'chat.completion',
                created: timestamp,
                model: LLM_MODEL,
                choices: [{
                    index: 0,
                    finish_reason: 'stop',
                    message: { role: 'assistant', content: assistantMessage }
                }]
            });
        }
    } catch (error) {
        console.error('Chat API error:', error);
        if (stream) {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// ==================== 认证接口 ====================

app.post('/api/auth/register', (req, res) => {
    const { username, password, parentEmail } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username and password required' });
    }
    
    if (username.length < 3) {
        return res.status(400).json({ success: false, error: 'Username must be at least 3 characters' });
    }
    
    try {
        const result = register(username, password, parentEmail);
        res.json(result);  // register 返回 { success, token, user }
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username and password required' });
    }
    
    try {
        const result = login(username, password);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(401).json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 验证 Token ====================

app.post('/api/auth/verify', (req, res) => {
    const { token } = req.body;
    
    if (!token) {
        return res.status(400).json({ success: false, error: 'Token required' });
    }
    
    try {
        const user = verifyToken(token);
        res.json({
            success: true,
            user: { username: user.username, parentEmail: user.parentEmail }
        });
    } catch (error) {
        res.status(401).json({ success: false, error: 'Invalid token' });
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

// ==================== 获取 Token ====================

app.get('/api/token', optionalAuth, (req, res) => {
    try {
        const { roomId, uid } = req.query;
        
        if (!roomId || !uid) {
            return res.status(400).json({ 
                error: 'roomId and uid required',
                success: false
            });
        }
        
        // 直接使用 generateToken() 生成 Token（使用官方 AccessToken.js）
        const token = generateToken(
            process.env.VOLC_APP_ID,
            process.env.VOLC_APP_KEY,
            roomId,
            uid,
            86400 // 24 小时
        );
        
        const username = req.user ? req.user.username : 'anonymous';
        console.log('🔑 Generated token for:', { roomId, uid, user: username });
        
        res.json({
            success: true,
            roomId,
            uid,
            token,
            appId: process.env.VOLC_APP_ID,
            expireIn: 86400
        });
    } catch (error) {
        console.error('❌ Generate token error:', error);
        res.status(500).json({ 
            error: error.message,
            success: false
        });
    }
});

// ==================== AI 加入房间 ====================

app.post('/api/join-ai', authMiddleware, async (req, res) => {
    const { roomId, character, sceneId, targetUserId } = req.body;
    const userId = req.user.username;
    
    if (!roomId || !character || !sceneId || !targetUserId) {
        return res.status(400).json({ error: 'roomId, character, sceneId, and targetUserId required' });
    }
    
    // targetUserId: 真人用户 ID（前端传入）
    // agentUserId: AI Bot 的 ID（后端生成）
    const agentUserId = `ai_${character}_${roomId}`;
    
    // 生成 sessionId（与 userId、character、sceneId 绑定）
    // sessionId 只用于 custom 模式，传递给 pi-agent
    const sessionId = `session_${userId}_${character}_${sceneId}_${Date.now()}`;
    
    const combinedConfig = combineCharacterAndScenePrompt(CHARACTER_CONFIGS[character], sceneId);
    const sceneConfig = getScenePrompt(sceneId);
    const taskId = `task_${roomId}_${Date.now()}`;
    
    let result;
    
    if (AI_MODE === 'component') {
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
            agentUserId,
            asrConfig: config.ASRConfig,
            llmConfig: config.LLMConfig,
            ttsConfig: config.TTSConfig,
            welcomeMessage: sceneConfig.welcomeMessage,
            idleTimeout: 180
        });
    } else if (AI_MODE === 'custom') {
        // Feature 配置（用于 HTTP 域名测试）
        const feature = process.env.PI_AGENT_FEATURE ? JSON.parse(process.env.PI_AGENT_FEATURE) : undefined;
        
        const config = getCustomLLMConfig({
            customLlmUrl: process.env.PI_AGENT_URL || `http://localhost:${PORT}/v1/chat/completions`,
            customLlmApiKey: process.env.PI_AGENT_API_KEY || 'pi-agent-secret-key',
            customLlmModel: process.env.PI_AGENT_MODEL || LLM_MODEL,
            systemPrompt: combinedConfig.systemPrompt,
            temperature: parseFloat(process.env.PI_AGENT_TEMPERATURE || '0.7'),
            maxTokens: parseInt(process.env.PI_AGENT_MAX_TOKENS || '500'),
            topP: parseFloat(process.env.PI_AGENT_TOP_P || '0.9'),
            historyLength: parseInt(process.env.PI_AGENT_HISTORY_LENGTH || '3'),
            sessionId, // 传递 sessionId 给 pi-agent（放在 LLMConfig 里）
            feature, // Feature 参数，例如 {Http: true}
            asrAppId: process.env.VOLC_ASR_APP_ID,
            asrToken: process.env.VOLC_ASR_TOKEN,
            ttsAppId: process.env.VOLC_TTS_APP_ID,
            ttsToken: process.env.VOLC_TTS_TOKEN,
            ttsVoiceType: combinedConfig.ttsVoiceType,
            asrResourceId: process.env.VOLC_ASR_RESOURCE_ID,
            ttsResourceId: process.env.VOLC_TTS_RESOURCE_ID
        });
        
        result = await client.startVoiceChatComponent({
            appId: process.env.VOLC_APP_ID,
            roomId,
            taskId,
            targetUserId,
            agentUserId,
            asrConfig: config.ASRConfig,
            llmConfig: config.LLMConfig,
            ttsConfig: config.TTSConfig,
            welcomeMessage: sceneConfig.welcomeMessage,
            idleTimeout: 180
        });
    } else {
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
    
    sessions.set(roomId, {
        character,
        taskId,
        targetUserId,
        aiMode: AI_MODE,
        userId,
        scene: sceneId,
        sessionId,
        createdAt: Date.now()
    });
    
    console.log(`✅ AI joined room: ${roomId}, TaskId: ${taskId}`);
    
    res.json({
        roomId,
        taskId,
        character,
        characterName: CHARACTER_CONFIGS[character].name,
        targetUserId,
        aiMode: AI_MODE,
        success: true
    });
});

// ==================== 离开房间 ====================

app.post('/api/leave-room', authMiddleware, async (req, res) => {
    const { roomId, taskId } = req.body;
    
    if (!roomId || !taskId) {
        return res.status(400).json({ error: 'roomId and taskId required' });
    }
    
    try {
        await client.stopVoiceChat({
            appId: process.env.VOLC_APP_ID,
            roomId,
            taskId
        });
        
        sessions.delete(roomId);
        console.log(`✅ AI left room: ${roomId}`);
        
        res.json({ success: true, message: 'AI left room successfully' });
    } catch (error) {
        console.error('Leave room error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== 根路径 ====================

app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// ==================== 启动服务器 ====================

function startServer() {
    // 同时启动 HTTP 和 HTTPS 服务器
    startHTTP();
    
    if (USE_HTTPS) {
        try {
            const httpsOptions = {
                key: fs.readFileSync(SSL_KEY_PATH),
                cert: fs.readFileSync(SSL_CERT_PATH)
            };
            
            https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
                console.log(`✅ HTTPS server running on https://localhost:${HTTPS_PORT}`);
            });
        } catch (error) {
            console.error('❌ HTTPS setup failed:', error.message);
            console.log('⚠️  Only HTTP available');
        }
    }
}

function startHTTP() {
    app.listen(PORT, () => {
        console.log(`✅ HTTP server running on http://localhost:${PORT}`);
        console.log(`📱 Access: http://localhost:${PORT}`);
    });
}

startServer();
