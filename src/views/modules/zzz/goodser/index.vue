<template>
  <div class="goodser-module">
    <h2 class="goodser-module__title">商品管理 (zzz/Goodser)</h2>

    <NkTabs v-model="activeTab" :items="tabs" @change="onTabChange" />

    <div class="goodser-module__content">
      <div v-if="activeTab === 'inventories'">
        <NkCard>
          <template #header>
            <div class="goodser-module__card-header">
              <span>库存目录</span>
              <NkButton size="sm">新建目录</NkButton>
            </div>
          </template>
          <NkEmpty description="库存目录功能开发中" />
        </NkCard>
      </div>

      <div v-if="activeTab === 'products'">
        <NkCard>
          <template #header>
            <div class="goodser-module__card-header">
              <span>商品列表</span>
              <NkButton size="sm">新建商品</NkButton>
            </div>
          </template>
          <NkEmpty description="商品管理功能开发中" />
        </NkCard>
      </div>

      <div v-if="activeTab === 'orders'">
        <NkCard>
          <template #header>
            <div class="goodser-module__card-header">
              <span>出库订单</span>
            </div>
          </template>
          <NkEmpty description="订单管理功能开发中" />
        </NkCard>
      </div>

      <div v-if="activeTab === 'logs'">
        <NkCard>
          <template #header>
            <div class="goodser-module__card-header">
              <span>入库记录</span>
            </div>
          </template>
          <NkEmpty description="入库管理功能开发中" />
        </NkCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeTab = ref('inventories')

const tabs = [
  { label: '库存目录', value: 'inventories' },
  { label: '商品列表', value: 'products' },
  { label: '出库订单', value: 'orders' },
  { label: '入库记录', value: 'logs' },
]

function onTabChange(value: string | number) {
  activeTab.value = value as string
}
</script>

<style lang="scss" scoped>
.goodser-module {
  max-width: 1200px;

  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    margin-bottom: $nk-spacing-xl;
    color: $nk-color-neutral-900;
  }

  &__content {
    margin-top: $nk-spacing-lg;
  }

  &__card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
}
</style>
