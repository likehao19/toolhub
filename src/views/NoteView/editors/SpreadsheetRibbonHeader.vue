<template>
  <div data-u-comp="custom-headerbar" class="univer-relative univer-z-10 univer-w-full univer-select-none">
    <!-- Tabs -->
    <div data-u-comp="ribbon-header-menu" class="univer-relative univer-select-none univer-h-9 univer-px-3 univer-box-border univer-flex univer-items-center univer-gap-2">
      <div class="univer-flex univer-h-full univer-flex-1 univer-items-center univer-gap-2">
        <div
          class="univer-flex univer-h-full univer-w-full univer-items-center univer-justify-center univer-gap-1 univer-overflow-x-auto univer-rounded-md univer-bg-gray-50 univer-px-3 dark:!univer-bg-gray-900"
          role="tablist"
          :aria-label="t('ribbon.menu')"
        >
          <button
            v-for="tab in ribbon"
            :key="tab.key"
            type="button"
            role="tab"
            :aria-selected="activatedTab === tab.key"
            :title="t(tab.key)"
            class="univer-focus:outline-none univer-focus:ring-2 univer-focus:ring-primary-500 dark:!univer-focus:ring-primary-300 univer-flex univer-cursor-pointer univer-appearance-none univer-items-center univer-gap-1 univer-rounded-sm univer-border-none univer-px-2 univer-py-1 univer-text-sm univer-transition-colors"
            :class="activatedTab === tab.key ? activeTabClass : inactiveTabClass"
            @click="selectTab(tab.key)"
          >
            {{ t(tab.key) }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="univer-box-border univer-grid univer-h-auto univer-grid-flow-col univer-items-center univer-px-3 univer-text-sm univer-grid-cols-[1fr] univer-justify-center univer-py-1">
      <div
        data-u-comp="ribbon-toolbar"
        class="univer-flex univer-flex-wrap univer-items-center univer-justify-center univer-gap-y-1"
        :class="divideXClass"
        role="toolbar"
        :aria-label="t(activatedTab)"
      >
        <template v-for="group in currentGroups" :key="group.key">
          <div class="univer-grid univer-shrink-0 univer-grid-flow-col univer-gap-2 univer-px-2 univer-py-0.5">
            <SpreadsheetRibbonItem
              v-for="child in group.children || []"
              :key="child.key"
              :injector="injector"
              :schema="child"
              :t="t"
              :read-only="readOnly"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { IRibbonService } from '@univerjs/ui'
import { LocaleService } from '@univerjs/core'
import { divideXClassName } from '@univerjs/design'
import SpreadsheetRibbonItem from './SpreadsheetRibbonItem.vue'

const props = defineProps({
  injector: { type: Object, required: true },
  readOnly: { type: Boolean, default: false },
  // 兜底翻译（避免 locale service 取不到时显示 key）
  localePack: { type: Object, default: null }
})

const ribbon = ref([])
const activatedTab = ref('ribbon.start')
const localeTick = ref(0)
let subs = []

const cleanup = () => {
  subs.forEach((s) => {
    try {
      s?.unsubscribe?.()
    } catch {
      // ignore
    }
  })
  subs = []
}

const getByPath = (obj, path) => {
  if (!obj || !path) return null
  const parts = String(path).split('.').filter(Boolean)
  let cur = obj
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) cur = cur[p]
    else return null
  }
  return cur
}

const t = (key) => {
  // localeTick 用于触发刷新（localeChanged$）
  void localeTick.value
  if (!key) return ''
  const k = String(key)
  try {
    const ls = props.injector?.get?.(LocaleService)
    if (ls?.t) {
      const r = ls.t(k)
      // Univer 找不到翻译时常常会原样返回 key，这里允许用本地 localePack 兜底
      if (typeof r === 'string' && r && r !== k) return r
    }
  } catch {
    // ignore
  }

  const fallback = getByPath(props.localePack, k)
  if (typeof fallback === 'string' && fallback) return fallback

  // 仍然是 key 的话，直接不显示（避免“像乱码”）
  if (k.includes('.')) return ''
  return k
}

const activeTabClass = `
univer-bg-primary-50 univer-font-semibold univer-text-primary-600 univer-shadow-sm
dark:!univer-bg-primary-900 dark:!univer-text-primary-300
`.trim()

const inactiveTabClass = `
univer-hover:bg-gray-100
dark:!univer-hover:bg-gray-700
univer-bg-transparent univer-text-gray-700
dark:!univer-text-gray-200
`.trim()

const divideXClass = computed(() => divideXClassName || '')

const currentGroups = computed(() => {
  const tab = (ribbon.value || []).find((x) => x.key === activatedTab.value)
  return tab?.children || []
})

const selectTab = (key) => {
  try {
    const rs = props.injector?.get?.(IRibbonService)
    rs?.setActivatedTab?.(key)
  } catch {
    // ignore
  }
}

watch(
  () => props.injector,
  (inj) => {
    cleanup()
    if (!inj) return
    try {
      const rs = inj.get(IRibbonService)
      subs.push(rs.ribbon$.subscribe((v) => (ribbon.value = Array.isArray(v) ? v : [])))
      subs.push(rs.activatedTab$.subscribe((v) => (activatedTab.value = String(v || ''))))
      // locale 切换时强制刷新文字
      const ls = inj.get(LocaleService)
      if (ls?.localeChanged$?.subscribe) subs.push(ls.localeChanged$.subscribe(() => (localeTick.value += 1)))
    } catch {
      // ignore
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => cleanup())
</script>

