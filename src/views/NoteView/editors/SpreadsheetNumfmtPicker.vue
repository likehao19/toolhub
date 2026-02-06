<template>
  <div class="univer-box-border univer-w-56 univer-p-1.5">
    <button
      v-for="opt in options"
      :key="opt.key"
      type="button"
      class="univer-flex univer-h-7 univer-w-full univer-items-center univer-justify-between univer-gap-6 univer-rounded univer-px-2 univer-text-left univer-text-sm univer-text-gray-800 hover:univer-bg-gray-100 dark:!univer-text-gray-200 dark:hover:!univer-bg-gray-700"
      @click="pick(opt.action)"
    >
      <span class="univer-truncate">{{ t(opt.key) }}</span>
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  t: { type: Function, required: true }
})

const emit = defineEmits(['pick'])

const options = [
  { key: 'sheet.numfmt.general', action: 'general' },
  { key: 'sheet.numfmt.text', action: 'text' },
  { key: 'sheet.numfmt.number', action: 'number' },
  { key: 'sheet.numfmt.percent', action: 'percent' },
  { key: 'sheet.numfmt.scientific', action: 'scientific' },
  { key: 'sheet.numfmt.currency', action: 'currency' },
  { key: 'sheet.numfmt.date', action: 'date' },
  { key: 'sheet.numfmt.time', action: 'time' },
  { key: 'sheet.numfmt.dateTime', action: 'dateTime' },
  { key: 'sheet.numfmt.moreFmt', action: 'more' }
]

const pick = (action) => emit('pick', action)
</script>

