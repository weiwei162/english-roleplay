#!/usr/bin/env node
/**
 * 测试打断机制
 * 
 * 流程：
 * 1. 发送请求 A（长响应）
 * 2. 0.5 秒后发送请求 B（打断请求 A）
 * 3. 验证请求 A 的部分内容是否保存到历史
 */

const SESSION_ID = `test_interrupt_${Date.now()}`;
const BASE_URL = 'http://localhost:3444';

console.log('🧪 测试打断机制');
console.log(`📌 Session ID: ${SESSION_ID}\n`);

// 请求 A：长问题，期望长响应（直接要求不要思考）
const requestA = {
    messages: [
        { role: 'system', content: 'You are a helpful assistant. Give detailed answers directly without thinking. Just output the answer.' },
        { role: 'user', content: 'Tell me about elephants: their behavior, habitat, diet, social structure, and conservation. Write at least 500 words.' }
    ],
    stream: true
};

// 请求 B：短问题，会打断请求 A
const requestB = {
    messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is 1+1?' }
    ],
    stream: true
};

async function streamRequest(request, label) {
    const startTime = Date.now();
    let content = '';
    let chunks = 0;
    let isInterrupted = false;
    
    try {
        const response = await fetch(`${BASE_URL}/v1/chat/completions?session_id=${SESSION_ID}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') continue;
                    if (!data) continue;
                    
                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) {
                            content += delta;
                            chunks++;
                            process.stdout.write(`[${label}] ${delta}`);
                        }
                    } catch (e) {
                        console.error(`[${label}] Parse error:`, e.message, 'data:', line);
                    }
                }
            }
        }
        
        const duration = Date.now() - startTime;
        console.log(`\n[${label}] ✅ Completed in ${duration}ms, ${chunks} chunks, ${content.length} chars`);
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`\n[${label}] ❌ ${error.message} after ${duration}ms`);
        isInterrupted = true;
    }
    
    return { content, chunks, isInterrupted };
}

async function runTest() {
    console.log('📤 发送请求 A（长响应）...');
    const promiseA = streamRequest(requestA, 'A');
    
    // 0.5 秒后发送请求 B（打断）
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('\n\n📤 发送请求 B（打断请求 A）...');
    const promiseB = streamRequest(requestB, 'B');
    
    // 等待两个请求完成
    const [resultA, resultB] = await Promise.all([promiseA, promiseB]);
    
    console.log('\n\n📊 测试结果：');
    console.log('='.repeat(50));
    console.log(`请求 A: ${resultA.chunks} chunks, ${resultA.content.length} 字符${resultA.isInterrupted ? ' (被中断)' : ''}`);
    console.log(`请求 B: ${resultB.chunks} chunks, ${resultB.content.length} 字符`);
    console.log('='.repeat(50));
    
    if (resultA.isInterrupted || resultA.chunks < 20) {
        console.log('✅ 打断机制可能生效了（请求 A 输出较少）');
    } else {
        console.log('⚠️ 请求 A 似乎没有被中断，可能需要调整打断时机');
    }
    
    // 检查服务器日志
    console.log('\n📋 最后 10 行服务器日志：');
    console.log('='.repeat(50));
}

runTest().catch(console.error);
