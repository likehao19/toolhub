<template>
  <div class="updater-demo-page">
    <TitleBar title="应用更新 - Tauri 功能演示" />
    <div class="demo-view">
      <el-page-header @back="goBack">
        <template #content>
          <span class="page-title">🔄 应用更新</span>
        </template>
      </el-page-header>

      <div class="content-section">
        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">检查更新</div>
          </template>
          <el-button type="primary" @click="checkUpdate" :loading="checking">
            <el-icon><Refresh /></el-icon>
            检查更新
          </el-button>
        </el-card>

        <el-card shadow="hover" class="demo-card" v-if="updateInfo">
          <template #header>
            <div class="card-header">更新信息</div>
          </template>
          <el-descriptions :column="1" border>
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
            <el-descriptions-item label="发布日期" v-if="updateInfo.date">
              {{ updateInfo.date }}
            </el-descriptions-item>
            <el-descriptions-item label="更新说明" v-if="updateInfo.body">
              <pre class="update-body">{{ updateInfo.body }}</pre>
            </el-descriptions-item>
          </el-descriptions>
          <el-button
            type="primary"
            @click="installUpdate"
            :loading="installing"
            v-if="updateInfo.available"
            style="margin-top: 16px"
          >
            <el-icon><Download /></el-icon>
            下载并安装更新
          </el-button>
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
                <p>应用更新插件用于检查和安装应用程序更新。</p>
                <p><strong>配置要求</strong>：需要在 <code>tauri.conf.json</code> 中配置更新服务器地址和公钥。</p>
                <p><strong>当前状态</strong>：更新功能已禁用（<code>active: false</code>），需要配置后才能使用。</p>
                <p><strong>使用场景</strong>：适用于需要自动更新功能的桌面应用程序。</p>
              </div>
            </template>
          </el-alert>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Download } from '@element-plus/icons-vue'
import TitleBar from '@/components/TitleBar.vue'
import { TauriUpdater } from '@/utils/tauri'

const router = useRouter()
const checking = ref(false)
const installing = ref(false)
const updateInfo = ref(null)

const checkUpdate = async () => {
  checking.value = true
  try {
    const update = await TauriUpdater.checkUpdate()
    if (update) {
      updateInfo.value = {
        available: update.available,
        currentVersion: update.currentVersion,
        version: update.version,
        date: update.date,
        body: update.body
      }
    } else {
      updateInfo.value = {
        available: false
      }
    }
  } catch (error) {
    ElMessage.error('检查更新失败: ' + error.message)
    updateInfo.value = null
  } finally {
    checking.value = false
  }
}

const installUpdate = async () => {
  if (!updateInfo.value || !updateInfo.value.available) {
    return
  }

  try {
    await ElMessageBox.confirm(
      '确定要下载并安装更新吗？安装完成后需要重启应用。',
      '确认更新',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    installing.value = true
    // 注意：这里需要实际的 update 对象，但为了演示，我们只显示消息
    ElMessage.info('更新功能需要配置更新服务器后才能使用')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('安装更新失败: ' + error.message)
    }
  } finally {
    installing.value = false
  }
}

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.updater-demo-page {
  width: 100%;
  height: 100vh;
  overflow: auto;
  background: var(--el-fill-color-light);
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

.update-body {
  max-height: 200px;
  overflow: auto;
  background: var(--el-fill-color-light);
  padding: 12px;
  border-radius: 4px;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>

