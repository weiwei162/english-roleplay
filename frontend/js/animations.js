/**
 * 肢体动作系统
 * 提供角色肢体动画效果，增强互动体验
 * 
 * 使用方法:
 *   Character.playAnimation('wave');
 *   Character.playAnimation('dance', 3000);
 *   Character.playAnimation('thumbsup', 2000, () => console.log('动画完成'));
 */

const Character = (function() {
    // 动画队列
    let animationQueue = [];
    let isPlaying = false;
    let currentAnimation = null;
    let currentTimeout = null;

    // 默认动画时长
    const DEFAULT_DURATION = 1000;

    // 动画配置
    const ANIMATIONS = {
        wave: {
            name: '挥手',
            duration: 1000,
            cssClass: 'anim-wave',
            description: '友好地挥手打招呼'
        },
        thumbsup: {
            name: '点赞',
            duration: 1500,
            cssClass: 'anim-thumbsup',
            description: '竖起大拇指点赞'
        },
        cheer: {
            name: '欢呼',
            duration: 2000,
            cssClass: 'anim-cheer',
            description: '兴奋地欢呼跳跃'
        },
        dance: {
            name: '跳舞',
            duration: 3000,
            cssClass: 'anim-dance',
            description: '快乐地跳舞'
        },
        think: {
            name: '思考',
            duration: 2000,
            cssClass: 'anim-think',
            description: '手托下巴思考'
        },
        clap: {
            name: '鼓掌',
            duration: 1500,
            cssClass: 'anim-clap',
            description: '双手鼓掌'
        },
        jump: {
            name: '跳跃',
            duration: 800,
            cssClass: 'anim-jump',
            description: '开心地跳一下'
        },
        bow: {
            name: '鞠躬',
            duration: 1200,
            cssClass: 'anim-bow',
            description: '礼貌地鞠躬'
        },
        heart: {
            name: '比心',
            duration: 2000,
            cssClass: 'anim-heart',
            description: '双手比心'
        },
        shakehead: {
            name: '摇头',
            duration: 1000,
            cssClass: 'anim-shakehead',
            description: '摇摇头表示否定'
        },
        nod: {
            name: '点头',
            duration: 800,
            cssClass: 'anim-nod',
            description: '点头表示肯定'
        },
        stretch: {
            name: '伸展',
            duration: 1500,
            cssClass: 'anim-stretch',
            description: '伸懒腰'
        },
        spin: {
            name: '旋转',
            duration: 1200,
            cssClass: 'anim-spin',
            description: '原地旋转一圈'
        },
        hug: {
            name: '拥抱',
            duration: 2000,
            cssClass: 'anim-hug',
            description: '张开双臂拥抱'
        }
    };

    /**
     * 获取角色元素
     */
    function getCharacterElement() {
        return document.getElementById('character-sprite');
    }

    /**
     * 播放单个动画
     */
    function playSingleAnimation(name, duration, callback) {
        const anim = ANIMATIONS[name];
        if (!anim) {
            console.warn(`未知动画: ${name}`);
            console.log('可用动画:', Object.keys(ANIMATIONS).join(', '));
            if (callback) callback();
            return;
        }

        const character = getCharacterElement();
        if (!character) {
            console.warn('未找到角色元素');
            if (callback) callback();
            return;
        }

        const finalDuration = duration || anim.duration;

        // 移除之前的动画类
        Object.values(ANIMATIONS).forEach(a => {
            character.classList.remove(a.cssClass);
        });

        // 添加当前动画类
        character.classList.add(anim.cssClass);
        currentAnimation = name;

        // 设置动画结束
        if (currentTimeout) {
            clearTimeout(currentTimeout);
        }

        currentTimeout = setTimeout(() => {
            character.classList.remove(anim.cssClass);
            currentAnimation = null;
            if (callback) callback();
        }, finalDuration);
    }

    /**
     * 播放动画（主 API）
     * @param {string} name - 动画名称
     * @param {number} duration - 动画时长（毫秒）
     * @param {Function} callback - 动画完成回调
     */
    function playAnimation(name, duration, callback) {
        // 如果传入了回调函数但没有传入时长
        if (typeof duration === 'function') {
            callback = duration;
            duration = undefined;
        }

        animationQueue.push({
            name,
            duration,
            callback
        });

        if (!isPlaying) {
            processQueue();
        }
    }

    /**
     * 处理动画队列
     */
    function processQueue() {
        if (animationQueue.length === 0) {
            isPlaying = false;
            return;
        }

        isPlaying = true;
        const anim = animationQueue.shift();

        playSingleAnimation(anim.name, anim.duration, () => {
            if (anim.callback) {
                anim.callback();
            }
            // 队列中的动画之间添加短暂间隔
            setTimeout(processQueue, 100);
        });
    }

    /**
     * 播放多个动画组合
     * @param {string[]} names - 动画名称数组
     * @param {Function} callback - 所有动画完成回调
     */
    function playSequence(names, callback) {
        if (!Array.isArray(names) || names.length === 0) {
            if (callback) callback();
            return;
        }

        let index = 0;
        const playNext = () => {
            if (index >= names.length) {
                if (callback) callback();
                return;
            }
            playAnimation(names[index], () => {
                index++;
                playNext();
            });
        };
        playNext();
    }

    /**
     * 停止当前动画
     */
    function stopAnimation() {
        animationQueue = [];
        if (currentTimeout) {
            clearTimeout(currentTimeout);
            currentTimeout = null;
        }

        const character = getCharacterElement();
        if (character) {
            Object.values(ANIMATIONS).forEach(a => {
                character.classList.remove(a.cssClass);
            });
        }

        currentAnimation = null;
        isPlaying = false;
    }

    /**
     * 播放随机动画
     * @param {number} duration - 动画时长
     */
    function playRandom(duration, callback) {
        const names = Object.keys(ANIMATIONS);
        const randomName = names[Math.floor(Math.random() * names.length)];
        playAnimation(randomName, duration, callback);
    }

    /**
     * 获取当前播放状态
     */
    function getStatus() {
        return {
            isPlaying,
            currentAnimation,
            queueLength: animationQueue.length
        };
    }

    /**
     * 获取可用动画列表
     */
    function getAnimations() {
        return Object.entries(ANIMATIONS).map(([key, value]) => ({
            id: key,
            name: value.name,
            duration: value.duration,
            description: value.description
        }));
    }

    return {
        playAnimation,
        playSequence,
        playRandom,
        stopAnimation,
        getStatus,
        getAnimations,
        ANIMATIONS
    };
})();

// 导出到全局
window.Character = Character;

console.log('🎭 Character animations module loaded');
