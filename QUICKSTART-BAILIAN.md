# ⚡ 阿里云百炼版 - 5 分钟快速开始

**适合人群：** 已有阿里云账号，想快速测试英语启蒙应用

---

## 📋 前提条件

- ✅ Node.js 16+ 已安装
- ✅ 阿里云账号已注册
- ✅ 百炼服务已开通（免费）

---

## 🚀 步骤 1：获取 API Key（2 分钟）

1. 访问：https://bailian.console.aliyun.com/
2. 点击左侧 **"API-KEY 管理"**
3. 点击 **"创建新的 API-KEY"**
4. 复制 API Key（格式：`sk-xxxxxxxx`）

> 💡 新用户有免费额度，足够测试使用

---

## 🚀 步骤 2：克隆项目（1 分钟）

```bash
# 如果还没有项目
git clone <your-repo-url> english-roleplay
cd english-roleplay/server
```

---

## 🚀 步骤 3：安装依赖（1 分钟）

```bash
npm install
```

---

## 🚀 步骤 4：配置 API Key（30 秒）

```bash
# 复制配置模板
cp .env.example .env

# 编辑 .env 文件
nano .env
# 或
vim .env
# 或直接用文本编辑器打开
```

修改这一行：
```bash
DASHSCOPE_API_KEY=sk-xxx
```

改为你的 API Key：
```bash
DASHSCOPE_API_KEY=sk-your-actual-key-here
```

---

## 🚀 步骤 5：测试 API（30 秒）

```bash
npm test
```

看到以下输出表示成功：
```
✅ Qwen API:     PASSED
✅ ASR WebSocket: PASSED
🎉 All tests passed!
```

---

## 🚀 步骤 6：启动服务（10 秒）

```bash
npm start
```

看到以下标志表示成功：
```
╔══════════════════════════════════════════════════════╗
║   English Friend AI Server - Alibaba Bailian Edition ║
║   ☁️ Bailian:  ✅ configured
║   🤖 LLM:      qwen-plus
║   🎤 ASR:      qwen3-asr-flash-realtime
╚══════════════════════════════════════════════════════╝
```

---

## 🚀 步骤 7：打开浏览器

访问：**http://localhost:3000**

1. 选择一个角色（如 Miss Emma 👩‍🏫）
2. 选择一个场景（如魔法动物园 🦁）
3. 点击"按住说话" 🎤
4. 说英语："Hello! What's this?"
5. 等待 AI 回应

---

## 🎉 完成！

现在你可以：
- ✅ 和 AI 角色英语对话
- ✅ 实时语音识别
- ✅ 智能对话生成
- ✅ 双语字幕显示

---

## ⚠️ 常见问题

### Q1: 测试失败 "API Key not configured"

```bash
# 检查 .env 文件是否正确编辑
cat .env | grep DASHSCOPE

# 确保没有 sk-xxx 占位符
# 应该是 sk-你的真实 key
```

### Q2: 端口被占用

```bash
# 修改端口
nano .env
PORT=3001

# 或者关闭占用端口的程序
lsof -i :3000
kill -9 <PID>
```

### Q3: 语音识别没反应

1. 检查浏览器是否允许麦克风权限
2. 使用 Chrome/Edge 浏览器（Firefox 不支持 Web Speech API）
3. 查看服务端控制台日志

### Q4: 免费额度用完

- 访问百炼控制台查看用量
- 新用户赠送额度足够测试数百次对话
- 如需继续使用，充值即可（按量计费）

---

## 📚 下一步

- 📖 阅读 `README.md` 了解完整功能
- 🔧 阅读 `BAILIAN-SETUP.md` 详细配置
- 🎨 添加新场景和角色
- 🚀 部署到服务器

---

## 💡 提示

**开发模式（自动重启）：**
```bash
npm run dev
```

**查看健康状态：**
```bash
curl http://localhost:3000/health
```

**查看日志：**
```bash
# 服务端日志在控制台直接显示
# 按 Ctrl+C 停止服务
```

---

**祝你使用愉快！** 🐾✨

有任何问题，查看 `MIGRATION-TO-BAILIAN.md` 或提交 Issue。
