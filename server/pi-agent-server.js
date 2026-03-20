/**
 * PI-Agent-Core 第三方 Agent 服务
 * 接入火山引擎 StartVoiceChat CustomLLM 模式
 * 
 * 接口标准：
 * - POST /v1/chat/completions
 * - Content-Type: application/json
 * - Response: SSE (text/event-stream)
 * - 结束符：data: [DONE]
 */

import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

// ==================== 配置 ====================

const PORT = process.env.PI_AGENT_PORT || 3001;
const API_KEY = process.env.PI_AGENT_API_KEY || 'pi-agent-secret-key';
const MODEL_NAME = process.env.PI_AGENT_MODEL || 'pi-agent-v1';

// 系统提示词 - 英语老师角色
const SYSTEM_PROMPT = `You are a friendly and encouraging English teacher for kids aged 6-10. 
Your role is to:
- Speak in simple, clear English
- Use short sentences and common vocabulary
- Be patient and supportive
- Ask follow-up questions to encourage conversation
- Praise the child's efforts
- Make learning fun and engaging
- Focus on conversational English for daily scenarios (zoo, market, home, park)

Always respond in English only, unless the child specifically asks for Chinese help.`;

// 对话历史存储（内存版，生产环境用 Redis）
const conversationHistory = new Map();

// ==================== 工具函数 ====================

/**
 * 生成唯一请求 ID
 */
