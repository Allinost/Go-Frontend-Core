<template>
  <span class="ia-pnl-badge" :class="`ia-pnl-badge--${type}`">
    <template v-if="showSign && value > 0">+</template>
    {{ formatted }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  value: number
  type?: 'ratio' | 'amount'
  showSign?: boolean
}>(), {
  type: 'ratio',
  showSign: true,
})

const formatted = computed(() => {
  const v = props.value ?? 0
  if (props.type === 'ratio') {
    return `${(v * 100).toFixed(2)}%`
  }
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
})
</script>

<style lang="scss" scoped>
.ia-pnl-badge {
  font-weight: $nk-font-weight-medium;
  &--positive {
    color: $nk-color-success;
  }
  &--negative {
    color: $nk-color-error;
  }
  &--zero {
    color: $nk-color-neutral-400;
  }
}
</style>
