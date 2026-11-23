<template>
  <aside
    class="admin-sidebar"
    :class="{ 'admin-sidebar--collapsed': collapsed, 'admin-sidebar--mobile-open': mobileOpen }"
  >
    <div class="admin-sidebar__logo">
      <span class="admin-sidebar__logo-text">{{ collapsed ? 'M' : 'Monitor Controller' }}</span>
    </div>
    <div v-show="!collapsed" class="admin-sidebar__search">
      <NkInput v-model="searchQuery" size="sm" placeholder="搜索菜单" clearable />
    </div>
    <nav class="admin-sidebar__nav">
      <div
        v-for="item in store.visibleTopItems"
        :key="item.id"
        class="admin-sidebar__item"
        :class="{ 'admin-sidebar__item--active': isActive(item.path), 'admin-sidebar__item--collapsed': collapsed }"
        @click="navigate(item)"
      >
        <NkIcon v-if="item.icon" :name="item.icon" size="sm" />
        <span v-show="!collapsed" class="admin-sidebar__item-label">{{ item.label }}</span>
      </div>

      <div v-for="group in navGroups" :key="group.id" class="admin-sidebar__group">
        <div
          class="admin-sidebar__group-header"
          :class="{ 'admin-sidebar__item--collapsed': collapsed }"
          @click="toggleGroup(group.id)"
        >
          <NkIcon v-if="group.icon" :name="group.icon" size="sm" />
          <span v-show="!collapsed" class="admin-sidebar__item-label">{{ group.label }}</span>
          <NkIcon v-show="!collapsed" :name="groupExpanded(group) ? 'arrow-up' : 'arrow-down'" size="xs" class="admin-sidebar__group-arrow" />
        </div>
        <div v-show="!collapsed && groupExpanded(group)" class="admin-sidebar__group-children">
          <div
            v-for="child in group.items"
            :key="child.id"
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
      <div v-if="authStore.isAdmin" class="admin-sidebar__item" :class="{ 'admin-sidebar__item--collapsed': collapsed }" @click="showEditor = true">
        <NkIcon name="file" size="sm" />
        <span v-show="!collapsed" class="admin-sidebar__item-label">编辑导航</span>
      </div>
      <div class="admin-sidebar__item" :class="{ 'admin-sidebar__item--collapsed': collapsed }" @click="toggle">
        <NkIcon :name="collapsed ? 'arrow-right' : 'arrow-left'" size="sm" />
        <span v-show="!collapsed" class="admin-sidebar__item-label">折叠</span>
      </div>
    </div>
    <SidebarEditorDialog v-model:visible="showEditor" />
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useSidebarStore } from '@/stores/sidebar'
import SidebarEditorDialog from './SidebarEditorDialog.vue'
import type { SidebarGroupConfig, SidebarItemConfig } from '@/types/sidebar'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const authStore = useAuthStore()
const store = useSidebarStore()

const props = defineProps<{
  mobileOpen?: boolean
}>()

const emit = defineEmits<{
  (e: 'navigate'): void
}>()

const searchQuery = ref('')
const showEditor = ref(false)

const collapsed = computed(() => appStore.sidebarCollapsed && !props.mobileOpen)

const navGroups = computed<SidebarGroupConfig[]>(() => {
  const groups = [store.favoriteGroup, ...store.visibleGroups].filter(
    (group): group is SidebarGroupConfig => !!group,
  )
  const keyword = searchQuery.value.trim().toLowerCase()
  if (!keyword) return groups
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(keyword) ||
          item.path.toLowerCase().includes(keyword),
      ),
    }))
    .filter(
      (group) =>
        group.label.toLowerCase().includes(keyword) || group.items.length > 0,
    )
})

function isActive(path: string): boolean {
  return route.path === path
}

function navigate(item: SidebarItemConfig) {
  router.push(item.path)
  emit('navigate')
}

