import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // State
  const username = ref('')
  const avatar = ref('')
  const isLoggedIn = ref(false)

  // Getters
  const userInfo = computed(() => ({
    username: username.value,
    avatar: avatar.value
  }))

  // Actions
  function login(usernameParam, avatarParam) {
    username.value = usernameParam
    avatar.value = avatarParam
    isLoggedIn.value = true
  }

  function logout() {
    username.value = ''
    avatar.value = ''
    isLoggedIn.value = false
  }

  return {
    username,
    avatar,
    isLoggedIn,
    userInfo,
    login,
    logout
  }
}, {
  persist: true
})
