<template>
  <div class="goodser__tab">
    <div class="goodser__tab-header">
      <div class="goodser__tab-heading">
        <span class="goodser__tab-title">捆</span>
        <span class="goodser__count">共 {{ bundles.length }} 个</span>
      </div>
      <NkButton size="sm" @click="openCreateBundle">新建捆</NkButton>
    </div>
    <div class="goodser__product-toolbar">
      <NkSelect
        v-if="inventories.length"
        :model-value="inventoryId"
        :options="inventoryOptions"
        style="width: 200px"
        size="sm"
        @update:model-value="emit('update:inventoryId', $event)"
      />
    </div>
    <NkLoading v-if="loading" />
    <div v-else-if="!bundles.length" class="goodser__empty">
      <NkEmpty description="暂无捆，点击上方按钮创建" />
    </div>
    <div v-else class="goodser__combo-list">
      <NkCard v-for="b in bundles" :key="b._id" class="goodser__combo-card">
        <div class="goodser__order-card-header">
          <div>
            <span class="goodser__order-no">{{ b.name }}</span>
            <NkTag :type="b.status === 'active' ? 'success' : 'info'" size="sm" style="margin-left: 8px">
              {{ b.status === 'active' ? '启用' : '停用' }}
            </NkTag>
          </div>
          <span class="goodser__order-date">{{ b.code }}</span>
        </div>
        <div class="goodser__order-meta">
          <span>{{ bundlePriceModeLabel(b.price_mode) }}</span>
          <span>主商品 {{ b.main_products.length }}</span>
          <span>副区商品 {{ b.sub_products.length }}</span>
          <span v-if="b.price_mode === 'fixed'">¥{{ b.fixed_price }}</span>
        </div>
        <div class="goodser__order-meta">
          <span>主商品 ≥ {{ b.min_main_quantity }} 件</span>
          <span v-if="b.min_main_amount > 0">主商品金额 ≥ ¥{{ b.min_main_amount }}</span>
          <span>副区 ≥ {{ b.min_sub_quantity }} 件</span>
          <span v-if="b.max_sub_quantity > 0">副区 ≤ {{ b.max_sub_quantity }} 件</span>
          <span v-if="b.min_sub_amount > 0">副区金额 ≥ ¥{{ b.min_sub_amount }}</span>
        </div>
        <div class="goodser__combo-components">
          <span v-for="m in b.main_products.slice(0, 6)" :key="m.product_id" class="goodser__combo-component">
            主 · {{ m.product_name }}（可用 {{ m.available }}）
          </span>
          <span v-if="b.main_products.length > 6" class="goodser__combo-component">
            +{{ b.main_products.length - 6 }} 个主商品
          </span>
          <span v-if="!b.main_products.length" class="goodser__combo-component">仅按筛选条件匹配主商品</span>
        </div>
        <div class="goodser__combo-components">
          <span v-for="s in b.sub_products" :key="s.product_id" class="goodser__combo-component">
            副 · {{ s.product_name }} × {{ s.default_quantity }}（可用 {{ s.available }}）
          </span>
        </div>
        <div class="goodser__order-actions">
          <NkButton size="xs" variant="ghost" @click="emit('order-bundle', b._id)">下单</NkButton>
          <NkButton size="xs" variant="ghost" @click="openEditBundle(b)">编辑</NkButton>
          <NkButton size="xs" variant="ghost" type="danger" @click="askDeleteBundle(b)">删除</NkButton>
        </div>
      </NkCard>
    </div>

    <NkDialog
      v-model:visible="showBundleForm"
      :title="editingBundle ? '编辑捆' : '新建捆'"
      :width="700"
    >
      <div class="goodser__order-form">
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">名称 *</label>
            <NkInput v-model="bundleForm.name" placeholder="捆名称" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">编码</label>
            <NkInput v-model="bundleForm.code" placeholder="留空自动生成" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">状态</label>
            <NkSelect v-model="bundleForm.status" :options="comboStatusOptions" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">价格模式</label>
            <NkSelect v-model="bundleForm.price_mode" :options="bundlePriceModeOptions" />
          </div>
        </div>
        <div v-if="bundleForm.price_mode === 'fixed'" class="goodser__form-field">
          <label class="goodser__form-label">固定价格 / 单捆</label>
          <NkInput v-model="bundleForm.fixed_price" type="number" placeholder="0" />
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">描述</label>
          <NkTextarea v-model="bundleForm.description" placeholder="捆说明" />
        </div>

        <label class="goodser__form-label">规则（以下阈值均按单捆计算）</label>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">主商品最少数量</label>
            <NkInput v-model="bundleForm.min_main_quantity" type="number" placeholder="1" />
          </div>
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">主商品最低金额</label>
            <NkInput v-model="bundleForm.min_main_amount" type="number" placeholder="0" />
          </div>
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">副区最少数量</label>
            <NkInput v-model="bundleForm.min_sub_quantity" type="number" placeholder="0" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">副区最多数量（0 不限）</label>
            <NkInput v-model="bundleForm.max_sub_quantity" type="number" placeholder="0" />
          </div>
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">副区最低金额</label>
            <NkInput v-model="bundleForm.min_sub_amount" type="number" placeholder="0" />
          </div>
        </div>

        <label class="goodser__form-label">主商品条件（可选）</label>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">系列</label>
            <NkSelect v-model="bundleForm.main_filter.series_id" :options="filterSeriesOptions" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">套型</label>
            <NkSelect v-model="bundleForm.main_filter.set_type_id" :options="filterSetTypeOptions" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">商品类型</label>
            <NkSelect v-model="bundleForm.main_filter.product_type_id" :options="filterProductTypeOptions" />
          </div>
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">状态</label>
            <NkSelect v-model="bundleForm.main_filter.status_code" :options="bundleStatusFilterOptions" />
          </div>
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">角色</label>
            <NkSelect v-model="bundleForm.main_filter.character_id" :options="filterCharacterOptions" />
          </div>
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">主商品关键词（可选）</label>
          <NkInput v-model="bundleForm.main_filter.keyword" placeholder="名称或编码关键词" />
        </div>
        <p class="goodser__return-tip">
          显式主商品清单与筛选条件同时存在时按 AND 校验；至少配置一种主商品来源。
        </p>

        <div class="goodser__form-field">
          <label class="goodser__form-label">显式主商品（可选）</label>
          <NkInput v-model="bundleMainQuery" size="sm" placeholder="搜索并添加主商品..." @keyup.enter="searchBundleMainProducts" />
          <div v-if="bundleMainResults.length" class="goodser__order-search-results">
            <div v-for="r in bundleMainResults" :key="r._id" class="goodser__order-search-item" @click="addBundleMainProduct(r)">
              <span>{{ r.code }} - {{ r.name }}</span>
              <NkButton size="xs" variant="ghost">添加</NkButton>
            </div>
          </div>
          <div v-if="bundleFormMainProducts.length" class="goodser__order-items">
            <div v-for="(item, idx) in bundleFormMainProducts" :key="item.product_id" class="goodser__order-item">
              <span class="goodser__order-item-name">{{ item.product_name }} ({{ item.product_code }})</span>
              <NkButton size="xs" variant="ghost" type="danger" @click="bundleFormMainProducts.splice(idx, 1)">×</NkButton>
            </div>
          </div>
        </div>

        <div class="goodser__form-field">
          <label class="goodser__form-label">副区商品（必须，店主选定）</label>
          <NkInput v-model="bundleSubQuery" size="sm" placeholder="搜索并添加副区商品..." @keyup.enter="searchBundleSubProducts" />
          <div v-if="bundleSubResults.length" class="goodser__order-search-results">
            <div v-for="r in bundleSubResults" :key="r._id" class="goodser__order-search-item" @click="addBundleSubProduct(r)">
              <span>{{ r.code }} - {{ r.name }}</span>
              <NkButton size="xs" variant="ghost">添加</NkButton>
            </div>
          </div>
          <div v-if="bundleFormSubProducts.length" class="goodser__order-items">
            <div v-for="(item, idx) in bundleFormSubProducts" :key="item.product_id" class="goodser__order-item">
              <span class="goodser__order-item-name">{{ item.product_name }} ({{ item.product_code }})</span>
              <NkInput
                v-model="item.default_quantity"
                type="number"
                size="xs"
                style="width: 90px"
                placeholder="单捆数量"
              />
              <NkButton size="xs" variant="ghost" type="danger" @click="bundleFormSubProducts.splice(idx, 1)">×</NkButton>
            </div>
          </div>
          <p class="goodser__return-tip">客户和店主下单时只能从该清单中选择副区商品。</p>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showBundleForm = false">取消</NkButton>
        <NkButton
          :loading="saving"
          :disabled="!bundleForm.name.trim() || (!bundleFormMainProducts.length && !hasMainFilter) || !bundleFormSubProducts.length"
          @click="handleSaveBundle"
        >保存</NkButton>
      </template>
    </NkDialog>

    <ConfirmDialog
      v-model:visible="showDeleteDialog"
      title="删除捆"
      :message="`确定删除「${deletingBundle?.name || ''}」吗？删除后不可恢复。`"
      confirm-text="删除"
      danger
      :loading="saving"
      @confirm="handleDeleteBundle"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  createBundle,
  deleteBundle,
  loadBundles,
  queryProducts,
  updateBundle,
} from '@/api/goodser'
import type {
  Bundle,
  BundlePriceMode,
  Dictionary,
  Inventory,
  Product,
  StatusCode,
} from '@/types/goodser'
import { bundlePriceModeLabel } from '../utils'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps<{
  inventoryId: string
  inventories: Inventory[]
  dictionaries: Dictionary[]
  statusCodes: StatusCode[]
}>()

