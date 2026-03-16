# 🔐 HTTPS 配置指南

**版本：** v3.1.0  
**更新时间：** 2026-03-16

---

## 📋 概述

English Friend 支持 HTTPS 加密连接，适用于生产环境部署。

### 特性

- ✅ HTTPS/HTTP 双模式支持
- ✅ HTTP 自动重定向到 HTTPS
- ✅ 自签名证书（开发环境）
- ✅ Let's Encrypt 证书（生产环境）
- ✅ 优雅降级（证书加载失败时自动切换到 HTTP）

---

## 🚀 快速配置

### 开发环境（自签名证书）

#### 1️⃣ 生成自签名证书

```bash
cd ~/projects/english-roleplay/server

# 创建 SSL 目录
mkdir -p ssl

# 生成自签名证书（有效期 365 天）
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes

# 按提示输入信息（可以直接回车跳过）
# Country Name: 留空或填 CN
# State: 留空
# Locality: 留空
# Organization: 留空
# Common Name: localhost
```

#### 2️⃣ 配置环境变量

编辑 `.env`：

```bash
# 启用 HTTPS
USE_HTTPS=true

# HTTPS 端口
HTTPS_PORT=3443

# SSL 证书路径（默认值，可不填）
SSL_CERT_PATH=./ssl/cert.pem
SSL_KEY_PATH=./ssl/key.pem
```

#### 3️⃣ 启动服务

```bash
npm start
```

#### 4️⃣ 访问应用

```
https://localhost:3443
```

**⚠️ 浏览器警告：** 自签名证书会显示安全警告，点击"继续访问"即可。

---

### 生产环境（Let's Encrypt 证书）

#### 1️⃣ 安装 Certbot

```bash
# Ubuntu/Debian
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot
```

#### 2️⃣ 获取证书

```bash
# 停止占用 80 端口的服务
sudo systemctl stop nginx  # 或其他服务

# 获取证书
sudo certbot certonly --standalone -d your-domain.com

# 证书位置：
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

#### 3️⃣ 配置环境变量

```bash
USE_HTTPS=true
HTTPS_PORT=3443
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem
```

#### 4️⃣ 自动续期

```bash
# 添加定时任务（每月 1 号检查续期）
sudo crontab -e

# 添加以下行
0 0 1 * * certbot renew --quiet && systemctl restart english-friend
```

---

## 🔧 配置选项

### 环境变量

| 变量 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `USE_HTTPS` | 是否启用 HTTPS | `false` | `true` |
| `HTTPS_PORT` | HTTPS 端口 | `3443` | `3443` |
| `SSL_CERT_PATH` | 证书文件路径 | `./ssl/cert.pem` | `/etc/letsencrypt/.../fullchain.pem` |
| `SSL_KEY_PATH` | 私钥文件路径 | `./ssl/key.pem` | `/etc/letsencrypt/.../privkey.pem` |
| `PORT` | HTTP 端口（重定向用） | `3000` | `3000` |

### 完整 .env 示例

```bash
# ==================== AI 模式 ====================
AI_MODE=s2s

# ==================== RTC 配置 ====================
VOLC_APP_ID=your_app_id
VOLC_APP_KEY=your_app_key

# ==================== API 凭证 ====================
VOLC_ACCESS_KEY=your_access_key
VOLC_SECRET_KEY=your_secret_key

# ==================== S2S 配置 ====================
VOLC_S2S_APP_ID=your_s2s_app_id
VOLC_S2S_TOKEN=your_s2s_token

# ==================== HTTPS 配置 ====================
USE_HTTPS=true
HTTPS_PORT=3443
SSL_CERT_PATH=./ssl/cert.pem
SSL_KEY_PATH=./ssl/key.pem
```

---

## 📊 运行模式

### 模式 1: 纯 HTTP（开发环境）

```bash
USE_HTTPS=false
```

**输出：**
```
╔══════════════════════════════════════════════════════╗
║   English Friend - StartVoiceChat Server             ║
║   (Frontend Creates Room Flow)                       ║
║                                                      ║
║   🔒 Protocol:  HTTP (Insecure)                      ║
║   🌐 Frontend:  http://localhost:3000                ║
╚══════════════════════════════════════════════════════╝
```

### 模式 2: HTTPS + HTTP 重定向（生产环境）

```bash
USE_HTTPS=true
```

**输出：**
```
╔══════════════════════════════════════════════════════╗
║   English Friend - StartVoiceChat Server             ║
║   (Frontend Creates Room Flow) - HTTPS Mode          ║
║                                                      ║
║   🔒 Protocol:  HTTPS                                ║
║   🌐 Frontend:  https://localhost:3443               ║
╚══════════════════════════════════════════════════════╝

