import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getAccessToken, clearAuth } from '@/utils/auth'

export function createAuthGuard(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    const authStore = useAuthStore()

    if (!authStore.initialized && getAccessToken()) {
      try {
        await authStore.init()
      } catch {
        clearAuth()
        next('/login')
        return
      }
    }

    if (to.meta.requiresAuth === false) {
      if (authStore.isLoggedIn && to.path === '/login') {
        next('/')
        return
      }
      next()
      return
    }

    if (!authStore.isLoggedIn) {
      next('/login')
      return
    }

    if (to.meta.requiresAdmin && !authStore.isAdmin) {
      next('/')
      return
    }

    next()
  })
}
