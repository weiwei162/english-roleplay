#!/usr/bin/env node
/**
 * StartVoiceChat 前后端集成测试
 */

import https from 'https';

const BASE_URL = 'http://localhost:3000';

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(color, message) {
    console.log(`${color}${message}${colors.reset}`);
}

// HTTP 请求辅助函数
function request(path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        
        const reqOptions = {
            hostname: url.hostname,
            port: url.port || 3000,
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };
        
        const req = https.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({
                        status: res.statusCode,
                        data: json
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data
                    });
                }
            });
        });
        
        req.on('error', reject);
        
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        
        req.end();
    });
}

// 测试步骤
async function runTests() {
    log(colors.blue, '\n🧪 StartVoiceChat 前后端集成测试\n');
    log(colors.blue, '='.repeat(50));
    
    let passed = 0;
    let failed = 0;
    
    // 测试 1: 健康检查
    try {
        log(colors.yellow, '\n📋 测试 1: 健康检查');
        const health = await request('/health');
        
        if (health.status === 200 && health.data.status === 'ok') {
            log(colors.green, '✅ 健康检查通过');
            console.log('   配置:', health.data.config);
            passed++;
        } else {
            log(colors.red, '❌ 健康检查失败');
            failed++;
        }
    } catch (error) {
        log(colors.red, '❌ 健康检查错误:', error.message);
        failed++;
    }
    
    // 测试 2: 获取角色列表
    try {
        log(colors.yellow, '\n📋 测试 2: 获取角色列表');
        const characters = await request('/api/characters');
        
        if (characters.status === 200 && characters.data.characters) {
            log(colors.green, '✅ 角色列表获取成功');
            console.log('   可用角色:', characters.data.characters.map(c => c.name).join(', '));
            passed++;
        } else {
            log(colors.red, '❌ 角色列表获取失败');
            failed++;
        }
    } catch (error) {
        log(colors.red, '❌ 角色列表错误:', error.message);
        failed++;
    }
    
    // 测试 3: 创建房间
    let roomId = null;
    let taskId = null;
    
    try {
        log(colors.yellow, '\n📋 测试 3: 创建 AI 房间');
        roomId = `test_room_${Date.now()}`;
        
        const joinAI = await request('/api/join-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: {
                roomId: roomId,
                character: 'emma'
            }
        });
        
        if (createRoom.status === 200 && createRoom.data.success) {
            log(colors.green, '✅ 房间创建成功');
            console.log('   RoomId:', createRoom.data.roomId);
            console.log('   TaskId:', createRoom.data.taskId);
            console.log('   AI 模式:', createRoom.data.aiMode);
            console.log('   角色:', createRoom.data.characterName);
            
            roomId = createRoom.data.roomId;
            taskId = createRoom.data.taskId;
            passed++;
        } else {
            log(colors.red, '❌ 房间创建失败');
            console.log('   错误:', createRoom.data);
            failed++;
        }
    } catch (error) {
        log(colors.red, '❌ 房间创建错误:', error.message);
        failed++;
    }
    
    // 测试 4: 离开房间
    if (roomId) {
        try {
            log(colors.yellow, '\n📋 测试 4: 离开房间');
            
            const leaveRoom = await request('/api/leave-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { roomId: roomId }
            });
            
            if (leaveRoom.status === 200 && leaveRoom.data.success) {
                log(colors.green, '✅ 房间离开成功');
                passed++;
            } else {
                log(colors.red, '❌ 房间离开失败');
                failed++;
            }
        } catch (error) {
            log(colors.red, '❌ 房间离开错误:', error.message);
            failed++;
        }
    }
    
    // 测试 5: 前端静态文件
    try {
        log(colors.yellow, '\n📋 测试 5: 前端静态文件');
        
        const index = await request('/');
        if (index.status === 200 && index.data.includes('English Friend')) {
            log(colors.green, '✅ 前端页面可访问');
            passed++;
        } else {
            log(colors.red, '❌ 前端页面访问失败');
            failed++;
        }
    } catch (error) {
        log(colors.red, '❌ 前端页面错误:', error.message);
        failed++;
    }
    
    // 测试 6: StartVoiceChat 客户端 JS
    try {
        log(colors.yellow, '\n📋 测试 6: StartVoiceChat 客户端 JS');
        
        const jsFile = await request('/js/startvoicechat-client.js');
        if (jsFile.status === 200 && jsFile.data.includes('StartVoiceChatClient')) {
            log(colors.green, '✅ StartVoiceChat 客户端 JS 可访问');
            passed++;
        } else {
            log(colors.red, '❌ StartVoiceChat 客户端 JS 访问失败');
            failed++;
        }
    } catch (error) {
        log(colors.red, '❌ StartVoiceChat 客户端 JS 错误:', error.message);
        failed++;
    }
    
    // 总结
    log(colors.blue, '\n' + '='.repeat(50));
    log(colors.blue, '📊 测试结果总结');
    log(colors.blue, '='.repeat(50));
    log(colors.green, `✅ 通过：${passed}`);
    log(colors.red, `❌ 失败：${failed}`);
    
    if (failed === 0) {
        log(colors.green, '\n🎉 所有测试通过！前后端集成完成！');
        console.log('\n📱 下一步:');
        console.log('   1. 浏览器访问：http://localhost:3000');
        console.log('   2. 选择一个角色');
        console.log('   3. 选择一个场景');
        console.log('   4. 开始与 AI 对话！');
    } else {
        log(colors.yellow, '\n⚠️  部分测试失败，请检查配置和日志');
    }
    
    return failed === 0;
}

// 运行测试
runTests()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('❌ 测试执行错误:', error);
        process.exit(1);
    });
