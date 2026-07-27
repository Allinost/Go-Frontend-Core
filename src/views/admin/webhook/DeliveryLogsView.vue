<template>
  <div class="wh-logs">
    <div class="wh-logs__header">
      <h2 class="wh-logs__title">Webhook 投递日志</h2>
    </div>

    <div class="wh-logs__toolbar">
      <div class="wh-logs__filters">
        <NkInput v-model="filters.webhook_id" placeholder="Webhook ID" size="sm" style="width: 180px" />
        <NkSelect v-model="filters.status" placeholder="状态" :options="statusOptions" clearable size="sm" style="width: 140px" />
        <NkInput v-model="filters.source" placeholder="来源" size="sm" style="width: 160px" />
        <NkButton size="sm" @click="loadLogs">搜索</NkButton>
        <NkButton size="sm" variant="ghost" @click="resetFilters">重置</NkButton>
      </div>
      <div class="wh-logs__batch-actions">
        <NkButton
          size="sm"
          type="danger"
          :disabled="selectedIds.length === 0"
          @click="showBatchDeleteDialog = true"
        >
          批量删除{{ selectedIds.length ? ` (${selectedIds.length})` : '' }}
        </NkButton>
      </div>
    </div>

    <div class="wh-logs__table-card">
      <NkLoading v-if="loading" />
      <table v-else class="wh-logs__table">
        <thead>
          <tr>
            <th style="width:40px">
              <input type="checkbox" :checked="allSelected" :indeterminate="partialSelected" @change="toggleSelectAll" />
            </th>
            <th>时间</th>
            <th>Webhook</th>
            <th>类型</th>
            <th>标题</th>
            <th>来源</th>
            <th>状态</th>
            <th>状态码</th>
            <th>耗时</th>
            <th>错误</th>
            <th style="width:60px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id" :class="{ 'wh-logs__row--selected': selectedIds.includes(item.id) }">
            <td>
              <input type="checkbox" :checked="selectedIds.includes(item.id)" @change="toggleSelect(item.id)" />
            </td>
            <td class="wh-logs__cell-nowrap">{{ formatTime(item.created_at) }}</td>
            <td>{{ item.webhook_name || item.webhook_id }}</td>
            <td><NkTag size="sm">{{ item.webhook_type }}</NkTag></td>
            <td class="wh-logs__cell-max">{{ item.title }}</td>
            <td>{{ item.source }}</td>
            <td>
              <NkTag size="sm" :type="logStatusTagType(item.status)">
                {{ logStatusLabel(item.status) }}
              </NkTag>
            </td>
            <td>{{ item.status_code || '-' }}</td>
            <td>{{ item.duration_ms }}ms</td>
            <td class="wh-logs__cell-max" :title="item.error">{{ item.error || '-' }}</td>
            <td>
              <NkButton size="sm" variant="ghost" type="danger" @click="confirmDeleteLog(item)" title="删除">
                <NkIcon name="trash-2" size="sm" />
              </NkButton>
            </td>
          </tr>
          <tr v-if="!items.length && !loading">
            <td colspan="11" class="wh-logs__empty"><NkEmpty description="暂无投递日志" /></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="wh-logs__pagination">
      <NkPagination v-model="page" :total="total" :page-size="pageSize" @change="loadLogs" />
    </div>

    <NkDialog v-model:visible="showDeleteDialog" title="确认删除" :width="400">
      <p>确定要删除该投递日志记录吗？</p>
      <p v-if="deletingLog" style="margin-top:8px;font-size:12px;color:#999">
        {{ formatTime(deletingLog.created_at) }} - {{ deletingLog.title }}
      </p>
      <template #footer>
        <NkButton variant="ghost" @click="showDeleteDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="deletingLogLoading" @click="handleDeleteLog">确认删除</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="showBatchDeleteDialog" title="批量删除" :width="420">
      <p>确定要删除选中的 <strong>{{ selectedIds.length }}</strong> 条投递日志吗？此操作不可恢复。</p>
      <template #footer>
        <NkButton variant="ghost" @click="showBatchDeleteDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="batchDeleting" @click="handleBatchDelete">确认删除</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { listDeliveryLogs, deleteDeliveryLog, batchDeleteDeliveryLogs } from '@/api/webhook'
