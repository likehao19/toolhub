<template>
  <div class="toolbox-wrapper">
    <!-- 顶部工具栏 -->
    <div class="header">
      <div class="header-left">
        <div class="breadcrumb">
          <el-icon><Briefcase /></el-icon>
          工具箱
        </div>
      </div>
      <div class="header-actions">
        <el-button type="primary" size="small" @click="goToSettings">
          <el-icon><Setting /></el-icon>
          自定义工具箱
        </el-button>
      </div>
    </div>
    
    <div class="content-area">
        <!-- 笔记工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>📝 笔记工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in noteTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 开发工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>💻 开发工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in devTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 实用工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>🔧 实用工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in utilityTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 效率工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>🎯 效率工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in efficiencyTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 网络工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>🌐 网络工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in networkTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 编码转换 -->
        <div class="tool-category">
          <div class="category-header">
            <span>🔤 编码转换</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in encodingTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 文件处理 -->
        <div class="tool-category">
          <div class="category-header">
            <span>📁 文件处理</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in fileTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 图片工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>🖼️ 图片工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in imageTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- Git工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>🌳 Git工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in gitTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 数据库工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>🗄️ 数据库工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in databaseTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 前端工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>🎨 前端工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in frontendTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 后端工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>☕ 后端工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in backendTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 测试工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>🧪 测试工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in testTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 运维工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>🔧 运维工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in devopsTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 安全工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>🔐 安全工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in securityTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 文档工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>📚 文档工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in documentTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 学习工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>🎓 学习工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in learningTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 办公工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>💼 办公工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in officeTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 设计工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>🎨 设计工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in designTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 数据分析 -->
        <div class="tool-category">
          <div class="category-header">
            <span>📊 数据分析</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in dataAnalysisTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 音视频工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>🎬 音视频工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in mediaTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 系统工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>⚙️ 系统工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in systemTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 浏览器工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>🌐 浏览器工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in browserTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 代码质量 -->
        <div class="tool-category">
          <div class="category-header">
            <span>✨ 代码质量</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in codeQualityTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- API工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>🔌 API工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in apiTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 移动开发 -->
        <div class="tool-category">
          <div class="category-header">
            <span>📱 移动开发</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in mobileDevTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 性能优化 -->
        <div class="tool-category">
          <div class="category-header">
            <span>⚡ 性能优化</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in performanceTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 项目管理 -->
        <div class="tool-category">
          <div class="category-header">
            <span>📋 项目管理</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in projectManagementTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 协作通讯 -->
        <div class="tool-category">
          <div class="category-header">
            <span>💬 协作通讯</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in collaborationTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 云服务工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>☁️ 云服务工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in cloudTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 金融工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>💰 金融工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in financeTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 生活工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>🏠 生活工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in lifeTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 教育工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>📚 教育工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in educationTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- 游戏辅助 -->
        <div class="tool-category">
          <div class="category-header">
            <span>🎮 游戏辅助</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in gamingTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

        <!-- AI助手工具 -->
        <div class="tool-category">
          <div class="category-header">
            <span>🤖 AI助手工具</span>
          </div>
          <div class="tool-grid">
            <div 
              v-for="tool in aiAssistantTools" 
              :key="tool.id"
              class="tool-card"
              :class="{ disabled: !tool.enabled }"
              @click="openTool(tool)"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-name">{{ tool.name }}</div>
              <el-tag v-if="!tool.enabled" size="small" type="info" class="dev-tag">开发中</el-tag>
            </div>
          </div>
        </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Briefcase, Setting } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()

// 笔记工具
const noteTools = ref([
  { id: 'sticky-notes', name: '便签', icon: '📌', type: 'window', enabled: true },
  { id: 'whiteboard', name: '画板', icon: '✏️', type: 'window', enabled: false },
  { id: 'code-snippet', name: '代码片段', icon: '📋', type: 'window', enabled: false },
  { id: 'screenshot', name: '截图标注', icon: '📸', type: 'window', enabled: false },
  { id: 'markdown-editor', name: 'MD编辑器', icon: '📝', type: 'window', enabled: false },
  { id: 'mind-map', name: '思维导图', icon: '🧠', type: 'window', enabled: false },
  { id: 'flowchart', name: '流程图', icon: '📊', type: 'window', enabled: false },
  { id: 'rich-text', name: '富文本', icon: '📄', type: 'window', enabled: false }
])

