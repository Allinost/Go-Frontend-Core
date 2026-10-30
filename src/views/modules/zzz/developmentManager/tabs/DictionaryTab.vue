<template>
  <div class="dm-page">
    <div class="dm-split">
      <!-- 左：表列表 -->
      <div class="dm-card">
        <div class="dm-card__header">
          <span class="dm-card__title">数据表（{{ tables.length }}）</span>
          <NkButton size="sm" @click="openTable()">登记表</NkButton>
        </div>
        <div class="dm-filters" style="margin-bottom: 8px">
          <NkInput v-model="filters.keyword" placeholder="表名/用途" size="sm" style="flex: 1" @keyup.enter="loadTables" />
          <NkButton size="sm" variant="ghost" @click="loadTables">搜索</NkButton>
        </div>
        <NkLoading v-if="loadingTables" />
        <div v-else class="dm-section">
          <div
            v-for="t in tables"
            :key="t.id"
            class="dm-card"
            style="padding: 8px 10px; cursor: pointer"
            :style="selected?.id === t.id ? 'border-color: var(--nk-color-primary-500)' : ''"
            @click="selectTable(t)"
          >
            <div style="display: flex; justify-content: space-between; gap: 6px; align-items: center">
              <span class="dm-code">{{ t.table_name }}</span>
              <NkTag size="sm" :type="t.status === 'active' ? 'success' : t.status === 'deprecated' ? 'warning' : 'danger'">
                {{ statusLabel(t.status) }}
              </NkTag>
            </div>
            <div class="dm-muted" style="margin-top: 4px">{{ t.column_count }} 字段 · {{ t.module_name || '未标注模块' }}</div>
            <div class="dm-muted" style="margin-top: 2px">{{ t.purpose || '未填写用途' }}</div>
          </div>
          <NkEmpty v-if="!tables.length" description="暂无数据表，点击右上角登记" />
        </div>
      </div>

      <!-- 右：字段 -->
      <div class="dm-card">
        <div v-if="!selected" class="dm-table__empty">请选择左侧数据表查看字段字典</div>
        <template v-else>
          <div class="dm-card__header">
            <div>
              <span class="dm-card__title">{{ selected.table_schema }}.{{ selected.table_name }}</span>
              <div class="dm-muted">{{ selected.purpose || '未填写用途' }} · {{ selected.db_type }}</div>
            </div>
            <div class="dm-actions">
              <NkButton size="sm" variant="ghost" @click="openTable(selected)">编辑表</NkButton>
              <NkButton size="sm" variant="ghost" type="danger" @click="askConfirm(`确定删除表 ${selected.table_name} 及其全部字段吗？`, doDeleteTable)">删除表</NkButton>
              <NkButton size="sm" :loading="scanning" @click="scanImport">扫描导入</NkButton>
              <NkButton size="sm" @click="openColumn()">新增字段</NkButton>
            </div>
          </div>
          <NkLoading v-if="loadingColumns" />
          <table v-else class="dm-table">
            <thead>
              <tr>
                <th>字段</th>
                <th>类型</th>
                <th>可空</th>
                <th>默认值</th>
                <th>含义</th>
                <th>示例</th>
                <th>键</th>
                <th style="width: 130px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in columns" :key="c.id">
                <td><span class="dm-code">{{ c.column_name }}</span></td>
                <td class="dm-muted">{{ c.data_type }}</td>
                <td>{{ c.nullable ? '是' : '否' }}</td>
                <td class="dm-muted">{{ c.default_value ?? '-' }}</td>
                <td>{{ c.meaning || '-' }}</td>
                <td class="dm-muted">{{ c.example || '-' }}</td>
                <td>
                  <NkTag v-if="c.is_pk" size="sm" type="danger">PK</NkTag>
                  <NkTag v-else-if="c.is_index" size="sm" type="warning">IDX</NkTag>
                  <span v-else class="dm-muted">-</span>
                </td>
                <td>
                  <NkButton size="sm" variant="ghost" @click="openColumn(c)">编辑</NkButton>
                  <NkButton size="sm" variant="ghost" type="danger" @click="askConfirm(`确定删除字段 ${c.column_name} 吗？`, () => doDeleteColumn(c))">删除</NkButton>
                </td>
              </tr>
              <tr v-if="!columns.length && !loadingColumns">
                <td colspan="8" class="dm-table__empty">暂无字段，可手工新增或扫描导入</td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>
    </div>

    <!-- 表表单 -->
    <NkDialog v-model:visible="tableVisible" :title="editingTable ? '编辑数据表' : '登记数据表'" :width="620">
      <div class="dm-form-grid">
        <div class="dm-form-item"><span class="dm-form-label">表名 *</span><NkInput v-model="tableForm.table_name" size="sm" placeholder="zzz_xxx_table" /></div>
        <div class="dm-form-item"><span class="dm-form-label">库名（空=当前库）</span><NkInput v-model="tableForm.table_schema" size="sm" /></div>
        <div class="dm-form-item">
          <span class="dm-form-label">数据库类型</span>
          <NkSelect v-model="tableForm.db_type" :options="[{ label: 'MySQL', value: 'mysql' }, { label: 'PostgreSQL', value: 'postgres' }]" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">状态</span>
          <NkSelect v-model="tableForm.status" :options="[{ label: '使用中', value: 'active' }, { label: '已废弃', value: 'deprecated' }, { label: '已删除', value: 'dropped' }]" size="sm" />
        </div>
        <div class="dm-form-item"><span class="dm-form-label">归属模块</span><NkInput v-model="tableForm.module_name" size="sm" placeholder="developmentmanager" /></div>
        <div class="dm-form-item"><span class="dm-form-label">建表说明</span><NkInput v-model="tableForm.created_note" size="sm" /></div>
        <div class="dm-form-item dm-form-item--full"><span class="dm-form-label">表用途</span><NkTextarea v-model="tableForm.purpose" :rows="2" /></div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="tableVisible = false">取消</NkButton>
        <NkButton :loading="saving" @click="saveTable">保存</NkButton>
      </template>
    </NkDialog>

    <!-- 字段表单 -->
    <NkDialog v-model:visible="columnVisible" :title="editingColumn ? '编辑字段' : '新增字段'" :width="620">
      <div class="dm-form-grid">
        <div class="dm-form-item"><span class="dm-form-label">字段名 *</span><NkInput v-model="columnForm.column_name" size="sm" /></div>
        <div class="dm-form-item"><span class="dm-form-label">类型 *</span><NkInput v-model="columnForm.data_type" size="sm" placeholder="bigint / varchar(64)" /></div>
        <div class="dm-form-item"><span class="dm-form-label">默认值</span><NkInput v-model="columnForm.default_value" size="sm" /></div>
        <div class="dm-form-item"><span class="dm-form-label">示例值</span><NkInput v-model="columnForm.example" size="sm" /></div>
        <div class="dm-form-item">
          <span class="dm-form-label">可空</span>
          <NkSwitch v-model="columnForm.nullable" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">主键 / 索引</span>
          <div class="dm-actions">
            <NkSwitch v-model="columnForm.is_pk" size="sm" />
            <span class="dm-muted">PK</span>
            <NkSwitch v-model="columnForm.is_index" size="sm" />
            <span class="dm-muted">IDX</span>
          </div>
        </div>
        <div class="dm-form-item dm-form-item--full"><span class="dm-form-label">字段含义</span><NkTextarea v-model="columnForm.meaning" :rows="2" /></div>
        <div class="dm-form-item dm-form-item--full"><span class="dm-form-label">备注</span><NkInput v-model="columnForm.note" size="sm" /></div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="columnVisible = false">取消</NkButton>
        <NkButton :loading="saving" @click="saveColumn">保存</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="confirmVisible" title="确认操作" :width="420">
      <p>{{ confirmText }}</p>
      <template #footer>
        <NkButton variant="ghost" @click="confirmVisible = false">取消</NkButton>
        <NkButton type="danger" :loading="confirmLoading" @click="runConfirm">确认</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  listTables,
  createTable,
  updateTable,
  deleteTable,
  listColumns,
  createColumn,
  updateColumn,
  deleteColumn,
  scanImportColumns,
} from '@/api/developmentManager'
import type { Project, DBTable, DBColumn } from '@/types/developmentManager'

