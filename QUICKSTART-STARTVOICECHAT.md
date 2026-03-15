# 🚀 StartVoiceChat 快速启动指南

**5 分钟完成配置并开始实时对话！**

---

## 第一步：获取 API 凭证（3 分钟）

### 1. 火山引擎 RTC（1 分钟）

1. 访问：https://console.volcengine.com/rtc/aigc/listRTC
2. 创建应用 → 获取 **AppId** 和 **AppKey**

### 2. 豆包端到端语音大模型（1 分钟）

1. 访问：https://console.volcengine.com/speech/service/10017
2. 开通服务 → 获取 **AppId** 和 **Token**

### 3. AccessKey / SecretKey（1 分钟）

1. 访问：https://console.volcengine.com/iam/keymanage/
2. 创建密钥 → 获取 **AccessKey** 和 **SecretKey**

---

## 第二步：配置项目（1 分钟）

```bash
# 进入项目目录
cd english-roleplay/server

# 复制配置模板
cp .env.example .env

# 编辑配置文件
nano .env
```

填入你的凭证：

```env
# 选择端到端模式（推荐）
AI_MODE=s2s

# RTC 配置
VOLC_APP_ID=你的 RTC AppId
VOLC_APP_KEY=你的 RTC AppKey
VOLC_ACCESS_KEY=你的 AccessKey
VOLC_SECRET_KEY=你的 SecretKey

# S2S 端到端配置
VOLC_S2S_APP_ID=你的 S2S AppId
VOLC_S2S_TOKEN=你的 S2S Token
```

---

## 第三步：启动服务（30 秒）

```bash
# 启动服务
node index-start-voicechat.js

# 验证状态
curl http://localhost:3000/health
```

成功输出：

```json
{
  "status": "ok",
  "config": {
    "aiMode": "s2s",
    "volcConfigured": true,
    "rtcConfigured": true
  }
}
```

---

## 第四步：测试对话（1 分钟）

### 创建房间

```bash
curl -X POST http://localhost:3000/api/create-room \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "test123",
    "character": "emma"
  }'
```

### 离开房间

```bash
curl -X POST http://localhost:3000/api/leave-room \
  -H "Content-Type: application/json" \
  -d '{"roomId": "test123"}'
```

---

## 🎭 可用角色

| 角色 | 说明 |
|------|------|
| emma | Miss Emma - 温柔的英语老师 |
| tommy | Tommy - 5 岁美国小男孩 |
| lily | Lily - 7 岁活泼小姐姐 |
| mike | Coach Mike - 阳光运动教练 |
| rose | Grandma Rose - 慈祥老奶奶 |

---

## ⚠️ 常见问题

### 签名失败 401
- 检查 AccessKey/SecretKey 是否正确
- 确保服务器时间准确

### TaskId 冲突
- 系统自动生成唯一 TaskId，无需手动配置

### AI 未入房
- StartVoiceChat 返回 200 仅代表任务下发成功
- 前往控制台开启 VoiceChat 事件回调

---

## 📚 详细文档

- **完整配置指南：** `STARTVOICECHAT-SETUP.md`
- **API 文档：** https://www.volcengine.com/docs/6348/1558163

---

## 🆘 需要帮助？

```bash
# 查看配置状态
curl http://localhost:3000/health

# 查看角色列表
curl http://localhost:3000/api/characters

# 查看日志
tail -f logs/*.log
```

---

**完成！现在你可以开始实时英语对话了！** 🐾
