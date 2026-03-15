# 🤖 RTC 实时对话式 AI - 两种模式使用指南

**版本：** v3.1.0  
**更新日期：** 2026-03-15  
**支持模式：** 端到端 | 自定义

---

## 📋 两种模式对比

| 特性 | 端到端模式 | 自定义模式 |
|------|-----------|-----------|
| **架构** | 火山云端一站式（ASR+LLM+TTS） | ASR（火山）+ LLM（百炼）+ TTS（Edge） |
| **延迟** | ~1.5 秒 ⭐ | ~2.5 秒 |
| **配置复杂度** | 简单 ⭐ | 中等 |
| **对话逻辑** | 火山人设 | 完全自定义 ⭐ |
| **TTS 音色** | 火山音色 | 可自定义 ⭐ |
| **成本** | 火山计费 | 火山 + 百炼 + Edge |
| **推荐场景** | 快速测试、标准对话 | 定制化需求、特殊人设 |

---

## 🚀 快速开始

### 模式 1：端到端（推荐首次使用）

**特点：** 简单、低延迟、无需额外配置

#### Step 1: 配置 .env

```bash
# 火山引擎凭证（必需）
VOLC_APP_ID=你的 app_id
VOLC_ACCESS_KEY=你的 access_key
VOLC_SECRET_KEY=你的 secret_key

# AI 模式配置
AI_MODE=end-to-end

# 服务端配置
PORT=3000
USE_HTTPS=false
```

#### Step 2: 启动服务

```bash
cd server
npm run start:rtc-ai
```

#### Step 3: 测试

```
http://localhost:3000
选择角色 → 选择场景 → 说话 → AI 自动回复
```

---

### 模式 2：自定义（需要百炼 API）

**特点：** 可定制对话逻辑、使用百炼 Qwen、自定义 TTS

#### Step 1: 配置 .env

```bash
# 火山引擎凭证（必需）
VOLC_APP_ID=你的 app_id
VOLC_ACCESS_KEY=你的 access_key
VOLC_SECRET_KEY=你的 secret_key

# AI 模式配置
AI_MODE=custom

# 阿里云百炼配置（自定义模式必需）
DASHSCOPE_API_KEY=sk-你的密钥
LLM_MODEL=qwen-plus

# 公网 URL（用于回调）
PUBLIC_URL=http://localhost:3000
# 生产环境：PUBLIC_URL=https://your-domain.com

# 服务端配置
PORT=3000
USE_HTTPS=false
```

#### Step 2: 启动服务

```bash
cd server
AI_MODE=custom npm run start:rtc-ai
```

#### Step 3: 测试

```
http://localhost:3000
选择角色 → 选择场景 → 说话 → AI 自动回复
```

---

## 🏗️ 架构对比

### 模式 1：端到端

```
孩子浏览器
    │
    ├─ RTC 发布音频
    │
    ▼
火山引擎云端
    ├─ ASR 识别
    ├─ LLM 理解并生成回复
    └─ TTS 合成语音
    │
    ▼
火山引擎 RTC
    │
    ▼
孩子浏览器自动播放
```

**优点：**
- ✅ 低延迟（云端一站式）
- ✅ 配置简单
- ✅ 无需额外服务

**缺点：**
- ⚠️ 对话逻辑由火山人设控制
- ⚠️ 无法使用百炼 Qwen

---

### 模式 2：自定义

```
孩子浏览器
    │
    ├─ RTC 发布音频
    │
    ▼
火山引擎云端 ASR
    │
    ▼
WebSocket 回调 → 服务端
                    │
                    ├─ 百炼 Qwen LLM
                    │
                    └─ Edge TTS
                         │
                         ▼
                    保存音频文件
                         │
                         ▼
服务端推流 → 火山 RTC → 孩子浏览器
```

**优点：**
- ✅ 完全自定义对话逻辑
- ✅ 可以使用百炼 Qwen
- ✅ 可以自定义 TTS 音色

**缺点：**
- ⚠️ 延迟稍高
- ⚠️ 需要配置百炼 API
- ⚠️ 需要公网 URL 用于回调

---

