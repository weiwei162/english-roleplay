// 火山引擎 RTC 实时对话式 AI 客户端 v2
// 支持两种模式：
// 1. 端到端语音大模型（内置 ASR+LLM+TTS）
// 2. 自定义 ASR+LLM+TTS

const crypto = require('crypto');

class VolcRTCClient {
    constructor(options = {}) {
        this.appId = options.appId;
        this.accessKey = options.accessKey;
        this.secretKey = options.secretKey;
        this.region = options.region || 'cn-north-1';
        this.host = 'rtc.volcengineapi.com';
        this.version = '2021-11-01';
    }

    // 生成签名
    generateSignature(params, body = '') {
        const keys = Object.keys(params).sort();
        const sortedParams = keys.map(key => `${key}=${encodeURIComponent(params[key])}`).join('&');
        const stringToSign = `POST\n${this.host}\n/api\n${sortedParams}\n${body}`;
        const hmac = crypto.createHmac('sha256', this.secretKey);
        const signature = hmac.update(stringToSign).digest('hex');
        return signature;
    }

    // 调用 OpenAPI
    async callAPI(action, params = {}, body = {}) {
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        const queryParams = {
            Action: action,
            Version: this.version,
            ...params
        };
        const bodyString = JSON.stringify(body);
        const signature = this.generateSignature(queryParams, bodyString);
        
        const url = `https://${this.host}/api?${Object.entries(queryParams)
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join('&')}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Date': timestamp,
                'Authorization': `HMAC-SHA256 Credential=${this.accessKey}/${timestamp}/${this.region}/rtc/request, SignedHeaders=content-type;host;x-date, Signature=${signature}`
            },
            body: bodyString
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`RTC API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        return data;
    }

    // ==================== 模式 1：端到端语音大模型 ====================
    
    /**
     * 开启 AI 对话（端到端模式）
     * 火山云端自动完成 ASR + LLM + TTS
     * 
     * @param {Object} config - 配置
     * @param {string} config.roomId - 房间 ID
     * @param {string} config.userId - AI 用户 ID
     * @param {string} config.persona - 人设描述
     * @param {string} config.language - 语言
     * @param {string} config.voiceId - 音色 ID（可选）
     * @param {number} config.maxDuration - 最大时长（秒）
     */
    async startVoiceChat(config) {
        console.log(`🤖 [端到端] Starting AI voice chat in room ${config.roomId}...`);
        
        const result = await this.callAPI('StartVoiceChat', {}, {
            AppId: this.appId,
            RoomId: config.roomId,
            UserId: config.userId || 'ai_bot',
            VoiceChatConfig: {
                Persona: config.persona || 'Friendly assistant',
                Language: config.language || 'en-US',
                VoiceId: config.voiceId, // 音色 ID
                MaxDuration: config.maxDuration || 3600,
                EnableNoiseReduction: config.enableNoiseReduction ?? true,
                EnableVAD: config.enableVAD ?? true
            }
        });
        
        console.log('✅ [端到端] AI voice chat started:', result);
        return result;
    }

    // ==================== 模式 2：自定义 ASR+LLM+TTS ====================
    
    /**
     * 开启 AI 对话（自定义模式）
     * 只启用 ASR，LLM 和 TTS 由服务端处理
     * 
     * @param {Object} config - 配置
     * @param {string} config.roomId - 房间 ID
     * @param {string} config.userId - AI 用户 ID
     * @param {string} config.asrLanguage - ASR 识别语言
     * @param {string} config.callbackUrl - ASR 回调 URL
     */
    async startVoiceChatCustom(config) {
        console.log(`🤖 [自定义] Starting AI voice chat in room ${config.roomId}...`);
        
        const result = await this.callAPI('StartVoiceChat', {}, {
            AppId: this.appId,
            RoomId: config.roomId,
            UserId: config.userId || 'ai_bot',
            VoiceChatConfig: {
                // 只启用 ASR，不启用 LLM 和 TTS
                Mode: 'asr_only', // ⭐ 关键参数：只使用 ASR
                ASRConfig: {
                    Language: config.asrLanguage || 'en-US',
                    EnableNoiseReduction: config.enableNoiseReduction ?? true,
                    EnableVAD: config.enableVAD ?? true
                },
                // 不配置 Persona 和 VoiceId，表示不使用内置 LLM 和 TTS
                CallbackUrl: config.callbackUrl // ASR 结果回调地址
            }
        });
        
        console.log('✅ [自定义] AI voice chat started (ASR only):', result);
        return result;
    }

