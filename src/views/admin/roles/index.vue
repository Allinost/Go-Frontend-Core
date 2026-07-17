<template>
  <div class="role-manage">
    <h2 class="role-manage__title">角色权限管理</h2>

    <NkTabs v-model="activeTab" :items="tabs" @change="onTabChange" />

    <div class="role-manage__toolbar">
      <NkButton v-if="activeTab === 'roles'" size="sm" @click="openCreateRoleDialog">新建角色</NkButton>
      <NkButton v-if="activeTab === 'permissions'" size="sm" @click="openCreatePermissionDialog">新建权限</NkButton>
      <NkInput
        v-if="activeTab === 'permissions'"
        v-model="permSearch"
        placeholder="搜索权限..."
        size="sm"
        style="width: 200px"
      />
    </div>

    <div class="role-manage__content">
      <div v-if="activeTab === 'roles'" class="role-manage__roles">
        <NkLoading v-if="rolesLoading" />
        <NkEmpty v-else-if="roles.length === 0" description="暂无角色数据" />
        <div v-else class="role-manage__cards">
          <NkCard v-for="role in roles" :key="role.name" class="role-manage__card">
            <div class="role-manage__card-top">
              <span class="role-manage__card-name">{{ role.name }}</span>
              <div class="role-manage__card-actions">
                <NkButton size="sm" variant="ghost" @click="openEditRoleDialog(role)">编辑</NkButton>
                <NkButton size="sm" variant="ghost" type="danger" @click="confirmDeleteRole(role)">删除</NkButton>
              </div>
            </div>
            <div class="role-manage__card-perms">
              <span class="role-manage__perms-label">权限：</span>
              <NkTag
                v-for="perm in rolePermsMap[role.name] || []"
                :key="perm.id"
                size="sm"
                variant="outline"
                type="info"
                style="margin: 2px 4px 2px 0"
              >
                {{ perm.name }}
              </NkTag>
              <span v-if="!(rolePermsMap[role.name] || []).length" class="role-manage__no-perms">暂未分配</span>
            </div>
          </NkCard>
        </div>
      </div>

      <div v-if="activeTab === 'permissions'" class="role-manage__permissions">
        <NkLoading v-if="permsLoading" />
        <NkEmpty v-else-if="filteredPerms.length === 0" description="暂无权限数据" />
        <div v-else class="role-manage__table-card">
          <table class="perm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>名称</th>
                <th>资源</th>
                <th>操作</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="perm in filteredPerms" :key="perm.id">
                <td>{{ perm.id }}</td>
                <td>{{ perm.name }}</td>
                <td><NkTag size="sm">{{ perm.resource }}</NkTag></td>
                <td><NkTag size="sm">{{ perm.action }}</NkTag></td>
                <td>{{ formatDate(perm.created_at) }}</td>
                <td>
                  <NkButton size="sm" variant="ghost" @click="openEditPermissionDialog(perm)">编辑</NkButton>
                  <NkButton size="sm" variant="ghost" type="danger" @click="confirmDeletePermission(perm)">删除</NkButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="activeTab === 'users'" class="role-manage__users">
        <div class="role-manage__users-header">
          <NkInput v-model="search" placeholder="搜索用户名/昵称" size="sm" style="width: 240px" />
          <NkButton size="sm" @click="loadUsers">搜索</NkButton>
        </div>

        <div class="role-manage__table-card">
          <table class="role-user-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户名</th>
                <th>昵称</th>
                <th>当前角色</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.id }}</td>
                <td>{{ user.username }}</td>
                <td>{{ user.nickname || '-' }}</td>
                <td>
                  <NkTag
                    v-for="role in user.roles"
                    :key="role"
                    size="sm"
                    :type="role === 'admin' ? 'primary' : 'info'"
                    style="margin-right: 4px"
                  >
                    {{ role }}
                  </NkTag>
                  <span v-if="!user.roles?.length" class="role-user-table__no-role">-</span>
                </td>
                <td>
                  <NkButton size="sm" variant="ghost" @click="openAssignDialog(user)">分配角色</NkButton>
                </td>
              </tr>
              <tr v-if="!users.length && !usersLoading">
                <td colspan="5" class="role-user-table__empty">
                  <NkEmpty description="暂无用户数据" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="role-manage__pagination">
          <NkPagination
            v-model="currentPage"
            :total="total"
            :page-size="pageSize"
            @change="loadUsers"
          />
        </div>
      </div>
    </div>

    <NkDialog v-model:visible="showRoleDialog" :title="isEditingRole ? '编辑角色' : '新建角色'" :width="400">
      <NkInput v-model="roleForm.name" :placeholder="isEditingRole ? '新角色名称' : '角色名称'" />
      <template #footer>
        <NkButton variant="ghost" @click="showRoleDialog = false">取消</NkButton>
        <NkButton :loading="roleSaving" :disabled="!roleForm.name" @click="handleSaveRole">确认</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="showPermDialog" :title="isEditingPerm ? '编辑权限' : '新建权限'" :width="480">
      <div class="role-manage__dialog-form">
        <NkInput v-model="permForm.name" placeholder="权限名称" />
        <NkInput v-model="permForm.resource" placeholder="资源标识（如 user / task）" style="margin-top: 12px" />
        <NkInput v-model="permForm.action" placeholder="操作（如 read / write / *）" style="margin-top: 12px" />
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showPermDialog = false">取消</NkButton>
        <NkButton :loading="permSaving" :disabled="!permForm.name || !permForm.resource || !permForm.action" @click="handleSavePerm">确认</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="showAssignDialog" title="分配角色" :width="420">
      <div class="role-manage__dialog-body">
        <p class="role-manage__dialog-user">
          为用户 <strong>{{ assigningUser?.username }}</strong> 分配角色：
        </p>
        <div class="role-manage__dialog-current">
          <span>当前角色：</span>
          <NkTag
            v-for="role in assigningUser?.roles"
            :key="role"
            size="sm"
            :type="role === 'admin' ? 'primary' : 'info'"
            style="margin-right: 4px"
          >
            {{ role }}
          </NkTag>
          <span v-if="!assigningUser?.roles?.length">-</span>
        </div>
        <NkSelect
          v-model="selectedRole"
          :options="roleOptions"
          placeholder="请选择角色"
          style="width: 100%; margin-top: 16px"
        />
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showAssignDialog = false">取消</NkButton>
        <NkButton :loading="assigning" :disabled="!selectedRole" @click="handleAssign">确认分配</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="showDeleteRoleDialog" title="确认删除" :width="400">
      <p>确定要删除角色 <strong>{{ deletingRole?.name }}</strong> 吗？</p>
      <template #footer>
        <NkButton variant="ghost" @click="showDeleteRoleDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="deletingRoleLoading" @click="handleDeleteRole">确认删除</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="showDeletePermDialog" title="确认删除" :width="400">
      <p>确定要删除权限 <strong>{{ deletingPerm?.name }}</strong> 吗？</p>
      <template #footer>
        <NkButton variant="ghost" @click="showDeletePermDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="deletingPermLoading" @click="handleDeletePerm">确认删除</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { listUsers } from '@/api/auth'
