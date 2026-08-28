<template>
  <div class="ia-alerts">
    <div class="ia-alerts__header">
      <h2 class="ia-alerts__title">价格告警</h2>
      <NkButton type="primary" @click="createDialogVisible = true">创建告警</NkButton>
    </div>
    <div class="ia-alerts__filters">
      <AccountSelector v-model="filters.account_id" @change="load" />
      <NkSelect v-model="filters.status" :options="statusOptions" clearable placeholder="状态" @change="load" />
    </div>
    <NkLoading v-if="loading" />
    <table v-else class="ia-alerts__table">
      <thead>
        <tr>
          <th>标的</th>
          <th>告警类型</th>
          <th class="text-right">目标价格</th>
          <th>状态</th>
          <th>触发时间</th>
          <th class="text-right">触发价格</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="alert in alerts" :key="alert.id">
          <td>{{ alert.asset?.name }} ({{ alert.asset?.code }})</td>
          <td><NkTag>{{ alertTypeLabel(alert.alert_type) }}</NkTag></td>
          <td class="text-right">{{ alert.target_price?.toFixed(2) }}</td>
          <td><NkTag :type="statusTag(alert.status)">{{ statusLabel(alert.status) }}</NkTag></td>
          <td>{{ alert.triggered_at ? formatTime(alert.triggered_at) : '-' }}</td>
          <td class="text-right">{{ alert.triggered_price ? alert.triggered_price.toFixed(2) : '-' }}</td>
          <td>
            <NkButton v-if="alert.status === 'triggered'" size="xs" @click="handleReactivate(alert.id)">重新激活</NkButton>
            <NkButton size="xs" type="danger" @click="handleDelete(alert)">删除</NkButton>
          </td>
        </tr>
      </tbody>
    </table>
    <NkEmpty v-if="!loading && alerts.length === 0" description="暂无告警" />

    <NkDialog v-model:visible="createDialogVisible" title="创建价格告警" width="420px">
      <div class="ia-alerts__form">
        <div class="ia-alerts__field">
          <label class="ia-alerts__label">账户 *</label>
          <AccountSelector v-model="createForm.account_id" :clearable="false" />
        </div>
        <div class="ia-alerts__field">
          <label class="ia-alerts__label">标的 *</label>
          <AssetSearch v-model="createForm.asset_id" />
        </div>
        <div class="ia-alerts__field">
          <label class="ia-alerts__label">告警类型 *</label>
          <NkSelect v-model="createForm.alert_type" :options="alertTypeOptions" />
        </div>
        <div class="ia-alerts__field">
          <label class="ia-alerts__label">目标价格 *</label>
          <NkInput v-model.number="createForm.target_price" type="number" />
        </div>
        <div class="ia-alerts__field">
          <label class="ia-alerts__label">备注</label>
          <NkTextarea v-model="createForm.note" />
        </div>
      </div>
      <template #footer>
        <NkButton @click="createDialogVisible = false">取消</NkButton>
        <NkButton type="primary" :loading="createSaving" @click="handleCreate">创建</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { listAlerts, createAlert, updateAlert, deleteAlert } from '@/api/ia'
import type { PriceAlert, CreateAlertReq } from '@/types/ia'
import { NKMessage } from '@nkui/vue/src/utils/message'
import AccountSelector from '../common/AccountSelector.vue'
import AssetSearch from '../common/AssetSearch.vue'

const loading = ref(false)
const alerts = ref<PriceAlert[]>([])
const createDialogVisible = ref(false)
const createSaving = ref(false)

const filters = reactive({ account_id: '', status: '' })

const alertTypeOptions = [
  { label: '止盈', value: 'take_profit' },
  { label: '止损', value: 'stop_loss' },
  { label: '目标价', value: 'target_price' },
]
const statusOptions = [
  { label: '生效中', value: 'active' },
  { label: '已触发', value: 'triggered' },
  { label: '已禁用', value: 'disabled' },
]

const alertTypeMap: Record<string, string> = { take_profit: '止盈', stop_loss: '止损', target_price: '目标价' }
const statusMap: Record<string, string> = { active: '生效中', triggered: '已触发', disabled: '已禁用' }
const statusTagMap: Record<string, any> = { active: 'success', triggered: 'warning', disabled: 'info' }

function alertTypeLabel(t: string) { return alertTypeMap[t] || t }
function statusLabel(s: string) { return statusMap[s] || s }
function statusTag(s: string) { return statusTagMap[s] || 'info' }

function formatTime(s: string) {
  if (!s) return ''
  return new Date(s).toLocaleString('zh-CN')
}

const createForm = reactive<CreateAlertReq>({
  account_id: '',
  asset_id: '',
  alert_type: 'take_profit',
  target_price: 0,
  note: '',
})

async function load() {
  loading.value = true
  try {
    const res = await listAlerts({
      account_id: filters.account_id || undefined,
      status: filters.status || undefined,
    })
    alerts.value = res.data?.items || []
  } catch (e) {
    alerts.value = []
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!createForm.account_id || !createForm.asset_id || !createForm.target_price) {
    NKMessage.error('请填写必填项')
    return
  }
  createSaving.value = true
  try {
    await createAlert(createForm)
    NKMessage.success('告警已创建')
    createDialogVisible.value = false
    Object.assign(createForm, { account_id: '', asset_id: '', alert_type: 'take_profit', target_price: 0, note: '' })
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '创建失败')
  } finally {
    createSaving.value = false
  }
}

async function handleReactivate(id: string) {
  try {
    await updateAlert(id, { status: 'active' })
    NKMessage.success('已重新激活')
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '操作失败')
  }
}

async function handleDelete(alert: PriceAlert) {
  if (!confirm('确定删除该告警？')) return
  try {
    await deleteAlert(alert.id)
    NKMessage.success('已删除')
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '删除失败')
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.ia-alerts {
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
  &__filters {
    display: flex;
    gap: $nk-spacing-sm;
    margin-bottom: $nk-spacing-lg;
  }
  &__table {
    width: 100%;
    border-collapse: collapse;
    th, td {
      padding: $nk-spacing-sm $nk-spacing-md;
      border-bottom: 1px solid $nk-color-neutral-200;
      text-align: left;
      white-space: nowrap;
    }
    th {
      background: $nk-color-neutral-50;
      font-weight: $nk-font-weight-medium;
      color: $nk-color-neutral-600;
      font-size: $nk-font-size-sm;
    }
    td { color: $nk-color-neutral-800; }
    .text-right { text-align: right; }
  }
  &__form {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-md;
  }
  &__field {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-xs;
  }
  &__label {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-600;
    font-weight: $nk-font-weight-medium;
  }
}
</style>
