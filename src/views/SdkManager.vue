<template>
  <div class="sdk-manager-wrapper">
    <!-- 顶部工具栏 -->
    <div class="header">
      <div class="header-left">
        <div class="breadcrumb">
          <el-icon><Briefcase /></el-icon>
          <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
          <span class="breadcrumb-sep">/</span>
          <span>{{ t('sdkManager.title') }}</span>
        </div>
      </div>
      <div class="header-actions">
        <el-button size="small" circle :title="t('sdkManager.refreshEnv')" @click="refreshAll">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </div>
    </div>

    <div class="main-container">
      <!-- 左侧菜单 -->
      <aside class="sidebar-left">
        <div class="menu-list">
          <div
            v-for="tab in tabs"
            :key="tab.key"
            class="menu-item"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            <span v-if="tab.badge" class="menu-badge" :style="{ background: tab.color }">{{ tab.badge }}</span>
            <el-icon v-else-if="tab.icon" class="menu-el-icon"><component :is="tab.icon" /></el-icon>
            <span class="menu-name">{{ tab.label }}</span>
          </div>
        </div>
      </aside>

      <!-- 右侧内容 -->
      <main class="content-area">
        <template v-for="sdk in sdkKeys" :key="sdk">
          <div v-show="activeTab === sdk" class="sdk-panel">
            <sdk-env-card :config="SDK_CONFIG[sdk]" :info="data[sdk].env" :loading="data[sdk].envLoading" />
            <sdk-version-card
              :versions="data[sdk].versions" :env-info="data[sdk].env"
              :scanning="data[sdk].scanning" :switching="data[sdk].switching"
              @scan="doScan(sdk)" @add="doAdd(sdk)"
              @switch="(v) => doSwitch(sdk, v)" @remove="(v) => doRemove(sdk, v)"
            />
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Briefcase, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { t } from '@/i18n'
import { open } from '@tauri-apps/plugin-dialog'
import {
  SDK_CONFIG,
  loadVersions,
  addVersionRecord,
  removeVersionRecord,
  getCurrentEnv,
  validateSdkPath,
  switchVersion,
  detectInstalledSdks,
} from '@/utils/sdkManager'
import SdkEnvCard from '@/components/sdk/SdkEnvCard.vue'
import SdkVersionCard from '@/components/sdk/SdkVersionCard.vue'

const router = useRouter()
const activeTab = ref('java')
const sdkKeys = ['java', 'maven', 'nodejs', 'python', 'go']

const tabs = [
  { key: 'java',     badge: 'J',  color: '#e76f00', label: 'Java' },
  { key: 'maven',    badge: 'M',  color: '#c71a36', label: 'Maven' },
  { key: 'nodejs',   badge: 'N',  color: '#3c873a', label: 'Node.js' },
  { key: 'python',   badge: 'Py', color: '#3776ab', label: 'Python' },
  { key: 'go',       badge: 'Go', color: '#00add8', label: 'Go' },
]

function openSecuritySettings() {
  router.push('/settings?tab=security')
}

function isNeedAuthError(error) {
  return error === 'NEED_AUTH' || String(error || '').includes('NEED_AUTH')
}

const emptyEnv = () => ({ home: '', homeScope: '', inPath: false, version: null, detectedPath: '' })
const data = reactive({
  java:   { env: emptyEnv(), versions: [], envLoading: false, scanning: false, switching: false },
  maven:  { env: emptyEnv(), versions: [], envLoading: false, scanning: false, switching: false },
  nodejs: { env: emptyEnv(), versions: [], envLoading: false, scanning: false, switching: false },
  python: { env: emptyEnv(), versions: [], envLoading: false, scanning: false, switching: false },
  go:     { env: emptyEnv(), versions: [], envLoading: false, scanning: false, switching: false },
})

// ---- 数据加载 ----
async function loadEnv(sdk) {
  data[sdk].envLoading = true
  try { data[sdk].env = await getCurrentEnv(sdk) }
  catch (e) { console.error(`loadEnv(${sdk}):`, e) }
  finally { data[sdk].envLoading = false }
}
async function loadVer(sdk) {
  try { data[sdk].versions = await loadVersions(sdk) }
  catch (e) { data[sdk].versions = [] }
}
async function refreshAll() {
  await Promise.all(sdkKeys.flatMap(s => [loadEnv(s), loadVer(s)]))
}

