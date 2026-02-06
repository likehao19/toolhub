/**
 * 数据懒加载 Composable
 */
import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 使用懒加载
 * @param {Function} loadFn - 加载函数
 * @param {Object} options - 选项
 */
export function useLazyLoad(loadFn, options = {}) {
  const {
    pageSize = 20,
    threshold = 100, // 距离底部多少像素时触发加载
    immediate = true
  } = options

  const loading = ref(false)
  const finished = ref(false)
  const data = ref([])
  const page = ref(1)

  const load = async () => {
    if (loading.value || finished.value) {
      return
    }

    loading.value = true
    try {
      const result = await loadFn(page.value, pageSize)
      
      if (Array.isArray(result)) {
        if (result.length === 0) {
          finished.value = true
        } else {
          data.value = page.value === 1 ? result : [...data.value, ...result]
          if (result.length < pageSize) {
            finished.value = true
          } else {
            page.value++
          }
        }
      } else if (result && Array.isArray(result.data)) {
        // 支持 { data: [], total: number } 格式
        if (result.data.length === 0) {
          finished.value = true
        } else {
          data.value = page.value === 1 ? result.data : [...data.value, ...result.data]
          if (result.data.length < pageSize || data.value.length >= (result.total || Infinity)) {
            finished.value = true
          } else {
            page.value++
          }
        }
      }
    } catch (e) { /* ignore */ } finally {
      loading.value = false
    }
  }

  const reset = () => {
    page.value = 1
    data.value = []
    finished.value = false
    load()
  }

  const loadMore = () => {
    if (!finished.value && !loading.value) {
      load()
    }
  }

  // 滚动监听
  const handleScroll = () => {
    const scrollElement = options.scrollElement || window
    const scrollTop = scrollElement === window 
      ? window.pageYOffset || document.documentElement.scrollTop
      : scrollElement.scrollTop
    
    const scrollHeight = scrollElement === window
      ? document.documentElement.scrollHeight
      : scrollElement.scrollHeight
    
    const clientHeight = scrollElement === window
      ? window.innerHeight
      : scrollElement.clientHeight

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      loadMore()
    }
  }

  onMounted(() => {
    if (immediate) {
      load()
    }
    
    if (options.enableScroll) {
      const scrollElement = options.scrollElement || window
      scrollElement.addEventListener('scroll', handleScroll)
    }
  })

  onUnmounted(() => {
    if (options.enableScroll) {
      const scrollElement = options.scrollElement || window
      scrollElement.removeEventListener('scroll', handleScroll)
    }
  })

  return {
    data,
    loading,
    finished,
    load,
    loadMore,
    reset
  }
}

