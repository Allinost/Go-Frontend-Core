<template>
  <div class="sc-page">
    <div class="sc-page__header">
      <h2 class="sc-page__title">ShopChecker</h2>
    </div>
    <NkTabs v-model="activeTab" :items="tabs" />
    <div class="sc-page__content">
      <ProductListView v-if="activeTab === 'products'" />
      <DashboardView v-else-if="activeTab === 'dashboard'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ProductListView from './ProductListView.vue'
import DashboardView from './DashboardView.vue'

const activeTab = ref('products')
const tabs = [
  { label: '商品列表', value: 'products' },
  { label: '仪表盘', value: 'dashboard' },
]
</script>

<style lang="scss" scoped>
.sc-page {
  &__header {
    margin-bottom: $nk-spacing-lg;
  }
  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }
  &__content {
    margin-top: $nk-spacing-lg;
  }
}
</style>