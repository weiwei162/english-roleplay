/**
 * 双 Agent 并行处理模块
 * 
 * 架构：
 * - Fast Agent：无工具，快速文本回复
 * - Tool Agent：有工具，异步处理工具调用
 * 
 * 流程：
 * 1. 用户消息到达
 * 2. 两个 Agent 并行运行
 * 3. Fast Agent 立即返回文本
 * 4. Tool Agent 后台分析并执行工具
 * 5. 工具结果缓存，注入到下一轮对话
 */

import { Agent } from '@mariozechner/pi-agent-core';
import { getModel } from '@mariozechner/pi-ai';
import { isLangSmithAvailable, attachLangSmithTracing } from './langsmith-trace.js';

// 工具定义（与主服务共享）
export function createTools(sendToolCallToClient, toolCallSessionMap) {
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
            const roomId = toolCallSessionMap.get(toolCallId);
            
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
            
            if (emoji && roomId) {
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
            const roomId = toolCallSessionMap.get(toolCallId);
            
            const score = Math.floor(Math.random() * 20) + 80;
            const feedback = score >= 95 ? "Perfect! 🌟" : score >= 90 ? "Excellent! 👏" : "Great job! 👍";
            const starCount = score >= 95 ? 3 : score >= 90 ? 2 : 1;
            
            if (roomId) {
                (async () => {
                    try {
                        sendToolCallToClient(roomId, { type: 'showStars', count: starCount });
                    } catch (error) {
                        console.error(`❌ [Stars] ${error.message}`);
                    } finally {
                        toolCallSessionMap.delete(toolCallId);
                    }
                })();
            }
            
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
            const roomId = toolCallSessionMap.get(toolCallId);
            
            if (roomId) {
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
            const roomId = toolCallSessionMap.get(toolCallId);
            
            if (roomId) {
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
            }
            
            return {
                content: [{ type: 'text', text: `I'm finding a picture of ${query} for you! It should appear in a moment.` }],
                details: { query, orientation, status: 'searching' }
            };
        }
    };

    return [dictionaryTool, pronunciationTool, showEmojiTool, showImageTool];
}

/**
 * 双 Agent 管理器
 */
export class DualAgentManager {
    constructor(options) {
        this.sessionId = options.sessionId;
        this.systemPrompt = options.systemPrompt;
        this.model = options.model;
        this.tools = options.tools;
        this.sendToolCallToClient = options.sendToolCallToClient;
        this.toolCallSessionMap = options.toolCallSessionMap;
        
        // 两个独立的 Agent
        this.fastAgent = null;
        this.toolAgent = null;
        
        // 消息历史（共享）
        this.messageHistory = [];
        
        // 工具执行结果缓存
        this.toolResults = new Map();
        
        // 状态
        this.isProcessing = false;
        
        // LangSmith 追踪
        this.fastTracer = null;
        this.toolTracer = null;
        
        this._initAgents();
    }
    
    /**
     * 初始化两个 Agent
     */
    _initAgents() {
        // Fast Agent - 无工具，快速回复
        this.fastAgent = new Agent({
            initialState: {
                systemPrompt: this.systemPrompt,
                model: this.model,
                thinkingLevel: 'off',
                tools: [], // 无工具
                messages: []
            }
        });
        
        // Tool Agent - 有工具，异步处理
        this.toolAgent = new Agent({
            initialState: {
                systemPrompt: this.systemPrompt + "\n\nNote: You can use tools to enhance your responses (show images, look up words, etc.). Analyze the conversation and call tools when appropriate.",
                model: this.model,
                thinkingLevel: 'off',
                tools: this.tools,
                messages: []
            },
            beforeToolCall: (context, signal) => {
                if (context.toolCall.id && this.sessionId) {
                    this.toolCallSessionMap.set(context.toolCall.id, this.sessionId);
                }
            }
        });
        
        // 附加 LangSmith 追踪
        if (isLangSmithAvailable()) {
            this.fastTracer = attachLangSmithTracing(this.fastAgent, `${this.sessionId}_fast`, 'english-roleplay-fast');
            this.toolTracer = attachLangSmithTracing(this.toolAgent, `${this.sessionId}_tool`, 'english-roleplay-tool');
        }
        
        console.log(`🎭 [DualAgent] Initialized for session: ${this.sessionId}`);
    }
    
    /**
     * 处理用户消息
     * @param {string} userMessage - 用户消息
     * @returns {Promise<Object>} - { fastResponse: string, toolTask: Promise }
     */
    async processMessage(userMessage) {
        if (this.isProcessing) {
            console.warn(`⚠️ [DualAgent] Already processing, queueing message`);
        }
        
        this.isProcessing = true;
        
        // 添加到消息历史
        this.messageHistory.push({
            role: 'user',
            content: userMessage,
            timestamp: Date.now()
        });
        
        // 同步消息历史到两个 Agent
        this._syncMessageHistory();
        
        // 并行运行两个 Agent
        const [fastResponse, toolTask] = await Promise.all([
            this._runFastAgent(userMessage),
            this._runToolAgent(userMessage)
        ]);
        
        this.isProcessing = false;
        
        return {
            fastResponse,
            toolTask
        };
    }
    
