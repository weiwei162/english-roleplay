# 角色移动/效果问题深度分析报告

**分析日期**: 2026-03-21  
**问题**: 
1. 角色只第一次移动，且向左上角移出画布
2. 后续对话没有移动
3. 没有看到肢体动作和粒子效果

---

## 🔍 问题分析

### 问题 1: 角色向左上角移动并移出画布

**可能原因**:

#### 1.1 CSS transform 冲突 ⚠️

**CSS 代码**:
```css
.character-sprite {
    position: absolute;
    transition: all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    animation: characterFloat 3s ease-in-out infinite;  /* ⚠️ 浮动动画 */
}

@keyframes characterFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
}
```

**JS 代码**:
```javascript
sprite.style.transform = 'translate(-50%, -50%)';  // ⚠️ 与 CSS 动画冲突！
```

**问题**: CSS 的 `characterFloat` 动画会不断覆盖 `transform`，导致位置计算错误！

---

#### 1.2 位置计算问题

**当前代码**:
```javascript
sprite.style.left = x + '%';
sprite.style.top = y + '%';
sprite.style.transform = 'translate(-50%, -50%)';
```

**问题**: 
- `left: 25%` + `transform: translate(-50%, -50%)` 会让角色中心对准 25% 位置
- 但 CSS 浮动动画会覆盖 transform，导致位置偏移

---

### 问题 2: 只有第一次移动

**可能原因**:

#### 2.1 字幕回调只在第一次触发 ⚠️

**检查点**:
```javascript
onSubtitle: (subtitle) => {
    console.log('💬 Subtitle received:', subtitle);
    handleAISubtitle(subtitle);
}
```

**可能问题**:
- RTC 连接在第一次字幕后就断开了
- 火山引擎只发送了第一次字幕
- `onSubtitle` 回调被意外移除

---

#### 2.2 aiSpeakCount 变量问题

**当前代码**:
```javascript
let aiSpeakCount = 0; // 全局变量

function handleAISubtitle(subtitle) {
    if (text) {
        aiSpeakCount++;  // 递增
        moveCharacterRandomly(aiSpeakCount);
    }
}
```

**检查**: 变量是否被重置？

**可能问题**:
- 页面刷新后变量重置（正常）
- 切换场景时变量未重置（应该重置）

---

### 问题 3: 没有肢体动作和粒子效果

**可能原因**:

#### 3.1 Character 对象未正确加载 ⚠️

**检查**:
```javascript
// animations.js
window.Character = { playAnimation, playRandom, ... };

// app.js 中调用
Character.playRandom();
```

**可能问题**:
- `animations.js` 加载顺序在 `app.js` 之后
- `window.Character` 未定义

---

#### 3.2 Particles 对象未正确加载 ⚠️

**检查**:
```javascript
// particles.js
window.Particles = { spawn, ... };

// app.js 中调用
Particles.spawn('celebrate');
```

**可能问题**:
- `particles.js` 加载顺序在 `app.js` 之后
- `window.Particles` 未定义

---

#### 3.3 粒子 canvas 未创建 ⚠️

**检查**:
```javascript
Particles.spawn('celebrate', { canvas: document.getElementById('canvas') });
```

**可能问题**:
- `canvas` 元素不存在
- 粒子系统未初始化

---

## 🔧 修复方案

### 修复 1: 解决 CSS transform 冲突

**方案 A: 移除 CSS 浮动动画**

```css
.character-sprite {
    position: absolute;
    transition: left 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55),
                top 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    /* 移除 animation: characterFloat */
}
```

**方案 B: 修改 JS 不使用 transform**

```javascript
// 不使用 transform，改用 margin
sprite.style.left = `calc(${x}% - ${sprite.offsetWidth / 2}px)`;
sprite.style.top = `calc(${y}% - ${sprite.offsetHeight / 2}px)`;
// 移除 transform 设置
```

**推荐**: 方案 A - 移除浮动动画，因为它会干扰位置控制

---

### 修复 2: 添加调试日志

**在关键位置添加日志**:

