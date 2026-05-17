<template>
  <svg
    v-if="hasIcon"
    class="tool-icon-svg"
    :class="categoryClass"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="iconContent"
  />
  <span v-else class="tool-icon-fallback">{{ fallback }}</span>
</template>

<script setup>
import { computed } from 'vue'
import { TOOL_ICONS, CATEGORY_ICONS, hasToolIcon, hasCategoryIcon, getCategoryOf } from '@/utils/toolIcons'

const props = defineProps({
  id: { type: String, required: true },
  type: { type: String, default: 'tool' }, // 'tool' | 'category'
  fallback: { type: String, default: '' },
})

const map = computed(() => (props.type === 'category' ? CATEGORY_ICONS : TOOL_ICONS))
const has = computed(() => (props.type === 'category' ? hasCategoryIcon : hasToolIcon))
const hasIcon = computed(() => has.value(props.id))
const iconContent = computed(() => map.value[props.id] || '')
// 工具图标按所属分类着色;分类图标本身按 id 着色(category id 等于颜色 key)
const colorKey = computed(() => (props.type === 'category' ? props.id : getCategoryOf(props.id)))
const categoryClass = computed(() => (colorKey.value ? `tool-icon--${colorKey.value}` : ''))
</script>

<style scoped>
.tool-icon-svg {
  width: 1em;
  height: 1em;
  display: block;
  color: currentColor;
}
.tool-icon-fallback {
  font-size: 1em;
  line-height: 1;
}

.tool-icon--note         { color: var(--tool-color-note); }
.tool-icon--dev          { color: var(--tool-color-dev); }
.tool-icon--git          { color: var(--tool-color-git); }
.tool-icon--network      { color: var(--tool-color-network); }
.tool-icon--test         { color: var(--tool-color-test); }
.tool-icon--database     { color: var(--tool-color-database); }
.tool-icon--dataAnalysis { color: var(--tool-color-dataAnalysis); }
.tool-icon--image        { color: var(--tool-color-image); }
.tool-icon--system       { color: var(--tool-color-system); }
</style>
