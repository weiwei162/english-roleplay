// 应用主逻辑 - 画布版本
let currentCharacter = null;
let currentScene = null;
let currentDialogueIndex = 0;
let isRecording = false;
let recognition = null;
let isTyping = false;
let contentCounter = 0;
let characterPosition = { x: 50, y: 60 }; // 角色位置（百分比）
let audioContext = null;

// ============== 初始化检查 ==============
console.log('🔍 [Init] Checking global objects:');
console.log('   window.Character:', window.Character);
console.log('   window.Particles:', window.Particles);
console.log('   Character.playRandom:', window.Character?.playRandom);
console.log('   Particles.spawn:', window.Particles?.spawn);
console.log('   [Init] Check complete');

// 音效系统
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// 播放音效（合成音）
function playSound(type) {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch(type) {
        case 'step': // 脚步声
            oscillator.frequency.value = 200;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'pop': // 弹出音效
            oscillator.frequency.value = 600;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
            break;
        case 'cheer': // 欢呼声
            oscillator.frequency.value = 800;
            oscillator.type = 'triangle';
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
        case 'laugh': // 笑声
            oscillator.frequency.value = 500;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            for (let i = 0; i < 5; i++) {
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + i * 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.08);
            }
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
            break;
        case 'correct': // 正确
            oscillator.frequency.value = 1000;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
    }
}

// 语音合成 + 说话动画
function speak(text, callback) {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.75;
        utterance.pitch = 1.1;
        
        if (currentCharacter) {
            const voices = speechSynthesis.getVoices();
            if (currentCharacter.voice === 'female') {
                const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google US English'));
                if (femaleVoice) utterance.voice = femaleVoice;
            } else if (currentCharacter.voice === 'male') {
                const maleVoice = voices.find(v => v.name.includes('Male') || v.name.includes('Daniel'));
                if (maleVoice) utterance.voice = maleVoice;
            }
        }
        
        // 角色开始说话动画
        const sprite = document.getElementById('character-sprite');
        if (sprite) {
            sprite.classList.add('talking');
            sprite.classList.add('excited');
        }
        
        utterance.onstart = function() {
            // 语音开始时添加效果
            if (sprite) {
                sprite.style.filter = 'brightness(1.1)';
            }
        };
        
        utterance.onend = function() {
            if (callback) callback();
            // 语音结束后，角色停止说话动画
            if (sprite) {
                sprite.classList.remove('talking');
                sprite.classList.remove('excited');
                sprite.style.filter = 'brightness(1)';
            }
        };
        
        utterance.onerror = function() {
            if (sprite) {
                sprite.classList.remove('talking');
                sprite.classList.remove('excited');
                sprite.style.filter = 'brightness(1)';
            }
        };
        
        speechSynthesis.speak(utterance);
    }
}



// 切换屏幕
/**
 * 切换屏幕
 * 注意：离开画布界面时需要离开 AI 房间
 */
async function showScreen(screenId) {
    console.log('📺 Switching to screen:', screenId);
    
    // 如果离开画布界面，离开 AI 房间
    if (screenId !== 'canvas-screen' && currentRoomId) {
        console.log('👋 Leaving room when switching screen...');
        await leaveAIVoiceChatRoom();
    }
    
    // 隐藏所有屏幕
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        console.log('  - Hidden:', s.id);
    });
    
    // 显示目标屏幕
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        console.log('  + Shown:', screenId);
    } else {
        console.error('❌ Screen not found:', screenId);
    }
    
    // 特殊处理
    if (screenId === 'canvas-screen') {
        toggleSettings(false);
    }
}

// 选择角色
async function selectCharacter(charId) {
    // 离开之前的房间（如果有）
    if (currentRoomId) {
        console.log('👋 Leaving previous room...');
        await leaveAIVoiceChatRoom();
    }
    
    currentCharacter = getCharacter(charId);
    
    document.getElementById('current-avatar').textContent = currentCharacter.avatar;
    document.getElementById('current-char-name').textContent = currentCharacter.name;
    
    // 更新画布中的角色
    const sprite = document.getElementById('character-sprite');
    sprite.querySelector('.character-body').textContent = currentCharacter.avatar;
    
    // 添加点击角色互动
    sprite.onclick = function() {
        handleCharacterClick();
    };
    
    // 添加提示气泡
    let hintBubble = sprite.querySelector('.hint-bubble');
    if (!hintBubble) {
        hintBubble = document.createElement('div');
        hintBubble.className = 'hint-bubble';
        hintBubble.textContent = 'Click me! 👋';
        sprite.appendChild(hintBubble);
    }
    
    Memory.load();
    showScreen('scene-select');
}

