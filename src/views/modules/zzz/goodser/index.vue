<template>
  <div class="goodser">
    <div class="goodser__tabs">
      <NkTabs v-model="activeTab" :items="tabs" />
    </div>

    <div class="goodser__content">
      <!-- ==================== 商品列表 Tab ==================== -->
      <ProductsTab
        v-if="activeTab === 'products'"
        v-model:inventory-id="currentInventoryId"
        :inventories="inventories"
        :tags="tags"
        :status-codes="statusCodes"
        :dictionaries="dictionaries"
        :series-filter-id="pendingSeriesFilterId"
        @series-filter-consumed="pendingSeriesFilterId = ''"
      />

      <!-- ==================== 系列视图 Tab ==================== -->
      <SeriesTab
        v-if="activeTab === 'series'"
        v-model:inventory-id="currentInventoryId"
        :inventories="inventories"
        :dictionaries="dictionaries"
        @open-series="openSeriesProducts"
        @changed="fetchDictionaries"
      />

      <!-- ==================== 组合包 Tab ==================== -->
      <CombosTab
        v-if="activeTab === 'combos'"
        v-model:inventory-id="currentInventoryId"
        :inventories="inventories"
      />

      <!-- ==================== 捆 Tab ==================== -->
      <BundlesTab
        v-if="activeTab === 'bundles'"
        v-model:inventory-id="currentInventoryId"
        :inventories="inventories"
        :dictionaries="dictionaries"
        :status-codes="statusCodes"
        @order-bundle="openOrderForBundle"
      />

      <!-- ==================== 统计 Tab ==================== -->
      <StatsTab
        v-if="activeTab === 'stats'"
        v-model:inventory-id="currentInventoryId"
        :inventories="inventories"
      />

      <!-- ==================== 出库订单 Tab ==================== -->
      <OrdersTab
        v-if="activeTab === 'orders'"
        :inventory-id="currentInventoryId"
        :initial-bundle-id="pendingOrderBundleId"
        :initial-order-id="pendingOrderId"
        @bundle-consumed="pendingOrderBundleId = ''"
        @order-consumed="pendingOrderId = ''"
      />

      <!-- ==================== 退货单 Tab ==================== -->
      <ReturnsTab
        v-if="activeTab === 'returns'"
        :inventory-id="currentInventoryId"
        @view-order="openOrderById"
      />

      <!-- ==================== 入库记录 Tab ==================== -->
      <LogsTab
        v-if="activeTab === 'logs'"
        :inventory-id="currentInventoryId"
        :status-codes="statusCodes"
      />

      <!-- ==================== 库存目录 Tab ==================== -->
      <InventoriesTab
        v-if="activeTab === 'inventories'"
        :inventories="inventories"
        :loading="loadingInventories"
        @select="selectInventory"
        @refresh="fetchInventories"
      />

      <!-- ==================== 设置 Tab ==================== -->
      <SettingsTab
        v-if="activeTab === 'settings'"
        :tags="tags"
        :status-codes="statusCodes"
        :dictionaries="dictionaries"
        :loading-tags="loadingTags"
        :loading-status-codes="loadingStatusCodes"
        :loading-dictionaries="loadingDictionaries"
        @refresh="refreshSettings"
      />
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  loadInventories,
  loadTags,
  loadStatusCodes,
  loadDictionaries,
} from '@/api/goodser'
import type {
  Inventory, GoodserTag, StatusCode,
  Dictionary, SeriesSummary,
} from '@/types/goodser'
import ReturnsTab from './components/ReturnsTab.vue'
import StatsTab from './components/StatsTab.vue'
import SeriesTab from './components/SeriesTab.vue'
import CombosTab from './components/CombosTab.vue'
import BundlesTab from './components/BundlesTab.vue'
import LogsTab from './components/LogsTab.vue'
import InventoriesTab from './components/InventoriesTab.vue'
import OrdersTab from './components/OrdersTab.vue'
import ProductsTab from './components/ProductsTab.vue'
import SettingsTab from './components/SettingsTab.vue'

// ---- Tabs ----
const activeTab = ref('products')
const tabs = [
  { label: '商品列表', value: 'products' },
  { label: '系列视图', value: 'series' },
  { label: '组合包', value: 'combos' },
  { label: '捆', value: 'bundles' },
  { label: '统计', value: 'stats' },
  { label: '出库订单', value: 'orders' },
  { label: '退货单', value: 'returns' },
  { label: '入库记录', value: 'logs' },
  { label: '库存目录', value: 'inventories' },
  { label: '设置', value: 'settings' },
]

