#!/usr/bin/env node
/**
 * pi-agent-core 接口测试脚本
 * 验证是否符合火山引擎 CustomLLM 标准
 */

import http from 'http';

const TEST_CONFIG = {
    host: 'localhost',
    port: 3001,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer pi-agent-secret-key'
    }
};

const TEST_REQUEST = {
    messages: [
        { role: 'user', content: 'Hello! What is your name?' }
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 100,
    top_p: 0.9,
    model: 'pi-agent-v1',
    stream_options: { include_usage: true }
};

console.log('🧪 Testing PI-Agent-Core API...\n');
console.log('Endpoint:', `http://${TEST_CONFIG.host}:${TEST_CONFIG.port}${TEST_CONFIG.path}`);
console.log('Request:', JSON.stringify(TEST_REQUEST, null, 2));
console.log('\n--- Response ---\n');

const req = http.request(TEST_CONFIG, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers, null, 2));
    console.log('\n--- Stream Content ---\n');
    
    let chunks = 0;
    let content = '';
    
    res.on('data', (chunk) => {
        chunks++;
        const text = chunk.toString();
        content += text;
        
        // 解析并显示每个 chunk
        const lines = text.split('\n').filter(line => line.trim());
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                    console.log('✅ End marker received: data: [DONE]');
                } else {
                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta;
                        if (delta?.content) {
                            process.stdout.write(delta.content);
                        }
                        if (parsed.choices?.[0]?.finish_reason) {
                            console.log('\n✅ Finish reason:', parsed.choices[0].finish_reason);
                        }
                        if (parsed.usage) {
                            console.log('📊 Usage:', JSON.stringify(parsed.usage));
                        }
                    } catch (e) {
                        // Ignore parse errors for non-JSON lines
                    }
                }
            }
        }
    });
    
    res.on('end', () => {
        console.log('\n\n--- Test Summary ---');
        console.log('Total chunks:', chunks);
        console.log('Content length:', content.length);
        console.log('✅ Test completed!\n');
        
        // 验证健康检查
        console.log('📋 Next step: Check health endpoint');
        http.get(`http://${TEST_CONFIG.host}:${TEST_CONFIG.port}/health`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log('Health:', data);
            });
        }).on('error', (err) => {
            console.error('❌ Health check failed:', err.message);
        });
    });
});

req.on('error', (err) => {
    console.error('❌ Request failed:', err.message);
    console.log('\n💡 Make sure pi-agent-server.js is running:');
    console.log('   node server/pi-agent-server.js\n');
    process.exit(1);
});

req.write(JSON.stringify(TEST_REQUEST));
req.end();
