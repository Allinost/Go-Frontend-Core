<template>
  <div class="webhook-configs">
    <div class="webhook-configs__header">
      <h2 class="webhook-configs__title">Webhook 配置</h2>
      <div class="webhook-configs__actions">
        <NkButton size="sm" @click="$router.push('/webhook/create')">创建配置</NkButton>
      </div>
    </div>

    <div class="webhook-configs__filters">
      <NkSelect v-model="filters.type" placeholder="类型" :options="typeOptions" clearable size="sm" style="width: 140px" />
      <NkSelect v-model="filters.status" placeholder="状态" :options="statusOptions" clearable size="sm" style="width: 140px" />
      <NkInput v-model="filters.source" placeholder="来源" size="sm" style="width: 160px" />
      <NkInput v-model="filters.keyword" placeholder="名称/URL" size="sm" style="width: 200px" />
      <NkButton size="sm" @click="loadConfigs">搜索</NkButton>
      <NkButton size="sm" variant="ghost" @click="resetFilters">重置</NkButton>
    </div>

    <div class="webhook-configs__table-card">
      <NkLoading v-if="loading" />
      <table v-else class="wh-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>类型</th>
            <th>URL</th>
            <th>状态</th>
            <th>来源</th>
            <th>标签</th>
            <th>发送/失败</th>
            <th>最后发送</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item._id">
            <td>
              <router-link :to="`/webhook/${item._id}`" class="wh-table__link">{{ item.name }}</router-link>
            </td>
            <td><NkTag size="sm">{{ typeLabel(item.type) }}</NkTag></td>
            <td class="wh-table__url" :title="item.url">{{ item.url }}</td>
            <td>
              <NkTag
                size="sm"
                :type="statusTagType(item.status)"
                style="cursor:pointer"
                @click="toggleStatus(item)"
              >
                {{ statusLabel(item.status) }}
              </NkTag>
            </td>
            <td>{{ item.source }}</td>
            <td>
              <NkTag v-for="tag in item.tags" :key="tag" size="sm" variant="outline" style="margin-right: 2px">{{ tag }}</NkTag>
              <span v-if="!item.tags?.length">-</span>
            </td>
            <td>{{ item.total_sent }}/{{ item.total_failed }}</td>
            <td>{{ formatTime(item.last_sent_at) }}</td>
            <td>
              <NkButton size="sm" variant="ghost" @click="$router.push(`/webhook/${item._id}`)">详情</NkButton>
              <NkButton size="sm" variant="ghost" @click="$router.push(`/webhook/${item._id}/edit`)">编辑</NkButton>
              <NkButton size="sm" variant="ghost" :loading="sendingId === item._id" @click="handleQuickSend(item)">发送</NkButton>
              <NkButton size="sm" variant="ghost" @click="openCustomSend(item)">自定义发送</NkButton>
              <NkButton size="sm" variant="ghost" type="danger" @click="confirmDelete(item)">删除</NkButton>
            </td>
          </tr>
          <tr v-if="!items.length && !loading">
            <td colspan="9" class="wh-table__empty"><NkEmpty description="暂无配置" /></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="webhook-configs__pagination">
      <NkPagination v-model="page" :total="total" :page-size="pageSize" @change="loadConfigs" />
    </div>

    <NkDialog v-model:visible="showCustomSend" title="发送自定义内容" :width="560">
      <div class="wh-send-form">
        <div class="wh-send-form__field">
          <label class="wh-send-form__label">目标</label>
          <NkInput :model-value="customSendTarget?.name" disabled />
        </div>
        <div class="wh-send-form__field">
          <label class="wh-send-form__label">消息类型</label>
          <NkSelect v-model="sendForm.msg_type" :options="msgTypeOptions" />
        </div>
        <div class="wh-send-form__field">
          <label class="wh-send-form__label">标题 <span class="wh-create__required">*</span></label>
          <NkInput v-model="sendForm.title" placeholder="消息标题" />
        </div>
        <div class="wh-send-form__field">
          <label class="wh-send-form__label">内容 <span class="wh-create__required">*</span></label>
          <NkInput v-model="sendForm.content" type="textarea" :rows="5" placeholder="消息内容，支持 markdown" />
        </div>
        <div class="wh-send-form__field">
          <label class="wh-send-form__label">来源</label>
          <NkInput v-model="sendForm.source" placeholder="frontend-test" />
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showCustomSend = false">取消</NkButton>
        <NkButton :loading="sendingCustom" :disabled="!sendForm.title || !sendForm.content" @click="handleCustomSend">发送</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="showDeleteDialog" title="确认删除" :width="400">
      <p>确定要删除 Webhook 配置 <strong>{{ deletingItem?.name }}</strong> 吗？</p>
      <template #footer>
        <NkButton variant="ghost" @click="showDeleteDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="deleting" @click="handleDelete">确认删除</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { listConfigs, deleteConfig, updateConfigStatus, testSendConfig, sendWebhook } from '@/api/webhook'
import type { WebhookConfig } from '@/types/webhook'
import { NKMessage } from '@nkui/vue/src/utils/message'

