/**
 * LangSmith 追踪模块 - pi-agent-core 完整事件集成
 * 
 * 追踪 pi-agent-core 的完整事件序列：
 * - agent_start / agent_end
 * - turn_start / turn_end
 * - message_start / message_update / message_end
 * - tool_execution_start / tool_execution_update / tool_execution_end
 * 
 * 使用方法：
 * 1. 设置环境变量：
 *    export LANGSMITH_TRACING=true
 *    export LANGSMITH_API_KEY="your-api-key"
 *    export LANGSMITH_PROJECT="english-roleplay"
 * 
 * 2. 在创建 Agent 时调用 attachLangSmithTracing(agent, sessionId)
 */

let langsmithAvailable = false;
let ClientClass = null;

// 尝试初始化 LangSmith
try {
    const langsmith = await import('langsmith');
    ClientClass = langsmith.Client;
    
    const apiKey = process.env.LANGSMITH_API_KEY;
    const tracingEnabled = process.env.LANGSMITH_TRACING === 'true';
    
    if (apiKey && tracingEnabled) {
        langsmithAvailable = true;
        console.log('✅ LangSmith tracing enabled (pi-agent-core events)');
    } else {
        console.log('ℹ️  LangSmith tracing disabled (set LANGSMITH_TRACING=true and LANGSMITH_API_KEY)');
    }
} catch (error) {
    console.warn('⚠️  LangSmith not available:', error.message);
}

/**
 * 获取 LangSmith 客户端
 * @returns {Client | null}
 */
function getClient() {
    if (!langsmithAvailable || !ClientClass) {
        return null;
    }
    try {
        return new ClientClass();
    } catch (error) {
        console.warn('⚠️  Failed to create LangSmith client:', error.message);
        return null;
    }
}

/**
 * 生成唯一的 run ID (UUID 格式，符合 LangSmith 要求)
 * LangSmith 要求 ID 匹配：^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
 * @returns {string}
 */
