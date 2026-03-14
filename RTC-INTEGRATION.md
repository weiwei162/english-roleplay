# 🔧 火山云 RTC 集成指南

**版本：** 1.0  
**日期：** 2026-03-13  
**目标：** 在现有应用中集成火山云 RTC，实现 AI 数字人视频流播放

---

## 📋 目录

1. [准备工作](#准备工作)
2. [前端集成](#前端集成)
3. [后端服务](#后端服务)
4. [完整示例](#完整示例)
5. [测试调试](#测试调试)

---

## 准备工作

### 1. 开通火山云服务

#### 步骤 1：注册账号
- 访问：https://www.volcengine.com/
- 注册并登录

#### 步骤 2：开通 RTC 服务
1. 进入控制台：https://console.volcengine.com/rtc
2. 点击"开通服务"
3. 创建应用
   - 应用名称：English Friend
   - 应用类型：娱乐社交
4. 获取 AppID

#### 步骤 3：获取凭证
```
控制台 → 应用管理 → 查看 AppID 和 AppKey
```

保存以下信息：
- `APP_ID` - 应用 ID
- `APP_KEY` - 应用密钥（用于生成 Token）

---

### 2. 配置环境变量

创建 `.env` 文件：
```bash
# 火山云 RTC 配置
VOLC_APP_ID=your_app_id
VOLC_APP_KEY=your_app_key

# 豆包 API 配置
DOUBAO_API_KEY=your_doubao_key

# 服务端端口
PORT=3000
```

---

## 前端集成

### 1. 安装 RTC SDK

```bash
# 方式 1：npm 安装
npm install ve-rtc

# 方式 2：CDN 引入（推荐简单测试）
<script src="https://sf1-cdn-tos.volccdn.com/obj/volcfe/ve-rtc/1.6.2/ve-rtc.min.js"></script>
```

### 2. 前端代码结构

```
english-roleplay/
├── index.html              # 主页面（增加视频容器）
├── css/style.css           # 样式（增加视频样式）
├── js/
│   ├── app.js              # 主逻辑
│   ├── rtc-client.js       # RTC 客户端（新增）
│   └── conversations.js    # 对话逻辑
└── server/                 # 后端服务（新增）
    ├── index.js            # 服务端入口
    └── rtc-token.js        # Token 生成
```

---

### 3. 修改 HTML - 增加视频容器

```html
<!-- 在 index.html 的画布界面中增加 -->
<div id="canvas-screen" class="screen">
    <div class="canvas-header">
        <!-- 头部保持不变 -->
    </div>
    
    <div class="canvas-container" id="canvas">
        <!-- 背景层 -->
        <div class="canvas-background" id="canvas-bg"></div>
        
        <!-- 角色层（动画版） -->
        <div class="character-layer">
            <div class="character-sprite" id="character-sprite">
                <div class="character-body">👩‍🏫</div>
                <div class="character-mouth"></div>
                <div class="character-shadow"></div>
            </div>
        </div>
        
        <!-- ⭐ 新增：RTC 视频层（数字人视频） -->
        <div class="rtc-video-layer" id="rtc-video-layer">
            <div class="video-container" id="avatar-video-container">
                <!-- 火山 RTC 视频将播放在这里 -->
            </div>
            <button class="toggle-video-btn" onclick="toggleVideoMode()">
                📹 切换模式
            </button>
        </div>
        
        <!-- 内容层 -->
        <div class="content-layer" id="content-layer"></div>
        
        <!-- 对话气泡 -->
        <div class="speech-bubble" id="speech-bubble">
            <div class="bubble-text" id="bubble-text">Hello!</div>
            <div class="bubble-cn" id="bubble-cn">你好！</div>
            <button class="speak-btn" onclick="speakCurrent()">🔊</button>
        </div>
    </div>
    
    <!-- 底部交互区保持不变 -->
</div>
```

---

### 4. 新增 CSS 样式

```css
/* rtc-video-layer - RTC 视频层 */
.rtc-video-layer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 15;
    display: none; /* 默认隐藏，切换到视频模式时显示 */
    background: rgba(0, 0, 0, 0.8);
}

.rtc-video-layer.active {
    display: flex;
    align-items: center;
    justify-content: center;
}

/* 视频容器 */
.video-container {
    width: 100%;
    max-width: 600px;
    aspect-ratio: 16/9;
    background: #000;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.video-container video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* 切换按钮 */
.toggle-video-btn {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(255, 255, 255, 0.9);
    border: none;
    padding: 10px 20px;
    border-radius: 25px;
    font-size: 1em;
    cursor: pointer;
    z-index: 20;
    transition: background 0.2s;
}

.toggle-video-btn:hover {
    background: white;
}

/* 加载动画 */
.video-loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 1.5em;
    text-align: center;
}

.video-loading::before {
    content: '⏳';
    display: block;
    font-size: 3em;
    margin-bottom: 10px;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0%, 100% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* 错误提示 */
.video-error {
    background: rgba(255, 0, 0, 0.8);
    padding: 20px;
    border-radius: 10px;
    color: white;
    text-align: center;
}
```

---

### 5. 创建 RTC 客户端模块

创建 `js/rtc-client.js`：

```javascript
// RTC 客户端模块
class RTCAvatarClient {
    constructor(options = {}) {
        this.appId = options.appId;
        this.client = null;
        this.localTracks = null;
        this.remoteUsers = new Map();
        this.onVideoReady = options.onVideoReady;
        this.onError = options.onError;
    }

    // 初始化 RTC 客户端
    async init() {
        try {
            // 检查 SDK 是否加载
            if (!window.VE_RTC) {
                throw new Error('RTC SDK not loaded');
            }

            this.client = VE_RTC.createClient({
                mode: 'live',
                codec: 'vp8',
                appId: this.appId
            });

            // 监听用户发布
            this.client.on('user-published', async (user, mediaType) => {
                console.log('User published:', user, mediaType);
                await this.subscribe(user, mediaType);
            });

            // 监听用户取消发布
            this.client.on('user-unpublished', (user, mediaType) => {
                console.log('User unpublished:', user, mediaType);
                this.unsubscribe(user, mediaType);
            });

            // 监听用户加入
            this.client.on('user-joined', (user) => {
                console.log('User joined:', user);
            });

            // 监听用户离开
            this.client.on('user-left', (user) => {
                console.log('User left:', user);
            });

            console.log('RTC client initialized');
        } catch (error) {
            console.error('Failed to init RTC:', error);
            if (this.onError) this.onError(error);
            throw error;
        }
    }

    // 加入 RTC 房间
    async join(roomId, token, uid = 'child_' + Date.now()) {
        try {
            if (!this.client) {
                await this.init();
            }

            await this.client.join({
                roomId: roomId,
                token: token,
                uid: uid
            });

            console.log('Joined room:', roomId);
        } catch (error) {
            console.error('Failed to join room:', error);
            if (this.onError) this.onError(error);
            throw error;
        }
    }

    // 订阅远端流（数字人视频）
    async subscribe(user, mediaType) {
        try {
            await this.client.subscribe(user, mediaType);

            if (mediaType === 'video') {
                const videoTrack = user.videoTrack;
                if (videoTrack) {
                    // 播放视频
                    videoTrack.play('avatar-video-container');
                    console.log('Video playing');
                    
                    if (this.onVideoReady) {
                        this.onVideoReady();
                    }
                }
            }

            if (mediaType === 'audio') {
                const audioTrack = user.audioTrack;
                if (audioTrack) {
                    audioTrack.play();
                    console.log('Audio playing');
                }
            }

            this.remoteUsers.set(user.uid, user);
        } catch (error) {
            console.error('Failed to subscribe:', error);
            if (this.onError) this.onError(error);
            throw error;
        }
    }

    // 取消订阅
    unsubscribe(user, mediaType) {
        this.remoteUsers.delete(user.uid);
        console.log('Unsubscribed from:', user.uid);
    }

    // 离开房间
    async leave() {
        try {
            if (this.localTracks) {
                this.localTracks.forEach(track => track.stop());
            }

            if (this.client) {
                await this.client.leave();
            }

            this.remoteUsers.clear();
            console.log('Left room');
        } catch (error) {
            console.error('Failed to leave room:', error);
            throw error;
        }
    }

    // 切换视频模式
    showVideo(show) {
        const videoLayer = document.getElementById('rtc-video-layer');
        const characterLayer = document.querySelector('.character-layer');

        if (show) {
            videoLayer.classList.add('active');
            if (characterLayer) characterLayer.style.display = 'none';
        } else {
            videoLayer.classList.remove('active');
            if (characterLayer) characterLayer.style.display = 'block';
        }
    }
}

// 全局实例
window.rtAvatarClient = null;

// 初始化函数
function initRTCAvatar(appId) {
    window.rtAvatarClient = new RTCAvatarClient({
        appId: appId,
        onVideoReady: () => {
            console.log('Video is ready!');
            hideLoading();
        },
        onError: (error) => {
            console.error('RTC Error:', error);
            showError(error.message);
        }
    });

    return window.rtAvatarClient;
}

// 加入房间并观看数字人
async function joinAvatarRoom(roomId, token) {
    if (!window.rtAvatarClient) {
        throw new Error('RTC client not initialized');
    }

    // 显示加载动画
    showLoading();

    // 加入房间
    await window.rtAvatarClient.join(roomId, token);

    // 切换到视频模式
    window.rtAvatarClient.showVideo(true);
}

// 离开房间
async function leaveAvatarRoom() {
    if (window.rtAvatarClient) {
        await window.rtAvatarClient.leave();
        window.rtAvatarClient.showVideo(false);
    }
}

// 切换视频模式
function toggleVideoMode() {
    if (window.rtAvatarClient) {
        const videoLayer = document.getElementById('rtc-video-layer');
        const isActive = videoLayer.classList.contains('active');
        window.rtAvatarClient.showVideo(!isActive);
    }
}

// 显示加载动画
function showLoading() {
    const container = document.getElementById('avatar-video-container');
    container.innerHTML = `
        <div class="video-loading">
            <div>AI 角色正在准备...</div>
            <div style="font-size: 0.7em; margin-top: 10px;">Loading AI Avatar...</div>
        </div>
    `;
}

// 显示错误
function showError(message) {
    const container = document.getElementById('avatar-video-container');
    container.innerHTML = `
        <div class="video-error">
            <div>❌ 视频加载失败</div>
            <div style="font-size: 0.8em; margin-top: 10px;">${message}</div>
            <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 16px; border-radius: 15px; border: none; background: white; cursor: pointer;">
                刷新页面
            </button>
        </div>
    `;
}
```

---

### 6. 修改主应用 - 集成 RTC

在 `app.js` 中增加 RTC 初始化：

```javascript
// 在文件开头添加
let rtcInitialized = false;
const VOLC_APP_ID = 'YOUR_APP_ID'; // 替换为你的 AppID

// 在 DOMContentLoaded 中初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化 RTC
    initRTC();
    
    // 其他初始化代码...
});

// RTC 初始化函数
async function initRTC() {
    if (rtcInitialized) return;

    try {
        // 动态加载 RTC SDK
        await loadRTCSdk();
        
        // 初始化 RTC 客户端
        initRTCAvatar(VOLC_APP_ID);
        
        rtcInitialized = true;
        console.log('RTC initialized');
    } catch (error) {
        console.error('Failed to init RTC:', error);
    }
}

// 动态加载 SDK
function loadRTCSdk() {
    return new Promise((resolve, reject) => {
        if (window.VE_RTC) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://sf1-cdn-tos.volccdn.com/obj/volcfe/ve-rtc/1.6.2/ve-rtc.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// 修改对话函数 - 使用 RTC 视频
async function handleChildInput(text) {
    if (!text || text.trim() === '') return;

    addChildMessage(text);
    document.getElementById('recording-status').textContent = '';

    // 显示"思考中"
    showTyping();

    try {
        // 调用后端获取 RTC 房间信息
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

        hideTyping();

        // 加入 RTC 房间观看数字人视频
        if (data.roomId && data.token) {
            await joinAvatarRoom(data.roomId, data.token);
        }

        // 显示字幕
        document.getElementById('bubble-text').textContent = data.text;
        document.getElementById('bubble-cn').textContent = '';

    } catch (error) {
        console.error('Chat error:', error);
        hideTyping();
        
        // 降级到动画版
        document.getElementById('bubble-text').textContent = "Let me think...";
        speak("Let me think...");
    }
}
```

---

## 后端服务

### 1. 创建服务端

创建 `server/index.js`：

```javascript
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 会话存储
const sessions = new Map();

// 生成 RTC Token
function generateRTCToken(roomId, uid = 'bot') {
    const appId = process.env.VOLC_APP_ID;
    const appKey = process.env.VOLC_APP_KEY;
    
    const now = Math.floor(Date.now() / 1000);
    const expire = now + 3600; // 1 小时有效
    
    const payload = {
        app_id: appId,
        room_id: roomId,
        uid: uid,
        expire: expire
    };
    
    const signature = crypto
        .createHmac('sha256', appKey)
        .update(JSON.stringify(payload))
        .digest('hex');
    
    return Buffer.from(JSON.stringify({
        ...payload,
        signature
    })).toString('base64');
}

// 调用豆包 API
async function callDoubaoAPI(messages) {
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DOUBAO_API_KEY}`
        },
        body: JSON.stringify({
            model: 'doubao-pro-32k',
            messages: messages
        })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
}

// 调用数字人 API（简化版 - 返回模拟数据）
async function generateAvatarVideo(text, character) {
    // TODO: 调用火山数字人 API
    // 这里先返回模拟的房间信息
    
    const roomId = `room_${Date.now()}`;
    const token = generateRTCToken(roomId);
    
    // 实际应该调用数字人 API 生成视频并推流
    // 这里模拟推流到 RTC 房间
    
    return {
        room_id: roomId,
        token: token,
        stream_url: `rtc://room/${roomId}`
    };
}

// 聊天接口
app.post('/api/chat', async (req, res) => {
    try {
        const { text, sessionId, character } = req.body;
        
        // 获取会话上下文
        let session = sessions.get(sessionId);
        if (!session) {
            session = { messages: [] };
            sessions.set(sessionId, session);
        }
        
        // 构建对话历史
        const messages = [
            {
                role: 'system',
                content: getCharacterPrompt(character)
            },
            ...session.messages,
            { role: 'user', content: text }
        ];
        
        // 调用豆包生成回应
        const reply = await callDoubaoAPI(messages);
        
        // 更新会话
        session.messages.push({ role: 'user', content: text });
        session.messages.push({ role: 'assistant', content: reply });
        
        // 生成数字人视频
        const videoData = await generateAvatarVideo(reply, character);
        
        // 返回结果
        res.json({
            text: reply,
            roomId: videoData.room_id,
            token: videoData.token
        });
        
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// 角色提示词
function getCharacterPrompt(character) {
    const prompts = {
        emma: `你是一位温柔的英语老师 Miss Emma，和 5 岁中国小朋友对话。
               引导他们说英语，句子要短，用词简单，多鼓励。`,
        tommy: `你是 Tommy，一个 5 岁的美国小男孩，和小朋友交朋友。
                用简单的英语聊天，活泼好动，喜欢玩游戏。`,
        lily: `你是 Lily，一个 7 岁的活泼小姐姐，带小朋友学英语。
               热情开朗，喜欢唱歌、画画、讲故事。`
    };
    return prompts[character] || prompts.emma;
}

// 启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

---

### 2. 安装依赖

```bash
cd server
npm init -y
npm install express cors dotenv crypto
```

---

### 3. 启动服务

```bash
# 方式 1：直接启动
node server/index.js

# 方式 2：使用 nodemon（开发推荐）
npm install -g nodemon
nodemon server/index.js
```

---

## 完整示例

### 简化测试版（先不用数字人）

如果暂时没有数字人 API，可以先测试 RTC 推流：

```javascript
// 前端测试代码
async function testRTC() {
    // 1. 初始化
    const client = initRTCAvatar('YOUR_APP_ID');
    
    // 2. 创建测试房间
    const roomId = 'test_room_' + Date.now();
    
    // 3. 获取 Token（需要后端）
    const response = await fetch('/api/create-room', {
        method: 'POST',
        body: JSON.stringify({ roomId })
    });
    const { token } = await response.json();
    
    // 4. 加入房间
    await client.join(roomId, token);
    
    // 5. 等待视频（需要另一端推流）
    console.log('Waiting for video...');
}
```

---

## 测试调试

### 1. 检查 SDK 加载

打开浏览器控制台：
```javascript
console.log(window.VE_RTC);
// 应该输出 RTC SDK 对象
```

### 2. 测试加入房间

```javascript
joinAvatarRoom('test_room', 'test_token');
// 检查控制台日志
```

### 3. 常见问题

**问题 1：SDK 加载失败**
```
解决：检查网络，使用国内 CDN
```

**问题 2：Token 无效**
```
解决：检查 AppKey 是否正确，时间戳是否过期
```

**问题 3：视频不播放**
```
解决：检查另一端是否推流，浏览器是否允许自动播放
```

---

## 下一步

1. ✅ 完成前端 RTC 集成
2. ⏳ 开通火山数字人 API
3. ⏳ 实现后端推流逻辑
4. ⏳ 联调测试

---

**先完成前端集成，后端可以用模拟数据测试！** 🐾
