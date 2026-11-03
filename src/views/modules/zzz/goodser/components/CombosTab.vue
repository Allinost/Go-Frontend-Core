<template>
  <div class="goodser__tab">
    <div class="goodser__product-toolbar">
      <NkSelect
        v-if="inventories.length"
        :model-value="inventoryId"
        :options="inventoryOptions"
        style="width: 200px"
        size="sm"
        @update:model-value="emit('update:inventoryId', $event)"
      />
      <span class="goodser__count">共 {{ combos.length }} 个组合包</span>
      <div class="goodser__product-toolbar-right">
        <NkButton size="sm" @click="openCreateCombo">新建组合包</NkButton>
      </div>
    </div>
    <NkLoading v-if="loading" />
    <div v-else-if="!combos.length" class="goodser__empty">
      <NkEmpty description="暂无组合包，点击上方按钮创建" />
    </div>
    <div v-else class="goodser__combo-list">
      <NkCard v-for="c in combos" :key="c._id" class="goodser__combo-card">
        <div class="goodser__order-card-header">
          <div>
            <span class="goodser__order-no">{{ c.name }}</span>
            <NkTag :type="c.status === 'active' ? 'success' : 'info'" size="sm" style="margin-left: 8px">
              {{ c.status === 'active' ? '启用' : '停用' }}
            </NkTag>
          </div>
          <span class="goodser__order-date">{{ c.code }}</span>
        </div>
        <div class="goodser__order-meta">
          <span>可售 {{ c.availability }}</span>
          <span v-if="c.price != null">¥{{ c.price }}</span>
          <span>{{ c.items?.length || 0 }} 个组件</span>
        </div>
        <div class="goodser__combo-components">
          <span v-for="item in c.items" :key="item.product_id" class="goodser__combo-component">
            {{ item.product_name }} × {{ item.quantity }}（可用 {{ item.available }}）
          </span>
        </div>
        <div class="goodser__order-actions">
          <NkButton size="xs" variant="ghost" @click="openEditCombo(c)">编辑</NkButton>
          <NkButton size="xs" variant="ghost" type="danger" @click="askDeleteCombo(c)">删除</NkButton>
        </div>
      </NkCard>
    </div>

    <NkDialog
      v-model:visible="showComboForm"
      :title="editingCombo ? '编辑组合包' : '新建组合包'"
      :width="620"
    >
      <div class="goodser__order-form">
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">名称 *</label>
            <NkInput v-model="comboForm.name" placeholder="组合包名称" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">编码</label>
            <NkInput v-model="comboForm.code" placeholder="留空自动生成" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">价格</label>
            <NkInput v-model="comboForm.price" type="number" placeholder="0" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">状态</label>
            <NkSelect v-model="comboForm.status" :options="comboStatusOptions" />
          </div>
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">描述</label>
          <NkTextarea v-model="comboForm.description" placeholder="组合包描述" />
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">组件商品（搜索添加）</label>
          <NkInput v-model="comboProductQuery" size="sm" placeholder="搜索商品..." @keyup.enter="searchComboProducts" />
          <div v-if="comboSearchResults.length" class="goodser__order-search-results">
            <div v-for="r in comboSearchResults" :key="r._id" class="goodser__order-search-item" @click="addComboItem(r)">
              <span>{{ r.code }} - {{ r.name }}</span>
              <NkButton size="xs" variant="ghost">添加</NkButton>
            </div>
          </div>
          <div v-if="comboFormItems.length" class="goodser__order-items">
            <div v-for="(item, idx) in comboFormItems" :key="item.product_id" class="goodser__order-item">
              <span class="goodser__order-item-name">{{ item.product_name }} ({{ item.product_code }})</span>
              <NkInput v-model="item.quantity" type="number" size="xs" style="width: 80px" placeholder="数量" />
              <NkButton size="xs" variant="ghost" type="danger" @click="comboFormItems.splice(idx, 1)">×</NkButton>
            </div>
          </div>
          <p class="goodser__return-tip">组合包不持有独立库存，可售量按组件可用量推导。</p>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showComboForm = false">取消</NkButton>
        <NkButton
          :loading="saving"
          :disabled="!comboForm.name.trim() || !comboFormItems.length"
          @click="handleSaveCombo"
        >保存</NkButton>
      </template>
    </NkDialog>

    <ConfirmDialog
      v-model:visible="showDeleteDialog"
      title="删除组合包"
      :message="`确定删除「${deletingCombo?.name || ''}」吗？删除后不可恢复。`"
      confirm-text="删除"
      danger
      :loading="saving"
      @confirm="handleDeleteCombo"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  createCombo,
  deleteCombo,
  loadCombos,
  queryProducts,
  updateCombo,
} from '@/api/goodser'
import type { Combo, Inventory, Product } from '@/types/goodser'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps<{
  inventoryId: string
  inventories: Inventory[]
}>()

