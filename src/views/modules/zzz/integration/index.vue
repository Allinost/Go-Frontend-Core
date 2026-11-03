<template>
  <div class="integration">
    <div class="integration__header">
      <div>
        <h2 class="integration__title">集成管理</h2>
        <p class="integration__subtitle">n8n / OpenClaw / LangBot 连接器与外盒事件</p>
      </div>
      <div class="integration__header-actions">
        <NkButton size="sm" variant="ghost" :loading="dispatching" @click="handleDispatch">立即分发</NkButton>
        <NkButton v-if="activeTab === 'connectors'" size="sm" @click="openCreate">新建连接器</NkButton>
      </div>
    </div>

    <NkTabs v-model="activeTab" :items="tabs" />

    <div class="integration__content">
      <!-- 连接器 -->
      <div v-if="activeTab === 'connectors'" class="integration__tab">
        <NkLoading v-if="loadingConnectors" />
        <div v-else-if="!connectors.length" class="integration__empty">
          <NkEmpty description="暂无连接器，点击右上角新建" />
        </div>
        <div v-else class="integration__grid">
          <NkCard v-for="item in connectors" :key="item.id" class="integration__card">
            <div class="integration__card-head">
              <div>
                <span class="integration__name">{{ item.name }}</span>
                <NkTag size="sm" :type="item.enabled ? 'success' : 'info'" style="margin-left:8px">
                  {{ item.enabled ? '已启用' : '已停用' }}
                </NkTag>
                <NkTag size="sm" style="margin-left:4px">{{ item.type }}</NkTag>
              </div>
              <span class="integration__secret" :class="{ 'integration__secret--on': item.secret_set }">
                {{ item.secret_set ? '已配置密钥' : '未配置密钥' }}
              </span>
            </div>
            <div class="integration__url">{{ item.url }}</div>
            <div class="integration__meta">
              <span>超时 {{ item.timeout_seconds || 10 }}s</span>
              <span>订阅 {{ topicsLabel(item) }}</span>
            </div>
            <div v-if="testResults[item.id]" class="integration__test">
              <NkTag size="sm" :type="testResults[item.id].ok ? 'success' : 'danger'">
                {{ testResults[item.id].ok ? '测试成功' : '测试失败' }}
              </NkTag>
              <span class="integration__test-time">{{ formatDate(testResults[item.id].at) }}</span>
              <span
                v-if="testResults[item.id].message"
                class="integration__test-msg"
                :title="testResults[item.id].message"
              >{{ testResults[item.id].message }}</span>
            </div>
            <div class="integration__actions">
              <NkButton size="xs" variant="ghost" :loading="testingId === item.id" @click="handleTest(item)">发送测试</NkButton>
              <NkButton size="xs" variant="ghost" @click="openEdit(item)">编辑</NkButton>
              <NkButton size="xs" variant="ghost" type="danger" @click="askDelete(item)">删除</NkButton>
            </div>
          </NkCard>
        </div>
      </div>

      <!-- 事件 -->
      <div v-if="activeTab === 'events'" class="integration__tab">
        <div class="integration__toolbar">
          <NkSelect v-model="eventStatus" :options="statusOptions" size="sm" style="width: 130px" @change="fetchEvents" />
          <NkSelect v-model="eventTopic" :options="topicOptions" size="sm" style="width: 220px" @change="fetchEvents" />
          <NkButton size="sm" variant="ghost" :loading="loadingEvents" @click="fetchEvents">刷新</NkButton>
          <NkButton v-if="hasEventFilter" size="sm" variant="ghost" @click="resetEventFilter">清空筛选</NkButton>
          <span class="integration__count">共 {{ events.length }} 条</span>
        </div>

        <NkLoading v-if="loadingEvents" />
        <div v-else-if="!events.length" class="integration__empty">
          <NkEmpty :description="hasEventFilter ? '未匹配事件，试试清空筛选' : '暂无外盒事件，触发一次库存或订单操作后再来查看'" />
        </div>
        <div v-else class="integration__event-list">
          <NkCard v-for="event in events" :key="event.id" class="integration__event">
            <div class="integration__event-head">
              <div>
                <span class="integration__topic">{{ event.topic }}</span>
                <NkTag size="sm" :type="eventStatusType(event.status)" style="margin-left:8px">{{ event.status }}</NkTag>
              </div>
              <span class="integration__time">{{ formatDate(event.created_at) }}</span>
            </div>
            <div class="integration__meta">
              <span>来源 {{ event.source || '-' }}</span>
              <span>尝试 {{ event.attempts }} 次</span>
              <span v-if="event.aggregate_type">{{ event.aggregate_type }}/{{ event.aggregate_id }}</span>
            </div>
            <div v-if="event.last_error" class="integration__error">{{ event.last_error }}</div>
            <details class="integration__payload">
              <summary>查看 payload</summary>
              <pre>{{ prettyPayload(event.payload) }}</pre>
            </details>
          </NkCard>
        </div>
      </div>
    </div>

    <!-- 新建 / 编辑连接器 -->
    <NkDialog v-model:visible="showDialog" :title="editingId ? '编辑连接器' : '新建连接器'" :width="520">
      <div class="integration__form">
        <label>名称</label>
        <NkInput v-model="form.name" placeholder="例如 n8n 生产通知" />
        <label>Webhook URL</label>
        <NkInput v-model="form.url" placeholder="https://n8n.example.com/webhook/xxx" />
        <label>签名密钥（{{ editingId ? '留空表示不修改' : '可选' }}）</label>
        <NkInput v-model="form.secret" placeholder="secret" />
        <label>订阅 topic（逗号分隔，留空表示全部）</label>
        <NkInput v-model="form.topicsText" placeholder="goodser.order.*, goodser.return.*" />
        <label>超时（秒）</label>
        <NkInput v-model="form.timeoutSeconds" type="number" placeholder="10" />
        <NkCheckbox v-model="form.enabled">启用该连接器</NkCheckbox>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showDialog = false">取消</NkButton>
        <NkButton :disabled="!form.name.trim() || !form.url.trim()" :loading="saving" @click="handleSave">保存</NkButton>
      </template>
    </NkDialog>

    <!-- 删除确认 -->
    <NkDialog v-model:visible="showDeleteDialog" title="删除连接器" :width="400">
      <p>确定删除 <strong>{{ deleting?.name }}</strong> 吗？删除后将不再接收事件。</p>
      <template #footer>
        <NkButton variant="ghost" @click="showDeleteDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="saving" @click="handleDelete">删除</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  loadConnectors, createConnector, updateConnector, deleteConnector,
  loadEvents, dispatchEvents, testConnector,
} from '@/api/integration'
import type { IntegrationConnector, IntegrationEvent } from '@/types/integration'

