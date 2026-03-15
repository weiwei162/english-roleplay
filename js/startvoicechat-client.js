/**
 * StartVoiceChat 前端客户端（正确流程）
 * 集成火山引擎 StartVoiceChat API
 * 文档：https://www.volcengine.com/docs/6348/1558163
 * 
 * 正确流程：
 * 1. 前端创建 RTC 房间并加入
 * 2. 开启本地音视频采集
 * 3. 订阅和播放房间内音视频流
 * 4. 调用后端接口将 AI 角色加入 RTC 房间
 * 5. 结束时调用后端接口结束 AI 对话，然后离开并销毁房间
 */

class StartVoiceChatClient {
    constructor(options = {}) {
        this.appId = options.appId; // 从前端配置获取
        this.roomId = null;
        this.taskId = null;
        this.character = null;
        this.engine = null;
        this.localUserId = null;
        this.remoteUsers = new Map();
        this.isRoomCreated = false;
        this.isAIJoined = false;
        
        // 回调
        this.onReady = options.onReady || (() => {});
        this.onError = options.onError || (() => {});
        this.onStatusChange = options.onStatusChange || (() => {});
        this.onAIJoined = options.onAIJoined || (() => {});
        this.onRemoteStream = options.onRemoteStream || (() => {});
    }

    /**
     * 步骤 1: 创建 RTC 房间（前端创建）
     * 
     * @param {string} roomId - 房间 ID（前端生成）
     * @param {Object} options - 可选配置
     * @param {string} options.appId - RTC AppId（可选，从后端获取）
     * @param {boolean} options.fetchConfig - 是否从后端获取配置（默认 true）
     */
    async createRoom(roomId, options = {}) {
        console.log('🏠 [1/5] Creating RTC room (frontend)...', { roomId });
        
        try {
            this.roomId = roomId;
            
            // 步骤 1: 从后端获取配置（推荐方式）
            if (options.fetchConfig !== false) {
                await this.fetchConfig();
            }
            
            // 使用传入的 AppId 或从配置获取
            this.appId = options.appId || this.appId;
            
            if (!this.appId) {
                throw new Error('AppId is required. Provide it or ensure /api/config is configured.');
            }
            
            // 步骤 2: 初始化 RTC 引擎
            await this.initRTC();
            
            // 步骤 3: 生成用户 ID
            this.localUserId = `child_${Date.now()}`;
            
            // 步骤 4: 从后端获取 Token（推荐方式）
            const token = await this.fetchToken(this.roomId, this.localUserId);
            
            // 步骤 5: 加入房间
            await this.joinRoom(token);
            
            // 步骤 6: 开启本地音视频采集
            await this.startLocalCapture();
            
            this.isRoomCreated = true;
            
            console.log('✅ [1/5] RTC room created and joined');
            this.onStatusChange('room_created', '房间已创建');
            
            return { roomId: this.roomId, userId: this.localUserId, appId: this.appId };
            
        } catch (error) {
            console.error('❌ Failed to create room:', error);
            this.onError(error);
            throw error;
        }
    }

