<template>
  <div class="sc-dashboard">
    <div class="sc-dashboard__header">
      <h3 class="sc-dashboard__title">仪表盘</h3>
    </div>

    <NkLoading v-if="loading" />
    <template v-else>
      <div class="sc-dashboard__stats">
        <NkCard class="sc-dashboard__stat-card">
          <div class="sc-dashboard__stat-value">{{ data?.total_products ?? '-' }}</div>
          <div class="sc-dashboard__stat-label">商品总数</div>
        </NkCard>
        <NkCard class="sc-dashboard__stat-card">
          <div class="sc-dashboard__stat-value">{{ data?.enabled_products ?? '-' }}</div>
          <div class="sc-dashboard__stat-label">启用数</div>
        </NkCard>
        <NkCard class="sc-dashboard__stat-card">
          <div class="sc-dashboard__stat-value">{{ data?.today_checks ?? '-' }}</div>
          <div class="sc-dashboard__stat-label">今日检查</div>
        </NkCard>
        <NkCard class="sc-dashboard__stat-card">
          <div class="sc-dashboard__stat-value">{{ data?.today_notified ?? '-' }}</div>
          <div class="sc-dashboard__stat-label">今日通知</div>
        </NkCard>
      </div>

      <div class="sc-dashboard__section">
        <h3 class="sc-dashboard__section-title">最近降价</h3>
        <table class="sc-table">
          <thead>
            <tr>
              <th>商品名</th>
              <th>平台</th>
              <th>原价</th>
              <th>新价</th>
              <th>降幅</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in data?.recent_drops" :key="d.product_id">
              <td>
                <router-link :to="`/modules/zzz/shopchecker/products/${d.product_id}`" class="sc-table__link">{{ d.name }}</router-link>
              </td>
              <td><NkTag size="sm">{{ platformLabel(d.platform) }}</NkTag></td>
              <td>¥{{ d.old_price }}</td>
              <td>¥{{ d.new_price }}</td>
              <td class="sc-dashboard__drop">{{ d.drop_percent }}%</td>
              <td>{{ formatTime(d.dropped_at) }}</td>
            </tr>
            <tr v-if="!data?.recent_drops?.length">
              <td colspan="6" class="sc-table__empty"><NkEmpty description="暂无降价记录" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getDashboard } from '@/api/shopchecker'
import type { DashboardResp } from '@/types/shopchecker'
import { NKMessage } from '@nkui/vue/src/utils/message'

const loading = ref(false)
const data = ref<DashboardResp | null>(null)

async function loadDashboard() {
  loading.value = true
  try {
    const res = await getDashboard()
    data.value = res.data
  } catch (err: any) {
    NKMessage.error(err.message || '加载仪表盘失败')
  } finally {
    loading.value = false
  }
}

function platformLabel(platform: string): string {
  const map: Record<string, string> = { jd: '京东', jdm: '京东移动版', qixian: '七鲜', taobao: '淘宝', pdd: '拼多多' }
  return map[platform] || platform
}

function formatTime(t?: string): string {
  if (!t) return '-'
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(loadDashboard)
</script>

<style lang="scss" scoped>
.sc-dashboard {
  &__header {
    margin-bottom: $nk-spacing-lg;
  }
  &__title {
    font-size: $nk-font-size-lg;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }
  &__stats {
    display: flex;
    gap: $nk-spacing-lg;
    margin-bottom: $nk-spacing-xl;
  }
  &__stat-card {
    flex: 1;
    padding: $nk-spacing-lg;
    text-align: center;
  }
  &__stat-value {
    font-size: $nk-font-size-2xl;
    font-weight: $nk-font-weight-bold;
    color: $nk-color-primary-600;
  }
  &__stat-label {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-500;
    margin-top: $nk-spacing-xs;
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
  &__drop {
    color: $nk-color-error;
    font-weight: $nk-font-weight-semibold;
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