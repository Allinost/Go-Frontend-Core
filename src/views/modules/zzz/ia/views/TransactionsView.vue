<template>
  <div class="ia-transactions">
    <div class="ia-transactions__header">
      <h2 class="ia-transactions__title">交易记录</h2>
      <div class="ia-transactions__actions">
        <NkButton type="primary" @click="createDialogVisible = true">记录交易</NkButton>
      </div>
    </div>
    <div class="ia-transactions__filters">
      <AccountSelector v-model="accountId" @change="load" />
      <NkSelect v-model="tradeType" :options="tradeTypeOptions" clearable placeholder="交易类型" @change="load" />
    </div>
    <NkLoading v-if="loading" />
    <table v-else class="ia-transactions__table">
        <thead>
          <tr>
            <th>标的</th>
            <th>类型</th>
            <th class="text-right">份额</th>
            <th class="text-right">价格</th>
            <th class="text-right">金额</th>
            <th class="text-right">手续费</th>
            <th class="text-right">盈亏</th>
            <th>状态</th>
            <th>时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tx in transactions" :key="tx.id">
            <td>{{ tx.asset?.name }} ({{ tx.asset?.code }})</td>
            <td><NkTag :type="tradeTypeTag(tx.trade_type)">{{ tradeTypeLabel(tx.trade_type) }}</NkTag></td>
            <td class="text-right">{{ tx.shares }}</td>
            <td class="text-right">{{ tx.price?.toFixed(2) }}</td>
            <td class="text-right">{{ tx.amount?.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</td>
            <td class="text-right">{{ tx.fee?.toFixed(2) }}</td>
            <td class="text-right"><PnLBadge :value="tx.realized_pnl || 0" type="amount" /></td>
            <td><NkTag :type="tx.status === 'confirmed' ? 'success' : 'warning'">{{ tx.status === 'confirmed' ? '已确认' : '待确认' }}</NkTag></td>
            <td>{{ formatTime(tx.trade_at) }}</td>
            <td>
              <div class="ia-transactions__btns">
                <NkButton v-if="tx.status === 'pending'" size="xs" @click="handleConfirm(tx.id)">确认</NkButton>
                <NkButton size="xs" type="danger" @click="handleDelete(tx.id)">删除</NkButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <NkEmpty v-if="!loading && transactions.length === 0" description="暂无交易记录" />
      <NkPagination v-if="total > pageSize" v-model="page" :total="total" :page-size="pageSize" @change="load" />

    <NkDialog v-model:visible="createDialogVisible" title="记录交易" width="520px">
      <div class="ia-transactions__form">
        <div class="ia-transactions__field">
          <label class="ia-transactions__label">账户 *</label>
          <NkSelect v-model="form.account_id" :options="accountOptions" placeholder="选择账户" />
        </div>
        <div class="ia-transactions__field">
          <label class="ia-transactions__label">标的 *</label>
          <AssetSearch v-model="form.asset_id" />
        </div>
        <div class="ia-transactions__field">
          <label class="ia-transactions__label">交易类型 *</label>
          <NkSelect v-model="form.trade_type" :options="tradeTypeOptions" placeholder="选择类型" />
        </div>
        <div class="ia-transactions__row">
          <div class="ia-transactions__field">
            <label class="ia-transactions__label">份额</label>
            <NkInput v-model.number="form.shares" type="number" placeholder="份额" @input="calcAmount" />
          </div>
          <div class="ia-transactions__field">
            <label class="ia-transactions__label">价格</label>
            <NkInput v-model.number="form.price" type="number" placeholder="价格" @input="calcAmount" />
          </div>
        </div>
        <div class="ia-transactions__field">
          <label class="ia-transactions__label">金额</label>
          <NkInput v-model.number="form.amount" type="number" placeholder="金额(可自动计算)" />
        </div>
        <div class="ia-transactions__row">
          <div class="ia-transactions__field">
            <label class="ia-transactions__label">手续费</label>
            <NkInput v-model.number="form.fee" type="number" placeholder="0" />
          </div>
          <div class="ia-transactions__field">
            <label class="ia-transactions__label">税</label>
            <NkInput v-model.number="form.tax" type="number" placeholder="0" />
          </div>
        </div>
        <div class="ia-transactions__field">
          <label class="ia-transactions__label">交易时间</label>
          <NkInput v-model="form.trade_at" type="date" />
        </div>
        <div class="ia-transactions__field">
          <label class="ia-transactions__label">备注</label>
          <NkTextarea v-model="form.remark" />
        </div>
        <div class="ia-transactions__collapse">
          <div class="ia-transactions__collapse-header" @click="showAdvanced = !showAdvanced">
            高级选项 {{ showAdvanced ? '▲' : '▼' }}
          </div>
          <div v-show="showAdvanced" class="ia-transactions__collapse-body">
            <div class="ia-transactions__field">
              <label class="ia-transactions__label">目标价 <span class="ia-hint">买入后可在持仓页随时调整</span></label>
              <NkInput v-model.number="form.target_price" type="number" placeholder="0" />
            </div>
            <div class="ia-transactions__field">
              <label class="ia-transactions__label">止损价 <span class="ia-hint">买入后可在持仓页随时调整</span></label>
              <NkInput v-model.number="form.stop_loss_price" type="number" placeholder="0" />
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <NkButton @click="createDialogVisible = false">取消</NkButton>
        <NkButton type="primary" :loading="createSaving" @click="handleCreate">保存</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listTransactions, createTransaction, confirmTransaction, deleteTransaction, listAccounts } from '@/api/ia'
import type { Transaction } from '@/types/ia'
import { NKMessage } from '@nkui/vue/src/utils/message'
import AccountSelector from '../common/AccountSelector.vue'
import AssetSearch from '../common/AssetSearch.vue'
import PnLBadge from '../common/PnLBadge.vue'

const loading = ref(false)
const transactions = ref<Transaction[]>([])
const page = ref(1)
const pageSize = 20
const total = ref(0)
const accountId = ref('')
const tradeType = ref('')

const tradeTypeOptions = [
  { label: '买入', value: 'buy' },
  { label: '卖出', value: 'sell' },
  { label: '现金分红', value: 'dividend_cash' },
  { label: '红利再投', value: 'dividend_reinvest' },
  { label: '利息', value: 'interest' },
  { label: '送股', value: 'bonus_shares' },
]

const tradeTypeLabelMap: Record<string, string> = {
  buy: '买入', sell: '卖出', dividend_cash: '现金分红',
  dividend_reinvest: '红利再投', interest: '利息', bonus_shares: '送股',
}

function tradeTypeLabel(t: string) { return tradeTypeLabelMap[t] || t }
function tradeTypeTag(t: string) {
  if (t === 'buy') return 'success' as const
  if (t === 'sell') return 'danger' as const
  return 'info' as const
}

function formatTime(s: string) {
  if (!s) return ''
  return new Date(s).toLocaleString('zh-CN')
}

const createDialogVisible = ref(false)
const createSaving = ref(false)
const showAdvanced = ref(false)
const accountOptions = ref<{ label: string; value: string }[]>([])
  const form = ref({
  account_id: '',
  asset_id: '',
  trade_type: '',
  shares: null as number | null,
  price: null as number | null,
  amount: null as number | null,
  fee: 0 as number,
  tax: 0 as number,
  trade_at: '',
  remark: '',
  target_price: 0 as number,
  stop_loss_price: 0 as number,
})

function calcAmount() {
  if (form.value.shares && form.value.price) {
    form.value.amount = form.value.shares * form.value.price
  }
}

async function loadAccounts() {
  try {
    const res = await listAccounts({ status: 'active' })
    accountOptions.value = (res.data?.items || []).map((a) => ({ label: `${a.name} (${a.id})`, value: a.id }))
  } catch (e) {
    accountOptions.value = []
  }
}

async function load() {
  loading.value = true
  try {
    const params: any = { page: page.value, page_size: pageSize }
    if (accountId.value) params.account_id = accountId.value
    if (tradeType.value) params.trade_type = tradeType.value
    const res = await listTransactions(params)
    transactions.value = res.data?.items || []
    total.value = res.data?.total || 0
  } catch (e) {
    transactions.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!form.value.account_id || !form.value.asset_id || !form.value.trade_type) {
    NKMessage.error('请填写必填项')
    return
  }
  createSaving.value = true
  try {
    await createTransaction(form.value as any)
    NKMessage.success('交易记录已创建')
    createDialogVisible.value = false
    form.value = { account_id: '', asset_id: '', trade_type: '', shares: null, price: null, amount: null, fee: 0, tax: 0, trade_at: '', remark: '', target_price: 0, stop_loss_price: 0 }
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '创建失败')
  } finally {
    createSaving.value = false
  }
}

