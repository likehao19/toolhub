<template>
  <div class="chat-wrapper">

    <!-- ==================== 未连接面板 ==================== -->
    <div v-if="!connected" class="connect-panel">
      <div class="connect-card">
        <div class="connect-logo-box">
          <span class="connect-logo-emoji">💬</span>
        </div>
        <div class="connect-title-group">
          <h2 class="connect-title">即时聊天</h2>
          <p class="connect-subtitle">局域网内自动发现，零配置开始聊天</p>
        </div>

        <div class="mode-tabs">
          <div class="mode-tab" :class="{ active: mode === 'lan' }" @click="switchMode('lan')">
            <el-icon><Monitor /></el-icon>局域网
          </div>
          <div class="mode-tab" :class="{ active: mode === 'internet' }" @click="switchMode('internet')">
            <el-icon><Connection /></el-icon>互联网
          </div>
        </div>

        <div class="connect-divider"></div>

        <!-- LAN 模式 -->
        <template v-if="mode === 'lan'">
          <div class="form-row">
            <label>我的昵称</label>
            <el-input v-model="username" placeholder="输入昵称" maxlength="20" clearable />
          </div>

          <template v-if="lanState === 'idle'">
            <el-button type="primary" size="large" class="full-btn" @click="scanLan">
              <el-icon><Search /></el-icon>扫描局域网聊天室
            </el-button>
          </template>

          <template v-else-if="lanState === 'scanning'">
            <div class="scan-stage">
              <div class="scan-anim">
                <div class="scan-ring"></div>
                <div class="scan-ring" style="animation-delay:.6s"></div>
                <div class="scan-ring" style="animation-delay:1.2s"></div>
                <el-icon class="scan-icon"><Monitor /></el-icon>
              </div>
              <p class="scan-tip">正在扫描局域网，最多等待 2 秒…</p>
            </div>
          </template>

          <template v-else-if="lanState === 'found'">
            <template v-if="discoveredRooms.length > 0">
              <p class="section-label">发现 {{ discoveredRooms.length }} 个聊天室</p>
              <div class="room-list">
                <div v-for="room in discoveredRooms" :key="room.host + room.port"
                     class="room-item" @click="joinRoom(room)">
                  <div class="room-item-icon"><el-icon><Connection /></el-icon></div>
                  <div class="room-info">
                    <div class="room-addr">{{ room.host }}:{{ room.port }}</div>
                    <div class="room-label">点击加入</div>
                  </div>
                  <el-icon class="room-arrow"><ArrowRight /></el-icon>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="no-room-tip">
                <div class="no-room-icon"><el-icon><Monitor /></el-icon></div>
                <p class="no-room-text">未发现聊天室</p>
                <p class="no-room-sub">可以创建一个，让同一局域网的朋友加入</p>
              </div>
            </template>
            <div class="lan-actions">
              <el-button @click="scanLan"><el-icon><Refresh /></el-icon>重新扫描</el-button>
              <el-button type="primary" @click="createRoom" :loading="creating">
                <el-icon v-if="!creating"><Plus /></el-icon>创建聊天室
              </el-button>
            </div>
          </template>

          <template v-else-if="lanState === 'connecting'">
            <div class="connecting-tip">
              <el-icon class="is-loading"><Loading /></el-icon>
              {{ creating ? '正在创建聊天室…' : '正在连接…' }}
            </div>
          </template>

          <div v-if="connectError" class="connect-error">
            <el-icon><CircleCloseFilled /></el-icon>
            <span>{{ connectError }}</span>
            <el-button text size="small" @click="lanState = 'idle'">重试</el-button>
          </div>
        </template>

        <!-- 互联网模式 -->
        <template v-else>
          <div class="mode-hint">
            <el-icon><InfoFilled /></el-icon>
            输入服务器公网 IP 或域名，连接互联网聊天室
          </div>
          <div class="connect-form">
            <div class="form-row">
              <label>我的昵称</label>
              <el-input v-model="username" placeholder="输入昵称" maxlength="20" clearable />
            </div>
            <div class="form-row">
              <label>服务器地址</label>
              <el-input v-model="serverHost" placeholder="your.server.com 或 1.2.3.4" clearable>
                <template #prepend>ws://</template>
              </el-input>
            </div>
            <div class="form-row form-row-inline">
              <div class="form-row" style="flex:1">
                <label>端口</label>
                <el-input v-model="serverPort" placeholder="8765" />
              </div>
              <div class="form-row" style="flex:2">
                <label>房间（留空为默认）</label>
                <el-input v-model="roomId" placeholder="default" clearable />
              </div>
            </div>
          </div>
          <el-button type="primary" size="large" class="full-btn" :loading="connecting" @click="connectManual">
            {{ connecting ? '连接中…' : '加入聊天室' }}
          </el-button>
          <div v-if="connectError" class="connect-error">
            <el-icon><CircleCloseFilled /></el-icon>
            <span>{{ connectError }}</span>
          </div>
        </template>
      </div>
    </div>

    <!-- ==================== 聊天界面 ==================== -->
    <div v-else class="chat-layout">

      <!-- 顶栏 -->
      <div class="chat-header">
        <div class="chat-header-left">
          <div class="connection-dot"></div>
          <span class="room-name">{{ roomId || '默认聊天室' }}</span>
          <el-tag size="small" type="success">{{ onlineUsers.length }} 人在线</el-tag>
          <el-tag v-if="isHost" size="small" type="warning">主机</el-tag>
        </div>
        <div class="chat-header-right">
          <span class="server-addr">{{ wsUrl }}</span>
          <el-tooltip content="复制地址给同局域网的朋友" placement="bottom">
            <el-button text size="small" @click="copyAddr">
              <el-icon><CopyDocument /></el-icon>
            </el-button>
          </el-tooltip>
          <el-button text size="small" type="danger" @click="disconnect">
            <el-icon><SwitchButton /></el-icon>断开
          </el-button>
        </div>
      </div>

      <!-- 消息区 + 用户面板 -->
      <div class="chat-body">

        <!-- 消息流 -->
        <div class="message-area" ref="messageAreaRef">
          <div v-if="messages.length === 0" class="empty-messages">
            <div class="empty-icon">👋</div>
            <p class="empty-text">聊天室已就绪</p>
            <p class="empty-sub">发送第一条消息打个招呼吧</p>
          </div>

          <template v-else>
            <div
              v-for="(msg, idx) in messages"
              :key="idx"
              class="message-item"
              :class="{ 'is-self': msg.username === username, 'is-system': msg.type === 'system' }"
            >
              <!-- 系统消息 -->
              <div v-if="msg.type === 'system'" class="system-msg">
                <span class="system-dot"></span>{{ msg.content }}
              </div>

              <!-- 普通/文件消息 -->
              <template v-else>
                <!-- 对方头像 -->
                <div v-if="msg.username !== username" class="avatar">
                  {{ msg.username.charAt(0).toUpperCase() }}
                </div>

                <div class="bubble-wrap">
                  <!-- 发送人 + 时间 -->
                  <div class="msg-meta" :class="{ 'meta-self': msg.username === username }">
                    <span v-if="msg.username !== username" class="msg-username">{{ msg.username }}</span>
                    <span class="msg-time">{{ msg.time }}</span>
                  </div>

                  <!-- 文本气泡 -->
                  <div v-if="msg.type === 'message'"
                       class="bubble" :class="{ 'bubble-self': msg.username === username }">
                    {{ msg.content }}
                  </div>

                  <!-- 文件消息（已完成传输） -->
                  <template v-else-if="msg.type === 'file'">
                    <!-- 图片 -->
                    <div v-if="msg.isImage"
                         class="img-bubble" :class="{ 'img-bubble-self': msg.username === username }"
                         @click="viewingImage = msg.dataUrl">
                      <img :src="msg.dataUrl" class="msg-image" />
                      <span class="media-filename">{{ msg.filename }}</span>
                    </div>
                    <!-- 视频 -->
                    <div v-else-if="msg.isVideo"
                         class="video-bubble" :class="{ 'video-bubble-self': msg.username === username }">
                      <video :src="msg.dataUrl" class="msg-video" controls />
                      <span class="media-filename">{{ msg.filename }}</span>
                    </div>
                    <!-- 其他文件 -->
                    <div v-else
                         class="file-card" :class="{ 'file-card-self': msg.username === username }"
                         @click="downloadFile(msg)">
                      <div class="file-card-icon"><el-icon><Document /></el-icon></div>
                      <div class="file-card-body">
                        <p class="file-card-name">{{ msg.filename }}</p>
                        <p class="file-card-size">{{ formatFileSize(msg.size) }} · 点击下载</p>
                      </div>
                      <el-icon class="file-card-dl"><Download /></el-icon>
                    </div>
                  </template>

                  <!-- 发送中进度 -->
                  <template v-else-if="msg.type === 'file_sending'">
                    <div class="file-progress-card file-progress-self">
                      <div class="file-progress-icon"><el-icon><Upload /></el-icon></div>
                      <div class="file-progress-body">
                        <p class="file-progress-name">{{ msg.filename }}</p>
                        <div class="file-progress-bar-wrap">
                          <div class="file-progress-bar" :style="{ width: (msg.sent / msg.total * 100) + '%' }"></div>
                        </div>
                        <p class="file-progress-info">
                          发送中 {{ msg.sent }}/{{ msg.total }} 块 · {{ formatFileSize(msg.size) }}
                        </p>
                      </div>
                    </div>
                  </template>

                  <!-- 接收中进度 -->
                  <template v-else-if="msg.type === 'file_receiving'">
                    <div class="file-progress-card">
                      <div class="file-progress-icon recv"><el-icon><Download /></el-icon></div>
                      <div class="file-progress-body">
                        <p class="file-progress-name">{{ msg.filename }}</p>
                        <div class="file-progress-bar-wrap">
                          <div class="file-progress-bar recv" :style="{ width: (msg.received / msg.total * 100) + '%' }"></div>
                        </div>
                        <p class="file-progress-info">
                          接收中 {{ msg.received }}/{{ msg.total }} 块 · {{ formatFileSize(msg.size) }}
                        </p>
                      </div>
                    </div>
                  </template>
                </div>

                <!-- 自己头像 -->
                <div v-if="msg.username === username" class="avatar avatar-self">
                  {{ username.charAt(0).toUpperCase() }}
                </div>
              </template>
            </div>
          </template>
        </div>

        <!-- 在线成员 -->
        <div class="user-panel">
          <div class="user-panel-title">
            <el-icon><User /></el-icon>
            <span>在线成员</span>
            <span class="user-count">{{ onlineUsers.length }}</span>
          </div>
          <div class="user-list">
            <div v-for="u in onlineUsers" :key="u"
                 class="user-item" :class="{ 'is-me': u === username }">
              <div class="user-avatar" :class="{ 'user-avatar-me': u === username }">
                {{ u.charAt(0).toUpperCase() }}
              </div>
              <span class="user-name">{{ u }}</span>
              <span v-if="u === username" class="me-badge">我</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="input-area">
        <!-- 待发文件预览条 -->
        <div v-if="pendingFiles.length" class="pending-strip">
          <div v-for="(f, i) in pendingFiles" :key="i" class="pending-item">
            <img v-if="f.isImage" :src="f.previewUrl" class="pending-thumb" />
            <div v-else class="pending-file-icon"><el-icon><Document /></el-icon></div>
            <span class="pending-name">{{ f.name }}</span>
            <button class="pending-remove" @click="removePendingFile(i)">
              <el-icon><Close /></el-icon>
            </button>
          </div>
        </div>

        <!-- 主输入框 -->
        <div class="input-box" :class="{ focused: inputFocused }">
          <!-- 隐藏的原生 file input -->
          <input
            type="file" ref="fileInputRef" @change="onFileSelected"
            multiple
            style="display:none"
          />

          <!-- 附件按钮 -->
          <button class="attach-btn" @click="pickFiles" title="发送图片 / 文件 / 视频">
            <el-icon><Paperclip /></el-icon>
          </button>

          <!-- 文本输入 -->
          <textarea
            ref="textareaRef"
            v-model="inputMsg"
            class="msg-textarea"
            placeholder="输入消息… Enter 发送，Shift+Enter 换行"
            rows="1"
            @keydown="onKeydown"
            @input="autoResize"
            @focus="inputFocused = true"
            @blur="inputFocused = false"
            @paste="onPaste"
          ></textarea>

          <!-- 发送按钮（嵌入输入框内） -->
          <button
            class="send-btn-round"
            :class="{ 'send-active': inputMsg.trim() || pendingFiles.length }"
            :disabled="!inputMsg.trim() && !pendingFiles.length"
            @click="sendMessage"
            title="发送 (Enter)"
          >
            <el-icon><Promotion /></el-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- 图片全屏查看器 -->
    <Teleport to="body">
      <div v-if="viewingImage" class="image-overlay" @click="viewingImage = null">
        <img :src="viewingImage" class="overlay-img" @click.stop />
        <button class="overlay-close" @click="viewingImage = null">
          <el-icon><Close /></el-icon>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script>
