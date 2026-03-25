# ✅ 正确的 StartVoiceChat 集成流程

**更新时间：** 2026-03-15  
**状态：** 已修正为正确流程

---

## ❌ 之前的错误流程

```
前端 → 调用后端创建房间 → AI 已加入 → 前端再加入
```

**问题：**
- 前端被动加入，无法控制房间
- 本地音视频采集时机不明确
- 房间创建者和所有者不清晰

---

## ✅ 正确的流程

### 总体流程

```
1. 前端创建 RTC 房间并加入
2. 开启本地音视频采集
3. 订阅和播放房间内音视频流
4. 调用后端接口将 AI 角色加入 RTC 房间
5. 结束时调用后端接口结束 AI 对话，然后离开并销毁房间
```

### 详细步骤

```
┌─────────────────────────────────────────────────────────┐
│ 步骤 1: 前端创建 RTC 房间并加入                          │
├─────────────────────────────────────────────────────────┤
│ 1. 生成房间 ID：roomId = `room_${character}_${Date.now()}` │
│ 2. 初始化 RTC 引擎：VERTC.createEngine(appId)            │
│ 3. 生成 Token（或调用后端 API 获取）                     │
│ 4. 加入房间：engine.joinRoom(token, roomId, ...)        │
│ 5. 开启本地采集：engine.startAudioCapture()             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 步骤 2: 订阅和播放房间内音视频流                         │
├─────────────────────────────────────────────────────────┤
│ 1. 监听 onUserPublishStream 事件                         │
│ 2. 订阅流：engine.subscribeStream(userId, ...)          │
│ 3. 设置远端播放器：engine.setRemoteVideoPlayer(...)     │
│ 4. 自动播放接收到的音频                                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 步骤 3: 调用后端接口将 AI 角色加入 RTC 房间               │
├─────────────────────────────────────────────────────────┤
│ POST /api/join-ai                                       │
│ Body: { roomId, character, targetUserId }               │
│                                                         │
│ 后端处理：                                              │
│ 1. 调用 StartVoiceChat API                             │
│ 2. AI 加入已存在的 RTC 房间                              │
│ 3. 返回 taskId                                          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 步骤 4: 实时对话开始                                     │
├─────────────────────────────────────────────────────────┤
│ 孩子说话 → RTC 音频流 → 火山云端 → AI 回复 → RTC 音频流   │
│                                                         │
│ 火山云端自动处理：                                      │
│ - ASR 语音识别                                          │
│ - LLM 对话生成                                          │
│ - TTS 语音合成                                          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 步骤 5: 结束对话并离开房间                               │
├─────────────────────────────────────────────────────────┤
│ 1. 调用后端：POST /api/leave-room                       │
│    Body: { roomId, taskId }                             │
│ 2. 离开 RTC 房间：engine.leaveRoom()                    │
│ 3. 销毁引擎：VERTC.destroyEngine(engine)                │
└─────────────────────────────────────────────────────────┘
```

---

## 📡 API 接口

### POST /api/join-ai

**描述：** 将 AI 角色加入已存在的 RTC 房间

**请求：**
```json
{
  "roomId": "room_emma_1710576000000",
  "character": "emma",
  "targetUserId": "child_1710576000000"
}
```

**响应：**
```json
{
  "roomId": "room_emma_1710576000000",
  "taskId": "task_room_emma_1710576000000_1710576000000",
  "character": "emma",
  "characterName": "Miss Emma",
  "aiMode": "s2s",
  "success": true,
  "message": "AI character joined room successfully"
}
```

### POST /api/leave-room

**描述：** 结束 AI 对话并离开房间

**请求：**
```json
{
  "roomId": "room_emma_1710576000000",
  "taskId": "task_room_emma_1710576000000_1710576000000"
}
```

**响应：**
```json
{
  "success": true
}
```

### GET /api/token

**描述：** 获取 RTC Token（可选，前端也可以自己生成）

**请求：**
```
GET /api/token?roomId=room123&uid=child_user
```

