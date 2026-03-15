/**
 * StartVoiceChat 前端客户端
 * 集成火山引擎 StartVoiceChat API
 * 文档：https://www.volcengine.com/docs/6348/1558163
 */

class StartVoiceChatClient {
    constructor(options = {}) {
        this.appId = null;
        this.roomId = null;
        this.taskId = null;
        this.character = null;
        this.engine = null;
        this.targetUserId = 'child_user';
        
        // 回调
        this.onReady = options.onReady || (() => {});
        this.onError = options.onError || (() => {});
        this.onStatusChange = options.onStatusChange || (() => {});
    }

    /**
     * 创建房间并启动 AI 对话
     */
    async createRoom(roomId, character) {
        console.log('🏠 Creating StartVoiceChat room...', { roomId, character });
        
        try {
            // 1. 调用后端 API 创建房间
            const response = await fetch('/api/create-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId,
                    character
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            console.log('✅ Room created:', data);
            
            // 保存会话信息
            this.appId = data.appId;
            this.roomId = data.roomId;
            this.taskId = data.taskId;
            this.character = data.character;
            
            // 2. 初始化 RTC 引擎
            await this.initRTC();
            
            // 3. 加入 RTC 房间
            await this.joinRoom(data.token);
            
            // 4. 触发就绪回调
            this.onReady({
                roomId: this.roomId,
                taskId: this.taskId,
                character: this.character,
                aiMode: data.aiMode
            });
            
            return data;
            
        } catch (error) {
            console.error('❌ Failed to create room:', error);
            this.onError(error);
            throw error;
        }
    }

    /**
     * 初始化 RTC 引擎
     */
    async initRTC() {
        return new Promise((resolve, reject) => {
            // 检查 SDK 是否加载
            if (!window.VERTC) {
                console.warn('⚠️ RTC SDK not loaded, waiting...');
                
                // 等待 SDK 加载
                const checkInterval = setInterval(() => {
                    if (window.VERTC) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                
                // 超时
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
     * 加入 RTC 房间
     */
    async joinRoom(token) {
        try {
            console.log('🔌 Joining RTC room:', this.roomId);
            
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
                { userId: this.targetUserId },
                {
                    isAutoPublish: false,
                    isAutoSubscribeAudio: true,
                    isAutoSubscribeVideo: true,
                    roomProfileType: window.VERTC.RoomProfileType.communication
                }
            );
            
            console.log('✅ Joined RTC room:', this.roomId);
            
            // 更新状态
            this.onStatusChange('connected', '已连接到 AI 角色');
            
        } catch (error) {
            console.error('❌ Failed to join room:', error);
            this.onStatusChange('error', '连接失败：' + error.message);
            throw error;
        }
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        if (!this.engine) return;
        
        // 用户发布流
        this.engine.on(window.VERTC.events.onUserPublishStream, async (e) => {
            console.log('📥 User published stream:', e.userId, e.mediaType);
            
            try {
                // 订阅音频
                await this.engine.subscribeStream(e.userId, {
                    audio: true,
                    video: e.mediaType === 2 // 如果是视频流
                });
                
                console.log('✅ Subscribed to', e.userId, 'audio/video');
                
                // 如果是 AI 角色的流，设置视频播放器
                if (e.userId !== this.targetUserId && e.mediaType === 2) {
                    this.setupRemoteVideo(e.userId);
                }
                
            } catch (error) {
                console.error('❌ Subscribe error:', error);
            }
        });
        
        // 用户取消发布
        this.engine.on(window.VERTC.events.onUserUnPublishStream, (e) => {
            console.log('📴 User unpublished stream:', e.userId);
        });
        
        // 用户加入
        this.engine.on(window.VERTC.events.onUserJoin, (e) => {
            console.log('👤 User joined:', e.userId);
            this.onStatusChange('connected', 'AI 角色已加入');
        });
        
        // 用户离开
        this.engine.on(window.VERTC.events.onUserLeave, (e) => {
            console.log('👋 User left:', e.userId);
            if (e.userId !== this.targetUserId) {
                this.onStatusChange('disconnected', 'AI 角色已离开');
            }
        });
        
        // 错误处理
        this.engine.on(window.VERTC.events.onError, (e) => {
            console.error('❌ RTC Error:', e.code, e.message);
            this.onStatusChange('error', `错误：${e.message}`);
            this.onError(new Error(e.message));
        });
        
        // 音频数据（可选：用于实时音量检测）
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
     * 离开房间
     */
    async leave() {
        console.log('👋 Leaving StartVoiceChat room...');
        
        try {
            if (this.engine) {
                await this.engine.leaveRoom();
                console.log('✅ Left room');
            }
            
            this.engine = null;
            this.onStatusChange('disconnected', '已断开连接');
            
        } catch (error) {
            console.error('❌ Failed to leave room:', error);
            throw error;
        }
    }

    /**
     * 静音/取消静音
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
}

// ==================== 全局实例 ====================

window.StartVoiceChatClient = StartVoiceChatClient;
window.currentVoiceChat = null;

/**
 * 创建并加入 AI 语音聊天房间
 */
async function createStartVoiceChatRoom(roomId, character, options = {}) {
    window.currentVoiceChat = new StartVoiceChatClient({
        onReady: options.onReady || (() => {
            console.log('✅ AI voice chat ready');
            hideVideoLoading();
        }),
        onError: options.onError || ((error) => {
            console.error('❌ Voice chat error:', error);
            showVideoError(error.message);
        }),
        onStatusChange: options.onStatusChange || ((status, text) => {
            updateRTCStatus(status, text);
        })
    });
    
    try {
        await window.currentVoiceChat.createRoom(roomId, character);
        return window.currentVoiceChat;
    } catch (error) {
        console.error('❌ Failed to create voice chat room:', error);
        throw error;
    }
}

/**
 * 离开 AI 语音聊天房间
 */
async function leaveStartVoiceChatRoom() {
    if (window.currentVoiceChat) {
        try {
            await window.currentVoiceChat.leave();
            
            // 调用后端结束 AI 对话
            if (window.currentVoiceChat.roomId) {
                await fetch('/api/leave-room', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId: window.currentVoiceChat.roomId })
                });
            }
            
            window.currentVoiceChat = null;
            console.log('✅ Left voice chat room');
            
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
window.leaveStartVoiceChatRoom = leaveStartVoiceChatRoom;
window.toggleVideoMode = toggleVideoMode;
window.toggleMute = toggleMute;
window.updateRTCStatus = updateRTCStatus;

console.log('✅ StartVoiceChat client loaded');
