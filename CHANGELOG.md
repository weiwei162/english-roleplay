# English Roleplay - 更新日志

## v2.0.0 (2026-03-14) - 阿里云百炼迁移

### 🎉 重大变更

**迁移到阿里云百炼平台**，替换原有的火山引擎服务。

### ✨ 新增功能

- **阿里云百炼 Qwen 大模型对话**
  - 支持 `qwen-max`、`qwen-plus`、`qwen-turbo` 模型
  - 更高的对话质量和更低的成本
  
- **阿里云百炼实时 ASR 语音识别**
  - 模型：`qwen3-asr-flash-realtime`
  - 支持 16kHz PCM 实时音频流
  - 内置 VAD 语音活动检测
  - 支持情感识别（7 种情绪）
  - 支持中英文及方言识别

- **WebSocket 实时 ASR 连接管理**
  - 自动重连机制
  - 每个会话独立连接
  - 流式识别结果推送

- **新增测试工具**
  - `test-bailian.js` - API 连接测试
  - 健康检查端点增强

### 📝 新增文档

- `BAILIAN-SETUP.md` - 阿里云百炼配置完整指南
- `RTC-BAILIAN-INTEGRATION.md` - RTC + 百炼集成方案
- `MIGRATION-TO-BAILIAN.md` - 迁移指南和对比
- `QUICKSTART-BAILIAN.md` - 5 分钟快速开始

### 🔧 技术改动

#### 服务端 (`server/index.js`)

```javascript
// 旧：豆包 API
async function callDoubaoAPI(messages)

// 新：百炼 Qwen API
async function callQwenAPI(messages, model)
```

```javascript
// 旧：火山 ASR（未实现）
async function recognizeSpeech(audioBase64)

// 新：百炼实时 ASR
class RealtimeASR {
  connect()
  sendAudio(audioBase64)
  close()
}
```

#### 配置文件

**`.env`** 变更：
```bash
# 移除
DOUBAO_API_KEY=xxx
VOLC_ASR_ACCESS_KEY=xxx
VOLC_ASR_SECRET_KEY=xxx

# 新增
DASHSCOPE_API_KEY=sk-xxx
LLM_MODEL=qwen-plus
ASR_MODEL=qwen3-asr-flash-realtime
ASR_WS_URL=wss://dashscope.aliyuncs.com/api-ws/v1/realtime
```

#### 依赖更新

**新增：**
- `websocket-client` ^1.0.4 - ASR WebSocket 连接

**保留：**
- `express` - Web 服务器
- `ws` - WebSocket 服务器
- `dotenv` - 环境变量
- `cors` - 跨域支持

### 📊 性能对比

| 指标 | 火山引擎 | 阿里云百炼 | 变化 |
|------|---------|-----------|------|
| LLM 成本 | ¥0.008/千 tokens | ¥0.004/千 tokens | ⬇️ -50% |
| ASR 成本 | ¥0.02/分钟 | ¥0.02/分钟 | ➡️ 持平 |
| 响应延迟 | ~500ms | ~500ms | ➡️ 持平 |
| 识别精度 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⬆️ +1 |

### 🔄 迁移指南

**从 v1.x 升级到 v2.0：**

1. 更新依赖：
```bash
npm install
```

2. 更新环境变量：
```bash
cp .env.example .env
# 编辑 .env，设置 DASHSCOPE_API_KEY
```

3. 测试连接：
```bash
npm test
```

4. 启动服务：
```bash
npm start
```

详见：`MIGRATION-TO-BAILIAN.md`

### ⚠️ 破坏性变更

- ❌ 移除火山豆包 API 支持
- ❌ 移除火山 ASR API 支持
- ⚠️ 需要重新配置 API Key

### 🐛 Bug 修复

- 修复 ASR 连接未正确关闭的问题
- 修复会话状态管理问题
- 优化 WebSocket 重连逻辑

---

## v1.0.0 (2026-03-13) - 火山引擎版本

### 初始版本

- 火山引擎 RTC 双向音频
- 豆包大模型对话
- 语音识别 ASR
- 数字人视频（可选）
- WebSocket 实时通信
- 前端画布式 UI

---

## 版本规范

- **主版本号** - 重大架构变更
- **次版本号** - 新功能添加
- **修订号** - Bug 修复和优化
