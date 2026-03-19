#!/usr/bin/env node
/**
 * 测试 volc-start-voicechat.js 的 Token 生成（修改后）
 */

import { VolcStartVoiceChatClient } from './volc-start-voicechat.js';

// 模拟环境变量
process.env.VOLC_APP_ID = 'test_app_id_123456789012';
process.env.VOLC_APP_KEY = 'test_app_key_secret';

const client = new VolcStartVoiceChatClient({
    accessKey: 'test_access_key',
    secretKey: 'test_secret_key',
    region: 'cn-north-1'
});

console.log('🧪 Testing volc-start-voicechat.js Token Generation\n');

try {
    const token = client.generateToken('test_room', 'test_user', 3600);
    
    console.log('✅ Token generated:');
    console.log(`   ${token.substring(0, 80)}...`);
    console.log(`   Length: ${token.length} chars\n`);
    
    // 使用 AccessToken.js 解析验证
    import('./AccessToken.js').then(({ Parse }) => {
        const parsed = Parse(token);
        
        if (parsed) {
            console.log('✅ Token parsed successfully:');
            console.log(`   AppID: ${parsed.appID}`);
            console.log(`   RoomID: ${parsed.roomID}`);
            console.log(`   UserID: ${parsed.userID}`);
            
            const valid = parsed.verify(process.env.VOLC_APP_KEY);
            console.log(`   Signature valid: ${valid ? '✅' : '❌'}`);
        } else {
            console.log('❌ Failed to parse token');
        }
    });
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
}
