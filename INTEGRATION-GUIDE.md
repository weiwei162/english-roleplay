# 🔗 RTC 实时对话式 AI 集成指南

**版本：** v3.0.0  
**更新日期：** 2026-03-15  
**状态：** ✅ 前后端集成完成

---

## 📋 完整架构

```
┌─────────────────┐                          ┌─────────────────┐
│   孩子浏览器     │                          │  服务端 (Node.js) │
│                 │                          │                 │
│  1. 选择角色     │────── HTTP POST ────────▶│  /api/create-room│
│  2. 选择场景     │                          │                 │
│                 │                          │  StartVoiceChat  │
│                 │                          │        │         │
└────────┬────────┘                          └────────┬────────┘
         │                                           │
         │ RTC Token + RoomId                        │ 火山引擎
         │                                           ▼
         │                          ┌─────────────────────────┐
         │                          │   火山引擎 RTC + AI      │
         │                          │   ┌─────────────────┐   │
         │◀───── 2. 加入房间 ───────┼──▶│ 虚拟 AI 用户       │   │
         │                          │   │ ASR + NLP + TTS  │   │
         │                          │   └─────────────────┘   │
         │                          └─────────────────────────┘
         │
         │ 3. RTC 音频流
         │    (自动订阅 AI)
         ▼
┌─────────────────┐
│  火山引擎云端    │
│                 │
│  AI 自动回复     │
│  (低延迟)        │
└─────────────────┘
```

---

## 🚀 使用流程

### 1. 前端：选择角色

```javascript
// js/app.js
function selectCharacter(charId) {
    currentCharacter = getCharacter(charId);
    // ... 更新 UI
    showScreen('scene-select');
}
```

### 2. 前端：选择场景并创建 AI 房间

```javascript
async function selectScene(sceneId) {
    currentScene = getScene(sceneId);
    
    // ⭐ 创建 AI 语音聊天房间
    await createAIVoiceChatRoom();
    
    // 开始对话
    startDialogue();
}
```

### 3. 前端：调用后端 API

```javascript
async function createAIVoiceChatRoom() {
    // 生成房间 ID
    currentRoomId = `room_${currentCharacter.id}_${currentScene.id}_${Date.now()}`;
    
    // 调用后端 API
    const response = await fetch('/api/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            roomId: currentRoomId,
            character: currentCharacter.id
        })
    });
    
    const data = await response.json();
    // data.token - RTC Token
    // data.aiTaskId - AI 对话任务 ID
    
    // 加入 RTC 房间
    rtcAvatarClient.join(currentRoomId, data.token, 'child_' + Date.now());
}
```

### 4. 服务端：创建房间并开启 AI

```javascript
// server/index-rtc-ai.js
app.post('/api/create-room', async (req, res) => {
    const { roomId, character } = req.body;
    
    // 1. 生成孩子的 Token
    const childToken = rtcClient.generateToken(roomId, 'child');
    
    // 2. 开启 AI 对话
    const aiResult = await rtcClient.startVoiceChat({
        roomId,
        userId: `ai_${character}`,
        persona: CHARACTER_PERSONAS[character].persona,
        language: CHARACTER_PERSONAS[character].language
    });
    
    // 3. 返回结果
    res.json({
        roomId,
        token: childToken,
        aiTaskId: aiResult.TaskId
    });
});
```

### 5. 火山引擎：自动处理

```
孩子说话
    │
    ▼
RTC 发布音频流
    │
    ▼
火山 AI 云端处理
    ├─ ASR: 识别语音
    ├─ NLP: 理解并生成回复
    └─ TTS: 合成语音
    │
    ▼
AI 发布 TTS 音频流
    │
    ▼
孩子浏览器自动播放
```

---

## 📁 关键代码位置

### 前端

| 文件 | 函数 | 说明 |
|------|------|------|
| `js/app.js` | `selectCharacter()` | 选择角色 |
| `js/app.js` | `selectScene()` | 选择场景并创建 AI 房间 |
| `js/app.js` | `createAIVoiceChatRoom()` | ⭐ 创建 AI 语音聊天房间 |
| `js/app.js` | `leaveAIVoiceChatRoom()` | 离开 AI 房间 |
| `js/rtc-client.js` | `RTCAvatarClient.join()` | 加入 RTC 房间 |

