<template>
  <div class="wh-page">
    <div class="wh-page__header">
      <h2 class="wh-page__title">Webhook</h2>
    </div>
    <NkTabs v-model="activeTab" :items="tabs" />
    <div class="wh-page__content">
      <ConfigListView v-if="activeTab === 'configs'" />
      <DeliveryLogsView v-else-if="activeTab === 'logs'" />
      <StatsView v-else-if="activeTab === 'stats'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ConfigListView from './ConfigListView.vue'
import DeliveryLogsView from './DeliveryLogsView.vue'
import StatsView from './StatsView.vue'

const activeTab = ref('configs')
const tabs = [
  { label: '配置列表', value: 'configs' },
  { label: '投递日志', value: 'logs' },
  { label: '全局统计', value: 'stats' },
]
</script>

<style lang="scss" scoped>
.wh-page {
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
