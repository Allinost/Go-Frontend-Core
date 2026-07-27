<template>
  <div class="migrate-module">
    <h2 class="migrate-module__title">数据库迁移</h2>

    <NkTabs v-model="activeTab" :items="tabs" @change="onTabChange" />

    <div class="migrate-module__content">
      <!-- 数据迁移 tab -->
      <div v-if="activeTab === 'data-migration'">
        <NkCard class="migrate-module__card">
          <template #header>
            <div class="migrate-module__card-header">
              <span>选择表</span>
              <div class="migrate-module__card-actions">
                <NkButton size="sm" variant="ghost" @click="selectAllTables">
                  {{ selectedTables.length === tables.length ? '取消全选' : '全选' }}
                </NkButton>
              </div>
            </div>
          </template>
          <NkLoading v-if="loadingTables" />
          <div v-else>
            <div v-if="tables.length" class="migrate-module__table-list">
              <div
                v-for="table in tables"
                :key="table"
                class="migrate-module__table-item"
                :class="{ 'migrate-module__table-item--selected': selectedTables.includes(table) }"
                @click="toggleTable(table)"
              >
                <NkCheckbox :model-value="selectedTables.includes(table)" />
                <span>{{ table }}</span>
              </div>
            </div>
            <NkEmpty v-else description="未找到数据表" />
          </div>
        </NkCard>

        <NkCard class="migrate-module__card">
          <template #header>
            <div class="migrate-module__card-header">
              <span>导出数据</span>
            </div>
          </template>
          <div class="migrate-module__dump-form">
            <div class="migrate-module__form-row">
              <label class="migrate-module__form-label">格式</label>
              <NkSelect v-model="dumpFormat" :items="formatOptions" />
            </div>
            <div class="migrate-module__form-row">
              <NkCheckbox v-model="schemaOnly">仅导出结构</NkCheckbox>
            </div>
            <div class="migrate-module__form-actions">
              <NkButton :disabled="!selectedTables.length" :loading="dumping" @click="handleDump">
                导出
              </NkButton>
            </div>
          </div>
        </NkCard>

        <NkCard class="migrate-module__card">
          <template #header>
            <div class="migrate-module__card-header">
              <span>恢复导入</span>
            </div>
          </template>
          <div class="migrate-module__restore-form">
            <div class="migrate-module__form-row">
              <label class="migrate-module__form-label">文件</label>
              <div class="migrate-module__file-input">
                <NkButton size="sm" @click="triggerRestoreFileInput">选择文件</NkButton>
                <span v-if="restoreFile" class="migrate-module__file-name">{{ restoreFile.name }}</span>
                <span v-else class="migrate-module__file-placeholder">未选择文件</span>
                <input
                  ref="restoreFileInput"
                  type="file"
                  accept=".json,.sql,.csv,.gz,.zst"
                  hidden
                  @change="onRestoreFileChange"
                />
              </div>
            </div>
            <div class="migrate-module__form-row">
              <label class="migrate-module__form-label">格式</label>
              <NkSelect v-model="restoreFormat" :items="formatOptions" />
            </div>
            <div class="migrate-module__form-row">
              <NkCheckbox v-model="restoreTruncate">导入前清空表</NkCheckbox>
            </div>
            <div class="migrate-module__form-actions">
              <NkButton :disabled="!restoreFile" :loading="restoring" @click="handleRestore">
                恢复导入
              </NkButton>
            </div>
          </div>
        </NkCard>
      </div>

      <!-- 备份管理 tab -->
      <div v-if="activeTab === 'backup-management'">
        <div class="migrate-module__section-header">
          <span class="migrate-module__section-title">备份列表</span>
          <NkButton size="sm" @click="openCreateBackup">创建备份</NkButton>
        </div>

        <NkLoading v-if="loadingBackups" />
        <div v-else>
          <div v-if="backups.length" class="migrate-module__backup-list">
            <NkCard
              v-for="backup in backups"
              :key="backup.name || backup.path"
              class="migrate-module__backup-card"
            >
              <div class="migrate-module__backup-info">
                <div class="migrate-module__backup-name">{{ backup.name || backup.path?.split('/').pop() }}</div>
                <div class="migrate-module__backup-meta">
                  <span>大小: {{ formatFileSize(backup.file_size) }}</span>
                  <span>表数量: {{ backup.tables.length }}</span>
                  <span>行数: {{ backup.row_count }}</span>
                  <span>算法: {{ backup.compress_algo }}</span>
                </div>
                <div class="migrate-module__backup-meta">
                  <span>创建时间: {{ formatDate(backup.created_at) }}</span>
                  <span class="migrate-module__backup-checksum">校验: {{ backup.checksum?.slice(0, 16) }}...</span>
                </div>
              </div>
              <div class="migrate-module__backup-actions">
                <NkButton size="sm" variant="ghost" @click="handleRestoreBackup(backup)">恢复</NkButton>
                <NkButton size="sm" variant="ghost" type="danger" @click="confirmDeleteBackup(backup)">删除</NkButton>
              </div>
            </NkCard>
          </div>
          <NkEmpty v-else description="暂无备份" />
        </div>

        <NkDialog v-model:visible="showCreateDialog" title="创建备份" :width="520">
          <div class="migrate-module__dialog-form">
            <div class="migrate-module__form-row">
              <label class="migrate-module__form-label">选择表</label>
              <div class="migrate-module__backup-table-list">
                <div
                  v-for="table in tables"
                  :key="table"
                  class="migrate-module__backup-table-item"
                  @click="toggleBackupTable(table)"
                >
                  <NkCheckbox :model-value="createBackupTables.includes(table)" />
                  <span>{{ table }}</span>
                </div>
              </div>
            </div>
            <div class="migrate-module__form-row">
              <label class="migrate-module__form-label">压缩算法</label>
              <NkSelect v-model="createBackupAlgo" :items="compressOptions" />
            </div>
            <div class="migrate-module__form-row">
              <label class="migrate-module__form-label">加密密钥</label>
              <NkInput v-model="createBackupKey" placeholder="可选加密密钥" />
            </div>
          </div>
          <template #footer>
            <NkButton variant="ghost" @click="showCreateDialog = false">取消</NkButton>
            <NkButton :loading="creating" :disabled="!createBackupTables.length" @click="handleCreateBackup">创建</NkButton>
          </template>
        </NkDialog>

        <NkDialog v-model:visible="showRestoreBackupDialog" title="恢复备份" :width="420">
          <p>确定要恢复备份 <strong>{{ restoringBackupName }}</strong> 吗？当前数据可能会被覆盖。</p>
          <template #footer>
            <NkButton variant="ghost" @click="showRestoreBackupDialog = false">取消</NkButton>
            <NkButton :loading="restoringBackup" type="danger" @click="handleRestoreBackupConfirm">确认恢复</NkButton>
          </template>
        </NkDialog>

        <NkDialog v-model:visible="showDeleteDialog" title="确认删除" :width="400">
          <p>确定要删除备份 <strong>{{ deletingBackupName }}</strong> 吗？此操作不可恢复。</p>
          <template #footer>
            <NkButton variant="ghost" @click="showDeleteDialog = false">取消</NkButton>
            <NkButton :loading="deleting" type="danger" @click="handleDeleteBackup">确认删除</NkButton>
          </template>
        </NkDialog>
      </div>

      <!-- Schema 迁移 tab -->
      <div v-if="activeTab === 'schema-migration'">
        <div class="migrate-module__section-header">
          <span class="migrate-module__section-title">迁移列表</span>
          <div class="migrate-module__section-actions">
            <NkButton size="sm" variant="ghost" @click="openCreateMigration">创建迁移</NkButton>
            <NkButton size="sm" :loading="applying" @click="handleApplyMigrations">执行迁移</NkButton>
          </div>
        </div>

        <NkCard>
          <NkLoading v-if="loadingMigrations" />
          <div v-else>
            <table v-if="migrations.length" class="migrate-module__table">
              <thead>
                <tr>
                  <th>版本</th>
                  <th>名称</th>
                  <th>状态</th>
                  <th>执行时间</th>
                  <th>校验和</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in migrations" :key="m.version">
                  <td class="migrate-module__table-version">{{ m.version }}</td>
                  <td>{{ m.name }}</td>
                  <td>
                    <NkTag :type="m.applied_at ? 'success' : 'warning'" size="sm">
                      {{ m.applied_at ? '已迁移' : '待迁移' }}
                    </NkTag>
                  </td>
                  <td>{{ m.applied_at ? formatDate(m.applied_at) : '-' }}</td>
                  <td class="migrate-module__table-checksum">{{ m.checksum.slice(0, 12) }}...</td>
                </tr>
              </tbody>
            </table>
            <NkEmpty v-else description="暂无迁移记录" />
          </div>
        </NkCard>

        <NkDialog v-model:visible="showCreateMigrationDialog" title="创建迁移" :width="420">
          <div class="migrate-module__form-row">
            <label class="migrate-module__form-label">迁移名称</label>
            <NkInput v-model="newMigrationName" placeholder="例如: add_users_table" />
          </div>
          <template #footer>
            <NkButton variant="ghost" @click="showCreateMigrationDialog = false">取消</NkButton>
            <NkButton :loading="creatingMigration" :disabled="!newMigrationName.trim()" @click="handleCreateMigration">
              创建
            </NkButton>
          </template>
        </NkDialog>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  getTables,
  downloadDump,
  restoreUpload,
  createBackup,
  restoreBackup,
  listBackups,
  deleteBackup,
  listSchemaMigrations,
  applyMigrations,
  createMigration,
} from '@/api/migrate'
import type { BackupMeta } from '@/types/migrate'

