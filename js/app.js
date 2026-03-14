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

// 初始化语音识别
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onstart = function() {
            isRecording = true;
            updateRecordButton();
        };
        
        recognition.onend = function() {
            isRecording = false;
            updateRecordButton();
        };
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            document.getElementById('recording-status').textContent = 
                `You said: "${transcript}"`;
            handleChildInput(transcript);
        };
        
        recognition.onerror = function(event) {
            isRecording = false;
            updateRecordButton();
            document.getElementById('recording-status').textContent = 
                'Click the microphone and try again! 🎤';
        };
    }
}

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

// 切换录音状态
function toggleRecording() {
    if (!recognition) {
        document.getElementById('recording-status').textContent = 
            'Speech recognition not supported. Try Chrome browser! 🌐';
        return;
    }
    
    if (isRecording) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

// 开始录音
function startRecording() {
    if (!recognition) {
        alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
        return;
    }
    
    try {
        recognition.start();
        console.log('🎤 Recording started');
    } catch (error) {
        console.error('Failed to start recording:', error);
    }
}

// 停止录音
function stopRecording() {
    if (!recognition) return;
    
    try {
        recognition.stop();
        console.log('🔇 Recording stopped');
    } catch (error) {
        console.error('Failed to stop recording:', error);
    }
}

// 更新录音按钮状态
function updateRecordButton() {
    const btn = document.getElementById('record-btn');
    const text = btn.querySelector('.record-text');
    
    if (isRecording) {
        btn.classList.add('recording');
        text.textContent = 'Listening...';
    } else {
        btn.classList.remove('recording');
        text.textContent = '按住说话';
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

// 朗读当前对话
function speakCurrent() {
    const dialogue = currentScene.dialogues[currentDialogueIndex];
    speak(dialogue.text);
}

// 切换屏幕
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    if (screenId === 'character-select') {
        toggleSettings(false);
    }
}

// 选择角色
function selectCharacter(charId) {
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
    
    // 随机回应
    const responses = [
        { text: "Hehe! You're so funny!", textCn: "嘿嘿！你真有趣！" },
        { text: "I like playing with you!", textCn: "我喜欢和你一起玩！" },
        { text: "Want to hear a joke?", textCn: "想听个笑话吗？" },
        { text: "You make me happy!", textCn: "你让我很开心！" }
    ];
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    document.getElementById('bubble-text').textContent = response.text;
    document.getElementById('bubble-cn').textContent = response.textCn;
    speak(response.text);
}

// ==================== ⭐ RTC AI 语音对话集成 ====================

let rtcAvatarClient = null;
let currentRoomId = null;
let currentAiTaskId = null;

// 创建 AI 语音聊天房间
async function createAIVoiceChatRoom() {
    if (!currentCharacter || !currentScene) {
        console.warn('⚠️ Character or scene not selected');
        return;
    }
    
    console.log('🏠 Creating AI voice chat room...');
    
    // 生成房间 ID
    currentRoomId = `room_${currentCharacter.id}_${currentScene.id}_${Date.now()}`;
    
    try {
        // 1. 调用后端 API 创建房间并开启 AI 对话
        const response = await fetch('/api/create-room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId: currentRoomId,
                character: currentCharacter.id
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        currentAiTaskId = data.aiTaskId;
        
        console.log(`✅ AI voice chat room created: ${currentRoomId}, TaskId: ${currentAiTaskId}`);
        
        // 2. 初始化 RTC 客户端
        rtcAvatarClient = initRTCAvatar(data.appId, {
            asrEnabled: true,
            onVideoReady: () => {
                console.log('🎬 RTC video ready');
            },
            onError: (error) => {
                console.error('❌ RTC error:', error);
            },
            onLocalAudioPublished: () => {
                console.log('🎤 Local audio published');
            }
        });
        
        // 3. 加入 RTC 房间
        if (rtcAvatarClient) {
            await rtcAvatarClient.join(currentRoomId, data.token, 'child_' + Date.now(), {
                publishAudio: true
            });
            
            console.log('✅ Joined RTC room, AI will auto-reply!');
        }
        
    } catch (error) {
        console.error('❌ Failed to create AI voice chat room:', error);
        throw error;
    }
}

// 离开 AI 语音聊天房间
async function leaveAIVoiceChatRoom() {
    if (!currentRoomId) return;
    
    try {
        // 1. 离开 RTC 房间
        if (rtcAvatarClient) {
            await rtcAvatarClient.leave();
            rtcAvatarClient = null;
        }
        
        // 2. 调用后端结束 AI 对话
        if (currentAiTaskId) {
            await fetch('/api/leave-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId: currentRoomId })
            });
        }
        
        console.log('👋 Left AI voice chat room');
        
    } catch (error) {
        console.error('❌ Failed to leave AI voice chat room:', error);
    } finally {
        currentRoomId = null;
        currentAiTaskId = null;
    }
}

// ==================== 选择场景 ====================

async function selectScene(sceneId) {
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
    
    showScreen('canvas-screen');
    
    // 清空画布内容
    clearCanvasContent();
    
    // ⭐ 新增：创建 RTC 房间并开启 AI 对话
    try {
        await createAIVoiceChatRoom();
    } catch (error) {
        console.error('❌ Failed to create AI voice chat room:', error);
        // 降级到本地对话模式
        console.log('📌 Using local dialogue mode');
    }
    
    // 开始对话
    setTimeout(() => {
        startDialogue();
    }, 500);
}

// 清空画布内容
function clearCanvasContent() {
    const contentLayer = document.getElementById('content-layer');
    contentLayer.innerHTML = '';
}

// 移动角色到指定位置
function moveCharacterTo(x, y, options = {}) {
    const sprite = document.getElementById('character-sprite');
    if (!sprite) return;
    
    initAudio();
    
    // 添加行走动画
    sprite.classList.add('walking');
    
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
    sprite.style.transform = 'translate(-50%, -50%)';
    
    // 更新位置记录
    characterPosition = { x, y };
    
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
    
    // 更新对话气泡
    document.getElementById('bubble-text').textContent = dialogue.text;
    document.getElementById('bubble-cn').textContent = dialogue.textCn || '';
    
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
        document.getElementById('bubble-text').textContent = response.text;
        document.getElementById('bubble-cn').textContent = '';
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
    
    document.getElementById('bubble-text').textContent = 
        `🎉 Great job! You completed ${currentScene.name}!`;
    document.getElementById('bubble-cn').textContent = '太棒了！你完成了这个场景！';
    
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

    // 录音按钮
    const recordBtn = document.getElementById('record-btn');
    if (recordBtn) {
        recordBtn.addEventListener('mousedown', startRecording);
        recordBtn.addEventListener('mouseup', stopRecording);
        recordBtn.addEventListener('mouseleave', stopRecording);
        recordBtn.addEventListener('touchstart', startRecording);
        recordBtn.addEventListener('touchend', stopRecording);
    }

    console.log('✅ Events bound');
}

// RTC 配置
const VOLC_APP_ID = 'YOUR_APP_ID'; // ⚠️ 替换为你的火山云 AppID
let rtcInitialized = false;

// RTC 初始化函数
async function initRTC() {
    if (rtcInitialized) return;

    try {
        // 等待 SDK 加载
        await waitForRTCSdk();

        // 初始化 RTC 客户端
        initRTCAvatar(VOLC_APP_ID);

        rtcInitialized = true;
        console.log('✅ RTC initialized');
    } catch (error) {
        // SDK 不可用，使用动画模式
        console.log('📌 Using animation mode (RTC not available)');
        rtcInitialized = true; // 标记为已初始化，避免重试
    }
}

// 等待 SDK 加载
function waitForRTCSdk() {
    return new Promise((resolve, reject) => {
        // SDK 已加载
        if (window.VE_RTC) {
            resolve();
            return;
        }

        // SDK 加载失败（被设为 null）
        if (window.VE_RTC === null) {
            console.warn('⚠️ RTC SDK not available');
            reject(new Error('RTC SDK not available'));
            return;
        }

        const checkInterval = setInterval(() => {
            // SDK 加载成功
            if (window.VE_RTC) {
                clearInterval(checkInterval);
                resolve();
            }
            // SDK 加载失败
            if (window.VE_RTC === null) {
                clearInterval(checkInterval);
                reject(new Error('RTC SDK not available'));
            }
        }, 100);

        // 超时处理
        setTimeout(() => {
            clearInterval(checkInterval);
            // 超时后标记为不可用
            window.VE_RTC = null;
            reject(new Error('RTC SDK load timeout'));
        }, 5000); // 缩短超时时间到 5 秒
    });
}

document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        speechSynthesis.cancel();
    }
});