import { listRoles, createRole, updateRole, deleteRole, getRolePermissions, listPermissions, createPermission, updatePermission, deletePermission, assignRole } from '@/api/role'
import type { UserInfo, RoleModel, Permission } from '@/types/api'
import { NKMessage } from '@nkui/vue/src/utils/message'

const activeTab = ref('roles')
const tabs = [
  { label: '角色列表', value: 'roles' },
  { label: '权限列表', value: 'permissions' },
  { label: '用户角色分配', value: 'users' },
]

const roles = ref<RoleModel[]>([])
const rolesLoading = ref(false)
const rolePermsMap = ref<Record<string, Permission[]>>({})

const permSearch = ref('')
const permissions = ref<Permission[]>([])
const permsLoading = ref(false)
const filteredPerms = computed(() => {
  if (!permSearch.value) return permissions.value
  const q = permSearch.value.toLowerCase()
  return permissions.value.filter(
    (p) => p.name.toLowerCase().includes(q) || p.resource.toLowerCase().includes(q) || p.action.toLowerCase().includes(q),
  )
})

const search = ref('')
const users = ref<UserInfo[]>([])
const usersLoading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

async function loadRoles() {
  rolesLoading.value = true
  try {
    const res = await listRoles()
    roles.value = res.data
    await Promise.all(roles.value.map((r) => loadRolePerms(r.name)))
  } catch (err: any) {
    NKMessage.error(err.message || '加载角色列表失败')
  } finally {
    rolesLoading.value = false
  }
}