const tabs = [
  { label: '连接器', value: 'connectors' },
  { label: '外盒事件', value: 'events' },
]
const activeTab = ref('connectors')

const connectors = ref<IntegrationConnector[]>([])
const loadingConnectors = ref(false)
const events = ref<IntegrationEvent[]>([])
const loadingEvents = ref(false)
const eventStatus = ref('')
const eventTopic = ref('')
const topicOptions = ref<Array<{ label: string; value: string }>>([{ label: '全部主题', value: '' }])
const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '待投递', value: 'pending' },
  { label: '已投递', value: 'delivered' },
  { label: '失败', value: 'failed' },
]
const hasEventFilter = computed(() => !!eventStatus.value || !!eventTopic.value)
const testResults = ref<Record<string, { ok: boolean; message: string; at: string }>>({})
const TEST_RESULT_KEY = 'goodser_integration_test_results'

const dispatching = ref(false)
const testingId = ref('')
const saving = ref(false)
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const editingId = ref('')
const deleting = ref<IntegrationConnector | null>(null)
const form = reactive({
  name: '',
  url: '',
  secret: '',
  topicsText: '',
  timeoutSeconds: '10',
  enabled: true,
})

async function fetchConnectors() {
  loadingConnectors.value = true
  try {
    const res = await loadConnectors()
    connectors.value = res.data?.items || []
  } catch (e: any) {
    NKMessage.error(e?.message || '加载连接器失败')
  } finally {
    loadingConnectors.value = false
  }
}

