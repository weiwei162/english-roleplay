# 🎨 English Friend - 英语好朋友

**v3.2.0** - 支持真实 LLM (OpenAI/Claude/Gemini/Ollama)

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

### 方式 1: 使用真实 LLM（推荐）⭐

```bash
cd server
npm install
cp .env.example .env
# 编辑 .env，设置 AI_MODE=custom 和 LLM_API_KEY
./start.sh
# 访问：http://localhost:3000
```

详见：[`QUICKSTART.md`](QUICKSTART.md)

### 方式 2: 火山引擎端到端

```bash
cd server
npm install
cp .env.example .env
# 编辑 .env 填入火山引擎 API 凭证
npm start
# 访问：http://localhost:3000 (或 https://localhost:3443)
```

详见：[`START.md`](START.md)

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

## ✨ 核心特性

### 🎭 角色动态移动
- AI 说话时角色自动在场景中移动
- 5 个位置点循环（左/中/右/左中/右中）
- 带跳跃动画效果

### 🤖 真实 LLM 对话
- 支持 OpenAI GPT-4o、Claude、Gemini、Ollama
- 内置教学工具（字典、发音评分、场景提示）
- SSE 流式输出，低延迟

### 🎨 沉浸式场景
- 4 个主题场景（动物园、超市、家、公园）
- 动态显示教学内容（动物、食物、日常用品）
- 中英文双语支持

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
├── README.md                 # 本文档
├── QUICKSTART.md             # ⭐ 5 分钟快速启动
├── START.md                  # 火山引擎启动指南
├── CORRECT-FLOW.md           # ⭐ 正确集成流程
├── frontend/                 # 前端目录
│   ├── index.html            # 主页面
│   ├── js/
│   │   ├── app.js            # 应用主逻辑
│   │   ├── startvoicechat-client.js  # StartVoiceChat 客户端
│   │   ├── characters.js     # 角色配置
│   │   ├── scenes.js         # 场景配置
│   │   ├── auth-client.js    # 认证客户端
│   │   ├── conversations.js  # 对话管理
│   │   ├── animations.js     # 动画效果
│   │   ├── particles.js      # 粒子效果
│   │   └── demo-features.js  # 演示功能
│   ├── css/
│   │   └── style.css         # 样式
│   ├── assets/               # 资源文件
│   ├── package.json          # 前端依赖（可选 Vite）
│   └── vite.config.js        # Vite 配置（可选）
└── server/
    ├── index-join-ai.js      # ⭐ 服务端入口
    ├── volc-start-voicechat.js     # StartVoiceChat 客户端
    ├── token-generator.js    # ⭐ RTC Token 生成（基于 AccessToken.js）
    ├── AccessToken.js        # 火山引擎官方 Token 库
    ├── prompts.js            # 提示词管理
    ├── auth.js               # 用户认证
    ├── users.json            # 用户数据
    ├── test-integration.js   # 集成测试
    ├── .env.example          # 配置模板
    ├── start.sh              # 启动脚本
    ├── configure.sh          # 配置向导
    └── generate-ssl.sh       # SSL 证书生成
```

---

## 📚 文档索引

### 新手必读 ⭐
- [`QUICKSTART.md`](QUICKSTART.md) - **5 分钟快速启动**
- [`START.md`](START.md) - 火山引擎详细指南
- [`CORRECT-FLOW.md`](CORRECT-FLOW.md) - **正确集成流程**

### 开发文档
- [`CHARACTER-MOVE-FEATURE.md`](CHARACTER-MOVE-FEATURE.md) - 角色移动功能
- [`QUICK-REFERENCE.md`](QUICK-REFERENCE.md) - 快速参考
- [`ARCHITECTURE-FLOW.md`](ARCHITECTURE-FLOW.md) - 架构说明
- [`EFFECT-ANALYSIS.md`](EFFECT-ANALYSIS.md) - 效果分析
- [`TTS-VOICE-CHECK.md`](TTS-VOICE-CHECK.md) - TTS 语音检查

### 部署运维
- [`DEPLOY-DOCKER.md`](DEPLOY-DOCKER.md) - Docker 部署
- [`HTTPS-CONFIG.md`](HTTPS-CONFIG.md) - HTTPS 配置

### 其他
- [`CHANGELOG.md`](CHANGELOG.md) - 更新日志
- [`CODE-REVIEW-2026-03-21.md`](CODE-REVIEW-2026-03-21.md) - 代码审查
- [`REFACTOR-2026-03-18.md`](REFACTOR-2026-03-18.md) - 重构记录

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

### v3.2.1 (2026-03-25) - 代码清理
- 🗑️ 删除冗余测试文件（test-accesstoken.js, test-token.js, compare-tokens.js 等）
- 🗑️ 删除备份文件（volc-rtc-client.js.bak）
- 🗑️ 删除冗余实现（token-generator-official.js）
- 📝 更新文档，移除不存在的文件引用
- 📝 更新项目结构，反映实际目录布局

### v3.2.0 - 支持真实 LLM
- ✅ 集成 pi-agent-core，支持 OpenAI/Claude/Gemini/Ollama
- ✅ 内置教学工具（字典、发音评分、场景提示、图片显示）
- ✅ 改进工具调用错误处理和资源清理

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
