<template>
  <div class="goodser__tab">
    <div class="goodser__tab-header">
      <span class="goodser__count">共 {{ ordersTotal || orders.length }} 个订单</span>
      <div>
        <NkButton size="sm" variant="ghost" style="margin-right: 8px" @click="openCreateOrder('reserve')">
          新建预留
        </NkButton>
        <NkButton size="sm" @click="openCreateOrder('outbound')">新建出库</NkButton>
      </div>
    </div>
    <div class="goodser__order-toolbar">
      <NkInput
        v-model="orderKeyword"
        placeholder="搜索单号 / 订单信息 / 备注..."
        size="sm"
        clearable
        @clear="searchOrders"
        @keyup.enter="searchOrders"
      />
      <NkButton size="sm" variant="ghost" @click="searchOrders">搜索</NkButton>
    </div>
    <NkLoading v-if="loadingOrders" />
    <div v-else-if="!orders.length" class="goodser__empty">
      <NkEmpty description="暂无出库订单" />
    </div>
    <div v-else class="goodser__order-list">
      <NkCard v-for="o in orders" :key="o._id" class="goodser__order-card" @click="openOrderDetail(o)">
        <div class="goodser__order-card-header">
          <div>
            <span class="goodser__order-no">{{ o.order_no }}</span>
            <NkTag :type="orderStatusType(o.status)" size="sm" style="margin-left: 8px">
              {{ orderStatusLabel(o.status) }}
            </NkTag>
            <NkTag v-if="o.type === 'reserve'" size="sm" type="warning" style="margin-left: 4px">预留</NkTag>
          </div>
          <span class="goodser__order-date">{{ formatDate(o.created_at) }}</span>
        </div>
        <div class="goodser__order-meta">
          <span>{{ o.items?.length || 0 }} 件商品</span>
          <span v-if="o.order_info">{{ o.order_info }}</span>
        </div>
        <div v-if="o.status === 'pending'" class="goodser__order-actions" @click.stop>
          <template v-if="o.type === 'reserve'">
            <NkButton size="xs" variant="ghost" @click="openConvertReserve(o)">转出库</NkButton>
            <NkButton size="xs" variant="ghost" type="danger" @click="askOrderAction(o, 'cancelReserve')">取消预留</NkButton>
          </template>
          <template v-else>
            <NkButton size="xs" variant="ghost" @click="askOrderAction(o, 'confirm')">确认出库</NkButton>
            <NkButton size="xs" variant="ghost" type="danger" @click="askOrderAction(o, 'cancel')">取消</NkButton>
          </template>
        </div>
        <div v-else-if="canReturn(o)" class="goodser__order-actions" @click.stop>
          <NkButton size="xs" variant="ghost" @click="openReturnDialog(o)">退货</NkButton>
        </div>
      </NkCard>
    </div>
    <div v-if="orders.length" class="goodser__pagination">
      <NkButton size="sm" variant="ghost" :disabled="ordersPage <= 1" @click="fetchOrders(ordersPage - 1)">
        上一页
      </NkButton>
      <NkSelect
        :model-value="ordersPageSize"
        :options="pageSizeOptions"
        size="sm"
        style="width: 110px"
        @update:model-value="onPageSizeChange"
      />
      <div class="goodser__page-jump">
        <NkInput
          v-model="jumpPage"
          type="number"
          size="xs"
          style="width: 60px"
          :min="1"
          :max="ordersTotalPages"
          @keyup.enter="handleJumpPage"
        />
        <NkButton size="xs" variant="ghost" :disabled="!jumpPage" @click="handleJumpPage">跳转</NkButton>
      </div>
      <span class="goodser__page-info">{{ ordersPage }} / {{ ordersTotalPages }}</span>
      <NkButton
        size="sm"
        variant="ghost"
        :disabled="ordersPage >= ordersTotalPages"
        @click="fetchOrders(ordersPage + 1)"
      >
        下一页
      </NkButton>
    </div>

    <!-- Create Order (Outbound/Reserve) -->
    <NkDialog
      v-model:visible="showOrderForm"
      :title="orderFormType === 'reserve' ? '新建预留订单' : '新建出库订单'"
      :width="500"
    >
      <div class="goodser__order-form">
        <div class="goodser__form-field">
          <label class="goodser__form-label">订单号 *</label>
          <NkInput v-model="orderForm.order_no" placeholder="例如 OUT-20240101-001" />
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">订单信息</label>
          <NkInput v-model="orderForm.order_info" placeholder="订单信息" />
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">备注</label>
          <NkTextarea v-model="orderForm.remark" placeholder="备注" />
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">组合包（可选）</label>
          <div class="goodser__combo-picker">
            <NkSelect
              v-model="orderForm.combo_id"
              :options="comboSelectOptions"
              placeholder="不使用组合包"
              :disabled="!!bundleOrder.bundle_id"
              @change="onComboChange"
            />
            <NkInput
              v-if="orderForm.combo_id"
              v-model="orderForm.combo_quantity"
              type="number"
              size="sm"
              style="width: 90px"
              placeholder="数量"
            />
          </div>
          <p v-if="orderForm.combo_id && comboGuardMessage" class="goodser__return-tip" style="color: #d4380d">
            {{ comboGuardMessage }}
          </p>
          <p v-else-if="orderForm.combo_id" class="goodser__return-tip">
            可售 {{ comboAvailability }} 套 · 提交后会按组件明细展开并扣减组件库存。
          </p>
          <div v-if="orderForm.combo_id && comboBundleComponents.length" class="goodser__combo-bundle-configs">
            <p class="goodser__return-tip" style="color: #d4380d">组合包含捆，请手动选择每套捆的主商品与捆物</p>
            <div
              v-for="bc in comboBundleComponents"
              :key="bc.bundle_id"
              class="goodser__combo-bundle-config"
            >
              <div class="goodser__form-label">捆：{{ bc.bundle_name }} × {{ bc.quantity }}</div>
              <div class="goodser__form-row">
                <div class="goodser__form-field goodser__form-field--half">
                  <label class="goodser__form-label">主商品</label>
                  <NkSelect
                    v-model="comboSelection(bc.bundle_id || '').main_product_id"
                    :options="comboBundleMainOptions(bc.bundle_id || '')"
                    placeholder="选择主商品"
                  />
                </div>
                <div class="goodser__form-field goodser__form-field--half">
                  <label class="goodser__form-label">主商品数量 / 单捆</label>
                  <NkInput v-model="comboSelection(bc.bundle_id || '').main_quantity" type="number" size="sm" />
                </div>
              </div>
              <div class="goodser__order-items">
                <div
                  v-for="s in comboBundleByID(bc.bundle_id || '')?.sub_products || []"
                  :key="s.product_id"
                  class="goodser__order-item"
                >
                  <span class="goodser__order-item-name">
                    {{ s.product_name }}（可用 {{ s.available }}）
                  </span>
                  <NkButton size="xs" variant="ghost" @click="incComboSubItem(bc.bundle_id || '', s.product_id)">
                    +1
                  </NkButton>
                  <NkInput
                    v-model="comboSelection(bc.bundle_id || '').sub_quantities[s.product_id]"
                    type="number"
                    size="xs"
                    style="width: 70px"
                  />
                </div>
              </div>
            </div>
            <p class="goodser__return-tip">可重复选择同一捆物，数量按单捆计。</p>
          </div>
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">捆（可选）</label>
          <NkSelect
            v-model="bundleOrder.bundle_id"
            :options="bundleSelectOptions"
            placeholder="不使用捆"
            :disabled="!!orderForm.combo_id"
            @change="onBundleOrderChange"
          />
          <template v-if="bundleOrder.bundle_id && selectedBundle">
            <div class="goodser__form-row" style="margin-top: 8px">
              <div class="goodser__form-field">
                <label class="goodser__form-label">主商品</label>
                <NkSelect
                  v-model="bundleOrder.main_product_id"
                  :options="bundleMainOrderOptions"
                  placeholder="选择主商品"
                  @change="refreshBundleOrderPreview"
                />
              </div>
              <div class="goodser__form-field goodser__form-field--third">
                <label class="goodser__form-label">主商品数量 / 单捆</label>
                <NkInput
                  v-model="bundleOrder.main_quantity"
                  type="number"
                  size="sm"
                  @change="refreshBundleOrderPreview"
                />
              </div>
              <div class="goodser__form-field goodser__form-field--third">
                <label class="goodser__form-label">捆数</label>
                <NkInput
                  v-model="bundleOrder.quantity"
                  type="number"
                  size="sm"
                  @change="refreshBundleOrderPreview"
                />
              </div>
            </div>
            <div class="goodser__order-items" style="margin-top: 8px">
              <div class="goodser__form-label">副区商品数量 / 单捆</div>
              <div v-for="s in selectedBundle.sub_products" :key="s.product_id" class="goodser__order-item">
                <span class="goodser__order-item-name">
                  {{ s.product_name }}（{{ s.product_code }} · 可用 {{ s.available }}）
                </span>
                <NkInput
                  v-model="bundleOrder.sub_quantities[s.product_id]"
                  type="number"
                  size="xs"
                  style="width: 80px"
                  @change="refreshBundleOrderPreview"
                />
              </div>
            </div>
            <p v-if="bundlePreviewError" class="goodser__return-tip" style="color: #d4380d">{{ bundlePreviewError }}</p>
            <p v-else-if="bundlePreview" class="goodser__return-tip">
              单捆 ¥{{ bundlePreview.unit_price }} · 共 {{ bundlePreview.quantity }} 捆 · 总价 ¥{{ bundlePreview.total_price }}
              （主商品 ¥{{ bundlePreview.main_amount }} / 副区 ¥{{ bundlePreview.sub_amount }}）
            </p>
            <p v-else-if="bundlePreviewLoading" class="goodser__return-tip">正在计算捆价格...</p>
          </template>
        </div>
        <div v-if="!bundleOrder.bundle_id" class="goodser__form-field">
          <label class="goodser__form-label">商品 (搜索添加)</label>
          <NkInput
            v-model="orderProductQuery"
            placeholder="搜索商品..."
            size="sm"
            clearable
            @clear="orderSearchResults = []"
            @keyup.enter="searchOrderProducts"
          />
          <div v-if="orderSearchResults.length" class="goodser__order-search-results">
            <div v-for="r in orderSearchResults" :key="r._id" class="goodser__order-search-item" @click="addOrderItem(r)">
              <span>{{ r.code }} - {{ r.name }}</span>
              <NkButton size="xs" variant="ghost">添加</NkButton>
            </div>
          </div>
          <div v-if="orderFormItems.length" class="goodser__order-items">
            <div v-for="(item, idx) in orderFormItems" :key="idx" class="goodser__order-item">
              <span class="goodser__order-item-name">{{ item.product_name }} ({{ item.product_code }})</span>
              <NkInput v-model="item.quantity" type="number" size="xs" style="width: 80px" placeholder="数量" />
              <NkButton size="xs" variant="ghost" type="danger" @click="orderFormItems.splice(idx, 1)">×</NkButton>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showOrderForm = false">取消</NkButton>
        <NkButton
          :loading="saving"
          :disabled="
            !orderForm.order_no.trim() ||
            (!orderFormItems.length && !orderForm.combo_id && !bundleOrder.bundle_id) ||
            (!!bundleOrder.bundle_id && !bundlePreview) ||
            !!comboGuardMessage
          "
          @click="handleCreateOrder"
        >
          确定
        </NkButton>
      </template>
    </NkDialog>

    <!-- Order Detail -->
    <NkDialog v-model:visible="showOrderDetail" :title="'订单 ' + (detailOrder?.order_no || '')" :width="520">
      <div v-if="detailOrder" class="goodser__order-detail">
        <div class="goodser__detail-row"><span class="goodser__detail-label">单号</span><span>{{ detailOrder.order_no }}</span></div>
        <div class="goodser__detail-row">
          <span class="goodser__detail-label">类型</span>
          <NkTag size="sm">{{ detailOrder.type === 'reserve' ? '预留' : '出库' }}</NkTag>
        </div>
        <div class="goodser__detail-row">
          <span class="goodser__detail-label">状态</span>
          <NkTag :type="orderStatusType(detailOrder.status)" size="sm">{{ orderStatusLabel(detailOrder.status) }}</NkTag>
        </div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">信息</span><span>{{ detailOrder.order_info || '-' }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">备注</span><span>{{ detailOrder.remark || '-' }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">商品</span></div>
        <div v-for="(item, idx) in detailOrder.items" :key="idx" class="goodser__detail-item">
          {{ item.product_name }} ({{ item.product_code }}) × {{ item.quantity }}
        </div>
        <div v-if="detailOrder.bundle_snapshot" class="goodser__detail-row">
          <span class="goodser__detail-label">捆</span>
          <span>
            {{ detailOrder.bundle_snapshot.bundle_name }} × {{ detailOrder.bundle_quantity }}
            · 单捆 ¥{{ detailOrder.bundle_snapshot.unit_price }}
            · 总价 ¥{{ detailOrder.bundle_snapshot.total_price }}
          </span>
        </div>
        <div class="goodser__detail-row">
          <span class="goodser__detail-label">创建时间</span>
          <span>{{ formatDate(detailOrder.created_at) }}</span>
        </div>
        <div v-if="detailOrder.confirmed_at" class="goodser__detail-row">
          <span class="goodser__detail-label">确认时间</span>
          <span>{{ formatDate(detailOrder.confirmed_at) }}</span>
        </div>
        <div v-if="detailOrder.converted_at" class="goodser__detail-row">
          <span class="goodser__detail-label">转出库时间</span>
          <span>{{ formatDate(detailOrder.converted_at) }}</span>
        </div>
        <div v-if="detailOrder.returned_at" class="goodser__detail-row">
          <span class="goodser__detail-label">全部退货时间</span>
          <span>{{ formatDate(detailOrder.returned_at) }}</span>
        </div>

        <template v-if="detailOrder.type === 'outbound'">
          <div class="goodser__detail-row" style="margin-top: 12px">
            <span class="goodser__detail-label">退货记录</span>
            <span>{{ orderReturns.length ? `${orderReturns.length} 条` : '无' }}</span>
          </div>
          <NkLoading v-if="loadingReturns" />
          <div v-for="ret in orderReturns" :key="ret._id" class="goodser__return-item">
            <div class="goodser__return-item-head">
              <NkTag :type="returnStatusType(ret.status)" size="sm">{{ returnStatusLabel(ret.status) }}</NkTag>
              <span class="goodser__return-reason">{{ returnReasonLabel(ret.reason) }}</span>
              <span class="goodser__return-date">{{ formatDate(ret.created_at) }}</span>
            </div>
            <div class="goodser__return-item-body">
              <span v-for="(it, i) in ret.items || []" :key="i" class="goodser__return-item-line">
                {{ it.product_name }} × {{ it.quantity }}{{ it.restock ? ' · 回库' : '' }}
              </span>
            </div>
            <div v-if="ret.status === 'pending'" class="goodser__order-actions">
              <NkButton size="xs" variant="ghost" @click="askConfirmReturn(ret)">确认退货</NkButton>
              <NkButton size="xs" variant="ghost" type="danger" @click="handleCancelReturn(ret)">取消</NkButton>
            </div>
          </div>
        </template>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showOrderDetail = false">关闭</NkButton>
        <NkButton v-if="detailOrder && canReturn(detailOrder)" @click="openReturnDialog(detailOrder)">退货</NkButton>
      </template>
    </NkDialog>

    <!-- Create Return Order -->
    <NkDialog v-model:visible="showReturnDialog" title="新建退货单" :width="580">
      <div v-if="returnOrder" class="goodser__return-form">
        <div class="goodser__detail-row">
          <span class="goodser__detail-label">原出库单</span>
          <span>{{ returnOrder.order_no }}</span>
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">退货原因</label>
          <NkSelect v-model="returnReason" :options="returnReasonOptions" @change="onReturnReasonChange" />
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">退货商品（可多选）</label>
          <div v-if="!returnFormItems.length" class="goodser__empty">
            <NkEmpty description="该订单已无可退商品" />
          </div>
          <div v-for="(item, idx) in returnFormItems" :key="idx" class="goodser__return-row">
            <NkCheckbox v-model="item.selected" :disabled="item.maxQuantity <= 0" />
            <span class="goodser__return-name">{{ item.product_name }} ({{ item.product_code }})</span>
            <span class="goodser__return-max">可退 {{ item.maxQuantity }}</span>
            <NkInput
              v-model="item.quantity"
              type="number"
              size="xs"
              style="width: 70px"
              :disabled="!item.selected || item.maxQuantity <= 0"
            />
            <NkCheckbox
              v-model="item.restock"
              size="sm"
              :disabled="returnReason === 'refund_only' || !item.selected"
            >回库</NkCheckbox>
          </div>
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">备注</label>
          <NkTextarea v-model="returnRemark" placeholder="退货备注" />
        </div>
        <p class="goodser__return-tip">创建后需在订单详情中确认退货，确认时才按“回库”设置调整库存。</p>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showReturnDialog = false">取消</NkButton>
        <NkButton :loading="saving" :disabled="!returnFormItems.some((i) => i.selected)" @click="handleCreateReturn">
          创建退货单
        </NkButton>
      </template>
    </NkDialog>

    <!-- Convert Reserve to Outbound -->
    <NkDialog v-model:visible="showConvertDialog" title="预留转出库" :width="480">
      <p>将预留订单 <strong>{{ convertingOrder?.order_no }}</strong> 转为正式出库订单</p>
      <div class="goodser__form-field" style="margin-top: 12px">
        <label class="goodser__form-label">新订单号 *</label>
        <NkInput v-model="convertOrderNo" placeholder="例如 OUT-20240101-001" />
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showConvertDialog = false">取消</NkButton>
        <NkButton :loading="saving" :disabled="!convertOrderNo.trim()" @click="handleConvertReserve">确定</NkButton>
      </template>
    </NkDialog>

    <ConfirmDialog
      v-model:visible="confirmVisible"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirm-text="confirmButtonText"
      :danger="confirmDanger"
      :loading="saving"
      @confirm="runConfirmAction"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  cancelOutbound,
  cancelReserve,
  cancelReturn,
  confirmOutbound,
  confirmReturn,
  createOutbound,
  createReturn,
  loadBundles,
  loadCombos,
  loadOutboundOrders,
  loadReturns,
  previewBundle,
  queryProducts,
  reserveToOutbound,
} from '@/api/goodser'
import type {
  Bundle,
  BundlePreviewResp,
  Combo,
  OrderItem,
  OutboundOrder,
  Product,
  ReturnOrder,
  ReturnReason,
} from '@/types/goodser'
import {
  bundlePriceModeLabel,
  formatDate,
  orderStatusLabel,
  orderStatusType,
  returnReasonLabel,
  returnStatusLabel,
  returnStatusType,
} from '../utils'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps<{
  inventoryId: string
  initialBundleId?: string
  initialOrderId?: string
}>()