// 处理角色点击
function handleCharacterClick() {
    initAudio();
    playSound('laugh');
    
    const sprite = document.getElementById('character-sprite');
    sprite.classList.add('clapping');
    setTimeout(() => sprite.classList.remove('clapping'), 1000);
    
    // 🎭 播放肢体动作
    Character.playAnimation('wave');
    
    // ✨ 播放爱心粒子
    Particles.spawn('hearts', { 
        x: characterPosition.x * window.innerWidth / 100,
        y: characterPosition.y * window.innerHeight / 100
    });
    
    // 随机回应（语音播放，不显示气泡）
    const responses = [
        "Hehe! You're so funny!",
        "I like playing with you!",
        "Want to hear a joke?",
        "You make me happy!"
    ];
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    speak(response);
}

/**
 * 处理 AI 字幕事件 - 让角色在画布中自由移动 + 显示字幕
 * @param {Object} subtitle - 字幕数据
 */
let aiSpeakCount = 0; // AI 说话次数计数器
let subtitleTimeout = null; // 字幕自动隐藏定时器

function handleAISubtitle(subtitle) {
    // 调试日志
    console.log('💬 [Subtitle] Received:', {
        hasSubtitle: !!subtitle,
        dataLength: subtitle?.data?.length,
        data: subtitle?.data?.slice(0, 2)  // 只显示前 2 条
    });
    
    if (!subtitle || !subtitle.data || !Array.isArray(subtitle.data)) {
        console.warn('⚠️ [Subtitle] Invalid format:', subtitle);
        return;
    }
    
    // 遍历字幕数据（可能有多条）
    for (const item of subtitle.data) {
        const { text, userId } = item;
        
        console.log('📝 [Subtitle] Item:', { text: text?.substring(0, 30), userId });
        
        // 只处理 AI 的字幕（userId 以 ai_ 开头）
        if (!userId || !userId.startsWith('ai_')) {
            console.log('⏭️ [Subtitle] Not AI:', userId);
            continue;
        }
        
        // 有文本就触发效果（放宽条件）
        if (text) {
            aiSpeakCount++;
            
            console.log(`🤖 AI spoke #${aiSpeakCount}: "${text.substring(0, 50)}..."`);
            console.log('   [Character] Available:', !!window.Character);
            console.log('   [Particles] Available:', !!window.Particles);
            
            // 1. 让角色在不同位置之间循环移动
            moveCharacterRandomly(aiSpeakCount);
            
            // 2. 播放随机肢体动作
            console.log('🎭 [Character] Playing random animation');
            if (window.Character && typeof Character.playRandom === 'function') {
                Character.playRandom();
            } else {
                console.warn('⚠️ Character.playRandom not available');
            }
            
            // 3. 每 5 次播放粒子效果
            if (aiSpeakCount % 5 === 0) {
                console.log('✨ Spawning celebrate particles');
                const canvas = document.getElementById('canvas');
                console.log('   Canvas:', canvas);
                if (window.Particles && typeof Particles.spawn === 'function' && canvas) {
                    Particles.spawn('celebrate', { canvas });
                } else {
                    console.warn('⚠️ Particles.spawn not available or no canvas');
                }
            }
            
            // 4. 显示字幕
            showSubtitle(text);
        }
    }
}

/**
 * 显示字幕
 * @param {string} text - 字幕文本
 */
function showSubtitle(text) {
    const subtitleEl = document.getElementById('subtitle-text');
    const subtitleLayer = document.getElementById('subtitle-layer');
    
    if (!subtitleEl || !subtitleLayer) {
        console.warn('⚠️ [Subtitle] Element not found');
        return;
    }
    
    // 更新字幕文本
    subtitleEl.textContent = text;
    
    // 显示字幕
    subtitleEl.classList.add('show');
    subtitleLayer.style.display = 'block';
    
    // 清除之前的定时器
    if (subtitleTimeout) {
        clearTimeout(subtitleTimeout);
    }
    
    // 根据文本长度设置显示时间（至少 2 秒，最多 8 秒）
    const displayTime = Math.min(8000, Math.max(2000, text.length * 150));
    
    // 自动隐藏字幕
    subtitleTimeout = setTimeout(() => {
        subtitleEl.classList.remove('show');
        setTimeout(() => {
            if (!subtitleEl.classList.contains('show')) {
                subtitleLayer.style.display = 'none';
            }
        }, 300); // 等待淡出动画完成
    }, displayTime);
    
    console.log(`📺 [Subtitle] Displaying: "${text.substring(0, 50)}..." (${displayTime}ms)`);
}

