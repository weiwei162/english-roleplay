# 📋 火山云 API 配置总结

**更新日期：** 2026-03-13  
**状态：** 准备配置

---

## ✅ 已完成的准备工作

### 1. 代码更新

- ✅ `js/rtc-client.js` - 双向 RTC 客户端（支持本地音频发布）
- ✅ `server/index.js` - 服务端（WebSocket + 实时 ASR）
- ✅ `server/.env.example` - 配置模板（已更新）

### 2. 配置工具

- ✅ `server/configure.sh` - 交互式配置脚本
- ✅ `server/test-api.js` - API 测试工具
- ✅ `server/package.json` - 已添加测试命令

### 3. 文档

- ✅ `VOLCENGINE-SETUP.md` - 详细配置教程（6KB）
- ✅ `QUICK-SETUP.md` - 5 分钟快速指南
- ✅ `RTC-INTEGRATION-FULLDUPLEX.md` - 双向 RTC 集成指南
- ✅ `RTC-QUICKSTART.md` - RTC 快速启动

---

## 🎯 下一步：获取 API 凭证

### 必需凭证（2 个）

| 凭证 | 用途 | 获取地址 | 时间 |
|------|------|----------|------|
| RTC AppID + AppKey | 实时音视频 | https://console.volcengine.com/rtc | 3 分钟 |
| 豆包 API Key | AI 对话 | https://console.volcengine.com/ark | 2 分钟 |

### 可选凭证（2 个）

| 凭证 | 用途 | 获取地址 | 时间 |
|------|------|----------|------|
| ASR 密钥 | 语音识别 | https://console.volcengine.com/speech | 2 分钟 |
| 数字人 API | 数字人视频 | https://console.volcengine.com/digital-human | 5 分钟 |

---

## 🚀 配置流程

### 方式 A：交互式配置（推荐）

```bash
cd english-roleplay/server

# 1. 运行配置脚本
./configure.sh

# 2. 按提示输入 API 凭证

# 3. 测试配置
npm test

# 4. 启动服务
npm start
```

---

### 方式 B：手动配置

```bash
# 1. 创建 .env 文件
cd english-roleplay/server
cat > .env << EOF
VOLC_APP_ID=你的 AppID
VOLC_APP_KEY=你的 AppKey
DOUBAO_API_KEY=你的豆包 APIKey
PORT=3000
EOF

# 2. 安装依赖
npm install

# 3. 测试
node test-api.js

# 4. 启动
node index.js
```

---

## 📖 参考文档

**快速上手：**
- `QUICK-SETUP.md` - 5 分钟快速配置

**详细教程：**
- `VOLCENGINE-SETUP.md` - 完整配置步骤和费用说明

**技术文档：**
- `RTC-INTEGRATION-FULLDUPLEX.md` - 双向 RTC 集成
- `RTC-QUICKSTART.md` - RTC 快速启动

---

## 💡 建议

### 第一次配置

1. **先配置 RTC 和豆包**（必需）
2. **测试基础功能**（文字对话）
3. **再配置 ASR**（语音识别）
4. **最后考虑数字人**（可选，成本高）

### 测试阶段

- 使用免费额度测试
- 每天限制测试次数
- 监控用量避免超支

### 生产环境

- 设置用量告警
- 配置自动充值
- 定期轮换密钥

---

## 🆘 需要帮助时

**查看文档：**
```bash
# 查看详细教程
cat VOLCENGINE-SETUP.md

# 查看快速指南
cat QUICK-SETUP.md
```

**测试配置：**
```bash
node test-api.js
```

**常见问题：**
- 文档中有详细 FAQ
- 火山引擎客服：400-088-2999
- 工单系统：控制台 → 工单

---

## 📊 费用参考

**测试阶段（每天 100 次对话）：**
- RTC: ¥20/天
- 豆包：¥0.16/天
- ASR: ¥15/天
- **总计：约 ¥35/天**

**新用户福利：**
- RTC: 10,000 分钟免费/月
- 豆包：1,000,000 tokens 免费
- ASR: 5,000 分钟免费/月

---

## ✅ 配置检查清单

开始前请确认：

- [ ] 已注册火山引擎账号
- [ ] 已完成实名认证
- [ ] 已准备好信用卡/支付宝（充值用）
- [ ] 已阅读 VOLCENGINE-SETUP.md
- [ ] 已切换到 server 目录

配置时：

- [ ] 运行 ./configure.sh
- [ ] 输入 RTC AppID 和 AppKey
- [ ] 输入豆包 API Key
- [ ] （可选）输入 ASR 密钥
- [ ] 运行 npm test 验证

配置后：

- [ ] npm start 启动服务
- [ ] curl http://localhost:3000/health 检查状态
- [ ] 打开前端测试对话
- [ ] 监控用量和控制台

---

**准备好了吗？开始配置吧！** 🐾

**快速命令：**
```bash
cd english-roleplay/server
./configure.sh
```
