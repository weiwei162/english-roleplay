# 🌋 火山引擎 StartVoiceChat 集成指南

**更新日期：** 2026-03-15  
**API 文档：** https://www.volcengine.com/docs/6348/1558163

---

## 📋 概述

StartVoiceChat 是火山引擎实时对话式 AI 的核心接口，支持两种配置模式：

| 模式 | 说明 | 优点 | 缺点 |
|------|------|------|------|
| **端到端 (S2S)** | 使用豆包端到端语音大模型 | 配置简单、延迟最低、对话流畅 | 只能用豆包模型 |
| **分组件** | ASR + LLM + TTS 分别配置 | 灵活，可自选各组件最佳模型 | 配置复杂，延迟较高 |

---

## 🚀 快速开始（端到端模式 - 推荐）

### 步骤 1：开通服务

1. **实时对话式 AI**
   - 地址：https://console.volcengine.com/rtc/aigc/listRTC
   - 创建应用，获取 `AppId` 和 `AppKey`

2. **豆包端到端实时语音大模型**
   - 地址：https://console.volcengine.com/speech/service/10017
   - 开通服务，获取 `AppId` 和 `Token`

3. **AccessKey / SecretKey**
   - 地址：https://console.volcengine.com/iam/keymanage/
   - 创建访问密钥

### 步骤 2：配置环境变量

```bash
cd english-roleplay/server
cp .env.example .env
```

编辑 `.env`：

```env
# AI 模式
AI_MODE=s2s

# RTC 基础配置
VOLC_APP_ID=你的 RTC AppId
VOLC_APP_KEY=你的 RTC AppKey
VOLC_ACCESS_KEY=你的 AccessKey
VOLC_SECRET_KEY=你的 SecretKey

# S2S 端到端配置
VOLC_S2S_APP_ID=你的 S2S AppId
VOLC_S2S_TOKEN=你的 S2S Token
VOLC_S2S_MODEL_VERSION=O
VOLC_S2S_OUTPUT_MODE=0
VOLC_S2S_SPEAKER=zh_female_vv_jupiter_bigtts
```

### 步骤 3：启动服务

```bash
node index-start-voicechat.js
```

### 步骤 4：测试

```bash
curl http://localhost:3000/health
```

---

## 🔧 分组件模式配置

### 需要的服务

1. **实时对话式 AI**（RTC 控制台）
2. **豆包语音 - 流式语音识别大模型**
3. **火山方舟 - 大模型推理**
4. **豆包语音 - 语音合成大模型**

### 环境变量配置

```env
# AI 模式
AI_MODE=component

# RTC 基础配置
VOLC_APP_ID=你的 RTC AppId
VOLC_APP_KEY=你的 RTC AppKey
VOLC_ACCESS_KEY=你的 AccessKey
VOLC_SECRET_KEY=你的 SecretKey

# ASR 配置
VOLC_ASR_APP_ID=你的 ASR AppId
VOLC_ASR_TOKEN=你的 ASR Token
VOLC_ASR_RESOURCE_ID=volc.bigasr.sauc.duration

# LLM 配置
VOLC_LLM_ENDPOINT_ID=你的方舟推理接入点 ID

# TTS 配置
VOLC_TTS_APP_ID=你的 TTS AppId
VOLC_TTS_TOKEN=你的 TTS Token
VOLC_TTS_RESOURCE_ID=volc.service_type.10029
```

---

## 🎭 角色配置

系统预置 5 种角色：

| 角色 | 说明 | 音色 |
|------|------|------|
| emma | Miss Emma，温柔的英语老师 | zh_female_vv_jupiter_bigtts |
| tommy | Tommy，5 岁美国小男孩 | zh_male_xiaotian_jupiter_bigtts |
| lily | Lily，7 岁活泼小姐姐 | zh_female_vv_jupiter_bigtts |
| mike | Coach Mike，阳光运动教练 | zh_male_yunzhou_jupiter_bigtts |
| rose | Grandma Rose，慈祥老奶奶 | zh_female_vv_jupiter_bigtts |

### 自定义角色

编辑 `server/volc-start-voicechat.js` 中的 `CHARACTER_CONFIGS`：

```javascript
const CHARACTER_CONFIGS = {
    your_character: {
        name: 'Your Character Name',
        systemPrompt: 'Your character description and behavior...',
        systemRole: 'Short role description',
        speakingStyle: 'Speaking style',
        ttsVoiceType: 'voice_type_for_component_mode',
        s2sSpeaker: 'speaker_for_s2s_mode'
    }
};
```

---

## 📡 API 使用

### 创建房间

```bash
curl -X POST http://localhost:3000/api/create-room \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room123",
    "character": "emma"
  }'
```

**响应：**

```json
{
  "roomId": "room123",
  "token": "eyJhcHBfaWQiOiJ4eHgiLCJyb29tX2lkIjoicm9vbTEyMyIsInVpZCI6ImNoaWxkIiwiZXhwaXJlIjoxNzEwNTc2MDAwLCJzaWduYXR1cmUiOiJ4eHgifQ==",
  "appId": "your_app_id",
  "character": "emma",
  "characterName": "Miss Emma",
  "taskId": "task_room123_1710576000000",
  "aiMode": "s2s",
  "success": true
}
```

### 离开房间

```bash
curl -X POST http://localhost:3000/api/leave-room \
  -H "Content-Type: application/json" \
  -d '{"roomId": "room123"}'
```