/**
 * 让角色随机移动（循环几个预设位置）
 * @param {number} count - 说话次数
 */
function moveCharacterRandomly(count) {
    // 预设几个位置点（左、中、右）
    const positions = [
        { x: 25, y: 60 },  // 左边
        { x: 50, y: 60 },  // 中间
        { x: 75, y: 60 },  // 右边
        { x: 40, y: 65 },  // 左中
        { x: 60, y: 65 }   // 右中
    ];
    
    // 根据说话次数循环选择位置
    const posIndex = (count - 1) % positions.length;
    const pos = positions[posIndex];
    
    console.log(`🚶 Moving character to position ${posIndex + 1}:`, pos);
    
    moveCharacterTo(pos.x, pos.y, { jump: true });
}

// ==================== ⭐ StartVoiceChat AI 语音对话集成（正确流程） ====================

/**
 * StartVoiceChat 集成说明（正确流程）
 * 
 * 流程：
 * 1. 前端创建 RTC 房间并加入
 * 2. 开启本地音视频采集
 * 3. 订阅和播放房间内音视频流
 * 4. 调用后端接口将 AI 角色加入 RTC 房间
 * 5. 结束时调用后端接口结束 AI 对话，然后离开并销毁房间
 * 
 * 数据流：
 * 孩子说话 → RTC 音频流 → 火山云端 (ASR+LLM+TTS) → RTC 音频流 → 播放 AI 声音
 * 
 * 参考文档：INTEGRATION-FLOW.md
 */

let currentRoomId = null;
let currentAiTaskId = null;
let isStartVoiceChatMode = true;

/**
 * 创建 AI 语音聊天房间（正确流程：前端创建房间 → AI 加入）
 * 
 * 调用时机：用户选择场景后
 * 调用位置：selectScene() 函数中
 */
async function createAIVoiceChatRoom() {
    if (!currentCharacter || !currentScene) {
        console.warn('⚠️ Character or scene not selected');
        return;
    }
    
    console.log('🏠 [1/4] Creating RTC room (frontend)...');
    console.log('   Character:', currentCharacter.id);
    console.log('   Scene:', currentScene.id);
    
    // 生成房间 ID（确保唯一性）
    currentRoomId = `room_${currentCharacter.id}_${currentScene.id}_${Date.now()}`;
    
    try {
        // 显示加载动画
        showVideoLoading();
        updateRTCStatus('creating', '正在创建房间...');
        
        // 步骤 1: 前端创建 RTC 房间并加入
        // 使用 StartVoiceChat 客户端（正确流程版本）
        // 注意：AppId 和 Token 都从后端 API 获取（推荐方式）
        await createStartVoiceChatRoom(
            currentRoomId,
            {
                fetchConfig: true, // 从后端获取配置（推荐）
                // 房间创建成功回调
                onReady: () => {
                    console.log('✅ [1/4] Room created and joined');
                    updateRTCStatus('room_ready', '房间已创建，等待 AI 加入...');
                    
                    // 步骤 2: 调用后端 API 将 AI 加入房间（传递场景信息）
                    joinAIWithCharacter(currentCharacter.id, currentScene.id);
                },
                
                // AI 已加入回调
                onAIJoined: (info) => {
                    console.log('✅ [2/4] AI joined room:', info);
                    currentAiTaskId = info.taskId;
                    hideVideoLoading();
                    updateRTCStatus('connected', 'AI 角色已就绪');
                    
                    // 步骤 3: 开始对话（AI 会自动说欢迎词）
                    console.log('🎤 [3/4] Starting conversation...');
                },
                
                // 错误回调
                onError: (error) => {
                    console.error('❌ Voice chat error:', error);
                    showVideoError(error.message);
                    updateRTCStatus('error', '连接失败');
                    
                    // 降级到本地对话模式
                    console.log('📌 Fallback to local dialogue mode');
                    isStartVoiceChatMode = false;
                },
                
                // 状态变化回调
                onStatusChange: (status, text) => {
                    console.log('📊 RTC Status:', status, '-', text);
                    updateRTCStatus(status, text);
                },
                
                // 远端流回调
                onRemoteStream: (stream) => {
                    console.log('📥 [4/4] Remote stream received:', stream);
                },
                
                // 字幕回调 - AI 说话时触发
                onSubtitle: (subtitle) => {
                    console.log('💬 [App] Subtitle callback triggered:', subtitle);
                    handleAISubtitle(subtitle);
                }
            }
        );
        
        console.log('✅ Room creation initiated');
        console.log('   RoomId:', currentRoomId);
        
    } catch (error) {
        console.error('❌ Failed to create room:', error);
        // 降级到本地对话模式
        console.log('📌 Using local dialogue mode');
        isStartVoiceChatMode = false;
    }
}

