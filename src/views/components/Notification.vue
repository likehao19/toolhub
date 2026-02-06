<template>
  <DocPage
    icon="🔔"
    title="系统通知"
    description="发送系统级桌面通知，支持权限管理和自定义通知窗口。系统通知 API 提供了完整的通知功能，包括权限检查、权限请求、发送系统通知和创建自定义美化通知窗口。自定义通知窗口支持多种显示位置、自定义尺寸和样式，可以显示在软件窗口内或桌面窗口的任意位置。"
    :api="apiData"
    :methods="methodsData"
  >
    <template #basic>
      <CodeExample
        title="基础用法 - 发送系统通知"
        :code="basicCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-space direction="vertical" style="width: 100%">
              <el-tag :type="permissionGranted ? 'success' : 'warning'">
                {{ permissionGranted ? '已授权' : '未授权' }}
              </el-tag>
              <el-space>
                <el-button @click="checkPermission">检查权限</el-button>
                <el-button type="primary" @click="requestPermission">请求权限</el-button>
              </el-space>
              <el-form :model="notificationForm" label-width="100px" style="margin-top: 16px;">
                <el-form-item label="标题">
                  <el-input v-model="notificationForm.title" placeholder="通知标题" />
                </el-form-item>
                <el-form-item label="内容">
                  <el-input
                    v-model="notificationForm.body"
                    type="textarea"
                    :rows="3"
                    placeholder="通知内容"
                  />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="sendNotification">
                    <el-icon><Bell /></el-icon>
                    发送通知
                  </el-button>
                </el-form-item>
              </el-form>
            </el-space>
          </el-card>
        </template>
      </CodeExample>

      <CodeExample
        title="快速通知"
        :code="quickCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-space wrap>
              <el-button @click="sendQuickNotification('success', '操作成功', '任务已完成！')">
                成功通知
              </el-button>
              <el-button type="warning" @click="sendQuickNotification('warning', '警告', '请注意！')">
                警告通知
              </el-button>
              <el-button type="danger" @click="sendQuickNotification('error', '错误', '操作失败！')">
                错误通知
              </el-button>
              <el-button type="info" @click="sendQuickNotification('info', '信息', '这是一条信息')">
                信息通知
              </el-button>
            </el-space>
          </el-card>
        </template>
      </CodeExample>
    </template>

    <template #examples>
      <CodeExample
        title="自定义美化通知窗口"
        :code="customCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-alert
              title="提示：自定义通知窗口会显示一个美化的通知页面，可以选择软件内位置或桌面窗口位置"
              type="success"
              show-icon
              :closable="false"
              style="margin-bottom: 16px;"
            />
            <el-form :model="customForm" label-width="120px">
              <el-form-item label="通知类型">
                <el-radio-group v-model="customForm.type">
                  <el-radio value="success">成功</el-radio>
                  <el-radio value="error">错误</el-radio>
                  <el-radio value="warning">警告</el-radio>
                  <el-radio value="info">信息</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="通知标题">
                <el-input v-model="customForm.title" placeholder="输入通知标题" />
              </el-form-item>
              <el-form-item label="通知内容">
                <el-input
                  v-model="customForm.message"
                  type="textarea"
                  :rows="3"
                  placeholder="输入通知内容"
                />
              </el-form-item>
              <el-form-item label="位置类型">
                <el-radio-group v-model="customForm.positionType">
                  <el-radio value="window">软件内位置</el-radio>
                  <el-radio value="screen">桌面窗口位置</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="显示位置">
                <el-select v-model="customForm.position" placeholder="选择显示位置" style="width: 200px;">
                  <el-option label="右上角" value="topRight" />
                  <el-option label="左上角" value="topLeft" />
                  <el-option label="右下角" value="bottomRight" />
                  <el-option label="左下角" value="bottomLeft" />
                </el-select>
              </el-form-item>
              
              <el-divider content-position="left">位置参数设置</el-divider>
              
              <el-form-item label="窗口宽度">
                <el-input-number 
                  v-model="customForm.notifWidth" 
                  :min="200" 
                  :max="800" 
                  :step="10"
                  style="width: 150px;"
                />
                <span style="margin-left: 10px; color: #909399; font-size: 12px;">像素</span>
              </el-form-item>
              <el-form-item label="窗口高度">
                <el-input-number 
                  v-model="customForm.notifHeight" 
                  :min="100" 
                  :max="400" 
                  :step="10"
                  style="width: 150px;"
                />
                <span style="margin-left: 10px; color: #909399; font-size: 12px;">像素</span>
              </el-form-item>
              <el-form-item label="任务栏边距" v-if="customForm.positionType === 'screen'">
                <el-input-number 
                  v-model="customForm.taskbarMargin" 
                  :min="0" 
                  :max="200" 
                  :step="5"
                  style="width: 150px;"
                />
                <span style="margin-left: 10px; color: #909399; font-size: 12px;">像素（用于避免被任务栏遮挡）</span>
              </el-form-item>
              
              <el-form-item>
                <el-button type="primary" @click="showCustomNotification">
                  <el-icon><Bell /></el-icon>
                  显示自定义通知
                </el-button>
                <el-button @click="saveNotificationSettings">
                  <el-icon><Setting /></el-icon>
                  保存为默认设置
                </el-button>
                <el-button @click="resetNotificationSettings">
                  <el-icon><Refresh /></el-icon>
                  重置为默认
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </template>
      </CodeExample>
    </template>
  </DocPage>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Bell, Setting, Refresh } from '@element-plus/icons-vue'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import { TauriNotification } from '@/utils/tauri'
