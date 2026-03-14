# 🎮 RTC OpenAPI 服务端推流方案 - 使用指南

**版本：** v2.2.0  
**更新日期：** 2026-03-14  
**架构：** 火山 RTC OpenAPI + 阿里云百炼 AI

---

## 📋 架构说明

### 核心特点

- ✅ **服务端不直接连接 RTC 房间**
- ✅ **通过 OpenAPI 控制虚拟用户推流**
- ✅ **孩子通过 RTC 收听角色语音**
- ✅ **WebSocket 传输控制信令**

### 完整流程

```
1. 孩子浏览器 → RTC 加入房间 → 发布音频流
                                      ↓
2. 服务端 ← 火山 OpenAPI 创建虚拟用户 ← 火山引擎
   │                                    │
   ├─ 虚拟用户订阅孩子音频               │
   ├─ 云端 ASR 识别                      │
   └─ 回调通知服务端                     │
                                      ↓
3. 服务端 → 百炼 Qwen 生成回复 → Edge TTS 合成
                                      ↓
4. 服务端 → OpenAPI 推流 → 虚拟用户发布 TTS 音频
                                      ↓
5. 孩子浏览器 ← RTC 订阅 ← 听到角色说话
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd english-roleplay/server
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```bash
# ==================== 火山云 RTC 配置 ====================
VOLC_APP_ID=你的 app_id
VOLC_APP_KEY=你的 app_key

# ==================== 阿里云百炼配置 ====================
DASHSCOPE_API_KEY=sk-你的 key

# ==================== 模型选择 ====================
LLM_MODEL=qwen-plus

# ==================== 服务端配置 ====================
PORT=3000
USE_HTTPS=false
PUBLIC_URL=http://localhost:3000
```

### 3. 测试配置

```bash
# 测试百炼 API
npm run test:bailian

# 测试 RTC OpenAPI 客户端
npm run test:rtc

# 完整端到端测试
npm test
```

### 4. 启动服务

```bash
# 方式 1：标准版（WebSocket 音频）
npm start

# 方式 2：RTC OpenAPI 版（推荐）
npm run start:rtc

# 开发模式（自动重启）
npm run dev:rtc
```

### 5. 浏览器访问

```
http://localhost:3000
```

---

## 📁 文件说明

### 服务端文件

| 文件 | 说明 |
|------|------|
| `index-rtc-openapi.js` | ⭐ 新版：RTC OpenAPI 服务端 |
| `index.js` | 旧版：WebSocket 音频传输 |
| `volc-rtc-client.js` | 火山 RTC OpenAPI 客户端 |
| `tts-client.js` | Edge TTS 语音合成 |
| `uploads/` | 临时存储推流音频文件 |

### 配置文件

| 文件 | 说明 |
|------|------|
| `.env` | 环境变量配置 |
| `.env.example` | 配置模板 |
| `package.json` | 依赖和脚本 |

---

## 🔑 核心 API

### 1. 创建房间

```javascript
POST /api/create-room
{
  "roomId": "room_123",
  "character": "emma"
}

Response:
{
  "roomId": "room_123",
  "token": "eyJhcHBfaWQiOiIxMjM0NTY3ODkwIi...",
  "appId": "1234567890"
}
```

### 2. ASR 回调

```javascript
POST /api/asr-callback
{
  "RoomId": "room_123",
  "UserId": "child_user",
  "Text": "Hello Miss Emma",
  "Status": "success"
}
```

### 3. 服务端推流

```javascript
// 内部调用
await rtcClient.startPushStream(roomId, audioUrl, 'server_bot');
```

---

## 🏗️ 架构对比

### 方案 A：WebSocket 音频传输（旧版）

```
孩子浏览器 ──WebSocket──▶ 服务端
                            │
                            ├─ ASR
                            ├─ Qwen
                            └─ TTS
                            │
孩子浏览器 ◀──WebSocket──┘
```

**优点：**
- ✅ 简单直接
- ✅ 无需额外配置

**缺点：**
- ⚠️ WebSocket 延迟较高
- ⚠️ 不是真正的 RTC 实时性

### 方案 B：RTC OpenAPI（新版）⭐

```
孩子浏览器 ──RTC 音频──▶ 火山引擎
                           │
                           ├─ 虚拟用户订阅
                           └─ 云端 ASR
                                 │
                                 ▼
服务端 ←──HTTP 回调── 识别结果
  │
  ├─ Qwen
  └─ TTS
       │
       ▼
