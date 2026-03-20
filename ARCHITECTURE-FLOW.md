# 🏗️ 系统架构与完整流程

**更新日期：** 2026-03-20  
**项目：** English Roleplay - AI 语音对话系统

---

## 📋 系统概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           用户 (孩子)                                    │
│                        📱 前端 (浏览器)                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ RTC 音频流
                                      │ HTTP API
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        后端服务器 (Node.js)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  认证模块   │  │  RTC Token  │  │  AI 加入 API │  │  pi-agent-core │ │
│  │  auth.js    │  │  token.js   │  │index-join-ai│  │   (自定义 LLM)  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Volc API
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       火山引擎云平台                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │     RTC     │  │     ASR     │  │     LLM     │  │       TTS       │ │
│  │  实时音视频 │  │  语音识别   │  │  大模型推理 │  │    语音合成     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 完整流程

### 阶段 1: 用户注册登录验证 🔐

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   用户输入   │ ──► │   后端验证   │ ──► │  返回 JWT    │
│ 用户名/密码  │     │  auth.js     │     │    Token     │
└──────────────┘     └──────────────┘     └──────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  users.json      │
                    │ 持久化存储用户    │
                    └──────────────────┘
```

**涉及文件：**
- `server/auth.js` - 认证逻辑
- `server/users.json` - 用户数据存储
- `frontend/js/app.js` - 前端登录界面

**API 端点：**
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 注册新用户 |
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/verify` | POST | 验证 Token |

**Token 流程：**
1. 登录成功 → 后端生成 JWT Token (30 天有效期)
2. 前端存储 Token (localStorage)
3. 后续 API 请求携带 `Authorization: Bearer <token>`
4. 后端 `authMiddleware` 验证 Token

---

### 阶段 2: 选择角色场景，创建房间，启动 AI 🎭

```
┌─────────────────┐
│  用户选择角色   │  Emma / Tommy / Lily / Mike / Rose
│  用户选择场景   │  Zoo / Market / Home / Park
└─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    前端创建 RTC 房间                               │
│  1. 生成唯一 RoomId: room_{char}_{scene}_{timestamp}            │
│  2. 调用 /api/config 获取 RTC AppId                             │
│  3. 调用 /api/token 获取用户加入房间的 Token                      │
│  4. 初始化 VERTC 引擎，加入 RTC 房间                               │
│  5. 开启本地音频采集                                             │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│              调用后端 /api/join-ai 启动 AI 角色                   │
│  请求参数：                                                      │
│  - roomId: RTC 房间 ID                                           │
│  - character: 角色 ID (emma/tommy/lily...)                      │
│  - sceneId: 场景 ID (zoo/market/home/park)                      │
│  - targetUserId: 真人用户 ID                                     │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│              后端配置 AI 并调用火山 StartVoiceChat API            │
│  1. 生成 sessionId: session_{user}_{char}_{scene}_{timestamp}  │
│  2. 组合角色 Prompt + 场景 Prompt                                │
│  3. 配置 ASR/LLM/TTS (直传模式)                                 │
│  4. 调用火山 StartVoiceChat API                                 │
│  5. AI 以 ai_{char}_{roomId} 身份加入 RTC 房间                   │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RTC 实时对话开始                               │
│  - 孩子说话 → RTC 音频流 → 火山云端                              │
│  - 火山云端 (ASR→LLM→TTS) → RTC 音频流 → 播放 AI 声音              │
│  - 字幕数据通过 RTC 二进制消息回调                                │
└─────────────────────────────────────────────────────────────────┘
```

**涉及文件：**
- `frontend/js/app.js` - `selectScene()`, `createAIVoiceChatRoom()`
- `frontend/js/startvoicechat-client.js` - RTC 房间创建和管理
- `server/index-join-ai.js` - `/api/join-ai` 端点
- `server/volc-start-voicechat.js` - 火山 API 客户端

---

### 阶段 3: 用户对话，pi-agent 生成回复 💬

