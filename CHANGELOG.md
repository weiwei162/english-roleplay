# English Roleplay - 更新日志

## v3.1.0 (2026-03-16) - 正确流程版 ⭐

### 🎉 重大变更

**前端完全控制房间** - 修正为正确的 StartVoiceChat 集成流程

### ✨ 新增功能

- **前端创建房间** - 前端拥有房间完全控制权
- **配置 API** - `/api/config` 获取 AppId
- **Token API** - `/api/token` 获取 RTC Token
- **官方 Token 生成** - 使用 `AccessToken.js` 官方实现

### 🔧 技术改动

#### 服务端
- ✅ `index-join-ai.js` - AI 加入房间模式（主入口）
- ✅ `volc-start-voicechat.js` - StartVoiceChat API 客户端
- ✅ `token-generator.js` - Token 生成（基于官方 AccessToken.js）
- ✅ `AccessToken.js` - 火山引擎官方 Token 库
- ✅ `test-integration.js` - 集成测试

#### 前端
- ✅ `js/startvoicechat-client.js` - StartVoiceChat 客户端（正确流程）
- ✅ `js/app.js` - 应用主逻辑（已更新）

#### 配置
- ✅ `.env` - 更新为 StartVoiceChat 配置

### 📝 新增文档

- `START.md` - ⭐ 5 分钟快速启动指南
- `PROJECT-SUMMARY-2026-03-16.md` - 项目完整总结
- `API-CONFIG.md` - 前端配置 API 说明

### 🧹 清理工作

**移除过时服务端文件：**
- ❌ `index.js` - 旧版主入口
- ❌ `index-rtc-ai.js` - RTC AI 模式
- ❌ `index-rtc-ai-v2.js` - RTC AI v2
- ❌ `index-rtc-openapi.js` - RTC OpenAPI
- ❌ `index-start-voicechat.js` - 旧 StartVoiceChat 流程
- ❌ `rtc-bot.js` - RTC Bot（不再需要）
- ❌ `volc-rtc-client.js` - 旧 RTC 客户端
- ❌ `volc-rtc-client-v2.js` - 旧 RTC 客户端 v2
- ❌ `tts-client.js` - TTS 客户端（不再需要）
- ❌ `test-api.js`, `test-bailian.js`, `test-rtc-bot.js`, `test-server-rtc.js`, `test-e2e.js` - 旧测试

**移除过时前端文件：**
- ❌ `js/websocket-client.js` - WebSocket 客户端（不再需要）
- ❌ `js/rtc-client.js` - 旧 RTC 客户端

**移除过时文档：**
- ❌ `ANIMATION-UPGRADE.md`
- ❌ `BAILIAN-SETUP.md`
- ❌ `CHANGELOG-v2.md`
- ❌ `CLAUDE.md`
- ❌ `DESIGN.md`
- ❌ `DONE.md`
- ❌ `FULLSTACK-UPGRADE.md`
- ❌ `HTTPS-DONE.md`, `HTTPS-SETUP.md`
- ❌ `IMPLEMENTATION-SUMMARY.md`
- ❌ `MIGRATION-TO-BAILIAN.md`
- ❌ `QUICK-SETUP.md`
- ❌ `QUICKSTART-BAILIAN.md`
- ❌ `README-RTC-OPENAPI.md`, `README-RTC-REALTIME.md`, `README-SETUP.md`
- ❌ `REALTIME-RTC-PLAN.md`
- ❌ `RTC-AI-DESIGN.md`, `RTC-BAILIAN-INTEGRATION.md`, `RTC-DESIGN.md`
- ❌ `RTC-IMPLEMENTATION-DONE.md`, `RTC-INTEGRATION-FULLDUPLEX.md`, `RTC-INTEGRATION.md`
- ❌ `RTC-QUICKSTART.md`, `RTC-REALTIME-AI-PLAN.md`, `RTC-SDK-UPDATE.md`, `RTC-SERVER-OPENAPI.md`
- ❌ `START.md` (旧版)
- ❌ `TEST-REPORT.md`
- ❌ `VOLCENGINE-SETUP.md`
- ❌ `AI-MODES-GUIDE.md`

