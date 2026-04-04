/**
 * 服务端请求取消机制 - 实现同一 session_id 的请求中断
 * 
 * 功能：
 * 1. 跟踪每个 session_id 的活跃请求
 * 2. 新请求到来时，自动取消未完成的旧请求
 * 3. 清理旧请求的资源
 * 
 * 使用场景：
 * - 用户快速连续发送消息
 * - 用户打断当前回答
 * - 避免多个请求同时处理同一个会话
 */

// ==================== 活跃请求跟踪 ====================

// session_id → 活跃请求信息
const activeRequests = new Map();

/**
 * 取消指定 session_id 的活跃请求
 * @param {string} sessionId - 会话 ID
 * @returns {boolean} - 是否成功取消
 */
export function cancelActiveRequest(sessionId) {
    const activeReq = activeRequests.get(sessionId);
    
    if (!activeReq) {
        console.log(`ℹ️  [Cancel] No active request for session: ${sessionId}`);
        return false;
    }
    
    console.log(`⏹️  [Cancel] Cancelling active request for session: ${sessionId}`);
    console.log(`   Request ID: ${activeReq.requestId}`);
    console.log(`   Duration: ${Date.now() - activeReq.startTime}ms`);
    
    // 1. 结束 HTTP 响应流
    if (activeReq.res && !activeReq.res.writableEnded) {
        try {
            activeReq.res.write('data: {"cancelled": true, "reason": "new_request"}\n\n');
            activeReq.res.end();
            console.log(`   ✅ HTTP response ended`);
        } catch (error) {
            console.error(`   ❌ Error ending response: ${error.message}`);
        }
    }
    
    // 2. 调用 AbortController 取消底层 API 请求（如果有）
    if (activeReq.abortController) {
        try {
            activeReq.abortController.abort();
            console.log(`   ✅ AbortController triggered`);
        } catch (error) {
            console.error(`   ❌ Error aborting: ${error.message}`);
        }
    }
    
    // 3. 注意：不清理 Agent 实例，因为新请求可能复用同一个 Agent
    // 只取消当前的 HTTP 响应和 AbortController
    console.log(`   ℹ️  Agent instance preserved for reuse`);
    
    // 4. 从 Map 中移除
    activeRequests.delete(sessionId);
    
    console.log(`   ✅ Request cancelled successfully`);
    return true;
}

/**
 * 注册新的活跃请求
 * @param {string} sessionId - 会话 ID
 * @param {string} requestId - 请求 ID
 * @param {Object} res - Express Response 对象
 * @param {AbortController} abortController - 取消控制器
 * @param {Object} agent - Agent 实例（可选）
 */
export function registerActiveRequest(sessionId, requestId, res, abortController = null, agent = null) {
    // 先取消旧请求（如果有）
    cancelActiveRequest(sessionId);
    
    // 注册新请求
    activeRequests.set(sessionId, {
        requestId,
        startTime: Date.now(),
        res,
        abortController,
        agent,
        sessionId
    });
    
    console.log(`📝 [Register] New active request registered for session: ${sessionId}`);
    console.log(`   Request ID: ${requestId}`);
}

/**
 * 清除已完成的请求
 * @param {string} sessionId - 会话 ID
 */
export function clearActiveRequest(sessionId) {
    const activeReq = activeRequests.get(sessionId);
    
    if (activeReq) {
        const duration = Date.now() - activeReq.startTime;
        console.log(`✅ [Clear] Request completed for session: ${sessionId} (${duration}ms)`);
        activeRequests.delete(sessionId);
    }
}

/**
 * 获取活跃请求统计信息
 * @returns {Object} - 统计信息
 */
export function getActiveRequestsStats() {
    const now = Date.now();
    const stats = {
        total: activeRequests.size,
        sessions: [],
        byDuration: {
            '<1s': 0,
            '1-3s': 0,
            '3-5s': 0,
            '>5s': 0
        }
    };
    
    for (const [sessionId, req] of activeRequests) {
        const duration = now - req.startTime;
        const durationBucket = duration < 1000 ? '<1s' 
            : duration < 3000 ? '1-3s' 
            : duration < 5000 ? '3-5s' 
            : '>5s';
        
        stats.sessions.push({
            sessionId,
            requestId: req.requestId,
            duration,
            durationBucket
        });
        
        stats.byDuration[durationBucket]++;
    }
    
    return stats;
}

/**
 * 清理超时请求（防御性清理）
 * @param {number} timeoutMs - 超时时间（毫秒）
 */
export function cleanupTimeoutRequests(timeoutMs = 60000) {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [sessionId, req] of activeRequests) {
        const duration = now - req.startTime;
        
        if (duration > timeoutMs) {
            console.log(`⚠️  [Cleanup] Timeout request for session: ${sessionId} (${duration}ms)`);
            cancelActiveRequest(sessionId);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`✅ [Cleanup] Cleaned ${cleaned} timeout requests`);
    }
}

// 定期清理超时请求（每 5 分钟）
setInterval(() => cleanupTimeoutRequests(60000), 300000);

// 导出活跃请求 Map（用于健康检查）
export { activeRequests };