export default { name: 'Chat' }
</script>

<script setup>
import { ref, nextTick, onUnmounted } from 'vue'
import {
  Monitor, Connection, Search, ArrowRight, Loading, Refresh, Plus,
  InfoFilled, CircleCloseFilled, CopyDocument, SwitchButton,
  User, Promotion, Document, Download, Close, Paperclip, Upload
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { invoke } from '@tauri-apps/api/core'

// ---- 连接状态 ----
const mode = ref('lan')
const lanState = ref('idle')
const discoveredRooms = ref([])
const creating = ref(false)
const isHost = ref(false)
const username = ref(localStorage.getItem('chat-username') || '')
const serverHost = ref('')
const serverPort = ref('8765')
const roomId = ref('')
const connecting = ref(false)
const connected = ref(false)
const connectError = ref('')
const wsUrl = ref('')

// ---- 消息/输入状态 ----
const messages = ref([])
const onlineUsers = ref([])
const inputMsg = ref('')
const messageAreaRef = ref(null)
const textareaRef = ref(null)
const fileInputRef = ref(null)
const pendingFiles = ref([])
const inputFocused = ref(false)
const viewingImage = ref(null)

// ---- 文件传输状态 ----
const CHUNK_SIZE = 256 * 1024  // 256 KB
const objectUrls = []          // 组件销毁时统一 revoke
const selfSentFileIds = new Set()
const receivingChunks = new Map() // fileId → { chunks, received, total, filename, mime, size, username, time }

const LAN_PORT = 18765
let ws = null

// ---- 工具 ----
const ft = () => {
  const d = new Date()
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

const scrollBottom = async () => {
  await nextTick()
  if (messageAreaRef.value) messageAreaRef.value.scrollTop = messageAreaRef.value.scrollHeight
}

const saveUsername = () => { if (username.value) localStorage.setItem('chat-username', username.value) }

const formatFileSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ---- 模式切换 ----
const switchMode = (m) => { mode.value = m; lanState.value = 'idle'; connectError.value = '' }

// ---- 局域网扫描 ----
const scanLan = async () => {
  if (!username.value.trim()) { ElMessage.warning('请先输入昵称'); return }
  saveUsername()
  lanState.value = 'scanning'
  connectError.value = ''
  try {
    discoveredRooms.value = await invoke('discover_lan_chat')
    lanState.value = 'found'
  } catch (e) {
    connectError.value = '扫描失败：' + e
    lanState.value = 'idle'
  }
}

const joinRoom = (room) => {
  serverHost.value = room.host
  serverPort.value = String(room.port)
  lanState.value = 'connecting'
  connectWs()
}

const createRoom = async () => {
  if (!username.value.trim()) { ElMessage.warning('请先输入昵称'); return }
  creating.value = true
  lanState.value = 'connecting'
  connectError.value = ''
  try {
    const localIp = await invoke('start_lan_server', { port: LAN_PORT })
    isHost.value = true
    serverHost.value = 'localhost'
    serverPort.value = String(LAN_PORT)
    wsUrl.value = `${localIp}:${LAN_PORT}`
    connectWs()
  } catch (e) {
    connectError.value = '创建失败：' + e
    lanState.value = 'found'
  } finally {
    creating.value = false
  }
}

const connectManual = () => {
  if (!username.value.trim()) { ElMessage.warning('请输入昵称'); return }
  if (!serverHost.value.trim()) { ElMessage.warning('请输入服务器地址'); return }
  saveUsername()
  connecting.value = true
  connectError.value = ''
  connectWs()
}

// ---- WebSocket ----
const connectWs = () => {
  saveUsername()
  const room = roomId.value.trim() || 'default'
  const url = `ws://${serverHost.value.trim()}:${serverPort.value}/chat/${room}`
  if (!wsUrl.value) wsUrl.value = `${serverHost.value.trim()}:${serverPort.value}`
  ws = new WebSocket(url)

  ws.onopen = () => {
    connecting.value = false
    connected.value = true
    lanState.value = 'idle'
    ws.send(JSON.stringify({ type: 'join', username: username.value.trim() }))
  }

  ws.onmessage = ({ data }) => {
    try {
      const d = JSON.parse(data)
      if (d.type === 'message') {
        messages.value.push({ type: 'message', username: d.username, content: d.content, time: d.time || ft() })
        scrollBottom()
      } else if (d.type === 'file_chunk') {
        // 忽略自己发出的回声（自己发的已在本地显示）
        if (d.username === username.value && selfSentFileIds.has(d.fileId)) return

        const { fileId, filename, mime, size, chunkIndex, totalChunks } = d

        if (!receivingChunks.has(fileId)) {
          receivingChunks.set(fileId, {
            filename, mime, size, username: d.username,
            chunks: new Array(totalChunks).fill(null),
            received: 0, total: totalChunks, time: d.time || ft()
          })
          messages.value.push({
            type: 'file_receiving', fileId,
            username: d.username, filename, size,
            received: 0, total: totalChunks, time: d.time || ft()
          })
          scrollBottom()
        }

        const state = receivingChunks.get(fileId)
        if (state.chunks[chunkIndex] === null) {
          // 解码 base64 → Uint8Array，避免保留大量 base64 字符串
          const bin = atob(d.data)
          const bytes = new Uint8Array(bin.length)
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
          state.chunks[chunkIndex] = bytes
          state.received++
        }

        // 更新进度
        const idx = messages.value.findIndex(m => m.type === 'file_receiving' && m.fileId === fileId)
        if (idx !== -1) messages.value[idx] = { ...messages.value[idx], received: state.received }

        if (state.received === state.total) {
          // 所有块到齐 → 拼装 Blob → 创建 Object URL
          try {
            const blob = new Blob(state.chunks, { type: state.mime })
            const blobUrl = URL.createObjectURL(blob)
            objectUrls.push(blobUrl)
            if (idx !== -1) {
              messages.value.splice(idx, 1, {
                type: 'file', username: state.username, filename: state.filename,
                mime: state.mime, dataUrl: blobUrl, size: state.size, time: state.time,
                isImage: state.mime.startsWith('image/'), isVideo: state.mime.startsWith('video/')
              })
            }
          } catch {
            if (idx !== -1) messages.value.splice(idx, 1)
            ElMessage.error(`${state.filename} 接收失败`)
          }
          receivingChunks.delete(fileId)
          scrollBottom()
        }
      } else if (d.type === 'system') {
        messages.value.push({ type: 'system', content: d.content, time: ft() })
        scrollBottom()
      } else if (d.type === 'users') {
        onlineUsers.value = d.list || []
      }
    } catch {}
  }

  ws.onerror = () => { connecting.value = false; connectError.value = '连接失败，请检查地址'; lanState.value = 'found' }

  ws.onclose = () => {
    connecting.value = false
    if (connected.value) { connected.value = false; messages.value.push({ type: 'system', content: '已断开连接', time: ft() }) }
  }

  setTimeout(() => {
    if (connecting.value || lanState.value === 'connecting') {
      ws?.close(); connecting.value = false; connectError.value = '连接超时，请重试'; lanState.value = 'found'
    }
  }, 8000)
}

// ---- 文件处理 ----
const pickFiles = () => fileInputRef.value?.click()

const onFileSelected = (e) => {
  Array.from(e.target.files).forEach(file => {
    const mime = file.type || 'application/octet-stream'
    const isImage = mime.startsWith('image/')
    // 仅图片生成缩略图预览 URL，避免大文件读入内存
    const previewUrl = isImage ? URL.createObjectURL(file) : null
    if (previewUrl) objectUrls.push(previewUrl)
    pendingFiles.value.push({
      file, name: file.name, mime, size: file.size,
      isImage, isVideo: mime.startsWith('video/'), previewUrl
    })
  })
  e.target.value = ''
}

const removePendingFile = (i) => pendingFiles.value.splice(i, 1)

const onPaste = (e) => {
  for (const item of (e.clipboardData?.items || [])) {
    if (!item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (!file) continue
    const previewUrl = URL.createObjectURL(file)
    objectUrls.push(previewUrl)
    pendingFiles.value.push({
      file, name: `图片_${Date.now()}.png`, mime: 'image/png',
      size: file.size, isImage: true, isVideo: false, previewUrl
    })
  }
}

const downloadFile = (msg) => {
  const a = document.createElement('a')
  a.href = msg.dataUrl; a.download = msg.filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
}

// ---- 分块发送 ----
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

const sendFileChunked = async (pending) => {
  const { file, name, mime, size } = pending
  const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const totalChunks = Math.max(1, Math.ceil(size / CHUNK_SIZE))

  selfSentFileIds.add(fileId)

  // 在消息流中插入"发送中"占位
  messages.value.push({
    type: 'file_sending', fileId,
    username: username.value, filename: name, size,
    sent: 0, total: totalChunks, time: ft()
  })
  scrollBottom()

  try {
    for (let i = 0; i < totalChunks; i++) {
      if (!ws || ws.readyState !== WebSocket.OPEN) break
      const slice = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      const buffer = await slice.arrayBuffer()
      ws.send(JSON.stringify({
        type: 'file_chunk', fileId,
        filename: name, mime, size,
        chunkIndex: i, totalChunks,
        data: arrayBufferToBase64(buffer)
      }))
      // 更新发送进度
      const idx = messages.value.findIndex(m => m.type === 'file_sending' && m.fileId === fileId)
      if (idx !== -1) messages.value[idx] = { ...messages.value[idx], sent: i + 1 }
    }

    // 全部发完 → 本地直接从 File 创建 Blob URL 展示，无需等服务器回声
    const blobUrl = URL.createObjectURL(new Blob([file], { type: mime }))
    objectUrls.push(blobUrl)
    const idx = messages.value.findIndex(m => m.type === 'file_sending' && m.fileId === fileId)
    if (idx !== -1) {
      messages.value.splice(idx, 1, {
        type: 'file', username: username.value, filename: name,
        mime, dataUrl: blobUrl, size, time: ft(),
        isImage: mime.startsWith('image/'), isVideo: mime.startsWith('video/')
      })
    }
  } catch (err) {
    const idx = messages.value.findIndex(m => m.type === 'file_sending' && m.fileId === fileId)
    if (idx !== -1) messages.value.splice(idx, 1)
    ElMessage.error(`${name} 发送失败`)
  }
  scrollBottom()
}

// ---- 发送 ----
const sendMessage = () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return

  // 文字先发
  const content = inputMsg.value.trim()
  if (content) {
    ws.send(JSON.stringify({ type: 'message', content }))
    inputMsg.value = ''
    if (textareaRef.value) textareaRef.value.style.height = 'auto'
  }

  // 文件分块异步发送
  const filesToSend = [...pendingFiles.value]
  pendingFiles.value = []
  if (filesToSend.length > 0) {
    ;(async () => { for (const f of filesToSend) await sendFileChunked(f) })()
  }
}

const onKeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }

const autoResize = () => {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

// ---- 断开 ----
const disconnect = async () => {
  ws?.close(); ws = null
  connected.value = false; messages.value = []; onlineUsers.value = []; wsUrl.value = ''; pendingFiles.value = []
  if (isHost.value) { await invoke('stop_lan_server').catch(() => {}); isHost.value = false }
}

const copyAddr = () => navigator.clipboard.writeText(wsUrl.value).then(() => ElMessage.success('已复制地址'))

onUnmounted(async () => {
  ws?.close()
  if (isHost.value) await invoke('stop_lan_server').catch(() => {})
  objectUrls.forEach(u => URL.revokeObjectURL(u))
})
</script>

<style scoped>
/* ===================================================
   容器
   =================================================== */
.chat-wrapper {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  overflow: hidden;
}

/* ===================================================
   连接面板
   =================================================== */
.connect-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl);
}

