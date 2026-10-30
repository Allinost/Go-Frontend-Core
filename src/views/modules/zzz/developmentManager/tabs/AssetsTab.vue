<template>
  <div class="dm-page">
    <div class="dm-card">
      <div class="dm-card__header">
        <span class="dm-card__title">归类资产（{{ total }}）</span>
        <NkButton size="sm" @click="openAsset">登记资产</NkButton>
      </div>
      <div class="dm-filters" style="margin-bottom: 12px">
        <NkSelect v-model="filters.category" placeholder="类别" :options="categoryOptions" clearable size="sm" style="width: 140px" />
        <NkButton size="sm" @click="search">筛选</NkButton>
        <NkButton size="sm" variant="ghost" @click="resetFilters">重置</NkButton>
      </div>

      <NkLoading v-if="loading" />
      <table v-else class="dm-table">
        <thead>
          <tr>
            <th>类别</th>
            <th>标题</th>
            <th>定位（路径/文件 ID）</th>
            <th>格式</th>
            <th>版本</th>
            <th>大小</th>
            <th>备注</th>
            <th style="width: 90px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in assets" :key="a.id">
            <td><NkTag size="sm">{{ categoryLabel(a.category) }}</NkTag></td>
            <td>{{ a.title }}</td>
            <td><span class="dm-code">{{ a.uri }}</span></td>
            <td class="dm-muted">{{ a.format || '-' }}</td>
            <td class="dm-muted">{{ a.version || '-' }}</td>
            <td class="dm-muted">{{ a.size ? formatSize(a.size) : '-' }}</td>
            <td class="dm-muted">{{ a.note || '-' }}</td>
            <td>
              <NkButton size="sm" variant="ghost" type="danger" @click="askConfirm(`确定删除资产 ${a.title} 吗？`, () => doDelete(a))">删除</NkButton>
            </td>
          </tr>
          <tr v-if="!assets.length && !loading">
            <td colspan="8" class="dm-table__empty">暂无资产索引</td>
          </tr>
        </tbody>
      </table>
      <div class="dm-pagination">
        <NkPagination v-model="page" :total="total" :page-size="pageSize" @change="loadAssets" />
      </div>
    </div>

    <NkDialog v-model:visible="formVisible" title="登记归类资产" :width="620">
      <div class="dm-form-grid">
        <div class="dm-form-item">
          <span class="dm-form-label">类别 *</span>
          <NkSelect v-model="form.category" :options="categoryOptions" size="sm" />
        </div>
        <div class="dm-form-item"><span class="dm-form-label">标题 *</span><NkInput v-model="form.title" size="sm" /></div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">定位 URI *（仓库相对路径或 fileref ID）</span>
          <NkInput v-model="form.uri" size="sm" placeholder="docs/projects/xxx/plan.md" />
        </div>
        <div class="dm-form-item"><span class="dm-form-label">格式</span><NkInput v-model="form.format" size="sm" placeholder="md / png / zip" /></div>
        <div class="dm-form-item"><span class="dm-form-label">版本</span><NkInput v-model="form.version" size="sm" /></div>
        <div class="dm-form-item"><span class="dm-form-label">大小（字节）</span><NkInput v-model.number="form.size" type="number" size="sm" /></div>
        <div class="dm-form-item"><span class="dm-form-label">备注</span><NkInput v-model="form.note" size="sm" /></div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="formVisible = false">取消</NkButton>
        <NkButton :loading="saving" @click="saveAsset">保存</NkButton>
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
import { listAssets, createAsset, deleteAsset } from '@/api/developmentManager'
import type { Project, ProjectAsset } from '@/types/developmentManager'

const props = defineProps<{ project: Project }>()

const loading = ref(false)
const saving = ref(false)
const assets = ref<ProjectAsset[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const filters = reactive({ category: '' })

const categoryOptions = [
  { label: '需求', value: 'requirement' },
  { label: '代码', value: 'code' },
  { label: '文档', value: 'doc' },
  { label: '附件资产', value: 'asset' },
]

function categoryLabel(c: string): string {
  return categoryOptions.find((o) => o.value === c)?.label || c
}

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

async function loadAssets() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, page_size: pageSize.value }
    if (filters.category) params.category = filters.category
    const res = await listAssets(props.project.id, params)
    assets.value = res.data.items || []
    total.value = res.data.total
  } catch (err: any) {
    NKMessage.error(err.message || '加载资产失败')
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  loadAssets()
}

function resetFilters() {
  filters.category = ''
  page.value = 1
  loadAssets()
}

const formVisible = ref(false)
const form = reactive({ category: 'doc', title: '', uri: '', format: '', version: '', size: 0, note: '' })

function openAsset() {
  form.category = 'doc'
  form.title = ''
  form.uri = ''
  form.format = ''
  form.version = ''
  form.size = 0
  form.note = ''
  formVisible.value = true
}

async function saveAsset() {
  if (!form.title.trim() || !form.uri.trim()) {
    NKMessage.warning('标题与定位 URI 不能为空')
    return
  }
  saving.value = true
  try {
    await createAsset(props.project.id, {
      ...form,
      title: form.title.trim(),
      uri: form.uri.trim(),
      size: Number(form.size) || 0,
    })
    NKMessage.success('资产已登记')
    formVisible.value = false
    await loadAssets()
  } catch (err: any) {
    NKMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function doDelete(a: ProjectAsset) {
  await deleteAsset(props.project.id, a.id)
  NKMessage.success('资产已删除')
  await loadAssets()
}

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

onMounted(loadAssets)
</script>
