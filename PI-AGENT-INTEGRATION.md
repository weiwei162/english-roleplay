# PI-Agent-Core 集成指南

## 概述

本集成允许你使用自研或第三方的 LLM/Agent（如 pi-agent-core）作为火山引擎 StartVoiceChat 的对话引擎，而不是使用火山方舟或 Coze 平台模型。

## 架构

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   客户端    │────▶│  火山引擎 RTC │────▶│  pi-agent-core  │
│  (浏览器)   │◀────│  (ASR+TTS)   │◀────│  (第三方 LLM)   │
└─────────────┘     └──────────────┘     └─────────────────┘
     RTC                   HTTP                HTTP SSE
```

- **ASR**: 火山引擎语音识别
- **LLM**: pi-agent-core（你的自定义 Agent）
- **TTS**: 火山引擎语音合成

## 快速开始

### 1. 启动 pi-agent-core 服务

```bash
cd /home/gem/projects/english-roleplay/server
node pi-agent-server.js
```

默认运行在 `http://localhost:3001`

### 2. 配置环境变量

编辑 `.env` 文件：

```bash
# 设置为 custom 模式
AI_MODE=custom

# pi-agent-core 配置
PI_AGENT_URL=http://localhost:3001/v1/chat/completions
PI_AGENT_API_KEY=pi-agent-secret-key
PI_AGENT_MODEL=pi-agent-v1
PI_AGENT_TEMPERATURE=0.7
PI_AGENT_MAX_TOKENS=500
PI_AGENT_TOP_P=0.9
PI_AGENT_HISTORY_LENGTH=3

# 火山引擎凭证（ASR 和 TTS 仍然需要）
VOLC_APP_ID=your_app_id
VOLC_APP_KEY=your_app_key
VOLC_ACCESS_KEY=your_access_key
VOLC_SECRET_KEY=your_secret_key
VOLC_ASR_APP_ID=your_asr_app_id
VOLC_ASR_TOKEN=your_asr_token
VOLC_TTS_APP_ID=your_tts_app_id
VOLC_TTS_TOKEN=your_tts_token
```

### 3. 启动主服务

```bash
cd /home/gem/projects/english-roleplay/server
npm start
```

### 4. 测试

访问 `http://localhost:3000` 开始使用！

## 接口标准

pi-agent-core 服务必须遵循火山引擎 CustomLLM 接口标准：

### 请求格式

```http
POST /v1/chat/completions
Content-Type: application/json
Authorization: Bearer <your-api-key>

{
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "stream": true,
  "temperature": 0.7,
  "max_tokens": 500,
  "top_p": 0.9,
  "model": "pi-agent-v1"
}
```

### 响应格式（SSE）

```
data: {"id":"req-123","object":"chat.completion.chunk","created":1234567890,"model":"pi-agent-v1","choices":[{"index":0,"finish_reason":null,"delta":{"role":"assistant"}}]}

data: {"id":"req-123","object":"chat.completion.chunk","created":1234567890,"model":"pi-agent-v1","choices":[{"index":0,"finish_reason":null,"delta":{"content":"Hello"}}]}

data: {"id":"req-123","object":"chat.completion.chunk","created":1234567890,"model":"pi-agent-v1","choices":[{"index":0,"finish_reason":"stop","delta":{}}],"usage":{"prompt_tokens":10,"completion_tokens":20,"total_tokens":30}}

data: [DONE]
```

### 关键要求

1. **必须支持 SSE** - `Content-Type: text/event-stream`
2. **必须有结束符** - `data: [DONE]`
3. **流式返回** - 分多个 chunk 返回内容
4. **响应格式** - 兼容 OpenAI Chat Completion API

## 配置选项

### 火山引擎 StartVoiceChat LLMConfig

```javascript
{
  "LLMConfig": {
    "Mode": "CustomLLM",           // 固定值
    "Url": "http://your-agent/v1/chat/completions",
    "APIKey": "Bearer your-api-key",
    "ModelName": "pi-agent-v1",
    "Temperature": 0.7,
    "MaxTokens": 500,
    "TopP": 0.9,
    "SystemMessages": ["You are a friendly English teacher."],
    "HistoryLength": 3,
    "Prefill": false
  }
}
```

