# 🌋 火山云 API 配置完整指南

**更新日期：** 2026-03-13  
**目标：** 获取所有必需的 API 凭证并配置

---

## 📋 需要的凭证清单

| 服务 | 用途 | 获取难度 | 费用 |
|------|------|----------|------|
| RTC AppID + AppKey | 实时音视频通信 | ⭐ 简单 | 免费额度 + 按量 |
| 豆包 API Key | AI 对话生成 | ⭐⭐ 中等 | 免费额度 + 按量 |
| ASR API Key | 语音识别 | ⭐⭐ 中等 | 免费额度 + 按量 |
| 数字人 API | 数字人视频生成 | ⭐⭐⭐ 较复杂 | 按分钟计费 |

---

## 🔑 1. 火山云 RTC 配置

### 步骤 1：注册火山引擎账号

1. 访问：https://www.volcengine.com/
2. 点击右上角"注册"
3. 使用手机号或邮箱注册
4. 完成实名认证（需要身份证）

> 💡 **提示：** 企业账号审核更快，个人账号也可以

---

### 步骤 2：开通 RTC 服务

1. 登录控制台：https://console.volcengine.com/
2. 搜索"RTC"或访问：https://console.volcengine.com/rtc
3. 点击"**开通服务**"
4. 阅读并同意服务协议
5. 点击"确认开通"

---

### 步骤 3：创建应用

1. 在 RTC 控制台，点击"**应用管理**"
2. 点击"**创建应用**"
3. 填写信息：
   ```
   应用名称：English Friend
   应用类型：娱乐社交
   应用描述：儿童英语教育 AI 对话
   ```
4. 点击"创建"

---

### 步骤 4：获取 AppID 和 AppKey

1. 在应用列表中找到刚创建的应用
2. 点击应用名称进入详情
3. 在"**应用信息**"标签页找到：
   - **App ID**：一串数字，如 `1234567890`
   - **App Key**：点击"查看"或"重置"获取

4. **复制保存**到安全地方

---

### 步骤 5：配置 Token 生成

RTC 需要服务端生成 Token 给用户加入房间：

```javascript
// 使用你的 AppID 和 AppKey 生成 Token
function generateRTCToken(roomId, uid = 'bot') {
    const appId = 'YOUR_APP_ID';  // 替换
    const appKey = 'YOUR_APP_KEY'; // 替换
    
    const now = Math.floor(Date.now() / 1000);
    const expire = now + 3600;
    
    const payload = {
        app_id: appId,
        room_id: roomId,
        uid: uid,
        expire: expire
    };
    
    const signature = crypto
        .createHmac('sha256', appKey)
        .update(JSON.stringify(payload))
        .digest('hex');
    
    return Buffer.from(JSON.stringify({
        ...payload,
        signature
    })).toString('base64');
}
```

---

### 💰 RTC 费用说明

**免费额度：**
- 每月 10,000 分钟（新用户体验）
- 适合测试和初期开发

**按量计费：**
- 音频通话：¥0.02/分钟
- 视频通话：¥0.08/分钟

**估算：**
- 每天 500 个孩子，每人 10 分钟 = 5,000 分钟/天
- 月费用：5,000 × 30 × ¥0.02 = ¥3,000/月（仅音频）

---

## 🤖 2. 豆包大模型 API 配置

### 步骤 1：访问火山引擎方舟平台

1. 访问：https://console.volcengine.com/ark
2. 使用火山引擎账号登录

---

### 步骤 2：开通豆包服务

1. 在左侧菜单选择"**模型广场**"
2. 搜索"**Doubao**"或"**豆包**"
3. 找到"**豆包 Pro 32k**"（推荐）
4. 点击"**开通**"

---

### 步骤 3：创建 API Key

1. 在左侧菜单选择"**密钥管理**"
2. 点击"**创建密钥**"
3. 填写信息：
   ```
   密钥名称：EnglishFriend-API
   密钥类型：标准密钥
   有效期：永久（或根据需要设置）
   ```
4. 点击"创建"
5. **立即复制 API Key**（只显示一次！）

> ⚠️ **重要：** API Key 只显示一次，丢失需要重新创建

---

### 步骤 4：测试 API

```bash
# 测试豆包 API
curl -X POST https://ark.cn-beijing.volces.com/api/v3/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DOUBAO_KEY" \
  -d '{
    "model": "doubao-pro-32k",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

**成功响应：**
```json
{
  "choices": [{
    "message": {
      "content": "Hi! How can I help you today?"
    }
  }]
}
```

---

### 💰 豆包费用说明

**免费额度：**
- 新用户赠送 1,000,000 tokens
- 有效期 30 天

**按量计费：**
- Doubao Pro 32k: ¥0.008/千 tokens
- Doubao Lite: ¥0.003/千 tokens

**估算：**
- 每次对话约 200 tokens
- 每天 500 次对话 = 100,000 tokens/天
- 月费用：100,000 × 30 × ¥0.008/1000 = ¥24/月

---

## 🎤 3. 语音识别 ASR 配置

### 步骤 1：访问语音服务

1. 访问：https://console.volcengine.com/speech
2. 登录火山引擎账号

---

### 步骤 2：开通语音识别服务

1. 找到"**语音识别**"（ASR）
2. 点击"**开通服务**"
3. 选择识别类型：
   - ✅ 通用语音识别
   - ✅ 英语识别（重要！）

---

### 步骤 3：获取 API Key

1. 在左侧菜单选择"**访问凭证**"
2. 点击"**创建密钥**"
3. 填写信息：
   ```
   密钥名称：EnglishFriend-ASR
   应用类型：Web 应用
   ```
4. 点击"创建"
5. 复制保存：
   - **Access Key**
   - **Secret Key**

---

### 步骤 4：测试 ASR API

```bash
# 语音识别 API 调用
curl -X POST https://openspeech.bytedance.com/api/v1/stt \
  -H "Authorization: Bearer YOUR_ASR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "audio": "base64_encoded_audio_data",
    "language": "en-US",
    "format": "pcm"
  }'
