# 📋 RTC 实时双向对话 - 代码分析与修改方案

**分析日期：** 2026-03-14  
**目标：** 实现孩子与动画角色通过 RTC 实时对话

---

## 📊 现有代码分析

### 1. 架构概览

```
当前架构（WebSocket + 模拟 RTC）：

前端浏览器                          服务端 (Node.js)
┌─────────────────┐                ┌─────────────────┐
│  RTC Client     │                │  Express + WS   │
│  (VE_RTC SDK)   │────WebSocket──▶│  server/index.js│
│                 │                │                 │
│  音频 → 本地     │                │  接收音频 → ASR  │
│  视频 ← 本地     │                │  Qwen → 返回文字 │
└─────────────────┘                └─────────────────┘
         │                                  │
         └────────── 问题 ──────────────────┘
         
问题：
1. ❌ 音频通过 WebSocket 发送（非实时，有延迟）
2. ❌ 服务端没有加入 RTC 房间（无法接收实时音频）
3. ❌ 返回的是文字和模拟的房间信息（无真实 TTS 推流）
4. ❌ 角色语音通过前端 TTS 播放（非角色身份）
```

---

### 2. 现有代码详细分析

#### 📁 `server/index.js` - 服务端主文件

**当前功能：**
```javascript
✅ 静态文件服务
✅ WebSocket 服务器
✅ 百炼 Qwen API 调用
✅ 百炼 ASR WebSocket 连接
❌ RTC Bot（服务端加入 RTC 房间）
❌ TTS 语音合成
❌ RTC 音频流推送
```

**关键代码段：**

```javascript
// WebSocket 连接处理
wss.on('connection', (ws, req) => {
    ws.on('message', async (message) => {
        // 接收音频数据（通过 WebSocket！）
        if (data.type === 'audio_chunk') {
            await recognizeSpeech(data.audio, sessionId, ws);
            // ❌ 问题：音频通过 WebSocket 传输，不是 RTC
        }
    });
});

// ASR 识别后触发对话
class RealtimeASR {
    constructor(sessionId, ws, onFinalText) {
        this.onFinalText = onFinalText; // 识别完成回调
    }
    
    // ✅ 这部分可以保留，但需要修改为从 RTC 获取音频
}

// 数字人生成（简化版）
async function generateAvatarVideo(text, character) {
    // ❌ 问题：返回模拟的房间信息，没有真实推流
    return {
        room_id: roomId,
        token: token,
        stream_url: `rtc://room/${roomId}` // 假的
    };
}
```

**问题总结：**
1. ❌ 音频通过 WebSocket 传输（应该用 RTC）
2. ❌ 服务端没有 RTC Bot 加入房间
3. ❌ 没有 TTS 合成和推送

---

#### 📁 `js/websocket-client.js` - 前端 WebSocket 客户端

**当前功能：**
```javascript
✅ WebSocket 连接管理
✅ 发送音频块（通过 WebSocket）
✅ 接收文字回复
❌ 没有 RTC 音频流处理
```

**问题：**
```javascript
// 发送音频数据
function sendWebSocketAudio(audioBlob) {
    // ❌ 音频通过 WebSocket 发送
    wsConnection.send(JSON.stringify({
        type: 'audio_chunk',
        audio: base64Audio
    }));
}

// 应该改为：
// ✅ 音频通过 RTC 发布到房间
// engine.publishStream(MediaType.AUDIO)
```

---

#### 📁 `js/rtc-client.js` - 前端 RTC 客户端

**当前功能：**
```javascript
✅ RTC 引擎初始化（VERTC.createEngine）
✅ 加入房间（joinRoom）
✅ 本地音频采集（startAudioCapture）
✅ 订阅远端流（setRemoteVideoPlayer）
❌ 没有与服务端 Bot 的交互逻辑
```

**问题：**
```javascript
// 加入房间
async join(roomId, token, uid) {
    await this.engine.joinRoom(...);
    // ✅ 这部分正确
    // ❌ 但服务端没有 Bot 在房间里
}

// 订阅远端流
handleUserPublishStream(e) {
    // ✅ 可以订阅到 Bot 的音频
    // ❌ 但 Bot 不存在
}
```

---

### 3. 依赖分析

#### `package.json`

**当前依赖：**
```json
{
  "express": "^4.18.2",
  "ws": "^8.14.2",
  "websocket-client": "^1.0.4",
  "dotenv": "^16.3.1"
}
```

**需要新增：**
```json
{
  "@volcengine/rtc": "^4.x",  // 服务端 RTC SDK
  "@alicloud/cosyvoice": "^1.x" // 或 TTS 服务
}
```

---

## 🎯 目标架构

```
目标架构（双向 RTC + 实时 ASR + Qwen + TTS）：

