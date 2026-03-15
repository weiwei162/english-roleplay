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
 * ⚠️ 注意：不需要 WebSocket！不需要手动发送音频！
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
        // 注意：AppId 可以从后端 API 获取，或硬编码在前端配置中
        const VOLC_APP_ID = window.VOLC_APP_ID || 'YOUR_APP_ID'; // 从全局配置获取
        
        await createStartVoiceChatRoom(
            currentRoomId,
            VOLC_APP_ID,
            {
                // 房间创建成功回调
                onReady: () => {
                    console.log('✅ [1/4] Room created and joined');
                    updateRTCStatus('room_ready', '房间已创建，等待 AI 加入...');
                    
                    // 步骤 2: 调用后端 API 将 AI 加入房间
                    joinAIWithCharacter(currentCharacter.id);
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
async function joinAIWithCharacter(character) {
    console.log('🤖 Joining AI character:', character);
    
    try {
        await joinAICharacter(character);
        console.log('✅ AI character joined');
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
 * 1. 加载场景配置
 * 2. 设置背景
 * 3. 创建 AI 语音聊天房间（StartVoiceChat）
 * 4. 开始对话
 */
async function selectScene(sceneId) {
    console.log('🎪 Selecting scene:', sceneId);
    
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
    
    // ⭐ 创建 AI 语音聊天房间（StartVoiceChat API）
    // 这是关键步骤：后端创建房间，前端加入 RTC
    console.log('🏠 Creating AI voice chat room...');
    try {
        await createAIVoiceChatRoom();
    } catch (error) {
        console.error('❌ Failed to create AI voice chat room:', error);
        // 降级到本地对话模式
        console.log('📌 Using local dialogue mode (fallback)');
    }
    
    // 开始对话
    // 注意：如果是 StartVoiceChat 模式，AI 会自动说欢迎词
    // 本地模式会播放预定义的对话
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
function waitForRTCSdk() {
    return new Promise((resolve, reject) => {
        // SDK 已加载
        if (window.VERTC) {
            resolve();
            return;
        }

        // SDK 加载失败（被设为 null）
        if (window.VERTC === null) {
            console.warn('⚠️ RTC SDK not available');
            reject(new Error('RTC SDK not available'));
            return;
        }

        const checkInterval = setInterval(() => {
            // SDK 加载成功
            if (window.VERTC) {
                clearInterval(checkInterval);
                resolve();
            }
            // SDK 加载失败
            if (window.VERTC === null) {
                clearInterval(checkInterval);
                reject(new Error('RTC SDK not available'));
            }
        }, 100);

        // 超时处理
        setTimeout(() => {
            clearInterval(checkInterval);
            // 超时后标记为不可用
            window.VERTC = null;
            reject(new Error('RTC SDK load timeout'));
        }, 10000);
    });
}

document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        speechSynthesis.cancel();
    }
});

// ==================== ⭐ StartVoiceChat 模式说明 ====================

/**
 * 当前使用 StartVoiceChat 模式，不需要 WebSocket！
 * 
 * 集成流程：
 * 1. 用户选择场景 → selectScene()
 * 2. 调用 createAIVoiceChatRoom()
 * 3. 后端创建房间并启动 AI (StartVoiceChat API)
 * 4. 前端通过 RTC 加入房间
 * 5. 实时对话开始（RTC 传输音频流）
 * 
 * 数据流：
 * 孩子说话 → RTC 音频流 → 火山引擎云端 (ASR+LLM+TTS) → RTC 音频流 → 播放 AI 声音
 * 
 * 参考文档：INTEGRATION-FLOW.md
 */

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', function() {
    // 基础初始化
    initSpeechRecognition();
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
    
    // ⚠️ 注意：StartVoiceChat 模式下不需要 WebSocket
    // WebSocket 相关代码已弃用，保留用于降级方案
    console.log('✅ App initialized in StartVoiceChat mode');
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