// 开发工具
const devTools = ref([
  { id: 'json-formatter', name: 'JSON格式化', icon: '🔄', type: 'window', enabled: false },
  { id: 'json-diff', name: 'JSON对比', icon: '🔍', type: 'window', enabled: false },
  { id: 'json-to-ts', name: 'JSON转TS', icon: '📦', type: 'window', enabled: false },
  { id: 'json-to-java', name: 'JSON转Java', icon: '☕', type: 'window', enabled: false },
  { id: 'regex-tester', name: '正则测试', icon: '🎨', type: 'window', enabled: false },
  { id: 'cron-parser', name: 'Cron表达式', icon: '⏰', type: 'window', enabled: false },
  { id: 'crypto', name: '加密解密', icon: '🔐', type: 'window', enabled: false },
  { id: 'hash-generator', name: 'Hash生成', icon: '#️⃣', type: 'window', enabled: false },
  { id: 'url-encoder', name: 'URL编解码', icon: '🌐', type: 'window', enabled: false },
  { id: 'base64', name: 'Base64', icon: '🔤', type: 'window', enabled: false },
  { id: 'api-tester', name: '接口测试', icon: '📡', type: 'window', enabled: false },
  { id: 'sql-formatter', name: 'SQL格式化', icon: '🧪', type: 'window', enabled: false },
  { id: 'sql-generator', name: 'SQL生成器', icon: '⚡', type: 'window', enabled: false },
  { id: 'timestamp', name: '时间戳', icon: '🕐', type: 'window', enabled: false },
  { id: 'date-calculator', name: '日期计算', icon: '📅', type: 'window', enabled: false },
  { id: 'diff-checker', name: '文本对比', icon: '📊', type: 'window', enabled: false },
  { id: 'uuid-generator', name: 'UUID生成', icon: '🎲', type: 'window', enabled: false },
  { id: 'random-data', name: '随机数据', icon: '🎰', type: 'window', enabled: false },
  { id: 'jwt-decoder', name: 'JWT解析', icon: '🔓', type: 'window', enabled: false },
  { id: 'xml-formatter', name: 'XML格式化', icon: '📋', type: 'window', enabled: false },
  { id: 'yaml-formatter', name: 'YAML格式化', icon: '📝', type: 'window', enabled: false },
  { id: 'html-encoder', name: 'HTML编码', icon: '🌐', type: 'window', enabled: false },
  { id: 'ascii-converter', name: 'ASCII转换', icon: '🔡', type: 'window', enabled: false },
  { id: 'unicode-converter', name: 'Unicode转换', icon: '🔠', type: 'window', enabled: false }
])

// 编码转换
const encodingTools = ref([
  { id: 'charset-detect', name: '编码检测', icon: '🔍', type: 'window', enabled: false },
  { id: 'charset-convert', name: '编码转换', icon: '🔄', type: 'window', enabled: false },
  { id: 'hex-converter', name: '进制转换', icon: '🔢', type: 'window', enabled: false },
  { id: 'morse-code', name: '摩斯密码', icon: '📻', type: 'window', enabled: false },
  { id: 'binary-converter', name: '二进制', icon: '💾', type: 'window', enabled: false },
  { id: 'color-converter', name: '颜色转换', icon: '🎨', type: 'window', enabled: false }
])

// 文件处理
const fileTools = ref([
  { id: 'file-hash', name: '文件Hash', icon: '🔐', type: 'window', enabled: false },
  { id: 'file-merge', name: '文件合并', icon: '📎', type: 'window', enabled: false },
  { id: 'file-split', name: '文件分割', icon: '✂️', type: 'window', enabled: false },
  { id: 'file-rename', name: '批量改名', icon: '📝', type: 'window', enabled: false },
  { id: 'duplicate-finder', name: '重复文件', icon: '🔎', type: 'window', enabled: false },
  { id: 'file-compare', name: '文件对比', icon: '⚖️', type: 'window', enabled: false },
  { id: 'csv-parser', name: 'CSV处理', icon: '📊', type: 'window', enabled: false },
  { id: 'excel-viewer', name: 'Excel查看', icon: '📈', type: 'window', enabled: false },
  { id: 'pdf-tool', name: 'PDF工具', icon: '📕', type: 'window', enabled: false },
  { id: 'zip-tool', name: '压缩工具', icon: '📦', type: 'window', enabled: false }
])

// 图片工具
const imageTools = ref([
  { id: 'image-compress', name: '图片压缩', icon: '🗜️', type: 'window', enabled: false },
  { id: 'image-resize', name: '尺寸调整', icon: '📏', type: 'window', enabled: false },
  { id: 'image-crop', name: '图片裁剪', icon: '✂️', type: 'window', enabled: false },
  { id: 'image-format', name: '格式转换', icon: '🔄', type: 'window', enabled: false },
  { id: 'image-watermark', name: '添加水印', icon: '💧', type: 'window', enabled: false },
  { id: 'icon-generator', name: '图标生成', icon: '🎨', type: 'window', enabled: false },
  { id: 'sprite-sheet', name: '雪碧图', icon: '🖼️', type: 'window', enabled: false },
  { id: 'image-to-base64', name: '图片Base64', icon: '🔤', type: 'window', enabled: false }
])

