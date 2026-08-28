<template>
  <div class="sc-products">
    <div class="sc-products__header">
      <h3 class="sc-products__title">商品管理</h3>
      <div class="sc-products__actions">
        <NkButton size="sm" @click="$router.push('/modules/zzz/shopchecker/products/create')">创建商品</NkButton>
      </div>
    </div>

    <div class="sc-products__filters">
      <NkSelect v-model="filters.platform" placeholder="平台" :options="platformOptions" clearable size="sm" style="width: 120px" />
      <NkSelect v-model="filters.enabled" placeholder="状态" :options="enabledOptions" clearable size="sm" style="width: 120px" />
      <NkInput v-model="filters.keyword" placeholder="名称/URL" size="sm" style="width: 200px" @keyup.enter="loadProducts" />
      <NkButton size="sm" @click="loadProducts">搜索</NkButton>
      <NkButton size="sm" variant="ghost" @click="resetFilters">重置</NkButton>
    </div>

    <div class="sc-products__table-card">
      <NkLoading v-if="loading" />
      <table v-else class="sc-table">
        <thead>
          <tr>
            <th>商品名</th>
            <th>平台</th>
            <th>最新价格</th>
            <th>库存</th>
            <th>目标价</th>
            <th>降价比例</th>
            <th>检查周期</th>
            <th>状态</th>
            <th>最后检查</th>
            <th>下次检查</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item._id">
            <td>
              <router-link :to="`/modules/zzz/shopchecker/products/${item._id}`" class="sc-table__link">{{ item.name }}</router-link>
            </td>
            <td><NkTag size="sm">{{ platformLabel(item.platform) }}</NkTag></td>
            <td>{{ item.last_price ? `¥${item.last_price.toFixed(2)}` : '-' }}</td>
            <td><NkTag size="sm" :type="stockStatusType(item.last_stock_status)">{{ stockStatusLabel(item.last_stock_status) }}</NkTag></td>
            <td>{{ item.target_price ? `¥${item.target_price}` : '-' }}</td>
            <td>{{ item.price_drop_ratio ? `${item.price_drop_ratio}%` : '-' }}</td>
            <td>{{ item.cron_expr || item.check_interval }}</td>
            <td>
              <NkTag size="sm" :type="item.enabled ? 'success' : 'danger'">{{ item.enabled ? '启用' : '停用' }}</NkTag>
            </td>
            <td>{{ formatTime(item.last_checked_at) }}</td>
            <td>{{ formatTime(item.next_check_at) }}</td>
            <td>
              <NkButton size="sm" variant="ghost" @click="$router.push(`/modules/zzz/shopchecker/products/${item._id}`)">详情</NkButton>
              <NkButton size="sm" variant="ghost" @click="$router.push(`/modules/zzz/shopchecker/products/${item._id}/edit`)">编辑</NkButton>
              <NkButton size="sm" variant="ghost" type="danger" @click="confirmDelete(item)">删除</NkButton>
            </td>
          </tr>
          <tr v-if="!items.length && !loading">
            <td colspan="10" class="sc-table__empty"><NkEmpty description="暂无商品" /></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="sc-products__pagination">
      <NkPagination v-model="page" :total="total" :page-size="pageSize" @change="loadProducts" />
    </div>

    <NkDialog v-model:visible="showDeleteDialog" title="确认删除" :width="400">
      <p>确定要删除商品 <strong>{{ deletingItem?.name }}</strong> 吗？</p>
      <template #footer>
        <NkButton variant="ghost" @click="showDeleteDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="deleting" @click="handleDelete">确认删除</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { listProducts, deleteProduct } from '@/api/shopchecker'
import type { Product } from '@/types/shopchecker'
import { NKMessage } from '@nkui/vue/src/utils/message'

const loading = ref(false)
const items = ref<Product[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const filters = reactive({
  platform: '',
  enabled: '',
  keyword: '',
})

const platformOptions = [
  { label: '京东', value: 'jd' },
  { label: '京东移动版', value: 'jdm' },
  { label: '七鲜', value: 'qixian' },
  { label: '淘宝', value: 'taobao' },
  { label: '拼多多', value: 'pdd' },
]

const enabledOptions = [
  { label: '启用', value: 'true' },
  { label: '停用', value: 'false' },
]

async function loadProducts() {
  loading.value = true
  try {
    const params: any = { page: page.value, page_size: pageSize.value }
    if (filters.platform) params.platform = filters.platform
    if (filters.enabled) params.enabled = filters.enabled === 'true'
    if (filters.keyword) params.keyword = filters.keyword
    const res = await listProducts(params)
    items.value = res.data.items
    total.value = res.data.total
  } catch (err: any) {
    NKMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.platform = ''
  filters.enabled = ''
  filters.keyword = ''
  page.value = 1
  loadProducts()
}

function platformLabel(platform: string): string {
  const map: Record<string, string> = { jd: '京东', jdm: '京东移动版', qixian: '七鲜', taobao: '淘宝', pdd: '拼多多' }
  return map[platform] || platform
}

function stockStatusLabel(status: string): string {
  const map: Record<string, string> = { in_stock: '有货', out_of_stock: '无货', unknown: '未知' }
  return map[status] || '未知'
}

function stockStatusType(status: string): string {
  const map: Record<string, string> = { in_stock: 'success', out_of_stock: 'danger', unknown: 'info' }
  return map[status] || 'info'
}

function formatTime(t?: string): string {
  if (!t) return '-'
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const showDeleteDialog = ref(false)
const deleting = ref(false)
const deletingItem = ref<Product | null>(null)

function confirmDelete(item: Product) {
  deletingItem.value = item
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingItem.value) return
  deleting.value = true
  try {
    await deleteProduct(deletingItem.value._id)
    NKMessage.success('已删除')
    showDeleteDialog.value = false
    loadProducts()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

onMounted(loadProducts)
</script>

<style lang="scss" scoped>
.sc-products {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-lg;
  }
  &__title {
    font-size: $nk-font-size-lg;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }
  &__actions {
    display: flex;
    gap: $nk-spacing-sm;
  }
  &__filters {
    display: flex;
    gap: $nk-spacing-sm;
    align-items: center;
    margin-bottom: $nk-spacing-lg;
    flex-wrap: wrap;
  }
  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: $nk-spacing-lg;
  }
}

.sc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: $nk-font-size-sm;

  th, td {
    text-align: left;
    padding: $nk-spacing-sm $nk-spacing-md;
    border-bottom: 1px solid $nk-color-neutral-200;
  }
  th {
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-500;
    background: $nk-color-neutral-50;
    font-size: $nk-font-size-xs;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  td {
    color: $nk-color-neutral-700;
  }
  tbody tr:hover {
    background: $nk-color-neutral-50;
  }
  &__empty {
    text-align: center;
    padding: $nk-spacing-3xl;
  }
  &__link {
    color: $nk-color-primary-600;
    text-decoration: none;
    font-weight: $nk-font-weight-medium;
    &:hover {
      text-decoration: underline;
    }
  }
}
</style>