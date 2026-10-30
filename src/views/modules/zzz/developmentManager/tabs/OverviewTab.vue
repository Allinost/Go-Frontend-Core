<template>
  <div class="dm-page">
    <div class="dm-card">
      <div class="dm-card__header">
        <span class="dm-card__title">基本信息</span>
      </div>
      <div class="dm-form-grid">
        <div class="dm-form-item">
          <span class="dm-form-label">仓库地址</span>
          <span>{{ project.repo_url || '-' }}</span>
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">本地路径</span>
          <span class="dm-code">{{ project.repo_path || '-' }}</span>
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">默认分支</span>
          <span>{{ project.default_branch }}</span>
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">创建 / 更新</span>
          <span class="dm-muted">{{ formatTime(project.created_at) }} / {{ formatTime(project.updated_at) }}</span>
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">项目简介</span>
          <span>{{ project.description || '-' }}</span>
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">技术栈</span>
          <div v-if="project.tech_stack?.length" class="dm-tag-row">
            <NkTag v-for="t in project.tech_stack" :key="t" size="sm">{{ t }}</NkTag>
          </div>
          <span v-else class="dm-muted">-</span>
        </div>
      </div>
    </div>

    <div class="dm-card">
      <div class="dm-card__header">
        <span class="dm-card__title">项目关联</span>
        <NkButton size="sm" @click="openCreate">新增关联</NkButton>
      </div>
      <NkLoading v-if="loading" />
      <table v-else class="dm-table">
        <thead>
          <tr>
            <th>关联关系</th>
            <th>类型</th>
            <th>说明</th>
            <th style="width: 100px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in relations" :key="r.id">
            <td>
              <span class="dm-code">{{ r.from_project_key }}</span>
              <span class="dm-muted"> → </span>
              <span class="dm-code">{{ r.to_project_key }}</span>
              <div class="dm-muted">{{ r.from_project_name }} → {{ r.to_project_name }}</div>
            </td>
            <td><NkTag size="sm">{{ relationLabel(r.relation_type) }}</NkTag></td>
            <td class="dm-muted">{{ r.note || '-' }}</td>
            <td>
              <NkButton size="sm" variant="ghost" type="danger" @click="openDelete(r)">删除</NkButton>
            </td>
          </tr>
          <tr v-if="!relations.length && !loading">
            <td colspan="4" class="dm-table__empty">暂无关联</td>
          </tr>
        </tbody>
      </table>
    </div>

    <NkDialog v-model:visible="formVisible" title="新增项目关联" :width="520">
      <div class="dm-form-grid">
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">关联类型 *</span>
          <NkSelect v-model="form.relation_type" :options="relationOptions" size="sm" />
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">目标项目 *</span>
          <NkSelect v-model="form.to_project_id" :options="projectOptions" size="sm" filterable />
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">说明</span>
          <NkInput v-model="form.note" placeholder="关联用途" size="sm" />
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="formVisible = false">取消</NkButton>
        <NkButton :loading="saving" @click="saveRelation">保存</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="deleteVisible" title="删除关联" :width="420">
      <p>确定删除该关联吗？</p>
      <template #footer>
        <NkButton variant="ghost" @click="deleteVisible = false">取消</NkButton>
        <NkButton type="danger" :loading="deleting" @click="confirmDelete">确认删除</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import { listRelations, createRelation, deleteRelation, listProjects } from '@/api/developmentManager'
import type { Project, ProjectRelation } from '@/types/developmentManager'

const props = defineProps<{ project: Project }>()

const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const relations = ref<ProjectRelation[]>([])
const projectOptions = ref<{ label: string; value: number }[]>([])

const relationOptions = [
  { label: '绑定基座（uses_base）', value: 'uses_base' },
  { label: '绑定模板（uses_template）', value: 'uses_template' },
  { label: '绑定后端模块（binds_backend_module）', value: 'binds_backend_module' },
  { label: '其他关联（related）', value: 'related' },
]

function relationLabel(type: string): string {
  return relationOptions.find((o) => o.value === type)?.label.split('（')[0] || type
}

async function loadRelations() {
  loading.value = true
  try {
    const res = await listRelations(props.project.id, { page: 1, page_size: 100 })
    relations.value = res.data.items || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载关联失败')
  } finally {
    loading.value = false
  }
}

async function loadProjectOptions() {
  try {
    const res = await listProjects({ page: 1, page_size: 100 })
    projectOptions.value = (res.data.items || [])
      .filter((p: Project) => p.id !== props.project.id && !p.deleted)
      .map((p: Project) => ({ label: `${p.name} (${p.project_key})`, value: p.id }))
  } catch {
    // 忽略，下拉为空时仍可手填
  }
}

const formVisible = ref(false)
const form = reactive({ to_project_id: null as number | null, relation_type: 'uses_base', note: '' })

function openCreate() {
  form.to_project_id = null
  form.relation_type = 'uses_base'
  form.note = ''
  formVisible.value = true
}

async function saveRelation() {
  if (!form.to_project_id) {
    NKMessage.warning('请选择目标项目')
    return
  }
  saving.value = true
  try {
    await createRelation(props.project.id, {
      to_project_id: form.to_project_id,
      relation_type: form.relation_type,
      note: form.note,
    })
    NKMessage.success('关联已创建')
    formVisible.value = false
    await loadRelations()
  } catch (err: any) {
    NKMessage.error(err.message || '创建失败')
  } finally {
    saving.value = false
  }
}

const deleteVisible = ref(false)
const deletingRelation = ref<ProjectRelation | null>(null)

function openDelete(r: ProjectRelation) {
  deletingRelation.value = r
  deleteVisible.value = true
}

async function confirmDelete() {
  if (!deletingRelation.value) return
  deleting.value = true
  try {
    await deleteRelation(props.project.id, deletingRelation.value.id)
    NKMessage.success('关联已删除')
    deleteVisible.value = false
    await loadRelations()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

function formatTime(value?: string): string {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

onMounted(() => {
  loadRelations()
  loadProjectOptions()
})
</script>
