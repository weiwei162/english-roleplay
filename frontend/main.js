// Vite 入口文件
import './css/style.css'
import './js/auth-client.js'
import './js/characters.js'
import './js/scenes.js'
import './js/conversations.js'
import './js/startvoicechat-client.js'
import { spawn as spawnParticles, stop as stopParticles } from './js/particles.js'
import { playAnimation, playSequence } from './js/animations.js'
import './js/app.js'
import './js/demo-features.js'

// 导出到全局供浏览器使用
import * as Particles from './js/particles.js'
import * as Character from './js/animations.js'

window.Particles = Particles
window.Character = Character
