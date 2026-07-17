import { postResponse, getResponse, putResponse } from './request'
import type {
  ApiResponse,
  HttpRequestParams,
  HttpResponseData,
  HttpCheckParams,
  HttpCheckData,
  TcpCheckParams,
  TcpCheckData,
  DnsLookupParams,
  DnsLookupData,
  ProxyConfig,
  ProxyUpdateParams,
} from '@/types/api'

export function sendHttpRequest(data: HttpRequestParams): Promise<ApiResponse<HttpResponseData>> {
  return postResponse('/net/http/request', data)
}

export function checkHttpReachability(data: HttpCheckParams): Promise<ApiResponse<HttpCheckData>> {
  return postResponse('/net/http/check', data)
}

export function checkTcpPort(data: TcpCheckParams): Promise<ApiResponse<TcpCheckData>> {
  return postResponse('/net/tcp/check', data)
}

export function dnsLookup(data: DnsLookupParams): Promise<ApiResponse<DnsLookupData>> {
  return postResponse('/net/dns/lookup', data)
}

export function getProxyConfig(): Promise<ApiResponse<ProxyConfig>> {
  return getResponse('/net/proxy')
}

export function updateProxyConfig(data: ProxyUpdateParams): Promise<ApiResponse<ProxyConfig>> {
  return putResponse('/net/proxy', data)
}