// ==================== WebSocket 集成 ====================

// DOMContentLoaded 处理
document.addEventListener('DOMContentLoaded', function() {
    // 基础初始化
    initSpeechRecognition();
    initAudio();
    bindEvents();
    Memory.load();
    
    // 初始化 RTC
    initRTC();
    
    // 语音合成配置
    if ('speechSynthesis' in window) {
        speechSynthesis.onvoiceschanged = function() {
            speechSynthesis.getVoices();
        };
    }
    
    // ⭐ 初始化 WebSocket（延迟 1 秒确保页面加载完成）
    setTimeout(() => {
        if (window.initWebSocket) {
            console.log('🔌 Initializing WebSocket...');
            window.initWebSocket();
        }
    }, 1000);
});

// ==================== 麦克风控制（RTC 模式） ====================

let isMuted = false;
let audioLevelTimer = null;

/**
 * 切换静音状态
 */
function toggleMute() {
    isMuted = !isMuted;
    
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

/**
 * 更新 RTC 状态显示
 */
function updateRTCStatus(status, text) {
    const rtcStatus = document.getElementById('rtc-status');
    if (!rtcStatus) return;
    
    rtcStatus.className = 'rtc-status ' + status;
    
    const statusTexts = {
        'connected': '🟢 已连接',
        'connecting': '🟡 连接中...',
        'error': '🔴 连接失败',
        'disconnected': '⚪ 已断开'
    };
    
    rtcStatus.textContent = text || statusTexts[status] || status;
}

// ==================== 导出全局函数 ====================

window.toggleMute = toggleMute;
window.updateAudioLevel = updateAudioLevel;
window.startAudioLevelMonitor = startAudioLevelMonitor;
window.stopAudioLevelMonitor = stopAudioLevelMonitor;
window.showAudioControlBar = showAudioControlBar;
window.hideAudioControlBar = hideAudioControlBar;
window.updateRTCStatus = updateRTCStatus;

console.log('🔧 Enhanced app module loaded with WebSocket support');
