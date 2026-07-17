import axios from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse } from '@/types/api'
import { getAccessToken, getRefreshToken, setTokens, clearAuth } from '@/utils/auth'

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const data = response.data
    if (data.code !== 0) {
      return Promise.reject(new Error(data.message || '请求失败'))
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(request(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshToken = getRefreshToken()
        if (!refreshToken) {
          throw new Error('No refresh token')
        }
        const res = await axios.post<ApiResponse>('/api/v1/auth/refresh', {
          refresh_token: refreshToken,
        })
        const data = res.data.data as any
        setTokens(data.access_token, data.refresh_token)
        onRefreshed(data.access_token)
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`
        return request(originalRequest)
      } catch {
        clearAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  },
)

export async function getResponse<T = any>(
  url: string,
  params?: Record<string, any>,
): Promise<ApiResponse<T>> {
  const res = await request.get<ApiResponse<T>>(url, { params })
  return res.data
}

export async function postResponse<T = any>(
  url: string,
  data?: any,
): Promise<ApiResponse<T>> {
  const res = await request.post<ApiResponse<T>>(url, data)
  return res.data
}

export async function putResponse<T = any>(
  url: string,
  data?: any,
): Promise<ApiResponse<T>> {
  const res = await request.put<ApiResponse<T>>(url, data)
  return res.data
}

export async function deleteResponse<T = any>(
  url: string,
): Promise<ApiResponse<T>> {
  const res = await request.delete<ApiResponse<T>>(url)
  return res.data
}

export default request