const activeTab = ref('data-migration')

const tabs = [
  { label: '数据迁移', value: 'data-migration' },
  { label: '备份管理', value: 'backup-management' },
  { label: 'Schema 迁移', value: 'schema-migration' },
]

const formatOptions = [
  { label: 'JSON', value: 'json' },
  { label: 'SQL', value: 'sql' },
  { label: 'CSV', value: 'csv' },
]

const compressOptions = [
  { label: 'gzip', value: 'gzip' },
  { label: 'zstd', value: 'zstd' },
  { label: '无压缩', value: 'none' },
]

function onTabChange(value: string | number) {
  activeTab.value = value as string
  if (activeTab.value === 'backup-management') loadBackups()
  if (activeTab.value === 'schema-migration') loadMigrations()
}

// Tab 1: Data migration
const tables = ref<string[]>([])
const selectedTables = ref<string[]>([])
const loadingTables = ref(false)
const dumpFormat = ref('json')
const schemaOnly = ref(false)
const dumping = ref(false)

const restoreFile = ref<File | null>(null)
const restoreFileInput = ref<HTMLInputElement | null>(null)
const restoreFormat = ref('json')
const restoreTruncate = ref(false)
const restoring = ref(false)

async function loadTables() {
  loadingTables.value = true
  try {
    const res = await getTables()
    tables.value = res.data.tables ?? []
  } catch (err: any) {
    NKMessage.error(err.message || '加载表列表失败')
  } finally {
    loadingTables.value = false
  }
}

