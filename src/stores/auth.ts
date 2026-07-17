import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo } from '@/types/api'
import { login as loginApi, getCurrentUser, logout as logoutApi } from '@/api/auth'
import { setTokens, getAccessToken, clearAuth, setStoredUser, getStoredUser } from '@/utils/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null)
  const loading = ref(false)
  const initialized = ref(false)

  const isLoggedIn = computed(() => user.value !== null && !!getAccessToken())
  const isAdmin = computed(() => user.value?.roles?.includes('admin') ?? false)
  const username = computed(() => user.value?.username ?? '')

  async function init() {
    const token = getAccessToken()
    if (!token) {
      initialized.value = true
      return
    }
    try {
      const stored = getStoredUser()
      if (stored) {
        user.value = JSON.parse(stored)
      }
      const res = await getCurrentUser()
      user.value = res.data
      setStoredUser(JSON.stringify(res.data))
    } catch {
      clearAuth()
      user.value = null
    } finally {
      initialized.value = true
    }
  }

  async function login(username: string, password: string) {
    loading.value = true
    try {
      const res = await loginApi({ username, password })
      setTokens(res.data.access_token, res.data.refresh_token)
      const userRes = await getCurrentUser()
      user.value = userRes.data
      setStoredUser(JSON.stringify(userRes.data))
      initialized.value = true
      return true
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await logoutApi()
    } catch {
    } finally {
      clearAuth()
      user.value = null
    }
  }

  return { user, loading, initialized, isLoggedIn, isAdmin, username, init, login, logout }
})
