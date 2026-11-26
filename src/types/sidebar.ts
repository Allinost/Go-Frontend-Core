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
  /** 系统保留层级：不可删除，名称固定 */
  system?: boolean
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