function toggleTable(table: string) {
  const idx = selectedTables.value.indexOf(table)
  if (idx === -1) selectedTables.value.push(table)
  else selectedTables.value.splice(idx, 1)
}

function selectAllTables() {
  if (selectedTables.value.length === tables.value.length) {
    selectedTables.value = []
  } else {
    selectedTables.value = [...tables.value]
  }
}

async function handleDump() {
  if (!selectedTables.value.length) {
    NKMessage.warning('请选择要导出的表')
    return
  }
  dumping.value = true
  try {
    await downloadDump({
      tables: selectedTables.value,
      format: dumpFormat.value as 'json' | 'sql' | 'csv',
      schema_only: schemaOnly.value,
    })
    NKMessage.success('导出成功')
  } catch (err: any) {
    NKMessage.error(err.message || '导出失败')
  } finally {
    dumping.value = false
  }
}

function triggerRestoreFileInput() {
  restoreFileInput.value?.click()
}

function onRestoreFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) restoreFile.value = input.files[0]
}

async function handleRestore() {
  if (!restoreFile.value) {
    NKMessage.warning('请选择要导入的文件')
    return
  }
  restoring.value = true
  try {
    const formData = new FormData()
    formData.append('file', restoreFile.value)
    formData.append('format', restoreFormat.value)
    formData.append('truncate', String(restoreTruncate.value))
    const result = await restoreUpload(formData)
    let msg = `恢复完成: ${result.table_count} 表, ${result.row_count} 行`
    if (result.errors?.length) msg += `, ${result.errors.length} 个错误`
    NKMessage.success(msg)
    restoreFile.value = null
    if (restoreFileInput.value) restoreFileInput.value.value = ''
  } catch (err: any) {
    NKMessage.error(err.message || '恢复失败')
  } finally {
    restoring.value = false
  }
}

