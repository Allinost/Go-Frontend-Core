<template>
  <div class="goodser">
    <div class="goodser__header">
      <h2 class="goodser__title">Goodser 商品管理</h2>
      <NkButton size="sm" variant="ghost" @click="showSettings = true">设置</NkButton>
    </div>

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
        @open-series="openSeriesProducts"
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
    </div>

    <!-- ==================== Dialogs ==================== -->

    <!-- Settings Dialog -->
    <NkDialog v-model:visible="showSettings" title="Goodser 设置" :width="520">
      <NkTabs v-model="settingsTab" :items="settingsTabs" />
      <div v-if="settingsTab === 'tags'" class="goodser__settings-section">
        <div class="goodser__settings-header">
          <span>标签管理</span>
          <NkButton size="xs" @click="openCreateTag">新建标签</NkButton>
        </div>
        <NkLoading v-if="loadingTags" />
        <div v-else class="goodser__settings-list">
          <div v-for="t in tags" :key="t._id" class="goodser__settings-item">
            <span class="goodser__settings-item-name">{{ t.name }}</span>
            <NkButton size="xs" variant="ghost" type="danger" @click="handleDeleteTag(t)">删除</NkButton>
          </div>
          <div v-if="!tags.length" class="goodser__empty"><NkEmpty description="暂无标签" /></div>
        </div>
      </div>
      <div v-if="settingsTab === 'statusCodes'" class="goodser__settings-section">
        <div class="goodser__settings-header">
          <span>状态码管理</span>
          <NkButton size="xs" @click="openCreateStatusCode">新建状态码</NkButton>
        </div>
        <NkLoading v-if="loadingStatusCodes" />
        <div v-else class="goodser__settings-list">
          <div v-for="sc in statusCodes" :key="sc._id" class="goodser__settings-item">
            <span class="goodser__settings-item-name">{{ sc.code }} - {{ sc.label }}</span>
            <NkButton
              v-if="!sc.is_system"
              size="xs"
              variant="ghost"
              type="danger"
              @click="handleDeleteStatusCode(sc)"
            >删除</NkButton>
            <NkTag v-else size="xs">系统</NkTag>
          </div>
          <div v-if="!statusCodes.length" class="goodser__empty"><NkEmpty description="暂无状态码" /></div>
        </div>
      </div>
      <div v-if="settingsTab === 'dictionaries'" class="goodser__settings-section">
        <div class="goodser__settings-header">
          <span>维度字典</span>
          <NkButton size="xs" @click="openCreateDictionary">新建{{ dictionaryKindLabel }}</NkButton>
        </div>
        <div class="goodser__sort-chips" style="margin-bottom: 8px">
          <span
            v-for="kind in dictionaryKindOptions"
            :key="kind.value"
            class="goodser__sort-chip"
            :class="{ 'goodser__sort-chip--active': dictionaryKind === kind.value }"
            @click="switchDictionaryKind(kind.value)"
          >{{ kind.label }}</span>
        </div>
        <NkLoading v-if="loadingDictionaries" />
        <div v-else class="goodser__settings-list">
          <div v-for="d in dictionariesForKind" :key="d._id" class="goodser__settings-item">
            <span class="goodser__settings-item-name">
              {{ d.name }}
              <span class="goodser__dictionary-code">{{ d.code }}</span>
              <span v-if="d.kind === 'character' && d.parent_id" class="goodser__dictionary-code">
                · {{ dictionaryName(d.parent_id) }}
              </span>
              <NkTag v-if="!d.enabled" size="xs" type="info" style="margin-left:4px">停用</NkTag>
            </span>
            <span class="goodser__settings-item-actions">
              <NkButton size="xs" variant="ghost" @click="openEditDictionary(d)">编辑</NkButton>
              <NkButton size="xs" variant="ghost" type="danger" @click="handleDeleteDictionary(d)">删除</NkButton>
            </span>
          </div>
          <div v-if="!dictionariesForKind.length" class="goodser__empty">
            <NkEmpty :description="`暂无${dictionaryKindLabel}字典`" />
          </div>
        </div>
      </div>
      <template #footer>
        <NkButton @click="showSettings = false">关闭</NkButton>
      </template>
    </NkDialog>

    <!-- Create Tag Dialog -->
    <NkDialog v-model:visible="showCreateTagDialog" title="新建标签" :width="400">
      <NkInput v-model="newTagName" placeholder="标签名称" />
      <NkInput v-model="newTagColor" placeholder="颜色 (例如 #1890ff)" style="margin-top:8px" />
      <template #footer>
        <NkButton variant="ghost" @click="showCreateTagDialog = false">取消</NkButton>
        <NkButton :loading="saving" :disabled="!newTagName.trim()" @click="handleCreateTag">确定</NkButton>
      </template>
    </NkDialog>

    <!-- Create Status Code Dialog -->
    <NkDialog v-model:visible="showCreateCodeDialog" title="新建状态码" :width="400">
      <NkInput v-model="newCode.code" placeholder="编码 (例如 in_stock)" />
      <NkInput v-model="newCode.label" placeholder="显示名称 (例如 在库)" style="margin-top:8px" />
      <template #footer>
        <NkButton variant="ghost" @click="showCreateCodeDialog = false">取消</NkButton>
        <NkButton :loading="saving" :disabled="!newCode.code.trim() || !newCode.label.trim()" @click="handleCreateStatusCode">确定</NkButton>
      </template>
    </NkDialog>

    <!-- Create/Edit Dictionary -->
    <NkDialog
      v-model:visible="showDictionaryDialog"
      :title="(editingDictionary ? '编辑' : '新建') + dictionaryKindLabel"
      :width="440"
    >
      <div class="goodser__product-form">
        <div v-if="dictionaryKind === 'character'" class="goodser__form-field">
          <label class="goodser__form-label">所属系列</label>
          <NkSelect v-model="dictionaryForm.parent_id" :options="parentSeriesOptions" placeholder="不归属系列" />
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">名称 *</label>
          <NkInput v-model="dictionaryForm.name" placeholder="显示名称" />
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">编码 *</label>
          <NkInput v-model="dictionaryForm.code" placeholder="唯一编码，例如 genshin" />
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">排序</label>
            <NkInput v-model="dictionaryForm.sort_order" type="number" placeholder="0" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">启用</label>
            <div style="padding-top: 6px">
              <NkCheckbox v-model="dictionaryForm.enabled">启用</NkCheckbox>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showDictionaryDialog = false">取消</NkButton>
        <NkButton
          :loading="saving"
          :disabled="!dictionaryForm.name.trim() || !dictionaryForm.code.trim()"
          @click="handleSaveDictionary"
        >保存</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  loadInventories,
  loadTags, createTag, deleteTag,
  loadStatusCodes, addStatusCode, removeStatusCode,
  loadDictionaries, createDictionary, updateDictionary, deleteDictionary,
} from '@/api/goodser'
import type {
  Inventory, GoodserTag, StatusCode,
  Dictionary, DictionaryKind, SeriesSummary,
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
]

