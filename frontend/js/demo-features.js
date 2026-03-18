/**
 * 粒子效果和肢体动作系统 - 使用示例
 * 
 * 本文件展示如何在项目中使用 particles.js 和 animations.js
 * 可以直接在浏览器控制台运行这些示例
 */

// ==================== 粒子效果示例 ====================

/**
 * 粒子效果使用示例
 * 
 * 可用类型:
 * - celebrate: 庆祝 (🎉🎊🎈🎁🥳✨)
 * - stars: 星星 (⭐🌟✨💫🌠)
 * - hearts: 爱心 (❤️💕💖💗💓💘)
 * - magic: 魔法 (✨💫⭐🔮💎🌈)
 * - leaves: 落叶 (🍂🍁🍃🌿)
 * - snow: 雪花 (❄️🌨️☃️⛄)
 * - petals: 花瓣 (🌸💮🏵️🌺🌷)
 */

// 1. 基础使用 - 在画布中央生成默认粒子
function demoParticlesBasic() {
    Particles.spawn('celebrate');
}

// 2. 指定位置生成粒子
function demoParticlesPosition() {
    // 在屏幕中心生成爱心
    Particles.spawn('hearts', { 
        x: window.innerWidth / 2, 
        y: window.innerHeight / 2 
    });
}

// 3. 自定义粒子数量
function demoParticlesCount() {
    Particles.spawn('stars', { count: 50 });
}

// 4. 自定义粒子生命周期
function demoParticlesLifetime() {
    Particles.spawn('magic', { lifetime: 8000 });
}

// 5. 完整配置示例
function demoParticlesFull() {
    Particles.spawn('petals', {
        x: 100,           // X 坐标
        y: 200,           // Y 坐标
        count: 30,        // 粒子数量
        lifetime: 5000,   // 生命周期(ms)
        duration: 300     // 发射持续时间(ms)
    });
}

// 6. 获取粒子类型列表
function demoGetTypes() {
    console.log('可用粒子类型:', Particles.getTypes());
    // 输出: [{id: 'celebrate', name: '庆祝'}, ...]
}

// 7. 获取当前粒子数量
function demoGetCount() {
    console.log('当前粒子数:', Particles.getCount());
}

// 8. 停止所有粒子
function demoParticlesStop() {
    Particles.stop();
}

// 9. 销毁粒子系统
function demoParticlesDestroy() {
    Particles.destroy();
}


// ==================== 肢体动作示例 ====================

/**
 * 肢体动作使用示例
 * 
 * 可用动画:
 * - wave: 挥手
 * - thumbsup: 点赞
 * - cheer: 欢呼
 * - dance: 跳舞
 * - think: 思考
 * - clap: 鼓掌
 * - jump: 跳跃
 * - bow: 鞠躬
 * - heart: 比心
 * - shakehead: 摇头
 * - nod: 点头
 * - stretch: 伸展
 * - spin: 旋转
 * - hug: 拥抱
 */

// 1. 播放单个动画（默认时长）
function demoAnimBasic() {
    Character.playAnimation('wave');
}

// 2. 指定动画时长
function demoAnimDuration() {
    Character.playAnimation('dance', 3000); // 播放3秒
}

// 3. 带回调函数
function demoAnimCallback() {
    Character.playAnimation('cheer', 2000, () => {
        console.log('欢呼动画完成!');
        // 可以在这里触发其他效果
        Particles.spawn('celebrate');
    });
}

// 4. 播放动画序列
function demoAnimSequence() {
    Character.playSequence(['wave', 'dance', 'cheer'], () => {
        console.log('动画序列全部完成!');
    });
}

// 5. 播放随机动画
function demoAnimRandom() {
    Character.playRandom();
}

// 6. 获取动画列表
function demoGetAnimations() {
    console.log('可用动画:', Character.getAnimations());
}

// 7. 获取当前状态
function demoGetStatus() {
    console.log('动画状态:', Character.getStatus());
    // 输出: { isPlaying: false, currentAnimation: null, queueLength: 0 }
}

// 8. 停止当前动画
function demoStopAnimation() {
    Character.stopAnimation();
}


// ==================== 组合使用示例 ====================

/**
 * 组合使用 - 粒子 + 动作
 */

// 1. 角色说正确时播放欢呼和庆祝粒子
function onCorrectAnswer() {
    // 播放欢呼动画
    Character.playAnimation('cheer', 2000);
    // 播放庆祝粒子
    Particles.spawn('celebrate', { count: 30 });
}

// 2. 角色道歉时播放雪花粒子和鞠躬动画
function onApology() {
    Character.playAnimation('bow', 1200);
    Particles.spawn('snow', { count: 20 });
}

// 3. 角色表达爱意时播放爱心粒子和比心动画
function onLove() {
    Character.playAnimation('heart', 2000);
    Particles.spawn('hearts', { count: 25 });
}

// 4. 角色施法时播放魔法粒子和旋转动画
function onMagic() {
    Character.playAnimation('spin', 1200);
    Particles.spawn('magic', { count: 40 });
}

// 5. 场景完成时播放盛大庆祝
function onSceneComplete() {
    // 播放多个动作
    Character.playSequence(['dance', 'cheer', 'jump'], () => {
        console.log('场景完成!');
    });
    // 播放大量粒子
    Particles.spawn('celebrate', { count: 50 });
}

// 6. 随机互动效果
function randomReaction() {
    const reactions = [
        () => { Character.playAnimation('wave'); Particles.spawn('stars'); },
        () => { Character.playAnimation('dance'); Particles.spawn('petals'); },
        () => { Character.playAnimation('cheer'); Particles.spawn('celebrate'); },
        () => { Character.playAnimation('jump'); Particles.spawn('hearts'); },
    ];
    const random = reactions[Math.floor(Math.random() * reactions.length)];
    random();
}


// ==================== 控制台快速测试 ====================

// 在浏览器控制台运行以下命令进行测试:

// 粒子测试
// Particles.spawn('celebrate')
// Particles.spawn('hearts', {x: 200, y: 300, count: 20})
// Particles.stop()

// 动作测试
// Character.playAnimation('wave')
// Character.playAnimation('dance', 3000)
// Character.playSequence(['wave', 'dance', 'cheer'])

// 组合测试
// randomReaction()
// onSceneComplete()

console.log('📚 使用示例已加载! 在控制台运行以上函数进行测试。');
