export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  detail?: string
  trace_id?: string
}

export interface PaginatedData<T> {
  data: T[]
  total: number
  page: number
  size: number
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  expires_in: number
  user_id: number
  username: string
}

export interface UserInfo {
  id: number
  username: string
  nickname: string
  email?: string
  avatar_url?: string
  phone?: string
  status?: 'active' | 'inactive' | 'suspended'
  roles?: string[]
  created_at?: string
  updated_at?: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  nickname?: string
}

export interface UpdateUserRequest {
  nickname?: string
  email?: string
  avatar_url?: string
  phone?: string
}

export interface RoleModel {
  name: string
  created_at: string
  updated_at: string
}

export interface Permission {
  id: number
  name: string
  resource: string
  action: string
  created_at: string
}

export interface RoleAssignRequest {
  user_id: number
  role: string
}

export interface RefreshRequest {
  refresh_token: string
}

export interface HttpRequestParams {
  url: string
  method: string
  body?: string
  headers?: Record<string, string>
  timeout?: number
}

export interface HttpResponseData {
  status_code: number
  body: string
  headers: Record<string, string>
}

export interface HttpCheckParams {
  url: string
  timeout?: number
}

export interface HttpCheckData {
  status_code: number
  latency: string
  reachable: boolean
}

export interface TcpCheckParams {
  host: string
  port: number
  timeout?: number
}

export interface TcpCheckData {
  reachable: boolean
  latency: string
}

export interface DnsLookupParams {
  hostname: string
}

export interface DnsLookupData {
  hostname: string
  addresses: string[]
}

export interface ProxyConfig {
  http: string
  https: string
  socks5: string
}

export interface ProxyUpdateParams {
  http?: string
  https?: string
  socks5?: string
}
