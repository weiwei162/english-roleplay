# 🎮 RTC 实时对话快速指南

**版本：** v2.1.0  
**更新日期：** 2026-03-14

---

## 🚀 5 分钟快速开始

### 前提条件

- ✅ Node.js 16+
- ✅ Python 3.7+（用于 Edge TTS）
- ✅ FFmpeg
- ✅ 阿里云百炼 API Key
- ✅ 火山引擎 RTC 凭证

---

### Step 1: 安装依赖

```bash
cd english-roleplay/server

# Node.js 依赖
npm install

# Python TTS 工具
pip install edge-tts

# FFmpeg（音频转换）
# Ubuntu/Debian:
sudo apt install ffmpeg

# macOS:
brew install ffmpeg

# Windows:
# 下载：https://ffmpeg.org/download.html
# 添加到 PATH
```

---

### Step 2: 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```bash
# ==================== 阿里云百炼配置 ====================
DASHSCOPE_API_KEY=sk-你的真实 key

# ==================== 模型选择 ====================
LLM_MODEL=qwen-plus
ASR_MODEL=qwen3-asr-flash-realtime

# ==================== 火山云 RTC 配置 ====================
VOLC_APP_ID=你的 app_id
VOLC_APP_KEY=你的 app_key

# ==================== 服务端配置 ====================
PORT=3000
USE_HTTPS=false
```

---

### Step 3: 测试功能

```bash
# 测试 RTC Bot 和 TTS
npm test

# 测试阿里云百炼 API
npm run test:bailian
```

**预期输出：**

```
✅ TTS service is working!
✅ Bot successfully joined room!
✅ Audio published to room!
🎉 All tests passed!
```

---

### Step 4: 启动服务

```bash
npm start
```

**预期输出：**

```
╔══════════════════════════════════════════════════════╗
║  English Friend - Real-time RTC + Bailian AI Server ║
║                                                      ║
║   🔒 Protocol:  HTTP (Insecure)                       ║
║   🌐 Frontend:  http://localhost:3000                 ║
║   🔌 WebSocket: ws://localhost:3000                   ║
║   📡 API:       http://localhost:3000/api             ║
║                                                      ║
║   ☁️ Bailian:  ✅ configured                          ║
║   🤖 LLM:      qwen-plus                              ║
║   🎤 ASR:      qwen3-asr-flash-realtime               ║
║   🎮 RTC:      ✅ configured                          ║
║                                                      ║
║   ✨ Features:                                        ║
║   ✓ 前端静态文件服务                                   ║
║   ✓ RTC 双向实时音频（孩子 ↔️ 角色）                    ║
║   ✓ 阿里云百炼实时 ASR 语音识别                        ║
║   ✓ 阿里云百炼 Qwen 大模型对话                         ║
║   ✓ Edge TTS 语音合成                                  ║
╚══════════════════════════════════════════════════════╝

🚀 全双工实时对话服务已启动！
```

---

### Step 5: 浏览器访问

1. 打开浏览器：**http://localhost:3000**
2. 选择一个角色（如 Miss Emma 👩‍🏫）
3. 选择一个场景（如魔法动物园 🦁）
4. 点击"按住说话" 🎤
5. 说英语："Hello! What's this?"
6. 等待 AI 回应（约 2-3 秒）

---

## 📊 对话流程

```
1. 孩子按住说话
   └─▶ 浏览器采集音频
       └─▶ RTC 发布到房间

2. 服务端 Bot 接收
   └─▶ VAD 检测（音量 + 静音超时）
       └─▶ 检测到说话结束

3. ASR 识别
   └─▶ 阿里云百炼 qwen3-asr-flash-realtime
       └─▶ 文字："Hello Miss Emma!"

4. 大模型回复
   └─▶ Qwen-Plus（Emma 角色）
       └─▶ 文字："Hi! Great to see you!"

5. TTS 合成
   └─▶ Edge TTS（Emma 声音）
       └─▶ PCM 音频数据

6. Bot 发布
   └─▶ RTC 推送到房间
       └─▶ 孩子听到角色说话！
