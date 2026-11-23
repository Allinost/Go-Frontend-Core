import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import type {
  SidebarConfig,
  SidebarGroupConfig,
  SidebarItemConfig,
  SidebarPermission,
} from '@/types/sidebar'

const STORAGE_KEY = 'go_admin_sidebar_config_v1'

function defaultConfig(): SidebarConfig {
  return {
    version: 1,
    topItems: [
      { id: '/dashboard', label: '仪表盘', path: '/dashboard', icon: 'home', visible: true, permission: 'all' },
    ],
    groups: [
      {
        id: 'user',
        label: '用户管理',
        icon: 'user',
        visible: true,
        defaultExpanded: true,
        items: [
          { id: '/users', label: '用户管理', path: '/users', visible: true, permission: 'admin' },
          { id: '/roles', label: '角色权限', path: '/roles', visible: true, permission: 'admin' },
          { id: '/users/login3rd', label: '第三方登录', path: '/users/login3rd', visible: true, permission: 'all' },
        ],
      },
      {
        id: 'business',
        label: '业务模块',
        icon: 'search',
        visible: true,
        defaultExpanded: true,
        items: [
          { id: '/modules/zzz/developmentmanager', label: '项目开发管理', path: '/modules/zzz/developmentmanager', visible: true, permission: 'all' },
          { id: '/modules/zzz/ia', label: '投资分析', path: '/modules/zzz/ia', visible: true, permission: 'all' },
          { id: '/modules/zzz/goodser', label: 'Goodser', path: '/modules/zzz/goodser', visible: true, permission: 'all' },
          { id: '/modules/zzz/integration', label: '集成管理', path: '/modules/zzz/integration', visible: true, permission: 'all' },
          { id: '/modules/zzz/shopchecker/products', label: 'ShopChecker', path: '/modules/zzz/shopchecker/products', visible: true, permission: 'all' },
        ],
      },
      {
        id: 'ops',
        label: '运维管理',
        icon: 'file',
        visible: true,
        defaultExpanded: true,
        items: [
          { id: '/modules/zzz/containers', label: '容器管理', path: '/modules/zzz/containers', visible: true, permission: 'all' },
          { id: '/modules/crypto', label: '加密工具', path: '/modules/crypto', visible: true, permission: 'all' },
          { id: '/modules/schedule', label: '任务调度', path: '/modules/schedule', visible: true, permission: 'all' },
          { id: '/storage', label: '文件存储', path: '/storage', visible: true, permission: 'all' },
          { id: '/modules/net', label: '网络工具', path: '/modules/net', visible: true, permission: 'all' },
          { id: '/modules/servicenav', label: '服务导航', path: '/modules/servicenav', visible: true, permission: 'all' },
          { id: '/modules/migrate', label: '数据库迁移', path: '/modules/migrate', visible: true, permission: 'all' },
          { id: '/ops/hosts', label: '主机台账', path: '/ops/hosts', visible: true, permission: 'admin' },
          { id: '/ops/maintenance', label: '系统维护', path: '/ops/maintenance', visible: true, permission: 'admin' },
          { id: '/ops/status', label: '系统状态', path: '/ops/status', visible: true, permission: 'admin' },
          { id: '/settings/config', label: '配置中心', path: '/settings/config', visible: true, permission: 'admin' },
          { id: '/webhook', label: 'Webhook', path: '/webhook', visible: true, permission: 'all' },
        ],
      },
    ],
    favoriteGroup: {
      label: '常用功能',
      icon: 'file',
      visible: true,
      defaultExpanded: true,
    },
    favorites: [
      '/modules/zzz/developmentmanager',
      '/ops/status',
      '/settings/config',
      '/storage',
    ],
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function loadConfig(): SidebarConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultConfig()
    const parsed = JSON.parse(raw) as SidebarConfig
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.groups)) {
      return defaultConfig()
    }
    return parsed
  } catch {
    return defaultConfig()
  }
}