    /**
     * 推送 TTS 音频到 RTC 房间
     * 用于自定义模式：服务端合成 TTS 后推流
     * 
     * @param {Object} config - 配置
     * @param {string} config.roomId - 房间 ID
     * @param {string} config.userId - AI 用户 ID
     * @param {string} config.audioUrl - 音频文件 URL
     * @param {number} config.duration - 音频时长（秒）
     */
    async pushAudioStream(config) {
        console.log(`📤 [自定义] Pushing audio stream to room ${config.roomId}...`);
        
        const result = await this.callAPI('PushAudioStream', {}, {
            AppId: this.appId,
            RoomId: config.roomId,
            UserId: config.userId || 'ai_bot',
            AudioUrl: config.audioUrl,
            Duration: config.duration || 30
        });
        
        console.log('✅ [自定义] Audio stream pushed:', result);
        return result;
    }

    // ==================== 通用 API ====================
    
    async updateVoiceChat(taskId, config) {
        console.log(`🔄 Updating AI voice chat ${taskId}...`);
        const result = await this.callAPI('UpdateVoiceChat', {}, {
            TaskId: taskId,
            VoiceChatConfig: {
                Persona: config.persona,
                Language: config.language,
                VoiceId: config.voiceId
            }
        });
        console.log('✅ AI voice chat updated:', result);
        return result;
    }

    async stopVoiceChat(taskId) {
        console.log(`⏹️ Stopping AI voice chat ${taskId}...`);
        const result = await this.callAPI('StopVoiceChat', {}, {
            TaskId: taskId
        });
        console.log('✅ AI voice chat stopped:', result);
        return result;
    }

    // 生成客户端 Token
    generateToken(roomId, uid = 'client', expireSeconds = 3600) {
        const now = Math.floor(Date.now() / 1000);
        const expire = now + expireSeconds;
        const payload = {
            app_id: this.appId,
            room_id: roomId,
            uid: uid,
            expire: expire
        };
        const signature = crypto
            .createHmac('sha256', this.secretKey)
            .update(JSON.stringify(payload))
            .digest('hex');
        return Buffer.from(JSON.stringify({
            ...payload,
            signature
        })).toString('base64');
    }
}

// 角色人设配置
const CHARACTER_PERSONAS = {
    emma: {
        persona: 'You are Miss Emma, a gentle English teacher for 5-year-old Chinese kids. Speak in simple English, use short sentences, encourage them to speak. Be warm and patient. Use emojis to make it fun.',
        language: 'en-US',
        voice: 'female'
    },
    tommy: {
        persona: 'You are Tommy, a 5-year-old American boy. Play with kids and teach them English through games. Use simple words and short sentences. Be playful and energetic.',
        language: 'en-US',
        voice: 'male'
    },
    lily: {
        persona: 'You are Lily, a 7-year-old lively girl. Love singing, drawing, and storytelling. Teach English in a warm and encouraging way.',
        language: 'en-US',
        voice: 'female'
    },
    mike: {
        persona: 'You are Coach Mike, a sunny sports coach. Teach English through sports and activities. Be energetic and positive.',
        language: 'en-US',
        voice: 'male'
    },
    rose: {
        persona: 'You are Grandma Rose, a kind grandmother. Tell stories and teach life lessons. Speak slowly and gently with love.',
        language: 'en-US',
        voice: 'elderly_female'
    }
};

// 测试函数
async function testRTCClient() {
    console.log('Testing VolcRTCClient v2...\n');
    
    const client = new VolcRTCClient({
        appId: process.env.VOLC_APP_ID,
        accessKey: process.env.VOLC_ACCESS_KEY,
        secretKey: process.env.VOLC_SECRET_KEY
    });
    
    const token = client.generateToken('test_room', 'test_user');
    console.log('✅ Token generated:', token.substring(0, 50) + '...\n');
    
    if (!process.env.VOLC_ACCESS_KEY || !process.env.VOLC_SECRET_KEY) {
        console.log('⚠️  Credentials not configured, skipping API tests\n');
        return false;
    }
    
    console.log('✅ RTC Client v2 initialized successfully\n');
    console.log('📝 支持两种模式:');
    console.log('   1. 端到端模式：await client.startVoiceChat({...})');
    console.log('   2. 自定义模式：await client.startVoiceChatCustom({...})\n');
    
    return true;
}

module.exports = {
    VolcRTCClient,
    CHARACTER_PERSONAS,
    testRTCClient
};
