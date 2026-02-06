<template>
  <div class="notification-demo-page">
    <TitleBar title="通知演示 - Tauri 功能演示" />
    <div class="demo-view">
      <el-page-header @back="goBack">
        <template #content>
          <span class="page-title">🔔 系统通知</span>
        </template>
      </el-page-header>

      <div class="content-section">
        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">通知权限</div>
          </template>
          <el-space>
            <el-tag :type="permissionGranted ? 'success' : 'warning'">
              {{ permissionGranted ? '已授权' : '未授权' }}
            </el-tag>
            <el-button @click="checkPermission">检查权限</el-button>
            <el-button type="primary" @click="requestPermission">请求权限</el-button>
          </el-space>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">发送通知</div>
          </template>
          <el-form :model="notificationForm" label-width="100px">
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
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">快速通知</div>
          </template>
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

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">✨ 自定义美化通知窗口</div>
          </template>
          <el-alert
            title="提示：自定义通知窗口会显示一个美化的通知页面。可以选择软件内位置（相对于应用窗口）或桌面窗口位置（相对于整个屏幕），10秒后自动关闭"
            type="success"
            show-icon
            :closable="false"
            style="margin-bottom: 16px;"
          />
          <el-form :model="customNotificationForm" label-width="120px">
            <el-form-item label="通知类型">
              <el-radio-group v-model="customNotificationForm.type">
                <el-radio value="success">成功</el-radio>
                <el-radio value="error">错误</el-radio>
                <el-radio value="warning">警告</el-radio>
                <el-radio value="info">信息</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="通知标题">
              <el-input v-model="customNotificationForm.title" placeholder="输入通知标题" />
            </el-form-item>
            <el-form-item label="通知内容">
              <el-input
                v-model="customNotificationForm.message"
                type="textarea"
                :rows="3"
                placeholder="输入通知内容"
              />
            </el-form-item>
            <el-form-item label="位置类型">
              <el-radio-group v-model="customNotificationForm.positionType">
                <el-radio value="window">软件内位置</el-radio>
                <el-radio value="screen">桌面窗口位置</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="显示位置">
              <el-select v-model="customNotificationForm.position" placeholder="选择显示位置" style="width: 200px;">
                <el-option label="右上角" value="topRight" />
                <el-option label="左上角" value="topLeft" />
                <el-option label="上中" value="topCenter" />
                <el-option label="右下角" value="bottomRight" />
                <el-option label="左下角" value="bottomLeft" />
                <el-option label="下中" value="bottomCenter" />
                <el-option label="右中" value="rightCenter" />
                <el-option label="左中" value="leftCenter" />
                <el-option label="中心" value="center" />
              </el-select>
            </el-form-item>
            <el-form-item label="显示时长">
              <el-slider
                v-model="customNotificationForm.duration"
                :min="3000"
                :max="30000"
                :step="1000"
                show-stops
                :show-tooltip="true"
                style="width: 300px;"
              />
              <span style="margin-left: 10px;">{{ customNotificationForm.duration / 1000 }}秒</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="showCustomNotification">
                <el-icon><Bell /></el-icon>
                显示自定义通知
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">快速自定义通知</div>
          </template>
          <el-space wrap>
            <el-button type="success" @click="showQuickCustomNotification('success', '操作成功', '任务已成功完成！')">
              ✅ 成功通知
            </el-button>
            <el-button type="warning" @click="showQuickCustomNotification('warning', '警告提示', '请注意检查相关设置！')">
              ⚠️ 警告通知
            </el-button>
            <el-button type="danger" @click="showQuickCustomNotification('error', '操作失败', '请检查网络连接或重试！')">
              ❌ 错误通知
            </el-button>
            <el-button type="info" @click="showQuickCustomNotification('info', '系统消息', '这是一条系统通知消息')">
              📢 信息通知
            </el-button>
          </el-space>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Bell } from '@element-plus/icons-vue'
import TitleBar from '@/components/TitleBar.vue'
import { TauriNotification } from '@/utils/tauri'
import CustomNotification from '@/utils/tauri/customNotification'

const router = useRouter()
const permissionGranted = ref(false)
const notificationForm = ref({
  title: 'Tauri 通知',
  body: '这是一条系统通知消息'
})
const customNotificationForm = ref({
  type: 'info',
  title: '自定义通知',
  message: '这是一条美化的自定义通知消息，会在指定位置显示，10秒后自动关闭',
  duration: 10000,
  position: 'topRight',
  positionType: 'screen' // 'window' 或 'screen'
})

const checkPermission = async () => {
  permissionGranted.value = await TauriNotification.checkPermission()
  ElMessage.info(permissionGranted.value ? '已授权' : '未授权')
}

const requestPermission = async () => {
  const granted = await TauriNotification.requestNotificationPermission()
  permissionGranted.value = granted
  ElMessage.success(granted ? '权限已授予' : '权限被拒绝')
}

const sendNotification = async () => {
  await TauriNotification.send({
    title: notificationForm.value.title,
    body: notificationForm.value.body
  })
}

const sendQuickNotification = async (type, title, body) => {
  await TauriNotification.send({
    title,
    body
  })
}

const showCustomNotification = async () => {
  try {
    await CustomNotification.showCustomNotification({
      title: customNotificationForm.value.title,
      message: customNotificationForm.value.message,
      type: customNotificationForm.value.type,
      duration: customNotificationForm.value.duration,
      position: customNotificationForm.value.position,
      positionType: customNotificationForm.value.positionType
    })
    ElMessage.success('自定义通知已显示')
  } catch (e) { /* ignore */ }
}

const showQuickCustomNotification = async (type, title, message) => {
  try {
    await CustomNotification.showCustomNotification({
      title,
      message,
      type,
      duration: 10000,
      position: customNotificationForm.value.position,
      positionType: customNotificationForm.value.positionType
    })
  } catch (e) { /* ignore */ }
}

const goBack = () => {
  router.push('/')
}

onMounted(() => {
  checkPermission()
})
</script>

<style scoped>
.notification-demo-page {
  width: 100%;
  height: 100vh;
  overflow: auto;
  background: #f5f7fa;
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
</style>

