<template>
  <section class="univer-box-border univer-grid univer-gap-2 univer-p-2">
    <div
      class="univer-box-border univer-grid univer-grid-cols-5 univer-gap-2 univer-text-gray-600 dark:!univer-text-gray-200"
    >
      <button
        v-for="opt in BORDER_TYPES"
        :key="opt.value"
        type="button"
        class="univer-flex univer-size-6 univer-cursor-pointer univer-items-center univer-justify-center univer-justify-self-center univer-rounded hover:univer-bg-gray-100 dark:hover:!univer-bg-gray-700"
        :class="isActiveType(opt.value) ? 'univer-bg-gray-200 dark:!univer-bg-gray-600' : ''"
        :title="t(opt.label)"
        @click="emitSetType(opt.value)"
      >
        <UniverIcon :name="opt.icon" className="univer-size-4" />
      </button>
    </div>

    <div class="univer-h-px univer-w-full univer-bg-gray-100 dark:!univer-bg-gray-800" />

    <div class="univer-grid univer-gap-2">
      <div class="univer-flex univer-items-center univer-justify-between univer-gap-2">
        <span class="univer-text-xs univer-text-gray-500 dark:!univer-text-gray-300">线条颜色</span>
        <div class="univer-flex univer-items-center univer-gap-2">
          <span
            class="univer-inline-flex univer-h-4 univer-w-8 univer-rounded univer-border univer-border-solid univer-border-gray-200 dark:!univer-border-gray-700"
            :style="{ backgroundColor: currentColor || '#000000' }"
          />
          <button
            type="button"
            class="univer-rounded univer-border univer-border-solid univer-border-gray-200 univer-bg-white univer-px-2 univer-py-1 univer-text-xs univer-text-gray-700 hover:univer-bg-gray-50 dark:!univer-border-gray-700 dark:!univer-bg-gray-900 dark:!univer-text-gray-200 dark:hover:!univer-bg-gray-800"
            @click="colorOpen = !colorOpen"
          >
            选择
          </button>
        </div>
      </div>

      <div v-if="colorOpen" class="univer-rounded-md univer-border univer-border-solid univer-border-gray-100 dark:!univer-border-gray-800">
        <SpreadsheetColorPicker :value="currentColor" @pick="emitSetColor" />
      </div>
    </div>

    <div class="univer-h-px univer-w-full univer-bg-gray-100 dark:!univer-bg-gray-800" />

    <div class="univer-grid univer-gap-2">
      <div class="univer-flex univer-items-center univer-justify-between">
        <span class="univer-text-xs univer-text-gray-500 dark:!univer-text-gray-300">线条样式</span>
      </div>
      <div class="univer-grid univer-grid-cols-2 univer-gap-2">
        <button
          v-for="st in BORDER_STYLES"
          :key="st.value"
          type="button"
          class="univer-flex univer-items-center univer-justify-between univer-rounded univer-border univer-border-solid univer-border-gray-200 univer-bg-white univer-px-2 univer-py-1.5 univer-text-xs univer-text-gray-700 hover:univer-bg-gray-50 dark:!univer-border-gray-700 dark:!univer-bg-gray-900 dark:!univer-text-gray-200 dark:hover:!univer-bg-gray-800"
          :class="isActiveStyle(st.value) ? 'univer-ring-2 univer-ring-primary-200 dark:!univer-ring-primary-600' : ''"
          @click="emitSetStyle(st.value)"
        >
          <span>{{ st.label }}</span>
          <span class="univer-ml-2 univer-flex-1 univer-border-b" :style="st.previewStyle" />
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import SpreadsheetColorPicker from './SpreadsheetColorPicker.vue'
import UniverIcon from './UniverIcon.vue'

const props = defineProps({
  t: { type: Function, required: true },
  borderInfo: { type: Object, default: null }
})

const emit = defineEmits(['set-type', 'set-color', 'set-style'])

// 参考 @univerjs/sheets-ui 内部的 BORDER_LINE_CHILDREN（我们手写，避免依赖 React 组件）
const BORDER_TYPES = [
  { label: 'borderLine.borderTop', icon: 'UpBorderDoubleIcon', value: 'top' },
  { label: 'borderLine.borderBottom', icon: 'DownBorderDoubleIcon', value: 'bottom' },
  { label: 'borderLine.borderLeft', icon: 'LeftBorderDoubleIcon', value: 'left' },
  { label: 'borderLine.borderRight', icon: 'RightBorderDoubleIcon', value: 'right' },
  { label: 'borderLine.borderNone', icon: 'NoBorderIcon', value: 'none' },
  { label: 'borderLine.borderAll', icon: 'AllBorderIcon', value: 'all' },
  { label: 'borderLine.borderOutside', icon: 'OuterBorderDoubleIcon', value: 'outside' },
  { label: 'borderLine.borderInside', icon: 'InnerBorderDoubleIcon', value: 'inside' },
  { label: 'borderLine.borderHorizontal', icon: 'HorizontalBorderDoubleIcon', value: 'horizontal' },
  { label: 'borderLine.borderVertical', icon: 'VerticalBorderDoubleIcon', value: 'vertical' },
  { label: 'borderLine.borderTlbr', icon: 'BackSlashDoubleIcon', value: 'tlbr' },
  { label: 'borderLine.borderBlTr', icon: 'SlashDoubleIcon', value: 'bltr' }
]

const colorOpen = ref(false)

const currentType = computed(() => String(props.borderInfo?.type || ''))
const currentColor = computed(() => String(props.borderInfo?.color || ''))
const currentStyle = computed(() => Number(props.borderInfo?.style ?? 1))

const normalizeType = (t) => {
  // 兼容 sheets-ui 内部用的 bltr / core 用的 bl_tr
  if (t === 'bltr') return 'bl_tr'
  return t
}

const isActiveType = (t) => normalizeType(t) === normalizeType(currentType.value)
const isActiveStyle = (v) => Number(v) === Number(currentStyle.value)

const BORDER_STYLES = [
  { label: '细线', value: 1, previewStyle: { borderBottomStyle: 'solid', borderBottomWidth: '1px', borderBottomColor: '#111827' } },
  { label: '虚线', value: 4, previewStyle: { borderBottomStyle: 'dashed', borderBottomWidth: '1px', borderBottomColor: '#111827' } },
  { label: '点线', value: 3, previewStyle: { borderBottomStyle: 'dotted', borderBottomWidth: '1px', borderBottomColor: '#111827' } },
  { label: '双线', value: 7, previewStyle: { borderBottomStyle: 'double', borderBottomWidth: '3px', borderBottomColor: '#111827' } }
]

const emitSetType = (t) => emit('set-type', t)
const emitSetColor = (c) => emit('set-color', c)
const emitSetStyle = (s) => emit('set-style', s)
</script>