**响应：**
```json
{
  "roomId": "room123",
  "uid": "child_user",
  "token": "eyJhcHBfaWQiOiJ4eHgiLCJyb29tX2lkIjoi...",
  "appId": "your_app_id"
}
```

---

## 💻 代码示例

### 前端代码

```javascript
// 步骤 1: 创建房间并加入
await createStartVoiceChatRoom(roomId, appId, {
    onReady: () => {
        console.log('✅ Room created and joined');
        
        // 步骤 2: 将 AI 加入房间
        joinAICharacter('emma');
    },
    onAIJoined: (info) => {
        console.log('✅ AI joined:', info);
        // 开始对话
    },
    onRemoteStream: (stream) => {
        console.log('📥 Remote stream:', stream);
    }
});

// 步骤 3: 离开房间
await leaveStartVoiceChatRoom();
```

### 后端代码

```javascript
// AI 加入房间
app.post('/api/join-ai', async (req, res) => {
    const { roomId, character, targetUserId } = req.body;
    
    // 调用 StartVoiceChat API，AI 加入已存在的房间
    const result = await client.startVoiceChatS2S({
        appId: VOLC_APP_ID,
        roomId,
        taskId: `task_${roomId}_${Date.now()}`,
        targetUserId,
        s2sConfig: getS2SConfig({...})
    });
    
    res.json({ taskId: result.TaskId, success: true });
});

// 离开房间
app.post('/api/leave-room', async (req, res) => {
    const { roomId, taskId } = req.body;
    
    await client.stopVoiceChat({
        appId: VOLC_APP_ID,
        roomId,
        taskId
    });
    
    res.json({ success: true });
});
```

---

## 🎯 关键变化

### 之前（错误）

```javascript
// 前端调用后端让 AI 加入房间
const data = await fetch('/api/join-ai', {...});

// 后端调用 StartVoiceChat API，AI 加入已存在的房间
// 前端已在房间里

// AI 加入后开始对话
await startConversation();
```

### 现在（正确）

```javascript
// 前端创建房间并加入
await createStartVoiceChatRoom(roomId, appId, {...});

// 前端调用后端将 AI 加入
await joinAICharacter('emma');

// AI 加入已存在的房间
```

---

## 📊 文件变更

### 前端

| 文件 | 变更 |
|------|------|
| `js/startvoicechat-client.js` | 重写为正确流程 |
| `js/app.js` | 更新调用逻辑 |

### 后端

| 文件 | 变更 |
|------|------|
| `server/index-join-ai.js` | 新增：AI 加入房间接口 |
| `server/index-start-voicechat.js` | 保留：旧流程（向后兼容） |
| `server/volc-start-voicechat.js` | 更新：支持两种模式 |

---

## 🧪 测试步骤

### 1. 启动服务

```bash
cd server
node index-join-ai.js
```

### 2. 浏览器访问

```
http://localhost:3000
```

### 3. 控制台日志

```
🏠 [1/4] Creating RTC room (frontend)...
✅ [1/4] Room created and joined
🤖 Joining AI character: emma
✅ [2/4] AI joined room: { taskId: '...' }
🎤 [3/4] Starting conversation...
📥 [4/4] Remote stream received: { userId: 'ai_emma', mediaType: 2 }
```

---

## ✅ 优势

### 前端控制

- ✅ 前端创建并拥有房间
- ✅ 前端控制何时加入 AI
- ✅ 前端控制何时结束对话

### 清晰流程

- ✅ 步骤明确（1-2-3-4-5）
- ✅ 责任清晰（前端/后端）
- ✅ 易于调试

### 灵活性

- ✅ 可以延迟加入 AI
- ✅ 可以切换 AI 角色
- ✅ 可以多个 AI 加入

---

## 📚 参考文档

- `START.md` - 火山引擎启动指南
- `QUICK-REFERENCE.md` - 快速参考
- `DEPLOY-DOCKER.md` - Docker 部署

---

**流程已修正！现在前端完全控制房间的创建和销毁。** 🎉