// 实用工具
const utilityTools = ref([
  { id: 'calculator', name: '计算器', icon: '🧮', type: 'window', enabled: false },
  { id: 'scientific-calc', name: '科学计算', icon: '🔬', type: 'window', enabled: false },
  { id: 'programmer-calc', name: '程序员计算器', icon: '💻', type: 'window', enabled: false },
  { id: 'pomodoro', name: '番茄钟', icon: '⏱️', type: 'window', enabled: false },
  { id: 'stopwatch', name: '秒表', icon: '⏰', type: 'window', enabled: false },
  { id: 'countdown', name: '倒计时', icon: '⏳', type: 'window', enabled: false },
  { id: 'unit-converter', name: '单位转换', icon: '📐', type: 'window', enabled: false },
  { id: 'currency-converter', name: '汇率换算', icon: '💱', type: 'window', enabled: false },
  { id: 'color-picker', name: '取色器', icon: '🎨', type: 'window', enabled: false },
  { id: 'ruler', name: '像素尺', icon: '📏', type: 'window', enabled: false },
  { id: 'screen-recorder', name: '录屏', icon: '📹', type: 'window', enabled: false },
  { id: 'qrcode-generator', name: '二维码生成', icon: '📱', type: 'window', enabled: false },
  { id: 'qrcode-scanner', name: '二维码扫描', icon: '📲', type: 'window', enabled: false },
  { id: 'barcode-generator', name: '条形码', icon: '🏷️', type: 'window', enabled: false }
])

// Git工具
const gitTools = ref([
  { id: 'git-graph', name: 'Git图谱', icon: '🌳', type: 'window', enabled: false },
  { id: 'git-diff', name: 'Git对比', icon: '🔄', type: 'window', enabled: false },
  { id: 'git-ignore', name: 'Gitignore生成', icon: '🚫', type: 'window', enabled: false },
  { id: 'commit-msg', name: '提交信息', icon: '📝', type: 'window', enabled: false },
  { id: 'changelog', name: '更新日志', icon: '📋', type: 'window', enabled: false }
])

// 数据库工具
const databaseTools = ref([
  { id: 'sql-client', name: 'SQL客户端', icon: '🗄️', type: 'window', enabled: false },
  { id: 'redis-client', name: 'Redis客户端', icon: '🔴', type: 'window', enabled: false },
  { id: 'mongodb-client', name: 'MongoDB客户端', icon: '🍃', type: 'window', enabled: false },
  { id: 'db-compare', name: '数据库对比', icon: '⚖️', type: 'window', enabled: false },
  { id: 'er-diagram', name: 'ER图生成', icon: '📊', type: 'window', enabled: false },
  { id: 'data-generator', name: '测试数据', icon: '🎲', type: 'window', enabled: false }
])

// 效率工具
const efficiencyTools = ref([
  { id: 'kanban', name: '工作看板', icon: '📊', type: 'page', enabled: false },
  { id: 'time-tracker', name: '时间统计', icon: '📈', type: 'page', enabled: false },
  { id: 'habit-tracker', name: '习惯打卡', icon: '✅', type: 'page', enabled: false },
  { id: 'focus-mode', name: '专注模式', icon: '🎯', type: 'window', enabled: false },
  { id: 'break-reminder', name: '休息提醒', icon: '☕', type: 'window', enabled: false },
  { id: 'quick-launcher', name: '快速启动', icon: '🚀', type: 'window', enabled: false },
  { id: 'workflow-automation', name: '工作流自动化', icon: '⚙️', type: 'window', enabled: false },
  { id: 'template-manager', name: '模板管理', icon: '📋', type: 'window', enabled: false },
  { id: 'goal-tracker', name: '目标追踪', icon: '🎯', type: 'window', enabled: false },
  { id: 'project-timer', name: '项目计时', icon: '⏱️', type: 'window', enabled: false },
  { id: 'meeting-notes', name: '会议记录', icon: '📝', type: 'window', enabled: false },
  { id: 'daily-report', name: '日报周报', icon: '📊', type: 'window', enabled: false },
  { id: 'okr-manager', name: 'OKR管理', icon: '🎯', type: 'window', enabled: false },
  { id: 'sprint-planner', name: '敏捷冲刺', icon: '⚡', type: 'window', enabled: false },
  { id: 'retrospective', name: '复盘工具', icon: '🔄', type: 'window', enabled: false },
  { id: 'eisenhower-matrix', name: '四象限法', icon: '📐', type: 'window', enabled: false },
  { id: 'gtd-tool', name: 'GTD工具', icon: '✅', type: 'window', enabled: false },
  { id: 'brainstorm', name: '头脑风暴', icon: '💡', type: 'window', enabled: false }
])

