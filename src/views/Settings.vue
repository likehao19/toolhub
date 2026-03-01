<template>
  <div class="settings-page-wrapper">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <div class="breadcrumb">
          <el-icon style="margin-right: 8px;"><Setting /></el-icon>
          设置 / {{ currentMenuName }}
        </div>
      </div>
      <div class="header-actions">
        <!-- 操作按钮组 -->
        <el-button size="small" @click="handleSave" :loading="saving" type="primary" circle title="保存设置">
          <el-icon><Check /></el-icon>
        </el-button>
        <el-button size="small" @click="handleReset" circle title="重置设置">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </div>
    </header>

    <div class="main-container">
      <!-- 左侧菜单栏 -->
      <aside class="sidebar-left">
        <div class="sidebar-toolbar">
          <span class="sidebar-title">设置菜单</span>
        </div>

        <div class="menu-list">
          <div
            v-for="menu in menuItems"
            :key="menu.key"
            class="menu-item"
            :class="{ active: activeTab === menu.key }"
            @click="activeTab = menu.key"
          >
            <el-icon class="menu-icon">
              <component :is="menu.icon" />
            </el-icon>
            <span class="menu-name">{{ menu.label }}</span>
          </div>
        </div>
      </aside>

      <!-- 右侧内容区域 -->
      <main class="content-area">
        <!-- 通用设置 -->
        <div v-show="activeTab === 'general'" class="settings-section">
          <h3 class="section-title">通用设置</h3>

          <!-- 窗口与启动 -->
          <el-card shadow="never" style="margin-bottom: 20px;">
            <template #header>
              <div class="card-header">窗口与启动</div>
            </template>
            <el-form :model="settings" label-width="140px" label-position="left">
              <el-form-item label="窗口关闭行为">
                <el-radio-group v-model="settings.closeAction">
                  <el-radio :value="'ask'">询问</el-radio>
                  <el-radio :value="'minimize'">最小化到托盘</el-radio>
                  <el-radio :value="'exit'">直接退出</el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="开机自启">
                <el-switch
                  v-model="settings.autoStart"
                  @change="handleAutostartChange"
                  :loading="autostartLoading"
                />
                <span style="margin-left: 10px; color: #909399; font-size: 12px;">
                  启用后，应用将在系统启动时自动运行
                </span>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 外观与主题 -->
          <el-card shadow="never" style="margin-bottom: 20px;">
            <template #header>
              <div class="card-header">外观与主题</div>
            </template>
            <el-form :model="settings" label-width="140px" label-position="left">
              <el-form-item label="主题模式">
                <el-radio-group v-model="settings.theme" @change="applyTheme">
                  <el-radio :value="'light'">亮色</el-radio>
                  <el-radio :value="'dark'">暗色</el-radio>
                  <el-radio :value="'auto'">跟随系统</el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="字体大小">
                <el-slider
                  v-model="settings.fontSize"
                  :min="12"
                  :max="20"
                  :step="1"
                  show-stops
                  style="width: 300px"
                />
                <span style="margin-left: 10px">{{ settings.fontSize }}px</span>
              </el-form-item>

              <el-form-item label="字体家族">
                <el-select v-model="settings.fontFamily" style="width: 300px">
                  <el-option label="系统默认" value="system" />
                  <el-option label="微软雅黑" value="Microsoft YaHei" />
                  <el-option label="宋体" value="SimSun" />
                  <el-option label="Arial" value="Arial" />
                  <el-option label="Consolas" value="Consolas" />
                </el-select>
              </el-form-item>

              <el-form-item label="启用动画">
                <el-switch v-model="settings.enableAnimations" />
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 语言与区域 -->
          <el-card shadow="never" style="margin-bottom: 20px;">
            <template #header>
              <div class="card-header">语言与区域</div>
            </template>
            <el-form :model="settings" label-width="140px" label-position="left">
              <el-form-item label="语言">
                <el-select v-model="settings.language" style="width: 200px">
                  <el-option label="简体中文" value="zh-CN" />
                  <el-option label="English" value="en-US" />
                </el-select>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 通知与提醒 -->
          <el-card shadow="never">
            <template #header>
              <div class="card-header">通知与提醒</div>
            </template>
            <el-alert
              title="提醒功能说明"
              type="info"
              :closable="false"
              style="margin-bottom: 16px;"
            >
              <p style="margin: 8px 0;">📋 待办提醒：在待办管理中配置，可在开始日期、截止日期或过期时提醒</p>
              <p style="margin: 8px 0;">📅 日程提醒：在日程管理中配置，可设置提前提醒时间和重复规则</p>
              <p style="margin: 8px 0;">此处仅配置通知的显示方式</p>
            </el-alert>
            <el-form :model="reminderConfig" label-width="120px" label-position="left">
              <el-form-item label="位置类型">
                <el-radio-group v-model="reminderConfig.positionType">
                  <el-radio value="window">软件内位置</el-radio>
                  <el-radio value="screen">桌面窗口位置</el-radio>
                </el-radio-group>
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">
                  软件内位置:相对于应用窗口 | 桌面窗口位置:相对于整个屏幕
                </div>
              </el-form-item>

              <el-form-item label="显示位置">
                <el-select v-model="reminderConfig.position" style="width: 200px;">
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

              <el-form-item>
                <el-button type="primary" @click="saveReminderSettings">
                  保存通知设置
                </el-button>
                <el-button @click="testNotification">
                  测试通知
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </div>

        <!-- 工作空间 -->
        <div v-show="activeTab === 'workspace'" class="settings-section">
          <h3 class="section-title">工作空间</h3>

          <!-- 笔记设置 -->
          <el-card shadow="never" style="margin-bottom: 20px;">
            <template #header>
              <div class="card-header">笔记设置</div>
            </template>
            <el-form :model="settings" label-width="140px" label-position="left">
              <el-form-item label="笔记存储位置">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <el-input v-model="settings.notesStoragePath" readonly style="flex: 1;" />
                  <el-button @click="selectNotesStoragePath">更改</el-button>
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: #909399;">
                  笔记文件将保存在此目录。更改路径时可以选择自动迁移现有笔记。
                </div>
              </el-form-item>

              <el-form-item label="存储使用情况">
                <el-descriptions :column="1" border>
                  <el-descriptions-item label="笔记大小">
                    {{ formatFileSize(storageStats.notesSize) }}
                  </el-descriptions-item>
                  <el-descriptions-item label="数据库大小">
                    {{ formatFileSize(storageStats.databaseSize) }}
                  </el-descriptions-item>
                  <el-descriptions-item label="媒体文件大小">
                    {{ formatFileSize(storageStats.mediaSize) }}
                  </el-descriptions-item>
                  <el-descriptions-item label="总大小">
                    {{ formatFileSize(storageStats.totalSize) }}
                  </el-descriptions-item>
                </el-descriptions>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- Markdown 主题 -->
          <el-card shadow="never" style="margin-bottom: 20px;">
            <template #header>
              <div class="card-header">Markdown 主题</div>
            </template>
            <el-form :model="settings" label-width="140px" label-position="left">
              <el-divider content-position="left">预览模式</el-divider>
              <el-form-item label="预览主题">
                <el-select v-model="settings.previewTheme" style="width: 300px">
                  <el-option label="Default" value="default" />
                  <el-option label="GitHub" value="github" />
                  <el-option label="VuePress" value="vuepress" />
                  <el-option label="MK Cute" value="mk-cute" />
                  <el-option label="Smart Blue" value="smart-blue" />
                  <el-option label="Cyanosis" value="cyanosis" />
                </el-select>
                <div style="margin-top: 8px; font-size: 12px; color: #909399;">
                  仅查看笔记时的主题样式
                </div>
              </el-form-item>

              <el-form-item label="代码主题">
                <el-select v-model="settings.previewCodeTheme" style="width: 300px">
                  <el-option label="Atom" value="atom" />
                  <el-option label="A11y" value="a11y" />
                  <el-option label="GitHub" value="github" />
                  <el-option label="Gradient" value="gradient" />
                  <el-option label="Kimbie" value="kimbie" />
                  <el-option label="Paraiso" value="paraiso" />
                  <el-option label="Qt Creator" value="qtcreator" />
                  <el-option label="Stack Overflow" value="stackoverflow" />
                </el-select>
                <div style="margin-top: 8px; font-size: 12px; color: #909399;">
                  仅查看笔记时的代码块样式
                </div>
              </el-form-item>

              <el-divider content-position="left">编辑模式</el-divider>
              <el-form-item label="预览主题">
                <el-select v-model="settings.editorPreviewTheme" style="width: 300px">
                  <el-option label="Default" value="default" />
                  <el-option label="GitHub" value="github" />
                  <el-option label="VuePress" value="vuepress" />
                  <el-option label="MK Cute" value="mk-cute" />
                  <el-option label="Smart Blue" value="smart-blue" />
                  <el-option label="Cyanosis" value="cyanosis" />
                </el-select>
                <div style="margin-top: 8px; font-size: 12px; color: #909399;">
                  编辑笔记时预览区的主题样式
                </div>
              </el-form-item>

              <el-form-item label="代码主题">
                <el-select v-model="settings.editorCodeTheme" style="width: 300px">
                  <el-option label="Atom" value="atom" />
                  <el-option label="A11y" value="a11y" />
                  <el-option label="GitHub" value="github" />
                  <el-option label="Gradient" value="gradient" />
                  <el-option label="Kimbie" value="kimbie" />
                  <el-option label="Paraiso" value="paraiso" />
                  <el-option label="Qt Creator" value="qtcreator" />
                  <el-option label="Stack Overflow" value="stackoverflow" />
                </el-select>
                <div style="margin-top: 8px; font-size: 12px; color: #909399;">
                  编辑笔记时预览区的代码块样式
                </div>
              </el-form-item>
            </el-form>
          </el-card>
        </div>

        <!-- 安全与数据 -->
        <div v-show="activeTab === 'security'" class="settings-section">
          <h3 class="section-title">安全与数据</h3>

          <!-- 密码管理 -->
          <el-card shadow="never" style="margin-bottom: 20px;">
            <template #header>
              <div class="card-header">密码管理</div>
            </template>
            <el-form label-width="150px" label-position="left">
              <el-form-item label="启动时验证密码">
                <el-switch
                  v-model="passwordSettings.requirePasswordOnStart"
                  active-text="开启"
                  inactive-text="关闭"
                />
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">
                  开启后，每次打开软件都需要输入主密码才能访问密码管理
                </div>
              </el-form-item>

              <el-form-item label="自动锁定时间">
                <el-select
                  v-model="passwordSettings.autoLockTime"
                  style="width: 200px;"
                >
                  <el-option label="5 分钟" :value="5" />
                  <el-option label="10 分钟" :value="10" />
                  <el-option label="15 分钟" :value="15" />
                  <el-option label="30 分钟" :value="30" />
                  <el-option label="从不" :value="0" />
                </el-select>
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">
                  无操作后自动锁定密码管理器
                </div>
              </el-form-item>

              <el-form-item>
                <el-button type="primary" @click="showChangePasswordDialog = true">
                  修改主密码
                </el-button>
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">
                  修改用于解锁密码管理器的主密码
                </div>
              </el-form-item>

              <el-divider />

              <el-form-item label="密码库状态">
                <el-descriptions :column="1" border>
                  <el-descriptions-item label="密码数量">
                    {{ passwordStats.totalPasswords }} 个
                  </el-descriptions-item>
                  <el-descriptions-item label="历史记录">
                    {{ passwordStats.historyCount }} 条
                  </el-descriptions-item>
                  <el-descriptions-item label="回收站">
                    {{ passwordStats.recycleBinCount }} 个
                  </el-descriptions-item>
                  <el-descriptions-item label="主密码状态">
                    {{ passwordStats.hasMasterPassword ? '已设置' : '未设置' }}
                  </el-descriptions-item>
                </el-descriptions>
              </el-form-item>
            </el-form>
          </el-card>
        </div>

        <!-- AI 与效率 -->
        <div v-show="activeTab === 'ai'" class="settings-section">
          <h3 class="section-title">AI 与效率</h3>

          <!-- AI 助手悬浮球 -->
          <el-card shadow="never" style="margin-bottom: 20px;">
            <template #header>
              <div class="card-header">AI 助手悬浮球</div>
            </template>
            <el-form :model="aiAssistantSettings" label-width="140px" label-position="left">
              <el-form-item label="启用悬浮球">
                <el-switch
                  v-model="aiAssistantSettings.enableFloatingBall"
                  @change="handleFloatingBallToggle"
                />
                <div style="margin-left: 10px; color: #909399; font-size: 12px;">
                  <div>开启后显示可拖拽的悬浮球（默认关闭）</div>
                  <div style="margin-top: 4px;">关闭时可通过 Ctrl+K 快捷键打开 AI 助手</div>
                </div>
              </el-form-item>

              <el-form-item label="悬浮球位置" v-if="aiAssistantSettings.enableFloatingBall">
                <el-radio-group
                  v-model="aiAssistantSettings.floatingBallMode"
                  @change="handleFloatingBallChange"
                >
                  <el-radio value="inApp">应用内悬浮</el-radio>
                  <el-radio value="desktop">桌面窗口悬浮</el-radio>
                </el-radio-group>
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">
                  应用内：仅在应用窗口显示 | 桌面窗口：独立小窗口，可在桌面任意位置
                </div>
              </el-form-item>

              <el-form-item label="悬浮球样式" v-if="aiAssistantSettings.enableFloatingBall">
                <el-select
                  v-model="aiAssistantSettings.floatingBallStyle"
                  style="width: 200px;"
                  @change="handleFloatingBallChange"
                >
                  <el-option label="默认圆形" value="circle" />
                  <el-option label="圆角方形" value="rounded" />
                  <el-option label="胶囊形" value="capsule" />
                </el-select>
              </el-form-item>

              <el-form-item label="悬浮球大小" v-if="aiAssistantSettings.enableFloatingBall">
                <el-slider
                  v-model="aiAssistantSettings.floatingBallSize"
                  :min="40"
                  :max="80"
                  :step="5"
                  style="width: 200px"
                  @change="handleFloatingBallChange"
                />
                <span style="margin-left: 10px">{{ aiAssistantSettings.floatingBallSize }}px</span>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- AI 配置 -->
          <el-card shadow="never" style="margin-bottom: 20px;">
            <template #header>
              <div class="card-header">AI 助手配置</div>
            </template>
            <el-form :model="aiSettings" label-width="140px" label-position="left">
              <el-form-item label="API 地址">
                <el-input
                  v-model="aiSettings.baseUrl"
                  placeholder="https://api.openai.com/v1"
                  style="width: 400px;"
                />
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">
                  OpenAI 兼容接口地址，支持第三方服务（如 DeepSeek、通义千问等）
                </div>
              </el-form-item>

              <el-form-item label="API Key">
                <el-input
                  v-model="aiSettings.apiKey"
                  type="password"
                  show-password
                  placeholder="输入 API Key"
                  style="width: 400px;"
                />
              </el-form-item>

              <el-form-item label="模型">
                <el-input
                  v-model="aiSettings.model"
                  placeholder="例如：gpt-4、deepseek-chat、qwen-turbo"
                  style="width: 400px;"
                />
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">
                  输入模型名称，需与 API 服务支持的模型一致
                </div>
              </el-form-item>

              <el-form-item>
                <el-button type="primary" @click="testAIConnection" :loading="testingAI">
                  测试连接
                </el-button>
              </el-form-item>

              <el-alert
                v-if="aiTestResult"
                :title="aiTestResult.success ? '连接成功' : '连接失败'"
                :type="aiTestResult.success ? 'success' : 'error'"
                :description="aiTestResult.message"
                :closable="false"
                style="margin-top: 16px;"
              />
            </el-form>
          </el-card>
        </div>

        <!-- 帮助与反馈 -->
        <div v-show="activeTab === 'about'" class="settings-section">
          <h3 class="section-title">帮助与反馈</h3>

          <!-- 关于应用 -->
          <el-card shadow="never" style="margin-bottom: 20px;">
            <template #header>
              <div class="card-header">关于应用</div>
            </template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="应用名称">效率工具箱</el-descriptions-item>
              <el-descriptions-item label="版本">v1.0.0</el-descriptions-item>
              <el-descriptions-item label="构建时间">2026-02-01</el-descriptions-item>
              <el-descriptions-item label="技术栈">Vue 3 + Tauri</el-descriptions-item>
            </el-descriptions>
          </el-card>

          <!-- 帮助与支持 -->
          <el-card shadow="never">
            <template #header>
              <div class="card-header">帮助与支持</div>
            </template>
            <el-form label-width="100px">
              <el-form-item label="反馈内容">
                <el-input
                  v-model="feedbackContent"
                  type="textarea"
                  :rows="6"
                  placeholder="请描述您遇到的问题或建议..."
                  maxlength="500"
                  show-word-limit
                />
              </el-form-item>
              <el-form-item label="联系方式">
                <el-input
                  v-model="feedbackContact"
                  placeholder="选填：邮箱或其他联系方式"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="submitFeedback" :loading="submittingFeedback">
                  提交反馈
                </el-button>
                <el-button @click="clearFeedback">清空</el-button>
              </el-form-item>
              <el-divider />
              <el-form-item label="软件更新">
                <el-button @click="checkUpdate" :loading="checkingUpdate">
                  <el-icon><Refresh /></el-icon>
                  检查更新
                </el-button>
                <span v-if="updateInfo" style="margin-left: 12px; color: #67c23a;">
                  {{ updateInfo }}
                </span>
              </el-form-item>
              <el-divider />
              <el-form-item>
                <el-button type="danger" @click="handleReset">
                  重置应用设置
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </div>
      </main>
    </div>

    <!-- 笔记迁移进度对话框 -->
    <el-dialog
      v-model="showMigrationDialog"
      :title="migrateMode === 'move' ? '移动笔记文件' : '复制笔记文件'"
      width="500px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <div style="text-align: center; padding: 20px 0;">
        <el-progress
          :percentage="migrationProgress"
          :status="migrationProgress === 100 ? 'success' : undefined"
          style="margin-bottom: 20px;"
        />
        <p style="color: #606266; margin-top: 12px;">{{ migrationStatus }}</p>
        <p v-if="migrateMode === 'move'" style="color: #909399; font-size: 12px; margin-top: 8px;">
          {{ migrationProgress < 100 ? '正在移动文件，源文件将在完成后删除...' : '源文件已清理' }}
        </p>
      </div>
    </el-dialog>

    <!-- 修改密码对话框 -->
    <el-dialog v-model="showChangePasswordDialog" title="修改主密码" width="450px">
      <el-alert
        title="请谨慎操作"
        type="warning"
        :closable="false"
        style="margin-bottom: 20px;"
      >
        <p>修改主密码后，请务必记住新密码！</p>
      </el-alert>

      <el-form label-width="100px">
        <el-form-item label="旧密码">
          <el-input
            v-model="oldPasswordInput"
            type="password"
            placeholder="请输入当前主密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input
            v-model="newPasswordInput"
            type="password"
            placeholder="至少6位"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认新密码">
          <el-input
            v-model="newPasswordConfirm"
            type="password"
            placeholder="再次输入新密码"
            show-password
            @keyup.enter="changePassword"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showChangePasswordDialog = false">取消</el-button>
        <el-button type="primary" @click="changePassword">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Refresh, Setting, Brush, Folder, MagicStick, Lock, Bell } from '@element-plus/icons-vue'