🔀 HTTP 重定向：http://localhost:3000 → https://localhost:3443
```

### 模式 3: 降级 HTTP（证书加载失败）

```bash
USE_HTTPS=true
# 但证书文件不存在或无效
```

**输出：**
```
❌ SSL 证书加载失败：ENOENT: no such file or directory
⚠️  降级到 HTTP 模式

╔══════════════════════════════════════════════════════╗
║   English Friend - StartVoiceChat Server             ║
║   (Frontend Creates Room Flow)                       ║
║                                                      ║
║   🔒 Protocol:  HTTP (Insecure)                      ║
║   🌐 Frontend:  http://localhost:3000                ║
╚══════════════════════════════════════════════════════╝
```

---

## 🔍 测试验证

### 检查 HTTPS 是否工作

```bash
# 测试 HTTPS 端点
curl -k https://localhost:3443/health

# 测试 HTTP 重定向
curl -I http://localhost:3000
# 应该返回 301 重定向到 https://localhost:3443
```

### 浏览器访问

1. **开发环境：** `https://localhost:3443`（接受安全警告）
2. **生产环境：** `https://your-domain.com:3443`

---

## ⚠️ 注意事项

### 1. 浏览器安全警告

**开发环境使用自签名证书时：**
- Chrome: 点击"高级" → "继续访问"
- Firefox: 点击"高级" → "接受风险并继续"
- Safari: 点击"显示详细信息" → "访问此网站"

### 2. 防火墙配置

确保开放相应端口：

```bash
# Ubuntu
sudo ufw allow 3443/tcp
sudo ufw allow 3000/tcp  # HTTP 重定向

# CentOS
sudo firewall-cmd --permanent --add-port=3443/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 3. 反向代理（可选）

如果使用 Nginx 反向代理：

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass https://localhost:3443;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# HTTP 重定向
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### 4. 证书续期

**Let's Encrypt 证书有效期 90 天**，需要定期续期：

```bash
# 手动续期
sudo certbot renew

# 自动续期（推荐）
sudo crontab -e
# 添加：0 0 1 * * certbot renew --quiet && systemctl restart english-friend
```

---

## 🆘 故障排查

### 问题 1: 证书加载失败

```bash
# 检查证书文件是否存在
ls -la ssl/

# 检查文件权限
chmod 600 ssl/key.pem
chmod 644 ssl/cert.pem

# 重新生成证书
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes
```

### 问题 2: 端口被占用

```bash
# 查看端口占用
lsof -i :3443
lsof -i :3000

# 杀死占用进程
kill -9 <PID>

# 或修改端口
echo "HTTPS_PORT=3444" >> .env
```

### 问题 3: HTTPS 无法访问

```bash
# 检查防火墙
sudo ufw status
sudo ufw allow 3443/tcp

# 检查服务是否启动
netstat -tlnp | grep 3443

# 查看日志
tail -f server/logs/*.log
```

---

## 📚 相关文档

- [`START.md`](START.md) - 快速启动指南
- [`DEPLOY-TEST.md`](DEPLOY-TEST.md) - 部署与测试
- [`README.md`](README.md) - 项目说明

---

## ✅ 配置检查清单

- [ ] 生成 SSL 证书（自签名或 Let's Encrypt）
- [ ] 配置 `.env` 文件
- [ ] 设置 `USE_HTTPS=true`
- [ ] 确认证书路径正确
- [ ] 启动服务并验证
- [ ] 测试 HTTPS 访问
- [ ] 配置防火墙（生产环境）
- [ ] 设置自动续期（Let's Encrypt）

---

**配置完成！享受安全的 HTTPS 连接！** 🔐✨
