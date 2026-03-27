/**
 * LangSmith 追踪模块
 * 用于追踪 pi-agent-core 的 LLM 调用
 * 
 * 使用方法：
 * 1. 设置环境变量：
 *    export LANGSMITH_TRACING=true
 *    export LANGSMITH_API_KEY="your-api-key"
 *    export LANGSMITH_PROJECT="english-roleplay" (可选)
 * 
 * 2. 在 index-join-ai.js 中导入并初始化
 */

import { LangSmithTraceError } from 'langsmith/error';

let langsmithAvailable = false;
let wrapOpenAI = null;
let traceable = null;
let Client = null;

// 尝试初始化 LangSmith
try {
    const langsmith = await import('langsmith');
    wrapOpenAI = langsmith.wrapOpenAI;
    traceable = langsmith.traceable;
    Client = langsmith.Client;
    
    // 检查环境变量是否配置
    const apiKey = process.env.LANGSMITH_API_KEY;
    const tracingEnabled = process.env.LANGSMITH_TRACING === 'true';
    
    if (apiKey && tracingEnabled) {
        langsmithAvailable = true;
        console.log('✅ LangSmith tracing enabled');
    } else {
        console.log('ℹ️  LangSmith tracing disabled (set LANGSMITH_TRACING=true and LANGSMITH_API_KEY)');
    }
} catch (error) {
    console.warn('⚠️  LangSmith not available:', error.message);
}

/**
 * 创建 LangSmith 客户端
 * @returns {import('langsmith').Client | null}
 */
export function createLangSmithClient() {
    if (!langsmithAvailable || !Client) {
        return null;
    }
    
    try {
        const client = new Client();
        return client;
    } catch (error) {
        console.warn('⚠️  Failed to create LangSmith client:', error.message);
        return null;
    }
}

/**
 * 包装 OpenAI 客户端以启用追踪
 * @param {any} openaiClient - OpenAI 客户端实例
 * @returns {any} - 包装后的客户端
 */
export function wrapOpenAIClient(openaiClient) {
    if (!langsmithAvailable || !wrapOpenAI) {
        return openaiClient;
    }
    
    try {
        return wrapOpenAI(openaiClient);
    } catch (error) {
        console.warn('⚠️  Failed to wrap OpenAI client:', error.message);
        return openaiClient;
    }
}

/**
 * 创建可追踪的函数
 * @param {Function} fn - 要追踪的函数
 * @param {string} name - 追踪名称
 * @param {string} [projectName] - 项目名称
 * @returns {Function} - 包装后的函数
 */
export function createTraceableFunction(fn, name, projectName) {
    if (!langsmithAvailable || !traceable) {
        return fn;
    }
    
    try {
        return traceable(fn, {
            name,
            project_name: projectName || process.env.LANGSMITH_PROJECT || 'default'
        });
    } catch (error) {
        console.warn(`⚠️  Failed to create traceable function "${name}":`, error.message);
        return fn;
    }
}

/**
 * 手动创建追踪 run
 * @param {string} name - Run 名称
 * @param {string} runType - Run 类型 (llm, tool, chain, retriever, prompt, parser)
 * @param {Object} options - 选项
 * @returns {Object | null} - Run 管理器
 */
export async function createTraceRun(name, runType, options = {}) {
    if (!langsmithAvailable) {
        return null;
    }
    
    const client = createLangSmithClient();
    if (!client) {
        return null;
    }
    
    try {
        const runId = await client.createRun(name, {
            type: runType,
            ...options
        });
        
        return {
            runId,
            client,
            end: async (outputs, error) => {
                await client.updateRun(runId, {
                    outputs,
                    error: error ? error.message : undefined
                });
            }
        };
    } catch (error) {
        console.warn(`⚠️  Failed to create trace run "${name}":`, error.message);
        return null;
    }
}

/**
 * 记录 LLM 调用到 LangSmith
 * @param {Object} params - 参数
 * @param {string} params.sessionId - 会话 ID
 * @param {string} params.model - 模型名称
 * @param {Array} params.messages - 消息数组
 * @param {string} params.response - AI 响应
 * @param {number} params.duration - 耗时 (ms)
 * @param {Object} params.metadata - 额外元数据
 */
export async function logLLMCall({
    sessionId,
    model,
    messages,
    response,
    duration,
    metadata = {}
}) {
    if (!langsmithAvailable) {
        return;
    }
    
    const client = createLangSmithClient();
    if (!client) {
        return;
    }
    
    try {
        const runId = await client.createRun('chat_completion', {
            type: 'llm',
            inputs: { messages },
            outputs: { content: response },
            metadata: {
                session_id: sessionId,
                model,
                duration_ms: duration,
                ...metadata
            },
            project_name: process.env.LANGSMITH_PROJECT || 'english-roleplay'
        });
        
        await client.updateRun(runId, {
            outputs: { content: response }
        });
        
        console.log(`📊 Logged LLM call to LangSmith: ${runId}`);
    } catch (error) {
        console.warn('⚠️  Failed to log LLM call to LangSmith:', error.message);
    }
}

/**
 * 检查 LangSmith 是否可用
 * @returns {boolean}
 */
export function isLangSmithAvailable() {
    return langsmithAvailable;
}

export default {
    isLangSmithAvailable,
    createLangSmithClient,
    wrapOpenAIClient,
    createTraceableFunction,
    createTraceRun,
    logLLMCall
};
