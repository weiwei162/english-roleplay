# English Roleplay - 角色音色配置检查报告

**检查日期**: 2026-03-21  
**音色来源**: 豆包语音合成模型 1.0 官方文档

---

## 📊 当前角色配置

### 项目中的角色

| 角色 ID | 名称 | 描述 | 当前音色 (component) | 当前音色 (S2S) |
|--------|------|------|---------------------|---------------|
| emma | Miss Emma | 温柔的老师 | zh_female_linjianvhai_moon_bigtts | zh_female_vv_jupiter_bigtts |
| tommy | Tommy | 5 岁小男孩 | zh_male_xiaotian_jupiter_bigtts | zh_male_xiaotian_jupiter_bigtts |
| lily | Lily | 7 岁活泼姐姐 | zh_female_linjianvhai_moon_bigtts | zh_female_vv_jupiter_bigtts |
| mike | Coach Mike | 运动教练 | zh_male_yunzhou_jupiter_bigtts | zh_male_yunzhou_jupiter_bigtts |
| rose | Grandma Rose | 慈祥的奶奶 | zh_female_linjianvhai_moon_bigtts | zh_female_vv_jupiter_bigtts |

---

## ✅ 音色验证结果

### 分组件模式 (volcano_bidirection)

| 角色 | 当前音色 | 官方列表验证 | 状态 | 建议 |
|------|---------|-------------|------|------|
| emma | zh_female_linjianvhai_moon_bigtts | ✅ 邻家女孩 | ✅ | 保持 |
| tommy | zh_male_xiaotian_jupiter_bigtts | ❌ 不在列表 | ⚠️ | 需替换 |
| lily | zh_female_linjianvhai_moon_bigtts | ✅ 邻家女孩 | ✅ | 保持 |
| mike | zh_male_yunzhou_jupiter_bigtts | ❌ 不在列表 | ⚠️ | 需替换 |
| rose | zh_female_linjianvhai_moon_bigtts | ✅ 邻家女孩 | ✅ | 保持 |

### 端到端模式 (S2S)

| 角色 | 当前音色 | 官方列表验证 | 状态 | 建议 |
|------|---------|-------------|------|------|
| emma | zh_female_vv_jupiter_bigtts | ✅ vv | ✅ | 保持 |
| tommy | zh_male_xiaotian_jupiter_bigtts | ✅ 小甜 | ✅ | 保持 |
| lily | zh_female_vv_jupiter_bigtts | ✅ vv | ✅ | 保持 |
| mike | zh_male_yunzhou_jupiter_bigtts | ✅ 云舟 | ✅ | 保持 |
| rose | zh_female_vv_jupiter_bigtts | ✅ vv | ✅ | 保持 |

---

## ⚠️ 发现的问题

### 问题 1: 分组件模式音色引用错误

**tommy** 和 **mike** 的分组件模式音色使用了 S2S 专用音色：
- `zh_male_xiaotian_jupiter_bigtts` (小甜) - 这是 S2S 端到端音色
- `zh_male_yunzhou_jupiter_bigtts` (云舟) - 这是 S2S 端到端音色

**问题**: 这些音色在分组件模式 (`volcano_bidirection`) 下可能不可用！

**建议修复**:

| 角色 | 当前音色 | 建议替换为 | 说明 |
|------|---------|-----------|------|
| tommy | zh_male_xiaotian_jupiter_bigtts | zh_male_linjiananhai_moon_bigtts | 邻家男孩 (童声) |
| mike | zh_male_yunzhou_jupiter_bigtts | zh_male_yangguangqingnian_moon_bigtts | 阳光青年 (活力男声) |

---

## 🎯 推荐音色配置

### 角色适配分析

#### 1. Miss Emma (温柔女老师)
**当前配置**: ✅ 正确
- 分组件：`zh_female_linjianvhai_moon_bigtts` (邻家女孩)
- S2S: `zh_female_vv_jupiter_bigtts` (vv)

**特点**: 温柔、亲切、有耐心

**备选音色**:
- `zh_female_qinqienvsheng_moon_bigtts` (亲切女声)
- `zh_female_zhixingnvsheng_mars_bigtts` (知性女声)

---

#### 2. Tommy (5 岁小男孩)
**当前配置**: ⚠️ 需修复
- 分组件：`zh_male_xiaotian_jupiter_bigtts` ❌ → 建议 `zh_male_linjiananhai_moon_bigtts`
- S2S: `zh_male_xiaotian_jupiter_bigtts` ✅ (小甜)

**特点**: 活泼、可爱、童真

**推荐音色**:
| 音色 | voice_type | 模式 | 说明 |
|------|-----------|------|------|
| 邻家男孩 | zh_male_linjiananhai_moon_bigtts | 分组件 | 少年音 |
| 小甜 | zh_male_xiaotian_jupiter_bigtts | S2S | 小男孩音 |

---