import { loadConfig, saveConfig, resetConfig } from '@/utils/tauri/store'
import { fetch } from '@tauri-apps/plugin-http'
import { openPath } from '@tauri-apps/plugin-opener'
import { appDataDir, join } from '@tauri-apps/api/path'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import TauriAutostart from '@/utils/tauri/autostart'
import Database from '@tauri-apps/plugin-sql'
import { hashPassword, verifyPassword, generateSalt } from '@/utils/masterPassword'
import { saveReminderConfig } from '@/utils/reminderService'
import { useAppStore } from '@/store/app'

const appStore = useAppStore()

const activeTab = ref('general')
const saving = ref(false)
const autostartLoading = ref(false)
const testingAI = ref(false)
const aiTestResult = ref(null)
const originalSettings = ref(null)

// 反馈相关
const feedbackContent = ref('')
const feedbackContact = ref('')
const submittingFeedback = ref(false)

// 更新相关
const checkingUpdate = ref(false)
const updateInfo = ref('')
const hasChanges = ref(false)
const configPath = ref('')
const lastSaved = ref('')

// 菜单项
const menuItems = [
  { key: 'general', label: '通用设置', icon: Setting },
  { key: 'workspace', label: '工作空间', icon: Folder },
  { key: 'security', label: '安全与数据', icon: Lock },
  { key: 'ai', label: 'AI 与效率', icon: MagicStick },
  { key: 'about', label: '帮助与反馈', icon: Bell }
]