// 网络工具
const networkTools = ref([
  { id: 'port-checker', name: '端口检测', icon: '🌍', type: 'window', enabled: false },
  { id: 'port-scanner', name: '端口扫描', icon: '🔍', type: 'window', enabled: false },
  { id: 'ip-lookup', name: 'IP查询', icon: '📡', type: 'window', enabled: false },
  { id: 'dns-lookup', name: 'DNS查询', icon: '🌐', type: 'window', enabled: false },
  { id: 'whois', name: 'Whois查询', icon: '🔎', type: 'window', enabled: false },
  { id: 'url-shortener', name: '短链生成', icon: '🔗', type: 'window', enabled: false },
  { id: 'ping-test', name: 'Ping测试', icon: '📶', type: 'window', enabled: false },
  { id: 'traceroute', name: '路由追踪', icon: '🛤️', type: 'window', enabled: false },
  { id: 'speed-test', name: '测速', icon: '⚡', type: 'window', enabled: false },
  { id: 'websocket-test', name: 'WebSocket测试', icon: '🔌', type: 'window', enabled: false },
  { id: 'http-headers', name: 'HTTP头查看', icon: '📋', type: 'window', enabled: false }
])

// 前端工具
const frontendTools = ref([
  { id: 'css-generator', name: 'CSS生成器', icon: '🎨', type: 'window', enabled: false },
  { id: 'gradient-generator', name: '渐变生成', icon: '🌈', type: 'window', enabled: false },
  { id: 'shadow-generator', name: '阴影生成', icon: '🌑', type: 'window', enabled: false },
  { id: 'flexbox-generator', name: 'Flexbox', icon: '📦', type: 'window', enabled: false },
  { id: 'grid-generator', name: 'Grid生成', icon: '🔲', type: 'window', enabled: false },
  { id: 'svg-editor', name: 'SVG编辑', icon: '🖼️', type: 'window', enabled: false },
  { id: 'html-formatter', name: 'HTML格式化', icon: '📄', type: 'window', enabled: false },
  { id: 'css-minify', name: 'CSS压缩', icon: '📦', type: 'window', enabled: false },
  { id: 'js-minify', name: 'JS压缩', icon: '📦', type: 'window', enabled: false },
  { id: 'html-escape', name: 'HTML转义', icon: '🔐', type: 'window', enabled: false }
])

// 后端工具
const backendTools = ref([
  { id: 'maven-helper', name: 'Maven助手', icon: '🔧', type: 'window', enabled: false },
  { id: 'gradle-helper', name: 'Gradle助手', icon: '🐘', type: 'window', enabled: false },
  { id: 'lombok-helper', name: 'Lombok代码', icon: '☕', type: 'window', enabled: false },
  { id: 'mybatis-generator', name: 'MyBatis生成', icon: '🗄️', type: 'window', enabled: false },
  { id: 'swagger-parser', name: 'Swagger解析', icon: '📖', type: 'window', enabled: false },
  { id: 'openapi-generator', name: 'OpenAPI生成', icon: '🎯', type: 'window', enabled: false },
  { id: 'pom-analyzer', name: 'POM分析', icon: '📋', type: 'window', enabled: false }
])

// 测试工具
const testTools = ref([
  { id: 'mock-data', name: 'Mock数据', icon: '🎭', type: 'window', enabled: false },
  { id: 'load-test', name: '压力测试', icon: '💪', type: 'window', enabled: false },
  { id: 'api-mock', name: 'API Mock', icon: '🎯', type: 'window', enabled: false },
  { id: 'test-case', name: '测试用例', icon: '✅', type: 'window', enabled: false }
])

// 运维工具
const devopsTools = ref([
  { id: 'log-viewer', name: '日志查看', icon: '📜', type: 'window', enabled: false },
  { id: 'log-parser', name: '日志分析', icon: '🔍', type: 'window', enabled: false },
  { id: 'docker-manager', name: 'Docker管理', icon: '🐋', type: 'window', enabled: false },
  { id: 'k8s-helper', name: 'K8s助手', icon: '☸️', type: 'window', enabled: false },
  { id: 'nginx-config', name: 'Nginx配置', icon: '🌐', type: 'window', enabled: false },
  { id: 'cron-monitor', name: '定时任务', icon: '⏰', type: 'window', enabled: false },
  { id: 'system-monitor', name: '系统监控', icon: '📊', type: 'window', enabled: false },
  { id: 'process-monitor', name: '进程监控', icon: '⚙️', type: 'window', enabled: false }
])

// 安全工具
const securityTools = ref([
  { id: 'password-generator', name: '密码生成', icon: '🔐', type: 'window', enabled: false },
  { id: 'password-strength', name: '密码强度', icon: '🔒', type: 'window', enabled: false },
  { id: 'rsa-tool', name: 'RSA工具', icon: '🔑', type: 'window', enabled: false },
  { id: 'aes-tool', name: 'AES工具', icon: '🔐', type: 'window', enabled: false },
  { id: 'certificate-viewer', name: '证书查看', icon: '📜', type: 'window', enabled: false }
])

// 文档工具
const documentTools = ref([
  { id: 'api-doc', name: 'API文档', icon: '📚', type: 'window', enabled: false },
  { id: 'markdown-toc', name: 'MD目录', icon: '📑', type: 'window', enabled: false },
  { id: 'readme-generator', name: 'README生成', icon: '📄', type: 'window', enabled: false },
  { id: 'changelog-generator', name: 'Changelog生成', icon: '📝', type: 'window', enabled: false }
])

