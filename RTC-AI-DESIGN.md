# 🤖 English Friend AI - 数字人实时对话版
## 技术方案设计（火山云 RTC + 豆包 API）

**版本：** 3.0 (AI Digital Human)  
**日期：** 2026-03-12  
**核心：** AI 动画角色 + 实时音视频流

---

## 📋 目录

1. [产品概述](#产品概述)
2. [系统架构](#系统架构)
3. [技术选型](#技术选型)
4. [核心流程](#核心流程)
5. [火山云 API 集成](#火山云 api 集成)
6. [实现方案](#实现方案)
7. [成本估算](#成本估算)

---

## 产品概述

### 核心概念

```
┌─────────────────────────────────────────────────────┐
│  孩子端（Web/APP）                                   │
│                                                      │
│  ┌────────────────────────────────────────────┐     │
│  │  👩‍🏫 Miss Emma（AI 数字人视频）             │     │
│  │                                             │     │
│  │  "Hi Tommy! What did you eat today?"       │     │
│  │  [AI 生成的实时视频流]                      │     │
│  │                                             │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  🎤 [按住说话] 或 [点击选项]                         │
└─────────────────────────────────────────────────────┘
                      ↕
              火山云 RTC 服务
                      ↕
┌─────────────────────────────────────────────────────┐
│  AI 服务端（你的后端）                               │
│                                                      │
│  1. 接收孩子语音 → 语音识别 (ASR)                   │
│  2. 豆包大模型 → 生成对话回应                        │
│  3. TTS + 数字人 → 生成视频流                        │
│  4. 通过 RTC 推送视频到孩子端                        │
└─────────────────────────────────────────────────────┘
```

### 与之前版本对比

| 版本 | 角色形式 | 对话方式 | 优点 | 缺点 |
|------|----------|----------|------|------|
| v1.0 动画版 | 预录动画 | 固定对话 | 简单、便宜 | 不灵活 |
| v2.0 真人版 | 真人老师 | 实时视频 | 真实互动 | 成本高 |
| **v3.0 AI 版** | **AI 数字人** | **实时生成** | **灵活 + 可控 + 成本适中** | **技术复杂** |

---

## 系统架构

### 整体架构

```
┌──────────────────────────────────────────────────────────┐
│                     孩子端（Web）                         │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │  视频播放器  │  │  语音识别   │  │  互动 UI    │      │
│  │  (RTC 播放)  │  │  (Web API)  │  │  (点击选项) │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
└──────────────────────────────────────────────────────────┘
                          ↕ WebSocket / HTTP
┌──────────────────────────────────────────────────────────┐
│                   AI 服务端（你的后端）                    │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  对话管理引擎                                     │   │
│  │  - 会话状态管理                                   │   │
│  │  - 上下文记忆                                     │   │
│  │  - 儿童安全过滤                                   │   │
│  └──────────────────────────────────────────────────┘   │
│           ↕              ↕              ↕               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  语音识别   │  │  豆包大模型  │  │  数字人引擎  │     │
│  │  (ASR)      │  │  (LLM)      │  │  (Avatar)   │     │
│  │  火山引擎   │  │  火山引擎   │  │  火山引擎   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│           ↕              ↕              ↕               │
│  ┌──────────────────────────────────────────────────┐   │
│  │           火山云 RTC 推流服务                     │   │
│  │  - 生成数字人视频流                               │   │
│  │  - 通过 RTC 推送给客户端                          │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 数据流

```
1. 孩子说话
   ↓
2. Web 语音识别 → 文字
   ↓
3. 发送到 AI 服务端
   ↓
4. 豆包大模型生成回应
   ↓
5. TTS 生成语音 + 数字人生成视频
   ↓
6. 通过 RTC 推送视频流
   ↓
7. 孩子端播放
```

---

## 技术选型

### 方案 A：火山引擎数字人 RTC（推荐）

**使用火山引擎的"智能数字人"服务**

| 组件 | 服务 | 说明 |
|------|------|------|
| 数字人 | 火山引擎智创数字人 | 2D/3D 虚拟形象 |
| 语音识别 | 火山引擎语音识别 ASR | 中文/英文识别 |
| 大模型 | 火山引擎豆包 Pro | 对话生成 |
| 语音合成 | 火山引擎语音合成 TTS | 多音色 |
| RTC 推流 | 火山引擎 RTC | 实时视频流 |

**优点：**
- ✅ 全链路火山云，集成简单
- ✅ 低延迟（<500ms）
- ✅ 数字人质量高
- ✅ 技术支持好

**缺点：**
- ⚠️ 成本相对较高

### 方案 B：开源数字人 + 豆包 API

**使用开源数字人引擎 + 豆包 API**

| 组件 | 服务 | 说明 |
|------|------|------|
| 数字人 | SadTalker / D-ID | 开源/第三方 |
| 大模型 | 火山豆包 API | 对话生成 |
| TTS | Edge TTS / Azure | 语音合成 |
| RTC | 火山 RTC / 声网 | 视频推流 |

**优点：**
- ✅ 成本可控
- ✅ 灵活定制

**缺点：**
- ⚠️ 集成复杂
- ⚠️ 延迟较高

---

## 核心流程

### 1. 对话流程

```javascript
// 孩子端
async function handleChildSpeech(text) {
  // 1. 发送文字到 AI 服务端
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: text,
      sessionId: sessionId,
      character: 'emma'
    })
  });

  // 2. 服务端返回 RTC 房间信息
  const { roomId, token } = await response.json();

  // 3. 加入 RTC 房间观看数字人视频
  joinRTCRoom(roomId, token);
}
```

### 2. AI 服务端流程

```javascript
// 服务端（Node.js）
app.post('/api/chat', async (req, res) => {
  const { text, sessionId, character } = req.body;

  // 1. 调用豆包 API 生成回应
  const doubaoResponse = await callDoubaoAPI({
    prompt: text,
    character: character,
    context: getSessionContext(sessionId)
  });

  // 2. 生成数字人视频流
  const videoStream = await generateAvatarVideo({
    text: doubaoResponse.text,
    character: character,
    voice: characterVoices[character]
  });

  // 3. 创建 RTC 房间并推流
  const { roomId, token } = await createRTCRoom();
  await pushVideoToRTC(roomId, videoStream);

  // 4. 返回房间信息
  res.json({ roomId, token, text: doubaoResponse.text });
});
```

### 3. 实时对话优化（流式）

```javascript
// 使用 WebSocket 实现流式对话
const ws = new WebSocket('wss://your-server.com/ws');

ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'audio_chunk') {
    // 播放音频片段
    playAudio(data.audio);
  }
  
  if (data.type === 'video_frame') {
    // 更新视频帧
    updateVideoFrame(data.frame);
  }
  
  if (data.type === 'subtitle') {
    // 显示字幕
    showSubtitle(data.text);
  }
};
```

---

## 火山云 API 集成

### 1. 豆包大模型 API

```javascript
// 调用豆包 Pro API
async function callDoubaoAPI({ prompt, character, context }) {
  const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DOUBAO_API_KEY}`
    },
    body: JSON.stringify({
      model: 'doubao-pro-32k',
      messages: [
        {
          role: 'system',
          content: getCharacterPrompt(character)
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  const data = await response.json();
  return {
    text: data.choices[0].message.content
  };
}

// 角色提示词
function getCharacterPrompt(character) {
  const prompts = {
    emma: `你是一位温柔的英语老师 Miss Emma，
           和 5 岁中国小朋友对话，引导他们说英语。
           句子要短，用词简单，多鼓励。`,
    
    tommy: `你是 Tommy，一个 5 岁的美国小男孩，
           和小朋友交朋友，用简单的英语聊天。
           活泼好动，喜欢玩游戏。`,
    
    lily: `你是 Lily，一个 7 岁的活泼小姐姐，
           带小朋友学英语，热情开朗。
           喜欢唱歌、画画、讲故事。`
  };
  
  return prompts[character];
}
```

### 2. 语音识别 API

```javascript
// 火山引擎语音识别
async function speechToText(audioBlob) {
  const formData = new FormData();
  formData.append('audio', audioBlob);
  formData.append('language', 'en-US');
  
  const response = await fetch('https://openspeech.bytedance.com/api/v1/stt', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VOLC_API_KEY}`
    },
    body: formData
  });
  
  const data = await response.json();
  return data.text;
}
```

### 3. 语音合成 API

```javascript
// 火山引擎语音合成
async function textToSpeech(text, voice) {
  const response = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOLC_API_KEY}`
    },
    body: JSON.stringify({
      text: text,
      voice: voice, // 'zh_female_wanwan' 等
      speed: 0.9,   // 慢一点适合小朋友
      pitch: 1.1
    })
  });
  
  const audioBlob = await response.blob();
  return audioBlob;
}
```

