// 测试阿里云百炼 API 连接
// 使用方法：node test-bailian.js

require('dotenv').config();

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || 'sk-xxx';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen-plus';

// ==================== 测试 Qwen 对话 API ====================

async function testQwenAPI() {
    console.log('🤖 Testing Qwen API...\n');
    
    if (!DASHSCOPE_API_KEY || DASHSCOPE_API_KEY === 'sk-xxx') {
        console.error('❌ Please set DASHSCOPE_API_KEY in .env file');
        return false;
    }
    
    try {
        const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
            },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a friendly English teacher for kids. Use simple words and short sentences.'
                    },
                    {
                        role: 'user',
                        content: 'Hello! What is your name?'
                    }
                ]
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        const reply = data.choices[0].message.content;
        
        console.log('✅ Qwen API Response:');
        console.log('─'.repeat(50));
        console.log(reply);
        console.log('─'.repeat(50));
        console.log(`\n💰 Usage: ${data.usage.total_tokens} tokens\n`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Qwen API Error:', error.message);
        return false;
    }
}

// ==================== 测试 ASR WebSocket ====================

async function testASRWebSocket() {
    console.log('🎤 Testing ASR WebSocket...\n');
    
    if (!DASHSCOPE_API_KEY || DASHSCOPE_API_KEY === 'sk-xxx') {
        console.error('❌ Please set DASHSCOPE_API_KEY in .env file');
        return false;
    }
    
    const WebSocket = require('websocket-client');
    const ASR_WS_URL = process.env.ASR_WS_URL || 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime';
    
    return new Promise((resolve) => {
        try {
            const ws = new WebSocket(ASR_WS_URL + '?model=qwen3-asr-flash-realtime', {
                headers: {
                    'Authorization': 'Bearer ' + DASHSCOPE_API_KEY,
                    'OpenAI-Beta': 'realtime=v1'
                }
            });
            
            let connected = false;
            const timeout = setTimeout(() => {
                if (!connected) {
                    console.error('❌ ASR WebSocket timeout (5s)');
                    ws.close();
                    resolve(false);
                }
            }, 5000);
            
            ws.on('open', () => {
                console.log('✅ ASR WebSocket Connected!');
                console.log(`📡 URL: ${ASR_WS_URL}`);
                console.log(`🎤 Model: qwen3-asr-flash-realtime\n`);
                connected = true;
                
                // 发送会话配置
                ws.send(JSON.stringify({
                    type: 'session.update',
                    session: {
                        input_audio_format: 'pcm',
                        sample_rate: 16000,
                        input_audio_transcription: {
                            language: 'en'
                        },
                        turn_detection: {
                            type: 'server_vad',
                            threshold: 0.0,
                            silence_duration_ms: 400
                        }
                    }
                }));
                
                console.log('📤 Sent session.update event\n');
            });
            
            ws.on('message', (data) => {
                const event = JSON.parse(data.toString());
                console.log('📨 Received event:', event.type);
                
                if (event.type === 'session.created') {
                    console.log('✅ Session created:', event.session.id);
                }
                
                // 收到任何事件都认为连接成功
                if (connected) {
                    clearTimeout(timeout);
                    ws.close();
                    console.log('\n✅ ASR WebSocket test PASSED\n');
                    resolve(true);
                }
            });
            
            ws.on('error', (error) => {
                clearTimeout(timeout);
                console.error('❌ ASR WebSocket Error:', error.message);
                resolve(false);
            });
            
            ws.on('close', (code, reason) => {
                console.log(`🔌 WebSocket closed: ${code}`);
                if (!connected) {
                    resolve(false);
                }
            });
            
        } catch (error) {
            console.error('❌ Failed to create ASR WebSocket:', error.message);
            resolve(false);
        }
    });
}

// ==================== 主函数 ====================

async function main() {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║    Alibaba Bailian API Test Suite                    ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    
    const qwenResult = await testQwenAPI();
    
    console.log('\n');
    
    const asrResult = await testASRWebSocket();
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('Test Summary:');
    console.log('───────────────────────────────────────────────────────');
    console.log(`  Qwen API:     ${qwenResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  ASR WebSocket: ${asrResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (qwenResult && asrResult) {
        console.log('🎉 All tests passed! Ready to use Alibaba Bailian.\n');
        process.exit(0);
    } else {
        console.log('⚠️  Some tests failed. Please check your configuration.\n');
        process.exit(1);
    }
}

main();
