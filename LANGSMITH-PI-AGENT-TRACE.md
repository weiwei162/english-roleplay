# LangSmith + pi-agent-core 完整事件追踪

本文档说明如何将 LangSmith 与 pi-agent-core 深度集成，追踪 **完整的 Agent 事件序列**。

## 📊 追踪的事件类型

基于 [pi-agent-core Event Sequence](https://github.com/badlogic/pi-mono/tree/main/packages/agent)，我们追踪以下事件：

### Agent 级别事件
| 事件 | 说明 | LangSmith Run Type |
|------|------|-------------------|
| `agent_start` | Agent 开始处理请求 | `chain` |
| `agent_end` | Agent 完成所有工作 | `chain` |

### Turn 级别事件
| 事件 | 说明 | LangSmith Run Type |
|------|------|-------------------|
| `turn_start` | 新的 LLM 调用开始 | `chain` |
| `turn_end` | LLM 调用 + 工具执行完成 | `chain` |

### Message 级别事件
| 事件 | 说明 | LangSmith Run Type |
|------|------|-------------------|
| `message_start` | 消息开始（user/assistant/toolResult） | `llm` |
| `message_update` | 消息流式更新（仅 assistant） | `llm` |
| `message_end` | 消息完成 | `llm` |

### Tool 级别事件
| 事件 | 说明 | LangSmith Run Type |
|------|------|-------------------|
| `tool_execution_start` | 工具开始执行 | `tool` |
| `tool_execution_update` | 工具流式进度 | `tool` |
| `tool_execution_end` | 工具执行完成 | `tool` |

## 🌳 事件层级结构

```
agent_start (chain)
├─ turn_start (chain)
│  ├─ message_start (llm) - user message
│  │  └─ message_end
│  ├─ message_start (llm) - assistant message
│  │  ├─ message_update (streaming)
│  │  └─ message_end
│  ├─ tool_execution_start (tool)
│  │  ├─ tool_execution_update
│  │  └─ tool_execution_end
│  ├─ message_start (llm) - toolResult message
│  │  └─ message_end
│  └─ turn_end
├─ turn_start (chain) - 第二轮（如果需要）
│  └─ ...
└─ agent_end
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd /home/gem/projects/english-roleplay/server
npm install langsmith
```

### 2. 配置环境变量

```bash
# .env
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LANGSMITH_PROJECT=english-roleplay
```

获取 API Key：
1. 访问 https://smith.langchain.com
2. 登录 → Settings → API Keys → Create API Key

### 3. 在代码中使用

```javascript
import { Agent } from '@mariozechner/pi-agent-core';
import { attachLangSmithTracing } from './langsmith-trace.js';

// 创建 Agent
const agent = new Agent({
    initialState: {
        systemPrompt: 'You are a helpful assistant.',
        model: getModel('openai', 'gpt-4o'),
        tools: [myTool1, myTool2]
    }
});

// 附加 LangSmith 追踪
const sessionId = `session_${Date.now()}`;
const cleanup = attachLangSmithTracing(agent, sessionId, 'english-roleplay');

// 使用 Agent
await agent.prompt('Hello!');

// 清理（可选，在会话结束时）
cleanup();
```

## 📝 完整示例

### 带工具调用的追踪

```javascript
import { Agent } from '@mariozechner/pi-agent-core';
import { attachLangSmithTracing } from './langsmith-trace.js';

// 定义工具
const searchTool = {
    name: 'search',
    description: 'Search the web',
    parameters: {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'Search query' }
        },
        required: ['query']
    },
    execute: async (toolCallId, params, signal, onUpdate) => {
        // 流式更新（可选）
        onUpdate?.({ 
            content: [{ type: 'text', text: 'Searching...' }],
            details: { status: 'searching' }
        });
        
        const result = await fetch(`https://api.example.com/search?q=${params.query}`);
        
        return {
            content: [{ type: 'text', text: await result.text() }],
            details: { query: params.query }
        };
    }
};

// 创建并追踪 Agent
const agent = new Agent({
    initialState: {
        systemPrompt: 'You are a helpful assistant with web search.',
        model: getModel('openai', 'gpt-4o'),
        tools: [searchTool]
    }
});

const sessionId = `session_${Date.now()}`;
attachLangSmithTracing(agent, sessionId);

// 触发多轮对话（包含工具调用）
await agent.prompt('Search for "latest AI news"');

