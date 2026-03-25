# 📖 StartVoiceChat 快速参考

**核心问题快速解答**

---

## ❓ 关键问题

### Q: 前端如何与后端集成？

**A:** 通过 **HTTP REST API**

```javascript
// 前端调用
const response = await fetch('/api/create-room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        roomId: 'room123',
        character: 'emma'
    })
});

const data = await response.json();
// data: { roomId, token, taskId, aiMode }
```

---

### Q: 还需要 WebSocket 吗？

**A:** **不需要！**

```javascript
// ❌ 不需要这些
wsConnection = new WebSocket('ws://localhost:3000');
wsConnection.send(JSON.stringify({ type: 'audio_chunk', audio: ... }));

// ✅ 只需要这个
await createStartVoiceChatRoom(roomId, character);
```

**原因：** StartVoiceChat 已包含 ASR+LLM+TTS，RTC 直接传输音频流。

---

### Q: 什么时候使用 RTC？

**A:** **创建房间后立即使用**

```javascript
// 1. 创建房间（调用后端 API）
await createStartVoiceChatRoom(roomId, 'emma');
// ↓
// 2. 自动初始化 RTC 引擎
// 3. 自动加入 RTC 房间
// 4. 开始实时对话
```

---

### Q: 如何加入房间？

**A:** `startvoicechat-client.js` **自动处理**

```javascript
// 一行代码搞定
await createStartVoiceChatRoom(roomId, character, {
    onReady: () => console.log('✅ AI ready')
});
```

**内部流程：**
1. 调用后端 API 获取 Token
2. `VERTC.createEngine(appId)`
3. `engine.joinRoom(token, roomId, ...)`
4. 监听 RTC 事件

---

## 🔄 完整流程（一图看懂）

```
用户选择场景
    ↓
selectScene('zoo')
    ↓
createAIVoiceChatRoom()
    ↓
createStartVoiceChatRoom(roomId, 'emma')
    ↓
fetch('/api/create-room')  ← HTTP POST
    ↓
后端调用 StartVoiceChat API
    ↓
返回 { roomId, token, taskId }
    ↓
前端加入 RTC 房间
    ↓
实时对话开始
    ↓
孩子说话 → RTC → 火山云端 → RTC → 播放 AI 声音
```

---

## 📡 API 接口

### POST /api/create-room

**请求：**
```json
{
  "roomId": "room123",
  "character": "emma"
}
```

**响应：**
```json
{
  "roomId": "room123",
  "token": "eyJhcHBfaWQiOiJ4eHgiLCJyb29tX2lkIjoi...",
  "appId": "your_app_id",
  "character": "emma",
  "taskId": "task_room123_1710576000000",
  "aiMode": "s2s",
  "success": true
}
```

### POST /api/leave-room

**请求：**
```json
{
  "roomId": "room123"
}
```

### GET /api/characters

**响应：**
```json
{
  "characters": [
    { "id": "emma", "name": "Miss Emma", ... },
    { "id": "tommy", "name": "Tommy", ... }
  ]
}
```

---

## 🎯 关键代码

### 前端核心函数

```javascript
// 1. 创建房间
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

// 2. 离开房间
await leaveStartVoiceChatRoom();

// 3. 切换视频模式
toggleVideoMode();

// 4. 切换静音
toggleMute();
```

### 后端核心函数

```javascript
// 1. 创建房间（端到端模式）
await client.startVoiceChatS2S({
    appId: VOLC_APP_ID,
    roomId,
    taskId,
    targetUserId: 'child_user',
    s2sConfig: getS2SConfig({...}),
    welcomeMessage: 'Hello!'
});

// 2. 离开房间
await client.stopVoiceChat({
    appId: VOLC_APP_ID,
    roomId,
    taskId
});
```

---

## 🧪 测试命令

### 启动服务

```bash
cd server
node index-start-voicechat.js
```

### 运行测试

```bash
node test-integration.js
```

### 手动测试

```bash
# 健康检查
curl http://localhost:3000/health

# 获取角色列表
curl http://localhost:3000/api/characters

# 创建房间
curl -X POST http://localhost:3000/api/create-room \
  -H "Content-Type: application/json" \
  -d '{"roomId":"test1","character":"emma"}'

# 离开房间
curl -X POST http://localhost:3000/api/leave-room \
  -H "Content-Type: application/json" \
  -d '{"roomId":"test1"}'
```

---

## 🐛 调试技巧

### 浏览器控制台

```javascript
// 查看日志
✅ StartVoiceChat client loaded
🏠 Creating StartVoiceChat room...
✅ Room created: { roomId, taskId, aiMode }
🔌 Joining RTC room...
✅ Joined RTC room
🎬 AI voice chat ready
```

### 网络请求

**Network 标签查看：**
- `POST /api/create-room` - 创建房间
- `POST /api/leave-room` - 离开房间

### RTC 状态

```javascript
// 查看 RTC 状态
📊 RTC Status: connected - AI 角色已就绪
```

---

## ⚠️ 常见问题

### 问题 1: 服务启动失败

```bash
# 检查 .env 配置
cat .env | grep VOLC_

# 确保配置了：
VOLC_APP_ID=xxx
VOLC_APP_KEY=xxx
VOLC_ACCESS_KEY=xxx
VOLC_SECRET_KEY=xxx
VOLC_S2S_APP_ID=xxx
VOLC_S2S_TOKEN=xxx
```

### 问题 2: 创建房间返回 401

```bash
# 检查 AccessKey/SecretKey
# 检查服务器时间是否准确
date
```

### 问题 3: RTC SDK 加载失败

```javascript
// 检查网络
// 检查 CDN 是否可访问
// 使用动画模式（自动降级）
```

### 问题 4: AI 未入房

```bash
# 等待 10-15 秒
# 查看火山引擎控制台
# 检查服务端日志
```

---

## 📚 文档索引

| 文档 | 用途 |
|------|------|
| `START.md` | 火山引擎详细指南 |
| `CORRECT-FLOW.md` | 正确集成流程 |
| `DEPLOY-DOCKER.md` | Docker 部署 |
| `HTTPS-CONFIG.md` | HTTPS 配置 |

---

## 🔑 关键要点

1. **不需要 WebSocket** - StartVoiceChat 已包含所有功能
2. **RTC 自动加入** - `createStartVoiceChatRoom()` 自动处理
3. **音频流双向传输** - 孩子说话 → 云端处理 → AI 回复
4. **一行代码创建房间** - `await createStartVoiceChatRoom(...)`
5. **降级支持** - RTC 不可用时使用动画模式

---

**快速启动：**

```bash
cd server
cp .env.example .env
# 编辑 .env 填入凭证
node index-start-voicechat.js
# 浏览器访问：http://localhost:3000
```

**参考文档：** `CORRECT-FLOW.md`