async function loadRolePerms(name: string) {
  try {
    const res = await getRolePermissions(name)
    rolePermsMap.value[name] = res.data
  } catch {
    rolePermsMap.value[name] = []
  }
}

async function loadPermissions() {
  permsLoading.value = true
  try {
    const res = await listPermissions()
    permissions.value = res.data
  } catch (err: any) {
    NKMessage.error(err.message || '加载权限列表失败')
  } finally {
    permsLoading.value = false
  }
}

async function loadUsers() {
  usersLoading.value = true
  try {
    const res = await listUsers({
      page: currentPage.value,
      page_size: pageSize.value,
      search: search.value || undefined,
    })
    users.value = res.data.data
    total.value = res.data.total
  } catch (err: any) {
    NKMessage.error(err.message || '加载用户列表失败')
  } finally {
    usersLoading.value = false
  }
}

const showRoleDialog = ref(false)
const isEditingRole = ref(false)
const roleSaving = ref(false)
const roleForm = reactive({ name: '' })
const editingRoleName = ref('')

function openCreateRoleDialog() {
  isEditingRole.value = false
  roleForm.name = ''
  showRoleDialog.value = true
}

function openEditRoleDialog(role: RoleModel) {
  isEditingRole.value = true
  editingRoleName.value = role.name
  roleForm.name = role.name
  showRoleDialog.value = true
}

async function handleSaveRole() {
  roleSaving.value = true
  try {
    if (isEditingRole.value) {
      await updateRole(editingRoleName.value, roleForm.name)
      NKMessage.success('角色更新成功')
    } else {
      await createRole(roleForm.name)
      NKMessage.success('角色创建成功')
    }
    showRoleDialog.value = false
    loadRoles()
  } catch (err: any) {
    NKMessage.error(err.message || '操作失败')
  } finally {
    roleSaving.value = false
  }
}

const showDeleteRoleDialog = ref(false)
const deletingRole = ref<RoleModel | null>(null)
const deletingRoleLoading = ref(false)

function confirmDeleteRole(role: RoleModel) {
  deletingRole.value = role
  showDeleteRoleDialog.value = true
}

async function handleDeleteRole() {
  if (!deletingRole.value) return
  deletingRoleLoading.value = true
  try {
    await deleteRole(deletingRole.value.name)
    NKMessage.success('角色已删除')
    showDeleteRoleDialog.value = false
    loadRoles()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    deletingRoleLoading.value = false
  }
}

const showPermDialog = ref(false)
const isEditingPerm = ref(false)
const permSaving = ref(false)
const permForm = reactive({ name: '', resource: '', action: '' })
const editingPermId = ref(0)

function openCreatePermissionDialog() {
  isEditingPerm.value = false
  permForm.name = ''
  permForm.resource = ''
  permForm.action = ''
  showPermDialog.value = true
}

function openEditPermissionDialog(perm: Permission) {
  isEditingPerm.value = true
  editingPermId.value = perm.id
  permForm.name = perm.name
  permForm.resource = perm.resource
  permForm.action = perm.action
  showPermDialog.value = true
}

async function handleSavePerm() {
  permSaving.value = true
  try {
    if (isEditingPerm.value) {
      await updatePermission(editingPermId.value, { name: permForm.name, resource: permForm.resource, action: permForm.action })
      NKMessage.success('权限更新成功')
    } else {
      await createPermission({ name: permForm.name, resource: permForm.resource, action: permForm.action })
      NKMessage.success('权限创建成功')
    }
    showPermDialog.value = false
    loadPermissions()
  } catch (err: any) {
    NKMessage.error(err.message || '操作失败')
  } finally {
    permSaving.value = false
  }
}

const showDeletePermDialog = ref(false)
const deletingPerm = ref<Permission | null>(null)
const deletingPermLoading = ref(false)

