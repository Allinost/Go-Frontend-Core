<template>
  <div class="dm-page">
    <div class="dm-card">
      <div class="dm-card__header">
        <span class="dm-card__title">基线（{{ baselines.length }}）</span>
        <div class="dm-actions">
          <NkButton size="sm" variant="ghost" :loading="loading" @click="loadAll">刷新</NkButton>
          <NkButton size="sm" @click="openCreate">创建基线</NkButton>
        </div>
      </div>
      <div class="dm-muted" style="margin-bottom: 12px">
        基线会固化当前里程碑/任务的计划快照，用于后续范围与进度对比。
      </div>

      <NkLoading v-if="loading" />
      <table v-else class="dm-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>里程碑</th>
            <th>创建人</th>
            <th>创建时间</th>
            <th>备注</th>
            <th style="width: 200px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in baselines" :key="b.id">
            <td><span class="dm-link" @click="openSnapshot(b)">{{ b.name }}</span></td>
            <td>{{ b.milestone_id ? milestoneLabel(b.milestone_id) : '-' }}</td>
            <td class="dm-muted">{{ b.created_by || '-' }}</td>
            <td class="dm-muted">{{ formatTime(b.created_at) }}</td>
            <td class="dm-muted dm-cell-ellipsis">{{ b.note || '-' }}</td>
            <td>
              <NkButton size="sm" variant="ghost" @click="openSnapshot(b)">快照</NkButton>
              <NkButton size="sm" variant="ghost" type="danger" @click="remove(b)">删除</NkButton>
            </td>
          </tr>
          <tr v-if="!baselines.length">
            <td colspan="6" class="dm-table__empty">暂无基线</td>
          </tr>
        </tbody>
      </table>
    </div>

    <NkDialog v-model:visible="formVisible" title="创建基线" width="560">
      <div class="dm-form-grid">
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">名称 *</span>
          <NkInput v-model="form.name" size="sm" placeholder="V3.0 计划基线" />
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">关联里程碑</span>
          <NkSelect v-model="form.milestone_id" :options="milestoneOptions" placeholder="可选" clearable size="sm" />
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">备注</span>
          <NkTextarea v-model="form.note" :rows="3" placeholder="基线说明" />
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="formVisible = false">取消</NkButton>
        <NkButton :loading="saving" @click="save">创建</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="snapshotVisible" :title="`基线快照 · ${current?.name || ''}`" width="860">
      <pre class="dm-pre baseline-pre">{{ snapshotText }}</pre>
      <template #footer>
        <NkButton variant="ghost" @click="snapshotVisible = false">关闭</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import type { Baseline, Milestone, Project } from '@/types/developmentManager'
import {
  createBaseline,
  deleteBaseline,
  getBaseline,
  listBaselines,
  listMilestones,
} from '@/api/developmentManager'

const props = defineProps<{ project: Project }>()

const loading = ref(false)
const saving = ref(false)
const baselines = ref<Baseline[]>([])
const milestones = ref<Milestone[]>([])
const formVisible = ref(false)
const form = reactive({ name: '', note: '', milestone_id: '' as number | '' })

const snapshotVisible = ref(false)
const current = ref<Baseline | null>(null)
const snapshotText = ref('')

const milestoneOptions = computed(() =>
  milestones.value.map((m) => ({ label: `${m.version} ${m.name}`, value: m.id })),
)

function milestoneLabel(id: number) {
  const m = milestones.value.find((x) => x.id === id)
  return m ? `${m.version} ${m.name}` : `#${id}`
}

function formatTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

async function loadAll() {
  loading.value = true
  try {
    const [bs, ms] = await Promise.all([
      listBaselines(props.project.id),
      listMilestones(props.project.id, { page: 1, page_size: 100 }),
    ])
    baselines.value = bs.data.items || []
    milestones.value = ms.data.items || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载基线失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  Object.assign(form, { name: '', note: '', milestone_id: '' })
  formVisible.value = true
}

async function save() {
  if (!form.name.trim()) {
    NKMessage.warning('基线名称不能为空')
    return
  }
  saving.value = true
  try {
    await createBaseline(props.project.id, {
      name: form.name.trim(),
      note: form.note,
      milestone_id: form.milestone_id || undefined,
    })
    NKMessage.success('基线已创建')
    formVisible.value = false
    await loadAll()
  } catch (err: any) {
    NKMessage.error(err.message || '创建基线失败')
  } finally {
    saving.value = false
  }
}

async function openSnapshot(baseline: Baseline) {
  current.value = baseline
  snapshotVisible.value = true
  snapshotText.value = '加载中…'
  try {
    const res = await getBaseline(baseline.id)
    snapshotText.value = JSON.stringify(res.data.snapshot ?? res.data, null, 2)
  } catch {
    snapshotText.value = JSON.stringify(baseline.snapshot ?? baseline, null, 2)
  }
}

async function remove(baseline: Baseline) {
  if (!window.confirm(`确认删除基线「${baseline.name}」？`)) return
  try {
    await deleteBaseline(baseline.id)
    NKMessage.success('已删除')
    await loadAll()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  }
}

onMounted(loadAll)
</script>

<style scoped lang="scss">
.baseline-pre {
  max-height: 60vh;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
}
</style>
