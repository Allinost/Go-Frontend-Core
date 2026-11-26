<template>
  <NkDialog
    :visible="modelValue"
    title="生成平铺图"
    :width="960"
    @update:visible="onVisibleChange"
    @close="onVisibleChange(false)"
  >
    <div class="goodser-export">
      <!-- 左：商品与添加 -->
      <section class="goodser-export__pane">
        <div class="goodser-export__title">
          已选商品
          <span class="goodser-export__muted">{{ items.length }} 种 / {{ totalQuantity }} 件</span>
        </div>

        <div v-if="!items.length" class="goodser-export__empty">
          在商品列表勾选后打开，或在下方搜索添加
        </div>
        <div v-else class="goodser-export__items">
          <div v-for="item in items" :key="item.key" class="goodser-export__item">
            <img v-if="item.image" :src="item.image" class="goodser-export__thumb" alt="" />
            <div v-else class="goodser-export__thumb goodser-export__thumb--empty">无图</div>
            <div class="goodser-export__item-main">
              <div class="goodser-export__item-name">{{ item.name }}</div>
              <div class="goodser-export__muted">{{ typeLabel(item.type) }}</div>
            </div>
            <div class="goodser-export__qty">
              <NkButton size="xs" variant="ghost" :disabled="item.quantity <= 1" @click="changeQty(item, -1)">−</NkButton>
              <span class="goodser-export__qty-value">{{ item.quantity }}</span>
              <NkButton size="xs" variant="ghost" @click="changeQty(item, 1)">＋</NkButton>
            </div>
            <NkButton size="xs" variant="ghost" type="danger" @click="removeItem(item)">移除</NkButton>
          </div>
        </div>

        <div class="goodser-export__add">
          <div class="goodser-export__search">
            <NkInput
              v-model="keyword"
              size="sm"
              placeholder="搜索商品名称/编码"
              clearable
              @keyup.enter="searchProducts"
            />
            <NkButton size="sm" variant="ghost" :loading="searching" @click="searchProducts">搜索</NkButton>
          </div>
          <div v-if="searchResults.length" class="goodser-export__results">
            <div
              v-for="p in searchResults"
              :key="p._id"
              class="goodser-export__result"
              @click="addProduct(p)"
            >
              <span class="goodser-export__result-name">{{ p.name }}</span>
              <span class="goodser-export__muted">{{ p.code }}</span>
              <span class="goodser-export__result-add">＋</span>
            </div>
          </div>

          <div class="goodser-export__add-row">
            <NkSelect v-model="comboId" :options="comboOptions" placeholder="添加组合包" size="sm" style="flex: 1" />
            <NkButton size="sm" variant="ghost" :disabled="!comboId" @click="addCombo">添加</NkButton>
          </div>
          <div class="goodser-export__add-row">
            <NkSelect v-model="bundleId" :options="bundleOptions" placeholder="添加捆（默认预览价）" size="sm" style="flex: 1" />
            <NkButton size="sm" variant="ghost" :disabled="!bundleId" @click="addBundle">添加</NkButton>
          </div>
        </div>
      </section>

      <!-- 右：样式 -->
      <section class="goodser-export__pane">
        <div class="goodser-export__title">样式</div>

        <div class="goodser-export__field">
          <span class="goodser-export__label">模板</span>
          <div class="goodser-export__template-row">
            <NkSelect v-model="templateId" :options="templateOptions" placeholder="选择模板" size="sm" style="flex: 1" />
            <NkButton size="sm" variant="ghost" :disabled="!templateId" @click="applyTemplate">应用</NkButton>
          </div>
          <div class="goodser-export__template-row">
            <NkInput v-model="templateName" size="sm" placeholder="模板名称" style="flex: 1" />
            <NkButton size="sm" variant="ghost" :loading="savingTemplate" @click="saveTemplate">保存</NkButton>
            <NkButton v-if="templateId" size="sm" variant="ghost" type="danger" @click="removeTemplate">删除</NkButton>
          </div>
        </div>

        <div class="goodser-export__field">
          <span class="goodser-export__label">背景</span>
          <div class="goodser-export__chips">
            <button
              v-for="bg in backgroundOptions"
              :key="bg.value"
              type="button"
              class="goodser-export__chip"
              :class="{ 'goodser-export__chip--active': options.background === bg.value }"
              @click="options.background = bg.value"
            >{{ bg.label }}</button>
          </div>
        </div>

        <div v-if="options.background === 'transparent'" class="goodser-export__field">
          <span class="goodser-export__label">文字</span>
          <div class="goodser-export__chips">
            <button
              v-for="tc in textColorOptions"
              :key="tc.value"
              type="button"
              class="goodser-export__chip"
              :class="{ 'goodser-export__chip--active': options.textColor === tc.value }"
              @click="options.textColor = tc.value"
            >{{ tc.label }}</button>
          </div>
        </div>

        <div class="goodser-export__field">
          <span class="goodser-export__label">列数</span>
          <div class="goodser-export__chips">
            <button
              v-for="c in [3, 4, 5]"
              :key="c"
              type="button"
              class="goodser-export__chip"
              :class="{ 'goodser-export__chip--active': options.columns === c }"
              @click="options.columns = c"
            >{{ c }} 列</button>
          </div>
        </div>

        <div class="goodser-export__field">
          <span class="goodser-export__label">格式</span>
          <div class="goodser-export__chips">
            <button
              v-for="f in formatOptions"
              :key="f.value"
              type="button"
              class="goodser-export__chip"
              :class="{ 'goodser-export__chip--active': options.format === f.value }"
              @click="options.format = f.value"
            >{{ f.label }}</button>
          </div>
        </div>

        <div class="goodser-export__field">
          <span class="goodser-export__label">显示</span>
          <div class="goodser-export__switches">
            <NkSwitch v-model="options.showName" size="sm">名称</NkSwitch>
            <NkSwitch v-model="options.showPrice" size="sm">价格</NkSwitch>
            <NkSwitch v-model="options.showQuantity" size="sm">数量</NkSwitch>
          </div>
        </div>

        <div class="goodser-export__field">
          <span class="goodser-export__label">价格口径</span>
          <div class="goodser-export__chips">
            <button
              v-for="pd in priceDisplayOptions"
              :key="pd.value"
              type="button"
              class="goodser-export__chip"
              :class="{ 'goodser-export__chip--active': options.priceDisplay === pd.value }"
              @click="options.priceDisplay = pd.value"
            >{{ pd.label }}</button>
          </div>
        </div>

        <div class="goodser-export__field">
          <span class="goodser-export__label">标题</span>
          <NkInput v-model="options.title" size="sm" placeholder="例如：2026-11-26 发货清单" />
        </div>
      </section>

      <!-- 预览 -->
      <section class="goodser-export__pane goodser-export__pane--wide">
        <div class="goodser-export__title">
          价格预览
          <span v-if="previewing" class="goodser-export__muted">计算中…</span>
        </div>
        <div v-if="previewError" class="goodser-export__error">{{ previewError }}</div>
        <div v-else-if="preview && preview.lines.length" class="goodser-export__lines">
          <div v-for="line in preview.lines" :key="line.type + ':' + line.id" class="goodser-export__line">
            <span class="goodser-export__line-name">
              {{ line.name }}
              <em v-if="line.quantity > 1" class="goodser-export__line-qty">×{{ line.quantity }}</em>
            </span>
            <span class="goodser-export__line-price">
              ¥{{ money(line.amount) }}
              <small v-if="line.quantity > 1">单价 ¥{{ money(line.unit_price) }}</small>
            </span>
          </div>
          <div class="goodser-export__total">
            <span>合计 <strong>¥{{ money(preview.total_amount) }}</strong></span>
            <span class="goodser-export__muted">{{ preview.lines.length }} 种 / {{ preview.total_quantity }} 件</span>
          </div>
        </div>
        <div v-else class="goodser-export__muted">添加商品后显示价格与合计</div>

        <div v-if="lastJob && lastJob.result_url" class="goodser-export__result-banner">
          <span>已生成</span>
          <a :href="lastJob.result_url" target="_blank" rel="noopener">下载图片</a>
        </div>
        <div v-else-if="lastJob && lastJob.status === 'failed'" class="goodser-export__error">
          导出失败：{{ lastJob.error || '未知错误' }}
        </div>
      </section>

      <!-- 历史 -->
      <section v-if="history.length" class="goodser-export__pane goodser-export__pane--wide">
        <div class="goodser-export__title">最近导出</div>
        <div class="goodser-export__history">
          <div v-for="job in history" :key="job.id" class="goodser-export__history-row">
            <NkTag size="sm" :type="statusTagType(job.status)">{{ statusLabel(job.status) }}</NkTag>
            <span class="goodser-export__muted">{{ formatDate(job.created_at) }}</span>
            <span v-if="job.error" class="goodser-export__history-error">{{ job.error }}</span>
            <a v-if="job.result_url" :href="job.result_url" target="_blank" rel="noopener" class="goodser-export__link">下载</a>
            <NkButton size="xs" variant="ghost" type="danger" @click="removeHistory(job)">删除</NkButton>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="goodser-export__footer">
        <span class="goodser-export__muted">
          <template v-if="preview">合计 ¥{{ money(preview.total_amount) }} · {{ preview.total_quantity }} 件</template>
          <template v-else>未选择商品</template>
        </span>
        <div class="goodser-export__footer-actions">
          <NkButton variant="ghost" @click="onVisibleChange(false)">关闭</NkButton>
          <NkButton :loading="generating" :disabled="!items.length" @click="generate">生成图片</NkButton>
        </div>
      </div>
    </template>
  </NkDialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { NKMessage } from '@nkui/vue'
