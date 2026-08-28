<template>
  <NkSelect
    v-model="selected"
    :options="options"
    :clearable="clearable"
    placeholder="搜索标的代码/名称"
    filterable
    remote
    :remote-method="handleSearch"
    @change="handleChange"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { searchAssets } from '@/api/ia'

const props = withDefaults(defineProps<{
  modelValue?: string
  clearable?: boolean
}>(), {
  modelValue: '',
  clearable: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string, item: any]
}>()

const selected = ref(props.modelValue)
const options = ref<{ label: string; value: string }[]>([])

watch(() => props.modelValue, (v) => { selected.value = v })

async function handleSearch(keyword: string) {
  if (!keyword) {
    options.value = []
    return
  }
  const res = await searchAssets({ keyword })
  const assets = res.data || []
  options.value = assets.map((a: any) => ({
    label: `${a.name} (${a.code}) - ${a.asset_type} - ${a.market}`,
    value: a.id || a.code,
  }))
}

function handleChange(val: string) {
  const item = options.value.find((o) => o.value === val)
  emit('update:modelValue', val)
  emit('change', val, item)
}
</script>
