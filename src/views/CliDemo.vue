<template>
  <div class="cli-demo-page">
    <TitleBar title="命令行接口 - Tauri 功能演示" />
    <div class="demo-view">
      <el-page-header @back="goBack">
        <template #content>
          <span class="page-title">💻 命令行接口 (CLI)</span>
        </template>
      </el-page-header>

      <div class="content-section">
        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">命令行参数信息</div>
          </template>
          <el-button type="primary" @click="loadCliArgs" :loading="loading">
            <el-icon><Refresh /></el-icon>
            加载 CLI 参数
          </el-button>
        </el-card>

        <el-card shadow="hover" class="demo-card" v-if="cliData">
          <template #header>
            <div class="card-header">解析结果</div>
          </template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="参数">
              <pre class="json-display">{{ JSON.stringify(cliData.args, null, 2) }}</pre>
            </el-descriptions-item>
            <el-descriptions-item label="子命令" v-if="cliData.subcommand">
              <pre class="json-display">{{ JSON.stringify(cliData.subcommand, null, 2) }}</pre>
            </el-descriptions-item>
            <el-descriptions-item label="匹配项">
              <pre class="json-display">{{ JSON.stringify(cliData, null, 2) }}</pre>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">使用说明</div>
          </template>
          <el-alert
            type="info"
            :closable="false"
            show-icon
          >
            <template #title>
              <div style="line-height: 1.8">
                <p>CLI 插件用于解析应用程序启动时的命令行参数。</p>
                <p>在终端中运行应用时，可以传递参数，例如：</p>
                <pre style="background: #f5f7fa; padding: 8px; border-radius: 4px; margin-top: 8px;">
./app.exe --help
./app.exe --version
./app.exe --config path/to/config.json
                </pre>
                <p style="margin-top: 12px;">点击"加载 CLI 参数"按钮可以查看当前应用的命令行参数信息。</p>
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
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import TitleBar from '@/components/TitleBar.vue'
import { TauriCli } from '@/utils/tauri'

const router = useRouter()
const loading = ref(false)
const cliData = ref(null)

const loadCliArgs = async () => {
  loading.value = true
  try {
    const matches = await TauriCli.getCliMatches()
    cliData.value = matches
    ElMessage.success('CLI 参数加载成功')
  } catch (error) {
    ElMessage.error('加载失败: ' + error.message)
    cliData.value = null
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.cli-demo-page {
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

.json-display {
  max-height: 400px;
  overflow: auto;
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>

