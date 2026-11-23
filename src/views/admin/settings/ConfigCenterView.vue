<template>
  <div class="cc-page">
    <div class="cc-header">
      <div>
        <h2 class="cc-title">配置中心</h2>
        <div class="cc-muted">启动基线来自 env / config.yaml，数据库值优先；敏感项加密存储，接口只返回掩码。</div>
      </div>
      <div class="cc-actions">
        <NkButton size="sm" variant="ghost" :loading="loading" @click="loadAll">刷新</NkButton>
        <NkButton size="sm" variant="ghost" :loading="resetting" @click="resetAll">全部重置</NkButton>
        <NkButton size="sm" type="primary" :loading="saving" @click="save">保存变更</NkButton>
      </div>
    </div>

    <NkLoading v-if="loading" />
    <template v-else>
      <div v-if="dirtyKeys.length" class="cc-banner">
        待保存 {{ dirtyKeys.length }} 项：{{ dirtyKeys.join('、') }}
      </div>

      <div class="cc-layout">
        <NkCard class="cc-nav">
          <div class="cc-nav-title">分组</div>
          <div
            v-for="group in groups"
            :key="group.key"
            class="cc-nav-item"
            :class="{ 'cc-nav-item--active': activeGroup === group.key }"
            @click="activeGroup = group.key"
          >
            <span>{{ group.label }}</span>
            <NkTag v-if="group.dirty" size="sm" type="warning">{{ group.dirty }}</NkTag>
          </div>
        </NkCard>

        <NkCard class="cc-panel">
          <div class="cc-panel-title">
            <span>{{ activeGroupLabel }}</span>
            <span class="cc-muted">{{ visibleSpecs.length }} 项</span>
          </div>

          <div v-if="visibleSpecs.length === 0" class="cc-muted">该分组暂无配置项</div>
          <div v-for="spec in visibleSpecs" :key="spec.key" class="cc-field">
            <div class="cc-field-head">
              <div>
                <div class="cc-field-key">
                  {{ spec.key }}
                  <NkTag v-if="spec.sensitive" size="sm" type="danger">敏感</NkTag>
                  <NkTag v-if="spec.env_locked" size="sm" type="neutral">env 锁定</NkTag>
                  <NkTag v-if="!spec.reloadable" size="sm" type="warning">需重启</NkTag>
                  <NkTag v-if="isDirty(spec.key)" size="sm" type="primary">已修改</NkTag>
                </div>
                <div class="cc-field-desc">{{ spec.description || spec.module }}</div>
              </div>
              <div class="cc-field-meta">
                <span class="cc-muted">默认 {{ formatDefault(spec.default) }}</span>
                <NkButton size="sm" variant="ghost" :disabled="spec.env_locked" @click="resetOne(spec)">重置</NkButton>
              </div>
            </div>

            <div class="cc-field-control">
              <NkSwitch
                v-if="spec.type === 'bool'"
                :model-value="Boolean(draft[spec.key])"
                :disabled="spec.env_locked"
                size="sm"
                @update:model-value="setValue(spec.key, $event)"
              />
              <NkSelect
                v-else-if="spec.type === 'string' && spec.enum && spec.enum.length"
                :model-value="draft[spec.key]"
                :options="enumOptions(spec)"
                :disabled="spec.env_locked"
                size="sm"
                style="width: 240px"
                @update:model-value="setValue(spec.key, $event)"
              />
              <NkInput
                v-else-if="spec.type === 'int'"
                :model-value="draft[spec.key]"
                type="number"
                :min="spec.min"
                :max="spec.max"
                :disabled="spec.env_locked"
                size="sm"
                style="width: 200px"
                @update:model-value="setValue(spec.key, $event)"
              />
              <NkInput
                v-else-if="spec.type === 'json'"
                :model-value="draft[spec.key]"
                :disabled="spec.env_locked"
                size="sm"
                @update:model-value="setValue(spec.key, $event)"
              />
              <NkInput
                v-else
                :model-value="draft[spec.key]"
                :type="spec.sensitive ? 'password' : 'text'"
                :placeholder="spec.sensitive ? (loaded[spec.key] ? '已设置，留空保持不变' : '未设置') : ''"
                :disabled="spec.env_locked"
                size="sm"
                @update:model-value="setValue(spec.key, $event)"
              />
              <span v-if="spec.type === 'duration'" class="cc-muted">支持 30s / 5m / 1h</span>
            </div>
          </div>

          <div class="cc-save-row">
            <NkInput v-model="note" size="sm" placeholder="变更说明（可选）" style="width: 320px" />
            <NkButton size="sm" type="primary" :loading="saving" :disabled="dirtyKeys.length === 0" @click="save">
              保存变更
            </NkButton>
          </div>
        </NkCard>
      </div>

      <NkCard class="cc-panel">
        <div class="cc-panel-title">
          <span>变更历史</span>
          <NkButton size="sm" variant="ghost" :loading="historyLoading" @click="loadHistory">刷新</NkButton>
        </div>
        <div v-if="history.length === 0" class="cc-muted">暂无历史记录</div>
        <div v-else class="cc-history">
          <div v-for="(item, idx) in history" :key="`${item.key}-${item.version}-${idx}`" class="cc-history-row">
            <div class="cc-history-key">{{ item.key }}</div>
            <div class="cc-history-value">
              <span class="cc-muted">{{ formatHistoryValue(item.old_value) }}</span>
              <span>→</span>
              <span>{{ formatHistoryValue(item.new_value) }}</span>
            </div>
            <div class="cc-history-meta">
              {{ item.operator || '-' }} · {{ formatTime(item.created_at) }}
              <span v-if="item.note" class="cc-muted"> · {{ item.note }}</span>
            </div>
          </div>
        </div>
      </NkCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  getConfigHistory,
  getConfigSchema,
  getConfigValues,
  resetConfigValues,
  updateConfigValues,
  type ConfigHistoryEntry,
  type ConfigSpec,
} from '@/api/settings'

