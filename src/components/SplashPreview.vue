<template>
  <div class="splash-preview-container" :class="`animation-${animationType}`">
    <div class="splash-preview-wrapper">
      <!-- 背景粒子 -->
      <div class="particles" :id="`particles-${uniqueId}`"></div>

      <!-- 主容器 -->
      <div class="splash-container">
        <!-- Logo -->
        <div class="logo">
          <div class="logo-icon">🚀</div>
        </div>

        <!-- 应用名称 -->
        <h1 class="app-name">Vue3 Tauri Desktop</h1>
        <div class="version">v0.1.0</div>

        <!-- 加载动画 -->
        <div class="loader-container">
          <div class="spinner"></div>
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
          <div class="loading-text">正在启动应用...</div>
          <div class="loading-status">初始化中</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'

const props = defineProps({
  animationType: {
    type: String,
    default: 'default'
  }
})

const uniqueId = ref(Math.random().toString(36).substr(2, 9))

// 创建背景粒子（默认动画）
function createParticles() {
  const container = document.getElementById(`particles-${uniqueId.value}`)
  if (!container) return
  
  container.innerHTML = ''
  const particleCount = 15

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div')
    particle.className = 'particle'

    const size = Math.random() * 60 + 20
    particle.style.width = size + 'px'
    particle.style.height = size + 'px'
    particle.style.left = Math.random() * 100 + '%'
    particle.style.bottom = '-' + size + 'px'
    particle.style.animationDelay = Math.random() * 10 + 's'
    particle.style.animationDuration = (Math.random() * 5 + 8) + 's'

    container.appendChild(particle)
  }
}

// 创建矩阵效果
function createMatrixEffect() {
  const container = document.getElementById(`particles-${uniqueId.value}`)
  if (!container) return
  
  container.innerHTML = ''
  const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
  const columns = Math.floor(300 / 20) // 预览区域宽度较小
  
  for (let i = 0; i < columns; i++) {
    const column = document.createElement('div')
    column.style.position = 'absolute'
    column.style.left = (i * 20) + 'px'
    column.style.top = '-100px'
    column.style.fontSize = '12px'
    column.style.color = '#0f0'
    column.style.fontFamily = 'monospace'
    column.style.animation = `matrixFall ${Math.random() * 3 + 2}s linear infinite`
    column.style.animationDelay = Math.random() * 2 + 's'
    column.textContent = chars[Math.floor(Math.random() * chars.length)]
    container.appendChild(column)
  }
}

// 创建高级粒子效果
function createAdvancedParticles() {
  const container = document.getElementById(`particles-${uniqueId.value}`)
  if (!container) return
  
  container.innerHTML = ''
  const particleCount = 20
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div')
    particle.style.position = 'absolute'
    particle.style.width = Math.random() * 3 + 2 + 'px'
    particle.style.height = particle.style.width
    particle.style.background = 'rgba(255, 255, 255, 0.8)'
    particle.style.borderRadius = '50%'
    particle.style.left = Math.random() * 100 + '%'
    particle.style.top = Math.random() * 100 + '%'
    particle.style.animation = `particleFloat ${Math.random() * 3 + 2}s ease-in-out infinite`
    particle.style.animationDelay = Math.random() * 2 + 's'
    container.appendChild(particle)
  }
}

// 初始化动画
function initAnimation(animType) {
  const container = document.getElementById(`particles-${uniqueId.value}`)
  if (!container) return
  
  switch(animType) {
    case 'matrix':
      createMatrixEffect()
      break
    case 'particles':
      createAdvancedParticles()
      break
    case 'default':
    default:
      createParticles()
      break
  }
}

watch(() => props.animationType, (newType) => {
  initAnimation(newType)
}, { immediate: true })

onMounted(() => {
  initAnimation(props.animationType)
  
  // 添加动画样式
  if (!document.getElementById('splash-preview-styles')) {
    const style = document.createElement('style')
    style.id = 'splash-preview-styles'
    style.textContent = `
      @keyframes matrixFall {
        to {
          top: 400px;
          opacity: 0;
        }
      }
      @keyframes particleFloat {
        0%, 100% {
          transform: translate(0, 0) scale(1);
          opacity: 0.8;
        }
        50% {
          transform: translate(${Math.random() * 50 - 25}px, ${Math.random() * 50 - 25}px) scale(1.5);
          opacity: 1;
        }
      }
    `
    document.head.appendChild(style)
  }
})

onUnmounted(() => {
  const style = document.getElementById('splash-preview-styles')
  if (style) {
    style.remove()
  }
})
</script>