// ---- 操作 ----
async function doScan(sdk) {
  data[sdk].scanning = true
  try {
    const found = await detectInstalledSdks(sdk)
    if (!found.length) { ElMessage.info(t('sdkManager.scanEmpty')); return }
    let added = 0
    for (const item of found) {
      if (!data[sdk].versions.some(v => v.path.toLowerCase() === item.path.toLowerCase())) {
        await addVersionRecord(sdk, item.path, item.version, 'detected')
        added++
      }
    }
    await loadVer(sdk)
    ElMessage.success(t('sdkManager.scanResult').replace('{n}', String(added)))
  } catch (e) { console.error('Scan:', e) }
  finally { data[sdk].scanning = false }
}

async function doAdd(sdk) {
  try {
    const selected = await open({ directory: true, multiple: false, title: t('sdkManager.addVersionTitle') })
    if (!selected) return
    const sdkPath = typeof selected === 'string' ? selected : selected[0]
    if (data[sdk].versions.some(v => v.path.toLowerCase() === sdkPath.toLowerCase())) {
      ElMessage.warning(t('sdkManager.alreadyExists')); return
    }
    ElMessage.info(t('sdkManager.detecting'))
    const result = await validateSdkPath(sdk, sdkPath)
    if (!result.valid) ElMessage.warning(t('sdkManager.detectFailed'))
    await addVersionRecord(sdk, sdkPath, result.version || null, 'manual')
    await loadVer(sdk)
    ElMessage.success(t('sdkManager.addSuccess'))
  } catch (e) { console.error('Add:', e) }
}

async function doSwitch(sdk, item) {
  data[sdk].switching = true
  try {
    const result = await switchVersion(sdk, item.path)
    if (result.success) {
      ElMessage.success(t('sdkManager.switchSuccess'))
      await loadEnv(sdk)
    } else if (isNeedAuthError(result.error)) {
      ElMessage.warning(t('sdkManager.needAuth'))
      openSecuritySettings()
    } else {
      ElMessage.error(`${t('sdkManager.switchFailed')}: ${result.error}`)
    }
  } finally { data[sdk].switching = false }
}

async function doRemove(sdk, item) {
  try {
    await ElMessageBox.confirm(t('sdkManager.removeConfirm'), t('sdkManager.removeTitle'), { type: 'warning' })
    await removeVersionRecord(item.id)
    await loadVer(sdk)
    ElMessage.success(t('sdkManager.removed'))
  } catch { /* cancelled */ }
}

onMounted(() => { refreshAll() })
</script>

<style scoped>
.sdk-manager-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: var(--bg-secondary);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--space-lg);
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  height: 42px;
  box-sizing: border-box;
}

.header-left { display: flex; align-items: center; }

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-footnote);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}
.breadcrumb .el-icon { font-size: 15px; color: var(--text-secondary); }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-tertiary); margin: 0 1px; }

.main-container { display: flex; flex: 1; overflow: hidden; }

/* 左侧菜单 */
.sidebar-left {
  width: 152px; min-width: 152px;
  background-color: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  display: flex; flex-direction: column;
}
.menu-list { padding: 6px; flex: 1; overflow-y: auto; }

.menu-item {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; border-radius: var(--radius-sm);
  cursor: pointer; transition: all var(--transition-fast);
  color: var(--text-secondary); font-size: 13px; margin-bottom: 1px;
}
.menu-item:hover { background-color: var(--bg-tertiary); color: var(--text-primary); }
.menu-item.active {
  background-color: var(--accent-blue-light, rgba(64, 158, 255, 0.1));
  color: var(--accent-blue); font-weight: var(--font-weight-semibold);
}

.menu-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 4px;
  font-size: 11px; font-weight: 700; color: #fff;
  flex-shrink: 0; line-height: 1;
}

.menu-el-icon {
  font-size: 16px; width: 22px; display: inline-flex;
  align-items: center; justify-content: center; flex-shrink: 0;
}

.menu-name { white-space: nowrap; }

/* 右侧内容 */
.content-area {
  flex: 1; overflow-y: auto; padding: 14px 18px; scrollbar-gutter: stable;
}
.content-area::-webkit-scrollbar { width: 5px; }
.content-area::-webkit-scrollbar-track { background: transparent; }
.content-area::-webkit-scrollbar-thumb { background: var(--text-quaternary); border-radius: 3px; }
.content-area::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); }

</style>
