/**
 * PI-Agent-Core 真实实现
 * 基于 @mariozechner/pi-agent-core 包
 * 
 * 功能:
 * - 使用真实的 LLM（Claude/OpenAI/其他）
 * - 支持工具调用（查字典、评分等）
 * - 事件流式输出
 * - 对话历史管理
 * 
 * 文档：https://github.com/badlogic/pi-mono/tree/main/packages/agent
 */

const express = require('express');
const cors = require('cors');
const { Agent } = require('@mariozechner/pi-agent-core');
const { getModel } = require('@mariozechner/pi-ai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ==================== 配置 ====================

const PORT = process.env.PI_AGENT_PORT || 3001;
const API_KEY = process.env.PI_AGENT_API_KEY || 'pi-agent-secret-key';

// LLM 提供商配置
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'anthropic'; // 'anthropic', 'openai', 'google'
const LLM_MODEL = process.env.LLM_MODEL || 'claude-sonnet-4-20250514';
const API_KEY_ENV = process.env.LLM_API_KEY; // 从环境变量获取

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

// ==================== Agent 实例 ====================

// 存储每个会话的 agent 实例
const agents = new Map();

/**
 * 创建或获取会话的 Agent 实例
 */
function getOrCreateAgent(sessionId) {
    if (!agents.has(sessionId)) {
        // 创建新的 Agent
        const agent = new Agent({
            initialState: {
                systemPrompt: SYSTEM_PROMPT,
                model: getModel(LLM_PROVIDER, LLM_MODEL),
                thinkingLevel: 'off', // 关闭思考过程，直接输出
                tools: [dictionaryTool, pronunciationTool, sceneHintTool],
                messages: []
            },
            
            // 转换消息格式（如果需要自定义消息类型）
            convertToLlm: (messages) => {
                // 过滤掉非标准消息，只保留 user/assistant/toolResult
                return messages.filter(msg => 
                    msg.role === 'user' || 
                    msg.role === 'assistant' || 
                    msg.role === 'toolResult'
                );
            },
            
            // 转换上下文（剪枝旧消息）
            transformContext: async (messages, signal) => {
                // 保留最近 10 条消息（5 轮对话）
                if (messages.length > 10) {
                    return messages.slice(-10);
                }
                return messages;
            },
            
            // 工具执行模式
            toolExecution: 'parallel',
            
            // 工具调用前钩子
            beforeToolCall: async ({ toolCall, args, context }) => {
                console.log(`🔧 Before tool call: ${toolCall.name}`, args);
                // 可以在这里阻止某些工具调用
                return undefined; // 允许执行
            },
            
            // 工具调用后钩子
            afterToolCall: async ({ toolCall, result, isError, context }) => {
                console.log(`✅ After tool call: ${toolCall.name}`, isError ? 'ERROR' : 'OK');
                // 可以在这里处理结果
                return undefined;
            }
        });
        
        agents.set(sessionId, agent);
        console.log(`🆕 Created new agent for session: ${sessionId}`);
    }
    
    return agents.get(sessionId);
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
        activeSessions: agents.size
    });
});

/**
 * Chat Completions API (SSE 流式)
 * 兼容 OpenAI 和火山引擎 CustomLLM 格式
 */
app.post('/v1/chat/completions', async (req, res) => {
    const requestId = `pi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Math.floor(Date.now() / 1000);
    
    console.log(`\n📥 [${requestId}] Received chat request`);
    console.log('   Provider:', LLM_PROVIDER);
    console.log('   Model:', LLM_MODEL);
    
    const {
        messages = [],
        stream = false,
        temperature = 0.7,
        max_tokens = 500,
        top_p = 0.9,
        model = LLM_MODEL,
        custom = null,
        session_id = 'default'
    } = req.body;
    
    // 提取 session ID
    const sessionId = custom ? `session_${Date.now()}` : (session_id || 'default');
    
    // 获取或创建 Agent
    const agent = getOrCreateAgent(sessionId);
    
    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Request-ID', requestId);
    
    try {
        // 提取用户最新消息
        const userMessage = messages.filter(m => m.role === 'user').pop();
        if (!userMessage) {
            throw new Error('No user message found');
        }
        
        console.log(`💬 User message: ${userMessage.content.substring(0, 50)}...`);
        
        // 订阅 Agent 事件
        const eventQueue = [];
        let assistantMessage = '';
        let toolCalls = [];
        let isDone = false;
        
        const unsubscribe = agent.subscribe((event) => {
            console.log(`📊 Event: ${event.type}`);
            
            switch (event.type) {
                case 'message_update':
                    if (event.assistantMessageEvent?.type === 'text_delta') {
                        const delta = event.assistantMessageEvent.delta;
                        assistantMessage += delta;
                        
                        // 流式返回文本
                        if (stream) {
                            res.write(`data: ${JSON.stringify({
                                id: requestId,
                                object: 'chat.completion.chunk',
                                created: timestamp,
                                model: model,
                                choices: [{
                                    index: 0,
                                    finish_reason: null,
                                    delta: { content: delta }
                                }],
                                stream_options: { include_usage: true }
                            })}\n\n`);
                        }
                    }
                    break;
                    
                case 'tool_execution_start':
                    toolCalls.push({
                        name: event.toolName,
                        args: event.args
                    });
                    console.log(`🔧 Tool started: ${event.toolName}`);
                    break;
                    
                case 'tool_execution_end':
                    console.log(`✅ Tool completed: ${event.toolName}`);
                    break;
                    
                case 'message_end':
                    console.log(`💬 Assistant message complete`);
                    break;
                    
                case 'turn_end':
                    console.log(`🔄 Turn complete`);
                    break;
                    
                case 'agent_end':
                    console.log(`✅ Agent processing complete`);
                    isDone = true;
                    break;
            }
        });
        
        // 发送提示给 Agent
        await agent.prompt(userMessage.content);
        
        // 等待处理完成
        await agent.waitForIdle();
        
        // 取消订阅
        unsubscribe();
        
        console.log(`📝 Final assistant message: ${assistantMessage.substring(0, 100)}...`);
        
        // 流式结束
        if (stream) {
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
                usage: {
                    prompt_tokens: Math.ceil(messages.join(' ').length / 4),
                    completion_tokens: Math.ceil(assistantMessage.length / 4),
                    total_tokens: 0
                },
                stream_options: { include_usage: true }
            })}\n\n`);
            
            res.write('data: [DONE]\n\n');
            res.end();
        } else {
            // 非流式返回
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
                        content: assistantMessage
                    }
                }],
                usage: {
                    prompt_tokens: Math.ceil(messages.join(' ').length / 4),
                    completion_tokens: Math.ceil(assistantMessage.length / 4),
                    total_tokens: 0
                }
            });
        }
        
        console.log(`✅ [${requestId}] Response sent`);
        
    } catch (error) {
        console.error(`❌ [${requestId}] Error:`, error);
        
        // 错误处理
        if (stream) {
            res.write(`data: ${JSON.stringify({
                id: requestId,
                object: 'chat.completion.chunk',
                created: timestamp,
                model: model,
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
