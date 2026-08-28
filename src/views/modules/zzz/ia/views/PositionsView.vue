<template>
  <div class="ia-positions">
    <div class="ia-positions__header">
      <h2 class="ia-positions__title">持仓列表</h2>
      <div class="ia-positions__filters">
        <AccountSelector v-model="accountId" @change="load" />
        <NkSelect v-model="statusFilter" :options="statusOptions" @change="load" />
      </div>
    </div>
    <NkLoading v-if="loading" />
    <table v-else class="ia-positions__table">
        <thead>
          <tr>
            <th>标的名称</th>
            <th>代码</th>
            <th>类型</th>
            <th class="text-right">份额</th>
            <th class="text-right">成本价</th>
            <th class="text-right">最新价</th>
            <th class="text-right">市值</th>
            <th class="text-right">盈亏额</th>
            <th class="text-right">盈亏率</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pos in positions" :key="pos.id">
            <td>{{ pos.asset?.name }}</td>
            <td>{{ pos.asset?.code }}</td>
            <td>{{ pos.asset?.asset_type }}</td>
            <td class="text-right">{{ pos.shares }}</td>
            <td class="text-right">{{ pos.avg_cost?.toFixed(2) }}</td>
            <td class="text-right">{{ pos.last_price?.toFixed(2) }}</td>
            <td class="text-right">{{ pos.market_value?.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</td>
            <td class="text-right"><PnLBadge :value="pos.unrealized_pnl" type="amount" /></td>
            <td class="text-right"><PnLBadge :value="pos.pnl_ratio" /></td>
            <td>
              <div class="ia-positions__btns">
                <NkButton size="xs" @click="openTargetDialog(pos)">设置目标</NkButton>
                <NkButton size="xs" @click="openValuationDialog(pos)">更新估值</NkButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <NkEmpty v-if="!loading && positions.length === 0" description="暂无持仓数据" />

    <NkDialog v-model:visible="targetDialogVisible" title="设置追踪目标" width="420px">
      <div class="ia-positions__form">
        <div class="ia-positions__field">
          <label class="ia-positions__label">标的</label>
          <span>{{ targetForm.assetName }}</span>
        </div>
        <div class="ia-positions__field">
          <label class="ia-positions__label">目标价</label>
          <NkInput v-model.number="targetForm.target_price" type="number" placeholder="传 0 清除" />
        </div>
        <div class="ia-positions__field">
          <label class="ia-positions__label">止损价</label>
          <NkInput v-model.number="targetForm.stop_loss_price" type="number" placeholder="传 0 清除" />
        </div>
      </div>
      <template #footer>
        <NkButton @click="targetDialogVisible = false">取消</NkButton>
        <NkButton type="primary" :loading="targetSaving" @click="saveTarget">保存</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="valuationDialogVisible" title="手工更新估值" width="380px">
      <div class="ia-positions__form">
        <div class="ia-positions__field">
          <label class="ia-positions__label">标的</label>
          <span>{{ valuationForm.assetName }}</span>
        </div>
        <div class="ia-positions__field">
          <label class="ia-positions__label">最新价/净值 *</label>
          <NkInput v-model.number="valuationForm.price" type="number" />
        </div>
      </div>
      <template #footer>
        <NkButton @click="valuationDialogVisible = false">取消</NkButton>
        <NkButton type="primary" :loading="valuationSaving" @click="saveValuation">保存</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listPositions, setPositionTarget, updatePositionValuation } from '@/api/ia'
import type { Position } from '@/types/ia'
import { NKMessage } from '@nkui/vue/src/utils/message'
import AccountSelector from '../common/AccountSelector.vue'
import PnLBadge from '../common/PnLBadge.vue'

const loading = ref(false)
const positions = ref<Position[]>([])
const accountId = ref('')
const statusFilter = ref('holding')

const statusOptions = [
  { label: '持仓中', value: 'holding' },
  { label: '已清仓', value: 'closed' },
]

const targetDialogVisible = ref(false)
const targetSaving = ref(false)
const targetForm = ref({
  account_id: '',
  asset_id: '',
  assetName: '',
  target_price: 0,
  stop_loss_price: 0,
})

const valuationDialogVisible = ref(false)
const valuationSaving = ref(false)
const valuationForm = ref({
  account_id: '',
  asset_id: '',
  assetName: '',
  price: 0,
})

async function load() {
  loading.value = true
  try {
    const params: any = { status: statusFilter.value }
    if (accountId.value) params.account_id = accountId.value
    const res = await listPositions(params)
    positions.value = res.data || []
  } catch (e) {
    positions.value = []
  } finally {
    loading.value = false
  }
}

function openTargetDialog(pos: Position) {
  targetForm.value = {
    account_id: pos.account_id,
    asset_id: pos.asset_id,
    assetName: `${pos.asset?.name} (${pos.asset?.code})`,
    target_price: pos.target_price,
    stop_loss_price: pos.stop_loss_price,
  }
  targetDialogVisible.value = true
}

async function saveTarget() {
  targetSaving.value = true
  try {
    await setPositionTarget({
      account_id: targetForm.value.account_id,
      asset_id: targetForm.value.asset_id,
      target_price: targetForm.value.target_price,
      stop_loss_price: targetForm.value.stop_loss_price,
    })
    NKMessage.success('目标设置成功')
    targetDialogVisible.value = false
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '设置失败')
  } finally {
    targetSaving.value = false
  }
}

function openValuationDialog(pos: Position) {
  valuationForm.value = {
    account_id: pos.account_id,
    asset_id: pos.asset_id,
    assetName: `${pos.asset?.name} (${pos.asset?.code})`,
    price: pos.last_price || 0,
  }
  valuationDialogVisible.value = true
}

async function saveValuation() {
  if (!valuationForm.value.price) {
    NKMessage.error('请输入价格')
    return
  }
  valuationSaving.value = true
  try {
    await updatePositionValuation({
      account_id: valuationForm.value.account_id,
      asset_id: valuationForm.value.asset_id,
      price: valuationForm.value.price,
    })
    NKMessage.success('估值已更新')
    valuationDialogVisible.value = false
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '更新失败')
  } finally {
    valuationSaving.value = false
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.ia-positions {
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
    td {
      color: $nk-color-neutral-800;
    }
    tr:hover td {
      background: $nk-color-neutral-50;
    }
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
  &__btns {
    display: flex;
    gap: $nk-spacing-xs;
  }
  &__label {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-600;
    font-weight: $nk-font-weight-medium;
  }
  .text-right {
    text-align: right;
  }
}
</style>
