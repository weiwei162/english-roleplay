/**
 * PI-Agent-Core 真实实现
 * 基于 @mariozechner/pi-ai 包 (OpenAI-compatible API)
 * 
 * 功能:
 * - 使用真实的 LLM（Claude/OpenAI/其他）
 * - 支持工具调用（查字典、评分等）
 * - 事件流式输出
 * - 对话历史管理
 * 
 * 文档：https://github.com/badlogic/pi-mono/tree/main/packages/ai
 */

import express from 'express';
import cors from 'cors';
import { getModel, stream, complete, Type } from '@mariozechner/pi-ai';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

// ==================== 配置 ====================

const PORT = process.env.PI_AGENT_PORT || 3001;
const API_KEY = process.env.PI_AGENT_API_KEY || 'pi-agent-secret-key';

// LLM 提供商配置 (OpenAI-compatible API)
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai'; // 'openai', 'anthropic', 'google', 'ollama', 'openrouter'
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';
const API_KEY_ENV = process.env.LLM_API_KEY; // 从环境变量获取
const BASE_URL = process.env.LLM_BASE_URL; // 自定义 API 地址（可选，用于 Ollama 等）

// ==================== 工具定义 ====================

/**
 * 工具 1: 查字典
 */
const dictionaryTool = {
    name: 'dictionary',
    description: 'Look up the meaning of an English word for kids',
    parameters: Type.Object({
        word: Type.String({ description: 'The English word to look up' })
    }),
    execute: async ({ word }) => {
        const definitions = {
            'lion': 'A big yellow cat that roars. King of animals! 🦁',
            'elephant': 'A very big gray animal with a long nose (trunk). 🐘',
            'giraffe': 'A very tall animal with a long neck. 🦒',
            'monkey': 'A playful animal that loves bananas. 🐵',
            'zebra': 'A horse with black and white stripes. 🦓',
            'apple': 'A red or green fruit. Crunchy and sweet! 🍎',
            'banana': 'A yellow curved fruit. Monkeys love it! 🍌',
            'carrot': 'An orange vegetable. Rabbits love carrots! 🥕',
            'milk': 'A white drink. Makes you strong! 🥛',
            'sun': 'The bright yellow thing in the sky. Gives us light! ☀️',
            'flower': 'A beautiful colorful plant. Smells nice! 🌸',
            'frog': 'A green animal that jumps and says "ribbit"! 🐸',
            'butterfly': 'A colorful flying insect. Very pretty! 🦋'
        };
        
        const definition = definitions[word.toLowerCase()] || `Sorry, I don't know the word "${word}" yet. Let me explain it in a simple way!`;
        
        return {
            word,
            definition,
            example: `Example sentence: "The ${word} is fun and amazing!"`
        };
    }
};

/**
 * 工具 2: 发音评分
 */
const pronunciationTool = {
    name: 'pronunciation_score',
    description: 'Score the pronunciation of an English word or sentence',
    parameters: Type.Object({
        text: Type.String({ description: 'The text to score' })
    }),
    execute: async ({ text }) => {
        const score = Math.floor(Math.random() * 20) + 80;
        
        let feedback;
        if (score >= 95) feedback = "Perfect! 🌟 Amazing pronunciation!";
        else if (score >= 90) feedback = "Excellent! 👏 Very good!";
        else if (score >= 85) feedback = "Great job! 👍 Keep practicing!";
        else feedback = "Good try! 😊 Let's try again together!";
        
        return { score, feedback, tips: `Great job saying "${text}"!` };
    }
};

/**
 * 工具 3: 场景提示
 */
