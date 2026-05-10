<template>
  <div class="passwords-page-wrapper">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <el-button size="small" circle @click="hideSidebar = !hideSidebar" :title="hideSidebar ? t('common.showSidebar') : t('common.hideSidebar')" class="sidebar-toggle-btn">
          <el-icon><ArrowLeft v-if="!hideSidebar" /><ArrowRight v-else /></el-icon>
        </el-button>
        <div class="page-title-block">
          <div class="page-eyebrow">Knowledge Vault</div>
          <div class="breadcrumb">
            <span>{{ t('passwords.title') }}</span>
            <span class="breadcrumb-divider">/</span>
            <span>{{ currentCategoryName }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <!-- 搜索框 -->
        <el-input
          v-model="searchKeyword"
          :placeholder="searchPlaceholder"
          clearable
          class="header-search"
          size="small"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <!-- 系统凭据/通行密钥操作 -->
        <template v-if="isSysCategory">
          <el-button size="small" circle @click="handleSysRefresh" :title="t('common.refresh')">
            <el-icon><Refresh /></el-icon>
          </el-button>
          <el-button v-if="selectedCategory === 'sys-credentials'" size="small" type="primary" circle @click="showAddCredDialog" :title="t('passwords.addCredential')">
            <el-icon><Plus /></el-icon>
          </el-button>
          <el-button v-if="selectedCategory === 'sys-passkeys'" size="small" circle @click="openPasskeySettings" :title="t('passwords.openPasskeySettings')">
            <el-icon><Unlock /></el-icon>
          </el-button>
        </template>

        <!-- 密码操作按钮组 -->
        <template v-else>
          <el-button size="small" circle @click="openRecycleBin" :title="t('passwords.recycleBin')">
            <el-icon><Delete /></el-icon>
          </el-button>
          <el-button size="small" circle @click="performSecurityAudit" :title="t('passwords.securityAudit')" class="header-btn">
            <el-icon class="icon-audit"><Trophy /></el-icon>
          </el-button>
          <el-button size="small" circle @click="openImportDialog" :title="t('passwords.importPasswords')">
            <el-icon><Upload /></el-icon>
          </el-button>
          <el-button size="small" circle @click="showExportMenu = !showExportMenu" :title="t('passwords.exportPasswords')">
            <el-icon><Download /></el-icon>
          </el-button>
          <el-button size="small" circle @click="lockApp" :title="t('passwords.lock')" v-if="!isLocked">
            <el-icon><Lock /></el-icon>
          </el-button>
          <el-button size="small" type="primary" circle @click="showCreateDialog" :title="t('passwords.addPassword')">
            <el-icon><Plus /></el-icon>
          </el-button>
        </template>
      </div>
    </header>

    <div class="main-container" :class="{ 'sidebar-hidden': hideSidebar }">
      <!-- 左侧分类栏 -->
      <aside class="sidebar-left" v-show="!hideSidebar">
        <div class="sidebar-toolbar">
          <span class="sidebar-title">{{ t('common.category') }}</span>
          <div class="actions">
            <span class="sidebar-btn" :title="t('common.newCategory')" @click="showAddCategoryDialog">
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
            <span class="category-name">{{ t('passwords.allPasswords') }}</span>
            <span class="category-count">{{ passwords.length }}</span>
          </div>
          
          <!-- 常用密码（收藏） -->
          <div 
            class="category-item category-favorite" 
            :class="{ active: selectedCategory === 'favorite' }"
            @click="selectCategory('favorite')"
          >
            <el-icon class="category-icon favorite-icon"><StarFilled /></el-icon>
            <span class="category-name">{{ t('passwords.favorites') }}</span>
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
            <div class="category-actions">
              <i class="fa-solid fa-pen action-icon" @click.stop="editCategory(category)" :title="t('common.edit')"></i>
              <i class="fa-solid fa-trash action-icon del" @click.stop="deleteCategory(category)" :title="t('common.delete')"></i>
            </div>
          </div>

          <!-- 系统 -->
          <div class="sys-section-header">{{ t('passwords.system') }}</div>
          <div
            class="category-item"
            :class="{ active: selectedCategory === 'sys-credentials' }"
            @click="selectCategory('sys-credentials')"
          >
            <el-icon class="category-icon"><Key /></el-icon>
            <span class="category-name">{{ t('passwords.sysCredentials') }}</span>
          </div>
          <div
            class="category-item"
            :class="{ active: selectedCategory === 'sys-passkeys' }"
            @click="selectCategory('sys-passkeys')"
          >
            <el-icon class="category-icon"><Unlock /></el-icon>
            <span class="category-name">{{ t('passwords.passkeys') }}</span>
          </div>
        </div>
      </aside>

      <!-- 中间内容区域 -->
      <main class="content-area">
        <!-- 密码列表 -->
        <div v-if="!isSysCategory" class="password-list" v-loading="loading">
          <el-empty v-if="filteredPasswords.length === 0" :description="t('passwords.noPasswords')" />
          
          <div v-else class="password-cards">
            <div
              v-for="password in filteredPasswords"
              :key="password.id"
              class="password-row"
            >
              <!-- 单行紧凑布局：[标题] [用户名] [网站] [强度] [时间] [hover操作] -->
              <div class="row-left">
                <span class="row-title">{{ password.title }}</span>
                <span class="row-meta" v-if="password.username">{{ password.username }}</span>
                <span class="row-website" v-if="password.website" @click.stop="openWebsite(password.website)">{{ password.website }}</span>
                <div class="strength-badge" :class="getStrengthClass(password.password_strength)">
                  {{ getStrengthText(password.password_strength) }}
                </div>
                <span class="row-time">{{ formatTime(password.updated_at) }}</span>
              </div>

              <div class="row-right">
                <div class="row-actions">
                  <el-button text size="small" @click.stop="copyToClipboard(password.username, t('passwords.username'))" :title="t('passwords.copyUsername')" :disabled="!password.username">
                    <el-icon><User /></el-icon>
                  </el-button>
                  <el-button text size="small" @click.stop="copyToClipboard(decryptPassword(password.password), t('passwords.passwordLabel'))" :title="t('passwords.copyPassword')">
                    <el-icon><DocumentCopy /></el-icon>
                  </el-button>
                  <el-button text size="small" @click.stop="editPassword(password)" :title="t('common.edit')">
                    <el-icon><Edit /></el-icon>
                  </el-button>
                  <el-button text size="small" @click.stop="viewPasswordHistory(password)" :title="t('passwords.history')">
                    <el-icon><Document /></el-icon>
                  </el-button>
                  <el-button text size="small" type="danger" @click.stop="deletePassword(password)" :title="t('common.delete')">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                <el-icon
                  class="favorite-star"
                  :class="{ 'is-favorite': password.is_favorite }"
                  @click.stop="toggleFavorite(password)"
                  :title="t('passwords.markFavorite')"
                >
                  <StarFilled v-if="password.is_favorite" />
                  <Star v-else />
                </el-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- 系统凭据 -->
        <div v-else-if="selectedCategory === 'sys-credentials'" class="sys-table-wrapper">
          <el-table
            v-if="filteredSysCredentials.length > 0"
            :data="filteredSysCredentials"
            stripe
            v-loading="sysCredLoading"
            class="credential-table"
            size="small"
          >
            <el-table-column prop="target_name" :label="t('passwords.targetName')" min-width="240" show-overflow-tooltip />
            <el-table-column prop="username" :label="t('passwords.username')" min-width="160" show-overflow-tooltip />
            <el-table-column prop="credential_type" :label="t('passwords.type')" width="140">
              <template #default="{ row }">
                <el-tag size="small" :type="credTypeTagColor(row.credential_type)">
                  {{ row.credential_type }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="last_written" :label="t('passwords.lastWritten')" width="180">
              <template #default="{ row }">
                {{ formatCredTime(row.last_written) }}
              </template>
            </el-table-column>
            <el-table-column :label="t('passwords.operations')" width="120" fixed="right">
              <template #default="{ row }">
                <el-button link size="small" @click="viewSysCredential(row)">{{ t('passwords.view') }}</el-button>
                <el-button link size="small" type="danger" @click="confirmDeleteCredential(row)">{{ t('common.delete') }}</el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-empty
            v-else-if="!sysCredLoading"
            :description="t('passwords.noCredentials')"
            :image-size="120"
          />
        </div>

        <!-- 通行密钥 -->
        <div v-else-if="selectedCategory === 'sys-passkeys'" class="sys-table-wrapper">
          <!-- 加载中 -->
          <div v-if="sysPasskeyLoading" v-loading="true" class="passkey-loading" />

          <!-- API 不可用 -->
          <div v-else-if="sysPasskeyApiError" class="passkey-fallback">
            <el-icon :size="48" color="var(--text-quaternary)"><Warning /></el-icon>
            <p class="fallback-title">{{ t('passwords.cannotEnumPasskeys') }}</p>
            <p class="fallback-desc">{{ sysPasskeyApiError }}</p>
            <el-button size="small" @click="openPasskeySettings">{{ t('passwords.openPasskeySettings') }}</el-button>
          </div>

          <!-- 正常列表 -->
          <template v-else>
            <el-table
              v-if="filteredSysPasskeys.length > 0"
              :data="filteredSysPasskeys"
              stripe
              class="credential-table"
              size="small"
            >
              <el-table-column :label="t('passwords.websiteApp')" min-width="200">
                <template #default="{ row }">
                  <div class="passkey-rp">
                    <span class="rp-id">{{ row.rp_id }}</span>
                    <span v-if="row.rp_name && row.rp_name !== row.rp_id" class="rp-name">{{ row.rp_name }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column :label="t('passwords.username')" min-width="180">
                <template #default="{ row }">
                  <div>
                    <span>{{ row.user_name || row.user_display_name || '-' }}</span>
                    <span v-if="row.user_display_name && row.user_display_name !== row.user_name" class="user-display-name">
                      ({{ row.user_display_name }})
                    </span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column :label="t('passwords.operations')" width="100" fixed="right">
                <template #default="{ row }">
                  <el-button
                    v-if="row.removable"
                    link
                    size="small"
                    type="danger"
                    @click="confirmDeletePasskey(row)"
                  >{{ t('common.delete') }}</el-button>
                  <span v-else class="text-muted">{{ t('passwords.cannotDelete') }}</span>
                </template>
              </el-table-column>
            </el-table>

            <el-empty
              v-else
              :description="t('passwords.noPasskeys')"
              :image-size="120"
            />
          </template>
        </div>

      </main>
    </div>

    <!-- 创建/编辑密码对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingPassword ? t('passwords.editPassword') : t('passwords.addPassword')"
      width="500px"
    >
      <el-form :model="passwordForm" label-width="80px">
        <el-form-item :label="t('common.category')" required>
          <el-select v-model="passwordForm.category_id" :placeholder="t('passwords.selectCategory')" class="full-width">
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            >
              <el-icon class="icon-opt">
                <component :is="getCategoryIcon(category.icon)" />
              </el-icon>
              {{ category.name }}
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item :label="t('passwords.titleLabel')" required>
          <el-input v-model="passwordForm.title" :placeholder="t('passwords.titlePlaceholder')" />
        </el-form-item>
        
        <el-form-item :label="t('passwords.username')">
          <el-input v-model="passwordForm.username" :placeholder="t('passwords.usernamePlaceholder')" />
        </el-form-item>
        
        <el-form-item :label="t('passwords.passwordLabel')" required>
          <el-input
            v-model="passwordForm.password"
            type="password"
            show-password
            :placeholder="t('passwords.passwordPlaceholder')"
            @input="updatePasswordStrength"
          >
            <template #append>
              <el-button @click="showPasswordGenerator = true">{{ t('passwords.generate') }}</el-button>
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
                {{ t('passwords.strength') }} {{ passwordStrength.levelText }}
              </span>
            </div>
          </div>
        </el-form-item>
        
        <el-form-item :label="t('passwords.websiteLabel')">
          <el-input v-model="passwordForm.website" placeholder="https://example.com" />
        </el-form-item>
        
        <el-form-item :label="t('passwords.notes')">
          <el-input
            v-model="passwordForm.notes"
            type="textarea"
            :rows="3"
            :placeholder="t('passwords.notesPlaceholder')"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="savePassword">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 添加/编辑分类对话框 -->
    <el-dialog
      v-model="categoryDialogVisible"
      :title="editingCategory ? t('passwords.editCategory') : t('passwords.addCategory')"
      width="400px"
    >
      <el-form :model="categoryForm" label-width="80px">
        <el-form-item :label="t('passwords.categoryName')" required>
          <el-input v-model="categoryForm.name" :placeholder="t('passwords.categoryNamePlaceholder')" />
        </el-form-item>
        
        <el-form-item :label="t('passwords.iconLabel')">
          <el-select v-model="categoryForm.icon" :placeholder="t('passwords.selectIcon')">
            <el-option value="Monitor" :label="t('passwords.iconWebsite')">
              <el-icon class="icon-opt" style="color: #409EFF;"><Monitor /></el-icon> {{ t('passwords.iconWebsite') }}
            </el-option>
            <el-option value="Download" :label="t('passwords.iconSoftware')">
              <el-icon class="icon-opt" style="color: #67C23A;"><Download /></el-icon> {{ t('passwords.iconSoftware') }}
            </el-option>
            <el-option value="CreditCard" :label="t('passwords.iconBankCard')">
              <el-icon class="icon-opt" style="color: #F56C6C;"><CreditCard /></el-icon> {{ t('passwords.iconBankCard') }}
            </el-option>
            <el-option value="Key" :label="t('passwords.iconKey')">
              <el-icon class="icon-opt" style="color: #E6A23C;"><Key /></el-icon> {{ t('passwords.iconKey') }}
            </el-option>
            <el-option value="Folder" :label="t('passwords.iconFolder')">
              <el-icon class="icon-opt" style="color: #909399;"><Folder /></el-icon> {{ t('passwords.iconFolder') }}
            </el-option>
            <el-option value="ShoppingCart" :label="t('passwords.iconShopping')">
              <el-icon class="icon-opt" style="color: #FF6B9D;"><ShoppingCart /></el-icon> {{ t('passwords.iconShopping') }}
            </el-option>
            <el-option value="House" :label="t('passwords.iconHouse')">
              <el-icon class="icon-opt" style="color: #8E44AD;"><House /></el-icon> {{ t('passwords.iconHouse') }}
            </el-option>
            <el-option value="Phone" :label="t('passwords.iconPhone')">
              <el-icon class="icon-opt" style="color: #3498DB;"><Phone /></el-icon> {{ t('passwords.iconPhone') }}
            </el-option>
            <el-option value="Camera" :label="t('passwords.iconCamera')">
              <el-icon class="icon-opt" style="color: #E74C3C;"><Camera /></el-icon> {{ t('passwords.iconCamera') }}
            </el-option>
            <el-option value="Printer" :label="t('passwords.iconPrinter')">
              <el-icon class="icon-opt" style="color: #95A5A6;"><Printer /></el-icon> {{ t('passwords.iconPrinter') }}
            </el-option>
            <el-option value="VideoCamera" :label="t('passwords.iconVideo')">
              <el-icon class="icon-opt" style="color: #E67E22;"><VideoCamera /></el-icon> {{ t('passwords.iconVideo') }}
            </el-option>
            <el-option value="Headset" :label="t('passwords.iconHeadset')">
              <el-icon class="icon-opt" style="color: #9B59B6;"><Headset /></el-icon> {{ t('passwords.iconHeadset') }}
            </el-option>
            <el-option value="Briefcase" :label="t('passwords.iconBriefcase')">
              <el-icon class="icon-opt" style="color: #34495E;"><Briefcase /></el-icon> {{ t('passwords.iconBriefcase') }}
            </el-option>
            <el-option value="Guide" :label="t('passwords.iconGuide')">
              <el-icon class="icon-opt" style="color: #16A085;"><Guide /></el-icon> {{ t('passwords.iconGuide') }}
            </el-option>
            <el-option value="Present" :label="t('passwords.iconGift')">
              <el-icon class="icon-opt" style="color: #F39C12;"><Present /></el-icon> {{ t('passwords.iconGift') }}
            </el-option>
            <el-option value="Trophy" :label="t('passwords.iconTrophy')">
              <el-icon class="icon-opt" style="color: #F1C40F;"><Trophy /></el-icon> {{ t('passwords.iconTrophy') }}
            </el-option>
            <el-option value="MessageBox" :label="t('passwords.iconMessage')">
              <el-icon class="icon-opt" style="color: #1ABC9C;"><MessageBox /></el-icon> {{ t('passwords.iconMessage') }}
            </el-option>
            <el-option value="Bell" :label="t('passwords.iconBell')">
              <el-icon class="icon-opt" style="color: #E91E63;"><Bell /></el-icon> {{ t('passwords.iconBell') }}
            </el-option>
            <el-option value="User" :label="t('passwords.iconUser')">
              <el-icon class="icon-opt" style="color: #2C3E50;"><User /></el-icon> {{ t('passwords.iconUser') }}
            </el-option>
            <el-option value="Lock" :label="t('passwords.iconLock')">
              <el-icon class="icon-opt" style="color: #C0392B;"><Lock /></el-icon> {{ t('passwords.iconLock') }}
            </el-option>
            <el-option value="ChromeFilled" :label="t('passwords.iconChrome')">
              <el-icon class="icon-opt" style="color: #4285F4;"><ChromeFilled /></el-icon> {{ t('passwords.iconChrome') }}
            </el-option>
            <el-option value="ShoppingBag" :label="t('passwords.iconShoppingBag')">
              <el-icon class="icon-opt" style="color: #FF9800;"><ShoppingBag /></el-icon> {{ t('passwords.iconShoppingBag') }}
            </el-option>
            <el-option value="GoodsFilled" :label="t('passwords.iconGoods')">
              <el-icon class="icon-opt" style="color: #FF5722;"><GoodsFilled /></el-icon> {{ t('passwords.iconGoods') }}
            </el-option>
            <el-option value="LocationFilled" :label="t('passwords.iconLocation')">
              <el-icon class="icon-opt" style="color: #F44336;"><LocationFilled /></el-icon> {{ t('passwords.iconLocation') }}
            </el-option>
            <el-option value="CollectionTag" :label="t('passwords.iconTag')">
              <el-icon class="icon-opt" style="color: #673AB7;"><CollectionTag /></el-icon> {{ t('passwords.iconTag') }}
            </el-option>
            <el-option value="Picture" :label="t('passwords.iconPicture')">
              <el-icon class="icon-opt" style="color: #00BCD4;"><Picture /></el-icon> {{ t('passwords.iconPicture') }}
            </el-option>
            <el-option value="Tickets" :label="t('passwords.iconTickets')">
              <el-icon class="icon-opt" style="color: #009688;"><Tickets /></el-icon> {{ t('passwords.iconTickets') }}
            </el-option>
            <el-option value="Files" :label="t('passwords.iconFiles')">
              <el-icon class="icon-opt" style="color: #607D8B;"><Files /></el-icon> {{ t('passwords.iconFiles') }}
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveCategory">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 查看密码对话框 -->
    <el-dialog
      v-model="viewDialogVisible"
      :title="t('passwords.passwordDetails')"
      width="500px"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item :label="t('common.category')">{{ getCategoryName(viewingPassword?.category_id) }}</el-descriptions-item>
        <el-descriptions-item :label="t('passwords.titleLabel')">{{ viewingPassword?.title }}</el-descriptions-item>
        <el-descriptions-item :label="t('passwords.username')">
          <div class="desc-inline">
            <span>{{ viewingPassword?.username || t('passwords.notSet') }}</span>
            <el-button 
              v-if="viewingPassword?.username" 
              text 
              @click="copyToClipboard(viewingPassword.username, t('passwords.username'))"
            >
              <el-icon><DocumentCopy /></el-icon>
            </el-button>
          </div>
        </el-descriptions-item>
        <el-descriptions-item :label="t('passwords.passwordLabel')">
          <div class="desc-inline">
            <span v-if="showPassword">{{ decryptPassword(viewingPassword?.password || '') }}</span>
            <span v-else>••••••••</span>
            <el-button text @click="showPassword = !showPassword">
              {{ showPassword ? t('passwords.hide') : t('passwords.show') }}
            </el-button>
            <el-button text @click="copyToClipboard(decryptPassword(viewingPassword?.password || ''), t('passwords.passwordLabel'))">
              <el-icon><DocumentCopy /></el-icon>
            </el-button>
          </div>
        </el-descriptions-item>
        <el-descriptions-item :label="t('passwords.websiteLabel')">
          <span 
            v-if="viewingPassword?.website" 
            class="website-link"
            @click="openWebsite(viewingPassword.website)"
          >
            {{ viewingPassword.website }}
          </span>
          <span v-else>{{ t('passwords.notSet') }}</span>
        </el-descriptions-item>
        <el-descriptions-item :label="t('passwords.notes')">{{ viewingPassword?.notes || t('passwords.none') }}</el-descriptions-item>
        <el-descriptions-item :label="t('passwords.createdAt')">
          {{ formatTime(viewingPassword?.created_at) }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('passwords.updatedAt')">
          {{ formatTime(viewingPassword?.updated_at) }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="viewDialogVisible = false">{{ t('common.close') }}</el-button>
        <el-button type="primary" @click="editPassword(viewingPassword)">{{ t('common.edit') }}</el-button>
      </template>
    </el-dialog>

    <!-- 密码生成器对话框 -->
    <el-dialog
      v-model="showPasswordGenerator"
      :title="t('passwords.generatePasswordTitle')"
      width="500px"
    >
      <el-form :model="generatorOptions" label-width="120px">
        <el-form-item :label="t('passwords.passwordLength')">
          <el-slider v-model="generatorOptions.length" :min="8" :max="32" show-input />
        </el-form-item>
        <el-form-item :label="t('passwords.includeUppercase')">
          <el-switch v-model="generatorOptions.includeUppercase" />
        </el-form-item>
        <el-form-item :label="t('passwords.includeLowercase')">
          <el-switch v-model="generatorOptions.includeLowercase" />
        </el-form-item>
        <el-form-item :label="t('passwords.includeNumbers')">
          <el-switch v-model="generatorOptions.includeNumbers" />
        </el-form-item>
        <el-form-item :label="t('passwords.includeSymbols')">
          <el-switch v-model="generatorOptions.includeSymbols" />
        </el-form-item>
        <el-form-item :label="t('passwords.excludeSimilar')">
          <el-switch v-model="generatorOptions.excludeSimilar" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPasswordGenerator = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="generatePassword">{{ t('passwords.generateAndApply') }}</el-button>
      </template>
    </el-dialog>

    <!-- 导入密码对话框 -->
    <el-dialog
      v-model="showImportDialog"
      :title="t('passwords.importPasswords')"
      width="600px"
    >
      <div v-if="!importFile">
        <el-alert
          :title="t('passwords.supportedFormats')"
          type="info"
          :closable="false"
          class="import-alert"
        >
          <ul class="import-format-list">
            <li>{{ t('passwords.importChromeCSV') }}</li>
            <li>{{ t('passwords.importEdgeCSV') }}</li>
            <li>{{ t('passwords.import1PasswordCSV') }}</li>
            <li>{{ t('passwords.importLastPassCSV') }}</li>
            <li>{{ t('passwords.importGenericCSV') }}</li>
            <li>{{ t('passwords.importJSON') }}</li>
          </ul>
        </el-alert>
        <el-button type="primary" @click="handleFileSelect" class="import-select-btn">
          <el-icon><Upload /></el-icon>
          {{ t('passwords.selectFile') }}
        </el-button>
      </div>
      
      <div v-else>
        <el-alert
          :title="`${t('passwords.selectedFile')}${importFile.name}`"
          type="success"
          :closable="false"
          class="import-alert"
        />

        <el-button @click="handleFileSelect" class="import-reselect-btn">
          {{ t('passwords.reselect') }}
        </el-button>
        
        <div v-if="importResult">
          <el-divider />
          <div class="import-result">
            <div class="result-stat">
              <div class="stat-item">
                <span class="stat-label">{{ t('passwords.total') }}</span>
                <span class="stat-value">{{ importResult.total }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">{{ t('passwords.valid') }}</span>
                <span class="stat-value success">{{ importResult.valid }}</span>
              </div>
              <div class="stat-item" v-if="importResult.errors.length > 0">
                <span class="stat-label">{{ t('passwords.errors') }}</span>
                <span class="stat-value error">{{ importResult.errors.length }}</span>
              </div>
              <div class="stat-item" v-if="importResult.warnings.length > 0">
                <span class="stat-label">{{ t('passwords.warnings') }}</span>
                <span class="stat-value warning">{{ importResult.warnings.length }}</span>
              </div>
            </div>
            
            <el-collapse v-if="importResult.errors.length > 0 || importResult.warnings.length > 0" class="import-collapse">
              <el-collapse-item v-if="importResult.errors.length > 0" :title="t('passwords.errorList')" name="errors">
                <div v-for="(error, index) in importResult.errors" :key="index" class="error-item">
                  {{ error }}
                </div>
              </el-collapse-item>
              <el-collapse-item v-if="importResult.warnings.length > 0" :title="t('passwords.warningList')" name="warnings">
                <div v-for="(warning, index) in importResult.warnings" :key="index" class="warning-item">
                  {{ warning }}
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showImportDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button 
          type="primary" 
          @click="executeImport"
          :disabled="!importResult || importResult.valid === 0"
        >
          {{ t('passwords.importCount', { count: importResult?.valid || 0 }) }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 导出菜单（下拉） -->
    <el-dialog v-model="showExportMenu" :title="t('passwords.exportPasswords')" width="400px">
      <el-button @click="exportPasswordsToCSV" class="export-btn">
        <el-icon><Document /></el-icon>
        {{ t('passwords.exportCSV') }}
      </el-button>
      <el-button @click="exportPasswordsToJSON" class="export-btn">
        <el-icon><Lock /></el-icon>
        {{ t('passwords.exportEncJSON') }}
      </el-button>
    </el-dialog>

    <!-- 锁定遮罩层 -->
    <div v-if="isLocked" class="lock-overlay">
      <div class="lock-content">
        <div class="lock-icon-wrapper">
          <el-icon class="lock-icon-main"><Lock /></el-icon>
        </div>
        <h2 class="lock-title">{{ t('passwords.managerLocked') }}</h2>
        <p class="lock-desc">{{ t('passwords.enterMasterToUnlock') }}</p>

        <el-form class="lock-form">
          <el-form-item>
            <el-input
              v-model="masterPasswordInput"
              type="password"
              :placeholder="t('passwords.enterMasterPassword')"
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
              class="lock-btn"
              @click="verifyMasterPassword"
            >
              {{ t('passwords.unlock') }}
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 设置主密码对话框 -->
    <el-dialog 
      v-model="setMasterPasswordDialog" 
      :title="t('passwords.setMasterPassword')"
      width="450px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <el-alert
        :title="t('passwords.firstTimeSetMaster')"
        type="info"
        :closable="false"
        class="master-pw-alert"
      >
        <p>{{ t('passwords.masterPasswordDesc') }}</p>
        <p class="master-pw-warning">{{ t('passwords.masterPasswordWarning') }}</p>
      </el-alert>
      
      <el-form label-width="100px">
        <el-form-item :label="t('passwords.masterPassword')">
          <el-input
            v-model="masterPasswordInput"
            type="password"
            :placeholder="t('passwords.atLeast6')"
            show-password
            @keyup.enter="setMasterPassword"
          />
        </el-form-item>
        <el-form-item :label="t('passwords.confirmPassword')">
          <el-input
            v-model="masterPasswordConfirm"
            type="password"
            :placeholder="t('passwords.reenterMasterPassword')"
            show-password
            @keyup.enter="setMasterPassword"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button type="primary" @click="setMasterPassword">{{ t('passwords.setAndUnlock') }}</el-button>
      </template>
    </el-dialog>

    <!-- 密码历史记录对话框 -->
    <el-dialog v-model="historyDialog" :title="t('passwords.passwordHistory')" width="700px">
      <div v-if="passwordHistory.length === 0">
        <el-empty :description="t('passwords.noHistory')" />
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
              <div class="history-card-row">
                <div class="history-card-info">
                  <h4>{{ history.title }}</h4>
                  <p class="history-meta">
                    {{ t('passwords.usernameColon') }} {{ history.username || t('passwords.notSet') }}
                  </p>
                  <p class="history-meta">
                    {{ t('passwords.passwordStrength') }} <span :class="getStrengthClass(history.password_strength)">{{ getStrengthText(history.password_strength) }}</span>
                  </p>
                </div>
                <el-button
                  type="primary"
                  size="small"
                  @click="restoreFromHistory(history)"
                >
                  {{ t('passwords.restoreVersion') }}
                </el-button>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-dialog>

    <!-- 回收站对话框 -->
    <el-dialog v-model="showRecycleBin" :title="t('passwords.recycleBin')" width="900px">
      <div class="recycle-bin-header">
        <span class="recycle-bin-count">
          {{ t('passwords.totalItems', { count: recycleBinPasswords.length }) }}
        </span>
        <el-button 
          type="danger" 
          size="small"
          @click="emptyRecycleBin"
          :disabled="recycleBinPasswords.length === 0"
        >
          {{ t('passwords.emptyRecycleBin') }}
        </el-button>
      </div>
      
      <el-empty v-if="recycleBinPasswords.length === 0" :description="t('passwords.recycleBinEmpty')" />
      
      <el-table v-else :data="recycleBinPasswords" stripe class="full-width">
        <el-table-column prop="title" :label="t('passwords.titleLabel')" width="180" />
        <el-table-column prop="username" :label="t('passwords.username')" width="150" />
        <el-table-column :label="t('passwords.websiteLabel')" width="200">
          <template #default="{ row }">
            <span>{{ row.website || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="deleted_at" :label="t('passwords.deletedAt')" width="180">
          <template #default="{ row }">
            {{ formatTime(row.deleted_at) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('passwords.operations')" width="180">
          <template #default="{ row }">
            <el-button
              text
              type="primary"
              size="small"
              @click="restoreFromRecycleBin(row)"
            >
              {{ t('passwords.restore') }}
            </el-button>
            <el-button
              text
              type="danger"
              size="small"
              @click="permanentlyDelete(row)"
            >
              {{ t('passwords.permanentDelete') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 安全审计对话框 -->
    <el-dialog v-model="securityAuditDialog" :title="t('passwords.securityAuditTitle')" width="800px">
      <div v-if="auditResult" class="audit-container">
        <!-- 安全评分 -->
        <div class="audit-score">
          <div class="score-circle" :class="'score-' + auditResult.scoreLevel">
            <div class="score-number">{{ auditResult.score }}</div>
            <div class="score-label">{{ t('passwords.securityScore') }}</div>
          </div>
          <div class="score-info">
            <h3>{{ auditResult.scoreLevel === 'good' ? t('passwords.securityGood') : auditResult.scoreLevel === 'medium' ? t('passwords.securityMedium') : t('passwords.securityPoor') }}</h3>
            <p class="audit-total-info">{{ t('passwords.totalChecked', { n: auditResult.totalPasswords }) }}</p>
          </div>
        </div>

        <!-- 建议列表 -->
        <el-divider />
        <h4>{{ t('passwords.suggestions') }}</h4>
        <el-alert
          v-for="(suggestion, index) in auditResult.suggestions"
          :key="index"
          :title="suggestion"
          type="warning"
          :closable="false"
          class="audit-suggestion"
        />

        <!-- 详细问题列表 -->
        <el-divider />
        <el-tabs>
          <el-tab-pane :label="`${t('passwords.duplicatePasswords')} (${auditResult.duplicatePasswords.length})`">
            <div v-if="auditResult.duplicatePasswords.length === 0">
              <el-empty :description="t('passwords.noDuplicates')" />
            </div>
            <el-card v-else v-for="(dup, index) in auditResult.duplicatePasswords" :key="index" class="audit-detail-card">
              <p class="audit-dup-text">
                {{ t('passwords.accountsUseSamePassword', { count: dup.count }) }}
              </p>
              <ul class="audit-list">
                <li v-for="item in dup.items" :key="item.id">
                  {{ item.title }}
                </li>
              </ul>
            </el-card>
          </el-tab-pane>
          
          <el-tab-pane :label="`${t('passwords.weakPasswords')} (${auditResult.weakPasswords.length})`">
            <div v-if="auditResult.weakPasswords.length === 0">
              <el-empty :description="t('passwords.noWeak')" />
            </div>
            <el-table v-else :data="auditResult.weakPasswords" stripe>
              <el-table-column prop="title" :label="t('passwords.titleLabel')" />
              <el-table-column :label="t('passwords.passwordStrength')">
                <template #default="{ row }">
                  <span :class="getStrengthClass(row.password_strength)">
                    {{ getStrengthText(row.password_strength) }}
                  </span>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          
          <el-tab-pane :label="`${t('passwords.similarPasswords')} (${auditResult.similarPasswords.length})`">
            <div v-if="auditResult.similarPasswords.length === 0">
              <el-empty :description="t('passwords.noSimilar')" />
            </div>
            <el-card v-else v-for="(sim, index) in auditResult.similarPasswords" :key="index" class="audit-detail-card">
              <p class="audit-sim-text">
                {{ t('passwords.similarity') }} <strong>{{ sim.similarity }}%</strong>
              </p>
              <ul class="audit-list">
                <li>{{ sim.password1.title }}</li>
                <li>{{ sim.password2.title }}</li>
              </ul>
            </el-card>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>

    <!-- 添加系统凭据对话框 -->
    <el-dialog v-model="addCredDialogVisible" :title="t('passwords.addCredential')" width="460" :close-on-click-modal="false">
      <el-form :model="addCredForm" label-width="80px" size="small">
        <el-form-item :label="t('passwords.targetName')">
          <el-input v-model="addCredForm.target_name" :placeholder="t('passwords.targetNamePlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('passwords.username')">
          <el-input v-model="addCredForm.username" :placeholder="t('passwords.username')" />
        </el-form-item>
        <el-form-item :label="t('passwords.passwordLabel')">
          <el-input v-model="addCredForm.password" type="password" show-password :placeholder="t('passwords.passwordLabel')" />
        </el-form-item>
        <el-form-item :label="t('passwords.notes')">
          <el-input v-model="addCredForm.comment" type="textarea" :rows="2" :placeholder="t('passwords.notesOptional')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="addCredDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button size="small" type="primary" @click="saveSysCredential" :loading="sysCredSaving">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 查看系统凭据详情对话框 -->
    <el-dialog v-model="credDetailDialogVisible" :title="t('passwords.credentialDetails')" width="500">
      <div class="detail-grid" v-if="credDetailData">
        <div class="detail-row">
          <span class="detail-label">{{ t('passwords.targetName') }}</span>
          <span class="detail-value">{{ credDetailData.target_name }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ t('passwords.username') }}</span>
          <span class="detail-value copyable" @click="copyToClipboard(credDetailData.username, t('passwords.username'))">
            {{ credDetailData.username }}
            <el-icon class="copy-icon"><CopyDocument /></el-icon>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ t('passwords.passwordLabel') }}</span>
          <span class="detail-value copyable" @click="copyToClipboard(credDetailData.password, t('passwords.passwordLabel'))">
            <template v-if="credPasswordVisible">{{ credDetailData.password }}</template>
            <template v-else>••••••••</template>
            <el-button link size="small" @click.stop="credPasswordVisible = !credPasswordVisible" class="toggle-pwd">
              <el-icon><View v-if="!credPasswordVisible" /><Hide v-else /></el-icon>
            </el-button>
            <el-icon class="copy-icon"><CopyDocument /></el-icon>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ t('passwords.type') }}</span>
          <span class="detail-value">
            <el-tag size="small" :type="credTypeTagColor(credDetailData.credential_type)">
              {{ credDetailData.credential_type }}
            </el-tag>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ t('passwords.persist') }}</span>
          <span class="detail-value">{{ credDetailData.persist }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ t('passwords.lastWritten') }}</span>
          <span class="detail-value">{{ formatCredTime(credDetailData.last_written) }}</span>
        </div>
        <div class="detail-row" v-if="credDetailData.comment">
          <span class="detail-label">{{ t('passwords.notes') }}</span>
          <span class="detail-value">{{ credDetailData.comment }}</span>
        </div>
      </div>
      <template #footer>
        <el-button size="small" @click="credDetailDialogVisible = false">{{ t('common.close') }}</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { 
  Plus, Search, Edit, Delete, DocumentCopy, Upload, Download, 
  View, Folder, Star, Monitor, Key, CreditCard, ArrowLeft, 
  ArrowRight, Document, Lock, User, StarFilled, ShoppingCart,
  House, Phone, Camera, Printer, VideoCamera, Headset,
  Briefcase, Guide, Present, Trophy, MessageBox, Bell,
  FolderOpened, Files, Tickets, Picture, ChromeFilled,
  ShoppingBag, GoodsFilled, LocationFilled, CollectionTag,
  Unlock, Refresh, Warning, Hide, CopyDocument
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import Database from '@tauri-apps/plugin-sql'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { t } from '@/i18n'
import { encryptPassword, decryptPassword, isEncryptedV1 } from '@/utils/encryption'
import { analyzePasswordStrength, generatePassword as generateRandomPassword } from '@/utils/passwordStrength'
import { importPasswordFile, validatePasswords, exportToEncryptedJSON } from '@/utils/passwordImport'
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { TauriShell } from '@/utils/tauri'
import { invoke } from '@tauri-apps/api/core'
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

// 系统凭据
const sysCredentials = ref([])
const sysCredLoading = ref(false)
const sysCredSaving = ref(false)

// 通行密钥
const sysPasskeys = ref([])
const sysPasskeyLoading = ref(false)
const sysPasskeyApiError = ref('')
let sysPasskeyLoaded = false

// 系统凭据对话框
const addCredDialogVisible = ref(false)
const addCredForm = ref({ target_name: '', username: '', password: '', comment: '' })
const credDetailDialogVisible = ref(false)
const credDetailData = ref(null)
const credPasswordVisible = ref(false)

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
  levelText: '',
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
    return t('passwords.allPasswords')
  }
  if (selectedCategory.value === 'favorite') {
    return t('passwords.favorites')
  }
  if (selectedCategory.value === 'sys-credentials') {
    return t('passwords.sysCredentials')
  }
  if (selectedCategory.value === 'sys-passkeys') {
    return t('passwords.passkeys')
  }
  const category = categories.value.find(c => c.id === selectedCategory.value)
  return category ? category.name : t('passwords.unknownCategory')
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

// 是否选中了系统分类
const isSysCategory = computed(() =>
  selectedCategory.value === 'sys-credentials' || selectedCategory.value === 'sys-passkeys'
)

// 搜索框占位符
const searchPlaceholder = computed(() => {
  if (selectedCategory.value === 'sys-credentials') return t('passwords.searchCredentials')
  if (selectedCategory.value === 'sys-passkeys') return t('passwords.searchPasskeys')
  return t('passwords.searchPasswords')
})

// 过滤系统凭据
const filteredSysCredentials = computed(() => {
  const kw = searchKeyword.value.toLowerCase()
  if (!kw) return sysCredentials.value
  return sysCredentials.value.filter(
    c => (c.target_name || '').toLowerCase().includes(kw) || (c.username || '').toLowerCase().includes(kw)
  )
})

// 过滤通行密钥
const filteredSysPasskeys = computed(() => {
  const kw = searchKeyword.value.toLowerCase()
  if (!kw) return sysPasskeys.value
  return sysPasskeys.value.filter(
    p => (p.rp_id || '').toLowerCase().includes(kw)
      || (p.rp_name || '').toLowerCase().includes(kw)
      || (p.user_name || '').toLowerCase().includes(kw)
      || (p.user_display_name || '').toLowerCase().includes(kw)
  )
})

// 加载分类列表
const loadCategories = async () => {
  try {
    const db = await getDatabase()
    const result = await db.select('SELECT * FROM password_categories ORDER BY is_default DESC, created_at ASC')
    categories.value = result || []
  } catch (error) {
    ElMessage.error(t('passwords.loadCategoriesFailed'))
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
    // 后台一次性升级旧 base64 密文到 AES,不阻塞 UI 渲染。
    // 失败时静默,旧数据仍可读(decryptPassword 会走 legacy 兜底)。
    migrateLegacyPasswords(db).catch(() => {})
  } catch (error) {
    ElMessage.error(t('passwords.loadPasswordsFailed'))
  } finally {
    loading.value = false
  }
}

// 把旧 base64 密文升级为 AES-256-CBC。
// 只在密钥已就绪时运行;每条记录单独 try,损坏的不影响其他记录。
async function migrateLegacyPasswords(db) {
  const legacy = passwords.value.filter(p => p.password && !isEncryptedV1(p.password))
  if (legacy.length === 0) return
  for (const p of legacy) {
    try {
      const plain = decryptPassword(p.password)
      if (!plain) continue
      const upgraded = encryptPassword(plain)
      if (!isEncryptedV1(upgraded)) continue  // 密钥还没就绪,留待下次
      await db.execute(
        'UPDATE passwords SET password = ? WHERE id = ?',
        [upgraded, p.id]
      )
      p.password = upgraded
    } catch { /* skip this row */ }
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
    ElMessage.success(newFavoriteStatus === 1 ? t('passwords.addedToFavorites') : t('passwords.removedFromFavorites'))
  } catch (error) {
    ElMessage.error(t('passwords.operationFailed'))
  }
}

// 获取分类名称
const getCategoryName = (categoryId) => {
  const category = categories.value.find(c => c.id === categoryId)
  return category ? category.name : t('passwords.uncategorized')
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
    levelText: '',
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
    ElMessage.warning(t('passwords.fillTitleAndPassword'))
    return
  }
  
  if (!passwordForm.value.category_id) {
    ElMessage.warning(t('passwords.selectCategoryWarning'))
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
      ElMessage.success(t('passwords.passwordUpdated'))
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
      ElMessage.success(t('passwords.passwordAdded'))
    }

    dialogVisible.value = false
    await loadPasswords()
  } catch (error) {
    ElMessage.error(t('passwords.saveFailed'))
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
// clipboardTimer 必须在组件卸载时清掉:用户复制密码后 30 秒会自动清空剪贴板,
// 如果用户在期间切到别的页面/复制了别的内容,旧 timer 还在,会无差别地把当前剪贴板抹掉。
let clipboardTimer = null
const clearClipboardTimer = () => {
  if (clipboardTimer) { clearTimeout(clipboardTimer); clipboardTimer = null }
}
const copyToClipboard = async (text, label) => {
  try {
    await writeText(text)
    ElMessage.success(`${label}${t('passwords.copied')}`)
    // 复制密码后 30 秒自动清除剪贴板
    if (label === t('passwords.passwordLabel')) {
      clearClipboardTimer()
      clipboardTimer = setTimeout(async () => {
        try { await writeText('') } catch {}
        clipboardTimer = null
      }, 30000)
    }
  } catch (error) {
    ElMessage.error(t('passwords.copyFailed'))
  }
}
onBeforeUnmount(clearClipboardTimer)

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
    ElMessage.success(t('passwords.passwordGenerated'))
  } catch (error) {
    ElMessage.error(error.message || t('passwords.generatePasswordFailed'))
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
    ElMessage.warning(t('passwords.enterCategoryName'))
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
      ElMessage.success(t('passwords.categoryUpdated'))
    } else {
      await db.execute(
        'INSERT INTO password_categories (name, icon, is_default, created_at, updated_at) VALUES (?, ?, 0, ?, ?)',
        [categoryForm.value.name, categoryForm.value.icon, now, now]
      )
      ElMessage.success(t('passwords.categoryAdded'))
    }

    categoryDialogVisible.value = false
    await loadCategories()
  } catch (error) {
    ElMessage.error(t('passwords.saveFailed'))
  }
}

// 删除分类
const deleteCategory = async (category) => {
  try {
    const count = getCategoryCount(category.id)
    if (count > 0) {
      await ElMessageBox.confirm(
        `${t('passwords.categoryHasPasswords', { count })}`,
        t('passwords.confirmDelete'),
        { type: 'warning' }
      )
    } else {
      await ElMessageBox.confirm(t('passwords.confirmDeleteCategory'), t('passwords.confirmDelete'), { type: 'warning' })
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
    ElMessage.success(t('passwords.deleteSuccess'))
    await loadCategories()
    await loadPasswords()
    
    if (selectedCategory.value === category.id) {
      selectedCategory.value = null
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('passwords.deleteFailed'))
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
        name: t('passwords.csvFiles'),
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
      ElMessage.error(t('passwords.selectFileFailed'))
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
    ElMessage.error(error.message || t('passwords.parseFileFailed'))
  }
}

// 执行导入
const executeImport = async () => {
  if (!importResult.value || importResult.value.valid === 0) {
    ElMessage.warning(t('passwords.noValidPasswords'))
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
            pwd.title || t('passwords.importedPassword'),
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
    
    ElMessage.success(t('passwords.importComplete', { success: successCount, fail: failCount }))
    showImportDialog.value = false
    await loadPasswords()
  } catch (error) {
    ElMessage.error(t('passwords.importFailed'))
  }
}

// 导出密码为 CSV
const exportPasswordsToCSV = async () => {
  try {
    if (passwords.value.length === 0) {
      ElMessage.warning(t('passwords.noPasswordsToExport'))
      return
    }
    
    const headers = [t('passwords.titleLabel'), t('passwords.username'), t('passwords.passwordLabel'), t('passwords.websiteLabel'), t('passwords.notes'), t('passwords.createdAt'), t('passwords.updatedAt')]
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
        name: t('passwords.csvFiles'),
        extensions: ['csv']
      }]
    })
    
    if (filePath) {
      await writeTextFile(filePath, csvContent)
      ElMessage.success(t('passwords.exportSuccess'))
      showExportMenu.value = false
    }
  } catch (error) {
    if (error !== 'cancelled') {
      ElMessage.error(t('passwords.exportFailed'))
    }
  }
}

