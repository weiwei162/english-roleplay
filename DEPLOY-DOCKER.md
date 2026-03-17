# Docker 部署指南

## 快速部署

### 1. 构建镜像

```bash
# 构建主服务镜像
docker build -t english-roleplay:latest .

# 或分别构建
docker build -f Dockerfile.pi-agent -t english-roleplay-pi-agent:latest .
docker build -f Dockerfile.main -t english-roleplay-main:latest .
```

### 2. 运行容器

```bash
# 使用 docker-compose（推荐）
docker-compose up -d

# 或单独运行
docker run -d \
  --name pi-agent \
  -p 3001:3001 \
  --env-file .env \
  english-roleplay-pi-agent:latest

docker run -d \
  --name main-server \
  -p 3000:3000 \
  --env-file .env \
  --link pi-agent \
  english-roleplay-main:latest
```

### 3. 查看状态

```bash
# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f pi-agent
docker-compose logs -f main-server
```

---

## Dockerfile

### 主服务 Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 启动命令
CMD ["node", "index-join-ai.js"]
```

### pi-agent Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# 启动命令
CMD ["node", "pi-agent-real.js"]
```

---

## Docker Compose

```yaml
version: '3.8'

services:
  pi-agent:
    build:
      context: ./server
      dockerfile: Dockerfile.pi-agent
    container_name: english-roleplay-pi-agent
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - LLM_PROVIDER=${LLM_PROVIDER:-openai}
      - LLM_MODEL=${LLM_MODEL:-gpt-4o-mini}
      - LLM_API_KEY=${LLM_API_KEY}
      - PI_AGENT_API_KEY=${PI_AGENT_API_KEY:-pi-agent-secret-key}
    restart: unless-stopped
    networks:
      - english-network
    volumes:
      - ./server/logs:/app/logs

  main-server:
    build:
      context: ./server
      dockerfile: Dockerfile.main
    container_name: english-roleplay-main
    ports:
      - "3000:3000"
      - "3443:3443"
    environment:
      - NODE_ENV=production
      - AI_MODE=${AI_MODE:-custom}
      - PI_AGENT_URL=http://pi-agent:3001/v1/chat/completions
      - PI_AGENT_API_KEY=${PI_AGENT_API_KEY:-pi-agent-secret-key}
      - VOLC_APP_ID=${VOLC_APP_ID}
      - VOLC_APP_KEY=${VOLC_APP_KEY}
      - VOLC_ACCESS_KEY=${VOLC_ACCESS_KEY}
      - VOLC_SECRET_KEY=${VOLC_SECRET_KEY}
    depends_on:
      - pi-agent
    restart: unless-stopped
    networks:
      - english-network
    volumes:
      - ./server/logs:/app/logs
      - ./server/ssl:/app/ssl

networks:
  english-network:
    driver: bridge
```

---

## 环境变量配置

创建 `.env` 文件：

```bash
# ==================== AI 模式 ====================
AI_MODE=custom

# ==================== pi-agent 配置 ====================
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=sk-proj-your-api-key-here

# ==================== pi-agent API Key ====================
PI_AGENT_API_KEY=pi-agent-secret-key-change-in-production

# ==================== 火山引擎配置 ====================
VOLC_APP_ID=your-volc-app-id
VOLC_APP_KEY=your-volc-app-key
VOLC_ACCESS_KEY=your-access-key
VOLC_SECRET_KEY=your-secret-key

# ==================== 其他配置 ====================
NODE_ENV=production
USE_HTTPS=false
PORT=3000
```

---

## 生产环境部署

### 1. 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /pi-agent/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. 启用 HTTPS（Let's Encrypt）

```bash
# 安装 Certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d your-domain.com

# 自动续期
certbot renew --dry-run
```

### 3. 防火墙配置

```bash
# 允许 HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# 允许 SSH
ufw allow 22/tcp

# 启用防火墙
ufw enable

# 查看状态
ufw status
```

---

## 监控和日志

### 1. Docker 日志

```bash
# 查看实时日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f pi-agent

# 查看最近 100 行
docker-compose logs --tail=100 main-server
```

### 2. 日志轮转

创建 `logrotate` 配置 `/etc/logrotate.d/english-roleplay`:

```
/app/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 node node
    sharedscripts
    postrotate
        docker-compose kill -s HUP main-server pi-agent
    endscript
}
```

### 3. 监控指标

