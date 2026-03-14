// RTC 客户端模块 - 火山云数字人视频播放 + 双向音频流
// 基于火山引擎 RTC Web SDK 官方文档
// 支持：孩子音频上传 + 数字人视频/音频下载
class RTCAvatarClient {
    constructor(options = {}) {
        this.appId = options.appId;
        this.engine = null;
        this.localUserId = null;
        this.remoteUsers = new Map();
        this.onVideoReady = options.onVideoReady;
        this.onError = options.onError;
        this.onLocalAudioPublished = options.onLocalAudioPublished;
        this.asrEnabled = options.asrEnabled || false;
    }

    // 初始化 RTC 引擎（官方 API：createEngine）
    async init() {
        try {
            // 检查 SDK 是否加载
            if (!window.VERTC) {
                throw new Error('RTC SDK not loaded');
            }

            // 使用官方推荐的 createEngine API
            this.engine = window.VERTC.createEngine(this.appId);

            // 监听事件（官方 API）
            this.engine.on(window.VERTC.events.onUserPublishStream, this.handleUserPublishStream.bind(this));
            this.engine.on(window.VERTC.events.onUserUnPublishStream, this.handleUserUnpublishStream.bind(this));
            this.engine.on(window.VERTC.events.onUserJoin, this.handleUserJoin.bind(this));
            this.engine.on(window.VERTC.events.onUserLeave, this.handleUserLeave.bind(this));

            console.log('✅ RTC engine initialized');
        } catch (error) {
            console.error('❌ Failed to init RTC engine:', error);
            if (this.onError) this.onError(error);
            throw error;
        }
    }

    // 加入 RTC 房间（官方 API：joinRoom）
    async join(roomId, token, uid = 'child_' + Date.now(), options = {}) {
        try {
            if (!this.engine) {
                await this.init();
            }

            this.localUserId = uid;

            // 官方 API：joinRoom
            await this.engine.joinRoom(
                token,
                roomId,
                {
                    userId: uid
                },
                {
                    isAutoPublish: true, // 自动发布本地流
                    isAutoSubscribeAudio: true, // 自动订阅音频
                    isAutoSubscribeVideo: true, // 自动订阅视频
                    roomProfileType: window.VE_RTC?.RoomProfileType?.communication || 
                                    window.VERTC?.RoomProfileType?.communication
                }
            );

            console.log('✅ Joined room:', roomId, 'as', uid);

            // 开启本地音视频采集
            if (options.publishAudio !== false) {
                await this.startLocalCapture();
            }

            return uid;
        } catch (error) {
            console.error('❌ Failed to join room:', error);
            if (this.onError) this.onError(error);
            throw error;
        }
    }

    // 开启本地音视频采集（官方 API：startAudioCapture/startVideoCapture）
    async startLocalCapture() {
        try {
            // 开启音频采集
            await this.engine.startAudioCapture();
            console.log('🎤 Local audio capture started');

            // 设置本地视频播放器（如果有视频）
            const localPlayer = document.getElementById('local-player');
            if (localPlayer) {
                this.engine.setLocalVideoPlayer(window.VERTC.StreamIndex.STREAM_INDEX_MAIN, {
                    renderDom: 'local-player'
                });
            }

            if (this.onLocalAudioPublished) {
                this.onLocalAudioPublished();
            }

            // ⭐ 可选：实时 ASR（从采集的音频流中获取数据）
            if (this.asrEnabled) {
                this.startRealtimeASR();
            }

        } catch (error) {
            console.error('❌ Failed to start local capture:', error);
            if (this.onError) this.onError(error);
        }
    }

    // 停止本地采集
    async stopLocalCapture() {
        try {
            await this.engine.stopAudioCapture();
            await this.engine.stopVideoCapture();
            console.log('🔇 Local capture stopped');
        } catch (error) {
            console.error('Failed to stop local capture:', error);
        }
    }

    // 实时 ASR（将音频流发送到语音识别）
    startRealtimeASR(audioTrack) {
        console.log('🎙️ Starting realtime ASR...');
        
        // 获取音频流
        const mediaStream = audioTrack.getMediaStream();
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(mediaStream);
        const analyser = audioContext.createAnalyser();
        source.connect(analyser);

        // 检测音量（用于判断是否有人说话）
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const detectSpeech = () => {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
            
            // 音量超过阈值，认为在说话
            if (average > 30) {
                console.log('🗣️ Speech detected:', average.toFixed(1));
                // TODO: 将音频块发送到 ASR 服务
            }

            requestAnimationFrame(detectSpeech);
        };

        detectSpeech();
    }

