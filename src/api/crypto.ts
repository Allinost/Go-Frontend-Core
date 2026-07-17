import { postResponse } from './request'

export interface EncryptRequest {
  data: string
  key_hex?: string
  algo: 'aes-gcm' | 'chacha20'
}

export interface EncryptResponse {
  result: string
  algo: string
}

export interface DecryptRequest {
  data: string
  key_hex?: string
  algo: 'aes-gcm' | 'chacha20'
}

export interface DecryptResponse {
  result: string
  algo: string
}

export interface CompressRequest {
  data: string
  method: 'gzip' | 'zlib' | 'zip'
  level: number
}

export interface CompressResponse {
  result: string
  method: string
}

export interface DecompressRequest {
  data: string
}

export interface DecompressResponse {
  result: string
  method: string
}

export interface HashRequest {
  data: string
  algo: 'sha256' | 'sha512' | 'blake3'
}

export interface HashResponse {
  result: string
  algo: string
}

export function encrypt(data: EncryptRequest) {
  return postResponse<EncryptResponse>('/crypto/encrypt', data)
}

export function decrypt(data: DecryptRequest) {
  return postResponse<DecryptResponse>('/crypto/decrypt', data)
}

export function compress(data: CompressRequest) {
  return postResponse<CompressResponse>('/crypto/compress', data)
}

export function decompress(data: DecompressRequest) {
  return postResponse<DecompressResponse>('/crypto/decompress', data)
}

export function hash(data: HashRequest) {
  return postResponse<HashResponse>('/crypto/hash', data)
}
