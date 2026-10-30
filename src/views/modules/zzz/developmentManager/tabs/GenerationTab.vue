<template>
  <div class="dm-page">
    <div class="dm-card">
      <div class="dm-card__header">
        <span class="dm-card__title">生成任务</span>
        <div class="dm-actions">
          <NkButton size="sm" variant="ghost" :disabled="!selectedRequirementId" :loading="loading" @click="loadGenerations">刷新</NkButton>
          <NkButton size="sm" :disabled="!selectedRequirementId" @click="openGenerate">触发生成</NkButton>
        </div>
      </div>

      <div class="dm-filters" style="margin-bottom: 12px">
        <NkSelect
          v-model="selectedRequirementId"
          placeholder="选择需求"
          :options="requirementOptions"
          filterable
          clearable
          size="sm"
          style="width: 360px"
          @change="loadGenerations"
        />
        <span class="dm-muted">方案/代码/文档；模板为主线，AI 不可用时自动降级。</span>
      </div>

      <NkLoading v-if="loading" />
      <table v-else class="dm-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>类型</th>
            <th>引擎</th>
            <th>状态</th>
            <th>产物</th>
            <th>提交</th>
            <th>时间</th>
            <th style="width: 150px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in generations" :key="g.id">
            <td>#{{ g.id }}</td>
            <td><NkTag size="sm">{{ kindLabel(g.kind) }}</NkTag></td>
            <td>
              <NkTag size="sm" :type="g.engine_used === 'ai' ? 'success' : 'default'">{{ g.engine_used || g.engine }}</NkTag>
              <div v-if="g.engine === 'ai' && g.engine_used === 'template'" class="dm-muted" style="font-size: 12px">AI 不可用，已降级</div>
            </td>
            <td>
              <NkTag size="sm" :type="g.status === 'success' ? 'success' : g.status === 'failed' ? 'danger' : 'warning'">
                {{ statusLabel(g.status) }}
              </NkTag>
            </td>
            <td>
              <div v-if="g.output_ref" class="dm-code">{{ g.output_ref }}</div>
              <div v-if="g.files?.length" class="dm-muted" style="font-size: 12px">{{ g.files.length }} 个文件</div>
              <div v-if="g.error" class="dm-error" style="font-size: 12px">{{ g.error }}</div>
            </td>
            <td class="dm-muted">
              <template v-if="g.committed">已提交<br /><span class="dm-code">{{ g.branch }}</span><br /><span class="dm-code">{{ g.commit_hash.slice(0, 8) }}</span></template>
              <span v-else>{{ g.auto_commit ? '请求但未提交' : '-' }}</span>
            </td>
            <td class="dm-muted">{{ formatTime(g.created_at) }}</td>
            <td>
              <NkButton size="sm" variant="ghost" @click="openDetail(g)">详情</NkButton>
              <NkButton
                v-if="g.status === 'failed'"
                size="sm"
                variant="ghost"
                :loading="retryingId === g.id"
                @click="retry(g)"
              >重试</NkButton>
            </td>
          </tr>
          <tr v-if="!generations.length && !loading">
            <td colspan="8" class="dm-table__empty">{{ selectedRequirementId ? '暂无生成任务' : '请先选择需求' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 触发生成 -->
    <NkDialog v-model:visible="generateVisible" title="触发生成" :width="560">
      <div class="dm-form-grid">
        <div class="dm-form-item">
          <span class="dm-form-label">生成类型 *</span>
          <NkSelect v-model="generateForm.kind" :options="kindOptions" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">引擎</span>
          <NkSelect v-model="generateForm.engine" :options="engineOptions" size="sm" />
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">补充要求</span>
          <NkTextarea v-model="generateForm.instructions" :rows="3" placeholder="可选：指定结构、接口、验收点等" />
        </div>
        <div class="dm-form-item dm-form-item--full">
          <label class="dm-muted" style="display: flex; align-items: center; gap: 8px">
            <NkSwitch v-model="generateForm.auto_commit" :disabled="generateForm.kind !== 'code'" size="sm" />
            自动提交生成产物（仅代码；需 autocommit 权限，且只在当前特性分支提交）
          </label>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="generateVisible = false">取消</NkButton>
        <NkButton :loading="generating" @click="runGenerate">开始生成</NkButton>
      </template>
    </NkDialog>

    <!-- 任务详情 -->
    <NkDialog v-model:visible="detailVisible" :title="`生成任务 #${current?.id || ''}`" :width="720">
      <template v-if="current">
        <div class="dm-form-grid">
          <div class="dm-form-item"><span class="dm-form-label">类型 / 状态</span><span>{{ kindLabel(current.kind) }} · {{ statusLabel(current.status) }}</span></div>
          <div class="dm-form-item"><span class="dm-form-label">请求 / 实际引擎</span><span>{{ current.engine }} / {{ current.engine_used || '-' }}</span></div>
          <div class="dm-form-item"><span class="dm-form-label">产物</span><span class="dm-code">{{ current.output_ref || '-' }}</span></div>
          <div class="dm-form-item"><span class="dm-form-label">自动提交</span><span>{{ current.committed ? `是（${current.branch} @ ${current.commit_hash.slice(0, 8)}）` : current.auto_commit ? '已请求，未提交' : '否' }}</span></div>
        </div>
        <div v-if="current.files?.length" style="margin-top: 12px">
          <div class="dm-form-label">生成文件</div>
          <div v-for="f in current.files" :key="f" class="dm-code" style="display: block; margin-top: 4px">{{ f }}</div>
        </div>
        <div v-if="current.error" style="margin-top: 12px">
          <div class="dm-form-label">失败/提交信息</div>
          <div class="dm-error">{{ current.error }}</div>
        </div>
        <div v-if="current.input_snapshot" style="margin-top: 12px">
          <div class="dm-form-label">输入快照</div>
          <pre class="dm-pre">{{ JSON.stringify(current.input_snapshot, null, 2) }}</pre>
        </div>
      </template>
      <template #footer>
        <NkButton variant="ghost" @click="detailVisible = false">关闭</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  listRequirements,
  listGenerations,
  createGeneration,
  retryGeneration,
} from '@/api/developmentManager'
import type { Project, Requirement, Generation } from '@/types/developmentManager'

const props = defineProps<{ project: Project }>()

const loading = ref(false)
const generating = ref(false)
const retryingId = ref<number | null>(null)
const requirements = ref<Requirement[]>([])
const selectedRequirementId = ref<number | null>(null)
const generations = ref<Generation[]>([])
const current = ref<Generation | null>(null)

const requirementOptions = computed(() =>
  requirements.value.map((r) => ({ label: `${r.code} ${r.title}`, value: r.id })),
)

const kindOptions = [
  { label: '方案 plan', value: 'plan' },
  { label: '代码 code', value: 'code' },
  { label: '文档 doc', value: 'doc' },
]
const engineOptions = [
  { label: '模板 template（默认）', value: 'template' },
  { label: 'AI（不可用自动降级）', value: 'ai' },
  { label: '手工 manual', value: 'manual' },
]

function kindLabel(kind: string): string {
  return kindOptions.find((o) => o.value === kind)?.label.split(' ')[0] || kind
}
function statusLabel(status: string): string {
  const map: Record<string, string> = { pending: '等待中', running: '执行中', success: '成功', failed: '失败' }
  return map[status] || status
}
function formatTime(value?: string): string {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

async function loadRequirements() {
  try {
    const res = await listRequirements(props.project.id, { page: 1, page_size: 100 })
    requirements.value = res.data.items || []
    if (!selectedRequirementId.value && requirements.value.length) {
      selectedRequirementId.value = requirements.value[0].id
      await loadGenerations()
    }
  } catch (err: any) {
    NKMessage.error(err.message || '加载需求失败')
  }
}

async function loadGenerations() {
  if (!selectedRequirementId.value) {
    generations.value = []
    return
  }
  loading.value = true
  try {
    const res = await listGenerations(selectedRequirementId.value)
    generations.value = res.data || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载生成任务失败')
  } finally {
    loading.value = false
  }
}

// ---------- 触发生成 ----------
const generateVisible = ref(false)
const generateForm = reactive({
  kind: 'plan',
  engine: 'template',
  auto_commit: false,
  instructions: '',
})

function openGenerate() {
  generateForm.kind = 'plan'
  generateForm.engine = 'template'
  generateForm.auto_commit = false
  generateForm.instructions = ''
  generateVisible.value = true
}

async function runGenerate() {
  if (!selectedRequirementId.value) {
    NKMessage.warning('请选择需求')
    return
  }
  generating.value = true
  try {
    const res = await createGeneration(selectedRequirementId.value, {
      kind: generateForm.kind,
      engine: generateForm.engine,
      auto_commit: generateForm.kind === 'code' ? generateForm.auto_commit : false,
      instructions: generateForm.instructions.trim(),
    })
    const g = res.data
    if (g.status === 'success') {
      NKMessage.success(`生成成功（实际引擎：${g.engine_used}）`)
    } else {
      NKMessage.error(`生成失败：${g.error || '未知错误'}`)
    }
    generateVisible.value = false
    await loadGenerations()
  } catch (err: any) {
    NKMessage.error(err.message || '触发生成失败')
  } finally {
    generating.value = false
  }
}

// ---------- 重试 / 详情 ----------
async function retry(g: Generation) {
  retryingId.value = g.id
  try {
    const res = await retryGeneration(g.id)
    const item = res.data
    if (item.status === 'success') {
      NKMessage.success('重试成功')
    } else {
      NKMessage.error(`重试失败：${item.error || '未知错误'}`)
    }
    await loadGenerations()
  } catch (err: any) {
    NKMessage.error(err.message || '重试失败')
  } finally {
    retryingId.value = null
  }
}

const detailVisible = ref(false)
function openDetail(g: Generation) {
  current.value = g
  detailVisible.value = true
}

onMounted(loadRequirements)
</script>