// Tab 2: Backup management
const backups = ref<BackupMeta[]>([])
const loadingBackups = ref(false)

const showCreateDialog = ref(false)
const createBackupTables = ref<string[]>([])
const createBackupAlgo = ref('gzip')
const createBackupKey = ref('')
const creating = ref(false)

const showRestoreBackupDialog = ref(false)
const restoringBackup = ref(false)
const restoringBackupName = ref('')
const restoringBackupPath = ref('')

const showDeleteDialog = ref(false)
const deleting = ref(false)
const deletingBackupName = ref('')

async function loadBackups() {
  loadingBackups.value = true
  try {
    const res = await listBackups()
    backups.value = res.data.backups ?? []
  } catch (err: any) {
    NKMessage.error(err.message || '加载备份列表失败')
  } finally {
    loadingBackups.value = false
  }
}

function openCreateBackup() {
  createBackupTables.value = [...selectedTables.value]
  createBackupAlgo.value = 'gzip'
  createBackupKey.value = ''
  showCreateDialog.value = true
}

function toggleBackupTable(table: string) {
  const idx = createBackupTables.value.indexOf(table)
  if (idx === -1) createBackupTables.value.push(table)
  else createBackupTables.value.splice(idx, 1)
}

async function handleCreateBackup() {
  if (!createBackupTables.value.length) {
    NKMessage.warning('请选择要备份的表')
    return
  }
  creating.value = true
  try {
    const res = await createBackup({
      tables: createBackupTables.value,
      compress_algo: createBackupAlgo.value,
      encrypt_key: createBackupKey.value || undefined,
    })
    NKMessage.success(`备份创建成功: ${res.data.name || res.data.path}`)
    showCreateDialog.value = false
    loadBackups()
  } catch (err: any) {
    NKMessage.error(err.message || '创建备份失败')
  } finally {
    creating.value = false
  }
}

function handleRestoreBackup(backup: BackupMeta) {
  restoringBackupName.value = backup.name || backup.path?.split('/').pop() || ''
  restoringBackupPath.value = backup.path || ''
  showRestoreBackupDialog.value = true
}

async function handleRestoreBackupConfirm() {
  restoringBackup.value = true
  try {
    const result = await restoreBackup({ path: restoringBackupPath.value })
    let msg = `恢复完成: ${result.data.table_count} 表, ${result.data.row_count} 行`
    if (result.data.errors?.length) msg += `, ${result.data.errors.length} 个错误`
    NKMessage.success(msg)
    showRestoreBackupDialog.value = false
  } catch (err: any) {
    NKMessage.error(err.message || '恢复失败')
  } finally {
    restoringBackup.value = false
  }
}

function confirmDeleteBackup(backup: BackupMeta) {
  deletingBackupName.value = backup.name || backup.path?.split('/').pop() || ''
  showDeleteDialog.value = true
}

