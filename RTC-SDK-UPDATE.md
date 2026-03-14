# 🔧 RTC SDK API 更新说明

**更新日期：** 2026-03-14  
**参考文档：** [火山引擎 RTC Web SDK 官方文档](https://www.volcengine.com/docs/6348/69865)

---

## 📋 主要变更

根据火山引擎 RTC Web SDK 官方文档，更新了项目中的 RTC 客户端代码，使用官方推荐的 API。

### 全局对象

**旧：** `window.VE_RTC`  
**新：** `window.VERTC` ✅

```javascript
// 旧代码
const client = window.VE_RTC.createClient({...});

// 新代码
const engine = window.VERTC.createEngine(appId);
```

---

## 🔄 API 对照表

| 功能 | 旧 API | 新 API（官方） |
|------|--------|---------------|
| 创建实例 | `createClient()` | `createEngine(appId)` |
| 加入房间 | `client.join({...})` | `engine.joinRoom(token, roomId, {...}, {...})` |
| 开启采集 | `createAudioTrack()` | `startAudioCapture()` |
| 发布流 | `client.publish({...})` | 自动发布（`isAutoPublish: true`） |
| 订阅流 | `client.subscribe(user, mediaType)` | `setRemoteVideoPlayer()` |
| 离开房间 | `client.leave()` | `engine.leaveRoom()` |
| 事件监听 | `client.on('user-published', ...)` | `engine.on(VERTC.events.onUserPublishStream, ...)` |

---

## 📝 代码变更详解

### 1. 初始化引擎

```javascript
// ✅ 新代码
async init() {
    if (!window.VERTC) {
        throw new Error('RTC SDK not loaded');
    }
    
    this.engine = window.VERTC.createEngine(this.appId);
    
    // 监听官方事件
    this.engine.on(VERTC.events.onUserPublishStream, this.handleUserPublishStream.bind(this));
    this.engine.on(VERTC.events.onUserUnPublishStream, this.handleUserUnpublishStream.bind(this));
    this.engine.on(VERTC.events.onUserJoin, this.handleUserJoin.bind(this));
    this.engine.on(VERTC.events.onUserLeave, this.handleUserLeave.bind(this));
}
```

### 2. 加入房间

```javascript
// ✅ 新代码
async join(roomId, token, uid, options = {}) {
    this.localUserId = uid;
    
    await this.engine.joinRoom(
        token,
        roomId,
        { userId: uid },
        {
            isAutoPublish: true,
            isAutoSubscribeAudio: true,
            isAutoSubscribeVideo: true,
            roomProfileType: VERTC.RoomProfileType.communication
        }
    );
    
    // 开启本地采集
    if (options.publishAudio !== false) {
        await this.startLocalCapture();
    }
}
```

### 3. 开启本地采集

```javascript
// ✅ 新代码
async startLocalCapture() {
    await this.engine.startAudioCapture();
    await this.engine.startVideoCapture();
    
    // 设置本地播放器
    this.engine.setLocalVideoPlayer(
        VERTC.StreamIndex.STREAM_INDEX_MAIN,
        { renderDom: 'local-player' }
    );
}
```

### 4. 订阅远端流

```javascript
// ✅ 新代码
async handleUserPublishStream(e) {
    const { userId, mediaType } = e;
    
    // 设置远端视频播放器
    await this.engine.setRemoteVideoPlayer(
        VERTC.StreamIndex.STREAM_INDEX_MAIN,
        {
            userId: userId,
            renderDom: document.querySelector('#avatar-video-container')
        }
    );
}
```

### 5. 离开房间

```javascript
// ✅ 新代码
async leave() {
    await this.stopLocalCapture();
    await this.engine.leaveRoom();
}
```

---

## 🎯 事件常量

使用官方事件常量：

```javascript
VERTC.events.onUserPublishStream      // 用户发布流
VERTC.events.onUserUnPublishStream    // 用户取消发布
VERTC.events.onUserJoin               // 用户加入
VERTC.events.onUserLeave              // 用户离开
```

---

## 📦 类型常量

```javascript
VERTC.StreamIndex.STREAM_INDEX_MAIN   // 主流
VERTC.MediaType.AUDIO                 // 音频
VERTC.MediaType.VIDEO                 // 视频
VERTC.RoomProfileType.communication   // 通信模式
```

---

## 🌐 CDN 引用

```html
<!-- 官方 CDN -->
<script src="https://lf3-beecdn.bceapps.com/obj/vcloudfe/volcengine-rtc-web-sdk/@volcengine/rtc/latest/index.min.js"></script>
```

加载后全局对象：`window.VERTC`

---

## ✅ 优势

1. **官方支持** - 使用官方推荐 API，获得持续支持
2. **更简洁** - 自动发布/订阅，减少样板代码
3. **更稳定** - 遵循官方最佳实践
4. **易维护** - 与官方文档保持一致

---

## 🧪 测试建议

1. **基础通话测试**
   - 加入房间
   - 开启音视频采集
   - 订阅远端流
   - 离开房间

2. **错误处理测试**
   - SDK 加载失败
   - 房间不存在
   - Token 过期
   - 设备权限拒绝

3. **性能测试**
   - 长时间通话
   - 多用户并发
   - 网络切换

---

## 📚 相关文档

- [开通服务](https://www.volcengine.com/docs/6348/69865)
- [Web SDK 集成](https://www.volcengine.com/docs/6348/75707)
- [API 详情](https://www.volcengine.com/docs/6348/104478)
- [事件列表](https://www.volcengine.com/docs/6348/104479)
- [错误码](https://www.volcengine.com/docs/6348/104480)

---

## ⚠️ 注意事项

1. **全局对象** - 确保使用 `window.VERTC`，不是 `window.VE_RTC`
2. **初始化顺序** - 先 `createEngine`，再 `joinRoom`
3. **自动发布** - 设置 `isAutoPublish: true` 后无需手动发布
4. **设备权限** - 首次使用需要用户授权麦克风/摄像头

---

**更新完成！** 🎉
