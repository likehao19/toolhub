<template>
  <div class="http-demo-page">
    <TitleBar title="HTTP 客户端 - Tauri 功能演示" />
    <div class="demo-view">
      <el-page-header @back="goBack">
        <template #content>
          <span class="page-title">🌐 HTTP 客户端</span>
        </template>
      </el-page-header>

      <div class="content-section">
        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">发送 HTTP 请求</div>
          </template>
          <el-form :model="requestForm" label-width="100px">
            <el-form-item label="请求方法">
              <el-select v-model="requestForm.method" style="width: 100%">
                <el-option label="GET" value="GET" />
                <el-option label="POST" value="POST" />
                <el-option label="PUT" value="PUT" />
                <el-option label="DELETE" value="DELETE" />
              </el-select>
            </el-form-item>
            <el-form-item label="请求 URL">
              <el-input v-model="requestForm.url" placeholder="https://api.github.com/users/octocat" />
            </el-form-item>
            <el-form-item label="请求体" v-if="requestForm.method !== 'GET' && requestForm.method !== 'DELETE'">
              <el-input
                v-model="requestForm.body"
                type="textarea"
                :rows="4"
                placeholder='{"key": "value"}'
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="sendRequest" :loading="loading">
                <el-icon><Promotion /></el-icon>
                发送请求
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="hover" class="demo-card" v-if="response">
          <template #header>
            <div class="card-header">响应结果</div>
          </template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="状态码">{{ response.status }}</el-descriptions-item>
            <el-descriptions-item label="状态文本">{{ response.statusText }}</el-descriptions-item>
            <el-descriptions-item label="响应体">
              <pre class="response-body">{{ responseBody }}</pre>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">快速测试</div>
          </template>
          <el-space wrap>
            <el-button @click="quickTest('GET', 'https://api.github.com/users/octocat')">
              测试 GitHub API
            </el-button>
            <el-button @click="quickTest('GET', 'https://httpbin.org/get')">
              测试 HTTPBin GET
            </el-button>
            <el-button @click="quickTest('POST', 'https://httpbin.org/post', { test: 'data' })">
              测试 HTTPBin POST
            </el-button>
          </el-space>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Promotion } from '@element-plus/icons-vue'
import TitleBar from '@/components/TitleBar.vue'
import { TauriHttp } from '@/utils/tauri'

const router = useRouter()
const loading = ref(false)
const requestForm = ref({
  method: 'GET',
  url: 'https://api.github.com/users/octocat',
  body: ''
})
const response = ref(null)
const responseBody = ref('')

const sendRequest = async () => {
  if (!requestForm.value.url.trim()) {
    ElMessage.warning('请输入请求 URL')
    return
  }

  loading.value = true
  try {
    let res
    switch (requestForm.value.method) {
      case 'GET':
        res = await TauriHttp.get(requestForm.value.url)
        break
      case 'POST':
        const postBody = requestForm.value.body ? JSON.parse(requestForm.value.body) : {}
        res = await TauriHttp.post(requestForm.value.url, postBody)
        break
      case 'PUT':
        const putBody = requestForm.value.body ? JSON.parse(requestForm.value.body) : {}
        res = await TauriHttp.put(requestForm.value.url, putBody)
        break
      case 'DELETE':
        res = await TauriHttp.del(requestForm.value.url)
        break
    }
    response.value = res
    responseBody.value = await res.text()
  } catch (error) {
    ElMessage.error('请求失败: ' + error.message)
    response.value = null
    responseBody.value = ''
  } finally {
    loading.value = false
  }
}

const quickTest = async (method, url, body = null) => {
  requestForm.value.method = method
  requestForm.value.url = url
  requestForm.value.body = body ? JSON.stringify(body, null, 2) : ''
  await sendRequest()
}

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.http-demo-page {
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

.response-body {
  max-height: 400px;
  overflow: auto;
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>

