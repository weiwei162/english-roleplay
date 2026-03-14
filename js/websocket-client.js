// WebSocket + RTC 双向通信模块
// 用于与 AI 服务端实时对话

let wsConnection = null;
let currentSessionId = null;
let isWebSocketReady = false;
let wsReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// WebSocket 配置
const WS_CONFIG = {
    url: 'ws://localhost:3000',
    reconnectDelay: 3000,
    heartbeatInterval: 30000
};

// ==================== 初始化 ====================

/**
 * 初始化 WebSocket 连接
 */
function initWebSocket() {
    console.log('🔌 Initializing WebSocket...');
    
    try {
        wsConnection = new WebSocket(WS_CONFIG.url);
        
        wsConnection.onopen = function() {
            console.log('✅ WebSocket connected');
            isWebSocketReady = true;
            wsReconnectAttempts = 0;
            
            // 发送初始化消息
            currentSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            wsConnection.send(JSON.stringify({
                type: 'init',
                sessionId: currentSessionId
            }));
            
            // 启动心跳
            startHeartbeat();
        };
        
        wsConnection.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            } catch (error) {
                console.error('❌ Failed to parse WebSocket message:', error);
            }
        };
        
        wsConnection.onerror = function(error) {
            console.error('❌ WebSocket error:', error);
        };
        
        wsConnection.onclose = function(event) {
            console.log('🔌 WebSocket closed:', event.code, event.reason);
            isWebSocketReady = false;
            
            // 尝试重连
            attemptReconnect();
        };
        
    } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        fallbackToHTTP();
    }
}

// ==================== 消息处理 ====================

/**
 * 处理 WebSocket 消息
 */
function handleWebSocketMessage(data) {
    console.log('📨 Received:', data);
    
    switch(data.type) {
        case 'init_ok':
            console.log('✅ Session initialized:', data.sessionId);
            currentSessionId = data.sessionId;
            if (window.onSessionReady) {
                window.onSessionReady(currentSessionId);
            }
            break;
            
        case 'response':
            // 收到 AI 回应
            handleAIResponse(data);
            break;
            
        case 'error':
            console.error('❌ Server error:', data.error);
            if (window.onWebSocketError) {
                window.onWebSocketError(data.error);
            }
            break;
            
        default:
            console.log('📨 Unknown message type:', data.type);
    }
}

/**
 * 处理 AI 回应
 */
async function handleAIResponse(data) {
    console.log('🤖 AI Response:', data.text);
    
    // 隐藏"思考中"状态
    if (window.hideTyping) {
        window.hideTyping();
    }
    
    // 显示字幕
    const bubbleText = document.getElementById('bubble-text');
    const bubbleCn = document.getElementById('bubble-cn');
    
    if (bubbleText) {
        bubbleText.textContent = data.text;
    }
    
    // 加入 RTC 房间观看数字人视频
    if (data.roomId && data.token) {
        console.log('🎬 Joining RTC room:', data.roomId);
        
        if (window.joinAvatarRoom) {
            try {
                await window.joinAvatarRoom(data.roomId, data.token, currentSessionId);
            } catch (error) {
                console.error('❌ Failed to join RTC room:', error);
                // 降级到动画版
                if (window.speak) {
                    window.speak(data.text);
                }
            }
        }
    } else {
        // 没有 RTC 房间，直接朗读
        if (window.speak) {
            window.speak(data.text);
        }
    }
    
    // 回调
    if (window.onAIResponse) {
        window.onAIResponse(data);
    }
}

// ==================== 发送消息 ====================

/**
 * 发送文字消息（主要方式）
 */
function sendWebSocketText(text) {
    if (!isWebSocketReady || !wsConnection) {
        console.warn('⚠️ WebSocket not ready, falling back to HTTP');
        return sendHTTPText(text);
    }
    
    try {
        wsConnection.send(JSON.stringify({
            type: 'text',
            text: text
        }));
        console.log('📤 Sent text:', text);
        return true;
    } catch (error) {
        console.error('❌ Failed to send text:', error);
        return sendHTTPText(text);
    }
}