// 学习工具
const learningTools = ref([
  { id: 'doc-search', name: '文档快搜', icon: '📖', type: 'window', enabled: false },
  { id: 'code-generator', name: '代码生成', icon: '💡', type: 'window', enabled: false },
  { id: 'flashcard', name: '知识卡片', icon: '🎓', type: 'window', enabled: false },
  { id: 'algorithm', name: '算法可视化', icon: '🧬', type: 'window', enabled: false },
  { id: 'sql-practice', name: 'SQL练习', icon: '🎯', type: 'window', enabled: false },
  { id: 'regex-practice', name: '正则练习', icon: '🎨', type: 'window', enabled: false },
  { id: 'typing-practice', name: '打字练习', icon: '⌨️', type: 'window', enabled: false }
])

// 办公工具
const officeTools = ref([
  { id: 'word-counter', name: '字数统计', icon: '🔢', type: 'window', enabled: false },
  { id: 'text-formatter', name: '文本格式化', icon: '📝', type: 'window', enabled: false },
  { id: 'case-converter', name: '大小写转换', icon: '🔤', type: 'window', enabled: false },
  { id: 'invoice-generator', name: '发票生成', icon: '🧾', type: 'window', enabled: false },
  { id: 'expense-tracker', name: '报销记录', icon: '💰', type: 'window', enabled: false },
  { id: 'contract-template', name: '合同模板', icon: '📄', type: 'window', enabled: false },
  { id: 'letter-generator', name: '信函生成', icon: '✉️', type: 'window', enabled: false },
  { id: 'presentation-timer', name: '演讲计时', icon: '⏱️', type: 'window', enabled: false },
  { id: 'signature-tool', name: '电子签名', icon: '✍️', type: 'window', enabled: false },
  { id: 'pdf-merger', name: 'PDF合并', icon: '📑', type: 'window', enabled: false }
])

// 设计工具
const designTools = ref([
  { id: 'mockup-tool', name: '原型设计', icon: '🎨', type: 'window', enabled: false },
  { id: 'wireframe', name: '线框图', icon: '📐', type: 'window', enabled: false },
  { id: 'color-palette', name: '配色方案', icon: '🎨', type: 'window', enabled: false },
  { id: 'font-tester', name: '字体测试', icon: '🔤', type: 'window', enabled: false },
  { id: 'icon-library', name: '图标库', icon: '🎯', type: 'window', enabled: false },
  { id: 'logo-maker', name: 'Logo制作', icon: '🎨', type: 'window', enabled: false },
  { id: 'gradient-library', name: '渐变库', icon: '🌈', type: 'window', enabled: false },
  { id: 'design-token', name: '设计令牌', icon: '🎨', type: 'window', enabled: false },
  { id: 'ui-patterns', name: 'UI模式库', icon: '📦', type: 'window', enabled: false },
  { id: 'responsive-preview', name: '响应式预览', icon: '📱', type: 'window', enabled: false }
])

// 数据分析
const dataAnalysisTools = ref([
  { id: 'chart-generator', name: '图表生成', icon: '📊', type: 'window', enabled: false },
  { id: 'data-visualization', name: '数据可视化', icon: '📈', type: 'window', enabled: false },
  { id: 'pivot-table', name: '数据透视表', icon: '🔄', type: 'window', enabled: false },
  { id: 'sql-analyzer', name: 'SQL分析', icon: '🔍', type: 'window', enabled: false },
  { id: 'log-analyzer', name: '日志分析', icon: '📜', type: 'window', enabled: false },
  { id: 'json-analyzer', name: 'JSON分析', icon: '📋', type: 'window', enabled: false },
  { id: 'csv-analyzer', name: 'CSV分析', icon: '📊', type: 'window', enabled: false },
  { id: 'statistics-tool', name: '统计工具', icon: '📐', type: 'window', enabled: false },
  { id: 'data-cleaner', name: '数据清洗', icon: '🧹', type: 'window', enabled: false },
  { id: 'data-export', name: '数据导出', icon: '📤', type: 'window', enabled: false }
])

// 音视频工具
const mediaTools = ref([
  { id: 'audio-converter', name: '音频转换', icon: '🎵', type: 'window', enabled: false },
  { id: 'video-converter', name: '视频转换', icon: '🎬', type: 'window', enabled: false },
  { id: 'audio-trim', name: '音频剪辑', icon: '✂️', type: 'window', enabled: false },
  { id: 'video-trim', name: '视频剪辑', icon: '🎞️', type: 'window', enabled: false },
  { id: 'gif-maker', name: 'GIF制作', icon: '🎬', type: 'window', enabled: false },
  { id: 'subtitle-tool', name: '字幕工具', icon: '📝', type: 'window', enabled: false },
  { id: 'audio-merger', name: '音频合并', icon: '🎵', type: 'window', enabled: false },
  { id: 'video-merger', name: '视频合并', icon: '🎬', type: 'window', enabled: false },
  { id: 'screen-capture', name: '录屏工具', icon: '📹', type: 'window', enabled: false },
  { id: 'audio-recorder', name: '录音工具', icon: '🎤', type: 'window', enabled: false }
])

