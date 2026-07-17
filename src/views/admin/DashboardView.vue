<template>
  <div class="dashboard">
    <h2 class="dashboard__title">仪表盘</h2>
    <div class="dashboard__stats">
      <NkCard class="dashboard__stat-card">
        <div class="dashboard__stat-value">--</div>
        <div class="dashboard__stat-label">用户总数</div>
      </NkCard>
      <NkCard class="dashboard__stat-card">
        <div class="dashboard__stat-value">--</div>
        <div class="dashboard__stat-label">商品总数</div>
      </NkCard>
      <NkCard class="dashboard__stat-card">
        <div class="dashboard__stat-value">--</div>
        <div class="dashboard__stat-label">库存目录</div>
      </NkCard>
      <NkCard class="dashboard__stat-card">
        <div class="dashboard__stat-value">--</div>
        <div class="dashboard__stat-label">待处理</div>
      </NkCard>
    </div>
    <div class="dashboard__welcome">
      <NkCard>
        <h3>欢迎使用 Go 后端管理系统</h3>
        <p>当前登录用户：{{ authStore.username }}</p>
      </NkCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<style lang="scss" scoped>
.dashboard {
  max-width: 1200px;

  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    margin-bottom: $nk-spacing-xl;
    color: $nk-color-neutral-900;
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: $nk-spacing-lg;
    margin-bottom: $nk-spacing-xl;
  }

  &__stat-card {
    text-align: center;
    padding: $nk-spacing-xl;
  }

  &__stat-value {
    font-size: $nk-font-size-3xl;
    font-weight: $nk-font-weight-bold;
    color: $nk-color-primary-600;
    margin-bottom: $nk-spacing-sm;
  }

  &__stat-label {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-500;
  }

  &__welcome {
    h3 {
      margin-bottom: $nk-spacing-sm;
      font-size: $nk-font-size-lg;
    }
    p {
      color: $nk-color-neutral-600;
    }
  }
}
</style>
