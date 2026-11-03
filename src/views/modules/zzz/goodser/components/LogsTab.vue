<template>
  <div class="goodser__tab">
    <div class="goodser__tab-header">
      <span class="goodser__count">共 {{ logs.length }} 条记录</span>
      <div>
        <NkButton size="sm" variant="ghost" style="margin-right: 8px" @click="openInboundSearch">搜索导入</NkButton>
        <NkButton size="sm" @click="openInboundSingle">单品入库</NkButton>
      </div>
    </div>
    <NkLoading v-if="loading" />
    <div v-else-if="!logs.length" class="goodser__empty">
      <NkEmpty description="暂无入库记录" />
    </div>
    <div v-else class="goodser__log-list">
      <NkCard v-for="log in logs" :key="log._id" class="goodser__log-card">
        <div class="goodser__log-header">
          <span class="goodser__log-type">
            {{ log.type === 'single' ? '单品入库' : log.type === 'batch' ? '批量入库' : '搜索导入' }}
          </span>
          <span class="goodser__log-date">{{ formatDate(log.created_at) }}</span>
        </div>
        <div class="goodser__log-meta">
          <span v-if="log.order_no">单号: {{ log.order_no }}</span>
          <span>{{ log.items?.length || 0 }} 件商品</span>
          <span v-if="log.remark">{{ log.remark }}</span>
        </div>
      </NkCard>
    </div>

    <NkDialog v-model:visible="showInboundSingle" title="单品入库" :width="520">
      <div class="goodser__product-form">
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">商品名称 *</label>
            <NkInput v-model="inboundForm.name" placeholder="名称" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">编码</label>
            <NkInput v-model="inboundForm.code" placeholder="例如 A1-0001" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">主分区</label>
            <NkSelect v-model="inboundForm.main_zone" :options="zoneOptions" placeholder="选择分区" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">子分区</label>
            <NkSelect v-model="inboundForm.sub_zone" :options="subZoneOptions" placeholder="选择子分区" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">数量 *</label>
            <NkInput v-model="inboundForm.quantity" type="number" placeholder="0" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">状态</label>
            <NkSelect v-model="inboundForm.status_code" :options="statusCodeOptions" placeholder="选择状态" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field">
            <label class="goodser__form-label">备注</label>
            <NkTextarea v-model="inboundForm.remark" placeholder="备注" />
          </div>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showInboundSingle = false">取消</NkButton>
        <NkButton :loading="saving" :disabled="!inboundForm.name.trim()" @click="handleInboundSingle">入库</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="showInboundSearch" title="搜索导入" :width="520">
      <div class="goodser__form-field">
        <label class="goodser__form-label">搜索商品</label>
        <NkInput v-model="inboundSearchQuery" placeholder="名称/编码..." size="sm" @keyup.enter="doInboundSearch" />
        <NkButton size="xs" variant="ghost" @click="doInboundSearch" style="margin-top: 4px">搜索</NkButton>
      </div>
      <div v-if="inboundSearchResults.length" class="goodser__inbound-search-results">
        <div v-for="r in inboundSearchResults" :key="r._id" class="goodser__inbound-search-item">
          <div class="goodser__inbound-search-info">
            <span>{{ r.code }} - {{ r.name }}</span>
            <span class="goodser__inbound-search-stock">库存: {{ r.quantity }}</span>
          </div>
          <div class="goodser__inbound-search-action">
            <NkInput v-model="r._importQty" type="number" size="xs" style="width: 70px" placeholder="数量" />
            <NkButton size="xs" @click="addToInboundImport(r)">添加</NkButton>
          </div>
        </div>
      </div>
      <div v-if="inboundImportItems.length" class="goodser__inbound-import-list">
        <div class="goodser__inbound-import-header">待导入 ({{ inboundImportItems.length }})</div>
        <div v-for="(item, idx) in inboundImportItems" :key="idx" class="goodser__inbound-import-item">
          <span>{{ item.product_name }} ({{ item.product_code }}) × {{ item.quantity }}</span>
          <NkButton size="xs" variant="ghost" type="danger" @click="inboundImportItems.splice(idx, 1)">×</NkButton>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showInboundSearch = false">取消</NkButton>
        <NkButton :loading="saving" :disabled="!inboundImportItems.length" @click="handleInboundSearchImport">导入</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  inboundSearchImport,
  inboundSingle,
  loadInboundLogs,
  queryProducts,
} from '@/api/goodser'
import type { InboundLog, OrderItem, Product, StatusCode } from '@/types/goodser'
import { formatDate } from '../utils'

const props = defineProps<{
  inventoryId: string
  statusCodes: StatusCode[]
}>()

const emit = defineEmits<{
  (e: 'changed'): void
}>()

const logs = ref<InboundLog[]>([])
const loading = ref(false)
const saving = ref(false)
const showInboundSingle = ref(false)
const showInboundSearch = ref(false)
const inboundForm = ref({ name: '', code: '', main_zone: '', sub_zone: '', quantity: 0, status_code: '', remark: '' })
const inboundSearchQuery = ref('')
const inboundSearchResults = ref<(Product & { _importQty?: number })[]>([])
const inboundImportItems = ref<OrderItem[]>([])
const zoneOptions = ['A', 'B', 'C', 'D', 'E'].map((value) => ({ label: value, value }))
const subZoneOptions = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((value) => ({ label: value, value }))
let requestSeq = 0

