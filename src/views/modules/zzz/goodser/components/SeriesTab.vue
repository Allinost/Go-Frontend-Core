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
      <span class="goodser__count">共 {{ seriesSummary.length }} 个系列</span>
    </div>
    <NkLoading v-if="loading" />
    <div v-else-if="!seriesSummary.length" class="goodser__empty">
      <NkEmpty description="暂无系列数据，请先在设置中维护系列字典，并给商品关联系列" />
    </div>
    <div v-else class="goodser__series-grid">
      <NkCard
        v-for="s in seriesSummary"
        :key="s.series_id || s.series_name"
        class="goodser__series-card"
        @click="emit('open-series', s)"
      >
        <div class="goodser__series-name">{{ s.series_name || '未命名系列' }}</div>
        <div class="goodser__series-meta">
          <span>商品 {{ s.product_count }}</span>
          <span>可用 {{ s.available }}</span>
          <span>总量 {{ s.total_quantity }}</span>
        </div>
      </NkCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import { loadSeriesSummary } from '@/api/goodser'
import type { Inventory, SeriesSummary } from '@/types/goodser'

const props = defineProps<{
  inventoryId: string
  inventories: Inventory[]
}>()

const emit = defineEmits<{
  (e: 'update:inventoryId', value: string): void
  (e: 'open-series', series: SeriesSummary): void
}>()

const seriesSummary = ref<SeriesSummary[]>([])
const loading = ref(false)
let requestSeq = 0

const inventoryOptions = computed(() =>
  props.inventories.map((inv) => ({ label: inv.name, value: inv._id })),
)

async function fetchSeriesSummary() {
  if (!props.inventoryId) return
  const seq = ++requestSeq
  loading.value = true
  try {
    const res = await loadSeriesSummary(props.inventoryId)
    if (seq !== requestSeq) return
    seriesSummary.value = res.data?.items || []
  } catch (err: any) {
    if (seq !== requestSeq) return
    seriesSummary.value = []
    NKMessage.error(err.message || '加载系列视图失败')
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

watch(() => props.inventoryId, fetchSeriesSummary, { immediate: true })
</script>

<style lang="scss" scoped>
@use '../styles/shared';

.goodser {
  &__series-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: $nk-spacing-md;
  }

  &__series-card {
    cursor: pointer;
    transition: box-shadow $nk-duration-fast, border-color $nk-duration-fast;
    &:hover {
      box-shadow: $nk-shadow-md;
      border-color: $nk-color-primary-300;
    }
  }

  &__series-name {
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-900;
    font-size: $nk-font-size-base;
    margin-bottom: $nk-spacing-xs;
  }

  &__series-meta {
    display: flex;
    gap: $nk-spacing-md;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
  }
}
</style>