import {
  createExport,
  createExportTemplate,
  deleteExport,
  deleteExportTemplate,
  getExport,
  loadBundles,
  loadCombos,
  loadExports,
  loadExportTemplates,
  previewExport,
  queryProducts,
  updateExportTemplate,
} from '@/api/goodser'
import type {
  Bundle,
  Combo,
  ExportBackground,
  ExportFormat,
  ExportJob,
  ExportPreview,
  ExportPriceDisplay,
  ExportRequest,
  ExportTemplate,
  ExportTemplateReq,
  ExportTextColor,
  Product,
} from '@/types/goodser'
import { formatDate } from '../utils'

const props = defineProps<{
  modelValue: boolean
  inventoryId: string
  initialProducts?: Product[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'created'): void
}>()

interface DraftItem {
  key: string
  type: 'product' | 'bundle' | 'combo'
  id: string
  name: string
  image?: string | null
  quantity: number
}

const items = ref<DraftItem[]>([])
const keyword = ref('')
const searching = ref(false)
const productResults = ref<Product[]>([])
const combos = ref<Combo[]>([])
const bundles = ref<Bundle[]>([])
const comboId = ref('')
const bundleId = ref('')

const preview = ref<ExportPreview | null>(null)
const previewing = ref(false)
const previewError = ref('')
const generating = ref(false)
const lastJob = ref<ExportJob | null>(null)
const history = ref<ExportJob[]>([])
const templates = ref<ExportTemplate[]>([])
const templateId = ref('')
const templateName = ref('')
const savingTemplate = ref(false)

