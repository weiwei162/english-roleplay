# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

English Friend (英语好朋友) is an immersive English learning app for children ages 3-6. It uses a canvas-based UI where animated characters interact with children through scene-based conversations. The app supports both a standalone frontend mode and a full-stack mode with real-time AI chat via Doubao API and video avatar via Volcano Engine RTC.

## Development Commands

```bash
# Install dependencies and start server (full-stack mode)
cd server && npm install && npm start

# Development mode with auto-reload
cd server && npm run dev

# Run API tests
cd server && npm test

# Access the app at http://localhost:3000
```

## Architecture

### Frontend (Root Directory)
- `index.html` - Main SPA entry point
- `css/style.css` - All styles
- `js/app.js` - Main application logic, speech synthesis, UI management
- `js/characters.js` - Character definitions (5 characters: Emma, Tommy, Lily, Mike, Rose)
- `js/scenes.js` - Scene definitions with dialogues and media content (4 scenes: zoo, market, home, park)
- `js/conversations.js` - Conversation topics, response patterns, and Memory system (localStorage)
- `js/rtc-client.js` - Volcano Engine RTC client for video avatar and bidirectional audio
- `js/websocket-client.js` - WebSocket client for real-time AI chat

### Backend (`server/`)
- `server/index.js` - Express server with WebSocket, serves static files, provides API endpoints
- `server/.env` - Environment configuration (copy from `.env.example`)

### Key Data Flow
1. User selects character → scene → canvas screen
2. Dialogue shown with TTS via Web Speech API
3. Optional: WebSocket connection to server for AI chat (Doubao API)
4. Optional: RTC connection for video avatar (Volcano Engine)

## Environment Setup

Copy `server/.env.example` to `server/.env` and configure:

```
VOLC_APP_ID=your_app_id        # Volcano Engine RTC
VOLC_APP_KEY=your_app_key
DOUBAO_API_KEY=your_api_key    # Doubao AI for chat
USE_HTTPS=false                # Set true for HTTPS
```

## Extending the App

### Adding a New Character
Edit `js/characters.js`:
```javascript
newChar: {
    name: 'Character Name',
    avatar: '👩‍🏫',  // emoji avatar
    description: '描述',
    voice: 'female',  // female/male/child/elderly
    personality: 'gentle',
    traits: ['patient', 'caring'],
    greetingStyle: 'warm'
}
```

### Adding a New Scene
Edit `js/scenes.js`:
```javascript
newScene: {
    name: '场景名',
    nameEn: 'Scene Name',
    icon: '🎨',
    bgGradient: 'linear-gradient(135deg, #color1 0%, #color2 100%)',
    bgImage: '🌳🌸',  // decorative emoji
    dialogues: [
        {
            text: "English text",
            textCn: "中文翻译",
            media: {
                type: 'emoji',  // or 'image', 'video'
                content: '🦁',
                label: 'Label',
                position: { top: '30%', left: '60%' },
                size: 'medium'  // small/medium/large
            }
        }
    ]
}
```

### Adding a New API Endpoint
Add routes in `server/index.js`. The server already handles:
- `POST /api/chat` - AI chat via Doubao
- `POST /api/create-room` - RTC room creation
- `GET /health` - Server health check

## Important Notes

- The app works without the server (frontend-only mode) using local dialogue data and Web Speech API
- Browser Speech Recognition requires Chrome/Edge (not supported in Firefox)
- RTC video avatar requires Volcano Engine account and proper configuration
- The Memory system uses `localStorage` with key `englishFriendMemory`
- Server serves frontend static files from parent directory (`path.join(__dirname, '..')`)