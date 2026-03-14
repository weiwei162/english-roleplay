# 🔄 迁移到阿里云百炼平台 - 完成总结

**迁移日期：** 2026-03-14  
**版本：** v2.0.0

---

## ✅ 已完成的工作

### 1. 服务端改造 (`server/index.js`)

- ✅ 替换豆包 API → 阿里云百炼 Qwen API
- ✅ 替换火山 ASR → 阿里云百炼 qwen3-asr-flash-realtime
- ✅ 实现实时 ASR WebSocket 连接管理
- ✅ 支持流式语音识别 + 自动对话触发
- ✅ 更新健康检查端点
- ✅ 更新启动日志显示

**核心改动：**
```javascript
// 旧：豆包 API
callDoubaoAPI(messages) → Doubao Pro 32k

// 新：百炼 Qwen API
callQwenAPI(messages, model) → qwen-plus / qwen-max
```

```javascript
// 旧：火山 ASR（未实现）
recognizeSpeech(audioBase64) → 返回 null

// 新：百炼实时 ASR
class RealtimeASR → WebSocket 连接 + 回调触发
```

---

### 2. 配置文件更新

**`.env`** - 环境变量
```bash
DASHSCOPE_API_KEY=sk-xxx
LLM_MODEL=qwen-plus
ASR_MODEL=qwen3-asr-flash-realtime
ASR_WS_URL=wss://dashscope.aliyuncs.com/api-ws/v1/realtime
```

**`.env.example`** - 配置模板（已更新为百炼说明）

**`package.json`** - 依赖和脚本
```json
{
  "version": "2.0.0",
  "dependencies": {
    "websocket-client": "^1.0.4"  // 新增
  },
  "scripts": {
    "test": "node test-bailian.js"  // 新增测试脚本
  }
}
```

---

### 3. 新增文档

| 文件 | 说明 |
|------|------|
| `BAILIAN-SETUP.md` | 阿里云百炼配置完整指南 |
| `RTC-BAILIAN-INTEGRATION.md` | RTC + 百炼集成方案 |
| `MIGRATION-TO-BAILIAN.md` | 本文档 |
| `server/test-bailian.js` | API 连接测试脚本 |

---

### 4. 更新文档

| 文件 | 更新内容 |
|------|---------|
| `README.md` | 技术特点、使用方法 |
| `CLAUDE.md` | 环境配置、数据流说明 |
| `server/.env.example` | 百炼配置说明 |

---

## 📋 使用步骤

### 1. 获取阿里云百炼 API Key

1. 访问：https://bailian.console.aliyun.com/
2. 开通百炼服务
3. 创建 API Key
4. 复制保存（`sk-xxx` 格式）

详见：`BAILIAN-SETUP.md`

---

### 2. 安装依赖

```bash
cd english-roleplay/server
npm install
```

新增依赖：
- `websocket-client` - 用于 ASR WebSocket 连接

---

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：
```bash
DASHSCOPE_API_KEY=sk-xxx  # 替换为你的 API Key
LLM_MODEL=qwen-plus
```

---

### 4. 测试 API 连接

```bash
npm test
```

期望输出：
```
╔══════════════════════════════════════════════════════╗
║    Alibaba Bailian API Test Suite                    ║
╚══════════════════════════════════════════════════════╝

🤖 Testing Qwen API...
✅ Qwen API Response:
───────────────────────────────────────────────────
Hi! I'm Miss Emma. What's your name?
───────────────────────────────────────────────────

🎤 Testing ASR WebSocket...
✅ ASR WebSocket Connected!
📡 URL: wss://dashscope.aliyuncs.com/api-ws/v1/realtime

═══════════════════════════════════════════════════════
Test Summary:
───────────────────────────────────────────────────────
  Qwen API:     ✅ PASSED
  ASR WebSocket: ✅ PASSED
═══════════════════════════════════════════════════════

🎉 All tests passed! Ready to use Alibaba Bailian.
```

---

### 5. 启动服务

```bash
npm start
```

期望输出：
```
╔══════════════════════════════════════════════════════╗
║   English Friend AI Server - Alibaba Bailian Edition ║
║                                                      ║
║   🔒 Protocol:  HTTP (Insecure)                       ║
║   🌐 Frontend:  http://localhost:3000                 ║
║   🔌 WebSocket: ws://localhost:3000                   ║
║   📡 API:       http://localhost:3000/api             ║
║                                                      ║
║   ☁️ Bailian:  ✅ configured                          ║
║   🤖 LLM:      qwen-plus                              ║
║   🎤 ASR:      qwen3-asr-flash-realtime               ║
║                                                      ║
║   ✨ Features:                                        ║
║   ✓ 前端静态文件服务（无需 Python）                    ║
║   ✓ 阿里云百炼 Qwen 大模型对话                         ║
║   ✓ 阿里云百炼实时 ASR 语音识别                        ║
║   ✓ WebSocket 实时通信                                 ║
║   ✓ 支持 RTC 双向音频（可选火山引擎）                   ║
╚══════════════════════════════════════════════════════╝

🚀 现在只需一个命令启动所有服务！
📱 浏览器访问：http://localhost:3000
🔑 健康检查：http://localhost:3000/health
```

