# ☁️ 阿里云百炼平台配置指南

**更新日期：** 2026-03-14  
**目标：** 将英语启蒙应用迁移到阿里云百炼平台

---

## 📋 需要的凭证清单

| 服务 | 用途 | 模型/服务 | 费用 |
|------|------|----------|------|
| 百炼 API Key | AI 对话生成 | Qwen-Max / Qwen-Plus | 按 tokens |
| 百炼 ASR | 实时语音识别 | qwen3-asr-flash-realtime | 按时长 |
| DashScope SDK | 语音合成 TTS | CosyVoice / Sambert | 按字符 |

---

## 🔑 1. 阿里云百炼平台配置

### 步骤 1：注册阿里云账号

1. 访问：https://www.aliyun.com/
2. 点击右上角"免费注册"
3. 完成实名认证（个人或企业）

---

### 步骤 2：开通百炼服务

1. 访问百炼控制台：https://bailian.console.aliyun.com/
2. 点击"**开通服务**"
3. 同意服务协议并开通

---

### 步骤 3：获取 API Key

1. 在左侧菜单选择"**API-KEY 管理**"
2. 点击"**创建新的 API-KEY**"
3. 填写信息：
   ```
   名称：EnglishFriend
   有效期：永久
   ```
4. 点击"创建"
5. **立即复制 API Key**（只显示一次！）

> ⚠️ **重要：** API Key 只显示一次，丢失需要重新创建

---

### 步骤 4：确认模型可用性

在百炼控制台的"**模型广场**"确认以下模型可用：

- ✅ **Qwen-Max** - 最强对话模型（推荐用于 AI 对话）
- ✅ **Qwen-Plus** - 性价比模型
- ✅ **qwen3-asr-flash-realtime** - 实时语音识别

---

## 🎤 2. 实时语音识别 ASR 配置

### 模型信息

**模型名称：** qwen3-asr-flash-realtime

**特性：**
- 支持实时音频流输入（WebSocket）
- 16kHz PCM 格式
- 支持中英文及方言
- 支持情感识别（7 种情绪）
- 内置 VAD（语音活动检测）

**接入点：**
- 中国内地：`wss://dashscope.aliyuncs.com/api-ws/v1/realtime`（北京）
- 国际：`wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime`（新加坡）

---

### 安装 DashScope SDK

```bash
# Python（服务端 ASR 处理）
pip install dashscope

# 或 Node.js（使用 WebSocket 原生连接）
npm install websocket-client
```

---

### ASR 调用示例（Python）

```python
import dashscope
from dashscope.audio.qwen_omni import OmniRealtimeConversation, TranscriptionParams

# 配置 API Key
dashscope.api_key = "sk-xxx"

# 创建实时连接
conversation = OmniRealtimeConversation(
    model='qwen3-asr-flash-realtime',
    url='wss://dashscope.aliyuncs.com/api-ws/v1/realtime'
)

conversation.connect()

# 配置转录参数
transcription_params = TranscriptionParams(
    language='en',  # 英语识别
    sample_rate=16000,
    input_audio_format='pcm'
)

conversation.update_session(
    output_modalities=['text'],
    enable_input_audio_transcription=True,
    transcription_params=transcription_params
)

# 发送音频块（Base64 编码）
conversation.append_audio(audio_b64_chunk)

# 监听回调获取识别结果
```

---

### ASR 调用示例（Node.js WebSocket）

```javascript
const WebSocket = require('ws');

const ws = new WebSocket(
    'wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen3-asr-flash-realtime',
    {
        headers: {
            'Authorization': 'Bearer ' + process.env.DASHSCOPE_API_KEY,
            'OpenAI-Beta': 'realtime=v1'
        }
    }
);

ws.on('open', () => {
    // 发送会话配置
    ws.send(JSON.stringify({
        type: 'session.update',
        session: {
            input_audio_format: 'pcm',
            sample_rate: 16000,
            input_audio_transcription: {
                language: 'en'
            },
            turn_detection: {
                type: 'server_vad',
                threshold: 0.0,
                silence_duration_ms: 400
            }
        }
    }));
});

ws.on('message', (data) => {
    const event = JSON.parse(data);
    
    if (event.type === 'conversation.item.input_audio_transcription.text') {
        console.log('实时识别:', event.text);
    }
    
    if (event.type === 'conversation.item.input_audio_transcription.completed') {
        console.log('最终识别:', event.transcript);
    }
});

// 发送音频
function sendAudio(audioB64) {
    ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: audioB64
    }));
}
```

---

## 💰 费用说明

### Qwen 模型（对话）

| 模型 | 输入价格 | 输出价格 |
|------|---------|---------|
| Qwen-Max | ¥0.04/千 tokens | ¥0.12/千 tokens |
| Qwen-Plus | ¥0.004/千 tokens | ¥0.012/千 tokens |
| Qwen-Turbo | ¥0.002/千 tokens | ¥0.006/千 tokens |

**估算：**
- 每次对话约 200 tokens
- 每天 500 次对话 = 100,000 tokens/天
- Qwen-Plus 月费用：约 ¥50/月

### ASR（语音识别）

| 服务 | 价格 |
|------|------|
| qwen3-asr-flash-realtime | ¥0.02/分钟 |

**估算：**
- 每天 500 个孩子，每人 5 分钟 = 2,500 分钟/天
- 月费用：2,500 × 30 × ¥0.02 = ¥1,500/月

---

## 📝 配置到项目

### 更新 .env 文件

```bash
cd english-roleplay/server

cat > .env << EOF
# ==================== 阿里云百炼配置 ====================
DASHSCOPE_API_KEY=sk-xxx

# ==================== 模型选择 ====================
LLM_MODEL=qwen-plus
ASR_MODEL=qwen3-asr-flash-realtime

# ==================== 服务端配置 ====================
PORT=3000
USE_HTTPS=false
EOF
```

---

## 🧪 测试 API

### 测试 Qwen 对话

```bash
curl -X POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-xxx" \
  -d '{
    "model": "qwen-plus",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### 测试 ASR WebSocket

```bash
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen3-asr-flash-realtime', {
  headers: {'Authorization': 'Bearer sk-xxx'}
});
ws.on('open', () => console.log('Connected!'));
ws.on('message', (d) => console.log(d.toString()));
"
```

---

## ✅ 迁移检查清单

- [ ] 注册阿里云账号
- [ ] 开通百炼服务
- [ ] 创建 API Key
- [ ] 确认 Qwen 模型可用
- [ ] 确认 ASR 模型可用
- [ ] 更新 .env 配置
- [ ] 修改服务端代码（index.js）
- [ ] 修改 WebSocket 客户端（websocket-client.js）
- [ ] 测试对话 API
- [ ] 测试 ASR 实时识别
- [ ] 验证完整流程

---

**迁移完成后，享受阿里云百炼的高性能服务！** 🚀
