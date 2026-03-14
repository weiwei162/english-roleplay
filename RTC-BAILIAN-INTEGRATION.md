# 🔄 RTC + 百炼 ASR 集成方案

**更新日期：** 2026-03-14  
**目标：** 在保留火山 RTC 的同时，使用阿里云百炼 ASR 进行语音识别

---

## 📋 架构说明

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   前端浏览器     │────▶│  Node.js 服务端   │────▶│ 阿里云百炼 ASR   │
│  (RTC 音频采集)   │     │  (WebSocket 中转)  │     │  (语音识别)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │                        │
        │                       ▼                        │
        │              ┌──────────────────┐              │
        │              │ 阿里云百炼 Qwen   │◀─────────────┘
        │              │  (对话生成)       │
        │              └──────────────────┘
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│  火山 RTC 房间    │◀────│  Node.js 服务端   │
│  (数字人视频)     │     │  (RTC Token 生成)  │
└─────────────────┘     └──────────────────┘
```

**关键点：**
- **音频流：** 前端 → 服务端 → 阿里云百炼 ASR
- **视频流：** 火山 RTC（可选，如不需要可移除）
- **对话生成：** 阿里云百炼 Qwen

---

## 🔧 方案 A：完整集成（RTC + ASR + Qwen）

### 使用场景
- 需要数字人视频形象
- 需要实时语音识别
- 需要大模型对话

### 配置步骤

1. **安装依赖**
```bash
cd server
npm install websocket-client
```

2. **配置环境变量**
```bash
# .env
DASHSCOPE_API_KEY=sk-xxx
LLM_MODEL=qwen-plus
ASR_MODEL=qwen3-asr-flash-realtime

# 火山 RTC（可选，用于数字人视频）
VOLC_APP_ID=your_app_id
VOLC_APP_KEY=your_app_key
```

3. **启动服务**
```bash
npm start
```

---

## 🔧 方案 B：纯百炼版（ASR + Qwen，无 RTC）

### 使用场景
- 不需要数字人视频
- 只需要语音识别 + 文字对话
- 简化部署

### 修改前端

编辑 `js/rtc-client.js`，移除 RTC 依赖：

```javascript
// 简化版：不使用 RTC，直接播放 TTS
async function joinAvatarRoom(roomId, token, sessionId) {
    console.log('📞 Skipping RTC, using TTS mode');
    
    // 直接返回，不加入 RTC 房间
    if (window.hideLoading) window.hideLoading();
}
```

编辑 `index.html`，移除 RTC SDK 引用：

```html
<!-- 移除或注释掉 -->
<!-- <script src="https://...volcengine.../rtc-sdk.js"></script> -->
```

---

## 🔧 方案 C：纯前端版（Web Speech API + Qwen）

### 使用场景
- 零成本测试
- 不需要高精度 ASR
- 离线可用

### 配置

编辑 `server/.env`：
```bash
DASHSCOPE_API_KEY=sk-xxx
USE_FRONTEND_ASR=true
```

前端使用浏览器原生 Speech Recognition：

```javascript
// js/app.js
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';
recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    sendWebSocketText(text);
};
```

---

## 🧪 测试流程

### 1. 测试 ASR 连接

```bash
cd server
node -e "
const WebSocket = require('websocket-client');
const ws = new WebSocket('wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen3-asr-flash-realtime', {
  headers: {'Authorization': 'Bearer sk-xxx'}
});
ws.on('open', () => console.log('✅ ASR Connected'));
ws.on('message', (d) => console.log('📝', d.toString()));
"
```

### 2. 测试 Qwen 对话

```bash
curl -X POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-xxx" \
  -d '{
    "model": "qwen-plus",
    "messages": [
      {"role": "system", "content": "You are a friendly English teacher."},
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### 3. 测试健康检查

```bash
curl http://localhost:3000/health
```

期望输出：
```json
{
  "status": "ok",
  "services": {
    "bailian": "configured",
    "llm_model": "qwen-plus",
    "asr_model": "qwen3-asr-flash-realtime"
  }
}
```

### 4. 端到端测试

1. 启动服务：`npm start`
2. 浏览器访问：`http://localhost:3000`
3. 选择角色和场景
4. 点击"按住说话"说英语
5. 查看控制台日志确认 ASR 识别和 Qwen 回应

---

## 📊 性能对比

| 方案 | ASR 精度 | 延迟 | 成本 | 复杂度 |
|------|---------|------|------|--------|
| 百炼 ASR + Qwen | ⭐⭐⭐⭐⭐ | ~500ms | 中 | 中 |
| 火山 ASR + 豆包 | ⭐⭐⭐⭐ | ~500ms | 中 | 中 |
| Web Speech API | ⭐⭐⭐ | ~200ms | 免费 | 低 |

---

## ⚠️ 注意事项

### 1. 音频格式

百炼 ASR 要求：
- 格式：PCM（无头）
- 采样率：16000 Hz
- 位深：16-bit
- 声道：单声道

前端录制配置：
```javascript
const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
    }
});
```

### 2. WebSocket 重连

ASR WebSocket 可能断开，需要重连机制：

```javascript
// 服务端已实现自动重连
// 每个 sessionId 对应一个 ASR 连接
// 断开时自动创建新连接
```

### 3. 并发控制

单个 ASR 连接不支持并发音频流：
- 每个 sessionId 独立连接
- 避免同时发送多个音频块
- 建议添加队列机制

---

## 🚀 部署建议

### 开发环境
```bash
# 本地运行
npm install
npm start
```

### 生产环境
```bash
# 使用 PM2
npm install -g pm2
pm2 start index.js --name english-friend
pm2 startup
pm2 save
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm install --production
COPY server/ ./
EXPOSE 3000
CMD ["node", "index.js"]
```

---

## ✅ 检查清单

- [ ] 配置 DASHSCOPE_API_KEY
- [ ] 安装 websocket-client 依赖
- [ ] 测试 ASR WebSocket 连接
- [ ] 测试 Qwen API 调用
- [ ] 验证健康检查端点
- [ ] 端到端测试语音对话
- [ ] （可选）配置火山 RTC
- [ ] （可选）部署到生产环境

---

**集成完成，享受阿里云百炼的高性能服务！** 🎉