// 当前菜单名称
const currentMenuName = computed(() => {
  const menu = menuItems.find(m => m.key === activeTab.value)
  return menu ? menu.label : '设置'
})

// 设置数据
const settings = reactive({
  closeAction: 'ask',
  autoStart: false,
  language: 'zh-CN',
  theme: 'auto',
  fontSize: 14,
  fontFamily: 'system',
  enableAnimations: true,
  notesStoragePath: '',
  // Markdown 主题设置
  previewTheme: 'mk-cute',
  previewCodeTheme: 'github',
  editorPreviewTheme: 'mk-cute',
  editorCodeTheme: 'github'
})

// AI 设置
const aiSettings = reactive({
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo'
})

// AI 助手悬浮球设置
const aiAssistantSettings = reactive({
  enableFloatingBall: false,
  floatingBallMode: 'inApp', // 'inApp' 或 'desktop'
  floatingBallStyle: 'circle', // 'circle', 'rounded', 'capsule'
  floatingBallSize: 60
})

// 存储统计
const storageStats = reactive({
  notesSize: 0,
  databaseSize: 0,
  mediaSize: 0,
  totalSize: 0
})

// 加载统计状态
const loadingStats = ref(false)

// 密码管理设置
const passwordSettings = reactive({
  requirePasswordOnStart: true,
  autoLockTime: 15
})