function generateId() {
    return `pi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 构建消息内容（包含系统提示词和历史对话）
 */
function buildMessages(requestMessages, sessionId) {
    const messages = [
        { role: 'system', content: SYSTEM_PROMPT }
    ];
    
    // 添加历史对话（最多保留 5 轮）
    if (conversationHistory.has(sessionId)) {
        const history = conversationHistory.get(sessionId);
        messages.push(...history.slice(-10)); // 保留最近 5 轮
    }
    
    // 添加当前请求
    messages.push(...requestMessages);
    
    return messages;
}

/**
 * 保存对话历史
 */
function saveHistory(sessionId, userMessage, assistantMessage) {
    if (!conversationHistory.has(sessionId)) {
        conversationHistory.set(sessionId, []);
    }
    
    const history = conversationHistory.get(sessionId);
    history.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantMessage }
    );
    
    // 限制历史记录长度（最多 10 条）
    if (history.length > 10) {
        history.splice(0, history.length - 10);
    }
}

/**
 * 模拟 AI 回复生成（替换为真实的 pi-agent-core 调用）
 * TODO: 集成真实的 pi-agent-core SDK
 */
async function generateResponse(messages, options = {}) {
    const { temperature = 0.7, max_tokens = 500 } = options;
    
    // 提取用户最新消息
    const userMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    // 模拟流式返回的回复内容
    const responseText = generateEnglishTeacherResponse(userMessage);
    
    return {
        text: responseText,
        usage: {
            prompt_tokens: Math.ceil(messages.join(' ').length / 4),
            completion_tokens: Math.ceil(responseText.length / 4),
            total_tokens: 0 // 会在返回时计算
        }
    };
}

/**
 * 生成英语老师风格的回复（示例逻辑）
 * TODO: 替换为真实的 LLM 调用
 */
function generateEnglishTeacherResponse(userMessage) {
    const lowerMsg = userMessage.toLowerCase();
    
    // 场景识别和回复
    if (lowerMsg.includes('zoo') || lowerMsg.includes('animal')) {
        return "Great! Let's talk about animals! 🦁 What's your favorite animal? Can you tell me why you like it?";
    }
    
    if (lowerMsg.includes('lion')) {
        return "YES! Lions are amazing! 🦁 They are big and strong. Can you roar like a lion? ROAAAR! 😄";
    }
    
    if (lowerMsg.includes('elephant')) {
        return "Elephants are wonderful! 🐘 They have long noses called trunks. Can you show me an elephant trunk with your arm?";
    }
    
    if (lowerMsg.includes('color') || lowerMsg.includes('colour')) {
        return "Colors are so fun! 🌈 What's your favorite color? Mine is blue, like the sky!";
    }
    
    if (lowerMsg.includes('name')) {
        return "What a lovely question! My name is Teacher AI! 😊 What's YOUR name?";
    }
    
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi ')) {
        return "Hello there! 👋 It's so nice to see you! How are you today? Are you ready to learn some English?";
    }
    
    if (lowerMsg.includes('thank')) {
        return "You're very welcome! 😊 You're doing such a great job! Keep it up!";
    }
    
    // 默认鼓励式回复
    const encouragements = [
        "That's wonderful! 🌟 Can you tell me more?",
        "Excellent! 👏 I'm so proud of you! What else?",
        "Great job! 🎉 You're learning so fast!",
        "Wow! That's amazing! 💫 Tell me more about it!",
        "Perfect! ⭐ You're such a good student!"
    ];
    
    return encouragements[Math.floor(Math.random() * encouragements.length)];
}

// ==================== API 路由 ====================

/**
 * 健康检查
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'pi-agent-core',
        model: MODEL_NAME,
        timestamp: new Date().toISOString(),
        activeSessions: conversationHistory.size
    });
});

/**
 * Chat Completions API (SSE 流式)
 * 火山引擎 StartVoiceChat CustomLLM 模式调用此接口
 */
app.post('/v1/chat/completions', async (req, res) => {
    const requestId = generateId();
    const timestamp = Math.floor(Date.now() / 1000);
    
    console.log(`📥 [${requestId}] Received chat request`);
    console.log('   Messages:', JSON.stringify(req.body.messages, null, 2));
    
    const {
        messages = [],
        stream = false,
        temperature = 0.7,
        max_tokens = 500,
        top_p = 0.9,
        model = MODEL_NAME,
        custom = null,
        parallel_tool_calls = false
    } = req.body;
    
    // 提取 session ID（从 custom 字段或消息中）
    const sessionId = custom ? `session_${Date.now()}` : 'default';
    
    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Request-ID', requestId);
    
    try {
        // 构建完整的消息历史
        const fullMessages = buildMessages(messages, sessionId);
        
        // 生成 AI 回复
        const response = await generateResponse(fullMessages, {
            temperature,
            max_tokens
        });
        
        console.log(`🤖 [${requestId}] Generated response:`, response.text);
        
        // 流式返回
        if (stream) {
            // 第一个包：role
            res.write(`data: ${JSON.stringify({
                id: requestId,
                object: 'chat.completion.chunk',
                created: timestamp,
                model: model,
                choices: [{
                    index: 0,
                    finish_reason: null,
                    delta: { role: 'assistant' }
                }],
                stream_options: { include_usage: true }
            })}\n\n`);
            
            // 分词流式返回（模拟）
            const words = response.text.split(' ');
            for (let i = 0; i < words.length; i++) {
                const word = words[i] + (i < words.length - 1 ? ' ' : '');
                
                res.write(`data: ${JSON.stringify({
                    id: requestId,
                    object: 'chat.completion.chunk',
                    created: timestamp,
                    model: model,
                    choices: [{
                        index: 0,
                        finish_reason: null,
                        delta: { content: word }
                    }],
                    stream_options: { include_usage: true }
                })}\n\n`);
                
                // 模拟延迟（50ms 每词）
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // 最后一个包：finish_reason + usage
            response.usage.total_tokens = response.usage.prompt_tokens + response.usage.completion_tokens;
            
            res.write(`data: ${JSON.stringify({
                id: requestId,
                object: 'chat.completion.chunk',
                created: timestamp,
                model: model,
                choices: [{
                    index: 0,
                    finish_reason: 'stop',
                    delta: {}
                }],
                usage: response.usage,
                stream_options: { include_usage: true }
            })}\n\n`);
            
            // 结束符
            res.write('data: [DONE]\n\n');
            res.end();
            
            // 保存对话历史
            const userMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
            saveHistory(sessionId, userMessage, response.text);
            
            console.log(`✅ [${requestId}] Stream completed`);
            
        } else {
            // 非流式返回（兼容 OpenAI 格式）
            res.json({
                id: requestId,
                object: 'chat.completion',
                created: timestamp,
                model: model,
                choices: [{
                    index: 0,
                    finish_reason: 'stop',
                    message: {
                        role: 'assistant',
                        content: response.text
                    }
                }],
                usage: response.usage
            });
        }
        
    } catch (error) {
        console.error(`❌ [${requestId}] Error:`, error);
        
        // 错误处理
        res.write(`data: ${JSON.stringify({
            id: requestId,
            object: 'chat.completion.chunk',
            created: timestamp,
            model: model,
            choices: [{
                index: 0,
                finish_reason: 'error',
                delta: { content: 'Sorry, I encountered an error.' }
            }],
            error: error.message
        })}\n\n`);
        
        res.write('data: [DONE]\n\n');
        res.end();
    }
});

/**
 * 验证接口（火山引擎要求）
 */
app.post('/api/verify', (req, res) => {
    console.log('🔍 Verification request received');
    res.json({
        status: 'ok',
        message: 'PI-Agent-Core is ready',
        endpoint: '/v1/chat/completions',
        supports_stream: true,
        model: MODEL_NAME
    });
});

// ==================== 启动服务 ====================

app.listen(PORT, () => {
    console.log('🚀 PI-Agent-Core Server started');
    console.log(`   Port: ${PORT}`);
    console.log(`   Model: ${MODEL_NAME}`);
    console.log(`   Endpoint: http://localhost:${PORT}/v1/chat/completions`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Verify: http://localhost:${PORT}/api/verify`);
    console.log('');
    console.log('📋火山引擎 StartVoiceChat 配置示例:');
    console.log(JSON.stringify({
        LLMConfig: {
            Mode: 'CustomLLM',
            Url: `http://your-server:${PORT}/v1/chat/completions`,
            APIKey: `Bearer ${API_KEY}`,
            ModelName: MODEL_NAME,
            Temperature: 0.7,
            MaxTokens: 500,
            TopP: 0.9
        }
    }, null, 2));
});
