<template>
  <DocPage
    icon="📋"
    title="原生菜单"
    description="创建和管理应用程序原生菜单。原生菜单 API 提供了完整的菜单功能，可以创建基础菜单、多级菜单、预定义菜单和动态菜单。菜单可以设置为应用菜单（显示在应用顶部菜单栏）或窗口菜单。在 Windows 上，应用菜单可以通过按 Alt 键或右键窗口标题栏来显示。"
    :api="apiData"
    :methods="methodsData"
  >
    <template #basic>
      <CodeExample
        title="创建基础菜单"
        :code="basicCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-alert
              title="提示：点击下方按钮创建不同类型的菜单"
              type="info"
              show-icon
              :closable="false"
              style="margin-bottom: 16px;"
            />
            <el-space direction="vertical" style="width: 100%;">
              <el-alert
                title="注意：创建菜单后，菜单会显示在应用顶部菜单栏。在 Windows 上，可以按 Alt 键或右键窗口标题栏来显示菜单。"
                type="warning"
                show-icon
                :closable="false"
                style="margin-bottom: 16px;"
              />
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-button @click="createBasicMenu" type="primary" style="width: 100%;">
                    <el-icon><Menu /></el-icon>
                    创建基础菜单
                  </el-button>
                </el-col>
                <el-col :span="12">
                  <el-button @click="createMultiLevelMenu" type="success" style="width: 100%;">
                    <el-icon><Menu /></el-icon>
                    创建多级菜单
                  </el-button>
                </el-col>
                <el-col :span="12">
                  <el-button @click="createPredefinedMenu" type="warning" style="width: 100%;">
                    <el-icon><Menu /></el-icon>
                    创建预定义菜单
                  </el-button>
                </el-col>
                <el-col :span="12">
                  <el-button @click="createDynamicMenu" type="danger" style="width: 100%;">
                    <el-icon><Menu /></el-icon>
                    创建动态菜单
                  </el-button>
                </el-col>
              </el-row>
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
import { Menu } from '@element-plus/icons-vue'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import { TauriMenu } from '@/utils/tauri'

const basicCode = `import { TauriMenu } from '@/utils/tauri'

// 创建基础菜单
await TauriMenu.createBasicMenu()

// 创建多级菜单
await TauriMenu.createMultiLevelMenu()

// 创建预定义菜单
await TauriMenu.createPredefinedMenu()`

const createBasicMenu = async () => {
  try {
    const menu = await TauriMenu.createBasicMenu()
    await TauriMenu.setAppMenu(menu)
    ElMessage.success('基础菜单创建成功，请查看应用顶部菜单栏（Windows 上按 Alt 键或右键标题栏）')
  } catch (error) {
    ElMessage.error('创建失败: ' + error.message)
  }
}

const createMultiLevelMenu = async () => {
  try {
    const menu = await TauriMenu.createMultiLevelMenu()
    await TauriMenu.setAppMenu(menu)
    ElMessage.success('多级菜单创建成功，请查看应用顶部菜单栏（Windows 上按 Alt 键或右键标题栏）')
  } catch (error) {
    ElMessage.error('创建失败: ' + error.message)
  }
}

const createPredefinedMenu = async () => {
  try {
    const menu = await TauriMenu.createPredefinedMenu()
    await TauriMenu.setAppMenu(menu)
    ElMessage.success('预定义菜单创建成功，请查看应用顶部菜单栏（Windows 上按 Alt 键或右键标题栏）')
  } catch (error) {
    ElMessage.error('创建失败: ' + error.message)
  }
}

const createDynamicMenu = async () => {
  try {
    const { menu } = await TauriMenu.createDynamicMenu()
    await TauriMenu.setAppMenu(menu)
    ElMessage.success('动态菜单创建成功，请查看应用顶部菜单栏（Windows 上按 Alt 键或右键标题栏）')
  } catch (error) {
    ElMessage.error('创建失败: ' + error.message)
  }
}

const apiData = [
  {
    name: 'options',
    type: 'Object',
    default: '{}',
    description: '菜单选项对象，包含 items 数组'
  },
  {
    name: 'items',
    type: 'Array',
    default: '[]',
    description: '菜单项数组，可以包含 MenuItem、Submenu、PredefinedMenuItem 等'
  }
]

const methodsData = [
  {
    name: 'createBasicMenu',
    description: '创建一个基础菜单，包含简单的菜单项。菜单创建后会自动设置为应用菜单。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数，返回 Promise<Menu>' }
    ]
  },
  {
    name: 'createMultiLevelMenu',
    description: '创建一个多级菜单，包含子菜单和嵌套菜单项。支持创建复杂的菜单结构。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数，返回 Promise<Menu>' }
    ]
  },
  {
    name: 'createPredefinedMenu',
    description: '创建一个包含预定义菜单项的菜单，如复制、粘贴、撤销、重做等系统标准菜单项。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数，返回 Promise<Menu>' }
    ]
  },
  {
    name: 'createDynamicMenu',
    description: '创建一个动态菜单，支持运行时更改菜单项状态和文本。包含复选框菜单项和可更改文本的菜单项。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数，返回 Promise<Object>，包含 menu 和菜单项引用' }
    ]
  },
  {
    name: 'setAppMenu',
    description: '将菜单设置为应用菜单，菜单会显示在应用顶部菜单栏。在 Windows 上，可以通过按 Alt 键或右键窗口标题栏来显示菜单。',
    params: [
      { name: 'menu', type: 'Menu', description: '要设置的菜单对象' }
    ]
  }
]
</script>

