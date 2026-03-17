#!/bin/bash

# English-Roleplay 快速启动脚本
# 单服务模式（pi-agent 已集成到主服务）

set -e

echo "🚀 English-Roleplay 快速启动"
echo "=============================="
echo ""

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，从 .env.example 复制..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件"
    echo "❗ 请编辑 .env 文件并设置 LLM_API_KEY"
    echo ""
fi

# 检查 LLM_API_KEY（如果使用 custom 模式）
if grep -q "AI_MODE=custom" .env; then
    if ! grep -q "LLM_API_KEY=sk-" .env && ! grep -q "LLM_BASE_URL=" .env; then
        echo "❌ 错误：AI_MODE=custom 但未设置 LLM_API_KEY 或 LLM_BASE_URL"
        echo ""
        echo "请编辑 .env 文件并设置:"
        echo "  LLM_API_KEY=your-api-key-here"
        echo ""
        echo "或使用本地 Ollama:"
        echo "  LLM_BASE_URL=http://localhost:11434/v1"
        echo ""
        exit 1
    fi
fi

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
    echo "✅ 依赖安装完成"
    echo ""
fi

# 启动服务
echo "📋 启动方式选择:"
echo ""
echo "  1) 开发模式 (自动重启)"
echo "  2) 生产模式 (前台运行)"
echo "  3) 后台运行 (PM2)"
echo "  4) 退出"
echo ""
read -p "请选择 [1-4]: " choice

case $choice in
    1)
        echo ""
        echo "🔧 启动开发模式..."
        echo ""
        npm run dev
        ;;
        
    2)
        echo ""
        echo "🔧 启动生产模式..."
        echo ""
        npm start
        ;;
        
    3)
        echo ""
        echo "📦 检查 PM2..."
        if ! command -v pm2 &> /dev/null; then
            echo "❌ PM2 未安装，正在安装..."
            npm install -g pm2
        fi
        
        echo ""
        echo "🔧 启动后台运行..."
        
        # 停止旧进程
        pm2 stop english-roleplay 2>/dev/null || true
        pm2 delete english-roleplay 2>/dev/null || true
        
        # 启动服务
        pm2 start index-join-ai.js --name english-roleplay
        
        echo ""
        echo "✅ 服务已启动!"
        echo ""
        echo "查看状态：pm2 status"
        echo "查看日志：pm2 logs english-roleplay"
        echo "监控：pm2 monit"
        echo "停止：pm2 stop english-roleplay"
        echo ""
        echo "访问地址：http://localhost:3000"
        echo ""
        ;;
        
    4)
        echo ""
        echo "👋 退出"
        exit 0
        ;;
        
    *)
        echo ""
        echo "❌ 无效选择"
        exit 1
        ;;
esac