const emit = defineEmits<{
  (e: 'update:inventoryId', value: string): void
  (e: 'changed'): void
}>()

const combos = ref<Combo[]>([])
const loading = ref(false)
const saving = ref(false)
const showComboForm = ref(false)
const showDeleteDialog = ref(false)
const deletingCombo = ref<Combo | null>(null)
const editingCombo = ref<Combo | null>(null)
const comboForm = ref({
  name: '',
  code: '',
  description: '',
  price: 0,
  status: 'active' as 'active' | 'inactive',
})
const comboFormItems = ref<Array<{
  product_id: string
  product_name: string
  product_code: string
  quantity: number
}>>([])
const comboProductQuery = ref('')
const comboSearchResults = ref<Product[]>([])
const comboStatusOptions = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
]
let requestSeq = 0

const inventoryOptions = computed(() =>
  props.inventories.map((inv) => ({ label: inv.name, value: inv._id })),
)

async function fetchCombos() {
  if (!props.inventoryId) return
  const seq = ++requestSeq
  loading.value = true
  try {
    const res = await loadCombos(props.inventoryId)
    if (seq !== requestSeq) return
    combos.value = res.data?.items || []
  } catch (err: any) {
    if (seq !== requestSeq) return
    combos.value = []
    NKMessage.error(err.message || '加载组合包失败')
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

function openCreateCombo() {
  if (!props.inventoryId) {
    NKMessage.error('请先选择库存目录')
    return
  }
  editingCombo.value = null
  comboForm.value = { name: '', code: '', description: '', price: 0, status: 'active' }
  comboFormItems.value = []
  comboProductQuery.value = ''
  comboSearchResults.value = []
  showComboForm.value = true
}

function openEditCombo(combo: Combo) {
  editingCombo.value = combo
  comboForm.value = {
    name: combo.name,
    code: combo.code,
    description: combo.description || '',
    price: combo.price || 0,
    status: combo.status,
  }
  comboFormItems.value = (combo.items || []).map((item) => ({
    product_id: item.product_id,
    product_name: item.product_name,
    product_code: item.product_code,
    quantity: item.quantity,
  }))
  comboProductQuery.value = ''
  comboSearchResults.value = []
  showComboForm.value = true
}

async function searchComboProducts() {
  if (!props.inventoryId || !comboProductQuery.value.trim()) return
  try {
    const res = await queryProducts({
      inventory_id: props.inventoryId,
      keyword: comboProductQuery.value.trim(),
      page_size: 10,
    })
    comboSearchResults.value = res.data?.items || []
  } catch {
    comboSearchResults.value = []
  }
}

function addComboItem(product: Product) {
  const existing = comboFormItems.value.find((item) => item.product_id === product._id)
  if (existing) {
    existing.quantity++
  } else {
    comboFormItems.value.push({
      product_id: product._id,
      product_name: product.name,
      product_code: product.code,
      quantity: 1,
    })
  }
  comboProductQuery.value = ''
  comboSearchResults.value = []
}

async function handleSaveCombo() {
  if (!props.inventoryId || !comboForm.value.name.trim() || !comboFormItems.value.length) return
  saving.value = true
  try {
    const items = comboFormItems.value.map((item) => ({
      product_id: item.product_id,
      quantity: Number(item.quantity) || 1,
    }))
    if (editingCombo.value) {
      await updateCombo({
        id: editingCombo.value._id,
        name: comboForm.value.name.trim(),
        code: comboForm.value.code || null,
        description: comboForm.value.description || null,
        price: Number(comboForm.value.price) || 0,
        status: comboForm.value.status,
        items,
      })
      NKMessage.success('更新成功')
    } else {
      await createCombo({
        inventory_id: props.inventoryId,
        name: comboForm.value.name.trim(),
        code: comboForm.value.code || null,
        description: comboForm.value.description || null,
        price: Number(comboForm.value.price) || 0,
        status: comboForm.value.status,
        items,
      })
      NKMessage.success('创建成功')
    }
    showComboForm.value = false
    await fetchCombos()
    emit('changed')
  } catch (err: any) {
    NKMessage.error(err.message || '保存组合包失败')
  } finally {
    saving.value = false
  }
}

function askDeleteCombo(combo: Combo) {
  deletingCombo.value = combo
  showDeleteDialog.value = true
}

async function handleDeleteCombo() {
  if (!deletingCombo.value) return
  saving.value = true
  try {
    await deleteCombo(deletingCombo.value._id)
    NKMessage.success('已删除')
    showDeleteDialog.value = false
    deletingCombo.value = null
    await fetchCombos()
    emit('changed')
  } catch (err: any) {
    NKMessage.error(err.message || '删除组合包失败')
  } finally {
    saving.value = false
  }
}

watch(() => props.inventoryId, fetchCombos, { immediate: true })
</script>

<style lang="scss" scoped>
@use '../styles/shared';
</style>
