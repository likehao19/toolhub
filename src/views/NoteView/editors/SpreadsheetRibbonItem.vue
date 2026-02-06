<template>
  <span v-if="!hidden" class="univer-inline-flex univer-items-center">
    <!-- BUTTON -->
    <button
      v-if="itemType === MenuItemType.BUTTON"
      type="button"
      :data-u-command="itemId"
      :data-disabled="disabled || readOnly"
      :disabled="disabled || readOnly"
      :class="buttonClass"
      :title="tooltipText"
      @click="handleButtonClick"
      @dblclick="handleButtonDblClick"
    >
      <UniverIcon v-if="iconName" :name="iconName" className="univer-size-4" />
      <span v-else class="univer-text-sm">{{ titleText }}</span>
    </button>

    <!-- SELECTOR / BUTTON_SELECTOR / SUBITEMS -->
    <div
      v-else
      class="univer-relative univer-inline-flex univer-items-center"
      :data-u-command="itemId"
      :data-disabled="disabled || readOnly"
      @click.stop
    >
      <!-- 主按钮：BUTTON_SELECTOR 才触发主命令；SELECTOR/SUBITEMS 主按钮只打开下拉 -->
      <div
        class="univer-animate-in univer-fade-in univer-group univer-relative univer-flex univer-h-6 univer-cursor-pointer univer-items-center univer-rounded univer-text-sm univer-transition-colors hover:univer-bg-gray-100 dark:hover:!univer-bg-gray-700"
        :class="selectorWrapClass"
        @click="handleSelectorPrimary"
      >
        <div
          class="univer-flex univer-h-full univer-items-center univer-gap-2 univer-whitespace-nowrap univer-rounded univer-px-1"
        >
          <span v-if="iconName" class="univer-relative univer-inline-flex univer-items-center univer-justify-center">
            <UniverIcon :name="iconName" className="univer-size-4" />
            <!-- 颜色按钮：用小色条替代 #RRGGBB 文本 -->
            <span
              v-if="isColorPicker && colorValue"
              class="univer-absolute univer-left-0 univer-right-0 univer-bottom-[-2px] univer-h-[2px] univer-rounded-full"
              :style="colorBarStyle"
            />
          </span>
          <span v-if="labelText" class="univer-text-sm univer-max-w-32 univer-truncate">{{ labelText }}</span>
          <span v-else-if="titleText" class="univer-text-sm univer-max-w-32 univer-truncate">{{ titleText }}</span>
        </div>

        <div
          class="univer-flex univer-h-full univer-w-5 univer-items-center univer-justify-center univer-rounded-r univer-transition-colors hover:univer-bg-gray-200 dark:hover:!univer-bg-gray-600"
          :class="selectorArrowClass"
          @click.stop="toggleDropdown"
        >
          <UniverIcon name="MoreDownIcon" className="univer-size-3" />
        </div>
      </div>

      <div
        v-if="dropdownOpen"
        class="univer-absolute univer-left-0 univer-top-7 univer-min-w-44 univer-rounded-md univer-border univer-border-gray-200 univer-bg-white univer-shadow-lg dark:!univer-border-gray-700 dark:!univer-bg-gray-900"
        :style="{ zIndex: 2147483647 }"
        @click.stop
      >
        <SpreadsheetColorPicker
          v-if="isColorPicker"
          :value="colorValue"
          @pick="pickColor"
        />
        <SpreadsheetBorderPicker
          v-else-if="isBorderPanel"
          :t="t"
          :border-info="borderInfoValue"
          @set-type="pickBorderType"
          @set-color="pickBorderColor"
          @set-style="pickBorderStyle"
        />
        <SpreadsheetNumfmtPicker
          v-else-if="isNumfmt"
          :t="t"
          @pick="applyNumfmt"
        />
        <SpreadsheetFontFamilyPicker
          v-else-if="isFontFamily"
          :injector="injector"
          :value="fontFamilyValue"
          :t="t"
          @pick="pickFontFamily"
        />
        <div v-else-if="itemType === MenuItemType.SUBITEMS" class="univer-grid univer-gap-1 univer-p-1">
          <button
            v-for="child in (props.schema?.children || [])"
            :key="child.key"
            type="button"
            class="univer-flex univer-w-full univer-items-center univer-gap-2 univer-rounded univer-px-2 univer-py-1 univer-text-left univer-text-sm univer-text-gray-800 hover:univer-bg-gray-100 dark:!univer-text-gray-200 dark:hover:!univer-bg-gray-700"
            :disabled="readOnly"
            @click="runSubItem(child)"
          >
            <UniverIcon v-if="child?.item?.icon" :name="child.item.icon" className="univer-size-4 univer-text-gray-500 dark:!univer-text-gray-300" />
            <span class="univer-flex-1 univer-truncate">{{ t(child?.item?.title || child?.item?.tooltip || child.key) }}</span>
          </button>
        </div>
        <div v-else class="univer-grid univer-max-h-80 univer-overflow-auto univer-gap-1 univer-p-1">
          <button
            v-for="(opt, idx) in selections"
            :key="String(opt?.id ?? opt?.value ?? idx)"
            type="button"
            class="univer-flex univer-w-full univer-items-center univer-gap-2 univer-rounded univer-px-2 univer-py-1 univer-text-left univer-text-sm univer-text-gray-800 hover:univer-bg-gray-100 dark:!univer-text-gray-200 dark:hover:!univer-bg-gray-700"
            :disabled="(disabled || readOnly) || !!opt?.disabled"
            @click="selectOption(opt)"
          >
            <UniverIcon v-if="opt?.icon" :name="opt.icon" className="univer-size-4 univer-text-gray-500 dark:!univer-text-gray-300" />
            <span class="univer-flex-1 univer-truncate">{{ optionLabel(opt) }}</span>
          </button>
        </div>
      </div>
    </div>
  </span>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MenuItemType } from '@univerjs/ui'
