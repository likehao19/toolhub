import { ref, watch } from 'vue'

const STORAGE_KEY = 'favorite-tools'

// 模块级单例，跨组件共享
const favoriteTools = ref(
  JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
)

watch(favoriteTools, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

export function useFavoriteTools() {
  const toggleFavorite = (tool) => {
    const idx = favoriteTools.value.findIndex(t => t.id === tool.id)
    if (idx === -1) {
      favoriteTools.value.push({ id: tool.id, name: tool.name, icon: tool.icon, enabled: tool.enabled })
    } else {
      favoriteTools.value.splice(idx, 1)
    }
  }

  const isFavorite = (toolId) => favoriteTools.value.some(t => t.id === toolId)

  return { favoriteTools, toggleFavorite, isFavorite }
}