```
┌─────────────────────────────────────────────────────────────────┐
│                    实时对话数据流                                │
│                                                                  │
│  ┌──────────┐    音频流    ┌────────────────────────────────┐   │
│  │  孩子    │ ───────────► │  火山 RTC 服务器                  │   │
│  │  说话    │             │                                │   │
│  └──────────┘             │  1. ASR: 语音 → 文字            │   │
│                           │  2. LLM: 调用 pi-agent API      │   │
│                           │  3. TTS: 文字 → 语音            │   │
│                           └────────────────────────────────┘   │
│                                          │                     │
│                                          ▼                     │
│                           ┌────────────────────────────────┐   │
│                           │  pi-agent-core (自定义 LLM)     │   │
│                           │                                │   │
│                           │  POST /v1/chat/completions     │   │
│                           │  Request:                      │   │
│                           │  {                             │   │
│                           │    "session_id": "xxx",        │   │
│                           │    "messages": [...]           │   │
│                           │  }                             │   │
│                           │                                │   │
│                           │  根据 sessionId 获取：          │   │
│                           │  - 角色人设 (systemPrompt)     │   │
│                           │  - 场景上下文                  │   │
│                           │  - 对话历史                    │   │
│                           │                                │   │
│                           │  Response:                     │   │
│                           │  { "content": "AI 回复" }       │   │
│                           └────────────────────────────────┘   │
│                                          │                     │
│                                          ▼                     │
│                           ┌────────────────────────────────┐   │
│                           │  火山 RTC 服务器                  │   │
│                           │  TTS 合成 → 音频流回 RTC         │   │
│                           └────────────────────────────────┘   │
│                                          │                     │
│                                          ▼                     │
│                           ┌──────────┐                        │
│                           │  孩子    │ ◄── 听到 AI 回复         │
│                           └──────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

**涉及文件：**
- `server/index-join-ai.js` - `/v1/chat/completions` 端点
- `pi-agent-core` - Agent 框架 (npm 包)

**SessionId 绑定信息：**
```javascript
sessionId = `session_${userId}_${character}_${sceneId}_${timestamp}`

// 存储于 sessions Map
sessions.set(roomId, {
    character,      // 角色 ID
    taskId,         // 火山任务 ID
    targetUserId,   // 真人用户 ID
    aiMode,         // AI 模式 (component/custom/s2s)
    userId,         // 用户名
    scene,          // 场景 ID
    sessionId,      // pi-agent 会话 ID
    createdAt       // 创建时间
});
```

---

### 阶段 4: 结束对话，离开房间 🚪

```
┌─────────────────┐
│  用户离开场景   │  或  页面关闭/刷新
│  或选择其他角色 │
└─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    前端调用离开流程                               │
│  1. leaveAIVoiceChatRoom()                                      │
│  2. leaveStartVoiceChatRoom()                                   │
│  3. POST /api/leave-room                                        │
│     - roomId: RTC 房间 ID                                        │
│     - taskId: AI 任务 ID                                         │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    后端停止 AI 对话                               │
│  1. 调用火山 StopVoiceChat API                                  │
│  2. 删除 sessions 中的会话记录                                   │
│  3. 清理 pi-agent 会话 (可选)                                    │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    前端清理 RTC                                   │
│  1. 离开 RTC 房间 (engine.leaveRoom())                          │
│  2. 销毁 RTC 引擎 (VERTC.destroyEngine())                        │
│  3. 清空状态变量                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**涉及文件：**
- `frontend/js/app.js` - `leaveAIVoiceChatRoom()`
- `frontend/js/startvoicechat-client.js` - `leave()`
- `server/index-join-ai.js` - `/api/leave-room` 端点

---

## 📁 核心文件清单

### 前端 (frontend/)

| 文件 | 说明 | 关键函数 |
|------|------|----------|
| `js/app.js` | 主应用逻辑 | `selectScene()`, `createAIVoiceChatRoom()`, `leaveAIVoiceChatRoom()` |
| `js/startvoicechat-client.js` | RTC 客户端 | `createRoom()`, `joinAI()`, `leave()` |
| `index.html` | 主页面 | - |

### 后端 (server/)