```

---

### 💰 ASR 费用说明

**免费额度：**
- 每月 5,000 分钟（新用户）

**按量计费：**
- 中文识别：¥0.02/分钟
- 英文识别：¥0.03/分钟

**估算：**
- 每天 500 个孩子，每人 5 分钟语音 = 2,500 分钟/天
- 月费用：2,500 × 30 × ¥0.03 = ¥2,250/月

---

## 🎬 4. 数字人 API 配置（可选）

### 方案 A：火山引擎智创数字人（高质量）

1. 访问：https://console.volcengine.com/digital-human
2. 开通"智创数字人"服务
3. 创建数字人形象（选择 Miss Emma 等角色）
4. 获取数字人 API Key

**费用：** ¥0.5/分钟（较贵）

---

### 方案 B：开源数字人 + 豆包 API（经济）

使用开源方案代替火山数字人：

1. **SadTalker**（GitHub 开源）
   - 本地部署
   - 成本：服务器费用

2. **D-ID API**（第三方服务）
   - https://www.d-id.com/
   - 费用：$5.99/月起

3. **腾讯智影**
   - https://zenvideo.qq.com/
   - 费用：按量计费

---

## 📝 配置到项目

### 创建 .env 文件

```bash
cd english-roleplay/server

cat > .env << EOF
# ==================== 火山云 RTC 配置 ====================
VOLC_APP_ID=你的 RTC_AppID
VOLC_APP_KEY=你的 RTC_AppKey

# ==================== 豆包 API 配置 ====================
DOUBAO_API_KEY=你的豆包_API_Key

# ==================== 语音识别 ASR 配置 ====================
VOLC_ASR_ACCESS_KEY=你的 ASR_Access_Key
VOLC_ASR_SECRET_KEY=你的 ASR_Secret_Key

# ==================== 数字人 API（可选） ====================
DIGITAL_HUMAN_API_KEY=你的数字人_API_Key

# ==================== 服务端配置 ====================
PORT=3000
NODE_ENV=development
EOF
```

---

### 验证配置

```bash
# 启动服务
node index.js

# 检查健康状态
curl http://localhost:3000/health
```

**成功输出：**
```json
{
  "status": "ok",
  "services": {
    "rtc": "configured",
    "doubao": "configured",
    "websocket": "enabled"
  }
}
```

---

## 🔒 安全建议

### 1. 密钥管理

- ✅ 不要将 `.env` 文件提交到 Git
- ✅ 使用环境变量或密钥管理服务
- ✅ 定期轮换密钥（每 3-6 个月）

### 2. 访问控制

```bash
# 在 .gitignore 中添加
echo ".env" >> .gitignore
```

### 3. 监控用量

定期查看火山引擎控制台的用量统计：
- RTC：https://console.volcengine.com/rtc/usage
- 豆包：https://console.volcengine.com/ark/usage
- ASR: https://console.volcengine.com/speech/usage

---

## 🆘 常见问题

### Q1: 实名认证失败

```
解决：
- 检查身份证照片是否清晰
- 确保证件在有效期内
- 尝试企业认证（需要营业执照）
```

### Q2: API 调用失败 401

```
解决：
- 检查 API Key 是否正确
- 确认服务已开通
- 检查密钥是否过期
```

### Q3: 余额不足

```
解决：
- 充值：控制台 → 费用中心 → 充值
- 新用户有免费额度，先使用免费额度测试
```

### Q4: 服务开通审核中

```
解决：
- 部分服务需要审核（1-3 个工作日）
- 可以先用测试凭证开发其他功能
- 联系客服加急：400-xxx-xxxx
```

---

## 📞 火山引擎联系方式

- **官方文档：** https://www.volcengine.com/docs
- **技术支持：** 控制台 → 工单系统
- **客服电话：** 400-088-2999
- **社区论坛：** https://bbs.volcengine.com/

---

## ✅ 配置检查清单

- [ ] 注册火山引擎账号
- [ ] 完成实名认证
- [ ] 开通 RTC 服务
- [ ] 创建 RTC 应用
- [ ] 获取 AppID 和 AppKey
- [ ] 开通豆包服务
- [ ] 创建豆包 API Key
- [ ] 开通 ASR 服务
- [ ] 获取 ASR 密钥
- [ ] （可选）开通数字人服务
- [ ] 创建 .env 文件
- [ ] 测试 API 调用
- [ ] 启动服务验证

---

**配置完成后，我们就可以开始真正的实时对话了！** 🐾
