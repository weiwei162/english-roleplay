# ⚡ 5 分钟快速启动

**版本：** v3.1.0  
**时间：** 2026-03-16

---

## 1️⃣ 安装依赖

```bash
cd ~/projects/english-roleplay/server
npm install
```

---

## 2️⃣ 配置环境

```bash
cp .env.example .env
```

编辑 `.env`：

```bash
# 火山引擎 RTC
VOLC_APP_ID=你的 AppId
VOLC_APP_KEY=你的 AppKey

# API 凭证
VOLC_ACCESS_KEY=你的 AccessKey
VOLC_SECRET_KEY=你的 SecretKey

# S2S 配置
VOLC_S2S_APP_ID=你的 S2S AppId
VOLC_S2S_TOKEN=你的 S2S Token
```

> 💡 **获取凭证：** https://console.volcengine.com/

---

## 3️⃣ 启动服务

```bash
npm start
```

**预期输出：**
```
🚀 Server running on http://localhost:3000
```

---

## 4️⃣ 运行测试

```bash
npm test
```

---

## 5️⃣ 浏览器访问

**http://localhost:3000**

1. 选角色 👩‍🏫👦👧🏃👵
2. 选场景 🦁🛒🏠🌳
3. 开始对话 🎤

---

## 📚 详细文档

- [`START.md`](START.md) - 完整启动指南
- [`CORRECT-FLOW.md`](CORRECT-FLOW.md) - 正确流程
- [`README.md`](README.md) - 项目说明

---

## 🆘 遇到问题？

```bash
# 检查配置
cat .env | grep VOLC

# 检查服务
curl http://localhost:3000/health

# 查看日志
tail -f logs/*.log
```

**详细排查：** [`DEPLOY-TEST.md`](DEPLOY-TEST.md)