| 文件 | 说明 | 关键函数/端点 |
|------|------|---------------|
| `index-join-ai.js` | 主服务器 | `/api/config`, `/api/token`, `/api/join-ai`, `/api/leave-room`, `/v1/chat/completions` |
| `volc-start-voicechat.js` | 火山 API 客户端 | `startVoiceChatComponent()`, `startVoiceChatS2S()`, `stopVoiceChat()` |
| `auth.js` | 认证模块 | `register()`, `login()`, `verifyToken()`, `authMiddleware` |
| `token-generator.js` | RTC Token 生成 | `generateToken()` |
| `prompts.js` | 角色/场景 Prompt | `combineCharacterAndScenePrompt()` |

---

## 🔧 配置项

### 环境变量 (.env)

```bash
# AI 模式：component | s2s | custom
AI_MODE=custom

# RTC 基础配置
VOLC_APP_ID=xxx
VOLC_APP_KEY=xxx
VOLC_ACCESS_KEY=xxx
VOLC_SECRET_KEY=xxx

# ASR 配置 (直传模式)
VOLC_ASR_APP_ID=xxx
VOLC_ASR_TOKEN=xxx
VOLC_ASR_RESOURCE_ID=volc.bigasr.sauc.duration

# TTS 配置
VOLC_TTS_APP_ID=xxx
VOLC_TTS_TOKEN=xxx
VOLC_TTS_RESOURCE_ID=volc.service_type.10029

# pi-agent 配置 (custom 模式)
PI_AGENT_URL=http://localhost:3000/v1/chat/completions
PI_AGENT_API_KEY=pi-agent-secret-key
PI_AGENT_MODEL=gpt-4o-mini
```

---

## 🔑 SessionId 传递链路

```
1. 用户选择场景
   └─► frontend/js/app.js::selectScene()

2. 前端创建 RTC 房间
   └─► frontend/js/startvoicechat-client.js::createRoom()

3. 前端调用 /api/join-ai
   请求：{ roomId, character, sceneId, targetUserId }
   └─► server/index-join-ai.js::POST /api/join-ai

4. 后端生成 sessionId
   sessionId = session_${userId}_${character}_${sceneId}_${timestamp}
   
5. 后端调用火山 StartVoiceChat API
   LLMConfig.Custom = JSON.stringify({ SessionId: sessionId })
   └─► server/volc-start-voicechat.js::startVoiceChatComponent()

6. 火山 RTC 服务器调用 pi-agent
   POST /v1/chat/completions
   Body: { session_id: sessionId, messages: [...] }
   └─► server/index-join-ai.js::POST /v1/chat/completions

7. pi-agent 根据 sessionId 获取角色/场景信息
   - 从 sessions Map 查找
   - 加载对应的 systemPrompt
   - 调用大模型生成回复
```

---

## 🎯 优化建议

### 1. SessionId 管理
- [ ] 添加 sessionId 过期清理机制
- [ ] 支持 sessionId 持久化 (Redis)
- [ ] 添加 sessionId 查询接口

### 2. 角色场景绑定
- [ ] 将 sessionId 与角色/场景信息持久化
- [ ] 支持会话恢复 (断线重连)
- [ ] 添加对话历史保存

### 3. pi-agent 集成
- [ ] 优化 sessionId 传递方式 (放在 Custom 参数中)
- [ ] 支持多轮对话历史管理
- [ ] 添加工具调用 (dictionary, pronunciation)

---

## 📊 数据流总结

| 阶段 | 发起方 | 接收方 | 数据类型 | 说明 |
|------|--------|--------|----------|------|
| 注册登录 | 前端 | 后端 | HTTP JSON | JWT Token |
| 获取配置 | 前端 | 后端 | HTTP JSON | RTC AppId |
| 获取 Token | 前端 | 后端 | HTTP JSON | RTC 房间 Token |
| 创建房间 | 前端 | 火山 RTC | RTC 协议 | 加入房间 |
| 启动 AI | 前端 | 后端 | HTTP JSON | /api/join-ai |
| AI 加入 | 后端 | 火山 RTC | Volc API | StartVoiceChat |
| 语音对话 | 用户 | 火山 RTC | 音频流 | 实时传输 |
| LLM 调用 | 火山 RTC | pi-agent | HTTP JSON | /v1/chat/completions |
| 离开房间 | 前端 | 后端 | HTTP JSON | /api/leave-room |

---

**文档版本：** 1.0  
**最后更新：** 2026-03-20
