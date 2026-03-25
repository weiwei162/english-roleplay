# 🚀 English-Roleplay 快速参考卡

## 一键启动

```bash
# 开发模式（本地测试）
cd server && ./start.sh

# 生产模式（Docker）
docker-compose up -d

# 查看日志
docker-compose logs -f
```

---

## 环境配置速查

### .env 核心配置

```bash
# AI 模式（3 选 1）
AI_MODE=custom      # 使用真实 LLM（推荐）⭐
AI_MODE=s2s         # 火山引擎端到端
AI_MODE=component   # 火山引擎分组件

# LLM 配置（AI_MODE=custom 时）
LLM_PROVIDER=openai           # openai/anthropic/google/ollama
LLM_MODEL=gpt-4o-mini         # 模型名称
LLM_API_KEY=sk-proj-xxx       # API Key

# 火山引擎配置（AI_MODE=s2s/component 时）
VOLC_APP_ID=xxx
VOLC_APP_KEY=xxx
VOLC_ACCESS_KEY=xxx
VOLC_SECRET_KEY=xxx
```

---

## 常用命令

### 服务管理

```bash
# 启动
npm start              # 主服务
npm run start:pi-agent # pi-agent 服务
./start.sh             # 快速启动脚本

# Docker
docker-compose up -d           # 启动
docker-compose down            # 停止
docker-compose ps              # 状态
docker-compose logs -f         # 日志
```

### 测试命令

```bash
# 健康检查
curl http://localhost:3001/health

# 测试聊天
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}],"stream":false}'
```

### Git 操作

```bash
# 查看提交历史
git log --oneline -10

# 查看状态
git status

# 推送更新
git add -A && git commit -m "message" && git push origin master
```

---

## 端口速查

| 服务 | 端口 | 说明 |
|------|------|------|
| 主服务 | 3000 | HTTP |
| 主服务 | 3443 | HTTPS |
| pi-agent | 3001 | LLM API |

---

## 文件位置

```
english-roleplay/
├── frontend/                  # 前端目录
│   ├── index.html             # 主页面
│   ├── js/                    # 前端代码
│   │   ├── app.js             # 主应用逻辑
│   │   ├── scenes.js          # 场景数据
│   │   └── startvoicechat-client.js  # RTC 客户端
│   └── css/
│       └── style.css          # 样式
│
├── server/                    # 后端代码
│   ├── index-join-ai.js       # 主服务（pi-agent 已集成）
│   ├── token-generator.js     # Token 生成
│   ├── AccessToken.js         # 官方 Token 库
│   ├── volc-start-voicechat.js # StartVoiceChat 客户端
│   ├── prompts.js             # 提示词管理
│   ├── auth.js                # 用户认证
│   └── .env.example           # 环境变量模板
│
└── 文档/
    ├── QUICKSTART.md          # 5 分钟快速开始 ⭐
    ├── START.md               # 火山引擎启动指南
    ├── CORRECT-FLOW.md        # 正确集成流程 ⭐
    └── DEPLOY-DOCKER.md       # Docker 部署
```

---

## 故障排查速查

### 常见问题

```bash
# 1. 模块未找到
npm install

# 2. API Key 错误
cat .env | grep LLM_API_KEY

# 3. 端口被占用
lsof -i :3000
kill -9 <PID>

# 4. Docker 容器失败
docker-compose logs pi-agent
docker-compose restart pi-agent
```

### 日志查看

```bash
# 实时日志
tail -f server/logs/*.log

# Docker 日志
docker-compose logs -f pi-agent
docker-compose logs -f main-server

# 错误日志
grep "ERROR\|❌" server/logs/*.log | tail -20
```

---

## 性能指标

| 指标 | 目标值 | 实际值 |
|------|--------|--------|
| 首次 token | < 500ms | ___ |
| 完整响应 | < 2s | ___ |
| 并发用户 | 10-20 | ___ |
| 错误率 | < 1% | ___ |

---

## 成本估算

### 本地开发
- **LLM API**: $0.01-0.05/天（测试）
- **总计**: ~$1-2/月

### 生产环境（100 用户/天）
- **LLM API**: $5-15/月
- **服务器**: $10-20/月
- **总计**: $15-35/月

---

## 快速调试

### 浏览器控制台

```javascript
// 检查 RTC 连接状态
console.log('RTC Status:', rtcStatus);

// 查看当前场景
console.log('Current Scene:', currentScene);

// 查看角色位置
console.log('Character Position:', characterPosition);

// 测试移动角色
moveCharacterTo(50, 60, { jump: true });
```

### 后端调试

```bash
# 启用调试日志
DEBUG=pi-agent* npm start

# 查看活跃会话
curl http://localhost:3000/health | jq .activeSessions

# 运行集成测试
npm test
```

---

## 文档索引

### 必读 ⭐
- [QUICKSTART.md](QUICKSTART.md) - 5 分钟快速开始
- [CORRECT-FLOW.md](CORRECT-FLOW.md) - 正确集成流程
- [START.md](START.md) - 火山引擎启动指南

### 开发
- [CHARACTER-MOVE-FEATURE.md](CHARACTER-MOVE-FEATURE.md) - 角色移动
- [API-CONFIG.md](API-CONFIG.md) - 前端配置 API
- [INTEGRATION-FLOW.md](INTEGRATION-FLOW.md) - 集成流程

### 部署
- [DEPLOY-DOCKER.md](DEPLOY-DOCKER.md) - Docker 部署
- [HTTPS-CONFIG.md](HTTPS-CONFIG.md) - HTTPS 配置

---

## 快捷键（开发）

```
F12           # 打开浏览器控制台
Ctrl+Shift+R  # 强制刷新
Ctrl+Shift+I  # 开发者工具
```

---

## 支持渠道

- **GitHub**: https://github.com/weiwei162/english-roleplay
- **文档**: https://github.com/weiwei162/english-roleplay/tree/master
- **Issue**: https://github.com/weiwei162/english-roleplay/issues

---

**版本**: v3.2.0  
**更新**: 2026-03-17  
**状态**: ✅ 生产就绪