const emit = defineEmits<{
  (e: 'update:inventoryId', value: string): void
  (e: 'order-bundle', bundleId: string): void
  (e: 'changed'): void
}>()

const bundles = ref<Bundle[]>([])
const loading = ref(false)
const saving = ref(false)
const showBundleForm = ref(false)
const showDeleteDialog = ref(false)
const deletingBundle = ref<Bundle | null>(null)
const editingBundle = ref<Bundle | null>(null)
const bundleForm = ref({
  name: '',
  code: '',
  description: '',
  status: 'active' as 'active' | 'inactive',
  price_mode: 'sum' as BundlePriceMode,
  fixed_price: 0,
  min_main_quantity: 1,
  min_main_amount: 0,
  min_sub_quantity: 0,
  max_sub_quantity: 0,
  min_sub_amount: 0,
  main_filter: {
    series_id: '',
    set_type_id: '',
    product_type_id: '',
    character_id: '',
    status_code: '',
    keyword: '',
  },
})
const bundleFormMainProducts = ref<Array<{
  product_id: string
  product_name: string
  product_code: string
}>>([])
const bundleFormSubProducts = ref<Array<{
  product_id: string
  product_name: string
  product_code: string
  default_quantity: number
}>>([])
const bundleMainQuery = ref('')
const bundleSubQuery = ref('')
const bundleMainResults = ref<Product[]>([])
const bundleSubResults = ref<Product[]>([])
const comboStatusOptions = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
]
const bundlePriceModeOptions = [
  { label: '合计（主商品 + 副区）', value: 'sum' },
  { label: '固定价（单捆）', value: 'fixed' },
  { label: '只收主商品（副区搭配）', value: 'main_only' },
]
let requestSeq = 0