import { ICommandService, IUniverInstanceService, Range as UniverRange } from '@univerjs/core'
import { BorderStyleManagerService, SheetsSelectionsService, SetBorderColorCommand, SetBorderCommand, SetBorderPositionCommand, SetBorderStyleCommand } from '@univerjs/sheets'
import { SetCurrencyCommand, SetNumfmtCommand, SetPercentCommand } from '@univerjs/sheets-numfmt'
import UniverIcon from './UniverIcon.vue'
import SpreadsheetColorPicker from './SpreadsheetColorPicker.vue'
import SpreadsheetFontFamilyPicker from './SpreadsheetFontFamilyPicker.vue'
import SpreadsheetBorderPicker from './SpreadsheetBorderPicker.vue'
import SpreadsheetNumfmtPicker from './SpreadsheetNumfmtPicker.vue'

const props = defineProps({
  injector: { type: Object, required: true },
  schema: { type: Object, required: true },
  t: { type: Function, required: true },
  readOnly: { type: Boolean, default: false }
})

const item = computed(() => props.schema?.item || null)
const itemType = computed(() => item.value?.type)
const itemId = computed(() => item.value?.id || props.schema?.key || '')
const commandId = computed(() => item.value?.commandId || item.value?.id || '')

const disabled = ref(false)
const hidden = ref(false)
const activated = ref(false)
const value = ref(undefined)
const iconName = ref('')
const selections = ref([])
let subs = []

const unsubscribeAll = () => {
  subs.forEach((s) => {
    try {
      s?.unsubscribe?.()
    } catch {
      // ignore
    }
  })
  subs = []
}

const subscribeMaybe = (obs, setter) => {
  if (!obs || typeof obs.subscribe !== 'function') return
  try {
    subs.push(obs.subscribe((v) => setter(v)))
  } catch {
    // ignore
  }
}

const isComponentLabelName = (name) => {
  if (!name) return false
  const s = String(name)
  // Univer 里这些通常是“自定义组件”的注册 id，不是翻译 key
  return s.startsWith('UI_') || s.endsWith('_COMPONENT') || s.includes('_COMPONENT_')
}

const isColorPicker = computed(() => {
  const it = item.value
  if (!it) return false
  if (it.type !== MenuItemType.BUTTON_SELECTOR) return false

  const tip = String(it.tooltip || it.title || '')
  if (tip.includes('toolbar.textColor') || tip.includes('toolbar.fillColor')) return true

  const sel = it.selections
  if (Array.isArray(sel) && sel.length === 1) {
    const n = sel[0]?.label?.name
    if (typeof n === 'string' && n.includes('COLOR_PICKER')) return true
    if (isComponentLabelName(n) && String(n).includes('COLOR')) return true
  }
  return false
})

const isFontFamily = computed(() => {
  const it = item.value
  if (!it) return false
  return it.type === MenuItemType.SELECTOR && String(it.tooltip || it.title || '') === 'toolbar.font'
})

