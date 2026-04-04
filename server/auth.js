/**
 * 用户认证模块
 * 简单的基于 JWT 的认证系统
 */

import './logger.js'; // 统一日志时间戳
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_EXPIRY = '30d'; // 30 天有效期

// 用户数据文件
const USERS_FILE = path.join(__dirname, 'users.json');

/**
 * 加载用户数据
 */
function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const data = fs.readFileSync(USERS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('❌ Load users error:', error.message);
    }
    return {};
}

/**
 * 保存用户数据
 */
function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('❌ Save users error:', error.message);
        return false;
    }
}

/**
 * 哈希密码
 */
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * 生成 JWT Token
 */
function generateToken(userId, username) {
    return jwt.sign(
        { userId, username, iat: Math.floor(Date.now() / 1000) },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );
}

/**
 * 验证 JWT Token
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * 注册新用户
 */
function register(username, password, parentEmail = '') {
    const users = loadUsers();
    
    // 检查用户名是否存在
    if (users[username]) {
        return {
            success: false,
            error: 'Username already exists'
        };
    }
    
    // 创建新用户
    const userId = 'user_' + Date.now();
    users[username] = {
        id: userId,
        username,
        password: hashPassword(password),
        parentEmail,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        totalSessions: 0
    };
    
    if (saveUsers(users)) {
        const token = generateToken(userId, username);
        return {
            success: true,
            token,
            user: {
                id: userId,
                username,
                parentEmail
            }
        };
    }
    
    return {
        success: false,
        error: 'Failed to save user'
    };
}

/**
 * 用户登录
 */
function login(username, password) {
    const users = loadUsers();
    const user = users[username];
    
    if (!user) {
        return {
            success: false,
            error: 'Invalid username or password'
        };
    }
    
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
        return {
            success: false,
            error: 'Invalid username or password'
        };
    }
    
    // 更新登录信息
    user.lastLogin = new Date().toISOString();
    user.totalSessions += 1;
    users[username] = user;
    saveUsers(users);
    
    const token = generateToken(user.id, username);
    
    return {
        success: true,
        token,
        user: {
            id: user.id,
            username: user.username,
            parentEmail: user.parentEmail,
            lastLogin: user.lastLogin,
            totalSessions: user.totalSessions
        }
    };
}

/**
 * 中间件：验证 Token
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Authorization required'
        });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
    
    // 将用户信息附加到请求对象
    req.user = decoded;
    next();
}

/**
 * 可选的中间件：不强制要求登录
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        if (decoded) {
            req.user = decoded;
        }
    }
    
    next();
}

export {
    register,
    login,
    verifyToken,
    authMiddleware,
    optionalAuth,
    generateToken,
    loadUsers,
    saveUsers
};