async function fetchEvents() {
  loadingEvents.value = true
  try {
    const res = await loadEvents({
      status: eventStatus.value || undefined,
      topic: eventTopic.value || undefined,
      limit: 100,
    })
    events.value = res.data?.items || []
  } catch (e: any) {
    NKMessage.error(e?.message || '加载事件失败')
  } finally {
    loadingEvents.value = false
  }
}

async function fetchTopicOptions() {
  try {
    const res = await loadEvents({ limit: 200 })
    const topics = Array.from(
      new Set((res.data?.items || []).map((event) => event.topic).filter(Boolean)),
    ).sort()
    topicOptions.value = [
      { label: '全部主题', value: '' },
      ...topics.map((topic) => ({ label: topic, value: topic })),
    ]
  } catch {
    topicOptions.value = [{ label: '全部主题', value: '' }]
  }
}

function resetEventFilter() {
  eventStatus.value = ''
  eventTopic.value = ''
  fetchEvents()
}

function loadTestResults() {
  try {
    const raw = localStorage.getItem(TEST_RESULT_KEY)
    if (raw) testResults.value = JSON.parse(raw)
  } catch {
    testResults.value = {}
  }
}

function recordTest(id: string, ok: boolean, message: string) {
  const next = {
    ...testResults.value,
    [id]: { ok, message, at: new Date().toISOString() },
  }
  testResults.value = next
  try {
    localStorage.setItem(TEST_RESULT_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota errors */
  }
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, { name: '', url: '', secret: '', topicsText: '', timeoutSeconds: '10', enabled: true })
  showDialog.value = true
}

function openEdit(item: IntegrationConnector) {
  editingId.value = item.id
  Object.assign(form, {
    name: item.name,
    url: item.url,
    secret: '',
    topicsText: (item.topics || []).join(', '),
    timeoutSeconds: String(item.timeout_seconds || 10),
    enabled: item.enabled,
  })
  showDialog.value = true
}

async function handleSave() {
  if (!form.name.trim() || !form.url.trim()) return
  saving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      type: 'webhook',
      url: form.url.trim(),
      secret: form.secret.trim() ? form.secret.trim() : (editingId.value ? undefined : null),
      topics: form.topicsText.split(',').map(s => s.trim()).filter(Boolean),
      timeout_seconds: Number(form.timeoutSeconds) || 10,
      enabled: form.enabled,
    }
    if (editingId.value) {
      await updateConnector(editingId.value, payload)
    } else {
      await createConnector(payload)
    }
    NKMessage.success('连接器已保存')
    showDialog.value = false
    await fetchConnectors()
  } catch (e: any) {
    NKMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function askDelete(item: IntegrationConnector) {
  deleting.value = item
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deleting.value) return
  saving.value = true
  try {
    await deleteConnector(deleting.value.id)
    NKMessage.success('连接器已删除')
    showDeleteDialog.value = false
    await fetchConnectors()
  } catch (e: any) {
    NKMessage.error(e?.message || '删除失败')
  } finally {
    saving.value = false
  }
}

async function handleTest(item: IntegrationConnector) {
  testingId.value = item.id
  try {
    const res = await testConnector(item.id)
    const sent = res.data?.sent !== false
    recordTest(item.id, sent, sent ? '' : '服务端未发送测试事件')
    NKMessage[sent ? 'success' : 'warning'](sent ? '测试事件已发送' : '测试事件未发送')
  } catch (e: any) {
    recordTest(item.id, false, e?.message || '测试事件发送失败')
    NKMessage.error(e?.message || '测试事件发送失败')
  } finally {
    testingId.value = ''
  }
}

