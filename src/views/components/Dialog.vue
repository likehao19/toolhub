<template>
  <DocPage
    icon="💬"
    title="对话框"
    description="文件选择、保存、消息、确认等多种类型的系统对话框"
    :api="apiData"
    :methods="methodsData"
  >
    <template #basic>
      <CodeExample
        title="文件选择对话框"
        :code="openFileCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-space direction="vertical" style="width: 100%">
              <el-button @click="openFileDialog">
                <el-icon><FolderOpened /></el-icon>
                选择文件
              </el-button>
              <el-button @click="openFilesDialog">
                <el-icon><Files /></el-icon>
                选择多个文件
              </el-button>
              <el-button @click="openFolderDialog">
                <el-icon><Folder /></el-icon>
                选择文件夹
              </el-button>
              <el-button @click="openSaveDialog">
                <el-icon><Document /></el-icon>
                保存文件
              </el-button>
              <div v-if="selectedPath" style="margin-top: 16px; padding: 12px; background: var(--el-fill-color-light); border-radius: 4px;">
                <strong>选择结果：</strong>
                <pre style="margin: 8px 0 0 0; white-space: pre-wrap;">{{ selectedPath }}</pre>
              </div>
            </el-space>
          </el-card>
        </template>
      </CodeExample>

      <CodeExample
        title="消息对话框"
        :code="messageCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-space wrap>
              <el-button type="info" @click="showMessage">消息对话框</el-button>
              <el-button type="warning" @click="showConfirm">确认对话框</el-button>
              <el-button type="danger" @click="showAsk">询问对话框</el-button>
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
import { FolderOpened, Files, Folder, Document } from '@element-plus/icons-vue'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import { TauriDialog } from '@/utils/tauri'

const selectedPath = ref('')

const openFileCode = `import { TauriDialog } from '@/utils/tauri'

// 选择单个文件
const path = await TauriDialog.openFile()
if (path) {
}

// 选择多个文件
const paths = await TauriDialog.openFiles()
if (paths) {
}

// 选择文件夹
const folderPath = await TauriDialog.selectFolder()
if (folderPath) {
}

// 保存文件
const savePath = await TauriDialog.saveFile({
  defaultPath: 'untitled.txt'
})
if (savePath) {
}`

const messageCode = `import { TauriDialog } from '@/utils/tauri'

// 消息对话框
await TauriDialog.messageDialog('这是一个消息', {
  title: '消息',
  kind: 'info'
})

// 确认对话框
const confirmed = await TauriDialog.confirmDialog('确定要执行吗？', {
  title: '确认',
  kind: 'warning'
})

// 询问对话框
const result = await TauriDialog.askDialog('是否继续？', {
  title: '询问',
  kind: 'question'
})`

const apiData = [
  {
    name: 'options',
    type: 'Object',
    default: '{}',
    description: '对话框选项，包括 title、defaultPath、filters 等'
  }
]

const methodsData = [
  {
    name: 'openFile',
    description: '打开文件选择对话框',
    params: [
      { name: 'options', type: 'Object', description: '对话框选项' }
    ]
  },
  {
    name: 'openFiles',
    description: '打开多文件选择对话框',
    params: [
      { name: 'options', type: 'Object', description: '对话框选项' }
    ]
  },
  {
    name: 'selectFolder',
    description: '打开文件夹选择对话框',
    params: [
      { name: 'options', type: 'Object', description: '对话框选项' }
    ]
  },
  {
    name: 'saveFile',
    description: '打开保存文件对话框',
    params: [
      { name: 'options', type: 'Object', description: '对话框选项，包含 defaultPath' }
    ]
  },
  {
    name: 'messageDialog',
    description: '显示消息对话框',
    params: [
      { name: 'msg', type: 'String', description: '消息内容' },
      { name: 'options', type: 'Object', description: '对话框选项，包含 title、kind' }
    ]
  },
  {
    name: 'confirmDialog',
    description: '显示确认对话框',
    params: [
      { name: 'msg', type: 'String', description: '确认消息' },
      { name: 'options', type: 'Object', description: '对话框选项' }
    ]
  },
  {
    name: 'askDialog',
    description: '显示询问对话框',
    params: [
      { name: 'msg', type: 'String', description: '询问消息' },
      { name: 'options', type: 'Object', description: '对话框选项' }
    ]
  }
]

const openFileDialog = async () => {
  const path = await TauriDialog.openFile()
  if (path) {
    selectedPath.value = `单个文件: ${path}`
  }
}

const openFilesDialog = async () => {
  const paths = await TauriDialog.openFiles()
  if (paths) {
    selectedPath.value = `多个文件:\n${paths.join('\n')}`
  }
}

const openFolderDialog = async () => {
  const path = await TauriDialog.selectFolder()
  if (path) {
    selectedPath.value = `文件夹: ${path}`
  }
}

const openSaveDialog = async () => {
  const path = await TauriDialog.saveFile({
    defaultPath: 'untitled.txt'
  })
  if (path) {
    selectedPath.value = `保存路径: ${path}`
  }
}

const showMessage = async () => {
  await TauriDialog.messageDialog('这是一个消息对话框示例', {
    title: '消息',
    kind: 'info'
  })
}

const showConfirm = async () => {
  const confirmed = await TauriDialog.confirmDialog('确定要执行此操作吗？', {
    title: '确认',
    kind: 'warning'
  })
  ElMessage.info(confirmed ? '已确认' : '已取消')
}

const showAsk = async () => {
  const result = await TauriDialog.askDialog('是否继续？', {
    title: '询问',
    kind: 'question'
  })
  ElMessage.info(result ? '选择了是' : '选择了否')
}
</script>