/**
 * 将 AI 角色加入房间（调用后端 API）
 */
async function joinAIWithCharacter(character, scene) {
    const sceneId = scene || (currentScene ? currentScene.id : 'zoo');
    console.log('🤖 Joining AI character:', character, 'Scene:', sceneId);
    
    try {
        await joinAICharacter(character, sceneId);
        console.log('✅ AI character joined');
        
        // 🎉 播放欢迎效果（延迟 1 秒，等待 AI 准备好）
        setTimeout(() => {
            console.log('✨ Playing welcome effects');
            Particles.spawn('celebrate', { canvas: document.getElementById('canvas') });
            Character.playAnimation('wave');
        }, 1000);
        
    } catch (error) {
        console.error('❌ Failed to join AI:', error);
        showVideoError(error.message);
    }
}

/**
 * 离开 AI 语音聊天房间
 * 
 * 调用时机：用户离开场景或选择其他角色
 */
async function leaveAIVoiceChatRoom() {
    if (!currentRoomId) return;
    
    console.log('👋 Leaving StartVoiceChat room:', currentRoomId);
    
    try {
        // 离开 StartVoiceChat 房间（自动调用后端结束 AI 对话）
        // 详细实现：js/startvoicechat-client.js
        await leaveStartVoiceChatRoom();
        
        console.log('✅ Left StartVoiceChat room');
        
    } catch (error) {
        console.error('❌ Failed to leave room:', error);
    } finally {
        currentRoomId = null;
        currentAiTaskId = null;
        isStartVoiceChatMode = true;
    }
}

// ==================== 选择场景 ====================

/**
 * 选择场景
 * 
 * 流程：
 * 1. 离开之前的房间（如果有）
 * 2. 加载场景配置
 * 3. 设置背景
 * 4. 创建 AI 语音聊天房间（StartVoiceChat）
 * 5. 开始对话
 */
async function selectScene(sceneId) {
    console.log('🎪 Selecting scene:', sceneId);
    
    // 离开之前的房间（如果有）
    if (currentRoomId) {
        console.log('👋 Leaving previous room...');
        await leaveAIVoiceChatRoom();
    }
    
    currentScene = getScene(sceneId);
    currentDialogueIndex = 0;
    
    // 设置背景
    const canvas = document.getElementById('canvas');
    canvas.style.background = currentScene.bgGradient;
    document.getElementById('canvas-bg').textContent = currentScene.bgImage || '';
    
    // 重置角色位置到中心
    const sprite = document.getElementById('character-sprite');
    if (sprite) {
        sprite.style.left = '50%';
        sprite.style.top = '60%';
        sprite.style.transform = 'translate(-50%, -50%)';
        characterPosition = { x: 50, y: 60 };
    }
    
    // 切换到画布界面
    showScreen('canvas-screen');
    
    // 清空画布内容
    clearCanvasContent();
    
    // 重置 AI 说话计数器
    aiSpeakCount = 0;
    console.log('🔄 [Reset] aiSpeakCount reset to 0');
    
    // ⭐ 创建 AI 语音聊天房间（StartVoiceChat API）
    console.log('🏠 Creating AI voice chat room...');
    try {
        await createAIVoiceChatRoom();
    } catch (error) {
        console.error('❌ Failed to create AI voice chat room:', error);
        // 降级到本地对话模式
        console.log('📌 Using local dialogue mode (fallback)');
    }
    
    // 开始对话
    // 注意：StartVoiceChat 模式下，AI 会自动说话，不需要播放预定义对话
    // 只有本地模式才播放预定义对话
    if (!isStartVoiceChatMode) {
        setTimeout(() => {
            startDialogue();
        }, 500);
    } else {
        console.log('🎤 StartVoiceChat mode, AI will speak automatically');
    }
}

