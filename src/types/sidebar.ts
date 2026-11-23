export type SidebarPermission = 'all' | 'admin' | 'user'

export interface SidebarItemConfig {
  id: string
  label: string
  path: string
  icon?: string
  visible: boolean
  permission: SidebarPermission
}

export interface SidebarGroupConfig {
  id: string
  label: string
  icon: string
  visible: boolean
  defaultExpanded: boolean
  items: SidebarItemConfig[]
}

export interface SidebarFavoriteGroupConfig {
  label: string
  icon: string
  visible: boolean
  defaultExpanded: boolean
}

export interface SidebarConfig {
  version: number
  topItems: SidebarItemConfig[]
  groups: SidebarGroupConfig[]
  favoriteGroup: SidebarFavoriteGroupConfig
  favorites: string[]
}
