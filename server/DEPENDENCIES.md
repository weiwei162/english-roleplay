# 依赖安装指南

## ⚠️ 重要说明

本项目使用 **@mariozechner/pi-ai** 包，该包可能未发布到 npm 公共仓库。

## 安装方式

### 方式 1: 从 GitHub 安装（推荐）

```bash
cd server

# 直接从 GitHub 安装
npm install github:badlogic/pi-mono#main

# 或指定子包
npm install github:badlogic/pi-mono#packages/ai
```

### 方式 2: 从 npm 安装（如果可用）

```bash
cd server
npm install @mariozechner/pi-ai
```

### 方式 3: 使用备用包

如果 `@mariozechner/pi-ai` 不可用，可以使用以下替代方案：

**选项 A: 使用 OpenAI SDK**
```bash
npm install openai
```

然后修改代码中的导入：
```javascript
const { OpenAI } = require('openai');
```

**选项 B: 使用 Anthropic SDK**
```bash
npm install @anthropic-ai/sdk
```

**选项 C: 使用 Ollama**
```bash
npm install ollama
```

---

## 完整依赖列表

```json
{
  "@volcengine/rtc": "^4.68.1",
  "@mariozechner/pi-ai": "latest",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "express": "^4.18.2",
  "jsonwebtoken": "^9.0.2"
}
```

---

## 故障排查

### 问题 1: 包不存在

**错误**: `npm ERR! 404 Not Found`

**解决**:
```bash
# 使用 GitHub 安装
npm install github:badlogic/pi-mono

# 或使用备用方案（见上方）
```

### 问题 2: 版本不匹配

**错误**: `Cannot find module`

**解决**:
```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 问题 3: Node.js 版本过低

**错误**: `Unsupported engine`

**解决**:
```bash
# 检查 Node.js 版本
node --version

# 需要 >= 20.0.0
# 使用 nvm 升级
nvm install 20
nvm use 20
```

---

## 最小依赖方案（不使用 pi-ai）

如果无法安装 `@mariozechner/pi-ai`，可以使用最小依赖方案：

```bash
# 安装基础依赖
npm install @volcengine/rtc cors dotenv express jsonwebtoken

# 选择一个 LLM SDK
npm install openai  # 或 @anthropic-ai/sdk 或 ollama
```

然后参考 `pi-agent-server.js` 实现简单的 LLM 调用。

---

**更新时间**: 2026-03-17  
**Node.js 要求**: >= 20.0.0
