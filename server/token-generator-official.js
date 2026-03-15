#!/usr/bin/env node
/**
 * 火山引擎 RTC Token 生成工具（官方算法）
 * 
 * 基于官方提供的 AccessToken.js 实现
 */

const crypto = require('crypto');

const VERSION = "001";
const VERSION_LENGTH = 3;
const APP_ID_LENGTH = 24;

// 权限常量
const privileges = {
    PrivPublishStream: 0,
    privPublishAudioStream: 1,
    privPublishVideoStream: 2,
    privPublishDataStream: 3,
    PrivSubscribeStream: 4
};

/**
 * ByteBuf - 字节缓冲区（官方实现）
 */
class ByteBuf {
    constructor() {
        this.buffer = Buffer.alloc(1024);
        this.position = 0;
    }

    pack() {
        const out = Buffer.alloc(this.position);
        this.buffer.copy(out, 0, 0, out.length);
        return out;
    }

    putUint16(v) {
        this.buffer.writeUInt16LE(v, this.position);
        this.position += 2;
        return this;
    }

    putUint32(v) {
        this.buffer.writeUInt32LE(v, this.position);
        this.position += 4;
        return this;
    }

    putBytes(bytes) {
        this.putUint16(bytes.length);
        bytes.copy(this.buffer, this.position);
        this.position += bytes.length;
        return this;
    }

    putString(str) {
        return this.putBytes(Buffer.from(str));
    }

    putTreeMapUInt32(map) {
        if (!map) {
            this.putUint16(0);
            return this;
        }

        this.putUint16(Object.keys(map).length);
        for (let key in map) {
            this.putUint16(parseInt(key));
            this.putUint32(map[key]);
        }

        return this;
    }
}

/**
 * 生成 RTC Token（官方算法）
 * 
 * @param {string} appId - RTC AppID（24 位）
 * @param {string} appKey - RTC AppKey
 * @param {string} roomId - 房间 ID
 * @param {string} uid - 用户 ID
 * @param {number} expireSeconds - 有效期（秒），默认 24 小时
 * @returns {string} Token 字符串（格式：001 + appId + base64 内容）
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
    const nonce = Math.floor(Math.random() * 0xFFFFFFFF);

    // 创建 Token 对象
    const token = {
        appID: appId,
        appKey: appKey,
        roomID: roomId,
        userID: uid,
        issuedAt: now,
        nonce: nonce,
        expireAt: expireAt,
        privileges: {}
    };

    // 添加权限
    // PrivPublishStream (0) = 发布流权限
    // PrivSubscribeStream (4) = 订阅流权限
    addPrivilege(token, privileges.PrivPublishStream, expireAt);
    addPrivilege(token, privileges.PrivSubscribeStream, expireAt);

    // 打包消息
    const message = packMessage(token);
    
    // 生成签名
    const signature = crypto.createHmac('sha256', appKey).update(message).digest();
    
    // 组合内容
    const content = Buffer.concat([message, signature]);
    
    // 生成最终 Token：VERSION + appId + base64(content)
    return VERSION + appId + content.toString('base64');
}

/**
 * 打包消息
 */
function packMessage(token) {
    const buf = new ByteBuf();
    buf.putUint32(token.nonce);
    buf.putUint32(token.issuedAt);
    buf.putUint32(token.expireAt);
    buf.putString(token.roomID);
    buf.putString(token.userID);
    buf.putTreeMapUInt32(token.privileges);
    return buf.pack();
}

/**
 * 添加权限
 */
function addPrivilege(token, privilege, expireTimestamp) {
    if (token.privileges === undefined) {
        token.privileges = {};
    }
    token.privileges[privilege] = expireTimestamp;

    // 如果添加了 PrivPublishStream，同时添加子权限
    if (privilege === privileges.PrivPublishStream) {
        token.privileges[privileges.privPublishVideoStream] = expireTimestamp;
        token.privileges[privileges.privPublishAudioStream] = expireTimestamp;
        token.privileges[privileges.privPublishDataStream] = expireTimestamp;
    }
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
        if (tokenString.length <= VERSION_LENGTH + APP_ID_LENGTH) {
            return { valid: false, error: 'Invalid token length' };
        }
        
        if (tokenString.substr(0, VERSION_LENGTH) !== VERSION) {
            return { valid: false, error: 'Invalid version' };
        }

        const appId = tokenString.substr(VERSION_LENGTH, APP_ID_LENGTH);
        const contentBuf = Buffer.from(tokenString.substr(VERSION_LENGTH + APP_ID_LENGTH), 'base64');
        
        // 签名长度是 32 字节（SHA256）
        const signatureLength = 32;
        const messageLength = contentBuf.length - signatureLength;
        
        const message = contentBuf.slice(0, messageLength);
        const signature = contentBuf.slice(messageLength);

        // 验证签名
        const expectedSignature = crypto.createHmac('sha256', appKey).update(message).digest();
        const signatureValid = signature === expectedSignature.toString();

        // 解析消息
        const msgBuf = new ReadByteBuf(message);
        const nonce = msgBuf.getUint32();
        const issuedAt = msgBuf.getUint32();
        const expireAt = msgBuf.getUint32();
        const roomID = msgBuf.getString().toString();
        const userID = msgBuf.getString().toString();
        const privileges = msgBuf.getTreeMapUInt32();

        // 检查过期
        const now = Math.floor(Date.now() / 1000);
        const isExpired = expireAt > 0 && now > expireAt;

        return {
            valid: signatureValid && !isExpired,
            decoded: {
                appId,
                roomID,
                userID,
                nonce,
                issuedAt,
                expireAt,
                privileges
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

class ReadByteBuf {
    constructor(bytes) {
        this.buffer = bytes;
        this.position = 0;
    }

    getUint16() {
        const ret = this.buffer.readUInt16LE(this.position);
        this.position += 2;
        return ret;
    }

    getUint32() {
        const ret = this.buffer.readUInt32LE(this.position);
        this.position += 4;
        return ret;
    }

    getString() {
        const len = this.getUint16();
        const out = Buffer.alloc(len);
        this.buffer.copy(out, 0, this.position, this.position + len);
        this.position += len;
        return out;
    }

    getTreeMapUInt32() {
        const map = {};
        const len = this.getUint16();
        for (let i = 0; i < len; i++) {
            const key = this.getUint16();
            const value = this.getUint32();
            map[key] = value;
        }
        return map;
    }
}

// ==================== CLI 使用 ====================

if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 4) {
        console.log(`
火山引擎 RTC Token 生成工具（官方算法）

用法:
  node token-generator-official.js <appId> <appKey> <roomId> <uid> [expireSeconds]

参数:
  appId         - RTC AppID (24 位)
  appKey        - RTC AppKey
  roomId        - 房间 ID（通配 Token 传 "*"）
  uid           - 用户 ID
  expireSeconds - 有效期（秒），默认 86400（24 小时）

示例:
  node token-generator-official.js 123456789012345678901234 abcdef room123 user1 86400

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

module.exports = {
    generateToken,
    generateWildcardToken,
    verifyToken,
    privileges
};
