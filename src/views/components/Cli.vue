<template>
  <DocPage
    icon="💻"
    title="命令行接口"
    description="解析应用程序启动时的命令行参数。CLI API 允许应用接收和处理命令行参数，支持定义子命令、参数选项、标志等。这对于创建命令行工具或支持通过命令行启动的应用非常有用。"
    :api="apiData"
    :methods="methodsData"
  >
    <template #basic>
      <CodeExample
        title="获取 CLI 参数"
        :code="basicCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-alert
              title="提示"
              type="info"
              :closable="false"
              style="margin-bottom: 16px;"
            >
              在开发模式下，CLI 参数可能为空。要测试 CLI 功能，需要在启动应用时传递参数，例如：<code>npm run tauri dev -- --help</code>
            </el-alert>
            <el-button type="primary" @click="loadCliArgs" :loading="loading">
              <el-icon><Refresh /></el-icon>
              加载 CLI 参数
            </el-button>
            <el-descriptions v-if="cliData" :column="1" border style="margin-top: 16px;">
              <el-descriptions-item label="参数">
                <pre style="margin: 0; white-space: pre-wrap; max-height: 200px; overflow: auto;">{{ JSON.stringify(cliData.args, null, 2) }}</pre>
              </el-descriptions-item>
              <el-descriptions-item label="子命令" v-if="cliData.subcommand">
                <pre style="margin: 0; white-space: pre-wrap; max-height: 200px; overflow: auto;">{{ JSON.stringify(cliData.subcommand, null, 2) }}</pre>
              </el-descriptions-item>
              <el-descriptions-item label="原始参数" v-if="cliData.rawArgs">
                <pre style="margin: 0; white-space: pre-wrap; max-height: 200px; overflow: auto;">{{ JSON.stringify(cliData.rawArgs, null, 2) }}</pre>
              </el-descriptions-item>
            </el-descriptions>
            <el-empty v-else-if="!loading && cliData === null" description="暂无 CLI 参数数据" />
          </el-card>
        </template>
      </CodeExample>
    </template>

    <template #examples>
      <CodeExample
        title="CLI 参数结构说明"
        :code="structureCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="args">
                解析后的参数对象，包含所有定义的参数和选项
              </el-descriptions-item>
              <el-descriptions-item label="subcommand">
                子命令对象（如果定义了子命令）
              </el-descriptions-item>
              <el-descriptions-item label="rawArgs">
                原始命令行参数数组
              </el-descriptions-item>
            </el-descriptions>
            <el-divider />
            <div style="padding: 12px; background: #f5f7fa; border-radius: 4px; margin-top: 16px;">
              <div style="font-weight: 600; margin-bottom: 8px;">配置示例（在 tauri.conf.json 中）：</div>
              <pre style="margin: 0; font-size: 12px; white-space: pre-wrap;">{
  "plugins": {
    "cli": {
      "description": "应用描述",
      "args": [
        {
          "name": "input",
          "description": "输入文件",
          "required": true
        },
        {
          "name": "output",
          "short": "o",
          "description": "输出文件"
        }
      ],
      "subcommands": [
        {
          "name": "build",
          "description": "构建命令"
        }
      ]
    }
  }
}</pre>
            </div>
          </el-card>
        </template>
      </CodeExample>
    </template>
  </DocPage>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import { TauriCli } from '@/utils/tauri'

// API 数据
const apiData = [
  {
    name: 'getCliMatches',
    description: '获取解析后的命令行参数和选项',
    params: [],
    returns: 'Promise<Matches>',
    example: "const matches = await TauriCli.getCliMatches()"
  }
]

const methodsData = [
  {
    name: 'getCliMatches',
    description: '获取 CLI 参数匹配结果',
    usage: "const matches = await TauriCli.getCliMatches()"
  }
]

const loading = ref(false)
const cliData = ref(null)

const basicCode = `import { TauriCli } from '@/utils/tauri'

// 获取命令行参数
const matches = await TauriCli.getCliMatches()
// 访问特定参数
if (matches.args.input) {
}

if (matches.args.output) {
}`

const structureCode = `import { TauriCli } from '@/utils/tauri'

// CLI 参数结构
const matches = await TauriCli.getCliMatches()

// matches.args - 参数对象
// {
//   input: { value: 'file.txt', occurrences: 1 },
//   output: { value: 'out.txt', occurrences: 1 }
// }

// matches.subcommand - 子命令对象（如果有）
// {
//   name: 'build',
//   matches: { ... }
// }

// matches.rawArgs - 原始参数数组
// ['--input', 'file.txt', '--output', 'out.txt']`

const loadCliArgs = async () => {
  loading.value = true
  try {
    const matches = await TauriCli.getCliMatches()
    cliData.value = {
      args: matches.args || {},
      subcommand: matches.subcommand || null,
      rawArgs: matches.rawArgs || []
    }
    if (Object.keys(cliData.value.args).length === 0 && !cliData.value.subcommand && cliData.value.rawArgs.length === 0) {
      ElMessage.info('当前没有 CLI 参数')
    } else {
      ElMessage.success('CLI 参数已加载')
    }
  } catch (error) {
    ElMessage.error('加载失败: ' + (error.message || String(error)))
    cliData.value = null
  } finally {
    loading.value = false
  }
}

// 初始化时自动加载
loadCliArgs()
</script>