// 系统工具
const systemTools = ref([
  { id: 'disk-cleaner', name: '磁盘清理', icon: '🧹', type: 'window', enabled: false },
  { id: 'disk-analyzer', name: '磁盘分析', icon: '💾', type: 'window', enabled: false },
  { id: 'registry-cleaner', name: '注册表清理', icon: '🔧', type: 'window', enabled: false },
  { id: 'startup-manager', name: '启动管理', icon: '🚀', type: 'window', enabled: false },
  { id: 'service-manager', name: '服务管理', icon: '⚙️', type: 'window', enabled: false },
  { id: 'env-variable', name: '环境变量', icon: '🔧', type: 'window', enabled: false },
  { id: 'hosts-editor', name: 'Hosts编辑', icon: '🌐', type: 'window', enabled: false },
  { id: 'task-scheduler', name: '任务计划', icon: '⏰', type: 'window', enabled: false },
  { id: 'clipboard-manager', name: '剪贴板管理', icon: '📋', type: 'window', enabled: false },
  { id: 'window-manager', name: '窗口管理', icon: '🪟', type: 'window', enabled: false }
])

// 浏览器工具
const browserTools = ref([
  { id: 'bookmark-manager', name: '书签管理', icon: '🔖', type: 'window', enabled: false },
  { id: 'cookie-manager', name: 'Cookie管理', icon: '🍪', type: 'window', enabled: false },
  { id: 'cache-cleaner', name: '缓存清理', icon: '🧹', type: 'window', enabled: false },
  { id: 'user-agent', name: 'UserAgent', icon: '🌐', type: 'window', enabled: false },
  { id: 'web-scraper', name: '网页抓取', icon: '🕷️', type: 'window', enabled: false },
  { id: 'seo-analyzer', name: 'SEO分析', icon: '📊', type: 'window', enabled: false },
  { id: 'page-speed', name: '页面测速', icon: '⚡', type: 'window', enabled: false },
  { id: 'lighthouse', name: 'Lighthouse', icon: '💡', type: 'window', enabled: false }
])

// 代码质量
const codeQualityTools = ref([
  { id: 'code-formatter', name: '代码格式化', icon: '✨', type: 'window', enabled: false },
  { id: 'code-lint', name: '代码检查', icon: '🔍', type: 'window', enabled: false },
  { id: 'code-review', name: '代码审查', icon: '👀', type: 'window', enabled: false },
  { id: 'complexity-analyzer', name: '复杂度分析', icon: '📊', type: 'window', enabled: false },
  { id: 'duplicate-detector', name: '重复代码', icon: '🔎', type: 'window', enabled: false },
  { id: 'dependency-checker', name: '依赖检查', icon: '📦', type: 'window', enabled: false },
  { id: 'security-scanner', name: '安全扫描', icon: '🔐', type: 'window', enabled: false },
  { id: 'test-coverage', name: '测试覆盖率', icon: '📈', type: 'window', enabled: false },
  { id: 'code-metrics', name: '代码指标', icon: '📊', type: 'window', enabled: false }
])

// API工具
const apiTools = ref([
  { id: 'api-docs', name: 'API文档', icon: '📚', type: 'window', enabled: false },
  { id: 'api-client', name: 'API客户端', icon: '🔌', type: 'window', enabled: false },
  { id: 'graphql-client', name: 'GraphQL客户端', icon: '📡', type: 'window', enabled: false },
  { id: 'rest-client', name: 'REST客户端', icon: '🌐', type: 'window', enabled: false },
  { id: 'soap-client', name: 'SOAP客户端', icon: '🧼', type: 'window', enabled: false },
  { id: 'webhook-tester', name: 'Webhook测试', icon: '🔗', type: 'window', enabled: false },
  { id: 'api-monitor', name: 'API监控', icon: '📊', type: 'window', enabled: false },
  { id: 'api-versioning', name: 'API版本', icon: '🔢', type: 'window', enabled: false }
])

// 移动开发
const mobileDevTools = ref([
  { id: 'app-icon-generator', name: '应用图标', icon: '📱', type: 'window', enabled: false },
  { id: 'splash-generator', name: '启动图', icon: '🎨', type: 'window', enabled: false },
  { id: 'device-preview', name: '设备预览', icon: '📱', type: 'window', enabled: false },
  { id: 'android-tools', name: 'Android工具', icon: '🤖', type: 'window', enabled: false },
  { id: 'ios-tools', name: 'iOS工具', icon: '🍎', type: 'window', enabled: false },
  { id: 'react-native-helper', name: 'RN助手', icon: '⚛️', type: 'window', enabled: false },
  { id: 'flutter-helper', name: 'Flutter助手', icon: '🦋', type: 'window', enabled: false }
])