// 在 LangSmith 中你会看到：
// 1. Agent Session (chain)
//    └─ Turn 1 (chain)
//       ├─ user Message (llm)
//       ├─ assistant Message (llm) - with toolCalls
//       ├─ Tool: search (tool)
//       │  └─ toolResult details
//       └─ toolResult Message (llm)
//    └─ Turn 2 (chain) - LLM responds to tool result
//       └─ assistant Message (llm)
```

## 🔍 在 LangSmith 中查看

1. 访问 https://smith.langchain.com
2. 选择项目 `english-roleplay`
3. 点击任意 trace 查看完整事件序列

### 示例 Trace 视图

```
Agent Session (chain) - 2.5s
├─ Turn 1 (chain) - 1.8s
│  ├─ user Message (llm) - 0ms
│  │  └─ inputs: { role: "user", content: "What's a lion?" }
│  ├─ assistant Message (llm) - 1.2s
│  │  └─ outputs: { content: "Let me look that up...", toolCalls: [...] }
│  ├─ Tool: dictionary (tool) - 500ms
│  │  ├─ inputs: { toolCallId: "abc123", name: "dictionary", args: { word: "lion" } }
│  │  └─ outputs: { result: "A big yellow cat...", details: {...} }
│  ├─ toolResult Message (llm) - 0ms
│  └─ Turn 1 complete
├─ Turn 2 (chain) - 700ms
│  ├─ assistant Message (llm) - 700ms
│  │  └─ outputs: { content: "A lion is a big yellow cat! 🦁" }
│  └─ Turn 2 complete
└─ Agent Session complete
```

## 🎯 追踪内容

每个事件都会记录：

### Inputs
- 消息内容（role, content, timestamp）
- 工具调用（toolCallId, toolName, arguments）
- 会话上下文（systemPrompt, model, tools）

### Outputs
- AI 响应内容
- 工具执行结果
- 完整对话历史

### Metadata
- `session_id`: 会话 ID
- `request_id`: 请求 ID
- `model`: 使用的模型
- `provider`: LLM 提供商
- `turn_index`: Turn 索引
- `message_role`: 消息角色
- `tool_call_id`: 工具调用 ID
- `tool_name`: 工具名称

## ⚙️ 高级配置

### 自定义项目名称

```javascript
attachLangSmithTracing(agent, sessionId, 'my-custom-project');
```

### 禁用追踪

```bash
# 设置环境变量
LANGSMITH_TRACING=false
```

### 多会话追踪

```javascript
const sessions = new Map();

function getSession(sessionId) {
    if (!sessions.has(sessionId)) {
        const agent = new Agent({ ... });
        attachLangSmithTracing(agent, sessionId);
        sessions.set(sessionId, agent);
    }
    return sessions.get(sessionId);
}
```

## 🧪 测试

```bash
# 设置环境变量
export LANGSMITH_TRACING=true
export LANGSMITH_API_KEY=lsv2_xxx

# 运行测试（如果有测试脚本）
node test-langsmith.js
```

## 📈 最佳实践

### 1. 会话管理
- 为每个用户会话创建独立的 Agent 实例
- 使用唯一的 sessionId（如 `room_{character}_{timestamp}`）
- 在会话结束时调用 cleanup 函数

### 2. 性能优化
- LangSmith 追踪是异步的，不会阻塞主流程
- 消息 streaming 更新不会频繁调用 API（避免限制）
- 错误处理确保追踪失败不影响主业务

### 3. 数据安全
- 不要在 trace 中记录敏感信息
- 使用环境变量管理 API Key
- 考虑在 production 中采样追踪（如只追踪 10% 的请求）

## 🔧 故障排除

### 问题：看不到追踪数据

1. 检查环境变量是否正确设置
2. 确认 API Key 有效
3. 检查控制台日志是否有 `✅ LangSmith tracing enabled`

### 问题：追踪数据不完整

1. 确认 `attachLangSmithTracing` 在 `agent.prompt()` 之前调用
2. 检查 agent 事件订阅是否正常
3. 查看控制台是否有 `⚠️` 警告

### 问题：性能影响

LangSmith 追踪是异步的，理论上不应影响性能。如果发现问题：

1. 检查网络连接
2. 考虑降低追踪频率
3. 使用采样（只追踪部分请求）

## 📚 相关资源

- [pi-agent-core 文档](https://github.com/badlogic/pi-mono/tree/main/packages/agent)
- [LangSmith 文档](https://docs.langchain.com/langsmith)
- [LangSmith SDK](https://github.com/langchain-ai/langsmith-sdk)

## 📋 对比：旧版 vs 新版追踪

| 特性 | 旧版 (logLLMCall) | 新版 (attachLangSmithTracing) |
|------|------------------|------------------------------|
| LLM 调用 | ✅ | ✅ |
| Tool 调用 | ❌ | ✅ |
| Streaming 更新 | ❌ | ✅ |
| 多轮对话 | ❌ | ✅ |
| 事件层级关系 | ❌ | ✅ |
| 完整上下文 | ❌ | ✅ |

---

**最后更新**: 2026-03-27
**版本**: 2.0 (pi-agent-core 完整事件集成)
