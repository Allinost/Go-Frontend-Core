<template>
  <NkSelect
    v-model="selected"
    :options="options"
    :clearable="clearable"
    placeholder="选择账户"
    filterable
    @change="handleChange"
  />
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { listAccounts } from '@/api/ia'
import type { Account } from '@/types/ia'

const props = withDefaults(defineProps<{
  modelValue?: string
  clearable?: boolean
  pageSize?: number
}>(), {
  modelValue: '',
  clearable: true,
  pageSize: 200,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const selected = ref(props.modelValue)
const options = ref<{ label: string; value: string }[]>([])

watch(() => props.modelValue, (v) => { selected.value = v })

async function loadAccounts() {
  try {
    const res = await listAccounts({ status: 'active', page: 1, page_size: props.pageSize })
    const accounts: Account[] = res.data?.items || []
    options.value = [
      { label: '全部账户', value: '' },
      ...accounts.map((a) => ({ label: `${a.name} (${a.type})`, value: a.id })),
    ]
  } catch (e) {
    options.value = [{ label: '全部账户', value: '' }]
  }
}

function handleChange(val: string) {
  emit('update:modelValue', val)
  emit('change', val)
}

onMounted(loadAccounts)
</script>
