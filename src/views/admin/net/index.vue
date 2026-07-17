<template>
  <div class="net-module">
    <h2 class="net-module__title">网络工具</h2>

    <NkTabs v-model="activeTab" :items="tabs" @change="onTabChange" />

    <div class="net-module__content">
      <NkLoading :loading="loading">
        <!-- HTTP 请求 -->
        <div v-if="activeTab === 'http-request'">
          <NkCard>
            <template #header>HTTP 请求</template>
            <div class="net-module__form">
              <div class="net-module__form-row">
                <div class="net-module__form-field net-module__form-field--method">
                  <label class="net-module__label">方法</label>
                  <NkSelect v-model="httpReq.method" :items="httpMethods" />
                </div>
                <div class="net-module__form-field net-module__form-field--url">
                  <label class="net-module__label">URL</label>
                  <NkInput v-model="httpReq.url" placeholder="https://example.com/api" />
                </div>
              </div>

              <div class="net-module__form-field">
                <label class="net-module__label">超时（秒）</label>
                <NkInput v-model="httpReq.timeout" type="number" placeholder="30" />
              </div>

              <div class="net-module__form-field">
                <label class="net-module__label">请求头</label>
                <div
                  v-for="(header, index) in httpReq.headers"
                  :key="index"
                  class="net-module__header-row"
                >
                  <NkInput v-model="header.key" placeholder="Key" class="net-module__header-key" />
                  <span class="net-module__header-sep">:</span>
                  <NkInput v-model="header.value" placeholder="Value" class="net-module__header-value" />
                  <NkButton size="sm" variant="text" @click="removeHttpHeader(index)">✕</NkButton>
                </div>
                <NkButton size="sm" @click="addHttpHeader">添加请求头</NkButton>
              </div>

              <div class="net-module__form-field">
                <label class="net-module__label">请求体</label>
                <NkInput
                  v-model="httpReq.body"
                  type="textarea"
                  placeholder='{"key": "value"}'
                  :rows="4"
                />
              </div>

              <NkButton @click="doHttpRequest">发送</NkButton>
            </div>
          </NkCard>

          <NkCard v-if="httpResult" class="net-module__result">
            <template #header>响应结果</template>
            <div class="net-module__result-item">
              <span class="net-module__result-label">状态码:</span>
              <NkTag :color="httpResult.status_code < 400 ? 'success' : 'danger'">
                {{ httpResult.status_code }}
              </NkTag>
            </div>
            <div class="net-module__result-item">
              <span class="net-module__result-label">响应头:</span>
              <pre class="net-module__pre">{{ formatJson(httpResult.headers) }}</pre>
            </div>
            <div class="net-module__result-item">
              <span class="net-module__result-label">响应体:</span>
              <pre class="net-module__pre">{{ httpResult.body }}</pre>
            </div>
          </NkCard>
        </div>

        <!-- 连通性检查 -->
        <div v-if="activeTab === 'connectivity'">
          <NkCard>
            <template #header>连通性检查</template>
            <div class="net-module__form">
              <div class="net-module__form-row">
                <div class="net-module__form-field">
                  <label class="net-module__label">检查类型</label>
                  <NkSelect v-model="checkType" :items="checkTypes" />
                </div>
                <div class="net-module__form-field net-module__form-field--url">
                  <label class="net-module__label">目标</label>
                  <NkInput
                    v-model="checkTarget"
                    :placeholder="checkType === 'http' ? 'https://example.com' : 'example.com:80'"
                  />
                </div>
              </div>
              <div class="net-module__form-field">
                <label class="net-module__label">超时（秒）</label>
                <NkInput v-model="checkTimeout" type="number" placeholder="5" />
              </div>
              <NkButton @click="doConnectivityCheck">检查</NkButton>
            </div>
          </NkCard>

          <NkCard v-if="checkResult" class="net-module__result">
            <template #header>检查结果</template>
            <div class="net-module__result-item">
              <span class="net-module__result-label">可达性:</span>
              <NkTag :color="checkResult.reachable ? 'success' : 'danger'">
                {{ checkResult.reachable ? '可达' : '不可达' }}
              </NkTag>
            </div>
            <div v-if="checkResult.latency" class="net-module__result-item">
              <span class="net-module__result-label">延迟:</span>
              <span>{{ checkResult.latency }}</span>
            </div>
            <div v-if="checkResult?.status_code" class="net-module__result-item">
              <span class="net-module__result-label">状态码:</span>
              <NkTag :color="checkResult.status_code < 400 ? 'success' : 'danger'">
                {{ checkResult.status_code }}
              </NkTag>
            </div>
          </NkCard>
        </div>

        <!-- DNS 查询 -->
        <div v-if="activeTab === 'dns'">
          <NkCard>
            <template #header>DNS 查询</template>
            <div class="net-module__form">
              <div class="net-module__form-row">
                <div class="net-module__form-field net-module__form-field--url">
                  <label class="net-module__label">主机名</label>
                  <NkInput v-model="dnsHostname" placeholder="example.com" />
                </div>
              </div>
              <NkButton @click="doDnsLookup">查询</NkButton>
            </div>
          </NkCard>

          <NkCard v-if="dnsResult" class="net-module__result">
            <template #header>解析结果</template>
            <div class="net-module__result-item">
              <span class="net-module__result-label">主机名:</span>
              <span>{{ dnsResult.hostname }}</span>
            </div>
            <div class="net-module__result-item">
              <span class="net-module__result-label">IP 地址:</span>
              <div class="net-module__tags">
                <NkTag
                  v-for="addr in dnsResult.addresses"
                  :key="addr"
                  color="primary"
                  variant="light"
                >
                  {{ addr }}
                </NkTag>
                <span v-if="dnsResult.addresses.length === 0" class="net-module__empty">无记录</span>
              </div>
            </div>
          </NkCard>
        </div>

        <!-- 代理配置 -->
        <div v-if="activeTab === 'proxy'">
          <NkCard>
            <template #header>代理配置</template>
            <div class="net-module__form">
              <div class="net-module__form-field">
                <label class="net-module__label">HTTP 代理</label>
                <NkInput v-model="proxyConfig.http" placeholder="http://proxy.example.com:8080" />
              </div>
              <div class="net-module__form-field">
                <label class="net-module__label">HTTPS 代理</label>
                <NkInput v-model="proxyConfig.https" placeholder="https://proxy.example.com:8443" />
              </div>
              <div class="net-module__form-field">
                <label class="net-module__label">SOCKS5 代理</label>
                <NkInput v-model="proxyConfig.socks5" placeholder="socks5://proxy.example.com:1080" />
              </div>
              <NkButton @click="saveProxyConfig">保存</NkButton>
            </div>
          </NkCard>
        </div>
      </NkLoading>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  sendHttpRequest,
  checkHttpReachability,
  checkTcpPort,
  dnsLookup,
  getProxyConfig,
  updateProxyConfig,
} from '@/api/net'
import type {
  HttpResponseData,
  DnsLookupData,
  ProxyConfig,
} from '@/types/api'

