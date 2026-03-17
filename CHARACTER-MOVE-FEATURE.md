# 角色动态移动功能

## 功能说明

角色现在可以根据 AI 对话内容动态移动到场景中的不同位置，增强互动体验。

## 实现原理

### 1. 火山引擎字幕回调

通过火山引擎 StartVoiceChat API 的 `SubtitleConfig` 配置，开启客户端字幕回调：

```javascript
SubtitleConfig: {
    DisableRTSSubtitle: false,  // 开启字幕
    SubtitleMode: 1  // 1=LLM 原始回复（更快）
}
```

### 2. RTC 二进制消息解析

RTC SDK 通过 `onRoomBinaryMessageReceived` 回调发送字幕数据（二进制格式）：

- **Magic number**: "subv" (4 bytes)
- **Length**: 数据长度 (4 bytes, 大端序)
- **Content**: JSON 字符串 (UTF-8 编码)

### 3. 字幕数据格式

```json
{
  "type": "subtitle",
  "data": [{
    "text": "Welcome to the zoo!",
    "language": "en",
    "userId": "ai_xxx",
    "sequence": 1,
    "definite": true,
    "paragraph": true,
    "roundId": 1
  }]
}
```

**关键字段**：
- `paragraph: true` - 表示完整的一句话结束
- `definite: true` - 表示分句结束
- `userId` - AI 的 userId 以 `ai_` 开头

## 文件修改清单

### 1. 后端配置 (`server/volc-start-voicechat.js`)

**分组件模式** - 添加 SubtitleConfig：
```javascript
function getComponentConfig(options = {}) {
    return {
        ASRConfig: { ... },
        LLMConfig: { ... },
        TTSConfig: { ... },
        // 新增
        SubtitleConfig: {
            DisableRTSSubtitle: false,
            SubtitleMode: 1
        }
    };
}
```

**端到端模式** - 添加 SubtitleConfig：
```javascript
function getS2SConfig(options = {}) {
    return {
        Provider: 'volcano',
        ProviderParams: { ... },
        // 新增
        SubtitleConfig: {
            DisableRTSSubtitle: false,
            SubtitleMode: 1
        }
    };
}
```

### 2. 前端 RTC 客户端 (`js/startvoicechat-client.js`)

**添加字幕回调**：
```javascript
this.onSubtitle = options.onSubtitle || (() => {});
```

**监听二进制消息**：
```javascript
this.engine.on('onRoomBinaryMessageReceived', (e) => {
    const subtitle = this.parseSubtitle(e.message || e.data);
    if (subtitle) {
        this.onSubtitle?.(subtitle);
    }
});
```

**解析字幕数据**：
```javascript
parseSubtitle(data) {
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    
    // 检查 magic number "subv"
    const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (magic !== 'subv') return null;
    
    // 读取长度（大端序）
    const length = (bytes[4] << 24) | (bytes[5] << 16) | (bytes[6] << 8) | bytes[7];
    
    // 提取 JSON 字符串
    const jsonBytes = bytes.slice(8);
    const jsonString = new TextDecoder('utf-8').decode(jsonBytes);
    
    return JSON.parse(jsonString);
}
```

### 3. 场景数据 (`js/scenes.js`)

为每个对话添加 `characterPosition`：

```javascript
zoo: {
    dialogues: [
        {
            text: "Welcome to the zoo! Look, what's this?",
            characterPosition: { x: 30, y: 60 },  // 角色站在左边
            media: {
                type: 'emoji',
                content: '🦁',
                position: { top: '30%', left: '60%' }  // 狮子在右边
            }
        },
        {
            text: "Do you want to see more animals?",
            characterPosition: { x: 70, y: 60 },  // 角色走到右边
            media: {
                type: 'emoji',
                content: '🐘',
                position: { top: '40%', left: '20%' }  // 大象在左边
            }
        }
    ]
}
```

### 4. 应用逻辑 (`js/app.js`)

**订阅字幕事件**：
```javascript
await createStartVoiceChatRoom(currentRoomId, {
    onSubtitle: (subtitle) => {
        handleAISubtitle(subtitle);
    }
});
```

**处理字幕并移动角色**：
```javascript
function handleAISubtitle(subtitle) {
    for (const item of subtitle.data) {
        const { text, userId, paragraph, definite } = item;
        
        // 只处理 AI 的字幕
        if (!userId?.startsWith('ai_')) continue;
        
        // 当 AI 说完完整一句话时
        if (paragraph && definite) {
            // 查找匹配的对话
            const dialogueIndex = currentScene.dialogues.findIndex(d => 
                d.text && text.includes(d.text.substring(0, 15))
            );
            
            if (dialogueIndex >= 0) {
                const dialogue = currentScene.dialogues[dialogueIndex];
                
                // 移动角色到指定位置
                if (dialogue.characterPosition) {
                    moveCharacterTo(
                        dialogue.characterPosition.x,
                        dialogue.characterPosition.y,
                        { jump: true }
                    );
                }
                
                // 显示媒体内容
                if (dialogue.media) {
                    showMediaContent(dialogue.media);
                }
            }
        }
    }
}
```

## 使用示例

### 动物园场景

1. AI 说 "Welcome to the zoo!" → 角色移动到左边 (x:30) → 狮子显示在右边 (left:60%)
2. AI 说 "Do you want to see more animals?" → 角色移动到右边 (x:70) → 大象显示在左边 (left:20%)
3. AI 说 "Look at the tall animal!" → 角色移动到左边 (x:25) → 长颈鹿显示在右上 (left:70%)

### 添加新场景

```javascript
park: {
    dialogues: [
        {
            text: "What a beautiful day!",
            characterPosition: { x: 40, y: 65 },  // 自定义位置
            media: {
                type: 'emoji',
                content: '☀️',
                position: { top: '10%', left: '75%' }
            }
        }
    ]
}
```

## 位置坐标说明

- `x`: 水平位置百分比 (0-100)，50 为中心
- `y`: 垂直位置百分比 (0-100)，60 为地面位置

**推荐位置**：
- 左边：x: 20-35
- 中间：x: 45-55
- 右边：x: 65-80

## 调试技巧

1. **检查字幕是否开启**：
   ```javascript
   console.log('Subtitle received:', subtitle);
   ```

2. **验证角色移动**：
   ```javascript
   console.log('Moving character to:', dialogue.characterPosition);
   ```

3. **测试匹配逻辑**：
   在浏览器控制台查看匹配到的对话索引

## 注意事项

1. **SubtitleMode 选择**：
   - `0`: 对齐 TTS 音频（精准但慢）
   - `1`: LLM 原始回复（快，推荐）

2. **性能优化**：
   - 使用 `lastSubtitleText` 避免重复处理
   - 只在 `paragraph && definite` 时触发移动

3. **兼容性**：
   - 确保 RTC SDK 版本支持 `onRoomBinaryMessageReceived`
   - 端到端大模型必须使用 `SubtitleMode: 1`

## 扩展功能

### 添加更多动作

```javascript
moveCharacterTo(x, y, {
    jump: true,      // 跳跃
    wave: true,      // 挥手
    pointLeft: true, // 指向左边
    excited: true    // 兴奋
});
```

### 根据情绪改变位置

```javascript
if (text.includes('happy') || text.includes('great')) {
    moveCharacterTo(50, 60, { jump: true, excited: true });
}
```

### 添加路径动画

```javascript
// 多点路径移动
const path = [{x:30, y:60}, {x:50, y:60}, {x:70, y:60}];
path.forEach((pos, i) => {
    setTimeout(() => moveCharacterTo(pos.x, pos.y), i * 500);
});
```