const loading = ref(false)
const items = ref<WebhookConfig[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const filters = reactive({
  type: '',
  status: '',
  source: '',
  keyword: '',
})

const typeOptions = [
  { label: '飞书', value: 'feishu' },
  { label: '钉钉', value: 'dingtalk' },
  { label: '企微', value: 'wecom' },
  { label: 'GitHub', value: 'github' },
  { label: '通用', value: 'generic' },
]

const statusOptions = [
  { label: '活跃', value: 'active' },
  { label: '暂停', value: 'paused' },
  { label: '禁用', value: 'disabled' },
]

async function loadConfigs() {
  loading.value = true
  try {
    const params: any = { page: page.value, page_size: pageSize.value }
    if (filters.type) params.type = filters.type
    if (filters.status) params.status = filters.status
    if (filters.source) params.source = filters.source
    if (filters.keyword) params.keyword = filters.keyword
    const res = await listConfigs(params)
    items.value = res.data.items
    total.value = res.data.total
  } catch (err: any) {
    NKMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.type = ''
  filters.status = ''
  filters.source = ''
  filters.keyword = ''
  page.value = 1
  loadConfigs()
}

function typeLabel(type: string): string {
  const map: Record<string, string> = { feishu: '飞书', dingtalk: '钉钉', wecom: '企微', github: 'GitHub', generic: '通用' }
  return map[type] || type
}

function statusLabel(status: string): string {
  const map: Record<string, string> = { active: '活跃', paused: '暂停', disabled: '禁用' }
  return map[status] || status
}

function statusTagType(status: string): string {
  const map: Record<string, string> = { active: 'success', paused: 'warning', disabled: 'danger' }
  return map[status] || 'info'
}

async function toggleStatus(item: WebhookConfig) {
  const next = item.status === 'active' ? 'paused' : item.status === 'paused' ? 'disabled' : 'active'
  try {
    await updateConfigStatus(item._id, next)
    NKMessage.success(`状态已切换为 ${statusLabel(next)}`)
    loadConfigs()
  } catch (err: any) {
    NKMessage.error(err.message || '状态切换失败')
  }
}

function formatTime(t?: string): string {
  if (!t) return '-'
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const sendingId = ref<string | null>(null)

async function handleQuickSend(item: WebhookConfig) {
  sendingId.value = item._id
  try {
    const res = await testSendConfig(item._id)
    NKMessage.success(res.data?.message || '测试消息已发送')
  } catch (err: any) {
    NKMessage.error(err.message || '发送失败')
  } finally {
    sendingId.value = null
  }
}

const showCustomSend = ref(false)
const sendingCustom = ref(false)
const customSendTarget = ref<WebhookConfig | null>(null)
const msgTypeOptions = [
  { label: '文本', value: 'text' },
  { label: 'Markdown', value: 'markdown' },
  { label: '卡片', value: 'card' },
  { label: '交互', value: 'interactive' },
]
const sendForm = reactive({
  msg_type: 'text' as string,
  title: '',
  content: '',
  source: 'frontend-test',
})

function openCustomSend(item: WebhookConfig) {
  customSendTarget.value = item
  sendForm.title = ''
  sendForm.content = ''
  sendForm.msg_type = 'text'
  sendForm.source = 'frontend-test'
  showCustomSend.value = true
}

async function handleCustomSend() {
  if (!customSendTarget.value) return
  sendingCustom.value = true
  try {
    const res = await sendWebhook({
      webhook_ids: [customSendTarget.value._id],
      source: sendForm.source,
      title: sendForm.title,
      content: sendForm.content,
      msg_type: sendForm.msg_type as any,
    })
    NKMessage.success(`已发送：成功 ${res.data.success}，失败 ${res.data.failed}`)
    showCustomSend.value = false
  } catch (err: any) {
    NKMessage.error(err.message || '发送失败')
  } finally {
    sendingCustom.value = false
  }
}

const showDeleteDialog = ref(false)
const deleting = ref(false)
const deletingItem = ref<WebhookConfig | null>(null)

function confirmDelete(item: WebhookConfig) {
  deletingItem.value = item
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingItem.value) return
  deleting.value = true
  try {
    await deleteConfig(deletingItem.value._id)
    NKMessage.success('已删除')
    showDeleteDialog.value = false
    loadConfigs()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

onMounted(loadConfigs)
</script>

<style lang="scss" scoped>
.webhook-configs {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-lg;
  }
  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }
  &__actions {
    display: flex;
    gap: $nk-spacing-sm;
  }
  &__filters {
    display: flex;
    gap: $nk-spacing-sm;
    align-items: center;
    margin-bottom: $nk-spacing-lg;
    flex-wrap: wrap;
  }
  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: $nk-spacing-lg;
  }
}

.wh-table {
  width: 100%;
  border-collapse: collapse;
  font-size: $nk-font-size-sm;

  th, td {
    text-align: left;
    padding: $nk-spacing-sm $nk-spacing-md;
    border-bottom: 1px solid $nk-color-neutral-200;
  }
  th {
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-500;
    background: $nk-color-neutral-50;
    font-size: $nk-font-size-xs;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  td {
    color: $nk-color-neutral-700;
  }
  tbody tr:hover {
    background: $nk-color-neutral-50;
  }
  &__empty {
    text-align: center;
    padding: $nk-spacing-3xl;
  }
  &__link {
    color: $nk-color-primary-600;
    text-decoration: none;
    font-weight: $nk-font-weight-medium;
    &:hover {
      text-decoration: underline;
    }
  }
  &__url {
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.wh-send-form {
  padding: $nk-spacing-xs 0;
  &__field {
    margin-bottom: $nk-spacing-lg;
  }
  &__label {
    display: block;
    font-size: $nk-font-size-sm;
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-700;
    margin-bottom: $nk-spacing-xs;
  }
}
</style>