const emit = defineEmits<{
  (e: 'changed'): void
  (e: 'bundle-consumed'): void
  (e: 'order-consumed'): void
}>()

const orders = ref<OutboundOrder[]>([])
const loadingOrders = ref(false)
const ordersPage = ref(1)
const ordersPageSize = ref(20)
const ordersTotal = ref(0)
const orderKeyword = ref('')
const jumpPage = ref<number | null>(null)
const pageSizeOptions = [10, 20, 50, 100].map((value) => ({ label: `${value} 条/页`, value }))
const saving = ref(false)
const showOrderForm = ref(false)
const showOrderDetail = ref(false)
const showConvertDialog = ref(false)
const showReturnDialog = ref(false)
const orderFormType = ref<'outbound' | 'reserve'>('outbound')
const orderForm = ref({ order_no: '', order_info: '', remark: '', combo_id: '', combo_quantity: 1 })
const orderFormItems = ref<OrderItem[]>([])
const orderProductQuery = ref('')
const orderSearchResults = ref<Product[]>([])
const bundleOrder = ref({
  bundle_id: '',
  main_product_id: '',
  main_quantity: 1,
  quantity: 1,
  sub_quantities: {} as Record<string, number>,
})
const bundlePreview = ref<BundlePreviewResp | null>(null)
const comboBundleSelections = ref<
  Record<string, { main_product_id: string; main_quantity: number; sub_quantities: Record<string, number> }>