前端浏览器                          服务端 (Node.js)                    阿里云百炼
┌─────────────────┐                ┌─────────────────┐                ┌─────────────┐
│  🎤 孩子麦克风   │                │  RTC Bot Engine │                │             │
│                 │──── RTC ──────▶│  (加入房间)      │───WebSocket──▶│ qwen3-asr   │
│  👀 动画角色     │◀─── RTC ──────▶│                 │◀──────────────│ (实时识别)   │
│                 │    音频流       │  音频处理       │                │             │
└─────────────────┘                │        │        │                └─────────────┘
         │                         │        ▼        │                         │
         │                         │  ┌───────────┐  │                         │
         │                         │  │  Qwen API │  │◀────────────────────────┘
         │                         │  │  (对话)    │  │
         │                         │  └─────┬─────┘  │
         │                         │        │        │
         │                         │        ▼        │                ┌─────────────┐
         │                         │  ┌───────────┐  │                │             │
         │◀────────────────────────┼──│  TTS 服务  │──┼────────────────│  CosyVoice  │
         │    RTC 音频流            │  │  (语音合成)│  │                │             │
         │                         │  └───────────┘  │                └─────────────┘
         │                         └─────────────────┘
```

---

## 📝 修改方案

### 方案 A：完整实现（推荐）

**特点：**
- ✅ 真正的双向 RTC 实时对话
- ✅ 服务端 Bot 实时接收音频
- ✅ 百炼实时 ASR + Qwen + TTS
- ✅ 角色语音通过 RTC 推送

**工作量：** 中等（2-3 天）

**步骤：**

#### Step 1: 服务端 RTC Bot 实现

**新增文件：** `server/rtc-bot.js`

```javascript
const VERTC = require('@volcengine/rtc');

class RTCBot {
    constructor(options) {
        this.appId = options.appId;
        this.engine = null;
        this.roomId = null;
        this.uid = 'avatar_bot';
        this.character = options.character;
        this.onAudioReceived = options.onAudioReceived;
    }

    async joinRoom(roomId, token) {
        this.roomId = roomId;
        
        // 创建引擎
        this.engine = VERTC.createEngine(this.appId);
        
        // 监听用户发布流
        this.engine.on(VERTC.events.onUserPublishStream, async (e) => {
            console.log('📥 孩子发布流:', e.userId);
            
            // 订阅孩子的音频
            await this.engine.subscribeStream(e.userId, {
                audio: true,
                video: false
            });
        });
        
        // 监听音频数据
        this.engine.on(VERTC.events.onAudioData, (e) => {
            // e.data: Int16Array PCM 数据
            if (this.onAudioReceived) {
                this.onAudioReceived(e.data, e.userId);
            }
        });
        
        // 加入房间
        await this.engine.joinRoom(
            token,
            roomId,
            { userId: this.uid },
            {
                isAutoPublish: false,
                isAutoSubscribeAudio: true,
                roomProfileType: VERTC.RoomProfileType.communication
            }
        );
    }
    
    async publishAudio(pcmBuffer) {
        await this.engine.publishAudioData(pcmBuffer);
    }
    
    async leaveRoom() {
        await this.engine.leaveRoom();
    }
}

module.exports = RTCBot;
```

---

#### Step 2: TTS 服务集成

**新增文件：** `server/tts-client.js`

```javascript
// 使用阿里云 CosyVoice 或 Edge TTS
async function synthesizeSpeech(text, character) {
    // 调用 TTS API
    // 返回 PCM Buffer
}

module.exports = { synthesizeSpeech };
```

---

#### Step 3: 修改 `server/index.js`

**修改内容：**

```javascript
// 引入新模块
const RTCBot = require('./rtc-bot');
const { synthesizeSpeech } = require('./tts-client');

// 存储活跃会话
const rtcSessions = new Map(); // roomId → { bot, character, asr }

// 创建房间接口
app.post('/api/create-room', async (req, res) => {
    const { roomId, character } = req.body;
    
    // 生成 Bot Token
    const botToken = generateRTCToken(roomId, 'avatar_bot');
    
    // 创建 Bot 实例
    const bot = new RTCBot({
        appId: process.env.VOLC_APP_ID,
        character: character,
        onAudioReceived: async (audioData, childId) => {
            await handleChildAudio(roomId, audioData);
        }
    });
    
    // Bot 加入房间
    await bot.joinRoom(roomId, botToken);
    
    // 保存会话
    rtcSessions.set(roomId, { bot, character });
    
    res.json({ roomId, token: botToken });
});

