# 🚀 快速启动指南 - 双向 RTC 版

**更新日期：** 2026-03-13  
**目标：** 5 分钟内启动测试环境

---

## ⚡ 快速启动（3 步）

### 步骤 1：配置环境变量

```bash
cd english-roleplay/server

# 创建 .env 文件
cat > .env << EOF
# 火山云 RTC 配置（暂时填测试值）
VOLC_APP_ID=test_app_id
VOLC_APP_KEY=test_app_key

# 豆包 API 配置（暂时填测试值）
DOUBAO_API_KEY=test_doubao_key

# 服务端端口
PORT=3000
EOF
```

---

### 步骤 2：安装依赖并启动

```bash
# 安装依赖
npm install

# 启动服务
node index.js
```

看到以下输出表示成功：
```
╔══════════════════════════════════════════════════════╗
║     English Friend AI Server Running (Full-Duplex)  ║
║                                                      ║
║   HTTP Port: 3000                                    ║
║   WebSocket: ws://localhost:3000                     ║
║                                                      ║
║   RTC:     ❌                                        ║
║   Doubao:  ❌                                        ║
║                                                      ║
║   Features:                                          ║
║   ✓ 双向 RTC 音频流（孩子说话 → AI）                   ║
║   ✓ 实时 ASR 语音识别                                 ║
║   ✓ 豆包大模型对话生成                               ║
║   ✓ 数字人视频推流                                   ║
╚══════════════════════════════════════════════════════╝
```

---

### 步骤 3：前端测试

```bash
# 在浏览器打开
open ../index.html

# 或者用 Python 快速启动 HTTP 服务
cd ..
python3 -m http.server 8080

# 浏览器访问 http://localhost:8080
```

---

## 🧪 测试流程

### 1. 检查健康状态

浏览器访问：`http://localhost:3000/health`

应该看到：
```json
{
  "status": "ok",
  "timestamp": "2026-03-13T00:00:00.000Z",
  "services": {
    "rtc": "configured",
    "doubao": "configured",
    "websocket": "enabled"
  },
  "activeSessions": 0,
  "activeRooms": 0
}
```

---

### 2. 测试 WebSocket 连接

打开浏览器控制台，输入：

```javascript
// 连接 WebSocket
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
    console.log('✅ WebSocket connected');
    
    // 发送初始化消息
    ws.send(JSON.stringify({
        type: 'init',
        sessionId: 'test_' + Date.now()
    }));
};

ws.onmessage = (event) => {
    console.log('📨 Received:', JSON.parse(event.data));
};

// 测试文字对话
ws.send(JSON.stringify({
    type: 'text',
    text: 'Hello!'
}));
```

---

### 3. 测试 RTC（需要真实配置）

```javascript
// 在控制台初始化 RTC
initRTCAvatar('YOUR_APP_ID', { asrEnabled: true });

// 创建测试房间
fetch('/api/create-room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId: 'test_room' })
})
.then(r => r.json())
.then(data => {
    console.log('🏠 Room created:', data);
    
    // 加入房间
    joinAvatarRoom(data.roomId, data.token);
});
```

---

## 🔧 配置真实 API

### 1. 火山云 RTC

```bash
# 获取 AppID 和 AppKey
https://console.volcengine.com/rtc → 应用管理 → 查看凭证

# 更新 .env
VOLC_APP_ID=your_real_app_id
VOLC_APP_KEY=your_real_app_key
```

---

### 2. 豆包大模型

```bash
# 获取 API Key
https://console.volcengine.com/ark → 密钥管理

# 更新 .env
DOUBAO_API_KEY=your_real_doubao_key
```

---

### 3. 语音识别 ASR

```bash
# 获取 API Key
https://console.volcengine.com/speech → 访问凭证

# 更新 .env
VOLC_API_KEY=your_real_asr_key
```

---

## 🎯 测试场景

### 场景 1：文字对话（降级方案）

```
1. 打开网页
2. 点击角色
3. 输入文字 "Hello"
4. 看到 AI 回应和字幕
```

---

### 场景 2：语音对话（完整方案）

```
1. 打开网页
2. 允许麦克风权限
3. 点击"按住说话"
4. 说话 "Hello"
5. 看到实时识别文字
6. 收到 AI 回应和数字人视频
```

---

### 场景 3：静音控制

```
1. 点击静音按钮
2. 按钮变红 "🔇 已静音"
3. 说话测试（应该不发送音频）
4. 再次点击取消静音
```

---

## 🐛 常见问题

### Q1: WebSocket 连接失败

```bash
# 检查服务端是否启动
curl http://localhost:3000/health

# 检查防火墙
sudo ufw allow 3000
```

---

### Q2: 麦克风权限被拒绝

```
浏览器设置 → 隐私和安全 → 网站权限 → 麦克风 → 允许 localhost
```

---

### Q3: RTC SDK 加载失败

```html
<!-- 检查 HTML 中是否正确引入 -->
<script src="https://sf1-cdn-tos.volccdn.com/obj/volcfe/ve-rtc/1.6.2/ve-rtc.min.js"></script>

<!-- 或者在控制台检查 -->
console.log(window.VE_RTC); // 应该有输出
```

---

### Q4: 跨域问题

```javascript
// 服务端已配置 CORS，如果还有问题检查：
// server/index.js 中是否有：
app.use(cors());
```

---

## 📊 性能监控

### 查看活跃会话

```bash
curl http://localhost:3000/health | jq .activeSessions
```

---

### 查看 WebSocket 连接数

```bash
# 在服务端代码中增加日志
wss.on('connection', (ws) => {
    console.log('🔌 Client connected. Total:', wss.clients.size);
});
```

---

## 🎬 下一步

1. ✅ 启动测试环境
2. ⏳ 配置真实 API 凭证
3. ⏳ 测试文字对话
4. ⏳ 测试语音对话
5. ⏳ 集成数字人视频

---

**有问题随时问我！** 🐾
