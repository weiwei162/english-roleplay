# 🧪 测试清单

## 启动前检查

### 1. 环境检查
```bash
# 检查 Node.js 版本
node --version  # 应该 >= 18.0.0

# 检查 npm
npm --version

# 进入 server 目录
cd server
```

### 2. 依赖安装
```bash
# 安装依赖
npm install

# 检查是否成功
ls node_modules | grep -E "(express|@mariozechner|@volcengine)"
```

### 3. 环境配置
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env
vim .env  # 或使用其他编辑器

# 检查配置
cat .env | grep -E "^(AI_MODE|LLM_PROVIDER|LLM_API_KEY)="
```

---

## 测试流程

### 测试 1: pi-agent-real 服务

```bash
# 启动服务
npm run start:pi-agent

# 等待看到:
# 🚀 PI-Agent-Core (Real) Server started
#    Provider: openai
#    Model: gpt-4o-mini
```

**测试健康检查**:
```bash
curl http://localhost:3001/health | jq .
```

**预期输出**:
```json
{
  "status": "ok",
  "service": "pi-agent-core-real",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "activeSessions": 0
}
```

---

### 测试 2: 聊天接口（非流式）

```bash
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello! What is your name?"}],
    "stream": false
  }' | jq .
```

**预期输出**:
```json
{
  "id": "pi-xxx",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Hello! I'm your English teacher! 😊 What's your name?"
    }
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

---

### 测试 3: 聊天接口（流式）

```bash
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is a lion?"}],
    "stream": true
  }'
```

**预期输出** (SSE 流):
```
data: {"id":"pi-xxx","choices":[{"delta":{"role":"assistant"}}]}

data: {"id":"pi-xxx","choices":[{"delta":{"content":"A"}}]}

data: {"id":"pi-xxx","choices":[{"delta":{"content":" lion"}}]}

data: {"id":"pi-xxx","choices":[{"finish_reason":"stop"}],"usage":{...}}

data: [DONE]
```

---

### 测试 4: 工具调用（字典）

```bash
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is a lion? Tell me about lions."}],
    "stream": false
  }' | jq .
```

**预期**:
- AI 应该调用 `dictionary` 工具
- 返回狮子的定义和例句
- 响应中包含工具调用和结果

**查看日志**:
```bash
# 应该看到:
# 🔧 Executing tool: dictionary { word: "lion" }
# ✅ Tool dictionary completed
```

---

### 测试 5: 工具调用（场景提示）

```bash
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Let\\'s talk about the zoo!"}],
    "stream": false
  }' | jq .
```

**预期**:
- AI 可能调用 `scene_hint` 工具
- 返回动物园场景的提示

---

### 测试 6: 完整应用

```bash
# 终端 1: 启动 pi-agent-real
npm run start:pi-agent

# 终端 2: 启动主服务
npm start

# 浏览器访问
open http://localhost:3000
```

**测试步骤**:
1. ✅ 选择角色（小兔子/小熊/小猫）
2. ✅ 选择场景（动物园/超市/家/公园）
3. ✅ 点击录音按钮说话
4. ✅ 观察角色是否移动
5. ✅ 听 AI 回复
6. ✅ 查看控制台日志

---

## 性能测试

### 延迟测试

```bash
# 测量首次 token 时间
time curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hi"}],"stream":true}'
```

**目标**:
- 首次 token < 500ms
- 完整响应 < 2s

---

### 并发测试

```bash
# 使用 ab 测试（Apache Bench）
ab -n 100 -c 10 \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hi"}],"stream":false}' \
  http://localhost:3001/v1/chat/completions
```

**目标**:
- 10 并发，100 请求
- 平均响应时间 < 1s
- 无失败请求

---

## 故障排查

### 问题 1: 服务无法启动

**错误**: `Cannot find module '@mariozechner/pi-ai'`

**解决**:
```bash
npm install
# 或
rm -rf node_modules package-lock.json
npm install
```

---

### 问题 2: API Key 错误

**错误**: `401 Unauthorized`

**检查**:
```bash
cat .env | grep LLM_API_KEY
# 确保格式正确，没有多余空格
```

**解决**:
```bash
# 重新设置 API Key
echo "LLM_API_KEY=sk-proj-correct-key" >> .env
```

---

### 问题 3: 模型不可用

**错误**: `Model not found` 或 `404`

**检查**:
```bash
cat .env | grep LLM_MODEL
```

**解决**:
- OpenAI: `gpt-4o-mini`, `gpt-4o`, `gpt-3.5-turbo`
- Anthropic: `claude-sonnet-4-20250514`, `claude-haiku-3-5`
- Ollama: 确保模型已下载 `ollama pull llama3.2`

---

### 问题 4: 工具调用失败

**错误**: `Tool execution failed`

**检查日志**:
```bash
# 查看详细错误
tail -f logs/pi-agent-real.log
```

**常见原因**:
- 工具参数格式错误
- 工具执行函数抛出异常
- LLM 返回了不存在的工具名

---

### 问题 5: 角色不移动

**检查**:
```bash
# 浏览器控制台查看日志
# 应该看到:
# 🤖 AI subtitle: ...
# 🚶 Moving character to: { x: 25, y: 60 }
```

**解决**:
- 确保字幕功能已开启
- 检查 `startvoicechat-client.js` 的字幕解析
- 确认 AI 确实在说话（有音频输出）

---

## 监控指标

### 关键指标

1. **响应时间**
   - 首次 token: < 500ms
   - 完整响应: < 2s

2. **Token 使用**
   - 平均每轮对话: 50-100 tokens
   - 成本估算: $0.0001/轮

3. **并发能力**
   - 单实例: 10-20 并发
   - 可通过多实例扩展

4. **错误率**
   - 目标: < 1%
   - 主要错误类型：网络超时、API 限制

---

### 日志分析

```bash
# 查看错误日志
grep "ERROR\|❌" logs/pi-agent-real.log | tail -20

# 查看工具调用统计
grep "🔧 Executing tool" logs/pi-agent-real.log | wc -l

# 查看活跃会话
grep "🆕 Created new session" logs/pi-agent-real.log | wc -l
```

---

## 优化建议

### 1. 降低成本

```bash
# 使用更便宜的模型
LLM_MODEL=gpt-4o-mini  # $0.00015/1K tokens
# 或
LLM_MODEL=claude-haiku-3-5  # $0.00025/1K tokens
```

### 2. 提高速度

```bash
# 降低 temperature
PI_AGENT_TEMPERATURE=0.5

# 限制最大 tokens
PI_AGENT_MAX_TOKENS=200
```

### 3. 改善质量

```bash
# 使用更好的模型
LLM_MODEL=gpt-4o  # 更聪明但更贵

# 增加历史对话轮数
PI_AGENT_HISTORY_LENGTH=5
```

---

## 完成清单

- [ ] pi-agent-real 服务启动成功
- [ ] 健康检查通过
- [ ] 非流式聊天测试通过
- [ ] 流式聊天测试通过
- [ ] 字典工具调用测试通过
- [ ] 完整应用测试通过
- [ ] 角色移动功能正常
- [ ] 性能指标达标
- [ ] 错误处理正常
- [ ] 日志记录完整

---

**测试完成时间**: ___________  
**测试人员**: ___________  
**备注**: ___________
