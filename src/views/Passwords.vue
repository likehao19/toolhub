<template>
  <div class="passwords-page-wrapper">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <!-- 折叠/展开侧边栏按钮 -->
        <el-button size="small" circle @click="hideSidebar = !hideSidebar" :title="hideSidebar ? '显示侧边栏' : '隐藏侧边栏'">
          <el-icon><ArrowLeft v-if="!hideSidebar" /><ArrowRight v-else /></el-icon>
        </el-button>
        <div class="breadcrumb">密码管理 / {{ currentCategoryName }}</div>
      </div>
      <div class="header-actions">
        <!-- 搜索框 -->
        <el-input
          v-model="searchKeyword"
          placeholder="搜索密码..."
          clearable
          style="width: 250px;"
          size="small"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <!-- 操作按钮组 -->
        <el-button size="small" circle @click="openRecycleBin" title="回收站">
          <el-icon><Delete /></el-icon>
        </el-button>
        <el-button size="small" circle @click="performSecurityAudit" title="安全审计">
          <el-icon style="color: #67C23A;"><Trophy /></el-icon>
        </el-button>
        <el-button size="small" circle @click="openImportDialog" title="导入密码">
          <el-icon><Upload /></el-icon>
        </el-button>
        <el-button size="small" circle @click="showExportMenu = !showExportMenu" title="导出密码">
          <el-icon><Download /></el-icon>
        </el-button>
        <el-button size="small" circle @click="lockApp" title="锁定" v-if="!isLocked">
          <el-icon><Lock /></el-icon>
        </el-button>
        <el-button size="small" type="primary" circle @click="showCreateDialog" title="添加密码">
          <el-icon><Plus /></el-icon>
        </el-button>
      </div>
    </header>

    <div class="main-container">
      <!-- 左侧分类栏 -->
      <aside class="sidebar-left" v-show="!hideSidebar">
        <div class="sidebar-toolbar">
          <span class="sidebar-title">分类</span>
          <div class="actions">
            <span class="sidebar-btn" title="新建分类" @click="showAddCategoryDialog">
              <i class="fa-solid fa-plus"></i>
            </span>
          </div>
        </div>
        
        <div class="category-list">
          <!-- 全部密码 -->
          <div 
            class="category-item" 
            :class="{ active: selectedCategory === null }"
            @click="selectCategory(null)"
          >
            <el-icon class="category-icon"><Folder /></el-icon>
            <span class="category-name">全部密码</span>
            <span class="category-count">{{ passwords.length }}</span>
          </div>
          
          <!-- 常用密码（收藏） -->
          <div 
            class="category-item category-favorite" 
            :class="{ active: selectedCategory === 'favorite' }"
            @click="selectCategory('favorite')"
          >
            <el-icon class="category-icon favorite-icon"><StarFilled /></el-icon>
            <span class="category-name">常用</span>
            <span class="category-count">{{ getFavoriteCount() }}</span>
          </div>
          
          <!-- 自定义分类 -->
          <div 
            v-for="category in categories" 
            :key="category.id"
            class="category-item"
            :class="{ active: selectedCategory === category.id }"
            @click="selectCategory(category.id)"
          >
            <el-icon class="category-icon" :style="{ color: getIconColor(category.icon) }">
              <component :is="getCategoryIcon(category.icon)" />
            </el-icon>
            <span class="category-name">{{ category.name }}</span>
            <span class="category-count">{{ getCategoryCount(category.id) }}</span>
            <div class="category-actions" v-if="!category.is_default">
              <i class="fa-solid fa-pen action-icon" @click.stop="editCategory(category)" title="编辑"></i>
              <i class="fa-solid fa-trash action-icon del" @click.stop="deleteCategory(category)" title="删除"></i>
            </div>
          </div>
        </div>
      </aside>

      <!-- 中间内容区域 -->
      <main class="content-area">

        <!-- 密码列表 -->
        <div class="password-list" v-loading="loading">
          <el-empty v-if="filteredPasswords.length === 0" description="暂无密码" />
          
          <div v-else class="password-cards">
            <div 
              v-for="password in filteredPasswords" 
              :key="password.id"
              class="password-card"
            >
              <!-- 第一行：标题和操作按钮 -->
              <div class="card-row card-header-row">
                <!-- 左侧：图标和标题 -->
                <div class="card-title-section">
                  <el-icon class="card-icon" :style="{ color: getIconColor(password.category_icon) }">
                    <component :is="getCategoryIcon(password.category_icon)" />
                  </el-icon>
                  <h3 class="card-title">{{ password.title }}</h3>
                  <!-- 收藏星标 -->
                  <el-icon 
                    class="favorite-star" 
                    :class="{ 'is-favorite': password.is_favorite }"
                    @click.stop="toggleFavorite(password)"
                    title="标记为常用"
                  >
                    <StarFilled v-if="password.is_favorite" />
                    <Star v-else />
                  </el-icon>
                  <!-- 密码强度指示器 -->
                  <div class="strength-badge" :class="getStrengthClass(password.password_strength)">
                    {{ getStrengthText(password.password_strength) }}
                  </div>
                </div>
                
                <!-- 右侧：操作按钮 -->
                <div class="card-actions">
                  <el-button 
                    text 
                    size="small"
                    @click="copyToClipboard(password.username, '用户名')"
                    title="复制用户名"
                    :disabled="!password.username"
                  >
                    <el-icon><User /></el-icon>
                  </el-button>
                  <el-button 
                    text 
                    size="small"
                    @click="copyToClipboard(decryptPassword(password.password), '密码')"
                    title="复制密码"
                  >
                    <el-icon><DocumentCopy /></el-icon>
                  </el-button>
                  <el-button 
                    text 
                    size="small"
                    @click="editPassword(password)"
                    title="编辑"
                  >
                    <el-icon><Edit /></el-icon>
                  </el-button>
                  <el-button 
                    text 
                    size="small"
                    @click="viewPasswordHistory(password)"
                    title="历史记录"
                  >
                    <el-icon><Document /></el-icon>
                  </el-button>
                  <el-button 
                    text 
                    size="small"
                    type="danger"
                    @click="deletePassword(password)"
                    title="删除"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
              
              <!-- 第二行：详细信息 -->
              <div class="card-row card-info-row">
                <!-- 用户名 -->
                <div class="info-item" v-if="password.username">
                  <span class="info-label">用户名：</span>
                  <span class="info-value">{{ password.username }}</span>
                </div>
                
                  <!-- 网站 -->
                  <div class="info-item" v-if="password.website">
                    <span class="info-label">网站：</span>
                    <span 
                      class="info-link"
                      @click.stop="openWebsite(password.website)"
                    >
                      {{ password.website }}
                    </span>
                  </div>
                
                <!-- 更新时间 -->
                <div class="info-item">
                  <span class="info-label">更新：</span>
                  <span class="info-value info-time">{{ formatTime(password.updated_at) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- 创建/编辑密码对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingPassword ? '编辑密码' : '添加密码'"
      width="500px"
    >
      <el-form :model="passwordForm" label-width="80px">
        <el-form-item label="分类" required>
          <el-select v-model="passwordForm.category_id" placeholder="请选择分类" style="width: 100%">
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            >
              <el-icon style="margin-right: 8px;">
                <component :is="getCategoryIcon(category.icon)" />
              </el-icon>
              {{ category.name }}
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="标题" required>
          <el-input v-model="passwordForm.title" placeholder="例如：GitHub" />
        </el-form-item>
        
        <el-form-item label="用户名">
          <el-input v-model="passwordForm.username" placeholder="用户名或邮箱" />
        </el-form-item>
        
        <el-form-item label="密码" required>
          <el-input
            v-model="passwordForm.password"
            type="password"
            show-password
            placeholder="输入密码"
            @input="updatePasswordStrength"
          >
            <template #append>
              <el-button @click="showPasswordGenerator = true">生成</el-button>
            </template>
          </el-input>
          <div v-if="passwordForm.password" class="password-strength">
            <div class="strength-indicator">
              <div 
                class="strength-bar"
                :class="passwordStrength.level"
                :style="{ width: (passwordStrength.score / 8 * 100) + '%' }"
              ></div>
            </div>
            <div class="strength-info">
              <span class="strength-text" :class="passwordStrength.level">
                强度: {{ passwordStrength.levelText }}
              </span>
            </div>
          </div>
        </el-form-item>
        
        <el-form-item label="网站">
          <el-input v-model="passwordForm.website" placeholder="https://example.com" />
        </el-form-item>
        
        <el-form-item label="备注">
          <el-input
            v-model="passwordForm.notes"
            type="textarea"
            :rows="3"
            placeholder="备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="savePassword">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加/编辑分类对话框 -->
    <el-dialog
      v-model="categoryDialogVisible"
      :title="editingCategory ? '编辑分类' : '添加分类'"
      width="400px"
    >
      <el-form :model="categoryForm" label-width="80px">
        <el-form-item label="分类名称" required>
          <el-input v-model="categoryForm.name" placeholder="请输入分类名称" />
        </el-form-item>
        
        <el-form-item label="图标">
          <el-select v-model="categoryForm.icon" placeholder="选择图标">
            <el-option value="Monitor" label="网站">
              <el-icon style="color: #409EFF;"><Monitor /></el-icon> 网站
            </el-option>
            <el-option value="Download" label="软件">
              <el-icon style="color: #67C23A;"><Download /></el-icon> 软件
            </el-option>
            <el-option value="CreditCard" label="银行卡">
              <el-icon style="color: #F56C6C;"><CreditCard /></el-icon> 银行卡
            </el-option>
            <el-option value="Key" label="密钥">
              <el-icon style="color: #E6A23C;"><Key /></el-icon> 密钥
            </el-option>
            <el-option value="Folder" label="文件夹">
              <el-icon style="color: #909399;"><Folder /></el-icon> 文件夹
            </el-option>
            <el-option value="ShoppingCart" label="购物">
              <el-icon style="color: #FF6B9D;"><ShoppingCart /></el-icon> 购物
            </el-option>
            <el-option value="House" label="房屋">
              <el-icon style="color: #8E44AD;"><House /></el-icon> 房屋
            </el-option>
            <el-option value="Phone" label="电话">
              <el-icon style="color: #3498DB;"><Phone /></el-icon> 电话
            </el-option>
            <el-option value="Camera" label="相机">
              <el-icon style="color: #E74C3C;"><Camera /></el-icon> 相机
            </el-option>
            <el-option value="Printer" label="打印机">
              <el-icon style="color: #95A5A6;"><Printer /></el-icon> 打印机
            </el-option>
            <el-option value="VideoCamera" label="视频">
              <el-icon style="color: #E67E22;"><VideoCamera /></el-icon> 视频
            </el-option>
            <el-option value="Headset" label="耳机">
              <el-icon style="color: #9B59B6;"><Headset /></el-icon> 耳机
            </el-option>
            <el-option value="Briefcase" label="公文包">
              <el-icon style="color: #34495E;"><Briefcase /></el-icon> 公文包
            </el-option>
            <el-option value="Guide" label="指南">
              <el-icon style="color: #16A085;"><Guide /></el-icon> 指南
            </el-option>
            <el-option value="Present" label="礼物">
              <el-icon style="color: #F39C12;"><Present /></el-icon> 礼物
            </el-option>
            <el-option value="Trophy" label="奖杯">
              <el-icon style="color: #F1C40F;"><Trophy /></el-icon> 奖杯
            </el-option>
            <el-option value="MessageBox" label="消息">
              <el-icon style="color: #1ABC9C;"><MessageBox /></el-icon> 消息
            </el-option>
            <el-option value="Bell" label="铃铛">
              <el-icon style="color: #E91E63;"><Bell /></el-icon> 铃铛
            </el-option>
            <el-option value="User" label="用户">
              <el-icon style="color: #2C3E50;"><User /></el-icon> 用户
            </el-option>
            <el-option value="Lock" label="锁">
              <el-icon style="color: #C0392B;"><Lock /></el-icon> 锁
            </el-option>
            <el-option value="ChromeFilled" label="Chrome">
              <el-icon style="color: #4285F4;"><ChromeFilled /></el-icon> Chrome
            </el-option>
            <el-option value="ShoppingBag" label="购物袋">
              <el-icon style="color: #FF9800;"><ShoppingBag /></el-icon> 购物袋
            </el-option>
            <el-option value="GoodsFilled" label="商品">
              <el-icon style="color: #FF5722;"><GoodsFilled /></el-icon> 商品
            </el-option>
            <el-option value="LocationFilled" label="位置">
              <el-icon style="color: #F44336;"><LocationFilled /></el-icon> 位置
            </el-option>
            <el-option value="CollectionTag" label="标签">
              <el-icon style="color: #673AB7;"><CollectionTag /></el-icon> 标签
            </el-option>
            <el-option value="Picture" label="图片">
              <el-icon style="color: #00BCD4;"><Picture /></el-icon> 图片
            </el-option>
            <el-option value="Tickets" label="票务">
              <el-icon style="color: #009688;"><Tickets /></el-icon> 票务
            </el-option>
            <el-option value="Files" label="文件">
              <el-icon style="color: #607D8B;"><Files /></el-icon> 文件
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCategory">保存</el-button>
      </template>
    </el-dialog>

    <!-- 查看密码对话框 -->
    <el-dialog
      v-model="viewDialogVisible"
      title="密码详情"
      width="500px"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item label="分类">{{ getCategoryName(viewingPassword?.category_id) }}</el-descriptions-item>
        <el-descriptions-item label="标题">{{ viewingPassword?.title }}</el-descriptions-item>
        <el-descriptions-item label="用户名">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>{{ viewingPassword?.username || '未设置' }}</span>
            <el-button 
              v-if="viewingPassword?.username" 
              text 
              @click="copyToClipboard(viewingPassword.username, '用户名')"
            >
              <el-icon><DocumentCopy /></el-icon>
            </el-button>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="密码">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span v-if="showPassword">{{ decryptPassword(viewingPassword?.password || '') }}</span>
            <span v-else>••••••••</span>
            <el-button text @click="showPassword = !showPassword">
              {{ showPassword ? '隐藏' : '显示' }}
            </el-button>
            <el-button text @click="copyToClipboard(decryptPassword(viewingPassword?.password || ''), '密码')">
              <el-icon><DocumentCopy /></el-icon>
            </el-button>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="网站">
          <span 
            v-if="viewingPassword?.website" 
            class="website-link"
            @click="openWebsite(viewingPassword.website)"
          >
            {{ viewingPassword.website }}
          </span>
          <span v-else>未设置</span>
        </el-descriptions-item>
        <el-descriptions-item label="备注">{{ viewingPassword?.notes || '无' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatTime(viewingPassword?.created_at) }}
        </el-descriptions-item>
        <el-descriptions-item label="更新时间">
          {{ formatTime(viewingPassword?.updated_at) }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="viewDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="editPassword(viewingPassword)">编辑</el-button>
      </template>
    </el-dialog>

    <!-- 查看密码对话框 -->
    <el-dialog
      v-model="viewDialogVisible"
      title="密码详情"
      width="500px"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item label="分类">{{ getCategoryName(viewingPassword?.category_id) }}</el-descriptions-item>
        <el-descriptions-item label="标题">{{ viewingPassword?.title }}</el-descriptions-item>
        <el-descriptions-item label="用户名">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>{{ viewingPassword?.username || '未设置' }}</span>
            <el-button 
              v-if="viewingPassword?.username" 
              text 
              @click="copyToClipboard(viewingPassword.username, '用户名')"
            >
              <el-icon><DocumentCopy /></el-icon>
            </el-button>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="密码">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span v-if="showPassword">{{ decryptPassword(viewingPassword?.password || '') }}</span>
            <span v-else>••••••••</span>
            <el-button text @click="showPassword = !showPassword">
              {{ showPassword ? '隐藏' : '显示' }}
            </el-button>
            <el-button text @click="copyToClipboard(decryptPassword(viewingPassword?.password || ''), '密码')">
              <el-icon><DocumentCopy /></el-icon>
            </el-button>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="网站">
          <span 
            v-if="viewingPassword?.website" 
            class="website-link"
            @click="openWebsite(viewingPassword.website)"
          >
            {{ viewingPassword.website }}
          </span>
          <span v-else>未设置</span>
        </el-descriptions-item>
        <el-descriptions-item label="备注">{{ viewingPassword?.notes || '无' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatTime(viewingPassword?.created_at) }}
        </el-descriptions-item>
        <el-descriptions-item label="更新时间">
          {{ formatTime(viewingPassword?.updated_at) }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="viewDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="editPassword(viewingPassword)">编辑</el-button>
      </template>
    </el-dialog>

    <!-- 密码生成器对话框 -->
    <el-dialog
      v-model="showPasswordGenerator"
      title="生成密码"
      width="500px"
    >
      <el-form :model="generatorOptions" label-width="120px">
        <el-form-item label="密码长度">
          <el-slider v-model="generatorOptions.length" :min="8" :max="32" show-input />
        </el-form-item>
        <el-form-item label="包含大写字母">
          <el-switch v-model="generatorOptions.includeUppercase" />
        </el-form-item>
        <el-form-item label="包含小写字母">
          <el-switch v-model="generatorOptions.includeLowercase" />
        </el-form-item>
        <el-form-item label="包含数字">
          <el-switch v-model="generatorOptions.includeNumbers" />
        </el-form-item>
        <el-form-item label="包含特殊字符">
          <el-switch v-model="generatorOptions.includeSymbols" />
        </el-form-item>
        <el-form-item label="排除相似字符">
          <el-switch v-model="generatorOptions.excludeSimilar" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPasswordGenerator = false">取消</el-button>
        <el-button type="primary" @click="generatePassword">生成并应用</el-button>
      </template>
    </el-dialog>

    <!-- 导入密码对话框 -->
    <el-dialog
      v-model="showImportDialog"
      title="导入密码"
      width="600px"
    >
      <div v-if="!importFile">
        <el-alert
          title="支持的格式"
          type="info"
          :closable="false"
          style="margin-bottom: 16px;"
        >
          <ul style="margin: 8px 0 0 20px; padding: 0;">
            <li>Google Chrome 密码导出文件（CSV）</li>
            <li>Microsoft Edge 密码导出文件（CSV）</li>
            <li>1Password 导出文件（CSV）</li>
            <li>LastPass 导出文件（CSV）</li>
            <li>通用 CSV 格式（包含标题、用户名、密码、网站等字段）</li>
            <li>JSON 格式（普通或加密）</li>
          </ul>
        </el-alert>
        <el-button type="primary" @click="handleFileSelect" style="width: 100%;">
          <el-icon><Upload /></el-icon>
          选择文件
        </el-button>
      </div>
      
      <div v-else>
        <el-alert
          :title="`已选择文件：${importFile.name}`"
          type="success"
          :closable="false"
          style="margin-bottom: 16px;"
        />
        
        <el-button @click="handleFileSelect" style="margin-bottom: 16px;">
          重新选择
        </el-button>
        
        <div v-if="importResult">
          <el-divider />
          <div class="import-result">
            <div class="result-stat">
              <div class="stat-item">
                <span class="stat-label">总计：</span>
                <span class="stat-value">{{ importResult.total }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">有效：</span>
                <span class="stat-value success">{{ importResult.valid }}</span>
              </div>
              <div class="stat-item" v-if="importResult.errors.length > 0">
                <span class="stat-label">错误：</span>
                <span class="stat-value error">{{ importResult.errors.length }}</span>
              </div>
              <div class="stat-item" v-if="importResult.warnings.length > 0">
                <span class="stat-label">警告：</span>
                <span class="stat-value warning">{{ importResult.warnings.length }}</span>
              </div>
            </div>
            
            <el-collapse v-if="importResult.errors.length > 0 || importResult.warnings.length > 0" style="margin-top: 16px;">
              <el-collapse-item v-if="importResult.errors.length > 0" title="错误列表" name="errors">
                <div v-for="(error, index) in importResult.errors" :key="index" class="error-item">
                  {{ error }}
                </div>
              </el-collapse-item>
              <el-collapse-item v-if="importResult.warnings.length > 0" title="警告列表" name="warnings">
                <div v-for="(warning, index) in importResult.warnings" :key="index" class="warning-item">
                  {{ warning }}
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="executeImport"
          :disabled="!importResult || importResult.valid === 0"
        >
          导入（{{ importResult?.valid || 0 }} 条）
        </el-button>
      </template>
    </el-dialog>

    <!-- 导出菜单（下拉） -->
    <el-dialog v-model="showExportMenu" title="导出密码" width="400px">
      <el-button @click="exportPasswordsToCSV" style="width: 100%; margin-bottom: 12px;">
        <el-icon><Document /></el-icon>
        导出为 CSV
      </el-button>
      <el-button @click="exportPasswordsToJSON" style="width: 100%;">
        <el-icon><Lock /></el-icon>
        导出为 JSON（加密）
      </el-button>
    </el-dialog>

    <!-- 锁定遮罩层 -->
    <div v-if="isLocked" class="lock-overlay">
      <div class="lock-content">
        <el-icon class="lock-icon" style="font-size: 80px; color: #409EFF;">
          <Lock />
        </el-icon>
        <h2>密码管理器已锁定</h2>
        <p style="margin-bottom: 24px;">请输入主密码解锁</p>
        
        <el-form style="width: 300px; margin: 0 auto;">
          <el-form-item>
            <el-input
              v-model="masterPasswordInput"
              type="password"
              placeholder="请输入主密码"
              show-password
              size="large"
              @keyup.enter="verifyMasterPassword"
              autofocus
            />
          </el-form-item>
          <el-form-item>
            <el-button 
              type="primary" 
              size="large"
              style="width: 100%;"
              @click="verifyMasterPassword"
            >
              解锁
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 设置主密码对话框 -->
    <el-dialog 
      v-model="setMasterPasswordDialog" 
      title="设置主密码" 
      width="450px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <el-alert
        title="首次使用需要设置主密码"
        type="info"
        :closable="false"
        style="margin-bottom: 20px;"
      >
        <p>主密码用于保护您的密码库，请务必记住！</p>
        <p style="color: #E6A23C; margin-top: 8px;">⚠️ 忘记主密码将无法恢复数据</p>
      </el-alert>
      
      <el-form label-width="100px">
        <el-form-item label="主密码">
          <el-input
            v-model="masterPasswordInput"
            type="password"
            placeholder="至少6位"
            show-password
            @keyup.enter="setMasterPassword"
          />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input
            v-model="masterPasswordConfirm"
            type="password"
            placeholder="再次输入主密码"
            show-password
            @keyup.enter="setMasterPassword"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button type="primary" @click="setMasterPassword">设置并解锁</el-button>
      </template>
    </el-dialog>

    <!-- 密码历史记录对话框 -->
    <el-dialog v-model="historyDialog" title="密码历史记录" width="700px">
      <div v-if="passwordHistory.length === 0">
        <el-empty description="暂无历史记录" />
      </div>
      <div v-else>
        <el-timeline>
          <el-timeline-item 
            v-for="(history, index) in passwordHistory" 
            :key="history.id"
            :timestamp="formatTime(history.changed_at)"
            placement="top"
          >
            <el-card>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                  <h4>{{ history.title }}</h4>
                  <p style="margin: 4px 0; color: #909399; font-size: 13px;">
                    用户名: {{ history.username || '未设置' }}
                  </p>
                  <p style="margin: 4px 0; color: #909399; font-size: 13px;">
                    密码强度: <span :class="getStrengthClass(history.password_strength)">{{ getStrengthText(history.password_strength) }}</span>
                  </p>
                </div>
                <el-button 
                  type="primary" 
                  size="small"
                  @click="restoreFromHistory(history)"
                >
                  恢复此版本
                </el-button>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-dialog>

    <!-- 回收站对话框 -->
    <el-dialog v-model="showRecycleBin" title="回收站" width="900px">
      <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #909399; font-size: 14px;">
          共 {{ recycleBinPasswords.length }} 项
        </span>
        <el-button 
          type="danger" 
          size="small"
          @click="emptyRecycleBin"
          :disabled="recycleBinPasswords.length === 0"
        >
          清空回收站
        </el-button>
      </div>
      
      <el-empty v-if="recycleBinPasswords.length === 0" description="回收站为空" />
      
      <el-table v-else :data="recycleBinPasswords" stripe style="width: 100%">
        <el-table-column prop="title" label="标题" width="180" />
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column label="网站" width="200">
          <template #default="{ row }">
            <span>{{ row.website || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="deleted_at" label="删除时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.deleted_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button 
              text 
              type="primary"
              size="small"
              @click="restoreFromRecycleBin(row)"
            >
              恢复
            </el-button>
            <el-button 
              text 
              type="danger"
              size="small"
              @click="permanentlyDelete(row)"
            >
              彻底删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 安全审计对话框 -->
    <el-dialog v-model="securityAuditDialog" title="密码安全审计" width="800px">
      <div v-if="auditResult" class="audit-container">
        <!-- 安全评分 -->
        <div class="audit-score">
          <div class="score-circle" :class="'score-' + auditResult.scoreLevel">
            <div class="score-number">{{ auditResult.score }}</div>
            <div class="score-label">安全评分</div>
          </div>
          <div class="score-info">
            <h3>{{ auditResult.scoreLevel === 'good' ? '✅ 安全性良好' : auditResult.scoreLevel === 'medium' ? '⚠️ 安全性中等' : '❌ 安全性较差' }}</h3>
            <p style="color: #909399; margin-top: 8px;">共检查 {{ auditResult.totalPasswords }} 个密码</p>
          </div>
        </div>

        <!-- 建议列表 -->
        <el-divider />
        <h4>改进建议</h4>
        <el-alert
          v-for="(suggestion, index) in auditResult.suggestions"
          :key="index"
          :title="suggestion"
          type="warning"
          :closable="false"
          style="margin-bottom: 12px;"
        />

        <!-- 详细问题列表 -->
        <el-divider />
        <el-tabs>
          <el-tab-pane :label="`重复密码 (${auditResult.duplicatePasswords.length})`">
            <div v-if="auditResult.duplicatePasswords.length === 0">
              <el-empty description="未发现重复密码" />
            </div>
            <el-card v-else v-for="(dup, index) in auditResult.duplicatePasswords" :key="index" style="margin-bottom: 12px;">
              <p style="margin-bottom: 8px; color: #F56C6C;">
                <strong>{{ dup.count }} 个账号</strong> 使用相同密码
              </p>
              <ul style="margin: 0; padding-left: 20px;">
                <li v-for="item in dup.items" :key="item.id" style="margin-bottom: 4px;">
                  {{ item.title }}
                </li>
              </ul>
            </el-card>
          </el-tab-pane>
          
          <el-tab-pane :label="`弱密码 (${auditResult.weakPasswords.length})`">
            <div v-if="auditResult.weakPasswords.length === 0">
              <el-empty description="未发现弱密码" />
            </div>
            <el-table v-else :data="auditResult.weakPasswords" stripe>
              <el-table-column prop="title" label="标题" />
              <el-table-column label="密码强度">
                <template #default="{ row }">
                  <span :class="getStrengthClass(row.password_strength)">
                    {{ getStrengthText(row.password_strength) }}
                  </span>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          
          <el-tab-pane :label="`相似密码 (${auditResult.similarPasswords.length})`">
            <div v-if="auditResult.similarPasswords.length === 0">
              <el-empty description="未发现相似密码" />
            </div>
            <el-card v-else v-for="(sim, index) in auditResult.similarPasswords" :key="index" style="margin-bottom: 12px;">
              <p style="margin-bottom: 8px; color: #E6A23C;">
                相似度: <strong>{{ sim.similarity }}%</strong>
              </p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>{{ sim.password1.title }}</li>
                <li>{{ sim.password2.title }}</li>
              </ul>
            </el-card>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { 
  Plus, Search, Edit, Delete, DocumentCopy, Upload, Download, 
  View, Folder, Star, Monitor, Key, CreditCard, ArrowLeft, 
  ArrowRight, Document, Lock, User, StarFilled, ShoppingCart,
  House, Phone, Camera, Printer, VideoCamera, Headset,
  Briefcase, Guide, Present, Trophy, MessageBox, Bell,
  FolderOpened, Files, Tickets, Picture, ChromeFilled,
  ShoppingBag, GoodsFilled, LocationFilled, CollectionTag
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import Database from '@tauri-apps/plugin-sql'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { encryptPassword, decryptPassword } from '@/utils/encryption'
import { analyzePasswordStrength, generatePassword as generateRandomPassword } from '@/utils/passwordStrength'
import { importPasswordFile, validatePasswords, exportToEncryptedJSON } from '@/utils/passwordImport'
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { TauriShell } from '@/utils/tauri'
import { hashPassword, verifyPassword, generateSalt, generateSessionKey } from '@/utils/masterPassword'

const DB_PATH = 'sqlite:productivity.db'
let dbInstance = null

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_PATH)
    await initDatabase()
  }
  return dbInstance
}

// 初始化数据库
async function initDatabase() {
  try {
    // 创建分类表
    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS password_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        icon TEXT DEFAULT 'Folder',
        is_default INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    
    // 创建密码历史记录表
    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS password_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        password_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        username TEXT,
        password TEXT NOT NULL,
        website TEXT,
        notes TEXT,
        password_strength INTEGER DEFAULT 0,
        changed_at TEXT NOT NULL,
        FOREIGN KEY (password_id) REFERENCES passwords(id) ON DELETE CASCADE
      )
    `)
    
    // 创建回收站表
    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS password_recycle_bin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_id INTEGER NOT NULL,
        category_id INTEGER,
        title TEXT NOT NULL,
        username TEXT,
        password TEXT NOT NULL,
        website TEXT,
        notes TEXT,
        password_strength INTEGER DEFAULT 0,
        is_favorite INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT NOT NULL
      )
    `)
    
    // 创建主密码表
    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS master_password (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        require_password_on_start INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    
    // 添加 category_id 列到 passwords 表（如果不存在）
    try {
      await dbInstance.execute(`
        ALTER TABLE passwords ADD COLUMN category_id INTEGER DEFAULT 1
      `)
    } catch (e) {
      // 列已存在，忽略错误
    }
    
    // 添加 is_favorite 列到 passwords 表（如果不存在）
    try {
      await dbInstance.execute(`
        ALTER TABLE passwords ADD COLUMN is_favorite INTEGER DEFAULT 0
      `)
    } catch (e) {
      // 列已存在，忽略错误
    }
    
    // 添加 is_deleted 列到 passwords 表（如果不存在，用于标记软删除）
    try {
      await dbInstance.execute(`
        ALTER TABLE passwords ADD COLUMN is_deleted INTEGER DEFAULT 0
      `)
    } catch (e) {
      // 列已存在，忽略错误
    }
    
    // 添加 require_password_on_start 列到 master_password 表（如果不存在）
    try {
      await dbInstance.execute(`
        ALTER TABLE master_password ADD COLUMN require_password_on_start INTEGER DEFAULT 1
      `)
    } catch (e) {
      // 列已存在，忽略错误
    }
    
    // 检查是否已有默认分类
    const existingCategories = await dbInstance.select('SELECT * FROM password_categories WHERE is_default = 1')
    
    if (existingCategories.length === 0) {
      // 插入默认分类（不包括"常用"，常用由收藏功能实现）
      const now = new Date().toISOString()
      await dbInstance.execute(`
        INSERT INTO password_categories (name, icon, is_default, created_at, updated_at) 
        VALUES 
          ('网站', 'Monitor', 1, '${now}', '${now}'),
          ('软件', 'Download', 1, '${now}', '${now}')
      `)
    }
    
    // 迁移：删除可能存在的旧"常用"分类
    try {
      const oldFavoriteCategory = await dbInstance.select(
        'SELECT * FROM password_categories WHERE name = ?',
        ['常用']
      )
      
      if (oldFavoriteCategory && oldFavoriteCategory.length > 0) {
        const categoryId = oldFavoriteCategory[0].id
        
        // 将该分类下的密码移动到"网站"分类
        const websiteCategory = await dbInstance.select(
          'SELECT * FROM password_categories WHERE name = ?',
          ['网站']
        )
        
        if (websiteCategory && websiteCategory.length > 0) {
          await dbInstance.execute(
            'UPDATE passwords SET category_id = ? WHERE category_id = ?',
            [websiteCategory[0].id, categoryId]
          )
        }
        
        // 删除旧的"常用"分类
        await dbInstance.execute(
          'DELETE FROM password_categories WHERE id = ?',
          [categoryId]
        )
      }
    } catch (e) { /* ignore */ }
  } catch (e) { /* ignore */ }
}

const passwords = ref([])
const categories = ref([])
const searchKeyword = ref('')
const selectedCategory = ref('favorite') // 默认选择常用分类
const hideSidebar = ref(false)
const dialogVisible = ref(false)
const categoryDialogVisible = ref(false)
const viewDialogVisible = ref(false)
const editingPassword = ref(null)
const editingCategory = ref(null)
const viewingPassword = ref(null)

// 主密码保护相关
const isLocked = ref(true) // 默认锁定
const hasMasterPassword = ref(false) // 是否已设置主密码
const masterPasswordDialog = ref(false) // 主密码对话框
const setMasterPasswordDialog = ref(false) // 设置主密码对话框
const masterPasswordInput = ref('') // 主密码输入
const masterPasswordConfirm = ref('') // 确认主密码
const sessionKey = ref(null) // 会话密钥
const autoLockTimer = ref(null) // 自动锁定定时器
const requirePasswordOnStart = ref(true) // 是否每次启动都需要密码
const sessionUnlocked = ref(false) // 本次会话是否已解锁

// 密码历史记录相关
const historyDialog = ref(false) // 历史记录对话框
const passwordHistory = ref([]) // 密码历史列表
const viewingHistoryPassword = ref(null) // 正在查看历史的密码

// 回收站相关
const showRecycleBin = ref(false) // 显示回收站对话框
const recycleBinPasswords = ref([]) // 回收站列表

// 安全审计相关
const securityAuditDialog = ref(false) // 安全审计对话框
const auditResult = ref(null) // 审计结果
const showPassword = ref(false)
const showPasswordGenerator = ref(false)
const showImportDialog = ref(false)
const showExportMenu = ref(false)
const importFile = ref(null)
const importResult = ref(null)
const loading = ref(false)

const passwordForm = ref({
  category_id: null,
  title: '',
  username: '',
  password: '',
  website: '',
  notes: ''
})

const categoryForm = ref({
  name: '',
  icon: 'Folder'
})

const passwordStrength = ref({
  strength: 0,
  score: 0,
  level: 'weak',
  levelText: '弱',
  suggestions: []
})

const generatorOptions = ref({
  length: 16,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
  excludeSimilar: true
})

// 计算属性：当前分类名称
const currentCategoryName = computed(() => {
  if (selectedCategory.value === null) {
    return '全部密码'
  }
  if (selectedCategory.value === 'favorite') {
    return '常用'
  }
  const category = categories.value.find(c => c.id === selectedCategory.value)
  return category ? category.name : '未知分类'
})

// 计算属性：过滤后的密码列表
const filteredPasswords = computed(() => {
  let result = passwords.value
  
  // 按常用（收藏）过滤
  if (selectedCategory.value === 'favorite') {
    result = result.filter(p => p.is_favorite === 1)
  }
  // 按分类过滤
  else if (selectedCategory.value !== null) {
    result = result.filter(p => p.category_id === selectedCategory.value)
  }
  
  // 按搜索关键词过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(p =>
      p.title?.toLowerCase().includes(keyword) ||
      p.username?.toLowerCase().includes(keyword) ||
      p.website?.toLowerCase().includes(keyword)
    )
  }
  
  return result
})

// 加载分类列表
const loadCategories = async () => {
  try {
    const db = await getDatabase()
    const result = await db.select('SELECT * FROM password_categories ORDER BY is_default DESC, created_at ASC')
    categories.value = result || []
  } catch (error) {
    ElMessage.error('加载分类失败')
  }
}

// 加载密码列表
const loadPasswords = async () => {
  try {
    loading.value = true
    const db = await getDatabase()
    const result = await db.select(`
      SELECT p.*, c.icon as category_icon 
      FROM passwords p 
      LEFT JOIN password_categories c ON p.category_id = c.id 
      ORDER BY p.updated_at DESC
    `)
    passwords.value = result || []
  } catch (error) {
    ElMessage.error('加载密码失败')
  } finally {
    loading.value = false
  }
}

// 选择分类
const selectCategory = (categoryId) => {
  selectedCategory.value = categoryId
}

// 获取分类图标
const getCategoryIcon = (iconName) => {
  const iconMap = {
    'Star': Star,
    'Monitor': Monitor,
    'Download': Download,
    'CreditCard': CreditCard,
    'Key': Key,
    'Folder': Folder,
    'ShoppingCart': ShoppingCart,
    'House': House,
    'Phone': Phone,
    'Camera': Camera,
    'Printer': Printer,
    'VideoCamera': VideoCamera,
    'Headset': Headset,
    'Briefcase': Briefcase,
    'Guide': Guide,
    'Present': Present,
    'Trophy': Trophy,
    'MessageBox': MessageBox,
    'Bell': Bell,
    'User': User,
    'Lock': Lock,
    'ChromeFilled': ChromeFilled,
    'ShoppingBag': ShoppingBag,
    'GoodsFilled': GoodsFilled,
    'LocationFilled': LocationFilled,
    'CollectionTag': CollectionTag,
    'Picture': Picture,
    'Tickets': Tickets,
    'Files': Files
  }
  return iconMap[iconName] || Folder
}

// 获取图标颜色
const getIconColor = (iconName) => {
  const colorMap = {
    'Monitor': '#409EFF',
    'Download': '#67C23A',
    'CreditCard': '#F56C6C',
    'Key': '#E6A23C',
    'Folder': '#909399',
    'ShoppingCart': '#FF6B9D',
    'House': '#8E44AD',
    'Phone': '#3498DB',
    'Camera': '#E74C3C',
    'Printer': '#95A5A6',
    'VideoCamera': '#E67E22',
    'Headset': '#9B59B6',
    'Briefcase': '#34495E',
    'Guide': '#16A085',
    'Present': '#F39C12',
    'Trophy': '#F1C40F',
    'MessageBox': '#1ABC9C',
    'Bell': '#E91E63',
    'User': '#2C3E50',
    'Lock': '#C0392B',
    'ChromeFilled': '#4285F4',
    'ShoppingBag': '#FF9800',
    'GoodsFilled': '#FF5722',
    'LocationFilled': '#F44336',
    'CollectionTag': '#673AB7',
    'Picture': '#00BCD4',
    'Tickets': '#009688',
    'Files': '#607D8B'
  }
  return colorMap[iconName] || '#909399'
}

// 获取分类中的密码数量
const getCategoryCount = (categoryId) => {
  return passwords.value.filter(p => p.category_id === categoryId).length
}

// 获取常用（收藏）密码数量
const getFavoriteCount = () => {
  return passwords.value.filter(p => p.is_favorite === 1).length
}

// 切换收藏状态
const toggleFavorite = async (password) => {
  try {
    const db = await getDatabase()
    const newFavoriteStatus = password.is_favorite === 1 ? 0 : 1
    
    await db.execute(
      'UPDATE passwords SET is_favorite = ? WHERE id = ?',
      [newFavoriteStatus, password.id]
    )
    
    password.is_favorite = newFavoriteStatus
    ElMessage.success(newFavoriteStatus === 1 ? '已添加到常用' : '已从常用移除')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

// 获取分类名称
const getCategoryName = (categoryId) => {
  const category = categories.value.find(c => c.id === categoryId)
  return category ? category.name : '未分类'
}

// 显示创建对话框
const showCreateDialog = () => {
  editingPassword.value = null
  passwordForm.value = {
    category_id: selectedCategory.value || (categories.value[0]?.id || null),
    title: '',
    username: '',
    password: '',
    website: '',
    notes: ''
  }
  passwordStrength.value = {
    strength: 0,
    score: 0,
    level: 'weak',
    levelText: '弱',
    suggestions: []
  }
  dialogVisible.value = true
}

// 编辑密码
const editPassword = (password) => {
  editingPassword.value = password
  const decryptedPassword = decryptPassword(password.password)
  passwordForm.value = {
    category_id: password.category_id || null,
    title: password.title || '',
    username: password.username || '',
    password: decryptedPassword,
    website: password.website || '',
    notes: password.notes || ''
  }
  updatePasswordStrength()
  viewDialogVisible.value = false
  dialogVisible.value = true
}

// 保存密码
const savePassword = async () => {
  if (!passwordForm.value.title || !passwordForm.value.password) {
    ElMessage.warning('请填写标题和密码')
    return
  }
  
  if (!passwordForm.value.category_id) {
    ElMessage.warning('请选择分类')
    return
  }

  try {
    const db = await getDatabase()
    const now = new Date().toISOString()
    const encryptedPassword = encryptPassword(passwordForm.value.password)
    const strength = analyzePasswordStrength(passwordForm.value.password)
    
    if (editingPassword.value) {
      // 更新前先保存旧版本到历史记录
      const oldPassword = await db.select('SELECT * FROM passwords WHERE id = ?', [editingPassword.value.id])
      if (oldPassword && oldPassword.length > 0) {
        await saveToHistory(editingPassword.value.id, oldPassword[0])
      }
      
      await db.execute(
        'UPDATE passwords SET category_id = ?, title = ?, username = ?, password = ?, website = ?, notes = ?, password_strength = ?, updated_at = ? WHERE id = ?',
        [
          passwordForm.value.category_id,
          passwordForm.value.title,
          passwordForm.value.username,
          encryptedPassword,
          passwordForm.value.website,
          passwordForm.value.notes,
          strength.strength,
          now,
          editingPassword.value.id
        ]
      )
      ElMessage.success('密码更新成功')
    } else {
      await db.execute(
        'INSERT INTO passwords (category_id, title, username, password, website, notes, password_strength, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          passwordForm.value.category_id,
          passwordForm.value.title,
          passwordForm.value.username,
          encryptedPassword,
          passwordForm.value.website,
          passwordForm.value.notes,
          strength.strength,
          now,
          now
        ]
      )
      ElMessage.success('密码添加成功')
    }

    dialogVisible.value = false
    await loadPasswords()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

// 删除密码
const deletePassword = async (password) => {
  // 现在使用软删除（移到回收站）
  await softDeletePassword(password)
}

// 查看密码
const viewPassword = (password) => {
  viewingPassword.value = password
  showPassword.value = false
  viewDialogVisible.value = true
}

// 复制到剪贴板
const copyToClipboard = async (text, label) => {
  try {
    await writeText(text)
    ElMessage.success(`${label}已复制到剪贴板`)
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 更新密码强度
const updatePasswordStrength = () => {
  passwordStrength.value = analyzePasswordStrength(passwordForm.value.password)
}

// 生成密码
const generatePassword = () => {
  try {
    const password = generateRandomPassword(generatorOptions.value)
    passwordForm.value.password = password
    updatePasswordStrength()
    showPasswordGenerator.value = false
    ElMessage.success('密码已生成')
  } catch (error) {
    ElMessage.error(error.message || '生成密码失败')
  }
}

// 显示添加分类对话框
const showAddCategoryDialog = () => {
  editingCategory.value = null
  categoryForm.value = {
    name: '',
    icon: 'Folder'
  }
  categoryDialogVisible.value = true
}

// 编辑分类
const editCategory = (category) => {
  editingCategory.value = category
  categoryForm.value = {
    name: category.name,
    icon: category.icon
  }
  categoryDialogVisible.value = true
}

// 保存分类
const saveCategory = async () => {
  if (!categoryForm.value.name) {
    ElMessage.warning('请输入分类名称')
    return
  }

  try {
    const db = await getDatabase()
    const now = new Date().toISOString()
    
    if (editingCategory.value) {
      await db.execute(
        'UPDATE password_categories SET name = ?, icon = ?, updated_at = ? WHERE id = ?',
        [categoryForm.value.name, categoryForm.value.icon, now, editingCategory.value.id]
      )
      ElMessage.success('分类更新成功')
    } else {
      await db.execute(
        'INSERT INTO password_categories (name, icon, is_default, created_at, updated_at) VALUES (?, ?, 0, ?, ?)',
        [categoryForm.value.name, categoryForm.value.icon, now, now]
      )
      ElMessage.success('分类添加成功')
    }

    categoryDialogVisible.value = false
    await loadCategories()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

// 删除分类
const deleteCategory = async (category) => {
  try {
    const count = getCategoryCount(category.id)
    if (count > 0) {
      await ElMessageBox.confirm(
        `该分类下还有 ${count} 条密码，删除分类后这些密码将移到第一个分类。确定要删除吗？`, 
        '确认删除', 
        { type: 'warning' }
      )
    } else {
      await ElMessageBox.confirm('确定要删除这个分类吗？', '确认删除', { type: 'warning' })
    }

    const db = await getDatabase()
    
    if (count > 0) {
      const firstCategory = categories.value.find(c => c.id !== category.id)
      if (firstCategory) {
        await db.execute(
          'UPDATE passwords SET category_id = ? WHERE category_id = ?',
          [firstCategory.id, category.id]
        )
      }
    }
    
    await db.execute('DELETE FROM password_categories WHERE id = ?', [category.id])
    ElMessage.success('删除成功')
    await loadCategories()
    await loadPasswords()
    
    if (selectedCategory.value === category.id) {
      selectedCategory.value = null
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 显示导入对话框
const openImportDialog = () => {
  importFile.value = null
  importResult.value = null
  showImportDialog.value = true
}

// 处理文件选择
const handleFileSelect = async () => {
  try {
    const selected = await openDialog({
      filters: [{
        name: 'CSV 文件',
        extensions: ['csv']
      }]
    })
    
    if (selected) {
      const content = await readTextFile(selected)
      importFile.value = {
        path: selected,
        name: selected.split(/[/\\]/).pop(),
        content
      }
      
      await parseImportFile()
    }
  } catch (error) {
    if (error !== 'cancelled' && error !== 'null') {
      ElMessage.error('选择文件失败')
    }
  }
}

// 解析导入文件
const parseImportFile = async () => {
  if (!importFile.value) return
  
  try {
    const result = await importPasswordFile(importFile.value)
    const validation = validatePasswords(result.passwords)
    
    importResult.value = {
      total: result.total,
      valid: validation.valid.length,
      errors: validation.errors,
      warnings: validation.warnings,
      passwords: validation.valid
    }
  } catch (error) {
    ElMessage.error(error.message || '解析文件失败')
  }
}

// 执行导入
const executeImport = async () => {
  if (!importResult.value || importResult.value.valid === 0) {
    ElMessage.warning('没有有效的密码可导入')
    return
  }
  
  try {
    const db = await getDatabase()
    const now = new Date().toISOString()
    let successCount = 0
    let failCount = 0
    
    // 查找"网站"分类 - 从Chrome/浏览器导入的密码默认归类为"网站"
    let websiteCategoryId = categories.value.find(c => c.name === '网站')?.id
    
    // 如果没有"网站"分类，使用第一个分类
    if (!websiteCategoryId) {
      websiteCategoryId = categories.value[0]?.id || 1
    }
    
    for (const pwd of importResult.value.passwords) {
      try {
        const strength = analyzePasswordStrength(pwd.password)
        const encryptedPassword = encryptPassword(pwd.password)
        
        // 如果导入的密码有网站链接，分配到"网站"分类
        // 否则分配到第一个分类
        const categoryId = pwd.website ? websiteCategoryId : (categories.value[0]?.id || 1)
        
        await db.execute(
          'INSERT INTO passwords (category_id, title, username, password, website, notes, password_strength, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            categoryId,
            pwd.title || '导入的密码',
            pwd.username || '',
            encryptedPassword,
            pwd.website || '',
            pwd.notes || '',
            strength.strength,
            now,
            now
          ]
        )
        successCount++
      } catch (error) {
        failCount++
      }
    }
    
    ElMessage.success(`导入完成：成功 ${successCount} 条，失败 ${failCount} 条，已自动分类到"网站"`)
    showImportDialog.value = false
    await loadPasswords()
  } catch (error) {
    ElMessage.error('导入失败')
  }
}

// 导出密码为 CSV
const exportPasswordsToCSV = async () => {
  try {
    if (passwords.value.length === 0) {
      ElMessage.warning('没有密码可导出')
      return
    }
    
    const headers = ['标题', '用户名', '密码', '网站', '备注', '创建时间', '更新时间']
    const rows = [headers.join(',')]
    
    for (const pwd of passwords.value) {
      const decryptedPassword = decryptPassword(pwd.password)
      const row = [
        `"${pwd.title || ''}"`,
        `"${pwd.username || ''}"`,
        `"${decryptedPassword}"`,
        `"${pwd.website || ''}"`,
        `"${pwd.notes || ''}"`,
        `"${pwd.created_at || ''}"`,
        `"${pwd.updated_at || ''}"`
      ]
      rows.push(row.join(','))
    }
    
    const csvContent = rows.join('\n')
    
    const filePath = await saveDialog({
      defaultPath: `passwords_${new Date().toISOString().split('T')[0]}.csv`,
      filters: [{
        name: 'CSV 文件',
        extensions: ['csv']
      }]
    })
    
    if (filePath) {
      await writeTextFile(filePath, csvContent)
      ElMessage.success('导出成功')
      showExportMenu.value = false
    }
  } catch (error) {
    if (error !== 'cancelled') {
      ElMessage.error('导出失败')
    }
  }
}

// 导出密码为加密 JSON
const exportPasswordsToJSON = async () => {
  try {
    if (passwords.value.length === 0) {
      ElMessage.warning('没有密码可导出')
      return
    }
    
    const exportData = passwords.value.map(pwd => ({
      title: pwd.title || '',
      username: pwd.username || '',
      password: decryptPassword(pwd.password),
      website: pwd.website || '',
      notes: pwd.notes || '',
      created_at: pwd.created_at || '',
      updated_at: pwd.updated_at || ''
    }))
    
    const { value: password } = await ElMessageBox.prompt('请输入加密密码（用于保护导出的文件）', '导出加密 JSON', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputType: 'password',
      inputPlaceholder: '请输入密码',
      inputValidator: (value) => {
        if (!value || value.length < 6) {
          return '密码长度至少为 6 位'
        }
        return true
      }
    })
    
    if (!password) {
      return
    }
    
    const encryptedJSON = exportToEncryptedJSON(exportData, password)
    
    const filePath = await saveDialog({
      defaultPath: `passwords_${new Date().toISOString().split('T')[0]}.json`,
      filters: [{
        name: 'JSON 文件',
        extensions: ['json']
      }]
    })
    
    if (filePath) {
      await writeTextFile(filePath, encryptedJSON)
      ElMessage.success('导出成功')
      showExportMenu.value = false
    }
  } catch (error) {
    if (error !== 'cancelled' && error !== 'cancel') {
      ElMessage.error(error.message || '导出失败')
    }
  }
}

// 格式化时间
const formatTime = (timeStr) => {
  if (!timeStr) return ''
  return new Date(timeStr).toLocaleString('zh-CN')
}

// 打开网站链接
const openWebsite = async (url) => {
  if (!url) return
  
  try {
    // 确保 URL 格式正确
    let formattedUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      formattedUrl = 'https://' + url
    }
    
    await TauriShell.openURL(formattedUrl)
  } catch (error) {
    // 错误提示已经在 TauriShell.openURL 中处理
  }
}

// 获取密码强度等级样式类
const getStrengthClass = (strength) => {
  if (!strength) return 'strength-weak'
  if (strength >= 80) return 'strength-strong'
  if (strength >= 50) return 'strength-medium'
  return 'strength-weak'
}

// 获取密码强度文本
const getStrengthText = (strength) => {
  if (!strength) return '弱'
  if (strength >= 80) return '强'
  if (strength >= 50) return '中'
  return '弱'
}

// ==================== 主密码保护功能 ====================

// 检查是否已设置主密码
const checkMasterPassword = async () => {
  try {
    const db = await getDatabase()
    const result = await db.select('SELECT * FROM master_password LIMIT 1')
    hasMasterPassword.value = result && result.length > 0
    
    // 读取设置
    if (hasMasterPassword.value) {
      requirePasswordOnStart.value = result[0].require_password_on_start === 1
    }
    
    return hasMasterPassword.value
  } catch (error) {
    return false
  }
}

// 设置主密码
const setMasterPassword = async () => {
  if (!masterPasswordInput.value || masterPasswordInput.value.length < 6) {
    ElMessage.warning('主密码长度至少为 6 位')
    return
  }
  
  if (masterPasswordInput.value !== masterPasswordConfirm.value) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  
  try {
    const db = await getDatabase()
    const salt = generateSalt()
    const hash = hashPassword(masterPasswordInput.value, salt)
    const now = new Date().toISOString()
    
    // 检查是否已有主密码
    const existing = await db.select('SELECT * FROM master_password LIMIT 1')
    
    if (existing && existing.length > 0) {
      // 更新
      await db.execute(
        'UPDATE master_password SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?',
        [hash, salt, now, existing[0].id]
      )
    } else {
      // 新建（默认开启启动时验证）
      await db.execute(
        'INSERT INTO master_password (password_hash, salt, require_password_on_start, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [hash, salt, 1, now, now]
      )
      requirePasswordOnStart.value = true
    }
    
    ElMessage.success('主密码设置成功')
    setMasterPasswordDialog.value = false
    masterPasswordInput.value = ''
    masterPasswordConfirm.value = ''
    hasMasterPassword.value = true
    
    // 自动解锁
    unlockWithSession()
  } catch (error) {
    ElMessage.error('设置失败')
  }
}

// 验证主密码
const verifyMasterPassword = async () => {
  if (!masterPasswordInput.value) {
    ElMessage.warning('请输入主密码')
    return
  }
  
  try {
    const db = await getDatabase()
    const result = await db.select('SELECT * FROM master_password LIMIT 1')
    
    if (!result || result.length === 0) {
      ElMessage.error('未设置主密码')
      return
    }
    
    const { password_hash, salt } = result[0]
    const isValid = verifyPassword(masterPasswordInput.value, password_hash, salt)
    
    if (isValid) {
      unlockWithSession()
      masterPasswordInput.value = ''
      ElMessage.success('解锁成功')
      // 加载密码列表
      await loadPasswords()
    } else {
      ElMessage.error('密码错误')
      masterPasswordInput.value = '' // 清空错误的输入
    }
  } catch (error) {
    ElMessage.error('验证失败')
  }
}

// 使用会话解锁
const unlockWithSession = () => {
  isLocked.value = false
  sessionKey.value = generateSessionKey()
  sessionUnlocked.value = true // 标记本次会话已解锁
  resetAutoLockTimer()
}

// 锁定
const lockApp = () => {
  isLocked.value = true
  sessionKey.value = null
  clearAutoLockTimer()
  ElMessage.info('已锁定')
}

// 重置自动锁定定时器（15分钟无操作自动锁定）
const resetAutoLockTimer = () => {
  clearAutoLockTimer()
  autoLockTimer.value = setTimeout(() => {
    lockApp()
  }, 15 * 60 * 1000) // 15分钟
}

// 清除自动锁定定时器
const clearAutoLockTimer = () => {
  if (autoLockTimer.value) {
    clearTimeout(autoLockTimer.value)
    autoLockTimer.value = null
  }
}

// ==================== 密码历史记录功能 ====================

// 保存密码到历史记录
const saveToHistory = async (passwordId, oldData) => {
  try {
    const db = await getDatabase()
    const now = new Date().toISOString()
    
    await db.execute(
      'INSERT INTO password_history (password_id, title, username, password, website, notes, password_strength, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        passwordId,
        oldData.title || '',
        oldData.username || '',
        oldData.password || '',
        oldData.website || '',
        oldData.notes || '',
        oldData.password_strength || 0,
        now
      ]
    )
  } catch (e) { /* ignore */ }
}

// 加载密码历史记录
const loadPasswordHistory = async (passwordId) => {
  try {
    const db = await getDatabase()
    const result = await db.select(
      'SELECT * FROM password_history WHERE password_id = ? ORDER BY changed_at DESC LIMIT 10',
      [passwordId]
    )
    passwordHistory.value = result || []
  } catch (error) {
    ElMessage.error('加载历史记录失败')
  }
}

// 查看密码历史
const viewPasswordHistory = async (password) => {
  viewingHistoryPassword.value = password
  await loadPasswordHistory(password.id)
  historyDialog.value = true
}

// 从历史恢复密码
const restoreFromHistory = async (historyRecord) => {
  try {
    await ElMessageBox.confirm('确定要恢复到这个历史版本吗？当前版本将被保存到历史记录。', '确认恢复', {
      type: 'warning'
    })
    
    const db = await getDatabase()
    const now = new Date().toISOString()
    
    // 先获取当前密码数据，保存到历史
    const currentPassword = await db.select('SELECT * FROM passwords WHERE id = ?', [viewingHistoryPassword.value.id])
    if (currentPassword && currentPassword.length > 0) {
      await saveToHistory(viewingHistoryPassword.value.id, currentPassword[0])
    }
    
    // 恢复历史版本
    const strength = analyzePasswordStrength(decryptPassword(historyRecord.password))
    await db.execute(
      'UPDATE passwords SET title = ?, username = ?, password = ?, website = ?, notes = ?, password_strength = ?, updated_at = ? WHERE id = ?',
      [
        historyRecord.title,
        historyRecord.username,
        historyRecord.password,
        historyRecord.website,
        historyRecord.notes,
        strength.strength,
        now,
        viewingHistoryPassword.value.id
      ]
    )
    
    ElMessage.success('恢复成功')
    historyDialog.value = false
    await loadPasswords()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('恢复失败')
    }
  }
}

// ==================== 回收站功能 ====================

// 软删除密码（移到回收站）
const softDeletePassword = async (password) => {
  try {
    await ElMessageBox.confirm('确定要删除这个密码吗？删除后可在回收站中恢复。', '确认删除', {
      type: 'warning'
    })
    
    const db = await getDatabase()
    const now = new Date().toISOString()
    
    // 移动到回收站
    await db.execute(
      'INSERT INTO password_recycle_bin (original_id, category_id, title, username, password, website, notes, password_strength, is_favorite, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        password.id,
        password.category_id,
        password.title,
        password.username,
        password.password,
        password.website,
        password.notes,
        password.password_strength,
        password.is_favorite,
        password.created_at,
        password.updated_at,
        now
      ]
    )
    
    // 从主表删除
    await db.execute('DELETE FROM passwords WHERE id = ?', [password.id])
    
    // 同时删除历史记录
    await db.execute('DELETE FROM password_history WHERE password_id = ?', [password.id])
    
    ElMessage.success('已移到回收站')
    await loadPasswords()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 加载回收站列表
const loadRecycleBin = async () => {
  try {
    const db = await getDatabase()
    const result = await db.select('SELECT * FROM password_recycle_bin ORDER BY deleted_at DESC')
    recycleBinPasswords.value = result || []
  } catch (error) {
    ElMessage.error('加载回收站失败')
  }
}

// 打开回收站
const openRecycleBin = async () => {
  await loadRecycleBin()
  showRecycleBin.value = true
}

// 从回收站恢复
const restoreFromRecycleBin = async (recycleBinItem) => {
  try {
    const db = await getDatabase()
    const now = new Date().toISOString()
    
    // 恢复到主表
    await db.execute(
      'INSERT INTO passwords (category_id, title, username, password, website, notes, password_strength, is_favorite, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        recycleBinItem.category_id,
        recycleBinItem.title,
        recycleBinItem.username,
        recycleBinItem.password,
        recycleBinItem.website,
        recycleBinItem.notes,
        recycleBinItem.password_strength,
        recycleBinItem.is_favorite,
        recycleBinItem.created_at,
        now
      ]
    )
    
    // 从回收站删除
    await db.execute('DELETE FROM password_recycle_bin WHERE id = ?', [recycleBinItem.id])
    
    ElMessage.success('恢复成功')
    await loadRecycleBin()
    await loadPasswords()
  } catch (error) {
    ElMessage.error('恢复失败')
  }
}

// 彻底删除
const permanentlyDelete = async (recycleBinItem) => {
  try {
    await ElMessageBox.confirm('确定要彻底删除吗？此操作不可恢复！', '确认删除', {
      type: 'error',
      confirmButtonText: '彻底删除',
      cancelButtonText: '取消'
    })
    
    const db = await getDatabase()
    await db.execute('DELETE FROM password_recycle_bin WHERE id = ?', [recycleBinItem.id])
    
    ElMessage.success('已彻底删除')
    await loadRecycleBin()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 清空回收站
const emptyRecycleBin = async () => {
  try {
    await ElMessageBox.confirm('确定要清空回收站吗？所有项目将被彻底删除，此操作不可恢复！', '确认清空', {
      type: 'error',
      confirmButtonText: '清空回收站',
      cancelButtonText: '取消'
    })
    
    const db = await getDatabase()
    await db.execute('DELETE FROM password_recycle_bin')
    
    ElMessage.success('回收站已清空')
    await loadRecycleBin()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清空失败')
    }
  }
}

// ==================== 密码安全审计功能 ====================

// 执行安全审计
const performSecurityAudit = () => {
  const allPasswords = passwords.value.map(p => ({
    ...p,
    decryptedPassword: decryptPassword(p.password)
  }))
  
  // 1. 检测重复密码
  const passwordMap = new Map()
  const duplicatePasswords = []
  
  allPasswords.forEach(p => {
    if (passwordMap.has(p.decryptedPassword)) {
      passwordMap.get(p.decryptedPassword).push(p)
    } else {
      passwordMap.set(p.decryptedPassword, [p])
    }
  })
  
  passwordMap.forEach((items, pwd) => {
    if (items.length > 1) {
      duplicatePasswords.push({
        password: '******',
        count: items.length,
        items: items
      })
    }
  })
  
  // 2. 检测弱密码
  const weakPasswords = allPasswords.filter(p => {
    const strength = analyzePasswordStrength(p.decryptedPassword)
    return strength.strength < 50
  })
  
  // 3. 检测相似密码
  const similarPasswords = []
  for (let i = 0; i < allPasswords.length; i++) {
    for (let j = i + 1; j < allPasswords.length; j++) {
      const similarity = calculateSimilarity(allPasswords[i].decryptedPassword, allPasswords[j].decryptedPassword)
      if (similarity > 0.7 && allPasswords[i].decryptedPassword !== allPasswords[j].decryptedPassword) {
        similarPasswords.push({
          password1: allPasswords[i],
          password2: allPasswords[j],
          similarity: Math.round(similarity * 100)
        })
      }
    }
  }
  
  // 4. 计算整体安全评分
  const totalPasswords = passwords.value.length
  const duplicateCount = duplicatePasswords.reduce((sum, item) => sum + item.count, 0)
  const weakCount = weakPasswords.length
  const similarCount = similarPasswords.length
  
  let score = 100
  score -= (duplicateCount / totalPasswords) * 30 // 重复密码扣30分
  score -= (weakCount / totalPasswords) * 40 // 弱密码扣40分
  score -= (similarCount / totalPasswords) * 20 // 相似密码扣20分
  score = Math.max(0, Math.round(score))
  
  // 生成建议
  const suggestions = []
  if (duplicatePasswords.length > 0) {
    suggestions.push(`发现 ${duplicatePasswords.length} 组重复密码，建议为每个账号使用唯一密码`)
  }
  if (weakPasswords.length > 0) {
    suggestions.push(`发现 ${weakPasswords.length} 个弱密码，建议使用更复杂的密码`)
  }
  if (similarPasswords.length > 0) {
    suggestions.push(`发现 ${similarPasswords.length} 组相似密码，建议使用更多样化的密码`)
  }
  if (score >= 80) {
    suggestions.push('密码安全性良好，继续保持！')
  }
  
  auditResult.value = {
    score,
    totalPasswords,
    duplicatePasswords,
    weakPasswords,
    similarPasswords,
    suggestions,
    scoreLevel: score >= 80 ? 'good' : score >= 60 ? 'medium' : 'poor'
  }
  
  securityAuditDialog.value = true
}

// 计算两个字符串的相似度（使用 Levenshtein 距离）
const calculateSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

// Levenshtein 距离算法
const levenshteinDistance = (str1, str2) => {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

onMounted(async () => {
  // 初始化数据库并检查主密码
  await loadCategories()
  
  const hasMP = await checkMasterPassword()
  
  if (!hasMP) {
    // 未设置主密码，显示设置对话框（首次使用）
    setMasterPasswordDialog.value = true
  } else {
    // 已设置主密码
    if (requirePasswordOnStart.value) {
      // 需要每次启动输入密码
      if (!sessionUnlocked.value) {
        // 本次会话未解锁，显示锁定状态
        isLocked.value = true
      } else {
        // 本次会话已解锁，直接解锁
        isLocked.value = false
      }
    } else {
      // 不需要每次启动输入密码，直接解锁
      isLocked.value = false
      sessionUnlocked.value = true
    }
  }
  
  // 加载密码列表
  await loadPasswords()
})
</script>

<style scoped>
/* ignore */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

.passwords-page-wrapper {
  /* ignore */
  --bg-body: #f7f9fb;
  --bg-sidebar: #fcfcfc;
  --bg-content: #ffffff;
  --border-color: #e1e4e8;
  --text-primary: #2c3e50;
  --text-secondary: #606f7b;
  --accent-color: #3498db;
  --hover-bg: #edf2f7;
  --active-bg: #e6f4ff;
  --danger-color: #e74c3c;
  --success-color: #2ecc71;
  
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--text-primary);
  background-color: var(--bg-body);
  height: 100%;
  width: 100%;
  position: relative; /* ignore */
}

/* ignore */
.header {
  height: 50px;
  background-color: var(--bg-content);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  flex-shrink: 0;
  z-index: 2;
  position: relative;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.breadcrumb {
  font-size: 0.9rem;
  color: var(--text-secondary);
  background: #f0f2f5;
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* ignore */
.main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* ignore */
.sidebar-left {
  width: 260px;
  min-width: 260px;
  flex-shrink: 0;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  user-select: none;
  overflow: hidden;
  height: 100%;
  position: relative;
  z-index: 1;
}

.sidebar-toolbar {
  padding: 10px 15px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.sidebar-btn {
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.sidebar-btn:hover {
  color: var(--accent-color);
}

.category-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 5px 10px 20px 10px;
  margin: 0;
  min-height: 0;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  margin: 2px 0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
  color: var(--text-primary);
  position: relative;
}

.category-item:hover {
  background-color: var(--hover-bg);
}

.category-item.active {
  background-color: var(--active-bg);
  color: var(--accent-color);
  font-weight: 600;
}

.category-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.category-name {
  flex: 1;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--hover-bg);
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

/* ignore */
.category-favorite .favorite-icon {
  color: #f1c40f;
}

.category-favorite.active .favorite-icon {
  color: #f39c12;
}

/* ignore */
.favorite-star {
  font-size: 18px;
  color: #dcdfe6;
  cursor: pointer;
  transition: all 0.2s;
  margin-left: 8px;
  flex-shrink: 0;
}

.favorite-star:hover {
  color: #f1c40f;
  transform: scale(1.2);
}

.favorite-star.is-favorite {
  color: #f1c40f;
}

.favorite-star.is-favorite:hover {
  color: #dcdfe6;
}

.category-actions {
  display: none;
  margin-left: 8px;
  gap: 8px;
}

.category-item:hover .category-actions {
  display: flex;
}

.action-icon {
  font-size: 0.75rem;
  color: var(--text-secondary);
  transition: 0.2s;
  cursor: pointer;
}

.action-icon:hover {
  color: var(--accent-color);
  transform: scale(1.1);
}

.action-icon.del:hover {
  color: var(--danger-color);
}

/* ignore */
.content-area {
  flex: 1;
  background-color: var(--bg-content);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  min-width: 0;
  z-index: 0;
}

/* ignore */
.password-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.password-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.password-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 14px 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.password-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border-color: var(--accent-color);
}

/* ignore */
.card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* ignore */
.card-header-row {
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f2f5;
}

.card-title-section {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.card-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

/* ignore */
.strength-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
  flex-shrink: 0;
}

.strength-badge.strength-weak {
  background: #fef0f0;
  color: #f56c6c;
}

.strength-badge.strength-medium {
  background: #fdf6ec;
  color: #e6a23c;
}

.strength-badge.strength-strong {
  background: #f0f9ff;
  color: #67c23a;
}

/* ignore */
.card-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.card-actions .el-button {
  padding: 6px;
}

/* ignore */
.card-info-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.info-label {
  color: var(--text-secondary);
  font-weight: 500;
  flex-shrink: 0;
}

.info-value {
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.info-time {
  color: #909399;
  font-size: 12px;
}

.info-link {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
  color: var(--accent-color);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.info-link:hover {
  text-decoration: underline;
  color: #2980b9;
}

/* ignore */
.website-link {
  color: var(--accent-color);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.website-link:hover {
  text-decoration: underline;
  color: #2980b9;
}

.password-table {
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* ignore */
.password-strength {
  margin-top: 8px;
}

.strength-indicator {
  height: 4px;
  background: #ebeef5;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.strength-bar {
  height: 100%;
  transition: all 0.3s;
  border-radius: 2px;
}

.strength-bar.weak {
  background: #f56c6c;
}

.strength-bar.medium {
  background: #e6a23c;
}

.strength-bar.strong {
  background: #67c23a;
}

.strength-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.strength-text.weak {
  color: #f56c6c;
}

.strength-text.medium {
  color: #e6a23c;
}

.strength-text.strong {
  color: #67c23a;
}

/* ignore */
.import-result {
  max-height: 400px;
  overflow-y: auto;
}

.result-stat {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.stat-value.success {
  color: #67c23a;
}

.stat-value.error {
  color: #f56c6c;
}

.stat-value.warning {
  color: #e6a23c;
}

.error-item,
.warning-item {
  padding: 8px;
  margin-bottom: 4px;
  border-radius: 4px;
  font-size: 12px;
}

.error-item {
  background: #fef0f0;
  color: #f56c6c;
}

.warning-item {
  background: #fdf6ec;
  color: #e6a23c;
}

/* ignore */
.lock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(44, 62, 80, 0.95);
  backdrop-filter: blur(10px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lock-content {
  text-align: center;
  color: #ffffff;
}

.lock-content h2 {
  margin: 20px 0 10px;
  font-size: 28px;
}

.lock-content p {
  font-size: 16px;
  color: #bdc3c7;
}

/* ignore */
.audit-container {
  max-height: 500px;
  overflow-y: auto;
}

.audit-score {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: #ffffff;
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border: 4px solid rgba(255, 255, 255, 0.3);
}

.score-circle.score-good {
  border-color: #67c23a;
  background: rgba(103, 194, 58, 0.2);
}

.score-circle.score-medium {
  border-color: #e6a23c;
  background: rgba(230, 162, 60, 0.2);
}

.score-circle.score-poor {
  border-color: #f56c6c;
  background: rgba(245, 108, 108, 0.2);
}

.score-number {
  font-size: 48px;
  font-weight: bold;
  line-height: 1;
}

.score-label {
  font-size: 14px;
  margin-top: 8px;
  opacity: 0.9;
}

.score-info h3 {
  margin: 0 0 8px;
  font-size: 24px;
}
</style>

