// 测试 RTC Bot 和 TTS 功能
// 使用方法：node test-rtc-bot.js

require('dotenv').config();
const RTCBot = require('./rtc-bot');
const { synthesizeSpeech, testTTS } = require('./tts-client');
const crypto = require('crypto');

// 生成 RTC Token
function generateRTCToken(roomId, uid) {
    const appId = process.env.VOLC_APP_ID;
    const appKey = process.env.VOLC_APP_KEY;
    
    if (!appId || !appKey) {
        throw new Error('Please set VOLC_APP_ID and VOLC_APP_KEY in .env');
    }
    
    const now = Math.floor(Date.now() / 1000);
    const expire = now + 3600;
    
    const payload = {
        app_id: appId,
        room_id: roomId,
        uid: uid,
        expire: expire
    };
    
    const signature = crypto
        .createHmac('sha256', appKey)
        .update(JSON.stringify(payload))
        .digest('hex');
    
    return Buffer.from(JSON.stringify({
        ...payload,
        signature
    })).toString('base64');
}

// 测试 TTS
async function testTTSService() {
    console.log('\n🎤 Testing TTS Service...\n');
    
    const result = await testTTS();
    
    if (result) {
        console.log('✅ TTS service is working!\n');
        return true;
    } else {
        console.log('⚠️  TTS service needs setup\n');
        return false;
    }
}

// 测试 RTC Bot 加入房间
async function testBotJoinRoom() {
    console.log('\n🎮 Testing RTC Bot...\n');
    
    if (!process.env.VOLC_APP_ID || process.env.VOLC_APP_ID.includes('your_')) {
        console.log('⚠️  VOLC_APP_ID not configured, skipping RTC test\n');
        return false;
    }
    
    const roomId = `test_room_${Date.now()}`;
    const botToken = generateRTCToken(roomId, 'avatar_bot');
    
    console.log(`Room ID: ${roomId}`);
    console.log(`Bot Token: ${botToken.substring(0, 20)}...\n`);
    
    const bot = new RTCBot({
        appId: process.env.VOLC_APP_ID,
        uid: 'avatar_bot',
        character: 'emma',
        onReady: () => {
            console.log('✅ Bot ready!\n');
        },
        onError: (error) => {
            console.error('❌ Bot error:', error.message);
        },
        onAudioReceived: (audioBuffer, userId) => {
            console.log(`📥 Received ${audioBuffer.length} bytes from ${userId}`);
        }
    });
    
    try {
        console.log('🔌 Bot joining room...');
        await bot.joinRoom(roomId, botToken);
        
        console.log('✅ Bot successfully joined room!\n');
        
        // 测试发布音频
        console.log('🔊 Testing audio publish...');
        const testText = 'Hello! I am Miss Emma. Nice to meet you!';
        const ttsAudio = await synthesizeSpeech(testText, 'emma');
        
        console.log(`📊 TTS generated: ${ttsAudio.length} bytes`);
        
        // 发布音频到房间
        await bot.publishAudio(ttsAudio);
        console.log('✅ Audio published to room!\n');
        
        // 等待 2 秒后离开
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('👋 Bot leaving room...');
        await bot.leaveRoom();
        console.log('✅ Bot left room\n');
        
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        return false;
    }
}

// 主函数
async function main() {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║    English Friend - RTC Bot Test Suite               ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    
    // 测试 TTS
    const ttsOk = await testTTSService();
    
    // 测试 RTC Bot
    const rtcOk = await testBotJoinRoom();
    
    // 总结
    console.log('═══════════════════════════════════════════════════════');
    console.log('Test Summary:');
    console.log('───────────────────────────────────────────────────────');
    console.log(`  TTS Service:   ${ttsOk ? '✅ PASSED' : '⚠️  NEEDS SETUP'}`);
    console.log(`  RTC Bot:       ${rtcOk ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (ttsOk && rtcOk) {
        console.log('🎉 All tests passed! Ready for real-time RTC dialog.\n');
        console.log('Next steps:');
        console.log('1. Start server: npm start');
        console.log('2. Open browser: http://localhost:3000');
        console.log('3. Select character and scene');
        console.log('4. Click microphone and speak!\n');
        process.exit(0);
    } else {
        console.log('⚠️  Some tests failed or need setup.\n');
        console.log('Please check:');
        console.log('1. .env file has VOLC_APP_ID and VOLC_APP_KEY');
        console.log('2. .env file has DASHSCOPE_API_KEY');
        console.log('3. Install edge-tts: pip install edge-tts\n');
        process.exit(1);
    }
}

main().catch(console.error);
