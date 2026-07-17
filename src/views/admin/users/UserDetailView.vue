<template>
  <div class="user-detail">
    <NkCard>
      <template #header>
        <div class="user-detail__header">
          <h2 v-if="user">用户详情 - {{ user.username }}</h2>
          <h2 v-else>用户详情</h2>
          <NkButton variant="ghost" size="sm" @click="goBack">返回</NkButton>
        </div>
      </template>

      <div v-if="loading" class="user-detail__loading">
        <NkLoading />
      </div>

      <div v-else-if="user" class="user-detail__form">
        <div class="user-detail__field">
          <label>用户名</label>
          <span>{{ user.username }}</span>
        </div>
        <div class="user-detail__field">
          <label>昵称</label>
          <NkInput v-model="form.nickname" placeholder="请输入昵称" />
        </div>
        <div class="user-detail__field">
          <label>邮箱</label>
          <NkInput v-model="form.email" placeholder="请输入邮箱" />
        </div>
        <div class="user-detail__field">
          <label>手机号</label>
          <NkInput v-model="form.phone" placeholder="请输入手机号" />
        </div>
        <div class="user-detail__field">
          <label>状态</label>
          <NkTag
            v-if="user.status"
            :type="user.status === 'active' ? 'success' : user.status === 'inactive' ? 'warning' : 'danger'"
          >
            {{ statusLabel(user.status) }}
          </NkTag>
          <span v-else>-</span>
        </div>
        <div class="user-detail__field">
          <label>角色</label>
          <div class="user-detail__roles">
            <NkTag v-for="role in user.roles || []" :key="role" type="info" style="margin-right: 4px">
              {{ role }}
            </NkTag>
            <span v-if="!user.roles?.length" class="user-detail__no-role">-</span>
            <NkButton v-if="isAdmin" size="sm" variant="ghost" @click="showRoleDialog = true">分配角色</NkButton>
          </div>
        </div>
        <div class="user-detail__field">
          <label>创建时间</label>
          <span>{{ formatDate(user.created_at) }}</span>
        </div>
        <div class="user-detail__field">
          <label>更新时间</label>
          <span>{{ formatDate(user.updated_at) }}</span>
        </div>

        <div class="user-detail__actions">
          <NkButton :loading="saving" @click="handleSave">保存修改</NkButton>
        </div>
      </div>
    </NkCard>

    <NkDialog v-model:visible="showRoleDialog" title="分配角色" :width="360">
      <NkSelect
        v-model="roleForm.role"
        :options="roleOptions"
        placeholder="选择角色"
      />
      <template #footer>
        <NkButton variant="ghost" @click="showRoleDialog = false">取消</NkButton>
        <NkButton :loading="assigningRole" @click="handleAssignRole">确认</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getUser, updateUser } from '@/api/auth'
import { assignRole } from '@/api/role'
import { useAuthStore } from '@/stores/auth'
import { NKMessage } from '@nkui/vue/src/utils/message'
import type { UserInfo } from '@/types/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const userId = computed(() => Number(route.params.id))
const isAdmin = computed(() => authStore.isAdmin)

const user = ref<UserInfo | null>(null)
const loading = ref(true)
const saving = ref(false)

const form = reactive({
  nickname: '',
  email: '',
  phone: '',
})

async function loadUser() {
  loading.value = true
  try {
    const res = await getUser(userId.value)
    user.value = res.data
    form.nickname = res.data.nickname || ''
    form.email = res.data.email || ''
    form.phone = res.data.phone || ''
  } catch (err: any) {
    NKMessage.error(err.message || '加载用户信息失败')
    router.push('/users')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    await updateUser(userId.value, {
      nickname: form.nickname || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
    })
    NKMessage.success('保存成功')
    loadUser()
  } catch (err: any) {
    NKMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push('/users')
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: '正常',
    inactive: '未激活',
    suspended: '已停用',
  }
  return map[status] || status
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const showRoleDialog = ref(false)
const assigningRole = ref(false)
const roleForm = reactive({ role: 'user' })
const roleOptions = [
  { label: '用户 (user)', value: 'user' },
  { label: '管理员 (admin)', value: 'admin' },
]

async function handleAssignRole() {
  assigningRole.value = true
  try {
    await assignRole(userId.value, roleForm.role)
    NKMessage.success('角色分配成功')
    showRoleDialog.value = false
    loadUser()
  } catch (err: any) {
    NKMessage.error(err.message || '角色分配失败')
  } finally {
    assigningRole.value = false
  }
}

onMounted(loadUser)
</script>

<style lang="scss" scoped>
.user-detail {
  max-width: 700px;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    h2 {
      font-size: $nk-font-size-lg;
      font-weight: $nk-font-weight-semibold;
    }
  }

  &__loading {
    display: flex;
    justify-content: center;
    padding: $nk-spacing-3xl;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-lg;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-xs;

    label {
      font-size: $nk-font-size-sm;
      font-weight: $nk-font-weight-medium;
      color: $nk-color-neutral-600;
    }
  }

  &__roles {
    display: flex;
    align-items: center;
    gap: $nk-spacing-xs;
  }

  &__no-role {
    color: $nk-color-neutral-400;
  }

  &__actions {
    margin-top: $nk-spacing-lg;
    padding-top: $nk-spacing-lg;
    border-top: 1px solid $nk-color-neutral-200;
  }
}
</style>
