<template>
  <NkDialog :visible="visible" :title="title" :width="400" @update:visible="onVisible">
    <p class="goodser__confirm-text">{{ message }}</p>
    <slot />
    <template #footer>
      <NkButton variant="ghost" :disabled="loading" @click="onVisible(false)">取消</NkButton>
      <NkButton :type="danger ? 'danger' : 'primary'" :loading="loading" @click="emit('confirm')">
        {{ confirmText }}
      </NkButton>
    </template>
  </NkDialog>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    message: string
    confirmText?: string
    danger?: boolean
    loading?: boolean
  }>(),
  {
    title: '确认操作',
    confirmText: '确定',
    danger: false,
    loading: false,
  },
)

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
}>()

function onVisible(value: boolean) {
  emit('update:visible', value)
}
</script>

<style lang="scss" scoped>
.goodser__confirm-text {
  margin: 0;
  line-height: 1.7;
  color: $nk-color-neutral-700;
  white-space: pre-line;
}
</style>