// 密码库统计
const passwordStats = reactive({
  totalPasswords: 0,
  historyCount: 0,
  recycleBinCount: 0,
  hasMasterPassword: false
})

// 修改密码相关
const showChangePasswordDialog = ref(false)
const oldPasswordInput = ref('')
const newPasswordInput = ref('')
const newPasswordConfirm = ref('')

// 提醒设置
const reminderConfig = reactive({
  position: 'bottomRight',
  positionType: 'screen'
})

// 迁移进度
const showMigrationDialog = ref(false)
const migrationProgress = ref(0)
const migrationStatus = ref('')
const migrateMode = ref('move') // 'move' 或 'copy'

const DB_PATH = 'sqlite:productivity.db'
let dbInstance = null

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_PATH)
  }
  return dbInstance
}

// 应用主题
const applyTheme = (theme) => {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light')
  } else {
    // 跟随系统
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  }
}

/**
 * 加载配置
 */
const loadSettings = async () => {
  try {
    const config = await loadConfig()

    // 更新设置
    if (config) {
      Object.assign(settings, config)
      if (config.aiSettings) {
        Object.assign(aiSettings, config.aiSettings)
      }
      if (config.aiAssistantSettings) {
        Object.assign(aiAssistantSettings, config.aiAssistantSettings)
      }

      // 同步窗口关闭行为到 store
      if (config.closeAction) {
        appStore.setCloseAction(config.closeAction)
      }
    }

    // 检查自动启动状态
    try {
      const autostartEnabled = await TauriAutostart.checkAutostart()
      settings.autoStart = autostartEnabled
    } catch (e) { /* ignore */ }

    // 加载笔记存储路径
    if (!settings.notesStoragePath) {
      const dataDir = await appDataDir()
      settings.notesStoragePath = await join(dataDir, 'notes')

    }

    // 加载存储统计
    await loadStorageStats()

    // 保存原始设置用于比较
    originalSettings.value = JSON.parse(JSON.stringify(settings))
    hasChanges.value = false
  } catch (e) { /* ignore */ }
}

