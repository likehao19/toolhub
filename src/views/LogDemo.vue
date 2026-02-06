<template>
  <div class="log-demo-page">
    <TitleBar title="日志记录 - Tauri 功能演示" />
    <div class="demo-view">
      <el-page-header @back="goBack">
        <template #content>
          <span class="page-title">📝 日志记录</span>
        </template>
      </el-page-header>

      <div class="content-section">
        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">发送日志</div>
          </template>
          <el-form :model="logForm" label-width="100px">
            <el-form-item label="日志级别">
              <el-select v-model="logForm.level" style="width: 100%">
                <el-option label="Debug" value="debug" />
                <el-option label="Info" value="info" />
                <el-option label="Warn" value="warn" />
                <el-option label="Error" value="error" />
              </el-select>
            </el-form-item>
            <el-form-item label="日志消息">
              <el-input
                v-model="logForm.message"
                type="textarea"
                :rows="4"
                placeholder="输入日志消息..."
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="sendLog">
                <el-icon><Document /></el-icon>
                发送日志
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">日志记录</div>
          </template>
          <div class="log-container">
            <div
              v-for="(log, index) in logs"
              :key="index"
              :class="['log-item', log.level]"
            >
              <span class="log-time">{{ log.time }}</span>
              <span class="log-level">{{ log.level.toUpperCase() }}</span>
              <span class="log-content">{{ log.message }}</span>
            </div>
            <div v-if="logs.length === 0" class="empty-log">
              暂无日志记录
            </div>
          </div>
          <el-button @click="clearLogs" style="margin-top: 12px" size="small">
            清空日志
          </el-button>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">快速测试</div>
          </template>
          <el-space wrap direction="vertical" style="width: 100%">
            <el-button @click="quickLog('debug', '这是一条调试日志')">
              发送 Debug 日志
            </el-button>
            <el-button @click="quickLog('info', '这是一条信息日志')">
              发送 Info 日志
            </el-button>
            <el-button @click="quickLog('warn', '这是一条警告日志')">
              发送 Warn 日志
            </el-button>
            <el-button @click="quickLog('error', '这是一条错误日志')">
              发送 Error 日志
            </el-button>
          </el-space>
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
                <p>日志记录插件可以将日志输出到控制台和文件。</p>
                <p>日志级别从低到高：Debug &lt; Info &lt; Warn &lt; Error</p>
                <p>日志文件位置：应用数据目录下的日志文件</p>
                <p>注意：日志会同时显示在浏览器控制台和 Rust 后端控制台中。</p>
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
import { Document } from '@element-plus/icons-vue'
import TitleBar from '@/components/TitleBar.vue'
import { TauriLog } from '@/utils/tauri'

const router = useRouter()
const logForm = ref({
  level: 'info',
  message: ''
})
const logs = ref([])

const addLog = (level, message) => {
  logs.value.unshift({
    level,
    message,
    time: new Date().toLocaleTimeString()
  })
  if (logs.value.length > 100) {
    logs.value = logs.value.slice(0, 100)
  }
}

const sendLog = () => {
  if (!logForm.value.message.trim()) {
    ElMessage.warning('请输入日志消息')
    return
  }

  const { level, message } = logForm.value
  switch (level) {
    case 'debug':
      TauriLog.debugLog(message)
      break
    case 'info':
      TauriLog.infoLog(message)
      break
    case 'warn':
      TauriLog.warnLog(message)
      break
    case 'error':
      TauriLog.errorLog(message)
      break
  }
  
  addLog(level, message)
  ElMessage.success('日志已发送')
  logForm.value.message = ''
}

const quickLog = (level, message) => {
  logForm.value.level = level
  logForm.value.message = message
  sendLog()
}

const clearLogs = () => {
  logs.value = []
}

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.log-demo-page {
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

.log-container {
  max-height: 400px;
  overflow-y: auto;
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 13px;
}

.log-item {
  margin-bottom: 8px;
  padding: 8px;
  background: white;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-item.debug {
  border-left: 3px solid #909399;
}

.log-item.info {
  border-left: 3px solid #409eff;
}

.log-item.warn {
  border-left: 3px solid #e6a23c;
}

.log-item.error {
  border-left: 3px solid #f56c6c;
}

.log-time {
  color: #999;
  font-size: 11px;
  min-width: 80px;
}

.log-level {
  font-weight: 600;
  min-width: 50px;
  font-size: 11px;
}

.log-item.debug .log-level {
  color: #909399;
}

.log-item.info .log-level {
  color: #409eff;
}

.log-item.warn .log-level {
  color: #e6a23c;
}

.log-item.error .log-level {
  color: #f56c6c;
}

.log-content {
  flex: 1;
  word-break: break-all;
}

.empty-log {
  text-align: center;
  color: #999;
  padding: 20px;
}
</style>