async function handleDeleteBackup() {
  deleting.value = true
  try {
    await deleteBackup(deletingBackupName.value)
    NKMessage.success('备份已删除')
    showDeleteDialog.value = false
    loadBackups()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

// Tab 3: Schema migration
const migrations = ref<any[]>([])
const loadingMigrations = ref(false)
const applying = ref(false)

const showCreateMigrationDialog = ref(false)
const newMigrationName = ref('')
const creatingMigration = ref(false)

async function loadMigrations() {
  loadingMigrations.value = true
  try {
    const res = await listSchemaMigrations()
    migrations.value = res.data ?? []
  } catch (err: any) {
    NKMessage.error(err.message || '加载迁移列表失败')
  } finally {
    loadingMigrations.value = false
  }
}

async function handleApplyMigrations() {
  applying.value = true
  try {
    const res = await applyMigrations()
    NKMessage.success(`已执行 ${res.data.applied} 个迁移: ${res.data.files.join(', ')}`)
    loadMigrations()
  } catch (err: any) {
    NKMessage.error(err.message || '执行迁移失败')
  } finally {
    applying.value = false
  }
}

function openCreateMigration() {
  newMigrationName.value = ''
  showCreateMigrationDialog.value = true
}

async function handleCreateMigration() {
  const name = newMigrationName.value.trim()
  if (!name) {
    NKMessage.warning('请输入迁移名称')
    return
  }
  creatingMigration.value = true
  try {
    const res = await createMigration(name)
    NKMessage.success(`迁移文件已创建: ${res.data.file}`)
    showCreateMigrationDialog.value = false
    loadMigrations()
  } catch (err: any) {
    NKMessage.error(err.message || '创建迁移失败')
  } finally {
    creatingMigration.value = false
  }
}

// Utilities
function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(1)} ${units[i]}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${mi}`
}

onMounted(() => {
  loadTables()
})
</script>

<style lang="scss" scoped>
.migrate-module {
  max-width: 1200px;

  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    margin-bottom: $nk-spacing-xl;
    color: $nk-color-neutral-900;
  }

  &__content {
    margin-top: $nk-spacing-lg;
  }

  &__card {
    margin-bottom: $nk-spacing-lg;
  }

  &__card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  &__card-actions {
    display: flex;
    gap: $nk-spacing-sm;
  }

  &__section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-lg;
  }

  &__section-title {
    font-size: $nk-font-size-lg;
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-900;
  }

  &__section-actions {
    display: flex;
    gap: $nk-spacing-sm;
  }

  &__table-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: $nk-spacing-xs;
  }

  &__table-item {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    padding: $nk-spacing-xs $nk-spacing-sm;
    border-radius: $nk-radius-md;
    cursor: pointer;
    transition: background $nk-duration-fast;

    &:hover {
      background: $nk-color-neutral-50;
    }

    &--selected {
      background: $nk-color-primary-50;
    }
  }

  &__dump-form,
  &__restore-form,
  &__dialog-form {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-md;
  }

  &__form-row {
    display: flex;
    align-items: center;
    gap: $nk-spacing-md;
  }

  &__form-label {
    min-width: 80px;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-600;
    flex-shrink: 0;
  }

  &__form-actions {
    display: flex;
    gap: $nk-spacing-sm;
    padding-top: $nk-spacing-sm;
  }

  &__file-input {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    flex: 1;
  }

  &__file-name {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-700;
  }

  &__file-placeholder {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-400;
  }

  &__backup-list {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-md;
  }

  &__backup-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__backup-info {
    flex: 1;
  }

  &__backup-name {
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-900;
    margin-bottom: $nk-spacing-xs;
  }

  &__backup-meta {
    display: flex;
    gap: $nk-spacing-lg;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-500;
    margin-bottom: $nk-spacing-xs;
  }

  &__backup-checksum {
    font-family: monospace;
  }

  &__backup-actions {
    display: flex;
    gap: $nk-spacing-sm;
    flex-shrink: 0;
    margin-left: $nk-spacing-lg;
  }

  &__backup-table-list {
    display: flex;
    flex-wrap: wrap;
    gap: $nk-spacing-xs;
  }

  &__backup-table-item {
    display: flex;
    align-items: center;
    gap: $nk-spacing-xs;
    padding: $nk-spacing-xs $nk-spacing-sm;
    border-radius: $nk-radius-md;
    cursor: pointer;

    &:hover {
      background: $nk-color-neutral-50;
    }
  }

  &__table {
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

  &__table-version {
    font-family: monospace;
    font-size: $nk-font-size-xs;
  }

  &__table-checksum {
    font-family: monospace;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-400;
  }
}
</style>