### 服务端

| 文件 | 接口 | 说明 |
|------|------|------|
| `server/index-rtc-ai.js` | `POST /api/create-room` | ⭐ 创建房间并开启 AI |
| `server/index-rtc-ai.js` | `POST /api/leave-room` | 离开房间并结束 AI |
| `server/index-rtc-ai.js` | `POST /api/switch-character` | 切换角色 |
| `server/volc-rtc-client.js` | `startVoiceChat()` | ⭐ 调用 StartVoiceChat API |

---

## 🔑 API 接口

### 1. 创建房间

```http
POST /api/create-room
Content-Type: application/json

{
  "roomId": "room_123",
  "character": "emma"
}
```

**响应：**
```json
{
  "roomId": "room_123",
  "token": "eyJhcHBfaWQiOiIxMjM0NTY3ODkwIi...",
  "appId": "1234567890",
  "character": "emma",
  "aiTaskId": "task_xxx"
}
```

### 2. 离开房间

```http
POST /api/leave-room
Content-Type: application/json

{
  "roomId": "room_123"
}
```

### 3. 切换角色

```http
POST /api/switch-character
Content-Type: application/json

{
  "roomId": "room_123",
  "character": "tommy"
}
```

---

## 🎭 角色人设

```javascript
const CHARACTER_PERSONAS = {
    emma: {
        persona: '温柔英语老师 Miss Emma',
        language: 'en-US',
        voice: 'female'
    },
    tommy: {
        persona: '5 岁美国小男孩 Tommy',
        language: 'en-US',
        voice: 'male'
    },
    lily: {
        persona: '7 岁活泼小姐姐 Lily',
        language: 'en-US',
        voice: 'female'
    },
    mike: {
        persona: '阳光运动教练 Mike',
        language: 'en-US',
        voice: 'male'
    },
    rose: {
        persona: '慈祥老奶奶 Rose',
        language: 'en-US',
        voice: 'elderly_female'
    }
};
```

---

## ✅ 测试步骤

### 1. 启动服务端

```bash
cd server
npm run start:rtc-ai
```

**预期输出：**
```
╔══════════════════════════════════════════════════════╗
║    English Friend - RTC Real-time AI Server          ║
║                                                      ║
║   🎮 RTC AI:   ✅ configured                          ║
║   ☁️ Bailian:  ✅ configured                          ║
║                                                      ║
║   ✨ Features:                                        ║
║   ✓ 火山 RTC 实时对话式 AI（内置 ASR+NLP+TTS）          ║
║   ✓ 5 种角色人设（Emma/Tommy/Lily/Mike/Rose）          ║
╚══════════════════════════════════════════════════════╝
```

### 2. 浏览器访问

```
http://localhost:3000
```

### 3. 测试流程

1. **选择角色** → 点击 Miss Emma
2. **选择场景** → 点击魔法动物园
3. **等待 AI 初始化** → 控制台显示 `✅ AI voice chat room created`
4. **说话测试** → 点击麦克风说 "Hello Miss Emma!"
5. **听 AI 回复** → 自动播放 "Hi! Great to see you!"

---

## 🐛 故障排查

### Q1: 创建房间失败

```bash
# 检查服务端日志
tail -f server/logs/*.log

# 检查 .env 配置
cat .env | grep VOLC
```

### Q2: RTC 加入失败

```bash
# 检查 Token 是否正确
# 检查 RTC SDK 是否加载
# 查看浏览器控制台错误
```

### Q3: AI 不回复

```bash
# 检查 StartVoiceChat 是否成功
# 检查 AI TaskId 是否正确
# 查看服务端日志
```

---

## 📊 性能指标

| 指标 | 目标值 | 实测值 |
|------|--------|--------|
| 延迟 | < 2 秒 | 待测试 |
| 识别准确率 | > 90% | 待测试 |
| 并发支持 | > 100 | 待测试 |

---

## 📚 参考文档

- [火山 RTC 实时对话式 AI](https://www.volcengine.com/docs/6348/1310560)
- [StartVoiceChat API](https://www.volcengine.com/docs/6348/1558163)
- [StopVoiceChat API](https://www.volcengine.com/docs/6348/2123310)

---

**集成完成！开始测试吧！** 🎉
