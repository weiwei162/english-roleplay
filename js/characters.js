// 角色数据
const characters = {
    emma: {
        name: 'Miss Emma',
        avatar: '👩‍🏫',
        description: '温柔的老师',
        voice: 'female',
        personality: 'gentle',
        traits: ['patient', 'caring', 'encouraging'],
        greetingStyle: 'warm'
    },
    tommy: {
        name: 'Tommy',
        avatar: '👦',
        description: '你的好朋友',
        voice: 'child',
        personality: 'friendly',
        traits: ['playful', 'curious', 'energetic'],
        greetingStyle: 'casual'
    },
    lily: {
        name: 'Lily',
        avatar: '👧',
        description: '活泼的姐姐',
        voice: 'female',
        personality: 'energetic',
        traits: ['enthusiastic', 'supportive', 'fun'],
        greetingStyle: 'excited'
    },
    mike: {
        name: 'Coach Mike',
        avatar: '👨‍🦱',
        description: '运动教练',
        voice: 'male',
        personality: 'energetic',
        traits: ['motivational', 'positive', 'strong'],
        greetingStyle: 'enthusiastic'
    },
    rose: {
        name: 'Grandma Rose',
        avatar: '👵',
        description: '慈祥的奶奶',
        voice: 'elderly',
        personality: 'warm',
        traits: ['loving', 'wise', 'gentle'],
        greetingStyle: 'affectionate'
    }
};

// 获取角色信息
function getCharacter(charId) {
    return characters[charId] || characters.emma;
}

// 获取所有角色列表
function getAllCharacters() {
    return Object.keys(characters).map(key => ({
        id: key,
        ...characters[key]
    }));
}