// 性能优化
const performanceTools = ref([
  { id: 'bundle-analyzer', name: '打包分析', icon: '📦', type: 'window', enabled: false },
  { id: 'memory-profiler', name: '内存分析', icon: '💾', type: 'window', enabled: false },
  { id: 'cpu-profiler', name: 'CPU分析', icon: '⚡', type: 'window', enabled: false },
  { id: 'network-profiler', name: '网络分析', icon: '🌐', type: 'window', enabled: false },
  { id: 'lighthouse-audit', name: '性能审计', icon: '💡', type: 'window', enabled: false },
  { id: 'image-optimizer', name: '图片优化', icon: '🖼️', type: 'window', enabled: false },
  { id: 'code-splitter', name: '代码分割', icon: '✂️', type: 'window', enabled: false },
  { id: 'lazy-loading', name: '懒加载配置', icon: '⏳', type: 'window', enabled: false }
])

// 项目管理
const projectManagementTools = ref([
  { id: 'project-init', name: '项目初始化', icon: '🚀', type: 'window', enabled: false },
  { id: 'scaffolding', name: '脚手架', icon: '🏗️', type: 'window', enabled: false },
  { id: 'dependency-manager', name: '依赖管理', icon: '📦', type: 'window', enabled: false },
  { id: 'changelog-manager', name: '变更日志', icon: '📝', type: 'window', enabled: false },
  { id: 'release-notes', name: '发布说明', icon: '📋', type: 'window', enabled: false },
  { id: 'milestone-tracker', name: '里程碑', icon: '🏁', type: 'window', enabled: false },
  { id: 'gantt-chart', name: '甘特图', icon: '📊', type: 'window', enabled: false },
  { id: 'resource-planner', name: '资源规划', icon: '📅', type: 'window', enabled: false }
])

// 协作通讯
const collaborationTools = ref([
  { id: 'team-chat', name: '团队聊天', icon: '💬', type: 'window', enabled: false },
  { id: 'video-meeting', name: '视频会议', icon: '📹', type: 'window', enabled: false },
  { id: 'screen-share', name: '屏幕共享', icon: '🖥️', type: 'window', enabled: false },
  { id: 'whiteboard-collab', name: '协作白板', icon: '🎨', type: 'window', enabled: false },
  { id: 'code-review-tool', name: '代码评审', icon: '👥', type: 'window', enabled: false },
  { id: 'pair-programming', name: '结对编程', icon: '👥', type: 'window', enabled: false },
  { id: 'knowledge-base', name: '知识库', icon: '📚', type: 'window', enabled: false }
])

// 云服务工具
const cloudTools = ref([
  { id: 'aws-helper', name: 'AWS助手', icon: '☁️', type: 'window', enabled: false },
  { id: 'azure-helper', name: 'Azure助手', icon: '☁️', type: 'window', enabled: false },
  { id: 'gcp-helper', name: 'GCP助手', icon: '☁️', type: 'window', enabled: false },
  { id: 'aliyun-helper', name: '阿里云助手', icon: '☁️', type: 'window', enabled: false },
  { id: 'tencent-cloud', name: '腾讯云助手', icon: '☁️', type: 'window', enabled: false },
  { id: 's3-manager', name: 'S3管理', icon: '📦', type: 'window', enabled: false },
  { id: 'oss-manager', name: 'OSS管理', icon: '📦', type: 'window', enabled: false },
  { id: 'serverless-helper', name: 'Serverless', icon: '⚡', type: 'window', enabled: false }
])

// 金融工具
const financeTools = ref([
  { id: 'tax-calculator', name: '税费计算', icon: '💰', type: 'window', enabled: false },
  { id: 'salary-calculator', name: '薪资计算', icon: '💵', type: 'window', enabled: false },
  { id: 'loan-calculator', name: '贷款计算', icon: '🏦', type: 'window', enabled: false },
  { id: 'investment-calculator', name: '投资计算', icon: '📈', type: 'window', enabled: false },
  { id: 'budget-planner', name: '预算规划', icon: '💼', type: 'window', enabled: false },
  { id: 'expense-analyzer', name: '支出分析', icon: '📊', type: 'window', enabled: false },
  { id: 'invoice-maker', name: '发票制作', icon: '🧾', type: 'window', enabled: false }
])

// 生活工具
const lifeTools = ref([
  { id: 'calendar-planner', name: '日历规划', icon: '📅', type: 'window', enabled: false },
  { id: 'reminder-tool', name: '提醒事项', icon: '⏰', type: 'window', enabled: false },
  { id: 'shopping-list', name: '购物清单', icon: '🛒', type: 'window', enabled: false },
  { id: 'recipe-manager', name: '食谱管理', icon: '🍳', type: 'window', enabled: false },
  { id: 'workout-planner', name: '健身计划', icon: '💪', type: 'window', enabled: false },
  { id: 'water-reminder', name: '喝水提醒', icon: '💧', type: 'window', enabled: false },
  { id: 'sleep-tracker', name: '睡眠追踪', icon: '😴', type: 'window', enabled: false },
  { id: 'mood-tracker', name: '心情记录', icon: '😊', type: 'window', enabled: false }
])