const props = defineProps<{ project: Project }>()

const loadingTables = ref(false)
const loadingColumns = ref(false)
const scanning = ref(false)
const saving = ref(false)
const tables = ref<DBTable[]>([])
const selected = ref<DBTable | null>(null)
const columns = ref<DBColumn[]>([])
const filters = reactive({ keyword: '' })

const statusLabels: Record<string, string> = { active: '使用中', deprecated: '已废弃', dropped: '已删除' }
function statusLabel(s: string): string {
  return statusLabels[s] || s
}

async function loadTables() {
  loadingTables.value = true
  try {
    const params: Record<string, any> = {}
    if (filters.keyword) params.keyword = filters.keyword
    const res = await listTables(props.project.id, params)
    tables.value = res.data || []
    if (selected.value) {
      selected.value = tables.value.find((t) => t.id === selected.value?.id) || null
    }
  } catch (err: any) {
    NKMessage.error(err.message || '加载数据表失败')
  } finally {
    loadingTables.value = false
  }
}

async function selectTable(t: DBTable) {
  selected.value = t
  await loadColumns()
}

async function loadColumns() {
  if (!selected.value) return
  loadingColumns.value = true
  try {
    const res = await listColumns(selected.value.id)
    columns.value = res.data || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载字段失败')
  } finally {
    loadingColumns.value = false
  }
}

