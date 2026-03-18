// 对话主题库 - 开放式聊天
const conversationTopics = {
    // 破冰话题
    greetings: [
        { text: "Hi there! What's your name?", textCn: "你好呀！你叫什么名字？" },
        { text: "Hello! How are you feeling today?", textCn: "你好！今天感觉怎么样？" },
        { text: "Hey! Did you have a good day?", textCn: "嘿！今天过得开心吗？" }
    ],
    
    // 日常聊天
    daily: [
        { text: "What did you eat today? Anything yummy?", textCn: "今天吃了什么呀？有好吃的吗？" },
        { text: "Did you play with any toys today?", textCn: "今天玩玩具了吗？" },
        { text: "What's your favorite color?", textCn: "你最喜欢什么颜色？" },
        { text: "Do you have any pets? A cat or a dog?", textCn: "你有宠物吗？小猫还是小狗？" },
        { text: "What do you like to do for fun?", textCn: "你平时喜欢玩什么呀？" },
        { text: "Who is your best friend?", textCn: "你最好的朋友是谁呀？" },
        { text: "What's your favorite food?", textCn: "你最喜欢吃什么？" },
        { text: "Do you like to draw? What do you like to draw?", textCn: "你喜欢画画吗？喜欢画什么？" },
        { text: "What did you learn today?", textCn: "今天学到了什么呀？" },
        { text: "Are you tired? Did you take a nap?", textCn: "累不累呀？午睡了没？" }
    ],
    
    // 兴趣爱好
    hobbies: [
        { text: "Tell me about your favorite toy!", textCn: "跟我讲讲你最喜欢的玩具！" },
        { text: "Do you like to sing songs?", textCn: "你喜欢唱歌吗？" },
        { text: "What's your favorite cartoon?", textCn: "你最喜欢什么动画片？" },
        { text: "Do you like to read books?", textCn: "你喜欢看书吗？" },
        { text: "What games do you like to play?", textCn: "你喜欢玩什么游戏？" }
    ],
    
    // 情感关心
    feelings: [
        { text: "You seem happy! What makes you happy?", textCn: "你看起来很开心！什么事让你这么高兴？" },
        { text: "Is something bothering you? You can tell me.", textCn: "有什么不开心的事吗？可以跟我说说。" },
        { text: "I'm proud of you! You're doing great!", textCn: "我为你骄傲！你做得很棒！" },
        { text: "You're so smart! I love talking with you!", textCn: "你真聪明！我喜欢和你聊天！" }
    ],
    
    // 鼓励表达
    encourage: [
        { text: "Can you tell me more about that?", textCn: "能跟我多说说吗？" },
        { text: "That's so interesting! What else?", textCn: "太有趣了！还有呢？" },
        { text: "Wow! I want to hear more!", textCn: "哇！我想听更多！" },
        { text: "You're doing great! Keep talking!", textCn: "你说得真棒！继续说！" }
    ]
};

// 关键词回应规则
const responsePatterns = [
    // 名字相关
    {
        keywords: ['name', 'call me', "i'm", 'my name'],
        responses: [
            "Nice to meet you, {name}! That's a beautiful name!",
            "{name}! I love your name! How old are you?",
            "Hi {name}! I'm so happy to know your name!"
        ],
        memory: 'name'
    },
    
    // 年龄相关
    {
        keywords: ['year', 'old', 'age'],
        responses: [
            "Wow, {age} years old! That's a great age!",
            "{age}! You're growing up so fast!",
            "Amazing! {age} is such a fun age!"
        ],
        memory: 'age'
    },
    
    // 食物相关
    {
        keywords: ['eat', 'food', 'lunch', 'dinner', 'breakfast', 'rice', 'noodle', 'apple', 'banana'],
        responses: [
            "Yummy! I love {food} too!",
            "{food} sounds delicious! Did you like it?",
            "Oh! {food} is so good! What else did you eat?"
        ],
        memory: 'favoriteFood'
    },
    
    // 颜色相关
    {
        keywords: ['color', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'orange'],
        responses: [
            "{color} is such a pretty color!",
            "I love {color} too! It's so beautiful!",
            "{color}! That's my favorite color too!"
        ],
        memory: 'favoriteColor'
    },
    
    // 宠物相关
    {
        keywords: ['pet', 'cat', 'dog', 'fish', 'bird', 'rabbit', 'hamster'],
        responses: [
            "A {pet}! That's so cute! What's its name?",
            "You have a {pet}? I want to see it!",
            "{pet}s are the best! Do you play with it?"
        ],
        memory: 'pet'
    },
    
    // 玩具相关
    {
        keywords: ['toy', 'doll', 'car', 'block', 'ball', 'game'],
        responses: [
            "Tell me more about your {toy}!",
            "A {toy}! That sounds so fun!",
            "I love {toy}s! How do you play with it?"
        ],
        memory: 'favoriteToy'
    },
    
    // 情感表达
    {
        keywords: ['happy', 'sad', 'angry', 'tired', 'excited', 'good', 'great', 'bad'],
        responses: [
            "I'm glad you're {feeling}! Tell me more!",
            "Oh, you're {feeling}? I understand. Want to talk about it?",
            "{feeling}! Thank you for sharing with me!"
        ]
    },
    
    // 肯定回应
    {
        keywords: ['yes', 'yeah', 'yep', 'ok', 'okay', 'sure'],
        responses: [
            "Great! Tell me more!",
            "Awesome! What else?",
            "I'm listening! Go on!"
        ]
    },
    
    // 否定回应
    {
        keywords: ['no', 'nope', "don't", 'not', "can't", "won't"],
        responses: [
            "That's okay! We can talk about something else!",
            "No problem! What do you want to talk about?",
            "I understand! Tell me what you like!"
        ]
    }
];