    /**
     * 同步消息历史到两个 Agent
     */
    _syncMessageHistory() {
        // 只同步最近的 N 条消息，避免上下文过长
        const recentMessages = this.messageHistory.slice(-10);
        
        this.fastAgent.state.messages = [...recentMessages];
        this.toolAgent.state.messages = [...recentMessages];
    }
    
    /**
     * 运行 Fast Agent（无工具，快速回复）
     */
    async _runFastAgent(userMessage) {
        const startTime = Date.now();
        
        try {
            let response = '';
            const unsubscribe = this.fastAgent.subscribe((event) => {
                if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_delta') {
                    response += event.assistantMessageEvent.delta;
                }
            });
            
            if (this.fastAgent.state.isStreaming) {
                await this.fastAgent.steer(userMessage);
            } else {
                await this.fastAgent.prompt(userMessage);
            }
            
            unsubscribe();
            
            // 将 Fast Agent 的回复添加到历史
            this.messageHistory.push({
                role: 'assistant',
                content: response,
                timestamp: Date.now(),
                source: 'fast'
            });
            
            const duration = Date.now() - startTime;
            console.log(`⚡ [FastAgent] Response in ${duration}ms: "${response.substring(0, 50)}..."`);
            
            return response;
            
        } catch (error) {
            console.error(`❌ [FastAgent] Error:`, error.message);
            return "I'm thinking about that...";
        }
    }
    
    /**
     * 运行 Tool Agent（有工具，异步处理）
     * 注意：这个不阻塞，后台运行
     */
    _runToolAgent(userMessage) {
        const startTime = Date.now();
        
        // 创建一个不阻塞的 Promise
        const toolPromise = (async () => {
            try {
                // 稍微延迟，让 Fast Agent 先返回
                await new Promise(resolve => setTimeout(resolve, 100));
                
                let response = '';
                const unsubscribe = this.toolAgent.subscribe((event) => {
                    if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_delta') {
                        response += event.assistantMessageEvent.delta;
                    }
                    
                    // 记录工具执行结果
                    if (event.type === 'tool_execution_end') {
                        this.toolResults.set(event.toolCallId, {
                            toolName: event.toolName,
                            result: event.result,
                            timestamp: Date.now()
                        });
                        console.log(`🔧 [ToolAgent] Tool completed: ${event.toolName}`);
                    }
                });
                
                if (this.toolAgent.state.isStreaming) {
                    await this.toolAgent.steer(userMessage);
                } else {
                    await this.toolAgent.prompt(userMessage);
                }
                
                unsubscribe();
                
                const duration = Date.now() - startTime;
                console.log(`🛠️  [ToolAgent] Processing completed in ${duration}ms`);
                
                return { response, hasTools: this.toolResults.size > 0 };
                
            } catch (error) {
                console.error(`❌ [ToolAgent] Error:`, error.message);
                return { response: '', hasTools: false, error: error.message };
            }
        })();
        
        // 返回 Promise（不 await，让它后台运行）
        return toolPromise;
    }
    
    /**
     * 获取最近的工具执行结果
     */
    getRecentToolResults(limit = 3) {
        const results = Array.from(this.toolResults.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
        
        return results;
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        if (this.fastTracer) {
            this.fastTracer();
        }
        if (this.toolTracer) {
            this.toolTracer();
        }
        
        this.fastAgent = null;
        this.toolAgent = null;
        this.messageHistory = [];
        this.toolResults.clear();
        
        console.log(`🧹 [DualAgent] Cleaned up session: ${this.sessionId}`);
    }
}

// 会话管理
const dualAgentSessions = new Map();

/**
 * 获取或创建 DualAgent 实例
 */
export function getOrCreateDualAgent(options) {
    const { sessionId, systemPrompt, model, sendToolCallToClient, toolCallSessionMap } = options;
    
    if (!dualAgentSessions.has(sessionId)) {
        const TOOLS = createTools(sendToolCallToClient, toolCallSessionMap);
        
        const manager = new DualAgentManager({
            sessionId,
            systemPrompt,
            model,
            tools: TOOLS,
            sendToolCallToClient,
            toolCallSessionMap
        });
        
        dualAgentSessions.set(sessionId, manager);
        console.log(`🎭 [DualAgent] Created new instance for: ${sessionId}`);
    }
    
    return dualAgentSessions.get(sessionId);
}

/**
 * 清理会话
 */
export function cleanupDualAgent(sessionId) {
    const manager = dualAgentSessions.get(sessionId);
    if (manager) {
        manager.cleanup();
        dualAgentSessions.delete(sessionId);
    }
}

export default {
    DualAgentManager,
    getOrCreateDualAgent,
    cleanupDualAgent,
    createTools
};