function toggle() {
  appStore.toggleSidebar()
}

function toggleGroup(groupId: string) {
  if (searchQuery.value.trim()) return
  store.toggleGroup(groupId)
}

function groupExpanded(group: SidebarGroupConfig) {
  if (searchQuery.value.trim()) return true
  return store.isExpanded(group.id)
}
</script>

<style lang="scss" scoped>
.admin-sidebar {
  width: 224px;
  min-height: 100vh;
  background:
    linear-gradient(180deg, color-mix(in srgb, $nk-color-neutral-0 92%, $nk-color-primary-50), $nk-color-neutral-0 42%);
  border-right: 1px solid color-mix(in srgb, $nk-color-neutral-300 50%, transparent);
  display: flex;
  flex-direction: column;
  transition: width $nk-duration-normal;
  overflow: hidden;

  &--collapsed {
    width: 58px;
  }

  &__logo {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid color-mix(in srgb, $nk-color-neutral-300 45%, transparent);
    flex-shrink: 0;
  }

  &__logo-text {
    font-weight: $nk-font-weight-bold;
    font-size: $nk-font-size-lg;
    color: $nk-color-primary-600;
    white-space: nowrap;
    letter-spacing: -0.02em;
  }

  &__search {
    padding: $nk-spacing-md $nk-spacing-sm 0;
  }

  &__nav {
    flex: 1;
    padding: $nk-spacing-sm;
    overflow-y: auto;
  }

  &__footer {
    border-top: 1px solid color-mix(in srgb, $nk-color-neutral-300 45%, transparent);
    padding: $nk-spacing-sm;
    background: color-mix(in srgb, $nk-color-neutral-0 65%, transparent);
  }

  &__item {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    padding: 9px $nk-spacing-md;
    border-radius: $nk-radius-md;
    cursor: pointer;
    color: $nk-color-neutral-600;
    transition: background $nk-duration-fast, color $nk-duration-fast, transform $nk-duration-fast;
    white-space: nowrap;
    margin-bottom: 2px;
    position: relative;

    &:hover {
      background: color-mix(in srgb, $nk-color-neutral-100 80%, transparent);
      color: $nk-color-neutral-900;
      transform: translateX(1px);
    }

    &--active {
      background: linear-gradient(90deg, color-mix(in srgb, $nk-color-primary-500 14%, transparent), color-mix(in srgb, $nk-color-primary-500 6%, transparent));
      color: $nk-color-primary-700;
      font-weight: $nk-font-weight-medium;

      &::before {
        content: '';
        position: absolute;
        left: 3px;
        top: 8px;
        bottom: 8px;
        width: 3px;
        border-radius: 999px;
        background: linear-gradient(180deg, $nk-color-primary-500, $nk-color-accent);
      }
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
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__group {
    margin-top: 4px;

    &-header {
      display: flex;
      align-items: center;
      gap: $nk-spacing-sm;
      padding: 9px $nk-spacing-md;
      border-radius: $nk-radius-md;
      cursor: pointer;
      color: $nk-color-neutral-600;
      transition: background $nk-duration-fast, color $nk-duration-fast;
      margin-bottom: 2px;
      font-weight: $nk-font-weight-medium;

      &:hover {
        background: color-mix(in srgb, $nk-color-neutral-100 80%, transparent);
        color: $nk-color-neutral-900;
      }
    }

    &-arrow {
      margin-left: auto;
      transition: transform $nk-duration-fast;
      opacity: 0.7;
    }

    &-children {
      overflow: hidden;
      transition: max-height $nk-duration-normal;
    }
  }

  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: 240px;
    z-index: 1041;
    transform: translateX(-100%);
    transition: transform $nk-duration-normal;
    box-shadow: $nk-shadow-lg;

    &--collapsed {
      width: 240px;
    }

    &--mobile-open {
      transform: translateX(0);
    }

    &__footer {
      display: none;
    }
  }
}
</style>
