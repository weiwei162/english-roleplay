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
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { VolcStartVoiceChatClient, getComponentConfig, getS2SConfig, getCustomLLMConfig, CHARACTER_CONFIGS, getCharacterConfig } from './volc-start-voicechat.js';
import { combineCharacterAndScenePrompt } from './prompts.js';
import { generateToken } from './token-generator.js';
import { register, login, verifyToken, authMiddleware } from './auth.js';
import { isLangSmithAvailable, attachLangSmithTracing, cleanupAllTracers } from './langsmith-trace.js';
import { getOrCreateDualAgent, cleanupDualAgent } from './dual-agent.js';
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

// ==================== WebSocket 支持（工具调用） ====================

// 房间 → WebSocket 映射
const roomSockets = new Map();

// 创建 WebSocket 服务器（与 HTTP 服务器共享端口）
let wss = null;

function initWebSocket(server) {
    wss = new WebSocketServer({ noServer: true });
    
    server.on('upgrade', (request, socket, head) => {
        const url = new URL(request.url, `http://${request.headers.host}`);
        
        // 只处理 /room/:roomId 路径
        const match = url.pathname.match(/^\/room\/(.+)$/);
        if (!match) {
            socket.destroy();
            return;
        }
        
        const roomId = match[1];
        
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request, roomId);
        });
    });
    
    wss.on('connection', (ws, request, roomId) => {
        console.log(`🔌 WebSocket connected: roomId=${roomId}`);
        
        // 保存 WebSocket 连接
        roomSockets.set(roomId, ws);
        
        ws.on('close', () => {
            console.log(`🔌 WebSocket disconnected: roomId=${roomId}`);
            roomSockets.delete(roomId);
        });
        
        ws.on('error', (error) => {
            console.error(`❌ WebSocket error: roomId=${roomId}`, error.message);
            roomSockets.delete(roomId);
        });
        
        // 发送欢迎消息
        ws.send(JSON.stringify({
            type: 'connected',
            roomId
        }));
    });
}

/**
 * 通过 WebSocket 发送工具调用指令到前端
 * @param {string} roomId - 房间 ID
 * @param {Object} toolCall - 工具调用数据
 */
export function sendToolCallToClient(roomId, toolCall) {
    const ws = roomSockets.get(roomId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(toolCall));
        return true;
    }
    console.error(`❌ [WebSocket] Room not found: ${roomId}`);
    return false;
}

// ==================== pi-agent-core 集成（真实 Agent） ====================

import { Agent } from '@mariozechner/pi-agent-core';
import { getModel } from '@mariozechner/pi-ai';

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai';
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';
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

// ==================== 工具执行辅助函数 ====================

/**
 * 验证 toolCallId 对应的 roomId 是否存在
 * @param {string} toolCallId - 工具调用 ID
 * @returns {string} - 房间 ID
 * @throws {Error} - 当房间不存在时抛出错误
 */
function validateRoomId(toolCallId) {
    const roomId = toolCallSessionMap.get(toolCallId);
    if (!roomId) {
        throw new Error('Room not found');
    }
    return roomId;
}

// ==================== 工具定义（pi-agent-core 格式） ====================

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
    execute: async (toolCallId, params, signal, onUpdate) => {
        const { word } = params;
        const roomId = validateRoomId(toolCallId);
        
        const definitions = {
            'lion': 'A big yellow cat that roars. King of animals! 🦁',
            'elephant': 'A very big gray animal with a long nose (trunk). 🐘',
            'giraffe': 'A very tall animal with a long neck. 🦒',
            'monkey': 'A playful animal that loves bananas. 🐵',
            'apple': 'A red or green fruit. Crunchy and sweet! 🍎',
            'banana': 'A yellow curved fruit. Monkeys love it! 🍌'
        };
        
        const definition = definitions[word?.toLowerCase()] || 'A special word!';
        const emoji = definition.split(' ').pop();
        
        if (emoji) {
            (async () => {
                try {
                    sendToolCallToClient(roomId, { type: 'showEmoji', emoji });
                } catch (error) {
                    console.error(`❌ [Emoji] ${error.message}`);
                } finally {
                    toolCallSessionMap.delete(toolCallId);
                }
            })();
        }
        
        return {
            content: [{ type: 'text', text: `${word}: ${definition} Example: "The ${word} is fun!"` }],
            details: { word, definition, status: 'started' }
        };
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
    execute: async (toolCallId, params, signal, onUpdate) => {
        const { text } = params;
        const roomId = validateRoomId(toolCallId);
        
        const score = Math.floor(Math.random() * 20) + 80;
        const feedback = score >= 95 ? "Perfect! 🌟" : score >= 90 ? "Excellent! 👏" : "Great job! 👍";
        const starCount = score >= 95 ? 3 : score >= 90 ? 2 : 1;
        
        (async () => {
            try {
                sendToolCallToClient(roomId, { type: 'showStars', count: starCount });
            } catch (error) {
                console.error(`❌ [Stars] ${error.message}`);
            } finally {
                toolCallSessionMap.delete(toolCallId);
            }
        })();
        
        return {
            content: [{ type: 'text', text: `Pronunciation score: ${score}/100 - ${feedback}` }],
            details: { score, feedback, status: 'started' }
        };
    }
};

