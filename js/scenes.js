// 场景数据 - 包含对话和可显示的媒体内容
const scenes = {
    zoo: {
        name: '魔法动物园',
        nameEn: 'Magic Zoo',
        icon: '🦁',
        bgGradient: 'linear-gradient(135deg, #a8e6cf 0%, #dcedc1 100%)',
        bgImage: '🌳🦒🦓🌴',
        dialogues: [
            {
                text: "Welcome to the zoo! Look, what's this?",
                textCn: "欢迎来到动物园！看，这是什么？",
                media: {
                    type: 'emoji',
                    content: '🦁',
                    label: 'Lion',
                    position: { top: '30%', left: '60%' },
                    size: 'large'
                },
                followUps: [
                    { text: "It's a LION! Can you say LION?", textCn: "这是狮子！你能说 LION 吗？" },
                    { text: "The lion says ROAR! Can you roar?", textCn: "狮子说 ROAR！你能吼一声吗？" }
                ]
            },
            {
                text: "Do you want to see more animals?",
                textCn: "想看更多动物吗？",
                media: {
                    type: 'emoji',
                    content: '🐘',
                    label: 'Elephant',
                    position: { top: '40%', left: '20%' },
                    size: 'large'
                },
                followUps: [
                    { text: "This is an ELEPHANT! Big and gray!", textCn: "这是大象！又大又灰！" },
                    { text: "The elephant has a long nose!", textCn: "大象有长长的鼻子！" }
                ]
            },
            {
                text: "Look at the tall animal!",
                textCn: "看那个高高的动物！",
                media: {
                    type: 'emoji',
                    content: '🦒',
                    label: 'Giraffe',
                    position: { top: '20%', left: '70%' },
                    size: 'large'
                },
                followUps: [
                    { text: "It's a GIRAFFE! So tall!", textCn: "这是长颈鹿！好高啊！" },
                    { text: "The giraffe eats leaves from trees!", textCn: "长颈鹿吃树上的叶子！" }
                ]
            },
            {
                text: "Who says OOH OOH AH AH?",
                textCn: "谁在说 OOH OOH AH AH？",
                media: {
                    type: 'emoji',
                    content: '🐵',
                    label: 'Monkey',
                    position: { top: '35%', left: '50%' },
                    size: 'medium'
                },
                followUps: [
                    { text: "It's a MONKEY! Funny monkey!", textCn: "是猴子！有趣的猴子！" },
                    { text: "Monkeys love bananas! Do you?", textCn: "猴子喜欢香蕉！你喜欢吗？" }
                ]
            },
            {
                text: "What about this black and white animal?",
                textCn: "这个黑白相间的动物呢？",
                media: {
                    type: 'emoji',
                    content: '🦓',
                    label: 'Zebra',
                    position: { top: '45%', left: '30%' },
                    size: 'medium'
                },
                followUps: [
                    { text: "It's a ZEBRA! Look at the stripes!", textCn: "这是斑马！看那些条纹！" },
                    { text: "Zebras are like horses with stripes!", textCn: "斑马像穿条纹衣服的马！" }
                ]
            }
        ]
    },
    market: {
        name: '欢乐超市',
        nameEn: 'Super Market',
        icon: '🛒',
        bgGradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        bgImage: '🛒🏪🛍️',
        dialogues: [
            {
                text: "Let's go shopping! What fruit do you like?",
                textCn: "我们去购物吧！你喜欢什么水果？",
                media: {
                    type: 'emoji',
                    content: '🍎',
                    label: 'Apple',
                    position: { top: '35%', left: '25%' },
                    size: 'medium'
                },
                followUps: [
                    { text: "Apples are red and yummy!", textCn: "苹果红红的，很好吃！" },
                    { text: "An apple a day keeps the doctor away!", textCn: "一天一苹果，医生远离我！" }
                ]
            },
            {
                text: "What's this yellow fruit?",
                textCn: "这个黄色的水果是什么？",
                media: {
                    type: 'emoji',
                    content: '🍌',
                    label: 'Banana',
                    position: { top: '40%', left: '50%' },
                    size: 'medium'
                },
                followUps: [
                    { text: "Yes! BANANA! Monkeys love it!", textCn: "对！香蕉！猴子很喜欢！" },
                    { text: "Bananas are sweet and soft!", textCn: "香蕉又甜又软！" }
                ]
            },
            {
                text: "Do you like vegetables?",
                textCn: "你喜欢蔬菜吗？",
                media: {
                    type: 'emoji',
                    content: '🥕',
                    label: 'Carrot',
                    position: { top: '45%', left: '35%' },
                    size: 'medium'
                },
                followUps: [
                    { text: "Carrots are good for your eyes!", textCn: "胡萝卜对眼睛好！" },
                    { text: "Rabbits love carrots!", textCn: "兔子很喜欢胡萝卜！" }
                ]
            },
            {
                text: "What do you want to drink?",
                textCn: "你想喝什么？",
                media: {
                    type: 'emoji',
                    content: '🥛',
                    label: 'Milk',
                    position: { top: '38%', left: '60%' },
                    size: 'medium'
                },
                followUps: [
                    { text: "Milk makes you strong!", textCn: "牛奶让你强壮！" },
                    { text: "Do you drink milk every day?", textCn: "你每天都喝牛奶吗？" }
                ]
            }
        ]
    },
    home: {
        name: '温馨小家',
        nameEn: 'My Home',
        icon: '🏠',
        bgGradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        bgImage: '🏠🛋️🪑',
        dialogues: [
            {
                text: "Good morning! How did you sleep?",
                textCn: "早上好！睡得好吗？",
                media: {
                    type: 'emoji',
                    content: '☀️',
                    label: 'Morning',
                    position: { top: '15%', left: '80%' },
                    size: 'medium'
                },
                followUps: [
                    { text: "I hope you had a good dream!", textCn: "希望你做了个好梦！" },
                    { text: "Let's start a happy day!", textCn: "让我们开始快乐的一天！" }
                ]
            },
            {
                text: "What's for breakfast?",
                textCn: "早餐吃什么？",
                media: {
                    type: 'emoji',
                    content: '🍳',
                    label: 'Breakfast',
                    position: { top: '40%', left: '40%' },
                    size: 'medium'
                },
                followUps: [
                    { text: "I can cook eggs! Do you like eggs?", textCn: "我会煎蛋！你喜欢鸡蛋吗？" },
                    { text: "Breakfast is the most important meal!", textCn: "早餐最重要！" }
                ]
            },
            {
                text: "Let's clean up the room!",
                textCn: "我们收拾房间吧！",
                media: {
                    type: 'emoji',
                    content: '🧹',
                    label: 'Clean',
                    position: { top: '50%', left: '60%' },
                    size: 'medium'
                },
                followUps: [
                    { text: "A clean room makes us happy!", textCn: "干净的房间让我们开心！" },
                    { text: "Can you help me clean?", textCn: "你能帮我收拾吗？" }
                ]
            },
            {
                text: "Time to play! What's your favorite toy?",
                textCn: "玩的时间到了！你最喜欢的玩具是什么？",
                media: {
                    type: 'emoji',
                    content: '🧸',
                    label: 'Toy',
                    position: { top: '45%', left: '30%' },
                    size: 'medium'
                },
                followUps: [
                    { text: "Tell me about your toys!", textCn: "跟我讲讲你的玩具！" },
                    { text: "Do you have a teddy bear?", textCn: "你有泰迪熊吗？" }
                ]
            }
        ]
    },
    park: {
        name: '快乐公园',
        nameEn: 'Happy Park',
        icon: '🌳',
        bgGradient: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
        bgImage: '🌳🌸☀️',
        dialogues: [
            {
                text: "What a beautiful day! Let's play outside!",
                textCn: "多好的一天！我们去外面玩吧！",
                media: {
                    type: 'emoji',
                    content: '☀️',
                    label: 'Sunny Day',
                    position: { top: '10%', left: '75%' },
                    size: 'medium'
                },
                followUps: [
                    { text: "The sun is shining!", textCn: "阳光灿烂！" },
                    { text: "Do you like sunny days?", textCn: "你喜欢晴天吗？" }
                ]
            },
            {
                text: "Look at the beautiful flowers!",
                textCn: "看那些漂亮的花！",
                media: {
                    type: 'emoji',
                    content: '🌸',
                    label: 'Flowers',
                    position: { top: '50%', left: '25%' },
                    size: 'medium'
                },
                followUps: [
                    { text: "What color are the flowers?", textCn: "花是什么颜色？" },
                    { text: "Flowers smell so good!", textCn: "花好香啊！" }
                ]
            },
            {
                text: "Can you jump like a frog?",
                textCn: "你能像青蛙一样跳吗？",
                media: {
                    type: 'emoji',
                    content: '🐸',
                    label: 'Frog',
                    position: { top: '55%', left: '55%' },
                    size: 'medium'
                },
                followUps: [
                    { text: "Frogs say RIBBIT! Can you say it?", textCn: "青蛙说 RIBBIT！你能说吗？" },
                    { text: "Let's jump together!", textCn: "我们一起跳！" }
                ]
            },
            {
                text: "Look up! What do you see in the sky?",
                textCn: "抬头看！天空里有什么？",
                media: {
                    type: 'emoji',
                    content: '🦋',
                    label: 'Butterfly',
                    position: { top: '25%', left: '45%' },
                    size: 'medium'
                },
                followUps: [
                    { text: "It's a butterfly! So colorful!", textCn: "是蝴蝶！好多彩！" },
                    { text: "Butterflies used to be caterpillars!", textCn: "蝴蝶以前是毛毛虫！" }
                ]
            }
        ]
    }
};

// 获取场景信息
function getScene(sceneId) {
    const scene = scenes[sceneId] || scenes.zoo;
    // 添加 id 字段
    return {
        ...scene,
        id: sceneId
    };
}

// 获取所有场景列表
function getAllScenes() {
    return Object.keys(scenes).map(key => ({
        id: key,
        ...scenes[key]
    }));
}