```

---

## ⚙️ 配置说明

### VAD 参数调整

在 `server/index.js` 中：

```javascript
const VAD_CONFIG = {
    minAudioLength: 10,      // 最少音频包（约 600ms）
    maxAudioLength: 50,      // 最多音频包（约 3 秒）
    silenceTimeout: 1500,    // 静音超时（1.5 秒）
    volumeThreshold: 50      // 音量阈值（0-255）
};
```

**调整建议：**
- 如果经常误触发 → 提高 `volumeThreshold`
- 如果识别太慢 → 降低 `silenceTimeout`
- 如果截断句子 → 增加 `silenceTimeout`

---

### 角色声音映射

在 `server/tts-client.js` 中：

```javascript
const VOICE_MAP = {
    emma: { name: 'en-US-JennyNeural', rate: '+0%', pitch: '+10Hz' },
    tommy: { name: 'en-US-GuyNeural', rate: '+10%', pitch: '+20Hz' },
    lily: { name: 'en-US-AriaNeural', rate: '+5%', pitch: '+15Hz' },
    mike: { name: 'en-US-DavisNeural', rate: '+0%', pitch: '-10Hz' },
    rose: { name: 'en-US-JaneNeural', rate: '-10%', pitch: '-20Hz' }
};
```

---

## 🧪 测试命令

```bash
# 测试 RTC Bot 和 TTS
npm test

# 测试阿里云百炼 API
npm run test:bailian

# 开发模式（自动重启）
npm run dev

# 查看健康状态
curl http://localhost:3000/health
```

---

## ⚠️ 常见问题

### Q1: TTS 测试失败

```bash
# 检查 edge-tts 是否安装
pip install edge-tts

# 检查 ffmpeg 是否可用
ffmpeg -version

# 测试 edge-tts
edge-tts --voice "en-US-JennyNeural" --text "Hello" --write-media test.mp3
```

### Q2: RTC Bot 加入失败

```bash
# 检查 .env 配置
cat .env | grep VOLC

# 确保 VOLC_APP_ID 和 VOLC_APP_KEY 正确
# 不要包含 "your_" 占位符
```

### Q3: ASR 识别失败

```bash
# 检查 .env 配置
cat .env | grep DASHSCOPE

# 确保 DASHSCOPE_API_KEY 正确
# 测试 API 连接
npm run test:bailian
```

### Q4: 延迟太高

**优化建议：**

1. 降低 VAD `silenceTimeout`：
   ```javascript
   silenceTimeout: 1000  // 从 1500ms 降到 1000ms
   ```

2. 使用流式 ASR（WebSocket）：
   - 参考 `REALTIME-RTC-PLAN.md`

3. 优化 TTS：
   - 使用阿里云 CosyVoice（更快）
   - 或火山 TTS

### Q5: 浏览器无法访问

```bash
# 检查端口占用
lsof -i :3000

# 检查防火墙
sudo ufw status

# 查看服务日志
tail -f server/logs/*.log
```

---

## 📈 性能监控

### 健康检查

```bash
curl http://localhost:3000/health
```

**响应：**

```json
{
  "status": "ok",
  "services": {
    "bailian": "configured",
    "llm_model": "qwen-plus",
    "asr_model": "qwen3-asr-flash-realtime",
    "rtc": "configured",
    "websocket": "enabled"
  },
  "activeSessions": 0,
  "activeRtcRooms": 0,
  "activeAsrConnections": 0,
  "frontend": "served"
}
```

### 日志查看

```bash
# 服务端日志在控制台直接显示
# 按 Ctrl+C 停止服务

# 或使用 PM2 管理
pm2 start index.js --name english-friend
pm2 logs english-friend
```

---

## 🔜 下一步优化

### 短期

1. **流式 ASR** - 边说边识别
2. **对话打断** - 孩子说话时停止 TTS
3. **错误重试** - ASR/TTS 失败自动重试

### 中期

4. **多房间支持** - 多个孩子同时对话
5. **会话持久化** - 记住对话历史
6. **性能优化** - 降低延迟到 <2 秒

### 长期

7. **情感识别** - 识别孩子情绪
8. **个性化教学** - 根据水平调整难度
9. **数据分析** - 学习进度跟踪

---

## 📚 相关文档

- `RTC-IMPLEMENTATION-DONE.md` - 完整实施文档
- `REALTIME-RTC-PLAN.md` - 架构设计
- `BAILIAN-SETUP.md` - 阿里云配置
- `QUICKSTART-BAILIAN.md` - 百炼快速开始

---

## 🎉 成功标志

✅ 孩子说话后 2-3 秒内听到角色回复  
✅ 角色语音清晰可懂  
✅ 支持连续对话  
✅ 无明显延迟或卡顿  

---

**祝你使用愉快！** 🐾✨

有任何问题，查看日志或提交 Issue。
