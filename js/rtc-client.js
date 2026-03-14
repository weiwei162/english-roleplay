// RTC 客户端模块 - 火山云数字人视频播放 + 双向音频流
// 支持：孩子音频上传 + 数字人视频/音频下载
class RTCAvatarClient {
    constructor(options = {}) {
        this.appId = options.appId;
        this.client = null;
        this.localTracks = { audio: null, video: null };
        this.remoteUsers = new Map();
        this.onVideoReady = options.onVideoReady;
        this.onError = options.onError;
        this.onLocalAudioPublished = options.onLocalAudioPublished; // 本地音频发布回调
        this.asrEnabled = options.asrEnabled || false; // 是否启用实时 ASR
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

    // 加入 RTC 房间并发布本地音频流
    async join(roomId, token, uid = 'child_' + Date.now(), options = {}) {
        try {
            if (!this.client) {
                await this.init();
            }

            await this.client.join({
                roomId: roomId,
                token: token,
                uid: uid
            });

            console.log('✅ Joined room:', roomId, 'as', uid);

            // ⭐ 新增：发布本地音频流（孩子说话）
            if (options.publishAudio !== false) {
                await this.publishLocalAudio();
            }

            return uid;
        } catch (error) {
            console.error('❌ Failed to join room:', error);
            if (this.onError) this.onError(error);
            throw error;
        }
    }

    // 发布本地音频流（采集麦克风并上传）
    async publishLocalAudio() {
        try {
            // 创建本地音频轨道（麦克风）
            this.localTracks.audio = await VE_RTC.createAudioTrack({
                microphoneId: 'default',
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            });

            // 发布到 RTC 房间
            await this.client.publish({
                audioTrack: this.localTracks.audio
            });

            console.log('🎤 Local audio published');

            if (this.onLocalAudioPublished) {
                this.onLocalAudioPublished(this.localTracks.audio);
            }

            // ⭐ 可选：实时 ASR（将音频流发送到语音识别服务）
            if (this.asrEnabled) {
                this.startRealtimeASR(this.localTracks.audio);
            }

        } catch (error) {
            console.error('❌ Failed to publish local audio:', error);
            // 非致命错误，继续运行
        }
    }

    // 停止本地音频发布
    async unpublishLocalAudio() {
        try {
            if (this.localTracks.audio) {
                await this.client.unpublish(this.localTracks.audio);
                this.localTracks.audio.stop();
                this.localTracks.audio.close();
                this.localTracks.audio = null;
                console.log('🔇 Local audio unpublished');
            }
        } catch (error) {
            console.error('Failed to unpublish local audio:', error);
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
            // 停止本地轨道
            await this.unpublishLocalAudio();
            
            if (this.localTracks.video) {
                this.localTracks.video.stop();
                this.localTracks.video = null;
            }

            if (this.client) {
                await this.client.leave();
            }

            this.remoteUsers.clear();
            console.log('👋 Left room');
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

// 初始化函数
function initRTCAvatar(appId, options = {}) {
    // 检查 SDK 是否可用
    if (!window.VE_RTC) {
        console.warn('⚠️ RTC SDK not available, using animation mode');
        window.rtAvatarClient = null;
        return null;
    }

    window.rtAvatarClient = new RTCAvatarClient({
        appId: appId,
        asrEnabled: options.asrEnabled || true, // 默认启用实时 ASR
        onVideoReady: () => {
            console.log('🎬 Video is ready!');
            hideLoading();
        },
        onLocalAudioPublished: (audioTrack) => {
            console.log('🎤 Local audio published, starting ASR...');
            // 可以在这里开始实时语音识别
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
