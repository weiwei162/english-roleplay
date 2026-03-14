# 🚀 快速配置火山云 API - 3 步完成

**目标：** 5 分钟内完成所有 API 配置并启动服务

---

## ⚡ 方式一：自动配置（推荐）

### 步骤 1：运行配置脚本

```bash
cd english-roleplay/server

# 运行交互式配置脚本
./configure.sh
```

脚本会引导你：
1. 输入 RTC AppID 和 AppKey
2. 输入豆包 API Key
3. （可选）配置 ASR 和数字人 API
4. 自动生成 `.env` 文件

---

### 步骤 2：测试 API

```bash
# 运行测试工具
npm test

# 或单独测试
node test-api.js
```

看到 `✅ 所有测试通过` 即可继续

---

### 步骤 3：启动服务

```bash
# 启动服务
npm start

# 或开发模式（自动重启）
npm run dev
```

---

## 📝 方式二：手动配置

### 1. 获取 API 凭证

按照以下顺序获取（每个约 2-3 分钟）：

| 服务 | 网址 | 所需时间 |
|------|------|----------|
| RTC | https://console.volcengine.com/rtc | 3 分钟 |
| 豆包 | https://console.volcengine.com/ark | 2 分钟 |
| ASR | https://console.volcengine.com/speech | 2 分钟 |

**详细教程：** 查看 `VOLCENGINE-SETUP.md`

---

### 2. 创建 .env 文件

```bash
cd english-roleplay/server

cat > .env << EOF
VOLC_APP_ID=你的 AppID
VOLC_APP_KEY=你的 AppKey
DOUBAO_API_KEY=你的豆包 APIKey
PORT=3000
EOF
```

---

### 3. 安装依赖并启动

```bash
# 安装依赖
npm install

# 测试配置
node test-api.js

# 启动服务
node index.js
```

---

## 🎯 获取 API 凭证的快速路径

### 🔑 RTC AppID + AppKey

```
1. 登录：https://console.volcengine.com/rtc
2. 开通服务（首次）
3. 创建应用 → English Friend
4. 应用管理 → 查看凭证
5. 复制 AppID 和 AppKey
```

**时间：** 3 分钟  
**费用：** 免费额度 10,000 分钟/月

---

### 🤖 豆包 API Key

```
1. 登录：https://console.volcengine.com/ark
2. 模型广场 → 搜索"Doubao"
3. 豆包 Pro 32k → 开通
4. 密钥管理 → 创建密钥
5. 复制 API Key（只显示一次！）
```

**时间：** 2 分钟  
**费用：** 免费 1,000,000 tokens（新用户）

---

### 🎤 ASR 密钥（可选）

```
1. 登录：https://console.volcengine.com/speech
2. 开通语音识别服务
3. 访问凭证 → 创建密钥
4. 复制 Access Key 和 Secret Key
```

**时间：** 2 分钟  
**费用：** 免费 5,000 分钟/月

---

## ✅ 验证成功

启动服务后应该看到：

```
╔══════════════════════════════════════════════════════╗
║     English Friend AI Server Running (Full-Duplex)  ║
║                                                      ║
║   HTTP Port: 3000                                    ║
║   WebSocket: ws://localhost:3000                     ║
║                                                      ║
║   RTC:     ✅ configured                             ║
║   Doubao:  ✅ configured                             ║
║                                                      ║
║   Features:                                          ║
║   ✓ 双向 RTC 音频流（孩子说话 → AI）                   ║
║   ✓ 实时 ASR 语音识别                                 ║
║   ✓ 豆包大模型对话生成                               ║
║   ✓ 数字人视频推流                                   ║
╚══════════════════════════════════════════════════════╝
```

---

## 🧪 快速测试

### 测试 1：健康检查

```bash
curl http://localhost:3000/health
```

**成功响应：**
```json
{
  "status": "ok",
  "services": {
    "rtc": "configured",
    "doubao": "configured"
  }
}
```

---

### 测试 2：豆包对话

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello",
    "sessionId": "test_123",
    "character": "emma"
  }'
```

---

### 测试 3：创建 RTC 房间

```bash
curl -X POST http://localhost:3000/api/create-room \
  -H "Content-Type: application/json" \
  -d '{"roomId": "test_room"}'
```

---

## 🐛 遇到问题？

### 问题 1：实名认证

```
解决：
- 个人账号：上传身份证正反面
- 企业账号：上传营业执照
- 审核时间：通常 1 小时内
```

---

### 问题 2：API Key 无效

```
检查：
1. 是否复制完整（无空格）
2. 服务是否已开通
3. 密钥是否过期
```

---

### 问题 3：余额不足

```
解决：
- 新用户有免费额度
- 充值：控制台 → 费用中心 → 充值
- 最低充值：¥10
```

---

## 📞 需要帮助？

1. **查看详细文档：** `VOLCENGINE-SETUP.md`
2. **火山引擎客服：** 400-088-2999
3. **工单系统：** 控制台 → 工单
4. **社区论坛：** https://bbs.volcengine.com/

---

## 💰 费用估算（供参考）

**小规模测试（每天 100 个孩子）：**
```
RTC:      100 × 10 分钟 × ¥0.02 = ¥20/天
豆包：    100 × 200 tokens × ¥0.008/1k = ¥0.16/天
ASR:      100 × 5 分钟 × ¥0.03 = ¥15/天
────────────────────────────────────
总计：约 ¥35/天 ≈ ¥1,050/月
```

**中规模运营（每天 500 个孩子）：**
```
总计：约 ¥175/天 ≈ ¥5,250/月
```

> 💡 提示：新用户有免费额度，可以先测试再决定

---

**配置完成后，我们就可以开始真正的实时对话了！** 🐾