>({})
const bundlePreviewLoading = ref(false)
const bundlePreviewError = ref('')
const detailOrder = ref<OutboundOrder | null>(null)
const convertingOrder = ref<OutboundOrder | null>(null)
const convertOrderNo = ref('')
const combos = ref<Combo[]>([])
const bundles = ref<Bundle[]>([])
const returnOrder = ref<OutboundOrder | null>(null)
const returnReason = ref<ReturnReason>('return_refund')
const returnRemark = ref('')
const orderReturns = ref<ReturnOrder[]>([])
const loadingReturns = ref(false)
const returnFormItems = ref<
  Array<{
    product_id: string
    product_name: string
    product_code: string
    quantity: number
    restock: boolean
    image_url?: string | null
    selected: boolean
    maxQuantity: number
  }>
>([])
const returnReasonOptions = [
  { label: '退货退款（默认回库）', value: 'return_refund' },
  { label: '仅退款（不回库）', value: 'refund_only' },
  { label: '运损（默认不回库）', value: 'shipping_damage' },
  { label: '其他', value: 'other' },
]

const comboSelectOptions = computed(() =>
  combos.value
    .filter((c) => c.status === 'active')
    .map((c) => ({ label: `${c.name}（可售 ${c.availability}）`, value: c._id })),
)
const selectedCombo = computed(
  () => combos.value.find((c) => c._id === orderForm.value.combo_id) || null,
)
const comboAvailability = computed(() => Number(selectedCombo.value?.availability) || 0)
const comboGuardMessage = computed(() => {
  if (!orderForm.value.combo_id) return ''
  if (!selectedCombo.value) return '组合包不存在或已删除，请重新选择'
  if (comboAvailability.value <= 0) return '该组合包可售为 0，请先补货或改选其他商品'
  const quantity = Number(orderForm.value.combo_quantity) || 1
  if (quantity > comboAvailability.value) return `组合包最多可下单 ${comboAvailability.value} 套`
  return ''
})
const bundleSelectOptions = computed(() =>
  bundles.value
    .filter((b) => b.status === 'active')
    .map((b) => ({ label: `${b.name}（${bundlePriceModeLabel(b.price_mode)}）`, value: b._id })),
)
const selectedBundle = computed(
  () => bundles.value.find((b) => b._id === bundleOrder.value.bundle_id) || null,
)
const bundleMainOrderOptions = computed(() =>
  (selectedBundle.value?.main_products || []).map((p) => ({
    label: `${p.product_name}（${p.product_code} · 可用 ${p.available}）`,
    value: p.product_id,
  })),
)
const comboBundleComponents = computed(() =>
  (selectedCombo.value?.items || []).filter((item) => item.item_type === 'bundle' && item.bundle_id),
)
function comboBundleByID(bundleId: string) {
  return bundles.value.find((bundle) => bundle._id === bundleId) || null
}
function comboSelection(bundleId: string) {
  if (!comboBundleSelections.value[bundleId]) {
    comboBundleSelections.value[bundleId] = {
      main_product_id: '',
      main_quantity: 1,
      sub_quantities: {},
    }
  }
  return comboBundleSelections.value[bundleId]
}
function comboBundleMainOptions(bundleId: string) {
  return (comboBundleByID(bundleId)?.main_products || []).map((p) => ({
    label: `${p.product_name}（${p.product_code} · 可用 ${p.available}）`,
    value: p.product_id,
  }))
}
function ensureComboBundleSelections() {
  const next: typeof comboBundleSelections.value = {}
  for (const item of comboBundleComponents.value) {
    const bundle = comboBundleByID(item.bundle_id || '')
    if (!bundle) continue
    const existing = comboBundleSelections.value[item.bundle_id || '']
    const main =
      existing?.main_product_id ||
      (bundle.main_products || []).find((p) => p.available > 0)?.product_id ||
      bundle.main_products?.[0]?.product_id ||
      ''
    const subQuantities: Record<string, number> = {}
    for (const sub of bundle.sub_products || []) {
      subQuantities[sub.product_id] = existing?.sub_quantities?.[sub.product_id] ?? 0
    }
    next[item.bundle_id || ''] = {
      main_product_id: main,
      main_quantity: existing?.main_quantity || bundle.min_main_quantity || 1,
      sub_quantities: subQuantities,
    }
  }
  comboBundleSelections.value = next
}
function comboSubSelection(bundleId: string, productId: string) {
  const selection = comboBundleSelections.value[bundleId]
  if (!selection) return 0
  return Number(selection.sub_quantities[productId]) || 0
}
function incComboSubItem(bundleId: string, productId: string) {
  const selection = comboBundleSelections.value[bundleId]
  if (!selection) return
  selection.sub_quantities[productId] = (Number(selection.sub_quantities[productId]) || 0) + 1
}
function comboBundleSelectionsPayload() {
  return comboBundleComponents.value.map((item) => {
    const selection = comboBundleSelections.value[item.bundle_id || '']
    return {
      bundle_id: item.bundle_id || '',
      main_product_id: selection?.main_product_id || '',
      main_quantity: Number(selection?.main_quantity) || 1,
      sub_items: Object.entries(selection?.sub_quantities || {})
        .map(([product_id, quantity]) => ({ product_id, quantity: Number(quantity) || 0 }))
        .filter((sub) => sub.quantity > 0),
    }
  })
}