const activeTab = ref('http-request')
const loading = ref(false)

const tabs = [
  { label: 'HTTP 请求', value: 'http-request' },
  { label: '连通性检查', value: 'connectivity' },
  { label: 'DNS 查询', value: 'dns' },
  { label: '代理配置', value: 'proxy' },
]

function onTabChange(value: string | number) {
  activeTab.value = value as string
}

const httpMethods = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' },
]

const httpReq = reactive({
  url: '',
  method: 'GET',
  body: '',
  timeout: 30,
  headers: [] as { key: string; value: string }[],
})

const httpResult = ref<HttpResponseData | null>(null)

function addHttpHeader() {
  httpReq.headers.push({ key: '', value: '' })
}

function removeHttpHeader(index: number) {
  httpReq.headers.splice(index, 1)
}

function buildHeaders(): Record<string, string> | undefined {
  const entries = httpReq.headers.filter((h) => h.key.trim())
  if (entries.length === 0) return undefined
  const result: Record<string, string> = {}
  entries.forEach((h) => {
    result[h.key] = h.value
  })
  return result
}

async function doHttpRequest() {
  if (!httpReq.url) {
    NKMessage.warning('请输入 URL')
    return
  }
  loading.value = true
  httpResult.value = null
  try {
    const res = await sendHttpRequest({
      url: httpReq.url,
      method: httpReq.method,
      body: httpReq.body || undefined,
      headers: buildHeaders(),
      timeout: httpReq.timeout || undefined,
    })
    httpResult.value = res.data
    NKMessage.success('请求完成')
  } catch (e: any) {
    NKMessage.error(e.message || '请求失败')
  } finally {
    loading.value = false
  }
}

