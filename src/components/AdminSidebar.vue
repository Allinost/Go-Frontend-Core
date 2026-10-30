<template>
  <aside class="admin-sidebar" :class="{ 'admin-sidebar--collapsed': collapsed }">
    <div class="admin-sidebar__logo">
      <span class="admin-sidebar__logo-text">{{ collapsed ? 'M' : 'Monitor Controller' }}</span>
    </div>
    <nav class="admin-sidebar__nav">
      <div
        v-for="item in topItems"
        :key="item.path"
        class="admin-sidebar__item"
        :class="{ 'admin-sidebar__item--active': isActive(item.path), 'admin-sidebar__item--collapsed': collapsed }"
        @click="navigate(item)"
      >
        <NkIcon v-if="item.icon" :name="item.icon" size="sm" />
        <span v-show="!collapsed" class="admin-sidebar__item-label">{{ item.label }}</span>
      </div>

      <div v-for="group in filteredGroups" :key="group.label" class="admin-sidebar__group">
        <div
          class="admin-sidebar__group-header"
          :class="{ 'admin-sidebar__item--collapsed': collapsed }"
          @click="toggleGroup(group.label)"
        >
          <NkIcon v-if="group.icon" :name="group.icon" size="sm" />
          <span v-show="!collapsed" class="admin-sidebar__item-label">{{ group.label }}</span>
          <NkIcon v-show="!collapsed" :name="expandedGroups[group.label] ? 'arrow-up' : 'arrow-down'" size="xs" class="admin-sidebar__group-arrow" />
        </div>
        <div v-show="!collapsed && expandedGroups[group.label]" class="admin-sidebar__group-children">
          <div
            v-for="child in group.children"
            :key="child.path"
            class="admin-sidebar__item admin-sidebar__item--child"
            :class="{ 'admin-sidebar__item--active': isActive(child.path) }"
            @click="navigate(child)"
          >
            <span class="admin-sidebar__item-label">{{ child.label }}</span>
          </div>
        </div>
      </div>
    </nav>
    <div class="admin-sidebar__footer">
      <div class="admin-sidebar__item" :class="{ 'admin-sidebar__item--collapsed': collapsed }" @click="toggle">
        <NkIcon :name="collapsed ? 'arrow-right' : 'arrow-left'" size="sm" />
        <span v-show="!collapsed" class="admin-sidebar__item-label">折叠</span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'

interface MenuItem {
  label: string
  path: string
  requiresAdmin?: boolean
}

interface MenuGroup {
  label: string
  icon: string
  children: MenuItem[]
}

const topItems: (MenuItem & { icon: string })[] = [
  { label: '仪表盘', path: '/dashboard', icon: 'home' },
]

const menuGroups: (MenuGroup & { requiresAdmin?: boolean })[] = [
  {
    label: '用户管理',
    icon: 'user',
    children: [
      { label: '用户管理', path: '/users', requiresAdmin: true },
      { label: '角色权限', path: '/roles', requiresAdmin: true },
      { label: '第三方登录', path: '/users/login3rd' },
    ],
  },
  {
    label: '业务模块',
    icon: 'search',
    children: [
      { label: '项目开发管理', path: '/modules/zzz/developmentmanager' },
      { label: '投资分析', path: '/modules/zzz/ia' },
      { label: 'Goodser', path: '/modules/zzz/goodser' },
      { label: 'ShopChecker', path: '/modules/zzz/shopchecker/products' },
    ],
  },
  {
    label: '运维管理',
    icon: 'file',
    children: [
      { label: '加密工具', path: '/modules/crypto' },
      { label: '任务调度', path: '/modules/schedule' },
      { label: '文件存储', path: '/storage' },
      { label: '网络工具', path: '/modules/net' },
      { label: '服务导航', path: '/modules/servicenav' },
      { label: '数据库迁移', path: '/modules/migrate' },
      { label: 'Webhook', path: '/webhook' },
    ],
  },
]

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const authStore = useAuthStore()

const collapsed = computed(() => appStore.sidebarCollapsed)

const filteredGroups = computed(() =>
  menuGroups.filter((g) => {
    if (g.requiresAdmin && !authStore.isAdmin) return false
    if (g.children.every((c) => c.requiresAdmin && !authStore.isAdmin)) return false
    return true
  }),
)

function isActive(path: string): boolean {
  return route.path === path
}

function navigate(item: MenuItem) {
  router.push(item.path)
}

function toggle() {
  appStore.toggleSidebar()
}

const expandedGroups = reactive<Record<string, boolean>>(
  Object.fromEntries(menuGroups.map((g) => [g.label, true])),
)

function toggleGroup(label: string) {
  expandedGroups[label] = !expandedGroups[label]
}

function isGroupActive(group: MenuGroup): boolean {
  return group.children.some((c) => isActive(c.path))
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

    &--child {
      padding-left: $nk-spacing-xl;
      font-size: $nk-font-size-sm;
    }
  }

  &__item-label {
    font-size: $nk-font-size-base;
  }

  &__group {
    margin-top: $nk-spacing-xs;

    &-header {
      display: flex;
      align-items: center;
      gap: $nk-spacing-sm;
      padding: $nk-spacing-sm $nk-spacing-md;
      border-radius: $nk-radius-md;
      cursor: pointer;
      color: $nk-color-neutral-600;
      transition: all $nk-duration-fast;
      margin-bottom: 2px;

      &:hover {
        background: $nk-color-neutral-100;
        color: $nk-color-neutral-900;
      }
    }

    &-arrow {
      margin-left: auto;
      transition: transform $nk-duration-fast;
    }

    &-children {
      overflow: hidden;
      transition: max-height $nk-duration-normal;
    }
  }
}
</style>
