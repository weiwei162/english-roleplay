#!/usr/bin/env node
/**
 * Token 生成测试脚本
 * 用于验证 token 生成和验证逻辑是否正确
 */

import { generateToken, verifyToken } from './token-generator-official.js';

// 测试配置
const APP_ID = 'test_app_id_123456789012';  // 24 位
const APP_KEY = 'test_app_key_secret';
const ROOM_ID = 'test_room_123';
const UID = 'test_user_456';

console.log('🧪 Testing Token Generation...\n');
console.log('Config:');
console.log(`  AppID: ${APP_ID}`);
console.log(`  AppKey: ${APP_KEY}`);
console.log(`  RoomID: ${ROOM_ID}`);
console.log(`  UID: ${UID}\n`);

try {
    // 生成 Token
    console.log('📝 Generating token...');
    const token = generateToken(APP_ID, APP_KEY, ROOM_ID, UID, 3600);
    console.log(`✅ Token generated: ${token.substring(0, 80)}...`);
    console.log(`   Total length: ${token.length} characters\n`);
    
    // 验证 Token
    console.log('🔍 Verifying token...');
    const result = verifyToken(token, APP_KEY);
    
    console.log('\nVerification result:');
    console.log(`  Valid: ${result.valid}`);
    console.log(`  Signature Valid: ${result.signatureValid}`);
    console.log(`  Expired: ${result.expired}`);
    
    if (result.decoded) {
        console.log('\nDecoded token info:');
        console.log(`  AppId: ${result.decoded.appId}`);
        console.log(`  RoomId: ${result.decoded.roomID}`);
        console.log(`  Uid: ${result.decoded.userID}`);
        console.log(`  ExpireAt: ${new Date(result.decoded.expireAt * 1000).toLocaleString()}`);
        console.log(`  Privileges: ${JSON.stringify(result.decoded.privileges)}`);
    }
    
    if (result.error) {
        console.log(`\n❌ Error: ${result.error}`);
    }
    
    // 测试错误情况
    console.log('\n\n🧪 Testing error cases...\n');
    
    // 测试过期 token
    console.log('Testing expired token...');
    const expiredToken = generateToken(APP_ID, APP_KEY, ROOM_ID, UID, 1); // 1 秒过期
    console.log(`Generated token with 1 second expiry`);
    
    // 等待 2 秒
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const expiredResult = verifyToken(expiredToken, APP_KEY);
    console.log(`Expired check: ${expiredResult.expired ? '✅ Correctly detected as expired' : '❌ Failed to detect expiry'}`);
    
    // 测试错误的 appKey
    console.log('\nTesting wrong appKey...');
    const wrongKeyResult = verifyToken(token, 'wrong_app_key');
    console.log(`Signature check: ${!wrongKeyResult.signatureValid ? '✅ Correctly detected wrong key' : '❌ Failed to detect wrong key'}`);
    
    console.log('\n✅ All tests completed!\n');
    
} catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
}
