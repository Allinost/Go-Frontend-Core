<template>
  <div class="sc-detail">
    <div class="sc-detail__header">
      <h2 class="sc-detail__title">商品详情</h2>
      <div class="sc-detail__actions">
        <NkButton size="sm" variant="ghost" @click="$router.push('/modules/zzz/shopchecker/products')">返回列表</NkButton>
        <NkButton size="sm" variant="ghost" @click="$router.push(`/modules/zzz/shopchecker/products/${productId}/edit`)">编辑</NkButton>
        <NkButton size="sm" :loading="checking" @click="handleCheck">立即检查</NkButton>
      </div>
    </div>

    <NkCard class="sc-detail__info">
      <NkLoading v-if="loading" />
      <div v-else class="sc-detail__info-grid">
        <div class="sc-detail__info-item">
          <span class="sc-detail__info-label">商品名</span>
          <span class="sc-detail__info-value">{{ product?.name }}</span>
        </div>
        <div class="sc-detail__info-item">
          <span class="sc-detail__info-label">平台</span>
          <span class="sc-detail__info-value"><NkTag size="sm">{{ platformLabel(product?.platform) }}</NkTag></span>
        </div>
        <div class="sc-detail__info-item">
          <span class="sc-detail__info-label">URL</span>
          <span class="sc-detail__info-value" style="word-break:break-all">{{ product?.url }}</span>
        </div>
        <div class="sc-detail__info-item">
          <span class="sc-detail__info-label">最新价格</span>
          <span class="sc-detail__info-value">{{ product?.last_price ? `¥${product.last_price}` : '-' }}</span>
        </div>
        <div class="sc-detail__info-item">
          <span class="sc-detail__info-label">目标价</span>
          <span class="sc-detail__info-value">{{ product?.target_price ? `¥${product.target_price}` : '不限制' }}</span>
        </div>
        <div class="sc-detail__info-item">
          <span class="sc-detail__info-label">降价比例</span>
          <span class="sc-detail__info-value">{{ product?.price_drop_ratio ? `${product.price_drop_ratio}%` : '不限制' }}</span>
        </div>
        <div class="sc-detail__info-item">
          <span class="sc-detail__info-label">状态</span>
          <span class="sc-detail__info-value">
            <NkTag size="sm" :type="product?.enabled ? 'success' : 'danger'">{{ product?.enabled ? '启用' : '停用' }}</NkTag>
          </span>
        </div>
        <div class="sc-detail__info-item">
          <span class="sc-detail__info-label">检查周期</span>
          <span class="sc-detail__info-value">{{ product?.cron_expr || product?.check_interval || '-' }}</span>
        </div>
        <div class="sc-detail__info-item">
          <span class="sc-detail__info-label">最后检查</span>
          <span class="sc-detail__info-value">{{ formatTime(product?.last_checked_at) }}</span>
        </div>
        <div class="sc-detail__info-item">
          <span class="sc-detail__info-label">下次检查</span>
          <span class="sc-detail__info-value">{{ formatTime(product?.next_check_at) }}</span>
        </div>
        <div class="sc-detail__info-item">
          <span class="sc-detail__info-label">创建时间</span>
          <span class="sc-detail__info-value">{{ formatTime(product?.created_at) }}</span>
        </div>
        <div class="sc-detail__info-item" v-if="product?.custom_webhook_ids?.length">
          <span class="sc-detail__info-label">专属 Webhook</span>
          <span class="sc-detail__info-value">{{ product?.custom_webhook_ids?.join(', ') }}</span>
        </div>
        <div class="sc-detail__info-item" v-if="product?.remark">
          <span class="sc-detail__info-label">备注</span>
          <span class="sc-detail__info-value">{{ product?.remark }}</span>
        </div>
      </div>
    </NkCard>

    <div class="sc-detail__section">
      <h3 class="sc-detail__section-title">价格记录</h3>
      <NkLoading v-if="priceLoading" />
      <table v-else class="sc-table">
        <thead>
          <tr>
            <th>价格</th>
            <th>原价</th>
            <th>标题</th>
            <th>已通知</th>
            <th>错误信息</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in priceRecords" :key="r.id" :class="{ 'sc-table__row--notified': r.is_notified }">
            <td>{{ r.price ? `¥${r.price}` : '-' }}</td>
            <td>{{ r.original_price ? `¥${r.original_price}` : '-' }}</td>
            <td class="sc-table__ellipsis" :title="r.title">{{ r.title || '-' }}</td>
            <td>
              <NkTag size="sm" :type="r.is_notified ? 'danger' : 'info'">{{ r.is_notified ? '已通知' : '未通知' }}</NkTag>
            </td>
            <td class="sc-table__ellipsis" :title="r.error_msg">{{ r.error_msg || '-' }}</td>
            <td>{{ formatTime(r.created_at) }}</td>
          </tr>
          <tr v-if="!priceRecords.length && !priceLoading">
            <td colspan="6" class="sc-table__empty"><NkEmpty description="暂无价格记录" /></td>
          </tr>
        </tbody>
      </table>
      <div class="sc-detail__pagination">
        <NkPagination v-model="pricePage" :total="priceTotal" :page-size="10" @change="loadPriceRecords" />
      </div>
    </div>

    <div class="sc-detail__section">
      <h3 class="sc-detail__section-title">最近通知</h3>
      <NkLoading v-if="notifLoading" />
      <table v-else class="sc-table">
        <thead>
          <tr>
            <th>旧价格</th>
            <th>新价格</th>
            <th>Webhook</th>
            <th>结果</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="n in notifLogs" :key="n.id">
            <td>{{ n.old_price ? `¥${n.old_price}` : '-' }}</td>
            <td>{{ n.new_price ? `¥${n.new_price}` : '-' }}</td>
            <td class="sc-table__ellipsis" :title="n.webhook_ids?.join(', ')">{{ n.webhook_ids?.join(', ') || '-' }}</td>
            <td>
              <NkTag size="sm" :type="resultType(n.result_summary)">{{ resultLabel(n.result_summary) }}</NkTag>
            </td>
            <td>{{ formatTime(n.created_at) }}</td>
          </tr>
          <tr v-if="!notifLogs.length && !notifLoading">
            <td colspan="5" class="sc-table__empty"><NkEmpty description="暂无通知记录" /></td>
          </tr>
        </tbody>
      </table>
      <div class="sc-detail__pagination">
        <NkPagination v-model="notifPage" :total="notifTotal" :page-size="10" @change="loadNotifLogs" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getProduct, manualCheck, listPriceRecords, listNotificationLogs } from '@/api/shopchecker'
