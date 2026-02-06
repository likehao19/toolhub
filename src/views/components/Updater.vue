<template>
  <DocPage
    icon="🔄"
    title="应用更新"
    description="检查和安装应用程序更新"
  >
    <template #basic>
      <CodeExample
        title="检查更新"
        :code="basicCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-button type="primary" @click="checkUpdate" :loading="checking">
              <el-icon><Refresh /></el-icon>
              检查更新
            </el-button>
            <el-descriptions v-if="updateInfo" :column="1" border style="margin-top: 16px;">
              <el-descriptions-item label="是否有更新">
                <el-tag :type="updateInfo.available ? 'success' : 'info'">
                  {{ updateInfo.available ? '有新版本' : '已是最新版本' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="当前版本" v-if="updateInfo.currentVersion">
                {{ updateInfo.currentVersion }}
              </el-descriptions-item>
              <el-descriptions-item label="新版本" v-if="updateInfo.version">
                {{ updateInfo.version }}
              </el-descriptions-item>
              <el-descriptions-item label="更新说明" v-if="updateInfo.body">
                <pre style="margin: 0; white-space: pre-wrap;">{{ updateInfo.body }}</pre>
              </el-descriptions-item>
            </el-descriptions>
            <el-button
              v-if="updateInfo && updateInfo.available"
              type="primary"
              @click="installUpdate"
              :loading="installing"
              style="margin-top: 16px"
            >
              <el-icon><Download /></el-icon>
              下载并安装更新
            </el-button>
          </el-card>
        </template>
      </CodeExample>
    </template>
  </DocPage>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Download } from '@element-plus/icons-vue'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import { TauriUpdater } from '@/utils/tauri'

const checking = ref(false)
const installing = ref(false)
const updateInfo = ref(null)

const basicCode = `import { TauriUpdater } from '@/utils/tauri'

// 检查更新
const update = await TauriUpdater.checkUpdate()
if (update?.available) {
  // 安装更新
  await TauriUpdater.installUpdate(update)
}`

const checkUpdate = async () => {
  checking.value = true
  try {
    const update = await TauriUpdater.checkUpdate()
    updateInfo.value = {
      available: update?.available || false,
      version: update?.version,
      currentVersion: update?.currentVersion,
      body: update?.body,
      date: update?.date
    }
    if (update?.available) {
      ElMessage.success('发现新版本: ' + update.version)
    } else {
      ElMessage.info('已是最新版本')
    }
  } catch (error) {
    ElMessage.error('检查更新失败: ' + error.message)
  } finally {
    checking.value = false
  }
}

const installUpdate = async () => {
  if (!updateInfo.value) {
    ElMessage.warning('请先检查更新')
    return
  }
  
  installing.value = true
  try {
    const update = await TauriUpdater.checkUpdate()
    if (update?.available) {
      await TauriUpdater.installUpdate(update)
      ElMessage.success('更新已开始安装')
    }
  } catch (error) {
    ElMessage.error('安装更新失败: ' + error.message)
  } finally {
    installing.value = false
  }
}
</script>