// 导出密码为加密 JSON
const exportPasswordsToJSON = async () => {
  try {
    if (passwords.value.length === 0) {
      ElMessage.warning(t('passwords.noPasswordsToExport'))
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
    
    const { value: password } = await ElMessageBox.prompt(t('passwords.exportEncryptPrompt'), t('passwords.exportEncryptedJSON'), {
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
      inputType: 'password',
      inputPlaceholder: t('passwords.enterPassword'),
      inputValidator: (value) => {
        if (!value || value.length < 6) {
          return t('passwords.passwordMinLength')
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
        name: t('passwords.jsonFiles'),
        extensions: ['json']
      }]
    })
    
    if (filePath) {
      await writeTextFile(filePath, encryptedJSON)
      ElMessage.success(t('passwords.exportSuccess'))
      showExportMenu.value = false
    }
  } catch (error) {
    if (error !== 'cancelled' && error !== 'cancel') {
      ElMessage.error(error.message || t('passwords.exportFailed'))
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
  if (strength >= 2) return 'strength-strong'
  if (strength >= 1) return 'strength-medium'
  return 'strength-weak'
}

// 获取密码强度文本
const getStrengthText = (strength) => {
  if (strength >= 2) return t('passwords.strengthStrong')
  if (strength >= 1) return t('passwords.strengthMedium')
  return t('passwords.strengthWeak')
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
    ElMessage.warning(t('passwords.masterPasswordMinLength'))
    return
  }
  
  if (masterPasswordInput.value !== masterPasswordConfirm.value) {
    ElMessage.warning(t('passwords.passwordMismatch'))
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
    
    ElMessage.success(t('passwords.masterPasswordSet'))
    setMasterPasswordDialog.value = false
    masterPasswordInput.value = ''
    masterPasswordConfirm.value = ''
    hasMasterPassword.value = true
    
    // 自动解锁
    unlockWithSession()
  } catch (error) {
    ElMessage.error(t('passwords.setFailed'))
  }
}

// 验证主密码
const verifyMasterPassword = async () => {
  if (!masterPasswordInput.value) {
    ElMessage.warning(t('passwords.enterMasterPassword'))
    return
  }
  
  try {
    const db = await getDatabase()
    const result = await db.select('SELECT * FROM master_password LIMIT 1')
    
    if (!result || result.length === 0) {
      ElMessage.error(t('passwords.masterPasswordNotSet'))
      return
    }
    
    const { password_hash, salt } = result[0]
    const isValid = verifyPassword(masterPasswordInput.value, password_hash, salt)
    
    if (isValid) {
      unlockWithSession()
      masterPasswordInput.value = ''
      ElMessage.success(t('passwords.unlockSuccess'))
      // 加载密码列表
      await loadPasswords()
    } else {
      ElMessage.error(t('passwords.wrongPassword'))
      masterPasswordInput.value = '' // 清空错误的输入
    }
  } catch (error) {
    ElMessage.error(t('passwords.verifyFailed'))
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
  ElMessage.info(t('passwords.locked'))
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
    ElMessage.error(t('passwords.loadHistoryFailed'))
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
    await ElMessageBox.confirm(t('passwords.confirmRestore'), t('passwords.confirmRestoreTitle'), {
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
    
    ElMessage.success(t('passwords.restoreSuccess'))
    historyDialog.value = false
    await loadPasswords()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('passwords.restoreFailed'))
    }
  }
}

// ==================== 回收站功能 ====================

// 软删除密码（移到回收站）
const softDeletePassword = async (password) => {
  try {
    await ElMessageBox.confirm(t('passwords.confirmDeletePassword'), t('passwords.confirmDelete'), {
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
    
    ElMessage.success(t('passwords.movedToRecycleBin'))
    await loadPasswords()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('passwords.deleteFailed'))
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
    ElMessage.error(t('passwords.loadRecycleBinFailed'))
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
    
    ElMessage.success(t('passwords.restoreSuccess'))
    await loadRecycleBin()
    await loadPasswords()
  } catch (error) {
    ElMessage.error(t('passwords.restoreFailed'))
  }
}

// 彻底删除
const permanentlyDelete = async (recycleBinItem) => {
  try {
    await ElMessageBox.confirm(t('passwords.confirmPermanentDelete'), t('passwords.confirmDelete'), {
      type: 'error',
      confirmButtonText: t('passwords.permanentDelete'),
      cancelButtonText: t('common.cancel')
    })
    
    const db = await getDatabase()
    await db.execute('DELETE FROM password_recycle_bin WHERE id = ?', [recycleBinItem.id])
    
    ElMessage.success(t('passwords.permanentlyDeleted'))
    await loadRecycleBin()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('passwords.deleteFailed'))
    }
  }
}

// 清空回收站
const emptyRecycleBin = async () => {
  try {
    await ElMessageBox.confirm(t('passwords.confirmEmptyRecycleBin'), t('passwords.confirmEmpty'), {
      type: 'error',
      confirmButtonText: t('passwords.emptyRecycleBin'),
      cancelButtonText: t('common.cancel')
    })
    
    const db = await getDatabase()
    await db.execute('DELETE FROM password_recycle_bin')
    
    ElMessage.success(t('passwords.recycleBinEmptied'))
    await loadRecycleBin()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('passwords.emptyFailed'))
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
    suggestions.push(t('passwords.auditDuplicates', { count: duplicatePasswords.length }))
  }
  if (weakPasswords.length > 0) {
    suggestions.push(t('passwords.auditWeak', { count: weakPasswords.length }))
  }
  if (similarPasswords.length > 0) {
    suggestions.push(t('passwords.auditSimilar', { count: similarPasswords.length }))
  }
  if (score >= 80) {
    suggestions.push(t('passwords.auditGood'))
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

// ==================== 系统凭据功能 ====================

// 凭据类型 → Tag 颜色
const credTypeTagColor = (type) => {
  const map = { Generic: '', DomainPassword: 'warning', DomainCertificate: 'success' }
  return map[type] || 'info'
}

// 格式化凭据时间
const formatCredTime = (iso) => {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

// 系统分类刷新
const handleSysRefresh = () => {
  if (selectedCategory.value === 'sys-credentials') loadSysCredentials()
  else if (selectedCategory.value === 'sys-passkeys') loadSysPasskeys()
}

// 加载系统凭据
const loadSysCredentials = async () => {
  sysCredLoading.value = true
  try {
    sysCredentials.value = await invoke('list_credentials')
  } catch (e) {
    ElMessage.error(`${t('passwords.loadCredentialsFailed')}: ${e}`)
  } finally {
    sysCredLoading.value = false
  }
}

// 加载通行密钥
const loadSysPasskeys = async () => {
  sysPasskeyLoading.value = true
  sysPasskeyApiError.value = ''
  try {
    sysPasskeys.value = await invoke('list_passkeys')
    sysPasskeyLoaded = true
  } catch (e) {
    sysPasskeyApiError.value = String(e)
    sysPasskeys.value = []
  } finally {
    sysPasskeyLoading.value = false
  }
}

// 查看系统凭据详情
const viewSysCredential = async (row) => {
  try {
    credDetailData.value = await invoke('read_credential', { targetName: row.target_name })
    credPasswordVisible.value = false
    credDetailDialogVisible.value = true
  } catch (e) {
    ElMessage.error(`${t('passwords.readCredentialFailed')}: ${e}`)
  }
}

// 显示添加凭据对话框
const showAddCredDialog = () => {
  addCredForm.value = { target_name: '', username: '', password: '', comment: '' }
  addCredDialogVisible.value = true
}

// 保存系统凭据
const saveSysCredential = async () => {
  const { target_name, username, password } = addCredForm.value
  if (!target_name || !username || !password) {
    ElMessage.warning(t('passwords.fillCredentialFields'))
    return
  }
  sysCredSaving.value = true
  try {
    await invoke('add_credential', {
      targetName: target_name,
      username,
      password,
      comment: addCredForm.value.comment
    })
    ElMessage.success(t('passwords.credentialSaved'))
    addCredDialogVisible.value = false
    await loadSysCredentials()
  } catch (e) {
    ElMessage.error(`${t('passwords.saveFailed')}: ${e}`)
  } finally {
    sysCredSaving.value = false
  }
}

// 删除系统凭据
const confirmDeleteCredential = (row) => {
  ElMessageBox.confirm(`${t('passwords.confirmDeleteCredential', { name: row.target_name })}`, t('passwords.deleteConfirm'), {
    confirmButtonText: t('common.delete'),
    cancelButtonText: t('common.cancel'),
    type: 'warning'
  }).then(async () => {
    try {
      await invoke('delete_credential', {
        targetName: row.target_name,
        credType: row.credential_type
      })
      ElMessage.success(t('passwords.deleted'))
      await loadSysCredentials()
    } catch (e) {
      ElMessage.error(`${t('passwords.deleteFailed')}: ${e}`)
    }
  }).catch(() => {})
}

// 删除通行密钥
const confirmDeletePasskey = (row) => {
  const label = row.rp_id + (row.user_name ? ` (${row.user_name})` : '')
  ElMessageBox.confirm(`${t('passwords.confirmDeletePasskey', { name: label })}`, t('passwords.deleteConfirm'), {
    confirmButtonText: t('common.delete'),
    cancelButtonText: t('common.cancel'),
    type: 'warning'
  }).then(async () => {
    try {
      await invoke('delete_passkey', {
        rpId: row.rp_id,
        credentialId: row.credential_id
      })
      ElMessage.success(t('passwords.deleted'))
      await loadSysPasskeys()
    } catch (e) {
      ElMessage.error(`${t('passwords.deleteFailed')}: ${e}`)
    }
  }).catch(() => {})
}

// 打开 Passkey 设置
const openPasskeySettings = async () => {
  try {
    await invoke('open_passkey_settings')
  } catch (e) {
    ElMessage.error(`${e}`)
  }
}

// 懒加载：首次切到系统分类时才请求
watch(selectedCategory, (val) => {
  if (val === 'sys-credentials' && sysCredentials.value.length === 0 && !sysCredLoading.value) {
    loadSysCredentials()
  } else if (val === 'sys-passkeys' && !sysPasskeyLoaded) {
    loadSysPasskeys()
  }
})

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

.passwords-page-wrapper {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--text-primary);
  background: linear-gradient(180deg, #eef2f6 0%, #e7ecf3 100%);
  height: 100%;
  width: 100%;
  position: relative;
}

/* ========== Header ========== */
.header {
  min-height: 58px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 249, 252, 0.82));
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 18px;
  flex-shrink: 0;
  z-index: 2;
  position: relative;
  backdrop-filter: blur(18px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.sidebar-toggle-btn {
  border: 1px solid rgba(60, 40, 20, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(242, 246, 251, 0.92));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.page-title-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.page-eyebrow {
  font-size: 10px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-quaternary);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 600;
  letter-spacing: 0.01em;
}

.breadcrumb-divider {
  color: var(--text-quaternary);
  font-weight: 400;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.header-search {
  width: 250px;
}

.header-actions .el-button.is-circle {
  transition: all var(--transition-normal);
}

.header-actions .el-button.is-circle:hover {
  background: var(--bg-tertiary);
}

.icon-audit {
  color: var(--color-green);
}

/* ========== Layout ========== */
.main-container {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  flex: 1;
  overflow: hidden;
  min-height: 0;
  padding: 5px 5px 0;
  gap: 0;
}

.main-container.sidebar-hidden {
  grid-template-columns: minmax(0, 1fr);
}

/* ========== Sidebar ========== */
.sidebar-left {
  min-width: 0;
  flex-shrink: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 96%, var(--accent-warm-soft) 4%), var(--bg-secondary));
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-right: none;
  border-radius: 18px 0 0 18px;
  display: flex;
  flex-direction: column;
  user-select: none;
  overflow: hidden;
  height: 100%;
  position: relative;
  z-index: 1;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

.sidebar-toolbar {
  padding: 14px 14px 10px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-quaternary);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.sidebar-btn {
  cursor: pointer;
  color: var(--text-tertiary);
  font-size: var(--font-size-body);
  transition: color var(--transition-fast), background var(--transition-fast);
  padding: 4px 6px;
  border-radius: 8px;
}

.sidebar-btn:hover {
  color: var(--accent-blue);
  background: rgba(255, 255, 255, 0.72);
}

.category-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 9px 12px;
  margin: 0 0 4px;
  border-radius: 12px;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
  font-size: var(--font-size-body);
  color: var(--text-primary);
  border: 1px solid transparent;
}

.category-item:hover {
  background-color: rgba(255, 255, 255, 0.58);
}

.category-item.active {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(240, 245, 251, 0.95));
  color: var(--accent-blue);
  font-weight: var(--font-weight-semibold);
  border-color: rgba(194, 65, 12, 0.15);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.82), 0 6px 14px rgba(60, 40, 20, 0.05);
}

