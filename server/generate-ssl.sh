#!/bin/bash
# 生成自签名 SSL 证书（开发环境使用）
# 使用方法：./generate-ssl.sh

set -e

SSL_DIR="./ssl"
CERT_FILE="$SSL_DIR/cert.pem"
KEY_FILE="$SSL_DIR/key.pem"

echo "🔐 生成自签名 SSL 证书..."
echo

# 创建 SSL 目录
mkdir -p "$SSL_DIR"

# 生成证书
openssl req -x509 -newkey rsa:4096 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -days 365 \
    -nodes \
    -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"

echo
echo "✅ 证书生成成功！"
echo
echo "📁 证书位置:"
echo "   证书：$CERT_FILE"
echo "   私钥：$KEY_FILE"
echo
echo "🔧 使用方法:"
echo "   1. 编辑 .env 文件，设置:"
echo "      USE_HTTPS=true"
echo "      HTTPS_PORT=3443"
echo
echo "   2. 启动服务:"
echo "      npm start"
echo
echo "   3. 访问应用:"
echo "      https://localhost:3443"
echo
echo "⚠️  注意：浏览器会显示安全警告，点击\"继续访问\"即可（仅限开发环境）"
echo