---

### 6. 验证功能

1. 浏览器访问：http://localhost:3000
2. 选择角色（如 Miss Emma）
3. 选择场景（如魔法动物园）
4. 点击"按住说话"说英语
5. 查看控制台日志确认 ASR 识别

---

## 🔍 健康检查

```bash
curl http://localhost:3000/health
```

响应：
```json
{
  "status": "ok",
  "services": {
    "bailian": "configured",
    "llm_model": "qwen-plus",
    "asr_model": "qwen3-asr-flash-realtime",
    "websocket": "enabled"
  },
  "activeSessions": 0,
  "activeAsrConnections": 0,
  "frontend": "served"
}
```

---

## 💰 费用说明

### Qwen 对话模型

| 模型 | 输入 | 输出 | 推荐场景 |
|------|------|------|---------|
| Qwen-Max | ¥0.04/千 tokens | ¥0.12/千 tokens | 高质量对话 |
| Qwen-Plus | ¥0.004/千 tokens | ¥0.012/千 tokens | **推荐** 性价比 |
| Qwen-Turbo | ¥0.002/千 tokens | ¥0.006/千 tokens | 快速响应 |

**估算：** 每天 500 次对话，每次 200 tokens → 月费用约 ¥50

### ASR 语音识别

| 服务 | 价格 |
|------|------|
| qwen3-asr-flash-realtime | ¥0.02/分钟 |

**估算：** 每天 2500 分钟 → 月费用约 ¥1,500

---

## ⚠️ 注意事项

### 1. API Key 安全

- ✅ 不要将 `.env` 提交到 Git
- ✅ 定期轮换密钥
- ✅ 使用环境变量管理

### 2. 音频格式要求

百炼 ASR 要求：
- 格式：PCM（无头）
- 采样率：16000 Hz
- 位深：16-bit
- 声道：单声道

### 3. WebSocket 重连

服务端已实现自动重连机制：
- 每个 sessionId 独立 ASR 连接
- 断开时自动创建新连接
- 前端无感知

---

## 🆚 与火山引擎对比

| 功能 | 火山引擎 | 阿里云百炼 |
|------|---------|-----------|
| 大模型 | 豆包 Pro | Qwen-Max/Plus |
| ASR | 火山语音识别 | qwen3-asr-flash-realtime |
| RTC | ✅ 火山 RTC | ❌ 需配合火山或其他 |
| 价格 | 中等 | 中等 |
| 文档 | 中文 | 中文 |
| 支持 | 工单 + 客服 | 工单 + 客服 |

**建议：**
- 如需 RTC 数字人：保留火山 RTC + 百炼 ASR/Qwen
- 如无需 RTC：纯百炼方案（ASR + Qwen）

---

## 🚀 下一步优化

### 短期（1-2 周）
- [ ] 添加前端实时字幕显示
- [ ] 优化 ASR 断句逻辑
- [ ] 添加对话历史记录
- [ ] 性能监控和日志

### 中期（1 个月）
- [ ] 支持多角色切换
- [ ] 添加学习进度跟踪
- [ ] 优化提示词工程
- [ ] A/B 测试不同模型

### 长期（3 个月）
- [ ] 支持多方言识别
- [ ] 情感化语音合成
- [ ] 离线模式
- [ ] 移动端 App

---

## 📞 支持资源

### 阿里云百炼
- 官方文档：https://help.aliyun.com/zh/model-studio/
- API 参考：https://dashscope.aliyuncs.com/
- 控制台：https://bailian.console.aliyun.com/
- 技术支持：工单系统

### 项目文档
- `BAILIAN-SETUP.md` - 配置指南
- `RTC-BAILIAN-INTEGRATION.md` - 集成方案
- `README.md` - 项目说明

---

## ✅ 迁移检查清单

- [x] 服务端代码改造
- [x] 配置文件更新
- [x] 依赖安装
- [x] 文档编写
- [x] 测试脚本
- [ ] 获取 API Key
- [ ] 运行测试
- [ ] 启动服务
- [ ] 端到端验证
- [ ] 性能监控
- [ ] 生产部署

---

**迁移完成！开始使用阿里云百炼吧！** 🎉