const showEmojiTool = {
    name: 'showEmoji',
    description: 'Show an emoji to the child',
    parameters: {
        type: 'object',
        properties: {
            emoji: { type: 'string', description: 'Emoji to display, e.g., 🦁' }
        },
        required: ['emoji']
    },
    execute: async (toolCallId, params, signal, onUpdate) => {
        const { emoji } = params;
        const roomId = validateRoomId(toolCallId);
        
        (async () => {
            try {
                sendToolCallToClient(roomId, { type: 'showEmoji', emoji });
            } catch (error) {
                console.error(`❌ [Emoji] ${error.message}`);
            } finally {
                toolCallSessionMap.delete(toolCallId);
            }
        })();
        
        return {
            content: [{ type: 'text', text: `Look! ${emoji}! I'm showing it to you now.` }],
            details: { emoji, status: 'started' }
        };
    }
};

const showImageTool = {
    name: 'showImage',
    description: 'Search and display a real photo from Unsplash (e.g., animals, places, objects)',
    parameters: {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'Search query in English, e.g., "lion", "apple", "park"' },
            orientation: { type: 'string', description: 'Image orientation', enum: ['landscape', 'portrait', 'squarish'] }
        },
        required: ['query']
    },
    execute: async (toolCallId, params, signal, onUpdate) => {
        const { query, orientation = 'landscape' } = params;
        const roomId = validateRoomId(toolCallId);
        
        (async () => {
            try {
                const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
                let imageUrl = null;
                let photographer = 'Unknown';
                
                if (unsplashKey) {
                    try {
                        const response = await fetch(`${process.env.UNSPLASH_API_URL || 'https://api.unsplash.com'}/search/photos?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=1&client_id=${unsplashKey}`);
                        if (response.ok) {
                            const data = await response.json();
                            if (data.results?.length > 0) {
                                const img = data.results[0];
                                imageUrl = img.urls.regular || img.urls.small || img.urls.thumb;
                                photographer = img.user?.name || 'Unknown';
                            }
                        }
                    } catch (error) {
                        console.error(`❌ [Image] Unsplash: ${error.message}`);
                    }
                }
                
                if (!imageUrl) {
                    imageUrl = `https://picsum.photos/seed/${encodeURIComponent(query.toLowerCase())}/800/600`;
                }
                
                sendToolCallToClient(roomId, { type: 'showImage', url: imageUrl, caption: query, photographer });
            } catch (error) {
                console.error(`❌ [Image] ${error.message}`);
            } finally {
                toolCallSessionMap.delete(toolCallId);
            }
        })();
        
        return {
            content: [{ type: 'text', text: `I'm finding a picture of ${query} for you! It should appear in a moment.` }],
            details: { query, orientation, status: 'searching' }
        };
    }
};

// ==================== 工具列表 ====================
// 注意：每个工具自己决定是否需要推送消息到前端
// - 前端工具（显示图片、播放动画）：调用 sendToolCallToClient()
// - 后端工具（查天气、查订单）：不调用，直接返回结果
const TOOLS = [showEmojiTool, showImageTool];

// Agent 会话管理
const piAgents = new Map();

// ToolCallId 与 SessionId 映射关系
const toolCallSessionMap = new Map();

/**
 * 获取或创建 Agent 实例
 * @param {string} sessionId - 会话 ID
 * @param {string} systemPrompt - 系统提示词（根据角色和场景动态生成）
 */
