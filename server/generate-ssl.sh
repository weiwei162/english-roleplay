#!/bin/bash

# 生成自签名 SSL 证书（用于开发测试）

SSL_DIR="./ssl"
CERT_FILE="$SSL_DIR/cert.pem"
KEY_FILE="$SSL_DIR/key.pem"

echo "🔒 Generating self-signed SSL certificates..."

# 创建目录
mkdir -p $SSL_DIR

# 生成证书（2 年有效期）
openssl req -x509 -nodes -days 730 -newkey rsa:2048 \
    -keyout $KEY_FILE \
    -out $CERT_FILE \
    -subj "/C=CN/ST=Beijing/L=Beijing/O=English Friend/OU=Dev/CN=localhost" \
    2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Certificates generated successfully!"
    echo "📁 Certificate: $CERT_FILE"
    echo "🔑 Private Key: $KEY_FILE"
    echo ""
    echo "🚀 To enable HTTPS:"
    echo "   Add to .env:"
    echo "   USE_HTTPS=true"
    echo "   HTTPS_PORT=3443"
    echo "   SSL_CERT_PATH=$CERT_FILE"
    echo "   SSL_KEY_PATH=$KEY_FILE"
else
    echo "❌ Failed to generate certificates"
    echo "💡 Make sure openssl is installed"
fi