/**
 * 处理自动启动状态变化
 */
const handleAutostartChange = async (enabled) => {
  autostartLoading.value = true
  try {
    const success = await TauriAutostart.toggleAutostart(enabled)
    if (success) {
      // 更新配置
      await saveConfig(settings)
      originalSettings.value = JSON.parse(JSON.stringify(settings))
      hasChanges.value = false
    } else {
      // 如果失败，恢复原状态
      settings.autoStart = !enabled
    }
  } catch (error) {

    // 恢复原状态
    settings.autoStart = !enabled
  } finally {
    autostartLoading.value = false
  }
}

/**
 * 保存配置
 */
const handleSave = async () => {
  saving.value = true
  try {
    // 1. 保存常规设置到配置文件
    const config = {
      ...settings,
      aiSettings: { ...aiSettings },
      aiAssistantSettings: { ...aiAssistantSettings }
    }
    await saveConfig(config)

    // 同步 AI 助手设置到 localStorage（供桌面悬浮球使用）
    localStorage.setItem('aiAssistantSettings', JSON.stringify(aiAssistantSettings))

    // 同步 AI 配置到 localStorage（供 api.js 使用）
    localStorage.setItem('ai_config', JSON.stringify({
      apiKey: aiSettings.apiKey,
      baseURL: aiSettings.baseUrl,
      model: aiSettings.model
    }))

    // 触发全局事件通知 AI 助手悬浮球设置已更改
    window.dispatchEvent(new CustomEvent('ai-floating-ball-settings-changed', {
      detail: aiAssistantSettings
    }))

    // 2. 同步窗口关闭行为到 store
    if (settings.closeAction) {
      appStore.setCloseAction(settings.closeAction)
    }

    // 3. 保存密码管理设置到数据库
    try {
      await savePasswordSettings()
    } catch (error) {

      // 不中断主流程，只记录错误
    }

    originalSettings.value = JSON.parse(JSON.stringify(settings))
    hasChanges.value = false
    lastSaved.value = new Date().toLocaleString('zh-CN')
    ElMessage.success('设置已保存')
  } catch (error) {

    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

/**
 * 选择笔记存储路径
 */
const selectNotesStoragePath = async () => {
  try {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      defaultPath: settings.notesStoragePath
    })

    if (selected && selected !== settings.notesStoragePath) {
      const oldPath = settings.notesStoragePath

      // 询问用户迁移模式
      try {
        const { value } = await ElMessageBox.confirm(
          `请选择迁移方式：\n\n【移动】将文件从旧位置转移到新位置（删除源文件）\n【复制】将文件复制到新位置（保留源文件作为备份）\n【仅更改路径】不迁移文件，手动操作\n\n旧位置：${oldPath}\n新位置：${selected}`,
          '选择迁移方式',
          {
            confirmButtonText: '移动',
            cancelButtonText: '复制',
            distinguishCancelAndClose: true,
            showClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: false,
            type: 'warning',
            buttonSize: 'default'
          }
        )

        // 用户选择移动
        migrateMode.value = 'move'
        await performMigration(oldPath, selected)
      } catch (action) {
        if (action === 'cancel') {
          // 用户选择复制
          migrateMode.value = 'copy'
          await performMigration(oldPath, selected)
        } else if (action === 'close') {
          // 显示"仅更改路径"确认
          try {
            await ElMessageBox.confirm(
              '确定要仅更改路径而不迁移文件吗？\n\n您需要手动将笔记复制到新位置。',
              '确认操作',
              {
                confirmButtonText: '仅更改路径',
                cancelButtonText: '取消',
                type: 'warning'
              }
            )

            // 仅更改路径
            settings.notesStoragePath = selected
            const { resetNotesDir } = await import('@/utils/notes')
            resetNotesDir()
            await handleSave()
            ElMessage.warning('路径已更改，但未迁移文件。请手动复制笔记到新位置。')
          } catch {
            // 用户取消了"仅更改路径"
          }
        }
      }
    }
  } catch (error) {
    if (error !== 'cancel') {

      ElMessage.error('选择路径失败')
    }
  }
}

/**
 * 执行迁移操作
 */
const performMigration = async (oldPath, newPath) => {
  showMigrationDialog.value = true
  migrationProgress.value = 0
  migrationStatus.value = '正在准备迁移...'

  try {
    await migrateNotes(oldPath, newPath)
    settings.notesStoragePath = newPath

    // 重置笔记目录缓存
    const { resetNotesDir } = await import('@/utils/notes')
    resetNotesDir()

    // 自动保存配置
    await handleSave()

    // 触发全局事件，通知其他组件笔记路径已更改
    window.dispatchEvent(new CustomEvent('notes-path-changed', {
      detail: { newPath }
    }))

    migrationStatus.value = migrateMode.value === 'move'
      ? '迁移完成！文件已移动到新位置'
      : '迁移完成！文件已复制到新位置（源文件已保留）'

    ElMessage.success({
      message: migrateMode.value === 'move' ? '笔记已成功移动到新位置' : '笔记已成功复制到新位置',
      duration: 3000
    })

    setTimeout(() => {
      showMigrationDialog.value = false
    }, 2000)
  } catch (error) {

    migrationStatus.value = '迁移失败：' + error.message
    ElMessage.error('迁移失败：' + error.message)
  }
}

/**
 * 迁移笔记文件
 */