// 清空画布内容
function clearCanvasContent() {
    const contentLayer = document.getElementById('content-layer');
    contentLayer.innerHTML = '';
}

// 移动角色到指定位置
function moveCharacterTo(x, y, options = {}) {
    const sprite = document.getElementById('character-sprite');
    if (!sprite) {
        console.error('❌ [Move] Sprite not found!');
        return;
    }
    
    console.log('🚶 [Move] Moving to:', { x, y, options });
    console.log('   Current position:', characterPosition);
    console.log('   Sprite style before:', { left: sprite.style.left, top: sprite.style.top });
    
    initAudio();
    
    // 添加行走动画
    sprite.classList.add('walking');
    
    // 跳跃时播放灰尘粒子效果
    if (options.jump) {
        console.log('✨ [Move] Spawning dust particles');
        const canvas = document.getElementById('canvas');
        if (window.Particles && typeof Particles.spawn === 'function' && canvas) {
            Particles.spawn('dust', { 
                x: characterPosition.x * window.innerWidth / 100,
                y: characterPosition.y * window.innerHeight / 100
            });
        }
    }
    
    // 播放脚步声
    let stepCount = 0;
    const stepInterval = setInterval(() => {
        if (stepCount < 4) {
            playSound('step');
            stepCount++;
        } else {
            clearInterval(stepInterval);
        }
    }, 200);
    
    // 设置新位置
    sprite.style.left = x + '%';
    sprite.style.top = y + '%';
    // CSS 已设置 transform: translate(-50%, -50%) 用于居中
    
    // 更新位置记录
    characterPosition = { x, y };
    
    console.log('   Sprite style after:', { left: sprite.style.left, top: sprite.style.top });
    console.log('   New position:', characterPosition);
    
    // 移除行走动画
    setTimeout(() => {
        sprite.classList.remove('walking');
        
        // 如果需要指向
        if (options.pointLeft) {
            sprite.classList.add('pointing');
        } else if (options.pointRight) {
            sprite.classList.remove('pointing');
        }
        
        // 如果需要跳跃
        if (options.jump) {
            sprite.classList.add('jumping');
            playSound('pop');
            setTimeout(() => sprite.classList.remove('jumping'), 600);
        }
        
        // 如果需要兴奋
        if (options.excited) {
            sprite.classList.add('excited');
            playSound('cheer');
            setTimeout(() => sprite.classList.remove('excited'), 1000);
        }
        
        // 如果需要挥手
        if (options.wave) {
            sprite.classList.add('waving');
            setTimeout(() => sprite.classList.remove('waving'), 1000);
        }
    }, 800);
}

// 移动角色到内容附近
function moveCharacterToContent(contentId) {
    const content = document.getElementById(contentId);
    if (!content) return;
    
    const rect = content.getBoundingClientRect();
    const canvas = document.getElementById('canvas').getBoundingClientRect();
    
    // 计算内容中心位置（百分比）
    const contentX = ((rect.left + rect.width / 2 - canvas.left) / canvas.width) * 100;
    const contentY = ((rect.top + rect.height / 2 - canvas.top) / canvas.height) * 100;
    
    // 角色移动到内容旁边
    const offsetX = contentX > 50 ? -15 : 15;
    const moveX = contentX + offsetX;
    const moveY = contentY + 10;
    
    moveCharacterTo(moveX, moveY, {
        pointLeft: contentX > 50,
        pointRight: contentX <= 50
    });
}

// 角色回到中心
function moveCharacterToCenter() {
    moveCharacterTo(50, 60, { jump: true });
}

// 开始对话
function startDialogue() {
    if (currentDialogueIndex >= currentScene.dialogues.length) {
        showSceneComplete();
        return;
    }
    
    const dialogue = currentScene.dialogues[currentDialogueIndex];
    
    // 显示媒体内容并移动角色
    if (dialogue.media) {
        const contentId = showMediaContent(dialogue.media);
        // 延迟移动角色，等内容显示后
        setTimeout(() => {
            moveCharacterToContent(contentId);
        }, 300);
    } else {
        moveCharacterToCenter();
    }
    
    // 更新快速操作
    updateQuickActions(dialogue);
    
    // 朗读对话
    setTimeout(() => {
        speak(dialogue.text);
    }, 500);
    
    document.getElementById('recording-status').textContent = '';
}