const isBorderPanel = computed(() => {
  const it = item.value
  if (!it) return false
  if (it.type !== MenuItemType.BUTTON_SELECTOR) return false
  const tip = String(it.tooltip || it.title || '')
  return tip === 'toolbar.border.main'
})

const isNumfmt = computed(() => {
  const it = item.value
  if (!it) return false
  if (it.type !== MenuItemType.SELECTOR) return false
  if (!it.slot) return false
  return String(it.tooltip || it.title || '') === 'sheet.numfmt.title'
})

const colorValue = computed(() => {
  const v = value.value
  return typeof v === 'string' ? v : ''
})

const fontFamilyValue = computed(() => {
  const v = value.value
  return typeof v === 'string' ? v : ''
})

const borderInfoValue = computed(() => {
  const v = value.value
  return v && typeof v === 'object' ? v : null
})

const tryResolveLabelObjectText = (labelObj) => {
  if (!labelObj || typeof labelObj !== 'object') return ''
  const name = labelObj.name
  if (!name || isComponentLabelName(name)) return ''

  // 有些 label 会把真正展示文本/翻译 key 放在 props 里
  const p = labelObj.props || {}
  const candidates = [p.label, p.text, p.title, p.key]
  for (const c of candidates) {
    if (typeof c === 'string' && c) return props.t(c)
  }

  // 如果 name 看起来像 i18n key（含点号），才当 key 翻译
  if (typeof name === 'string' && name.includes('.')) return props.t(name)
  return ''
}

const resolveLabel = (label) => {
  if (!label) return ''
  if (typeof label === 'string') return props.t(label)
  if (typeof label === 'object' && label.name) {
    // 自定义组件 label（例如 UI_FONT_FAMILY_COMPONENT）不应该当文本显示
    return tryResolveLabelObjectText(label)
  }
  return ''
}

const titleText = computed(() => {
  const ttl = item.value?.title
  if (!ttl) return ''
  return props.t(ttl)
})

const tooltipText = computed(() => {
  const tt = item.value?.tooltip
  if (!tt) return titleText.value || itemId.value
  return props.t(tt)
})

const labelText = computed(() => {
  // selector 常用 label 显示当前 value 的 label；否则退回 menu 的 label/title
  const lbl = resolveLabel(item.value?.label)
  if (lbl) return lbl

  const v = value.value
  if (v == null) return ''
  const opt = (selections.value || []).find((o) => String(o?.value) === String(v))
  if (opt) return optionLabel(opt)

  // 有图标的 selector：不要把内部 raw 值（如 0）当文本显示
  if (iconName.value) return ''

  if (typeof v === 'string' || typeof v === 'number') return String(v)
  if (typeof v === 'object') {
    // 避免显示 [object Object]
    const candidates = [v.label, v.text, v.title, v.name, v.value]
    for (const c of candidates) {
      if (typeof c === 'string' && c) return c
      if (typeof c === 'number') return String(c)
    }
    return ''
  }
  return ''
})

const colorBarStyle = computed(() => {
  const c = colorValue.value
  if (!c) return {}
  return { backgroundColor: c }
})

watch(
  item,
  () => {
    unsubscribeAll()
    disabled.value = false
    hidden.value = false
    activated.value = false
    value.value = undefined
    iconName.value = ''
    selections.value = []

    const it = item.value
    if (!it) return

    subscribeMaybe(it.disabled$, (v) => (disabled.value = !!v))
    subscribeMaybe(it.hidden$, (v) => (hidden.value = !!v))
    subscribeMaybe(it.activated$, (v) => (activated.value = !!v))
    subscribeMaybe(it.value$, (v) => (value.value = v))

    if (it.icon && typeof it.icon === 'string') iconName.value = it.icon
    subscribeMaybe(it.icon, (v) => (iconName.value = String(v || '')))

    // selector options
    const sel = it.selections
    if (Array.isArray(sel)) selections.value = sel
    subscribeMaybe(sel, (v) => (selections.value = Array.isArray(v) ? v : []))
  },
  { immediate: true }
)

const onDocClick = () => {
  dropdownOpen.value = false
}

onMounted(() => {
  // 冒泡阶段：组件内部用了 @click.stop，不会触发这里；点到外部才会关闭
  document.addEventListener('click', onDocClick, false)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick, false)
  unsubscribeAll()
})