### 4. 数字人视频生成

```javascript
// 火山引擎智创数字人
async function generateAvatarVideo({ text, character, voice }) {
  const response = await fetch('https://api.volcengine.com/api/digital-human', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOLC_API_KEY}`
    },
    body: JSON.stringify({
      template_id: character, // 'emma_2d', 'tommy_2d'
      text: text,
      voice_id: voice,
      output_format: 'rtc_stream' // 输出为 RTC 流
    })
  });
  
  const data = await response.json();
  return {
    streamUrl: data.stream_url,
    roomId: data.room_id
  };
}
```

### 5. RTC 推流

```javascript
// 服务端推流到 RTC
async function pushVideoToRTC(roomId, videoStream) {
  const client = createRTCClient({
    appId: VOLC_APP_ID
  });
  
  await client.join({
    roomId: roomId,
    token: generateToken(roomId),
    uid: 'avatar_bot'
  });
  
  // 发布数字人视频流
  await client.publish({
    videoTrack: videoStream.video,
    audioTrack: videoStream.audio
  });
}
```

---

## 实现方案

### 前端代码（孩子端）

```javascript
// 基于现有代码升级
class AIAvatarApp {
  constructor() {
    this.rtcClient = null;
    this.sessionId = generateSessionId();
    this.currentCharacter = 'emma';
  }

