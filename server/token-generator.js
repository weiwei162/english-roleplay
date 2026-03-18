#!/usr/bin/env node
/**
 * 火山引擎 RTC Token 生成工具
 * 基于官方 AccessToken.js 实现
 */

import { AccessToken } from './AccessToken.js';

/**
 * 生成 RTC Token
 * 
 * @param {string} appId - RTC AppID
 * @param {string} appKey - RTC AppKey
 * @param {string} roomId - 房间 ID（通配 Token 传 "*"）
 * @param {string} uid - 用户 ID
 * @param {number} expireSeconds - 有效期（秒），默认 24 小时
 * @returns {string} Token 字符串
 */
function generateToken(appId, appKey, roomId, uid, expireSeconds = 86400) {
    if (!appId || !appKey) {
        throw new Error('AppId and AppKey are required');
    }
    
    if (!roomId || !uid) {
        throw new Error('RoomId and Uid are required');
    }
    
    const now = Math.floor(Date.now() / 1000);
    const expireAt = now + expireSeconds;
    
    // 创建 Token
    const token = new AccessToken.AccessToken(appId, appKey, roomId, uid);
    
    // 设置过期时间
    token.expireTime(expireAt);
    
    // 添加权限
    // PrivPublishStream (0) = 发布流权限
    // PrivSubscribeStream (4) = 订阅流权限
    token.addPrivilege(AccessToken.privileges.PrivPublishStream, expireAt);
    token.addPrivilege(AccessToken.privileges.PrivSubscribeStream, expireAt);
    
    // 生成 Token 字符串
    return token.serialize();
}

/**
 * 生成通配 Token
 */
function generateWildcardToken(appId, appKey, uid, expireSeconds = 86400) {
    return generateToken(appId, appKey, '*', uid, expireSeconds);
}

/**
 * 验证 Token
 */
function verifyToken(tokenString, appKey) {
    try {
        const token = AccessToken.Parse(tokenString);
        
        if (!token) {
            return {
                valid: false,
                error: 'Failed to parse token'
            };
        }
        
        // 验证签名
        const signatureValid = token.verify(appKey);
        
        // 检查过期
        const now = Math.floor(Date.now() / 1000);
        const isExpired = token.expireAt > 0 && now > token.expireAt;
        
        return {
            valid: signatureValid && !isExpired,
            decoded: {
                appId: token.appID,
                roomID: token.roomID,
                userID: token.userID,
                nonce: token.nonce,
                issuedAt: token.issuedAt,
                expireAt: token.expireAt,
                privileges: token.privileges
            },
            expired: isExpired,
            signatureValid: signatureValid
        };
    } catch (err) {
        return {
            valid: false,
            error: err.message
        };
    }
}

// ==================== CLI 使用 ====================

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
if (process.argv[1] === __filename) {
    const args = process.argv.slice(2);
    
    if (args.length < 4) {
        console.log(`
火山引擎 RTC Token 生成工具（官方算法）

用法:
  node token-generator.js <appId> <appKey> <roomId> <uid> [expireSeconds]

参数:
  appId         - RTC AppID
  appKey        - RTC AppKey
  roomId        - 房间 ID（通配 Token 传 "*"）
  uid           - 用户 ID
  expireSeconds - 有效期（秒），默认 86400（24 小时）

示例:
  node token-generator.js 123456789012345678901234 abcdef room123 user1 86400

`);
        process.exit(1);
    }
    
    const [appId, appKey, roomId, uid, expireSeconds] = args;
    
    try {
        const token = generateToken(appId, appKey, roomId, uid, parseInt(expireSeconds) || 86400);
        
        console.log('✅ Token 生成成功：\n');
        console.log(token);
        console.log('\n====================');
        console.log('Token 信息:');
        
        const verify = verifyToken(token, appKey);
        if (verify.valid) {
            console.log('AppId:', verify.decoded.appId);
            console.log('RoomId:', verify.decoded.roomID);
            console.log('Uid:', verify.decoded.userID);
            console.log('过期时间:', new Date(verify.decoded.expireAt * 1000).toLocaleString());
            console.log('权限:', verify.decoded.privileges);
            console.log('\n验证结果: ✅ 有效');
        } else {
            console.log('❌ 验证失败:', verify.error);
        }
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
        process.exit(1);
    }
}

export {
    generateToken,
    generateWildcardToken,
    verifyToken,
    AccessToken
};