// ---- Confirm dialog ----
type ConfirmAction =
  | { kind: 'confirm'; order: OutboundOrder }
  | { kind: 'cancel'; order: OutboundOrder }
  | { kind: 'cancelReserve'; order: OutboundOrder }
  | { kind: 'confirmReturn'; ret: ReturnOrder }
const pendingAction = ref<ConfirmAction | null>(null)
const confirmVisible = computed({
  get: () => !!pendingAction.value,
  set: (value: boolean) => {
    if (!value) pendingAction.value = null
  },
})
const confirmTitle = computed(() => {
  switch (pendingAction.value?.kind) {
    case 'confirm':
      return '确认出库'
    case 'cancel':
      return '取消订单'
    case 'cancelReserve':
      return '取消预留'
    case 'confirmReturn':
      return '确认退货'
    default:
      return '确认操作'
  }
})
const confirmMessage = computed(() => {
  const action = pendingAction.value
  if (!action) return ''
  if (action.kind === 'confirm') {
    return `确认出库单「${action.order.order_no}」吗？确认后将扣减可用库存。`
  }
  if (action.kind === 'cancel') {
    return `确定取消出库单「${action.order.order_no}」吗？取消后不可恢复。`
  }
  if (action.kind === 'cancelReserve') {
    return `确定取消预留「${action.order.order_no}」吗？释放的库存将回到可用库存。`
  }
  return `确认退货单「${action.ret.order_no}」吗？将按明细中的「回库」设置调整库存。`
})
const confirmButtonText = computed(() => {
  switch (pendingAction.value?.kind) {
    case 'confirm':
      return '确认出库'
    case 'confirmReturn':
      return '确认退货'
    default:
      return '确定'
  }
})
const confirmDanger = computed(
  () => pendingAction.value?.kind === 'cancel' || pendingAction.value?.kind === 'cancelReserve',
)