  // 初始化
  async init() {
    // 1. 初始化 RTC 客户端
    this.rtcClient = createClient({
      appId: VOLC_APP_ID,
      mode: 'live'
    });

    // 2. 绑定角色选择
    this.bindCharacterSelect();
    
    // 3. 绑定语音输入
    this.bindVoiceInput();
  }

  // 选择角色
  async selectCharacter(characterId) {
    this.currentCharacter = characterId;
    
    // 切换角色，创建新会话
    this.sessionId = generateSessionId();
    
    // 显示角色动画
    this.showCharacterIntro(characterId);
  }

  // 处理孩子说话
  async handleSpeech(text) {
    // 1. 显示"思考中"动画
    this.showThinking();

    // 2. 发送到 AI 服务端
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        text: text,
        sessionId: this.sessionId,
        character: this.currentCharacter
      })
    });

    const data = await response.json();

    // 3. 加入 RTC 房间观看数字人
    await this.joinRTCRoom(data.roomId, data.token);

    // 4. 显示字幕
    this.showSubtitle(data.text);
  }

  // 加入 RTC 房间
  async joinRTCRoom(roomId, token) {
    await this.rtcClient.join({
      roomId: roomId,
      token: token,
      uid: 'child_' + this.sessionId
    });

    // 订阅数字人视频
    this.rtcClient.on('user-published', async (user, mediaType) => {
      await this.rtcClient.subscribe(user, mediaType);
      
      if (mediaType === 'video') {
        user.videoTrack.play('avatar-video-container');
      }
      
      if (mediaType === 'audio') {
        user.audioTrack.play();
      }
    });
  }
}
```

### 服务端代码（Node.js）

```javascript
// server.js
const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// 会话存储
const sessions = new Map();

