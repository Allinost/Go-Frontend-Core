<template>
  <div class="wh-stats">
    <div class="wh-stats__header">
      <h2 class="wh-stats__title">Webhook 全局统计</h2>
      <NkButton size="sm" @click="loadStats">刷新</NkButton>
    </div>

    <NkLoading v-if="loading" />

    <template v-else-if="stats">
      <div class="wh-stats__cards">
        <NkCard class="wh-stats__card">
          <div class="wh-stats__card-value">{{ stats.total_configs }}</div>
          <div class="wh-stats__card-label">配置总数</div>
        </NkCard>
        <NkCard class="wh-stats__card">
          <div class="wh-stats__card-value">{{ stats.active_configs }}</div>
          <div class="wh-stats__card-label">活跃配置</div>
        </NkCard>
        <NkCard class="wh-stats__card">
          <div class="wh-stats__card-value">{{ stats.total_sent_today }}</div>
          <div class="wh-stats__card-label">今日投递</div>
        </NkCard>
        <NkCard class="wh-stats__card">
          <div class="wh-stats__card-value wh-stats__card-value--success">{{ stats.success_today }}</div>
          <div class="wh-stats__card-label">今日成功</div>
        </NkCard>
        <NkCard class="wh-stats__card">
          <div class="wh-stats__card-value wh-stats__card-value--danger">{{ stats.failed_today }}</div>
          <div class="wh-stats__card-label">今日失败</div>
        </NkCard>
        <NkCard class="wh-stats__card">
          <div class="wh-stats__card-value wh-stats__card-value--warning">{{ stats.rate_limited_today }}</div>
          <div class="wh-stats__card-label">今日限流</div>
        </NkCard>
      </div>

      <div class="wh-stats__charts">
        <NkCard class="wh-stats__chart-card">
          <h3 class="wh-stats__chart-title">按类型分布</h3>
          <table class="wh-stats__mini-table">
            <thead>
              <tr><th>类型</th><th>数量</th></tr>
            </thead>
            <tbody>
              <tr v-for="(count, type) in stats.by_type" :key="type">
                <td>{{ typeLabel(type) }}</td>
                <td>{{ count }}</td>
              </tr>
              <tr v-if="!Object.keys(stats.by_type).length">
                <td colspan="2" class="wh-stats__empty">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </NkCard>

        <NkCard class="wh-stats__chart-card">
          <h3 class="wh-stats__chart-title">按来源分布</h3>
          <table class="wh-stats__mini-table">
            <thead>
              <tr><th>来源</th><th>数量</th></tr>
            </thead>
            <tbody>
              <tr v-for="(count, source) in stats.by_source" :key="source">
                <td>{{ source }}</td>
                <td>{{ count }}</td>
              </tr>
              <tr v-if="!Object.keys(stats.by_source).length">
                <td colspan="2" class="wh-stats__empty">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </NkCard>
      </div>
    </template>

    <NkEmpty v-else description="暂无统计数据" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getStats } from '@/api/webhook'
import type { StatsResp } from '@/types/webhook'
import { NKMessage } from '@nkui/vue/src/utils/message'

const loading = ref(false)
const stats = ref<StatsResp | null>(null)

async function loadStats() {
  loading.value = true
  try {
    const res = await getStats()
    stats.value = res.data
  } catch (err: any) {
    NKMessage.error(err.message || '加载统计数据失败')
  } finally {
    loading.value = false
  }
}

function typeLabel(type: string): string {
  const map: Record<string, string> = { feishu: '飞书', dingtalk: '钉钉', wecom: '企微', github: 'GitHub', generic: '通用' }
  return map[type] || type
}

onMounted(loadStats)
</script>

<style lang="scss" scoped>
.wh-stats {
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
  &__cards {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: $nk-spacing-lg;
    margin-bottom: $nk-spacing-xl;
  }
  &__card {
    padding: $nk-spacing-lg;
    text-align: center;
  }
  &__card-value {
    font-size: $nk-font-size-2xl;
    font-weight: $nk-font-weight-bold;
    color: $nk-color-primary-600;
    &--success { color: $nk-color-success; }
    &--danger { color: $nk-color-error; }
    &--warning { color: $nk-color-warning; }
  }
  &__card-label {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-500;
    margin-top: $nk-spacing-xs;
  }
  &__charts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $nk-spacing-lg;
  }
  &__chart-card {
    padding: $nk-spacing-xl;
  }
  &__chart-title {
    font-size: $nk-font-size-base;
    font-weight: $nk-font-weight-semibold;
    margin-bottom: $nk-spacing-lg;
    color: $nk-color-neutral-800;
  }
  &__mini-table {
    width: 100%;
    border-collapse: collapse;
    font-size: $nk-font-size-sm;
    th, td {
      text-align: left;
      padding: $nk-spacing-xs $nk-spacing-md;
      border-bottom: 1px solid $nk-color-neutral-100;
    }
    th {
      font-weight: $nk-font-weight-medium;
      color: $nk-color-neutral-500;
      font-size: $nk-font-size-xs;
    }
    td { color: $nk-color-neutral-700; }
  }
  &__empty {
    text-align: center;
    color: $nk-color-neutral-400;
    padding: $nk-spacing-lg;
  }
}
</style>
