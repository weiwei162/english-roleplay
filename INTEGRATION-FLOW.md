# 🔄 StartVoiceChat 前后端集成流程

**关键问题解答**

---

## ❓ 核心问题

### Q1: 前端如何与后端集成？

**答：** 通过 **HTTP REST API**，不是 WebSocket！

```
前端 (浏览器)
   ↓ HTTP POST /api/create-room
后端 (Node.js)
   ↓ 调用火山引擎 StartVoiceChat API
火山引擎云端
   ↓ 返回房间信息和 Token
后端 → 前端
   ↓ 前端使用 Token 加入 RTC 房间
火山引擎 RTC 服务器
```

### Q2: 还需要 WebSocket 吗？

**答：** **不需要！** 

StartVoiceChat 模式下：
- ❌ 不需要 WebSocket 连接
- ❌ 不需要手动发送音频数据
- ✅ 火山引擎云端自动处理 ASR → LLM → TTS
- ✅ RTC 直接传输音频流

### Q3: 什么时候使用 RTC？

**答：** **创建房间后立即使用！**

流程：
1. 用户选择场景 → `selectScene()`
2. 调用 `createAIVoiceChatRoom()`
3. 后端创建房间并启动 AI
4. **前端通过 RTC 加入房间**
5. 孩子说话 → RTC 传输音频 → 火山云端处理 → AI 回应

### Q4: 前端如何加入房间？

**答：** 通过 `startvoicechat-client.js` 自动加入！

---

## 📊 完整流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户操作                                  │
│  1. 选择角色 (Emma)                                              │
│  2. 选择场景 (Magic Zoo)                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    前端 JavaScript                               │
│  selectScene('zoo')                                            │
│    ↓                                                            │
│  createAIVoiceChatRoom()                                       │
│    ↓                                                            │
│  createStartVoiceChatRoom(roomId, 'emma')                      │
│    - 显示加载动画                                                │
│    - 调用后端 API                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP POST /api/create-room
┌─────────────────────────────────────────────────────────────────┐
│                    后端 Node.js                                  │
│  index-start-voicechat.js                                      │
│    ↓                                                            │
│  1. 生成 TaskId                                                  │
│  2. 调用 volc-start-voicechat.js                               │
│  3. 调用火山 StartVoiceChat API                                │
│     - Config.S2SConfig (端到端模式)                             │
│     - AgentConfig.TargetUserId                                  │
│     - AgentConfig.WelcomeMessage                                │
│    ↓                                                            │
│  4. 返回 { roomId, token, taskId, aiMode }                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓ 响应
┌─────────────────────────────────────────────────────────────────┐
│                    前端 JavaScript                               │
│  startvoicechat-client.js                                      │
│    ↓                                                            │
│  1. 保存 roomId, taskId                                        │
│  2. 初始化 RTC 引擎 (window.VERTC.createEngine)                  │
│  3. 加入 RTC 房间 (engine.joinRoom)                              │
│     - 使用 token 鉴权                                            │
│     - userId: 'child_user'                                     │
│    ↓                                                            │
│  4. 监听 RTC 事件                                                 │
│     - onUserJoin → AI 加入                                      │
│     - onUserPublishStream → 订阅 AI 音频/视频                      │
│    ↓                                                            │
│  5. 触发 onReady 回调                                             │
│     - 隐藏加载动画                                                │
│     - 显示"AI 角色已就绪"                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓ RTC 连接建立
┌─────────────────────────────────────────────────────────────────┐
│                    实时对话开始                                  │
│                                                                  │
│  孩子说话                                                        │
│    ↓ (RTC 音频流)                                                 │
│  火山引擎云端                                                    │
│    ↓ (ASR 语音识别)                                               │
│  豆包端到端模型                                                  │
│    ↓ (LLM 生成回复)                                               │
│  TTS 语音合成                                                    │
│    ↓ (RTC 音频流)                                                 │
│  前端播放 AI 声音                                                  │
│                                                                  │
│  循环继续...                                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 代码调用链

### 前端调用链

```javascript
// 1. 用户选择场景
js/app.js:selectScene('zoo')
  ↓
// 2. 创建 AI 房间
js/app.js:createAIVoiceChatRoom()
  ↓
// 3. 调用 StartVoiceChat 客户端
js/startvoicechat-client.js:createStartVoiceChatRoom(roomId, 'emma')
  ↓
// 4. 创建房间实例
new StartVoiceChatClient()
  ↓
// 5. 调用后端 API
client.createRoom(roomId, character)
  ↓ fetch('/api/create-room')
// 6. 初始化 RTC
client.initRTC()
  ↓
// 7. 加入 RTC 房间
client.joinRoom(token)
  ↓ VERTC.createEngine()
  ↓ engine.joinRoom()
  ↓
// 8. 监听事件
client.setupEventListeners()
  ↓
// 9. 触发回调
options.onReady()
  ↓
// 10. 隐藏加载动画，开始对话
```

### 后端调用链

```javascript
// 1. 接收请求
server/index-start-voicechat.js:POST /api/create-room
  ↓
// 2. 生成 TaskId
taskId = `task_${roomId}_${Date.now()}`
  ↓
// 3. 获取角色配置
CHARACTER_CONFIGS[character]
  ↓
// 4. 构建 S2S 配置
getS2SConfig({...})
  ↓
// 5. 调用 StartVoiceChat API
client.startVoiceChatS2S({...})
  ↓ volc-start-voicechat.js:callAPI('StartVoiceChat')
  ↓
// 6. 返回结果
{ roomId, token, taskId, aiMode }
```

