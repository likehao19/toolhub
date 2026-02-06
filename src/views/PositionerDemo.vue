<template>
  <div class="positioner-demo-page">
    <TitleBar title="窗口定位 - Tauri 功能演示" />
    <div class="demo-view">
      <el-page-header @back="goBack">
        <template #content>
          <span class="page-title">📍 窗口定位</span>
        </template>
      </el-page-header>

      <div class="content-section">
        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">窗口位置</div>
          </template>
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="position-group">
                <div class="group-title">顶部位置</div>
                <el-space wrap>
                  <el-button @click="moveTo('topLeft')">左上</el-button>
                  <el-button @click="moveTo('topCenter')">上中</el-button>
                  <el-button @click="moveTo('topRight')">右上</el-button>
                </el-space>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="position-group">
                <div class="group-title">中间位置</div>
                <el-space wrap>
                  <el-button @click="moveTo('leftCenter')">左中</el-button>
                  <el-button @click="moveTo('rightCenter')">右中</el-button>
                </el-space>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="position-group">
                <div class="group-title">底部位置</div>
                <el-space wrap>
                  <el-button @click="moveTo('bottomLeft')">左下</el-button>
                  <el-button @click="moveTo('bottomCenter')">下中</el-button>
                  <el-button @click="moveTo('bottomRight')">右下</el-button>
                </el-space>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="position-group">
                <div class="group-title">
                  托盘位置 
                  <el-tag 
                    v-if="!trayPositionsSupported" 
                    size="small" 
                    type="warning" 
                    style="margin-left: 8px;"
                  >
                    Windows 不支持
                  </el-tag>
                  <el-tag 
                    v-else
                    size="small" 
                    type="success" 
                    style="margin-left: 8px;"
                  >
                    已启用
                  </el-tag>
                </div>
                <el-alert
                  v-if="!trayPositionsSupported"
                  type="info"
                  :closable="false"
                  show-icon
                  style="margin-top: 8px; margin-bottom: 12px;"
                >
                  <template #title>
                    <span style="font-size: 12px;">
                      托盘位置功能在 Windows 平台不可用。此功能在 macOS 和 Linux 上可用。
                    </span>
                  </template>
                </el-alert>
                <el-space wrap>
                  <el-button 
                    @click="moveTo('trayLeft')" 
                    :disabled="!trayPositionsSupported"
                    :title="trayPositionsSupported ? '将窗口移动到系统托盘图标左侧' : '托盘位置功能在 Windows 平台不可用'"
                  >
                    托盘左
                  </el-button>
                  <el-button 
                    @click="moveTo('trayRight')" 
                    :disabled="!trayPositionsSupported"
                    :title="trayPositionsSupported ? '将窗口移动到系统托盘图标右侧' : '托盘位置功能在 Windows 平台不可用'"
                  >
                    托盘右
                  </el-button>
                  <el-button 
                    @click="moveTo('trayCenter')" 
                    :disabled="!trayPositionsSupported"
                    :title="trayPositionsSupported ? '将窗口移动到系统托盘图标中心位置' : '托盘位置功能在 Windows 平台不可用'"
                  >
                    托盘中
                  </el-button>
                  <el-button 
                    @click="moveTo('trayBottomLeft')" 
                    :disabled="!trayPositionsSupported"
                    :title="trayPositionsSupported ? '将窗口移动到系统托盘图标左下角' : '托盘位置功能在 Windows 平台不可用'"
                  >
                    托盘左下
                  </el-button>
                  <el-button 
                    @click="moveTo('trayBottomRight')" 
                    :disabled="!trayPositionsSupported"
                    :title="trayPositionsSupported ? '将窗口移动到系统托盘图标右下角' : '托盘位置功能在 Windows 平台不可用'"
                  >
                    托盘右下
                  </el-button>
                  <el-button 
                    @click="moveTo('trayBottomCenter')" 
                    :disabled="!trayPositionsSupported"
                    :title="trayPositionsSupported ? '将窗口移动到系统托盘图标下方中心' : '托盘位置功能在 Windows 平台不可用'"
                  >
                    托盘下中
                  </el-button>
                </el-space>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="position-group">
                <div class="group-title">居中位置</div>
                <el-space wrap>
                  <el-button @click="moveTo('center')">屏幕中心</el-button>
                </el-space>
              </div>
            </el-col>
          </el-row>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">说明</div>
          </template>
          <el-alert
            type="info"
            :closable="false"
            show-icon
          >
            <template #title>
              <div style="line-height: 1.8">
                <p>窗口定位插件可以将窗口移动到屏幕的指定位置。</p>
                <p><strong>托盘位置</strong>：将窗口定位到系统托盘图标附近的位置。应用已实现系统托盘功能，但托盘位置功能在某些平台（如 Windows）可能不被支持。如果点击托盘位置按钮出现错误，请使用其他位置选项。</p>
                <p><strong>其他位置</strong>：将窗口移动到屏幕的对应位置（左上、右上、左下、右下、上中、下中、左中、右中、中心）。</p>
              </div>
            </template>
          </el-alert>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import TitleBar from '@/components/TitleBar.vue'
import { TauriPositioner } from '@/utils/tauri'
import { platform } from '@tauri-apps/plugin-os'

const router = useRouter()
const trayPositionsSupported = ref(false)
const currentPlatform = ref('')

onMounted(async () => {
  try {
    currentPlatform.value = await platform()
    // 在 Windows 上，托盘位置可能不被支持
    // 在 macOS 和 Linux 上通常支持
    trayPositionsSupported.value = currentPlatform.value !== 'win32'
  } catch (error) {
    // 默认假设不支持，让用户尝试
    trayPositionsSupported.value = false
  }
})

const moveTo = async (position) => {
  try {
    await TauriPositioner.moveWindowTo(position)
    ElMessage.success(`窗口已移动到: ${position}`)
  } catch (error) {
    const errorMsg = error.message || String(error)
    if (errorMsg.includes('托盘') || errorMsg.includes('tray') || errorMsg.includes('expected one of: 0, 1, 2, 3, 4, 5, 6, 7, 8')) {
      ElMessage.warning('托盘位置功能在当前平台不可用。托盘位置需要系统托盘支持，且某些平台（如 Windows）可能不支持此功能。请使用其他位置选项。')
    } else {
      ElMessage.error('移动窗口失败: ' + errorMsg)
    }
  }
}

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.positioner-demo-page {
  width: 100%;
  height: 100vh;
  overflow: auto;
  background: #f5f7fa;
}

.demo-view {
  padding: 24px;
  padding-top: 56px;
  max-width: 1000px;
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

.position-group {
  margin-bottom: 20px;
}

.group-title {
  font-weight: 600;
  margin-bottom: 12px;
  color: #666;
}
</style>

