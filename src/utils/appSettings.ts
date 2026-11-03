const API_BASE_KEY = 'go_admin_api_base'
const SITE_TITLE_KEY = 'go_admin_site_title'

export const DEFAULT_API_BASE = '/api/v1'
export const DEFAULT_SITE_TITLE = 'Monitor Controller'

/** 归一化 API 根地址：允许 host、host/api/v1 或 /api/v1 */
export function normalizeApiBase(raw?: string | null): string {
  const value = (raw || '').trim()
  if (!value) return DEFAULT_API_BASE
  const noSlash = value.replace(/\/+$/, '')
  if (noSlash.endsWith('/api/v1')) return noSlash
  return `${noSlash}/api/v1`
}

export function getApiBase(): string {
  return normalizeApiBase(localStorage.getItem(API_BASE_KEY))
}

export function setApiBase(raw?: string | null): string {
  const normalized = normalizeApiBase(raw)
  localStorage.setItem(API_BASE_KEY, normalized)
  return normalized
}

export function resetApiBase(): void {
  localStorage.removeItem(API_BASE_KEY)
}

export function getSiteTitle(): string {
  return localStorage.getItem(SITE_TITLE_KEY)?.trim() || DEFAULT_SITE_TITLE
}

export function setSiteTitle(title?: string | null): void {
  const value = (title || '').trim()
  if (value) localStorage.setItem(SITE_TITLE_KEY, value)
  else localStorage.removeItem(SITE_TITLE_KEY)
  document.title = getSiteTitle()
}
