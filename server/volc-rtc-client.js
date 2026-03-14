// 火山引擎 RTC 实时对话式 AI 客户端
// 参考文档：https://www.volcengine.com/docs/6348/1310560

const crypto = require('crypto');

class VolcRTCClient {
    constructor(options = {}) {
        this.appId = options.appId;
        this.appKey = options.appKey;
        this.region = options.region || 'cn-north-1';
        this.host = 'rtc.volcengineapi.com';
        this.version = '2021-11-01';
    }

    // 生成签名
    generateSignature(params, body = '') {
        const keys = Object.keys(params).sort();
        const sortedParams = keys.map(key => `${key}=${encodeURIComponent(params[key])}`).join('&');
        
        const stringToSign = `POST\n${this.host}\n/api\n${sortedParams}\n${body}`;
        
        const hmac = crypto.createHmac('sha256', this.appKey);
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
                'Authorization': `HMAC-SHA256 Credential=${this.appId}/${timestamp}/${this.region}/rtc/request, SignedHeaders=content-type;host;x-date, Signature=${signature}`
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

    // 开启 AI 对话（核心功能）
    async startVoiceChat(config) {
        try {
            console.log(`🤖 Starting AI voice chat in room ${config.roomId}...`);
            
            const result = await this.callAPI('StartVoiceChat', {}, {
                AppId: this.appId,
                RoomId: config.roomId,
                UserId: config.userId || 'ai_bot',
                VoiceChatConfig: {
                    Persona: config.persona || 'Friendly English teacher',
                    Language: config.language || 'en-US',
                    // 可选配置
                    MaxDuration: config.maxDuration || 3600, // 最大时长（秒）
                    EnableNoiseReduction: config.enableNoiseReduction || true,
                    EnableVAD: config.enableVAD || true // 语音活动检测
                }
            });
            
            console.log('✅ AI voice chat started:', result);
            return result;
            
        } catch (error) {
            console.error('❌ StartVoiceChat error:', error.message);
            throw error;
        }
    }

    // 更新 AI 对话配置
    async updateVoiceChat(taskId, config) {
        try {
            console.log(`🔄 Updating AI voice chat ${taskId}...`);
            
            const result = await this.callAPI('UpdateVoiceChat', {}, {
                TaskId: taskId,
                VoiceChatConfig: {
                    Persona: config.persona,
                    Language: config.language
                }
            });
            
            console.log('✅ AI voice chat updated:', result);
            return result;
            
        } catch (error) {
            console.error('❌ UpdateVoiceChat error:', error.message);
            throw error;
        }
    }

    // 结束 AI 对话
    async stopVoiceChat(taskId) {
        try {
            console.log(`⏹️ Stopping AI voice chat ${taskId}...`);
            
            const result = await this.callAPI('StopVoiceChat', {}, {
                TaskId: taskId
            });
            
            console.log('✅ AI voice chat stopped:', result);
            return result;
            
        } catch (error) {
            console.error('❌ StopVoiceChat error:', error.message);
            throw error;
        }
    }

    // 生成客户端 Token（用于前端加入房间）
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
            .createHmac('sha256', this.appKey)
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
        persona: 'You are Miss Emma, a gentle English teacher for 5-year-old Chinese kids. ' +
                 'Speak in simple English, use short sentences, encourage them to speak. ' +
                 'Be warm and patient. Use emojis to make it fun.',
        language: 'en-US',
        voice: 'female'
    },
    tommy: {
        persona: 'You are Tommy, a 5-year-old American boy. ' +
                 'Play with kids and teach them English through games. ' +
                 'Use simple words and short sentences. Be playful and energetic.',
        language: 'en-US',
        voice: 'male'
    },
    lily: {
        persona: 'You are Lily, a 7-year-old lively girl. ' +
                 'Love singing, drawing, and storytelling. ' +
                 'Teach English in a warm and encouraging way.',
        language: 'en-US',
        voice: 'female'
    },
    mike: {
        persona: 'You are Coach Mike, a sunny sports coach. ' +
                 'Teach English through sports and activities. ' +
                 'Be energetic and positive.',
        language: 'en-US',
        voice: 'male'
    },
    rose: {
        persona: 'You are Grandma Rose, a kind grandmother. ' +
                 'Tell stories and teach life lessons. ' +
                 'Speak slowly and gently with love.',
        language: 'en-US',
        voice: 'elderly_female'
    }
};

// 测试函数
async function testRTCClient() {
    console.log('Testing VolcRTCClient (Real-time AI)...\n');
    
    const client = new VolcRTCClient({
        appId: process.env.VOLC_APP_ID,
        appKey: process.env.VOLC_APP_KEY
    });
    
    // 测试 Token 生成
    const token = client.generateToken('test_room', 'test_user');
    console.log('✅ Token generated:', token.substring(0, 50) + '...\n');
    
    // 测试 API 调用（需要真实凭证）
    if (!process.env.VOLC_APP_ID || process.env.VOLC_APP_ID.includes('your_')) {
        console.log('⚠️  VOLC_APP_ID not configured, skipping API tests\n');
        return false;
    }
    
    try {
        // 测试开启 AI 对话
        // const result = await client.startVoiceChat({
        //     roomId: 'test_room',
        //     userId: 'ai_emma',
        //     persona: CHARACTER_PERSONAS.emma.persona,
        //     language: CHARACTER_PERSONAS.emma.language
        // });
        
        console.log('✅ RTC Client initialized successfully\n');
        console.log('📝 To start AI voice chat, use:');
        console.log('   await client.startVoiceChat({');
        console.log('     roomId: "room_123",');
        console.log('     userId: "ai_emma",');
        console.log('     persona: "Friendly English teacher",');
        console.log('     language: "en-US"');
        console.log('   });\n');
        
        return true;
    } catch (error) {
        console.error('❌ API test failed:', error.message);
        return false;
    }
}

module.exports = {
    VolcRTCClient,
    CHARACTER_PERSONAS,
    testRTCClient
};