import type { WebhookDeliveryLog } from '@/types/webhook'
import { NKMessage } from '@nkui/vue/src/utils/message'

const loading = ref(false)
const items = ref<WebhookDeliveryLog[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const filters = reactive({
  webhook_id: '',
  status: '',
  source: '',
})

const statusOptions = [
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failed' },
  { label: '限流', value: 'rate_limited' },
  { label: '去重', value: 'deduped' },
]

const selectedIds = ref<string[]>([])

const allSelected = computed(() => items.value.length > 0 && selectedIds.value.length === items.value.length)
const partialSelected = computed(() => selectedIds.value.length > 0 && selectedIds.value.length < items.value.length)

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = items.value.map(i => i.id)
  }
}

function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

async function loadLogs() {
  loading.value = true
  try {
    const params: any = { page: page.value, page_size: pageSize.value }
    if (filters.webhook_id) params.webhook_id = filters.webhook_id
    if (filters.status) params.status = filters.status
    if (filters.source) params.source = filters.source
    const res = await listDeliveryLogs(params)
    items.value = res.data.items
    total.value = res.data.total
    selectedIds.value = []
  } catch (err: any) {
    NKMessage.error(err.message || '加载日志失败')
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.webhook_id = ''
  filters.status = ''
  filters.source = ''
  page.value = 1
  loadLogs()
}

function logStatusLabel(status: string): string {
  const map: Record<string, string> = { success: '成功', failed: '失败', rate_limited: '限流', deduped: '去重' }
  return map[status] || status
}

function logStatusTagType(status: string): string {
  const map: Record<string, string> = { success: 'success', failed: 'danger', rate_limited: 'warning', deduped: 'default' }
  return map[status] || 'info'
}

const showDeleteDialog = ref(false)
const deletingLogLoading = ref(false)
const deletingLog = ref<WebhookDeliveryLog | null>(null)

function confirmDeleteLog(item: WebhookDeliveryLog) {
  deletingLog.value = item
  showDeleteDialog.value = true
}

async function handleDeleteLog() {
  if (!deletingLog.value) return
  deletingLogLoading.value = true
  try {
    await deleteDeliveryLog(deletingLog.value.id)
    NKMessage.success('日志已删除')
    showDeleteDialog.value = false
    loadLogs()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    deletingLogLoading.value = false
  }
}

const showBatchDeleteDialog = ref(false)
const batchDeleting = ref(false)

async function handleBatchDelete() {
  if (selectedIds.value.length === 0) return
  batchDeleting.value = true
  try {
    await batchDeleteDeliveryLogs([...selectedIds.value])
    NKMessage.success(`已删除 ${selectedIds.value.length} 条日志`)
    showBatchDeleteDialog.value = false
    loadLogs()
  } catch (err: any) {
    NKMessage.error(err.message || '批量删除失败')
  } finally {
    batchDeleting.value = false
  }
}

function formatTime(t: string): string {
  if (!t) return '-'
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

onMounted(loadLogs)
</script>

<style lang="scss" scoped>
.wh-logs {
  &__header {
    margin-bottom: $nk-spacing-lg;
  }
  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }
  &__toolbar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: $nk-spacing-lg;
    flex-wrap: wrap;
    gap: $nk-spacing-sm;
  }
  &__filters {
    display: flex;
    gap: $nk-spacing-sm;
    align-items: center;
    flex-wrap: wrap;
  }
  &__batch-actions {
    display: flex;
    align-items: center;
  }
  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: $nk-spacing-lg;
  }
  &__table {
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
    td { color: $nk-color-neutral-700; }
    tbody tr:hover { background: $nk-color-neutral-50; }
    input[type="checkbox"] {
      cursor: pointer;
    }
  }
  &__row--selected {
    background: $nk-color-primary-50 !important;
  }
  &__empty {
    text-align: center;
    padding: $nk-spacing-3xl;
  }
  &__cell-nowrap { white-space: nowrap; }
  &__cell-max {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
