# 🚀 StartVoiceChat 部署与测试指南

**完成时间：** 2026-03-15  
**状态：** ✅ 可部署

---

## 📋 部署前检查

### 1. 确认凭证

确保你已获取以下 API 凭证：

| 凭证 | 获取地址 | 必需 |
|------|----------|------|
| VOLC_APP_ID | https://console.volcengine.com/rtc/aigc/listRTC | ✅ |
| VOLC_APP_KEY | 同上 | ✅ |
| VOLC_ACCESS_KEY | https://console.volcengine.com/iam/keymanage/ | ✅ |
| VOLC_SECRET_KEY | 同上 | ✅ |
| VOLC_S2S_APP_ID | https://console.volcengine.com/speech/service/10017 | ✅ (端到端模式) |
| VOLC_S2S_TOKEN | 同上 | ✅ (端到端模式) |

### 2. 环境要求

- Node.js >= 16.x
- npm >= 8.x
- 现代浏览器（Chrome/Edge/Safari）

---

## 🔧 部署步骤

### 步骤 1：安装依赖

```bash
cd /home/gem/projects/english-roleplay/server
npm install
```

### 步骤 2：配置环境变量

```bash
# 复制配置模板
cp .env.example .env

# 编辑配置文件
nano .env
```

**最小配置（端到端模式）：**

```env
# AI 模式
AI_MODE=s2s

# RTC 配置
VOLC_APP_ID=你的 RTC AppId
VOLC_APP_KEY=你的 RTC AppKey
VOLC_ACCESS_KEY=你的 AccessKey
VOLC_SECRET_KEY=你的 SecretKey

# S2S 端到端配置
VOLC_S2S_APP_ID=你的 S2S AppId
VOLC_S2S_TOKEN=你的 S2S Token

# 服务端配置
PORT=3000
```

### 步骤 3：启动服务

```bash
node index-start-voicechat.js
```

**预期输出：**

```
╔══════════════════════════════════════════════════════╗
║   English Friend - StartVoiceChat Server             ║
║                                                      ║
║   🌐 Frontend:  http://localhost:3000                ║
║   📡 API:       http://localhost:3000/api            ║
║   🔑 Health:    http://localhost:3000/health         ║
║                                                      ║
║   🤖 AI Mode:   端到端 (S2S)                         ║
║   🎮 RTC:       ✅ configured                        ║
║                                                      ║
║   ✨ 5 种角色：Emma, Tommy, Lily, Mike, Rose          ║
╚══════════════════════════════════════════════════════╝

🚀 服务已启动！
📱 浏览器访问：http://localhost:3000
🔧 模式：端到端
```

---

## 🧪 测试步骤

### 测试 1：运行自动化测试

```bash
cd server
node test-integration.js
```

**预期输出：**

```
🧪 StartVoiceChat 前后端集成测试

📋 测试 1: 健康检查
✅ 健康检查通过
   配置：{ aiMode: 's2s', volcConfigured: true, rtcConfigured: true }

📋 测试 2: 获取角色列表
✅ 角色列表获取成功
   可用角色：Miss Emma, Tommy, Lily, Coach Mike, Grandma Rose

📋 测试 3: 创建 AI 房间
✅ 房间创建成功
   RoomId: test_room_1710576000000
   TaskId: task_test_room_1710576000000_1710576000000
   AI 模式：s2s
   角色：Miss Emma

📋 测试 4: 离开房间
✅ 房间离开成功

📋 测试 5: 前端静态文件
✅ 前端页面可访问

📋 测试 6: StartVoiceChat 客户端 JS
✅ StartVoiceChat 客户端 JS 可访问

🎉 所有测试通过！前后端集成完成！

📱 下一步:
   1. 浏览器访问：http://localhost:3000
   2. 选择一个角色
   3. 选择一个场景
   4. 开始与 AI 对话！
```

### 测试 2：手动测试前端

#### 1. 访问页面

打开浏览器，访问：http://localhost:3000

#### 2. 选择角色

点击选择一个角色（如 Miss Emma）

**检查点：**
- ✅ 角色卡片高亮
- ✅ 进入场景选择页面

#### 3. 选择场景

点击选择一个场景（如 Magic Zoo）

**检查点：**
- ✅ 进入画布聊天界面
- ✅ 显示加载动画 "AI 角色正在准备..."
- ✅ 音频控制栏显示 "正在连接 AI..."

#### 4. 等待 AI 加入

等待 3-5 秒

**检查点：**
- ✅ 加载动画消失
- ✅ 音频控制栏显示 "AI 角色已就绪" 或 "🟢 连接中"
- ✅ 角色开始说话（"Hello! I'm Miss Emma!"）

#### 5. 测试语音对话

点击麦克风按钮说话

**检查点：**
- ✅ 按钮显示 "Listening..."
- ✅ 说完后显示 "You said: xxx"
- ✅ AI 回应你的话

#### 6. 测试视频模式

如果配置了 S2S 端到端模式：

- ✅ 点击 "📹 切换动画模式"
- ✅ 切换到视频模式（如果 AI 发布视频流）
- ✅ 再次点击切换回动画模式

#### 7. 测试静音

点击静音按钮

**检查点：**
- ✅ 按钮变为 "🔇 已静音"
- ✅ 状态显示 "🔇 已静音"
- ✅ 再次点击取消静音

#### 8. 离开房间

点击设置按钮 → "换个场景" 或 "换个朋友"

**检查点：**
- ✅ 正常离开当前房间
- ✅ 可以重新选择场景/角色

---

## 🔍 调试技巧

### 1. 查看服务端日志

