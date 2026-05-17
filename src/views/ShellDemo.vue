<template>
  <div class="shell-demo-page">
    <TitleBar title="Shell 命令 - Tauri 功能演示" />
    <div class="demo-view">
      <el-page-header @back="goBack">
        <template #content>
          <span class="page-title">💻 Shell 命令</span>
        </template>
      </el-page-header>

      <div class="content-section">
        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">执行命令</div>
          </template>
          <el-form :model="commandForm" label-width="100px">
            <el-form-item label="命令">
              <el-input
                v-model="commandForm.program"
                placeholder="例如: echo, dir, ls"
                style="width: 200px"
              />
            </el-form-item>
            <el-form-item label="参数">
              <el-input
                v-model="commandForm.args"
                placeholder="用空格分隔，例如: hello world"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="executeCommand" :loading="executing">
                <el-icon><Promotion /></el-icon>
                执行命令
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">命令输出</div>
          </template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="退出代码">
              <el-tag :type="commandResult.code === 0 ? 'success' : 'danger'">
                {{ commandResult.code }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="标准输出">
              <pre class="output-pre">{{ commandResult.stdout || '(无输出)' }}</pre>
            </el-descriptions-item>
            <el-descriptions-item label="错误输出">
              <pre class="output-pre error" v-if="commandResult.stderr">
                {{ commandResult.stderr }}
              </pre>
              <span v-else>(无错误)</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">快速命令 (Windows)</div>
          </template>
          <el-alert
            type="info"
            :closable="false"
            show-icon
            style="margin-bottom: 16px"
          >
            <template #title>
              <div>如果命令执行失败，请重启应用以让权限配置生效</div>
            </template>
          </el-alert>
          <el-row :gutter="12">
            <el-col :span="12">
              <div class="command-group">
                <div class="group-title">基础命令</div>
                <el-space wrap direction="vertical" style="width: 100%">
                  <el-button @click="runQuickCommand('cmd', ['/C', 'echo', 'Hello Tauri!'])" size="small">
                    Echo 输出
                  </el-button>
                  <el-button @click="runQuickCommand('cmd', ['/C', 'date', '/T'])" size="small">
                    查看日期
                  </el-button>
                  <el-button @click="runQuickCommand('cmd', ['/C', 'time', '/T'])" size="small">
                    查看时间
                  </el-button>
                  <el-button @click="runQuickCommand('whoami', [])" size="small">
                    当前用户
                  </el-button>
                  <el-button @click="runQuickCommand('hostname', [])" size="small">
                    主机名
                  </el-button>
                  <el-button @click="runQuickCommand('cmd', ['/C', 'ver'])" size="small">
                    Windows 版本
                  </el-button>
                </el-space>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="command-group">
                <div class="group-title">文件系统</div>
                <el-space wrap direction="vertical" style="width: 100%">
                  <el-button @click="runQuickCommand('cmd', ['/C', 'dir'])" size="small">
                    列出目录
                  </el-button>
                  <el-button @click="runQuickCommand('cmd', ['/C', 'cd'])" size="small">
                    当前目录
                  </el-button>
                  <el-button @click="runQuickCommand('cmd', ['/C', 'dir', '/B'])" size="small">
                    简洁列表
                  </el-button>
                </el-space>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="command-group">
                <div class="group-title">网络命令</div>
                <el-space wrap direction="vertical" style="width: 100%">
                  <el-button @click="runQuickCommand('ipconfig', [])" size="small">
                    IP 配置
                  </el-button>
                  <el-button @click="runQuickCommand('ipconfig', ['/all'])" size="small">
                    详细 IP 信息
                  </el-button>
                  <el-button @click="runQuickCommand('ping', ['-n', '2', '127.0.0.1'])" size="small">
                    Ping 本地
                  </el-button>
                  <el-button @click="runQuickCommand('netstat', ['-an'])" size="small">
                    网络连接
                  </el-button>
                </el-space>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="command-group">
                <div class="group-title">系统信息</div>
                <el-space wrap direction="vertical" style="width: 100%">
                  <el-button @click="runQuickCommand('systeminfo', [])" size="small">
                    系统信息
                  </el-button>
                  <el-button @click="runQuickCommand('tasklist', [])" size="small">
                    进程列表
                  </el-button>
                  <el-button @click="runQuickCommand('wmic', ['os', 'get', 'caption'])" size="small">
                    OS 信息
                  </el-button>
                  <el-button @click="runQuickCommand('wmic', ['cpu', 'get', 'name'])" size="small">
                    CPU 信息
                  </el-button>
                </el-space>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Promotion } from '@element-plus/icons-vue'
import TitleBar from '@/components/TitleBar.vue'
import { TauriShell } from '@/utils/tauri'

const router = useRouter()
const executing = ref(false)
const commandForm = ref({
  program: '',
  args: ''
})
const commandResult = ref({
  code: -1,
  stdout: '',
  stderr: ''
})

const executeCommand = async () => {
  if (!commandForm.value.program.trim()) {
    ElMessage.warning('请输入命令')
    return
  }

  executing.value = true
  try {
    const args = commandForm.value.args
      ? commandForm.value.args.split(' ').filter(a => a)
      : []
    
    const result = await TauriShell.executeCommand(commandForm.value.program, args)
    commandResult.value = result
  } finally {
    executing.value = false
  }
}

const runQuickCommand = async (program, args) => {
  commandForm.value.program = program
  commandForm.value.args = args.join(' ')
  await executeCommand()
}

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.shell-demo-page {
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

.output-pre {
  margin: 0;
  padding: 8px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-family: "PingFang SC";
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}

.output-pre.error {
  background: var(--surface-panel-soft);
  color: var(--el-color-danger);
}

.command-group {
  margin-bottom: 16px;
}

.group-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 14px;
}
</style>