// 显示媒体内容（图片/视频/emoji）
function showMediaContent(media) {
    const contentLayer = document.getElementById('content-layer');
    
    const contentId = `content-${contentCounter++}`;
    const contentDiv = document.createElement('div');
    contentDiv.className = 'dynamic-content';
    contentDiv.id = contentId;
    
    // 设置位置
    if (media.position) {
        contentDiv.style.top = media.position.top || '50%';
        contentDiv.style.left = media.position.left || '50%';
        contentDiv.style.transform = 'translate(-50%, -50%)';
    }
    
    // 设置大小
    const sizes = {
        small: '80px',
        medium: '120px',
        large: '180px'
    };
    const size = sizes[media.size] || '120px';
    contentDiv.style.width = size;
    contentDiv.style.height = size;
    
    // 设置内容
    if (media.type === 'emoji') {
        contentDiv.innerHTML = `
            <div style="font-size: ${size}; display: flex; align-items: center; justify-content: center; height: 100%;">
                ${media.content}
            </div>
            ${media.label ? `<div class="content-label">${media.label}</div>` : ''}
            <button class="close-btn" onclick="removeContent('${contentId}')">×</button>
        `;
    } else if (media.type === 'image') {
        contentDiv.innerHTML = `
            <img src="${media.content}" alt="${media.label || ''}">
            ${media.label ? `<div class="content-label">${media.label}</div>` : ''}
            <button class="close-btn" onclick="removeContent('${contentId}')">×</button>
        `;
    } else if (media.type === 'video') {
        contentDiv.innerHTML = `
            <video src="${media.content}" autoplay loop muted playsinline></video>
            ${media.label ? `<div class="content-label">${media.label}</div>` : ''}
            <button class="close-btn" onclick="removeContent('${contentId}')">×</button>
        `;
    }
    
    // 点击放大
    contentDiv.onclick = function(e) {
        if (!e.target.classList.contains('close-btn')) {
            initAudio();
            playSound('pop');
            enlargeContent(contentDiv);
        }
    };
    
    // 播放弹出音效
    initAudio();
    playSound('pop');
    
    contentLayer.appendChild(contentDiv);
    
    return contentId;
}

// 移除内容
function removeContent(contentId) {
    const content = document.getElementById(contentId);
    if (content) {
        content.style.animation = 'contentPop 0.3s reverse';
        setTimeout(() => content.remove(), 300);
    }
}

// 放大内容
function enlargeContent(contentDiv) {
    contentDiv.style.zIndex = '100';
    contentDiv.style.width = '300px';
    contentDiv.style.height = '300px';
    contentDiv.style.transition = 'all 0.3s';
    
    // 再次点击恢复
    contentDiv.onclick = function() {
        contentDiv.style.zIndex = '5';
        contentDiv.style.width = '120px';
        contentDiv.style.height = '120px';
        contentDiv.onclick = function(e) {
            if (!e.target.classList.contains('close-btn')) {
                enlargeContent(contentDiv);
            }
        };
    };
}

// 更新快速操作
function updateQuickActions(dialogue) {
    const container = document.getElementById('quick-actions');
    container.innerHTML = '';
    
    // 生成一些相关的快速回复
    const actions = generateQuickActions(dialogue);
    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'quick-action-btn';
        btn.textContent = action;
        btn.onclick = () => handleChildInput(action);
        container.appendChild(btn);
    });
}

// 生成快速操作
function generateQuickActions(dialogue) {
    const actions = [
        "Yes!",
        "No!",
        "I like it!",
        "I don't like it.",
        "Tell me more!",
        "What's next?",
        "I love this!",
        "Can we play again?"
    ];
    
    // 随机选 3-4 个
    const shuffled = actions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
}

// 处理孩子的输入
function handleChildInput(text) {
    if (!text || text.trim() === '') return;
    
    document.getElementById('recording-status').textContent = 
        `You said: "${text}"`;
    
    // 理解孩子的话
    const matches = understandChildInput(text);
    const response = generateResponse(matches, text);
    
    // 显示回应
    setTimeout(() => {
        speak(response.text, () => {
            // 回应后继续下一个对话
            setTimeout(() => {
                currentDialogueIndex++;
                startDialogue();
            }, 1500);
        });
    }, 800);
}

