# PI-Agent-Real 真实 Agent 集成

## 概述

使用 [@mariozechner/pi-agent-core](https://github.com/badlogic/pi-mono/tree/main/packages/agent) 包创建真实的 AI Agent，替代模拟的英语老师。

## 特性

✅ **真实 LLM** - 使用 Claude/OpenAI/Google 等真实大模型  
✅ **工具调用** - 内置字典查询、发音评分、场景提示工具  
✅ **流式输出** - SSE 实时流式响应  
✅ **对话历史** - 自动管理上下文记忆  
✅ **事件驱动** - 完整的事件订阅系统  

---

## 快速开始

### 1. 安装依赖

```bash
cd /home/gem/projects/english-roleplay/server
npm install
```

### 2. 配置环境变量

复制并编辑 `.env` 文件：

```bash
cp .env.example .env
```

编辑 `.env`：

```bash
# AI 模式设置为 custom
AI_MODE=custom

# pi-agent-real 配置
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-20250514
LLM_API_KEY=sk-ant-api03-your-actual-api-key-here

# pi-agent-core 服务配置
PI_AGENT_URL=http://localhost:3001/v1/chat/completions
PI_AGENT_API_KEY=pi-agent-secret-key
```

### 3. 获取 LLM API Key

#### Anthropic (推荐)
1. 访问 https://console.anthropic.com/
2. 注册/登录账号
3. 创建 API Key
4. 复制到 `.env` 的 `LLM_API_KEY`

#### OpenAI
1. 访问 https://platform.openai.com/api-keys
2. 创建新的 API Key
3. 修改配置：
   ```bash
   LLM_PROVIDER=openai
   LLM_MODEL=gpt-4o-mini
   ```

#### Google
1. 访问 https://makersuite.google.com/app/apikey
2. 创建 API Key
3. 修改配置：
   ```bash
   LLM_PROVIDER=google
   LLM_MODEL=gemini-2.0-flash
   ```

### 4. 启动服务

**终端 1**: 启动 pi-agent-real 服务
```bash
npm run start:pi-agent
```

**终端 2**: 启动主服务
```bash
npm start
```

### 5. 测试

访问 http://localhost:3000 开始使用！

---

## 架构

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   客户端    │────▶│  火山引擎 RTC │────▶│  pi-agent-real  │
│  (浏览器)   │◀────│  (ASR+TTS)   │◀────│  (真实 LLM)     │
└─────────────┘     └──────────────┘     └─────────────────┘
     RTC                   HTTP                HTTP SSE
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │ Claude/     │
                                       │ OpenAI/     │
                                       │ Google      │
                                       └─────────────┘
```

---

## 内置工具

### 1. 字典查询 (dictionary)

查询英语单词的意思和例句。

**参数**:
- `word` (string): 要查询的单词

**返回**:
```json
{
  "word": "lion",
  "definition": "A big yellow cat that roars. King of animals! 🦁",
  "example": "Example: \"The lion is fun!\""
}
```

**使用场景**: 当孩子问 "What is a lion?" 时，LLM 可以调用此工具。

### 2. 发音评分 (pronunciation_score)

模拟发音评分和反馈。

**参数**:
- `text` (string): 要评分的文本

**返回**:
```json
{
  "text": "Hello teacher",
  "score": 92,
  "feedback": "Excellent! 👏 Very good!",
  "tips": "Try to emphasize the stressed syllable"
}
```

### 3. 场景提示 (scene_hint)

获取当前场景的对话提示。

**参数**:
- `scene` (string): 场景名称 (zoo/market/home/park)

**返回**:
```json
{
  "topic": "Animals",
  "questions": [
    "What's your favorite animal?",
    "Can you roar like a lion?"
  ],
  "vocabulary": ["lion", "elephant", "giraffe"],
  "activity": "Let's name all the animals we see!"
}
```

---

## Agent 配置

### 系统提示词

```javascript
const SYSTEM_PROMPT = `You are a friendly and encouraging English teacher for kids aged 6-10.

Your role is to:
- Speak in simple, clear English with short sentences
- Use common vocabulary suitable for children
- Be patient, supportive, and enthusiastic
- Ask follow-up questions to encourage conversation
- Praise the child's efforts frequently
- Make learning fun and engaging

Important rules:
- Always respond in English only
- Keep responses under 30 words for better TTS
- Use emojis to make it fun 🦁🌟🎉
- Ask one question at a time
- Be encouraging: "Great job!", "Excellent!", "Well done!"`;
```

### Agent 初始化

```javascript
const agent = new Agent({
    initialState: {
        systemPrompt: SYSTEM_PROMPT,
        model: getModel('anthropic', 'claude-sonnet-4-20250514'),
        thinkingLevel: 'off', // 关闭思考过程
        tools: [dictionaryTool, pronunciationTool, sceneHintTool],
        messages: []
    },
    
    // 消息转换
    convertToLlm: (messages) => {
        return messages.filter(msg => 
            msg.role === 'user' || 
            msg.role === 'assistant' || 
            msg.role === 'toolResult'
        );
    },
    
    // 上下文管理（保留最近 10 条消息）
    transformContext: async (messages) => {
        if (messages.length > 10) {
            return messages.slice(-10);
        }
        return messages;
    },
    
    // 工具执行模式
    toolExecution: 'parallel'
});
```

---

## 事件系统

pi-agent-core 发出以下事件：

| 事件 | 描述 |
|------|------|
| `agent_start` | Agent 开始处理 |
| `agent_end` | Agent 完成处理 |
| `turn_start` | 新回合开始 |
| `turn_end` | 回合结束 |
| `message_start` | 消息开始 |
| `message_update` | 消息更新（流式文本） |
| `message_end` | 消息结束 |
| `tool_execution_start` | 工具开始执行 |
| `tool_execution_update` | 工具执行进度 |
| `tool_execution_end` | 工具执行完成 |

### 订阅事件

```javascript
agent.subscribe((event) => {
    if (event.type === 'message_update' && 
        event.assistantMessageEvent?.type === 'text_delta') {
        // 流式输出文本
        process.stdout.write(event.assistantMessageEvent.delta);
    }
    
    if (event.type === 'tool_execution_start') {
        console.log(`Tool: ${event.toolName}`);
    }
});
```

---

## API 接口

### POST /v1/chat/completions

**请求**:
```bash
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello! What is a lion?"}
    ],
    "stream": true,
    "session_id": "session-123"
  }'