---

## 🚫 不需要的代码

### WebSocket（旧系统）

以下代码在 StartVoiceChat 模式下**不需要**：

```javascript
// ❌ 不需要 WebSocket 连接
wsConnection = new WebSocket('ws://localhost:3000')

// ❌ 不需要手动发送音频
wsConnection.send(JSON.stringify({
    type: 'audio_chunk',
    audio: audioBase64
}))

// ❌ 不需要实时 ASR 类
class RealtimeASR { ... }
```

### 原因：

1. **StartVoiceChat 已包含 ASR** - 火山云端自动处理语音识别
2. **RTC 直接传输音频** - 不需要手动发送音频数据
3. **AI 回复自动推送** - 通过 RTC 音频流传输

---

## ✅ 需要的代码

### StartVoiceChat 客户端

```javascript
// ✅ 创建并加入房间
await createStartVoiceChatRoom(roomId, character, {
    onReady: (info) => {
        console.log('✅ AI ready:', info);
        hideVideoLoading();
    },
    onError: (error) => {
        console.error('❌ Error:', error);
        showVideoError(error.message);
    }
});
```

### RTC 连接

```javascript
// ✅ 初始化 RTC 引擎
engine = window.VERTC.createEngine(appId);

// ✅ 加入房间
await engine.joinRoom(token, roomId, {
    userId: 'child_user'
}, {
    isAutoSubscribeAudio: true,
    isAutoSubscribeVideo: true
});

// ✅ 监听事件
engine.on(VERTC.events.onUserJoin, (e) => {
    console.log('AI joined:', e.userId);
});
```

---

## 📝 更新建议

### 1. 移除或禁用 WebSocket

在 `js/app.js` 中：

```javascript
// 注释掉 WebSocket 初始化
// if (window.initWebSocket) {
//     window.initWebSocket();
// }
```

### 2. 明确使用 StartVoiceChat

在 `js/app.js` 的 `createAIVoiceChatRoom()` 中：

```javascript
async function createAIVoiceChatRoom() {
    console.log('🏠 Using StartVoiceChat API');
    
    // 使用 StartVoiceChat 客户端
    await createStartVoiceChatRoom(currentRoomId, currentCharacter.id, {
        onReady: (info) => {
            console.log('✅ AI voice chat ready:', info);
            hideVideoLoading();
        },
        onError: (error) => {
            console.error('❌ Voice chat error:', error);
            showVideoError(error.message);
        }
    });
}
```

### 3. 清理旧代码

可以移除或标记为弃用：

- `js/websocket-client.js` - 旧 WebSocket 客户端
- `js/rtc-client.js` 中的旧函数
- `RealtimeASR` 类

---

## 🧪 测试流程

### 1. 启动后端

```bash
cd server
node index-start-voicechat.js
```

### 2. 访问前端

```
http://localhost:3000
```

### 3. 浏览器控制台查看

```
✅ StartVoiceChat client loaded
🏠 Creating StartVoiceChat room...
✅ Room created: { roomId, taskId, aiMode: 's2s' }
🔌 Initializing RTC engine...
🔌 Joining RTC room...
✅ Joined RTC room
👤 User joined: child_user
📥 User published stream: ai_emma
✅ Subscribed to ai_emma audio
🎬 AI voice chat ready
```

### 4. 网络请求查看

**Network 标签：**

```
POST /api/create-room
Status: 200
Response: {
    "roomId": "room_xxx",
    "token": "eyJ...",
    "taskId": "task_xxx",
    "aiMode": "s2s",
    "success": true
}
```

---

## 📊 数据流对比

### 旧系统（WebSocket + 本地 ASR）

```
孩子说话
  ↓
浏览器录音
  ↓
WebSocket 发送音频块
  ↓
后端接收音频
  ↓
调用阿里云 ASR
  ↓
调用阿里云 Qwen
  ↓
调用 Edge TTS
  ↓
WebSocket 返回音频
  ↓
浏览器播放
```

**问题：** 延迟高、复杂、需要多个服务

### 新系统（StartVoiceChat）

```
孩子说话
  ↓
RTC 传输音频流
  ↓
火山引擎云端（ASR + LLM + TTS）
  ↓
RTC 返回音频流
  ↓
浏览器播放
```

**优点：** 延迟低、简单、一站式服务

---

## ✅ 总结

| 问题 | 答案 |
|------|------|
| 前端如何集成后端？ | HTTP REST API (`/api/create-room`) |
| 需要 WebSocket 吗？ | **不需要** |
| 什么时候用 RTC？ | 创建房间后立即使用 |
| 如何加入房间？ | `startvoicechat-client.js` 自动处理 |
| 音频如何传输？ | RTC 音频流（双向） |
| AI 回复如何获取？ | RTC 音频流自动推送 |

---

**关键：StartVoiceChat 模式下，前端只需要：**
1. 调用后端 API 创建房间
2. 使用返回的 Token 加入 RTC 房间
3. 监听 RTC 事件，播放音频

**其他一切都由火山引擎云端处理！** 🎉
