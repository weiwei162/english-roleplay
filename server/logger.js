/**
 * 统一日志工具模块
 * 为所有日志添加标准时间戳格式 + 请求 ID 追踪
 * 
 * 使用方式：
 * import { logger, setRequestContext } from './logger.js';
 * 
 * // 在请求开始时设置上下文
 * setRequestContext({ requestId: 'req-123' });
 * 
 * // 后续日志自动带上 requestId
 * console.log('处理中...'); // [2026-04-01 08:29:07.123] [req-123] 处理中...
 * 
 * // 清除上下文
 * setRequestContext(null);
 */

// 异步本地存储（支持并发请求）
import { AsyncLocalStorage } from 'async_hooks';
const asyncLocalStorage = new AsyncLocalStorage();

/**
 * 生成标准格式的时间戳
 * 格式：YYYY-MM-DD HH:mm:ss.SSS
 * 示例：2026-04-01 08:29:07.123
 */
function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * 获取当前请求上下文
 */
function getRequestContext() {
    return asyncLocalStorage.getStore() || {};
}

/**
 * 设置请求上下文（在请求开始时调用）
 * @param {Object} context - 请求上下文，如 { requestId: 'req-123' }
 * @param {Function} fn - 要执行的函数（可选）
 */
export function setRequestContext(context, fn) {
    if (fn) {
        return asyncLocalStorage.run(context, fn);
    } else {
        // 如果没有传 fn，返回一个包装函数
        return (callback) => asyncLocalStorage.run(context, callback);
    }
}

/**
 * 清除请求上下文
 */
export function clearRequestContext() {
    asyncLocalStorage.run({}, () => {});
}

/**
 * 格式化日志参数
 * 支持多种类型：字符串、数字、对象、数组等
 */
function formatArgs(args) {
    const context = getRequestContext();
    const prefixParts = [getTimestamp()];
    
    // 如果有 requestId，添加到前缀
    if (context && context.requestId) {
        prefixParts.push(`[${context.requestId}]`);
    }
    
    const prefix = `[${prefixParts.join(' ')}]`;
    
    return [prefix, ...args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
            try {
                return JSON.stringify(arg, null, 2);
            } catch (e) {
                return String(arg);
            }
        }
        return String(arg);
    })];
}

// 保存原始 console 方法
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;
const originalDebug = console.debug;

// 创建日志对象
export const logger = {
    log: (...args) => {
        originalLog(...formatArgs(args));
    },
    error: (...args) => {
        originalError(...formatArgs(args));
    },
    warn: (...args) => {
        originalWarn(...formatArgs(args));
    },
    info: (...args) => {
        originalInfo(...formatArgs(args));
    },
    debug: (...args) => {
        originalDebug(...formatArgs(args));
    },
    // 恢复原始 console 方法
    restore: () => {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
        console.info = originalInfo;
        console.debug = originalDebug;
    }
};

// 自动覆盖全局 console 方法（导入即生效）
console.log = logger.log;
console.error = logger.error;
console.warn = logger.warn;
console.info = logger.info;
console.debug = logger.debug;

export default logger;