const options = ref({
  columns: 4,
  background: 'white' as ExportBackground,
  textColor: 'auto' as ExportTextColor,
  format: 'png' as ExportFormat,
  showName: true,
  showPrice: true,
  showQuantity: true,
  priceDisplay: 'total' as ExportPriceDisplay,
  title: '',
})

const backgroundOptions: Array<{ label: string; value: ExportBackground }> = [
  { label: '白色', value: 'white' },
  { label: '黑色', value: 'black' },
  { label: '透明', value: 'transparent' },
]
const textColorOptions: Array<{ label: string; value: ExportTextColor }> = [
  { label: '自动', value: 'auto' },
  { label: '深色', value: 'dark' },
  { label: '浅色', value: 'light' },
]
const formatOptions: Array<{ label: string; value: ExportFormat }> = [
  { label: 'PNG', value: 'png' },
  { label: 'JPEG', value: 'jpeg' },
]
const priceDisplayOptions: Array<{ label: string; value: ExportPriceDisplay }> = [
  { label: '行金额', value: 'total' },
  { label: '单价', value: 'unit' },
  { label: '两者', value: 'both' },
]

const totalQuantity = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
const searchResults = computed(() =>
  productResults.value.filter((p) => !items.value.some((i) => i.key === `product:${p._id}`)),
)
const comboOptions = computed(() =>
  combos.value.map((c) => ({ label: `${c.name}${c.price ? `（¥${money(c.price)}）` : ''}`, value: c._id })),
)
const bundleOptions = computed(() =>
  bundles.value.map((b) => ({ label: b.name, value: b._id })),
)

const requestPayload = computed<ExportRequest>(() => ({
  items: items.value.map((item) => ({
    type: item.type,
    id: item.id,
    quantity: item.quantity,
  })),
  columns: options.value.columns,
  background: options.value.background,
  text_color: options.value.textColor,
  format: options.value.format,
  show_name: options.value.showName,
  show_price: options.value.showPrice,
  show_quantity: options.value.showQuantity,
  price_display: options.value.priceDisplay,
  title: options.value.title.trim() || undefined,
}))