/**
 * 发送音频数据（实时 ASR）
 */
function sendWebSocketAudio(audioBlob) {
    if (!isWebSocketReady || !wsConnection) {
        console.warn('⚠️ WebSocket not ready for audio');
        return false;
    }
    
    try {
        const reader = new FileReader();
        reader.onload = function() {
            const base64Audio = reader.result.split(',')[1];
            wsConnection.send(JSON.stringify({
                type: 'audio_chunk',
                audio: base64Audio
            }));
            console.log('🎤 Sent audio chunk:', base64Audio.length, 'bytes');
        };
        reader.readAsDataURL(audioBlob);
        return true;
    } catch (error) {
        console.error('❌ Failed to send audio:', error);
        return false;
    }
}

// ==================== HTTP 降级方案 ====================

/**
 * HTTP 方式发送文字（降级方案）
 */
async function sendHTTPText(text) {
    console.log('📤 Sending via HTTP:', text);
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                sessionId: currentSessionId || 'session_' + Date.now(),
                character: window.currentCharacter?.id || 'emma'
            })
        });
        
        const data = await response.json();
        handleAIResponse(data);
        return true;
    } catch (error) {
        console.error('❌ HTTP request failed:', error);
        return false;
    }
}

/**
 * 完全降级模式（无服务端）
 */
function fallbackToHTTP() {
    console.log('⚠️ WebSocket unavailable, using fallback mode');
    
    // 可以在这里加载本地对话数据
    if (window.onFallbackMode) {
        window.onFallbackMode();
    }
}

// ==================== 重连机制 ====================

/**
 * 尝试重连
 */
function attemptReconnect() {
    if (wsReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('❌ Max reconnection attempts reached');
        fallbackToHTTP();
        return;
    }
    
    wsReconnectAttempts++;
    const delay = WS_CONFIG.reconnectDelay * wsReconnectAttempts;
    
    console.log(`🔄 Attempting reconnect ${wsReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
    
    setTimeout(() => {
        console.log('🔄 Reconnecting...');
        initWebSocket();
    }, delay);
}

// ==================== 心跳机制 ====================

let heartbeatTimer = null;

/**
 * 启动心跳
 */
function startHeartbeat() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
    }
    
    heartbeatTimer = setInterval(() => {
        if (isWebSocketReady && wsConnection) {
            wsConnection.send(JSON.stringify({
                type: 'heartbeat',
                timestamp: Date.now()
            }));
            console.log('💓 Heartbeat sent');
        }
    }, WS_CONFIG.heartbeatInterval);
}

/**
 * 停止心跳
 */
function stopHeartbeat() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
}

// ==================== 工具函数 ====================

/**
 * 获取连接状态
 */
function getWebSocketStatus() {
    if (!wsConnection) return 'disconnected';
    
    switch(wsConnection.readyState) {
        case WebSocket.CONNECTING: return 'connecting';
        case WebSocket.OPEN: return 'connected';
        case WebSocket.CLOSING: return 'closing';
        case WebSocket.CLOSED: return 'closed';
        default: return 'unknown';
    }
}

/**
 * 手动断开连接
 */
function disconnectWebSocket() {
    stopHeartbeat();
    
    if (wsConnection) {
        wsConnection.close();
        wsConnection = null;
    }
    
    isWebSocketReady = false;
    console.log('🔌 WebSocket disconnected manually');
}

/**
 * 重新连接
 */
function reconnectWebSocket() {
    disconnectWebSocket();
    wsReconnectAttempts = 0;
    initWebSocket();
}

// ==================== 导出全局函数 ====================

window.initWebSocket = initWebSocket;
window.sendWebSocketText = sendWebSocketText;
window.sendWebSocketAudio = sendWebSocketAudio;
window.getWebSocketStatus = getWebSocketStatus;
window.disconnectWebSocket = disconnectWebSocket;
window.reconnectWebSocket = reconnectWebSocket;

// 回调钩子（供外部使用）
window.onSessionReady = null;
window.onAIResponse = null;
window.onWebSocketError = null;
window.onFallbackMode = null;

console.log('🔧 WebSocket module loaded');
