<template>
  <div class="spreadsheet-editor-wrapper" @contextmenu.prevent.stop>
    <SpreadsheetRibbonHeader
      v-if="univerInjector && !props.readOnly"
      :injector="univerInjector"
      :read-only="props.readOnly"
      :locale-pack="zhCNLocalePack"
    />
    <div ref="containerRef" class="spreadsheet-container" />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreZhCN from '@univerjs/preset-sheets-core/locales/zh-CN'
import UniverUIZhCN from '@univerjs/ui/locale/zh-CN'
import UniverSheetsUIZhCN from '@univerjs/sheets-ui/locale/zh-CN'
import UniverSheetsNumfmtUIZhCN from '@univerjs/sheets-numfmt-ui/locale/zh-CN'
import '@univerjs/preset-sheets-core/lib/index.css'

import LuckyExcel from '@mertdeveci55/univer-import-export'
import SpreadsheetRibbonHeader from './SpreadsheetRibbonHeader.vue'
import { IConfirmService } from '@univerjs/core'

const zhCNLocalePack = mergeLocales(
  UniverPresetSheetsCoreZhCN,
  UniverUIZhCN,
  UniverSheetsUIZhCN,
  UniverSheetsNumfmtUIZhCN
)

const props = defineProps({
  readOnly: {
    type: Boolean,
    default: false
  }
})

const containerRef = ref(null)
const univerInjector = ref(null)

let univerInstance = null
let univerAPIInstance = null
let initPromise = null
let isDisposed = false
let loadToken = 0

const withMutedConsole = async (fn) => {
  const original = {
    log: console.log,
    warn: console.warn,
    info: console.info,
    debug: console.debug
  }
  try {
    console.log = () => {}
    console.warn = () => {}
    console.info = () => {}
    console.debug = () => {}
    return await fn()
  } finally {
    console.log = original.log
    console.warn = original.warn
    console.info = original.info
    console.debug = original.debug
  }
}

const startInit = () => {
  if (initPromise) return initPromise
  initPromise = initUniver()
  return initPromise
}

const ensureReady = async () => {
  if (isDisposed) throw new Error('电子表格引擎已销毁')
  if (univerAPIInstance && univerInstance) return

  startInit()
  await initPromise

  if (isDisposed) throw new Error('电子表格引擎已销毁')
  if (!univerAPIInstance || !univerInstance) throw new Error('电子表格引擎未初始化')
}

const disposeActiveWorkbook = (api = univerAPIInstance) => {
  try {
    const wb = api?.getActiveWorkbook?.()
    wb?.dispose?.()
  } catch {
    // ignore
  }
}

const applyReadOnly = (api = univerAPIInstance) => {
  try {
    const wb = api?.getActiveWorkbook?.()
    if (wb?.setEditable) wb.setEditable(!props.readOnly)
  } catch {
    // ignore
  }
}

const initUniver = async () => {
  await nextTick()
  const el = containerRef.value
  if (!el) return
  // 有时组件刚切出来，容器高度还是 0，会导致渲染为空；这里做几帧重试
  let tries = 0
  while (tries < 10 && (el.clientWidth === 0 || el.clientHeight === 0)) {
    tries++
    await new Promise((r) => requestAnimationFrame(r))
  }

  const { univer, univerAPI } = createUniver({
    locale: LocaleType.ZH_CN,
    locales: {
      [LocaleType.ZH_CN]: zhCNLocalePack
    },
    presets: [
      UniverSheetsCorePreset({
        container: el,
        ribbonType: 'classic',
        footer: true,
        // 我们自己手写 Vue headerbar，这里关闭原生 headerbar/toolbar
        toolbar: false
      })
    ]
  })

  univerInstance = univer
  univerAPIInstance = univerAPI
  univerInjector.value = univerInstance?.__getInjector?.() || null

  // 移除“合并仅保留左上角值，是否继续？”确认弹窗：对该 id 直接自动确认
  try {
    const injector = univerInjector.value
    const confirmService = injector?.get?.(IConfirmService)
    if (confirmService && typeof confirmService.confirm === 'function') {
      const originalConfirm = confirmService.confirm.bind(confirmService)
      confirmService.confirm = async (params) => {
        if (params?.id === 'merge.confirm.add-worksheet-merge') return true
        return originalConfirm(params)
      }
    }
  } catch {
    // ignore
  }

  // 默认创建一个空工作簿，避免空白状态下调用 API 出错
  univerAPIInstance.createWorkbook({})
  applyReadOnly(univerAPIInstance)
}

const createBlank = async () => {
  await ensureReady()
  const api = univerAPIInstance
  if (!api || isDisposed) return
  disposeActiveWorkbook(api)
  api.createWorkbook({})
  applyReadOnly(api)
}

const loadXlsx = async (bytes, fileName = 'sheet.xlsx') => {
  const token = ++loadToken
  await ensureReady()
  const apiAtStart = univerAPIInstance
  if (!apiAtStart || isDisposed) return

  const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  const file = new File([new Blob([bytes], { type: mime })], fileName, { type: mime })

  const univerData = await withMutedConsole(
    () =>
      new Promise((resolve, reject) => {
        LuckyExcel.transformExcelToUniver(
          file,
          (data) => resolve(data),
          (err) => reject(err)
        )
      })
  )

  // 可能在导入过程中组件被卸载/切换（preview <-> edit），此时直接丢弃结果，避免空引用崩溃
  if (isDisposed || token !== loadToken || univerAPIInstance !== apiAtStart) return

  disposeActiveWorkbook(apiAtStart)
  apiAtStart.createWorkbook(univerData)
  applyReadOnly(apiAtStart)
}