const templateOptions = computed(() =>
  templates.value.map((tpl) => ({
    label: tpl.is_default ? `${tpl.name}（默认）` : tpl.name,
    value: tpl.id,
  })),
)

const templateConfig = computed<Partial<ExportRequest>>(() => {
  const payload = requestPayload.value
  return {
    columns: payload.columns,
    background: payload.background,
    text_color: payload.text_color,
    format: payload.format,
    show_name: payload.show_name,
    show_price: payload.show_price,
    show_quantity: payload.show_quantity,
    price_display: payload.price_display,
    title: payload.title,
  }
})

let previewTimer: ReturnType<typeof setTimeout> | null = null

function schedulePreview() {
  if (!props.modelValue) return
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(runPreview, 300)
}

watch(
  () => JSON.stringify(requestPayload.value),
  () => schedulePreview(),
)

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) {
      if (previewTimer) clearTimeout(previewTimer)
      return
    }
    await onOpen()
  },
)

watch(templateId, (id) => {
  if (id) applyTemplate()
})

onBeforeUnmount(() => {
  if (previewTimer) clearTimeout(previewTimer)
})

async function onOpen() {
  items.value = []
  lastJob.value = null
  preview.value = null
  previewError.value = ''
  templateId.value = ''
  templateName.value = ''
  for (const product of props.initialProducts || []) {
    pushProduct(product)
  }
  await Promise.all([loadPickers(), loadHistory(), loadTemplates()])
  await runPreview()
}

function onVisibleChange(value: boolean) {
  emit('update:modelValue', value)
}

function pushProduct(product: Product) {
  const key = `product:${product._id}`
  if (items.value.some((i) => i.key === key)) return
  items.value.push({
    key,
    type: 'product',
    id: product._id,
    name: product.name,
    image: product.image_url || product.images?.[0] || null,
    quantity: 1,
  })
}

function addProduct(product: Product) {
  pushProduct(product)
  schedulePreview()
}

function addCombo() {
  const combo = combos.value.find((c) => c._id === comboId.value)
  if (!combo) return
  const key = `combo:${combo._id}`
  if (!items.value.some((i) => i.key === key)) {
    items.value.push({
      key,
      type: 'combo',
      id: combo._id,
      name: combo.name,
      image: combo.image_url || null,
      quantity: 1,
    })
  }
  comboId.value = ''
  schedulePreview()
}

function addBundle() {
  const bundle = bundles.value.find((b) => b._id === bundleId.value)
  if (!bundle) return
  const key = `bundle:${bundle._id}`
  if (!items.value.some((i) => i.key === key)) {
    items.value.push({
      key,
      type: 'bundle',
      id: bundle._id,
      name: bundle.name,
      image: bundle.main_products?.[0]?.image_url || null,
      quantity: 1,
    })
  }
  bundleId.value = ''
  schedulePreview()
}

function changeQty(item: DraftItem, delta: number) {
  item.quantity = Math.max(1, item.quantity + delta)
  schedulePreview()
}

function removeItem(item: DraftItem) {
  items.value = items.value.filter((i) => i.key !== item.key)
  schedulePreview()
}

async function searchProducts() {
  if (!props.inventoryId) return
  searching.value = true
  try {
    const res = await queryProducts({
      inventory_id: props.inventoryId,
      keyword: keyword.value.trim() || undefined,
      page: 1,
      page_size: 8,
    })
    productResults.value = res.data?.items || []
  } catch (err: any) {
    NKMessage.error(err.message || '搜索商品失败')
    productResults.value = []
  } finally {
    searching.value = false
  }
}

async function loadPickers() {
  if (!props.inventoryId) return
  try {
    const [comboRes, bundleRes] = await Promise.all([
      loadCombos(props.inventoryId, 'active'),
      loadBundles(props.inventoryId, 'active'),
    ])
    combos.value = comboRes.data?.items || []
    bundles.value = bundleRes.data?.items || []
  } catch {
    combos.value = []
    bundles.value = []
  }
}

async function loadTemplates() {
  if (!props.inventoryId) return
  try {
    const res = await loadExportTemplates(props.inventoryId)
    templates.value = res.data || []
  } catch {
    templates.value = []
  }
}

