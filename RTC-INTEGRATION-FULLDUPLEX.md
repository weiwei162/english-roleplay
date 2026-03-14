# 🔧 火山云 RTC 集成指南（双向音频流版）

**版本：** 2.0 (Full-Duplex Audio)  
**日期：** 2026-03-13  
**目标：** 实现双向 RTC 通信 - 孩子音频上传 + 数字人视频/音频下载

---

## 📋 目录

1. [架构升级](#架构升级)
2. [准备工作](#准备工作)
3. [前端集成](#前端集成)
4. [后端服务](#后端服务)
5. [完整流程](#完整流程)
6. [测试调试](#测试调试)

---

## 架构升级

### v1.0 vs v2.0 对比

| 特性 | v1.0 (单向) | v2.0 (双向) |
|------|-------------|-------------|
| 孩子输入 | HTTP 文字 | RTC 音频流 |
| AI 输出 | RTC 视频流 | RTC 视频流 |
| 延迟 | 高（多次转换） | 低（实时流） |
| 互动性 | 轮询式 | 真正实时对话 |
| ASR | 浏览器端 | 服务端实时识别 |

### 新架构图

```
┌─────────────────────────────────────────────────────────┐
│  孩子端（Web）                                           │
│                                                          │
│  🎤 麦克风 → RTC 音频发布 → 上传到房间                   │
│  👁️ RTC 视频订阅 ← 数字人视频 ← 下载从房间               │
└─────────────────────────────────────────────────────────┘
                          ↕ RTC 双向连接
┌─────────────────────────────────────────────────────────┐
│  AI 服务端                                               │
│                                                          │
│  🎧 订阅孩子音频流 → 实时 ASR → 文字                    │
│  🧠 豆包大模型 → 生成回应                                │
│  🎬 数字人 + TTS → 生成视频流                            │
│  📹 发布到 RTC 房间 → 推送给孩子端                       │
└─────────────────────────────────────────────────────────┘
```

---

## 准备工作

### 1. 开通火山云服务

#### 步骤 1：注册并开通 RTC
```
https://console.volcengine.com/rtc
→ 开通服务
→ 创建应用（English Friend）
→ 获取 AppID 和 AppKey
```

#### 步骤 2：开通语音识别 ASR
```
https://console.volcengine.com/speech
→ 开通语音识别服务
→ 获取 API Key
```

#### 步骤 3：开通豆包大模型
```
https://console.volcengine.com/ark
→ 创建密钥
→ 获取 Doubao API Key
```

---

### 2. 配置环境变量

创建 `.env` 文件（服务端目录）：
```bash
# 火山云 RTC 配置
VOLC_APP_ID=your_app_id
VOLC_APP_KEY=your_app_key

# 火山云 ASR 配置
VOLC_API_KEY=your_asr_key

# 豆包 API 配置
DOUBAO_API_KEY=your_doubao_key

# 服务端端口
PORT=3000
```

---

### 3. 安装依赖

```bash
cd english-roleplay/server

# 初始化
npm init -y

# 安装依赖
npm install express cors dotenv ws
```

---

## 前端集成

### 1. 修改 HTML - 增加麦克风控制

在 `index.html` 的画布界面中增加：

```html
<!-- 在 canvas-screen 底部增加 -->
<div class="audio-control-bar">
    <button id="mute-btn" onclick="toggleMute()" class="control-btn">
        🎤 静音
    </button>
    <div id="audio-level-indicator" class="audio-level">
        <div class="level-bar"></div>
    </div>
    <div id="recording-status" class="recording-status">
        🎙️ 正在听你说话...
    </div>
</div>
```

---

### 2. CSS 样式

```css
/* 音频控制栏 */
.audio-control-bar {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 15px;
    background: rgba(0, 0, 0, 0.6);
    padding: 10px 20px;
    border-radius: 30px;
    z-index: 100;
}

.control-btn {
    background: white;
    border: none;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 0.9em;
    cursor: pointer;
    transition: all 0.2s;
}

.control-btn:hover {
    background: #f0f0f0;
}

.control-btn.muted {
    background: #ff6b6b;
    color: white;
}

/* 音频电平指示器 */
.audio-level {
    width: 100px;
    height: 8px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    overflow: hidden;
}

.level-bar {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, #4CAF50, #8BC34A);
    transition: width 0.1s;
}

/* 录音状态 */
.recording-status {
    color: white;
    font-size: 0.85em;
    display: flex;
    align-items: center;
    gap: 5px;
}
```

---

### 3. 修改主应用 - 集成双向 RTC

在 `app.js` 中更新：

```javascript
// 全局配置
const VOLC_APP_ID = 'YOUR_APP_ID'; // 替换为你的 AppID
const WS_URL = 'ws://localhost:3000'; // WebSocket 地址

let wsConnection = null;
let currentSessionId = null;
let isMuted = false;

// 在 DOMContentLoaded 中初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化 RTC（启用双向音频）
    initRTCAvatar(VOLC_APP_ID, {
        asrEnabled: true
    });
    
    // 初始化 WebSocket 连接
    initWebSocket();
    
    // 其他初始化代码...
});

// 初始化 WebSocket 连接
function initWebSocket() {
    wsConnection = new WebSocket(WS_URL);
    
    wsConnection.onopen = function() {
        console.log('✅ WebSocket connected');
        
        // 发送初始化消息
        currentSessionId = 'session_' + Date.now();
        wsConnection.send(JSON.stringify({
            type: 'init',
            sessionId: currentSessionId
        }));
    };
    
    wsConnection.onmessage = function(event) {
        const data = JSON.parse(event.data);
        
        if (data.type === 'init_ok') {
            console.log('✅ Session initialized:', data.sessionId);
            currentSessionId = data.sessionId;
        }
        
        if (data.type === 'response') {
            // 收到 AI 回应
            handleAIResponse(data);
        }
        
        if (data.error) {
            console.error('❌ WebSocket error:', data.error);
        }
    };
    
    wsConnection.onerror = function(error) {
        console.error('❌ WebSocket error:', error);
    };
    
    wsConnection.onclose = function() {
        console.log('🔌 WebSocket disconnected');
        // 3 秒后重连
        setTimeout(initWebSocket, 3000);
    };
}

// 处理 AI 回应
async function handleAIResponse(data) {
    hideTyping();
    
    // 显示字幕
    document.getElementById('bubble-text').textContent = data.text;
    
    // 加入 RTC 房间观看数字人视频
    if (data.roomId && data.token) {
        await joinAvatarRoom(data.roomId, data.token, currentSessionId);
    }
}

// 切换静音
function toggleMute() {
    isMuted = !isMuted;
    
    const muteBtn = document.getElementById('mute-btn');
    const statusDiv = document.getElementById('recording-status');
    
    if (isMuted) {
        muteBtn.classList.add('muted');
        muteBtn.textContent = '🔇 已静音';
        statusDiv.textContent = '🔇 已静音';
        
        if (window.rtAvatarClient) {
            window.rtAvatarClient.muteLocalAudio(true);
        }
    } else {
        muteBtn.classList.remove('muted');
        muteBtn.textContent = '🎤 说话中';
        statusDiv.textContent = '🎙️ 正在听你说话...';
        
        if (window.rtAvatarClient) {
            window.rtAvatarClient.muteLocalAudio(false);
        }
    }
}

// 更新音频电平指示器
function updateAudioLevel(level) {
    const levelBar = document.querySelector('.level-bar');
    if (levelBar) {
        levelBar.style.width = Math.min(level, 100) + '%';
    }
}
```

---

### 4. 修改对话流程

```javascript
// 原来的 handleChildInput 改为通过 WebSocket 发送
async function handleChildInput(text) {
    if (!text || text.trim() === '') return;

    addChildMessage(text);
    document.getElementById('recording-status').textContent = '';

    // 显示"思考中"
    showTyping();

    // 通过 WebSocket 发送文字（降级方案）
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({
            type: 'text',
            text: text
        }));
    } else {
        // WebSocket 不可用时，降级到 HTTP
        fallbackToHTTP(text);
    }
}

// HTTP 降级方案
async function fallbackToHTTP(text) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                sessionId: currentSessionId,
                character: currentCharacter.id
            })
        });

        const data = await response.json();
        handleAIResponse(data);
    } catch (error) {
        console.error('❌ HTTP fallback error:', error);
        hideTyping();
    }
}
```

---

## 后端服务

### 1. 完整的服务端代码

服务端代码已更新为 `server/index.js`，支持：
- ✅ WebSocket 实时通信
- ✅ RTC 音频流接收
- ✅ 实时 ASR 语音识别
- ✅ 豆包对话生成
- ✅ 数字人视频推流

### 2. 启动服务

```bash
cd english-roleplay/server

# 方式 1：直接启动
node index.js

# 方式 2：使用 nodemon（开发推荐）
npm install -g nodemon
nodemon index.js
```

---

## 完整流程

### 对话流程时序图

```
孩子端                          WebSocket/AI 服务端                    RTC 房间
  │                                   │                                   │
  │─── 1. WebSocket 连接 ────────────>│                                   │
  │                                   │                                   │
  │<─── 2. Session ID 返回 ──────────│                                   │
  │                                   │                                   │
  │─── 3. 加入 RTC 房间 ─────────────>│─── 4. 创建房间 ─────────────────>│
  │                                   │                                   │
  │─── 5. 发布本地音频 ──────────────>│─── 6. 订阅孩子音频 ─────────────>│
  │                                   │                                   │
  │─── 7. 孩子说话 ──────────────────>│                                   │
  │                                   │                                   │
  │                                   │─── 8. 实时 ASR → 文字 ──────────>│
  │                                   │                                   │
  │                                   │─── 9. 豆包生成回应 ─────────────>│
  │                                   │                                   │
  │                                   │─── 10. 数字人生成视频 ──────────>│
  │                                   │                                   │
  │<── 11. 推送视频流 ───────────────│<─ 12. 推送到 RTC 房间 ────────────│
  │                                   │                                   │
  │  🎬 播放数字人视频                 │                                   │
```

---

### 代码示例：完整对话

```javascript
// 孩子端完整流程
async function startConversation() {
    // 1. 初始化 WebSocket
    initWebSocket();
    
    // 2. 等待 WebSocket 连接
    await waitForWebSocket();
    
    // 3. 加入 RTC 房间（双向）
    const response = await fetch('/api/create-room', {
        method: 'POST',
        body: JSON.stringify({ sessionId: currentSessionId })
    });
    
    const { roomId, token } = await response.json();
    
    // 4. 加入房间并发布本地音频
    await joinAvatarRoom(roomId, token, currentSessionId);
    
    console.log('✅ Full-duplex conversation ready');
}

// 等待 WebSocket 连接
function waitForWebSocket() {
    return new Promise((resolve) => {
        if (wsConnection.readyState === WebSocket.OPEN) {
            resolve();
        } else {
            wsConnection.addEventListener('open', () => resolve(), { once: true });
        }
    });
}
```

---

## 测试调试

### 1. 检查连接状态

打开浏览器控制台：

```javascript
// 检查 WebSocket
console.log('WebSocket:', wsConnection.readyState); // 1 = 已连接

// 检查 RTC
console.log('RTC Client:', window.rtAvatarClient?.client);

// 检查本地音频
console.log('Local Audio:', window.rtAvatarClient?.localTracks.audio);
```

---

### 2. 测试麦克风

```javascript
// 测试本地音频发布
async function testMicrophone() {
    if (!window.rtAvatarClient) {
        console.error('RTC client not initialized');
        return;
    }
    
    const level = window.rtAvatarClient.getLocalAudioLevel();
    console.log('🎤 Audio level:', level);
}

// 每 500ms 检测一次
setInterval(testMicrophone, 500);
```

---

### 3. 常见问题

**问题 1：麦克风权限被拒绝**
```
解决：浏览器地址栏 → 允许麦克风权限
```

**问题 2：WebSocket 连接失败**
```
解决：检查服务端是否启动，防火墙是否允许
```

**问题 3：听不到数字人声音**
```
解决：检查浏览器是否允许自动播放，音量是否打开
```

**问题 4：ASR 识别不准确**
```
解决：检查麦克风质量，环境噪音，语言设置（en-US vs zh-CN）
```

---

## 性能优化

### 1. 音频质量 vs 带宽

```javascript
// 优化音频编码
const audioConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 16000, // 降低采样率减少带宽
    channelCount: 1    // 单声道
};
```

### 2. 延迟优化

- 使用 WebSocket 代替 HTTP 轮询
- 流式 ASR（边说边识别）
- 流式 TTS（边生成边播放）

### 3. 成本优化

- 语音活动检测（VAD）：只在说话时发送音频
- 降低 ASR 调用频率
- 使用缓存减少重复请求

---

## 下一步

1. ✅ 完成前端双向 RTC 集成
2. ⏳ 配置火山云 ASR 服务
3. ⏳ 实现实时语音识别
4. ⏳ 集成火山数字人 API
5. ⏳ 端到端测试

---

**让对话真正"实时"起来！** 🐾
