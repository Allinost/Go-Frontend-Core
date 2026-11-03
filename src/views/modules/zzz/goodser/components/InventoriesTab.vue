<template>
  <div class="goodser__tab">
    <div class="goodser__tab-header">
      <span class="goodser__count">共 {{ inventories.length }} 个目录</span>
      <NkButton size="sm" @click="openCreate">新建目录</NkButton>
    </div>
    <NkLoading v-if="loading" />
    <div v-else-if="!inventories.length" class="goodser__empty">
      <NkEmpty description="暂无库存目录，点击上方按钮新建" />
    </div>
    <div v-else class="goodser__inventory-grid">
      <NkCard
        v-for="inv in inventories"
        :key="inv._id"
        class="goodser__inv-card"
        @click="emit('select', inv)"
      >
        <div class="goodser__inv-info">
          <div class="goodser__inv-name">{{ inv.name }}</div>
          <div class="goodser__inv-meta">排序: {{ inv.sort_order }} · {{ formatDate(inv.created_at) }}</div>
        </div>
        <div class="goodser__inv-actions" @click.stop>
          <NkButton size="xs" variant="ghost" @click="openRename(inv)">重命名</NkButton>
          <NkButton size="xs" variant="ghost" type="danger" @click="openDelete(inv)">删除</NkButton>
        </div>
      </NkCard>
    </div>

    <NkDialog v-model:visible="showCreateDialog" title="新建库存目录" :width="420">
      <NkInput v-model="newName" placeholder="目录名称" />
      <template #footer>
        <NkButton variant="ghost" @click="showCreateDialog = false">取消</NkButton>
        <NkButton :disabled="!newName.trim()" :loading="saving" @click="handleCreate">确定</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="showRenameDialog" title="重命名目录" :width="420">
      <NkInput v-model="renameName" placeholder="新名称" />
      <template #footer>
        <NkButton variant="ghost" @click="showRenameDialog = false">取消</NkButton>
        <NkButton :disabled="!renameName.trim()" :loading="saving" @click="handleRename">确定</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="showDeleteDialog" title="删除目录" :width="400">
      <p>确定要删除目录 <strong>{{ deleting?.name }}</strong> 吗？此操作不可恢复。</p>
      <template #footer>
        <NkButton variant="ghost" @click="showDeleteDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="saving" @click="handleDelete">删除</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import { createInventory, deleteInventory, updateInventory } from '@/api/goodser'
import type { Inventory } from '@/types/goodser'
import { formatDate } from '../utils'

defineProps<{
  inventories: Inventory[]
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'select', inventory: Inventory): void
  (e: 'refresh'): void
}>()

const saving = ref(false)
const showCreateDialog = ref(false)
const showRenameDialog = ref(false)
const showDeleteDialog = ref(false)
const newName = ref('')
const renameName = ref('')
const deleting = ref<Inventory | null>(null)
const renaming = ref<Inventory | null>(null)

function openCreate() {
  newName.value = ''
  showCreateDialog.value = true
}

async function handleCreate() {
  const name = newName.value.trim()
  if (!name) return
  saving.value = true
  try {
    await createInventory({ name })
    NKMessage.success('新建成功')
    showCreateDialog.value = false
    emit('refresh')
  } catch (err: any) {
    NKMessage.error(err.message || '新建失败')
  } finally {
    saving.value = false
  }
}

function openRename(inv: Inventory) {
  renaming.value = inv
  renameName.value = inv.name
  showRenameDialog.value = true
}

async function handleRename() {
  if (!renaming.value || !renameName.value.trim()) return
  saving.value = true
  try {
    await updateInventory({ id: renaming.value._id, name: renameName.value.trim() })
    NKMessage.success('重命名成功')
    showRenameDialog.value = false
    emit('refresh')
  } catch (err: any) {
    NKMessage.error(err.message || '重命名失败')
  } finally {
    saving.value = false
  }
}

function openDelete(inv: Inventory) {
  deleting.value = inv
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deleting.value) return
  saving.value = true
  try {
    await deleteInventory({ id: deleting.value._id })
    NKMessage.success('删除成功')
    showDeleteDialog.value = false
    emit('refresh')
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
@use '../styles/shared';

.goodser {
  &__inventory-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: $nk-spacing-md;
  }

  &__inv-card {
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: $nk-spacing-sm;
    transition: box-shadow $nk-duration-fast;

    &:hover {
      box-shadow: $nk-shadow-md;
    }
  }

  &__inv-name {
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-900;
  }

  &__inv-meta {
    margin-top: 4px;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
  }

  &__inv-actions {
    display: flex;
    gap: $nk-spacing-xs;
  }
}
</style>