服务端 ──OpenAPI 推流──▶ 火山引擎
                           │
                           └─ 虚拟用户发布
                                 │
孩子浏览器 ◀──RTC 音频───────────┘
```

**优点：**
- ✅ 真正的 RTC 低延迟
- ✅ 官方支持
- ✅ 可扩展性强

**缺点：**
- ⚠️ 需要配置 OpenAPI
- ⚠️ 需要公网 URL 用于推流

---

## ⚠️ 注意事项

### 1. 推流音频 URL

`startPushStream` 需要**可公开访问的音频 URL**：

**方案 1：本地 HTTP 服务器（开发环境）**
```bash
# 音频保存在 server/uploads/
# 通过 http://localhost:3000/uploads/tts_xxx.mp3 访问
```

**方案 2：对象存储（生产环境）**
```bash
# 上传到火山 TOS、阿里云 OSS、AWS S3 等
# 返回 CDN URL
```

### 2. ASR 回调 URL

需要**公网可访问的回调地址**：

```bash
# 开发环境：使用内网穿透工具
ngrok http 3000

# 生产环境：使用公网 IP 或域名
PUBLIC_URL=https://your-domain.com
```

### 3. 资源配置

**虚拟用户管理：**
- 每次推流创建虚拟用户
- 推流结束自动释放
- 避免频繁推流占用资源

**费用说明：**
| 服务 | 价格 |
|------|------|
| RTC 通话 | ¥0.02/分钟 |
| 云端 ASR | ¥0.03/分钟 |
| 服务端推流 | ¥0.05/分钟 |

---

## 🧪 测试流程

### 1. 测试 RTC 客户端

```bash
cd server
node -e "const {testRTCClient} = require('./volc-rtc-client'); testRTCClient()"
```

**预期输出：**
```
✅ Token generated: eyJhcHBfaWQiOiIxMjM0NTY3ODkwIi...
✅ RTC Client initialized successfully
```

### 2. 测试推流功能

```bash
# 需要先配置 VOLC_APP_ID 和 VOLC_APP_KEY
npm run test:rtc
```

### 3. 端到端测试

```bash
# 启动服务
npm run start:rtc

# 浏览器访问
http://localhost:3000

# 选择角色和场景
# 点击"按住说话"测试对话
```

---

## 🔧 故障排查

### Q1: Token 生成失败

```bash
# 检查 .env 配置
cat .env | grep VOLC

# 确保 VOLC_APP_ID 和 VOLC_APP_KEY 正确
# 不要包含 "your_" 占位符
```

### Q2: 推流失败

```bash
# 检查音频文件是否可访问
curl http://localhost:3000/uploads/tts_xxx.mp3

# 检查 PUBLIC_URL 配置
cat .env | grep PUBLIC_URL
```

### Q3: ASR 回调收不到

```bash
# 检查回调 URL 是否公网可访问
# 开发环境使用 ngrok 等内网穿透工具
ngrok http 3000

# 更新 .env 中的 PUBLIC_URL
PUBLIC_URL=https://xxx.ngrok.io
```

### Q4: 前端无法加入房间

```bash
# 检查 Token 是否正确生成
# 检查 RTC SDK 是否加载成功
# 查看浏览器控制台错误信息
```

---

## 📚 参考文档

### 火山引擎 RTC

- [RTC 服务端 API 概览](https://www.volcengine.com/docs/6348/104482)
- [StartPushStream API](https://www.volcengine.com/docs/6348/104483)
- [StartRecording API](https://www.volcengine.com/docs/6348/104484)
- [StartASR API](https://www.volcengine.com/docs/6348/104485)
- [Token 生成](https://www.volcengine.com/docs/6348/69865)

### 阿里云百炼

- [Qwen API 文档](https://help.aliyun.com/zh/model-studio/)
- [ASR 实时识别](https://help.aliyun.com/zh/model-studio/qwen-asr-realtime)

---

## ✅ 检查清单

### 开发环境

- [ ] 配置 VOLC_APP_ID 和 VOLC_APP_KEY
- [ ] 配置 DASHSCOPE_API_KEY
- [ ] 安装 edge-tts：`pip install edge-tts`
- [ ] 测试 RTC 客户端
- [ ] 启动服务并访问浏览器

### 生产环境

- [ ] 配置对象存储（TOS/OSS/S3）
- [ ] 配置公网域名和 HTTPS
- [ ] 配置 ASR 回调 URL
- [ ] 设置监控和日志
- [ ] 压力测试和优化

---

**开始使用 RTC OpenAPI 方案，享受低延迟实时对话！** 🚀
