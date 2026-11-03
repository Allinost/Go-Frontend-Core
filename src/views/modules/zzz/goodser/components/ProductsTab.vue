<template>
  <div class="goodser__tab">
    <div class="goodser__product-toolbar">
      <NkSelect
        v-if="inventories.length"
        :model-value="inventoryId"
        :options="inventoryOptions"
        style="width: 200px"
        size="sm"
        @update:model-value="onInventoryChange"
      />
      <div class="goodser__search-row">
        <NkInput
          v-model="productQuery"
          placeholder="搜索商品名称/编码..."
          size="sm"
          clearable
          @clear="searchProducts"
          @keyup.enter="searchProducts"
        />
        <NkButton size="sm" variant="ghost" @click="searchProducts">搜索</NkButton>
      </div>
      <div class="goodser__product-toolbar-right">
        <NkButton
          size="sm"
          variant="ghost"
          :class="{ 'goodser__filter-active': hasProductFilter }"
          @click="showProductFilter = true"
        >筛选</NkButton>
        <NkButton size="sm" @click="openCreateProduct">新建商品</NkButton>
      </div>
    </div>

    <div class="goodser__sort-row">
      <span class="goodser__count">共 {{ productTotal }} 件商品</span>
      <span v-if="productTotal > 0" class="goodser__count">第 {{ productPage }} / {{ productTotalPages }} 页</span>
      <div class="goodser__sort-chips">
        <span
          v-for="chip in sortChips"
          :key="chip.key"
          class="goodser__sort-chip"
          :class="{ 'goodser__sort-chip--active': productSortBy === chip.key }"
          @click="toggleSort(chip.key)"
        >{{ chip.label }}{{ productSortBy === chip.key ? (productSortOrder === 'asc' ? ' ↑' : ' ↓') : '' }}</span>
      </div>
    </div>

    <div v-if="products.length" class="goodser__batch-bar">
      <div @click.stop>
        <NkCheckbox size="sm" :model-value="allPageSelected" @change="toggleSelectAllProducts">全选本页</NkCheckbox>
      </div>
      <span v-if="selectedProductIds.length" class="goodser__count">已选 {{ selectedProductIds.length }} 件</span>
      <div v-if="selectedProductIds.length" class="goodser__batch-actions">
        <NkButton size="xs" variant="ghost" @click="clearProductSelection">取消选择</NkButton>
        <NkButton size="xs" variant="ghost" type="danger" @click="showBatchDeleteDialog = true">批量删除</NkButton>
      </div>
    </div>

    <NkLoading v-if="loadingProducts" />
    <div v-else-if="!products.length" class="goodser__empty">
      <NkEmpty :description="productQuery || hasProductFilter ? '未匹配商品' : '暂无商品，点击上方按钮新建'" />
    </div>
    <div v-else class="goodser__product-grid">
      <NkCard v-for="p in products" :key="p._id" class="goodser__product-card" @click="openProductDetail(p)">
        <div class="goodser__product-card-top">
          <div class="goodser__product-card-left">
            <div @click.stop>
              <NkCheckbox
                size="sm"
                :model-value="selectedProductIds.includes(p._id)"
                @change="toggleProductSelection(p._id, $event)"
              />
            </div>
            <div class="goodser__product-code">{{ p.code }}</div>
          </div>
          <NkTag size="sm">{{ p.status_code }}</NkTag>
        </div>
        <div class="goodser__product-name">{{ p.name }}</div>
        <div class="goodser__product-meta">
          <span>可用 {{ p.quantity }}</span>
          <span v-if="p.reserved_quantity">锁定 {{ p.reserved_quantity }}</span>
          <span>总量 {{ p.total_quantity ?? p.quantity + (p.reserved_quantity || 0) }}</span>
          <span v-if="p.expected_price != null">¥{{ p.expected_price }}</span>
        </div>
        <div class="goodser__product-zone">{{ p.main_zone }}{{ p.sub_zone }}-{{ String(p.seq_number).padStart(4, '0') }}</div>
      </NkCard>
    </div>

    <div class="goodser__pagination">
      <NkButton size="sm" variant="ghost" :disabled="productPage <= 1" @click="goToPage(productPage - 1)">上一页</NkButton>
      <div class="goodser__page-jump">
        <NkInput
          v-model="jumpPage"
          type="number"
          size="xs"
          style="width: 60px"
          :min="1"
          :max="productTotalPages"
          @keyup.enter="handleJumpPage"
        />
        <NkButton size="xs" variant="ghost" :disabled="!jumpPage" @click="handleJumpPage">跳转</NkButton>
      </div>
      <span class="goodser__page-info">{{ productPage }} / {{ productTotalPages }}</span>
      <NkButton
        size="sm"
        variant="ghost"
        :disabled="productPage >= productTotalPages"
        @click="goToPage(productPage + 1)"
      >下一页</NkButton>
    </div>

    <!-- Batch Delete -->
    <NkDialog v-model:visible="showBatchDeleteDialog" title="批量删除商品" :width="420">
      <p>
        确定删除已选的 <strong>{{ selectedProductIds.length }}</strong> 件商品吗？仅可用与锁定库存均为 0
        的商品可删除，删除后不可恢复。
      </p>
      <template #footer>
        <NkButton variant="ghost" @click="showBatchDeleteDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="batchDeleting" @click="handleBatchDeleteProducts">删除</NkButton>
      </template>
    </NkDialog>

    <!-- Filter -->
    <NkDialog v-model:visible="showProductFilter" title="筛选商品" :width="480">
      <div class="goodser__filter-section">
        <label class="goodser__filter-label">主分区</label>
        <div class="goodser__filter-tags">
          <span
            class="goodser__filter-tag"
            :class="{ 'goodser__filter-tag--active': !productFilterZone }"
            @click="productFilterZone = ''"
          >全部</span>
          <span
            v-for="z in availableZones"
            :key="z"
            class="goodser__filter-tag"
            :class="{ 'goodser__filter-tag--active': productFilterZone === z }"
            @click="productFilterZone = productFilterZone === z ? '' : z"
          >{{ z }}</span>
        </div>
      </div>
      <div class="goodser__filter-section">
        <label class="goodser__filter-label">状态</label>
        <div class="goodser__filter-tags">
          <span
            class="goodser__filter-tag"
            :class="{ 'goodser__filter-tag--active': !productFilterStatus }"
            @click="productFilterStatus = ''"
          >全部</span>
          <span
            v-for="sc in statusCodes"
            :key="sc._id"
            class="goodser__filter-tag"
            :class="{ 'goodser__filter-tag--active': productFilterStatus === sc.code }"
            @click="productFilterStatus = productFilterStatus === sc.code ? '' : sc.code"
          >{{ sc.label }}</span>
        </div>
      </div>
      <div class="goodser__filter-section">
        <label class="goodser__filter-label">系列 / 角色</label>
        <NkSelect v-model="productFilterSeries" :options="filterSeriesOptions" placeholder="全部系列" />
        <NkSelect
          v-model="productFilterCharacter"
          :options="filterCharacterOptions"
          placeholder="全部角色"
          style="margin-top: 6px"
        />
      </div>
      <div class="goodser__filter-section">
        <label class="goodser__filter-label">套型 / 商品类型</label>
        <NkSelect v-model="productFilterSetType" :options="filterSetTypeOptions" placeholder="全部套型" />
        <NkSelect
          v-model="productFilterProductType"
          :options="filterProductTypeOptions"
          placeholder="全部商品类型"
          style="margin-top: 6px"
        />
      </div>
      <div class="goodser__filter-section">
        <label class="goodser__filter-label">标签</label>
        <div class="goodser__filter-tags">
          <span
            class="goodser__filter-tag"
            :class="{ 'goodser__filter-tag--active': !productFilterTag }"
            @click="productFilterTag = ''"
          >全部</span>
          <span
            v-for="t in tags"
            :key="t._id"
            class="goodser__filter-tag"
            :class="{ 'goodser__filter-tag--active': productFilterTag === t._id }"
            @click="productFilterTag = productFilterTag === t._id ? '' : t._id"
          >{{ t.name }}</span>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="resetProductFilter">重置</NkButton>
        <NkButton @click="applyProductFilter">确认筛选</NkButton>
      </template>
    </NkDialog>

    <!-- Create/Edit Product -->
    <NkDialog v-model:visible="showProductForm" :title="editingProduct ? '编辑商品' : '新建商品'" :width="560">
      <div class="goodser__product-form">
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">商品名称 *</label>
            <NkInput v-model="productForm.name" placeholder="名称" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">编码预览</label>
            <NkInput :model-value="productCodePreview" disabled placeholder="自动生成" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">主分区</label>
            <NkSelect v-model="productForm.main_zone" :options="zoneOptions" placeholder="选择分区" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">子分区</label>
            <NkSelect v-model="productForm.sub_zone" :options="subZoneOptions" placeholder="选择子分区" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">数量</label>
            <NkInput v-model="productForm.quantity" type="number" placeholder="0" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">状态</label>
            <NkSelect v-model="productForm.status_code" :options="statusCodeOptions" placeholder="选择状态" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">原价</label>
            <NkInput v-model="productForm.original_price" type="number" placeholder="0" />
          </div>
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">市场价</label>
            <NkInput v-model="productForm.market_price" type="number" placeholder="0" />
          </div>
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">期望价</label>
            <NkInput v-model="productForm.expected_price" type="number" placeholder="0" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">系列</label>
            <NkSelect v-model="productForm.series_id" :options="seriesOptions" placeholder="未设置" />
          </div>
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">套型</label>
            <NkSelect v-model="productForm.set_type_id" :options="setTypeOptions" placeholder="未设置" />
          </div>
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">商品类型</label>
            <NkSelect v-model="productForm.product_type_id" :options="productTypeOptions" placeholder="未设置" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field">
            <label class="goodser__form-label">角色（可多选）</label>
            <div class="goodser__tag-selector">
              <span
                v-for="ch in characterDictionaries"
                :key="ch._id"
                class="goodser__tag-chip"
                :class="{ 'goodser__tag-chip--selected': productFormCharacters.includes(ch._id) }"
                @click="toggleProductCharacter(ch._id)"
              >{{ ch.name }}</span>
              <span v-if="!characterDictionaries.length" class="goodser__return-tip">暂无角色字典，请先在设置中创建</span>
            </div>
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field">
            <label class="goodser__form-label">存放位置</label>
            <NkInput v-model="productForm.storage_location" placeholder="例如 A-01-01" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field">
            <label class="goodser__form-label">备注</label>
            <NkTextarea v-model="productForm.remark" placeholder="备注信息" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field">
            <label class="goodser__form-label">标签</label>
            <div class="goodser__tag-selector">
              <span
                v-for="t in tags"
                :key="t._id"
                class="goodser__tag-chip"
                :class="{ 'goodser__tag-chip--selected': productFormTags.includes(t._id) }"
                :style="{ borderColor: t.color }"
                @click="toggleProductTag(t._id)"
              >{{ t.name }}</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showProductForm = false">取消</NkButton>
        <NkButton :loading="saving" :disabled="!productForm.name.trim()" @click="handleSaveProduct">保存</NkButton>
      </template>
    </NkDialog>

    <!-- Product Detail -->
    <NkDialog v-model:visible="showProductDetail" :title="detailProduct?.name || '商品详情'" :width="500">
      <div v-if="detailProduct" class="goodser__product-detail">
        <div class="goodser__detail-row"><span class="goodser__detail-label">编码</span><span>{{ detailProduct.code }}</span></div>
        <div class="goodser__detail-row">
          <span class="goodser__detail-label">分区</span>
          <span>{{ detailProduct.main_zone }}{{ detailProduct.sub_zone }}-{{ String(detailProduct.seq_number).padStart(4, '0') }}</span>
        </div>
        <div class="goodser__detail-row">
          <span class="goodser__detail-label">库存</span>
          <span>
            可用 {{ detailProduct.quantity }} · 锁定 {{ detailProduct.reserved_quantity || 0 }} · 总量
            {{ detailProduct.total_quantity ?? detailProduct.quantity + (detailProduct.reserved_quantity || 0) }}
          </span>
        </div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">状态</span><NkTag size="sm">{{ detailProduct.status_code }}</NkTag></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">系列</span><span>{{ dictionaryName(detailProduct.series_id) }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">角色</span><span>{{ characterNames(detailProduct.character_ids) }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">套型</span><span>{{ dictionaryName(detailProduct.set_type_id) }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">商品类型</span><span>{{ dictionaryName(detailProduct.product_type_id) }}</span></div>
        <div class="goodser__detail-row">
          <span class="goodser__detail-label">原价</span>
          <span>{{ detailProduct.original_price != null ? '¥' + detailProduct.original_price : '-' }}</span>
        </div>
        <div class="goodser__detail-row">
          <span class="goodser__detail-label">市场价</span>
          <span>{{ detailProduct.market_price != null ? '¥' + detailProduct.market_price : '-' }}</span>
        </div>
        <div class="goodser__detail-row">
          <span class="goodser__detail-label">期望价</span>
          <span>{{ detailProduct.expected_price != null ? '¥' + detailProduct.expected_price : '-' }}</span>
        </div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">位置</span><span>{{ detailProduct.storage_location || '-' }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">备注</span><span>{{ detailProduct.remark || '-' }}</span></div>
        <div class="goodser__detail-row">
          <span class="goodser__detail-label">标签</span>
          <span>
            <NkTag v-for="tid in detailProduct.tags" :key="tid" size="sm" style="margin-right: 4px">{{ tagName(tid) }}</NkTag>
            <span v-if="!detailProduct.tags?.length">-</span>
          </span>
        </div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">创建时间</span><span>{{ formatDate(detailProduct.created_at) }}</span></div>
      </div>
      <template #footer>
        <NkButton variant="ghost" type="danger" @click="askDeleteProduct">删除</NkButton>
        <NkButton @click="openEditProduct">编辑</NkButton>
      </template>
    </NkDialog>

    <ConfirmDialog
      v-model:visible="showDeleteProductDialog"
      title="删除商品"
      :message="`确定删除「${detailProduct?.name || ''}」吗？删除后不可恢复。`"
      confirm-text="删除"
      danger
      :loading="saving"
      @confirm="handleDeleteProductFromDetail"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  createProduct,
  deleteProduct,
  loadProducts,
  queryProducts,
  updateProduct,
} from '@/api/goodser'
import type { Dictionary, GoodserTag, Inventory, Product, StatusCode } from '@/types/goodser'
import { formatDate } from '../utils'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps<{
  inventoryId: string
  inventories: Inventory[]
  tags: GoodserTag[]
  statusCodes: StatusCode[]
  dictionaries: Dictionary[]
  seriesFilterId?: string
}>()

const emit = defineEmits<{
  (e: 'update:inventoryId', value: string): void
  (e: 'series-filter-consumed'): void
}>()

const products = ref<Product[]>([])
const loadingProducts = ref(false)
const saving = ref(false)
const productQuery = ref('')
const productSortBy = ref('')
const productSortOrder = ref<'asc' | 'desc'>('asc')
const productFilterZone = ref('')
const productFilterStatus = ref('')
const productFilterTag = ref('')
const productFilterSeries = ref('')
const productFilterCharacter = ref('')
const productFilterSetType = ref('')
const productFilterProductType = ref('')
const productPage = ref(1)
const productHasMore = ref(false)
const productTotal = ref(0)
const jumpPage = ref<number | null>(null)
const showProductFilter = ref(false)
const showProductForm = ref(false)
const showProductDetail = ref(false)
const showDeleteProductDialog = ref(false)
const showBatchDeleteDialog = ref(false)
const batchDeleting = ref(false)
const editingProduct = ref<Product | null>(null)
const detailProduct = ref<Product | null>(null)
const selectedProductIds = ref<string[]>([])
const productForm = ref({
  name: '',
  main_zone: '',
  sub_zone: '',
  quantity: 0,
  status_code: '',
  original_price: null as number | null,
  market_price: null as number | null,
  expected_price: null as number | null,
  storage_location: '',
  remark: '',
  series_id: '',
  set_type_id: '',
  product_type_id: '',
})
const productFormTags = ref<string[]>([])
const productFormCharacters = ref<string[]>([])

const sortChips = [
  { key: '', label: '默认' },
  { key: 'code', label: '编码' },
  { key: 'name', label: '名称' },
  { key: 'quantity', label: '数量' },
  { key: 'expected_price', label: '价格' },
]
const zoneOptions = ['A', 'B', 'C', 'D', 'E'].map((value) => ({ label: value, value }))
const subZoneOptions = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((value) => ({ label: value, value }))

const inventoryOptions = computed(() =>
  props.inventories.map((inv) => ({ label: inv.name, value: inv._id })),
)
const statusCodeOptions = computed(() =>
  props.statusCodes.map((sc) => ({ label: `${sc.code} - ${sc.label}`, value: sc.code })),
)
const enabledDictionaries = (kind: Dictionary['kind']) =>
  props.dictionaries.filter((d) => d.kind === kind && d.enabled)
const seriesDictionaries = computed(() => enabledDictionaries('series'))
const characterDictionaries = computed(() => enabledDictionaries('character'))
const seriesOptions = computed(() => seriesDictionaries.value.map((d) => ({ label: d.name, value: d._id })))
const setTypeOptions = computed(() =>
  enabledDictionaries('set_type').map((d) => ({ label: d.name, value: d._id })),
)
const productTypeOptions = computed(() =>
  enabledDictionaries('product_type').map((d) => ({ label: d.name, value: d._id })),
)
const filterSeriesOptions = computed(() => [{ label: '全部系列', value: '' }, ...seriesOptions.value])
const filterCharacterOptions = computed(() => [
  { label: '全部角色', value: '' },
  ...characterDictionaries.value.map((d) => ({ label: d.name, value: d._id })),
])
const filterSetTypeOptions = computed(() => [{ label: '全部套型', value: '' }, ...setTypeOptions.value])
const filterProductTypeOptions = computed(() => [
  { label: '全部商品类型', value: '' },
  ...productTypeOptions.value,
])
const hasProductFilter = computed(
  () =>
    productFilterZone.value ||
    productFilterStatus.value ||
    productFilterTag.value ||
    productFilterSeries.value ||
    productFilterCharacter.value ||
    productFilterSetType.value ||
    productFilterProductType.value,
)
const productCodePreview = computed(() => {
  const mz = productForm.value.main_zone || '?'
  const sz = productForm.value.sub_zone || '?'
  return `${mz}${sz}-xxxx`
})
const availableZones = computed(() => Array.from(new Set(products.value.map((p) => p.main_zone))).sort())
const pageSize = 20
const productTotalPages = computed(() => Math.ceil(productTotal.value / pageSize) || 1)
const allPageSelected = computed(
  () => products.value.length > 0 && products.value.every((p) => selectedProductIds.value.includes(p._id)),
)

function tagName(tagId: string) {
  return props.tags.find((t) => t._id === tagId)?.name || tagId
}

function dictionaryName(id?: string | null) {
  if (!id) return '-'
  return props.dictionaries.find((d) => d._id === id)?.name || id
}

function characterNames(ids?: string[] | null) {
  if (!ids?.length) return '-'
  return ids.map((id) => dictionaryName(id)).join('、')
}

function onInventoryChange(value: string) {
  emit('update:inventoryId', value)
  productPage.value = 1
  goToPage(1)
}

function toggleSort(key: string) {
  if (productSortBy.value === key) {
    productSortOrder.value = productSortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    productSortBy.value = key
    productSortOrder.value = 'asc'
  }
  searchProducts()
}

async function searchProducts() {
  if (!props.inventoryId) return
  productPage.value = 1
  await goToPage(1)
}

async function goToPage(page: number) {
  if (!props.inventoryId || page < 1) return
  productPage.value = page
  selectedProductIds.value = []
  loadingProducts.value = true
  try {
    const hasFilters = hasProductFilter.value || !!productSortBy.value || !!productQuery.value
    if (hasFilters) {
      const res = await queryProducts({
        inventory_id: props.inventoryId,
        keyword: productQuery.value || undefined,
        sort_by: productSortBy.value || undefined,
        sort_order: productSortOrder.value,
        main_zone: productFilterZone.value || undefined,
        status_code: productFilterStatus.value || undefined,
        tag_id: productFilterTag.value || undefined,
        series_id: productFilterSeries.value || undefined,
        character_id: productFilterCharacter.value || undefined,
        set_type_id: productFilterSetType.value || undefined,
        product_type_id: productFilterProductType.value || undefined,
        page,
        page_size: pageSize,
      })
      products.value = res.data?.items || []
      productHasMore.value = res.data?.has_more || false
      productTotal.value = res.data?.total || 0
    } else {
      const res = await loadProducts({ inventory_id: props.inventoryId, page, page_size: pageSize })
      products.value = res.data?.items || []
      productHasMore.value = res.data?.has_more || false
      productTotal.value = res.data?.total || 0
    }
  } catch (err: any) {
    NKMessage.error(err.message || '加载失败')
  } finally {
    loadingProducts.value = false
  }
}

function handleJumpPage() {
  const p = Number(jumpPage.value)
  if (p >= 1 && p <= productTotalPages.value) {
    goToPage(p)
    jumpPage.value = null
  }
}

function resetProductFilter() {
  productFilterZone.value = ''
  productFilterStatus.value = ''
  productFilterTag.value = ''
  productFilterSeries.value = ''
  productFilterCharacter.value = ''
  productFilterSetType.value = ''
  productFilterProductType.value = ''
}

function applyProductFilter() {
  showProductFilter.value = false
  searchProducts()
}

function toggleProductSelection(id: string, checked: boolean) {
  if (checked) {
    if (!selectedProductIds.value.includes(id)) selectedProductIds.value.push(id)
  } else {
    selectedProductIds.value = selectedProductIds.value.filter((item) => item !== id)
  }
}

function toggleSelectAllProducts(checked: boolean) {
  selectedProductIds.value = checked ? products.value.map((p) => p._id) : []
}

function clearProductSelection() {
  selectedProductIds.value = []
}

async function handleBatchDeleteProducts() {
  if (!selectedProductIds.value.length) return
  batchDeleting.value = true
  let success = 0
  let failed = 0
  for (const id of [...selectedProductIds.value]) {
    try {
      await deleteProduct({ id })
      success++
    } catch {
      failed++
    }
  }
  batchDeleting.value = false
  showBatchDeleteDialog.value = false
  selectedProductIds.value = []
  if (success) NKMessage.success(`已删除 ${success} 件商品`)
  if (failed) NKMessage.error(`${failed} 件商品删除失败，请检查库存或关联数据`)
  await searchProducts()
}

function openCreateProduct() {
  editingProduct.value = null
  productForm.value = {
    name: '',
    main_zone: '',
    sub_zone: '',
    quantity: 0,
    status_code: '',
    original_price: null,
    market_price: null,
    expected_price: null,
    storage_location: '',
    remark: '',
    series_id: '',
    set_type_id: '',
    product_type_id: '',
  }
  productFormTags.value = []
  productFormCharacters.value = []
  showProductForm.value = true
}

function openEditProduct() {
  if (!detailProduct.value) return
  editingProduct.value = detailProduct.value
  const p = detailProduct.value
  productForm.value = {
    name: p.name,
    main_zone: p.main_zone,
    sub_zone: p.sub_zone,
    quantity: p.quantity,
    status_code: p.status_code,
    original_price: p.original_price,
    market_price: p.market_price,
    expected_price: p.expected_price,
    storage_location: p.storage_location || '',
    remark: p.remark || '',
    series_id: p.series_id || '',
    set_type_id: p.set_type_id || '',
    product_type_id: p.product_type_id || '',
  }
  productFormTags.value = p.tags ? [...p.tags] : []
  productFormCharacters.value = p.character_ids ? [...p.character_ids] : []
  showProductForm.value = true
  showProductDetail.value = false
}

function openProductDetail(product: Product) {
  detailProduct.value = product
  showProductDetail.value = true
}

function toggleProductTag(tagId: string) {
  const idx = productFormTags.value.indexOf(tagId)
  if (idx >= 0) {
    productFormTags.value.splice(idx, 1)
  } else {
    productFormTags.value.push(tagId)
  }
}

function toggleProductCharacter(characterId: string) {
  const idx = productFormCharacters.value.indexOf(characterId)
  if (idx >= 0) {
    productFormCharacters.value.splice(idx, 1)
  } else {
    productFormCharacters.value.push(characterId)
  }
}

async function handleSaveProduct() {
  if (!productForm.value.name.trim() || !props.inventoryId) return
  saving.value = true
  try {
    const form = productForm.value
    if (editingProduct.value) {
      await updateProduct({
        id: editingProduct.value._id,
        name: form.name,
        main_zone: form.main_zone || undefined,
        sub_zone: form.sub_zone || undefined,
        quantity: form.quantity || undefined,
        status_code: form.status_code || undefined,
        original_price: form.original_price,
        market_price: form.market_price,
        expected_price: form.expected_price,
        storage_location: form.storage_location || undefined,
        remark: form.remark || undefined,
        tags: productFormTags.value.length ? productFormTags.value : undefined,
        // 传空字符串表示清空：后端把空字符串归一为 NULL，
        // 而 null 会被当成“不修改”导致清空无效。
        series_id: form.series_id || '',
        set_type_id: form.set_type_id || '',
        product_type_id: form.product_type_id || '',
        character_ids: productFormCharacters.value,
      })
      NKMessage.success('更新成功')
    } else {
      const code = `${form.main_zone || 'A'}${form.sub_zone || '1'}-0001`
      await createProduct({
        inventory_id: props.inventoryId,
        code,
        main_zone: form.main_zone || 'A',
        sub_zone: form.sub_zone || '1',
        seq_number: 1,
        quantity: form.quantity || null,
        status_code: form.status_code || 'in_stock',
        name: form.name,
        original_price: form.original_price,
        market_price: form.market_price,
        expected_price: form.expected_price,
        storage_location: form.storage_location || null,
        remark: form.remark || null,
        tags: productFormTags.value.length ? productFormTags.value : null,
        series_id: form.series_id || null,
        set_type_id: form.set_type_id || null,
        product_type_id: form.product_type_id || null,
        character_ids: productFormCharacters.value,
      })
      NKMessage.success('创建成功')
    }
    showProductForm.value = false
    await searchProducts()
  } catch (err: any) {
    NKMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function askDeleteProduct() {
  if (!detailProduct.value) return
  showDeleteProductDialog.value = true
}

async function handleDeleteProductFromDetail() {
  if (!detailProduct.value) return
  saving.value = true
  try {
    await deleteProduct({ id: detailProduct.value._id })
    NKMessage.success('删除成功')
    showDeleteProductDialog.value = false
    showProductDetail.value = false
    await searchProducts()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    saving.value = false
  }
}

function applySeriesFilter(seriesId?: string) {
  if (!seriesId) return
  productFilterSeries.value = seriesId
  emit('series-filter-consumed')
  searchProducts()
}

onMounted(() => {
  applySeriesFilter(props.seriesFilterId)
  searchProducts()
})

watch(
  () => props.inventoryId,
  () => {
    searchProducts()
  },
)
</script>

<style lang="scss" scoped>
@use '../styles/shared';

.goodser {
  &__search-row {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;

    .nk-input {
      width: 240px;
    }
  }

  @media (max-width: 768px) {
    &__search-row {
      width: 100%;

      .nk-input {
        flex: 1;
        width: auto;
      }
    }
  }

  &__sort-row {
    display: flex;
    align-items: center;
    gap: $nk-spacing-md;
    margin-bottom: $nk-spacing-md;
  }

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

  &__batch-bar {
    display: flex;
    align-items: center;
    gap: $nk-spacing-md;
    margin-bottom: $nk-spacing-md;
    padding: 8px 12px;
    border-radius: $nk-radius-md;
    background: $nk-color-neutral-100;
    font-size: $nk-font-size-sm;
  }

  &__batch-actions {
    display: flex;
    gap: $nk-spacing-xs;
    margin-left: auto;
  }

  &__product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: $nk-spacing-md;
  }

  &__product-card {
    cursor: pointer;
    transition: box-shadow $nk-duration-fast, border-color $nk-duration-fast;

    &:hover {
      box-shadow: $nk-shadow-md;
      border-color: $nk-color-primary-300;
    }
  }

  &__product-card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-xs;
  }

  &__product-card-left {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    min-width: 0;
  }

  &__product-code {
    font-size: $nk-font-size-sm;
    color: $nk-color-primary-600;
    font-weight: $nk-font-weight-medium;
    font-family: $nk-font-family-mono;
    letter-spacing: 0.2px;
  }

  &__product-name {
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-900;
    font-size: $nk-font-size-sm;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__product-meta {
    display: flex;
    justify-content: space-between;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
  }

  &__product-zone {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-400;
    font-family: $nk-font-family-mono;
    margin-top: 4px;
  }

  &__filter-section {
    margin-bottom: $nk-spacing-md;
  }

  &__filter-label {
    display: block;
    font-size: $nk-font-size-sm;
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-700;
    margin-bottom: $nk-spacing-xs;
  }

  &__filter-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__filter-tag {
    padding: 4px 14px;
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

  &__product-form {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-sm;
  }

  &__tag-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  &__tag-chip {
    padding: 3px 10px;
    border-radius: 12px;
    font-size: $nk-font-size-xs;
    border: 1.5px solid $nk-color-neutral-300;
    cursor: pointer;
    user-select: none;
    transition: all $nk-duration-fast;
    color: $nk-color-neutral-700;

    &:hover {
      background: $nk-color-neutral-100;
    }

    &--selected {
      background: $nk-color-neutral-100;
      border-color: $nk-color-primary-400;
      color: $nk-color-primary-700;
      font-weight: $nk-font-weight-medium;
    }
  }

  &__product-detail {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-sm;
  }
}
</style>