// 显示场景完成
function showSceneComplete() {
    clearCanvasContent();
    
    const actions = [
        "Play Again 🔄",
        "Choose Another Scene 🎪",
        "Choose Another Friend 👋"
    ];
    
    const container = document.getElementById('quick-actions');
    container.innerHTML = '';
    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'quick-action-btn';
        btn.textContent = action;
        btn.onclick = () => {
            initAudio();
            playSound('cheer');
            if (action.includes('Again')) {
                currentDialogueIndex = 0;
                startDialogue();
            } else if (action.includes('Scene')) {
                showScreen('scene-select');
            } else {
                showScreen('character-select');
            }
        };
        container.appendChild(btn);
    });
    
    // 播放庆祝音效
    initAudio();
    playSound('cheer');
    speak(`Great job! You completed ${currentScene.name}!`);
}

// 切换设置面板
function toggleSettings(forceState) {
    const panel = document.getElementById('settings-panel');
    const shouldShow = forceState !== undefined ? forceState : !panel.classList.contains('active');
    
    if (shouldShow) {
        panel.classList.add('active');
    } else {
        panel.classList.remove('active');
    }
}

// 清除记忆
function clearMemory() {
    if (confirm('Clear all memory? This will reset everything the friend remembers about you.')) {
        Memory.clear();
        toggleSettings(false);
        document.getElementById('recording-status').textContent = 'Memory cleared! Starting fresh! 🗑️';
    }
}

// 绑定事件处理函数
function bindEvents() {
    // 角色选择
    document.querySelectorAll('.character-card').forEach(card => {
        card.addEventListener('click', function() {
            const charId = this.getAttribute('data-char');
            selectCharacter(charId);
        });
    });

    // 场景选择
    document.querySelectorAll('.scene-card').forEach(card => {
        card.addEventListener('click', function() {
            const sceneId = this.getAttribute('data-scene');
            selectScene(sceneId);
        });
    });

    console.log('✅ Events bound');
}

// RTC 配置（StartVoiceChat 模式）
// AppId 会从后端 API 返回，不需要硬编码
let rtcInitialized = false;

/**
 * RTC 初始化函数
 * 
 * 注意：在 StartVoiceChat 模式下：
 * - 不需要提前知道 AppId（从后端 API 返回）
 * - 不需要手动加入房间（由 startvoicechat-client.js 处理）
 * - 这里只是预检查 SDK 是否可用
 */
async function initRTC() {
    if (rtcInitialized) return;

    try {
        // 等待 SDK 加载
        await waitForRTCSdk();
        
        rtcInitialized = true;
        console.log('✅ RTC SDK ready for StartVoiceChat');
    } catch (error) {
        // SDK 不可用，使用动画模式
        console.log('📌 RTC SDK not available, using animation mode');
        rtcInitialized = true; // 标记为已初始化，避免重试
    }
}

// 等待 SDK 加载
/**
 * 等待 RTC SDK 加载
 * 注意：不要设置 window.VERTC = null，允许后续重试
 */
function waitForRTCSdk() {
    return new Promise((resolve, reject) => {
        // SDK 已加载
        if (window.VERTC) {
            resolve();
            return;
        }

        const checkInterval = setInterval(() => {
            // SDK 加载成功
            if (window.VERTC) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);

        // 超时处理（10 秒）
        setTimeout(() => {
            clearInterval(checkInterval);
            // 拒绝 Promise，但不清除 window.VERTC，允许后续重试
            reject(new Error('RTC SDK load timeout'));
        }, 10000);
    });
}

// ==================== 页面生命周期管理 ====================

// 页面可见性变化
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        speechSynthesis.cancel();
    }
});

// 页面刷新或关闭前
window.addEventListener('beforeunload', async function(event) {
    if (currentRoomId) {
        console.log('👋 Page closing, leaving room...');
        
        // 同步离开房间（beforeunload 中只能做同步操作）
        try {
            // 使用 sendBeacon 发送离开请求（可靠，即使页面关闭）
            const data = JSON.stringify({ roomId: currentRoomId, taskId: currentAiTaskId });
            navigator.sendBeacon('/api/leave-room', data);
            console.log('✅ Leave request sent via sendBeacon');
        } catch (error) {
            console.error('❌ Failed to send leave request:', error);
        }
    }
});

