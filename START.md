# 🚀 快速启动指南 - 全栈版

**更新日期：** 2026-03-13  
**版本：** v2.1 (统一 Node.js 全栈)

---

## ⚡ 一句话启动

```bash
cd english-roleplay/server
npm start

# 浏览器访问
http://localhost:3000
```

**就这么简单！** 🎉

---

## 📋 详细步骤

### 第一次启动

#### 1. 安装依赖

```bash
cd english-roleplay/server
npm install
```

---

#### 2. 配置 API（可选）

**不配置也能用**（降级模式），配置后功能更完整：

```bash
# 运行配置脚本
./configure.sh

# 按提示输入：
# - RTC AppID + AppKey
# - 豆包 API Key
# - （可选）ASR 密钥
```

---

#### 3. 测试配置

```bash
# 测试 API
npm test

# 看到 "✅ 所有测试通过" 即可继续
```

---

#### 4. 启动服务

```bash
# 正式运行
npm start

# 开发模式（自动重启）
npm run dev
```

---

#### 5. 打开浏览器

```
http://localhost:3000
```

---

## 🎯 启动成功标志

看到以下输出表示成功：

```
╔══════════════════════════════════════════════════════╗
║     English Friend AI Server Running (Full-Stack)   ║
║                                                      ║
║   🌐 Frontend:  http://localhost:3000                ║
║   🔌 WebSocket: ws://localhost:3000                  ║
║   📡 API:       http://localhost:3000/api            ║
║                                                      ║
║   🎥 RTC:     ✅ configured                          ║
║   🤖 Doubao:  ✅ configured                          ║
║                                                      ║
║   ✨ Features:                                        ║
║   ✓ 前端静态文件服务（无需 Python）                    ║
║   ✓ 双向 RTC 音频流（孩子说话 → AI）                   ║
║   ✓ 实时 ASR 语音识别                                 ║
║   ✓ 豆包大模型对话生成                               ║
║   ✓ 数字人视频推流                                   ║
╚══════════════════════════════════════════════════════╝

🚀 现在只需一个命令启动所有服务！
📱 浏览器访问：http://localhost:3000
```

---

## 🧪 测试流程

### 1. 基础测试（无需 API）

```
1. 打开 http://localhost:3000
2. 选择角色（Miss Emma 等）
3. 选择场景（动物园、超市等）
4. 点击快速回复按钮
5. 看到对话气泡和字幕
```

**预期结果：** ✅ 正常显示对话

---

### 2. WebSocket 测试（需要服务端）

打开浏览器控制台：

```javascript
// 检查 WebSocket 状态
getWebSocketStatus()
// 应该返回 "connected"

// 发送测试消息
sendWebSocketText("Hello!")
```

**预期结果：** ✅ 收到 AI 回应

---

### 3. RTC 测试（需要 API 配置）

```
1. 点击"按住说话"
2. 允许麦克风权限
3. 说话 "Hello"
4. 看到音量指示器跳动
5. 收到 AI 回应和数字人视频
```

**预期结果：** ✅ 双向音频流正常工作

---

## 🛠️ 开发模式

### 自动重启（推荐）

```bash
cd server
npm run dev
```

**特点：**
- ✅ 修改代码自动重启
- ✅ 无需手动停止/启动
- ✅ 开发体验更好

---

### 调试模式

```bash
# 查看详细日志
DEBUG=* npm start

# 或者在代码中添加
console.log('Debug info...')
```

---

## 📊 端口说明

**之前（两个端口）：**
```
前端：8080 (Python)
后端：3000 (Node.js)
```

**现在（一个端口）：**
```
全部：3000 (Node.js 全栈)
```

---

## 🔧 修改端口

如需修改默认端口：

```bash
# 方法 1：环境变量
PORT=8080 npm start

# 方法 2：修改 .env
echo "PORT=8080" >> .env
```

---

## 🐛 常见问题

### Q1: 页面空白

```bash
# 检查服务是否启动
curl http://localhost:3000

# 应该返回 index.html 内容
```

---

### Q2: WebSocket 连接失败

```javascript
// 检查 WebSocket URL
console.log(WS_CONFIG.url)
// 应该是 ws://localhost:3000

// 手动重连
reconnectWebSocket()
```

---

### Q3: API 配置错误

```bash
# 重新配置
./configure.sh

# 或者手动编辑 .env
nano .env
```

---

### Q4: 端口被占用

```bash
# 查看占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或者换端口
PORT=3001 npm start
```

---

## 📝 项目结构

```
english-roleplay/
├── index.html          # 前端主页面
├── css/
│   └── style.css       # 样式
├── js/
│   ├── app.js          # 主逻辑
│   ├── rtc-client.js   # RTC 客户端
│   └── websocket-client.js  # WebSocket
├── server/
│   ├── index.js        # ⭐ 服务端（全栈）
│   ├── .env            # 配置文件
│   ├── configure.sh    # 配置脚本
│   └── test-api.js     # 测试工具
└── docs/               # 文档
```

---

## 🎬 对比之前

### 之前的启动方式

```bash
# 终端 1 - 前端
cd english-roleplay
python3 -m http.server 8080

# 终端 2 - 后端
cd server
node index.js 3000

# 浏览器访问
http://localhost:8080
```

**问题：**
- ❌ 要开两个终端
- ❌ 两个端口容易混淆
- ❌ 部署复杂

---

### 现在的启动方式

```bash
# 一个终端
cd server
npm start

# 浏览器访问
http://localhost:3000
```

**优势：**
- ✅ 一个终端
- ✅ 一个端口
- ✅ 部署简单
- ✅ 开发体验好

---

## 💡 下一步

### 本地开发

```bash
# 启动服务
npm run dev

# 修改代码
# 自动重启

# 刷新浏览器
# 立即生效
```

---

### 部署到服务器

```bash
# 1. 上传代码
scp -r english-roleplay user@server:/var/www/

# 2. 安装依赖
cd /var/www/english-roleplay/server
npm install --production

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 API 密钥

# 4. 启动服务
npm start

# 5. 配置 Nginx（可选）
# 反向代理到 3000 端口
```

---

### 使用 PM2 管理（生产环境）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server/index.js --name english-friend

# 查看状态
pm2 status

# 查看日志
pm2 logs english-friend

# 重启
pm2 restart english-friend

# 开机自启
pm2 startup
pm2 save
```

---

## 📞 需要帮助？

**查看文档：**
- `README.md` - 项目总览
- `QUICK-SETUP.md` - API 配置
- `VOLCENGINE-SETUP.md` - 详细教程

**测试工具：**
```bash
npm test  # 测试 API
```

**健康检查：**
```bash
curl http://localhost:3000/health
```

---

**就这么简单！开始使用吧！** 🐾

**快速命令：**
```bash
cd english-roleplay/server
npm start
```
