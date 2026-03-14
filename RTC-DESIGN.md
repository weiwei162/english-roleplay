# 🎥 English Friend RTC - 实时音视频版
## 技术方案设计

**版本：** 2.0 (RTC)  
**日期：** 2026-03-12  
**核心升级：** 从动画角色 → 真人实时视频

---

## 📋 目录

1. [产品概述](#产品概述)
2. [系统架构](#系统架构)
3. [火山 RTC 集成方案](#火山 rtc 集成方案)
4. [功能设计](#功能设计)
5. [技术实现](#技术实现)
6. [运营流程](#运营流程)
7. [成本估算](#成本估算)

---

## 产品概述

### 核心概念

**传统版本（v1.0）**
- ❌ 预录动画
- ❌ 固定对话
- ❌ 无实时互动

**RTC 版本（v2.0）**
- ✅ 真人实时视频
- ✅ 自由对话
- ✅ 情感连接
- ✅ 个性化教学

### 使用场景

```
┌─────────────────────────────────────┐
│  孩子端（网页/APP）                  │
│  ┌─────────────────────────────┐    │
│  │  👩‍🏫 Miss Emma（真人视频）  │    │
│  │                              │    │
│  │  "Hi Tommy! How are you?"   │    │
│  │                              │    │
│  │  [孩子看到老师的实时视频]    │    │
│  └─────────────────────────────┘    │
│  🎤 [麦克风] 📹 [摄像头]            │
└─────────────────────────────────────┘
           ↕ RTC 实时连接
┌─────────────────────────────────────┐
│  老师端（PC/Mac）                    │
│  ┌─────────────────────────────┐    │
│  │  👦 Tommy（孩子视频）        │    │
│  │                              │    │
│  │  [老师看到孩子的实时视频]    │    │
│  │                              │    │
│  │  💬 提示词："问今天吃了什么"  │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

## 系统架构

### 整体架构

```
┌──────────────────────────────────────────────────────┐
│                    火山引擎 RTC 云服务                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  信令服务器  │  │  媒体服务器  │  │  录制服务   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└──────────────────────────────────────────────────────┘
           ↕                    ↕
┌──────────────────┐    ┌──────────────────┐
│   孩子端（Web）   │    │   老师端（Web）   │
│                  │    │                  │
│ - 火山 RTC SDK   │    │ - 火山 RTC SDK   │
│ - 视频播放       │    │ - 视频采集       │
│ - 语音识别       │    │ - 提词器         │
│ - 互动 UI        │    │ - 角色管理       │
└──────────────────┘    └──────────────────┘
           ↕                    ↕
┌──────────────────────────────────────────────────────┐
│                  业务后端（可选）                     │
│  - 用户认证  - 房间管理  - 课程安排  - 录制存储      │
└──────────────────────────────────────────────────────┘
```

### 技术栈

| 模块 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React/Vue3 | 现代化 UI 框架 |
| RTC SDK | 火山引擎 RTC Web SDK | 实时音视频 |
| 语音识别 | Web Speech API | 孩子语音转文字 |
| 语音合成 | Web Speech API | TTS 辅助 |
| 后端（可选）| Node.js/Python | 房间管理、信令 |
| 部署 | Vercel/Netlify | 静态托管 |

---

## 火山 RTC 集成方案

### 1. 准备工作

#### 1.1 开通服务
1. 登录火山引擎控制台：https://console.volcengine.com
2. 开通"实时音视频 RTC"服务
3. 创建应用，获取 AppID

#### 1.2 获取凭证
```javascript
const config = {
  appId: 'YOUR_APP_ID',        // 应用 ID
  token: 'YOUR_ROOM_TOKEN',    // 房间 Token（服务端生成）
  roomId: 'room_12345'         // 房间号
};
```

### 2. 前端集成

#### 2.1 安装 SDK
```bash
npm install ve-rtc
```

#### 2.2 基础代码结构
```javascript
import { createClient } from 've-rtc';

// 初始化 RTC 客户端
const client = createClient({
  appId: 'YOUR_APP_ID',
  mode: 'live', // live: 直播模式，rtc: 通话模式
  codec: 'vp8'
});

// 加入房间
await client.join({
  roomId: 'room_12345',
  token: 'YOUR_TOKEN',
  uid: 'child_001' // 用户 ID
});

// 发布本地流（孩子端：摄像头 + 麦克风）
const localTracks = await client.createLocalTracks({
  audio: true,
  video: true
});
await client.publish(localTracks);

// 订阅远端流（老师视频）
client.on('user-published', async (user, mediaType) => {
  await client.subscribe(user, mediaType);
  
  if (mediaType === 'video') {
    // 播放老师视频
    user.videoTrack.play('teacher-video-container');
  }
});
```

### 3. 房间管理

#### 3.1 房间类型
```javascript
const RoomTypes = {
  ONE_ON_ONE: '1v1',      // 1 对 1 私教
  SMALL_GROUP: 'small',   // 小班课（4-6 人）
  BIG_CLASS: 'big'        // 大班课（20+ 人）
};
```

#### 3.2 角色分配
```javascript
const Roles = {
  TEACHER: 'teacher',     // 老师（发布音视频）
  STUDENT: 'student',     // 学生（发布音视频）
  OBSERVER: 'observer'    // 观察者（只观看，如家长）
};
```

### 4. Token 生成（服务端）

```javascript
// Node.js 示例
const crypto = require('crypto');

function generateToken(appId, appKey, roomId, uid, expire = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    app_id: appId,
    room_id: roomId,
    uid: uid,
    expire: now + expire
  };
  
  const signature = crypto
    .createHmac('sha256', appKey)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return Buffer.from(JSON.stringify({
    ...payload,
    signature
  })).toString('base64');
}
```

---

## 功能设计

### 1. 孩子端功能

#### 1.1 视频界面
```
┌─────────────────────────────────┐
│  [老师视频 - 全屏]               │
│  👩‍🏫 Miss Emma                 │
│                                 │
│  "Hi! What's your name?"        │
│                                 │
├─────────────────────────────────┤
│  [自己视频 - 小窗] 🎤 📹 ❌     │
│  👦 Tommy                       │
└─────────────────────────────────┘
```

#### 1.2 核心功能
- ✅ 实时视频通话
- ✅ 语音通话
- ✅ 静音/关闭摄像头
- ✅ 举手发言
- ✅ 表情反馈（👍 😂 ❤️）
- ✅ 录制回放（可选）

#### 1.3 互动功能
- 🎮 屏幕共享（老师展示课件）
- 🖊️ 互动白板（画画、写字）
- 📝 实时字幕（语音转文字）
- 🎁 虚拟礼物（星星、花朵）

### 2. 老师端功能

#### 2.1 教学界面
```
┌─────────────────────────────────┐
│  [学生视频]      [课件/白板]    │
│  👦 Tommy        📖 ABC...     │
│                                 │
│  💬 提词器：                    │
│  "问：今天吃了什么？"           │
│                                 │
│  [学生信息]  ⭐⭐⭐⭐⭐          │
└─────────────────────────────────┘
```

#### 2.2 核心功能
- ✅ 多学生视频网格
- ✅ 课件展示
- ✅ 互动白板
- ✅ 提词器（对话提示）
- ✅ 学生管理（禁言、聚焦）
- ✅ 课程录制

#### 2.3 角色管理
```javascript
// 老师可以切换"角色"
const teacherRoles = [
  { id: 'emma', name: 'Miss Emma', avatar: '👩‍🏫 },
  { id: 'tommy', name: 'Tommy', avatar: '👦' },
  { id: 'lily', name: 'Lily', avatar: '👧' }
];

// 使用虚拟背景/滤镜
await client.setVirtualBackground('emma_background.jpg');
```

### 3. 家长端功能（可选）

- 👀 旁听模式（只观看，不发言）
- 📊 学习报告
- 💬 与老师私信
- 📅 课程安排

---

## 技术实现

### 1. 项目结构

```
english-friend-rtc/
├── client/                  # 前端（孩子/老师端）
│   ├── src/
│   │   ├── components/
│   │   │   ├── VideoGrid.jsx    # 视频网格
│   │   │   ├── LocalVideo.jsx   # 本地视频
│   │   │   ├── RemoteVideo.jsx  # 远端视频
│   │   │   ├── Controls.jsx     # 控制栏
│   │   │   └── Whiteboard.jsx   # 白板
│   │   ├── hooks/
│   │   │   └── useRTC.js        # RTC Hook
│   │   └── App.jsx
│   └── package.json
├── server/                  # 后端（可选）
│   ├── routes/
│   │   └── token.js         # Token 生成
│   └── index.js
└── README.md
```

### 2. 核心代码

#### 2.1 RTC Hook
```javascript
// hooks/useRTC.js
import { useState, useEffect } from 'react';
import { createClient } from 've-rtc';

export function useRTC(config) {
  const [client, setClient] = useState(null);
  const [localTracks, setLocalTracks] = useState([]);
  const [remoteUsers, setRemoteUsers] = useState([]);

  useEffect(() => {
    // 初始化
    const rtcClient = createClient({
      appId: config.appId,
      mode: 'live',
      codec: 'vp8'
    });

    setClient(rtcClient);

    return () => {
      // 清理
      localTracks.forEach(track => track.stop());
      rtcClient.leave();
    };
  }, []);

  const joinRoom = async (roomId, token, uid) => {
    await client.join({ roomId, token, uid });
    
    // 创建本地流
    const tracks = await client.createLocalTracks({
      audio: true,
      video: true
    });
    
    setLocalTracks(tracks);
    await client.publish(tracks);
  };

  const leaveRoom = async () => {
    localTracks.forEach(track => track.stop());
    await client.unpublish(localTracks);
    await client.leave();
  };

  return {
    client,
    localTracks,
    remoteUsers,
    joinRoom,
    leaveRoom
  };
}
```

#### 2.2 视频组件
```javascript
// components/RemoteVideo.jsx
export function RemoteVideo({ user }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (user.videoTrack && videoRef.current) {
      user.videoTrack.play(videoRef.current);
    }
  }, [user]);

  return (
    <div className="remote-video">
      <div ref={videoRef} />
      <div className="user-info">
        <span>{user.userInfo?.roleName || 'Teacher'}</span>
      </div>
    </div>
  );
}
```

#### 2.3 控制栏
```javascript
// components/Controls.jsx
export function Controls({ localTracks, onToggle }) {
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

  const toggleMic = async () => {
    await localTracks.audioTrack.setEnabled(!micOn);
    setMicOn(!micOn);
    onToggle('mic', !micOn);
  };

  const toggleCamera = async () => {
    await localTracks.videoTrack.setEnabled(!cameraOn);
    setCameraOn(!cameraOn);
    onToggle('camera', !cameraOn);
  };

  return (
    <div className="controls">
      <button onClick={toggleMic}>
        {micOn ? '🎤' : '🔇'}
      </button>
      <button onClick={toggleCamera}>
        {cameraOn ? '📹' : '📷'}
      </button>
      <button onClick={onLeave}>❌</button>
    </div>
  );
}
```

### 3. 网络优化

#### 3.1 自适应码率
```javascript
client.setRemoteSubscribeStrategy({
  auto: true,  // 根据网络自动调整
  maxBitrate: 1000000  // 最大 1Mbps
});
```

#### 3.2 弱网处理
```javascript
client.on('network-quality', (quality) => {
  if (quality.uplinkQuality < 3) {
    // 上行网络差，降低视频质量
    localTracks.videoTrack.setEncoderConfiguration({
      bitrate: 500000
    });
  }
});
```

---

## 运营流程

### 1. 课程预约

```
家长预约 → 系统排课 → 生成房间 → 通知双方
   ↓
上课时间 → 加入房间 → 视频上课 → 结束评价
   ↓
课程录制 → 学习报告 → 回放复习
```

### 2. 老师培训

- 📚 英语教学能力
- 🎭 角色扮演技巧
- 💻 平台使用培训
- 👶 儿童心理理解

### 3. 质量控制

- ⭐ 学生评价
- 📊 完课率统计
- 🎥 课程抽检
- 💬 反馈收集

---

## 成本估算

### 火山 RTC 计费（2026 年价格参考）

| 项目 | 单价 | 说明 |
|------|------|------|
| 音视频通话 | ¥0.02/分钟 | 按房间时长计费 |
| 录制服务 | ¥0.05/分钟 | 云端录制 |
| 转码服务 | ¥0.03/分钟 | 多分辨率 |

### 示例计算

**1 对 1 课程，每天 100 节课，每节 25 分钟：**

```
日时长：100 × 25 = 2,500 分钟
日费用：2,500 × ¥0.02 = ¥50/天
月费用：¥50 × 30 = ¥1,500/月
年费用：¥1,500 × 12 = ¥18,000/年
```

**加上录制（50% 课程录制）：**
```
录制费用：2,500 × 50% × ¥0.05 × 30 = ¥1,875/月
总计：¥1,500 + ¥1,875 = ¥3,375/月
```

---

## 实施计划

### 阶段 1：MVP（2 周）
- [ ] 火山 RTC 账号开通
- [ ] 基础视频通话
- [ ] 孩子端 UI
- [ ] 老师端 UI

### 阶段 2：功能完善（2 周）
- [ ] 白板功能
- [ ] 课件展示
- [ ] 课程录制
- [ ] 用户系统

### 阶段 3：运营准备（2 周）
- [ ] 老师招募培训
- [ ] 课程排期系统
- [ ] 支付系统
- [ ] 客服体系

### 阶段 4：正式上线（1 周）
- [ ] 灰度测试
- [ ] Bug 修复
- [ ] 正式上线
- [ ] 市场推广

---

## 风险与挑战

### 技术风险
- ⚠️ 网络稳定性
- ⚠️ 浏览器兼容性
- ⚠️ 音视频延迟

### 运营风险
- ⚠️ 老师质量把控
- ⚠️ 儿童安全问题
- ⚠️ 内容审核

### 应对措施
- ✅ CDN 加速
- ✅ 多浏览器测试
- ✅ 实时监控系统
- ✅ 老师背景调查
- ✅ 课程内容审核
- ✅ 家长监督机制

---

## 总结

**核心优势：**
1. 🎥 **真实互动** - 真人老师，情感连接
2. 🌍 **随时随地** - 无需出门，在家学习
3. 💰 **成本可控** - RTC 按量付费
4. 📈 **可扩展** - 从 1v1 到大班课

**下一步：**
1. 开通火山 RTC 服务
2. 开发 MVP 版本
3. 招募种子老师
4. 小范围测试

---

**让每个孩子都有自己的外教朋友！** 🐾