const sceneHintTool = {
    name: 'scene_hint',
    description: 'Get conversation hints for the current learning scene',
    parameters: Type.Object({
        scene: Type.String({ 
            enum: ['zoo', 'market', 'home', 'park'],
            description: 'The current scene' 
        })
    }),
    execute: async ({ scene }) => {
        const hints = {
            zoo: {
                topic: 'Animals',
                questions: ["What's your favorite animal?", "Can you roar like a lion?"],
                vocabulary: ['lion', 'elephant', 'giraffe', 'monkey', 'zebra']
            },
            market: {
                topic: 'Food',
                questions: ["What fruit do you like?", "Do you like vegetables?"],
                vocabulary: ['apple', 'banana', 'carrot', 'milk']
            },
            home: {
                topic: 'Daily Routine',
                questions: ["What time do you wake up?", "What's for breakfast?"],
                vocabulary: ['morning', 'breakfast', 'clean', 'toy']
            },
            park: {
                topic: 'Nature',
                questions: ["Do you like sunny days?", "What color are the flowers?"],
                vocabulary: ['sun', 'flower', 'frog', 'butterfly']
            }
        };
        return hints[scene] || { topic: 'Conversation', questions: ['Tell me more!'], vocabulary: [] };
    }
};

const TOOLS = [dictionaryTool, pronunciationTool, sceneHintTool];

// 系统提示词 - 英语老师角色
const SYSTEM_PROMPT = `You are a friendly and encouraging English teacher for kids aged 6-10.

Your role is to:
- Speak in simple, clear English with short sentences
- Use common vocabulary suitable for children
- Be patient, supportive, and enthusiastic
- Ask follow-up questions to encourage conversation
- Praise the child's efforts frequently
- Make learning fun and engaging
- Focus on conversational English for daily scenarios

Scenarios you'll teach:
1. Zoo - Talk about animals (lion, elephant, giraffe, monkey, zebra)
2. Market - Talk about food (apple, banana, carrot, milk)
3. Home - Daily routines (morning, breakfast, cleaning, playing)
4. Park - Outdoor activities (sun, flowers, frog, butterfly)

Important rules:
- Always respond in English only (unless child asks for Chinese help)
- Keep responses under 30 words for better TTS
- Use emojis to make it fun 🦁🌟🎉
- Ask one question at a time
- Never use complex grammar or advanced vocabulary
- Be encouraging: "Great job!", "Excellent!", "Well done!"`;

// ==================== 工具定义 ====================

/**
 * 工具 1: 查字典
 */
const dictionaryTool = {
    name: 'dictionary',
    description: 'Look up the meaning of an English word',
    parameters: {
        type: 'object',
        properties: {
            word: {
                type: 'string',
                description: 'The English word to look up'
            }
        },
        required: ['word']
    },
    execute: async ({ word }) => {
        // 简单的字典实现（可以替换为真实 API）
        const definitions = {
            'lion': 'A big yellow cat that roars. King of animals! 🦁',
            'elephant': 'A very big gray animal with a long nose (trunk). 🐘',
            'giraffe': 'A very tall animal with a long neck. 🦒',
            'monkey': 'A playful animal that loves bananas. 🐵',
            'zebra': 'A horse with black and white stripes. 🦓',
            'apple': 'A red or green fruit. Crunchy and sweet! 🍎',
            'banana': 'A yellow curved fruit. Monkeys love it! 🍌',
            'carrot': 'An orange vegetable. Rabbits love carrots! 🥕',
            'milk': 'A white drink. Makes you strong! 🥛',
            'sun': 'The bright yellow thing in the sky. Gives us light! ☀️',
            'flower': 'A beautiful colorful plant. Smells nice! 🌸',
            'frog': 'A green animal that jumps and says "ribbit"! 🐸',
            'butterfly': 'A colorful flying insect. Very pretty! 🦋'
        };
        
        const definition = definitions[word.toLowerCase()] || `Sorry, I don't know the word "${word}" yet. Can you ask your teacher?`;
        
        return {
            word,
            definition,
            example: `Example: "The ${word} is fun!"`
        };
    }
};

/**
 * 工具 2: 发音评分
 */