// 页面隐藏时（用户切换标签页或最小化）
document.addEventListener('visibilitychange', async function() {
    if (document.hidden) {
        console.log('🌙 Page hidden, muting audio...');
        // 可选：静音或暂停
    } else {
        console.log('☀️ Page visible, resuming...');
        // 可选：恢复
    }
});

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', function() {
    // 基础初始化
    initAudio();
    bindEvents();
    Memory.load();
    
    // 初始化 RTC（用于 StartVoiceChat）
    initRTC();
    
    // 语音合成配置（备用方案，本地 TTS）
    if ('speechSynthesis' in window) {
        speechSynthesis.onvoiceschanged = function() {
            speechSynthesis.getVoices();
        };
    }
    
    // 检查登录状态
    checkAuthAndShowScreen();
    
    console.log('✅ App initialized in StartVoiceChat mode');
});

/**
 * 检查认证状态并显示相应界面
 */
function checkAuthAndShowScreen() {
    // 如果已登录，显示角色选择界面
    if (window.authClient && window.authClient.isLoggedIn()) {
        console.log('✅ User logged in:', window.authClient.getUsername());
        showScreen('character-select');
    } else {
        // 未登录，显示登录界面
        console.log('🔐 User not logged in, showing login screen');
        showScreen('login-screen');
    }
}

// ==================== 麦克风控制（RTC 模式） ====================

let isMuted = false;
let audioLevelTimer = null;

/**
 * 切换静音状态
 */
function toggleMute() {
    isMuted = !isMuted;
    
    if (window.currentVoiceChat) {
        window.currentVoiceChat.muteLocalAudio(isMuted);
    }
    
    const muteBtn = document.getElementById('mute-btn');
    const rtcStatus = document.getElementById('rtc-status');
    
    if (isMuted) {
        muteBtn.classList.add('muted');
        muteBtn.innerHTML = '🔇 已静音';
        rtcStatus.textContent = '🔇 已静音';
        
        // 静音本地音频
        if (window.rtAvatarClient) {
            window.rtAvatarClient.muteLocalAudio(true);
        }
    } else {
        muteBtn.classList.remove('muted');
        muteBtn.innerHTML = '🎤 说话中';
        rtcStatus.textContent = '🟢 连接中';
        
        // 取消静音
        if (window.rtAvatarClient) {
            window.rtAvatarClient.muteLocalAudio(false);
        }
    }
    
    console.log('🎤 Mute toggled:', isMuted);
}

/**
 * 更新音频电平指示器
 */
function updateAudioLevel(level) {
    const levelBar = document.querySelector('.level-bar');
    if (!levelBar) return;
    
    levelBar.style.width = Math.min(level, 100) + '%';
    
    // 根据音量改变颜色
    levelBar.className = 'level-bar';
    if (level < 30) {
        levelBar.classList.add('low');
    } else if (level < 70) {
        levelBar.classList.add('medium');
    } else {
        levelBar.classList.add('high');
    }
}

/**
 * 启动音频电平监测
 */
function startAudioLevelMonitor() {
    if (audioLevelTimer) {
        clearInterval(audioLevelTimer);
    }
    
    audioLevelTimer = setInterval(() => {
        if (window.rtAvatarClient) {
            const level = window.rtAvatarClient.getLocalAudioLevel();
            updateAudioLevel(level);
        }
    }, 100);
}

/**
 * 停止音频电平监测
 */
function stopAudioLevelMonitor() {
    if (audioLevelTimer) {
        clearInterval(audioLevelTimer);
        audioLevelTimer = null;
    }
}

/**
 * 显示音频控制栏
 */
function showAudioControlBar() {
    const bar = document.getElementById('audio-control-bar');
    if (bar) {
        bar.style.display = 'flex';
        bar.classList.add('show');
    }
}

/**
 * 隐藏音频控制栏
 */
function hideAudioControlBar() {
    const bar = document.getElementById('audio-control-bar');
    if (bar) {
        bar.classList.remove('show');
        setTimeout(() => {
            bar.style.display = 'none';
        }, 300);
    }
}

// ==================== 导出全局函数 ====================

window.toggleMute = toggleMute;
window.updateAudioLevel = updateAudioLevel;
window.startAudioLevelMonitor = startAudioLevelMonitor;
window.stopAudioLevelMonitor = stopAudioLevelMonitor;
window.showAudioControlBar = showAudioControlBar;
window.hideAudioControlBar = hideAudioControlBar;
window.showScreen = showScreen;
window.checkAuthAndShowScreen = checkAuthAndShowScreen;