function askOrderAction(order: OutboundOrder, kind: 'confirm' | 'cancel' | 'cancelReserve') {
  pendingAction.value = kind === 'confirm' ? { kind, order } : { kind, order }
}

function askConfirmReturn(ret: ReturnOrder) {
  pendingAction.value = { kind: 'confirmReturn', ret }
}

async function runConfirmAction() {
  const action = pendingAction.value
  if (!action) return
  pendingAction.value = null
  if (action.kind === 'confirm') await handleConfirmOrder(action.order)
  else if (action.kind === 'cancel') await handleCancelOrder(action.order)
  else if (action.kind === 'cancelReserve') await handleCancelReserve(action.order)
  else await handleConfirmReturn(action.ret)
}

async function fetchOrders(page = ordersPage.value) {
  if (!props.inventoryId) return
  loadingOrders.value = true
  try {
    const request = (target: number) =>
      loadOutboundOrders({
        inventory_id: props.inventoryId,
        keyword: orderKeyword.value.trim() || undefined,
        page: target,
        page_size: ordersPageSize.value,
      })
    let res = await request(page)
    let items = res.data?.items || []
    let total = res.data?.total || 0
    let totalPages = Math.max(1, Math.ceil(total / ordersPageSize.value))
    // 删除/取消后当前页可能已空，回退到最后一页。
    if (page > totalPages) {
      page = totalPages
      res = await request(page)
      items = res.data?.items || []
      total = res.data?.total || 0
      totalPages = Math.max(1, Math.ceil(total / ordersPageSize.value))
    }
    orders.value = items
    ordersPage.value = page
    ordersTotal.value = total
    jumpPage.value = null
  } catch (err: any) {
    NKMessage.error(err.message || '加载订单失败')
  } finally {
    loadingOrders.value = false
  }
}