const pronunciationTool = {
    name: 'pronunciation_score',
    description: 'Score the pronunciation of an English word or sentence',
    parameters: {
        type: 'object',
        properties: {
            text: {
                type: 'string',
                description: 'The text to score'
            }
        },
        required: ['text']
    },
    execute: async ({ text }) => {
        // 模拟评分（可以替换为真实语音识别 API）
        const score = Math.floor(Math.random() * 20) + 80; // 80-100
        
        let feedback;
        if (score >= 95) {
            feedback = "Perfect! 🌟 Amazing pronunciation!";
        } else if (score >= 90) {
            feedback = "Excellent! 👏 Very good!";
        } else if (score >= 85) {
            feedback = "Great job! 👍 Keep practicing!";
        } else {
            feedback = "Good try! 😊 Let's try again together!";
        }
        
        return {
            text,
            score,
            feedback,
            tips: `Try to emphasize the stressed syllable in "${text}"`
        };
    }
};

/**
 * 工具 3: 场景提示
 */
const sceneHintTool = {
    name: 'scene_hint',
    description: 'Get a hint for the current scene to help the conversation',
    parameters: {
        type: 'object',
        properties: {
            scene: {
                type: 'string',
                enum: ['zoo', 'market', 'home', 'park'],
                description: 'The current scene'
            }
        },
        required: ['scene']
    },
    execute: async ({ scene }) => {
        const hints = {
            zoo: {
                topic: 'Animals',
                questions: [
                    "What's your favorite animal?",
                    "Can you roar like a lion?",
                    "Which animal is the tallest?"
                ],
                vocabulary: ['lion', 'elephant', 'giraffe', 'monkey', 'zebra'],
                activity: 'Let\'s name all the animals we see!'
            },
            market: {
                topic: 'Food and Shopping',
                questions: [
                    "What fruit do you like?",
                    "Do you like vegetables?",
                    "What's your favorite color?"
                ],
                vocabulary: ['apple', 'banana', 'carrot', 'milk'],
                activity: 'Let\'s go shopping together!'
            },
            home: {
                topic: 'Daily Routine',
                questions: [
                    "What time do you wake up?",
                    "What's for breakfast?",
                    "Do you help clean your room?"
                ],
                vocabulary: ['morning', 'breakfast', 'clean', 'toy'],
                activity: 'Let\'s talk about your day!'
            },
            park: {
                topic: 'Nature and Outdoor',
                questions: [
                    "Do you like sunny days?",
                    "What color are the flowers?",
                    "Can you jump like a frog?"
                ],
                vocabulary: ['sun', 'flower', 'frog', 'butterfly'],
                activity: 'Let\'s explore the park!'
            }
        };
        
        return hints[scene] || {
            topic: 'Conversation',
            questions: ['Tell me more!', 'What do you think?'],
            vocabulary: [],
            activity: 'Let\'s talk!'
        };
    }
};

// ==================== 会话管理 ====================

// 存储每个会话的上下文
const sessions = new Map();

/**
 * 获取或创建会话上下文
 */
function getOrCreateSession(sessionId) {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            systemPrompt: SYSTEM_PROMPT,
            messages: [],
            tools: TOOLS
        });
        console.log(`🆕 Created new session: ${sessionId}`);
    }
    return sessions.get(sessionId);
}

/**
 * 处理工具调用
 */
async function executeTool(toolCall) {
    const { name, arguments: args } = toolCall;
    
    console.log(`🔧 Executing tool: ${name}`, args);
    
    const tool = TOOLS.find(t => t.name === name);
    if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
    }
    
    try {
        const result = await tool.execute(args);
        console.log(`✅ Tool ${name} completed`);
        return result;
    } catch (error) {
        console.error(`❌ Tool ${name} failed:`, error);
        throw error;
    }
}

// ==================== API 路由 ====================

/**
 * 健康检查
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'pi-agent-core-real',
        provider: LLM_PROVIDER,
        model: LLM_MODEL,
        timestamp: new Date().toISOString(),
        activeSessions: sessions.size
    });
});

/**
 * Chat Completions API (SSE 流式)
 * 使用 pi-ai 的 stream/complete API
 */
