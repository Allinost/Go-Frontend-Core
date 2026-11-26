<template>
  <NkDialog
    :visible="confirmState.visible"
    :title="confirmState.options.title || '请确认'"
    :width="420"
    @update:visible="onVisibleChange"
  >
    <p class="app-confirm__content">{{ confirmState.options.content }}</p>
    <template #footer>
      <NkButton variant="ghost" @click="settleConfirm(false)">
        {{ confirmState.options.cancelText || '取消' }}
      </NkButton>
      <NkButton :type="confirmState.options.danger ? 'danger' : 'primary'" @click="settleConfirm(true)">
        {{ confirmState.options.confirmText || '确认' }}
      </NkButton>
    </template>
  </NkDialog>
</template>

<script setup lang="ts">
import { confirmState, settleConfirm } from '@/utils/confirm'

function onVisibleChange(value: boolean) {
  if (!value) settleConfirm(false)
}
</script>

<style lang="scss" scoped>
.app-confirm__content {
  line-height: 1.6;
  color: $nk-color-neutral-700;
  white-space: pre-wrap;
}
</style>