const inventoryOptions = computed(() =>
  props.inventories.map((inv) => ({ label: inv.name, value: inv._id })),
)
const enabledDictionaries = (kind: Dictionary['kind']) =>
  props.dictionaries.filter((d) => d.kind === kind && d.enabled)
const seriesOptions = computed(() =>
  enabledDictionaries('series').map((d) => ({ label: d.name, value: d._id })),
)
const setTypeOptions = computed(() =>
  enabledDictionaries('set_type').map((d) => ({ label: d.name, value: d._id })),
)
const productTypeOptions = computed(() =>
  enabledDictionaries('product_type').map((d) => ({ label: d.name, value: d._id })),
)
const characterOptions = computed(() =>
  enabledDictionaries('character').map((d) => ({ label: d.name, value: d._id })),
)
const filterSeriesOptions = computed(() => [{ label: '全部系列', value: '' }, ...seriesOptions.value])
const filterCharacterOptions = computed(() => [{ label: '全部角色', value: '' }, ...characterOptions.value])
const filterSetTypeOptions = computed(() => [{ label: '全部套型', value: '' }, ...setTypeOptions.value])
const filterProductTypeOptions = computed(() => [{ label: '全部商品类型', value: '' }, ...productTypeOptions.value])
const statusCodeOptions = computed(() =>
  props.statusCodes.map((sc) => ({ label: `${sc.code} - ${sc.label}`, value: sc.code })),
)
const bundleStatusFilterOptions = computed(() => [
  { label: '全部状态', value: '' },
  ...statusCodeOptions.value,
])
const hasMainFilter = computed(() => {
  const f = bundleForm.value.main_filter
  return !!(f.series_id || f.set_type_id || f.product_type_id || f.character_id || f.status_code || f.keyword.trim())
})

