# 🔑 前端配置 API 说明

**更新时间：** 2026-03-15  
**方式：** 前端从后端 API 获取配置和 Token

---

## 📡 新增 API 接口

### GET /api/config

**描述：** 获取前端配置信息

**请求：**
```
GET /api/config
```

**响应：**
```json
{
  "success": true,
  "config": {
    "appId": "1234567890",
    "aiMode": "s2s",
    "features": {
      "enableVideo": true,
      "enableASR": true,
      "enableTTS": true
    }
  }
}
```

**用途：**
- 前端获取 RTC AppId
- 获取 AI 模式配置
- 获取功能开关

---

### GET /api/token

**描述：** 获取 RTC Token（用于加入房间）

**请求：**
```
GET /api/token?roomId=room123&uid=child_user
```

**响应：**
```json
{
  "success": true,
  "roomId": "room123",
  "uid": "child_user",
  "token": "eyJhcHBfaWQiOiJ4eHgiLCJyb29tX2lkIjoi...",
  "appId": "1234567890",
  "expireIn": 3600
}
```

**参数：**
- `roomId` - RTC 房间 ID（必需）
- `uid` - 用户 ID（必需）

**有效期：** 3600 秒（1 小时）

---

## 💻 前端使用示例

### 方式 1：自动获取（推荐）

```javascript
await createStartVoiceChatRoom(roomId, {
    fetchConfig: true // 自动从后端获取配置和 Token
});
```

**流程：**
1. 调用 `/api/config` 获取 AppId
2. 调用 `/api/token` 获取 Token
3. 使用 AppId 和 Token 加入 RTC 房间

### 方式 2：手动获取

```javascript
// 1. 获取配置
const configRes = await fetch('/api/config');
const config = await configRes.json();
const appId = config.config.appId;

// 2. 获取 Token
const tokenRes = await fetch(`/api/token?roomId=${roomId}&uid=${uid}`);
const tokenData = await tokenRes.json();
const token = tokenData.token;

// 3. 加入房间
await createStartVoiceChatRoom(roomId, {
    appId: appId,
    token: token
});
```

---

## 🔒 安全优势

### 之前（硬编码在前端）

```javascript
// ❌ 不安全：AppId 暴露在前端代码中
window.VOLC_APP_ID = '1234567890';
```

**问题：**
- AppId 容易被查看
- 无法动态更换
- 无法控制权限

### 现在（从后端获取）

```javascript
// ✅ 安全：AppId 从后端 API 获取
await createStartVoiceChatRoom(roomId, {
    fetchConfig: true
});
```

**优势：**
- AppId 不暴露在前端代码
- 可以动态更换配置
- 可以控制权限（鉴权、限流等）
- Token 由后端生成，更安全

---

## 📊 完整流程

```
前端
  ↓ GET /api/config
后端返回 { appId, aiMode, ... }
  ↓
前端初始化 RTC 引擎
  ↓ GET /api/token?roomId=xxx&uid=xxx
后端生成并返回 Token
  ↓
前端使用 Token 加入 RTC 房间
  ↓
实时对话开始
```

---

## 🧪 测试命令

### 测试配置接口

```bash
curl http://localhost:3000/api/config
```

**预期响应：**
```json
{
  "success": true,
  "config": {
    "appId": "1234567890",
    "aiMode": "s2s"
  }
}
```

### 测试 Token 接口

```bash
curl "http://localhost:3000/api/token?roomId=test123&uid=child_user"
```

**预期响应：**
```json
{
  "success": true,
  "roomId": "test123",
  "uid": "child_user",
  "token": "eyJ...",
  "appId": "1234567890",
  "expireIn": 3600
}
```

---

## ⚠️ 注意事项

### 1. 后端配置

确保 `.env` 文件中配置了：

```env
VOLC_APP_ID=你的 RTC AppId
VOLC_APP_KEY=你的 RTC AppKey
```

### 2. Token 有效期

- 默认 1 小时（3600 秒）
- 超时后需要重新获取
- 建议房间创建时获取一次即可

### 3. 错误处理

```javascript
try {
    await createStartVoiceChatRoom(roomId, {
        fetchConfig: true
    });
} catch (error) {
    console.error('Failed to create room:', error);
    // 降级方案或显示错误提示
}
```

### 4. 降级方案

如果 `/api/config` 或 `/api/token` 失败：

```javascript
// 前端生成 Token（简化版，不推荐生产环境）
const token = generateToken(roomId, uid); // 客户端生成
```

---

## 🔧 后端实现

### /api/config

```javascript
app.get('/api/config', (req, res) => {
    res.json({
        success: true,
        config: {
            appId: process.env.VOLC_APP_ID,
            aiMode: AI_MODE,
            features: {
                enableVideo: true,
                enableASR: true,
                enableTTS: true
            }
        }
    });
});
```

### /api/token

```javascript
app.get('/api/token', (req, res) => {
    const { roomId, uid } = req.query;
    
    // 生成 Token（1 小时有效期）
    const token = client.generateToken(roomId, uid, 3600);
    
    res.json({
        success: true,
        roomId,
        uid,
        token,
        appId: process.env.VOLC_APP_ID,
        expireIn: 3600
    });
});
```

---

## 📚 相关文档

- `CORRECT-FLOW.md` - 正确流程说明
- `INTEGRATION-FLOW.md` - 集成流程
- `DEPLOY-TEST.md` - 部署与测试

---

**现在前端配置和 Token 都从后端获取，更安全、更灵活！** 🎉
