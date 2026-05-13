<template>
  <DocPage
    icon="⌨️"
    title="全局快捷键"
    description="注册全局键盘快捷键，即使应用不在焦点时也能响应。全局快捷键 API 允许应用注册系统级别的键盘快捷键，这些快捷键在应用处于后台时仍然有效。支持多种修饰键组合，包括 CommandOrControl（Windows 上的 Ctrl，macOS 上的 Command）、Alt、Shift、Meta、Super 等。"
    :api="apiData"
    :methods="methodsData"
  >
    <template #basic>
      <CodeExample
        title="注册全局快捷键"
        :code="basicCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="shortcutForm" label-width="120px">
              <el-form-item label="快捷键">
                <el-input
                  v-model="shortcutForm.shortcut"
                  placeholder="例如: CommandOrControl+Shift+C"
                />
                <div style="font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px;">
                  支持的修饰键: CommandOrControl, Alt, Shift, Meta, Super
                </div>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="registerShortcut" :loading="registering">
                  <el-icon><Plus /></el-icon>
                  注册快捷键
                </el-button>
              </el-form-item>
            </el-form>
            <el-table v-if="registeredShortcuts.length > 0" :data="registeredShortcuts" border style="margin-top: 16px;">
              <el-table-column prop="shortcut" label="快捷键" />
              <el-table-column prop="count" label="触发次数" />
              <el-table-column label="操作" width="150">
                <template #default="{ row }">
                  <el-button
                    type="danger"
                    size="small"
                    @click="unregisterShortcut(row.shortcut)"
                  >
                    取消注册
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </template>
      </CodeExample>
    </template>

    <template #examples>
      <CodeExample
        title="常用快捷键示例"
        :code="examplesCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-space direction="vertical" style="width: 100%;">
              <div>
                <h4 style="margin: 0 0 12px 0; color: var(--el-text-color-primary);">快速注册常用快捷键</h4>
                <el-space wrap>
                  <el-button @click="quickRegister('CommandOrControl+Shift+C')">
                    Ctrl/Cmd+Shift+C
                  </el-button>
                  <el-button @click="quickRegister('CommandOrControl+Alt+N')">
                    Ctrl/Cmd+Alt+N
                  </el-button>
                  <el-button @click="quickRegister('F11')">
                    F11
                  </el-button>
                  <el-button @click="quickRegister('Alt+F4')">
                    Alt+F4
                  </el-button>
                </el-space>
              </div>
              <el-divider />
              <div>
                <h4 style="margin: 0 0 12px 0; color: var(--el-text-color-primary);">批量操作</h4>
                <el-space>
                  <el-button type="danger" @click="unregisterAllShortcuts" :disabled="registeredShortcuts.length === 0">
                    <el-icon><Delete /></el-icon>
                    取消所有快捷键
                  </el-button>
                </el-space>
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
import { Plus, Delete } from '@element-plus/icons-vue'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import { TauriGlobalShortcut } from '@/utils/tauri'

// API 数据
const apiData = [
  {
    name: 'registerShortcut',
    description: '注册全局快捷键，快捷键在应用处于后台时仍然有效',
    params: [
      { name: 'shortcut', type: 'string', description: '快捷键字符串，例如: "CommandOrControl+Shift+C"' },
      { name: 'handler', type: 'Function', description: '快捷键触发时的回调函数' }
    ],
    returns: 'Promise<void>',
    example: "await TauriGlobalShortcut.registerShortcut('CommandOrControl+Shift+C', () => console.log('快捷键触发'))"
  },
  {
    name: 'unregisterShortcut',
    description: '取消注册指定的全局快捷键',
    params: [
      { name: 'shortcut', type: 'string', description: '要取消注册的快捷键字符串' }
    ],
    returns: 'Promise<void>',
    example: "await TauriGlobalShortcut.unregisterShortcut('CommandOrControl+Shift+C')"
  },
  {
    name: 'unregisterAllShortcuts',
    description: '取消注册所有已注册的全局快捷键',
    params: [],
    returns: 'Promise<void>',
    example: "await TauriGlobalShortcut.unregisterAllShortcuts()"
  }
]

const methodsData = [
  {
    name: 'registerShortcut',
    description: '注册全局快捷键',
    usage: "await TauriGlobalShortcut.registerShortcut('CommandOrControl+Shift+C', () => {})"
  },
  {
    name: 'unregisterShortcut',
    description: '取消注册快捷键',
    usage: "await TauriGlobalShortcut.unregisterShortcut('CommandOrControl+Shift+C')"
  },
  {
    name: 'unregisterAllShortcuts',
    description: '取消注册所有快捷键',
    usage: "await TauriGlobalShortcut.unregisterAllShortcuts()"
  }
]

const shortcutForm = ref({
  shortcut: 'CommandOrControl+Shift+C'
})
const registeredShortcuts = ref([])
const registering = ref(false)

const basicCode = `import { TauriGlobalShortcut } from '@/utils/tauri'

// 注册快捷键
await TauriGlobalShortcut.registerShortcut('CommandOrControl+Shift+C', () => {
  // 执行操作
})

// 取消注册
await TauriGlobalShortcut.unregisterShortcut('CommandOrControl+Shift+C')

// 取消所有快捷键
await TauriGlobalShortcut.unregisterAllShortcuts()`

const examplesCode = `import { TauriGlobalShortcut } from '@/utils/tauri'

// 注册多个快捷键
await TauriGlobalShortcut.registerShortcut('CommandOrControl+Shift+C', () => {
})

await TauriGlobalShortcut.registerShortcut('F11', () => {
})

await TauriGlobalShortcut.registerShortcut('Alt+F4', () => {
})`

const registerShortcut = async () => {
  if (!shortcutForm.value.shortcut) {
    ElMessage.warning('请输入快捷键')
    return
  }
  
  // 检查是否已注册
  if (registeredShortcuts.value.find(s => s.shortcut === shortcutForm.value.shortcut)) {
    ElMessage.warning('该快捷键已注册')
    return
  }
  
  registering.value = true
  try {
    await TauriGlobalShortcut.registerShortcut(shortcutForm.value.shortcut, () => {
      const item = registeredShortcuts.value.find(s => s.shortcut === shortcutForm.value.shortcut)
      if (item) {
        item.count++
      } else {
        registeredShortcuts.value.push({
          shortcut: shortcutForm.value.shortcut,
          count: 1
        })
      }
      ElMessage.success('快捷键已触发')
    })
    registeredShortcuts.value.push({
      shortcut: shortcutForm.value.shortcut,
      count: 0
    })
    ElMessage.success('快捷键注册成功')
  } catch (error) {
    ElMessage.error('注册失败: ' + (error.message || String(error)))
  } finally {
    registering.value = false
  }
}

const quickRegister = async (shortcut) => {
  shortcutForm.value.shortcut = shortcut
  await registerShortcut()
}

const unregisterShortcut = async (shortcut) => {
  try {
    await TauriGlobalShortcut.unregisterShortcut(shortcut)
    registeredShortcuts.value = registeredShortcuts.value.filter(s => s.shortcut !== shortcut)
    ElMessage.success('快捷键已取消注册')
  } catch (error) {
    ElMessage.error('取消注册失败: ' + (error.message || String(error)))
  }
}

const unregisterAllShortcuts = async () => {
  try {
    await TauriGlobalShortcut.unregisterAllShortcuts()
    registeredShortcuts.value = []
    ElMessage.success('所有快捷键已取消注册')
  } catch (error) {
    ElMessage.error('取消注册失败: ' + (error.message || String(error)))
  }
}
</script>
