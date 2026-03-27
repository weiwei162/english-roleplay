# LangSmith 追踪集成总结

## ✅ 完成的工作

### 1. 安装依赖
- 已安装 `langsmith` SDK 包
- 位置：`/home/gem/projects/english-roleplay/server/node_modules/langsmith`

### 2. 创建追踪模块
**文件**: `server/langsmith-trace.js`

提供以下功能：
- ✅ LangSmith 可用性检查
- ✅ OpenAI 客户端包装（用于自动追踪）
- ✅ 可追踪函数创建
- ✅ 手动追踪 Run 管理
- ✅ LLM 调用日志记录

### 3. 集成到主服务
**文件**: `server/index-join-ai.js`

修改内容：
- ✅ 导入 LangSmith 模块
- ✅ 在 `/v1/chat/completions` 端点添加追踪
- ✅ 支持流式和非流式响应
- ✅ 错误追踪

### 4. 更新环境配置
**文件**: `server/.env.example`

新增环境变量：
```bash
LANGSMITH_TRACING=false          # 是否启用追踪
LANGSMITH_API_KEY=               # LangSmith API Key
LANGSMITH_PROJECT=english-roleplay  # 项目名称
```

### 5. 文档
**文件**: `LANGSMITH-TRACE.md`

包含：
- ✅ LangSmith 介绍
- ✅ 快速开始指南
- ✅ 配置说明
- ✅ 使用场景
- ✅ 故障排查
- ✅ 最佳实践

### 6. 测试脚本
**文件**: `server/test-langsmith.js`

用于验证集成是否正常工作。

---

## 🚀 如何使用

### 启用 LangSmith 追踪

1. **获取 API Key**
   - 访问 https://smith.langchain.com
   - 注册/登录账户
   - Settings → API Keys → Create API Key

2. **配置环境变量**
   ```bash
   cd /home/gem/projects/english-roleplay/server
   cp .env.example .env
   
   # 编辑 .env 文件
   LANGSMITH_TRACING=true
   LANGSMITH_API_KEY=lsv2_xxxxxxxxxxxxx
   ```

3. **重启服务**
   ```bash
   npm start
   ```
   
   应该看到：
   ```
   ✅ LangSmith tracing enabled
   ```

4. **查看追踪数据**
   - 访问 https://smith.langchain.com
   - 选择项目 `english-roleplay`
   - 查看追踪列表和详情

### 测试集成

```bash
# 设置环境变量
export LANGSMITH_TRACING=true
export LANGSMITH_API_KEY=lsv2_xxx

# 运行测试
node test-langsmith.js
```

---

## 📊 追踪内容

每次 LLM 调用会记录：

### Inputs（输入）
```json
{
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "sessionId": "room_alice_scene1_xxx",
  "systemPrompt": "You are Alice..."
}
```

### Outputs（输出）
```json
{
  "content": "AI 的回复内容",
  "finish_reason": "stop"
}
```

### Metadata（元数据）
- `request_id`: 请求 ID
- `model`: 模型名称（如 `gpt-4o-mini`）
- `provider`: 提供商（如 `openai`）
- `stream`: 是否流式响应
- `duration_ms`: 耗时（毫秒）

---

## 🔧 技术细节

### 追踪流程

```
用户请求 → /v1/chat/completions
    ↓
创建 LangSmith Run (chat_completion)
    ↓
调用 pi-agent-core (agent.prompt / agent.steer)
    ↓
记录响应到 LangSmith
    ↓
返回响应给用户
```

### 代码位置

**追踪开始** (`index-join-ai.js:478-487`):
```javascript
const langsmithRun = await createTraceRun('chat_completion', 'llm', {
    inputs: { messages, sessionId, systemPrompt },
    metadata: { request_id, model, provider, stream }
});
```

**追踪结束** (`index-join-ai.js:530-534`):
```javascript
if (langsmithRun) {
    await langsmithRun.end({
        content: assistantMessage,
        finish_reason: 'stop'
    });
}
```

**错误处理** (`index-join-ai.js:560-563`):
```javascript
if (langsmithRun) {
    await langsmithRun.end(null, error);
}
```

---

## 💡 高级用法

### 1. 仅追踪部分请求

修改 `index-join-ai.js`，添加条件判断：

```javascript
// 只追踪 10% 的请求
const shouldTrace = Math.random() < 0.1 && isLangSmithAvailable();
```

### 2. 添加自定义元数据

```javascript
const langsmithRun = await createTraceRun('chat_completion', 'llm', {
    inputs: { ... },
    metadata: {
        user_id: userId,
        character: characterName,
        scene: sceneId,
        custom_field: 'value'
    }
});
```

### 3. 追踪工具调用

在工具执行函数中添加：

```javascript
execute: async (toolCallId, params, signal, onUpdate) => {
    const toolRun = await createTraceRun('dictionary_lookup', 'tool', {
        inputs: { word: params.word },
        metadata: { tool_name: 'dictionary' }
    });
    
    // 执行工具逻辑
    const result = await lookupWord(params.word);
    
    // 结束追踪
    await toolRun.end({ result });
    
    return result;
}
```

---

## ⚠️ 注意事项

### 性能影响
- LangSmith 追踪是**异步非阻塞**的
- 正常情况下不会增加响应延迟
- 如果网络问题导致延迟，可临时禁用追踪

### 数据安全
- **不要**在生产环境追踪敏感信息
- 定期轮换 API Key
- 考虑数据保留策略

### 成本控制
- LangSmith 有免费额度（每月 1000 次追踪）
- 超出后按量计费
- 生产环境建议抽样追踪（如 10%）

---

## 📝 下一步建议

1. **测试集成**
   ```bash
   node test-langsmith.js
   ```

2. **验证追踪数据**
   - 访问 LangSmith Dashboard
   - 确认数据正确显示

3. **配置告警**（可选）
   - 错误率告警
   - 延迟告警

4. **优化 Prompt**
   - 分析追踪数据
   - 发现常见问题
   - 调整 system prompt

5. **性能监控**
   - 设置 Dashboard
   - 监控关键指标

---

## 🔗 相关资源

- [LangSmith 官方文档](https://docs.langchain.com/langsmith)
- [LangSmith 追踪快速入门](https://docs.langchain.com/langsmith/observability-quickstart)
- [本项目集成文档](./LANGSMITH-TRACE.md)
- [LangSmith SDK](https://www.npmjs.com/package/langsmith)

---

**集成日期**: 2026-03-26  
**版本**: 1.0.0  
**维护者**: English Friend Team