const migrateNotes = async (oldPath, newPath) => {
  const { readDir, exists, mkdir, copyFile, remove } = await import('@tauri-apps/plugin-fs')
  const { join, sep } = await import('@tauri-apps/api/path')

  migrationStatus.value = '正在检查源目录...'

  // 检查旧路径是否存在
  if (!(await exists(oldPath))) {
    throw new Error('源目录不存在')
  }

  // 确保新路径存在
  if (!(await exists(newPath))) {
    await mkdir(newPath, { recursive: true })
  }

  // 获取所有文件列表
  migrationStatus.value = '正在扫描文件...'
  const allFiles = await getAllFiles(oldPath, oldPath)

  if (allFiles.length === 0) {
    migrationProgress.value = 100
    migrationStatus.value = '没有文件需要迁移'
    return
  }

  // 复制文件
  let processedFiles = 0
  const copiedFiles = []

  for (const file of allFiles) {
    const relativePath = file.replace(oldPath, '').replace(/^[/\\]/, '')
    const targetPath = await join(newPath, relativePath)

    // 确保目标目录存在
    const targetDir = targetPath.substring(0, targetPath.lastIndexOf(sep()))
    if (!(await exists(targetDir))) {
      await mkdir(targetDir, { recursive: true })
    }

    // 复制文件
    migrationStatus.value = `正在${migrateMode.value === 'move' ? '移动' : '复制'}: ${relativePath}`
    await copyFile(file, targetPath)
    copiedFiles.push(file)

    processedFiles++
    migrationProgress.value = Math.round((processedFiles / allFiles.length) * 100)
  }

  // 如果是移动模式，删除源文件
  if (migrateMode.value === 'move') {
    migrationStatus.value = '正在清理源文件...'

    // 删除所有已复制的文件
    for (const file of copiedFiles) {
      try {
        await remove(file)
      } catch (e) { /* ignore */ }
    }

    // 尝试删除空目录（从深层到浅层）
    try {
      await removeEmptyDirs(oldPath)
    } catch (e) { /* ignore */ }

    migrationStatus.value = `移动完成！共移动 ${processedFiles} 个文件`
  } else {
    migrationStatus.value = `复制完成！共复制 ${processedFiles} 个文件`
  }
}

/**
 * 删除空目录（递归）
 */
const removeEmptyDirs = async (dir) => {
  const { readDir, remove } = await import('@tauri-apps/plugin-fs')

  try {
    const entries = await readDir(dir)

    // 如果目录为空，删除它
    if (entries.length === 0) {
      await remove(dir, { recursive: false })
      return true
    }

    // 递归处理子目录
    for (const entry of entries) {
      if (entry.isDirectory) {
        const { join } = await import('@tauri-apps/api/path')
        const subDir = await join(dir, entry.name)
        await removeEmptyDirs(subDir)
      }
    }

    // 再次检查当前目录是否为空
    const updatedEntries = await readDir(dir)
    if (updatedEntries.length === 0) {
      await remove(dir, { recursive: false })
      return true
    }

    return false
  } catch (error) {

    return false
  }
}

/**
 * 递归获取所有文件
 */
const getAllFiles = async (dir, baseDir) => {
  const { readDir, stat } = await import('@tauri-apps/plugin-fs')
  const { join } = await import('@tauri-apps/api/path')

  const files = []

  try {
    const entries = await readDir(dir)

    for (const entry of entries) {
      const fullPath = await join(dir, entry.name)
      const fileStat = await stat(fullPath)

      if (fileStat.isDirectory) {
        // 递归获取子目录文件
        const subFiles = await getAllFiles(fullPath, baseDir)
        files.push(...subFiles)
      } else if (fileStat.isFile) {
        files.push(fullPath)
      }
    }
  } catch (e) { /* ignore */ }

  return files
}

/**
 * 测试 AI 连接
 */
const testAIConnection = async () => {
  if (!aiSettings.apiKey) {
    ElMessage.warning('请先输入 API Key')
    return
  }

  if (!aiSettings.baseUrl) {
    ElMessage.warning('请先输入 API 地址')
    return
  }

  if (!aiSettings.model) {
    ElMessage.warning('请先输入模型名称')
    return
  }

  testingAI.value = true
  aiTestResult.value = null

  try {
    let baseUrl = aiSettings.baseUrl.trim()
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1)
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiSettings.apiKey}`
      },
      body: JSON.stringify({
        model: aiSettings.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      })
    })

    if (response.ok) {
      const text = await response.text()
      const data = JSON.parse(text)
      if (data?.choices && Array.isArray(data.choices) && data.choices.length > 0) {
        aiTestResult.value = {
          success: true,
          message: `AI 服务连接成功，模型 ${aiSettings.model} 可正常使用`
        }
        ElMessage.success('连接成功')
      } else {
        throw new Error('API 返回格式不正确，请确认是否为 OpenAI 兼容接口。返回内容: ' + text.substring(0, 200))
      }
    } else {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`)
    }
  } catch (error) {
    aiTestResult.value = {
      success: false,
      message: error.message || '连接失败，请检查 API 地址、API Key 和模型名称'
    }
    ElMessage.error('连接失败')
  } finally {
    testingAI.value = false
  }
}

/**
 * 加载存储统计
 */
const loadStorageStats = async () => {
  loadingStats.value = true
  try {
    const { getNotesDir } = await import('@/utils/notes')
    const { stat, exists, readDir } = await import('@tauri-apps/plugin-fs')
    const { join, appDataDir } = await import('@tauri-apps/api/path')

    // 计算笔记文件大小
    const notesDir = await getNotesDir()
    storageStats.notesSize = await calculateDirectorySize(notesDir)

    // 计算数据库文件大小
    const appDir = await appDataDir()
    const dbPath = await join(appDir, 'productivity.db')
    if (await exists(dbPath)) {
      const dbStat = await stat(dbPath)
      storageStats.databaseSize = dbStat.size || 0
    } else {
      storageStats.databaseSize = 0
    }

    // 计算媒体文件大小（images, videos 文件夹）
    let mediaSize = 0
    const imagesPath = await join(notesDir, 'images')
    if (await exists(imagesPath)) {
      mediaSize += await calculateDirectorySize(imagesPath)
    }

    // 遍历所有笔记文件夹，计算其中的 images 和 videos 子文件夹
    try {
      const entries = await readDir(notesDir)
      for (const entry of entries) {
        if (entry.isDirectory) {
          const entryPath = await join(notesDir, entry.name)
          const imagesSubPath = await join(entryPath, 'images')
          const videosSubPath = await join(entryPath, 'videos')

          if (await exists(imagesSubPath)) {
            mediaSize += await calculateDirectorySize(imagesSubPath)
          }
          if (await exists(videosSubPath)) {
            mediaSize += await calculateDirectorySize(videosSubPath)
          }
        }
      }
    } catch (e) { /* ignore */ }

    storageStats.mediaSize = mediaSize
    storageStats.totalSize = storageStats.notesSize + storageStats.databaseSize + storageStats.mediaSize

    // ElMessage.success('存储统计已更新') // 已移除提示，避免重复弹出
  } catch (error) {
    ElMessage.error('加载存储统计失败：' + error.message)
  } finally {
    loadingStats.value = false
  }
}