.connect-card {
  width: 420px;
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  border: 0.5px solid var(--border-color);
  box-shadow: var(--shadow-card);
  padding: var(--space-3xl) var(--space-2xl) var(--space-2xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

.connect-logo-box {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: linear-gradient(135deg, var(--accent-blue-bg), rgba(0,122,255,0.15));
  border: 0.5px solid rgba(0,122,255,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}
.connect-logo-emoji { font-size: 30px; line-height: 1; }

.connect-title-group { text-align: center; display: flex; flex-direction: column; gap: 4px; }
.connect-title { margin: 0; font-size: var(--font-size-title3); font-weight: var(--font-weight-semibold); color: var(--text-primary); letter-spacing: -0.3px; }
.connect-subtitle { margin: 0; font-size: var(--font-size-caption); color: var(--text-tertiary); }

.connect-divider { width: 100%; height: 0.5px; background: var(--border-color); }

.mode-tabs { display: flex; gap: 4px; background: var(--bg-secondary); border-radius: var(--radius-md); padding: 3px; width: 100%; }
.mode-tab {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
  padding: 7px 12px; border-radius: var(--radius-sm);
  font-size: var(--font-size-footnote); font-weight: var(--font-weight-medium);
  color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); user-select: none;
}
.mode-tab.active { background: var(--bg-primary); color: var(--accent-blue); box-shadow: var(--shadow-sm); }

.form-row { width: 100%; display: flex; flex-direction: column; gap: 5px; }
.form-row label { font-size: var(--font-size-caption); font-weight: var(--font-weight-medium); color: var(--text-secondary); }
.form-row-inline { flex-direction: row; gap: var(--space-sm); }
.connect-form { width: 100%; display: flex; flex-direction: column; gap: var(--space-md); }
.full-btn { width: 100%; }

.mode-hint {
  display: flex; align-items: flex-start; gap: 6px;
  font-size: var(--font-size-caption); color: var(--text-tertiary);
  background: var(--bg-secondary); border-radius: var(--radius-sm);
  padding: var(--space-sm) var(--space-md); width: 100%; line-height: 1.5;
}

.scan-stage { display: flex; flex-direction: column; align-items: center; gap: var(--space-md); padding: var(--space-lg) 0; width: 100%; }
.scan-anim { position: relative; width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; }
.scan-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid var(--accent-blue); opacity: 0; animation: scan-pulse 2s ease-out infinite; }
@keyframes scan-pulse { 0% { transform: scale(0.4); opacity: 0.7; } 100% { transform: scale(1.3); opacity: 0; } }
.scan-icon { font-size: 26px; color: var(--accent-blue); z-index: 1; }
.scan-tip { margin: 0; font-size: var(--font-size-caption); color: var(--text-tertiary); }

.section-label { margin: 0; font-size: var(--font-size-caption); color: var(--text-tertiary); align-self: flex-start; width: 100%; }
.room-list { width: 100%; display: flex; flex-direction: column; gap: 6px; }
.room-item {
  display: flex; align-items: center; gap: var(--space-sm);
  padding: 10px var(--space-md); border-radius: var(--radius-md);
  border: 0.5px solid var(--border-color); background: var(--bg-secondary);
  cursor: pointer; transition: all var(--transition-fast);
}
.room-item:hover { border-color: var(--accent-blue); background: var(--accent-blue-bg); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.room-item-icon { width: 32px; height: 32px; border-radius: var(--radius-sm); background: var(--accent-blue-bg); color: var(--accent-blue); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.room-info { flex: 1; min-width: 0; }
.room-addr { font-size: var(--font-size-footnote); font-weight: var(--font-weight-medium); color: var(--text-primary); font-family: 'SF Mono', Menlo, monospace; }
.room-label { font-size: var(--font-size-caption2); color: var(--text-tertiary); margin-top: 1px; }
.room-arrow { color: var(--text-quaternary); font-size: 14px; flex-shrink: 0; }

.no-room-tip { display: flex; flex-direction: column; align-items: center; gap: var(--space-xs); padding: var(--space-xl) 0; width: 100%; }
.no-room-icon { width: 40px; height: 40px; border-radius: 50%; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; font-size: 18px; color: var(--text-quaternary); }
.no-room-text { margin: 0; font-size: var(--font-size-footnote); font-weight: var(--font-weight-medium); color: var(--text-secondary); }
.no-room-sub { margin: 0; font-size: var(--font-size-caption); color: var(--text-tertiary); text-align: center; }

.lan-actions { display: flex; gap: var(--space-sm); width: 100%; justify-content: flex-end; }
.connecting-tip { display: flex; align-items: center; gap: var(--space-sm); color: var(--text-secondary); font-size: var(--font-size-footnote); padding: var(--space-lg) 0; }
.connect-error { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-caption); color: var(--el-color-danger); width: 100%; background: rgba(255,59,48,0.06); border-radius: var(--radius-sm); padding: var(--space-xs) var(--space-sm); }

/* ===================================================
   聊天布局
   =================================================== */
.chat-layout { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

/* ---- 顶栏 ---- */
.chat-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 var(--space-xl); height: 48px;
  background: var(--bg-primary); border-bottom: 0.5px solid var(--border-color); flex-shrink: 0;
}
.chat-header-left { display: flex; align-items: center; gap: var(--space-sm); }
.connection-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--color-green); box-shadow: 0 0 0 2.5px rgba(52,199,89,0.2); flex-shrink: 0; }
.room-name { font-size: var(--font-size-body); font-weight: var(--font-weight-semibold); color: var(--text-primary); }
.chat-header-right { display: flex; align-items: center; gap: var(--space-xs); }
.server-addr { font-size: var(--font-size-caption); color: var(--text-tertiary); font-family: 'SF Mono', Menlo, monospace; background: var(--bg-secondary); padding: 2px 8px; border-radius: var(--radius-xs); }