const dropdownOpen = ref(false)
const toggleDropdown = () => {
  if (disabled.value || props.readOnly) return
  if (!dropdownOpen.value && isBorderPanel.value) {
    // 必须先把 activeBorderType 打开，否则 set-border 系列命令会直接返回 false
    try {
      props.injector?.get?.(BorderStyleManagerService)?.setActiveBorderType?.(true)
    } catch {
      // ignore
    }
  }
  dropdownOpen.value = !dropdownOpen.value
}

const buttonClass = computed(() => {
  // 直接复用 Univer 原生按钮 class（Io 组件）
  const base = `
univer-box-border univer-flex univer-h-6 univer-min-w-6 univer-cursor-pointer univer-items-center
univer-justify-center univer-rounded univer-border-none univer-bg-transparent univer-p-0
univer-text-gray-900 univer-outline-none univer-transition-colors univer-animate-in univer-fade-in
dark:!univer-text-white dark:hover:!univer-bg-gray-700 dark:disabled:!univer-text-gray-600
disabled:univer-cursor-not-allowed disabled:univer-text-gray-300 disabled:hover:univer-bg-transparent
hover:univer-bg-gray-100 whitespace-nowrap univer-w-max
  `.trim()
  const activeCls = activated.value ? '!univer-bg-gray-200 dark:!univer-bg-gray-500' : ''
  const noIcon = !iconName.value ? 'univer-px-2' : ''
  return [base, activeCls, noIcon].filter(Boolean).join(' ')
})

const selectorWrapClass = computed(() => {
  if (disabled.value || props.readOnly) {
    return 'univer-pointer-events-none univer-cursor-not-allowed univer-text-gray-300 dark:!univer-text-gray-600'
  }
  return 'univer-text-gray-900 dark:!univer-text-white'
})

const selectorArrowClass = computed(() => {
  if (disabled.value || props.readOnly) {
    return 'univer-pointer-events-none univer-cursor-not-allowed univer-text-gray-300 dark:!univer-text-gray-600'
  }
  return activated.value ? 'univer-bg-gray-200 dark:!univer-bg-gray-500' : ''
})

const exec = async (cmd, params) => {
  if (!cmd) return
  if (props.readOnly) return
  try {
    // 对齐原生：先把焦点交回工作表，否则部分命令看起来“没反应”
    const us = props.injector?.get?.(IUniverInstanceService)
    us?.focus?.()
    const cs = props.injector?.get?.(ICommandService)
    await cs?.executeCommand?.(cmd, params)
  } catch {
    // ignore
  }
}

const resolveParams = () => {
  const p = item.value?.params
  if (!p) return undefined
  if (typeof p === 'function') {
    try {
      return p()
    } catch {
      return undefined
    }
  }
  return p
}

const handleButtonClick = async () => {
  const it = item.value
  if (!it) return
  if (disabled.value || props.readOnly) return
  await exec(commandId.value, resolveParams())
}

const handleButtonDblClick = async () => {
  const it = item.value
  if (!it?.subId) return
  if (disabled.value || props.readOnly) return
  await exec(it.subId)
}

const handleSelectorPrimary = async () => {
  const it = item.value
  if (!it) return
  if (disabled.value || props.readOnly) return

  // BUTTON_SELECTOR：点击主体触发主命令；其他类型默认打开下拉
  if (it.type === MenuItemType.BUTTON_SELECTOR) {
    // 边框：原生主按钮是“应用当前边框设置”，不传 value 对象
    if (isBorderPanel.value) {
      try {
        props.injector?.get?.(BorderStyleManagerService)?.setActiveBorderType?.(true)
      } catch {
        // ignore
      }
      await exec(SetBorderCommand.id)
      return
    }
    const cid = it.commandId || it.id
    await exec(cid, { value: value.value })
    return
  }

  dropdownOpen.value = true
}

const pickColor = async (c) => {
  const it = item.value
  if (!it) return
  if (disabled.value || props.readOnly) return

  const cid = it.commandId || it.id
  await exec(cid, { value: c || '' })
  dropdownOpen.value = false
}

const pickFontFamily = async (v) => {
  const it = item.value
  if (!it) return
  if (disabled.value || props.readOnly) return

  const cid = it.commandId || it.id
  await exec(cid, { value: v || '' })
  dropdownOpen.value = false
}

const borderTypeMap = (t) => {
  if (t === 'bltr') return 'bl_tr'
  return t
}

