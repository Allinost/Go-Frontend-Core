<template>
  <div class="login-page">
    <div class="login-page__container">
      <NkLogin
        title="Go 后端管理系统"
        subtitle="请输入您的账号密码登录"
        size="md"
        variant="card"
        :loading="loading"
        :rules="rules"
        @submit="handleLogin"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { NKMessage } from '@nkui/vue'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)

const rules = {
  username: (v: string) => v.trim().length >= 3 || '用户名至少3个字符',
  password: (v: string) => v.length >= 6 || '密码至少6个字符',
}

async function handleLogin(data: { username: string; password: string }) {
  loading.value = true
  try {
    await authStore.login(data.username, data.password)
    NKMessage.success('登录成功')
    router.push('/')
  } catch (err: any) {
    NKMessage.error(err.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, $nk-color-primary-50, $nk-color-neutral-100);

  &__container {
    width: 100%;
    display: flex;
    justify-content: center;
  }
}
</style>