const statusCodeOptions = computed(() =>
  props.statusCodes.map((sc) => ({ label: `${sc.code} - ${sc.label}`, value: sc.code })),
)

async function fetchLogs() {
  if (!props.inventoryId) return
  const seq = ++requestSeq
  loading.value = true
  try {
    const res = await loadInboundLogs({ inventory_id: props.inventoryId, page: 1, page_size: 50 })
    if (seq !== requestSeq) return
    logs.value = res.data?.items || []
  } catch (err: any) {
    if (seq !== requestSeq) return
    NKMessage.error(err.message || '加载入库记录失败')
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

function openInboundSingle() {
  inboundForm.value = { name: '', code: '', main_zone: '', sub_zone: '', quantity: 0, status_code: '', remark: '' }
  showInboundSingle.value = true
}

async function handleInboundSingle() {
  if (!props.inventoryId || !inboundForm.value.name.trim()) return
  saving.value = true
  try {
    const f = inboundForm.value
    await inboundSingle({
      inventory_id: props.inventoryId,
      name: f.name.trim(),
      code: f.code || `${f.main_zone || 'A'}${f.sub_zone || '1'}-0001`,
      main_zone: f.main_zone || 'A',
      sub_zone: f.sub_zone || '1',
      seq_number: 1,
      quantity: f.quantity || null,
      status_code: f.status_code || 'in_stock',
      remark: f.remark || null,
    })
    NKMessage.success('入库成功')
    showInboundSingle.value = false
    await fetchLogs()
    emit('changed')
  } catch (err: any) {
    NKMessage.error(err.message || '入库失败')
  } finally {
    saving.value = false
  }
}

function openInboundSearch() {
  inboundSearchQuery.value = ''
  inboundSearchResults.value = []
  inboundImportItems.value = []
  showInboundSearch.value = true
}

async function doInboundSearch() {
  if (!props.inventoryId || !inboundSearchQuery.value.trim()) return
  try {
    const res = await queryProducts({
      inventory_id: props.inventoryId,
      keyword: inboundSearchQuery.value.trim(),
      page_size: 20,
    })
    inboundSearchResults.value = (res.data?.items || []).map((p) => ({ ...p, _importQty: 0 }))
  } catch {
    inboundSearchResults.value = []
  }
}

function addToInboundImport(product: Product & { _importQty?: number }) {
  const qty = product._importQty || 1
  if (qty <= 0) return
  inboundImportItems.value.push({
    product_id: product._id,
    product_name: product.name,
    product_code: product.code,
    quantity: qty,
  })
  product._importQty = 0
}

async function handleInboundSearchImport() {
  if (!props.inventoryId || !inboundImportItems.value.length) return
  saving.value = true
  try {
    await inboundSearchImport({
      inventory_id: props.inventoryId,
      items: inboundImportItems.value.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        product_code: i.product_code,
        quantity: i.quantity,
      })),
    })
    NKMessage.success('导入成功')
    showInboundSearch.value = false
    await fetchLogs()
    emit('changed')
  } catch (err: any) {
    NKMessage.error(err.message || '导入失败')
  } finally {
    saving.value = false
  }
}

watch(() => props.inventoryId, fetchLogs, { immediate: true })
</script>

<style lang="scss" scoped>
@use '../styles/shared';

.goodser {
  &__log-list {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-md;
  }

  &__log-card {
    transition: box-shadow $nk-duration-fast;
    &:hover {
      box-shadow: $nk-shadow-md;
    }
  }

  &__log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-xs;
  }

  &__log-type {
    font-weight: $nk-font-weight-medium;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-900;
  }

  &__log-date {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
  }

  &__log-meta {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
    display: flex;
    gap: $nk-spacing-md;
    flex-wrap: wrap;
  }

  &__inbound-search-results {
    margin-top: $nk-spacing-sm;
    border: 1px solid $nk-color-neutral-200;
    border-radius: $nk-radius-md;
    max-height: 240px;
    overflow-y: auto;
  }

  &__inbound-search-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $nk-spacing-xs $nk-spacing-sm;
    font-size: $nk-font-size-sm;
    border-bottom: 1px solid $nk-color-neutral-100;
  }

  &__inbound-search-info {
    display: flex;
    flex-direction: column;
  }

  &__inbound-search-stock {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
  }

  &__inbound-search-action {
    display: flex;
    align-items: center;
    gap: $nk-spacing-xs;
  }

  &__inbound-import-list {
    margin-top: $nk-spacing-md;
  }

  &__inbound-import-header {
    font-size: $nk-font-size-sm;
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-700;
    margin-bottom: $nk-spacing-xs;
  }

  &__inbound-import-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    font-size: $nk-font-size-sm;
  }

  &__product-form {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-sm;
  }
}
</style>
