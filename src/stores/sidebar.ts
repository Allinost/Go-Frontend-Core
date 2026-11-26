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
const CONFIG_VERSION = 2
export const OTHER_GROUP_ID = 'other'

function item(
  id: string,
  label: string,
  path: string,
  permission: SidebarPermission = 'all',
): SidebarItemConfig {
  return { id, label, path, visible: true, permission }
}

function defaultConfig(): SidebarConfig {
  return {
    version: CONFIG_VERSION,
    topItems: [
      item('/dashboard', '仪表盘', '/dashboard'),
    ],
    groups: [
      {
        id: 'user',
        label: '用户管理',
        icon: 'user',
        visible: true,
        defaultExpanded: true,
        system: true,
        items: [
          item('/users', '用户管理', '/users', 'admin'),
          item('/roles', '角色权限', '/roles', 'admin'),
          item('/users/login3rd', '第三方登录', '/users/login3rd'),
        ],
      },
      {
        id: 'business',
        label: '业务模块',
        icon: 'layers',
        visible: true,
        defaultExpanded: true,
        system: true,
        items: [
          item('/modules/zzz/developmentmanager', '项目开发管理', '/modules/zzz/developmentmanager'),
          item('/modules/zzz/ia', '投资分析', '/modules/zzz/ia'),
          item('/modules/zzz/goodser', 'Goodser', '/modules/zzz/goodser'),
          item('/modules/zzz/integration', '集成管理', '/modules/zzz/integration'),
          item('/modules/zzz/shopchecker/products', 'ShopChecker', '/modules/zzz/shopchecker/products'),
        ],
      },
      {
        id: 'hardware',
        label: '硬件运维',
        icon: 'server',
        visible: true,
        defaultExpanded: true,
        system: true,
        items: [
          item('/modules/zzz/containers', '容器管理', '/modules/zzz/containers'),
          item('/ops/hosts', '主机台账', '/ops/hosts', 'admin'),
          item('/ops/maintenance', '系统维护', '/ops/maintenance', 'admin'),
          item('/ops/status', '系统状态', '/ops/status', 'admin'),
        ],
      },
      {
        id: 'software',
        label: '软件运维',
        icon: 'code',
        visible: true,
        defaultExpanded: true,
        system: true,
        items: [
          item('/modules/schedule', '任务调度', '/modules/schedule'),
          item('/webhook', 'Webhook', '/webhook'),
          item('/modules/servicenav', '服务导航', '/modules/servicenav'),
        ],
      },
      {
        id: 'data',
        label: '数据运维',
        icon: 'database',
        visible: true,
        defaultExpanded: true,
        system: true,
        items: [
          item('/storage', '文件存储', '/storage'),
          item('/modules/migrate', '数据库迁移', '/modules/migrate'),
          item('/settings/config', '配置中心', '/settings/config', 'admin'),
        ],
      },
      {
        id: 'tools',
        label: '工具组件',
        icon: 'tools',
        visible: true,
        defaultExpanded: true,
        system: true,
        items: [
          item('/modules/crypto', '加密工具', '/modules/crypto'),
          item('/modules/net', '网络工具', '/modules/net'),
        ],
      },
      {
        id: OTHER_GROUP_ID,
        label: '其他',
        icon: 'grid',
        visible: true,
        defaultExpanded: true,
        system: true,
        items: [],
      },
    ],
    favoriteGroup: {
      label: '常用功能',
      icon: 'star',
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

function migrateConfig(raw: any): SidebarConfig {
  const next = defaultConfig()
  if (!raw || !Array.isArray(raw.groups)) return next

  // v1 -> v2：保留菜单项可见性/权限，未知功能统一放入「其他」
  const oldItems: SidebarItemConfig[] = []
  for (const top of raw.topItems || []) oldItems.push(top)
  for (const group of raw.groups || []) {
    for (const entry of group.items || []) oldItems.push(entry)
  }

  const byPath = new Map<string, SidebarItemConfig>()
  for (const group of next.groups) {
    for (const entry of group.items) byPath.set(entry.path, entry)
  }

  const other = next.groups.find((group) => group.id === OTHER_GROUP_ID)!
  for (const old of oldItems) {
    if (!old || !old.path) continue
    const target = byPath.get(old.path)
    if (target) {
      target.visible = old.visible !== false
      if (old.permission) target.permission = old.permission
      if (old.label) target.label = old.label
      continue
    }
    if (other.items.some((entry) => entry.path === old.path)) continue
    other.items.push({
      id: old.id || old.path,
      label: old.label || old.path,
      path: old.path,
      icon: old.icon,
      visible: old.visible !== false,
      permission: (old.permission as SidebarPermission) || 'all',
    })
  }

  if (Array.isArray(raw.favorites)) {
    const valid = new Set<string>()
    for (const group of next.groups) {
      for (const entry of group.items) valid.add(entry.path)
    }
    next.favorites = raw.favorites.filter((path: string) => valid.has(path))
  }
  if (raw.favoriteGroup) {
    next.favoriteGroup = {
      ...next.favoriteGroup,
      ...raw.favoriteGroup,
      label: raw.favoriteGroup.label || next.favoriteGroup.label,
      icon: raw.favoriteGroup.icon || next.favoriteGroup.icon,
    }
  }
  return next
}

function loadConfig(): SidebarConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultConfig()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return defaultConfig()
    if (parsed.version === CONFIG_VERSION && Array.isArray(parsed.groups)) {
      const config = parsed as SidebarConfig
      // 确保系统层级始终存在
      const base = defaultConfig()
      for (const systemGroup of base.groups) {
        if (!config.groups.some((group) => group.id === systemGroup.id)) {
          config.groups.push(systemGroup)
        }
      }
      return config
    }
    return migrateConfig(parsed)
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
    for (const entry of config.value.topItems) map[entry.id] = entry
    for (const group of config.value.groups) {
      for (const entry of group.items) map[entry.id] = entry
    }
    return map
  })

  const visibleTopItems = computed(() =>
    config.value.topItems.filter((entry) => entry.visible && canAccess(entry.permission)),
  )

  const visibleGroups = computed(() =>
    config.value.groups
      .filter((group) => group.visible)
      .map((group) => ({
        ...group,
        items: group.items.filter((entry) => entry.visible && canAccess(entry.permission)),
      }))
      .filter((group) => group.items.length > 0),
  )

  const favoriteGroup = computed(() => {
    if (!config.value.favoriteGroup.visible) return null
    const items = config.value.favorites
      .map((id) => allItems.value[id])
      .filter((entry): entry is SidebarItemConfig => !!entry)
      .filter((entry) => entry.visible && canAccess(entry.permission))
    if (items.length === 0) return null
    return {
      id: 'favorites',
      label: config.value.favoriteGroup.label,
      icon: config.value.favoriteGroup.icon,
      visible: true,
      defaultExpanded: config.value.favoriteGroup.defaultExpanded,
      items,
      system: true,
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
    if (group && !group.system) group.label = label
  }

  function setGroupIcon(groupId: string, icon: string) {
    const group = config.value.groups.find((g) => g.id === groupId)
    if (group) group.icon = icon
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
    const entry = findItem(groupId, itemId)
    if (entry) entry.visible = !entry.visible
  }

  function setItemPermission(groupId: string, itemId: string, permission: SidebarPermission) {
    const entry = findItem(groupId, itemId)
    if (entry) entry.permission = permission
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
    const index = group.items.findIndex((entry) => entry.id === itemId)
    const next = index + delta
    if (index < 0 || next < 0 || next >= group.items.length) return
    const [entry] = group.items.splice(index, 1)
    group.items.splice(next, 0, entry)
  }

  function moveItemToGroup(itemId: string, fromGroupId: string, toGroupId: string) {
    if (!toGroupId || fromGroupId === toGroupId) return
    const from = config.value.groups.find((g) => g.id === fromGroupId)
    const to = config.value.groups.find((g) => g.id === toGroupId)
    if (!from || !to) return
    const index = from.items.findIndex((entry) => entry.id === itemId)
    if (index < 0) return
    const [entry] = from.items.splice(index, 1)
    to.items.push(entry)
  }

  function addGroup(label = '新层级', icon = 'grid'): string {
    const id = `custom-${Date.now()}`
    const group: SidebarGroupConfig = {
      id,
      label: label.trim() || '新层级',
      icon: icon || 'grid',
      visible: true,
      defaultExpanded: true,
      system: false,
      items: [],
    }
    const otherIndex = config.value.groups.findIndex((g) => g.id === OTHER_GROUP_ID)
    if (otherIndex >= 0) config.value.groups.splice(otherIndex, 0, group)
    else config.value.groups.push(group)
    expanded[id] = true
    return id
  }

  function deleteGroup(groupId: string): boolean {
    if (groupId === OTHER_GROUP_ID) return false
    const index = config.value.groups.findIndex((g) => g.id === groupId)
    if (index < 0) return false
    const group = config.value.groups[index]
    if (group.system) return false

    const other = config.value.groups.find((g) => g.id === OTHER_GROUP_ID)
    if (other) {
      for (const entry of group.items) {
        if (!other.items.some((existing) => existing.path === entry.path)) {
          other.items.push(entry)
        }
      }
      other.visible = true
      other.defaultExpanded = true
      expanded[OTHER_GROUP_ID] = true
    }
    config.value.groups.splice(index, 1)
    delete expanded[groupId]
    if (config.value.favorites.length) {
      const valid = new Set<string>()
      for (const g of config.value.groups) {
        for (const entry of g.items) valid.add(entry.id)
      }
      config.value.favorites = config.value.favorites.filter((id) => valid.has(id))
    }
    return true
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
    return group?.items.find((entry) => entry.id === itemId)
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
    setGroupIcon,
    addGroup,
    deleteGroup,
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