const normalizeToUint8Array = (bufferLike) => {
  if (!bufferLike) return new Uint8Array()
  if (bufferLike instanceof Uint8Array) return bufferLike
  if (bufferLike instanceof ArrayBuffer) return new Uint8Array(bufferLike)
  if (ArrayBuffer.isView(bufferLike)) {
    return new Uint8Array(bufferLike.buffer, bufferLike.byteOffset, bufferLike.byteLength)
  }
  if (bufferLike?.buffer && bufferLike?.byteLength !== undefined) {
    return new Uint8Array(bufferLike.buffer, bufferLike.byteOffset || 0, bufferLike.byteLength)
  }
  throw new Error('无法识别导出缓冲区类型')
}

const exportXlsx = async (fileName = 'sheet.xlsx') => {
  await ensureReady()

  const api = univerAPIInstance
  if (!api || isDisposed) throw new Error('电子表格引擎未就绪')

  const wb = api.getActiveWorkbook?.()
  if (!wb?.save) throw new Error('当前没有可导出的工作簿')

  const snapshot = wb.save()

  const bufferLike = await withMutedConsole(
    () =>
      new Promise((resolve, reject) => {
        LuckyExcel.transformUniverToExcel({
          snapshot,
          fileName,
          getBuffer: true,
          success: (buffer) => resolve(buffer),
          error: (err) => reject(err)
        })
      })
  )

  return normalizeToUint8Array(bufferLike)
}

const getActiveRange = () => {
  const api = univerAPIInstance
  const wb = api?.getActiveWorkbook?.()
  const sheet = wb?.getActiveSheet?.()
  const selection = sheet?.getSelection?.()
  return selection?.getActiveRange?.() || null
}

const withActiveRange = async (fn) => {
  if (props.readOnly) return
  await ensureReady()
  const range = getActiveRange()
  if (!range) return
  try {
    fn(range)
  } catch {
    // ignore
  }
}

const cmd = async (id, params) => {
  if (props.readOnly) return
  await ensureReady()
  try {
    return await univerAPIInstance?.executeCommand?.(id, params)
  } catch {
    // ignore
  }
}

const handleUndo = async () => {
  if (props.readOnly) return
  await ensureReady()
  try {
    await univerAPIInstance?.undo?.()
  } catch {
    // ignore
  }
}

const handleRedo = async () => {
  if (props.readOnly) return
  await ensureReady()
  try {
    await univerAPIInstance?.redo?.()
  } catch {
    // ignore
  }
}

const applyFontFamily = async (value) => {
  await withActiveRange((r) => r.setFontFamily(value))
}

const applyFontSize = async (value) => {
  const size = Number(value)
  if (!Number.isFinite(size)) return
  await withActiveRange((r) => r.setFontSize(size))
}

const applyTextColor = async (value) => {
  if (!value) return
  await withActiveRange((r) => r.setFontColor(value))
}

const applyFillColor = async (value) => {
  if (!value) return
  await withActiveRange((r) => r.setBackgroundColor(value))
}

const setHAlign = async (alignment) => {
  await withActiveRange((r) => r.setHorizontalAlignment(alignment))
}

const setVAlign = async (alignment) => {
  await withActiveRange((r) => r.setVerticalAlignment(alignment))
}

const setWrap = async (mode) => {
  await ensureReady()
  const api = univerAPIInstance
  const Wrap = api?.Enum?.WrapStrategy
  if (!Wrap) return

  const map = {
    overflow: Wrap.OVERFLOW,
    clip: Wrap.CLIP,
    wrap: Wrap.WRAP
  }
  const strategy = map[mode]
  if (strategy === undefined) return

  await withActiveRange((r) => r.setWrapStrategy(strategy))
}

const setRotation = async (deg) => {
  const angle = Number(deg)
  if (!Number.isFinite(angle)) return
  await withActiveRange((r) => r.setTextRotation(angle))
}

const toggleMerge = async () => {
  await withActiveRange((r) => {
    if (r.isMerged?.() || r.isPartOfMerge?.()) r.breakApart?.()
    else r.merge?.({ defaultMerge: true })
  })
}

watch(
  () => props.readOnly,
  () => {
    applyReadOnly()
  }
)

onMounted(() => {
  isDisposed = false
  void startInit()
})

onBeforeUnmount(() => {
  try {
    disposeActiveWorkbook()
  } finally {
    isDisposed = true
    loadToken++
    univerInjector.value = null
    univerAPIInstance?.dispose?.()
    univerInstance?.dispose?.()
    univerAPIInstance = null
    univerInstance = null
    initPromise = null
  }
})

defineExpose({
  createBlank,
  loadXlsx,
  exportXlsx
})
</script>

<style scoped>
.spreadsheet-editor-wrapper {
  width: 100%;
  height: 100%;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.spreadsheet-container {
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
}

/* ignore */
.spreadsheet-editor-wrapper :deep(header[data-u-comp="headerbar"]) {
  display: none !important;
}

/* ignore */
.spreadsheet-editor-wrapper :deep([data-u-comp="formula-bar"] .univer-w-5.univer-cursor-pointer) {
  display: none !important;
}
</style>