import type { Product, PriceRecord, NotificationLog } from '@/types/shopchecker'
import { NKMessage } from '@nkui/vue/src/utils/message'

const route = useRoute()
const productId = computed(() => route.params.id as string)

const product = ref<Product | null>(null)
const loading = ref(false)
const checking = ref(false)

const priceRecords = ref<PriceRecord[]>([])
const priceLoading = ref(false)
const pricePage = ref(1)
const priceTotal = ref(0)

const notifLogs = ref<NotificationLog[]>([])
const notifLoading = ref(false)
const notifPage = ref(1)
const notifTotal = ref(0)

async function loadProduct() {
  loading.value = true
  try {
    const res = await getProduct(productId.value)
    product.value = res.data
  } catch (err: any) {
    NKMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function handleCheck() {
  checking.value = true
  try {
    await manualCheck(productId.value)
    NKMessage.success('检查完成')
    loadProduct()
    loadPriceRecords()
    loadNotifLogs()
  } catch (err: any) {
    NKMessage.error(err.message || '检查失败')
  } finally {
    checking.value = false
  }
}

async function loadPriceRecords() {
  priceLoading.value = true
  try {
    const res = await listPriceRecords(productId.value, { page: pricePage.value, page_size: 10 })
    priceRecords.value = res.data.items
    priceTotal.value = res.data.total
  } catch (err: any) {
    NKMessage.error(err.message || '加载价格记录失败')
  } finally {
    priceLoading.value = false
  }
}

async function loadNotifLogs() {
  notifLoading.value = true
  try {
    const res = await listNotificationLogs(productId.value, { page: notifPage.value, page_size: 10 })
    notifLogs.value = res.data.items
    notifTotal.value = res.data.total
  } catch (err: any) {
    NKMessage.error(err.message || '加载通知记录失败')
  } finally {
    notifLoading.value = false
  }
}

function platformLabel(platform?: string): string {
  const map: Record<string, string> = { jd: '京东', taobao: '淘宝', pdd: '拼多多' }
  return platform ? map[platform] || platform : '-'
}

function resultType(summary?: string): string {
  const map: Record<string, string> = { all_success: 'success', partial: 'warning', all_failed: 'danger' }
  return summary ? map[summary] || 'info' : 'info'
}

function resultLabel(summary?: string): string {
  const map: Record<string, string> = { all_success: '全部成功', partial: '部分成功', all_failed: '全部失败' }
  return summary ? map[summary] || summary : '-'
}

function formatTime(t?: string): string {
  if (!t) return '-'
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadProduct()
  loadPriceRecords()
  loadNotifLogs()
})
</script>

<style lang="scss" scoped>
.sc-detail {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-lg;
  }
  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }
  &__actions {
    display: flex;
    gap: $nk-spacing-sm;
  }
  &__info {
    padding: $nk-spacing-xl;
    margin-bottom: $nk-spacing-xl;
  }
  &__info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $nk-spacing-lg;
  }
  &__info-item {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-xs;
  }
  &__info-label {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  &__info-value {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-900;
  }
  &__section {
    margin-bottom: $nk-spacing-xl;
  }
  &__section-title {
    font-size: $nk-font-size-lg;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
    margin-bottom: $nk-spacing-md;
  }
  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: $nk-spacing-md;
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
  &__row--notified {
    background: rgba($nk-color-error, 0.05);
  }
  &__empty {
    text-align: center;
    padding: $nk-spacing-3xl;
  }
  &__ellipsis {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>