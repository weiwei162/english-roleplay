#!/usr/bin/env node
/**
 * LangSmith + pi-agent-core 完整事件追踪测试脚本
 * 
 * 使用方法：
 * export LANGSMITH_TRACING=true
 * export LANGSMITH_API_KEY=lsv2_xxx
 * node test-langsmith-events.js
 */

import { Agent } from '@mariozechner/pi-agent-core';
import { getModel } from '@mariozechner/pi-ai';
import { attachLangSmithTracing, isLangSmithAvailable } from './langsmith-trace.js';

// 检查 LangSmith 是否可用
console.log('🔍 Checking LangSmith availability...');
if (!isLangSmithAvailable()) {
    console.log('❌ LangSmith not available. Please set:');
    console.log('   export LANGSMITH_TRACING=true');
    console.log('   export LANGSMITH_API_KEY=lsv2_xxx');
    process.exit(1);
}
console.log('✅ LangSmith available\n');

// 定义测试工具
const dictionaryTool = {
    name: 'dictionary',
    description: 'Look up the meaning of an English word',
    parameters: {
        type: 'object',
        properties: {
            word: { type: 'string', description: 'The word to look up' }
        },
        required: ['word']
    },
    execute: async (toolCallId, params, signal, onUpdate) => {
        console.log(`\n🔧 [Tool] dictionary called with: ${JSON.stringify(params)}`);
        
        // 模拟流式更新
        onUpdate?.({ 
            content: [{ type: 'text', text: 'Looking up...' }],
            details: { status: 'searching' }
        });
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const definitions = {
            'lion': 'A big yellow cat that roars. King of animals! 🦁',
            'elephant': 'A very big gray animal with a long nose (trunk). 🐘',
            'hello': 'A friendly greeting! 👋'
        };
        
        const word = params.word?.toLowerCase();
        const definition = definitions[word] || `A special word: ${word}`;
        
        console.log(`🔧 [Tool] dictionary returning: ${definition}`);
        
        return {
            content: [{ type: 'text', text: definition }],
            details: { word: params.word, found: !!definitions[word] }
        };
    }
};

const showEmojiTool = {
    name: 'showEmoji',
    description: 'Show an emoji to the user',
    parameters: {
        type: 'object',
        properties: {
            emoji: { type: 'string', description: 'Emoji to display' }
        },
        required: ['emoji']
    },
    execute: async (toolCallId, params, signal, onUpdate) => {
        console.log(`\n🔧 [Tool] showEmoji called with: ${params.emoji}`);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        return {
            content: [{ type: 'text', text: `Look! ${params.emoji}!` }],
            details: { emoji: params.emoji }
        };
    }
};

// 创建测试 Agent
const sessionId = `test_session_${Date.now()}`;
console.log(`📊 Test Session ID: ${sessionId}\n`);

const agent = new Agent({
    initialState: {
        systemPrompt: `You are a friendly English teacher for kids. 
You can use tools to:
1. Look up word meanings (dictionary)
2. Show emojis (showEmoji)

Always be encouraging and fun! Use emojis when appropriate.`,
        model: getModel('openai', 'gpt-4o-mini'),
        thinkingLevel: 'off',
        tools: [dictionaryTool, showEmojiTool],
        messages: []
    }
});

// 附加 LangSmith 追踪
console.log('📡 Attaching LangSmith tracing...');
const cleanup = attachLangSmithTracing(agent, sessionId, 'english-roleplay-test');
console.log('✅ LangSmith tracing attached\n');

// 订阅所有事件用于调试
console.log('📋 Event Stream:\n');
const debugUnsubscribe = agent.subscribe((event) => {
    const timestamp = new Date().toLocaleTimeString();
    
    switch (event.type) {
        case 'agent_start':
            console.log(`[${timestamp}] 🔵 agent_start`);
            break;
        case 'agent_end':
            console.log(`[${timestamp}] 🟢 agent_end`);
            break;
        case 'turn_start':
            console.log(`[${timestamp}] 🔵 turn_start (turn ${event.turnIndex || 0})`);
            break;
        case 'turn_end':
            console.log(`[${timestamp}] 🟢 turn_end`);
            break;
        case 'message_start':
            console.log(`[${timestamp}] 🔵 message_start (${event.message?.role})`);
            break;
        case 'message_update':
            if (event.assistantMessageEvent?.type === 'text_delta') {
                console.log(`[${timestamp}] 💬 message_update: "${event.assistantMessageEvent.delta}"`);
            }
            break;
        case 'message_end':
            console.log(`[${timestamp}] 🟢 message_end`);
            break;
        case 'tool_execution_start':
            console.log(`[${timestamp}] 🔵 tool_execution_start (${event.toolName})`);
            break;
        case 'tool_execution_update':
            console.log(`[${timestamp}] 💬 tool_execution_update`);
            break;
        case 'tool_execution_end':
            console.log(`[${timestamp}] 🟢 tool_execution_end (${event.toolCallId})`);
            break;
        default:
            console.log(`[${timestamp}] ⚪ ${event.type}`);
    }
});

// 运行测试
async function runTest() {
    console.log('🚀 Starting test conversation...\n');
    console.log('='.repeat(60));
    
    try {
        // 测试 1: 简单对话（无工具）
        console.log('\n📝 Test 1: Simple greeting (no tools)');
        console.log('User: "Hello!"');
        await agent.prompt('Hello!');
        console.log('✅ Test 1 complete\n');
        
        // 测试 2: 触发工具调用
        console.log('📝 Test 2: Tool invocation');
        console.log('User: "What does lion mean?"');
        await agent.prompt('What does lion mean?');
        console.log('✅ Test 2 complete\n');
        
        // 测试 3: 多轮对话
        console.log('📝 Test 3: Multi-turn conversation');
        console.log('User: "Show me a lion emoji!"');
        await agent.prompt('Show me a lion emoji!');
        console.log('✅ Test 3 complete\n');
        
        console.log('='.repeat(60));
        console.log('\n🎉 All tests completed!\n');
        
        // 打印最终状态
        console.log('📊 Final Agent State:');
        console.log(`   Messages: ${agent.state.messages.length}`);
        console.log(`   Is Streaming: ${agent.state.isStreaming}`);
        console.log(`   Pending Tool Calls: ${agent.state.pendingToolCalls.size}`);
        
        // 等待一小段时间确保所有 LangSmith 事件已发送
        console.log('\n⏳ Waiting for LangSmith to sync...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\n✅ Done! Check your LangSmith dashboard:');
        console.log('   https://smith.langchain.com');
        console.log(`   Project: english-roleplay-test`);
        console.log(`   Session: ${sessionId}`);
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        debugUnsubscribe();
        cleanup();
    }
}

// 运行测试
runTest();
