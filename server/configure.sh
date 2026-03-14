#!/bin/bash

# 🌋 火山云 API 配置脚本
# 用途：交互式配置所有 API 凭证

set -e

cd "$(dirname "$0")"

echo "╔══════════════════════════════════════════════════════╗"
echo "║        火山云 API 配置向导 (English Friend)          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# 检查是否存在 .env 文件
if [ -f ".env" ]; then
    echo "⚠️  检测到已存在的 .env 文件"
    read -p "是否覆盖现有配置？(y/N): " overwrite
    if [[ ! $overwrite =~ ^[Yy]$ ]]; then
        echo "✅ 保留现有配置，退出"
        exit 0
    fi
    mv .env .env.backup
    echo "📦 已备份现有配置到 .env.backup"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 配置步骤说明："
echo ""
echo "1. 访问火山引擎：https://www.volcengine.com/"
echo "2. 注册并登录账号"
echo "3. 完成实名认证"
echo "4. 按提示开通各项服务并获取密钥"
echo ""
echo "💡 详细教程：查看 VOLCENGINE-SETUP.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# RTC 配置
echo "🎥 第一步：配置火山云 RTC"
echo "   获取地址：https://console.volcengine.com/rtc → 应用管理"
read -p "   输入 App ID: " VOLC_APP_ID
read -sp "   输入 App Key: " VOLC_APP_KEY
echo ""
echo ""

# 豆包 API 配置
echo ""
echo "🤖 第二步：配置豆包大模型 API"
echo "   获取地址：https://console.volcengine.com/ark → 密钥管理"
read -sp "   输入 Doubao API Key: " DOUBAO_API_KEY
echo ""
echo ""

# ASR 配置（可选）
echo ""
echo "🎤 第三步：配置语音识别 ASR（可选，可稍后配置）"
echo "   获取地址：https://console.volcengine.com/speech → 访问凭证"
read -p "   是否现在配置 ASR？(y/N): " config_asr
if [[ $config_asr =~ ^[Yy]$ ]]; then
    read -sp "   输入 ASR Access Key: " VOLC_ASR_ACCESS_KEY
    echo ""
    read -sp "   输入 ASR Secret Key: " VOLC_ASR_SECRET_KEY
    echo ""
else
    VOLC_ASR_ACCESS_KEY=""
    VOLC_ASR_SECRET_KEY=""
    echo "⏭️  跳过 ASR 配置"
fi
echo ""

# 数字人 API（可选）
echo ""
echo "🎬 第四步：配置数字人 API（可选，可稍后配置）"
read -p "   是否现在配置数字人 API？(y/N): " config_dh
if [[ $config_dh =~ ^[Yy]$ ]]; then
    read -sp "   输入数字人 API Key: " DIGITAL_HUMAN_API_KEY
    echo ""
else
    DIGITAL_HUMAN_API_KEY=""
    echo "⏭️  跳过数字人 API 配置"
fi
echo ""

# 端口配置
echo ""
echo "⚙️  第五步：服务端配置"
read -p "   输入服务端口 (默认 3000): " PORT
PORT=${PORT:-3000}
echo ""

# 生成 .env 文件
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 正在生成配置文件..."

cat > .env << EOF
# ==================== 火山云 RTC 配置 ====================
# 获取地址：https://console.volcengine.com/rtc
VOLC_APP_ID=${VOLC_APP_ID}
VOLC_APP_KEY=${VOLC_APP_KEY}

# ==================== 豆包大模型 API 配置 ====================
# 获取地址：https://console.volcengine.com/ark
DOUBAO_API_KEY=${DOUBAO_API_KEY}

# ==================== 语音识别 ASR 配置 ====================
# 获取地址：https://console.volcengine.com/speech
VOLC_ASR_ACCESS_KEY=${VOLC_ASR_ACCESS_KEY}
VOLC_ASR_SECRET_KEY=${VOLC_ASR_SECRET_KEY}

# ==================== 数字人 API（可选） ====================
# 获取地址：https://console.volcengine.com/digital-human
DIGITAL_HUMAN_API_KEY=${DIGITAL_HUMAN_API_KEY}

# ==================== 服务端配置 ====================
PORT=${PORT}
NODE_ENV=development

# ==================== WebSocket 配置 ====================
WS_HEARTBEAT_INTERVAL=30000
WS_MAX_CONNECTIONS=1000
EOF

echo "✅ 配置文件生成成功：.env"
echo ""

# 验证配置
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 验证配置..."
echo ""

# 检查必填项
missing_config=0

if [ -z "$VOLC_APP_ID" ] || [ "$VOLC_APP_ID" = "your_app_id_here" ]; then
    echo "❌ VOLC_APP_ID 未配置"
    missing_config=1
else
    echo "✅ VOLC_APP_ID 已配置"
fi

if [ -z "$DOUBAO_API_KEY" ] || [ "$DOUBAO_API_KEY" = "your_doubao_api_key_here" ]; then
    echo "❌ DOUBAO_API_KEY 未配置"
    missing_config=1
else
    echo "✅ DOUBAO_API_KEY 已配置"
fi

echo ""

if [ $missing_config -eq 1 ]; then
    echo "⚠️  检测到未配置的必填项"
    echo "💡 请编辑 .env 文件补充配置，然后运行：node index.js"
else
    echo "✅ 所有必填配置项已完成"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🚀 下一步："
    echo ""
    echo "1. 启动服务："
    echo "   node index.js"
    echo ""
    echo "2. 测试 API："
    echo "   curl http://localhost:${PORT}/health"
    echo ""
    echo "3. 打开前端："
    echo "   浏览器访问 ../index.html"
    echo ""
fi

echo "💡 详细文档：VOLCENGINE-SETUP.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
