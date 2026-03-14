// TTS 服务 - 语音合成
// 使用 Edge TTS（免费、高质量、支持多语言）

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// 角色声音映射
const VOICE_MAP = {
    emma: { name: 'en-US-JennyNeural', rate: '+0%', pitch: '+10Hz' }, // 温柔女老师
    tommy: { name: 'en-US-GuyNeural', rate: '+10%', pitch: '+20Hz' }, // 活泼小男孩
    lily: { name: 'en-US-AriaNeural', rate: '+5%', pitch: '+15Hz' }, // 活泼小姐姐
    mike: { name: 'en-US-DavisNeural', rate: '+0%', pitch: '-10Hz' }, // 阳光男教练
    rose: { name: 'en-US-JaneNeural', rate: '-10%', pitch: '-20Hz' } // 慈祥老奶奶
};

/**
 * 使用 Edge TTS 合成语音
 * @param {string} text - 要合成的文本
 * @param {string} character - 角色 ID
 * @returns {Promise<Buffer>} - PCM 音频数据
 */
async function synthesizeSpeech(text, character = 'emma') {
    const voice = VOICE_MAP[character] || VOICE_MAP.emma;
    
    // 生成临时文件路径
    const tempFile = path.join(__dirname, `tts_${Date.now()}.mp3`);
    const pcmFile = path.join(__dirname, `tts_${Date.now()}.pcm`);
    
    return new Promise((resolve, reject) => {
        // 使用 edge-tts 命令行工具
        // 需要先安装：pip install edge-tts
        const command = `edge-tts --voice "${voice.name}" --text "${escapeText(text)}" --write-media "${tempFile}"`;
        
        exec(command, async (error, stdout, stderr) => {
            if (error) {
                console.error('❌ TTS error:', error);
                reject(new Error(`Edge TTS failed: ${error.message}`));
                return;
            }
            
            try {
                // 将 MP3 转换为 PCM（16kHz, 16-bit, 单声道）
                const ffmpegCommand = `ffmpeg -i "${tempFile}" -f s16le -acodec pcm_s16le -ar 16000 -ac 1 "${pcmFile}" -loglevel quiet`;
                
                await execPromise(ffmpegCommand);
                
                // 读取 PCM 数据
                const pcmBuffer = fs.readFileSync(pcmFile);
                
                // 清理临时文件
                setTimeout(() => {
                    try {
                        fs.unlinkSync(tempFile);
                        fs.unlinkSync(pcmFile);
                    } catch (e) {
                        // ignore
                    }
                }, 1000);
                
                resolve(pcmBuffer);
            } catch (convertError) {
                console.error('❌ FFmpeg convert error:', convertError);
                reject(convertError);
            }
        });
    });
}

/**
 * 流式 TTS 合成（返回可读流）
 * @param {string} text - 要合成的文本
 * @param {string} character - 角色 ID
 * @returns {ReadableStream} - PCM 数据流
 */
async function synthesizeSpeechStream(text, character = 'emma') {
    const voice = VOICE_MAP[character] || VOICE_MAP.emma;
    
    // 创建可读流
    const { Readable } = require('stream');
    const stream = new Readable({
        read() {}
    });
    
    // 异步生成 TTS 并推送到流
    (async () => {
        try {
            const pcmBuffer = await synthesizeSpeech(text, character);
            stream.push(pcmBuffer);
            stream.push(null); // 结束流
        } catch (error) {
            stream.emit('error', error);
        }
    })();
    
    return stream;
}

/**
 * 转义文本中的特殊字符
 */
function escapeText(text) {
    return text.replace(/"/g, '\\"')
               .replace(/\$/g, '\\$')
               .replace(/`/g, '\\`');
}

/**
 * exec Promise 版本
 */
function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

/**
 * 测试 TTS 功能
 */
async function testTTS() {
    console.log('🎤 Testing TTS...');
    
    try {
        const text = 'Hello! I am Miss Emma. Let\'s learn English together!';
        const pcmBuffer = await synthesizeSpeech(text, 'emma');
        
        console.log(`✅ TTS test passed! Generated ${pcmBuffer.length} bytes PCM`);
        console.log(`   Sample rate: 16kHz, Format: 16-bit PCM`);
        
        return true;
    } catch (error) {
        console.error('❌ TTS test failed:', error.message);
        console.log('\n💡 请确保已安装 edge-tts:');
        console.log('   pip install edge-tts');
        console.log('\n或者使用备用方案：');
        console.log('   1. 阿里云 CosyVoice');
        console.log('   2. 火山引擎 TTS');
        console.log('   3. Google TTS');
        
        return false;
    }
}

module.exports = {
    synthesizeSpeech,
    synthesizeSpeechStream,
    VOICE_MAP,
    testTTS
};
