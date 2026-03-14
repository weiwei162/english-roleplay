// 端到端测试：WebSocket + ASR + Qwen + TTS
// 测试完整对话流程（不使用 RTC）

require('dotenv').config();
const WebSocket = require('websocket');
const { synthesizeSpeech, testTTS } = require('./tts-client');

// 测试配置
const TEST_CONFIG = {
    serverUrl: 'ws://localhost:3000',
    timeout: 30000
};

// 模拟音频数据（16kHz, 16-bit PCM）
function generateTestAudio(durationMs = 1000) {
    const sampleRate = 16000;
    const numSamples = Math.floor(sampleRate * (durationMs / 1000));
    const buffer = Buffer.alloc(numSamples * 2); // 16-bit = 2 bytes
    
    // 生成正弦波（模拟语音）
    const frequency = 440; // A4 音符
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const sample = Math.sin(2 * Math.PI * frequency * t) * 16384; // 50% 振幅
        buffer.writeInt16LE(sample, i * 2);
    }
    
    return buffer;
}

// 测试 TTS
async function testTTSGen() {
    console.log('\n🎤 Testing TTS Generation...\n');
    
    try {
        const text = 'Hello! I am Miss Emma. Nice to meet you!';
        const ttsAudio = await synthesizeSpeech(text, 'emma');
        
        console.log(`✅ TTS generated: ${ttsAudio.length} bytes`);
        console.log(`   Text: "${text}"`);
        console.log(`   Character: emma\n`);
        
        return true;
    } catch (error) {
        console.error('❌ TTS generation failed:', error.message);
        return false;
    }
}

// 测试 WebSocket 连接
async function testWebSocketConnection() {
    console.log('\n🔌 Testing WebSocket Connection...\n');
    
    return new Promise((resolve) => {
        const ws = new WebSocket(TEST_CONFIG.serverUrl);
        
        const timeout = setTimeout(() => {
            console.error('❌ Connection timeout (30s)');
            ws.close();
            resolve(false);
        }, TEST_CONFIG.timeout);
        
        ws.on('open', () => {
            clearTimeout(timeout);
            console.log('✅ WebSocket connected\n');
            ws.close();
            resolve(true);
        });
        
        ws.on('error', (error) => {
            clearTimeout(timeout);
            console.error('❌ WebSocket error:', error.message);
            console.log('\n💡 Make sure server is running: npm start\n');
            resolve(false);
        });
    });
}

// 测试 ASR API 调用
async function testASRApi() {
    console.log('\n🎤 Testing ASR API...\n');
    
    if (!process.env.DASHSCOPE_API_KEY || process.env.DASHSCOPE_API_KEY === 'sk-xxx') {
        console.log('⚠️  DASHSCOPE_API_KEY not configured, skipping ASR test\n');
        return false;
    }
    
    try {
        // 调用 ASR REST API
        const audioBuffer = generateTestAudio(1000);
        const audioBase64 = audioBuffer.toString('base64');
        
        const response = await fetch('https://dashscope.aliyuncs.com/api/v1/stt', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                audio: audioBase64,
                format: 'pcm',
                sample_rate: 16000,
                language: 'en-US'
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log(`⚠️  ASR API error: ${response.status}`);
            console.log(`   ${errorText}\n`);
            return false;
        }
        
        const data = await response.json();
        const text = data.output?.text || data.text || '';
        
        console.log(`✅ ASR API response received`);
        console.log(`   Recognized: "${text || '(no speech detected)'}"\n`);
        
        return true;
        
    } catch (error) {
        console.error('❌ ASR API test failed:', error.message);
        return false;
    }
}

// 测试 Qwen API 调用
async function testQwenApi() {
    console.log('\n🤖 Testing Qwen API...\n');
    
    if (!process.env.DASHSCOPE_API_KEY || process.env.DASHSCOPE_API_KEY === 'sk-xxx') {
        console.log('⚠️  DASHSCOPE_API_KEY not configured, skipping Qwen test\n');
        return false;
    }
    
    try {
        const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: process.env.LLM_MODEL || 'qwen-plus',
                messages: [
                    {
                        role: 'system',
                        content: 'You are Miss Emma, a gentle English teacher for kids.'
                    },
                    {
                        role: 'user',
                        content: 'Hello! What\'s your name?'
                    }
                ]
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log(`⚠️  Qwen API error: ${response.status}`);
            console.log(`   ${errorText}\n`);
            return false;
        }
        
        const data = await response.json();
        const reply = data.choices[0].message.content;
        
        console.log(`✅ Qwen API response received`);
        console.log(`   Reply: "${reply.substring(0, 80)}..."\n`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Qwen API test failed:', error.message);
        return false;
    }
}

// 主测试
async function main() {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║    English Friend - End-to-End Test Suite            ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    
    console.log('Testing configuration:');
    console.log(`  Server URL: ${TEST_CONFIG.serverUrl}`);
    console.log(`  LLM Model: ${process.env.LLM_MODEL || 'qwen-plus'}`);
    console.log(`  ASR Model: ${process.env.ASR_MODEL || 'qwen3-asr-flash-realtime'}`);
    console.log(`  VOLC_APP_ID: ${process.env.VOLC_APP_ID ? 'configured' : 'not set'}`);
    console.log(`  DASHSCOPE_API_KEY: ${process.env.DASHSCOPE_API_KEY && !process.env.DASHSCOPE_API_KEY.includes('xxx') ? 'configured' : 'not set'}\n`);
    
    // 测试 TTS
    const ttsOk = await testTTSGen();
    
    // 测试 ASR API
    const asrOk = await testASRApi();
    
    // 测试 Qwen API
    const qwenOk = await testQwenApi();
    
    // 测试 WebSocket 连接（需要服务器运行）
    const wsOk = await testWebSocketConnection();
    
    // 总结
    console.log('═══════════════════════════════════════════════════════');
    console.log('Test Summary:');
    console.log('───────────────────────────────────────────────────────');
    console.log(`  TTS Generation:  ${ttsOk ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  ASR API:         ${asrOk ? '✅ PASSED' : '⚠️  SKIPPED'}`);
    console.log(`  Qwen API:        ${qwenOk ? '✅ PASSED' : '⚠️  SKIPPED'}`);
    console.log(`  WebSocket:       ${wsOk ? '✅ PASSED' : '⚠️  Server not running'}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    const coreOk = ttsOk && asrOk && qwenOk;
    
    if (coreOk) {
        console.log('🎉 Core services (TTS + ASR + Qwen) are working!\n');
        console.log('Next steps:');
        console.log('1. Start server: npm start');
        console.log('2. Open browser: http://localhost:3000');
        console.log('3. Test real conversation!\n');
        process.exit(0);
    } else {
        console.log('⚠️  Some core services failed.\n');
        console.log('Please check:');
        console.log('1. .env file has DASHSCOPE_API_KEY');
        console.log('2. pip install edge-tts');
        console.log('3. ffmpeg is installed\n');
        process.exit(1);
    }
}

main().catch(console.error);
