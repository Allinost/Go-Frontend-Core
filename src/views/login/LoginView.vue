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
      >
        <template #footer>
          <span class="login-page__register" @click="showRegister = true">没有账号？立即注册</span>
        </template>
      </NkLogin>
    </div>

    <NkDialog v-model:visible="showRegister" title="注册账号" :width="420">
      <div class="register-form">
        <NkInput v-model="registerForm.username" label="用户名" placeholder="3-32位字符" :error="registerErrors.username" />
        <NkInput v-model="registerForm.nickname" label="昵称" placeholder="请输入昵称（可选）" />
        <NkInput v-model="registerForm.password" type="password" label="密码" placeholder="6-128位字符" :error="registerErrors.password" />
        <NkInput v-model="registerForm.confirmPassword" type="password" label="确认密码" placeholder="再次输入密码" :error="registerErrors.confirmPassword" />
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showRegister = false">取消</NkButton>
        <NkButton :loading="registerLoading" @click="handleRegister">注册</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { register as registerApi } from '@/api/auth'
import { setTokens } from '@/utils/auth'
import { NKMessage } from '@nkui/vue/src/utils/message'

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

const showRegister = ref(false)
const registerLoading = ref(false)
const registerForm = reactive({
  username: '',
  nickname: '',
  password: '',
  confirmPassword: '',
})
const registerErrors = reactive({
  username: '',
  password: '',
  confirmPassword: '',
})

async function handleRegister() {
  registerErrors.username = ''
  registerErrors.password = ''
  registerErrors.confirmPassword = ''

  if (registerForm.username.length < 3) {
    registerErrors.username = '用户名至少3个字符'
    return
  }
  if (registerForm.password.length < 6) {
    registerErrors.password = '密码至少6个字符'
    return
  }
  if (registerForm.password !== registerForm.confirmPassword) {
    registerErrors.confirmPassword = '两次密码不一致'
    return
  }

  registerLoading.value = true
  try {
    const res = await registerApi({
      username: registerForm.username,
      password: registerForm.password,
      nickname: registerForm.nickname || undefined,
    })
    setTokens(res.data.access_token, res.data.refresh_token)
    NKMessage.success('注册成功')
    showRegister.value = false
    await authStore.init()
    router.push('/')
  } catch (err: any) {
    NKMessage.error(err.message || '注册失败')
  } finally {
    registerLoading.value = false
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

  &__register {
    color: $nk-color-primary-500;
    cursor: pointer;
    font-size: $nk-font-size-sm;

    &:hover {
      color: $nk-color-primary-700;
    }
  }
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: $nk-spacing-md;
}
</style>