// 记忆系统
const Memory = {
    data: {
        name: null,
        age: null,
        favoriteColor: null,
        favoriteFood: null,
        favoriteToy: null,
        pet: null,
        lastVisit: null
    },
    
    load() {
        const saved = localStorage.getItem('englishFriendMemory');
        if (saved) {
            this.data = { ...this.data, ...JSON.parse(saved) };
        }
        this.data.lastVisit = new Date().toISOString();
        this.save();
    },
    
    save() {
        localStorage.setItem('englishFriendMemory', JSON.stringify(this.data));
    },
    
    set(key, value) {
        this.data[key] = value;
        this.save();
    },
    
    get(key) {
        return this.data[key];
    },
    
    clear() {
        this.data = { lastVisit: new Date().toISOString() };
        this.save();
    },
    
    hasInfo() {
        return Object.keys(this.data).some(k => k !== 'lastVisit' && this.data[k]);
    }
};

// 理解孩子的话
function understandChildInput(text) {
    const lowerText = text.toLowerCase();
    const matches = [];
    
    responsePatterns.forEach(pattern => {
        pattern.keywords.forEach(keyword => {
            if (lowerText.includes(keyword)) {
                matches.push({
                    pattern: pattern,
                    keyword: keyword,
                    matchText: text
                });
            }
        });
    });
    
    return matches;
}

// 生成回应
function generateResponse(matches, childText) {
    if (matches.length === 0) {
        // 没有匹配，使用通用回应
        const generic = [
            "That's so interesting! Tell me more!",
            "Wow! I love hearing about your day!",
            "You're so good at talking! What else?",
            "I'm listening! Go on!",
            "That's wonderful! Can you say more?"
        ];
        return {
            text: generic[Math.floor(Math.random() * generic.length)],
            memory: null
        };
    }
    
    // 使用第一个匹配的模式
    const match = matches[0];
    const pattern = match.pattern;
    
    // 提取关键信息
    let extractedInfo = childText;
    
    // 生成回应
    const response = pattern.responses[Math.floor(Math.random() * pattern.responses.length)];
    
    // 替换占位符
    let finalResponse = response;
    if (pattern.memory) {
        // 尝试提取具体信息
        const words = childText.split(' ');
        const importantWords = words.filter(w => w.length > 3 && !['this', 'that', 'with', 'have', 'like', 'want', 'play'].includes(w.toLowerCase()));
        const info = importantWords[0] || childText;
        
        finalResponse = response.replace(`{${pattern.memory}}`, info);
        Memory.set(pattern.memory, info);
    }
    
    return {
        text: finalResponse,
        memory: pattern.memory
    };
}

// 获取下一个话题
function getNextTopic() {
    const topicKeys = Object.keys(conversationTopics);
    const randomKey = topicKeys[Math.floor(Math.random() * topicKeys.length)];
    const topics = conversationTopics[randomKey];
    return topics[Math.floor(Math.random() * topics.length)];
}

// 根据记忆生成个性化问候
function getPersonalizedGreeting() {
    const greetings = [];
    
    if (Memory.get('name')) {
        greetings.push(`Hi ${Memory.get('name')}! I missed you!`);
        greetings.push(`Welcome back, ${Memory.get('name')}! How are you?`);
    }
    
    if (Memory.get('favoriteColor')) {
        greetings.push(`Hello! Want to talk about ${Memory.get('favoriteColor')} things?`);
    }
    
    if (Memory.get('pet')) {
        greetings.push(`Hi! How is your ${Memory.get('pet')} today?`);
    }
    
    if (greetings.length > 0) {
        return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    // 没有记忆，用普通问候
    const basicGreetings = conversationTopics.greetings;
    return basicGreetings[Math.floor(Math.random() * basicGreetings.length)];
}

// 生成快速回复选项
function generateQuickReplies() {
    const replies = [
        "I'm good!",
        "I'm happy!",
        "I'm tired.",
        "I played today!",
        "I ate yummy food!",
        "Tell me more!",
        "I love you!",
        "Bye bye!"
    ];
    
    // 随机选 3-4 个
    const shuffled = replies.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
}