import CustomNotification from '@/utils/tauri/customNotification'
import { loadConfig, saveConfig } from '@/utils/tauri/store'

const permissionGranted = ref(false)
const notificationForm = ref({
  title: 'Tauri 通知',
  body: '这是一条系统通知消息'
})
const customForm = ref({
  type: 'success',
  title: '操作成功',
  message: '任务已成功完成！',
  positionType: 'screen',
  position: 'topRight',
  duration: 10000,
  notifWidth: 400,
  notifHeight: 150,
  taskbarMargin: 50
})

const basicCode = `import { TauriNotification } from '@/utils/tauri'

// 检查权限
const hasPermission = await TauriNotification.checkPermission()

// 请求权限
await TauriNotification.requestPermission()

// 发送通知
await TauriNotification.send({
  title: '通知标题',
  body: '通知内容'
})`

const quickCode = `import { TauriNotification } from '@/utils/tauri'

// 快速发送不同类型的通知
await TauriNotification.send({
  title: '操作成功',
  body: '任务已完成！'
})`

const customCode = `import CustomNotification from '@/utils/tauri/customNotification'

// 显示自定义美化通知窗口
await CustomNotification.showCustomNotification({
  type: 'success',
  title: '操作成功',
  message: '任务已成功完成！',
  positionType: 'screen', // 'window' 或 'screen'
  position: 'topRight',
  duration: 10000 // 10秒
})`

onMounted(async () => {
  permissionGranted.value = await TauriNotification.checkPermission()
  // 加载通知设置
  await loadNotificationSettings()
})

const loadNotificationSettings = async () => {
  try {
    const config = await loadConfig()
    if (config.notificationWidth) customForm.value.notifWidth = config.notificationWidth
    if (config.notificationHeight) customForm.value.notifHeight = config.notificationHeight
    if (config.taskbarMargin) customForm.value.taskbarMargin = config.taskbarMargin
  } catch (e) { /* ignore */ }
}

const saveNotificationSettings = async () => {
  try {
    const config = await loadConfig()
    config.notificationWidth = customForm.value.notifWidth
    config.notificationHeight = customForm.value.notifHeight
    config.taskbarMargin = customForm.value.taskbarMargin
    await saveConfig(config)
    ElMessage.success('通知设置已保存')
  } catch (error) {
    ElMessage.error('保存通知设置失败')
  }
}

