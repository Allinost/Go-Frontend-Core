<template>
  <div class="ia-alloc">
    <div class="ia-alloc__header">
      <h2 class="ia-alloc__title">资产配置</h2>
      <div class="ia-alloc__actions">
        <NkButton @click="loadReview">查看配比偏差</NkButton>
        <NkButton type="primary" @click="openCreate">新建目标</NkButton>
      </div>
    </div>
    <div class="ia-alloc__filters">
      <AccountSelector v-model="accountId" @change="load" />
    </div>
    <NkLoading v-if="loading" />
    <table v-else class="ia-alloc__table">
      <thead>
        <tr>
          <th>账户</th>
          <th>类别</th>
          <th class="text-right">目标比例</th>
          <th class="text-right">容差</th>
          <th>状态</th>
          <th>备注</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in items" :key="a.id">
          <td>{{ a.account_id || '全局' }}</td>
          <td><NkTag>{{ categoryLabel(a.category) }}</NkTag></td>
          <td class="text-right">{{ (a.target_ratio * 100).toFixed(2) }}%</td>
          <td class="text-right">{{ (a.tolerance * 100).toFixed(2) }}%</td>
          <td><NkTag :type="a.status === 'active' ? 'success' : 'info'">{{ a.status }}</NkTag></td>
          <td>{{ a.remark || '-' }}</td>
          <td>
            <div class="ia-alloc__btns">
              <NkButton size="xs" @click="openEdit(a)">编辑</NkButton>
              <NkButton size="xs" type="danger" @click="handleDelete(a)">删除</NkButton>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <NkEmpty v-if="!loading && items.length === 0" description="暂无配置目标" />

    <NkDialog v-model:visible="dialogVisible" :title="editingId ? '编辑配置' : '新建配置'" width="420px">
      <div class="ia-alloc__form">
        <div class="ia-alloc__field">
          <label class="ia-alloc__label">账户（空=全局）</label>
          <AccountSelector v-model="form.account_id" />
        </div>
        <div class="ia-alloc__field">
          <label class="ia-alloc__label">类别 *</label>
          <NkSelect v-model="form.category" :options="categoryOptions" />
        </div>
        <div class="ia-alloc__row">
          <div class="ia-alloc__field">
            <label class="ia-alloc__label">目标比例 *</label>
            <NkInput v-model.number="form.target_ratio" type="number" placeholder="0.4" />
          </div>
          <div class="ia-alloc__field">
            <label class="ia-alloc__label">容差</label>
            <NkInput v-model.number="form.tolerance" type="number" placeholder="0.05" />
          </div>
        </div>
        <div v-if="editingId" class="ia-alloc__field">
          <label class="ia-alloc__label">状态</label>
          <NkSelect v-model="form.status" :options="statusOptions" />
        </div>
        <div class="ia-alloc__field">
          <label class="ia-alloc__label">备注</label>
          <NkTextarea v-model="form.remark" />
        </div>
      </div>
      <template #footer>
        <NkButton @click="dialogVisible = false">取消</NkButton>
        <NkButton type="primary" :loading="saving" @click="handleSave">保存</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="reviewVisible" title="配比偏差" width="640px">
      <NkLoading v-if="reviewLoading" />
      <div v-else-if="review" class="ia-alloc__review">
        <p v-if="!review.account_id">范围: 全局</p>
        <p v-else>范围: 账户 {{ review.account_id }}</p>
        <table class="ia-alloc__table">
          <thead>
            <tr>
              <th>类别</th>
              <th class="text-right">目标</th>
              <th class="text-right">实际</th>
              <th class="text-right">偏差</th>
              <th>容差</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in review.items" :key="i">
              <td>{{ categoryLabel(item.category) }}</td>
              <td class="text-right">{{ (item.target_ratio * 100).toFixed(2) }}%</td>
              <td class="text-right">{{ (item.actual_ratio * 100).toFixed(2) }}%</td>
              <td class="text-right"><PnLBadge :value="item.deviation" /></td>
              <td>{{ (item.tolerance * 100).toFixed(2) }}%</td>
              <td><NkTag :type="item.breach ? 'danger' : 'success'">{{ item.breach ? '超限' : '正常' }}</NkTag></td>
            </tr>
          </tbody>
        </table>
        <p v-if="review.uncovered?.length" class="ia-alloc__uncovered">
          未配置目标: {{ review.uncovered.map(categoryLabel).join('、') }}
        </p>
      </div>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { listAllocations, createAllocation, updateAllocation, deleteAllocation, getAllocationReview } from '@/api/ia'
