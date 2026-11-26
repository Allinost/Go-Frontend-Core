<template>
  <div class="not-found">
    <NkEmpty description="页面不存在或已被移动" />
    <NkButton size="sm" @click="router.push('/dashboard')">返回仪表盘</NkButton>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style lang="scss" scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $nk-spacing-md;
  padding: $nk-spacing-3xl 0;
}
</style>
