<template>
  <DocPage
    icon="🔗"
    title="打开外部应用"
    description="在浏览器中打开 URL 或打开文件/目录。打开外部应用 API 提供了便捷的方式来调用系统默认程序打开 URL、文件或文件夹。支持在默认浏览器中打开网页链接，使用系统默认程序打开文件，以及在文件管理器中打开文件夹。"
    :api="apiData"
    :methods="methodsData"
  >
    <template #basic>
      <CodeExample
        title="打开 URL"
        :code="urlCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-input
              v-model="urlInput"
              placeholder="输入 URL，例如: https://www.baidu.com"
              style="margin-bottom: 12px"
            />
            <el-button type="primary" @click="openUrlHandler">
              <el-icon><Link /></el-icon>
              在浏览器中打开
            </el-button>
          </el-card>
        </template>
      </CodeExample>

      <CodeExample
        title="打开文件/目录"
        :code="pathCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-button @click="openPathDialog">
              <el-icon><FolderOpened /></el-icon>
              选择并打开文件/目录
            </el-button>
            <div v-if="openedPath" style="margin-top: 12px; padding: 12px; background: #f5f7fa; border-radius: 4px;">
              <strong>已打开：</strong>
              <pre style="margin: 8px 0 0 0;">{{ openedPath }}</pre>
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
import { Link, FolderOpened } from '@element-plus/icons-vue'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import { TauriShell, TauriDialog } from '@/utils/tauri'
import { openPath } from '@tauri-apps/plugin-opener'

const urlInput = ref('https://www.baidu.com')
const openedPath = ref('')

const urlCode = `import { TauriShell } from '@/utils/tauri'

// 在浏览器中打开 URL
await TauriShell.openURL('https://www.baidu.com')`

const pathCode = `import { openPath } from '@tauri-apps/plugin-opener'

// 打开文件或目录
await openPath('/path/to/file')`

const openUrlHandler = async () => {
  if (!urlInput.value) {
    ElMessage.warning('请输入 URL')
    return
  }
  try {
    await TauriShell.openURL(urlInput.value)
  } catch (error) {
    // TauriShell.openURL 内部已经处理了错误消息显示
    // 这里只需要记录日志
  }
}

const openPathDialog = async () => {
  try {
    const path = await TauriDialog.openFile()
    if (path) {
      try {
        await openPath(path)
        openedPath.value = path
        ElMessage.success('已打开')
      } catch (error) {
        const errorMsg = error?.message || error?.toString() || String(error) || '未知错误'
        ElMessage.error('打开失败: ' + errorMsg)
      }
    }
  } catch (error) {
    const errorMsg = error?.message || error?.toString() || String(error) || '未知错误'
    ElMessage.error('选择文件失败: ' + errorMsg)
  }
}

const apiData = [
  {
    name: 'url',
    type: 'String',
    default: '-',
    description: '要打开的 URL 地址，必须是完整的 URL（包含协议，如 https://）'
  },
  {
    name: 'path',
    type: 'String',
    default: '-',
    description: '要打开的文件或目录路径，可以是绝对路径或相对路径'
  }
]

const methodsData = [
  {
    name: 'openURL',
    description: '在系统默认浏览器中打开指定的 URL 地址。会自动调用系统默认浏览器打开网页链接。',
    params: [
      { name: 'url', type: 'String', description: '要打开的 URL 地址，例如：https://www.baidu.com' }
    ]
  },
  {
    name: 'openPath',
    description: '使用系统默认程序打开指定的文件或目录。文件会使用关联的应用程序打开，目录会在文件管理器中打开。',
    params: [
      { name: 'path', type: 'String', description: '文件或目录的路径，例如：C:\\Users\\Desktop\\file.txt' }
    ]
  }
]
</script>