```javascript
// 1. 字幕回调
onSubtitle: (subtitle) => {
    console.log('💬 [RTC] Subtitle received:', subtitle);
    console.log('   Data:', subtitle?.data);
    handleAISubtitle(subtitle);
}

// 2. handleAISubtitle
function handleAISubtitle(subtitle) {
    console.log('📝 [Subtitle] Processing:', {
        hasSubtitle: !!subtitle,
        hasData: !!subtitle?.data,
        dataLength: subtitle?.data?.length
    });
    
    // ... 处理逻辑
}

// 3. 角色移动
function moveCharacterTo(x, y, options = {}) {
    console.log('🚶 [Move] Moving to:', { x, y, options });
    console.log('   Sprite:', document.getElementById('character-sprite'));
    
    // ... 移动逻辑
}

// 4. 肢体动作
console.log('🎭 [Character] Playing animation:', animation);
console.log('   Character object:', window.Character);

// 5. 粒子效果
console.log('✨ [Particles] Spawning:', type);
console.log('   Particles object:', window.Particles);
console.log('   Canvas:', document.getElementById('canvas'));
```

---

### 修复 3: 检查脚本加载顺序

**当前顺序** (index.html):
```html
<script type="module" src="js/auth-client.js"></script>
<script type="module" src="js/characters.js"></script>
<script type="module" src="js/scenes.js"></script>
<script type="module" src="js/conversations.js"></script>
<script type="module" src="js/startvoicechat-client.js"></script>
<script type="module" src="js/particles.js"></script>
<script type="module" src="js/animations.js"></script>
<script type="module" src="js/app.js"></script>
<script type="module" src="js/demo-features.js"></script>
```

**问题**: ✅ 顺序正确，`particles.js` 和 `animations.js` 在 `app.js` 之前

---

### 修复 4: 初始化检查

**在 app.js 开头添加**:

```javascript
// 检查全局对象
console.log('🔍 [Init] Checking global objects:');
console.log('   window.Character:', window.Character);
console.log('   window.Particles:', window.Particles);
console.log('   Character.playRandom:', window.Character?.playRandom);
console.log('   Particles.spawn:', window.Particles?.spawn);
```

---

### 修复 5: 重置 aiSpeakCount

**在 selectCharacter() 中重置**:

```javascript
async function selectCharacter(charId) {
    // ... 原有代码 ...
    
    // 重置计数器
    aiSpeakCount = 0;
    console.log('🔄 [Reset] aiSpeakCount reset to 0');
    
    Memory.load();
    showScreen('scene-select');
}
```

---

## 📋 诊断步骤

### 步骤 1: 打开浏览器控制台

访问应用，按 F12 打开开发者工具

### 步骤 2: 检查全局对象

```javascript
console.log('Character:', window.Character);
console.log('Particles:', window.Particles);
```

### 步骤 3: 选择角色和场景

观察控制台日志：
- 是否有 "Room creation initiated"？
- 是否有 "AI character joined"？
- 是否有欢迎效果日志？

### 步骤 4: AI 开始说话

观察控制台日志：
- 是否有 "Subtitle received"？
- 是否有 "AI spoke #1"？
- 是否有 "Moving character to position"？
- 是否有 "Spawning celebrate particles"？

### 步骤 5: 检查 RTC 连接状态

```javascript
// 在控制台运行
console.log('RTC Status:', rtcStatus);
console.log('Room ID:', currentRoomId);
console.log('AI Task ID:', currentAiTaskId);
```

---

## 🎯 建议的完整修复

### 1. 修改 CSS (style.css)

```css
.character-sprite {
    position: absolute;
    transition: left 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55),
                top 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    /* 移除浮动动画，避免与 transform 冲突 */
}
```

### 2. 添加调试日志 (app.js)

在关键位置添加详细日志（见上文）

### 3. 重置计数器 (app.js)

在 `selectCharacter()` 中重置 `aiSpeakCount`

### 4. 检查粒子画布 (particles.js)

确保粒子画布正确创建和附加

---

## ✅ 总结

### 最可能的问题

1. **CSS transform 冲突** - 浮动动画覆盖了位置设置
2. **字幕回调未持续触发** - RTC 连接问题或火山引擎配置问题
3. **全局对象未定义** - 脚本加载顺序或导出问题

### 优先修复

1. 🔴 **移除 CSS 浮动动画** - 解决位置偏移问题
2. 🟡 **添加详细调试日志** - 定位字幕回调问题
3. 🟡 **检查全局对象** - 确认 Character 和 Particles 可用

---

**分析人**: AI Assistant  
**分析时间**: 2026-03-21
