#!/usr/bin/env node
/**
 * 火山引擎 RTC Token 生成工具
 * 
 * 参考官方文档：
 * - Token 生成：https://www.volcengine.com/docs/6348/70114
 * - 参数赋值规范：https://www.volcengine.com/docs/6348/70114
 * 
 * 使用方法：
 * node token-generator.js <appId> <appKey> <roomId> <uid> [expireSeconds]
 * 
 * 示例：
 * node token-generator.js 123456 abcdef room123 user1 86400
 */

const crypto = require('crypto');

/**
 * 生成 RTC Token
 * 
 * @param {string} appId - RTC AppID
 * @param {string} appKey - RTC AppKey
 * @param {string} roomId - 房间 ID
 * @param {string} uid - 用户 ID
 * @param {number} expireSeconds - 有效期（秒），默认 24 小时
 * @returns {string} Base64 编码的 Token
 */
function generateToken(appId, appKey, roomId, uid, expireSeconds = 86400) {
    if (!appId || !appKey) {
        throw new Error('AppId and AppKey are required');
    }
    
    if (!roomId || !uid) {
        throw new Error('RoomId and Uid are required');
    }
    
    const now = Math.floor(Date.now() / 1000);
    const expire = now + expireSeconds;
    
    // Token payload（官方格式）
    const payload = {
        app_id: appId,
        room_id: roomId,
        uid: uid,
        expire: expire,
        // 权限配置（至少需要一个权限才能进房）
        permissions: {
            // 订阅流权限（接收音视频）
            subscribe_stream: true,
            // 发布流权限（发送音视频）
            publish_stream: true,
            // 订阅消息权限
            subscribe_message: true,
            // 发布消息权限
            publish_message: true
        }
    };
    
    // 生成签名（使用 HMAC-SHA256）
    const signature = crypto.createHmac('sha256', appKey)
        .update(JSON.stringify(payload))
        .digest('hex');
    
    // 组合 Token
    const token = {
        ...payload,
        signature
    };
    
    // Base64 编码
    return Buffer.from(JSON.stringify(token)).toString('base64');
}

/**
 * 生成通配 Token（可以加入任意房间）
 * 
 * @param {string} appId - RTC AppID
 * @param {string} appKey - RTC AppKey
 * @param {string} uid - 用户 ID
 * @param {number} expireSeconds - 有效期（秒）
 * @returns {string} Base64 编码的通配 Token
 */
function generateWildcardToken(appId, appKey, uid, expireSeconds = 86400) {
    // 通配 Token 使用 "*" 作为 roomId
    return generateToken(appId, appKey, '*', uid, expireSeconds);
}

/**
 * 验证 Token
 * 
 * @param {string} token - Base64 编码的 Token
 * @param {string} appKey - RTC AppKey
 * @returns {Object} 验证结果
 */
function verifyToken(token, appKey) {
    try {
        // Base64 解码
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
        
        // 提取签名
        const { signature, ...payload } = decoded;
        
        // 重新计算签名
        const expectedSignature = crypto.createHmac('sha256', appKey)
            .update(JSON.stringify(payload))
            .digest('hex');
        
        // 验证签名
        const isValid = signature === expectedSignature;
        
        // 检查过期时间
        const now = Math.floor(Date.now() / 1000);
        const isExpired = decoded.expire <= now;
        
        return {
            valid: isValid && !isExpired,
            decoded: decoded,
            expired: isExpired,
            signatureValid: isValid
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}

// ==================== CLI 使用 ====================

if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 4) {
        console.log(`
火山引擎 RTC Token 生成工具

用法:
  node token-generator.js <appId> <appKey> <roomId> <uid> [expireSeconds]

参数:
  appId         - RTC AppID
  appKey        - RTC AppKey
  roomId        - 房间 ID
  uid           - 用户 ID
  expireSeconds - 有效期（秒），默认 86400（24 小时）

示例:
  node token-generator.js 123456 abcdef room123 user1 86400
  node token-generator.js 123456 abcdef '*' user1  # 通配 Token

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
        
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
        console.log('AppId:', decoded.app_id);
        console.log('RoomId:', decoded.room_id);
        console.log('Uid:', decoded.uid);
        console.log('过期时间:', new Date(decoded.expire * 1000).toLocaleString());
        console.log('有效期:', (decoded.expire - Math.floor(Date.now() / 1000)) / 3600, '小时');
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
        process.exit(1);
    }
}

// ==================== 导出 ====================

module.exports = {
    generateToken,
    generateWildcardToken,
    verifyToken
};
