#!/usr/bin/env node
/**
 * LangSmith 集成测试脚本
 * 
 * 用法:
 * 1. 设置环境变量
 *    export LANGSMITH_TRACING=true
 *    export LANGSMITH_API_KEY=your-key
 * 
 * 2. 运行测试
 *    node test-langsmith.js
 */

import { isLangSmithAvailable, createLangSmithClient, createTraceRun, logLLMCall } from './langsmith-trace.js';

console.log('🧪 Testing LangSmith Integration...\n');

// 测试 1: 检查可用性
console.log('Test 1: Check availability');
const available = isLangSmithAvailable();
console.log(`  LangSmith available: ${available ? '✅' : '❌'}\n`);

if (!available) {
    console.log('ℹ️  LangSmith is not available. Set LANGSMITH_TRACING=true and LANGSMITH_API_KEY to enable.\n');
    process.exit(0);
}

// 测试 2: 创建客户端
console.log('Test 2: Create client');
const client = createLangSmithClient();
console.log(`  Client created: ${client ? '✅' : '❌'}\n`);

// 测试 3: 创建追踪 Run
console.log('Test 3: Create trace run');
try {
    const run = await createTraceRun('test_completion', 'llm', {
        inputs: { messages: [{ role: 'user', content: 'Hello!' }] },
        metadata: { test: true, timestamp: new Date().toISOString() }
    });
    
    if (run) {
        console.log(`  Run created: ${run.runId}`);
        
        // 结束 Run
        await run.end({ content: 'Hi there!' });
        console.log(`  Run completed: ✅\n`);
    } else {
        console.log(`  Run creation: ❌ (may be disabled)\n`);
    }
} catch (error) {
    console.log(`  Run creation: ❌ ${error.message}\n`);
}

// 测试 4: 记录 LLM 调用
console.log('Test 4: Log LLM call');
try {
    await logLLMCall({
        sessionId: 'test_session_123',
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'What is 2+2?' }
        ],
        response: '2+2 equals 4!',
        duration: 123,
        metadata: { test: true }
    });
    console.log(`  LLM call logged: ✅\n`);
} catch (error) {
    console.log(`  LLM call logging: ❌ ${error.message}\n`);
}

console.log('✅ All tests completed!\n');
console.log('📊 Check your LangSmith dashboard at: https://smith.langchain.com\n');