function applyTemplate() {
  const tpl = templates.value.find((item) => item.id === templateId.value)
  if (!tpl) return
  const cfg = tpl.config || {}
  options.value = {
    ...options.value,
    columns: cfg.columns ?? options.value.columns,
    background: cfg.background ?? options.value.background,
    textColor: cfg.text_color ?? options.value.textColor,
    format: cfg.format ?? options.value.format,
    showName: cfg.show_name ?? options.value.showName,
    showPrice: cfg.show_price ?? options.value.showPrice,
    showQuantity: cfg.show_quantity ?? options.value.showQuantity,
    priceDisplay: cfg.price_display ?? options.value.priceDisplay,
    title: cfg.title ?? options.value.title,
  }
  templateName.value = tpl.name
  schedulePreview()
}

async function saveTemplate() {
  const name = templateName.value.trim()
  if (!name) {
    NKMessage.warning('请输入模板名称')
    return
  }
  savingTemplate.value = true
  try {
    const payload: ExportTemplateReq = {
      inventory_id: props.inventoryId,
      name,
      config: templateConfig.value,
      is_default: false,
    }
    if (templateId.value) {
      await updateExportTemplate(templateId.value, payload)
    } else {
      const res = await createExportTemplate(payload)
      templateId.value = res.data?.id || ''
    }
    NKMessage.success('模板已保存')
    await loadTemplates()
  } catch (err: any) {
    NKMessage.error(err.message || '保存模板失败')
  } finally {
    savingTemplate.value = false
  }
}

async function removeTemplate() {
  if (!templateId.value) return
  try {
    await deleteExportTemplate(templateId.value)
    templateId.value = ''
    templateName.value = ''
    NKMessage.success('模板已删除')
    await loadTemplates()
  } catch (err: any) {
    NKMessage.error(err.message || '删除模板失败')
  }
}

async function runPreview() {
  if (!items.value.length) {
    preview.value = null
    previewError.value = ''
    return
  }
  previewing.value = true
  previewError.value = ''
  try {
    const res = await previewExport(props.inventoryId, requestPayload.value)
    preview.value = res.data
  } catch (err: any) {
    preview.value = null
    previewError.value = err.message || '价格预览失败'
  } finally {
    previewing.value = false
  }
}

async function generate() {
  if (!items.value.length) return
  generating.value = true
  lastJob.value = null
  try {
    const res = await createExport(props.inventoryId, requestPayload.value)
    let job = res.data
    if (job && (job.status === 'pending' || job.status === 'processing')) {
      job = (await pollJob(job.id)) || job
    }
    lastJob.value = job
    if (job?.status === 'succeeded' && job.result_url) {
      NKMessage.success('导出完成，可点击下载')
    } else if (job?.status === 'failed') {
      NKMessage.error(job.error || '导出失败')
    } else {
      NKMessage.info('导出任务已提交，请稍后在历史记录查看')
    }
    await loadHistory()
    emit('created')
  } catch (err: any) {
    NKMessage.error(err.message || '导出失败')
  } finally {
    generating.value = false
  }
}

async function pollJob(id: string): Promise<ExportJob | null> {
  for (let i = 0; i < 60; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 800))
    try {
      const res = await getExport(id)
      const job = res.data
      if (job && (job.status === 'succeeded' || job.status === 'failed')) {
        return job
      }
    } catch {
      // 轮询失败继续重试
    }
  }
  return null
}

async function loadHistory() {
  if (!props.inventoryId) return
  try {
    const res = await loadExports(props.inventoryId, 8)
    history.value = res.data || []
  } catch {
    history.value = []
  }
}

async function removeHistory(job: ExportJob) {
  try {
    await deleteExport(job.id)
    history.value = history.value.filter((item) => item.id !== job.id)
    if (lastJob.value?.id === job.id) lastJob.value = null
  } catch (err: any) {
    NKMessage.error(err.message || '删除导出记录失败')
  }
}

function money(value?: number | null) {
  return Number(value || 0).toFixed(2)
}

function typeLabel(type: DraftItem['type']) {
  if (type === 'combo') return '组合包'
  if (type === 'bundle') return '捆'
  return '商品'
}

function statusLabel(status: ExportJob['status']) {
  if (status === 'succeeded') return '已完成'
  if (status === 'failed') return '失败'
  if (status === 'processing') return '生成中'
  return '排队中'
}