### 获取角色列表

```bash
curl http://localhost:3000/api/characters
```

---

## 🔑 关键参数说明

### TaskId 规则

- 在同一个 `AppId + RoomId` 组合下必须唯一
- 不同房间可以重用相同 TaskId
- 建议格式：`task_{roomId}_{timestamp}`

### 成本管理

- 用户退出后 180 秒任务自动停止但仍计费
- 建议用户退出时主动调用 `leave-room` 接口
- 可通过 `IdleTimeout` 参数自定义等待时长

### VAD 配置（语音活动检测）

```javascript
VADConfig: {
    SilenceTime: 600,      // 判停静音时长 (ms)
    AIVAD: true            // 智能语义判停
}
```

### 输出模式（S2S）

- `0`：纯端到端模式，延迟最低，适合闲聊
- `1`：混合编排模式，端到端 +LLM，支持 Function Calling

---

## 💰 费用参考

### 端到端模式

| 项目 | 免费额度 | 按量计费 |
|------|----------|----------|
| RTC | 10,000 分钟/月 | ¥0.02/分钟 |
| S2S 模型 | 新用户赠送 | ¥0.008/千 tokens |

### 分组件模式

| 项目 | 免费额度 | 按量计费 |
|------|----------|----------|
| RTC | 10,000 分钟/月 | ¥0.02/分钟 |
| ASR | 5,000 分钟/月 | ¥0.03/分钟 |
| LLM | 1,000,000 tokens | ¥0.008/千 tokens |
| TTS | 新用户赠送 | ¥0.006/千字符 |

---

## 🛠️ 代码结构

```
server/
├── volc-start-voicechat.js    # StartVoiceChat 客户端（核心）
├── index-start-voicechat.js   # 服务端入口
├── .env.example               # 配置模板
└── volc-rtc-client-v2.js      # 旧版 RTC 客户端（保留）
```

### volc-start-voicechat.js

```javascript
const {
    VolcStartVoiceChatClient,
    getComponentConfig,
    getS2SConfig,
    CHARACTER_CONFIGS
} = require('./volc-start-voicechat');

// 初始化客户端
const client = new VolcStartVoiceChatClient({
    accessKey: 'xxx',
    secretKey: 'xxx'
});

// 端到端模式
await client.startVoiceChatS2S({
    appId: 'xxx',
    roomId: 'room1',
    taskId: 'task1',
    targetUserId: 'user1',
    s2sConfig: getS2SConfig({...})
});

// 分组件模式
await client.startVoiceChatComponent({
    appId: 'xxx',
    roomId: 'room1',
    taskId: 'task1',
    targetUserId: 'user1',
    asrConfig: {...},
    llmConfig: {...},
    ttsConfig: {...}
});

// 结束对话
await client.stopVoiceChat({
    appId: 'xxx',
    roomId: 'room1',
    taskId: 'task1'
});
```

---

## ⚠️ 注意事项

1. **AppId 类型**
   - 使用"实时对话式 AI"应用的 AppId
   - ❌ 不要使用"AI 音视频互动"应用的 AppId

2. **请求频率**
   - 单账号 QPS 不得超过 60

3. **请求地址**
   - 仅支持 `rtc.volcengineapi.com`

4. **UserId 唯一性**
   - 同一 AppId 下建议全局唯一
   - `UserId` 与 `TargetUserId` 不能重复

5. **回调 URL**
   - 必须公网可访问
   - 支持无 Content-Type 的 POST 请求

---

## 🆘 常见问题

### Q1: 签名失败 401

```
解决：
- 检查 AccessKey/SecretKey 是否正确
- 确认时间同步（服务器时间需准确）
- 检查密钥是否过期
```

### Q2: TaskId 冲突

```
解决：
- 确保 TaskId 在 AppId+RoomId 下唯一
- 使用 timestamp 或 UUID 生成 TaskId
```

### Q3: AI 未入房

```
解决：
- StartVoiceChat 返回 200 仅代表任务下发成功
- 前往控制台开启 VoiceChat 事件回调
- 监听 AI 状态：聆听中、思考中、说话中
```

### Q4: 费用超支

```
解决：
- 设置用量告警
- 用户退出时及时调用 stopVoiceChat
- 调整 IdleTimeout 时长
```

---

## 📞 火山引擎支持

- **官方文档：** https://www.volcengine.com/docs/6348/1558163
- **技术支持：** 控制台 → 工单系统
- **客服电话：** 400-088-2999

---

## ✅ 配置检查清单

- [ ] 注册火山引擎账号并完成实名认证
- [ ] 开通实时对话式 AI 服务
- [ ] 创建 RTC 应用，获取 AppId 和 AppKey
- [ ] 创建 AccessKey 和 SecretKey
- [ ] 开通豆包端到端语音大模型（或分组件所需服务）
- [ ] 复制 `.env.example` 为 `.env`
- [ ] 填写所有必需的环境变量
- [ ] 运行 `node index-start-voicechat.js`
- [ ] 访问 `http://localhost:3000/health` 验证
- [ ] 测试创建房间和对话功能

---

**准备好开始实时对话了吗？** 🐾

**快速命令：**

```bash
cd english-roleplay/server
cp .env.example .env
# 编辑 .env 填入凭证
node index-start-voicechat.js
```