async function handleDispatch() {  dispatching.value = true
  try {
    const res = await dispatchEvents()
    const result = res.data
    NKMessage.success(`分发完成：成功 ${result?.delivered || 0}，失败 ${result?.failed || 0}`)
    if (activeTab.value === 'events') await fetchEvents()
  } catch (e: any) {
    NKMessage.error(e?.message || '分发失败')
  } finally {
    dispatching.value = false
  }
}

function eventStatusType(status: string) {
  if (status === 'delivered') return 'success'
  if (status === 'failed') return 'danger'
  return 'warning'
}

function topicsLabel(item: IntegrationConnector) {
  const topics = item.topics || []
  return topics.length ? topics.join('、') : '全部事件'
}

function prettyPayload(value: any) {
  if (value === null || value === undefined) return '-'
  try {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function formatDate(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

watch(activeTab, (tab) => {
  if (tab === 'events') {
    fetchEvents()
    fetchTopicOptions()
  }
  if (tab === 'connectors') fetchConnectors()
})

onMounted(() => {
  loadTestResults()
  fetchConnectors()
})
</script>

<style lang="scss" scoped>
.integration {
  max-width: 1100px;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: $nk-spacing-sm;
    flex-wrap: wrap;
    align-items: flex-start;
    margin-bottom: $nk-spacing-lg;
  }

  &__title {
    margin: 0;
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }

  &__subtitle {
    margin: 4px 0 0;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-500;
  }

  &__header-actions {
    display: flex;
    gap: $nk-spacing-sm;
  }

  &__content {
    margin-top: $nk-spacing-lg;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: $nk-spacing-md;
  }

  &__card {
    padding: $nk-spacing-md;
  }

  &__card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: $nk-spacing-sm;
  }

  &__name {
    font-size: $nk-font-size-base;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }

  &__secret {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-400;

    &--on {
      color: #52c41a;
    }
  }

  &__url {
    margin-top: $nk-spacing-sm;
    font-family: $nk-font-family-mono;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-600;
    word-break: break-all;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: $nk-spacing-sm;
    margin-top: $nk-spacing-sm;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: $nk-spacing-xs;
    margin-top: $nk-spacing-sm;
    padding-top: $nk-spacing-sm;
    border-top: 1px solid $nk-color-neutral-100;
  }

  &__toolbar {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    margin-bottom: $nk-spacing-md;
    flex-wrap: wrap;
  }

  &__count {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-500;
  }

  &__event-list {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-sm;
  }

  &__event {
    padding: $nk-spacing-md;
  }

  &__event-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__topic {
    font-family: $nk-font-family-mono;
    font-size: $nk-font-size-sm;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-800;
  }

  &__time {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-400;
  }

  &__error {
    margin-top: $nk-spacing-sm;
    padding: 6px 8px;
    border-radius: $nk-radius-sm;
    background: #fff1f0;
    color: #cf1322;
    font-size: $nk-font-size-xs;
    word-break: break-all;
  }

  &__test {
    display: flex;
    align-items: center;
    gap: $nk-spacing-xs;
    margin-top: $nk-spacing-sm;
    padding-top: $nk-spacing-sm;
    border-top: 1px dashed $nk-color-neutral-100;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
    min-width: 0;
  }

  &__test-time {
    flex-shrink: 0;
  }

  &__test-msg {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: $nk-color-error;
  }

  &__payload {
    margin-top: $nk-spacing-sm;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;

    summary {
      cursor: pointer;
    }

    pre {
      margin: 6px 0 0;
      padding: 8px;
      max-height: 200px;
      overflow: auto;
      border-radius: $nk-radius-sm;
      background: $nk-color-neutral-50;
      font-size: 12px;
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 8px;

    label {
      margin-top: 4px;
      font-size: $nk-font-size-sm;
      color: $nk-color-neutral-600;
    }
  }

  &__empty {
    padding: 40px 0;
  }
}
</style>
