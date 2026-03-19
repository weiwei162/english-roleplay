#!/usr/bin/env node
/**
 * 使用 AccessToken.js 测试 Token 生成
 */

import { AccessToken, Parse } from './AccessToken.js';

const APP_ID = 'test_app_id_123456789012';
const APP_KEY = 'test_app_key_secret';
const ROOM_ID = 'test_room_123';
const UID = 'test_user_456';

console.log('🧪 Testing AccessToken.js Token Generation\n');

// 创建 Token
const token = new AccessToken(APP_ID, APP_KEY, ROOM_ID, UID);

// 设置过期时间（1 小时后）
const expireAt = Math.floor(Date.now() / 1000) + 3600;
token.expireTime(expireAt);

// 添加权限
token.addPrivilege(0, expireAt); // PrivPublishStream
token.addPrivilege(4, expireAt); // PrivSubscribeStream

// 生成 Token 字符串
const tokenString = token.serialize();

console.log('✅ Token generated:');
console.log(`   ${tokenString.substring(0, 80)}...`);
console.log(`   Length: ${tokenString.length} chars\n`);

// 解析 Token
console.log('🔍 Parsing token...');
const parsed = Parse(tokenString);

if (parsed) {
    console.log('✅ Token parsed successfully:');
    console.log(`   AppID: ${parsed.appID}`);
    console.log(`   RoomID: ${parsed.roomID}`);
    console.log(`   UserID: ${parsed.userID}`);
    console.log(`   ExpireAt: ${new Date(parsed.expireAt * 1000).toLocaleString()}`);
    console.log(`   Privileges: ${JSON.stringify(parsed.privileges)}`);
    
    // 验证签名
    console.log('\n🔐 Verifying signature...');
    const valid = parsed.verify(APP_KEY);
    console.log(`   Signature valid: ${valid ? '✅' : '❌'}`);
} else {
    console.log('❌ Failed to parse token');
}