```bash
# 查看容器资源使用
docker stats

# 查看容器状态
docker-compose ps

# 健康检查
docker inspect --format='{{.State.Health.Status}}' english-roleplay-pi-agent
```

---

## 备份和恢复

### 1. 备份数据

```bash
# 备份对话历史（如果使用外部存储）
docker exec english-roleplay-main tar czf /tmp/backup.tar.gz /app/data

# 复制到主机
docker cp english-roleplay-main:/tmp/backup.tar.gz ./backup-$(date +%Y%m%d).tar.gz
```

### 2. 恢复数据

```bash
# 复制备份到容器
docker cp ./backup.tar.gz english-roleplay-main:/tmp/backup.tar.gz

# 解压恢复
docker exec english-roleplay-main tar xzf /tmp/backup.tar.gz -C /app/data
```

---

## 更新和升级

### 1. 更新镜像

```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker-compose build

# 重启服务
docker-compose up -d --force-recreate
```

### 2. 回滚

```bash
# 查看历史镜像
docker images english-roleplay

# 回滚到上一个版本
docker-compose down
docker-compose up -d --force-recreate english-roleplay:previous-tag
```

---

## 故障排查

### 问题 1: 容器无法启动

```bash
# 查看容器日志
docker logs english-roleplay-pi-agent

# 检查配置文件
docker exec english-roleplay-pi-agent cat /app/.env

# 测试网络连接
docker exec english-roleplay-pi-agent ping -c 3 api.openai.com
```

### 问题 2: 服务间通信失败

```bash
# 检查网络
docker network inspect english-roleplay_english-network

# 测试容器间连接
docker exec english-roleplay-main ping -c 3 pi-agent

# 检查端口
docker exec english-roleplay-pi-agent netstat -tlnp
```

### 问题 3: 内存不足

```bash
# 查看内存使用
docker stats --no-stream

# 限制容器内存
# 在 docker-compose.yml 中添加:
# deploy:
#   resources:
#     limits:
#       memory: 512M
```

---

## 性能优化

### 1. 多阶段构建

```dockerfile
# 构建阶段
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# 生产阶段
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/*.js ./
EXPOSE 3001
CMD ["node", "pi-agent-real.js"]
```

### 2. 使用镜像缓存

```dockerfile
# 先复制 package 文件
COPY package*.json ./
RUN npm ci --only=production

# 再复制源代码
COPY . .
```

### 3. 减少镜像层数

```dockerfile
# 合并 RUN 命令
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    wget && \
    rm -rf /var/lib/apt/lists/*
```

---

## 安全加固

### 1. 非 root 用户

```dockerfile
# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs
```

### 2. 只读文件系统

```yaml
services:
  pi-agent:
    read_only: true
    tmpfs:
      - /tmp
```

### 3. 安全扫描

```bash
# 使用 Trivy 扫描
trivy image english-roleplay:latest

# 使用 Docker Scan
docker scan english-roleplay:latest
```

---

## 扩展部署

### 1. 水平扩展

```bash
# 使用 docker-compose 扩展
docker-compose up -d --scale pi-agent=3 --scale main-server=2
```

### 2. 负载均衡

```nginx
upstream pi-agents {
    server pi-agent-1:3001;
    server pi-agent-2:3001;
    server pi-agent-3:3001;
}

location /pi-agent/ {
    proxy_pass http://pi-agents/;
}
```

### 3. Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pi-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pi-agent
  template:
    metadata:
      labels:
        app: pi-agent
    spec:
      containers:
      - name: pi-agent
        image: english-roleplay-pi-agent:latest
        ports:
        - containerPort: 3001
        env:
        - name: LLM_API_KEY
          valueFrom:
            secretKeyRef:
              name: llm-secrets
              key: api-key
```

---

## 成本估算

### Docker 部署成本（按量计费）

| 项目 | 配置 | 月成本 |
|------|------|--------|
| VPS | 2 核 4GB | $10-20 |
| LLM API | 1000 轮对话/天 | $5-15 |
| 存储 | 10GB SSD | $2 |
| **总计** | | **$17-37/月** |

### 优化建议

1. 使用 Spot 实例节省 50-70%
2. 使用 Cloudflare 缓存静态资源
3. 使用 Redis 缓存常用回复
4. 设置 Token 预算限制

---

**更新时间**: 2026-03-17  
**版本**: v3.2.0
