<template>
  <div class="univer-box-border univer-w-64 univer-p-2">
    <div class="univer-flex univer-items-center univer-justify-between univer-gap-2 univer-pb-2">
      <div class="univer-flex univer-items-center univer-gap-2">
        <span
          class="univer-inline-flex univer-h-5 univer-w-5 univer-rounded univer-border univer-border-solid univer-border-gray-200 dark:!univer-border-gray-700"
          :style="{ backgroundColor: normalized || '#FFFFFF' }"
        />
        <span class="univer-text-xs univer-text-gray-600 dark:!univer-text-gray-300">
          {{ normalized || '无' }}
        </span>
      </div>
      <button
        type="button"
        class="univer-rounded univer-border univer-border-solid univer-border-gray-200 univer-bg-white univer-px-2 univer-py-1 univer-text-xs univer-text-gray-700 hover:univer-bg-gray-50 dark:!univer-border-gray-700 dark:!univer-bg-gray-900 dark:!univer-text-gray-200 dark:hover:!univer-bg-gray-800"
        @click="emitPick('')"
      >
        清除
      </button>
    </div>

    <div class="univer-grid univer-content-center univer-gap-2">
      <div
        v-for="(row, rIdx) in PRESETS"
        :key="rIdx"
        class="univer-grid univer-grid-flow-col univer-items-center univer-justify-between univer-gap-2"
      >
        <button
          v-for="(c, cIdx) in row"
          :key="cIdx"
          type="button"
          class="univer-box-border univer-h-5 univer-w-5 univer-cursor-pointer univer-rounded-full univer-border univer-border-solid univer-border-transparent univer-bg-gray-300 univer-transition-shadow"
          :class="c.toUpperCase() === (normalized || '').toUpperCase() ? 'univer-ring-2 univer-ring-offset-2 univer-ring-offset-white dark:!univer-ring-primary-600 dark:!univer-ring-offset-gray-600' : ''"
          :style="{ backgroundColor: c }"
          @click="emitPick(c)"
        />
      </div>
    </div>

    <div class="univer-pt-2">
      <div class="univer-flex univer-items-center univer-gap-2">
        <input
          v-model="hexInput"
          class="univer-box-border univer-h-7 univer-flex-1 univer-rounded univer-border univer-border-solid univer-border-gray-200 univer-bg-transparent univer-px-2 univer-text-sm univer-text-gray-700 univer-outline-none dark:!univer-border-gray-700 dark:!univer-text-gray-200"
          placeholder="#RRGGBB"
          @keydown.enter.prevent="commitHex"
          @blur="commitHex"
        />
        <button
          type="button"
          class="univer-rounded univer-bg-primary-600 univer-px-2 univer-py-1 univer-text-xs univer-text-white hover:univer-bg-primary-700 disabled:univer-cursor-not-allowed disabled:univer-bg-gray-300"
          :disabled="!isValidHex"
          @click="commitHex"
        >
          应用
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const PRESETS = [
  ['#FFFFFF', '#E1EFFE', '#FDE8E8', '#FEECDC', '#FFF4B9', '#DEF7EC', '#D5F5F6', '#EDEBFE', '#FCE8F3'],
  ['#CDD0D8', '#A4CAFE', '#F8B4B4', '#FDBA8C', '#FAC815', '#84E1BC', '#7EDCE2', '#CABFFD', '#F8B4D9'],
  ['#979DAC', '#3F83F8', '#F05252', '#FF5A1F', '#D49D0F', '#0DA471', '#0694A2', '#9061F9', '#E74694'],
  ['#414657', '#1A56DB', '#C81E1E', '#B43403', '#9A6D15', '#046C4E', '#036672', '#6C2BD9', '#BF125D'],
  ['#000000', '#233876', '#771D1D', '#771D1D', '#634312', '#014737', '#014451', '#4A1D96', '#751A3D']
]

const props = defineProps({
  value: { type: String, default: '' }
})

const emit = defineEmits(['pick'])

const normalized = computed(() => {
  const v = (props.value || '').trim()
  if (!v) return ''
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toUpperCase()
  return v
})

const hexInput = ref('')
watch(
  () => props.value,
  (v) => {
    hexInput.value = (v || '').toString()
  },
  { immediate: true }
)

const toHex = (s) => {
  const raw = String(s || '').trim()
  if (!raw) return ''
  const t = raw.startsWith('#') ? raw : `#${raw}`
  return t.toUpperCase()
}

const isValidHex = computed(() => /^#[0-9A-F]{6}$/.test(toHex(hexInput.value)))

const emitPick = (color) => {
  emit('pick', color || '')
}

const commitHex = () => {
  const c = toHex(hexInput.value)
  if (!/^#[0-9A-F]{6}$/.test(c)) return
  emitPick(c)
}
</script>