<style scoped>
.splash-preview-container {
  width: 100%;
  height: 400px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  border: 2px solid var(--el-border-color-light);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.splash-preview-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  font-family: "PingFang SC";
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ignore */
.particles {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 1;
  top: 0;
  left: 0;
}

.particle {
  position: absolute;
  background: rgba(255, 255, 255, 0.15);
  animation: float 10s infinite;
  clip-path: polygon(
    50% 0%,
    61% 35%,
    98% 35%,
    68% 57%,
    79% 91%,
    50% 70%,
    21% 91%,
    32% 57%,
    2% 35%,
    39% 35%
  );
}

.particle:nth-child(2n) {
  clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
}

.particle:nth-child(3n) {
  clip-path: polygon(50% 0%, 90% 20%, 100% 60%, 75% 100%, 25% 100%, 0% 60%, 10% 20%);
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) translateX(0) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-400px) translateX(50px) rotate(360deg);
    opacity: 0;
  }
}

/* ignore */
.splash-container {
  position: relative;
  z-index: 2;
  text-align: center;
  animation: fadeIn 0.6s ease-out;
  transform: scale(0.8);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(0.8);
  }
}

/* ignore */
.logo {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.5));
  }
  50% {
    transform: scale(1.1);
    filter: drop-shadow(0 0 40px rgba(255, 255, 255, 0.8));
  }
}

.logo-icon {
  font-size: 48px;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* ignore */
.app-name {
  font-size: 24px;
  font-weight: bold;
  color: white;
  margin-bottom: 8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  letter-spacing: 1px;
}

/* ignore */
.version {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 30px;
}

/* ignore */
.loader-container {
  margin: 30px auto;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 15px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ignore */
.progress-bar {
  width: 240px;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
  margin: 0 auto 15px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #fff, rgba(255, 255, 255, 0.8));
  border-radius: 2px;
  width: 0%;
  animation: progress 2.5s ease-in-out infinite;
}

@keyframes progress {
  0% { width: 0%; }
  50% { width: 70%; }
  100% { width: 100%; }
}

/* ignore */
.loading-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 5px;
}

.loading-status {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  min-height: 16px;
  animation: fadeInOut 1.5s ease-in-out infinite;
}

@keyframes fadeInOut {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* ignore */

/* ignore */
.animation-minimal {
  background: #1a1a1a !important;
}

.animation-minimal .splash-container {
  border: 2px solid rgba(255, 255, 255, 0.1);
  padding: 30px;
  border-radius: 8px;
}

.animation-minimal .spinner {
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top: 2px solid var(--el-bg-color-overlay);
  width: 30px;
  height: 30px;
}

/* ignore */
.animation-wave {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  position: relative;
  overflow: hidden;
}

.animation-wave::before {
  content: '';
  position: absolute;
  width: 200%;
  height: 200%;
  top: -50%;
  left: -50%;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(255, 255, 255, 0.05) 10px,
    rgba(255, 255, 255, 0.05) 20px
  );
  animation: waveMove 20s linear infinite;
}

@keyframes waveMove {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}

/* ignore */
.animation-matrix {
  background: var(--el-bg-color-page) !important;
  color: #0f0;
}

.animation-matrix .app-name,
.animation-matrix .version,
.animation-matrix .loading-text,
.animation-matrix .loading-status {
  color: #0f0;
}

.animation-matrix .particles {
  font-family: "PingFang SC";
  font-size: 12px;
  color: #0f0;
}

/* ignore */
.animation-geometric {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%) !important;
}

.animation-geometric .logo-icon {
  animation: geometricRotate 3s linear infinite;
}

@keyframes geometricRotate {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.2); }
  100% { transform: rotate(360deg) scale(1); }
}

/* ignore */
.animation-gradient {
  background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab) !important;
  background-size: 400% 400% !important;
  animation: gradientFlow 15s ease infinite;
}

@keyframes gradientFlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* ignore */
.animation-particles .particles {
  background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: particlesMove 20s linear infinite;
}

@keyframes particlesMove {
  0% { background-position: 0 0; }
  100% { background-position: 50px 50px; }
}

/* ignore */
.animation-neon {
  background: #0a0a0a !important;
}

.animation-neon .app-name {
  text-shadow: 
    0 0 10px #fff,
    0 0 20px #fff,
    0 0 30px #ff00ff,
    0 0 40px #ff00ff;
  animation: neonPulse 2s ease-in-out infinite;
}

@keyframes neonPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

/* ignore */
.animation-space {
  background: var(--el-bg-color-page) !important;
  background-image: 
    radial-gradient(2px 2px at 20% 30%, white, transparent),
    radial-gradient(2px 2px at 60% 70%, white, transparent),
    radial-gradient(1px 1px at 50% 50%, white, transparent);
  background-size: 200% 200%;
  animation: spaceMove 20s linear infinite;
}

@keyframes spaceMove {
  0% { background-position: 0% 0%; }
  100% { background-position: 100% 100%; }
}

.animation-space .logo-icon {
  filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.8));
}

/* ignore */
.animation-custom {
  /* ignore */
}
</style>

