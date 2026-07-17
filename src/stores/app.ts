import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const breadcrumbs = ref<{ label: string; path?: string }[]>([])

  const storedTheme = (localStorage.getItem('theme') as ThemeMode) || 'light'
  const theme = ref<ThemeMode>(storedTheme)

  function applyTheme(mode: ThemeMode) {
    document.documentElement.setAttribute('data-theme', mode)
    localStorage.setItem('theme', mode)
  }

  function toggleTheme() {
    const next = theme.value === 'light' ? 'dark' : 'light'
    theme.value = next
    applyTheme(next)
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  if (!localStorage.getItem('theme')) {
    const system = prefersDark ? 'dark' : 'light'
    theme.value = system
    applyTheme(system)
  } else {
    applyTheme(theme.value)
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setBreadcrumbs(items: { label: string; path?: string }[]) {
    breadcrumbs.value = items
  }

  return { sidebarCollapsed, breadcrumbs, theme, toggleSidebar, setBreadcrumbs, toggleTheme }
})
