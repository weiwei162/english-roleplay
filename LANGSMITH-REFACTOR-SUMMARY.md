# LangSmith 集成重构总结

## 📋 更新概述

将 LangSmith 集成从简单的 LLM 调用记录升级为 **pi-agent-core 完整事件序列追踪**。

## 🔄 主要变更

### 1. 核心追踪模块重构

**文件**: `server/langsmith-trace.js`

**旧版功能**:
- ❌ 仅记录 LLM 输入输出
- ❌ 手动调用 `logLLMCall()`
- ❌ 无事件层级关系
- ❌ 不支持 tool 追踪

**新版功能**:
- ✅ 完整 pi-agent-core 事件追踪
- ✅ 自动订阅 agent 事件
- ✅ 多层级 run 结构（agent → turn → message → tool）
- ✅ 支持 streaming 更新
- ✅ 完整的工具执行追踪

**新增类**:
- `LangSmithTracer` - 管理单个会话的所有追踪 runs
- `attachLangSmithTracing()` - 一键附加追踪到 Agent

### 2. 主程序集成更新

**文件**: `server/index-join-ai.js`

**变更**:
```diff
- import { isLangSmithAvailable, wrapOpenAIClient, logLLMCall, createTraceableFunction }
+ import { isLangSmithAvailable, attachLangSmithTracing, cleanupAllTracers }

+ // 在创建 Agent 时自动附加追踪
+ if (isLangSmithAvailable()) {
+     attachLangSmithTracing(agent, sessionId, 'english-roleplay');
+ }

- // 手动记录 LLM 调用
- langsmithRun = await createTraceRun(...)
- await langsmithRun.end(...)
```

### 3. 新增文件

| 文件 | 说明 |
|------|------|
| `LANGSMITH-PI-AGENT-TRACE.md` | 完整使用文档 |
| `server/test-langsmith-events.js` | 事件追踪测试脚本 |

## 📊 事件追踪对比

### 旧版追踪（简单 LLM 调用）

```
LLM Call (llm)
├─ inputs: { messages: [...] }
└─ outputs: { content: "..." }
```

### 新版追踪（完整事件序列）

```
Agent Session (chain) - 2.5s
├─ Turn 1 (chain) - 1.8s
│  ├─ user Message (llm)
│  │  └─ inputs: { role: "user", content: "Hello!" }
│  ├─ assistant Message (llm) - with toolCalls
│  │  └─ outputs: { content: "Let me check...", toolCalls: [...] }
│  ├─ Tool: dictionary (tool) - 500ms
│  │  ├─ inputs: { toolCallId: "abc", name: "dictionary", args: {...} }
│  │  └─ outputs: { result: "...", details: {...} }
│  ├─ toolResult Message (llm)
│  └─ Turn 1 complete
├─ Turn 2 (chain) - 700ms
│  └─ assistant Message (llm)
│     └─ outputs: { content: "A lion is..." }
└─ Agent Session complete
```

## 🎯 追踪的事件类型

| 事件类型 | LangSmith Run Type | 说明 |
|---------|-------------------|------|
| `agent_start` | `chain` | Agent 开始处理 |
| `agent_end` | `chain` | Agent 完成 |
| `turn_start` | `chain` | 新 turn 开始（LLM 调用） |
| `turn_end` | `chain` | Turn 完成 |
| `message_start` | `llm` | 消息开始 |
| `message_update` | `llm` | 流式更新 |
| `message_end` | `llm` | 消息完成 |
| `tool_execution_start` | `tool` | 工具开始执行 |
| `tool_execution_update` | `tool` | 工具流式进度 |
| `tool_execution_end` | `tool` | 工具完成 |

## 🚀 使用方法

### 1. 环境变量

```bash
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LANGSMITH_PROJECT=english-roleplay
```

### 2. 代码集成

```javascript
import { Agent } from '@mariozechner/pi-agent-core';
import { attachLangSmithTracing } from './langsmith-trace.js';

const agent = new Agent({ /* ... */ });

// 一行代码附加完整追踪
attachLangSmithTracing(agent, sessionId, 'english-roleplay');

await agent.prompt('Hello!');
```

### 3. 测试

```bash
export LANGSMITH_TRACING=true
export LANGSMITH_API_KEY=lsv2_xxx
node server/test-langsmith-events.js
```

## 📈 优势

### 1. 完整上下文
- ✅ 追踪整个 Agent 会话
- ✅ 多轮对话完整记录
- ✅ 工具调用链清晰可见

### 2. 调试友好
- ✅ 错误定位精确到具体事件
- ✅ 流式响应可见
- ✅ 工具执行过程透明

### 3. 性能分析
- ✅ 每层级的耗时统计
- ✅ 识别慢工具调用
- ✅ LLM 响应时间分析

### 4. 零侵入性
- ✅ 一行代码集成
- ✅ 异步非阻塞
- ✅ 失败不影响主流程

## 🔧 配置选项

```javascript
// 自定义项目名称
attachLangSmithTracing(agent, sessionId, 'my-project');

// 禁用追踪（环境变量）
LANGSMITH_TRACING=false

// 清理追踪器
const cleanup = attachLangSmithTracing(...);
cleanup(); // 会话结束时调用
```

## 📝 迁移指南

### 从旧版迁移

1. **删除旧代码**:
```javascript
// 删除这些调用
- logLLMCall({...})
- createTraceRun(...)
- wrapOpenAIClient(...)
```

2. **添加新代码**:
```javascript
// 在创建 Agent 后添加
import { attachLangSmithTracing } from './langsmith-trace.js';
attachLangSmithTracing(agent, sessionId);
```

3. **更新环境变量**:
```bash
# 保持不变，确保设置正确
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=...
```

## 🐛 已知问题

- Streaming 消息更新不会每次 delta 都记录（避免 API 限制）
- 需要 LangSmith SDK 2.0+

## 📚 相关文档

- [`LANGSMITH-PI-AGENT-TRACE.md`](LANGSMITH-PI-AGENT-TRACE.md) - 完整使用指南
- [`server/test-langsmith-events.js`](server/test-langsmith-events.js) - 测试脚本
- [pi-agent-core 事件文档](https://github.com/badlogic/pi-mono/tree/main/packages/agent)

## 📅 版本历史

- **v2.0** (2026-03-27) - pi-agent-core 完整事件集成
- **v1.0** - 简单 LLM 调用记录

---

**重构完成时间**: 2026-03-27
**影响范围**: LangSmith 追踪模块
**向后兼容**: ❌ 需要更新集成代码