/**
 * 递归计算目录大小
 */
const calculateDirectorySize = async (dirPath) => {
  const { stat, exists, readDir } = await import('@tauri-apps/plugin-fs')
  const { join } = await import('@tauri-apps/api/path')

  let totalSize = 0

  try {
    if (!(await exists(dirPath))) {
      return 0
    }

    const entries = await readDir(dirPath)

    for (const entry of entries) {
      const entryPath = await join(dirPath, entry.name)

      try {
        const entryStat = await stat(entryPath)

        if (entryStat.isDirectory) {
          // 递归计算子目录大小
          totalSize += await calculateDirectorySize(entryPath)
        } else if (entryStat.isFile) {
          totalSize += entryStat.size || 0
        }
      } catch (e) { /* ignore */ }
    }
  } catch (e) { /* ignore */ }

  return totalSize
}

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * 加载密码设置
 */
const loadPasswordSettings = async () => {
  try {
    const db = await getDatabase()
    const result = await db.select('SELECT require_password_on_start FROM master_password LIMIT 1')
    if (result && result.length > 0) {
      passwordSettings.requirePasswordOnStart = result[0].require_password_on_start === 1
    }
  } catch (e) { /* ignore */ }
}

/**
 * 保存密码设置
 */
const savePasswordSettings = async () => {
  try {
    const db = await getDatabase()
    await db.execute(
      'UPDATE master_password SET require_password_on_start = ? WHERE id = 1',
      [passwordSettings.requirePasswordOnStart ? 1 : 0]
    )
    // 移除单独的成功提示，由 handleSave 统一提示
  } catch (error) {

    throw error // 抛出错误让 handleSave 处理
  }
}

/**
 * 加载密码库统计
 */
const loadPasswordStats = async () => {
  try {
    const db = await getDatabase()

    // 统计密码数量
    const passwords = await db.select('SELECT COUNT(*) as count FROM passwords WHERE is_deleted = 0 OR is_deleted IS NULL')
    passwordStats.totalPasswords = passwords[0]?.count || 0

    // 统计历史记录
    const history = await db.select('SELECT COUNT(*) as count FROM password_history')
    passwordStats.historyCount = history[0]?.count || 0

    // 统计回收站
    const recycleBin = await db.select('SELECT COUNT(*) as count FROM password_recycle_bin')
    passwordStats.recycleBinCount = recycleBin[0]?.count || 0

    // 检查主密码
    const masterPassword = await db.select('SELECT COUNT(*) as count FROM master_password')
    passwordStats.hasMasterPassword = (masterPassword[0]?.count || 0) > 0
  } catch (e) { /* ignore */ }
}

/**
 * 修改主密码
 */
const changePassword = async () => {
  if (!oldPasswordInput.value) {
    ElMessage.warning('请输入旧密码')
    return
  }

  if (!newPasswordInput.value || newPasswordInput.value.length < 6) {
    ElMessage.warning('新密码长度至少为 6 位')
    return
  }

  if (newPasswordInput.value !== newPasswordConfirm.value) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }

  try {
    const db = await getDatabase()
    const result = await db.select('SELECT * FROM master_password LIMIT 1')

    if (!result || result.length === 0) {
      ElMessage.error('未找到主密码记录')
      return
    }

    // 验证旧密码
    const { password_hash, salt } = result[0]
    const isValid = verifyPassword(oldPasswordInput.value, password_hash, salt)

    if (!isValid) {
      ElMessage.error('旧密码错误')
      return
    }

    // 生成新密码哈希
    const newSalt = generateSalt()
    const newHash = hashPassword(newPasswordInput.value, newSalt)
    const now = new Date().toISOString()

    await db.execute(
      'UPDATE master_password SET password_hash = ?, salt = ?, updated_at = ? WHERE id = 1',
      [newHash, newSalt, now]
    )

    ElMessage.success('密码修改成功')
    showChangePasswordDialog.value = false
    oldPasswordInput.value = ''
    newPasswordInput.value = ''
    newPasswordConfirm.value = ''
  } catch (error) {

    ElMessage.error('修改密码失败')
  }
}

/**
 * 重置配置
 */
const handleReset = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重置所有设置为默认值吗？此操作不可恢复。',
      '确认重置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await resetConfig()
    await loadSettings()
    ElMessage.success('设置已重置')
  } catch (error) {
    if (error !== 'cancel') {

    }
  }
}

/**
 * 加载提醒设置
 */
/**
 * 加载提醒设置
 */
const loadReminderSettings = async () => {
  try {
    const config = localStorage.getItem('reminder_config')
    if (config) {
      const parsed = JSON.parse(config)
      Object.assign(reminderConfig, parsed)
    }
  } catch (e) { /* ignore */ }
}

/**
 * 保存提醒设置
 */
const saveReminderSettings = () => {
  try {
    saveReminderConfig(reminderConfig)
    ElMessage.success('通知设置已保存')
  } catch (error) {

    ElMessage.error('保存失败')
  }
}

/**
 * 测试通知
 */
const testNotification = async () => {
  try {
    const CustomNotification = await import('@/utils/tauri/customNotification')
    await CustomNotification.default.showCustomNotification({
      title: '📢 测试通知',
      message: '这是一条测试通知消息\n当前时间: ' + new Date().toLocaleString('zh-CN'),
      type: 'info',
      duration: 10000,
      position: reminderConfig.position,
      positionType: reminderConfig.positionType
    })
    ElMessage.success('测试通知已发送')
  } catch (error) {

    ElMessage.error('发送失败: ' + error.message)
  }
}

/**
 * 提交反馈
 */