#### 3. Lily (7 岁活泼姐姐)
**当前配置**: ✅ 正确
- 分组件：`zh_female_linjianvhai_moon_bigtts` (邻家女孩)
- S2S: `zh_female_vv_jupiter_bigtts` (vv)

**特点**: 活泼、开朗、有活力

**备选音色**:
- `zh_female_kailangjiejie_moon_bigtts` (开朗姐姐)
- `zh_female_tianmeitaozi_mars_bigtts` (甜美桃子)

---

#### 4. Coach Mike (运动教练)
**当前配置**: ⚠️ 需修复
- 分组件：`zh_male_yunzhou_jupiter_bigtts` ❌ → 建议 `zh_male_yangguangqingnian_moon_bigtts`
- S2S: `zh_male_yunzhou_jupiter_bigtts` ✅ (云舟)

**特点**: 阳光、活力、激励人心

**推荐音色**:
| 音色 | voice_type | 模式 | 说明 |
|------|-----------|------|------|
| 阳光青年 | zh_male_yangguangqingnian_moon_bigtts | 分组件 | 活力男声 |
| 云舟 | zh_male_yunzhou_jupiter_bigtts | S2S | 沉稳男声 |
| 解说小明 | zh_male_jieshuoxiaoming_moon_bigtts | 分组件备选 | 激情解说 |

---

#### 5. Grandma Rose (慈祥的奶奶)
**当前配置**: ✅ 正确
- 分组件：`zh_female_linjianvhai_moon_bigtts` (邻家女孩)
- S2S: `zh_female_vv_jupiter_bigtts` (vv)

**特点**: 慈祥、温和、有智慧

**推荐音色**:
| 音色 | voice_type | 模式 | 说明 |
|------|-----------|------|------|
| 邻家女孩 | zh_female_linjianvhai_moon_bigtts | 分组件 | 温柔女声 |
| 知心姐姐 | zh_female_wenyinvsheng_v1_tob | 分组件备选 | 知性温暖 |
| vv | zh_female_vv_jupiter_bigtts | S2S | 通用女声 |

---

## 🔧 代码修复建议

### 修复 volc-start-voicechat.js 中的音色配置

```javascript
const TTS_VOICE_CONFIGS = {
    // 分组件模式音色映射 (ttsVoiceType + ttsResourceId)
    component: {
        emma: {
            voiceType: 'zh_female_linjianvhai_moon_bigtts',  // ✅ 邻家女孩
            resourceId: 'volc.service_type.10029'
        },
        tommy: {
            voiceType: 'zh_male_linjiananhai_moon_bigtts',   // ⚠️ 修复：邻家男孩
            resourceId: 'volc.service_type.10029'
        },
        lily: {
            voiceType: 'zh_female_linjianvhai_moon_bigtts',  // ✅ 邻家女孩
            resourceId: 'volc.service_type.10029'
        },
        mike: {
            voiceType: 'zh_male_yangguangqingnian_moon_bigtts', // ⚠️ 修复：阳光青年
            resourceId: 'volc.service_type.10029'
        },
        rose: {
            voiceType: 'zh_female_linjianvhai_moon_bigtts',   // ✅ 邻家女孩
            resourceId: 'volc.service_type.10029'
        }
    },
    // 端到端模式音色映射 (s2sSpeaker)
    s2s: {
        emma: 'zh_female_vv_jupiter_bigtts',        // ✅ vv
        tommy: 'zh_male_xiaotian_jupiter_bigtts',   // ✅ 小甜
        lily: 'zh_female_vv_jupiter_bigtts',        // ✅ vv
        mike: 'zh_male_yunzhou_jupiter_bigtts',     // ✅ 云舟
        rose: 'zh_female_vv_jupiter_bigtts'         // ✅ vv
    }
};
```

---

## 📋 待办事项

- [ ] 修复 `tommy` 的分组件音色为 `zh_male_linjiananhai_moon_bigtts`
- [ ] 修复 `mike` 的分组件音色为 `zh_male_yangguangqingnian_moon_bigtts`
- [ ] 添加音色常量定义（参考 volcengine_voicechat 项目）
- [ ] 添加角色预设类（RolePreset）
- [ ] 更新 README 音色文档
- [ ] 测试修复后的音色效果

---

## 📊 总体评价

| 维度 | 评分 | 说明 |
|------|------|------|
| S2S 模式音色配置 | ⭐⭐⭐⭐⭐ | 全部正确 |
| 分组件模式音色配置 | ⭐⭐⭐☆☆ | 2 个角色需修复 |
| 角色人设匹配度 | ⭐⭐⭐⭐☆ | 整体匹配良好 |
| 文档完整性 | ⭐⭐⭐☆☆ | 需补充音色参考 |

**综合评分**: ⭐⭐⭐⭐☆ (4.0/5.0)

---

## 结论

S2S 模式音色配置完全正确，分组件模式有 2 个角色使用了 S2S 专用音色，需要修复为分组件模式兼容的音色。

建议修复后进行全面测试，确保各角色音色符合人设定位。
