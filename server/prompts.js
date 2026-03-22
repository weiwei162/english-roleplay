/**
 * 场景提示词和词汇表
 * 为不同场景提供定制化的 AI 提示词和相关词汇
 */

const scenePrompts = {
    zoo: {
        name: '魔法动物园',
        // 系统提示词模板
        systemPrompt: `You are teaching English to a 5-year-old Chinese child at a magic zoo. 
Focus on:
- Animal names and sounds (lion says ROAR, elephant says TRUMPET)
- Animal features (big, small, tall, long nose, stripes)
- Colors and sizes
- Simple questions: "What's this?", "Can you say...?", "Do you like...?"
- Encourage imitation: "Can you roar like a lion?"
- Use emojis and be very encouraging
- Keep sentences short (5-8 words)
- Repeat key words 2-3 times`,
        
        // 场景词汇表
        vocabulary: [
            { word: 'lion', cn: '狮子', sound: 'ROAR' },
            { word: 'elephant', cn: '大象', sound: 'TRUMPET' },
            { word: 'giraffe', cn: '长颈鹿', feature: 'tall, long neck' },
            { word: 'monkey', cn: '猴子', sound: 'OOH OOH AH AH' },
            { word: 'zebra', cn: '斑马', feature: 'black and white stripes' },
            { word: 'big', cn: '大的' },
            { word: 'small', cn: '小的' },
            { word: 'tall', cn: '高的' },
            { word: 'long', cn: '长的' },
            { word: 'animal', cn: '动物' }
        ],
        
        // 对话模式
        patterns: [
            "What's this? It's a {animal}!",
            "The {animal} says {sound}!",
            "Can you say {word}?",
            "Look at the {feature} {animal}!",
            "Do you like {animal}s?",
            "The {animal} is {size}!"
        ],
        
        // 欢迎词
        welcomeMessage: "欢迎来到魔法动物园！What animal do you want to see?"
    },
    
    market: {
        name: '欢乐超市',
        systemPrompt: `You are teaching English to a 5-year-old Chinese child at a supermarket.
Focus on:
- Food names (fruits, vegetables, drinks)
- Colors and shapes (red apple, yellow banana, round orange)
- Taste descriptions (sweet, yummy, crunchy)
- Shopping phrases: "What do you like?", "Let's buy...", "Do you want...?"
- Healthy eating habits
- Use emojis and be enthusiastic
- Keep sentences short (5-8 words)
- Repeat key words 2-3 times`,
        
        vocabulary: [
            { word: 'apple', cn: '苹果', color: 'red', taste: 'sweet' },
            { word: 'banana', cn: '香蕉', color: 'yellow', taste: 'soft and sweet' },
            { word: 'carrot', cn: '胡萝卜', color: 'orange', taste: 'crunchy' },
            { word: 'milk', cn: '牛奶', type: 'drink' },
            { word: 'orange', cn: '橙子', color: 'orange', shape: 'round' },
            { word: 'grape', cn: '葡萄', color: 'purple', taste: 'sweet' },
            { word: 'bread', cn: '面包', type: 'food' },
            { word: 'egg', cn: '鸡蛋', type: 'food' },
            { word: 'sweet', cn: '甜的' },
            { word: 'yummy', cn: '好吃的' }
        ],
        
        patterns: [
            "What fruit do you like?",
            "The {food} is {color}!",
            "Do you want some {food}?",
            "{food} is {taste}!",
            "Let's buy some {food}!",
            "What do you want to eat?"
        ],
        
        welcomeMessage: "欢迎来到欢乐超市！What food do you like?"
    },
    
    home: {
        name: '温馨小家',
        systemPrompt: `You are teaching English to a 5-year-old Chinese child at home.
Focus on:
- Daily routines (morning greeting, breakfast, cleaning, playtime)
- Family members and home objects
- Time concepts (morning, afternoon, night)
- Polite phrases: "Good morning", "Thank you", "Please", "Good night"
- Helping at home: "Can you help me...?"
- Feelings: "How do you feel?", "I'm happy/sleepy/hungry"
- Use warm and caring tone
- Keep sentences short (5-8 words)`,
        
        vocabulary: [
            { word: 'good morning', cn: '早上好' },
            { word: 'breakfast', cn: '早餐' },
            { word: 'bed', cn: '床' },
            { word: 'toy', cn: '玩具' },
            { word: 'clean', cn: '打扫' },
            { word: 'happy', cn: '开心' },
            { word: 'sleepy', cn: '困的' },
            { word: 'hungry', cn: '饿的' },
            { word: 'thank you', cn: '谢谢' },
            { word: 'please', cn: '请' }
        ],
        
        patterns: [
            "Good morning! How did you sleep?",
            "What's for breakfast?",
            "Let's clean up together!",
            "What's your favorite toy?",
            "Are you happy today?",
            "Can you help me...?"
        ],
        
        welcomeMessage: "欢迎来到我的家！What do you want to play?"
    },
    
    park: {
        name: '快乐公园',
        systemPrompt: `You are teaching English to a 5-year-old Chinese child at a park.
Focus on:
- Nature elements (sun, flowers, trees, sky)
- Weather (sunny, cloudy, windy)
- Outdoor activities (jump, run, play, look)
- Colors in nature (green grass, red flowers, blue sky)
- Insects and birds (butterfly, bird, frog)
- Action verbs: "Can you jump?", "Let's run!", "Look up!"
- Use energetic and excited tone
- Keep sentences short (5-8 words)`,
        
        vocabulary: [
            { word: 'sun', cn: '太阳', color: 'yellow' },
            { word: 'flower', cn: '花', color: 'colorful' },
            { word: 'tree', cn: '树', color: 'green' },
            { word: 'butterfly', cn: '蝴蝶', action: 'fly' },
            { word: 'frog', cn: '青蛙', sound: 'RIBBIT' },
            { word: 'bird', cn: '鸟', action: 'sing' },
            { word: 'jump', cn: '跳' },
            { word: 'run', cn: '跑' },
            { word: 'sunny', cn: '晴天' },
            { word: 'beautiful', cn: '美丽的' }
        ],
        
        patterns: [
            "What a beautiful day!",
            "Look at the {object}!",
            "Can you jump like a {animal}?",
            "What color is the {object}?",
            "Let's play outside!",
            "Do you see the {animal}?"
        ],
        
        welcomeMessage: "今天天气真好！What do you want to play?"
    }
};