const resetNotificationSettings = async () => {
  customForm.value.notifWidth = 400
  customForm.value.notifHeight = 150
  customForm.value.taskbarMargin = 50
  ElMessage.success('已重置为默认值')
}

const checkPermission = async () => {
  permissionGranted.value = await TauriNotification.checkPermission()
  ElMessage.info(permissionGranted.value ? '已授权' : '未授权')
}

const requestPermission = async () => {
  const granted = await TauriNotification.requestPermission()
  permissionGranted.value = granted
  ElMessage.success(granted ? '权限已授予' : '权限被拒绝')
}

const sendNotification = async () => {
  if (!notificationForm.value.title || !notificationForm.value.body) {
    ElMessage.warning('请输入标题和内容')
    return
  }
  await TauriNotification.send(notificationForm.value)
}

const sendQuickNotification = async (type, title, body) => {
  await TauriNotification.send({ title, body })
}

const showCustomNotification = async () => {
  if (!customForm.value.title || !customForm.value.message) {
    ElMessage.warning('请输入标题和内容')
    return
  }
  await CustomNotification.showCustomNotification({
    type: customForm.value.type,
    title: customForm.value.title,
    message: customForm.value.message,
    positionType: customForm.value.positionType,
    position: customForm.value.position,
    duration: customForm.value.duration || 10000,
    notifWidth: customForm.value.notifWidth,
    notifHeight: customForm.value.notifHeight,
    taskbarMargin: customForm.value.positionType === 'screen' ? customForm.value.taskbarMargin : undefined
  })
}

const apiData = [
  {
    name: 'options',
    type: 'Object',
    default: '{}',
    description: '通知选项对象，包含 title、body 等属性'
  }
]

const methodsData = [
  {
    name: 'checkPermission',
    description: '检查当前应用是否具有发送系统通知的权限。返回布尔值，true 表示已授权，false 表示未授权。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数，返回 Promise<boolean>' }
    ]
  },
  {
    name: 'requestPermission',
    description: '请求系统通知权限。会弹出系统权限对话框，用户可以选择允许或拒绝。返回布尔值表示权限是否被授予。',
    params: [
      { name: '无参数', type: '-', description: '此方法不需要参数，返回 Promise<boolean>' }
    ]
  },
  {
    name: 'send',
    description: '发送系统级桌面通知。需要先获取权限才能成功发送。通知会显示在系统通知中心。',
    params: [
      { name: 'options', type: 'Object', description: '通知选项对象' },
      { name: 'options.title', type: 'String', description: '通知标题，必填' },
      { name: 'options.body', type: 'String', description: '通知内容，必填' },
      { name: 'options.icon', type: 'String', description: '通知图标 URL（可选）' }
    ]
  },
  {
    name: 'showCustomNotification',
    description: '显示自定义美化通知窗口。创建一个独立的透明窗口显示自定义样式的通知，支持多种显示位置和自定义尺寸。',
    params: [
      { name: 'options', type: 'Object', description: '自定义通知选项对象' },
      { name: 'options.type', type: 'String', description: '通知类型：success、error、warning、info' },
      { name: 'options.title', type: 'String', description: '通知标题，必填' },
      { name: 'options.message', type: 'String', description: '通知内容，必填' },
      { name: 'options.positionType', type: 'String', description: '位置类型：window（软件内）或 screen（桌面窗口）' },
      { name: 'options.position', type: 'String', description: '显示位置：topRight、topLeft、bottomRight、bottomLeft 等' },
      { name: 'options.duration', type: 'Number', description: '显示时长（毫秒），默认 10000' },
      { name: 'options.notifWidth', type: 'Number', description: '通知窗口宽度（像素），默认 400' },
      { name: 'options.notifHeight', type: 'Number', description: '通知窗口高度（像素），默认 150' },
      { name: 'options.taskbarMargin', type: 'Number', description: '任务栏边距（像素），仅用于 screen 类型，默认 50' }
    ]
  }
]
</script>

