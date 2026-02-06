<template>
  <div class="univer-box-border univer-w-72 univer-p-2">
    <div class="univer-pb-2">
      <input
        v-model="q"
        class="univer-box-border univer-h-7 univer-w-full univer-rounded univer-border univer-border-solid univer-border-gray-200 univer-bg-transparent univer-px-2 univer-text-sm univer-text-gray-700 univer-outline-none dark:!univer-border-gray-700 dark:!univer-text-gray-200"
        placeholder="搜索字体"
        @keydown.stop
      />
    </div>

    <div class="univer-max-h-72 univer-overflow-auto univer-rounded univer-border univer-border-solid univer-border-gray-100 dark:!univer-border-gray-800">
      <ul class="univer-m-0 univer-list-none univer-p-1 univer-text-sm">
        <li v-for="f in filtered" :key="f.value">
          <button
            type="button"
            class="univer-flex univer-h-7 univer-w-full univer-appearance-none univer-items-center univer-justify-between univer-gap-6 univer-rounded univer-border-none univer-bg-transparent univer-px-2 hover:univer-bg-gray-100 dark:!univer-text-white dark:hover:!univer-bg-gray-700"
            :class="f.value === value ? 'univer-bg-gray-100 dark:!univer-bg-gray-700' : ''"
            :style="{ fontFamily: f.value }"
            @click="pick(f.value)"
          >
            <span class="univer-truncate">{{ t(f.label) }}</span>
            <span class="univer-text-xs univer-text-gray-400">{{ f.value }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { IFontService } from '@univerjs/ui'

const props = defineProps({
  injector: { type: Object, required: true },
  value: { type: String, default: '' },
  t: { type: Function, required: true }
})

const emit = defineEmits(['pick'])

const q = ref('')
const fonts = ref([])
let sub = null

onMounted(() => {
  try {
    const fs = props.injector?.get?.(IFontService)
    if (!fs) return
    fonts.value = Array.isArray(fs.getFonts?.()) ? fs.getFonts() : []
    if (fs.fonts$?.subscribe) sub = fs.fonts$.subscribe((v) => (fonts.value = Array.isArray(v) ? v : []))
  } catch {
    // ignore
  }
})

onBeforeUnmount(() => {
  try {
    sub?.unsubscribe?.()
  } catch {
    // ignore
  } finally {
    sub = null
  }
})

const filtered = computed(() => {
  const all = fonts.value || []
  const kw = (q.value || '').trim().toLowerCase()
  if (!kw) return all
  return all.filter((f) => {
    const label = (props.t(f.label) || '').toLowerCase()
    const v = String(f.value || '').toLowerCase()
    return label.includes(kw) || v.includes(kw)
  })
})

const pick = (v) => emit('pick', v)
</script>

