<template>
  <div class="ia-date-range">
    <NkSelect v-model="quickRange" :options="quickOptions" class="ia-date-range__quick" @change="handleQuick" />
    <NkInput v-model="startDate" type="date" class="ia-date-range__input" @change="emitRange" />
    <span class="ia-date-range__sep">-</span>
    <NkInput v-model="endDate" type="date" class="ia-date-range__input" @change="emitRange" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const emit = defineEmits<{
  change: [start: string, end: string]
}>()

const quickRange = ref('all')
const startDate = ref('')
const endDate = ref('')

const quickOptions = [
  { label: '近1月', value: '1m' },
  { label: '近3月', value: '3m' },
  { label: '近6月', value: '6m' },
  { label: '近1年', value: '1y' },
  { label: '今年', value: 'ytd' },
  { label: '全部', value: 'all' },
]

function handleQuick(val: string) {
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  let start = ''
  switch (val) {
    case '1m':
      start = fmt(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()))
      break
    case '3m':
      start = fmt(new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()))
      break
    case '6m':
      start = fmt(new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()))
      break
    case '1y':
      start = fmt(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()))
      break
    case 'ytd':
      start = `${now.getFullYear()}-01-01`
      break
    case 'all':
      start = ''
      break
  }
  startDate.value = start
  endDate.value = val === 'all' ? '' : fmt(now)
  emitRange()
}

function emitRange() {
  emit('change', startDate.value, endDate.value)
}
</script>

<style lang="scss" scoped>
.ia-date-range {
  display: flex;
  align-items: center;
  gap: $nk-spacing-sm;

  &__quick {
    width: 120px;
  }
  &__input {
    width: 140px;
  }
  &__sep {
    color: $nk-color-neutral-400;
  }
}
</style>