// 处理孩子音频
async function handleChildAudio(roomId, audioData) {
    const session = rtcSessions.get(roomId);
    if (!session) return;
    
    // 1. ASR 识别（使用已有的 RealtimeASR）
    const asr = new RealtimeASR();
    const text = await asr.recognize(audioData);
    
    if (!text) return;
    console.log('🎤 孩子说:', text);
    
    // 2. 大模型生成回复
    const messages = [
        { role: 'system', content: getCharacterPrompt(session.character) },
        { role: 'user', content: text }
    ];
    
    const reply = await callQwenAPI(messages);
    console.log('🤖 AI 回复:', reply);
    
    // 3. TTS 合成
    const ttsAudio = await synthesizeSpeech(reply, session.character);
    
    // 4. 发布到 RTC 房间
    await session.bot.publishAudio(ttsAudio);
}
```

---

#### Step 4: 修改前端 `js/rtc-client.js`

**修改内容：**

```javascript
// 移除 WebSocket 音频发送逻辑
// 保留 RTC 功能

class RTCAvatarClient {
    // 加入房间后，自动订阅 Bot 的音频
    async handleUserPublishStream(e) {
        const { userId } = e;
        
        // 如果是 Bot，订阅其音频
        if (userId === 'avatar_bot') {
            await this.engine.subscribeStream(userId, {
                audio: true,
                video: false
            });
            
            // 设置音频播放器
            await this.engine.setRemoteAudioPlayer(
                VERTC.StreamIndex.STREAM_INDEX_MAIN,
                { userId }
            );
        }
    }
}
```

---

#### Step 5: 修改前端 `js/websocket-client.js`

**修改内容：**

```javascript
// 移除 sendWebSocketAudio 函数
// 保留文字消息发送（降级方案）

function sendWebSocketText(text) {
    // 保留用于文字输入
}

// 音频现在通过 RTC 传输
```

---

### 方案 B：简化实现（快速验证）

**特点：**
- ⚡ 快速验证流程
- ✅ 保留 WebSocket 传输音频
- ✅ 服务端 Bot 通过 RTC 推送 TTS
- ⚠️ 孩子音频仍通过 WebSocket（非实时）

**工作量：** 小（1 天）

**步骤：**

1. 实现服务端 RTC Bot（同上）
2. 实现 TTS 服务
3. 修改 `server/index.js` 处理 WebSocket 音频 → ASR → Qwen → TTS → RTC
4. 前端保持不变

---

## 📊 方案对比

| 特性 | 方案 A（完整） | 方案 B（简化） |
|------|--------------|--------------|
| 实时性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 延迟 | ~500ms | ~1000ms |
| 工作量 | 2-3 天 | 1 天 |
| 代码改动 | 中等 | 小 |
| 适合场景 | 生产环境 | 快速验证 |

---

## 🚀 推荐实施步骤

### 阶段 1：基础准备（0.5 天）

1. 安装依赖
```bash
npm install @volcengine/rtc
```

2. 配置环境变量
```bash
VOLC_APP_ID=xxx
VOLC_APP_KEY=xxx
DASHSCOPE_API_KEY=sk-xxx
```

3. 创建 TTS 服务（选择一种）
   - 阿里云 CosyVoice
   - Edge TTS（免费）
   - 火山 TTS

---

### 阶段 2：服务端 Bot（1 天）

1. 创建 `server/rtc-bot.js`
2. 创建 `server/tts-client.js`
3. 修改 `server/index.js`
4. 测试 Bot 加入房间

---

### 阶段 3：前端集成（0.5 天）

1. 修改 `js/rtc-client.js` 订阅 Bot
2. 简化 `js/websocket-client.js`
3. 测试端到端对话

---

### 阶段 4：测试优化（0.5-1 天）

1. 延迟测试
2. 并发测试
3. 错误处理
4. 性能优化

---

## ⚠️ 技术难点

### 1. 服务端接收 RTC 音频

**问题：** 火山 RTC Node.js SDK 的 `onAudioData` 事件

**解决：**
```javascript
engine.on(VERTC.events.onAudioData, (e) => {
    // e.data: Int16Array
    const pcmBuffer = Buffer.from(e.data.buffer);
    processAudio(pcmBuffer);
});
```

### 2. TTS 实时推送

**问题：** TTS 流式推送 vs 完整音频推送

**解决：**
- 方案 1：等待完整 TTS 音频 → 一次性推送
- 方案 2：流式 TTS → 分块推送（更复杂）

### 3. 对话打断

**问题：** 孩子打断角色说话

**解决：**
- VAD 检测孩子说话
- 停止当前 TTS 播放
- 优先处理孩子音频

---

## ✅ 验收标准

1. ✅ 孩子说话后 2 秒内听到角色回复
2. ✅ 角色语音清晰可懂
3. ✅ 支持连续对话
4. ✅ 错误处理完善
5. ✅ CPU/内存占用合理

---

## 📚 参考文档

- [火山 RTC Node.js SDK](https://www.volcengine.com/docs/6348/104482)
- [阿里云百炼 ASR](https://help.aliyun.com/zh/model-studio/)
- [Edge TTS](https://github.com/rany2/edge-tts)

---

**下一步：** 选择方案 A 或 B，开始实施！
