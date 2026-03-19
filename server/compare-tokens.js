#!/usr/bin/env node
/**
 * 比较两种 Token 生成器的输出
 */

import { AccessToken, Parse } from './AccessToken.js';
import { generateToken as generateOfficialToken, verifyToken } from './token-generator-official.js';

const APP_ID = 'test_app_id_123456789012';
const APP_KEY = 'test_app_key_secret';
const ROOM_ID = 'test_room_123';
const UID = 'test_user_456';

console.log('🔬 Comparing Token Generators\n');
console.log('=' .repeat(50) + '\n');

// 方法 1: AccessToken.js
console.log('1. AccessToken.js:\n');
const token1 = new AccessToken(APP_ID, APP_KEY, ROOM_ID, UID);
const expireAt = Math.floor(Date.now() / 1000) + 3600;
token1.expireTime(expireAt);
token1.addPrivilege(0, expireAt);
token1.addPrivilege(4, expireAt);
const tokenString1 = token1.serialize();

console.log(`   Token: ${tokenString1.substring(0, 80)}...`);
console.log(`   Length: ${tokenString1.length}\n`);

const parsed1 = Parse(tokenString1);
console.log(`   Parsed RoomID: ${parsed1?.roomID}`);
console.log(`   Verify: ${parsed1?.verify(APP_KEY)}\n`);

// 方法 2: token-generator-official.js
console.log('2. token-generator-official.js:\n');
const tokenString2 = generateOfficialToken(APP_ID, APP_KEY, ROOM_ID, UID, 3600);

console.log(`   Token: ${tokenString2.substring(0, 80)}...`);
console.log(`   Length: ${tokenString2.length}\n`);

const verified2 = verifyToken(tokenString2, APP_KEY);
console.log(`   Valid: ${verified2.valid}`);
console.log(`   RoomID: ${verified2.decoded?.roomID}\n`);

// 比较
console.log('=' .repeat(50));
console.log('\n📊 Comparison:\n');
console.log(`   Length diff: ${tokenString2.length - tokenString1.length} bytes`);
console.log(`   AccessToken.js uses ByteBuf.putBytes() (with 2-byte length prefix)`);
console.log(`   token-generator-official.js uses Buffer.concat() (no length prefix)\n`);
