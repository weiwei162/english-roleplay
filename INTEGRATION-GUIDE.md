# 🔌 StartVoiceChat 前后端集成指南

**更新日期：** 2026-03-15  
**状态：** ✅ 集成完成

---

## 📋 概述

本文档说明如何将火山引擎 StartVoiceChat API 与现有前端集成，实现真实的 AI 语音对话功能。

---

## 🏗️ 架构说明

### 组件结构

```
┌─────────────────────────────────────────────────────┐
│                     前端 (Browser)                   │
│  ┌──────────────────────────────────────────────┐   │
│  │  startvoicechat-client.js                    │   │
│  │  - StartVoiceChatClient 类                   │   │
│  │  - 创建/加入房间                              │   │
│  │  - RTC 引擎管理                               │   │
│  │  - 视频播放/静音控制                          │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                        ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────┐
│                   后端 (Node.js)                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  volc-start-voicechat.js                     │   │
│  │  - VolcStartVoiceChatClient 类               │   │
│  │  - API 签名                                   │   │
│  │  - StartVoiceChat 调用                        │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │  index-start-voicechat.js                    │   │
│  │  - REST API (/api/create-room)               │   │
│  │  - 静态文件服务                               │   │
│  │  - 会话管理                                   │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                        ↕ HTTPS
┌─────────────────────────────────────────────────────┐
│              火山引擎云服务                           │
│  - RTC 实时音视频                                    │
│  - 豆包端到端语音大模型 (S2S)                        │
│  - ASR 语音识别 + LLM + TTS (分组件模式)             │
└─────────────────────────────────────────────────────┘
```

---

## 📁 文件结构

### 后端文件

```
server/
├── volc-start-voicechat.js       # StartVoiceChat API 客户端
├── index-start-voicechat.js      # 服务端入口
├── test-integration.js           # 集成测试脚本
└── .env                          # 环境配置
```

### 前端文件

```
js/
├── startvoicechat-client.js      # StartVoiceChat 前端客户端
├── app.js                        # 主应用逻辑（已更新）
└── rtc-client.js                 # 旧版 RTC 客户端（保留）

index.html                        # 主页面（已更新）
```

---

## 🚀 快速启动

### 1. 配置环境变量

```bash
cd server
cp .env.example .env
```

编辑 `.env`，填入你的凭证：

```env
# 端到端模式（推荐）
AI_MODE=s2s

# RTC 配置
VOLC_APP_ID=你的 RTC AppId
VOLC_APP_KEY=你的 RTC AppKey
VOLC_ACCESS_KEY=你的 AccessKey
VOLC_SECRET_KEY=你的 SecretKey

# S2S 配置
VOLC_S2S_APP_ID=你的 S2S AppId
VOLC_S2S_TOKEN=你的 S2S Token
```

### 2. 启动服务

```bash
node index-start-voicechat.js
```

### 3. 运行集成测试

```bash
node test-integration.js
```

**预期输出：**

```
🧪 StartVoiceChat 前后端集成测试

📋 测试 1: 健康检查
✅ 健康检查通过

📋 测试 2: 获取角色列表
✅ 角色列表获取成功

📋 测试 3: 创建 AI 房间
✅ 房间创建成功

📋 测试 4: 离开房间
✅ 房间离开成功

📋 测试 5: 前端静态文件
✅ 前端页面可访问

📋 测试 6: StartVoiceChat 客户端 JS
✅ StartVoiceChat 客户端 JS 可访问

🎉 所有测试通过！前后端集成完成！
```

### 4. 浏览器访问

```
http://localhost:3000
```

---

## 🔧 前端集成详解

### 1. 加载 StartVoiceChat 客户端

在 `index.html` 中：

```html
<!-- StartVoiceChat 客户端（优先） -->
<script src="js/startvoicechat-client.js"></script>

<!-- RTC + WebSocket 模块（备用） -->
<script src="js/rtc-client.js"></script>
<script src="js/websocket-client.js"></script>

<!-- 主应用 -->
<script src="js/app.js"></script>
```

### 2. 创建房间流程

在 `app.js` 中：

```javascript
async function createAIVoiceChatRoom() {
    // 生成房间 ID
    currentRoomId = `room_${currentCharacter.id}_${Date.now()}`;
    
    // 显示加载动画
    showVideoLoading();
    
    // 创建并加入房间
    await createStartVoiceChatRoom(
        currentRoomId,
        currentCharacter.id,
        {
            onReady: (info) => {
                console.log('✅ AI voice chat ready');
                hideVideoLoading();
            },
            onError: (error) => {
                console.error('❌ Voice chat error:', error);
                showVideoError(error.message);
            },
            onStatusChange: (status, text) => {
                updateRTCStatus(status, text);
            }
        }
    );
}
```

### 3. 离开房间

```javascript
async function leaveAIVoiceChatRoom() {
    if (!currentRoomId) return;
    
    // 离开 StartVoiceChat 房间
    await leaveStartVoiceChatRoom();
    
    currentRoomId = null;
}
```

### 4. UI 控制