    /**
     * 从后端获取配置
     */
    async fetchConfig() {
        console.log('📥 Fetching config from backend...');
        
        try {
            const response = await fetch('/api/config');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.config) {
                this.appId = data.config.appId;
                console.log('✅ Config fetched:', { appId: this.appId, aiMode: data.config.aiMode });
            } else {
                throw new Error('Invalid config response');
            }
            
        } catch (error) {
            console.error('❌ Failed to fetch config:', error);
            throw error;
        }
    }

    /**
     * 从后端获取 Token
     */
    async fetchToken(roomId, uid) {
        console.log('📥 Fetching token from backend...', { roomId, uid });
        
        try {
            const response = await fetch(`/api/token?roomId=${encodeURIComponent(roomId)}&uid=${encodeURIComponent(uid)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.token) {
                console.log('✅ Token fetched, expires in:', data.expireIn, 'seconds');
                return data.token;
            } else {
                throw new Error('Invalid token response');
            }
            
        } catch (error) {
            console.error('❌ Failed to fetch token:', error);
            // 降级：前端生成 Token（简化版，生产环境不推荐）
            console.warn('⚠️ Falling back to client-side token generation');
            return this.generateToken(roomId, uid);
        }
    }

    /**
     * 步骤 2: 调用后端 API 将 AI 角色加入房间
     * 
     * @param {string} character - 角色 ID（emma/tommy/lily 等）
     */
    async joinAI(character) {
        console.log('🤖 [2/5] Joining AI character to room...', { character, roomId: this.roomId });
        
        try {
            // 调用后端 API，将 AI 加入已创建的 RTC 房间
            const response = await fetch('/api/join-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId: this.roomId,
                    character: character,
                    targetUserId: this.localUserId // 告诉 AI 要对话的用户
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            console.log('✅ [2/5] AI joined room:', data);
            
            this.taskId = data.taskId;
            this.character = character;
            this.isAIJoined = true;
            
            // 触发 AI 已加入回调
            this.onAIJoined({
                character: character,
                taskId: data.taskId,
                aiMode: data.aiMode
            });
            
            this.onStatusChange('ai_joined', 'AI 角色已加入');
            
            return data;
            
        } catch (error) {
            console.error('❌ Failed to join AI:', error);
            this.onError(error);
            throw error;
        }
    }

    /**
     * 步骤 3: 初始化 RTC 引擎
     */
    async initRTC() {
        return new Promise((resolve, reject) => {
            if (!window.VERTC) {
                console.warn('⚠️ RTC SDK not loaded, waiting...');
                
                const checkInterval = setInterval(() => {
                    if (window.VERTC) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                
                setTimeout(() => {
                    clearInterval(checkInterval);
                    reject(new Error('RTC SDK load timeout'));
                }, 10000);
                
                return;
            }
            
            resolve();
        });
    }

    /**
     * 步骤 4: 加入 RTC 房间
     */
    async joinRoom(token) {
        console.log('🔌 Joining RTC room:', this.roomId, 'as', this.localUserId);
        
        try {
            // 创建引擎
            this.engine = window.VERTC.createEngine(this.appId);
            
            // 设置日志级别
            this.engine.setLogLevel(window.VERTC.LogLevel.Info);
            
            // 监听事件
            this.setupEventListeners();
            
            // 加入房间
            await this.engine.joinRoom(
                token,
                this.roomId,
                { userId: this.localUserId },
                {
                    isAutoPublish: true, // 自动发布本地流
                    isAutoSubscribeAudio: true, // 自动订阅音频
                    isAutoSubscribeVideo: true, // 自动订阅视频
                    roomProfileType: window.VERTC.RoomProfileType.communication
                }
            );
            
            console.log('✅ Joined RTC room:', this.roomId);
            
        } catch (error) {
            console.error('❌ Failed to join room:', error);
            this.onStatusChange('error', '连接失败：' + error.message);
            throw error;
        }
    }

    /**
     * 步骤 5: 开启本地音视频采集
     */
    async startLocalCapture() {
        console.log('🎤 Starting local audio capture...');
        
        try {
            if (!this.engine) {
                throw new Error('Engine not initialized');
            }
            
            // 开启音频采集
            await this.engine.startAudioCapture();
            console.log('✅ Local audio capture started');
            
            // 可选：开启视频采集（如果需要）
            // await this.engine.startVideoCapture();
            
            this.onStatusChange('local_ready', '本地音视频已就绪');
            
        } catch (error) {
            console.error('❌ Failed to start local capture:', error);
            throw error;
        }
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        if (!this.engine) return;
        
        // 用户加入
        this.engine.on(window.VERTC.events.onUserJoin, (e) => {
            console.log('👤 User joined:', e.userId);
            
            // 如果是 AI 角色加入
            if (e.userId.startsWith('ai_')) {
                console.log('✅ AI character joined:', e.userId);
            }
        });
        
        // 用户发布流
        this.engine.on(window.VERTC.events.onUserPublishStream, async (e) => {
            const { userId, mediaType } = e;
            console.log('📥 User published stream:', userId, mediaType);
            
            try {
                // 订阅流
                await this.engine.subscribeStream(userId, {
                    audio: true,
                    video: mediaType === 2 // 视频流
                });
                
                console.log('✅ Subscribed to', userId, 'audio/video');
                
                // 如果是远端用户的流（不是自己）
                if (userId !== this.localUserId) {
                    this.remoteUsers.set(userId, { userId, mediaType });
                    
                    // 如果是视频流，设置播放器
                    if (mediaType === 2) {
                        this.setupRemoteVideo(userId);
                    }
                    
                    // 触发远端流回调
                    this.onRemoteStream({ userId, mediaType });
                }
                
            } catch (error) {
                console.error('❌ Subscribe error:', error);
            }
        });
        
        // 用户取消发布
        this.engine.on(window.VERTC.events.onUserUnPublishStream, (e) => {
            console.log('📴 User unpublished stream:', e.userId);
            this.remoteUsers.delete(e.userId);
        });
        
        // 用户离开
        this.engine.on(window.VERTC.events.onUserLeave, (e) => {
            console.log('👋 User left:', e.userId);
            this.remoteUsers.delete(e.userId);
            
            // 如果是 AI 离开
            if (e.userId.startsWith('ai_')) {
                console.log('⚠️ AI character left');
                this.onStatusChange('ai_left', 'AI 角色已离开');
            }
        });
        
        // 错误处理
        this.engine.on(window.VERTC.events.onError, (e) => {
            console.error('❌ RTC Error:', e.code, e.message);
            this.onStatusChange('error', `错误：${e.message}`);
            this.onError(new Error(e.message));
        });
        
        // 音频数据（可选：用于音量检测）
        this.engine.on(window.VERTC.events.onAudioData, (e) => {
            // 可以在这里处理接收到的音频数据
            // console.log('🎵 Audio data from', e.userId, ':', e.data.byteLength, 'bytes');
        });
    }

    /**
     * 设置远端视频播放器
     */
    setupRemoteVideo(userId) {
        const player = document.getElementById('avatar-video-container');
        if (!player) {
            console.warn('⚠️ Video container not found');
            return;
        }
        
        try {
            this.engine.setRemoteVideoPlayer(
                window.VERTC.StreamIndex.STREAM_INDEX_MAIN,
                {
                    userId: userId,
                    renderDom: player
                }
            );
            
            console.log('📺 Remote video setup for', userId);
            
            // 隐藏加载动画
            const loading = player.querySelector('.video-loading');
            if (loading) loading.remove();
            
        } catch (error) {
            console.error('❌ Failed to setup remote video:', error);
        }
    }

    /**
     * 步骤 6: 结束 AI 对话并离开房间
     * 
     * 流程：
     * 1. 调用后端 API 结束 AI 对话
     * 2. 离开 RTC 房间
     * 3. 销毁引擎
     */
    async leave() {
        console.log('👋 [1/3] Leaving StartVoiceChat room...');
        
        try {
            // 1. 调用后端结束 AI 对话
            if (this.roomId && this.taskId) {
                console.log('🤖 [2/3] Stopping AI conversation...');
                await fetch('/api/leave-room', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        roomId: this.roomId,
                        taskId: this.taskId
                    })
                });
                console.log('✅ AI conversation stopped');
            }
            
            // 2. 离开 RTC 房间
            if (this.engine) {
                console.log('🚪 [3/3] Leaving RTC room...');
                await this.engine.leaveRoom();
                console.log('✅ Left RTC room');
            }
            
            // 3. 销毁引擎
            if (this.engine) {
                window.VERTC.destroyEngine(this.engine);
                this.engine = null;
                console.log('✅ Engine destroyed');
            }
            
            this.remoteUsers.clear();
            this.isRoomCreated = false;
            this.isAIJoined = false;
            
            this.onStatusChange('disconnected', '已断开连接');
            
        } catch (error) {
            console.error('❌ Failed to leave room:', error);
            throw error;
        }
    }

    /**
     * 静音/取消静音本地音频
     */
    muteLocalAudio(muted) {
        if (!this.engine) return;
        
        try {
            if (muted) {
                this.engine.muteLocalAudio();
                console.log('🔇 Local audio muted');
            } else {
                this.engine.unmuteLocalAudio();
                console.log('🎤 Local audio unmuted');
            }
        } catch (error) {
            console.error('❌ Mute error:', error);
        }
    }

    /**
     * 获取本地音频音量
     */
    getLocalAudioLevel() {
        // TODO: 实现音量检测
        return 0;
    }

    /**
     * 显示/隐藏视频
     */
    showVideo(show) {
        const videoLayer = document.getElementById('rtc-video-layer');
        const characterLayer = document.querySelector('.character-layer');
        
        if (!videoLayer) return;
        
        if (show) {
            videoLayer.classList.add('active');
            if (characterLayer) characterLayer.style.display = 'none';
        } else {
            videoLayer.classList.remove('active');
            if (characterLayer) characterLayer.style.display = 'block';
        }
    }

    /**
     * 生成 RTC Token（前端生成，简化版）
     * 注意：生产环境应该后端生成
     */
    generateToken(roomId, uid, expireSeconds = 3600) {
        // 简单实现：使用固定 token 或调用后端 API 获取
        // 这里假设后端提供了一个获取 token 的接口
        
        // 实际应该调用后端：GET /api/token?roomId=xxx&uid=xxx
        // 返回真正的 token
        
        // 临时方案：返回空字符串，让后端验证
        return '';
    }
}

// ==================== 全局实例和辅助函数 ====================

window.StartVoiceChatClient = StartVoiceChatClient;
window.currentVoiceChat = null;

/**
 * 创建 RTC 房间并加入（前端创建）
 */
async function createStartVoiceChatRoom(roomId, appId, options = {}) {
    window.currentVoiceChat = new StartVoiceChatClient({
        appId: appId,
        onReady: options.onReady || (() => {
            console.log('✅ Room created and ready');
        }),
        onError: options.onError || ((error) => {
            console.error('❌ Voice chat error:', error);
        }),
        onStatusChange: options.onStatusChange || ((status, text) => {
            updateRTCStatus(status, text);
        }),
        onAIJoined: options.onAIJoined || ((info) => {
            console.log('✅ AI joined:', info);
            hideVideoLoading();
        }),
        onRemoteStream: options.onRemoteStream || ((stream) => {
            console.log('📥 Remote stream:', stream);
        })
    });
    
    try {
        // 步骤 1: 创建房间并加入
        await window.currentVoiceChat.createRoom(roomId, appId);
        
        return window.currentVoiceChat;
    } catch (error) {
        console.error('❌ Failed to create room:', error);
        throw error;
    }
}

/**
 * 将 AI 角色加入房间
 */
async function joinAICharacter(character) {
    if (!window.currentVoiceChat) {
        throw new Error('Room not created');
    }
    
    try {
        // 步骤 2: 调用后端 API 将 AI 加入
        await window.currentVoiceChat.joinAI(character);
        
    } catch (error) {
        console.error('❌ Failed to join AI:', error);
        throw error;
    }
}

/**
 * 离开房间并销毁
 */
async function leaveStartVoiceChatRoom() {
    if (window.currentVoiceChat) {
        try {
            await window.currentVoiceChat.leave();
            window.currentVoiceChat = null;
            console.log('✅ Left and destroyed room');
        } catch (error) {
            console.error('❌ Failed to leave room:', error);
        }
    }
}

/**
 * 更新 RTC 状态显示
 */
function updateRTCStatus(status, text) {
    const rtcStatus = document.getElementById('rtc-status');
    if (!rtcStatus) return;
    
    rtcStatus.className = 'rtc-status ' + status;
    rtcStatus.textContent = text;
    
    console.log('📊 RTC Status:', status, '-', text);
}

/**
 * 显示视频加载动画
 */
function showVideoLoading() {
    const container = document.getElementById('avatar-video-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="video-loading">
            <div>⏳ AI 角色正在准备...</div>
            <div style="font-size: 0.7em; margin-top: 10px;">Loading AI Avatar...</div>
        </div>
    `;
}

/**
 * 隐藏视频加载动画
 */
function hideVideoLoading() {
    const container = document.getElementById('avatar-video-container');
    if (!container) return;
    
    const loading = container.querySelector('.video-loading');
    if (loading) loading.remove();
}

/**
 * 显示视频错误
 */
function showVideoError(message) {
    const container = document.getElementById('avatar-video-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="video-error">
            <div>⚠️ 视频模式不可用</div>
            <div style="font-size: 0.8em; margin-top: 10px;">${message}</div>
            <div style="font-size: 0.7em; margin-top: 5px;">使用动画模式</div>
        </div>
    `;
}

/**
 * 切换视频模式
 */
function toggleVideoMode() {
    if (window.currentVoiceChat) {
        const videoLayer = document.getElementById('rtc-video-layer');
        const isActive = videoLayer.classList.contains('active');
        window.currentVoiceChat.showVideo(!isActive);
    }
}

/**
 * 切换静音
 */
function toggleMute() {
    const isMuted = document.getElementById('mute-btn').classList.contains('muted');
    
    if (window.currentVoiceChat) {
        window.currentVoiceChat.muteLocalAudio(!isMuted);
    }
    
    const muteBtn = document.getElementById('mute-btn');
    const rtcStatus = document.getElementById('rtc-status');
    
    if (!isMuted) {
        muteBtn.classList.add('muted');
        muteBtn.innerHTML = '🔇 已静音';
        rtcStatus.textContent = '🔇 已静音';
    } else {
        muteBtn.classList.remove('muted');
        muteBtn.innerHTML = '🎤 说话中';
        rtcStatus.textContent = '🟢 连接中';
    }
}

// 导出全局函数
window.createStartVoiceChatRoom = createStartVoiceChatRoom;
window.joinAICharacter = joinAICharacter;
window.leaveStartVoiceChatRoom = leaveStartVoiceChatRoom;
window.toggleVideoMode = toggleVideoMode;
window.toggleMute = toggleMute;
window.updateRTCStatus = updateRTCStatus;
window.showVideoLoading = showVideoLoading;
window.hideVideoLoading = hideVideoLoading;
window.showVideoError = showVideoError;

console.log('✅ StartVoiceChat client loaded (correct flow)');
