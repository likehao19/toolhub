<template>
  <DocPage
    icon="🌐"
    title="HTTP 客户端"
    description="使用 Rust 编写的 HTTP 客户端发送请求。HTTP 客户端 API 提供了完整的 HTTP 请求功能，支持 GET、POST、PUT、DELETE、PATCH 等所有 HTTP 方法，可以设置请求头、请求体、超时时间等。所有请求都通过 Rust 后端处理，确保安全性和性能。"
    :api="apiData"
    :methods="methodsData"
  >
    <template #basic>
      <CodeExample
        title="发送 HTTP 请求"
        :code="basicCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="requestForm" label-width="100px">
              <el-form-item label="请求方法">
                <el-select v-model="requestForm.method" style="width: 100%">
                  <el-option label="GET" value="GET" />
                  <el-option label="POST" value="POST" />
                  <el-option label="PUT" value="PUT" />
                  <el-option label="DELETE" value="DELETE" />
                  <el-option label="PATCH" value="PATCH" />
                </el-select>
              </el-form-item>
              <el-form-item label="请求 URL">
                <el-input v-model="requestForm.url" placeholder="https://api.github.com/users/octocat" />
              </el-form-item>
              <el-form-item label="请求头" v-if="showHeaders">
                <el-input
                  v-model="requestForm.headers"
                  type="textarea"
                  :rows="3"
                  placeholder='{"Content-Type": "application/json"}'
                />
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
                <el-button @click="showHeaders = !showHeaders">
                  {{ showHeaders ? '隐藏' : '显示' }}请求头
                </el-button>
                <el-button @click="fillExample">填充示例</el-button>
              </el-form-item>
            </el-form>
            <el-descriptions v-if="response" :column="1" border style="margin-top: 16px;">
              <el-descriptions-item label="状态码">
                <el-tag :type="getStatusType(response.status)">
                  {{ response.status }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="状态文本">{{ response.statusText }}</el-descriptions-item>
              <el-descriptions-item label="响应头" v-if="response.headers">
                <pre style="margin: 0; white-space: pre-wrap; max-height: 150px; overflow: auto; font-size: 12px;">{{ JSON.stringify(response.headers, null, 2) }}</pre>
              </el-descriptions-item>
              <el-descriptions-item label="响应体">
                <pre style="margin: 0; white-space: pre-wrap; max-height: 300px; overflow: auto;">{{ responseBody }}</pre>
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </template>
      </CodeExample>
    </template>

    <template #examples>
      <CodeExample
        title="常用 API 请求示例"
        :code="examplesCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-space direction="vertical" style="width: 100%;">
              <div>
                <h4 style="margin: 0 0 12px 0; color: #303133;">快速请求示例</h4>
                <el-space wrap>
                  <el-button @click="quickRequest('GET', 'https://api.github.com/users/octocat')">
                    GitHub API
                  </el-button>
                  <el-button @click="quickRequest('GET', 'https://httpbin.org/get')">
                    HTTPBin GET
                  </el-button>
                  <el-button @click="quickRequest('POST', 'https://httpbin.org/post')">
                    HTTPBin POST
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
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Promotion } from '@element-plus/icons-vue'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import { TauriHttp } from '@/utils/tauri'

// API 数据
const apiData = [
  {
    name: 'get',
    description: '发送 HTTP GET 请求',
    params: [
      { name: 'url', type: 'string', description: '请求 URL' },
      { name: 'options', type: 'Object', default: '{}', description: '请求选项（headers, timeout 等）' }
    ],
    returns: 'Promise<Response>',
    example: "const response = await TauriHttp.get('https://api.example.com/data')"
  },
  {
    name: 'post',
    description: '发送 HTTP POST 请求',
    params: [
      { name: 'url', type: 'string', description: '请求 URL' },
      { name: 'body', type: 'Object', default: '{}', description: '请求体对象' },
      { name: 'options', type: 'Object', default: '{}', description: '请求选项' }
    ],
    returns: 'Promise<Response>',
    example: "const response = await TauriHttp.post('https://api.example.com/data', { key: 'value' })"
  },
  {
    name: 'put',
    description: '发送 HTTP PUT 请求',
    params: [
      { name: 'url', type: 'string', description: '请求 URL' },
      { name: 'body', type: 'Object', default: '{}', description: '请求体对象' },
      { name: 'options', type: 'Object', default: '{}', description: '请求选项' }
    ],
    returns: 'Promise<Response>',
    example: "const response = await TauriHttp.put('https://api.example.com/data', { key: 'value' })"
  },
  {
    name: 'del',
    description: '发送 HTTP DELETE 请求',
    params: [
      { name: 'url', type: 'string', description: '请求 URL' },
      { name: 'options', type: 'Object', default: '{}', description: '请求选项' }
    ],
    returns: 'Promise<Response>',
    example: "const response = await TauriHttp.del('https://api.example.com/data')"
  }
]