function confirmDeletePermission(perm: Permission) {
  deletingPerm.value = perm
  showDeletePermDialog.value = true
}

async function handleDeletePerm() {
  if (!deletingPerm.value) return
  deletingPermLoading.value = true
  try {
    await deletePermission(deletingPerm.value.id)
    NKMessage.success('权限已删除')
    showDeletePermDialog.value = false
    loadPermissions()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    deletingPermLoading.value = false
  }
}

const showAssignDialog = ref(false)
const assigning = ref(false)
const assigningUser = ref<UserInfo | null>(null)
const selectedRole = ref('')

const roleOptions = computed(() =>
  roles.value.map((r) => ({ label: r.name, value: r.name })),
)

function openAssignDialog(user: UserInfo) {
  assigningUser.value = user
  selectedRole.value = ''
  showAssignDialog.value = true
}

async function handleAssign() {
  if (!assigningUser.value || !selectedRole.value) return
  assigning.value = true
  try {
    await assignRole(assigningUser.value.id, selectedRole.value)
    NKMessage.success('角色分配成功')
    showAssignDialog.value = false
    loadUsers()
  } catch (err: any) {
    NKMessage.error(err.message || '分配角色失败')
  } finally {
    assigning.value = false
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function onTabChange(value: string | number) {
  activeTab.value = value as string
  if (activeTab.value === 'roles') loadRoles()
  if (activeTab.value === 'permissions') loadPermissions()
  if (activeTab.value === 'users' && users.value.length === 0) loadUsers()
}

onMounted(loadRoles)
</script>

<style lang="scss" scoped>
.role-manage {
  max-width: 1200px;

  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    margin-bottom: $nk-spacing-xl;
    color: $nk-color-neutral-900;
  }

  &__toolbar {
    display: flex;
    gap: $nk-spacing-sm;
    align-items: center;
    margin-bottom: $nk-spacing-lg;
  }

  &__content {
    margin-top: $nk-spacing-lg;
  }

  &__empty {
    padding: $nk-spacing-3xl 0;
  }

  &__cards {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-lg;
  }

  &__card {
    padding: $nk-spacing-lg;

    :deep(.nk-card__body) {
      padding: 0;
    }
  }

  &__card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-sm;
  }

  &__card-name {
    font-size: $nk-font-size-lg;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }

  &__card-actions {
    display: flex;
    gap: $nk-spacing-xs;
  }

  &__card-perms {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }

  &__perms-label {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-400;
    margin-right: 4px;
  }

  &__no-perms {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-300;
  }

  &__users-header {
    display: flex;
    gap: $nk-spacing-sm;
    align-items: center;
    margin-bottom: $nk-spacing-lg;
  }

  &__table-card {
    overflow: hidden;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: $nk-spacing-lg;
  }

  &__dialog-body {
    padding: $nk-spacing-sm 0;
  }

  &__dialog-user {
    margin-bottom: $nk-spacing-sm;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-700;
  }

  &__dialog-current {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-600;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__dialog-form {
    padding: $nk-spacing-sm 0;
  }
}

.role-user-table {
  width: 100%;
  border-collapse: collapse;
  font-size: $nk-font-size-sm;

  th, td {
    text-align: left;
    padding: $nk-spacing-sm $nk-spacing-md;
    border-bottom: 1px solid $nk-color-neutral-200;
  }

  th {
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-500;
    background: $nk-color-neutral-50;
    font-size: $nk-font-size-xs;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  td {
    color: $nk-color-neutral-700;
  }

  tbody tr:hover {
    background: $nk-color-neutral-50;
  }

  &__empty {
    text-align: center;
    padding: $nk-spacing-3xl;
  }

  &__no-role {
    color: $nk-color-neutral-400;
  }
}

.perm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: $nk-font-size-sm;

  th, td {
    text-align: left;
    padding: $nk-spacing-sm $nk-spacing-md;
    border-bottom: 1px solid $nk-color-neutral-200;
  }

  th {
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-500;
    background: $nk-color-neutral-50;
    font-size: $nk-font-size-xs;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  td {
    color: $nk-color-neutral-700;
  }

  tbody tr:hover {
    background: $nk-color-neutral-50;
  }
}
</style>
