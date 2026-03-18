# Main Server Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# 复制 server 目录的 package 文件
COPY server/package*.json ./

# 安装所有依赖
RUN npm ci

# 复制 server 目录的所有文件
COPY server/ ./server/

# 复制前端文件
COPY frontend/ ./frontend/

# 生产阶段
FROM node:22-alpine

WORKDIR /app

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 从构建阶段复制所有文件（node_modules + 后端 + 前端）
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/frontend ./frontend

# 创建日志和 SSL 目录
RUN mkdir -p /app/logs /app/ssl && chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3000 3443

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 启动命令
CMD ["node", "server/index-join-ai.js"]
