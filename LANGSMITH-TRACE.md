# LangSmith 追踪集成指南

本文档介绍如何在 english-roleplay 项目中集成 LangSmith 追踪功能，用于监控和调试 LLM 调用。

## 📋 目录

- [LangSmith 是什么](#langsmith-是什么)
- [快速开始](#快速开始)
- [配置选项](#配置选项)
- [使用场景](#使用场景)
- [查看追踪数据](#查看追踪数据)
- [故障排查](#故障排查)

---

## 🤖 LangSmith 是什么

[LangSmith](https://smith.langchain.com/) 是 LangChain 出品的 LLM 应用 观测平台，提供：

- **追踪（Tracing）**: 记录每次 LLM 调用的输入、输出、耗时
- **调试（Debugging）**: 查看完整的调用链路和中间结果
- **评估（Evaluation）**: 测试和优化 LLM 响应质量
- **监控（Monitoring）**: 生产环境性能监控

虽然 LangSmith 最初为 LangChain 设计，但它可以与**任何 LLM 应用**集成，包括本项目使用的 pi-agent-core。

---

## 🚀 快速开始

### 1. 创建 LangSmith 账户

访问 [https://smith.langchain.com](https://smith.langchain.com) 注册账户。

### 2. 获取 API Key

1. 登录 LangSmith
2. 点击右上角头像 → **Settings** → **API Keys**
3. 点击 **Create API Key**
4. 复制 API Key（格式：`lsv2_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

### 3. 配置环境变量

编辑 `.env` 文件：

```bash
# 启用 LangSmith 追踪
LANGSMITH_TRACING=true

# 填入你的 API Key
LANGSMITH_API_KEY=lsv2_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 项目名称（可选）
LANGSMITH_PROJECT=english-roleplay
```

### 4. 重启服务

```bash
cd /home/gem/projects/english-roleplay/server
npm start
```

你应该看到：

```
✅ LangSmith tracing enabled
```

---

## ⚙️ 配置选项

| 环境变量 | 说明 | 默认值 | 必填 |
|---------|------|--------|------|
| `LANGSMITH_TRACING` | 是否启用追踪（`true`/`false`） | `false` | ✅ |
| `LANGSMITH_API_KEY` | LangSmith API Key | - | ✅ |
| `LANGSMITH_PROJECT` | 项目名称 | `english-roleplay` | ❌ |

---

## 📊 使用场景

### 场景 1: 调试 LLM 响应

当 AI 返回异常内容时，可以通过 LangSmith 查看：

1. 完整的对话历史
2. System Prompt 内容
3. LLM 的原始响应
4. 工具调用详情

### 场景 2: 性能优化

查看每次调用的耗时分布：

- LLM 响应时间
- 工具执行时间
- 总体延迟

### 场景 3: 质量评估

收集 LLM 响应样本，用于：

- 评估回答质量
- 发现常见问题
- 优化 Prompt

---

## 🔍 查看追踪数据

### 1. 访问 LangSmith Dashboard

登录 [https://smith.langchain.com](https://smith.langchain.com)

### 2. 选择项目

在左侧导航栏选择你的项目（如 `english-roleplay`）

### 3. 查看追踪列表

你会看到所有 LLM 调用的列表，包含：

- **Run Name**: `chat_completion`
- **Status**: ✅ Success / ❌ Error
- **Latency**: 响应时间
- **Start Time**: 开始时间

### 4. 查看追踪详情

点击任意追踪记录，查看：

#### Inputs（输入）
```json
{
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "Hello!"}
  ],
  "sessionId": "room_alice_scene1_1234567890",
  "systemPrompt": "You are Alice, a friendly English tutor..."
}
```

#### Outputs（输出）
```json
{
  "content": "Hi there! I'm Alice. Let's practice English together!",
  "finish_reason": "stop"
}
```

#### Metadata（元数据）
- `request_id`: `pi-1234567890`
- `model`: `gpt-4o-mini`
- `provider`: `openai`
- `stream`: `false`
- `duration_ms`: `1234`

---

## 🛠️ 故障排查

### 问题 1: 看不到 "LangSmith tracing enabled" 日志

**原因**: 环境变量未正确设置

**解决方法**:
```bash
# 检查环境变量
echo $LANGSMITH_TRACING
echo $LANGSMITH_API_KEY

# 确保已设置
export LANGSMITH_TRACING=true
export LANGSMITH_API_KEY=lsv2_xxx
```

### 问题 2: 出现 "LangSmith not available" 警告

**原因**: `langsmith` 包未安装

**解决方法**:
```bash
cd /home/gem/projects/english-roleplay/server
npm install langsmith
```

### 问题 3: 追踪数据未显示在 Dashboard

**可能原因**:
1. API Key 错误
2. 网络连接问题
3. 项目选择错误

**解决方法**:
1. 检查 API Key 是否正确
2. 查看服务器日志是否有错误
3. 确认 Dashboard 中选择了正确的项目

### 问题 4: 追踪导致性能下降

LangSmith 追踪是**异步非阻塞**的，正常情况下不会影响性能。

如果观察到明显延迟：

1. 检查网络连接
2. 考虑降低追踪频率（仅追踪部分请求）
3. 使用 `LANGSMITH_TRACING=false` 临时禁用

---

## 📝 代码集成说明

### 追踪模块 (`langsmith-trace.js`)

提供以下功能：

- `isLangSmithAvailable()`: 检查 LangSmith 是否可用
- `createTraceRun(name, type, options)`: 创建追踪 Run
- `logLLMCall(params)`: 记录 LLM 调用

### 集成位置 (`index-join-ai.js`)

在 `/v1/chat/completions` 端点中：

```javascript
// 1. 创建追踪 Run
const langsmithRun = await createTraceRun('chat_completion', 'llm', {
    inputs: { messages, sessionId, systemPrompt },
    metadata: { request_id, model, provider }
});

// 2. 执行 LLM 调用
await agent.prompt(userMessage.content);

// 3. 结束追踪 Run
await langsmithRun.end({ content: assistantMessage, finish_reason: 'stop' });
```

---

## 🔒 安全注意事项

### 敏感数据保护

LangSmith 会记录所有输入输出，**不要**在生产环境追踪包含：

- 用户密码
- 支付信息
- 个人身份信息 (PII)

### API Key 保护

- **永远不要**将 API Key 提交到 Git
- 使用 `.env` 文件存储（已添加到 `.gitignore`）
- 定期轮换 API Key

---

## 📚 参考资源

- [LangSmith 官方文档](https://docs.langchain.com/langsmith)
- [LangSmith 追踪快速入门](https://docs.langchain.com/langsmith/observability-quickstart)
- [LangSmith API 参考](https://docs.smith.langchain.com/)
- [本项目 LangSmith 集成代码](./langsmith-trace.js)

---

## 💡 最佳实践

1. **开发环境启用**: 便于调试和优化
2. **生产环境按需启用**: 考虑成本和隐私
3. **定期审查追踪数据**: 发现潜在问题
4. **设置告警**: 对错误率、延迟设置监控

---

**最后更新**: 2026-03-26  
**维护者**: English Friend Team