// ---------- 表表单 ----------
const tableVisible = ref(false)
const editingTable = ref<DBTable | null>(null)
const tableForm = reactive({
  table_name: '',
  table_schema: '',
  db_type: 'mysql',
  status: 'active',
  module_name: '',
  created_note: '',
  purpose: '',
})

function openTable(t?: DBTable) {
  editingTable.value = t || null
  tableForm.table_name = t?.table_name || ''
  tableForm.table_schema = t?.table_schema || ''
  tableForm.db_type = t?.db_type || 'mysql'
  tableForm.status = t?.status || 'active'
  tableForm.module_name = t?.module_name || ''
  tableForm.created_note = t?.created_note || ''
  tableForm.purpose = t?.purpose || ''
  tableVisible.value = true
}

async function saveTable() {
  if (!tableForm.table_name.trim()) {
    NKMessage.warning('表名不能为空')
    return
  }
  saving.value = true
  try {
    if (editingTable.value) {
      await updateTable(editingTable.value.id, { ...tableForm })
      NKMessage.success('数据表已更新')
    } else {
      await createTable(props.project.id, { ...tableForm })
      NKMessage.success('数据表已登记')
    }
    tableVisible.value = false
    await loadTables()
  } catch (err: any) {
    NKMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function doDeleteTable() {
  if (!selected.value) return
  await deleteTable(selected.value.id)
  NKMessage.success('数据表已删除')
  selected.value = null
  columns.value = []
  await loadTables()
}

async function scanImport() {
  if (!selected.value) return
  scanning.value = true
  try {
    const res = await scanImportColumns(selected.value.id)
    const r = res.data
    NKMessage.success(`扫描完成：共 ${r.scanned} 个字段，新增 ${r.created}，更新 ${r.updated}`)
    await loadColumns()
    await loadTables()
  } catch (err: any) {
    NKMessage.error(err.message || '扫描导入失败')
  } finally {
    scanning.value = false
  }
}

// ---------- 字段表单 ----------
const columnVisible = ref(false)
const editingColumn = ref<DBColumn | null>(null)
const columnForm = reactive({
  column_name: '',
  data_type: '',
  default_value: '',
  example: '',
  nullable: true,
  is_pk: false,
  is_index: false,
  meaning: '',
  note: '',
})

function openColumn(c?: DBColumn) {
  editingColumn.value = c || null
  columnForm.column_name = c?.column_name || ''
  columnForm.data_type = c?.data_type || ''
  columnForm.default_value = c?.default_value ?? ''
  columnForm.example = c?.example || ''
  columnForm.nullable = c?.nullable ?? true
  columnForm.is_pk = c?.is_pk || false
  columnForm.is_index = c?.is_index || false
  columnForm.meaning = c?.meaning || ''
  columnForm.note = c?.note || ''
  columnVisible.value = true
}

async function saveColumn() {
  if (!columnForm.column_name.trim() || !columnForm.data_type.trim()) {
    NKMessage.warning('字段名与类型不能为空')
    return
  }
  if (!selected.value) return
  saving.value = true
  try {
    const payload = {
      column_name: columnForm.column_name.trim(),
      data_type: columnForm.data_type.trim(),
      default_value: columnForm.default_value === '' ? null : columnForm.default_value,
      example: columnForm.example.trim(),
      nullable: columnForm.nullable,
      is_pk: columnForm.is_pk,
      is_index: columnForm.is_index,
      meaning: columnForm.meaning.trim(),
      note: columnForm.note.trim(),
    }
    if (editingColumn.value) {
      await updateColumn(editingColumn.value.id, payload)
      NKMessage.success('字段已更新')
    } else {
      await createColumn(selected.value.id, payload)
      NKMessage.success('字段已新增')
    }
    columnVisible.value = false
    await loadColumns()
    await loadTables()
  } catch (err: any) {
    NKMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function doDeleteColumn(c: DBColumn) {
  await deleteColumn(c.id)
  NKMessage.success('字段已删除')
  await loadColumns()
  await loadTables()
}

// ---------- 通用确认 ----------
const confirmVisible = ref(false)
const confirmText = ref('')
const confirmLoading = ref(false)
let confirmAction: (() => Promise<void>) | null = null

function askConfirm(text: string, action: () => Promise<void>) {
  confirmText.value = text
  confirmAction = action
  confirmVisible.value = true
}

async function runConfirm() {
  if (!confirmAction) return
  confirmLoading.value = true
  try {
    await confirmAction()
    confirmVisible.value = false
  } catch (err: any) {
    NKMessage.error(err.message || '操作失败')
  } finally {
    confirmLoading.value = false
  }
}

onMounted(loadTables)
</script>
