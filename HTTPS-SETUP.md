# 🔒 HTTPS 配置指南

**更新日期：** 2026-03-13  
**版本：** v2.2 (HTTPS 支持)

---

## ⚡ 快速启用

### 方式 1：自签名证书（开发用）

```bash
cd server

# 1. 编辑 .env
cat >> .env << EOF
USE_HTTPS=true
HTTPS_PORT=3443
EOF

# 2. 启动服务
npm start

# 3. 访问
https://localhost:3443
```

**注意：** 浏览器会提示证书不安全，点击"继续访问"即可（开发环境正常）

---

### 方式 2：Let's Encrypt 免费证书（生产用）

```bash
# 1. 安装 Certbot
sudo apt-get install certbot

# 2. 获取证书
sudo certbot certonly --standalone -d yourdomain.com

# 3. 配置 .env
cat >> .env << EOF
USE_HTTPS=true
HTTPS_PORT=443
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
EOF

# 4. 启动服务
npm start

# 5. 访问
https://yourdomain.com
```

---

## 📋 配置选项

### .env 文件配置

```bash
# 是否启用 HTTPS
USE_HTTPS=true          # true 或 false

# HTTPS 端口
HTTPS_PORT=3443         # 默认 3443

# SSL 证书路径（可选）
# 不配置则自动生成自签名证书
SSL_CERT_PATH=./ssl/cert.pem
SSL_KEY_PATH=./ssl/key.pem
```

---

## 🔑 证书类型

### 1. 自签名证书（开发）

**优点：**
- ✅ 免费
- ✅ 自动生成
- ✅ 适合本地开发

**缺点：**
- ❌ 浏览器提示不安全
- ❌ 不适合生产环境

**生成方式：**
- 启动时自动生成
- 保存在 `./ssl/` 目录

---

### 2. Let's Encrypt（生产）

**优点：**
- ✅ 免费
- ✅ 浏览器信任
- ✅ 自动续期

**缺点：**
- ⚠️ 需要域名
- ⚠️ 90 天有效期（可自动续期）

**申请方式：**
```bash
sudo certbot certonly --standalone -d yourdomain.com
```

---

### 3. 商业证书（生产）

**提供商：**
- DigiCert
- Comodo
- GlobalSign

**优点：**
- ✅ 高信任度
- ✅ 支持企业验证
- ✅ 保险赔付

**缺点：**
- 💰 需要付费（¥500-5000/年）

---

## 🚀 使用方式

### 开发环境

```bash
# .env 配置
USE_HTTPS=true
HTTPS_PORT=3443

# 启动
npm start

# 访问
https://localhost:3443
```

**浏览器提示：**
- Chrome: "您的连接不是私密连接"
- 解决：点击"高级" → "继续访问"

---

### 生产环境

```bash
# .env 配置
USE_HTTPS=true
HTTPS_PORT=443
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem

# 启动
npm start

# 访问
https://yourdomain.com
```

---

## 🔧 Nginx 反向代理（推荐）

如果用 Nginx 做反向代理：

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**优点：**
- ✅ Node.js 只需处理 HTTP
- ✅ Nginx 处理 HTTPS 更高效
- ✅ 支持多个服务

---

## 📊 HTTP vs HTTPS 对比

| 特性 | HTTP | HTTPS |
|------|------|-------|
| 协议 | http:// | https:// |
| 端口 | 3000 | 3443 |
| 加密 | ❌ 无 | ✅ SSL/TLS |
| 安全 | ❌ 明文传输 | ✅ 加密传输 |
| 浏览器 | ✅ 无提示 | ⚠️ 自签名有提示 |
| 适用 | 本地开发 | 生产环境 |

---

## 🧪 测试 HTTPS

### 1. 检查服务启动

```bash
curl -k https://localhost:3443/health

# -k 参数：忽略证书验证（自签名需要）
```

**预期响应：**
```json
{
    "status": "ok",
    "frontend": "served"
}
```

---

### 2. 检查 WebSocket

```javascript
// 浏览器控制台
const ws = new WebSocket('wss://localhost:3443');

ws.onopen = () => {
    console.log('✅ WebSocket Secure connected');
};
```

---

### 3. 检查证书

```bash
# 查看证书信息
openssl s_client -connect localhost:3443 </dev/null 2>/dev/null | openssl x509 -noout -dates
```

**输出：**
```
notBefore=Mar 13 00:00:00 2026 GMT
notAfter=Mar 13 00:00:00 2027 GMT
```

---

## 🐛 常见问题

### Q1: 端口被占用

```bash
# 错误：Error: listen EADDRINUSE: address already in use :::3443

# 解决：换端口
HTTPS_PORT=3444 npm start
```

---

### Q2: 证书路径错误

```bash
# 错误：Error: ENOENT: no such file or directory

# 解决：
# 1. 检查路径是否正确
# 2. 或使用自签名证书（不配置路径）
```

---

### Q3: 浏览器无法访问

```bash
# 检查防火墙
sudo ufw allow 3443/tcp

# 检查服务是否运行
netstat -tlnp | grep 3443
```

---

### Q4: 自签名证书不信任

**Chrome:**
1. 访问 `chrome://settings/security`
2. 管理证书
3. 导入自签名证书到"受信任的根证书颁发机构"

**Firefox:**
1. 访问 `about:preferences#privacy`
2. 查看证书
3. 导入证书

---

## 💡 最佳实践

### 开发环境

```bash
# .env
USE_HTTPS=true
HTTPS_PORT=3443
# 不配置 SSL_CERT_PATH，使用自签名
```

---

### 生产环境

```bash
# .env
USE_HTTPS=true
HTTPS_PORT=443
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem

# 使用 PM2 管理
pm2 start index.js --name english-friend
```

---

### 自动续期 Let's Encrypt

```bash
# 添加定时任务
sudo crontab -e

# 每月 1 号凌晨 3 点续期
0 3 1 * * certbot renew --quiet && systemctl reload nginx
```

---

## 📝 配置检查清单

- [ ] 确定是否启用 HTTPS
- [ ] 选择证书类型（自签名/Let's Encrypt/商业）
- [ ] 配置 .env 文件
- [ ] 准备证书文件（如需要）
- [ ] 启动服务
- [ ] 测试访问
- [ ] 测试 WebSocket
- [ ] 配置防火墙

---

## 🎯 快速命令

```bash
# 启用 HTTPS（开发）
echo "USE_HTTPS=true" >> .env
npm start

# 访问
open https://localhost:3443
```

---

**配置完成，安全连接！** 🔒🐾