## 🔑 配置项详解

### 核心配置

| 变量 | 必需 | 模式 1 | 模式 2 | 说明 |
|------|------|-------|-------|------|
| `VOLC_APP_ID` | ✅ | ✅ | ✅ | RTC 应用 ID |
| `VOLC_ACCESS_KEY` | ✅ | ✅ | ✅ | OpenAPI 访问密钥 |
| `VOLC_SECRET_KEY` | ✅ | ✅ | ✅ | OpenAPI 密钥 |
| `AI_MODE` | ✅ | ✅ | ✅ | `end-to-end` 或 `custom` |
| `DASHSCOPE_API_KEY` | ⭕ | ❌ | ✅ | 百炼 API Key |
| `LLM_MODEL` | ⭕ | ❌ | ✅ | 大模型选择 |
| `PUBLIC_URL` | ⭕ | ❌ | ✅ | 公网 URL（回调用） |

---

## 📊 性能对比

| 指标 | 端到端模式 | 自定义模式 |
|------|-----------|-----------|
| 延迟 | ~1.5 秒 | ~2.5 秒 |
| ASR 准确率 | > 95% | > 95% |
| LLM 质量 | 火山 LLM | 百炼 Qwen ⭐ |
| TTS 自然度 | 火山 TTS | Edge TTS |
| 并发支持 | > 100 | > 100 |

---

## 🎭 角色人设

两种模式都支持以下角色：

| 角色 | 人设 | 音色 |
|------|------|------|
| emma | 温柔英语老师 Miss Emma | 女声 |
| tommy | 5 岁美国小男孩 | 男声 |
| lily | 7 岁活泼小姐姐 | 女声 |
| mike | 阳光运动教练 | 男声 |
| rose | 慈祥老奶奶 | 老年女声 |

---

## 🔄 切换模式

### 临时切换

```bash
# 端到端模式
AI_MODE=end-to-end npm run start:rtc-ai

# 自定义模式
AI_MODE=custom npm run start:rtc-ai
```

### 永久切换

编辑 `.env` 文件：
```bash
AI_MODE=end-to-end  # 或 custom
```

---

## 🐛 故障排查

### Q1: 端到端模式不工作

```bash
# 检查配置
cat .env | grep AI_MODE
# 应该显示：AI_MODE=end-to-end

# 检查火山凭证
cat .env | grep VOLC
```

### Q2: 自定义模式收不到 ASR 回调

```bash
# 检查 PUBLIC_URL 配置
cat .env | grep PUBLIC_URL

# 开发环境需要使用内网穿透
ngrok http 3000
# 然后更新 PUBLIC_URL=https://xxx.ngrok.io
```

### Q3: 自定义模式 TTS 失败

```bash
# 检查 edge-tts 是否安装
pip install edge-tts

# 测试 TTS
edge-tts --voice "en-US-JennyNeural" --text "Hello" --write-media test.mp3
```

---

## 📚 API 参考

### 端到端模式 API

```javascript
// 开启 AI 对话
await rtcClient.startVoiceChat({
    roomId: 'room_123',
    userId: 'ai_emma',
    persona: '温柔英语老师',
    language: 'en-US'
});
```

### 自定义模式 API

```javascript
// 开启 AI 对话（只启用 ASR）
await rtcClient.startVoiceChatCustom({
    roomId: 'room_123',
    userId: 'ai_emma',
    asrLanguage: 'en-US',
    callbackUrl: 'https://your-domain.com/api/asr-callback'
});

// 推送 TTS 音频
await rtcClient.pushAudioStream({
    roomId: 'room_123',
    userId: 'ai_emma',
    audioUrl: 'https://your-domain.com/uploads/tts_xxx.mp3',
    duration: 30
});
```

---

## ✅ 推荐方案

### 首次使用
**推荐：端到端模式**
- 配置简单
- 快速验证
- 低延迟

### 生产环境
**根据需求选择：**
- 标准对话 → 端到端
- 定制化需求 → 自定义

### 开发测试
**推荐：两种模式都测试**
- 端到端验证基础功能
- 自定义验证定制需求

---

**开始使用吧！** 🚀
