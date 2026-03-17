#!/bin/bash

# English-Roleplay 快速启动脚本
# 包含 pi-agent-real (真实 LLM) 和主服务

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

# 检查 LLM_API_KEY
if ! grep -q "LLM_API_KEY=sk-" .env; then
    echo "❌ 错误：未设置 LLM_API_KEY"
    echo ""
    echo "请编辑 .env 文件并设置:"
    echo "  LLM_API_KEY=your-api-key-here"
    echo ""
    echo "获取 API Key:"
    echo "  - Anthropic: https://console.anthropic.com/"
    echo "  - OpenAI: https://platform.openai.com/api-keys"
    echo "  - Google: https://makersuite.google.com/app/apikey"
    echo ""
    exit 1
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
echo "  2) 生产模式 (后台运行)"
echo "  3) 仅测试 pi-agent-real"
echo "  4) 退出"
echo ""
read -p "请选择 [1-4]: " choice

case $choice in
    1)
        echo ""
        echo "🔧 启动开发模式..."
        echo ""
        
        # 启动 pi-agent-real
        echo "🤖 启动 pi-agent-real (终端 1)..."
        npm run start:pi-agent &
        PI_AGENT_PID=$!
        
        sleep 3
        
        # 启动主服务
        echo "🌐 启动主服务 (终端 2)..."
        npm run dev &
        MAIN_PID=$!
        
        echo ""
        echo "✅ 服务已启动!"
        echo ""
        echo "访问地址：http://localhost:3000"
        echo "pi-agent 健康检查：http://localhost:3001/health"
        echo ""
        echo "按 Ctrl+C 停止所有服务"
        echo ""
        
        # 等待中断信号
        trap "kill $PI_AGENT_PID $MAIN_PID 2>/dev/null; echo ''; echo '👋 服务已停止'; exit 0" INT
        wait
        ;;
        
    2)
        echo ""
        echo "📦 检查 PM2..."
        if ! command -v pm2 &> /dev/null; then
            echo "❌ PM2 未安装，正在安装..."
            npm install -g pm2
        fi
        
        echo ""
        echo "🔧 启动生产模式..."
        
        # 停止旧进程
        pm2 stop all 2>/dev/null || true
        pm2 delete all 2>/dev/null || true
        
        # 启动 pi-agent-real
        pm2 start pi-agent-real.js --name pi-agent
        
        sleep 3
        
        # 启动主服务
        pm2 start index-join-ai.js --name main-server
        
        echo ""
        echo "✅ 服务已启动!"
        echo ""
        echo "查看状态：pm2 status"
        echo "查看日志：pm2 logs"
        echo "监控：pm2 monit"
        echo "停止：pm2 stop all"
        echo ""
        echo "访问地址：http://localhost:3000"
        echo ""
        ;;
        
    3)
        echo ""
        echo "🧪 启动 pi-agent-real 测试模式..."
        echo ""
        
        # 启动 pi-agent-real
        npm run start:pi-agent &
        PI_AGENT_PID=$!
        
        sleep 3
        
        # 测试健康检查
        echo ""
        echo "📊 健康检查..."
        curl -s http://localhost:3001/health | jq . || echo "⚠️  jq 未安装，跳过格式化"
        
        echo ""
        echo "✅ pi-agent-real 已启动"
        echo ""
        echo "测试接口：curl http://localhost:3001/health"
        echo "按 Ctrl+C 停止服务"
        echo ""
        
        trap "kill $PI_AGENT_PID 2>/dev/null; echo ''; echo '👋 服务已停止'; exit 0" INT
        wait
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