const ordersTotalPages = computed(() => Math.max(1, Math.ceil(ordersTotal.value / ordersPageSize.value)))

function searchOrders() {
  fetchOrders(1)
}

function onPageSizeChange(value: number) {
  ordersPageSize.value = Number(value) || 20
  fetchOrders(1)
}

function handleJumpPage() {
  const target = Number(jumpPage.value)
  if (!target) return
  const page = Math.min(Math.max(1, Math.round(target)), ordersTotalPages.value)
  fetchOrders(page)
}

async function fetchCombos() {
  if (!props.inventoryId) return
  try {
    const res = await loadCombos(props.inventoryId)
    combos.value = res.data?.items || []
  } catch {
    combos.value = []
  }
}

async function fetchBundles() {
  if (!props.inventoryId) return
  try {
    const res = await loadBundles(props.inventoryId)
    bundles.value = res.data?.items || []
  } catch {
    bundles.value = []
  }
}

function nextOrderNo(type: 'outbound' | 'reserve') {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `${type === 'reserve' ? 'RSV' : 'OUT'}-${stamp}`
}

function openCreateOrder(type: 'outbound' | 'reserve', bundleId?: string) {
  orderFormType.value = type
  orderForm.value = {
    order_no: nextOrderNo(type),
    order_info: '',
    remark: '',
    combo_id: '',
    combo_quantity: 1,
  }
  orderFormItems.value = []
  orderProductQuery.value = ''
  orderSearchResults.value = []
  bundleOrder.value = { bundle_id: '', main_product_id: '', main_quantity: 1, quantity: 1, sub_quantities: {} }
  bundlePreview.value = null
  bundlePreviewError.value = ''
  comboBundleSelections.value = {}
  if (!combos.value.length) fetchCombos()
  if (!bundles.value.length) fetchBundles()
  showOrderForm.value = true
  if (bundleId) {
    bundleOrder.value.bundle_id = bundleId
    onBundleOrderChange()
  }
}

async function searchOrderProducts() {
  if (!props.inventoryId || !orderProductQuery.value.trim()) return
  try {
    const res = await queryProducts({
      inventory_id: props.inventoryId,
      keyword: orderProductQuery.value.trim(),
      page_size: 10,
    })
    orderSearchResults.value = res.data?.items || []
  } catch {
    orderSearchResults.value = []
  }
}

function addOrderItem(product: Product) {
  const existing = orderFormItems.value.find((i) => i.product_id === product._id)
  if (existing) {
    existing.quantity++
  } else {
    orderFormItems.value.push({
      product_id: product._id,
      product_name: product.name,
      product_code: product.code,
      quantity: 1,
    })
  }
  orderProductQuery.value = ''
  orderSearchResults.value = []
}

