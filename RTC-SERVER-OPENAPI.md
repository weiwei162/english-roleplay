# 🏗️ 火山 RTC 服务端 OpenAPI 集成方案

**版本：** v2.2.0  
**更新日期：** 2026-03-14  
**架构模式：** API 驱动 + 虚拟用户

---

## 📋 架构说明

### 核心概念

火山引擎 RTC 服务端**不直接连接 RTC 房间**，而是通过 **OpenAPI** 控制虚拟用户来实现推流和拉流。

```
┌─────────────────┐                          ┌─────────────────┐
│   孩子浏览器     │                          │  服务端 (Node.js) │
│                 │                          │                 │
│  🎤 麦克风       │────── RTC 音频流 ───────▶│  虚拟用户       │
│  👀 动画角色     │◀───── RTC 音频流 ───────│  (火山创建)     │
│                 │                          │                 │
└────────┬────────┘                          └────────┬────────┘
         │                                           │
         │ WebSocket (控制信令)                       │ OpenAPI
         │                                           ▼
         │                          ┌─────────────────────────┐
         │                          │   火山引擎 RTC 服务      │
         │                          │   ┌─────────────────┐   │
         │                          ├──▶│ 虚拟用户推流     │   │
         │                          │   │ StartPushStream │   │
         │                          │   └─────────────────┘   │
         │                          │   ┌─────────────────┐   │
         │                          ├──▶│ 虚拟用户拉流     │   │
         │                          │   │ StartRecording  │   │
         │                          │   └─────────────────┘   │
         │                          │   ┌─────────────────┐   │
         │                          ├──▶│ 云端 ASR         │   │
         │                          │   │ StartASR        │   │
         │                          │   └─────────────────┘   │
         │                          └─────────────────────────┘
```

---

## 🔧 工作流程

### 1. 孩子说话 → 服务端接收

```
孩子浏览器
    │
    ├─▶ RTC 发布音频到房间
    │
    ▼
服务端调用 StartRecording
    │
    ├─▶ 火山创建虚拟用户加入房间
    │
    ├─▶ 虚拟用户订阅孩子音频流
    │
    ├─▶ 云端 ASR 识别
    │
    ▼
回调通知服务端识别结果
```

### 2. 服务端回复 → 孩子听到

```
服务端生成 TTS 音频
    │
    ▼
调用 StartPushStream
    │
    ├─▶ 火山创建虚拟用户加入房间
    │
    ├─▶ 虚拟用户发布 TTS 音频流
    │
    ▼
孩子浏览器 RTC 订阅并播放
```

---

## 📦 新增文件

| 文件 | 说明 |
|------|------|
| `server/volc-rtc-client.js` | 火山 RTC OpenAPI 客户端 |
| `server/rtc-bot.js` | ❌ 已废弃（服务端无法直接连接 RTC） |

---

## 🔑 API 列表

### 推流相关（让角色"说话"）

| API | 功能 | 参数 |
|-----|------|------|
| `StartPushStream` | 开始推流 | roomId, userId, audioUrl |
| `StopPushStream` | 停止推流 | roomId, userId |
| `StartVoiceChat` | 开始语音对话（TTS 联动） | roomId, text |

### 拉流相关（让孩子"被听"）

| API | 功能 | 参数 |
|-----|------|------|
| `StartRecording` | 开始录制 | roomId, userIds, storageConfig |
| `StopRecording` | 停止录制 | taskId |
| `StartASR` | 开始云端 ASR | roomId, userId, language, callbackUrl |

---

## 💻 使用示例

### 初始化客户端

```javascript
const { VolcRTCClient } = require('./volc-rtc-client');

const rtcClient = new VolcRTCClient({
    appId: process.env.VOLC_APP_ID,
    appKey: process.env.VOLC_APP_KEY,
    region: 'cn-north-1' // 华北区域
});
```

### 开始推流（播放 TTS）

