<template>
  <DocPage
    icon="💻"
    title="系统信息"
    description="获取操作系统、架构、版本等系统信息。系统信息 API 提供了获取当前运行环境的详细信息，包括操作系统平台（Windows、macOS、Linux）、CPU 架构（x86、x64、arm64 等）和操作系统版本号。这些信息对于应用适配不同平台和架构非常有用。"
    :api="apiData"
    :methods="methodsData"
  >
    <template #basic>
      <CodeExample
        title="获取系统信息"
        :code="basicCode"
      >
        <template #demo>
          <el-card shadow="hover" v-loading="loading">
            <el-space direction="vertical" style="width: 100%;">
              <el-descriptions :column="1" border>
                <el-descriptions-item label="操作系统">
                  <el-tag :type="getPlatformType(systemInfo.platform)" size="large">
                    {{ systemInfo.platform || '加载中...' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="系统版本">
                  <span style="font-family: 'PingFang SC';">{{ systemInfo.version || '加载中...' }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="CPU 架构">
                  <el-tag type="info" size="large">{{ systemInfo.arch || '加载中...' }}</el-tag>
                </el-descriptions-item>
              </el-descriptions>
              <el-button @click="refreshInfo" type="primary" :loading="loading" style="width: 100%;">
                <el-icon><Refresh /></el-icon>
                刷新信息
              </el-button>
            </el-space>
          </el-card>
        </template>
      </CodeExample>
    </template>

    <template #examples>
      <CodeExample
        title="单独获取各项信息"
        :code="separateCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-space direction="vertical" style="width: 100%;">
              <el-button @click="getPlatformOnly" :loading="loadingPlatform">
                获取操作系统平台
              </el-button>
              <el-button @click="getArchOnly" :loading="loadingArch">
                获取 CPU 架构
              </el-button>
              <el-button @click="getVersionOnly" :loading="loadingVersion">
                获取系统版本
              </el-button>
              
              <el-divider />
              
              <div v-if="separateInfo.platform" style="padding: 12px; background: #f5f7fa; border-radius: 4px;">
                <div style="font-weight: 600; margin-bottom: 8px;">单独获取的结果：</div>
                <el-descriptions :column="1" border>
                  <el-descriptions-item label="平台">
                    <el-tag :type="getPlatformType(separateInfo.platform)">
                      {{ separateInfo.platform }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="架构">
                    <el-tag type="info">{{ separateInfo.arch }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="版本">
                    <span style="font-family: 'PingFang SC';">{{ separateInfo.version }}</span>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </el-space>
          </el-card>
        </template>
      </CodeExample>
    </template>
  </DocPage>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import { TauriProcess } from '@/utils/tauri'

const loading = ref(false)
const loadingPlatform = ref(false)
const loadingArch = ref(false)
const loadingVersion = ref(false)
const systemInfo = ref({
  platform: '',
  arch: '',
  version: ''
})
const separateInfo = ref({
  platform: '',
  arch: '',
  version: ''
})

const basicCode = `import { TauriProcess } from '@/utils/tauri'

// 获取完整的系统信息
const info = await TauriProcess.getSystemInfo()
console.log(info.platform) // 'windows' | 'macos' | 'linux'
console.log(info.arch)     // 'x86_64' | 'aarch64'
console.log(info.version)  // OS version string`

const separateCode = `import { TauriProcess } from '@/utils/tauri'

// 单独获取各项信息
const platform = await TauriProcess.getPlatform()
const arch = await TauriProcess.getArch()
const version = await TauriProcess.getOSVersion()`

const getPlatformType = (platform) => {
  const map = { windows: 'primary', macos: 'success', linux: 'warning' }
  return map[platform] || 'info'
}

const refreshInfo = async () => {
  loading.value = true
  try {
    const info = await TauriProcess.getSystemInfo()
    systemInfo.value = info
    ElMessage.success('系统信息已刷新')
  } catch (error) {
    ElMessage.error('获取系统信息失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const getPlatformOnly = async () => {
  loadingPlatform.value = true
  try {
    separateInfo.value.platform = await TauriProcess.getPlatform()
    ElMessage.success('平台信息已获取')
  } catch (error) {
    ElMessage.error('获取平台信息失败')
  } finally {
    loadingPlatform.value = false
  }
}

const getArchOnly = async () => {
  loadingArch.value = true
  try {
    separateInfo.value.arch = await TauriProcess.getArch()
    ElMessage.success('架构信息已获取')
  } catch (error) {
    ElMessage.error('获取架构信息失败')
  } finally {
    loadingArch.value = false
  }
}

const getVersionOnly = async () => {
  loadingVersion.value = true
  try {
    separateInfo.value.version = await TauriProcess.getOSVersion()
    ElMessage.success('版本信息已获取')
  } catch (error) {
    ElMessage.error('获取版本信息失败')
  } finally {
    loadingVersion.value = false
  }
}

onMounted(() => {
  refreshInfo()
})

const apiData = [
  {
    name: '无',
    type: '-',
    default: '-',
    description: '系统信息 API 方法不需要参数'
  }
]

const methodsData = [
  {
    name: 'getSystemInfo',
    description: '获取完整的系统信息，包括操作系统平台、CPU 架构和系统版本。返回一个包含所有信息的对象。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数，返回 Promise<{platform: string, arch: string, version: string}>' }
    ]
  },
  {
    name: 'getPlatform',
    description: '获取操作系统平台。返回平台名称，如 windows、macos、linux。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数，返回 Promise<string>' }
    ]
  },
  {
    name: 'getArch',
    description: '获取 CPU 架构。返回架构名称，如 x86_64、aarch64、arm 等。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数，返回 Promise<string>' }
    ]
  },
  {
    name: 'getOSVersion',
    description: '获取操作系统版本号。返回详细的系统版本信息，格式因操作系统而异。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数，返回 Promise<string>' }
    ]
  },
  {
    name: 'exitApp',
    description: '退出应用程序。可以指定退出代码，0 表示正常退出。',
    params: [
      { name: 'exitCode', type: 'Number', description: '退出代码，默认为 0（正常退出）' }
    ]
  },
  {
    name: 'relaunchApp',
    description: '重启应用程序。会关闭当前应用并重新启动。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数' }
    ]
  }
]
</script>