function getOrCreateAgent(sessionId, systemPrompt) {
    if (!piAgents.has(sessionId)) {
        const agent = new Agent({
            initialState: {
                systemPrompt: systemPrompt,
                model: getLLMModel(),
                thinkingLevel: 'off',
                tools: TOOLS,
                messages: []
            },
            beforeToolCall: (context, signal) => {
                if (context.toolCall.id && sessionId) {
                    toolCallSessionMap.set(context.toolCall.id, sessionId);
                }
            }
        });
        
        // 附加 LangSmith 追踪（完整事件序列）
        if (isLangSmithAvailable()) {
            attachLangSmithTracing(agent, sessionId, 'english-roleplay');
        }
        
        piAgents.set(sessionId, agent);
    } else {
        // 更新已有 Agent 的 systemPrompt（如果提供了新的）
        if (systemPrompt) {
            const agent = piAgents.get(sessionId);
            agent.state.systemPrompt = systemPrompt;
        }
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
        architecture: 'dual-agent',
        timestamp: new Date().toISOString(),
        activeAgents: piAgents.size,
        features: {
            fastAgent: 'Text response (no tools)',
            toolAgent: 'Async tool execution'
        }
    });
});

// ==================== Chat API (Dual Agent - 并行处理) ====================

app.post('/v1/chat/completions', async (req, res) => {
    const requestId = `pi-${Date.now()}`;
    const timestamp = Math.floor(Date.now() / 1000);
    
    // 记录请求
    console.log(`\n📥 [${requestId}] POST /v1/chat/completions (Dual Agent)`);
    console.log(`   SessionId: ${req.query.session_id || 'N/A'}`);
    console.log(`   Messages:`, JSON.stringify(req.body.messages, null, 2));
    
    const {
        messages = [],
        stream = false
    } = req.body;
    
    const sessionId = req.query.session_id || `session_${Date.now()}`;
    
    // 从 sessionId 解析角色和场景信息
    // sessionId 格式：room_{character}_{sceneId}_{timestamp}
    let systemPrompt = '';
    const sessionParts = sessionId.split('_');
    if (sessionParts.length >= 3) {
        const character = sessionParts[1];
        const sceneId = sessionParts[2];
        
        // 获取角色和场景配置
        try {
            const characterConfig = getCharacterConfig(character, 'component');
            const combinedConfig = combineCharacterAndScenePrompt(characterConfig, sceneId);
            systemPrompt = combinedConfig.systemPrompt;
        } catch (error) {
            console.warn(`⚠️ [${requestId}] Failed to get dynamic systemPrompt: ${error.message}`);
        }
    }
    
    const startTime = Date.now();
    
    try {
        const userMessage = messages.filter(m => m.role === 'user').pop();
        if (!userMessage) {
            console.log(`❌ [${requestId}] No user message`);
            return res.status(400).json({ error: 'No user message' });
        }
        
        // 获取或创建 Dual Agent 实例
        const dualAgent = getOrCreateDualAgent({
            sessionId,
            systemPrompt,
            model: getLLMModel(),
            sendToolCallToClient,
            toolCallSessionMap
        });
        
        // 处理消息 - 双 Agent 并行运行
        const result = await dualAgent.processMessage(userMessage.content);
        
        const fastResponse = result.fastResponse;
        const toolTask = result.toolTask; // 后台运行，不阻塞
        
        // 记录 Fast Agent 响应时间
        const fastDuration = Date.now() - startTime;
        console.log(`⚡ [${requestId}] Fast response in ${fastDuration}ms`);
        
        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Request-ID', requestId);
            
            // 流式发送 Fast Agent 的回复
            const chunks = fastResponse.split(/(\s+)/);
            for (const chunk of chunks) {
                res.write(`data: ${JSON.stringify({
                    id: requestId,
                    object: 'chat.completion.chunk',
                    created: timestamp,
                    model: LLM_MODEL,
                    choices: [{ index: 0, finish_reason: null, delta: { content: chunk } }]
                })}\n\n`);
                await new Promise(resolve => setTimeout(resolve, 10)); // 模拟流式
            }
            
            res.write(`data: ${JSON.stringify({
                id: requestId,
                object: 'chat.completion.chunk',
                created: timestamp,
                model: LLM_MODEL,
                choices: [{ index: 0, finish_reason: 'stop', delta: {} }]
            })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
            
            // Tool Agent 在后台继续运行，不阻塞响应
            if (toolTask && typeof toolTask.then === 'function') {
                toolTask.then(toolResult => {
                    if (toolResult.hasTools) {
                        console.log(`🛠️  [${requestId}] Tool Agent completed ${Array.from(dualAgent.toolResults.values()).length} tool calls`);
                    }
                }).catch(error => {
                    console.error(`❌ [${requestId}] Tool Agent error:`, error.message);
                });
            }
            
        } else {
            // 非流式响应 - 直接返回 Fast Agent 的回复
            res.json({
                id: requestId,
                object: 'chat.completion',
                created: timestamp,
                model: LLM_MODEL,
                choices: [{
                    index: 0,
                    finish_reason: 'stop',
                    message: { role: 'assistant', content: fastResponse }
                }],
                // 包含工具执行状态（可选）
                metadata: {
                    fastResponseMs: fastDuration,
                    toolAgentRunning: true
                }
            });
            
            // Tool Agent 在后台继续运行
            if (toolTask && typeof toolTask.then === 'function') {
                toolTask.then(toolResult => {
                    if (toolResult.hasTools) {
                        console.log(`🛠️  [${requestId}] Tool Agent completed ${Array.from(dualAgent.toolResults.values()).length} tool calls`);
                    }
                }).catch(error => {
                    console.error(`❌ [${requestId}] Tool Agent error:`, error.message);
                });
            }
        }
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ [${requestId}] Chat API error after ${duration}ms:`, error.message);
        console.error(`   Stack:`, error.stack);
        
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

app.get('/api/token', authMiddleware, (req, res) => {
    try {
        const { roomId, uid } = req.query;
        const currentUserId = req.user.username;
        
        if (!roomId || !uid) {
            return res.status(400).json({ 
                error: 'roomId and uid required',
                success: false
            });
        }
        
        // 用户隔离：检查房间是否已被其他用户占用
        const session = sessions.get(roomId);
        if (session && session.userId !== currentUserId) {
            return res.status(403).json({ 
                success: false, 
                error: '该房间已被其他用户占用' 
            });
        }
        
        // 如果 session 不存在，记录当前用户为该房间的创建者（防止抢占）
        if (!session) {
            sessions.set(roomId, {
                userId: currentUserId,
                createdAt: Date.now(),
                temp: true // 标记为临时记录，等待 join-ai 确认
            });
            console.log('🔒 Room owner registered:', { roomId, userId: currentUserId });
        }
        
        // 直接使用 generateToken() 生成 Token（使用官方 AccessToken.js）
        const token = generateToken(
            process.env.VOLC_APP_ID,
            process.env.VOLC_APP_KEY,
            roomId,
            uid,
            86400 // 24 小时
        );
        
        console.log('🔑 Generated token for:', { roomId, uid, user: currentUserId });
        
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
    
    // 用户隔离：检查会话是否已存在且属于其他用户
    const existingSession = sessions.get(roomId);
    if (existingSession && existingSession.userId !== userId) {
        return res.status(403).json({ 
            success: false, 
            error: '该房间已被其他用户占用' 
        });
    }
    
    // 检查是否有临时记录（token 请求时创建），验证用户匹配
    if (existingSession && existingSession.temp) {
        console.log('✅ Confirming room ownership:', { roomId, userId });
        // 临时记录验证通过，将在下面更新为正式 session
    }
    
    // targetUserId: 真人用户 ID（前端传入）
    // agentUserId: AI Bot 的 ID（后端生成）
    const agentUserId = `ai_${roomId}`;
    
    // 根据 AI 模式获取角色配置（自动选择正确的 TTS 音色）
    const characterConfig = getCharacterConfig(character, AI_MODE);
    const combinedConfig = combineCharacterAndScenePrompt(characterConfig, sceneId);
    const taskId = `task_${roomId}_${Date.now()}`;
    
    let result;
    
    if (AI_MODE === 'component') {
        const config = getComponentConfig({
            asrAppId: process.env.VOLC_ASR_APP_ID,
            asrToken: process.env.VOLC_ASR_TOKEN,
            llmEndpointId: process.env.VOLC_LLM_ENDPOINT_ID,
            ttsAppId: process.env.VOLC_TTS_APP_ID,
            ttsToken: process.env.VOLC_TTS_TOKEN,
            ttsVoiceType: characterConfig.ttsVoiceType, // 使用角色配置的音色
            ttsResourceId: characterConfig.ttsResourceId, // 使用角色配置的 ResourceId（与音色匹配）
            systemPrompt: combinedConfig.systemPrompt,
            asrResourceId: process.env.VOLC_ASR_RESOURCE_ID,
            contextHistoryLength: 3
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
            welcomeMessage: combinedConfig.welcomeMessage,
            idleTimeout: 180
        });
    } else if (AI_MODE === 'custom') {
        const customLlmUrl = process.env.PI_AGENT_URL + `?session_id=${roomId}`;
        // Feature 配置（用于 HTTP 域名测试）
        const feature = process.env.PI_AGENT_FEATURE ? JSON.parse(process.env.PI_AGENT_FEATURE) : undefined;
        
        const config = getCustomLLMConfig({
            customLlmUrl,
            customLlmApiKey: process.env.PI_AGENT_API_KEY || 'pi-agent-secret-key',
            feature, // Feature 参数，例如 {Http: true}
            asrAppId: process.env.VOLC_ASR_APP_ID,
            asrToken: process.env.VOLC_ASR_TOKEN,
            ttsAppId: process.env.VOLC_TTS_APP_ID,
            ttsToken: process.env.VOLC_TTS_TOKEN,
            ttsVoiceType: characterConfig.ttsVoiceType, // 使用角色配置的音色
            ttsResourceId: characterConfig.ttsResourceId, // 使用角色配置的 ResourceId（与音色匹配）
            asrResourceId: process.env.VOLC_ASR_RESOURCE_ID,
            contextHistoryLength: 1
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
            welcomeMessage: combinedConfig.welcomeMessage,
            idleTimeout: 180
        });
    } else if (AI_MODE === 's2s') {
        const config = getS2SConfig({
            s2sAppId: process.env.VOLC_S2S_APP_ID,
            s2sToken: process.env.VOLC_S2S_TOKEN,
            modelVersion: process.env.VOLC_S2S_MODEL_VERSION || 'O',
            systemRole: combinedConfig.systemRole,
            speakingStyle: combinedConfig.speakingStyle,
            speaker: characterConfig.s2sSpeaker, // 使用 S2S 模式音色
            outputMode: parseInt(process.env.VOLC_S2S_OUTPUT_MODE || '0')
        });
        
        result = await client.startVoiceChatS2S({
            appId: process.env.VOLC_APP_ID,
            roomId,
            taskId,
            targetUserId,
            agentUserId,
            s2sConfig: config,
            welcomeMessage: combinedConfig.welcomeMessage,
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
        createdAt: Date.now()
    });
    
    console.log(`✅ AI joined room: ${roomId}, TaskId: ${taskId}`);
    
    res.json({
        roomId,
        taskId,
        character,
        characterName: characterConfig.name,
        targetUserId,
        aiMode: AI_MODE,
        success: true
    });
});

// ==================== 离开房间 ====================

app.post('/api/leave-room', authMiddleware, async (req, res) => {
    const { roomId, taskId } = req.body;
    const currentUserId = req.user.username;
    
    if (!roomId || !taskId) {
        return res.status(400).json({ error: 'roomId and taskId required' });
    }
    
    // 用户隔离：检查会话是否属于当前用户
    const session = sessions.get(roomId);
    if (session && session.userId !== currentUserId) {
        return res.status(403).json({ 
            success: false, 
            error: '无权操作其他用户的会话' 
        });
    }
    
    try {
        await client.stopVoiceChat({
            appId: process.env.VOLC_APP_ID,
            roomId,
            taskId
        });
        
        // 清理 Dual Agent 会话
        cleanupDualAgent(roomId);
        
        // 清理旧式 Agent 会话（兼容性）
        piAgents.delete(roomId);
        sessions.delete(roomId);
        
        console.log(`✅ AI left room: ${roomId} (user: ${currentUserId})`);
        
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
    const httpServer = startHTTP();
    
    // 初始化 WebSocket（共享 HTTP 服务器端口）
    initWebSocket(httpServer);
    console.log(`🔌 WebSocket server ready on ws://localhost:${PORT}/room/:roomId`);
    
    if (USE_HTTPS) {
        try {
            const httpsOptions = {
                key: fs.readFileSync(SSL_KEY_PATH),
                cert: fs.readFileSync(SSL_CERT_PATH)
            };
            
            const httpsServer = https.createServer(httpsOptions, app);
            httpsServer.listen(HTTPS_PORT, () => {
                console.log(`✅ HTTPS server running on https://localhost:${HTTPS_PORT}`);
            });
            
            // HTTPS 也支持 WebSocket
            initWebSocket(httpsServer);
        } catch (error) {
            console.error('❌ HTTPS setup failed:', error.message);
            console.log('⚠️  Only HTTP available');
        }
    }
}

function startHTTP() {
    const server = app.listen(PORT, () => {
        console.log(`✅ HTTP server running on http://localhost:${PORT}`);
        console.log(`📱 Access: http://localhost:${PORT}`);
    });
    return server;
}

startServer();