// ---- Shared ----
const saving = ref(false)
const showSettings = ref(false)
const settingsTab = ref('tags')
const settingsTabs = [
  { label: '标签管理', value: 'tags' },
  { label: '状态码', value: 'statusCodes' },
  { label: '维度字典', value: 'dictionaries' },
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

// ---- Tags ----
const tags = ref<GoodserTag[]>([])
const loadingTags = ref(false)
const showCreateTagDialog = ref(false)
const newTagName = ref('')
const newTagColor = ref('#1890ff')

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

function openCreateTag() {
  newTagName.value = ''
  newTagColor.value = '#1890ff'
  showCreateTagDialog.value = true
}

async function handleCreateTag() {
  if (!newTagName.value.trim()) return
  saving.value = true
  try {
    await createTag({ name: newTagName.value.trim(), color: newTagColor.value || null })
    NKMessage.success('创建成功')
    showCreateTagDialog.value = false
    await fetchTags()
  } catch (err: any) {
    NKMessage.error(err.message || '创建标签失败')
  } finally {
    saving.value = false
  }
}

async function handleDeleteTag(tag: GoodserTag) {
  saving.value = true
  try {
    await deleteTag({ id: tag._id })
    NKMessage.success('已删除')
    await fetchTags()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    saving.value = false
  }
}

// ---- Status Codes ----
const statusCodes = ref<StatusCode[]>([])
const loadingStatusCodes = ref(false)
const showCreateCodeDialog = ref(false)
const newCode = ref({ code: '', label: '' })

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

function openCreateStatusCode() {
  newCode.value = { code: '', label: '' }
  showCreateCodeDialog.value = true
}

async function handleCreateStatusCode() {
  if (!newCode.value.code.trim() || !newCode.value.label.trim()) return
  saving.value = true
  try {
    await addStatusCode({ code: newCode.value.code.trim(), label: newCode.value.label.trim() })
    NKMessage.success('创建成功')
    showCreateCodeDialog.value = false
    await fetchStatusCodes()
  } catch (err: any) {
    NKMessage.error(err.message || '创建失败')
  } finally {
    saving.value = false
  }
}

async function handleDeleteStatusCode(sc: StatusCode) {
  saving.value = true
  try {
    await removeStatusCode({ id: sc._id })
    NKMessage.success('已删除')
    await fetchStatusCodes()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    saving.value = false
  }
}

// ---- P1 Dictionaries ----
const dictionaries = ref<Dictionary[]>([])
const loadingDictionaries = ref(false)
const dictionaryKind = ref<DictionaryKind>('series')
const showDictionaryDialog = ref(false)
const editingDictionary = ref<Dictionary | null>(null)
const dictionaryForm = ref({
  name: '',
  code: '',
  parent_id: '',
  sort_order: 0,
  enabled: true,
})
const dictionaryKindOptions: Array<{ label: string; value: DictionaryKind }> = [
  { label: '系列', value: 'series' },
  { label: '角色', value: 'character' },
  { label: '套型', value: 'set_type' },
  { label: '商品类型', value: 'product_type' },
]
const dictionaryKindLabel = computed(
  () => dictionaryKindOptions.find((k) => k.value === dictionaryKind.value)?.label || '字典',
)
const dictionariesForKind = computed(() =>
  dictionaries.value.filter((d) => d.kind === dictionaryKind.value),
)
const seriesDictionaries = computed(() =>
  dictionaries.value.filter((d) => d.kind === 'series' && d.enabled),
)
const seriesOptions = computed(() =>
  seriesDictionaries.value.map((d) => ({ label: d.name, value: d._id })),
)
const parentSeriesOptions = computed(() => [{ label: '不归属系列', value: '' }, ...seriesOptions.value])

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

function switchDictionaryKind(kind: DictionaryKind) {
  dictionaryKind.value = kind
}

function openCreateDictionary() {
  editingDictionary.value = null
  dictionaryForm.value = {
    name: '',
    code: '',
    parent_id: '',
    sort_order: 0,
    enabled: true,
  }
  showDictionaryDialog.value = true
}

function openEditDictionary(item: Dictionary) {
  editingDictionary.value = item
  dictionaryForm.value = {
    name: item.name,
    code: item.code,
    parent_id: item.parent_id || '',
    sort_order: item.sort_order,
    enabled: item.enabled,
  }
  showDictionaryDialog.value = true
}

async function handleSaveDictionary() {
  const form = dictionaryForm.value
  if (!form.name.trim() || !form.code.trim()) return
  saving.value = true
  try {
    const parentId = dictionaryKind.value === 'character' ? form.parent_id || '' : null
    if (editingDictionary.value) {
      await updateDictionary({
        id: editingDictionary.value._id,
        name: form.name.trim(),
        code: form.code.trim(),
        parent_id: parentId,
        sort_order: Number(form.sort_order) || 0,
        enabled: form.enabled,
      })
      NKMessage.success('更新成功')
    } else {
      await createDictionary({
        kind: dictionaryKind.value,
        name: form.name.trim(),
        code: form.code.trim(),
        parent_id: parentId,
        sort_order: Number(form.sort_order) || 0,
        enabled: form.enabled,
      })
      NKMessage.success('创建成功')
    }
    showDictionaryDialog.value = false
    await fetchDictionaries()
  } catch (err: any) {
    NKMessage.error(err.message || '保存字典失败')
  } finally {
    saving.value = false
  }
}

async function handleDeleteDictionary(item: Dictionary) {
  saving.value = true
  try {
    await deleteDictionary(item._id)
    NKMessage.success('已删除')
    await fetchDictionaries()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败，可能仍被引用')
  } finally {
    saving.value = false
  }
}

// ---- Tabs that fetch their own data ----
function dictionaryName(id?: string | null) {
  if (!id) return '-'
  return dictionaries.value.find((d) => d._id === id)?.name || id
}
// 系列视图、组合包、捆、统计、退货单、入库记录、库存目录、出库订单
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

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-lg;
  }

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

  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
    margin: 0;
  }

  &__content {
    margin-top: $nk-spacing-lg;
  }

  &__tab {
    min-height: 200px;
  }

  &__empty {
    padding: $nk-spacing-3xl 0;
  }

  // ---- Inventory Cards ----
  // ---- Product Toolbar ----
  &__sort-chips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__sort-chip {
    padding: 3px 12px;
    border-radius: 16px;
    font-size: $nk-font-size-xs;
    background: $nk-color-neutral-100;
    color: $nk-color-neutral-600;
    cursor: pointer;
    transition: all $nk-duration-fast;
    user-select: none;

    &:hover {
      background: $nk-color-neutral-200;
    }

    &--active {
      background: $nk-color-neutral-100;
      color: $nk-color-primary-600;
      font-weight: $nk-font-weight-medium;
    }
  }

  // ---- Product Cards ----
  // ---- Filter Dialog ----
  // ---- Product Form ----
  &__product-form {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-sm;
  }

  &__form-row {
    display: flex;
    gap: $nk-spacing-sm;
  }

  &__form-field {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;

    &--half {
      flex: 0 0 calc(50% - #{$nk-spacing-sm} / 2);
    }

    &--third {
      flex: 0 0 calc(33.33% - #{$nk-spacing-sm} * 2 / 3);
    }
  }

  &__form-label {
    font-size: $nk-font-size-xs;
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-700;
  }

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
  &__settings-section {
    margin-top: $nk-spacing-md;
  }

  &__settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-sm;
    font-weight: $nk-font-weight-medium;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-700;
  }

  &__settings-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__settings-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $nk-spacing-xs $nk-spacing-sm;
    border-radius: $nk-radius-md;
    font-size: $nk-font-size-sm;
    transition: background $nk-duration-fast;

    &:hover {
      background: $nk-color-neutral-50;
    }
  }

  &__settings-item-name {
    color: $nk-color-neutral-800;
  }

  &__settings-item-actions {
    display: flex;
    gap: $nk-spacing-xs;
    flex-shrink: 0;
  }

  &__dictionary-code {
    margin-left: 6px;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-400;
    font-family: $nk-font-family-mono;
  }
}
</style>