```javascript
// 1. 生成 TTS 音频并上传到可访问的 URL
const ttsUrl = await uploadTTSAudio(audioBuffer);

// 2. 调用推流 API
await rtcClient.startPushStream(roomId, ttsUrl, 'server_bot');
```

### 开始录制（接收孩子音频）

```javascript
// 调用录制 API
const result = await rtcClient.startRecording(roomId, ['child_user_id']);

// 录制任务 ID
const taskId = result.TaskId;
```

### 生成客户端 Token

```javascript
// 为孩子生成加入房间的 Token
const childToken = rtcClient.generateToken(roomId, 'child_user');
```

---

## 🔧 集成到现有项目

### 修改 `server/index.js`

```javascript
const { VolcRTCClient } = require('./volc-rtc-client');

// 初始化 RTC 客户端
const rtcClient = new VolcRTCClient({
    appId: process.env.VOLC_APP_ID,
    appKey: process.env.VOLC_APP_KEY
});

// 创建房间接口
app.post('/api/create-room', async (req, res) => {
    const { roomId, character } = req.body;
    
    // 生成孩子的 Token
    const childToken = rtcClient.generateToken(roomId, 'child');
    
    res.json({
        roomId,
        token: childToken,
        appId: process.env.VOLC_APP_ID
    });
});

// 处理孩子说话（通过 WebSocket 接收 ASR 结果）
async function handleChildSpeech(roomId, text) {
    // 1. 大模型生成回复
    const reply = await callQwenAPI(text);
    
    // 2. TTS 合成
    const ttsAudio = await synthesizeSpeech(reply);
    
    // 3. 上传音频到可访问 URL
    const audioUrl = await uploadAudio(ttsAudio);
    
    // 4. 调用推流 API
    await rtcClient.startPushStream(roomId, audioUrl, 'server_bot');
}
```

---

## ⚠️ 注意事项

### 1. 音频文件 URL

`StartPushStream` 需要**可公开访问的音频 URL**，你需要：

- 上传 TTS 音频到 CDN 或对象存储
- 确保 URL 可以被火山引擎服务端访问
- 设置合适的 CORS 策略

### 2. 回调配置

ASR 和录制结果通过**回调通知**发送，你需要：

- 提供公网可访问的回调 URL
- 验证回调签名
- 处理回调数据

### 3. 虚拟用户管理

- 每个推流/拉流任务都会创建虚拟用户
- 及时调用 Stop API 清理资源
- 避免虚拟用户占用房间名额

### 4. 费用说明

| 服务 | 计费方式 | 价格 |
|------|---------|------|
| RTC 通话 | 按分钟 | ¥0.02/分钟 |
| 云端录制 | 按时长 + 存储 | ¥0.03/分钟 + 存储费 |
| 云端 ASR | 按时长 | ¥0.03/分钟 |

---

## 🧪 测试命令

```bash
# 测试 RTC 客户端
cd server
node -e "const {testRTCClient} = require('./volc-rtc-client'); testRTCClient()"
```

---

## 📚 参考文档

- [RTC 服务端 API 概览](https://www.volcengine.com/docs/6348/104482)
- [StartPushStream API](https://www.volcengine.com/docs/6348/104483)
- [StartRecording API](https://www.volcengine.com/docs/6348/104484)
- [StartASR API](https://www.volcengine.com/docs/6348/104485)
- [Token 生成](https://www.volcengine.com/docs/6348/69865)

---

## ✅ 实施清单

- [x] 创建 `volc-rtc-client.js`
- [ ] 配置 OpenAPI 凭证（AppID + AppKey）
- [ ] 实现音频上传功能（用于推流）
- [ ] 实现回调处理（用于 ASR 结果）
- [ ] 集成到 `server/index.js`
- [ ] 测试推流功能
- [ ] 测试拉流功能
- [ ] 测试端到端对话

---

**下一步：** 配置 OpenAPI 凭证并测试推流功能！
