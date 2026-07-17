const ACCESS_TOKEN_KEY = 'go_admin_access_token'
const REFRESH_TOKEN_KEY = 'go_admin_refresh_token'
const USER_KEY = 'go_admin_user'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, access)
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

export function removeTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function getStoredUser(): string | null {
  return localStorage.getItem(USER_KEY)
}

export function setStoredUser(user: string): void {
  localStorage.setItem(USER_KEY, user)
}

export function removeStoredUser(): void {
  localStorage.removeItem(USER_KEY)
}

export function clearAuth(): void {
  removeTokens()
  removeStoredUser()
}