```javascript
// 切换视频模式
function toggleVideoMode() {
    if (window.currentVoiceChat) {
        const isActive = document.getElementById('rtc-video-layer')
            .classList.contains('active');
        window.currentVoiceChat.showVideo(!isActive);
    }
}

// 切换静音
function toggleMute() {
    const isMuted = document.getElementById('mute-btn')
        .classList.contains('muted');
    
    if (window.currentVoiceChat) {
        window.currentVoiceChat.muteLocalAudio(!isMuted);
    }
    
    // 更新 UI
    const muteBtn = document.getElementById('mute-btn');
    muteBtn.classList.toggle('muted');
    muteBtn.innerHTML = isMuted ? '🎤 说话中' : '🔇 已静音';
}
```

---

## 🎭 角色配置

系统预置 5 种角色，在 `volc-start-voicechat.js` 中配置：

```javascript
const CHARACTER_CONFIGS = {
    emma: {
        name: 'Miss Emma',
        systemPrompt: 'You are Miss Emma, a gentle English teacher...',
        systemRole: 'You are Miss Emma, a gentle English teacher.',
        speakingStyle: 'Warm, patient, encouraging',
        ttsVoiceType: 'zh_female_linjianvhai_moon_bigtts',
        s2sSpeaker: 'zh_female_vv_jupiter_bigtts'
    },
    // ... 其他角色
};
```

---

## 📊 API 接口

### POST /api/create-room

创建 AI 语音聊天房间。

**请求：**

```json
{
  "roomId": "room123",
  "character": "emma"
}
```

**响应：**

```json
{
  "roomId": "room123",
  "token": "eyJhcHBfaWQiOiJ4eHgiLCJyb29tX2lkIjoicm9vbTEyMyIs...",
  "appId": "your_app_id",
  "character": "emma",
  "characterName": "Miss Emma",
  "taskId": "task_room123_1710576000000",
  "aiMode": "s2s",
  "success": true
}
```

### POST /api/leave-room

离开 AI 语音聊天房间。

**请求：**

```json
{
  "roomId": "room123"
}
```

### GET /api/characters

获取角色列表。

**响应：**

```json
{
  "characters": [
    {
      "id": "emma",
      "name": "Miss Emma",
      "description": "You are Miss Emma, a gentle English teacher..."
    },
    // ...
  ]
}
```

### GET /health

健康检查。

**响应：**

```json
{
  "status": "ok",
  "config": {
    "aiMode": "s2s",
    "volcConfigured": true,
    "rtcConfigured": true
  },
  "activeSessions": 0
}
```

---

## 🎨 UI 组件

### 视频层

```html
<div class="rtc-video-layer" id="rtc-video-layer">
    <div class="video-container" id="avatar-video-container">
        <!-- 火山 RTC 视频将播放在这里 -->
    </div>
    <button class="toggle-video-btn" onclick="toggleVideoMode()">
        📹 切换动画模式
    </button>
</div>
```

### 音频控制栏

```html
<div class="audio-control-bar" id="audio-control-bar">
    <button id="mute-btn" onclick="toggleMute()" class="control-btn">
        🎤 说话中
    </button>
    <div id="audio-level-indicator" class="audio-level">
        <div class="level-bar"></div>
    </div>
    <div id="rtc-status" class="rtc-status">
        正在连接 AI...
    </div>
</div>
```

---

## 🐛 调试技巧

### 1. 查看日志

```bash
# 启动时查看详细日志
DEBUG=* node index-start-voicechat.js
```

### 2. 浏览器控制台

打开浏览器开发者工具，查看：

- StartVoiceChat 客户端日志
- RTC 连接状态
- 错误信息

### 3. 网络请求

检查 Network 面板：

- `/api/create-room` - 创建房间请求
- `/api/leave-room` - 离开房间请求
- `/health` - 健康检查

### 4. 测试工具

```bash
# 健康检查
curl http://localhost:3000/health

# 获取角色列表
curl http://localhost:3000/api/characters

# 创建房间
curl -X POST http://localhost:3000/api/create-room \
  -H "Content-Type: application/json" \
  -d '{"roomId":"test1","character":"emma"}'

# 离开房间
curl -X POST http://localhost:3000/api/leave-room \
  -H "Content-Type: application/json" \
  -d '{"roomId":"test1"}'
```

---

## ⚠️ 常见问题

### Q1: RTC SDK 加载失败

```
解决：
- 检查网络连接
- 确认 CDN 地址可访问
- 使用备用方案（动画模式）
```

### Q2: 创建房间失败

```
解决：
- 检查环境变量配置
- 确认 API 凭证正确
- 查看服务端日志
```

### Q3: AI 未入房

```
解决：
- StartVoiceChat 返回 200 仅代表任务下发
- 前往控制台开启 VoiceChat 事件回调
- 等待 AI 自动加入（通常 3-5 秒）
```

### Q4: 视频不显示

```
解决：
- 检查远端用户是否发布视频流
- 确认视频容器存在
- 切换动画模式查看是否降级
```

---

## 📚 参考文档

- **StartVoiceChat API:** https://www.volcengine.com/docs/6348/1558163
- **RTC Web SDK:** https://www.volcengine.com/docs/6348/75707
- **调用方法:** https://www.volcengine.com/docs/6348/1899868

---

## ✅ 集成检查清单

- [ ] 配置环境变量
- [ ] 启动后端服务
- [ ] 运行集成测试
- [ ] 所有测试通过
- [ ] 浏览器访问前端
- [ ] 选择角色和场景
- [ ] 视频播放正常
- [ ] 音频双向传输正常
- [ ] 静音控制正常
- [ ] 离开房间正常

---

**集成完成！开始享受真实的 AI 语音对话吧！** 🐾