const loading = ref(false)
const saving = ref(false)
const resetting = ref(false)
const historyLoading = ref(false)
const specs = ref<ConfigSpec[]>([])
const loaded = ref<Record<string, any>>({})
const draft = reactive<Record<string, any>>({})
const note = ref('')
const activeGroup = ref('all')
const history = ref<ConfigHistoryEntry[]>([])

const groupLabels: Record<string, string> = {
  server: '服务',
  log: '日志',
  cache: '缓存',
  scheduler: '调度',
  integration: '集成',
  security: '安全',
  auth: '认证',
  business: '业务账号',
}

const groups = computed(() => {
  const keys = Array.from(new Set(specs.value.map((s) => s.group || 'other')))
  const list = [{ key: 'all', label: '全部', dirty: dirtyKeys.value.length }].concat(
    keys.map((key) => ({
      key,
      label: groupLabels[key] || key,
      dirty: specs.value.filter((s) => (s.group || 'other') === key && isDirty(s.key)).length,
    })),
  )
  return list
})

const visibleSpecs = computed(() =>
  activeGroup.value === 'all'
    ? specs.value
    : specs.value.filter((s) => (s.group || 'other') === activeGroup.value),
)

const activeGroupLabel = computed(
  () => groups.value.find((g) => g.key === activeGroup.value)?.label || '全部',
)

const dirtyKeys = computed(() => {
  const keys: string[] = []
  for (const spec of specs.value) {
    if (isDirty(spec.key)) keys.push(spec.key)
  }
  return keys
})

function enumOptions(spec: ConfigSpec) {
  return (spec.enum || []).map((value) => ({ label: value, value }))
}

function setValue(key: string, value: any) {
  draft[key] = value
}

function normalizeForCompare(key: string, value: any) {
  const spec = specs.value.find((s) => s.key === key)
  if (!spec) return value
  if (spec.type === 'int') return Number(value)
  if (spec.type === 'bool') return Boolean(value)
  return value
}

function isDirty(key: string) {
  const spec = specs.value.find((s) => s.key === key)
  if (!spec) return false
  if (spec.sensitive) return draft[key] !== '' && draft[key] !== undefined && draft[key] !== null
  return normalizeForCompare(key, draft[key]) !== normalizeForCompare(key, loaded.value[key])
}

function formatDefault(value: any) {
  if (value === '' || value === null || value === undefined) return '空'
  return String(value)
}

function formatTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function formatHistoryValue(value: any) {
  if (value === null || value === undefined) return '空'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

async function loadAll() {
  loading.value = true
  try {
    const [schema, current] = await Promise.all([getConfigSchema(), getConfigValues()])
    specs.value = schema.data.specs || []
    loaded.value = current.data.values || {}
    for (const spec of specs.value) {
      if (spec.sensitive) {
        draft[spec.key] = ''
      } else {
        draft[spec.key] = loaded.value[spec.key] ?? spec.default
      }
    }
    note.value = ''
    await loadHistory()
  } catch (err: any) {
    NKMessage.error(err.message || '加载配置失败')
  } finally {
    loading.value = false
  }
}

async function loadHistory() {
  historyLoading.value = true
  try {
    const res = await getConfigHistory(undefined, 50)
    history.value = res.data.items || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载历史失败')
  } finally {
    historyLoading.value = false
  }
}

async function save() {
  const patch: Record<string, any> = {}
  for (const spec of specs.value) {
    if (!isDirty(spec.key)) continue
    if (spec.type === 'int') patch[spec.key] = Number(draft[spec.key])
    else if (spec.type === 'bool') patch[spec.key] = Boolean(draft[spec.key])
    else patch[spec.key] = draft[spec.key]
  }
  if (Object.keys(patch).length === 0) {
    NKMessage.info('没有需要保存的变更')
    return
  }
  saving.value = true
  try {
    await updateConfigValues(patch, note.value)
    NKMessage.success('配置已保存并应用')
    await loadAll()
  } catch (err: any) {
    NKMessage.error(err.message || '保存配置失败')
  } finally {
    saving.value = false
  }
}

async function resetOne(spec: ConfigSpec) {
  if (spec.env_locked) {
    NKMessage.warning('该项由环境变量锁定，无法在此重置')
    return
  }
  if (!window.confirm(`确认将 ${spec.key} 重置为默认值？`)) return
  try {
    await resetConfigValues([spec.key], `重置 ${spec.key}`)
    NKMessage.success('已重置')
    await loadAll()
  } catch (err: any) {
    NKMessage.error(err.message || '重置失败')
  }
}

async function resetAll() {
  if (!window.confirm('确认将所有配置重置为默认值？')) return
  resetting.value = true
  try {
    await resetConfigValues([], '全部重置')
    NKMessage.success('已全部重置')
    await loadAll()
  } catch (err: any) {
    NKMessage.error(err.message || '重置失败')
  } finally {
    resetting.value = false
  }
}

onMounted(loadAll)
</script>

<style scoped lang="scss">
.cc-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.cc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.cc-title {
  margin: 0;
  font-size: 22px;
}
.cc-muted {
  color: var(--nk-text-color-secondary, #888);
  font-size: 13px;
}
.cc-actions {
  display: flex;
  gap: 8px;
}
.cc-banner {
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(22, 119, 255, 0.08);
  color: var(--nk-color-primary-600, #0958d9);
  font-size: 13px;
}
.cc-layout {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
.cc-nav {
  padding: 10px;
}
.cc-nav-title {
  font-weight: 600;
  font-size: 13px;
  padding: 4px 8px 8px;
}
.cc-nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.cc-nav-item:hover {
  background: var(--nk-fill-color, #f5f6f8);
  color: var(--nk-color-neutral-900, #171717);
}
.cc-nav-item--active {
  background: rgba(22, 119, 255, 0.1);
  color: var(--nk-color-primary-600, #0958d9);
  font-weight: 600;
}
.cc-panel {
  padding: 16px;
}
.cc-panel-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  margin-bottom: 12px;
}
.cc-field {
  border-bottom: 1px solid var(--nk-border-color, #eee);
  padding: 10px 0;
}
.cc-field:last-of-type {
  border-bottom: none;
}
.cc-field-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}
.cc-field-key {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--nk-font-family-mono, monospace);
  font-size: 13px;
  font-weight: 600;
}
.cc-field-desc {
  color: var(--nk-text-color-secondary, #888);
  font-size: 12px;
  margin-top: 2px;
}
.cc-field-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.cc-field-control {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}
.cc-save-row {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}
.cc-history {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cc-history-row {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  font-size: 13px;
  padding: 6px 0;
  border-bottom: 1px solid var(--nk-border-color, #eee);
}
.cc-history-key {
  font-family: var(--nk-font-family-mono, monospace);
  font-weight: 600;
}
.cc-history-value {
  display: flex;
  gap: 8px;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cc-history-meta {
  color: var(--nk-text-color-secondary, #888);
  white-space: nowrap;
}
@media (max-width: 900px) {
  .cc-layout {
    grid-template-columns: 1fr;
  }
  .cc-history-row {
    grid-template-columns: 1fr;
  }
}
</style>