const methodsData = [
  {
    name: 'get',
    description: '发送 GET 请求',
    usage: "await TauriHttp.get('https://api.example.com/data')"
  },
  {
    name: 'post',
    description: '发送 POST 请求',
    usage: "await TauriHttp.post('https://api.example.com/data', { key: 'value' })"
  },
  {
    name: 'put',
    description: '发送 PUT 请求',
    usage: "await TauriHttp.put('https://api.example.com/data', { key: 'value' })"
  },
  {
    name: 'del',
    description: '发送 DELETE 请求',
    usage: "await TauriHttp.del('https://api.example.com/data')"
  }
]

const loading = ref(false)
const showHeaders = ref(false)
const requestForm = ref({
  method: 'GET',
  url: 'https://api.github.com/users/octocat',
  body: '',
  headers: ''
})
const response = ref(null)

const basicCode = `import { TauriHttp } from '@/utils/tauri'

// GET 请求
const response = await TauriHttp.get('https://api.github.com/users/octocat')
const data = await response.json()
// POST 请求
const response = await TauriHttp.post('https://api.example.com/data', {
  key: 'value',
  name: 'test'
})
const result = await response.json()

// PUT 请求
const response = await TauriHttp.put('https://api.example.com/data/1', {
  key: 'updated value'
})

// DELETE 请求
const response = await TauriHttp.del('https://api.example.com/data/1')`

const examplesCode = `import { TauriHttp } from '@/utils/tauri'

// 获取 GitHub 用户信息
const response = await TauriHttp.get('https://api.github.com/users/octocat')
const user = await response.json()

// 发送 POST 请求
const response = await TauriHttp.post('https://httpbin.org/post', {
  message: 'Hello World'
})
const result = await response.json()

// 带自定义请求头
const response = await TauriHttp.get('https://api.example.com/data', {
  headers: {
    'Authorization': 'Bearer token',
    'Custom-Header': 'value'
  }
})`

const responseBody = computed(() => {
  if (!response.value) return ''
  try {
    return JSON.stringify(JSON.parse(response.value.body), null, 2)
  } catch {
    return response.value.body
  }
})

const getStatusType = (status) => {
  if (status >= 200 && status < 300) return 'success'
  if (status >= 300 && status < 400) return 'info'
  if (status >= 400 && status < 500) return 'warning'
  if (status >= 500) return 'danger'
  return ''
}

const sendRequest = async () => {
  if (!requestForm.value.url) {
    ElMessage.warning('请输入 URL')
    return
  }
  
  loading.value = true
  response.value = null
  try {
    let result
    const options = {}
    
    // 解析请求头
    if (requestForm.value.headers && requestForm.value.headers.trim()) {
      try {
        options.headers = JSON.parse(requestForm.value.headers)
      } catch {
        ElMessage.warning('请求头格式错误，将忽略')
      }
    }
    
    if (requestForm.value.method === 'GET') {
      result = await TauriHttp.get(requestForm.value.url, options)
      const data = await result.json()
      response.value = {
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        body: JSON.stringify(data, null, 2)
      }
    } else if (requestForm.value.method === 'POST') {
      const body = requestForm.value.body ? JSON.parse(requestForm.value.body) : {}
      result = await TauriHttp.post(requestForm.value.url, body, options)
      const data = await result.json()
      response.value = {
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        body: JSON.stringify(data, null, 2)
      }
    } else if (requestForm.value.method === 'PUT') {
      const body = requestForm.value.body ? JSON.parse(requestForm.value.body) : {}
      result = await TauriHttp.put(requestForm.value.url, body, options)
      const data = await result.json()
      response.value = {
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        body: JSON.stringify(data, null, 2)
      }
    } else if (requestForm.value.method === 'DELETE') {
      result = await TauriHttp.del(requestForm.value.url, options)
      const data = await result.json()
      response.value = {
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        body: JSON.stringify(data, null, 2)
      }
    } else if (requestForm.value.method === 'PATCH') {
      const body = requestForm.value.body ? JSON.parse(requestForm.value.body) : {}
      result = await TauriHttp.post(requestForm.value.url, body, { ...options, method: 'PATCH' })
      const data = await result.json()
      response.value = {
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        body: JSON.stringify(data, null, 2)
      }
    }
    
    ElMessage.success('请求成功')
  } catch (error) {
    ElMessage.error('请求失败: ' + (error.message || String(error)))
  } finally {
    loading.value = false
  }
}

const quickRequest = (method, url) => {
  requestForm.value.method = method
  requestForm.value.url = url
  if (method === 'POST') {
    requestForm.value.body = '{"message": "Hello World"}'
  } else {
    requestForm.value.body = ''
  }
  sendRequest()
}

const fillExample = () => {
  requestForm.value.method = 'POST'
  requestForm.value.url = 'https://httpbin.org/post'
  requestForm.value.body = '{"key": "value", "name": "test"}'
  requestForm.value.headers = '{"Content-Type": "application/json"}'
}
</script>
