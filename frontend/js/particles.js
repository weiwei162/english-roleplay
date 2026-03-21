/**
 * 粒子效果系统
 * 提供多种粒子动画效果，用于增强用户体验
 * 
 * 使用方法:
 *   Particles.spawn('celebrate', { canvas: document.getElementById('canvas') });
 *   Particles.spawn('hearts', { x: 100, y: 200 });
 */

// 粒子实例数组
let particles = [];
let animationId = null;
let canvas = null;
let ctx = null;

    // 粒子类型配置
    const PARTICLE_TYPES = {
        celebrate: {
            name: '庆祝',
            emoji: ['🎉', '🎊', '🎈', '🎁', '🥳', '✨'],
            colors: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'],
            size: { min: 15, max: 30 },
            speed: { min: 2, max: 6 },
            lifetime: 3000,
            gravity: 0.15,
            rotation: true,
            wobble: true
        },
        stars: {
            name: '星星',
            emoji: ['⭐', '🌟', '✨', '💫', '🌠'],
            colors: ['#FFD700', '#FFF59D', '#FFEB3B', '#FFC107'],
            size: { min: 12, max: 25 },
            speed: { min: 1, max: 4 },
            lifetime: 2500,
            gravity: 0.05,
            rotation: true,
            wobble: false
        },
        hearts: {
            name: '爱心',
            emoji: ['❤️', '💕', '💖', '💗', '💓', '💘'],
            colors: ['#E91E63', '#FF4081', '#F48FB1', '#FF80AB'],
            size: { min: 14, max: 28 },
            speed: { min: 1, max: 3 },
            lifetime: 4000,
            gravity: -0.08, // 向上飘
            rotation: false,
            wobble: true
        },
        magic: {
            name: '魔法',
            emoji: ['✨', '💫', '⭐', '🔮', '💎', '🌈'],
            colors: ['#9C27B0', '#E040FB', '#7C4DFF', '#B388FF', '#EA80FC'],
            size: { min: 10, max: 22 },
            speed: { min: 0.5, max: 2 },
            lifetime: 3500,
            gravity: 0,
            rotation: true,
            wobble: true
        },
        dust: {
            name: '灰尘',
            emoji: ['💨', '☁️', '💫', '✨'],
            colors: ['#BDBDBD', '#E0E0E0', '#9E9E9E', '#757575'],
            size: { min: 8, max: 20 },
            speed: { min: 1, max: 4 },
            lifetime: 1500,
            gravity: 0.1,
            rotation: false,
            wobble: false
        },
        leaves: {
            name: '落叶',
            emoji: ['🍂', '🍁', '🍃', '🌿'],
            colors: ['#FF7043', '#FFA726', '#8D6E63', '#A1887F', '#FFCC80'],
            size: { min: 16, max: 32 },
            speed: { min: 1, max: 3 },
            lifetime: 6000,
            gravity: 0.03,
            rotation: true,
            wobble: true
        },
        snow: {
            name: '雪花',
            emoji: ['❄️', '🌨️', '☃️', '⛄'],
            colors: ['#FFFFFF', '#E3F2FD', '#BBDEFB', '#90CAF9'],
            size: { min: 8, max: 18 },
            speed: { min: 0.5, max: 2 },
            lifetime: 5000,
            gravity: 0.02,
            rotation: true,
            wobble: true
        },
        petals: {
            name: '花瓣',
            emoji: ['🌸', '💮', '🏵️', '🌺', '🌷'],
            colors: ['#F8BBD9', '#FCE4EC', '#FFCDD2', '#F48FB1', '#F06292'],
            size: { min: 14, max: 26 },
            speed: { min: 1, max: 2.5 },
            lifetime: 4500,
            gravity: 0.04,
            rotation: true,
            wobble: true
        }
    };

    /**
     * 随机数生成器
     */
    function random(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * 随机从数组中选取元素
     */
    function randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /**
     * 创建单个粒子
     */
    function createParticle(type, options = {}) {
        const config = PARTICLE_TYPES[type];
        if (!config) {
            console.warn(`未知粒子类型: ${type}`);
            return null;
        }

        const startX = options.x !== undefined ? options.x : random(0, canvas?.width || window.innerWidth);
        const startY = options.y !== undefined ? options.y : random(0, canvas?.height || window.innerHeight);

        return {
            type,
            x: startX,
            y: startY,
            vx: random(config.speed.min, config.speed.max) * (Math.random() > 0.5 ? 1 : -1),
            vy: -random(config.speed.min, config.speed.max), // 初始向上
            size: random(config.size.min, config.size.max),
            emoji: randomChoice(config.emoji),
            color: randomChoice(config.colors),
            rotation: random(0, Math.PI * 2),
            rotationSpeed: random(-0.1, 0.1),
            wobbleOffset: random(0, Math.PI * 2),
            wobbleSpeed: random(0.05, 0.15),
            opacity: 1,
            lifetime: options.lifetime || config.lifetime,
            createdAt: Date.now(),
            gravity: config.gravity,
            rotationEnabled: config.rotation,
            wobbleEnabled: config.wobble
        };
    }

    /**
     * 更新单个粒子状态
     */
    function updateParticle(particle) {
        const age = Date.now() - particle.createdAt;
        const lifeProgress = age / particle.lifetime;

        // 更新位置
        particle.x += particle.vx;
        particle.y += particle.vy;

        // 应用重力
        particle.vy += particle.gravity;

        // 摆动效果
        if (particle.wobbleEnabled) {
            particle.wobbleOffset += particle.wobbleSpeed;
            particle.x += Math.sin(particle.wobbleOffset) * 0.5;
        }

        // 旋转效果
        if (particle.rotationEnabled) {
            particle.rotation += particle.rotationSpeed;
        }

        // 淡出效果（最后 30% 生命周期）
        if (lifeProgress > 0.7) {
            particle.opacity = 1 - ((lifeProgress - 0.7) / 0.3);
        }

        return age < particle.lifetime && particle.opacity > 0;
    }

    /**
     * 渲染单个粒子
     */
    function renderParticle(particle) {
        if (!ctx) return;

        ctx.save();
        ctx.globalAlpha = particle.opacity;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);

        // 绘制 emoji
        ctx.font = `${particle.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(particle.emoji, 0, 0);

        ctx.restore();
    }

    /**
     * 主动画循环
     */
    function animate() {
        if (!ctx || particles.length === 0) {
            animationId = null;
            return;
        }

        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 更新并渲染所有粒子
        particles = particles.filter(particle => {
            const alive = updateParticle(particle);
            if (alive) {
                renderParticle(particle);
            }
            return alive;
        });

        // 继续动画
        if (particles.length > 0) {
            animationId = requestAnimationFrame(animate);
        } else {
            animationId = null;
        }
    }

    /**
     * 初始化画布
     */
    function initCanvas(container) {
        if (!container) {
            container = document.body;
        }

        // 如果容器已经有 canvas，不重复创建
        if (container.canvas) {
            canvas = container.canvas;
            ctx = canvas.getContext('2d');
            return canvas;
        }

        // 创建 canvas 元素
        canvas = document.createElement('canvas');
        canvas.id = 'particles-canvas';
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
        `;

        // 设置画布尺寸
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // 添加到容器
        if (container === document.body) {
            document.body.appendChild(canvas);
        } else {
            container.style.position = 'relative';
            canvas.style.position = 'absolute';
            container.appendChild(canvas);
        }

        ctx = canvas.getContext('2d');
        return canvas;
    }

    /**
     * 生成粒子
     * @param {string} type - 粒子类型
     * @param {Object} options - 配置选项
     */
    function spawn(type, options = {}) {
        // 初始化画布（延迟初始化以提高性能）
        if (!canvas) {
            initCanvas(options.container);
        }

        const count = options.count || 20;
        const duration = options.duration || 200; // 分批发射的持续时间

        // 分批生成粒子
        let spawned = 0;
        const spawnInterval = setInterval(() => {
            if (spawned >= count) {
                clearInterval(spawnInterval);
                return;
            }

            const particle = createParticle(type, {
                x: options.x,
                y: options.y,
                lifetime: options.lifetime
            });

            if (particle) {
                particles.push(particle);
            }

            spawned++;
        }, duration / count);

        // 开始动画
        if (!animationId) {
            animationId = requestAnimationFrame(animate);
        }

        return {
            type,
            count,
            stop: () => clearInterval(spawnInterval)
        };
    }

    /**
     * 停止所有粒子
     */
    function stop() {
        particles = [];
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    /**
     * 销毁画布
     */
    function destroy() {
        stop();
        if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }
        canvas = null;
        ctx = null;
    }

    /**
     * 获取可用粒子类型列表
     */
    function getTypes() {
        return Object.keys(PARTICLE_TYPES).map(key => ({
            id: key,
            name: PARTICLE_TYPES[key].name
        }));
    }

    /**
     * 获取当前粒子数量
     */
    function getCount() {
        return particles.length;
    }

// 导出公共 API
export {
    spawn,
    stop,
    destroy,
    getTypes,
    getCount,
    PARTICLE_TYPES
};

// 导出到全局
window.Particles = { spawn, stop, destroy, getTypes, getCount, PARTICLE_TYPES };

console.log('✨ Particles module loaded');