/* ---- 主体 ---- */
.chat-body { flex: 1; display: flex; overflow: hidden; background: var(--bg-secondary); }

/* ---- 消息区 ---- */
.message-area {
  flex: 1; overflow-y: auto; padding: var(--space-xl);
  display: flex; flex-direction: column; gap: var(--space-lg);
}
.message-area::-webkit-scrollbar { width: 4px; }
.message-area::-webkit-scrollbar-thumb { background: var(--text-quaternary); border-radius: 2px; }

.empty-messages { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-xs); }
.empty-icon { font-size: 36px; margin-bottom: var(--space-sm); }
.empty-text { margin: 0; font-size: var(--font-size-callout); font-weight: var(--font-weight-medium); color: var(--text-secondary); }
.empty-sub { margin: 0; font-size: var(--font-size-caption); color: var(--text-tertiary); }

/* ---- 消息条目 ---- */
.message-item {
  display: flex;
  align-items: flex-end;   /* 头像和气泡底部对齐 */
  gap: var(--space-sm);
}
.message-item.is-self { flex-direction: row-reverse; }
.message-item.is-system { justify-content: center; }

.system-msg {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: var(--font-size-caption); color: var(--text-tertiary);
  background: var(--bg-primary); border: 0.5px solid var(--border-color);
  padding: 3px 12px; border-radius: 20px;
}
.system-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--text-quaternary); flex-shrink: 0; }

