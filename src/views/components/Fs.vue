<template>
  <DocPage
    icon="📁"
    title="文件操作"
    description="完整的文件系统操作功能，包括文件的增删改查、移动、复制、重命名等。文件操作 API 提供了安全的文件系统访问能力，支持文本文件读写、目录创建删除、文件复制移动、重命名等操作。所有操作都通过 Tauri 后端处理，确保安全性和跨平台兼容性。"
    :api="apiData"
    :methods="methodsData"
  >
    <template #basic>
      <CodeExample
        title="读取文件"
        :code="readFileCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="readForm" label-width="120px">
              <el-form-item label="文件路径">
                <el-input v-model="readForm.path" placeholder="例如: C:\Users\test.txt" />
                <el-button @click="selectReadFile" style="margin-left: 8px;">
                  <el-icon><FolderOpened /></el-icon>
                  选择文件
                </el-button>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="readFile" :loading="reading">
                  <el-icon><Document /></el-icon>
                  读取文件
                </el-button>
              </el-form-item>
            </el-form>
            <el-input
              v-if="readResult"
              v-model="readResult"
              type="textarea"
              :rows="10"
              readonly
              style="margin-top: 16px;"
            />
          </el-card>
        </template>
      </CodeExample>
    </template>

    <template #examples>
      <!-- 写入文件 -->
      <CodeExample
        title="写入文件"
        :code="writeFileCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="writeForm" label-width="120px">
              <el-form-item label="文件路径">
                <el-input v-model="writeForm.path" placeholder="例如: C:\Users\test.txt" />
              </el-form-item>
              <el-form-item label="文件内容">
                <el-input
                  v-model="writeForm.content"
                  type="textarea"
                  :rows="6"
                  placeholder="输入文件内容..."
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="writeFile" :loading="writing">
                  <el-icon><Edit /></el-icon>
                  写入文件
                </el-button>
                <el-button @click="fillWriteExample">填充示例</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </template>
      </CodeExample>

      <!-- 创建目录 -->
      <CodeExample
        title="创建目录"
        :code="createDirCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="createDirForm" label-width="120px">
              <el-form-item label="目录路径">
                <el-input v-model="createDirForm.path" placeholder="例如: C:\Users\NewFolder" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="createDirectory" :loading="creating">
                  <el-icon><Plus /></el-icon>
                  创建目录
                </el-button>
                <el-button @click="fillCreateDirExample">填充示例</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </template>
      </CodeExample>

      <!-- 删除文件/目录 -->
      <CodeExample
        title="删除文件或目录"
        :code="deleteFileCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="deleteForm" label-width="120px">
              <el-form-item label="路径">
                <el-input v-model="deleteForm.path" placeholder="文件或目录路径" />
                <el-button @click="selectDeleteFile" style="margin-left: 8px;">
                  <el-icon><FolderOpened /></el-icon>
                  选择
                </el-button>
              </el-form-item>
              <el-form-item>
                <el-button type="danger" @click="deleteFile" :loading="deleting">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </template>
      </CodeExample>

      <!-- 复制文件 -->
      <CodeExample
        title="复制文件或目录"
        :code="copyFileCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="copyForm" label-width="120px">
              <el-form-item label="源路径">
                <el-input v-model="copyForm.source" placeholder="源文件或目录路径" />
                <el-button @click="selectCopySource" style="margin-left: 8px;">
                  <el-icon><FolderOpened /></el-icon>
                  选择
                </el-button>
              </el-form-item>
              <el-form-item label="目标路径">
                <el-input v-model="copyForm.destination" placeholder="目标路径" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="copyFile" :loading="copying">
                  <el-icon><DocumentCopy /></el-icon>
                  复制
                </el-button>
                <el-button @click="fillCopyExample">填充示例</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </template>
      </CodeExample>

      <!-- 移动文件 -->
      <CodeExample
        title="移动文件或目录"
        :code="moveFileCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="moveForm" label-width="120px">
              <el-form-item label="源路径">
                <el-input v-model="moveForm.source" placeholder="源文件或目录路径" />
                <el-button @click="selectMoveSource" style="margin-left: 8px;">
                  <el-icon><FolderOpened /></el-icon>
                  选择
                </el-button>
              </el-form-item>
              <el-form-item label="目标路径">
                <el-input v-model="moveForm.destination" placeholder="目标路径" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="moveFile" :loading="moving">
                  <el-icon><Right /></el-icon>
                  移动
                </el-button>
                <el-button @click="fillMoveExample">填充示例</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </template>
      </CodeExample>

      <!-- 重命名文件 -->
      <CodeExample
        title="重命名文件或目录"
        :code="renameFileCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="renameForm" label-width="120px">
              <el-form-item label="文件路径">
                <el-input v-model="renameForm.path" placeholder="文件或目录路径" />
                <el-button @click="selectRenameFile" style="margin-left: 8px;">
                  <el-icon><FolderOpened /></el-icon>
                  选择
                </el-button>
              </el-form-item>
              <el-form-item label="新名称">
                <el-input v-model="renameForm.newName" placeholder="新文件名或目录名" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="renameFile" :loading="renaming">
                  <el-icon><Edit /></el-icon>
                  重命名
                </el-button>
                <el-button @click="fillRenameExample">填充示例</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </template>
      </CodeExample>

      <!-- 检查文件是否存在 -->
      <CodeExample
        title="检查文件或目录是否存在"
        :code="checkExistsCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="existsForm" label-width="120px">
              <el-form-item label="路径">
                <el-input v-model="existsForm.path" placeholder="文件或目录路径" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="checkExists" :loading="checking">
                  <el-icon><Search /></el-icon>
                  检查
                </el-button>
              </el-form-item>
            </el-form>
            <el-alert
              v-if="existsResult !== null"
              :title="existsResult ? '文件或目录存在' : '文件或目录不存在'"
              :type="existsResult ? 'success' : 'warning'"
              style="margin-top: 16px;"
            />
          </el-card>
        </template>
      </CodeExample>

      <!-- 列出目录内容 -->
      <CodeExample
        title="列出目录内容"
        :code="listDirCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="listDirForm" label-width="120px">
              <el-form-item label="目录路径">
                <el-input v-model="listDirForm.path" placeholder="例如: C:\Users" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="listDirectory" :loading="listing">
                  <el-icon><FolderOpened /></el-icon>
                  列出目录
                </el-button>
              </el-form-item>
            </el-form>
            <el-table
              v-if="listDirResult.length > 0"
              :data="listDirResult"
              border
              style="margin-top: 16px;"
              max-height="300"
            >
              <el-table-column prop="name" label="名称" />
              <el-table-column label="类型" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.isDirectory ? 'primary' : 'info'">
                    {{ row.isDirectory ? '目录' : '文件' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-else-if="listDirExecuted && listDirResult.length === 0" description="目录为空" />
          </el-card>
        </template>
      </CodeExample>
    </template>
  </DocPage>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Edit, Plus, Delete, DocumentCopy, Right, FolderOpened, Search } from '@element-plus/icons-vue'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import { TauriFS, TauriDialog } from '@/utils/tauri'

// API 数据
const apiData = [
  {
    name: 'readText',
    description: '读取文本文件内容',
    params: [
      { name: 'path', type: 'string', description: '文件路径' },
      { name: 'options', type: 'Object', default: '{}', description: '读取选项' }
    ],
    returns: 'Promise<string>',
    example: "const content = await TauriFS.readText('C:\\Users\\test.txt')"
  },
  {
    name: 'writeText',
    description: '写入文本文件',
    params: [
      { name: 'path', type: 'string', description: '文件路径' },
      { name: 'content', type: 'string', description: '文件内容' },
      { name: 'options', type: 'Object', default: '{}', description: '写入选项' }
    ],
    returns: 'Promise<void>',
    example: "await TauriFS.writeText('C:\\Users\\test.txt', 'Hello World')"
  },
  {
    name: 'checkExists',
    description: '检查文件或目录是否存在',
    params: [
      { name: 'path', type: 'string', description: '路径' },
      { name: 'options', type: 'Object', default: '{}', description: '选项' }
    ],
    returns: 'Promise<boolean>',
    example: "const exists = await TauriFS.checkExists('C:\\Users\\test.txt')"
  },
  {
    name: 'createDir',
    description: '创建目录（支持递归创建）',
    params: [
      { name: 'path', type: 'string', description: '目录路径' },
      { name: 'options', type: 'Object', default: '{}', description: '创建选项' }
    ],
    returns: 'Promise<void>',
    example: "await TauriFS.createDir('C:\\Users\\NewFolder')"
  },
  {
    name: 'removeFile',
    description: '删除文件或目录',
    params: [
      { name: 'path', type: 'string', description: '路径' },
      { name: 'options', type: 'Object', default: '{}', description: '删除选项' }
    ],
    returns: 'Promise<void>',
    example: "await TauriFS.removeFile('C:\\Users\\test.txt')"
  },
  {
    name: 'copyFile',
    description: '复制文件或目录',
    params: [
      { name: 'source', type: 'string', description: '源路径' },
      { name: 'destination', type: 'string', description: '目标路径' }
    ],
    returns: 'Promise<void>',
    example: "await TauriFS.copyFile('C:\\Users\\test.txt', 'C:\\Users\\test_copy.txt')"
  },
  {
    name: 'moveFile',
    description: '移动文件或目录（重命名）',
    params: [
      { name: 'source', type: 'string', description: '源路径' },
      { name: 'destination', type: 'string', description: '目标路径' }
    ],
    returns: 'Promise<void>',
    example: "await TauriFS.moveFile('C:\\Users\\test.txt', 'C:\\Users\\renamed.txt')"
  },
  {
    name: 'renameFile',
    description: '重命名文件或目录',
    params: [
      { name: 'path', type: 'string', description: '文件或目录路径' },
      { name: 'newName', type: 'string', description: '新名称' }
    ],
    returns: 'Promise<void>',
    example: "await TauriFS.renameFile('C:\\Users\\test.txt', 'new_name.txt')"
  },
  {
    name: 'listDir',
    description: '列出目录内容',
    params: [
      { name: 'path', type: 'string', description: '目录路径' },
      { name: 'options', type: 'Object', default: '{}', description: '选项' }
    ],
    returns: 'Promise<Array>',
    example: "const items = await TauriFS.listDir('C:\\Users')"
  }
]

const methodsData = [
  {
    name: 'readText',
    description: '读取文本文件',
    usage: "await TauriFS.readText('path/to/file.txt')"
  },
  {
    name: 'writeText',
    description: '写入文本文件',
    usage: "await TauriFS.writeText('path/to/file.txt', 'content')"
  },
  {
    name: 'checkExists',
    description: '检查文件是否存在',
    usage: "await TauriFS.checkExists('path/to/file.txt')"
  },
  {
    name: 'createDir',
    description: '创建目录',
    usage: "await TauriFS.createDir('path/to/dir')"
  },
  {
    name: 'removeFile',
    description: '删除文件或目录',
    usage: "await TauriFS.removeFile('path/to/file.txt')"
  },
  {
    name: 'copyFile',
    description: '复制文件或目录',
    usage: "await TauriFS.copyFile('source', 'destination')"
  },
  {
    name: 'moveFile',
    description: '移动文件或目录',
    usage: "await TauriFS.moveFile('source', 'destination')"
  },
  {
    name: 'renameFile',
    description: '重命名文件或目录',
    usage: "await TauriFS.renameFile('path', 'newName')"
  },
  {
    name: 'listDir',
    description: '列出目录内容',
    usage: "await TauriFS.listDir('path/to/dir')"
  }
]

// 状态
const reading = ref(false)
const writing = ref(false)
const creating = ref(false)
const deleting = ref(false)
const copying = ref(false)
const moving = ref(false)
const renaming = ref(false)
const checking = ref(false)
const listing = ref(false)

// 表单数据
const readForm = ref({ path: '' })
const writeForm = ref({ path: '', content: '' })
const createDirForm = ref({ path: '' })
const deleteForm = ref({ path: '' })
const copyForm = ref({ source: '', destination: '' })
const moveForm = ref({ source: '', destination: '' })
const renameForm = ref({ path: '', newName: '' })
const existsForm = ref({ path: '' })
const listDirForm = ref({ path: '' })

// 结果数据
const readResult = ref('')
const existsResult = ref(null)
const listDirResult = ref([])
const listDirExecuted = ref(false)

// 代码示例
const readFileCode = `import { TauriFS } from '@/utils/tauri'

// 读取文本文件
const content = await TauriFS.readText('C:\\\\Users\\\\test.txt')`

const writeFileCode = `import { TauriFS } from '@/utils/tauri'

// 写入文本文件
await TauriFS.writeText('C:\\\\Users\\\\test.txt', 'Hello World')

// 如果文件不存在会自动创建`

const createDirCode = `import { TauriFS } from '@/utils/tauri'

// 创建目录（支持递归创建）
await TauriFS.createDir('C:\\Users\\NewFolder')

// 创建多级目录
await TauriFS.createDir('C:\\Users\\Parent\\Child\\GrandChild')`

const deleteFileCode = `import { TauriFS } from '@/utils/tauri'

// 删除文件
await TauriFS.removeFile('C:\\Users\\test.txt')

// 删除目录
await TauriFS.removeFile('C:\\Users\\OldFolder')`

const copyFileCode = `import { TauriFS } from '@/utils/tauri'

// 复制文件
await TauriFS.copyFile('C:\\Users\\test.txt', 'C:\\Users\\test_copy.txt')

// 复制目录（递归复制）
await TauriFS.copyFile('C:\\Users\\Folder', 'C:\\Users\\Folder_Copy')`

const moveFileCode = `import { TauriFS } from '@/utils/tauri'

// 移动文件
await TauriFS.moveFile('C:\\Users\\test.txt', 'C:\\Users\\Documents\\test.txt')

// 移动目录
await TauriFS.moveFile('C:\\Users\\OldFolder', 'C:\\Users\\NewFolder')`

const renameFileCode = `import { TauriFS } from '@/utils/tauri'

// 重命名文件
await TauriFS.renameFile('C:\\Users\\test.txt', 'new_name.txt')

// 重命名目录
await TauriFS.renameFile('C:\\Users\\OldFolder', 'NewFolder')`

const checkExistsCode = `import { TauriFS } from '@/utils/tauri'

// 检查文件是否存在
const exists = await TauriFS.checkExists('C:\\\\Users\\\\test.txt')
if (exists) {
  console.log('文件存在')
}`

const listDirCode = `import { TauriFS } from '@/utils/tauri'

// 列出目录内容
const items = await TauriFS.listDir('C:\\\\Users')
items.forEach(item => {
  console.log(item.name, item.isDirectory ? '目录' : '文件')
})`

// 方法实现
const selectReadFile = async () => {
  try {
    const path = await TauriDialog.openFile()
    if (path) {
      readForm.value.path = path
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('选择文件失败: ' + (error.message || String(error)))
    }
  }
}

const readFile = async () => {
  if (!readForm.value.path) {
    ElMessage.warning('请输入文件路径')
    return
  }
  reading.value = true
  try {
    readResult.value = await TauriFS.readText(readForm.value.path)
  } catch (error) {
    readResult.value = ''
  } finally {
    reading.value = false
  }
}

const writeFile = async () => {
  if (!writeForm.value.path) {
    ElMessage.warning('请输入文件路径')
    return
  }
  writing.value = true
  try {
    await TauriFS.writeText(writeForm.value.path, writeForm.value.content)
    writeForm.value.content = ''
  } catch (error) {
    // 错误已在 TauriFS.writeText 中处理
  } finally {
    writing.value = false
  }
}

const fillWriteExample = () => {
  writeForm.value.path = 'C:\\Users\\test.txt'
  writeForm.value.content = 'Hello World!\n这是文件内容示例。'
}

const createDirectory = async () => {
  if (!createDirForm.value.path) {
    ElMessage.warning('请输入目录路径')
    return
  }
  creating.value = true
  try {
    await TauriFS.createDir(createDirForm.value.path)
  } catch (error) {
    // 错误已在 TauriFS.createDir 中处理
  } finally {
    creating.value = false
  }
}

const fillCreateDirExample = () => {
  createDirForm.value.path = 'C:\\Users\\NewFolder'
}

const selectDeleteFile = async () => {
  try {
    const path = await TauriDialog.openFile({ directory: false })
    if (path) {
      deleteForm.value.path = path
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('选择文件失败: ' + (error.message || String(error)))
    }
  }
}

const deleteFile = async () => {
  if (!deleteForm.value.path) {
    ElMessage.warning('请输入路径')
    return
  }
  deleting.value = true
  try {
    await TauriFS.removeFile(deleteForm.value.path)
    deleteForm.value.path = ''
  } catch (error) {
    // 错误已在 TauriFS.removeFile 中处理
  } finally {
    deleting.value = false
  }
}

const selectCopySource = async () => {
  try {
    const path = await TauriDialog.openFile()
    if (path) {
      copyForm.value.source = path
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('选择文件失败: ' + (error.message || String(error)))
    }
  }
}

const copyFile = async () => {
  if (!copyForm.value.source || !copyForm.value.destination) {
    ElMessage.warning('请输入源路径和目标路径')
    return
  }
  copying.value = true
  try {
    await TauriFS.copyFile(copyForm.value.source, copyForm.value.destination)
    copyForm.value.source = ''
    copyForm.value.destination = ''
  } catch (error) {
    // 错误已在 TauriFS.copyFile 中处理
  } finally {
    copying.value = false
  }
}

const fillCopyExample = () => {
  copyForm.value.source = 'C:\\Users\\test.txt'
  copyForm.value.destination = 'C:\\Users\\test_copy.txt'
}

const selectMoveSource = async () => {
  try {
    const path = await TauriDialog.openFile()
    if (path) {
      moveForm.value.source = path
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('选择文件失败: ' + (error.message || String(error)))
    }
  }
}

const moveFile = async () => {
  if (!moveForm.value.source || !moveForm.value.destination) {
    ElMessage.warning('请输入源路径和目标路径')
    return
  }
  moving.value = true
  try {
    await TauriFS.moveFile(moveForm.value.source, moveForm.value.destination)
    moveForm.value.source = ''
    moveForm.value.destination = ''
  } catch (error) {
    // 错误已在 TauriFS.moveFile 中处理
  } finally {
    moving.value = false
  }
}

const fillMoveExample = () => {
  moveForm.value.source = 'C:\\Users\\test.txt'
  moveForm.value.destination = 'C:\\Users\\Documents\\test.txt'
}

const selectRenameFile = async () => {
  try {
    const path = await TauriDialog.openFile()
    if (path) {
      renameForm.value.path = path
      // 自动填充新名称（去掉扩展名，添加 _renamed）
      const pathObj = path.split(/[/\\]/)
      const fileName = pathObj[pathObj.length - 1]
      const nameParts = fileName.split('.')
      if (nameParts.length > 1) {
        const ext = nameParts.pop()
        renameForm.value.newName = nameParts.join('.') + '_renamed.' + ext
      } else {
        renameForm.value.newName = fileName + '_renamed'
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('选择文件失败: ' + (error.message || String(error)))
    }
  }
}

const renameFile = async () => {
  if (!renameForm.value.path || !renameForm.value.newName) {
    ElMessage.warning('请输入文件路径和新名称')
    return
  }
  renaming.value = true
  try {
    await TauriFS.renameFile(renameForm.value.path, renameForm.value.newName)
    renameForm.value.path = ''
    renameForm.value.newName = ''
  } catch (error) {
    // 错误已在 TauriFS.renameFile 中处理
  } finally {
    renaming.value = false
  }
}

const fillRenameExample = () => {
  renameForm.value.path = 'C:\\Users\\test.txt'
  renameForm.value.newName = 'new_name.txt'
}

const checkExists = async () => {
  if (!existsForm.value.path) {
    ElMessage.warning('请输入路径')
    return
  }
  checking.value = true
  try {
    existsResult.value = await TauriFS.checkExists(existsForm.value.path)
  } catch (error) {
    existsResult.value = false
  } finally {
    checking.value = false
  }
}

const listDirectory = async () => {
  if (!listDirForm.value.path) {
    ElMessage.warning('请输入目录路径')
    return
  }
  listing.value = true
  listDirExecuted.value = false
  try {
    const items = await TauriFS.listDir(listDirForm.value.path)
    listDirResult.value = items
    listDirExecuted.value = true
  } catch (error) {
    listDirResult.value = []
    listDirExecuted.value = true
  } finally {
    listing.value = false
  }
}
</script>

