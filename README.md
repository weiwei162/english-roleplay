# 🎨 English Friend - 英语好朋友

**v3.1.0** - 火山引擎 StartVoiceChat 版

为 5 岁小朋友设计的**沉浸式**英语启蒙应用！

---

## 🌟 核心理念

**不是聊天框，是百变的互动画布！**

- 🖼️ **画布为主体** - 对话发生在场景中
- 🎭 **角色在画布上** - 有表情、有动作
- 📸 **动态显示内容** - 说到什么显示什么
- 🗣️ **实时语音对话** - 火山引擎 StartVoiceChat 一站式方案

---

## 🚀 快速开始

**5 分钟启动：** 详见 [`START.md`](START.md)

```bash
cd server
npm install
cp .env.example .env
# 编辑 .env 填入 API 凭证
npm start
# 访问：http://localhost:3000 (或 https://localhost:3443)
```

### 🔐 启用 HTTPS（可选）

```bash
# 生成自签名证书（开发环境）
./generate-ssl.sh

# 启用 HTTPS
echo "USE_HTTPS=true" >> .env
npm start

# 访问：https://localhost:3443
```

详见：[`HTTPS-CONFIG.md`](HTTPS-CONFIG.md)

---

## 🎪 场景与角色

### 4 个场景

| 场景 | 说明 |
|------|------|
| 🦁 魔法动物园 | 学习动物名称和叫声 |
| 🛒 欢乐超市 | 水果蔬菜认知 |
| 🏠 温馨小家 | 日常对话 |
| 🌳 快乐公园 | 天气和自然 |

### 5 个角色

| 角色 | 说明 |
|------|------|
| 👩‍🏫 Emma | 温柔的英语老师 |
| 👦 Tommy | 5 岁美国小男孩 |
| 👧 Lily | 7 岁活泼小姐姐 |
| 🏃 Mike | 阳光运动教练 |
| 👵 Rose | 慈祥老奶奶 |

---

## ✨ 核心功能

### 画布式 UI
- 🎨 动态背景
- 🖼️ 内容显示
- 📍 任意位置
- 🔍 点击放大

### 实时对话
- 🗣️ 语音输入
- 🎧 AI 实时回复
- 💬 对话气泡
- 🧠 智能理解

### 技术特点
- ⚡ 低延迟（~1.5 秒）
- ☁️ 云端一站式处理
- 📱 响应式设计
- 🔒 安全的 API 配置

---

## 🏗️ 技术架构

```
孩子浏览器 ←→ RTC ←→ 火山云端 (ASR + LLM + TTS 一站式)
```

**正确流程（5 步）：**
1. 前端创建 RTC 房间并加入
2. 开启本地音视频采集
3. 订阅和播放房间内音视频流
4. 调用后端接口将 AI 角色加入
5. 结束时调用后端结束 AI，离开并销毁房间

详见：[`CORRECT-FLOW.md`](CORRECT-FLOW.md)

---

## 📁 项目结构

```
english-roleplay/
├── START.md                  # ⭐ 快速启动指南
├── README.md                 # 本文档
├── index.html                # 主页面
├── js/
│   ├── app.js                # 应用主逻辑
│   ├── startvoicechat-client.js  # StartVoiceChat 客户端
│   ├── characters.js         # 角色配置
│   └── scenes.js             # 场景配置
├── css/
│   └── style.css             # 样式
├── server/
│   ├── index-join-ai.js      # ⭐ 服务端入口
│   ├── volc-start-voicechat.js     # API 客户端
│   ├── token-generator-official.js # Token 生成
│   ├── test-integration.js   # 测试脚本
│   └── .env.example          # 配置模板
└── docs/
    ├── README-FINAL.md       # 项目总结
    ├── CORRECT-FLOW.md       # 正确流程 ⭐
    ├── API-CONFIG.md         # 配置 API
    ├── INTEGRATION-FLOW.md   # 集成流程
    ├── QUICK-REFERENCE.md    # 快速参考
    ├── DEPLOY-TEST.md        # 部署测试
    └── STARTVOICECHAT-SETUP.md # 配置指南
```

---

## 📚 文档索引

### 新手必读
- [`START.md`](START.md) - ⭐ 5 分钟快速启动
- [`README-FINAL.md`](README-FINAL.md) - 项目总结
- [`CORRECT-FLOW.md`](CORRECT-FLOW.md) - 正确流程

### 开发文档
- [`API-CONFIG.md`](API-CONFIG.md) - 前端配置 API
- [`INTEGRATION-FLOW.md`](INTEGRATION-FLOW.md) - 集成流程
- [`QUICK-REFERENCE.md`](QUICK-REFERENCE.md) - 快速参考

### 部署运维
- [`DEPLOY-TEST.md`](DEPLOY-TEST.md) - 部署与测试
- [`STARTVOICECHAT-SETUP.md`](STARTVOICECHAT-SETUP.md) - 配置指南

---

## 💰 费用说明

| 项目 | 免费额度 | 按量计费 |
|------|----------|----------|
| RTC | 10,000 分钟/月 | ¥0.02/分钟 |
| S2S 模型 | 新用户赠送 | ¥0.008/千 tokens |

**估算：** 每天 100 个孩子，每人 10 分钟 → 月费用约 ¥600-800

---

## 🛠️ 开发命令

```bash
# 安装依赖
npm install

# 启动服务
npm start

# 开发模式（自动重启）
npm run dev

# 运行测试
npm test

# 健康检查
curl http://localhost:3000/health
```

---

## 📊 性能指标

| 指标 | 数值 |
|------|------|
| 端到端延迟 | ~1.5 秒 |
| ASR 识别精度 | > 95% |
| TTS 音质 | 高质量 |
| 并发支持 | > 100 房间 |

---

## 🔗 相关链接

- **火山引擎 RTC:** https://www.volcengine.com/docs/6348/75707
- **StartVoiceChat API:** https://www.volcengine.com/docs/6348/1558163
- **火山引擎控制台:** https://console.volcengine.com/

---

## 📝 更新日志

### v3.1.0 (2026-03-16) - 正确流程版
- ✅ 前端完全控制房间
- ✅ 配置和 Token 从后端 API 获取
- ✅ 使用官方 AccessToken.js 生成 Token
- ✅ 清理过时代码和文档

### v3.0.0 (2026-03-15) - StartVoiceChat 版
- ✅ 火山引擎 StartVoiceChat 集成
- ✅ 云端一站式处理（ASR+LLM+TTS）
- ✅ 延迟降低至 ~1.5 秒

### v2.0.0 (2026-03-14) - 百炼版
- ✅ 迁移到阿里云百炼 Qwen 大模型
- ✅ 成本降低 50%

### v1.0.0 (2026-03-12) - 初始版本
- ✅ 基础画布 UI 和角色系统

---

## 🎉 开始使用

```bash
cd ~/projects/english-roleplay/server
npm start
# 访问：http://localhost:3000
```

**让英语启蒙像看动画片一样有趣！** 🐾✨