async function handleCreateOrder() {
  if (!props.inventoryId || !orderForm.value.order_no.trim()) return
  if (!orderFormItems.value.length && !orderForm.value.combo_id && !bundleOrder.value.bundle_id) return
  if (comboGuardMessage.value) {
    NKMessage.warning(comboGuardMessage.value)
    return
  }
  if (bundleOrder.value.bundle_id && !bundlePreview.value) return
  const comboBundles = orderForm.value.combo_id ? comboBundleSelectionsPayload() : []
  if (comboBundleComponents.value.length) {
    for (const selection of comboBundles) {
      if (!selection.main_product_id || !selection.sub_items.length) {
        NKMessage.warning('请为组合包中的每个捆选择主商品和捆物')
        return
      }
    }
  }
  saving.value = true
  try {
    const items = orderFormItems.value.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      product_code: i.product_code,
      quantity: Number(i.quantity) || 1,
    }))
    const bundleSelection = bundleOrder.value.bundle_id
      ? {
          bundle_id: bundleOrder.value.bundle_id,
          main_product_id: bundleOrder.value.main_product_id,
          main_quantity: Number(bundleOrder.value.main_quantity) || 1,
          quantity: Number(bundleOrder.value.quantity) || 1,
          sub_items: Object.entries(bundleOrder.value.sub_quantities)
            .map(([product_id, quantity]) => ({ product_id, quantity: Number(quantity) || 0 }))
            .filter((item) => item.quantity > 0),
        }
      : null
    await createOutbound({
      inventory_id: props.inventoryId,
      order_no: orderForm.value.order_no.trim(),
      type: orderFormType.value,
      order_info: orderForm.value.order_info || undefined,
      remark: orderForm.value.remark || undefined,
      items: bundleSelection ? [] : items,
      combo_id: orderForm.value.combo_id || null,
      combo_quantity: orderForm.value.combo_id ? Number(orderForm.value.combo_quantity) || 1 : null,
      combo_bundles: comboBundles.length ? comboBundles : null,
      bundle: bundleSelection,
    })
    NKMessage.success('创建成功')
    showOrderForm.value = false
    await fetchOrders(1)
    emit('changed')
  } catch (err: any) {
    NKMessage.error(err.message || '创建失败')
  } finally {
    saving.value = false
  }
}

function openOrderDetail(order: OutboundOrder) {
  detailOrder.value = order
  orderReturns.value = []
  showOrderDetail.value = true
  if (order.type === 'outbound') loadOrderReturns(order)
}

async function openOrderById(outboundOrderId: string) {
  let order = orders.value.find((item) => item._id === outboundOrderId)
  if (!order && props.inventoryId) {
    // 关联单可能不在当前页，逐页按 100 条回查。
    let page = 1
    while (page <= 50) {
      const res = await loadOutboundOrders({
        inventory_id: props.inventoryId,
        page,
        page_size: 100,
      })
      const items = res.data?.items || []
      order = items.find((item) => item._id === outboundOrderId)
      if (order) break
      if (!res.data?.has_more) break
      page++
    }
  }
  if (order) {
    openOrderDetail(order)
  } else {
    NKMessage.warning('未找到关联出库单，请刷新后重试')
  }
}

async function handleConfirmOrder(order: OutboundOrder) {
  saving.value = true
  try {
    await confirmOutbound({ id: order._id })
    NKMessage.success('确认成功')
    await fetchOrders()
    emit('changed')
  } catch (err: any) {
    NKMessage.error(err.message || '确认失败')
  } finally {
    saving.value = false
  }
}

async function handleCancelOrder(order: OutboundOrder) {
  saving.value = true
  try {
    await cancelOutbound({ id: order._id })
    NKMessage.success('已取消')
    await fetchOrders()
    emit('changed')
  } catch (err: any) {
    NKMessage.error(err.message || '取消失败')
  } finally {
    saving.value = false
  }
}

async function handleCancelReserve(order: OutboundOrder) {
  saving.value = true
  try {
    await cancelReserve({ id: order._id })
    NKMessage.success('已取消预留')
    await fetchOrders()
    emit('changed')
  } catch (err: any) {
    NKMessage.error(err.message || '取消失败')
  } finally {
    saving.value = false
  }
}

function openConvertReserve(order: OutboundOrder) {
  convertingOrder.value = order
  convertOrderNo.value = ''
  showConvertDialog.value = true
}

async function handleConvertReserve() {
  if (!convertingOrder.value || !convertOrderNo.value.trim()) return
  saving.value = true
  try {
    await reserveToOutbound({
      id: convertingOrder.value._id,
      inventory_id: convertingOrder.value.inventory_id,
      order_no: convertOrderNo.value.trim(),
    })
    NKMessage.success('转换成功')
    showConvertDialog.value = false
    await fetchOrders()
    emit('changed')
  } catch (err: any) {
    NKMessage.error(err.message || '转换失败')
  } finally {
    saving.value = false
  }
}

function canReturn(order: OutboundOrder | null) {
  if (!order || order.type !== 'outbound') return false
  return order.status === 'confirmed' || order.status === 'partially_returned'
}

async function loadOrderReturns(order: OutboundOrder) {
  loadingReturns.value = true
  try {
    const res = await loadReturns(order.inventory_id, order._id)
    orderReturns.value = res.data || []
  } catch (err: any) {
    orderReturns.value = []
    NKMessage.error(err.message || '加载退货记录失败')
  } finally {
    loadingReturns.value = false
  }
}

async function openReturnDialog(order: OutboundOrder) {
  returnOrder.value = order
  returnReason.value = 'return_refund'
  returnRemark.value = ''
  showOrderDetail.value = false
  showReturnDialog.value = true

  let existing = orderReturns.value
  if (detailOrder.value?._id !== order._id || !existing.length) {
    try {
      const res = await loadReturns(order.inventory_id, order._id)
      existing = res.data || []
    } catch (err: any) {
      NKMessage.error(err.message || '加载退货记录失败')
      showReturnDialog.value = false
      return
    }
  }

  const returned: Record<string, number> = {}
  for (const ret of existing) {
    if (ret.status === 'cancelled') continue
    for (const item of ret.items || []) {
      returned[item.product_id] = (returned[item.product_id] || 0) + item.quantity
    }
  }

  returnFormItems.value = (order.items || []).map((item) => {
    const maxQuantity = Math.max(0, item.quantity - (returned[item.product_id] || 0))
    return {
      product_id: item.product_id,
      product_name: item.product_name,
      product_code: item.product_code,
      quantity: maxQuantity,
      restock: true,
      image_url: item.image_url,
      selected: maxQuantity > 0,
      maxQuantity,
    }
  })
}