// ---- Inventories ----
const inventories = ref<Inventory[]>([])
const loadingInventories = ref(false)

async function fetchInventories() {
  loadingInventories.value = true
  try {
    const res = await loadInventories()
    inventories.value = res.data || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载库存目录失败')
  } finally {
    loadingInventories.value = false
  }
}

// ---- Products glue ----
const currentInventoryId = ref('')
const pendingSeriesFilterId = ref('')

function selectInventory(inv: Inventory) {
  currentInventoryId.value = inv._id
  activeTab.value = 'products'
}

function openSeriesProducts(series: SeriesSummary) {
  if (!series.series_id) {
    NKMessage.info('该系列没有关联商品，或为未设置系列的商品')
    return
  }
  pendingSeriesFilterId.value = series.series_id
  activeTab.value = 'products'
}

// ---- Orders glue ----
const pendingOrderBundleId = ref('')
const pendingOrderId = ref('')

function openOrderForBundle(bundleId: string) {
  pendingOrderBundleId.value = bundleId
  pendingOrderId.value = ''
  activeTab.value = 'orders'
}

function openOrderById(outboundOrderId: string) {
  pendingOrderId.value = outboundOrderId
  pendingOrderBundleId.value = ''
  activeTab.value = 'orders'
}

// ---- Global settings data (tags / status codes / dictionaries) ----
const tags = ref<GoodserTag[]>([])
const loadingTags = ref(false)
const statusCodes = ref<StatusCode[]>([])
const loadingStatusCodes = ref(false)
const dictionaries = ref<Dictionary[]>([])
const loadingDictionaries = ref(false)

async function fetchTags() {
  loadingTags.value = true
  try {
    const res = await loadTags()
    tags.value = res.data || []
  } catch {
    tags.value = []
  } finally {
    loadingTags.value = false
  }
}

async function fetchStatusCodes() {
  loadingStatusCodes.value = true
  try {
    const res = await loadStatusCodes()
    statusCodes.value = res.data || []
  } catch {
    statusCodes.value = []
  } finally {
    loadingStatusCodes.value = false
  }
}

async function fetchDictionaries() {
  loadingDictionaries.value = true
  try {
    const res = await loadDictionaries()
    dictionaries.value = res.data?.items || []
  } catch (err: any) {
    dictionaries.value = []
    NKMessage.error(err.message || '加载维度字典失败')
  } finally {
    loadingDictionaries.value = false
  }
}

async function refreshSettings(kind: 'tags' | 'statusCodes' | 'dictionaries') {
  if (kind === 'tags') await fetchTags()
  else if (kind === 'statusCodes') await fetchStatusCodes()
  else await fetchDictionaries()
}

// ---- Tabs that fetch their own data ----
// 系列视图、组合包、捆、统计、退货单、入库记录、库存目录、出库订单、设置
// 均由各自组件负责请求与状态。

// ---- Watchers ----
watch(activeTab, (tab) => {
  if (tab === 'products' && !currentInventoryId.value && inventories.value.length) {
    currentInventoryId.value = inventories.value[0]._id
  }
})

// ---- Init ----
onMounted(async () => {
  await fetchInventories()
  await fetchTags()
  await fetchStatusCodes()
  await fetchDictionaries()
  if (inventories.value.length) {
    currentInventoryId.value = inventories.value[0]._id
  }
})
</script>

<style lang="scss" scoped>
.goodser {
  max-width: 1200px;

  &__tabs {
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 1px;
    -webkit-overflow-scrolling: touch;

    :deep(.nk-tabs__header) {
      min-width: max-content;
    }

    &::-webkit-scrollbar {
      height: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: $nk-color-neutral-200;
      border-radius: 2px;
    }
  }

  &__content {
    margin-top: $nk-spacing-lg;
  }

  &__tab {
    min-height: 200px;
  }

  // ---- Inventory Cards ----
  // ---- Product Toolbar ----
  // ---- Product Cards ----
  // ---- Filter Dialog ----
  // ---- Product Form ----
  // ---- Tag Selector ----
  // ---- Product Detail ----
  // ---- Series / Combos ----
  // ---- Orders ----
  // ---- Return list ----
  // ---- Order Form ----
  // ---- Order Detail ----
  // ---- Returns ----
  // ---- Logs ----
  // ---- Inbound Search ----
  // ---- Settings ----
}
</style>