### pi-agent-server.js 配置

```javascript
// 系统提示词
const SYSTEM_PROMPT = `You are a friendly and encouraging English teacher for kids aged 6-10.`;

// 服务端配置
const PORT = 3001;
const API_KEY = 'pi-agent-secret-key';
const MODEL_NAME = 'pi-agent-v1';
```

## 自定义 Agent 逻辑

编辑 `pi-agent-server.js` 中的 `generateEnglishTeacherResponse` 函数：

```javascript
function generateEnglishTeacherResponse(userMessage) {
    // 在这里实现你的自定义逻辑
    
    // 示例：场景识别
    if (userMessage.toLowerCase().includes('zoo')) {
        return "Great! Let's talk about animals! 🦁 What's your favorite animal?";
    }
    
    // 示例：调用外部 API
    // const response = await fetch('https://api.dify.ai/v1/chat-messages', {...});
    
    // 示例：调用本地 LLM
    // const response = await ollama.generate({model: 'llama2', prompt: userMessage});
    
    return "That's wonderful! Can you tell me more?";
}
```

## 集成真实 LLM

### 示例 1: 集成 Ollama

```javascript
async function generateResponse(messages, options) {
    const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            model: 'llama2',
            messages: messages,
            stream: true
        })
    });
    
    // 处理流式响应...
}
```

### 示例 2: 集成 Dify Agent

```javascript
async function generateResponse(messages, options) {
    const response = await fetch('https://api.dify.ai/v1/chat-messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer dify-api-key'
        },
        body: JSON.stringify({
            inputs: {},
            query: messages.pop().content,
            response_mode: 'streaming',
            user: 'english-learner'
        })
    });
    
    // 处理流式响应...
}
```

### 示例 3: 集成 OpenAI

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({apiKey: 'sk-...'});

async function generateResponse(messages, options) {
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        stream: true
    });
    
    // 处理流式响应...
}
```

## 调试技巧

### 1. 检查服务状态

```bash
curl http://localhost:3001/health
```

### 2. 验证接口

```bash
curl -X POST http://localhost:3001/api/verify
```

### 3. 测试聊天接口

```bash
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### 4. 查看日志

```bash
# pi-agent-core 日志
tail -f /home/gem/projects/english-roleplay/server/logs/pi-agent.log

# 主服务日志
tail -f /home/gem/projects/english-roleplay/server/logs/main.log
```

## 生产环境部署

### 1. 使用 HTTPS

```bash
# 配置 SSL 证书
USE_HTTPS=true
HTTPS_PORT=3443
SSL_CERT_PATH=./ssl/cert.pem
SSL_KEY_PATH=./ssl/key.pem
```

### 2. 设置强 API Key

```bash
# 生成随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 在 .env 中设置
PI_AGENT_API_KEY=<生成的密钥>
```

### 3. 使用进程管理

```bash
# 使用 PM2
npm install -g pm2
pm2 start pi-agent-server.js --name pi-agent
pm2 start index-join-ai.js --name main-server
pm2 save
```

### 4. 配置反向代理（Nginx）

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    location /pi-agent/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 火山引擎验证

使用火山引擎的验证工具检查你的接口是否符合标准：

```bash
curl -X POST https://your-domain.com/api/verify
```

确保返回：
```json
{
  "status": "ok",
  "message": "PI-Agent-Core is ready",
  "endpoint": "/v1/chat/completions",
  "supports_stream": true
}
```

## 故障排查

### 问题 1: AI 不说话

**检查**：
- LLMConfig.Url 是否正确
- API Key 是否匹配
- 服务是否运行

### 问题 2: 响应超时

**解决**：
- 确保 10 秒内返回第一个 chunk
- 优化 LLM 响应速度
- 增加超时配置

### 问题 3: 字幕不显示

**检查**：
- SubtitleConfig.DisableRTSSubtitle = false
- SubtitleMode = 1 (LLM 模式)

## 参考资料

- [火山引擎 CustomLLM 接入文档](https://www.volcengine.com/docs/6348/1399966)
- [StartVoiceChat API 文档](https://www.volcengine.com/docs/6348/1558163)
- [SSE 协议规范](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [OpenAI Chat Completion API](https://platform.openai.com/docs/api-reference/chat)
