<template>
  <div class="goodser__tab">
    <div class="goodser__tab-header">
      <span class="goodser__count">共 {{ filteredReturns.length }} 张退货单</span>
      <div class="goodser__return-toolbar">
        <NkInput
          v-model="returnQuery"
          placeholder="搜索单号/商品/备注..."
          size="sm"
          style="width: 220px"
          clearable
        />
        <NkSelect
          v-model="returnStatusFilter"
          :options="returnStatusOptions"
          size="sm"
          style="width: 140px"
        />
        <NkButton size="sm" variant="ghost" @click="fetchReturns">刷新</NkButton>
      </div>
    </div>
    <NkLoading v-if="loading" />
    <div v-else-if="!filteredReturns.length" class="goodser__empty">
      <NkEmpty :description="returnQuery || returnStatusFilter ? '未匹配退货单' : '暂无退货单'" />
    </div>
    <div v-else class="goodser__return-list">
      <NkCard v-for="ret in filteredReturns" :key="ret._id" class="goodser__return-card">
        <div class="goodser__order-card-header">
          <div>
            <span class="goodser__order-no">{{ ret.order_no }}</span>
            <NkTag :type="returnStatusType(ret.status)" size="sm" style="margin-left: 8px">
              {{ returnStatusLabel(ret.status) }}
            </NkTag>
            <NkTag size="sm" style="margin-left: 4px">{{ returnReasonLabel(ret.reason) }}</NkTag>
          </div>
          <span class="goodser__order-date">{{ formatDate(ret.created_at) }}</span>
        </div>
        <div class="goodser__order-meta">
          <span>{{ ret.items?.length || 0 }} 种商品</span>
          <span>合计 {{ returnTotalQty(ret) }} 件</span>
          <span v-if="ret.remark">{{ ret.remark }}</span>
        </div>
        <div class="goodser__return-lines">
          <div v-for="line in (ret.items || []).slice(0, 3)" :key="line.product_id" class="goodser__return-line">
            <span class="goodser__return-line-name">{{ line.product_name || line.product_code }}</span>
            <span class="goodser__return-line-qty">× {{ line.quantity }}</span>
            <NkTag size="sm" :type="line.restock ? 'success' : 'info'">
              {{ line.restock ? '回库' : '不回库' }}
            </NkTag>
          </div>
          <span v-if="(ret.items?.length || 0) > 3" class="goodser__return-more">
            还有 {{ (ret.items?.length || 0) - 3 }} 种商品
          </span>
        </div>
        <div class="goodser__order-actions">
          <NkButton size="xs" variant="ghost" @click="emit('view-order', ret.outbound_order_id)">
            查看出库单
          </NkButton>
          <template v-if="ret.status === 'pending'">
            <NkButton size="xs" variant="ghost" :loading="actingId === ret._id" @click="askConfirm(ret)">
              确认退货
            </NkButton>
            <NkButton
              size="xs"
              variant="ghost"
              type="danger"
              :disabled="actingId === ret._id"
              @click="handleCancel(ret)"
            >取消</NkButton>
          </template>
        </div>
      </NkCard>
    </div>

    <ConfirmDialog
      v-model:visible="showConfirmDialog"
      title="确认退货"
      :message="`确认退货单「${confirmingReturn?.order_no || ''}」吗？将按明细中的「回库」设置调整库存。`"
      confirm-text="确认退货"
      :loading="actingId === confirmingReturn?._id"
      @confirm="handleConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import { cancelReturn, confirmReturn, loadReturns } from '@/api/goodser'
import type { ReturnOrder } from '@/types/goodser'
import {
  formatDate,
  returnReasonLabel,
  returnStatusLabel,
  returnStatusType,
  returnTotalQty,
} from '../utils'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps<{
  inventoryId: string
}>()

const emit = defineEmits<{
  (e: 'view-order', outboundOrderId: string): void
  (e: 'changed'): void
}>()

const allReturns = ref<ReturnOrder[]>([])
const loading = ref(false)
const actingId = ref('')
const showConfirmDialog = ref(false)
const confirmingReturn = ref<ReturnOrder | null>(null)
const returnQuery = ref('')
const returnStatusFilter = ref('')
const returnStatusOptions = [
  { label: '全部状态', value: '' },
  { label: '待确认', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
  { label: '已取消', value: 'cancelled' },
]

const filteredReturns = computed(() => {
  let list = allReturns.value
  if (returnStatusFilter.value) {
    list = list.filter((ret) => ret.status === returnStatusFilter.value)
  }
  const keyword = returnQuery.value.trim().toLowerCase()
  if (keyword) {
    list = list.filter((ret) => {
      if ((ret.order_no || '').toLowerCase().includes(keyword)) return true
      if ((ret.remark || '').toLowerCase().includes(keyword)) return true
      if (returnReasonLabel(ret.reason).toLowerCase().includes(keyword)) return true
      return (ret.items || []).some((item) =>
        (item.product_name || '').toLowerCase().includes(keyword) ||
        (item.product_code || '').toLowerCase().includes(keyword),
      )
    })
  }
  return list
})

async function fetchReturns() {
  if (!props.inventoryId) return
  loading.value = true
  try {
    const res = await loadReturns(props.inventoryId)
    allReturns.value = res.data || []
  } catch (err: any) {
    allReturns.value = []
    NKMessage.error(err.message || '加载退货单失败')
  } finally {
    loading.value = false
  }
}

function askConfirm(ret: ReturnOrder) {
  confirmingReturn.value = ret
  showConfirmDialog.value = true
}

async function handleConfirm() {
  const ret = confirmingReturn.value
  if (!ret) return
  actingId.value = ret._id
  try {
    await confirmReturn(ret.inventory_id, ret._id)
    NKMessage.success('退货已确认')
    showConfirmDialog.value = false
    confirmingReturn.value = null
    await fetchReturns()
    emit('changed')
  } catch (err: any) {
    NKMessage.error(err.message || '确认退货失败')
  } finally {
    actingId.value = ''
  }
}

async function handleCancel(ret: ReturnOrder) {
  actingId.value = ret._id
  try {
    await cancelReturn(ret.inventory_id, ret._id)
    NKMessage.success('退货单已取消')
    await fetchReturns()
    emit('changed')
  } catch (err: any) {
    NKMessage.error(err.message || '取消退货失败')
  } finally {
    actingId.value = ''
  }
}

watch(() => props.inventoryId, fetchReturns, { immediate: true })
</script>

<style lang="scss" scoped>
@use '../styles/shared';
</style>