/* 头像 */
.avatar {
  width: 30px; height: 30px; border-radius: 50%;
  background: var(--accent-blue); color: white;
  display: flex; align-items: center; justify-content: center;
  font-size: var(--font-size-caption); font-weight: var(--font-weight-semibold);
  flex-shrink: 0;
  /* 不设置 align-self，让其跟随 align-items: flex-end，与气泡底部对齐 */
}
.avatar-self { background: linear-gradient(135deg, var(--color-green), #27a24a); }

/* 气泡容器 */
.bubble-wrap { max-width: min(360px, 65%); display: flex; flex-direction: column; gap: 4px; }

.msg-meta { display: flex; align-items: center; gap: 5px; padding: 0 4px; }
.meta-self { justify-content: flex-end; }
.msg-username { font-size: var(--font-size-caption); font-weight: var(--font-weight-medium); color: var(--text-secondary); }
.msg-time { font-size: 11px; color: var(--text-quaternary); }

/* 文本气泡 */
.bubble {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-lg); border-top-left-radius: 4px;
  font-size: var(--font-size-footnote); line-height: 1.55; word-break: break-word;
  background: var(--bg-primary); color: var(--text-primary);
  box-shadow: var(--shadow-sm); border: 0.5px solid var(--border-color);
}
.bubble-self {
  background: var(--accent-blue); color: white; border: none;
  border-radius: var(--radius-lg); border-top-right-radius: 4px; border-top-left-radius: var(--radius-lg);
  box-shadow: 0 1px 4px rgba(0,122,255,0.25);
}

/* ---- 图片消息 ---- */
.img-bubble {
  cursor: pointer; overflow: hidden;
  border-radius: var(--radius-md); border-top-left-radius: 4px;
  border: 0.5px solid var(--border-color); box-shadow: var(--shadow-sm);
  display: flex; flex-direction: column;
  transition: opacity var(--transition-fast);
}
.img-bubble:hover { opacity: 0.9; }
.img-bubble-self { border-radius: var(--radius-md); border-top-right-radius: 4px; border-top-left-radius: var(--radius-md); }
.msg-image { display: block; max-width: 240px; max-height: 300px; object-fit: cover; }
.media-filename { font-size: 10px; color: var(--text-tertiary); padding: 4px var(--space-sm); background: var(--bg-secondary); }

/* ---- 视频消息 ---- */
.video-bubble {
  border-radius: var(--radius-md); border-top-left-radius: 4px;
  border: 0.5px solid var(--border-color); box-shadow: var(--shadow-sm);
  overflow: hidden; display: flex; flex-direction: column;
}
.video-bubble-self { border-radius: var(--radius-md); border-top-right-radius: 4px; border-top-left-radius: var(--radius-md); }
.msg-video { display: block; max-width: 240px; max-height: 200px; background: #000; }

/* ---- 文件卡片 ---- */
.file-card {
  display: flex; align-items: center; gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-primary); border: 0.5px solid var(--border-color);
  border-radius: var(--radius-md); border-top-left-radius: 4px;
  box-shadow: var(--shadow-sm); cursor: pointer;
  transition: background var(--transition-fast);
  min-width: 180px; max-width: 240px;
}
.file-card:hover { background: var(--accent-blue-bg); }
.file-card-self { border-radius: var(--radius-md); border-top-right-radius: 4px; border-top-left-radius: var(--radius-md); }
.file-card-icon { width: 36px; height: 36px; border-radius: var(--radius-sm); background: var(--accent-blue-bg); color: var(--accent-blue); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.file-card-body { flex: 1; min-width: 0; }
.file-card-name { margin: 0; font-size: var(--font-size-footnote); font-weight: var(--font-weight-medium); color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.file-card-size { margin: 0; font-size: var(--font-size-caption2); color: var(--text-tertiary); margin-top: 2px; }
.file-card-dl { color: var(--text-quaternary); font-size: 16px; flex-shrink: 0; }

/* ---- 用户面板 ---- */
.user-panel {
  width: 168px; flex-shrink: 0; display: flex; flex-direction: column;
  background: var(--bg-primary); border-left: 0.5px solid var(--border-color);
}
.user-panel-title {
  display: flex; align-items: center; gap: var(--space-xs);
  padding: var(--space-md) var(--space-md) var(--space-sm);
  font-size: var(--font-size-caption); font-weight: var(--font-weight-semibold);
  color: var(--text-tertiary); border-bottom: 0.5px solid var(--border-color);
}
.user-count { margin-left: auto; font-size: var(--font-size-caption2); background: var(--bg-tertiary); color: var(--text-secondary); padding: 1px 7px; border-radius: 10px; font-weight: var(--font-weight-medium); }
.user-list { flex: 1; overflow-y: auto; padding: var(--space-xs) 0; }
.user-item { display: flex; align-items: center; gap: var(--space-sm); padding: 6px var(--space-md); transition: background var(--transition-fast); }
.user-item:hover { background: var(--bg-secondary); }
.user-avatar { width: 26px; height: 26px; border-radius: 50%; background: var(--bg-tertiary); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-caption); font-weight: var(--font-weight-semibold); flex-shrink: 0; }
.user-avatar-me { background: var(--accent-blue-bg); color: var(--accent-blue); }
.user-name { flex: 1; font-size: var(--font-size-footnote); color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-item.is-me .user-name { color: var(--accent-blue); }
.me-badge { font-size: 10px; font-weight: var(--font-weight-medium); color: var(--accent-blue); background: var(--accent-blue-bg); padding: 1px 5px; border-radius: 4px; flex-shrink: 0; }

/* ===================================================
   输入区
   =================================================== */
.input-area {
  padding: var(--space-sm) var(--space-xl) var(--space-md);
  background: var(--bg-primary);
  border-top: 0.5px solid var(--border-color);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

/* 待发文件预览条 */
.pending-strip {
  display: flex;
  gap: var(--space-sm);
  overflow-x: auto;
  padding: 4px 0 2px;
}
.pending-strip::-webkit-scrollbar { height: 3px; }
.pending-strip::-webkit-scrollbar-thumb { background: var(--text-quaternary); border-radius: 2px; }

.pending-item {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  max-width: 72px;
}
.pending-thumb {
  width: 64px; height: 64px; object-fit: cover;
  border-radius: var(--radius-sm); border: 0.5px solid var(--border-color);
}
.pending-file-icon {
  width: 64px; height: 64px; border-radius: var(--radius-sm);
  background: var(--bg-tertiary); border: 0.5px solid var(--border-color);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; color: var(--text-secondary);
}
.pending-name { font-size: 10px; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 64px; }
.pending-remove {
  position: absolute; top: -5px; right: -5px;
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--text-secondary); color: white;
  border: none; cursor: pointer; padding: 0;
  display: flex; align-items: center; justify-content: center; font-size: 10px;
  transition: background var(--transition-fast);
}
.pending-remove:hover { background: var(--color-red); }

/* 主输入框容器 */
.input-box {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color-strong);
  border-radius: 22px;
  padding: 4px 4px 4px var(--space-md);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.input-box.focused {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px var(--accent-blue-bg);
  background: var(--bg-primary);
}

/* 附件按钮 */
.attach-btn {
  flex-shrink: 0;
  width: 32px; height: 32px;
  border: none; background: transparent; border-radius: 50%;
  color: var(--text-tertiary); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; padding: 0;
  align-self: flex-end; margin-bottom: 1px;
  transition: color var(--transition-fast), background var(--transition-fast);
}
.attach-btn:hover { color: var(--accent-blue); background: var(--accent-blue-bg); }

/* 文本输入 */
.msg-textarea {
  flex: 1;
  min-height: 34px; max-height: 120px;
  background: transparent; border: none; outline: none; resize: none;
  font-size: var(--font-size-footnote); font-family: var(--font-family);
  color: var(--text-primary); line-height: 1.55;
  padding: 7px 0; overflow-y: auto;
}
.msg-textarea::placeholder { color: var(--text-tertiary); }
.msg-textarea::-webkit-scrollbar { width: 3px; }
.msg-textarea::-webkit-scrollbar-thumb { background: var(--text-quaternary); border-radius: 2px; }

/* 嵌入式发送按钮（圆形） */
.send-btn-round {
  flex-shrink: 0;
  width: 34px; height: 34px; border-radius: 50%; border: none;
  background: var(--bg-tertiary); color: var(--text-quaternary);
  cursor: default; display: flex; align-items: center; justify-content: center;
  font-size: 16px; padding: 0;
  align-self: flex-end; margin-bottom: 1px;
  transition: all var(--transition-fast);
}
.send-btn-round.send-active {
  background: var(--accent-blue); color: white; cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,122,255,0.3);
}
.send-btn-round.send-active:hover { background: var(--accent-blue-hover); transform: scale(1.06); }
.send-btn-round.send-active:active { transform: scale(0.94); }

/* ---- 文件传输进度卡片 ---- */
.file-progress-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-primary);
  border: 0.5px solid var(--border-color);
  border-radius: var(--radius-md);
  border-top-left-radius: 4px;
  box-shadow: var(--shadow-sm);
  min-width: 220px;
  max-width: 280px;
}
.file-progress-self {
  border-radius: var(--radius-md);
  border-top-right-radius: 4px;
  border-top-left-radius: var(--radius-md);
}
.file-progress-icon {
  width: 36px; height: 36px;
  border-radius: var(--radius-sm);
  background: var(--accent-blue-bg); color: var(--accent-blue);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.file-progress-icon.recv {
  background: rgba(52, 199, 89, 0.1); color: var(--color-green);
}
.file-progress-body { flex: 1; min-width: 0; }
.file-progress-name {
  margin: 0;
  font-size: var(--font-size-footnote);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.file-progress-bar-wrap {
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  margin: 5px 0;
  overflow: hidden;
}
.file-progress-bar {
  height: 100%;
  background: var(--accent-blue);
  border-radius: 2px;
  transition: width 0.15s linear;
}
.file-progress-bar.recv { background: var(--color-green); }
.file-progress-info {
  margin: 0;
  font-size: 11px;
  color: var(--text-tertiary);
}

/* ===================================================
   图片全屏查看器
   =================================================== */
.image-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.85);
  display: flex; align-items: center; justify-content: center;
  cursor: zoom-out;
  animation: overlay-in 150ms ease;
}
@keyframes overlay-in { from { opacity: 0; } to { opacity: 1; } }

.overlay-img {
  max-width: 90vw; max-height: 90vh;
  object-fit: contain; border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg); cursor: default;
  animation: img-in 150ms ease;
}
@keyframes img-in { from { transform: scale(0.93); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.overlay-close {
  position: fixed; top: 20px; right: 20px;
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(255,255,255,0.15); color: white;
  border: none; cursor: pointer; font-size: 18px;
  display: flex; align-items: center; justify-content: center;
  transition: background var(--transition-fast);
}
.overlay-close:hover { background: rgba(255,255,255,0.25); }
</style>