.category-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.category-item:hover .category-icon {
  transform: none;
}

.category-name {
  flex: 1;
  font-size: var(--font-size-body);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-count {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  min-width: 16px;
  text-align: right;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

/* ========== Category Favorite ========== */
.category-favorite .favorite-icon {
  color: var(--color-orange);
}

.category-favorite.active .favorite-icon {
  color: var(--color-orange);
}

/* ========== Favorite Star ========== */
.favorite-star {
  font-size: 14px;
  color: var(--text-quaternary);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-left: var(--space-xs);
  flex-shrink: 0;
}

.favorite-star:hover {
  color: var(--color-orange);
}

.favorite-star.is-favorite {
  color: var(--color-orange);
}

.favorite-star.is-favorite:hover {
  color: var(--text-quaternary);
}

.category-actions {
  display: none;
  gap: 2px;
  flex-shrink: 0;
  margin-left: 2px;
}

.category-item:hover .category-actions,
.category-item.active .category-actions {
  display: flex;
}

.action-icon {
  font-size: 11px;
  padding: 3px;
  cursor: pointer;
  transition: color var(--transition-fast);
  color: var(--text-quaternary);
  border-radius: var(--radius-xs);
}

.action-icon:hover {
  color: var(--accent-blue);
}

.action-icon.del:hover {
  color: var(--color-red);
}

/* ========== Content Area ========== */
.content-area {
  flex: 1;
  background: linear-gradient(180deg, var(--bg-primary), color-mix(in srgb, var(--bg-primary) 92%, var(--bg-secondary) 8%));
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  z-index: 0;
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 0 18px 18px 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.main-container.sidebar-hidden .content-area {
  border-radius: 18px;
}

/* ========== Password List ========== */
.password-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 22px;
  background: transparent;
}

.password-list :deep(.el-empty) {
  min-height: 320px;
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255,255,255,0.8), rgba(248, 244, 232,0.92));
}

