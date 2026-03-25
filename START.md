# 🚀 English Friend - 快速启动指南

**版本：** v3.1.0 - StartVoiceChat 正确流程版  
**更新时间：** 2026-03-16

---

## ⚡ 5 分钟快速启动

### 1️⃣ 安装依赖

```bash
cd ~/projects/english-roleplay/server
npm install
```

---

### 2️⃣ 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```bash
# ==================== AI 模式 ====================
AI_MODE=s2s

# ==================== RTC 配置 ====================
VOLC_APP_ID=你的 RTC AppId
VOLC_APP_KEY=你的 RTC AppKey

# ==================== API 凭证 ====================
VOLC_ACCESS_KEY=你的 AccessKey
VOLC_SECRET_KEY=你的 SecretKey

# ==================== S2S 配置 ====================
VOLC_S2S_APP_ID=你的 S2S AppId
VOLC_S2S_TOKEN=你的 S2S Token

# ==================== 服务端配置 ====================
PORT=3000
```

> 💡 **获取凭证：** 登录 [火山引擎控制台](https://console.volcengine.com/) 创建应用并获取密钥

---

### 3️⃣ 启动服务

```bash
# 生产环境
npm start

# 开发环境（自动重启）
npm run dev
```

**预期输出：**
```
╔══════════════════════════════════════════════════════╗
║   English Friend - StartVoiceChat Server             ║
║   (Frontend Creates Room Flow)                       ║
╚══════════════════════════════════════════════════════╝

📁 Serving frontend from: /home/gem/projects/english-roleplay
🤖 AI Mode: s2s
🔄 Flow: Frontend creates room → AI joins via backend

🚀 Server running on http://localhost:3000
```

---

### 4️⃣ 运行测试

```bash
npm test
```

**预期输出：**
```
🧪 StartVoiceChat 前后端集成测试

✅ 测试 1: 健康检查 - 通过
✅ 测试 2: 角色列表 - 通过
✅ 测试 3: 创建房间 - 通过
✅ 测试 4: 离开房间 - 通过
✅ 测试 5: 前端静态文件 - 通过
✅ 测试 6: StartVoiceChat 客户端 - 通过

🎉 所有测试通过！
```

---

### 5️⃣ 浏览器访问

**HTTP 模式：** http://localhost:3000  
**HTTPS 模式：** https://localhost:3443（需配置）

**使用流程：**
1. 选择角色（Miss Emma 👩‍🏫）
2. 选择场景（魔法动物园 🦁）
3. 点击"开始对话"
4. 对着麦克风说英语
5. 听 AI 实时回复

---

## 🔐 启用 HTTPS（可选）

### 生成证书

```bash
cd server
./generate-ssl.sh
```

### 配置环境变量

```bash
echo "USE_HTTPS=true" >> .env
```

### 重启服务

```bash
npm start
```

### 访问

```
https://localhost:3443
```

> 💡 **注意：** 自签名证书会显示安全警告，点击"继续访问"即可。

**详细配置：** [`HTTPS-CONFIG.md`](HTTPS-CONFIG.md)

---

## 📡 API 接口

### 健康检查
```bash
curl http://localhost:3000/health
```

### 获取配置
```bash
curl http://localhost:3000/api/config
```

### 获取 Token
```bash
curl "http://localhost:3000/api/token?roomId=room123&uid=child_user"
```

### 角色列表
```bash
curl http://localhost:3000/api/characters
```

---

## 🎭 可用角色

| 角色 | 说明 |
|------|------|
| Emma | Miss Emma - 温柔的英语老师 |
| Tommy | Tommy - 5 岁美国小男孩 |
| Lily | Lily - 7 岁活泼小姐姐 |
| Mike | Coach Mike - 阳光运动教练 |
| Rose | Grandma Rose - 慈祥老奶奶 |

---

## 🎪 可用场景

| 场景 | 说明 |
|------|------|
| 魔法动物园 🦁 | 学习动物名称和叫声 |
| 欢乐超市 🛒 | 水果蔬菜认知 |
| 温馨小家 🏠 | 日常对话 |
| 快乐公园 🌳 | 天气和自然 |

---

## ⚠️ 常见问题

### Q1: 端口被占用

```bash
# 查看占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或修改端口
echo "PORT=3001" >> .env
```

### Q2: 凭证错误

```bash
# 检查 .env 配置
cat .env | grep VOLC

# 确保没有占位符 "your_"
# 确保密钥格式正确
```

### Q3: 前端无法访问

```bash
# 检查防火墙
sudo ufw status

# 允许 3000 端口
sudo ufw allow 3000

# 检查服务是否运行
curl http://localhost:3000/health
```

### Q4: RTC SDK 加载失败

- 检查网络连接
- 清除浏览器缓存
- 使用 Chrome/Edge 浏览器

---

## 📚 详细文档

| 文档 | 用途 |
|------|------|
| [`README-FINAL.md`](README-FINAL.md) | 项目总结 |
| [`CORRECT-FLOW.md`](CORRECT-FLOW.md) | ⭐ 正确流程 |
| [`API-CONFIG.md`](API-CONFIG.md) | 配置 API 说明 |
| [`INTEGRATION-FLOW.md`](INTEGRATION-FLOW.md) | 集成流程 |
| [`QUICK-REFERENCE.md`](QUICK-REFERENCE.md) | 快速参考 |
| [`DEPLOY-TEST.md`](DEPLOY-TEST.md) | 部署测试 |
| [`STARTVOICECHAT-SETUP.md`](STARTVOICECHAT-SETUP.md) | 配置指南 |

---

## 🔧 开发命令

```bash
# 安装依赖
npm install

# 启动服务
npm start

# 开发模式（自动重启）
npm run dev

# 运行测试
npm test

# 查看健康状态
curl http://localhost:3000/health
```

---

## 📊 项目结构

```
english-roleplay/
├── index.html              # 主页面
├── js/
│   ├── app.js              # 应用主逻辑
│   ├── startvoicechat-client.js  # StartVoiceChat 客户端
│   ├── characters.js       # 角色配置
│   └── scenes.js           # 场景配置
├── css/
│   └── style.css           # 样式
├── server/
│   ├── index-join-ai.js    # ⭐ 服务端入口
│   ├── volc-start-voicechat.js   # API 客户端
│   ├── token-generator.js           # Token 生成（基于 AccessToken.js）
│   ├── AccessToken.js               # 火山引擎官方 Token 库
│   ├── test-integration.js  # 测试脚本
│   └── .env.example        # 配置模板
└── docs/                   # 文档
    ├── START.md            # 本文档
    ├── README-FINAL.md     # 项目总结
    └── CORRECT-FLOW.md     # 正确流程
```

---

## ✅ 启动检查清单

- [ ] Node.js 16+ 已安装
- [ ] 依赖已安装 (`npm install`)
- [ ] `.env` 文件已配置
- [ ] API 凭证已填写（无占位符）
- [ ] 服务启动成功
- [ ] 健康检查通过
- [ ] 浏览器可访问
- [ ] 测试通过

---

## 🎉 开始使用

```bash
cd ~/projects/english-roleplay/server
npm start
# 访问：http://localhost:3000
```

**祝你使用愉快！** 🐾✨
