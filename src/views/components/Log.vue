<template>
  <DocPage
    icon="📝"
    title="日志记录"
    description="可配置的日志记录功能，支持不同日志级别。日志 API 提供了结构化的日志记录功能，支持多种日志级别（Debug、Info、Warn、Error），可以将日志输出到控制台、文件或远程服务器。日志可以帮助开发者调试应用、追踪问题和监控应用运行状态。"
    :api="apiData"
    :methods="methodsData"
  >
    <template #basic>
      <CodeExample
        title="发送日志"
        :code="basicCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="logForm" label-width="100px">
              <el-form-item label="日志级别">
                <el-select v-model="logForm.level" style="width: 100%">
                  <el-option label="Debug - 调试信息" value="debug" />
                  <el-option label="Info - 普通信息" value="info" />
                  <el-option label="Warn - 警告信息" value="warn" />
                  <el-option label="Error - 错误信息" value="error" />
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
                <el-button @click="clearLogs">清空日志历史</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </template>
      </CodeExample>
    </template>

    <template #examples>
      <CodeExample
        title="快速发送不同级别的日志"
        :code="quickLogCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-space direction="vertical" style="width: 100%;">
              <div>
                <h4 style="margin: 0 0 12px 0; color: #303133;">快速发送日志</h4>
                <el-space wrap>
                  <el-button @click="quickLog('debug', '这是一条调试日志')" type="info" plain>
                    Debug 日志
                  </el-button>
                  <el-button @click="quickLog('info', '这是一条信息日志')" type="primary" plain>
                    Info 日志
                  </el-button>
                  <el-button @click="quickLog('warn', '这是一条警告日志')" type="warning" plain>
                    Warn 日志
                  </el-button>
                  <el-button @click="quickLog('error', '这是一条错误日志')" type="danger" plain>
                    Error 日志
                  </el-button>
                </el-space>
              </div>
              <el-divider />
              <div v-if="logHistory.length > 0">
                <h4 style="margin: 0 0 12px 0; color: #303133;">日志历史</h4>
                <div style="max-height: 300px; overflow-y: auto; padding: 12px; background: #f5f7fa; border-radius: 4px;">
                  <div v-for="(log, index) in logHistory" :key="index" style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px;">
                    <el-tag :type="getLogTagType(log.level)" size="small" style="margin-right: 8px;">
                      {{ log.level.toUpperCase() }}
                    </el-tag>
                    <span style="font-size: 12px; color: #909399; margin-right: 8px;">{{ log.time }}</span>
                    <span>{{ log.message }}</span>
                  </div>
                </div>
              </div>
            </el-space>
          </el-card>
        </template>
      </CodeExample>
    </template>
  </DocPage>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Document } from '@element-plus/icons-vue'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import { TauriLog } from '@/utils/tauri'

// API 数据
const apiData = [
  {
    name: 'debugLog',
    description: '发送调试级别的日志',
    params: [
      { name: 'message', type: 'string', description: '日志消息' },
      { name: '...args', type: 'any', description: '额外的参数' }
    ],
    returns: 'void',
    example: "TauriLog.debugLog('调试信息', { key: 'value' })"
  },
  {
    name: 'infoLog',
    description: '发送信息级别的日志',
    params: [
      { name: 'message', type: 'string', description: '日志消息' },
      { name: '...args', type: 'any', description: '额外的参数' }
    ],
    returns: 'void',
    example: "TauriLog.infoLog('普通信息')"
  },
  {
    name: 'warnLog',
    description: '发送警告级别的日志',
    params: [
      { name: 'message', type: 'string', description: '日志消息' },
      { name: '...args', type: 'any', description: '额外的参数' }
    ],
    returns: 'void',
    example: "TauriLog.warnLog('警告信息')"
  },
  {
    name: 'errorLog',
    description: '发送错误级别的日志',
    params: [
      { name: 'message', type: 'string', description: '日志消息' },
      { name: '...args', type: 'any', description: '额外的参数' }
    ],
    returns: 'void',
    example: "TauriLog.errorLog('错误信息')"
  }
]

const methodsData = [
  {
    name: 'debugLog',
    description: '发送调试日志',
    usage: "TauriLog.debugLog('调试信息')"
  },
  {
    name: 'infoLog',
    description: '发送信息日志',
    usage: "TauriLog.infoLog('普通信息')"
  },
  {
    name: 'warnLog',
    description: '发送警告日志',
    usage: "TauriLog.warnLog('警告信息')"
  },
  {
    name: 'errorLog',
    description: '发送错误日志',
    usage: "TauriLog.errorLog('错误信息')"
  }
]

const logForm = ref({
  level: 'info',
  message: ''
})
const logHistory = ref([])

const basicCode = `import { TauriLog } from '@/utils/tauri'

// 发送不同级别的日志
TauriLog.debugLog('调试信息', { key: 'value' })
TauriLog.infoLog('普通信息')
TauriLog.warnLog('警告信息')
TauriLog.errorLog('错误信息')

// 日志会输出到控制台或配置的日志目标`

const quickLogCode = `import { TauriLog } from '@/utils/tauri'

// 快速发送日志
TauriLog.debugLog('调试信息')
TauriLog.infoLog('应用启动')
TauriLog.warnLog('内存使用率较高')
TauriLog.errorLog('文件读取失败')

// 带额外参数
TauriLog.infoLog('用户操作', { action: 'click', button: 'submit' })`

const getLogTagType = (level) => {
  const typeMap = {
    debug: 'info',
    info: 'primary',
    warn: 'warning',
    error: 'danger'
  }
  return typeMap[level] || 'info'
}

const sendLog = async () => {
  if (!logForm.value.message) {
    ElMessage.warning('请输入日志消息')
    return
  }
  
  try {
    const levelMap = {
      debug: TauriLog.debugLog,
      info: TauriLog.infoLog,
      warn: TauriLog.warnLog,
      error: TauriLog.errorLog
    }
    levelMap[logForm.value.level](logForm.value.message)
    
    // 添加到历史记录
    logHistory.value.unshift({
      level: logForm.value.level,
      message: logForm.value.message,
      time: new Date().toLocaleTimeString()
    })
    
    // 限制历史记录数量
    if (logHistory.value.length > 50) {
      logHistory.value = logHistory.value.slice(0, 50)
    }
    
    ElMessage.success('日志已发送')
    logForm.value.message = ''
  } catch (error) {
    ElMessage.error('发送失败: ' + (error.message || String(error)))
  }
}

const quickLog = (level, message) => {
  logForm.value.level = level
  logForm.value.message = message
  sendLog()
}

const clearLogs = () => {
  logHistory.value = []
  ElMessage.success('日志历史已清空')
}
</script>
