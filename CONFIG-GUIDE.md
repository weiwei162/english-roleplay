# 配置指南 - English-Roleplay

## 📋 快速配置（3 分钟）

### 步骤 1: 复制配置文件

```bash
cd server
cp .env.example .env
```

### 步骤 2: 选择 AI 模式

编辑 `.env` 文件，选择一种 AI 模式：

#### 模式 1: 使用真实 LLM（推荐）⭐

```bash
AI_MODE=custom
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=sk-proj-your-key-here
```

**支持的提供商**:
- **OpenAI** - GPT-4o, GPT-4o Mini（推荐）
- **Anthropic** - Claude Sonnet, Claude Haiku
- **Google** - Gemini 2.0, Gemini Pro
- **Ollama** - 本地部署（免费）
- **OpenRouter** - 多模型平台

#### 模式 2: 火山引擎端到端

```bash
AI_MODE=s2s
VOLC_APP_ID=xxx
VOLC_APP_KEY=xxx
VOLC_S2S_APP_ID=xxx
VOLC_S2S_TOKEN=xxx
```

#### 模式 3: 火山引擎分组件

```bash
AI_MODE=component
VOLC_APP_ID=xxx
VOLC_APP_KEY=xxx
VOLC_ASR_APP_ID=xxx
VOLC_ASR_TOKEN=xxx
VOLC_TTS_APP_ID=xxx
VOLC_TTS_TOKEN=xxx
```

### 步骤 3: 启动服务

```bash
# 本地启动
npm start

# 或 Docker 启动
docker-compose up -d
```

### 步骤 4: 验证

```bash
# 检查健康状态
curl http://localhost:3000/health

# 访问应用
open http://localhost:3000
```

---

## 🔑 API Key 获取指南

### OpenAI

1. 访问 https://platform.openai.com/api-keys
2. 登录/注册账号
3. 点击 "Create new secret key"
4. 复制 Key 到 `.env` 的 `LLM_API_KEY`

**推荐模型**: `gpt-4o-mini`（快速且经济）

### Anthropic

1. 访问 https://console.anthropic.com/
2. 登录/注册
3. 创建 API Key
4. 复制到 `.env`

**推荐模型**: `claude-sonnet-4-20250514`

### Google

1. 访问 https://makersuite.google.com/app/apikey
2. 创建 API Key
3. 复制到 `.env`

**推荐模型**: `gemini-2.0-flash`

### Ollama（本地免费）

1. 安装 Ollama: https://ollama.ai
2. 下载模型: `ollama pull llama3.2`
3. 配置:
   ```bash
   AI_MODE=custom
   LLM_PROVIDER=ollama
   LLM_MODEL=llama3.2
   LLM_BASE_URL=http://localhost:11434/v1
   ```

### OpenRouter

1. 访问 https://openrouter.ai/keys
2. 创建 Key
3. 可以使用多个提供商的模型

---

## ⚙️ 配置项详解

### AI_MODE - AI 对话模式

| 值 | 说明 | 适用场景 |
|------|------|----------|
| `custom` | 第三方 LLM | 追求最佳效果 ⭐ |
| `s2s` | 火山端到端 | 简化部署 |
| `component` | 火山分组件 | 精细控制 |

### LLM_PROVIDER - LLM 提供商

| 提供商 | 说明 | 成本 |
|------|------|------|
| `openai` | OpenAI GPT 系列 | $ |
| `anthropic` | Anthropic Claude | $$ |
| `google` | Google Gemini | $ |
| `ollama` | 本地部署 | 免费 |
| `openrouter` | 多模型平台 | 按模型 |

### LLM_MODEL - 模型选择

**OpenAI**:
- `gpt-4o-mini` - 快速经济（推荐）
- `gpt-4o` - 高质量
- `gpt-3.5-turbo` - 最经济

**Anthropic**:
- `claude-sonnet-4-20250514` - 平衡（推荐）
- `claude-haiku-3-5` - 快速
- `claude-opus` - 最高质量

**Google**:
- `gemini-2.0-flash` - 快速（推荐）
- `gemini-pro` - 标准

### 服务端口配置