export const useSidebarStore = defineStore('sidebar', () => {
  const auth = useAuthStore()
  const config = ref<SidebarConfig>(loadConfig())
  const expanded = reactive<Record<string, boolean>>({})

  function syncExpanded() {
    expanded['favorites'] = config.value.favoriteGroup.defaultExpanded
    for (const group of config.value.groups) {
      if (!(group.id in expanded)) {
        expanded[group.id] = group.defaultExpanded
      }
    }
  }
  syncExpanded()

  watch(
    config,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        // localStorage 不可用时仅保留内存配置
      }
    },
    { deep: true },
  )

  function canAccess(permission: SidebarPermission) {
    if (permission === 'all') return true
    if (permission === 'admin') return auth.isAdmin
    return auth.isLoggedIn
  }

  const allItems = computed<Record<string, SidebarItemConfig>>(() => {
    const map: Record<string, SidebarItemConfig> = {}
    for (const item of config.value.topItems) map[item.id] = item
    for (const group of config.value.groups) {
      for (const item of group.items) map[item.id] = item
    }
    return map
  })

  const visibleTopItems = computed(() =>
    config.value.topItems.filter((item) => item.visible && canAccess(item.permission)),
  )

  const visibleGroups = computed(() =>
    config.value.groups
      .filter((group) => group.visible)
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.visible && canAccess(item.permission)),
      }))
      .filter((group) => group.items.length > 0),
  )

  const favoriteGroup = computed(() => {
    if (!config.value.favoriteGroup.visible) return null
    const items = config.value.favorites
      .map((id) => allItems.value[id])
      .filter((item): item is SidebarItemConfig => !!item)
      .filter((item) => item.visible && canAccess(item.permission))
    if (items.length === 0) return null
    return {
      id: 'favorites',
      label: config.value.favoriteGroup.label,
      icon: config.value.favoriteGroup.icon,
      visible: true,
      defaultExpanded: config.value.favoriteGroup.defaultExpanded,
      items,
    } as SidebarGroupConfig
  })

  function isExpanded(groupId: string) {
    return !!expanded[groupId]
  }

  function toggleGroup(groupId: string) {
    expanded[groupId] = !expanded[groupId]
  }

  function setGroupExpanded(groupId: string, value: boolean) {
    expanded[groupId] = value
  }

  function setGroupDefaultExpanded(groupId: string, value: boolean) {
    const group = config.value.groups.find((g) => g.id === groupId)
    if (group) {
      group.defaultExpanded = value
      expanded[groupId] = value
    }
  }

  function renameGroup(groupId: string, label: string) {
    const group = config.value.groups.find((g) => g.id === groupId)
    if (group) group.label = label
  }

  function setFavoriteDefaultExpanded(value: boolean) {
    config.value.favoriteGroup.defaultExpanded = value
    expanded['favorites'] = value
  }

  function toggleGroupVisible(groupId: string) {
    const group = config.value.groups.find((g) => g.id === groupId)
    if (group) group.visible = !group.visible
  }

  function toggleFavoriteVisible() {
    config.value.favoriteGroup.visible = !config.value.favoriteGroup.visible
  }

  function toggleItemVisible(groupId: string, itemId: string) {
    const item = findItem(groupId, itemId)
    if (item) item.visible = !item.visible
  }

  function setItemPermission(groupId: string, itemId: string, permission: SidebarPermission) {
    const item = findItem(groupId, itemId)
    if (item) item.permission = permission
  }

  function moveGroup(groupId: string, delta: number) {
    const groups = config.value.groups
    const index = groups.findIndex((g) => g.id === groupId)
    const next = index + delta
    if (index < 0 || next < 0 || next >= groups.length) return
    const [group] = groups.splice(index, 1)
    groups.splice(next, 0, group)
  }

  function moveItem(groupId: string, itemId: string, delta: number) {
    const group = config.value.groups.find((g) => g.id === groupId)
    if (!group) return
    const index = group.items.findIndex((i) => i.id === itemId)
    const next = index + delta
    if (index < 0 || next < 0 || next >= group.items.length) return
    const [item] = group.items.splice(index, 1)
    group.items.splice(next, 0, item)
  }

  function moveItemToGroup(itemId: string, fromGroupId: string, toGroupId: string) {
    if (!toGroupId || fromGroupId === toGroupId) return
    const from = config.value.groups.find((g) => g.id === fromGroupId)
    const to = config.value.groups.find((g) => g.id === toGroupId)
    if (!from || !to) return
    const index = from.items.findIndex((i) => i.id === itemId)
    if (index < 0) return
    const [item] = from.items.splice(index, 1)
    to.items.push(item)
  }

  function toggleFavorite(itemId: string) {
    const list = config.value.favorites
    const index = list.indexOf(itemId)
    if (index >= 0) list.splice(index, 1)
    else list.push(itemId)
  }

  function isFavorite(itemId: string) {
    return config.value.favorites.includes(itemId)
  }

  function findItem(groupId: string, itemId: string) {
    const group = config.value.groups.find((g) => g.id === groupId)
    return group?.items.find((i) => i.id === itemId)
  }

  function reset() {
    config.value = defaultConfig()
    for (const key of Object.keys(expanded)) delete expanded[key]
    syncExpanded()
  }

  return {
    config,
    expanded,
    visibleTopItems,
    visibleGroups,
    favoriteGroup,
    allItems,
    canAccess,
    isExpanded,
    toggleGroup,
    setGroupExpanded,
    setGroupDefaultExpanded,
    setFavoriteDefaultExpanded,
    renameGroup,
    toggleGroupVisible,
    toggleFavoriteVisible,
    toggleItemVisible,
    setItemPermission,
    moveGroup,
    moveItem,
    moveItemToGroup,
    toggleFavorite,
    isFavorite,
    reset,
  }
})
