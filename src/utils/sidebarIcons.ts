export interface SidebarIconOption {
  name: string
  label: string
}

/** 可用于导航层级/菜单的图标集合，需与 NKUI icon registry 保持一致 */
export const SIDEBAR_ICONS: SidebarIconOption[] = [
  { name: 'home', label: '首页' },
  { name: 'star', label: '常用' },
  { name: 'user', label: '用户' },
  { name: 'layers', label: '业务' },
  { name: 'server', label: '硬件' },
  { name: 'code', label: '软件' },
  { name: 'database', label: '数据' },
  { name: 'tools', label: '工具' },
  { name: 'grid', label: '其他' },
  { name: 'settings', label: '设置' },
  { name: 'bell', label: '通知' },
  { name: 'chart', label: '统计' },
  { name: 'link', label: '链接' },
  { name: 'clock', label: '任务' },
  { name: 'shield', label: '权限' },
  { name: 'box', label: '资源' },
  { name: 'cloud', label: '云服务' },
  { name: 'folder', label: '目录' },
  { name: 'file', label: '文件' },
  { name: 'image', label: '图片' },
  { name: 'camera', label: '相机' },
  { name: 'tag', label: '标签' },
  { name: 'search', label: '搜索' },
  { name: 'refresh', label: '同步' },
]

export function sidebarIconLabel(name: string | undefined): string {
  if (!name) return '未设置'
  return SIDEBAR_ICONS.find((item) => item.name === name)?.label || name
}
