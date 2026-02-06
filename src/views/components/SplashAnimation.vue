<template>
  <DocPage
    icon="🎬"
    title="启动动画"
    description="自定义应用启动时的动画效果"
  >
    <template #basic>
      <CodeExample
        title="选择启动动画"
        :code="basicCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-alert
              title="提示：选择启动动画后，点击保存并重启按钮，应用将自动重启以应用新的启动动画。"
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
              </el-form-item>
            </el-form>
          </el-card>
        </template>
      </CodeExample>
    </template>
  </DocPage>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import { loadConfig, saveConfig } from '@/utils/tauri/store'
import TauriProcess from '@/utils/tauri/process'

const restarting = ref(false)
const form = ref({
  splashAnimation: 'default'
})

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

const basicCode = `import { loadConfig, saveConfig } from '@/utils/tauri/store'
import TauriProcess from '@/utils/tauri/process'

// 保存启动动画配置
const config = await loadConfig()
config.splashAnimation = 'wave'
await saveConfig(config)

// 重启应用以应用新动画
await TauriProcess.relaunchApp()`

const handleSaveAndRestart = async () => {
  try {
    const isDev = import.meta.env.DEV
    
    // 先保存配置
    const currentConfig = await loadConfig()
    const updatedConfig = {
      ...currentConfig,
      splashAnimation: form.value.splashAnimation
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

onMounted(async () => {
  try {
    const config = await loadConfig()
    if (config.splashAnimation) {
      form.value.splashAnimation = config.splashAnimation
    }
  } catch (e) { /* ignore */ }
})
</script>

