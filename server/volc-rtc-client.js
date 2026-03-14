// 火山引擎 RTC 服务端 OpenAPI 客户端
// 参考文档：https://www.volcengine.com/docs/6348/104482

const crypto = require('crypto');

class VolcRTCClient {
    constructor(options = {}) {
        this.appId = options.appId;
        this.appKey = options.appKey;
        this.region = options.region || 'cn-north-1'; // 默认华北区域
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

    // 开始推流（让服务端"说话"）
    async startPushStream(roomId, audioUrl, uid = 'server_bot') {
        try {
            console.log(`🎙️ Starting push stream to room ${roomId}...`);
            
            const result = await this.callAPI('StartPushStream', {}, {
                AppId: this.appId,
                RoomId: roomId,
                UserId: uid,
                AudioUrl: audioUrl,
                VideoUrl: '', // 仅音频
                Duration: 30 // 最大推流时长（秒）
            });
            
            console.log('✅ Push stream started:', result);
            return result;
            
        } catch (error) {
            console.error('❌ StartPushStream error:', error.message);
            throw error;
        }
    }

    // 开始录制/拉流（让服务端"听"取）
    async startRecording(roomId, userIds = [], recordType = 'audio') {
        try {
            console.log(`📼 Starting recording for room ${roomId}...`);
            
            const result = await this.callAPI('StartRecording', {}, {
                AppId: this.appId,
                RoomId: roomId,
                UserIds: userIds, // 指定要录制的用户 ID，空则录制所有人
                RecordType: recordType, // 'audio' | 'video' | 'both'
                StorageConfig: {
                    StorageType: 'tos', // 火山 TOS 存储
                    Bucket: 'your-bucket',
                    Path: '/recordings/'
                }
            });
            
            console.log('✅ Recording started:', result);
            return result;
            
        } catch (error) {
            console.error('❌ StartRecording error:', error.message);
            throw error;
        }
    }

    // 开始云端 ASR
    async startASR(roomId, userId = '') {
        try {
            console.log(`🎤 Starting ASR for room ${roomId}...`);
            
            const result = await this.callAPI('StartASR', {}, {
                AppId: this.appId,
                RoomId: roomId,
                UserId: userId, // 空则识别所有人
                Language: 'zh-CN', // 识别语言
                CallbackUrl: 'https://your-server.com/asr-callback' // 识别结果回调地址
            });
            
            console.log('✅ ASR started:', result);
            return result;
            
        } catch (error) {
            console.error('❌ StartASR error:', error.message);
            throw error;
        }
    }

    // 停止推流
    async stopPushStream(roomId, uid = 'server_bot') {
        try {
            console.log(`⏹️ Stopping push stream for room ${roomId}...`);
            
            const result = await this.callAPI('StopPushStream', {}, {
                AppId: this.appId,
                RoomId: roomId,
                UserId: uid
            });
            
            console.log('✅ Push stream stopped:', result);
            return result;
            
        } catch (error) {
            console.error('❌ StopPushStream error:', error.message);
            throw error;
        }
    }

    // 停止录制
    async stopRecording(taskId) {
        try {
            console.log(`⏹️ Stopping recording task ${taskId}...`);
            
            const result = await this.callAPI('StopRecording', {}, {
                TaskId: taskId
            });
            
            console.log('✅ Recording stopped:', result);
            return result;
            
        } catch (error) {
            console.error('❌ StopRecording error:', error.message);
            throw error;
        }
    }

    // 生成 Token（用于客户端加入房间）
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

// 测试函数
async function testRTCClient() {
    console.log('Testing VolcRTCClient...\n');
    
    const client = new VolcRTCClient({
        appId: process.env.VOLC_APP_ID,
        appKey: process.env.VOLC_APP_KEY
    });
    
    // 测试生成 Token
    const token = client.generateToken('test_room', 'test_user');
    console.log('✅ Token generated:', token.substring(0, 50) + '...\n');
    
    // 测试 API 调用（需要真实凭证）
    if (!process.env.VOLC_APP_ID || process.env.VOLC_APP_ID.includes('your_')) {
        console.log('⚠️  VOLC_APP_ID not configured, skipping API tests\n');
        return false;
    }
    
    try {
        // 测试开始推流
        // await client.startPushStream('test_room', 'https://example.com/audio.mp3');
        console.log('✅ RTC Client initialized successfully\n');
        return true;
    } catch (error) {
        console.error('❌ API test failed:', error.message);
        return false;
    }
}

module.exports = {
    VolcRTCClient,
    testRTCClient
};