.password-list::-webkit-scrollbar {
  width: 6px;
}

.password-list::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.24);
  border-radius: 999px;
}

.password-list::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.36);
}

.password-list::-webkit-scrollbar-track {
  background: transparent;
}

.password-cards {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 18px;
  border: 1px solid rgba(60, 40, 20, 0.08);
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(60, 40, 20, 0.05);
}

/* 紧凑单行 */
.password-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  transition: background 0.12s;
  cursor: default;
  min-height: 40px;
}

.password-row:not(:last-child) {
  border-bottom: 1px solid rgba(60, 40, 20, 0.06);
}

.password-row:hover {
  background: rgba(239, 246, 255, 0.72);
}

.row-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.row-title {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-regular);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
  flex-shrink: 0;
}

.row-meta {
  font-size: var(--font-size-footnote);
  color: var(--text-quaternary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
  flex-shrink: 1;
  min-width: 0;
}

.row-website {
  font-size: var(--font-size-footnote);
  color: var(--text-quaternary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  cursor: pointer;
  transition: color var(--transition-fast);
}

.row-website:hover {
  color: var(--accent-blue);
}

.row-time {
  font-size: var(--font-size-caption);
  color: var(--text-quaternary);
  white-space: nowrap;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.row-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 8px;
}

/* 操作按钮 — 默认隐藏，hover 时显示 */
.row-actions {
  display: none;
  gap: 2px;
}

.password-row:hover .row-actions {
  display: flex;
}

.row-actions .el-button {
  padding: 2px 4px;
}

/* 密码强度徽标 */
.strength-badge {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 10px;
  font-weight: var(--font-weight-medium);
  flex-shrink: 0;
  letter-spacing: 0.01em;
  line-height: 1.5;
}

.strength-badge.strength-weak {
  background: rgba(255, 59, 48, 0.06);
  color: var(--color-red);
}

.strength-badge.strength-medium {
  background: rgba(255, 149, 0, 0.06);
  color: var(--color-orange);
}

.strength-badge.strength-strong {
  background: rgba(52, 199, 89, 0.06);
  color: var(--color-green);
}

/* ========== Website Link ========== */
.website-link {
  color: var(--accent-blue);
  cursor: pointer;
  text-decoration: none;
  transition: all var(--transition-fast);
}

.website-link:hover {
  text-decoration: underline;
  opacity: 0.85;
}

.password-table {
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

/* ========== Password Strength ========== */
.password-strength {
  margin-top: var(--space-sm);
}

.strength-indicator {
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: var(--space-xs);
}

.strength-bar {
  height: 100%;
  transition: width var(--transition-smooth);
  border-radius: 2px;
}

.strength-bar.weak {
  background: var(--color-red);
}

.strength-bar.medium {
  background: var(--color-orange);
}

.strength-bar.strong {
  background: var(--color-green);
}

.strength-info {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--font-size-caption);
}

.strength-text.weak {
  color: var(--color-red);
}

.strength-text.medium {
  color: var(--color-orange);
}

.strength-text.strong {
  color: var(--color-green);
}

/* ========== Import ========== */
.import-result {
  max-height: 400px;
  overflow-y: auto;
}

.import-alert {
  margin-bottom: var(--space-lg);
}

.import-format-list {
  margin: var(--space-sm) 0 0 var(--space-xl);
  padding: 0;
  line-height: 1.8;
}

.import-select-btn {
  width: 100%;
}

.import-reselect-btn {
  margin-bottom: var(--space-lg);
}

.import-collapse {
  margin-top: var(--space-lg);
}

.result-stat {
  display: flex;
  gap: var(--space-2xl);
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.stat-label {
  font-size: var(--font-size-body);
  color: var(--text-secondary);
}

.stat-value {
  font-size: var(--font-size-headline);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.stat-value.success {
  color: var(--color-green);
}

.stat-value.error {
  color: var(--color-red);
}

.stat-value.warning {
  color: var(--color-orange);
}

.error-item,
.warning-item {
  padding: var(--space-sm);
  margin-bottom: var(--space-xs);
  border-radius: var(--radius-xs);
  font-size: var(--font-size-caption);
}

.error-item {
  background: rgba(255, 59, 48, 0.06);
  color: var(--color-red);
}

.warning-item {
  background: rgba(255, 149, 0, 0.06);
  color: var(--color-orange);
}

/* ========== Export ========== */
.export-btn {
  width: 100%;
}

.export-btn + .export-btn {
  margin-top: var(--space-md);
  margin-left: 0;
}

/* ========== Lock Overlay ========== */
.lock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(28, 28, 30, 0.72);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lock-content {
  text-align: center;
  color: #ffffff;
}

.lock-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-xl);
  backdrop-filter: blur(8px);
  border: 0.5px solid rgba(255, 255, 255, 0.15);
}

.lock-icon-main {
  font-size: 36px;
  color: rgba(255, 255, 255, 0.9);
}

.lock-title {
  margin: 0 0 var(--space-sm);
  font-size: var(--font-size-title2);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.01em;
}

.lock-desc {
  font-size: var(--font-size-callout);
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 var(--space-2xl);
}

.lock-form {
  width: 320px;
  max-width: 90vw;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.lock-form :deep(.el-form-item) {
  margin-bottom: 0;
  width: 100%;
}
.lock-form :deep(.el-form-item__content) {
  width: 100%;
  justify-content: center;
}
.lock-form :deep(.el-input) {
  width: 100% !important;
}
.lock-form :deep(.el-input__wrapper) {
  padding: 2px 12px;
  width: 100%;
  box-sizing: border-box;
}
.lock-form :deep(.el-input--large .el-input__inner) {
  height: 36px;
  font-size: 14px;
}

.lock-btn {
  width: 100%;
  height: 36px;
  font-size: 14px;
  letter-spacing: 0.04em;
}

/* ========== Master Password Dialog ========== */
.master-pw-alert {
  margin-bottom: var(--space-xl);
}

.master-pw-warning {
  color: var(--color-orange);
  margin-top: var(--space-sm);
}

/* ========== History Dialog ========== */
.history-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-card-info {
  flex: 1;
}

.history-card-info h4 {
  margin: 0 0 var(--space-xs);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.history-meta {
  margin: 2px 0;
  color: var(--text-tertiary);
  font-size: var(--font-size-footnote);
}

/* ========== Recycle Bin ========== */
.recycle-bin-header {
  margin-bottom: var(--space-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.recycle-bin-count {
  color: var(--text-tertiary);
  font-size: var(--font-size-body);
}

/* ========== Audit ========== */
.audit-container {
  max-height: 500px;
  overflow-y: auto;
}

.audit-score {
  display: flex;
  align-items: center;
  gap: var(--space-3xl);
  padding: var(--space-2xl);
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
}

.score-circle {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  border: 3px solid var(--border-color-strong);
  flex-shrink: 0;
}

.score-circle.score-good {
  border-color: var(--color-green);
}

.score-circle.score-medium {
  border-color: var(--color-orange);
}

.score-circle.score-poor {
  border-color: var(--color-red);
}

.score-number {
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.score-label {
  font-size: var(--font-size-caption);
  margin-top: var(--space-xs);
  color: var(--text-tertiary);
}

.score-info h3 {
  margin: 0 0 var(--space-xs);
  font-size: var(--font-size-title3);
  font-weight: var(--font-weight-semibold);
}

.audit-total-info {
  color: var(--text-tertiary);
  margin-top: var(--space-sm);
  font-size: var(--font-size-footnote);
}

.audit-suggestion {
  margin-bottom: var(--space-md);
}

.audit-detail-card {
  margin-bottom: var(--space-md);
}

.audit-dup-text {
  margin-bottom: var(--space-sm);
  color: var(--color-red);
  font-size: var(--font-size-body);
}

.audit-sim-text {
  margin-bottom: var(--space-sm);
  color: var(--color-orange);
  font-size: var(--font-size-body);
}

.audit-list {
  margin: 0;
  padding-left: var(--space-xl);
  line-height: 1.8;
  font-size: var(--font-size-footnote);
  color: var(--text-secondary);
}

/* ========== Utility Classes ========== */
.full-width {
  width: 100%;
}

.desc-inline {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.icon-opt {
  margin-right: var(--space-sm);
}

/* ========== System Credentials Section ========== */
.sys-section-header {
  padding: var(--space-md) var(--space-md) var(--space-xs) var(--space-md);
  margin-top: var(--space-sm);
  border-top: 0.5px solid var(--border-color);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-semibold);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sys-table-wrapper {
  flex: 1;
  overflow: auto;
  padding: 16px 20px;
}

.credential-table {
  width: 100%;
}

/* 通行密钥 RP 样式 */
.passkey-rp {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rp-id {
  font-size: 13px;
  color: var(--text-primary);
}

.rp-name {
  font-size: 11px;
  color: var(--text-tertiary);
}

.user-display-name {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-left: 4px;
}

.text-muted {
  font-size: 12px;
  color: var(--text-quaternary);
}

/* Passkey 加载占位 */
.passkey-loading {
  height: 200px;
}

/* Passkey fallback */
.passkey-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  gap: 8px;
}

.fallback-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 8px 0 0;
}

.fallback-desc {
  font-size: 13px;
  color: var(--text-tertiary);
  max-width: 400px;
  margin: 0 0 12px;
}

/* 凭据详情网格 */
.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.detail-label {
  width: 70px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--text-tertiary);
  text-align: right;
}

.detail-value {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
  word-break: break-all;
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-value.copyable {
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 6px;
  margin: -2px -6px;
  transition: background 0.2s;
}

.detail-value.copyable:hover {
  background: var(--bg-tertiary);
}

.copy-icon {
  font-size: 13px;
  color: var(--text-quaternary);
  flex-shrink: 0;
}

.toggle-pwd {
  padding: 0;
  margin: 0;
}</style>

