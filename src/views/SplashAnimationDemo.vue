<template>
  <div class="splash-animation-demo-page">
    <TitleBar title="启动动画设置 - Tauri 功能演示" />
    <div class="demo-view">
      <el-page-header @back="goBack">
        <template #content>
          <span class="page-title">🎬 启动动画设置</span>
        </template>
      </el-page-header>

      <div class="content-section">
        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">选择启动动画</div>
          </template>
          <el-alert
            title="提示：选择启动动画后，点击&quot;保存并重启&quot;按钮，应用将自动重启以应用新的启动动画。"
            type="info"
            show-icon
            :closable="false"
            style="margin-bottom: 16px;"
          />
          <el-form :model="form" label-width="140px">
            <el-form-item label="启动动画">
              <el-select v-model="form.splashAnimation" style="width: 400px" placeholder="选择启动动画">
                <el-option 
                  v-for="anim in animations" 
                  :key="anim.id"
                  :label="`${anim.name} - ${anim.description}`"
                  :value="anim.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSaveAndRestart" :loading="restarting">
                <el-icon><Check /></el-icon>
                保存并重启
              </el-button>
              <el-button @click="goToSettings">
                <el-icon><Setting /></el-icon>
                在设置中管理
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">实时预览</div>
          </template>
          <div class="preview-section">
            <SplashPreview :animation-type="form.splashAnimation" />
            <div class="preview-info">
              <el-tag type="info" size="large" style="margin-bottom: 10px;">
                当前预览：{{ getCurrentAnimationName() }}
              </el-tag>
              <p class="preview-tip">选择下方动画卡片可实时预览效果</p>
            </div>
          </div>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">选择动画</div>
          </template>
          <el-row :gutter="20">
            <el-col 
              v-for="anim in animations" 
              :key="anim.id"
              :span="8"
              style="margin-bottom: 20px;"
            >
              <el-card 
                shadow="hover" 
                :class="['animation-card', { 'selected': form.splashAnimation === anim.id }]"
                @click="form.splashAnimation = anim.id"
              >
                <div class="animation-preview">
                  <div class="preview-icon">{{ getAnimationIcon(anim.id) }}</div>
                  <div class="preview-name">{{ anim.name }}</div>
                  <div class="preview-desc">{{ anim.description }}</div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Setting } from '@element-plus/icons-vue'
import TitleBar from '@/components/TitleBar.vue'
import SplashPreview from '@/components/SplashPreview.vue'
import { loadConfig, saveConfig } from '@/utils/tauri/store'
import TauriProcess from '@/utils/tauri/process'

const router = useRouter()

const animations = [
  { id: 'default', name: '默认动画', description: '经典渐变背景 + 浮动粒子' },
  { id: 'minimal', name: '极简风格', description: '简洁的线条动画' },
  { id: 'wave', name: '波浪动画', description: '流动的波浪效果' },
  { id: 'matrix', name: '矩阵风格', description: '数字雨效果' },
  { id: 'geometric', name: '几何图形', description: '动态几何图形' },
  { id: 'gradient', name: '渐变流动', description: '流动的渐变色' },
  { id: 'particles', name: '粒子系统', description: '丰富的粒子效果' },
  { id: 'neon', name: '霓虹风格', description: '霓虹灯效果' },
  { id: 'space', name: '太空主题', description: '星空背景动画' },
  { id: 'custom', name: '自定义', description: '用户自定义动画' }
]

const form = reactive({
  splashAnimation: 'default'
})

const restarting = ref(false)

const getAnimationIcon = (id) => {
  const icons = {
    default: '🎨',
    minimal: '📐',
    wave: '🌊',
    matrix: '💚',
    geometric: '🔷',
    gradient: '🌈',
    particles: '✨',
    neon: '💡',
    space: '🚀',
    custom: '🎭'
  }
  return icons[id] || '🎬'
}

const getCurrentAnimationName = () => {
  const anim = animations.find(a => a.id === form.splashAnimation)
  return anim ? anim.name : '未知动画'
}

const handleSaveAndRestart = async () => {
  try {
    const isDev = import.meta.env.DEV
    
    // 先保存配置
    const currentConfig = await loadConfig()
    const updatedConfig = {
      ...currentConfig,
      splashAnimation: form.splashAnimation
    }
    await saveConfig(updatedConfig)
    ElMessage.success('配置已保存')
    
    if (isDev) {
      // 开发模式下，提示用户手动重启
      await ElMessageBox.alert(
        '启动动画配置已保存！\n\n在开发模式下，为了确保 Vite 服务器正常运行，请手动重启应用：\n1. 关闭当前应用窗口\n2. 在终端中重新运行 `npm run tauri dev`\n\n这样可以确保 Vite 开发服务器正常运行。',
        '配置已保存',
        {
          confirmButtonText: '我知道了',
          type: 'success'
        }
      )
      restarting.value = false
    } else {
      // 生产模式下，直接重启
      await ElMessageBox.confirm(
        '保存启动动画设置后，应用将自动重启以应用新的启动动画。确定要继续吗？',
        '确认保存并重启',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'info'
        }
      )
      
      restarting.value = true
      ElMessage.success('配置已保存，正在重启应用...')
      await new Promise(resolve => setTimeout(resolve, 800))
      await TauriProcess.relaunchApp()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('保存并重启失败: ' + (error.message || String(error)))
    }
    restarting.value = false
  }
}

const goToSettings = () => {
  router.push('/settings')
}

const goBack = () => {
  router.push('/')
}

onMounted(async () => {
  try {
    const config = await loadConfig()
    if (config.splashAnimation) {
      form.splashAnimation = config.splashAnimation
    }
  } catch (e) { /* ignore */ }
})
</script>

<style scoped>
.splash-animation-demo-page {
  width: 100%;
  height: 100vh;
  overflow: auto;
  background: #f5f7fa;
}

.demo-view {
  padding: 24px;
  padding-top: 56px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
}

.content-section {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.demo-card {
  width: 100%;
}

.card-header {
  font-weight: 600;
  font-size: 1.1rem;
}

.animation-card {
  cursor: pointer;
  transition: all 0.3s;
}

.animation-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.animation-card.selected {
  border: 2px solid #409eff;
  background: #ecf5ff;
}

.animation-preview {
  text-align: center;
  padding: 20px;
}

.preview-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.preview-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}

.preview-desc {
  font-size: 12px;
  color: #909399;
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-info {
  text-align: center;
  padding: 10px;
}

.preview-tip {
  font-size: 14px;
  color: #909399;
  margin-top: 8px;
}
</style>

