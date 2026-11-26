<template>
  <div class="sys-page">
    <div class="sys-header">
      <div>
        <h2 class="sys-title">系统状态</h2>
        <div class="sys-muted">服务信息、依赖健康检查、模块注册与文件存储降级状态。</div>
      </div>
      <div class="sys-actions">
        <NkButton size="sm" variant="ghost" :loading="loading" @click="loadAll">刷新</NkButton>
        <NkButton size="sm" variant="ghost" @click="$router.push('/storage')">文件存储</NkButton>
      </div>
    </div>

    <NkLoading v-if="loading && !info" />
    <template v-else>
      <div class="sys-cards">
        <NkCard class="sys-card">
          <div class="sys-card-label">版本</div>
          <div class="sys-card-value">{{ info?.version || '-' }}</div>
          <div class="sys-muted">{{ info?.name || '-' }}</div>
        </NkCard>
        <NkCard class="sys-card">
          <div class="sys-card-label">运行模式</div>
          <div class="sys-card-value">{{ info?.mode || '-' }}</div>
          <div class="sys-muted">配置监听 {{ info?.config_watch ? '开启' : '关闭' }}</div>
        </NkCard>
        <NkCard class="sys-card">
          <div class="sys-card-label">运行时长</div>
          <div class="sys-card-value">{{ info?.uptime || '-' }}</div>
          <div class="sys-muted">{{ formatTime(info?.start_time) }}</div>
        </NkCard>
        <NkCard class="sys-card">
          <div class="sys-card-label">Go / 协程</div>
          <div class="sys-card-value">{{ info?.go_version || '-' }}</div>
          <div class="sys-muted">{{ info?.go_os }}/{{ info?.go_arch }} · {{ info?.goroutines ?? '-' }} goroutines</div>
        </NkCard>
        <NkCard class="sys-card">
          <div class="sys-card-label">已注册模块</div>
          <div class="sys-card-value">{{ moduleCount }}</div>
          <div class="sys-muted">health / auth / ops / pm ...</div>
        </NkCard>
        <NkCard class="sys-card">
          <div class="sys-card-label">文件存储</div>
          <div class="sys-card-value">{{ storage?.storage_mode || '-' }}</div>
          <div class="sys-muted">暂存 {{ stagedCount }} 个</div>
        </NkCard>
      </div>

      <NkCard class="sys-panel">
        <div class="sys-panel-title">
          <span>依赖健康检查</span>
          <NkTag v-if="health" size="sm" :type="health.status === 'ok' ? 'success' : 'warning'">
            {{ health.status }}
          </NkTag>
          <NkButton size="sm" variant="ghost" :loading="healthLoading" @click="loadHealth">检查</NkButton>
        </div>
        <NkLoading v-if="healthLoading && !health" />
        <div v-else-if="!health?.checks?.length" class="sys-muted">暂无检查项</div>
        <table v-else class="sys-table">
          <thead>
            <tr>
              <th>组件</th>
              <th>状态</th>
              <th>耗时</th>
              <th>错误</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="check in health.checks" :key="check.name">
              <td class="sys-name">{{ check.name }}</td>
              <td>
                <NkTag size="sm" :type="check.status === 'up' ? 'success' : 'danger'">
                  {{ check.status }}
                </NkTag>
              </td>
              <td>{{ formatLatency(check.latency_ms) }}</td>
              <td class="sys-error">{{ check.error || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </NkCard>

      <div class="sys-row">
        <NkCard class="sys-panel">
          <div class="sys-panel-title">
            <span>文件存储降级</span>
            <NkTag size="sm" :type="storageType">{{ storage?.storage_mode || 'unknown' }}</NkTag>
          </div>
          <div class="sys-kv">
            <div><span>对象存储</span><strong>{{ storage?.s3_backend || '-' }}</strong></div>
            <div><span>Redis 暂存</span><strong>{{ stagedCount }} 个</strong></div>
            <div><span>数据库</span><strong>{{ storage?.database || '-' }}</strong></div>
            <div><span>文件引用服务</span><strong>{{ storage?.file_ref_service || '-' }}</strong></div>
          </div>
          <div v-if="storage?.storage_error" class="sys-error-box">{{ storage.storage_error }}</div>
          <div class="sys-inline">
            <NkButton size="sm" :loading="flushing" :disabled="stagedCount === 0" @click="flushStaged">提交暂存</NkButton>
            <NkButton size="sm" variant="ghost" @click="$router.push('/storage')">查看暂存区</NkButton>
          </div>
        </NkCard>

        <NkCard class="sys-panel">
          <div class="sys-panel-title">
            <span>模块列表</span>
            <span class="sys-muted">{{ moduleCount }} 个</span>
          </div>
          <div class="sys-modules">
            <NkTag v-for="m in modules" :key="m.name" size="sm" type="neutral">{{ m.name }}</NkTag>
          </div>
        </NkCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NKMessage } from '@nkui/vue'
import { getHealth, getModules, getSystemInfo, type HealthResp, type ModuleInfo, type SystemInfo } from '@/api/health'
import {
  flushStagedFiles,
  getStorageStatus,
  listStagedFiles,
  type StorageStatus,
} from '@/api/rustfs'

const loading = ref(false)
const healthLoading = ref(false)
const flushing = ref(false)
const info = ref<SystemInfo | null>(null)
const health = ref<HealthResp | null>(null)
const modules = ref<ModuleInfo[]>([])
const storage = ref<StorageStatus | null>(null)
const stagedCount = ref(0)

const moduleCount = computed(() => modules.value.length || info.value?.modules?.length || 0)
const storageType = computed(() => {
  if (storage.value?.storage_mode === 's3+redis') return 'success'
  if (storage.value?.storage_mode === 's3') return 'primary'
  if (storage.value?.storage_mode === 'redis') return 'warning'
  return 'danger'
})

function formatTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function formatLatency(value?: number) {
  if (!value) return '-'
  return `${(value / 1e6).toFixed(1)} ms`
}

async function loadHealth() {
  healthLoading.value = true
  try {
    const res = await getHealth()
    health.value = res.data
  } catch (err: any) {
    NKMessage.error(err.message || '健康检查失败')
  } finally {
    healthLoading.value = false
  }
}

async function loadStorage() {
  try {
    const [statusRes, stagedRes] = await Promise.all([getStorageStatus(), listStagedFiles()])
    storage.value = statusRes.data
    stagedCount.value = stagedRes.data.items?.length || 0
  } catch (err: any) {
    NKMessage.error(err.message || '加载存储状态失败')
  }
}

async function loadAll() {
  loading.value = true
  try {
    const [infoRes, modulesRes] = await Promise.all([getSystemInfo(), getModules()])
    info.value = infoRes.data
    modules.value = modulesRes.data.modules || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载系统信息失败')
  } finally {
    loading.value = false
  }
  loadHealth()
  loadStorage()
}

async function flushStaged() {
  flushing.value = true
  try {
    const res = await flushStagedFiles()
    NKMessage.success(`已提交 ${res.data.flushed} 个暂存文件`)
    await loadStorage()
  } catch (err: any) {
    NKMessage.error(err.message || '提交暂存文件失败')
  } finally {
    flushing.value = false
  }
}

onMounted(loadAll)
</script>

<style scoped lang="scss">
.sys-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.sys-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.sys-title {
  margin: 0;
  font-size: 22px;
}
.sys-muted {
  color: var(--nk-text-color-secondary, #888);
  font-size: 13px;
}
.sys-actions {
  display: flex;
  gap: 8px;
}
.sys-cards {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
}
.sys-card {
  padding: 14px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--nk-color-primary-50, #eff6ff) 45%, var(--nk-color-neutral-0, #fff)), var(--nk-color-neutral-0, #fff) 60%);
  border: 1px solid color-mix(in srgb, var(--nk-color-neutral-300, #d4d4d4) 50%, transparent);
  border-radius: 14px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.sys-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 30px color-mix(in srgb, #0f172a 8%, transparent);
}
.sys-card-label {
  font-size: 12px;
  color: var(--nk-text-color-secondary, #888);
}
.sys-card-value {
  font-size: 18px;
  font-weight: 600;
  margin: 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sys-panel {
  padding: 16px;
}
.sys-panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  margin-bottom: 12px;
}
.sys-panel-title > span:first-child {
  margin-right: auto;
}
.sys-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.sys-table th,
.sys-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--nk-border-color, #eee);
  text-align: left;
}
.sys-name {
  font-family: var(--nk-font-family-mono, monospace);
  font-weight: 600;
}
.sys-error {
  color: var(--nk-color-error, #d4380d);
  font-size: 12px;
  word-break: break-all;
}
.sys-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.sys-kv {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  font-size: 13px;
}
.sys-kv span {
  display: block;
  color: var(--nk-text-color-secondary, #888);
  font-size: 12px;
}
.sys-error-box {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(245, 34, 45, 0.08);
  color: var(--nk-color-error, #d4380d);
  font-size: 12px;
  word-break: break-all;
}
.sys-inline {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.sys-modules {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
@media (max-width: 1100px) {
  .sys-cards {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .sys-row {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 700px) {
  .sys-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .sys-card-value {
    font-size: 16px;
    white-space: normal;
    word-break: break-all;
  }
}
@media (max-width: 480px) {
  .sys-cards {
    grid-template-columns: 1fr;
  }
}
</style>
