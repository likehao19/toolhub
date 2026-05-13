<template>
  <DocPage
    icon="📋"
    title="剪贴板管理"
    description="读取和写入系统剪贴板内容，支持文本和图片等多种格式。剪贴板 API 提供了简单易用的接口来操作系统剪贴板，可以读取当前剪贴板内容，也可以将文本写入剪贴板。"
    :api="apiData"
    :methods="methodsData"
  >
    <template #basic>
      <CodeExample
        title="基础用法 - 读取剪贴板"
        :code="readCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-button type="primary" @click="readClipboard">
              读取剪贴板
            </el-button>
            <div v-if="clipboardContent" style="margin-top: 16px; padding: 12px; background: var(--el-fill-color-light); border-radius: 4px;">
              <strong>剪贴板内容：</strong>
              <pre style="margin: 8px 0 0 0; white-space: pre-wrap;">{{ clipboardContent }}</pre>
            </div>
          </el-card>
        </template>
      </CodeExample>

      <CodeExample
        title="写入剪贴板"
        :code="writeCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-input
              v-model="textToWrite"
              placeholder="输入要写入剪贴板的内容"
              style="margin-bottom: 12px;"
            />
            <el-button type="primary" @click="writeClipboard" :disabled="!textToWrite">
              写入剪贴板
            </el-button>
          </el-card>
        </template>
      </CodeExample>
    </template>

    <template #examples>
      <CodeExample
        title="完整示例"
        :code="fullCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-space direction="vertical" style="width: 100%;">
              <div>
                <el-button type="primary" @click="readClipboard">
                  <el-icon><DocumentCopy /></el-icon>
                  读取剪贴板
                </el-button>
                <el-button @click="clearClipboard">
                  <el-icon><Delete /></el-icon>
                  清空剪贴板
                </el-button>
              </div>
              
              <el-input
                v-model="textToWrite"
                type="textarea"
                :rows="4"
                placeholder="输入要写入剪贴板的内容"
              />
              
              <el-button type="success" @click="writeClipboard" :disabled="!textToWrite" style="width: 100%;">
                <el-icon><Check /></el-icon>
                写入剪贴板
              </el-button>
              
              <div v-if="clipboardContent" style="padding: 12px; background: var(--el-fill-color-light); border-radius: 4px;">
                <div style="font-weight: 600; margin-bottom: 8px;">当前剪贴板内容：</div>
                <pre style="margin: 0; white-space: pre-wrap; word-break: break-all;">{{ clipboardContent }}</pre>
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
import { DocumentCopy, Delete, Check } from '@element-plus/icons-vue'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import { TauriClipboard } from '@/utils/tauri'

const clipboardContent = ref('')
const textToWrite = ref('')

const readCode = `import { TauriClipboard } from '@/utils/tauri'

// 读取剪贴板内容
const content = await TauriClipboard.readText()`

const writeCode = `import { TauriClipboard } from '@/utils/tauri'

// 写入文本到剪贴板
await TauriClipboard.writeText('Hello World')`

const fullCode = `import { TauriClipboard } from '@/utils/tauri'

// 读取剪贴板
const content = await TauriClipboard.readText()

// 写入剪贴板
await TauriClipboard.writeText('Hello World')

// 清空剪贴板
await TauriClipboard.writeText('')`

const readClipboard = async () => {
  try {
    clipboardContent.value = await TauriClipboard.readText()
    ElMessage.success('读取成功')
  } catch (error) {
    ElMessage.error('读取失败: ' + error.message)
  }
}

const writeClipboard = async () => {
  if (!textToWrite.value) {
    ElMessage.warning('请输入内容')
    return
  }
  
  try {
    await TauriClipboard.writeText(textToWrite.value)
    ElMessage.success('已写入剪贴板')
    clipboardContent.value = textToWrite.value
  } catch (error) {
    ElMessage.error('写入失败: ' + error.message)
  }
}

const clearClipboard = async () => {
  try {
    await TauriClipboard.writeText('')
    clipboardContent.value = ''
    textToWrite.value = ''
    ElMessage.success('已清空剪贴板')
  } catch (error) {
    ElMessage.error('清空失败: ' + error.message)
  }
}

const apiData = [
  {
    name: '无',
    type: '-',
    default: '-',
    description: '剪贴板 API 不需要额外参数'
  }
]

const methodsData = [
  {
    name: 'readText',
    description: '从系统剪贴板读取文本内容。如果剪贴板为空或包含非文本内容，将返回空字符串。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数' }
    ]
  },
  {
    name: 'writeText',
    description: '将文本内容写入系统剪贴板。写入成功后，其他应用程序可以读取该文本内容。',
    params: [
      { name: 'text', type: 'String', description: '要写入剪贴板的文本内容，可以是任意字符串' }
    ]
  },
  {
    name: 'read',
    description: '从系统剪贴板读取文本内容（readText 的别名方法）。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数' }
    ]
  },
  {
    name: 'write',
    description: '将文本内容写入系统剪贴板（writeText 的别名方法，会显示成功消息）。',
    params: [
      { name: 'text', type: 'String', description: '要写入剪贴板的文本内容' }
    ]
  }
]
</script>