function statusTagType(status: ExportJob['status']): 'success' | 'danger' | 'info' | 'warning' {
  if (status === 'succeeded') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'processing') return 'info'
  return 'warning'
}
</script>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.goodser-export {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: $nk-spacing-lg;

  &__pane {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-sm;
    min-width: 0;

    &--wide {
      grid-column: 1 / -1;
    }
  }

  &__title {
    display: flex;
    align-items: baseline;
    gap: $nk-spacing-sm;
    font-size: $nk-font-size-sm;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }

  &__muted {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
    font-weight: $nk-font-weight-regular;
  }

  &__empty {
    padding: $nk-spacing-lg;
    border: 1px dashed $nk-color-neutral-300;
    border-radius: $nk-radius-md;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-500;
    text-align: center;
  }

  &__items {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 260px;
    overflow-y: auto;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    padding: 6px 8px;
    border: 1px solid $nk-color-neutral-200;
    border-radius: $nk-radius-md;
    background: $nk-color-neutral-0;
  }

  &__thumb {
    width: 40px;
    height: 40px;
    border-radius: $nk-radius-sm;
    object-fit: cover;
    background: $nk-color-neutral-100;
    flex-shrink: 0;

    &--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: $nk-color-neutral-400;
    }
  }

  &__item-main {
    flex: 1;
    min-width: 0;
  }

  &__item-name {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-900;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__qty {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  &__qty-value {
    min-width: 20px;
    text-align: center;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-800;
  }

  &__add {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: $nk-spacing-sm;
    border-top: 1px dashed $nk-color-neutral-200;
  }

  &__search,
  &__add-row {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
  }

  &__template-row {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
  }

  &__results {
    max-height: 180px;
    overflow-y: auto;
    border: 1px solid $nk-color-neutral-200;
    border-radius: $nk-radius-md;
  }

  &__result {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    padding: 6px 10px;
    font-size: $nk-font-size-sm;
    cursor: pointer;
    color: $nk-color-neutral-800;

    &:hover {
      background: $nk-color-neutral-100;
    }
  }

  &__result-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__result-add {
    color: $nk-color-primary-600;
    font-weight: $nk-font-weight-semibold;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__label {
    font-size: $nk-font-size-xs;
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-700;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  &__chip {
    padding: 4px 10px;
    border-radius: $nk-radius-full;
    border: 1px solid $nk-color-neutral-200;
    background: $nk-color-neutral-0;
    color: $nk-color-neutral-700;
    font-size: $nk-font-size-xs;
    cursor: pointer;
    transition: all $nk-duration-fast;

    &:hover {
      border-color: $nk-color-primary-300;
      color: $nk-color-primary-600;
    }

    &--active {
      border-color: $nk-color-primary-500;
      background: $nk-color-primary-50;
      color: $nk-color-primary-700;
      font-weight: $nk-font-weight-medium;
    }
  }

  &__switches {
    display: flex;
    flex-wrap: wrap;
    gap: $nk-spacing-md;
  }

  &__lines {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 10px;
    border-radius: $nk-radius-md;
    background: $nk-color-neutral-50;
  }

  &__line {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: $nk-spacing-md;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-700;
  }

  &__line-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__line-qty {
    color: $nk-color-primary-600;
    font-style: normal;
    font-weight: $nk-font-weight-medium;
  }

  &__line-price {
    flex-shrink: 0;
    color: $nk-color-neutral-900;

    small {
      margin-left: 6px;
      font-size: 10px;
      color: $nk-color-neutral-500;
    }
  }

  &__total {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding-top: 6px;
    border-top: 1px solid $nk-color-neutral-200;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-700;

    strong {
      color: $nk-color-primary-600;
      font-size: $nk-font-size-lg;
    }
  }

  &__result-banner {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    padding: 8px 10px;
    border-radius: $nk-radius-md;
    background: color-mix(in srgb, var(--nk-color-success) 12%, transparent);
    color: $nk-color-neutral-800;
    font-size: $nk-font-size-sm;

    a {
      color: $nk-color-primary-600;
      font-weight: $nk-font-weight-medium;
    }
  }

  &__history {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__history-row {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    font-size: $nk-font-size-sm;
  }

  &__history-error {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: $nk-font-size-xs;
    color: $nk-color-error;
  }

  &__link {
    color: $nk-color-primary-600;
  }

  &__error {
    font-size: $nk-font-size-sm;
    color: $nk-color-error;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $nk-spacing-md;
    width: 100%;
  }

  &__footer-actions {
    display: flex;
    gap: $nk-spacing-sm;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;

    &__pane--wide {
      grid-column: 1;
    }
  }
}
</style>