function onReturnReasonChange() {
  const restock = returnReason.value === 'return_refund'
  for (const item of returnFormItems.value) {
    item.restock = restock
  }
}

async function handleCreateReturn() {
  if (!returnOrder.value) return
  const items = returnFormItems.value
    .filter((i) => i.selected && Number(i.quantity) > 0)
    .map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      product_code: i.product_code,
      quantity: Math.min(Number(i.quantity) || 0, i.maxQuantity),
      restock: returnReason.value === 'refund_only' ? false : !!i.restock,
      image_url: i.image_url,
    }))
  if (!items.length) {
    NKMessage.warning('请选择退货商品和数量')
    return
  }

  saving.value = true
  try {
    const order = returnOrder.value
    await createReturn(order.inventory_id, order._id, {
      outbound_order_id: order._id,
      reason: returnReason.value,
      remark: returnRemark.value || undefined,
      items,
    })
    NKMessage.success('退货单已创建，请在订单详情中确认')
    showReturnDialog.value = false
    await fetchOrders()
    detailOrder.value = orders.value.find((o) => o._id === order._id) || order
    showOrderDetail.value = true
    await loadOrderReturns(detailOrder.value)
    emit('changed')
  } catch (err: any) {
    NKMessage.error(err.message || '创建退货单失败')
  } finally {
    saving.value = false
  }
}

async function handleConfirmReturn(ret: ReturnOrder) {
  saving.value = true
  try {
    await confirmReturn(ret.inventory_id, ret._id)
    NKMessage.success('退货已确认')
    await fetchOrders()
    if (detailOrder.value) {
      detailOrder.value = orders.value.find((o) => o._id === detailOrder.value!._id) || detailOrder.value
      await loadOrderReturns(detailOrder.value)
    }
    emit('changed')
  } catch (err: any) {
    NKMessage.error(err.message || '确认退货失败')
  } finally {
    saving.value = false
  }
}

async function handleCancelReturn(ret: ReturnOrder) {
  saving.value = true
  try {
    await cancelReturn(ret.inventory_id, ret._id)
    NKMessage.success('退货单已取消')
    if (detailOrder.value) {
      await loadOrderReturns(detailOrder.value)
    }
  } catch (err: any) {
    NKMessage.error(err.message || '取消退货失败')
  } finally {
    saving.value = false
  }
}

async function onComboChange() {
  if (!orderForm.value.combo_id) {
    comboBundleSelections.value = {}
    return
  }
  bundleOrder.value = { bundle_id: '', main_product_id: '', main_quantity: 1, quantity: 1, sub_quantities: {} }
  bundlePreview.value = null
  bundlePreviewError.value = ''
  if (!bundles.value.length) {
    await fetchBundles()
  }
  ensureComboBundleSelections()
}

function onBundleOrderChange() {
  bundlePreview.value = null
  bundlePreviewError.value = ''
  const selected = selectedBundle.value
  if (!selected) return
  orderForm.value.combo_id = ''
  orderFormItems.value = []
  const main = (selected.main_products || []).find((p) => p.available > 0) || selected.main_products?.[0]
  bundleOrder.value.main_product_id = main?.product_id || ''
  bundleOrder.value.main_quantity = selected.min_main_quantity || 1
  bundleOrder.value.quantity = 1
  const subQuantities: Record<string, number> = {}
  for (const item of selected.sub_products || []) {
    subQuantities[item.product_id] = item.default_quantity || 1
  }
  bundleOrder.value.sub_quantities = subQuantities
  refreshBundleOrderPreview()
}

async function refreshBundleOrderPreview() {
  bundlePreview.value = null
  bundlePreviewError.value = ''
  const selected = selectedBundle.value
  if (!selected || !bundleOrder.value.main_product_id) return
  const subItems = Object.entries(bundleOrder.value.sub_quantities)
    .map(([product_id, quantity]) => ({ product_id, quantity: Number(quantity) || 0 }))
    .filter((item) => item.quantity > 0)
  bundlePreviewLoading.value = true
  try {
    const res = await previewBundle(selected._id, {
      main_product_id: bundleOrder.value.main_product_id,
      main_quantity: Number(bundleOrder.value.main_quantity) || 1,
      quantity: Number(bundleOrder.value.quantity) || 1,
      sub_items: subItems,
    })
    bundlePreview.value = res.data || null
  } catch (err: any) {
    bundlePreviewError.value = err.message || '捆校验失败'
  } finally {
    bundlePreviewLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchOrders(), fetchCombos(), fetchBundles()])
  if (props.initialBundleId) {
    openCreateOrder('outbound', props.initialBundleId)
    emit('bundle-consumed')
  } else if (props.initialOrderId) {
    await openOrderById(props.initialOrderId)
    emit('order-consumed')
  }
})

watch(
  () => props.inventoryId,
  () => {
    orderKeyword.value = ''
    fetchOrders(1)
  },
)
</script>

<style lang="scss" scoped>
@use '../styles/shared';

.goodser {
  &__order-toolbar {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    margin-bottom: $nk-spacing-md;

    .nk-input {
      width: 280px;
    }

    @media (max-width: 640px) {
      .nk-input {
        flex: 1;
        width: auto;
      }
    }
  }

  &__combo-bundle-configs {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-sm;
    margin-top: $nk-spacing-sm;
  }

  &__combo-bundle-config {
    padding: $nk-spacing-sm;
    border: 1px dashed $nk-color-neutral-200;
    border-radius: $nk-radius-md;
  }
}
</style>
