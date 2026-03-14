// RTC Bot - 服务端虚拟角色
// 加入 RTC 房间，接收孩子音频，推送 TTS 语音

const VERTC = require('@volcengine/rtc');

class RTCBot {
    constructor(options = {}) {
        this.appId = options.appId;
        this.roomId = null;
        this.uid = options.uid || 'avatar_bot';
        this.character = options.character || 'emma';
        this.engine = null;
        this.childUserId = null;
        
        // 回调函数
        this.onAudioReceived = options.onAudioReceived; // 收到孩子音频
        this.onError = options.onError;
        this.onReady = options.onReady;
        
        // 音频数据缓存
        this.audioBuffers = new Map(); // userId → [Buffer]
    }

    // 加入 RTC 房间
    async joinRoom(roomId, token) {
        try {
            this.roomId = roomId;

            // 创建引擎
            this.engine = VERTC.createEngine(this.appId);

            // 设置日志级别
            this.engine.setLogLevel(VERTC.LogLevel.Info);

            // 监听事件
            this.setupEventListeners();

            // 加入房间
            await this.engine.joinRoom(
                token,
                roomId,
                { userId: this.uid },
                {
                    isAutoPublish: false, // 不自动发布（手动发布 TTS）
                    isAutoSubscribeAudio: true, // 自动订阅音频
                    isAutoSubscribeVideo: false,
                    roomProfileType: VERTC.RoomProfileType.communication
                }
            );

            console.log(`✅ Bot 加入房间：${roomId} as ${this.uid}`);

            if (this.onReady) {
                this.onReady();
            }

            return true;
        } catch (error) {
            console.error('❌ Bot joinRoom error:', error);
            if (this.onError) {
                this.onError(error);
            }
            throw error;
        }
    }

    // 设置事件监听
    setupEventListeners() {
        // 用户发布流
        this.engine.on(VERTC.events.onUserPublishStream, async (e) => {
            console.log('📥 User publish stream:', e.userId, e.mediaType);
            
            // 订阅该用户的音频流
            try {
                await this.engine.subscribeStream(e.userId, {
                    audio: true,
                    video: false
                });
                console.log(`✅ Subscribed to ${e.userId} audio`);
                
                // 记录孩子用户 ID
                if (e.userId !== this.uid) {
                    this.childUserId = e.userId;
                    this.audioBuffers.set(e.userId, []);
                }
            } catch (error) {
                console.error('❌ Subscribe stream error:', error);
            }
        });

        // 用户取消发布
        this.engine.on(VERTC.events.onUserUnPublishStream, (e) => {
            console.log('📴 User unpublish stream:', e.userId);
        });

        // 用户加入
        this.engine.on(VERTC.events.onUserJoin, (e) => {
            console.log('👤 User joined:', e.userId);
        });

        // 用户离开
        this.engine.on(VERTC.events.onUserLeave, (e) => {
            console.log('👋 User left:', e.userId);
            if (e.userId === this.childUserId) {
                this.childUserId = null;
            }
        });

        // 接收音频数据（核心！）
        this.engine.on(VERTC.events.onAudioData, (e) => {
            // e.data: Int16Array PCM 数据
            // e.userId: 发送者 ID
            // e.timestamp: 时间戳
            
            if (e.userId === this.uid) {
                // 忽略自己发布的音频
                return;
            }

            // 缓存音频数据
            const userId = e.userId;
            if (!this.audioBuffers.has(userId)) {
                this.audioBuffers.set(userId, []);
            }
            
            const buffer = Buffer.from(e.data.buffer, e.data.byteOffset, e.data.byteLength);
            this.audioBuffers.get(userId).push(buffer);

            // 触发回调（实时处理）
            if (this.onAudioReceived) {
                this.onAudioReceived(buffer, userId, e.timestamp);
            }
        });

        // 错误处理
        this.engine.on(VERTC.events.onError, (e) => {
            console.error('❌ RTC Error:', e.code, e.message);
            if (this.onError) {
                this.onError(e);
            }
        });
    }

    // 发布音频数据（TTS 语音）
    async publishAudio(pcmBuffer) {
        try {
            if (!this.engine) {
                throw new Error('Engine not initialized');
            }

            // 将 Buffer 转换为 Int16Array
            const int16Array = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.length / 2);

            // 发布音频数据到房间
            await this.engine.publishAudioData(int16Array);
            
            console.log(`📤 Published ${pcmBuffer.length} bytes audio to room ${this.roomId}`);
            return true;
        } catch (error) {
            console.error('❌ Publish audio error:', error);
            throw error;
        }
    }

    // 发布流式音频数据（用于流式 TTS）
    async publishAudioStream(pcmChunk) {
        try {
            if (!this.engine) return;

            const int16Array = new Int16Array(pcmChunk.buffer, pcmChunk.byteOffset, pcmChunk.length / 2);
            await this.engine.publishAudioData(int16Array);
        } catch (error) {
            console.error('❌ Publish audio stream error:', error);
        }
    }

    // 获取缓存的音频数据
    getCachedAudio(userId) {
        const buffers = this.audioBuffers.get(userId);
        if (!buffers || buffers.length === 0) {
            return null;
        }
        
        // 合并所有 buffer
        const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
        const merged = Buffer.alloc(totalLength);
        let offset = 0;
        
        buffers.forEach(buf => {
            buf.copy(merged, offset);
            offset += buf.length;
        });
        
        return merged;
    }

    // 清除缓存
    clearAudioCache(userId) {
        if (userId) {
            this.audioBuffers.delete(userId);
        } else {
            this.audioBuffers.clear();
        }
    }

    // 离开房间
    async leaveRoom() {
        try {
            console.log('👋 Bot leaving room:', this.roomId);
            
            this.clearAudioCache();
            
            if (this.engine) {
                await this.engine.leaveRoom();
            }
            
            this.engine = null;
            this.roomId = null;
            this.childUserId = null;
            
            console.log('✅ Bot left room');
        } catch (error) {
            console.error('❌ Leave room error:', error);
            throw error;
        }
    }

    // 获取状态
    getStatus() {
        return {
            appId: this.appId,
            roomId: this.roomId,
            uid: this.uid,
            character: this.character,
            childUserId: this.childUserId,
            connected: !!this.engine
        };
    }
}

module.exports = RTCBot;
