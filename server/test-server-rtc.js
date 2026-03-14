// 测试火山引擎 RTC 服务端加入房间
// 参考：https://www.volcengine.com/docs/6348/104482

const VERTC = require('@volcengine/rtc');

console.log('Testing Volcano Engine RTC Server SDK...\n');
console.log('Available exports:', Object.keys(VERTC));

// 检查是否有 createEngine
if (VERTC.createEngine) {
    console.log('✅ createEngine available');
} else {
    console.log('❌ createEngine NOT available');
}

// 检查是否有服务器相关 API
console.log('\nChecking server-side APIs...');
console.log('RoomProfileType:', VERTC.RoomProfileType);
console.log('events:', VERTC.events);