app.post('/v1/chat/completions', async (req, res) => {
    const requestId = `pi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Math.floor(Date.now() / 1000);
    
    console.log(`\n📥 [${requestId}] Received chat request`);
    
    const {
        messages = [],
        stream = false,
        temperature = 0.7,
        max_tokens = 500,
        top_p = 0.9,
        model: requestedModel = LLM_MODEL,
        custom = null,
        session_id = 'default'
    } = req.body;
    
    // 提取 session ID
    const sessionId = session_id || `session_${Date.now()}`;
    
    // 获取或创建会话上下文
    const session = getOrCreateSession(sessionId);
    
    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Request-ID', requestId);
    
    try {
        // 提取用户消息
        const userMessage = messages.filter(m => m.role === 'user').pop();
        if (!userMessage) {
            throw new Error('No user message found');
        }
        
        // 添加到会话历史
        session.messages.push({
            role: 'user',
            content: [{ type: 'text', text: userMessage.content }],
            timestamp: Date.now()
        });
        
        console.log(`💬 User: ${userMessage.content.substring(0, 50)}...`);
        
        // 创建模型实例
        const modelConfig = BASE_URL 
            ? getModel(LLM_PROVIDER, requestedModel, { baseUrl: BASE_URL })
            : getModel(LLM_PROVIDER, requestedModel);
        
        // 流式处理
        if (stream) {
            const context = {
                systemPrompt: session.systemPrompt,
                messages: session.messages,
                tools: session.tools
            };
            
            const s = stream(modelConfig, context);
            let assistantContent = [];
            let toolCalls = [];
            
            for await (const event of s) {
                switch (event.type) {
                    case 'text_delta':
                        // 流式返回文本
                        res.write(`data: ${JSON.stringify({
                            id: requestId,
                            object: 'chat.completion.chunk',
                            created: timestamp,
                            model: requestedModel,
                            choices: [{
                                index: 0,
                                finish_reason: null,
                                delta: { content: event.delta }
                            }],
                            stream_options: { include_usage: true }
                        })}\n\n`);
                        break;
                        
                    case 'toolcall_end':
                        toolCalls.push(event.toolCall);
                        console.log(`🔧 Tool called: ${event.toolCall.name}`);
                        break;
                }
            }
            
            // 获取完整消息
            const finalMessage = await s.result();
            assistantContent = finalMessage.content;
            
            // 处理工具调用
            if (toolCalls.length > 0) {
                for (const toolCall of toolCalls) {
                    try {
                        const result = await executeTool(toolCall);
                        
                        // 添加工具结果到上下文
                        session.messages.push({
                            role: 'toolResult',
                            toolCallId: toolCall.id,
                            toolName: toolCall.name,
                            content: [{ type: 'text', text: JSON.stringify(result) }],
                            isError: false,
                            timestamp: Date.now()
                        });
                        
                        // 继续生成回复
                        const continuation = await complete(modelConfig, {
                            systemPrompt: session.systemPrompt,
                            messages: session.messages,
                            tools: session.tools
                        });
                        
                        // 流式返回后续内容
                        for (const block of continuation.content) {
                            if (block.type === 'text') {
                                res.write(`data: ${JSON.stringify({
                                    id: requestId,
                                    object: 'chat.completion.chunk',
                                    created: timestamp,
                                    model: requestedModel,
                                    choices: [{
                                        index: 0,
                                        finish_reason: null,
                                        delta: { content: block.text }
                                    }],
                                    stream_options: { include_usage: true }
                                })}\n\n`);
                            }
                        }
                        
                        // 添加 AI 回复到历史
                        session.messages.push({
                            role: 'assistant',
                            content: continuation.content,
                            timestamp: Date.now()
                        });
                        
                    } catch (error) {
                        console.error(`❌ Tool execution failed:`, error);
                    }
                }
            } else {
                // 没有工具调用，添加 AI 回复
                session.messages.push({
                    role: 'assistant',
                    content: assistantContent,
                    timestamp: Date.now()
                });
            }
            
            // 流式结束
            res.write(`data: ${JSON.stringify({
                id: requestId,
                object: 'chat.completion.chunk',
                created: timestamp,
                model: requestedModel,
                choices: [{
                    index: 0,
                    finish_reason: 'stop',
                    delta: {}
                }],
                usage: {
                    prompt_tokens: finalMessage.usage?.input || 0,
                    completion_tokens: finalMessage.usage?.output || 0,
                    total_tokens: (finalMessage.usage?.input || 0) + (finalMessage.usage?.output || 0)
                },
                stream_options: { include_usage: true }
            })}\n\n`);
            
            res.write('data: [DONE]\n\n');
            res.end();
            
        } else {
            // 非流式模式
            const context = {
                systemPrompt: session.systemPrompt,
                messages: session.messages,
                tools: session.tools
            };
            
            const response = await complete(modelConfig, context);
            
            // 添加回复到历史
            session.messages.push({
                role: 'assistant',
                content: response.content,
                timestamp: Date.now()
            });
            
            // 返回完整响应
            res.json({
                id: requestId,
                object: 'chat.completion',
                created: timestamp,
                model: requestedModel,
                choices: [{
                    index: 0,
                    finish_reason: 'stop',
                    message: {
                        role: 'assistant',
                        content: response.content
                            .filter(b => b.type === 'text')
                            .map(b => b.text)
                            .join(' ')
                    }
                }],
                usage: {
                    prompt_tokens: response.usage?.input || 0,
                    completion_tokens: response.usage?.output || 0,
                    total_tokens: (response.usage?.input || 0) + (response.usage?.output || 0)
                }
            });
        }
        
        console.log(`✅ [${requestId}] Response sent, ${session.messages.length} messages in history`);
        
    } catch (error) {
        console.error(`❌ [${requestId}] Error:`, error);
        
        if (stream) {
            res.write(`data: ${JSON.stringify({
                id: requestId,
                object: 'chat.completion.chunk',
                created: timestamp,
                model: requestedModel,
                choices: [{
                    index: 0,
                    finish_reason: 'error',
                    delta: { content: `Error: ${error.message}` }
                }]
            })}\n\n`);
            
            res.write('data: [DONE]\n\n');
            res.end();
        } else {
            res.status(500).json({
                error: {
                    message: error.message,
                    type: 'agent_error'
                }
            });
        }
    }
});

/**
 * 清理不活跃的会话（定期运行）
 */
setInterval(() => {
    const now = Date.now();
    const inactiveThreshold = 10 * 60 * 1000; // 10 分钟
    
    for (const [sessionId, agent] of agents.entries()) {
        // 可以添加最后活跃时间跟踪
        // 如果超过阈值，清理 agent
        // agents.delete(sessionId);
    }
    
    console.log(`🧹 Active sessions: ${agents.size}`);
}, 60 * 1000);

// ==================== 优雅关闭 ====================

process.on('SIGTERM', () => {
    console.log('👋 Shutting down gracefully...');
    
    // 清理所有 agent
    for (const agent of agents.values()) {
        agent.abort();
    }
    
    agents.clear();
    process.exit(0);
});

// ==================== 启动服务 ====================

app.listen(PORT, () => {
    console.log('\n🚀 PI-Agent-Core (Real) Server started');
    console.log(`   Port: ${PORT}`);
    console.log(`   Provider: ${LLM_PROVIDER}`);
    console.log(`   Model: ${LLM_MODEL}`);
    console.log(`   API Key configured: ${!!API_KEY_ENV}`);
    console.log(`   Endpoint: http://localhost:${PORT}/v1/chat/completions`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log('\n📋 火山引擎 StartVoiceChat 配置:');
    console.log(JSON.stringify({
        LLMConfig: {
            Mode: 'CustomLLM',
            Url: `http://localhost:${PORT}/v1/chat/completions`,
            APIKey: `Bearer ${API_KEY}`,
            ModelName: `${LLM_PROVIDER}/${LLM_MODEL}`
        }
    }, null, 2));
    console.log('\n💡 确保设置了环境变量:');
    console.log('   LLM_PROVIDER=anthropic');
    console.log('   LLM_MODEL=claude-sonnet-4-20250514');
    console.log('   LLM_API_KEY=your-api-key\n');
});