```bash
# 启动时查看详细日志
DEBUG=* node index-start-voicechat.js

# 或者查看实时日志
tail -f logs/*.log  # 如果有日志文件
```

### 2. 浏览器控制台

打开浏览器开发者工具（F12），查看：

**Console 标签：**
```
✅ StartVoiceChat client loaded
🏠 Creating StartVoiceChat room...
✅ Room created: { roomId, taskId, aiMode }
🔌 Joining RTC room...
✅ Joined RTC room
📥 User published stream: ai_emma 2
✅ Subscribed to ai_emma audio/video
🎬 RTC video ready
```

**Network 标签：**
- 检查 `/api/create-room` 请求
  - 状态码：200
  - 响应：包含 roomId, taskId, token
- 检查 `/api/leave-room` 请求
  - 状态码：200
  - 响应：{ success: true }

### 3. 火山引擎控制台

访问：https://console.volcengine.com/rtc/aigc/listRTC

**检查：**
- ✅ 应用在线状态
- ✅ 房间列表（应该看到刚创建的房间）
- ✅ 通话质量监控

### 4. 快速诊断命令

```bash
# 健康检查
curl http://localhost:3000/health

# 获取角色列表
curl http://localhost:3000/api/characters

# 创建测试房间
curl -X POST http://localhost:3000/api/create-room \
  -H "Content-Type: application/json" \
  -d '{"roomId":"test123","character":"emma"}'

# 离开测试房间
curl -X POST http://localhost:3000/api/leave-room \
  -H "Content-Type: application/json" \
  -d '{"roomId":"test123"}'
```

---

## ⚠️ 常见问题排查

### 问题 1: 服务启动失败

**错误：** `Error: VOLC_ACCESS_KEY and VOLC_SECRET_KEY required`

**解决：**
```bash
# 检查 .env 文件
cat .env | grep VOLC_

# 确保配置了所有必需变量
# VOLC_ACCESS_KEY=xxx
# VOLC_SECRET_KEY=xxx
```

### 问题 2: 创建房间返回 401

**错误：** `API Error 401: Signature failed`

**解决：**
1. 检查 AccessKey/SecretKey 是否正确
2. 确认服务器时间准确
3. 检查密钥是否过期

### 问题 3: RTC SDK 加载失败

**错误：** `RTC SDK not loaded`

**解决：**
1. 检查网络连接
2. 确认 CDN 地址可访问
3. 使用动画模式（自动降级）

### 问题 4: AI 未入房

**现象：** 加载动画一直显示

**解决：**
1. 等待 10-15 秒（AI 加入需要时间）
2. 检查火山引擎控制台是否有错误
3. 查看服务端日志：
   ```bash
   node index-start-voicechat.js 2>&1 | tee server.log
   ```

### 问题 5: 没有声音

**检查：**
1. 浏览器是否允许麦克风权限
2. 系统音量是否打开
3. 静音按钮状态
4. RTC 连接状态

**解决：**
```javascript
// 浏览器控制台测试
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(() => console.log('✅ Microphone OK'))
  .catch(err => console.error('❌ Microphone error:', err));
```

### 问题 6: 费用超支

**预防：**
1. 设置用量告警（火山引擎控制台）
2. 用户退出时及时调用 leave-room
3. 调整 IdleTimeout 时长（默认 180 秒）

**监控：**
- RTC 用量：https://console.volcengine.com/rtc/aigc/usage
- S2S 用量：https://console.volcengine.com/speech/usage

---

## 📊 性能优化

### 1. 启用 HTTPS（生产环境）

```env
USE_HTTPS=true
HTTPS_PORT=3443
SSL_CERT_PATH=./ssl/cert.pem
SSL_KEY_PATH=./ssl/key.pem
```

### 2. 配置 CDN

编辑 `index.html`，使用更快的 CDN：

```html
<script src="https://lf3-cdn-tos.bytecdntp.com/cdn/expire-1-M/@volcengine/rtc/4.68.1/index.min.js"></script>
```

### 3. 优化 RTC 配置

```javascript
// volc-start-voicechat.js
VADConfig: {
    SilenceTime: 600,      // 判停静音时长
    AIVAD: true            // 智能语义判停
}
```

---

## 📈 监控与日志

### 1. 添加日志记录

```javascript
// index-start-voicechat.js
const fs = require('fs');
const logStream = fs.createWriteStream('./server.log', { flags: 'a' });

console.log = function(...args) {
    const msg = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
    logStream.write(msg);
    process.stdout.write(msg);
};
```

### 2. 监控活跃会话

```bash
# 查看当前活跃会话数
curl http://localhost:3000/health | jq .activeSessions
```

### 3. 设置告警

在火山引擎控制台设置：
- RTC 用量告警
- S2S 用量告警
- API 错误率告警

---

## ✅ 部署检查清单

部署前：
- [ ] 所有 API 凭证已获取
- [ ] .env 文件已配置
- [ ] 依赖已安装
- [ ] 端口未被占用

部署后：
- [ ] 服务正常启动
- [ ] 健康检查通过
- [ ] 集成测试通过
- [ ] 前端可访问

功能测试：
- [ ] 可以选择角色
- [ ] 可以选择场景
- [ ] AI 成功加入房间
- [ ] 语音对话正常
- [ ] 静音控制正常
- [ ] 离开房间正常

监控：
- [ ] 日志正常记录
- [ ] 用量监控已设置
- [ ] 错误告警已配置

---

**部署完成！开始享受真实的 AI 语音对话吧！** 🐾

**支持联系方式：**
- 火山引擎客服：400-088-2999
- 官方文档：https://www.volcengine.com/docs/6348/1558163