    // 处理远端用户发布流（官方事件回调）
    async handleUserPublishStream(e) {
        const { userId, mediaType } = e;
        console.log('📥 User published stream:', userId, mediaType);

        try {
            // 设置远端视频播放器
            const player = document.querySelector('#avatar-video-container');
            if (player) {
                await this.engine.setRemoteVideoPlayer(
                    window.VERTC.StreamIndex.STREAM_INDEX_MAIN,
                    {
                        userId: userId,
                        renderDom: player
                    }
                );
                console.log('📺 Remote video playing');
                
                if (this.onVideoReady) {
                    this.onVideoReady();
                }
            }
            
            this.remoteUsers.set(userId, { userId, mediaType });
        } catch (error) {
            console.error('❌ Failed to setup remote player:', error);
        }
    }

    // 处理远端用户取消发布
    handleUserUnpublishStream(e) {
        const { userId } = e;
        console.log('📴 User unpublished stream:', userId);
        this.remoteUsers.delete(userId);
    }

    // 处理用户加入
    handleUserJoin(e) {
        const { userId } = e;
        console.log('👤 User joined:', userId);
    }

    // 处理用户离开
    handleUserLeave(e) {
        const { userId } = e;
        console.log('👋 User left:', userId);
        this.remoteUsers.delete(userId);
    }

    // 离开房间（官方 API：leaveRoom）
    async leave() {
        try {
            // 停止本地采集
            await this.stopLocalCapture();

            // 离开房间
            if (this.engine) {
                await this.engine.leaveRoom();
                console.log('👋 Left room');
            }

            this.remoteUsers.clear();
        } catch (error) {
            console.error('❌ Failed to leave room:', error);
            throw error;
        }
    }

    // 静音/取消静音本地麦克风
    muteLocalAudio(muted) {
        if (this.localTracks.audio) {
            this.localTracks.audio.setEnabled(!muted);
            console.log('🔇 Local audio', muted ? 'muted' : 'unmuted');
        }
    }

    // 获取本地音频音量
    getLocalAudioLevel() {
        if (!this.localTracks.audio) return 0;
        // TODO: 实现音量检测
        return 0;
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

// ==================== 全局实例和辅助函数 ====================

window.rtAvatarClient = null;
window.currentSessionId = null;

// 初始化函数（使用官方 VERTC 全局对象）
function initRTCAvatar(appId, options = {}) {
    // 检查 SDK 是否可用
    if (!window.VERTC) {
        console.warn('⚠️ RTC SDK not available, using animation mode');
        window.rtAvatarClient = null;
        return null;
    }

    window.rtAvatarClient = new RTCAvatarClient({
        appId: appId,
        asrEnabled: options.asrEnabled || true,
        onVideoReady: () => {
            console.log('🎬 Video is ready!');
            hideLoading();
        },
        onLocalAudioPublished: () => {
            console.log('🎤 Local audio capture started');
        },
        onError: (error) => {
            console.error('❌ RTC Error:', error);
            showError(error.message);
        }
    });

    return window.rtAvatarClient;
}

// 加入房间并观看数字人（双向 RTC 连接）
async function joinAvatarRoom(roomId, token, sessionId) {
    // 检查 RTC 客户端是否可用
    if (!window.rtAvatarClient) {
        console.warn('⚠️ RTC client not available, skipping video avatar');
        return null;
    }

    window.currentSessionId = sessionId;

    // 显示加载动画
    showLoading();

    try {
        // 加入房间并发布本地音频
        await window.rtAvatarClient.join(roomId, token, undefined, {
            publishAudio: true // 发布本地麦克风音频
        });

        // 切换到视频模式
        window.rtAvatarClient.showVideo(true);

        console.log('✅ Full-duplex RTC connection established');
    } catch (error) {
        console.error('❌ Failed to join avatar room:', error);
        hideLoading();
        showError('无法连接到 AI 角色：' + error.message);
    }
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
    if (!container) return;
    container.innerHTML = `
        <div class="video-loading">
            <div>⏳ AI 角色正在准备...</div>
            <div style="font-size: 0.7em; margin-top: 10px;">Loading AI Avatar...</div>
        </div>
    `;
}

// 隐藏加载动画
function hideLoading() {
    const container = document.getElementById('avatar-video-container');
    if (!container) return;
    // 清空加载状态
    const loading = container.querySelector('.video-loading');
    if (loading) {
        loading.remove();
    }
}

// 显示错误
function showError(message) {
    const container = document.getElementById('avatar-video-container');
    if (!container) return;
    container.innerHTML = `
        <div class="video-error">
            <div>⚠️ 视频模式不可用</div>
            <div style="font-size: 0.8em; margin-top: 10px;">使用动画模式</div>
        </div>
    `;
}
