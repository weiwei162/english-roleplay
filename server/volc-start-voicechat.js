#!/usr/bin/env node
/**
 * 火山引擎 StartVoiceChat API 客户端
 * 文档：https://www.volcengine.com/docs/6348/1558163
 * 
 * 支持三种配置模式：
 * 1. 分组件模式：ASR + LLM + TTS 分别配置
 * 2. 端到端模式：S2SConfig（豆包端到端实时语音大模型）
 * 3. 第三方 LLM 模式：CustomLLM（如 pi-agent-core）
 */

import crypto from 'crypto';
import { generateToken as generateOfficialToken } from './token-generator.js';
import https from 'https';

class VolcStartVoiceChatClient {
    constructor(options = {}) {
        this.accessKey = options.accessKey;
        this.secretKey = options.secretKey;
        this.region = options.region || 'cn-north-1';
        this.service = 'rtc';
        this.host = 'rtc.volcengineapi.com';
        this.version = '2024-12-01';
    }

    /**
     * 计算 SHA256 哈希
     */
    _sha256(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * 生成签名密钥
     */
    _getSigningKey(date, region, service) {
        const kDate = crypto.createHmac('sha256', this.secretKey)
            .update(date)
            .digest();
        const kRegion = crypto.createHmac('sha256', kDate)
            .update(region)
            .digest();
        const kService = crypto.createHmac('sha256', kRegion)
            .update(service)
            .digest();
        const kSigning = crypto.createHmac('sha256', kService)
            .update('request')
            .digest();
        return kSigning;
    }

    /**
     * 生成火山引擎签名
     * 参考：https://www.volcengine.com/docs/6348/1899868
     */
    _signRequest(method, path, query, body) {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const dateTimeStr = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
        
        const serviceInfo = `${this.service}/request`;
        
        // 规范请求
        const canonicalMethod = method.toUpperCase();
        const canonicalUri = path;
        const canonicalQuery = query;
        const canonicalHeaders = `host:${this.host}\nx-content-sha256:${this._sha256(body)}\nx-date:${dateTimeStr}\n`;
        const signedHeaders = 'host;x-content-sha256;x-date';
        const payloadHash = this._sha256(body);
        
        const canonicalRequest = [
            canonicalMethod,
            canonicalUri,
            canonicalQuery,
            canonicalHeaders,
            signedHeaders,
            payloadHash
        ].join('\n');
        
        const credentialScope = `${dateStr}/${this.region}/${serviceInfo}`;
        const stringToSign = [
            'HMAC-SHA256',
            dateTimeStr,
            credentialScope,
            this._sha256(canonicalRequest)
        ].join('\n');
        
        const signingKey = this._getSigningKey(dateStr, this.region, this.service);
        const signature = crypto.createHmac('sha256', signingKey)
            .update(stringToSign)
            .digest('hex');
        
        const authorization = `HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
        
        return {
            'X-Date': dateTimeStr,
            'X-Content-Sha256': payloadHash,
            'Authorization': authorization
        };
    }

    /**
     * 调用 API
     */
    async callAPI(action, body = {}) {
        const query = `Action=${action}&Version=${this.version}`;
        const bodyString = JSON.stringify(body);
        
        const headers = this._signRequest('POST', '/', query, bodyString);
        headers['Content-Type'] = 'application/json';
        headers['Host'] = this.host;
        
        const url = `https://${this.host}/?${query}`;
        
        return new Promise((resolve, reject) => {
            const req = https.request(url, {
                method: 'POST',
                headers
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        if (res.statusCode === 200) {
                            resolve(result);
                        } else {
                            reject(new Error(`API Error ${res.statusCode}: ${data}`));
                        }
                    } catch (e) {
                        reject(new Error(`Parse Error: ${e.message}, Response: ${data}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.write(bodyString);
            req.end();
        });
    }

    /**
     * 开启 AI 对话 - 分组件模式（ASR + LLM + TTS）
     * 
     * @param {Object} config
     * @param {string} config.appId - RTC AppId
     * @param {string} config.roomId - RTC 房间 ID
     * @param {string} config.taskId - 任务 ID（AppId+RoomId 下唯一）
     * @param {string} config.targetUserId - 真人用户 ID
     * @param {string} config.agentUserId - AI 助手用户 ID（可选，默认 AIAssistant）
     * @param {Object} config.asrConfig - ASR 配置
     * @param {Object} config.llmConfig - LLM 配置
     * @param {Object} config.ttsConfig - TTS 配置
     * @param {string} config.welcomeMessage - 欢迎词
     * @param {number} config.idleTimeout - 空闲超时（秒）
     */
    async startVoiceChatComponent(config) {
        console.log(`🤖 [分组件] 开启 AI 对话 - Room: ${config.roomId}, TaskId: ${config.taskId}`);
        
        const body = {
            AppId: config.appId,
            RoomId: config.roomId,
            TaskId: config.taskId,
            Config: {
                ASRConfig: config.asrConfig,
                LLMConfig: config.llmConfig,
                TTSConfig: config.ttsConfig
            },
            AgentConfig: {
                UserId: config.agentUserId || 'AIAssistant',
                TargetUserId: [config.targetUserId],
                WelcomeMessage: config.welcomeMessage || 'Hello! I\'m your English friend. Let\'s chat!',
                IdleTimeout: config.idleTimeout || 180
            }
        };
        
        const result = await this.callAPI('StartVoiceChat', body);
        console.log('✅ [分组件] AI 对话已开启:', result);
        return result;
    }

    /**
     * 开启 AI 对话 - 端到端模式（S2SConfig）
     * 
     * @param {Object} config
     * @param {string} config.appId - RTC AppId
     * @param {string} config.roomId - RTC 房间 ID
     * @param {string} config.taskId - 任务 ID
     * @param {string} config.targetUserId - 真人用户 ID
     * @param {string} config.agentUserId - AI 助手用户 ID（可选，默认 AIAssistant）
     * @param {Object} config.s2sConfig - S2S 配置
     * @param {string} config.welcomeMessage - 欢迎词
     * @param {number} config.idleTimeout - 空闲超时（秒）
     */
    async startVoiceChatS2S(config) {
        console.log(`🤖 [端到端] 开启 AI 对话 - Room: ${config.roomId}, TaskId: ${config.taskId}`);
        
        const body = {
            AppId: config.appId,
            RoomId: config.roomId,
            TaskId: config.taskId,
            Config: {
                S2SConfig: config.s2sConfig
            },
            AgentConfig: {
                UserId: config.agentUserId || 'AIAssistant',
                TargetUserId: [config.targetUserId],
                WelcomeMessage: config.welcomeMessage || 'Hello! I\'m your English friend. Let\'s chat!',
                IdleTimeout: config.idleTimeout || 180
            }
        };
        
        const result = await this.callAPI('StartVoiceChat', body);
        console.log('✅ [端到端] AI 对话已开启:', result);
        return result;
    }

    /**
     * 结束 AI 对话
     */
    async stopVoiceChat(config) {
        console.log(`⏹️ 结束 AI 对话 - Room: ${config.roomId}, TaskId: ${config.taskId}`);
        
        const body = {
            AppId: config.appId,
            RoomId: config.roomId,
            TaskId: config.taskId
        };
        
        const result = await this.callAPI('StopVoiceChat', body);
        console.log('✅ AI 对话已结束:', result);
        return result;
    }

    /**
     * 生成 RTC Token（用于客户端加入房间）
     * 
     * 参考官方文档：https://www.volcengine.com/docs/6348/70114
     * 
     * @param {string} roomId - 房间 ID
     * @param {string} uid - 用户 ID
     * @param {number} expireSeconds - 有效期（秒），默认 24 小时
     * @returns {string} Base64 编码的 Token
     */
    generateToken(roomId, uid = 'client', expireSeconds = 86400) {
        // 使用官方格式的 Token 生成器
        return generateOfficialToken(
            process.env.VOLC_APP_ID,
            process.env.VOLC_APP_KEY,
            roomId,
            uid,
            expireSeconds
        );
    }

    /**
     * 生成通配 Token（可以加入任意房间）
     * 
     * @param {string} uid - 用户 ID
     * @param {number} expireSeconds - 有效期（秒）
     * @returns {string} Base64 编码的通配 Token
     */
    generateWildcardToken(uid, expireSeconds = 86400) {
        // 通配 Token 使用 "*" 作为 roomId
        return this.generateToken('*', uid, expireSeconds);
    }
}

// ============== 配置模板 ==============

/**
 * 获取分组件模式配置
 */
function getComponentConfig(options = {}) {
    return {
        // ASR 配置 - 火山流式语音识别大模型
        ASRConfig: {
            Provider: 'volcano',
            ProviderParams: {
                Mode: 'bigmodel',
                Credential: {
                    AppId: options.asrAppId,
                    AccessToken: options.asrToken,
                    ApiResourceId: options.asrResourceId || 'volc.bigasr.sauc.duration'
                },
                StreamMode: 2, // 双向流式优化版
                ContextHistoryLength: 3
            },
            VADConfig: {
                SilenceTime: 600,
                AIVAD: true
            }
        },
        
        // LLM 配置 - 火山方舟模型
        LLMConfig: {
            Mode: 'ArkV3',
            EndPointId: options.llmEndpointId,
            Temperature: 0.1,
            MaxTokens: 1024,
            TopP: 0.3,
            SystemMessages: [
                options.systemPrompt || 'You are a friendly English teacher for kids. Speak in simple English.'
            ],
            HistoryLength: 3,
            Prefill: false
        },
        
        // TTS 配置 - 火山语音合成大模型
        TTSConfig: {
            Provider: 'volcano_bidirection',
            ProviderParams: {
                ResourceId: options.ttsResourceId || 'volc.service_type.10029',
                app: {
                    appid: options.ttsAppId,
                    token: options.ttsToken
                },
                audio: {
                    voice_type: options.ttsVoiceType || 'zh_female_linjianvhai_moon_bigtts',
                    speech_rate: 0
                },
                Additions: {
                    disable_markdown_filter: true,
                    enable_language_detector: false
                }
            }
        },
        
        // 字幕配置 - 开启客户端字幕回调
        SubtitleConfig: {
            DisableRTSSubtitle: false, // 开启字幕
            SubtitleMode: 1 // 1=LLM 原始回复（更快），0=TTS 对齐（更精准但慢）
        }
    };
}

/**
 * 获取端到端模式配置
 */
function getS2SConfig(options = {}) {
    return {
        Provider: 'volcano',
        OutputMode: options.outputMode || 0, // 0=纯端到端，1=混合编排
        ProviderParams: {
            app: {
                appid: options.s2sAppId,
                token: options.s2sToken
            },
            dialog: {
                extra: {
                    model: options.modelVersion || 'O',
                    strict_audit: true,
                    audit_response: 'Sorry, I can\'t answer that question.'
                },
                system_role: options.systemRole || 'You are a friendly English teacher for kids.',
                speaking_style: options.speakingStyle || 'Speak in simple, encouraging English.'
            },
            asr: {
                extra: {
                    end_smooth_window_ms: 1500
                }
            },
            tts: {
                speaker: options.speaker || 'zh_female_vv_jupiter_bigtts',
                audio_config: {
                    channel: 1,
                    format: 'pcm_s16le',
                    sample_rate: 24000
                }
            }
        },
        
        // 字幕配置 - 开启客户端字幕回调
        SubtitleConfig: {
            DisableRTSSubtitle: false, // 开启字幕
            SubtitleMode: 1 // 1=LLM 原始回复（更快），0=TTS 对齐（更精准但慢）
        }
    };
}

/**
 * 获取第三方 CustomLLM 模式配置
 * 用于接入 pi-agent-core 或其他第三方 Agent
 */
function getCustomLLMConfig(options = {}) {
    const {
        customLlmUrl = 'http://localhost:3001/v1/chat/completions',
        customLlmApiKey = 'pi-agent-secret-key',
        customLlmModel = 'pi-agent-v1',
        systemPrompt = 'You are a friendly English teacher for kids.',
        temperature = 0.7,
        maxTokens = 500,
        topP = 0.9,
        historyLength = 3,
        sessionId = '' // 会话 ID，与 userId、character、scene 绑定
    } = options;
    
    // 构建 Custom 参数（JSON 字符串）
    const customParams = {};
    if (sessionId) {
        customParams.SessionId = sessionId;
    }
    const customJson = Object.keys(customParams).length > 0 ? JSON.stringify(customParams) : undefined;
    
    return {
        // ASR 配置 - 火山流式语音识别大模型
        ASRConfig: {
            Provider: 'volcano',
            ProviderParams: {
                Mode: 'bigmodel',
                Credential: {
                    AppId: options.asrAppId,
                    AccessToken: options.asrToken,
                    ApiResourceId: options.asrResourceId || 'volc.bigasr.sauc.duration'
                },
                StreamMode: 2,
                ContextHistoryLength: historyLength
            },
            VADConfig: {
                SilenceTime: 600,
                AIVAD: true
            }
        },
        
        // LLM 配置 - 第三方 CustomLLM
        LLMConfig: {
            Mode: 'CustomLLM', // 固定值
            Url: customLlmUrl, // 第三方服务地址
            APIKey: customLlmApiKey, // 鉴权 Token
            ModelName: customLlmModel, // 模型名称
            Temperature: temperature,
            MaxTokens: maxTokens,
            TopP: topP,
            SystemMessages: [systemPrompt],
            HistoryLength: historyLength,
            Prefill: false, // 是否开启预填充（降低延迟但增加调用次数）
            Custom: customJson // 自定义 JSON 参数（包含 SessionId）
        },
        
        // TTS 配置 - 火山语音合成大模型
        TTSConfig: {
            Provider: 'volcano_bidirection',
            ProviderParams: {
                ResourceId: options.ttsResourceId || 'volc.service_type.10029',
                app: {
                    appid: options.ttsAppId,
                    token: options.ttsToken
                },
                audio: {
                    voice_type: options.ttsVoiceType || 'zh_female_linjianvhai_moon_bigtts',
                    speech_rate: 0
                },
                Additions: {
                    disable_markdown_filter: true,
                    enable_language_detector: false
                }
            }
        },
        
        // 字幕配置 - 开启客户端字幕回调
        SubtitleConfig: {
            DisableRTSSubtitle: false,
            SubtitleMode: 1
        }
    };
}

// ============== 角色人设 ==============

const CHARACTER_CONFIGS = {
    emma: {
        name: 'Miss Emma',
        systemPrompt: 'You are Miss Emma, a gentle English teacher for 5-year-old Chinese kids. Speak in simple English, use short sentences, encourage them to speak. Be warm and patient. Use emojis.',
        systemRole: 'You are Miss Emma, a gentle English teacher.',
        speakingStyle: 'Warm, patient, encouraging',
        ttsVoiceType: 'zh_female_linjianvhai_moon_bigtts',
        s2sSpeaker: 'zh_female_vv_jupiter_bigtts'
    },
    tommy: {
        name: 'Tommy',
        systemPrompt: 'You are Tommy, a 5-year-old American boy. Play with kids and teach them English through games. Use simple words and short sentences. Be playful and energetic.',
        systemRole: 'You are Tommy, a playful 5-year-old boy.',
        speakingStyle: 'Playful, energetic, simple',
        ttsVoiceType: 'zh_male_xiaotian_jupiter_bigtts',
        s2sSpeaker: 'zh_male_xiaotian_jupiter_bigtts'
    },
    lily: {
        name: 'Lily',
        systemPrompt: 'You are Lily, a 7-year-old lively girl. Love singing, drawing, and storytelling. Teach English in a warm and encouraging way.',
        systemRole: 'You are Lily, a lively 7-year-old girl.',
        speakingStyle: 'Lively, warm, creative',
        ttsVoiceType: 'zh_female_linjianvhai_moon_bigtts',
        s2sSpeaker: 'zh_female_vv_jupiter_bigtts'
    },
    mike: {
        name: 'Coach Mike',
        systemPrompt: 'You are Coach Mike, a sunny sports coach. Teach English through sports and activities. Be energetic and positive.',
        systemRole: 'You are Coach Mike, a sports coach.',
        speakingStyle: 'Energetic, positive, motivational',
        ttsVoiceType: 'zh_male_yunzhou_jupiter_bigtts',
        s2sSpeaker: 'zh_male_yunzhou_jupiter_bigtts'
    },
    rose: {
        name: 'Grandma Rose',
        systemPrompt: 'You are Grandma Rose, a kind grandmother. Tell stories and teach life lessons. Speak slowly and gently with love.',
        systemRole: 'You are Grandma Rose, a kind grandmother.',
        speakingStyle: 'Gentle, slow, loving',
        ttsVoiceType: 'zh_female_linjianvhai_moon_bigtts',
        s2sSpeaker: 'zh_female_vv_jupiter_bigtts'
    }
};

// ============== 测试 ==============

async function test() {
    console.log('🧪 Testing VolcStartVoiceChatClient...\n');
    
    const client = new VolcStartVoiceChatClient({
        accessKey: process.env.VOLC_ACCESS_KEY,
        secretKey: process.env.VOLC_SECRET_KEY
    });
    
    // 测试 Token 生成
    try {
        const token = client.generateToken('test_room', 'test_user');
        console.log('✅ Token generated:', token.substring(0, 50) + '...\n');
    } catch (e) {
        console.log('⚠️ Token generation skipped (credentials not set)\n');
    }
    
    // 测试配置生成
    const componentConfig = getComponentConfig({
        asrAppId: 'xxx',
        asrToken: 'xxx',
        llmEndpointId: 'ep-xxx',
        ttsAppId: 'xxx',
        ttsToken: 'xxx',
        systemPrompt: 'Test prompt'
    });
    console.log('✅ Component config generated');
    console.log('   ASR Provider:', componentConfig.ASRConfig.Provider);
    console.log('   LLM Mode:', componentConfig.LLMConfig.Mode);
    console.log('   TTS Provider:', componentConfig.TTSConfig.Provider);
    
    const s2sConfig = getS2SConfig({
        s2sAppId: 'xxx',
        s2sToken: 'xxx',
        systemRole: 'Test role'
    });
    console.log('\n✅ S2S config generated');
    console.log('   Provider:', s2sConfig.Provider);
    console.log('   OutputMode:', s2sConfig.OutputMode);
    
    console.log('\n📝 Client ready!');
    console.log('   - startVoiceChatComponent() - 分组件模式');
    console.log('   - startVoiceChatS2S() - 端到端模式');
    console.log('   - stopVoiceChat() - 结束对话');
}

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
if (process.argv[1] === __filename) {
    test().catch(console.error);
}

export {
    VolcStartVoiceChatClient,
    getComponentConfig,
    getS2SConfig,
    getCustomLLMConfig,
    CHARACTER_CONFIGS,
    test
};