function generateRunId() {
    // 生成 UUID v4 格式：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const crypto = require('crypto');
    const bytes = crypto.randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    return bytes.toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

/**
 * 将 pi-agent-core 事件类型映射到 LangSmith run_type
 * @param {string} eventType 
 * @returns {string}
 */
function getRunTypeForEvent(eventType) {
    const mapping = {
        'agent_start': 'chain',
        'agent_end': 'chain',
        'turn_start': 'chain',
        'turn_end': 'chain',
        'message_start': 'llm',
        'message_update': 'llm',
        'message_end': 'llm',
        'tool_execution_start': 'tool',
        'tool_execution_update': 'tool',
        'tool_execution_end': 'tool'
    };
    return mapping[eventType] || 'chain';
}

/**
 * 将 pi-agent-core 事件名称映射到 LangSmith 名称
 * @param {string} eventType 
 * @returns {string}
 */
function getRunNameForEvent(eventType) {
    const mapping = {
        'agent_start': 'Agent Session',
        'agent_end': 'Agent Session',
        'turn_start': 'LLM Turn',
        'turn_end': 'LLM Turn',
        'message_start': 'Message',
        'message_update': 'Message Stream',
        'message_end': 'Message Complete',
        'tool_execution_start': 'Tool Call',
        'tool_execution_update': 'Tool Stream',
        'tool_execution_end': 'Tool Complete'
    };
    return mapping[eventType] || eventType;
}

/**
 * LangSmith 追踪器类
 * 管理单个会话的所有追踪 runs
 */
class LangSmithTracer {
    constructor(sessionId, projectName) {
        this.sessionId = sessionId;
        this.projectName = projectName || process.env.LANGSMITH_PROJECT || 'english-roleplay';
        this.client = getClient();
        this.runs = new Map(); // runId -> { id, parentId, name, type }
        this.rootRunId = null;
        this.agentRunId = null;
        
        // 事件堆栈，用于管理父子关系
        this.eventStack = [];
    }

    /**
     * 创建一个新的 run
     * @param {string} name - Run 名称
     * @param {string} runType - Run 类型
     * @param {Object} inputs - 输入数据
     * @param {string} parentId - 父 run ID
     * @param {Object} metadata - 元数据
     * @returns {Promise<string>} Run ID
     */
    async createRun(name, runType, inputs, parentId = null, metadata = {}) {
        if (!this.client) {
            return null;
        }

        const runId = generateRunId();
        
        // 确保 name 不为空且有效
        if (!name || typeof name !== 'string' || name.trim() === '') {
            name = `Unnamed_${runType}_${Date.now()}`;
        }
        
        try {
            await this.client.createRun({
                id: runId,
                name: name.trim(),
                run_type: runType,
                inputs: inputs || {},
                metadata: {
                    session_id: this.sessionId,
                    ...metadata
                },
                project_name: this.projectName,
                parent_run_id: parentId
            });
            
            this.runs.set(runId, { id: runId, parentId, name, type: runType });
            return runId;
        } catch (error) {
            console.warn(`⚠️  Failed to create run "${name}":`, error.message);
            return null;
        }
    }

    /**
     * 更新 run 的输出
     * @param {string} runId - Run ID
     * @param {Object} outputs - 输出数据
     * @param {Error} error - 错误（可选）
     */
    async updateRun(runId, outputs, error = null) {
        if (!this.client || !runId) {
            return;
        }

        try {
            await this.client.updateRun(runId, {
                outputs,
                error: error ? error.message : undefined
            });
        } catch (error) {
            console.warn(`⚠️  Failed to update run ${runId}:`, error.message);
        }
    }

    /**
     * 开始 agent 追踪
     * @param {Object} context - 上下文信息
     */
    async startAgent(context = {}) {
        const runId = await this.createRun(
            'Agent Session',
            'chain',
            {
                systemPrompt: context.systemPrompt,
                model: context.model,
                thinkingLevel: context.thinkingLevel,
                tools: context.tools?.map(t => t.name) || []
            },
            null,
            { request_id: context.requestId }
        );
        
        this.agentRunId = runId;
        this.rootRunId = runId;
        return runId;
    }

    /**
     * 结束 agent 追踪
     * @param {Object} result - 结果数据
     * @param {Error} error - 错误（可选）
     */
    async endAgent(result, error = null) {
        if (this.agentRunId) {
            await this.updateRun(this.agentRunId, {
                messages: result.messages,
                totalTurns: result.turns,
                totalToolCalls: result.toolCalls
            }, error);
            this.agentRunId = null;
        }
    }

    /**
     * 开始 turn 追踪
     * @param {number} turnIndex - Turn 索引
     * @param {Object} context - 上下文
     * @returns {Promise<string>} Run ID
     */
    async startTurn(turnIndex, context = {}) {
        const runId = await this.createRun(
            `Turn ${turnIndex + 1}`,
            'chain',
            {
                turnIndex,
                messages: context.messages,
                toolCalls: context.toolCalls
            },
            this.rootRunId,
            { turn_index: turnIndex }
        );
        
        // 将 turn 推入堆栈，作为后续 message/tool 的父级
        this.eventStack.push({ type: 'turn', runId });
        return runId;
    }

    /**
     * 结束 turn 追踪
     * @param {Object} result - 结果数据
     */
    async endTurn(result) {
        // 弹出 turn 堆栈
        const turnEvent = this.eventStack.pop();
        if (turnEvent && turnEvent.type === 'turn') {
            await this.updateRun(turnEvent.runId, {
                assistantMessage: result.message,
                toolResults: result.toolResults
            });
        }
    }

    /**
     * 开始 message 追踪
     * @param {string} role - 消息角色 (user/assistant/toolResult)
     * @param {Object} message - 消息内容
     * @returns {Promise<string>} Run ID
     */
    async startMessage(role, message) {
        // 获取当前父级（turn 或 root）
        const parentId = this.eventStack.length > 0 
            ? this.eventStack[this.eventStack.length - 1].runId 
            : this.rootRunId;

        const runId = await this.createRun(
            `${role} Message`,
            'llm',
            {
                role,
                content: message.content,
                timestamp: message.timestamp
            },
            parentId,
            { message_role: role }
        );
        
        // 将 message 推入堆栈，用于 streaming 更新
        this.eventStack.push({ type: 'message', runId, role, content: '' });
        return runId;
    }

    /**
     * 更新 message（streaming 场景）
     * @param {string} delta - 增量文本
     */
    async updateMessage(delta) {
        const messageEvent = this.eventStack.find(e => e.type === 'message');
        if (messageEvent && messageEvent.runId) {
            messageEvent.content += delta;
            // 注意：streaming 更新不频繁调用 updateRun 以避免 API 限制
        }
    }

    /**
     * 结束 message 追踪
     * @param {Object} message - 完整消息
     */
    async endMessage(message) {
        const messageEvent = this.eventStack.pop();
        if (messageEvent && messageEvent.type === 'message') {
            await this.updateRun(messageEvent.runId, {
                role: message.role,
                content: message.content || messageEvent.content,
                toolCalls: message.toolCalls
            });
        }
    }

    /**
     * 开始 tool 执行追踪
     * @param {Object} toolCall - 工具调用信息
     * @returns {Promise<string>} Run ID
     */
    async startTool(toolCall) {
        // 获取当前父级（turn）
        const parentId = this.eventStack.length > 0 
            ? this.eventStack[this.eventStack.length - 1].runId 
            : this.rootRunId;

        const runId = await this.createRun(
            `Tool: ${toolCall.name}`,
            'tool',
            {
                toolCallId: toolCall.id,
                toolName: toolCall.name,
                arguments: toolCall.args
            },
            parentId,
            { 
                tool_call_id: toolCall.id,
                tool_name: toolCall.name
            }
        );
        
        // 将 tool 推入堆栈
        this.eventStack.push({ type: 'tool', runId, toolCallId: toolCall.id });
        return runId;
    }

    /**
     * 更新 tool 执行（streaming 场景）
     * @param {Object} partialResult - 部分结果
     */
    async updateTool(partialResult) {
        const toolEvent = this.eventStack.find(e => e.type === 'tool');
        if (toolEvent) {
            // streaming 更新通常不记录，除非有重要进度
        }
    }

    /**
     * 结束 tool 执行追踪
     * @param {Object} result - 工具执行结果
     * @param {boolean} isError - 是否错误
     */
    async endTool(result, isError = false) {
        const toolEvent = this.eventStack.pop();
        if (toolEvent && toolEvent.type === 'tool') {
            await this.updateRun(toolEvent.runId, {
                result: result.content,
                details: result.details,
                isError
            }, isError ? new Error('Tool execution failed') : null);
        }
    }
}

// 全局追踪器映射：sessionId -> LangSmithTracer
const tracers = new Map();

/**
 * 为 Agent 附加 LangSmith 追踪
 * @param {import('@mariozechner/pi-agent-core').Agent} agent - Agent 实例
 * @param {string} sessionId - 会话 ID
 * @param {string} projectName - 项目名称（可选）
 */
export function attachLangSmithTracing(agent, sessionId, projectName) {
    if (!langsmithAvailable) {
        console.log('⚠️  LangSmith not available, skipping tracing');
        return () => {};
    }

    const tracer = new LangSmithTracer(sessionId, projectName);
    tracers.set(sessionId, tracer);

    // 订阅所有 agent 事件
    const unsubscribe = agent.subscribe((event) => {
        handleEvent(tracer, event, sessionId);
    });

    console.log(`📊 LangSmith tracing attached to session: ${sessionId}`);

    // 返回清理函数
    return () => {
        unsubscribe();
        tracers.delete(sessionId);
    };
}

/**
 * 处理 pi-agent-core 事件
 * @param {LangSmithTracer} tracer - 追踪器实例
 * @param {Object} event - pi-agent-core 事件
 * @param {string} sessionId - 会话 ID
 */
async function handleEvent(tracer, event, sessionId) {
    try {
        switch (event.type) {
            case 'agent_start':
                await tracer.startAgent({
                    systemPrompt: event.state?.systemPrompt,
                    model: event.state?.model?.id || 'unknown',
                    thinkingLevel: event.state?.thinkingLevel,
                    tools: event.state?.tools?.map(t => ({ name: t.name })),
                    requestId: `req_${Date.now()}`
                });
                console.log(`🔵 [${sessionId}] agent_start`);
                break;

            case 'agent_end':
                await tracer.endAgent({
                    messages: event.state?.messages || [],
                    turns: event.state?.messages?.filter(m => m.role === 'assistant').length || 0,
                    toolCalls: event.state?.messages?.reduce((acc, m) => acc + (m.toolCalls?.length || 0), 0) || 0
                });
                console.log(`🟢 [${sessionId}] agent_end`);
                break;

            case 'turn_start':
                await tracer.startTurn(event.turnIndex || 0, {
                    messages: event.context?.messages,
                    toolCalls: event.context?.toolCalls
                });
                console.log(`🔵 [${sessionId}] turn_start (turn ${event.turnIndex || 0})`);
                break;

            case 'turn_end':
                await tracer.endTurn({
                    message: event.message,
                    toolResults: event.toolResults || []
                });
                console.log(`🟢 [${sessionId}] turn_end`);
                break;

            case 'message_start':
                await tracer.startMessage(event.message?.role || 'unknown', event.message || {});
                console.log(`🔵 [${sessionId}] message_start (${event.message?.role})`);
                break;

            case 'message_update':
                if (event.assistantMessageEvent?.type === 'text_delta') {
                    await tracer.updateMessage(event.assistantMessageEvent.delta);
                }
                break;

            case 'message_end':
                await tracer.endMessage(event.message || {});
                console.log(`🟢 [${sessionId}] message_end`);
                break;

            case 'tool_execution_start':
                await tracer.startTool({
                    id: event.toolCallId,
                    name: event.toolName,
                    args: event.args
                });
                console.log(`🔵 [${sessionId}] tool_execution_start (${event.toolName})`);
                break;

            case 'tool_execution_update':
                await tracer.updateTool(event.partialResult || {});
                break;

            case 'tool_execution_end':
                await tracer.endTool({
                    content: event.result?.content,
                    details: event.result?.details
                }, event.isError || false);
                console.log(`🟢 [${sessionId}] tool_execution_end (${event.toolCallId})`);
                break;

            default:
                // 忽略未知事件类型
                break;
        }
    } catch (error) {
        console.warn(`⚠️  Failed to handle event ${event.type}:`, error.message);
    }
}

/**
 * 检查 LangSmith 是否可用
 * @returns {boolean}
 */
export function isLangSmithAvailable() {
    return langsmithAvailable;
}

/**
 * 获取追踪器实例
 * @param {string} sessionId - 会话 ID
 * @returns {LangSmithTracer | undefined}
 */
export function getTracer(sessionId) {
    return tracers.get(sessionId);
}

/**
 * 清理所有追踪器
 */
export function cleanupAllTracers() {
    tracers.clear();
}

export default {
    isLangSmithAvailable,
    attachLangSmithTracing,
    getTracer,
    cleanupAllTracers
};
