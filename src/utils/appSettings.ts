const API_BASE_KEY = 'go_admin_api_base'
const SITE_TITLE_KEY = 'go_admin_site_title'
const INTRANET_HOST_KEY = 'go_admin_intranet_host'
const EASYTIER_HOST_KEY = 'go_admin_easytier_host'

const FALLBACK_API_BASE = '/api/v1'
const FALLBACK_SITE_TITLE = 'Go Admin'

/** 归一化 API 根地址：允许 host、host/api/v1 或 /api/v1 */
function normalizeApiBaseValue(raw?: string | null): string {
  const value = (raw || '').trim()
  if (!value) return FALLBACK_API_BASE
  const noSlash = value.replace(/\/+$/, '')
  if (noSlash.endsWith('/api/v1')) return noSlash
  return `${noSlash}/api/v1`
}

/** 归一化主机名：去掉协议、路径与尾部斜杠 */
function normalizeHostValue(raw?: string | null): string {
  return (raw || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\/+$/, '')
}

function envValue(key: 'VITE_API_BASE_URL' | 'VITE_APP_TITLE' | 'VITE_INTRANET_HOST' | 'VITE_EASYTIER_HOST'): string {
  return (import.meta.env[key] || '').trim()
}

/** 构建时默认值来自 .env，仓库内不写死真实域名 */
export const DEFAULT_API_BASE = normalizeApiBaseValue(envValue('VITE_API_BASE_URL'))
export const DEFAULT_SITE_TITLE = envValue('VITE_APP_TITLE') || FALLBACK_SITE_TITLE
export const DEFAULT_INTRANET_HOST = normalizeHostValue(envValue('VITE_INTRANET_HOST'))
export const DEFAULT_EASYTIER_HOST = normalizeHostValue(envValue('VITE_EASYTIER_HOST'))

function currentHostname(): string {
  return typeof window !== 'undefined' ? window.location.hostname : 'localhost'
}

export function normalizeApiBase(raw?: string | null): string {
  return normalizeApiBaseValue(raw)
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

export function getIntranetHost(): string {
  return localStorage.getItem(INTRANET_HOST_KEY)?.trim() || DEFAULT_INTRANET_HOST || currentHostname()
}

export function setIntranetHost(host?: string | null): void {
  const value = normalizeHostValue(host)
  if (value) localStorage.setItem(INTRANET_HOST_KEY, value)
  else localStorage.removeItem(INTRANET_HOST_KEY)
}

export function getEasytierHost(): string {
  return localStorage.getItem(EASYTIER_HOST_KEY)?.trim() || DEFAULT_EASYTIER_HOST || currentHostname()
}

export function setEasytierHost(host?: string | null): void {
  const value = normalizeHostValue(host)
  if (value) localStorage.setItem(EASYTIER_HOST_KEY, value)
  else localStorage.removeItem(EASYTIER_HOST_KEY)
}