const pickBorderType = async (t) => {
  if (disabled.value || props.readOnly) return
  try {
    props.injector?.get?.(BorderStyleManagerService)?.setActiveBorderType?.(true)
  } catch {
    // ignore
  }
  await exec(SetBorderPositionCommand.id, { value: borderTypeMap(t) })
}

const pickBorderColor = async (c) => {
  if (disabled.value || props.readOnly) return
  try {
    props.injector?.get?.(BorderStyleManagerService)?.setActiveBorderType?.(true)
  } catch {
    // ignore
  }
  await exec(SetBorderColorCommand.id, { value: c || '' })
}

const pickBorderStyle = async (s) => {
  if (disabled.value || props.readOnly) return
  try {
    props.injector?.get?.(BorderStyleManagerService)?.setActiveBorderType?.(true)
  } catch {
    // ignore
  }
  await exec(SetBorderStyleCommand.id, { value: Number(s) })
}

const applyNumfmt = async (kind) => {
  if (props.readOnly) return
  try {
    const sel = props.injector?.get?.(SheetsSelectionsService)
    const selections = sel?.getCurrentSelections?.() || []
    const ranges = selections.map((s) => s.range).filter(Boolean)
    if (!ranges.length) return

    if (kind === 'more') {
      await exec(itemId.value)
      dropdownOpen.value = false
      return
    }

    if (kind === 'percent') {
      await exec(SetPercentCommand.id)
      dropdownOpen.value = false
      return
    }

    if (kind === 'currency') {
      await exec(SetCurrencyCommand.id)
      dropdownOpen.value = false
      return
    }

    const patternMap = {
      general: null,
      text: '@',
      number: '#,##0.00',
      scientific: '0.00E+00',
      date: 'yyyy/m/d',
      time: 'h:mm:ss',
      dateTime: 'yyyy/m/d h:mm:ss'
    }
    const pattern = Object.prototype.hasOwnProperty.call(patternMap, kind) ? patternMap[kind] : null

    const values = []
    for (const r of ranges) {
      UniverRange.foreach(r, (row, col) => {
        if (pattern) values.push({ row, col, pattern })
        else values.push({ row, col })
      })
    }

    await exec(SetNumfmtCommand.id, { values })
  } catch {
    // ignore
  } finally {
    dropdownOpen.value = false
  }
}

const runSubItem = async (childSchema) => {
  const child = childSchema?.item
  if (!child) return
  if (props.readOnly) return
  const cid = child.commandId || child.id
  const params =
    typeof child.params === 'function'
      ? (() => {
          try {
            return child.params()
          } catch {
            return undefined
          }
        })()
      : child.params
  await exec(cid, params)
  dropdownOpen.value = false
}

const optionLabel = (opt) => {
  if (!opt) return ''
  if (typeof opt.label === 'string') return props.t(opt.label)
  if (typeof opt.label === 'object') {
    const r = tryResolveLabelObjectText(opt.label)
    if (r) return r
  }

  // tooltip 往往就是给下拉项展示用的
  if (typeof opt.tooltip === 'string' && opt.tooltip) {
    const r = props.t(opt.tooltip)
    if (r) return r
  }

  // value 可能是 key / 或者对象
  const v = opt.value
  if (typeof v === 'string') {
    const tr = props.t(v)
    if (tr && tr !== v) return tr
    if (v.includes('.')) return v.split('.').at(-1) || ''
    return v
  }
  if (typeof v === 'number') return String(v)
  if (v && typeof v === 'object') {
    const candidates = [v.label, v.text, v.title, v.name, v.value]
    for (const c of candidates) {
      if (typeof c === 'string' && c) return c
      if (typeof c === 'number') return String(c)
    }
  }
  return ''
}

const selectOption = async (opt) => {
  const it = item.value
  if (!it) return
  if (disabled.value || props.readOnly) return
  if (opt?.disabled) return

  // 对齐原生执行顺序：优先 option 自己的 id/commandId，其次 item 的 selectionsCommandId，再到 item.commandId / item.id
  const fallbackCmd = it.selectionsCommandId || it.commandId || it.id
  const cmd = opt?.id || opt?.commandId || fallbackCmd

  let v = opt?.value
  // 兼容 value 里包了一层对象的情况
  if (v && typeof v === 'object' && 'value' in v) v = v.value

  await exec(cmd, { value: v })
  dropdownOpen.value = false
}
</script>