const checkTypes = [
  { label: 'HTTP', value: 'http' },
  { label: 'TCP', value: 'tcp' },
]

const checkType = ref('http')
const checkTarget = ref('')
const checkTimeout = ref(5)
const checkResult = ref<any>(null)

async function doConnectivityCheck() {
  if (!checkTarget.value) {
    NKMessage.warning('请输入目标地址')
    return
  }
  loading.value = true
  checkResult.value = null
  try {
    if (checkType.value === 'http') {
      const res = await checkHttpReachability({
        url: checkTarget.value,
        timeout: checkTimeout.value || undefined,
      })
      checkResult.value = res.data
    } else {
      const parts = checkTarget.value.split(':')
      const host = parts[0] || ''
      const port = parseInt(parts[1] || '80', 10)
      const res = await checkTcpPort({
        host,
        port,
        timeout: checkTimeout.value || undefined,
      })
      checkResult.value = res.data
    }
    NKMessage.success('检查完成')
  } catch (e: any) {
    NKMessage.error(e.message || '检查失败')
  } finally {
    loading.value = false
  }
}

const dnsHostname = ref('')
const dnsResult = ref<DnsLookupData | null>(null)

async function doDnsLookup() {
  if (!dnsHostname.value) {
    NKMessage.warning('请输入主机名')
    return
  }
  loading.value = true
  dnsResult.value = null
  try {
    const res = await dnsLookup({ hostname: dnsHostname.value })
    dnsResult.value = res.data
    NKMessage.success('查询完成')
  } catch (e: any) {
    NKMessage.error(e.message || '查询失败')
  } finally {
    loading.value = false
  }
}

const proxyConfig = reactive<ProxyConfig>({
  http: '',
  https: '',
  socks5: '',
})

async function loadProxyConfig() {
  try {
    const res = await getProxyConfig()
    proxyConfig.http = res.data.http
    proxyConfig.https = res.data.https
    proxyConfig.socks5 = res.data.socks5
  } catch {
    // ignore
  }
}

async function saveProxyConfig() {
  loading.value = true
  try {
    const params: { http?: string; https?: string; socks5?: string } = {}
    if (proxyConfig.http) params.http = proxyConfig.http
    if (proxyConfig.https) params.https = proxyConfig.https
    if (proxyConfig.socks5) params.socks5 = proxyConfig.socks5
    const res = await updateProxyConfig(params)
    proxyConfig.http = res.data.http
    proxyConfig.https = res.data.https
    proxyConfig.socks5 = res.data.socks5
    NKMessage.success('代理配置已保存')
  } catch (e: any) {
    NKMessage.error(e.message || '保存失败')
  } finally {
    loading.value = false
  }
}

function formatJson(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

onMounted(() => {
  loadProxyConfig()
})
</script>

<style lang="scss" scoped>
.net-module {
  max-width: 1200px;

  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    margin-bottom: $nk-spacing-xl;
    color: $nk-color-neutral-900;
  }

  &__content {
    margin-top: $nk-spacing-lg;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-md;
  }

  &__form-row {
    display: flex;
    gap: $nk-spacing-md;
  }

  &__form-field {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-xs;

    &--method {
      max-width: 140px;
    }

    &--url {
      flex: 1;
    }
  }

  &__label {
    font-size: $nk-font-size-sm;
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-700;
  }

  &__header-row {
    display: flex;
    align-items: center;
    gap: $nk-spacing-xs;
    margin-bottom: $nk-spacing-xs;
  }

  &__header-key {
    flex: 1;
  }

  &__header-sep {
    color: $nk-color-neutral-500;
  }

  &__header-value {
    flex: 2;
  }

  &__result {
    margin-top: $nk-spacing-lg;
  }

  &__result-item {
    display: flex;
    align-items: flex-start;
    gap: $nk-spacing-sm;
    margin-bottom: $nk-spacing-sm;
  }

  &__result-label {
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-600;
    white-space: nowrap;
    min-width: 70px;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: $nk-spacing-xs;
  }

  &__empty {
    color: $nk-color-neutral-400;
    font-style: italic;
  }

  &__pre {
    background: $nk-color-neutral-100;
    padding: $nk-spacing-sm;
    border-radius: $nk-radius-md;
    font-size: $nk-font-size-sm;
    overflow-x: auto;
    max-height: 300px;
    margin: 0;
    width: 100%;
  }
}
</style>