async function handleConfirm(id: number) {
  try {
    await confirmTransaction(id)
    NKMessage.success('已确认')
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '确认失败')
  }
}

async function handleDelete(id: number) {
  if (!confirm('确定删除该交易记录？删除后自动重放引擎会修正持仓。')) return
  try {
    await deleteTransaction(id)
    NKMessage.success('已删除')
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '删除失败')
  }
}

onMounted(() => {
  loadAccounts()
  load()
})
</script>

<style lang="scss" scoped>
.ia-transactions {
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
  &__actions {
    display: flex;
    gap: $nk-spacing-sm;
  }
  &__btns {
    display: flex;
    gap: $nk-spacing-xs;
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
    tr:hover td { background: $nk-color-neutral-50; }
  }
  &__form {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-md;
  }
  &__row {
    display: flex;
    gap: $nk-spacing-md;
    & > * { flex: 1; }
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
  &__collapse {
    border: 1px solid $nk-color-neutral-200;
    border-radius: $nk-radius-md;
    overflow: hidden;
    &-header {
      padding: $nk-spacing-sm $nk-spacing-md;
      background: $nk-color-neutral-50;
      cursor: pointer;
      font-size: $nk-font-size-sm;
      color: $nk-color-neutral-600;
    }
    &-body {
      padding: $nk-spacing-md;
      display: flex;
      flex-direction: column;
      gap: $nk-spacing-md;
    }
  }
  .text-right { text-align: right; }
  .ia-hint { font-weight: normal; color: $nk-color-neutral-400; font-size: $nk-font-size-xs; }
}
</style>