// 教育工具
const educationTools = ref([
  { id: 'quiz-maker', name: '测验制作', icon: '📝', type: 'window', enabled: false },
  { id: 'exam-timer', name: '考试计时', icon: '⏱️', type: 'window', enabled: false },
  { id: 'grade-calculator', name: '成绩计算', icon: '📊', type: 'window', enabled: false },
  { id: 'study-planner', name: '学习计划', icon: '📚', type: 'window', enabled: false },
  { id: 'vocabulary-trainer', name: '单词训练', icon: '📖', type: 'window', enabled: false },
  { id: 'flashcard-maker', name: '记忆卡片', icon: '🎴', type: 'window', enabled: false },
  { id: 'citation-generator', name: '引用生成', icon: '📄', type: 'window', enabled: false }
])

// 游戏辅助
const gamingTools = ref([
  { id: 'fps-counter', name: 'FPS显示', icon: '🎮', type: 'window', enabled: false },
  { id: 'game-overlay', name: '游戏覆盖', icon: '🎯', type: 'window', enabled: false },
  { id: 'macro-recorder', name: '宏录制', icon: '🎬', type: 'window', enabled: false },
  { id: 'controller-mapper', name: '手柄映射', icon: '🎮', type: 'window', enabled: false }
])

// AI助手工具
const aiAssistantTools = ref([
  { id: 'code-completion', name: '代码补全', icon: '🤖', type: 'window', enabled: false },
  { id: 'code-explanation', name: '代码解释', icon: '💡', type: 'window', enabled: false },
  { id: 'bug-finder', name: 'Bug查找', icon: '🐛', type: 'window', enabled: false },
  { id: 'refactor-suggestion', name: '重构建议', icon: '🔄', type: 'window', enabled: false },
  { id: 'test-generator', name: '测试生成', icon: '🧪', type: 'window', enabled: false },
  { id: 'doc-generator', name: '文档生成', icon: '📚', type: 'window', enabled: false },
  { id: 'comment-generator', name: '注释生成', icon: '💬', type: 'window', enabled: false },
  { id: 'sql-generator', name: 'SQL生成', icon: '🗄️', type: 'window', enabled: false },
  { id: 'regex-generator', name: '正则生成', icon: '🎨', type: 'window', enabled: false }
])

// 打开工具
const openTool = async (tool) => {
  if (!tool.enabled) {
    ElMessage.info(`${tool.name} 正在开发中，敬请期待...`)
    return
  }

  // 已启用的工具
  if (tool.id === 'sticky-notes') {
    // 打开便签窗口
    try {
      const { getAllWebviewWindows } = await import('@tauri-apps/api/webviewWindow')
      const allWindows = await getAllWebviewWindows()
      const stickyWindow = allWindows.find(w => w.label === 'sticky-notes')
      
      if (stickyWindow) {
        await stickyWindow.show()
        await stickyWindow.setFocus()
      }
      emit('close')
    } catch (error) {
      // ignore
    }
  }
  
  // TODO: 其他工具的打开逻辑
}

// 去设置页面
const goToSettings = () => {
  router.push('/settings?tab=toolbox')
}
</script>

<style scoped>
.toolbox-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: #f7f9fb;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background-color: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  height: 50px;
  box-sizing: border-box;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.breadcrumb .el-icon {
  font-size: 18px;
  color: #ff9800;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  scrollbar-gutter: stable;
}

/* 美化滚动条 */
.content-area::-webkit-scrollbar {
  width: 6px;
}

.content-area::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

.content-area::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.content-area::-webkit-scrollbar-thumb:hover {
  background: #c0c4cc;
}

.tool-category {
  margin-bottom: 24px;
}

.tool-category:last-child {
  margin-bottom: 0;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 0 10px 0;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  user-select: none;
  margin-bottom: 12px;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(95px, 1fr));
  gap: 12px;
}

.tool-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 8px;
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.tool-card:hover {
  border-color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.tool-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-card.disabled:hover {
  border-color: #e8eaed;
  transform: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.tool-icon {
  font-size: 28px;
  margin-bottom: 6px;
  transition: transform 0.2s;
}

.tool-card:hover .tool-icon {
  transform: scale(1.1);
}

.tool-name {
  font-size: 12px;
  color: #606266;
  text-align: center;
  font-weight: 500;
  line-height: 1.3;
  transition: color 0.2s;
}

.tool-card:hover .tool-name {
  color: #409eff;
}

.tool-card.disabled .tool-name {
  color: #909399;
}

.dev-tag {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 9px;
  padding: 1px 4px;
  height: 16px;
  line-height: 14px;
  border-radius: 2px;
}
</style>