async function fetchBundles() {
  if (!props.inventoryId) return
  const seq = ++requestSeq
  loading.value = true
  try {
    const res = await loadBundles(props.inventoryId)
    if (seq !== requestSeq) return
    bundles.value = res.data?.items || []
  } catch (err: any) {
    if (seq !== requestSeq) return
    bundles.value = []
    NKMessage.error(err.message || '加载捆失败')
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

function resetBundleForm() {
  bundleForm.value = {
    name: '',
    code: '',
    description: '',
    status: 'active',
    price_mode: 'sum',
    fixed_price: 0,
    min_main_quantity: 1,
    min_main_amount: 0,
    min_sub_quantity: 0,
    max_sub_quantity: 0,
    min_sub_amount: 0,
    main_filter: {
      series_id: '',
      set_type_id: '',
      product_type_id: '',
      character_id: '',
      status_code: '',
      keyword: '',
    },
  }
  bundleFormMainProducts.value = []
  bundleFormSubProducts.value = []
  bundleMainQuery.value = ''
  bundleSubQuery.value = ''
  bundleMainResults.value = []
  bundleSubResults.value = []
}

function openCreateBundle() {
  if (!props.inventoryId) {
    NKMessage.error('请先选择库存目录')
    return
  }
  editingBundle.value = null
  resetBundleForm()
  showBundleForm.value = true
}

function openEditBundle(bundle: Bundle) {
  editingBundle.value = bundle
  resetBundleForm()
  bundleForm.value = {
    name: bundle.name,
    code: bundle.code,
    description: bundle.description || '',
    status: bundle.status,
    price_mode: bundle.price_mode,
    fixed_price: bundle.fixed_price || 0,
    min_main_quantity: bundle.min_main_quantity || 1,
    min_main_amount: bundle.min_main_amount || 0,
    min_sub_quantity: bundle.min_sub_quantity || 0,
    max_sub_quantity: bundle.max_sub_quantity || 0,
    min_sub_amount: bundle.min_sub_amount || 0,
    main_filter: {
      series_id: bundle.main_filter?.series_id || '',
      set_type_id: bundle.main_filter?.set_type_id || '',
      product_type_id: bundle.main_filter?.product_type_id || '',
      character_id: bundle.main_filter?.character_id || '',
      status_code: bundle.main_filter?.status_code || '',
      keyword: bundle.main_filter?.keyword || '',
    },
  }
  const mainByID = new Map((bundle.main_products || []).map((p) => [p.product_id, p]))
  bundleFormMainProducts.value = (bundle.main_product_ids || []).map((id) => {
    const product = mainByID.get(id)
    return {
      product_id: id,
      product_name: product?.product_name || id,
      product_code: product?.product_code || '',
    }
  })
  bundleFormSubProducts.value = (bundle.sub_products || []).map((item) => ({
    product_id: item.product_id,
    product_name: item.product_name,
    product_code: item.product_code,
    default_quantity: item.default_quantity || 1,
  }))
  showBundleForm.value = true
}

async function searchBundleMainProducts() {
  if (!props.inventoryId || !bundleMainQuery.value.trim()) return
  try {
    const res = await queryProducts({
      inventory_id: props.inventoryId,
      keyword: bundleMainQuery.value.trim(),
      page_size: 10,
    })
    bundleMainResults.value = res.data?.items || []
  } catch {
    bundleMainResults.value = []
  }
}

async function searchBundleSubProducts() {
  if (!props.inventoryId || !bundleSubQuery.value.trim()) return
  try {
    const res = await queryProducts({
      inventory_id: props.inventoryId,
      keyword: bundleSubQuery.value.trim(),
      page_size: 10,
    })
    bundleSubResults.value = res.data?.items || []
  } catch {
    bundleSubResults.value = []
  }
}

function addBundleMainProduct(product: Product) {
  if (!bundleFormMainProducts.value.some((p) => p.product_id === product._id)) {
    bundleFormMainProducts.value.push({
      product_id: product._id,
      product_name: product.name,
      product_code: product.code,
    })
  }
  bundleMainQuery.value = ''
  bundleMainResults.value = []
}

function addBundleSubProduct(product: Product) {
  if (!bundleFormSubProducts.value.some((p) => p.product_id === product._id)) {
    bundleFormSubProducts.value.push({
      product_id: product._id,
      product_name: product.name,
      product_code: product.code,
      default_quantity: 1,
    })
  }
  bundleSubQuery.value = ''
  bundleSubResults.value = []
}

async function handleSaveBundle() {
  if (!props.inventoryId || !bundleForm.value.name.trim()) return
  if (!bundleFormMainProducts.value.length && !hasMainFilter.value) {
    NKMessage.warning('请至少配置显式主商品或主商品筛选条件')
    return
  }
  if (!bundleFormSubProducts.value.length) {
    NKMessage.warning('请至少选择一个副区商品')
    return
  }
  saving.value = true
  try {
    const f = bundleForm.value
    const filter = hasMainFilter.value
      ? {
          series_id: f.main_filter.series_id || undefined,
          set_type_id: f.main_filter.set_type_id || undefined,
          product_type_id: f.main_filter.product_type_id || undefined,
          character_id: f.main_filter.character_id || undefined,
          status_code: f.main_filter.status_code || undefined,
          keyword: f.main_filter.keyword.trim() || undefined,
        }
      : null
    const payload = {
      name: f.name.trim(),
      code: f.code || null,
      description: f.description || null,
      status: f.status,
      price_mode: f.price_mode,
      fixed_price: Number(f.fixed_price) || 0,
      min_main_quantity: Number(f.min_main_quantity) || 0,
      min_main_amount: Number(f.min_main_amount) || 0,
      min_sub_quantity: Number(f.min_sub_quantity) || 0,
      max_sub_quantity: Number(f.max_sub_quantity) || 0,
      min_sub_amount: Number(f.min_sub_amount) || 0,
      main_filter: filter,
      main_product_ids: bundleFormMainProducts.value.map((p) => p.product_id),
      sub_products: bundleFormSubProducts.value.map((p) => ({
        product_id: p.product_id,
        default_quantity: Number(p.default_quantity) || 1,
      })),
    }
    if (editingBundle.value) {
      await updateBundle({ id: editingBundle.value._id, ...payload })
      NKMessage.success('更新成功')
    } else {
      await createBundle({ inventory_id: props.inventoryId, ...payload })
      NKMessage.success('创建成功')
    }
    showBundleForm.value = false
    await fetchBundles()
    emit('changed')
  } catch (err: any) {
    NKMessage.error(err.message || '保存捆失败')
  } finally {
    saving.value = false
  }
}

function askDeleteBundle(bundle: Bundle) {
  deletingBundle.value = bundle
  showDeleteDialog.value = true
}

async function handleDeleteBundle() {
  if (!deletingBundle.value) return
  saving.value = true
  try {
    await deleteBundle(deletingBundle.value._id)
    NKMessage.success('已删除')
    showDeleteDialog.value = false
    deletingBundle.value = null
    await fetchBundles()
    emit('changed')
  } catch (err: any) {
    NKMessage.error(err.message || '删除捆失败')
  } finally {
    saving.value = false
  }
}

watch(() => props.inventoryId, fetchBundles, { immediate: true })
</script>

<style lang="scss" scoped>
@use '../styles/shared';
</style>
