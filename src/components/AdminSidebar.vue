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
    <nav class="admin-sidebar__nav" role="navigation" aria-label="主导航">
      <div
        v-for="item in store.visibleTopItems"
        :key="item.id"
        class="admin-sidebar__item admin-sidebar__item--top"
        :class="{ 'admin-sidebar__item--active': isItemActive(item), 'admin-sidebar__item--collapsed': collapsed }"
        :title="collapsed ? item.label : undefined"
        :aria-current="isItemActive(item) ? 'page' : undefined"
        @click="navigate(item)"
      >
        <NkIcon v-if="item.icon" :name="item.icon" size="sm" />
        <span v-show="!collapsed" class="admin-sidebar__item-label">{{ item.label }}</span>
      </div>

      <div
        v-for="group in navGroups"
        :key="group.id"
        class="admin-sidebar__group"
        :class="{ 'admin-sidebar__group--active': groupHasActive(group) }"
      >
        <button
          type="button"
          class="admin-sidebar__group-header"
          :class="{ 'admin-sidebar__item--collapsed': collapsed }"
          :title="collapsed ? group.label : undefined"
          :aria-expanded="groupExpanded(group)"
          @click="toggleGroup(group.id)"
        >
          <span class="admin-sidebar__icon-chip">
            <NkIcon v-if="group.icon" :name="group.icon" size="sm" />
          </span>
          <span v-show="!collapsed" class="admin-sidebar__group-label">{{ group.label }}</span>
          <span v-show="!collapsed && group.items.length" class="admin-sidebar__count">{{ group.items.length }}</span>
          <NkIcon
            v-show="!collapsed"
            name="arrow-down"
            size="xs"
            class="admin-sidebar__group-arrow"
            :class="{ 'is-open': groupExpanded(group) }"
          />
        </button>
        <div
          v-show="!collapsed"
          class="admin-sidebar__group-children"
          :class="{ 'is-open': groupExpanded(group) }"
        >
          <div class="admin-sidebar__group-children-inner">
            <div
              v-for="child in group.items"
              :key="child.id"
              class="admin-sidebar__item admin-sidebar__item--child"
              :class="{ 'admin-sidebar__item--active': isItemActive(child) }"
              :aria-current="isItemActive(child) ? 'page' : undefined"
              @click="navigate(child)"
            >
              <span class="admin-sidebar__child-dot" />
              <NkIcon v-if="child.icon" :name="child.icon" size="xs" />
              <span class="admin-sidebar__item-label">{{ child.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
    <div class="admin-sidebar__footer">
      <div
        v-if="authStore.isAdmin"
        class="admin-sidebar__item admin-sidebar__item--footer"
        :class="{ 'admin-sidebar__item--collapsed': collapsed }"
        :title="collapsed ? '编辑导航' : undefined"
        @click="showEditor = true"
      >
        <NkIcon name="settings" size="sm" />
        <span v-show="!collapsed" class="admin-sidebar__item-label">编辑导航</span>
      </div>
      <div
        class="admin-sidebar__item admin-sidebar__item--footer"
        :class="{ 'admin-sidebar__item--collapsed': collapsed }"
        :title="collapsed ? '折叠侧边栏' : undefined"
        @click="toggle"
      >
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

const allNavItems = computed<SidebarItemConfig[]>(() => {
  const items = [...store.visibleTopItems]
  for (const group of navGroups.value) items.push(...group.items)
  return items
})

// 选择路径最长匹配的菜单项，避免 /users 与 /users/login3rd 同时高亮
const activeItem = computed<SidebarItemConfig | undefined>(() => {
  return allNavItems.value
    .filter((item) => route.path === item.path || route.path.startsWith(item.path + '/'))
    .sort((a, b) => b.path.length - a.path.length)[0]
})

function isItemActive(item: SidebarItemConfig): boolean {
  return activeItem.value?.id === item.id
}

function groupHasActive(group: SidebarGroupConfig): boolean {
  return group.items.some((item) => isItemActive(item))
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
  width: 232px;
  min-height: 100vh;
  background:
    linear-gradient(180deg, color-mix(in srgb, $nk-color-neutral-0 92%, $nk-color-primary-50), $nk-color-neutral-0 42%);
  border-right: 1px solid color-mix(in srgb, $nk-color-neutral-300 50%, transparent);
  display: flex;
  flex-direction: column;
  transition: width $nk-duration-normal;
  overflow: hidden;

  &--collapsed {
    width: 60px;
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
    overscroll-behavior: contain;
  }

  &__footer {
    border-top: 1px solid color-mix(in srgb, $nk-color-neutral-300 45%, transparent);
    padding: $nk-spacing-sm;
    background: color-mix(in srgb, $nk-color-neutral-0 65%, transparent);
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 10px;
    border-radius: 9px;
    cursor: pointer;
    color: $nk-color-neutral-600;
    transition: background $nk-duration-fast, color $nk-duration-fast, transform $nk-duration-fast;
    white-space: nowrap;
    margin-bottom: 2px;
    position: relative;
    user-select: none;

    &:hover {
      background: color-mix(in srgb, $nk-color-neutral-100 78%, transparent);
      color: $nk-color-neutral-900;
      transform: translateX(1px);
    }

    &:focus-visible {
      outline: 2px solid color-mix(in srgb, $nk-color-primary-500 60%, transparent);
      outline-offset: 1px;
    }

    &--top {
      font-weight: 500;
    }

    &--active {
      background: linear-gradient(90deg, color-mix(in srgb, $nk-color-primary-500 15%, transparent), color-mix(in srgb, $nk-color-primary-500 5%, transparent));
      color: $nk-color-primary-700;
      font-weight: 600;

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
      padding: 9px 0;
    }

    &--footer {
      color: $nk-color-neutral-500;
      font-size: 13px;
    }

    &--child {
      padding: 7px 10px 7px 14px;
      margin-left: 20px;
      font-size: 13px;
      color: $nk-color-neutral-500;

      &:hover {
        transform: none;
      }

      &.admin-sidebar__item--active {
        &::before {
          display: none;
        }
      }
    }
  }

  &__item-label {
    font-size: 13.5px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__icon-chip {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: $nk-color-neutral-500;
    background: color-mix(in srgb, $nk-color-neutral-100 65%, transparent);
    transition: background $nk-duration-fast, color $nk-duration-fast, box-shadow $nk-duration-fast;
  }

  &__group {
    margin-top: 3px;

    & + & {
      border-top: 1px solid color-mix(in srgb, $nk-color-neutral-300 22%, transparent);
      padding-top: 3px;
    }

    &-header {
      width: 100%;
      border: 0;
      background: transparent;
      font-family: inherit;
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 8px 10px;
      border-radius: 9px;
      cursor: pointer;
      color: $nk-color-neutral-600;
      transition: background $nk-duration-fast, color $nk-duration-fast;
      margin-bottom: 2px;
      text-align: left;

      &:hover {
        background: color-mix(in srgb, $nk-color-neutral-100 72%, transparent);
        color: $nk-color-neutral-900;

        .admin-sidebar__icon-chip {
          color: $nk-color-primary-600;
          background: color-mix(in srgb, $nk-color-primary-500 10%, transparent);
        }
      }

      &:focus-visible {
        outline: 2px solid color-mix(in srgb, $nk-color-primary-500 60%, transparent);
        outline-offset: 1px;
      }
    }

    &--active &-header {
      color: $nk-color-primary-700;

      .admin-sidebar__icon-chip {
        color: $nk-color-primary-600;
        background: color-mix(in srgb, $nk-color-primary-500 12%, transparent);
        box-shadow: inset 0 0 0 1px color-mix(in srgb, $nk-color-primary-500 18%, transparent);
      }
    }

    &-label {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.01em;
    }

    &-arrow {
      margin-left: auto;
      transition: transform $nk-duration-fast;
      opacity: 0.55;

      &.is-open {
        transform: rotate(180deg);
      }
    }

    &-children {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 0.22s ease;
      overflow: hidden;

      &.is-open {
        grid-template-rows: 1fr;
      }
    }

    &-children-inner {
      min-height: 0;
      position: relative;
      padding: 2px 0 4px;

      &::before {
        content: '';
        position: absolute;
        left: 28px;
        top: 6px;
        bottom: 6px;
        width: 1px;
        background: color-mix(in srgb, $nk-color-neutral-300 45%, transparent);
        border-radius: 1px;
      }
    }
  }

  &__count {
    margin-left: auto;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: $nk-color-neutral-500;
    background: color-mix(in srgb, $nk-color-neutral-100 75%, transparent);
    font-variant-numeric: tabular-nums;
  }

  &__child-dot {
    width: 5px;
    height: 5px;
    border-radius: 999px;
    flex-shrink: 0;
    background: color-mix(in srgb, $nk-color-neutral-400 55%, transparent);
    position: relative;
    z-index: 1;
    transition: background $nk-duration-fast, box-shadow $nk-duration-fast;
  }

  &__item--child.admin-sidebar__item--active &__child-dot {
    background: $nk-color-primary-500;
    box-shadow: 0 0 0 3px color-mix(in srgb, $nk-color-primary-500 16%, transparent);
  }

  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: 248px;
    z-index: 1041;
    transform: translateX(-100%);
    transition: transform $nk-duration-normal;
    box-shadow: $nk-shadow-lg;

    &--collapsed {
      width: 248px;
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