const submitFeedback = async () => {
  if (!feedbackContent.value.trim()) {
    ElMessage.warning('请填写反馈内容')
    return
  }

  submittingFeedback.value = true
  try {
    const db = await Database.load('sqlite:app.db')

    // 确保反馈表存在
    await db.execute(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        contact TEXT,
        created_at TEXT NOT NULL
      )
    `)

    const now = new Date().toISOString()
    await db.execute(
      'INSERT INTO feedback (content, contact, created_at) VALUES (?, ?, ?)',
      [feedbackContent.value.trim(), feedbackContact.value.trim(), now]
    )

    ElMessage.success('感谢您的反馈！我们会认真处理')
    feedbackContent.value = ''
    feedbackContact.value = ''
  } catch (error) {

    ElMessage.error('提交失败: ' + error.message)
  } finally {
    submittingFeedback.value = false
  }
}

/**
 * 清空反馈表单
 */
const clearFeedback = () => {
  feedbackContent.value = ''
  feedbackContact.value = ''
}

/**
 * 处理悬浮球开关切换
 */
const handleFloatingBallToggle = async (enabled) => {
  try {
    // 先保存配置
    localStorage.setItem('aiAssistantSettings', JSON.stringify(aiAssistantSettings))

    // 发送全局事件通知应用更新悬浮球状态
    window.dispatchEvent(new CustomEvent('ai-floating-ball-toggle', {
      detail: {
        enabled,
        mode: aiAssistantSettings.floatingBallMode,
        style: aiAssistantSettings.floatingBallStyle,
        size: aiAssistantSettings.floatingBallSize
      }
    }))

    // 自动保存
    await handleSave()
  } catch (error) {

    ElMessage.error('操作失败')
  }
}

/**
 * 处理悬浮球配置变化（位置、样式、大小）
 */
const handleFloatingBallChange = async () => {
  try {
    // 先保存配置到 localStorage
    localStorage.setItem('aiAssistantSettings', JSON.stringify(aiAssistantSettings))

    // 发送全局事件通知应用更新悬浮球状态
    window.dispatchEvent(new CustomEvent('ai-floating-ball-toggle', {
      detail: {
        enabled: aiAssistantSettings.enableFloatingBall,
        mode: aiAssistantSettings.floatingBallMode,
        style: aiAssistantSettings.floatingBallStyle,
        size: aiAssistantSettings.floatingBallSize
      }
    }))

    // 自动保存到配置文件
    await handleSave()
  } catch (error) {

    ElMessage.error('操作失败')
  }
}

/**
 * 检查更新
 */
const checkUpdate = async () => {
  checkingUpdate.value = true
  updateInfo.value = ''

  try {
    // 模拟检查更新（实际应该调用 Tauri 更新 API）
    await new Promise(resolve => setTimeout(resolve, 1500))

    // 这里可以集成 Tauri 的更新功能
    // 目前显示当前已是最新版本
    updateInfo.value = '当前已是最新版本 v1.0.0'
    ElMessage.success('当前已是最新版本')
  } catch (error) {

    ElMessage.error('检查更新失败: ' + error.message)
  } finally {
    checkingUpdate.value = false
  }
}

// 组件挂载时加载配置
onMounted(async () => {
  await loadSettings() // loadSettings 内部已经调用了 loadStorageStats
  await loadPasswordSettings()
  await loadPasswordStats()
  await loadReminderSettings()
  // await loadStorageStats() // 已在 loadSettings 中调用，避免重复

  // 加载配置路径
  try {
    const dataDir = await appDataDir()
    configPath.value = await join(dataDir, 'config.json')
  } catch (e) { /* ignore */ }
})
</script>

<style scoped>
.settings-page-wrapper {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--font-family);
  color: var(--text-primary);
  background-color: var(--bg-grouped);
  height: 100%;
  width: 100%;
}

/* 顶部导航 */
.header {
  height: 50px;
  background-color: var(--bg-primary);
  border-bottom: 0.5px solid var(--border-color-strong);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-lg);
  flex-shrink: 0;
  z-index: 2;
  position: relative;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.breadcrumb {
  font-size: var(--font-size-body);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
  display: flex;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

/* 主容器 */
.main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* 左侧设置菜单 */
.sidebar-left {
  width: 200px;
  min-width: 200px;
  flex-shrink: 0;
  background-color: var(--bg-primary);
  border-right: 0.5px solid var(--border-color);
  display: flex;
  flex-direction: column;
  user-select: none;
  overflow: hidden;
  height: 100%;
  position: relative;
  z-index: 1;
  padding: var(--space-sm);
}

.sidebar-toolbar {
  padding: var(--space-sm) var(--space-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  font-size: var(--font-size-caption2);
  font-weight: var(--font-weight-semibold);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.menu-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-xs);
  margin: 0;
  min-height: 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 6px 10px;
  margin: 1px 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
  font-size: var(--font-size-footnote);
  color: var(--text-primary);
  position: relative;
}

.menu-item:hover {
  background-color: var(--bg-tertiary);
}

.menu-item.active {
  background-color: var(--accent-blue-bg);
  color: var(--accent-blue);
  font-weight: var(--font-weight-medium);
}

.menu-icon {
  font-size: 16px;
  flex-shrink: 0;
  color: var(--text-secondary);
}

.menu-item.active .menu-icon {
  color: var(--accent-blue);
}

.menu-name {
  flex: 1;
  font-size: var(--font-size-footnote);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 右侧内容区域 */
.content-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: var(--bg-grouped);
  padding: var(--space-xl);
}

/* 设置区块 */
.settings-section {
  max-width: 680px;
  margin: 0 auto;
}

.section-title {
  font-size: var(--font-size-title3);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-xl);
}

/* 设置分组卡片 */
.settings-section :deep(.el-card) {
  border-radius: var(--radius-lg);
  border: 0.5px solid var(--border-color);
  box-shadow: none;
}

.card-header {
  font-size: var(--font-size-callout);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

/* 表单行 */
.settings-section :deep(.el-form-item) {
  margin-bottom: var(--space-lg);
  border-bottom: 0.5px solid var(--divider);
  padding-bottom: var(--space-lg);
}

.settings-section :deep(.el-form-item:last-child) {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}
</style>
