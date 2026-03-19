#!/usr/bin/env node
/**
 * Token 诊断脚本
 * 检查环境变量和 token 生成是否正常
 */

import 'dotenv/config';
import { generateToken, verifyToken } from './token-generator-official.js';

console.log('🔍 Token Diagnostics\n');
console.log('====================\n');

// 检查环境变量
console.log('1. Environment Variables:');
console.log(`   VOLC_APP_ID: ${process.env.VOLC_APP_ID ? '✅ Set (' + process.env.VOLC_APP_ID.length + ' chars)' : '❌ Not set'}`);
console.log(`   VOLC_APP_KEY: ${process.env.VOLC_APP_KEY ? '✅ Set' : '❌ Not set'}`);

if (!process.env.VOLC_APP_ID || !process.env.VOLC_APP_KEY) {
    console.log('\n⚠️  Warning: VOLC_APP_ID or VOLC_APP_KEY not set in .env file');
    console.log('   Please copy .env.example to .env and configure these values\n');
} else {
    console.log(`   AppID Length: ${process.env.VOLC_APP_ID.length} (should be 24)`);
    
    if (process.env.VOLC_APP_ID.length !== 24) {
        console.log('   ⚠️  Warning: AppID should be 24 characters\n');
    } else {
        console.log('   ✅ AppID length is correct\n');
    }
    
    // 生成测试 token
    console.log('2. Token Generation Test:');
    const testRoomId = 'diagnostic_room';
    const testUid = 'diagnostic_user';
    
    try {
        const token = generateToken(
            process.env.VOLC_APP_ID,
            process.env.VOLC_APP_KEY,
            testRoomId,
            testUid,
            3600
        );
        
        console.log(`   ✅ Token generated successfully`);
        console.log(`   Token (first 80 chars): ${token.substring(0, 80)}...`);
        console.log(`   Token length: ${token.length} chars\n`);
        
        // 验证 token
        console.log('3. Token Verification Test:');
        const result = verifyToken(token, process.env.VOLC_APP_KEY);
        
        console.log(`   Valid: ${result.valid ? '✅' : '❌'}`);
        console.log(`   Signature Valid: ${result.signatureValid ? '✅' : '❌'}`);
        console.log(`   Expired: ${result.expired ? 'Yes ⚠️' : 'No ✅'}`);
        
        if (result.decoded) {
            console.log('\n4. Decoded Token Info:');
            console.log(`   AppId: ${result.decoded.appId}`);
            console.log(`   RoomId: ${result.decoded.roomID}`);
            console.log(`   Uid: ${result.decoded.userID}`);
            console.log(`   ExpireAt: ${new Date(result.decoded.expireAt * 1000).toLocaleString()}`);
        }
        
        if (result.error) {
            console.log(`\n   ❌ Error: ${result.error}`);
        }
        
        console.log('\n====================');
        console.log('✅ Diagnostic completed\n');
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        console.log(`   Stack: ${error.stack}\n`);
    }
}

// 测试 API 接口
console.log('5. API Endpoint Test:');
console.log('   To test the /api/token endpoint, run:');
console.log(`   curl "http://localhost:3000/api/token?roomId=test123&uid=user456"\n`);