### 📦 package.json 更新

```json
{
  "version": "3.1.0",
  "main": "index-join-ai.js",
  "scripts": {
    "start": "node index-join-ai.js",
    "dev": "nodemon index-join-ai.js",
    "test": "node test-integration.js"
  }
}
```

### ⚠️ 破坏性变更

- ❌ 移除旧版启动方式 `npm run start:rtc-ai`
- ❌ 移除阿里云百炼相关代码
- ⚠️ 需要重新配置 `.env`（使用火山引擎凭证）

### ✅ 优势

| 改进点 | 之前 | 现在 |
|--------|------|------|
| 房间控制 | 后端创建 | 前端创建 ✅ |
| Token 生成 | 硬编码 | API 获取 ✅ |
| 架构复杂度 | 多服务 | 一站式 ✅ |
| 延迟 | ~3.4 秒 | ~1.5 秒 ✅ |
| 依赖 | Python + FFmpeg | 纯 Node.js ✅ |
| 文档 | 分散 | 集中整理 ✅ |

---

## v3.0.0 (2026-03-15) - StartVoiceChat 版

### 🎉 重大变更

**迁移到火山引擎 StartVoiceChat** - 一站式端到端方案

### ✨ 新增功能

- **StartVoiceChat API** - 云端一站式处理（ASR+LLM+TTS）
- **端到端模式** - S2SConfig 配置
- **5 种角色人设** - Emma, Tommy, Lily, Mike, Rose

### 🔧 技术改动

- ✅ `volc-start-voicechat.js` - StartVoiceChat API 客户端
- ✅ `index-start-voicechat.js` - 服务端入口
- ✅ `js/startvoicechat-client.js` - 前端客户端

### 📝 新增文档

- `STARTVOICECHAT-SETUP.md` - 配置指南
- `QUICKSTART-STARTVOICECHAT.md` - 快速启动
- `INTEGRATION-GUIDE.md` - 集成指南
- `DEPLOY-TEST.md` - 部署测试

### 📊 性能对比

| 指标 | v2.0 (百炼) | v3.0 (StartVoiceChat) | 变化 |
|------|-----------|----------------------|------|
| 延迟 | ~3.4 秒 | ~1.5 秒 | ⬇️ -56% |
| 架构 | 多服务 | 一站式 | ✅ 简化 |
| 依赖 | Python | 纯 Node.js | ✅ 简化 |

---

## v2.0.0 (2026-03-14) - 阿里云百炼版

### 🎉 重大变更

**迁移到阿里云百炼平台**，替换火山引擎豆包服务

### ✨ 新增功能

- **阿里云百炼 Qwen 大模型** - qwen-max/plus/turbo
- **实时 ASR** - qwen3-asr-flash-realtime
- **WebSocket 实时连接** - 流式识别

### 📊 性能对比

| 指标 | 火山引擎 | 阿里云百炼 | 变化 |
|------|---------|-----------|------|
| LLM 成本 | ¥0.008/千 tokens | ¥0.004/千 tokens | ⬇️ -50% |
| ASR 成本 | ¥0.02/分钟 | ¥0.02/分钟 | ➡️ 持平 |
| 识别精度 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⬆️ +1 |

---

## v1.0.0 (2026-03-12) - 初始版本

### 初始功能

- 火山引擎 RTC 双向音频
- 豆包大模型对话
- 语音识别 ASR
- WebSocket 实时通信
- 前端画布式 UI
- 5 个角色 + 4 个场景

---

## 版本规范

- **主版本号** - 重大架构变更
- **次版本号** - 新功能添加
- **修订号** - Bug 修复和优化