import type { AllocationItem, CreateAllocationReq, UpdateAllocationReq, AllocationReviewResp } from '@/types/ia'
import { NKMessage } from '@nkui/vue/src/utils/message'
import AccountSelector from '../common/AccountSelector.vue'
import PnLBadge from '../common/PnLBadge.vue'

const loading = ref(false)
const saving = ref(false)
const items = ref<AllocationItem[]>([])
const accountId = ref('')

const categoryOptions = [
  { label: '股票', value: 'stock' },
  { label: 'ETF', value: 'etf' },
  { label: '基金', value: 'fund' },
  { label: '存款', value: 'deposit' },
  { label: '理财', value: 'wealth' },
  { label: '现金', value: 'cash' },
]
const categoryMap: Record<string, string> = { stock: '股票', etf: 'ETF', fund: '基金', deposit: '存款', wealth: '理财', cash: '现金' }
function categoryLabel(c: string) { return categoryMap[c] || c }

const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
]

const dialogVisible = ref(false)
const editingId = ref('')
const form = reactive<CreateAllocationReq & UpdateAllocationReq & { status: string }>({
  account_id: '',
  category: 'stock',
  target_ratio: 0.4,
  tolerance: 0.05,
  remark: '',
  status: 'active',
})

const reviewVisible = ref(false)
const reviewLoading = ref(false)
const review = ref<AllocationReviewResp | null>(null)

async function load() {
  loading.value = true
  try {
    const res = await listAllocations({ account_id: accountId.value || undefined })
    items.value = res.data || []
  } catch (e) {
    items.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, {
    account_id: accountId.value, category: 'stock',
    target_ratio: 0.4, tolerance: 0.05, remark: '', status: 'active',
  })
  dialogVisible.value = true
}

function openEdit(a: AllocationItem) {
  editingId.value = a.id
  Object.assign(form, {
    account_id: a.account_id, category: a.category,
    target_ratio: a.target_ratio, tolerance: a.tolerance,
    remark: a.remark, status: a.status,
  })
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.category || form.target_ratio == null) {
    NKMessage.error('请填写必填项')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await updateAllocation(editingId.value, {
        target_ratio: form.target_ratio, tolerance: form.tolerance,
        status: form.status, remark: form.remark,
      })
      NKMessage.success('已更新')
    } else {
      await createAllocation({
        account_id: form.account_id || undefined,
        category: form.category,
        target_ratio: form.target_ratio,
        tolerance: form.tolerance,
        remark: form.remark,
      })
      NKMessage.success('已创建')
    }
    dialogVisible.value = false
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '操作失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(a: AllocationItem) {
  if (!confirm('确定删除？')) return
  try {
    await deleteAllocation(a.id)
    NKMessage.success('已删除')
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '删除失败')
  }
}

async function loadReview() {
  reviewVisible.value = true
  reviewLoading.value = true
  try {
    const res = await getAllocationReview({ account_id: accountId.value || undefined })
    review.value = res.data
  } catch (e) {
    review.value = null
  } finally {
    reviewLoading.value = false
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.ia-alloc {
  &__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: $nk-spacing-lg; }
  &__title { font-size: $nk-font-size-xl; font-weight: $nk-font-weight-semibold; color: $nk-color-neutral-900; }
  &__actions { display: flex; gap: $nk-spacing-sm; }
  &__filters { display: flex; gap: $nk-spacing-sm; margin-bottom: $nk-spacing-lg; }
  &__table {
    width: 100%;
    border-collapse: collapse;
    th, td { padding: $nk-spacing-sm $nk-spacing-md; border-bottom: 1px solid $nk-color-neutral-200; text-align: left; white-space: nowrap; }
    th { background: $nk-color-neutral-50; font-weight: $nk-font-weight-medium; color: $nk-color-neutral-600; font-size: $nk-font-size-sm; }
    td { color: $nk-color-neutral-800; }
    .text-right { text-align: right; }
  }
  &__btns { display: flex; gap: $nk-spacing-xs; }
  &__form { display: flex; flex-direction: column; gap: $nk-spacing-md; }
  &__row { display: flex; gap: $nk-spacing-md; & > * { flex: 1; } }
  &__field { display: flex; flex-direction: column; gap: $nk-spacing-xs; }
  &__label { font-size: $nk-font-size-sm; color: $nk-color-neutral-600; font-weight: $nk-font-weight-medium; }
  &__review p { font-size: $nk-font-size-sm; color: $nk-color-neutral-500; margin-bottom: $nk-spacing-sm; }
  &__uncovered { margin-top: $nk-spacing-sm; color: $nk-color-warning; }
}
</style>
