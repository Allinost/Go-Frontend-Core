<template>
  <header class="admin-header">
    <div class="admin-header__left">
      <NkBreadcrumb v-if="breadcrumbs.length" :items="breadcrumbs" />
    </div>
    <div class="admin-header__right">
      <NkAvatar :text="authStore.username" size="sm" />
      <span class="admin-header__username">{{ authStore.username }}</span>
      <NkButton size="sm" variant="ghost" @click="appStore.toggleTheme()">
        <NkIcon :name="appStore.theme === 'light' ? 'moon' : 'sun'" />
      </NkButton>
      <NkButton size="sm" variant="ghost" @click="handleLogout">退出</NkButton>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()

const breadcrumbs = computed(() => {
  const items: { label: string; to?: string }[] = []
  if (route.meta.title) {
    items.push({ label: route.meta.title as string })
  }
  return items
})

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<style lang="scss" scoped>
.admin-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $nk-spacing-xl;
  background: $nk-color-neutral-0;
  border-bottom: 1px solid $nk-color-neutral-200;

  &__left {
    display: flex;
    align-items: center;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
  }

  &__username {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-700;
  }
}
</style>
