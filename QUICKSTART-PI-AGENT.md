# 快速配置指南 - pi-agent-real

## 1. 安装依赖

```bash
cd /home/gem/projects/english-roleplay/server
npm install
```

## 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

### 选项 A: 使用 OpenAI

```bash
AI_MODE=custom
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=sk-proj-your-openai-api-key
```

### 选项 B: 使用 Anthropic (Claude)

```bash
AI_MODE=custom
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-20250514
LLM_API_KEY=sk-ant-api03-your-anthropic-key
```

### 选项 C: 使用 Ollama (本地)

```bash
AI_MODE=custom
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2
LLM_BASE_URL=http://localhost:11434/v1
# 不需要 API Key
```

### 选项 D: 使用 OpenRouter

```bash
AI_MODE=custom
LLM_PROVIDER=openrouter
LLM_MODEL=anthropic/claude-3.5-sonnet
LLM_API_KEY=sk-or-your-openrouter-key
```

## 3. 启动服务

```bash
# 方式 1: 使用启动脚本
./start.sh

# 方式 2: 手动启动
# 终端 1: 启动 pi-agent-real
npm run start:pi-agent

# 终端 2: 启动主服务
npm start
```

## 4. 测试

访问 http://localhost:3000

检查健康状态：
```bash
curl http://localhost:3001/health
```

## 5. 获取 API Key

### OpenAI
1. 访问 https://platform.openai.com/api-keys
2. 点击 "Create new secret key"
3. 复制到 `.env` 的 `LLM_API_KEY`

### Anthropic
1. 访问 https://console.anthropic.com/
2. 登录/注册
3. 创建 API Key
4. 复制到 `.env`

### OpenRouter
1. 访问 https://openrouter.ai/keys
2. 创建 Key
3. 可以使用多个提供商的模型

### Ollama (本地免费)
1. 安装 Ollama: https://ollama.ai
2. 下载模型：`ollama pull llama3.2`
3. 设置 `LLM_BASE_URL=http://localhost:11434/v1`

## 6. 故障排查

### 检查日志
```bash
# pi-agent-real 日志
tail -f logs/pi-agent-real.log

# 或查看控制台输出
```

### 测试 API
```bash
# 测试健康检查
curl http://localhost:3001/health

# 测试聊天接口
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}],"stream":false}'
```

### 常见问题

**401 Unauthorized**
- 检查 API Key 是否正确
- 确保没有多余空格

**Model not found**
- 检查模型名称是否正确
- 确认提供商支持该模型

**Connection refused**
- 确保 pi-agent-real 正在运行
- 检查端口 3001 是否被占用

## 7. 性能优化

### 调整温度
```bash
PI_AGENT_TEMPERATURE=0.7  # 0.1-1.0, 越高越随机
```

### 限制历史
```bash
PI_AGENT_HISTORY_LENGTH=3  # 保留 3 轮对话
```

### 使用更快的模型
```bash
# OpenAI
LLM_MODEL=gpt-4o-mini  # 快速且便宜

# Anthropic
LLM_MODEL=claude-haiku-3-5  # 快速

# Ollama
LLM_MODEL=llama3.2:1b  # 最小最快
```

---

**更新时间**: 2026-03-17  
**版本**: v3.2.0