/**
 * 获取场景提示词配置
 * @param {string} sceneId - 场景 ID (zoo, market, home, park)
 * @returns {Object} 场景配置
 */
function getScenePrompt(sceneId) {
    return scenePrompts[sceneId] || scenePrompts.zoo;
}

/**
 * 获取场景词汇表
 * @param {string} sceneId - 场景 ID
 * @returns {Array} 词汇列表
 */
function getSceneVocabulary(sceneId) {
    const scene = scenePrompts[sceneId] || scenePrompts.zoo;
    return scene.vocabulary;
}

/**
 * 组合角色和场景提示词
 * @param {Object} characterConfig - 角色配置
 * @param {string} sceneId - 场景 ID
 * @returns {Object} 组合后的配置
 */
function combineCharacterAndScenePrompt(characterConfig, sceneId) {
    const scenePrompt = getScenePrompt(sceneId);
    
    // 组合系统提示词
    const combinedSystemPrompt = `${characterConfig.systemPrompt}

Current scene: ${scenePrompt.name}
${scenePrompt.systemPrompt}`;
    
    // 组合系统角色
    const combinedSystemRole = `${characterConfig.systemRole} You are at ${scenePrompt.name}.`;
    
    return {
        ...characterConfig,
        systemPrompt: combinedSystemPrompt,
        systemRole: combinedSystemRole,
        vocabulary: scenePrompt.vocabulary,
        patterns: scenePrompt.patterns,
        welcomeMessage: scenePrompt.welcomeMessage
    };
}

export {
    scenePrompts,
    getScenePrompt,
    getSceneVocabulary,
    combineCharacterAndScenePrompt
};