```bash
# HTTP 端口
PORT=3000

# HTTPS 端口（启用 HTTPS 时）
USE_HTTPS=true
HTTPS_PORT=3443
```

### 性能优化配置

```bash
# 温度参数（0.1-1.0）
# 越高越随机，越低越确定
PI_AGENT_TEMPERATURE=0.7

# 最大 token 数
# 限制回复长度
PI_AGENT_MAX_TOKENS=500

# 历史对话轮数
# 保留最近 N 轮对话
PI_AGENT_HISTORY_LENGTH=3
```

---

## 🔒 安全配置

### 启用 HTTPS（生产环境）

```bash
# 1. 生成 SSL 证书
./generate-ssl.sh

# 2. 启用 HTTPS
USE_HTTPS=true
HTTPS_PORT=3443
SSL_CERT_PATH=./ssl/cert.pem
SSL_KEY_PATH=./ssl/key.pem

# 3. 重启服务
npm start
```

### 修改 JWT 密钥

```bash
# 生成强随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 复制到 .env
JWT_SECRET=生成的密钥
```

### 修改 pi-agent API Key

```bash
# 生成随机密钥
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# 复制到 .env
PI_AGENT_API_KEY=生成的密钥
```

---

## 📊 成本估算

### 使用 OpenAI GPT-4o Mini

**配置**:
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
```

**成本**:
- 输入：$0.15 / 1M tokens
- 输出：$0.60 / 1M tokens

**估算**:
- 100 个孩子/天 × 10 分钟/天 × 30 天 = 30,000 分钟/月
- 约 50 tokens/分钟 × 30,000 = 1.5M tokens/月
- **月成本**: ~$1-2

### 使用 Ollama（本地）

**配置**:
```bash
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2
LLM_BASE_URL=http://localhost:11434/v1
```

**成本**:
- 模型下载：免费
- 运行成本：电费
- **月成本**: ~$0

---

## 🐛 故障排查

### 问题 1: API Key 无效

**错误**: `401 Unauthorized`

**解决**:
```bash
# 检查 Key 是否正确
cat .env | grep LLM_API_KEY

# 确保没有空格
LLM_API_KEY=sk-proj-xxx  # 正确
LLM_API_KEY= sk-proj-xxx # 错误
```

### 问题 2: 模型不可用

**错误**: `Model not found`

**解决**:
- 检查模型名称拼写
- 确认提供商支持该模型
- 查看提供商文档

### 问题 3: 端口被占用

**错误**: `EADDRINUSE`

**解决**:
```bash
# 查看占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或修改端口
PORT=3001
```

### 问题 4: Ollama 连接失败

**错误**: `Connection refused`

**解决**:
```bash
# 确保 Ollama 正在运行
ollama list

# 启动 Ollama
ollama serve

# 检查 Base URL
LLM_BASE_URL=http://localhost:11434/v1
```

---

## 🎯 最佳实践

### 开发环境

```bash
# 使用经济模型
LLM_MODEL=gpt-4o-mini

# 降低温度
PI_AGENT_TEMPERATURE=0.5

# 限制历史
PI_AGENT_HISTORY_LENGTH=3
```

### 生产环境

```bash
# 启用 HTTPS
USE_HTTPS=true

# 使用强密钥
JWT_SECRET=强随机字符串
PI_AGENT_API_KEY=强随机字符串

# 设置日志级别
LOG_LEVEL=info
```

### 高并发场景

```bash
# 使用更快的模型
LLM_MODEL=gpt-4o-mini

# 限制最大 token
PI_AGENT_MAX_TOKENS=300

# 增加超时
REQUEST_TIMEOUT=60

# 增加并发
MAX_CONNECTIONS=200
```

---

## 📚 相关文档

- [QUICKSTART-PI-AGENT.md](QUICKSTART-PI-AGENT.md) - 快速开始
- [DEPLOY-DOCKER.md](DEPLOY-DOCKER.md) - Docker 部署
- [RELEASE-NOTES-v3.2.1.md](RELEASE-NOTES-v3.2.1.md) - 更新说明

---

**更新时间**: 2026-03-17  
**版本**: v3.2.1
