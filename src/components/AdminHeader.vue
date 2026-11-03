<template>
  <header class="admin-header">
    <div class="admin-header__left">
      <NkButton
        class="admin-header__menu"
        size="sm"
        variant="ghost"
        aria-label="打开导航菜单"
        title="打开导航菜单"
        @click="emit('toggle-sidebar')"
      >
        <NkIcon name="menu" />
      </NkButton>
      <NkBreadcrumb v-if="breadcrumbs.length" :items="breadcrumbs" />
    </div>
    <div class="admin-header__right">
      <NkButton
        size="sm"
        variant="ghost"
        aria-label="打开设置"
        title="设置"
        @click="settingsVisible = true"
      >设置</NkButton>
      <NkAvatar :text="authStore.username" size="sm" />
      <span class="admin-header__username">{{ authStore.username }}</span>
      <NkButton
        size="sm"
        variant="ghost"
        :aria-label="appStore.theme === 'light' ? '切换到深色主题' : '切换到浅色主题'"
        :title="appStore.theme === 'light' ? '切换到深色主题' : '切换到浅色主题'"
        @click="appStore.toggleTheme()"
      >
        <NkIcon :name="appStore.theme === 'light' ? 'moon' : 'sun'" />
      </NkButton>
      <NkButton size="sm" variant="ghost" @click="handleLogout">退出</NkButton>
    </div>
    <SettingsDialog v-model:visible="settingsVisible" />
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useRoute } from 'vue-router'
import SettingsDialog from './SettingsDialog.vue'

const settingsVisible = ref(false)

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

const emit = defineEmits<{
  (e: 'toggle-sidebar'): void
}>()

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

  &__menu {
    display: none;
  }

  // 用后代选择器提高优先级，覆盖 NkButton 的 display:inline-flex。
  & &__menu {
    display: none;
  }

  @media (max-width: 768px) {
    padding: 0 $nk-spacing-md;

    & &__menu {
      display: inline-flex;
      margin-right: 4px;
    }

    & &__menu[hidden] {
      display: none;
    }

    &__username {
      display: none;
    }
  }
}
</style>
