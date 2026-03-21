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
import { getScenePrompt } from './prompts.js';

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
        
        console.log(`📡 Calling ${action} API: ${url}`);
        console.log(`📦 Request body:`, JSON.stringify(body, null, 2));
        
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
                            console.log(`✅ ${action} API success:`, result.ResponseMetadata?.RequestId || 'OK');
                            resolve(result);
                        } else {
                            console.error(`❌ ${action} API Error ${res.statusCode}:`, data);
                            reject(new Error(`${action} API Error ${res.statusCode}: ${JSON.stringify(result)}`));
                        }
                    } catch (e) {
                        console.error(`❌ ${action} API Parse Error:`, e.message, 'Response:', data);
                        reject(new Error(`Parse Error: ${e.message}, Response: ${data}`));
                    }
                });
            });
            
            req.on('error', (err) => {
                console.error(`❌ ${action} API Request Error:`, err.message);
                reject(err);
            });
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
        console.log(`   TargetUserId: ${config.targetUserId}, AgentUserId: ${config.agentUserId || 'AIAssistant'}`);
        
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
        
        try {
            const result = await this.callAPI('StartVoiceChat', body);
            console.log('✅ [分组件] AI 对话已开启:', result);
            return result;
        } catch (error) {
            console.error('❌ [分组件] StartVoiceChat 失败:', error.message);
            console.error('   AppId:', config.appId);
            console.error('   RoomId:', config.roomId);
            console.error('   TaskId:', config.taskId);
            throw error;
        }
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
        console.log(`   TargetUserId: ${config.targetUserId}, AgentUserId: ${config.agentUserId || 'AIAssistant'}`);
        
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
        
        try {
            const result = await this.callAPI('StartVoiceChat', body);
            console.log('✅ [端到端] AI 对话已开启:', result);
            return result;
        } catch (error) {
            console.error('❌ [端到端] StartVoiceChat 失败:', error.message);
            console.error('   AppId:', config.appId);
            console.error('   RoomId:', config.roomId);
            console.error('   TaskId:', config.taskId);
            throw error;
        }
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
        // ASR 配置 - 火山流式语音识别大模型（直传模式）
        ASRConfig: {
            Provider: 'volcano',
            ProviderParams: {
                Mode: 'bigmodel',
                AppId: options.asrAppId,
                AccessToken: options.asrToken,
                ApiResourceId: options.asrResourceId || 'volc.bigasr.sauc.duration',
                StreamMode: 2, // 双向流式优化版（兼顾实时与准确）
                enable_nonstream: true, // 开启二遍识别，提升准确率
                ContextHistoryLength: options.contextHistoryLength || 3
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
        sessionId = '', // 会话 ID，与 userId、character、scene 绑定
        feature = undefined // Feature 参数，例如 {Http: true} 用于 HTTP 域名测试
    } = options;
    
    // 构建 Custom 参数（JSON 字符串）
    const customParams = {};
    if (sessionId) {
        customParams.SessionId = sessionId;
    }
    const customJson = Object.keys(customParams).length > 0 ? JSON.stringify(customParams) : undefined;
    
    return {
        // ASR 配置 - 火山流式语音识别大模型（直传模式）
        ASRConfig: {
            Provider: 'volcano',
            ProviderParams: {
                Mode: 'bigmodel',
                AppId: options.asrAppId,
                AccessToken: options.asrToken,
                ApiResourceId: options.asrResourceId || 'volc.bigasr.sauc.duration',
                StreamMode: 2, // 双向流式优化版（兼顾实时与准确）
                enable_nonstream: true, // 开启二遍识别，提升准确率
                ContextHistoryLength: options.contextHistoryLength || historyLength
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
            Custom: customJson, // 自定义 JSON 参数（包含 SessionId）
            Feature: feature ? JSON.stringify(feature) : undefined // Feature 参数，例如 {"Http":true}
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

// ============== 音色常量定义 ==============

/**
 * TTS 音色预设（分组件模式）
 * 参考：豆包语音合成模型 1.0 官方音色列表
 */
const TTSPreset = {
    // 通用场景 - 女声
    LINJIE_NVHAI: 'zh_female_linjianvhai_moon_bigtts',      // 邻家女孩（默认）
    MEILI_NVYOU: 'zh_female_meilinvyou_moon_bigtts',        // 魅力女友
    TIANMEI_TAOZI: 'zh_female_tianmeitaozi_mars_bigtts',    // 甜美桃子
    QINGXIN_NVSHENG: 'zh_female_qingxinnvsheng_mars_bigtts',  // 清新女声
    ZHIXING_NVSHENG: 'zh_female_zhixingnvsheng_mars_bigtts',  // 知性女声
    KAILANG_JIEJIE: 'zh_female_kailangjiejie_moon_bigtts',  // 开朗姐姐
    
    // 通用场景 - 男声
    YANGGUANG_QINGNIAN: 'zh_male_yangguangqingnian_moon_bigtts',  // 阳光青年
    QINGSHUANG_NANDA: 'zh_male_qingshuangnanda_mars_bigtts',      // 清爽男大
    YUANBO_XIAOSHU: 'zh_male_yuanboxiaoshu_moon_bigtts',          // 渊博小叔
    JIESHUO_XIAOMING: 'zh_male_jieshuoxiaoming_moon_bigtts',      // 解说小明
    LINJIE_NANHAI: 'zh_male_linjiananhai_moon_bigtts',            // 邻家男孩
};

/**
 * S2S 音色预设（端到端模式）
 */
const S2SPreset = {
    VV: 'zh_female_vv_jupiter_bigtts',           // vv（默认）
    XIAOHE: 'zh_female_xiaohe_jupiter_bigtts',   // 小何
    YUNZHOU: 'zh_male_yunzhou_jupiter_bigtts',   // 云舟
    XIAOTIAN: 'zh_male_xiaotian_jupiter_bigtts', // 小甜
};

// ============== 角色人设 ==============

/**
 * 角色基础配置（与 TTS 模型无关）
 */
const CHARACTER_BASE_CONFIGS = {
    emma: {
        name: 'Miss Emma',
        systemPrompt: 'You are Miss Emma, a gentle English teacher for 5-year-old Chinese kids. Speak in simple English, use short sentences, encourage them to speak. Be warm and patient. Use emojis.',
        systemRole: 'You are Miss Emma, a gentle English teacher.',
        speakingStyle: 'Warm, patient, encouraging'
    },
    tommy: {
        name: 'Tommy',
        systemPrompt: 'You are Tommy, a 5-year-old American boy. Play with kids and teach them English through games. Use simple words and short sentences. Be playful and energetic.',
        systemRole: 'You are Tommy, a playful 5-year-old boy.',
        speakingStyle: 'Playful, energetic, simple'
    },
    lily: {
        name: 'Lily',
        systemPrompt: 'You are Lily, a 7-year-old lively girl. Love singing, drawing, and storytelling. Teach English in a warm and encouraging way.',
        systemRole: 'You are Lily, a lively 7-year-old girl.',
        speakingStyle: 'Lively, warm, creative'
    },
    mike: {
        name: 'Coach Mike',
        systemPrompt: 'You are Coach Mike, a sunny sports coach. Teach English through sports and activities. Be energetic and positive.',
        systemRole: 'You are Coach Mike, a sports coach.',
        speakingStyle: 'Energetic, positive, motivational'
    },
    rose: {
        name: 'Grandma Rose',
        systemPrompt: 'You are Grandma Rose, a kind grandmother. Tell stories and teach life lessons. Speak slowly and gently with love.',
        systemRole: 'You are Grandma Rose, a kind grandmother.',
        speakingStyle: 'Gentle, slow, loving'
    },
    
    // ============== 新增家庭角色 ==============
    
    dad: {
        name: 'Dad',
        systemPrompt: 'You are Dad, a caring father teaching English to your child. Speak in simple, encouraging English. Be patient, supportive, and wise. Share life experiences. Use short sentences and praise often.',
        systemRole: 'You are Dad, a caring and wise father.',
        speakingStyle: 'Patient, supportive, wise, encouraging'
    },
    mom: {
        name: 'Mom',
        systemPrompt: 'You are Mom, a loving mother teaching English to your child. Speak in warm, gentle English. Be nurturing, attentive, and encouraging. Use simple words and lots of praise. Show care and affection.',
        systemRole: 'You are Mom, a loving and nurturing mother.',
        speakingStyle: 'Warm, gentle, nurturing, affectionate'
    }
};

/**
 * TTS 音色配置（按模型类型分离）
 * 
 * 分组件模式 (volcano_bidirection): 使用 ttsVoiceType + ttsResourceId
 * 端到端模式 (S2S): 使用 s2sSpeaker
 * 
 * 音色列表参考：
 * - 分组件：https://www.volcengine.com/docs/6348/1899868
 * - S2S: https://www.volcengine.com/docs/6348/1558163
 * 
 * 注意：ResourceId 和 voice_type 需要匹配！
 * 不同 ResourceId 对应不同的音色集合。
 * 
 * 2026-03-21 更新：修复分组件模式音色引用
 * - tommy: zh_male_xiaotian_jupiter_bigtts → zh_male_linjiananhai_moon_bigtts (邻家男孩)
 * - mike: zh_male_yunzhou_jupiter_bigtts → zh_male_yangguangqingnian_moon_bigtts (阳光青年)
 */
const TTS_VOICE_CONFIGS = {
    // 分组件模式音色映射 (ttsVoiceType + ttsResourceId)
    // ResourceId: volc.service_type.10029 (语音合成大模型)
    component: {
        emma: {
            voiceType: TTSPreset.LINJIE_NVHAI,  // 邻家女孩 - 温柔女声
            resourceId: 'volc.service_type.10029'
        },
        tommy: {
            voiceType: TTSPreset.LINJIE_NANHAI,   // 邻家男孩 - 少年音
            resourceId: 'volc.service_type.10029'
        },
        lily: {
            voiceType: TTSPreset.LINJIE_NVHAI,  // 邻家女孩 - 清新女声
            resourceId: 'volc.service_type.10029'
        },
        mike: {
            voiceType: TTSPreset.YANGGUANG_QINGNIAN, // 阳光青年 - 活力男声
            resourceId: 'volc.service_type.10029'
        },
        rose: {
            voiceType: TTSPreset.LINJIE_NVHAI,   // 邻家女孩 - 温柔女声
            resourceId: 'volc.service_type.10029'
        },
        
        // 家庭角色
        dad: {
            voiceType: 'S_y6tmplBW1',   // 自定义音色 - 爸爸专属
            resourceId: 'seed-icl-2.0'  // 2.0 版本资源
        },
        mom: {
            voiceType: TTSPreset.ZHIXING_NVSHENG,  // 知性女声 - 温柔知性
            resourceId: 'volc.service_type.10029'
        }
    },
    // 端到端模式音色映射 (s2sSpeaker)
    // S2S 模式下 ResourceId 由模型版本决定，不需要单独配置
    s2s: {
        emma: S2SPreset.VV,        // vv - 活泼灵动女声
        tommy: S2SPreset.XIAOTIAN,   // 小甜 - 小男孩音
        lily: S2SPreset.VV,        // vv - 活泼灵动女声
        mike: S2SPreset.YUNZHOU,     // 云舟 - 清爽沉稳男声
        rose: S2SPreset.VV,        // vv - 活泼灵动女声
        
        // 家庭角色
        dad: S2SPreset.YUNZHOU,      // 云舟 - 清爽沉稳男声
        mom: S2SPreset.VV            // vv - 温柔女声
    }
};

/**
 * 获取角色完整配置（根据 AI 模式合并基础配置和 TTS 音色）
 * 
 * @param {string} characterId - 角色 ID
 * @param {string} aiMode - AI 模式：'component' | 's2s' | 'custom'
 * @returns {Object} 完整的角色配置
 */
function getCharacterConfig(characterId, aiMode = 'component') {
    const baseConfig = CHARACTER_BASE_CONFIGS[characterId];
    if (!baseConfig) {
        throw new Error(`Unknown character: ${characterId}`);
    }
    
    // 确定 TTS 音色映射类型
    const ttsType = aiMode === 's2s' ? 's2s' : 'component';
    const ttsConfig = TTS_VOICE_CONFIGS[ttsType][characterId];
    
    if (!ttsConfig) {
        throw new Error(`Unknown character: ${characterId} for TTS type ${ttsType}`);
    }
    
    // 合并配置
    if (aiMode === 's2s') {
        return {
            ...baseConfig,
            s2sSpeaker: ttsConfig  // S2S 模式只需要 speaker
        };
    } else {
        return {
            ...baseConfig,
            ttsVoiceType: ttsConfig.voiceType,    // 分组件模式需要 voiceType
            ttsResourceId: ttsConfig.resourceId   // 分组件模式需要 resourceId
        };
    }
}

/**
 * 合并角色和场景配置
 */
function combineCharacterAndScenePrompt(characterConfig, sceneId) {
    // 获取完整配置（兼容旧代码直接传入 characterConfig 的情况）
    const config = typeof characterConfig === 'string' 
        ? getCharacterConfig(characterConfig, process.env.AI_MODE || 'component')
        : characterConfig;
    
    const sceneConfig = getScenePrompt(sceneId);
    
    return {
        ...config,
        systemPrompt: `${config.systemPrompt}\n\nScene: ${sceneConfig.name}. ${sceneConfig.description}`,
        welcomeMessage: sceneConfig.welcomeMessage
    };
}

// 向后兼容：保持 CHARACTER_CONFIGS 导出（使用默认 component 模式）
const CHARACTER_CONFIGS = CHARACTER_BASE_CONFIGS;

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
    CHARACTER_BASE_CONFIGS,
    TTS_VOICE_CONFIGS,
    getCharacterConfig,
    combineCharacterAndScenePrompt,
    test
};
