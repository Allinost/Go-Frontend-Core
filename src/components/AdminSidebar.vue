<template>
  <aside class="admin-sidebar" :class="{ 'admin-sidebar--collapsed': collapsed }">
    <div class="admin-sidebar__logo">
      <span class="admin-sidebar__logo-text">{{ collapsed ? 'G' : 'Go 管理后台' }}</span>
    </div>
    <nav class="admin-sidebar__nav">
      <div
        v-for="item in filteredMenus"
        :key="item.path"
        class="admin-sidebar__item"
        :class="{
          'admin-sidebar__item--active': isActive(item.path),
          'admin-sidebar__item--collapsed': collapsed,
        }"
        @click="navigate(item)"
      >
        <NkIcon v-if="item.icon" :name="item.icon" size="sm" />
        <span v-show="!collapsed" class="admin-sidebar__item-label">{{ item.label }}</span>
      </div>
    </nav>
    <div class="admin-sidebar__footer">
      <div class="admin-sidebar__item" @click="toggle">
        <NkIcon :name="collapsed ? 'arrow-right' : 'arrow-left'" size="sm" />
        <span v-show="!collapsed" class="admin-sidebar__item-label">折叠</span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'

interface MenuItem {
  label: string
  path: string
  icon: string
  requiresAdmin?: boolean
}

const menus: MenuItem[] = [
  { label: '仪表盘', path: '/dashboard', icon: 'home' },
  { label: '用户管理', path: '/users', icon: 'user', requiresAdmin: true },
  { label: '角色权限', path: '/roles', icon: 'shield', requiresAdmin: true },
  { label: '加密工具', path: '/modules/crypto', icon: 'lock' },
  { label: '商品管理', path: '/modules/zzz/goodser', icon: 'search' },
  { label: '任务调度', path: '/modules/schedule', icon: 'clock' },
  { label: '文件存储', path: '/storage', icon: 'folder' },
  { label: '网络工具', path: '/modules/net', icon: 'globe' },
  { label: '数据库迁移', path: '/modules/migrate', icon: 'database' },
]

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const authStore = useAuthStore()

const collapsed = computed(() => appStore.sidebarCollapsed)

const filteredMenus = computed(() =>
  menus.filter((item) => {
    if (item.requiresAdmin && !authStore.isAdmin) return false
    return true
  }),
)

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}

function navigate(item: MenuItem) {
  router.push(item.path)
}

function toggle() {
  appStore.toggleSidebar()
}
</script>

<style lang="scss" scoped>
.admin-sidebar {
  width: 220px;
  min-height: 100vh;
  background: $nk-color-neutral-0;
  border-right: 1px solid $nk-color-neutral-200;
  display: flex;
  flex-direction: column;
  transition: width $nk-duration-normal;
  overflow: hidden;

  &--collapsed {
    width: 56px;
  }

  &__logo {
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid $nk-color-neutral-200;
    flex-shrink: 0;
  }

  &__logo-text {
    font-weight: $nk-font-weight-bold;
    font-size: $nk-font-size-lg;
    color: $nk-color-primary-600;
    white-space: nowrap;
  }

  &__nav {
    flex: 1;
    padding: $nk-spacing-sm;
    overflow-y: auto;
  }

  &__footer {
    border-top: 1px solid $nk-color-neutral-200;
    padding: $nk-spacing-sm;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    padding: $nk-spacing-sm $nk-spacing-md;
    border-radius: $nk-radius-md;
    cursor: pointer;
    color: $nk-color-neutral-600;
    transition: all $nk-duration-fast;
    white-space: nowrap;
    margin-bottom: 2px;

    &:hover {
      background: $nk-color-neutral-100;
      color: $nk-color-neutral-900;
    }

    &--active {
      background: $nk-color-primary-50;
      color: $nk-color-primary-600;
      font-weight: $nk-font-weight-medium;
    }

    &--collapsed {
      justify-content: center;
      padding: $nk-spacing-sm;
    }
  }

  &__item-label {
    font-size: $nk-font-size-base;
  }
}
</style>
