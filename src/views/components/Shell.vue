<template>
  <DocPage
    icon="💻"
    title="Shell 命令"
    description="执行系统 Shell 命令，获取命令输出结果。Shell 命令 API 允许你在应用中执行系统命令，获取命令的标准输出、错误输出和退出代码。支持 Windows、macOS 和 Linux 平台，自动处理编码问题，并提供友好的错误提示。在 Windows 上，内置命令（如 dir、ls）会自动通过 cmd.exe 执行。"
    :api="apiData"
    :methods="methodsData"
  >
    <template #basic>
      <CodeExample
        title="执行 Shell 命令"
        :code="basicCode"
      >
        <template #demo>
          <el-card shadow="hover">
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
            <el-descriptions v-if="commandResult.code !== null" :column="1" border style="margin-top: 16px;">
              <el-descriptions-item label="退出代码">
                <el-tag :type="commandResult.code === 0 ? 'success' : 'danger'">
                  {{ commandResult.code }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="标准输出">
                <pre style="margin: 0; white-space: pre-wrap; font-family: 'Consolas', 'Monaco', monospace; font-size: 12px;">{{ commandResult.stdout || '(无输出)' }}</pre>
              </el-descriptions-item>
              <el-descriptions-item label="错误输出">
                <pre v-if="commandResult.stderr" style="margin: 0; white-space: pre-wrap; color: #f56c6c; font-family: 'Consolas', 'Monaco', monospace; font-size: 12px;">{{ commandResult.stderr }}</pre>
                <span v-else>(无错误)</span>
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </template>
      </CodeExample>
    </template>

    <template #examples>
      <CodeExample
        title="快速命令 (Windows)"
        :code="quickCommandsCode"
      >
        <template #demo>
          <el-card shadow="hover">
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
                    <el-button @click="runQuickCommand('ls', [])" size="small">
                      ls (自动转换为 dir)
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
        </template>
      </CodeExample>
    </template>
  </DocPage>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Promotion } from '@element-plus/icons-vue'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import { TauriShell } from '@/utils/tauri'

const executing = ref(false)
const commandForm = ref({
  program: '',
  args: ''
})
const commandResult = ref({
  code: null,
  stdout: '',
  stderr: ''
})

const basicCode = `import { TauriShell } from '@/utils/tauri'

// 执行命令
const result = await TauriShell.executeCommand('echo', ['Hello Tauri!'])
await TauriShell.executeCommand('ipconfig', [])
await TauriShell.executeCommand('whoami', [])`

const executeCommand = async () => {
  if (!commandForm.value.program) {
    ElMessage.warning('请输入命令')
    return
  }
  
  executing.value = true
  try {
    const args = commandForm.value.args ? commandForm.value.args.split(' ').filter(a => a) : []
    const result = await TauriShell.executeCommand(commandForm.value.program, args)
    commandResult.value = result
  } catch (error) {
    ElMessage.error('执行命令失败: ' + error.message)
    commandResult.value = {
      code: -1,
      stdout: '',
      stderr: error.message
    }
  } finally {
    executing.value = false
  }
}

const runQuickCommand = async (program, args) => {
  commandForm.value.program = program
  commandForm.value.args = args.join(' ')
  await executeCommand()
}

const apiData = [
  {
    name: 'program',
    type: 'String',
    default: '-',
    description: '要执行的程序名称或命令，例如：cmd、dir、ls、ipconfig 等'
  },
  {
    name: 'args',
    type: 'Array<String>',
    default: '[]',
    description: '命令参数数组，例如：["/C", "dir", "/B"]'
  }
]

const methodsData = [
  {
    name: 'executeCommand',
    description: '执行系统 Shell 命令并返回执行结果。命令会在系统 Shell 中执行，返回标准输出、错误输出和退出代码。在 Windows 上，内置命令会自动通过 cmd.exe 执行。',
    params: [
      { name: 'program', type: 'String', description: '要执行的程序名称，例如：cmd、dir、ls、ipconfig、ping 等' },
      { name: 'args', type: 'Array<String>', description: '命令参数数组，例如：["/C", "dir"] 或 ["-n", "2", "127.0.0.1"]' }
    ]
  },
  {
    name: 'openURL',
    description: '在系统默认浏览器中打开 URL 地址。',
    params: [
      { name: 'url', type: 'String', description: '要打开的 URL 地址' }
    ]
  }
]
</script>

<style scoped>
.command-group {
  margin-bottom: 16px;
}

.group-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: #666;
  font-size: 14px;
}
</style>

