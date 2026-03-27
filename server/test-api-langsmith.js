#!/usr/bin/env node
/**
 * 测试 /v1/chat/completions API 的 LangSmith 追踪
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/v1/chat/completions?session_id=room_test_session_123';

async function test() {
    console.log('🧪 Testing LangSmith tracing via /v1/chat/completions API\n');
    
    const payload = {
        messages: [
            { role: 'user', content: 'Hello! Can you tell me what a lion is?' }
        ],
        stream: false
    };
    
    console.log('📤 Request:', JSON.stringify(payload, null, 2));
    console.log('\n📥 Response:\n');
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
        
        console.log('\n✅ API call completed!');
        console.log('\n📊 Check LangSmith dashboard:');
        console.log('   https://smith.langchain.com');
        console.log('   Project: english-roleplay');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

test();