```

**响应 (SSE)**:
```
data: {"id":"pi-xxx","object":"chat.completion.chunk","choices":[{"delta":{"role":"assistant"}}]}

data: {"id":"pi-xxx","object":"chat.completion.chunk","choices":[{"delta":{"content":"A"}}]}

data: {"id":"pi-xxx","object":"chat.completion.chunk","choices":[{"delta":{"content":" lion"}}]}

data: {"id":"pi-xxx","object":"chat.completion.chunk","choices":[{"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":20,"total_tokens":30}}

data: [DONE]
```

### GET /health

**请求**:
```bash
curl http://localhost:3001/health
```

**响应**:
```json
{
  "status": "ok",
  "service": "pi-agent-core-real",
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "activeSessions": 5
}
```

---

## 自定义工具

添加你自己的工具：

```javascript
const myCustomTool = {
    name: 'weather',
    description: 'Get current weather for a location',
    parameters: {
        type: 'object',
        properties: {
            location: {
                type: 'string',
                description: 'City name'
            }
        },
        required: ['location']
    },
    execute: async ({ location }) => {
        // 调用天气 API
        const response = await fetch(`https://api.weather.com/${location}`);
        const data = await response.json();
        
        return {
            location,
            temperature: data.temp,
            condition: data.condition
        };
    }
};

// 添加到 Agent
const agent = new Agent({
    initialState: {
        tools: [dictionaryTool, pronunciationTool, sceneHintTool, myCustomTool]
    }
});
```

---

## 调试技巧

### 1. 查看日志

```bash
# 启动时查看详细日志
DEBUG=pi-agent* npm run start:pi-agent
```

### 2. 测试工具调用

```javascript
// 在 pi-agent-real.js 中添加日志
beforeToolCall: async ({ toolCall, args }) => {
    console.log('🔧 Tool called:', toolCall.name, args);
},

afterToolCall: async ({ toolCall, result }) => {
    console.log('✅ Tool result:', toolCall.name, result);
}
```

### 3. 监控会话

```bash
# 查看活跃会话
curl http://localhost:3001/health | jq .activeSessions
```

---

## 性能优化

### 1. 消息剪枝

```javascript
transformContext: async (messages, signal) => {
    // 保留最近 5 轮对话（10 条消息）
    return messages.slice(-10);
}
```

### 2. 会话清理

```javascript
// 每 10 分钟清理不活跃会话
setInterval(() => {
    const now = Date.now();
    const threshold = 10 * 60 * 1000;
    
    for (const [sessionId, agent] of agents.entries()) {
        if (now - agent.lastActive > threshold) {
            agent.abort();
            agents.delete(sessionId);
        }
    }
}, 60 * 1000);
```

### 3. 流式优化

```javascript
// 使用更快的流式传输
if (stream) {
    res.flushHeaders(); // 立即刷新响应头
    
    // 每收到一个 chunk 立即发送
    agent.subscribe((event) => {
        if (event.type === 'message_update') {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
    });
}
```

---

## 故障排查

### 问题 1: API Key 错误

**错误**: `401 Unauthorized`

**解决**:
```bash
# 检查 .env 文件
cat .env | grep LLM_API_KEY

# 确保没有多余空格
LLM_API_KEY=sk-ant-xxx  # 正确
LLM_API_KEY= sk-ant-xxx # 错误（有空格）
```

### 问题 2: 模型不可用

**错误**: `Model not found`

**解决**:
```bash
# 检查模型名称
# Anthropic: claude-sonnet-4-20250514, claude-opus, claude-haiku
# OpenAI: gpt-4o, gpt-4o-mini, gpt-3.5-turbo
# Google: gemini-2.0-flash, gemini-pro
```

### 问题 3: 工具调用失败

**错误**: `Tool execution failed`

**解决**:
- 检查工具参数格式
- 确保 `beforeToolCall` 没有阻止执行
- 查看 `afterToolCall` 的错误信息

---

## 生产环境部署

### 1. 使用 PM2

```bash
npm install -g pm2

# 启动 pi-agent-real
pm2 start pi-agent-real.js --name pi-agent

# 启动主服务
pm2 start index-join-ai.js --name main-server

# 保存配置
pm2 save

# 开机自启
pm2 startup
```

### 2. 环境变量

```bash
# 生产环境 .env
NODE_ENV=production
LLM_API_KEY=sk-ant-prod-xxx
PI_AGENT_API_KEY=strong-random-key-xyz
```

### 3. 日志管理

```bash
# PM2 日志
pm2 logs pi-agent
pm2 logs main-server

# 或使用日志文件
pm2 start pi-agent-real.js --log pi-agent.log
```

### 4. 监控

```bash
# 查看状态
pm2 status

# 查看内存使用
pm2 monit

# 重启服务
pm2 restart pi-agent
```

---

## 参考资料

- [pi-agent-core 文档](https://github.com/badlogic/pi-mono/tree/main/packages/agent)
- [Anthropic API](https://docs.anthropic.com/claude/reference)
- [OpenAI API](https://platform.openai.com/docs/api-reference)
- [火山引擎 CustomLLM](https://www.volcengine.com/docs/6348/1399966)

---

**更新时间**: 2026-03-17  
**版本**: v3.2.0
