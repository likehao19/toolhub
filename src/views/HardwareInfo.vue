<template>
  <div class="hardware-info-page">
    <div class="page-header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">System Diagnostics</div>
          <div class="breadcrumb">
            <el-icon><ArrowLeft /></el-icon>
            <span class="breadcrumb-link" @click="goBack">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('hardwareInfo.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-right">
        <el-button size="small" text :loading="loading" @click="refresh" :title="t('common.refresh')">
          <el-icon><Refresh /></el-icon>
        </el-button>
        <el-button size="small" text @click="copyAll" :title="t('hardwareInfo.copyAll')">
          <el-icon><CopyDocument /></el-icon>
        </el-button>
      </div>
    </div>

    <div class="content-area" v-loading="loading" :element-loading-text="t('hardwareInfo.loading')">
      <template v-if="info">
        <!-- 系统概览 -->
        <div class="info-section">
          <div class="section-title">
            <span class="section-icon">💻</span>
            {{ t('hardwareInfo.osOverview') }}
          </div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item :label="t('hardwareInfo.osName')">{{ info.os.name }}</el-descriptions-item>
            <el-descriptions-item :label="t('hardwareInfo.osVersion')">{{ info.os.version }}</el-descriptions-item>
            <el-descriptions-item :label="t('hardwareInfo.buildNumber')">{{ info.os.buildNumber }}</el-descriptions-item>
            <el-descriptions-item :label="t('hardwareInfo.osArch')">{{ info.os.architecture }}</el-descriptions-item>
            <el-descriptions-item :label="t('hardwareInfo.computerName')">{{ info.os.computerName }}</el-descriptions-item>
            <el-descriptions-item :label="t('hardwareInfo.totalMemory')">{{ info.os.totalMemoryGb }} GB</el-descriptions-item>
            <el-descriptions-item :label="t('hardwareInfo.installDate')">{{ info.os.installDate }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 处理器 -->
        <div class="info-section" v-if="info.cpu.length">
          <div class="section-title">
            <span class="section-icon">⚡</span>
            {{ t('hardwareInfo.cpu') }}
          </div>
          <div v-for="(cpu, i) in info.cpu" :key="'cpu-' + i" class="sub-card">
            <div class="sub-card-label" v-if="info.cpu.length > 1">CPU #{{ i + 1 }}</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item :label="t('hardwareInfo.cpuName')">{{ cpu.name }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.cpuManufacturer')">{{ cpu.manufacturer }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.cpuCores')">{{ cpu.cores }} {{ t('hardwareInfo.coresUnit') }} / {{ cpu.logicalProcessors }} {{ t('hardwareInfo.threadsUnit') }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.cpuFreq')">{{ cpu.maxClockSpeedMhz }} MHz</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.cpuCurrentFreq')">{{ cpu.currentClockSpeedMhz }} MHz</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.cpuArch')">{{ cpu.architecture }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.cpuL2')">{{ formatCache(cpu.l2CacheKb) }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.cpuL3')">{{ formatCache(cpu.l3CacheKb) }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.cpuSocket')">{{ cpu.socket || '-' }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <!-- 主板 -->
        <div class="info-section" v-if="info.motherboard.length">
          <div class="section-title">
            <span class="section-icon">🔧</span>
            {{ t('hardwareInfo.motherboard') }}
          </div>
          <div v-for="(mb, i) in info.motherboard" :key="'mb-' + i" class="sub-card">
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item :label="t('hardwareInfo.mbManufacturer')">{{ mb.manufacturer }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.mbProduct')">{{ mb.product }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.mbVersion')">{{ mb.version || '-' }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.mbSerial')">{{ mb.serialNumber || '-' }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <!-- 内存 -->
        <div class="info-section" v-if="info.memory.length">
          <div class="section-title">
            <span class="section-icon">🧩</span>
            {{ t('hardwareInfo.memory') }}
            <span class="section-badge">{{ info.memory.length }} {{ t('hardwareInfo.sticks') }} · {{ totalMemoryGb }} GB</span>
          </div>
          <div v-for="(mem, i) in info.memory" :key="'mem-' + i" class="sub-card">
            <div class="sub-card-label">{{ mem.deviceLocator || ('DIMM #' + (i + 1)) }}</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item :label="t('hardwareInfo.memManufacturer')">{{ mem.manufacturer }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.memCapacity')">{{ mem.capacityGb }} GB</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.memSpeed')">{{ mem.speedMhz }} MHz</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.memType')">{{ mem.memoryType }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.memFormFactor')">{{ mem.formFactor }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.memPartNumber')">{{ mem.partNumber || '-' }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <!-- 显卡 -->
        <div class="info-section" v-if="info.gpu.length">
          <div class="section-title">
            <span class="section-icon">🎮</span>
            {{ t('hardwareInfo.gpu') }}
          </div>
          <div v-for="(gpu, i) in info.gpu" :key="'gpu-' + i" class="sub-card">
            <div class="sub-card-label" v-if="info.gpu.length > 1">GPU #{{ i + 1 }}</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item :label="t('hardwareInfo.gpuName')">{{ gpu.name }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.gpuVram')">{{ gpu.adapterRamGb > 0 ? gpu.adapterRamGb + ' GB' : '-' }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.gpuDriver')">{{ gpu.driverVersion || '-' }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.gpuResolution')">{{ gpu.currentResolution || '-' }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.gpuProcessor')">{{ gpu.videoProcessor || '-' }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.status')">
                <el-tag :type="gpu.status === 'OK' ? 'success' : 'warning'" size="small">{{ gpu.status }}</el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <!-- 显示器 -->
        <div class="info-section" v-if="info.monitor.length">
          <div class="section-title">
            <span class="section-icon">🖥️</span>
            {{ t('hardwareInfo.monitor') }}
          </div>
          <div v-for="(mon, i) in info.monitor" :key="'mon-' + i" class="sub-card">
            <div class="sub-card-label" v-if="info.monitor.length > 1">{{ t('hardwareInfo.monitorUnit') }} #{{ i + 1 }}</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item :label="t('hardwareInfo.monName')">{{ mon.name || '-' }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.monManufacturer')">{{ mon.manufacturer || '-' }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.monResolution')">
                {{ mon.screenWidth && mon.screenHeight ? mon.screenWidth + 'x' + mon.screenHeight : '-' }}
              </el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.monDpi')">
                {{ mon.pixelsPerX ? mon.pixelsPerX + ' DPI' : '-' }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <!-- 磁盘 -->
        <div class="info-section" v-if="info.disk.length">
          <div class="section-title">
            <span class="section-icon">💾</span>
            {{ t('hardwareInfo.disk') }}
          </div>
          <div v-for="(d, i) in info.disk" :key="'disk-' + i" class="sub-card">
            <div class="sub-card-label" v-if="info.disk.length > 1">{{ t('hardwareInfo.diskUnit') }} #{{ i + 1 }}</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item :label="t('hardwareInfo.diskModel')">{{ d.model }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.diskSize')">{{ d.sizeGb }} GB</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.diskInterface')">{{ d.interfaceType || '-' }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.diskMediaType')">{{ d.mediaType || '-' }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.diskSerial')">{{ d.serialNumber || '-' }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.diskFirmware')">{{ d.firmwareRevision || '-' }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.diskPartitions')">{{ d.partitions }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.status')">
                <el-tag :type="d.status === 'OK' ? 'success' : 'warning'" size="small">{{ d.status }}</el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <!-- 声卡 -->
        <div class="info-section" v-if="info.sound.length">
          <div class="section-title">
            <span class="section-icon">🔊</span>
            {{ t('hardwareInfo.sound') }}
          </div>
          <div v-for="(s, i) in info.sound" :key="'snd-' + i" class="sub-card">
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item :label="t('hardwareInfo.sndName')">{{ s.name }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.sndManufacturer')">{{ s.manufacturer || '-' }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.status')">
                <el-tag :type="s.status === 'OK' ? 'success' : 'warning'" size="small">{{ s.status }}</el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <!-- 网卡 -->
        <div class="info-section" v-if="info.network.length">
          <div class="section-title">
            <span class="section-icon">🌐</span>
            {{ t('hardwareInfo.network') }}
          </div>
          <div v-for="(n, i) in info.network" :key="'net-' + i" class="sub-card">
            <div class="sub-card-label" v-if="info.network.length > 1">{{ n.netConnectionId || ('NIC #' + (i + 1)) }}</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item :label="t('hardwareInfo.netName')">{{ n.name }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.netManufacturer')">{{ n.manufacturer || '-' }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.netMac')">{{ n.macAddress || '-' }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.netSpeed')">{{ n.speedMbps > 0 ? n.speedMbps + ' Mbps' : '-' }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.netType')">{{ n.adapterType || '-' }}</el-descriptions-item>
              <el-descriptions-item :label="t('hardwareInfo.netConnection')">{{ n.netConnectionId || '-' }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>
      </template>

      <!-- 错误提示 -->
      <el-result v-if="error && !loading" icon="error" :title="t('hardwareInfo.errorTitle')" :sub-title="error">
        <template #extra>
          <el-button type="primary" @click="refresh">
            <el-icon style="margin-right: 6px;"><Refresh /></el-icon>{{ t('hardwareInfo.retry') }}
          </el-button>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { invoke } from '@tauri-apps/api/core'
import { ArrowLeft, Refresh, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const info = ref(null)

const totalMemoryGb = computed(() => {
  if (!info.value?.memory?.length) return 0
  return info.value.memory.reduce((sum, m) => sum + m.capacityGb, 0)
})

const formatCache = (kb) => {
  if (!kb) return '-'
  if (kb >= 1024) return (kb / 1024) + ' MB'
  return kb + ' KB'
}

const refresh = async () => {
  loading.value = true
  error.value = ''
  try {
    info.value = await invoke('get_hardware_info')
  } catch (e) {
    error.value = String(e)
  } finally {
    loading.value = false
  }
}

const copyAll = async () => {
  if (!info.value) return
  try {
    const text = JSON.stringify(info.value, null, 2)
    await navigator.clipboard.writeText(text)
    ElMessage.success(t('hardwareInfo.copied'))
  } catch {
    ElMessage.error(t('hardwareInfo.copyFailed'))
  }
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  refresh()
})
</script>

<style scoped>
.hardware-info-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, #eef2f6 0%, #e7ecf3 100%);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 249, 252, 0.82));
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  min-height: 58px;
  box-sizing: border-box;
  backdrop-filter: blur(18px);
}

.header-left {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.page-title-block { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.page-eyebrow {
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.breadcrumb .el-icon { font-size: 15px; color: var(--accent-blue); }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-quaternary); }

.header-right {
  display: flex;
  gap: 8px;
}

.header-right :deep(.el-button) { --el-button-border-radius: 10px; }

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px 0;
  scrollbar-gutter: stable;
}

.content-area::-webkit-scrollbar {
  width: 6px;
}

.content-area::-webkit-scrollbar-track {
  background: transparent;
}

.content-area::-webkit-scrollbar-thumb {
  background: var(--text-quaternary);
  border-radius: 3px;
}

.content-area::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

.info-section {
  margin-bottom: 16px;
  padding: 16px 18px 18px;
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 18px;
  background: rgba(255,255,255,0.72);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.84), 0 10px 24px rgba(60, 40, 20,0.04);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: 14px;
}

.section-icon {
  font-size: 18px;
}

.section-badge {
  font-size: 12px;
  font-weight: var(--font-weight-normal);
  color: var(--text-tertiary);
  margin-left: auto;
}

.sub-card {
  margin-bottom: 12px;
  padding: 14px;
  border: 1px solid rgba(60, 40, 20, 0.06);
  border-radius: 14px;
  background: rgba(248, 244, 232,0.78);
}

.sub-card:last-child {
  margin-bottom: 0;
}

.sub-card-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  font-weight: var(--font-weight-medium);
}

:deep(.el-descriptions) {
  border-radius: 14px;
  overflow: hidden;
}

:deep(.el-descriptions__label) {
  width: 130px;
  font-weight: var(--font-weight-medium);
}

:deep(.el-result) {
  margin-top: 12px;
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 18px;
  background: rgba(255,255,255,0.68);
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 10px 14px;
  }

  .header-left,
  .header-right {
    width: 100%;
  }

  .header-right {
    justify-content: flex-start;
  }

  .content-area {
    padding: 14px;
  }

  .section-badge {
    margin-left: 0;
  }

  :deep(.el-descriptions) {
    --el-descriptions-table-border: rgba(60, 40, 20, 0.08);
  }
}
</style>
