# 🔄 火山 RTC 实时对话式 AI 方案

**更新日期：** 2026-03-14  
**参考文档：**
- [集成实时对话式 AI](https://www.volcengine.com/docs/6348/1310560)
- [开启 AI 对话 StartVoiceChat](https://www.volcengine.com/docs/6348/1558163)
- [结束 AI 对话 StopVoiceChat](https://www.volcengine.com/docs/6348/2123310)

---

## 📋 正确架构

### 火山 RTC 实时对话式 AI

火山引擎 RTC 提供**内置的 AI 音视频互动方案**，无需服务端推流/拉流！

```
┌─────────────────┐                          ┌─────────────────┐
│   孩子浏览器     │                          │  火山引擎        │
│                 │                          │  RTC + AI        │
│  🎤 RTC 发布     │────── RTC 音频流 ───────▶│  实时对话式 AI   │
│  👀 RTC 订阅     │◀───── RTC 音频流 ───────│  (云端处理)     │
│                 │                          │                 │
└────────┬────────┘                          └────────┬────────┘
         │                                           │
         │ WebSocket (控制信令)                       │ OpenAPI
         │                                           │
         ▼                                           ▼
         │                          ┌─────────────────────────┐
         │                          │   服务端 (Node.js)       │
         │                          │                         │
         └──────────────────────────┤  百炼 Qwen (备用)        │
                                    │  Edge TTS (备用)        │
                                    └─────────────────────────┘
```

---

## 🔑 核心 API

### 1. StartVoiceChat（开启 AI 对话）

```javascript
POST /api
Action=StartVoiceChat
{
  "AppId": "your_app_id",
  "RoomId": "room_123",
  "UserId": "ai_bot",
  "VoiceChatConfig": {
    "Persona": "温柔英语老师",
    "Language": "en-US"
  }
}

Response:
{
  "TaskId": "task_xxx",
  "Status": "success"
}
```

**功能：**
- 创建虚拟 AI 用户加入房间
- 自动订阅房间内音频流
- 自动进行 ASR + NLP + TTS
- 自动发布 TTS 音频流到房间

### 2. UpdateVoiceChat（更新 AI 对话）

```javascript
POST /api
Action=UpdateVoiceChat
{
  "TaskId": "task_xxx",
  "VoiceChatConfig": {
    "Persona": "活泼小男孩"
  }
}
```

### 3. StopVoiceChat（结束 AI 对话）

```javascript
POST /api
Action=StopVoiceChat
{
  "TaskId": "task_xxx"
}
```

---

## 🚀 实施步骤

### Step 1: 前置准备

1. **开通 RTC 服务**
   - 获取 AppID 和 AppKey
   - 开通 AI 音视频互动方案

2. **配置 AI 人设**
   - 创建角色人设（如 Miss Emma）
   - 配置语音音色
   - 配置对话风格

### Step 2: 前端集成

```javascript
import VERTC from '@volcengine/rtc';

// 1. 创建引擎
const engine = VERTC.createEngine(appId);

// 2. 加入房间
await engine.joinRoom(token, roomId, {
  userId: 'child_user'
}, {
  isAutoPublish: true,
  isAutoSubscribeAudio: true
});

// 3. 开启本地采集
await engine.startAudioCapture();

// 4. AI 会自动订阅并回复
// 无需额外操作！
```

### Step 3: 服务端调用 StartVoiceChat

```javascript
const { VolcRTCClient } = require('./volc-rtc-client');

const rtcClient = new VolcRTCClient({
  appId: process.env.VOLC_APP_ID,
  appKey: process.env.VOLC_APP_KEY
});

// 开启 AI 对话
const result = await rtcClient.startVoiceChat({
  roomId: 'room_123',
  userId: 'ai_bot',
  persona: '温柔英语老师 Miss Emma',
  language: 'en-US'
});

console.log('AI 对话已开启:', result.TaskId);
```

---

## 🎯 完整流程

### 1. 孩子加入房间

```
孩子浏览器
    │
    ▼
调用 joinRoom()
    │
    ▼
RTC 发布音频流
    │
    ▼
自动被 AI 订阅
```

### 2. AI 自动回复

```
火山引擎 RTC AI
    │
    ├─ ASR 识别孩子语音
    │
    ├─ NLP 理解并生成回复
    │
    ├─ TTS 合成语音
    │
    ▼
RTC 发布 TTS 音频流
    │
    ▼
孩子浏览器自动订阅并播放
```

### 3. 服务端控制

```
服务端
    │
    ├─ StartVoiceChat（开启 AI）
    │
    ├─ UpdateVoiceChat（切换角色）
    │
    └─ StopVoiceChat（结束 AI）
```

---

## 💡 优势对比

### 旧方案（服务端推流）❌

```
孩子 → RTC → 服务端 → ASR → Qwen → TTS → 推流 → RTC → 孩子
                      ↑                    ↓
                  复杂且延迟高           需要额外配置
```

**问题：**
- ❌ 火山 RTC 不支持服务端推流
- ❌ 需要额外配置对象存储
- ❌ 延迟高（多次中转）
- ❌ 实现复杂

### 新方案（实时对话式 AI）✅

```
孩子 → RTC → 火山 AI 云端处理 → RTC → 孩子
              ↑
         ASR + NLP + TTS
         一站式完成
```

**优势：**
- ✅ 官方原生支持
- ✅ 低延迟（云端直连）
- ✅ 实现简单
- ✅ 无需服务端处理媒体流

---

## 🔧 修改方案

### 1. 删除废弃代码

```bash
# 删除旧版服务端推流相关
rm server/index-rtc-openapi.js
rm server/volc-rtc-client.js  # 需要重写
rm server/uploads/ -rf
```

### 2. 重写 VolcRTCClient

```javascript
// server/volc-rtc-client.js
// 新实现：只包含实时对话式 AI API

class VolcRTCClient {
  // 开启 AI 对话
  async startVoiceChat(config) {
    return await this.callAPI('StartVoiceChat', config);
  }
  
  // 更新 AI 对话
  async updateVoiceChat(taskId, config) {
    return await this.callAPI('UpdateVoiceChat', { TaskId: taskId, ...config });
  }
  
  // 结束 AI 对话
  async stopVoiceChat(taskId) {
    return await this.callAPI('StopVoiceChat', { TaskId: taskId });
  }
}
```

### 3. 简化服务端

```javascript
// server/index.js
// 新架构：只处理控制信令

// 开启 AI 对话
app.post('/api/start-ai', async (req, res) => {
  const { roomId, character } = req.body;
  
  const result = await rtcClient.startVoiceChat({
    roomId,
    userId: `ai_${character}`,
    persona: getCharacterPrompt(character),
    language: 'en-US'
  });
  
  res.json({ taskId: result.TaskId });
});
```

### 4. 前端直接使用 RTC

```javascript
// 前端无需修改太多
// RTC 会自动订阅 AI 发布的音频流

// 1. 加入房间
await engine.joinRoom(token, roomId, { userId });

// 2. 开启采集
await engine.startAudioCapture();

// 3. AI 会自动回复！
```

---

## 📊 延迟对比

| 方案 | 延迟 |
|------|------|
| 旧方案（服务端推流） | ~3-4 秒 |
| 新方案（实时对话式 AI） | ~1-2 秒 ⭐ |

---

## ✅ 实施清单

- [ ] 删除废弃代码
- [ ] 重写 VolcRTCClient
- [ ] 简化服务端 index.js
- [ ] 测试 StartVoiceChat API
- [ ] 前端测试 AI 对话
- [ ] 端到端验证

---

**开始实施新方案！** 🚀