// 豆包 API
async function callDoubao(messages) {
  const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DOUBAO_API_KEY}`
    },
    body: JSON.stringify({
      model: 'doubao-pro-32k',
      messages: messages
    })
  });
  return await res.json();
}

// 数字人视频生成
async function generateAvatarVideo(text, character) {
  const res = await fetch('https://api.volcengine.com/api/digital-human', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VOLC_API_KEY}`
    },
    body: JSON.stringify({
      template_id: character,
      text: text,
      output_format: 'rtc_stream'
    })
  });
  return await res.json();
}

// 聊天接口
app.post('/api/chat', async (req, res) => {
  const { text, sessionId, character } = req.body;
  
  // 获取会话上下文
  const session = sessions.get(sessionId) || { messages: [] };
  
  // 构建对话历史
  const messages = [
    { role: 'system', content: getCharacterPrompt(character) },
    ...session.messages,
    { role: 'user', content: text }
  ];
  
  // 调用豆包生成回应
  const doubaoResp = await callDoubao(messages);
  const reply = doubaoResp.choices[0].message.content;
  
  // 更新会话
  session.messages.push({ role: 'user', content: text });
  session.messages.push({ role: 'assistant', content: reply });
  sessions.set(sessionId, session);
  
  // 生成数字人视频
  const videoData = await generateAvatarVideo(reply, character);
  
  // 返回 RTC 房间信息
  res.json({
    text: reply,
    roomId: videoData.room_id,
    token: generateRTCToken(videoData.room_id)
  });
});

// WebSocket 实时对话
wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    const data = JSON.parse(message);
    
    // 流式处理对话
    const stream = await createDoubaoStream(data.text);
    
    for await (const chunk of stream) {
      ws.send(JSON.stringify({
        type: 'text_chunk',
        text: chunk.text
      }));
    }
  });
});

server.listen(3000, () => {
  console.log('AI Avatar Server running on port 3000');
});
```

---

## 成本估算

### 火山云服务价格（参考）

| 服务 | 单价 | 说明 |
|------|------|------|
| 豆包 Pro | ¥0.008/千 tokens | 对话生成 |
| 语音识别 | ¥0.02/分钟 | ASR |
| 语音合成 | ¥0.03/分钟 | TTS |
| 数字人 | ¥0.5/分钟 | 2D 数字人视频 |
| RTC | ¥0.02/分钟 | 视频推流 |

### 示例计算

**每个对话 2 分钟，每天 500 次对话：**

```
豆包：500 × 200 tokens × ¥0.008/1k = ¥0.8/天
ASR: 500 × 2 × ¥0.02 = ¥20/天
TTS: 500 × 2 × ¥0.03 = ¥30/天
数字人：500 × 2 × ¥0.5 = ¥500/天
RTC: 500 × 2 × ¥0.02 = ¥20/天

总计：¥570.8/天 ≈ ¥17,124/月
```

**优化方案（降低数字人成本）：**
- 使用静态 Avatar + 口型同步：¥0.1/分钟 → ¥100/天
- 总计：¥170.8/天 ≈ ¥5,124/月

---

## 实施计划

### 阶段 1：基础对话（2 周）
- [ ] 豆包 API 集成
- [ ] 对话管理
- [ ] 基础 UI

### 阶段 2：语音交互（2 周）
- [ ] 语音识别集成
- [ ] 语音合成集成
- [ ] 实时对话

### 阶段 3：数字人视频（3 周）
- [ ] 火山数字人集成
- [ ] RTC 推流
- [ ] 视频播放优化

### 阶段 4：优化上线（1 周）
- [ ] 延迟优化
- [ ] 成本优化
- [ ] 测试上线

---

## 总结

**核心优势：**
1. 🤖 **AI 驱动** - 灵活对话，不固定
2. 🎭 **数字人** - 可爱动画形象
3. 🎥 **实时视频** - 通过 RTC 推送
4. 💰 **成本可控** - 比真人便宜

**下一步：**
1. 开通火山云相关服务
2. 申请豆包 API 权限
3. 开发 MVP 版本
4. 测试优化

需要我帮你写具体的集成代码吗？🐾
