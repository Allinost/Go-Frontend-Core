<template>
  <div class="dm-page">
    <div class="dm-card">
      <div class="dm-card__header">
        <span class="dm-card__title">发布（{{ total }}）</span>
        <div class="dm-actions">
          <div class="release-view-switch">
            <NkButton size="sm" :variant="releaseView === 'list' ? 'solid' : 'ghost'" @click="setReleaseView('list')">列表</NkButton>
            <NkButton size="sm" :variant="releaseView === 'calendar' ? 'solid' : 'ghost'" @click="setReleaseView('calendar')">发布日历</NkButton>
          </div>
          <NkButton size="sm" variant="ghost" :loading="loading" @click="loadReleases">刷新</NkButton>
          <NkButton size="sm" @click="openForm()">新建发布</NkButton>
        </div>
      </div>

      <div class="dm-filters" style="margin-bottom: 12px">
        <NkSelect v-model="filters.status" :options="statusOptions" placeholder="状态" clearable size="sm" style="width: min(140px, 100%)" />
        <NkInput v-model="filters.keyword" placeholder="版本 / 名称 / 变更摘要" size="sm" style="width: min(240px, 100%)" @keyup.enter="search" />
        <NkButton size="sm" @click="search">搜索</NkButton>
        <NkButton size="sm" variant="ghost" @click="resetFilters">重置</NkButton>
      </div>

      <template v-if="releaseView === 'list'">
        <NkLoading v-if="loading" />
        <table v-else class="dm-table">
          <thead>
            <tr>
              <th>版本</th>
              <th>名称</th>
              <th>类型</th>
              <th>状态</th>
              <th>发布时间</th>
              <th>发布人</th>
              <th>变更摘要</th>
              <th style="width: 210px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in releases" :key="r.id">
              <td><span class="dm-code">{{ r.version }}</span></td>
              <td><span class="dm-link" @click="openForm(r)">{{ r.name }}</span></td>
              <td><NkTag size="sm">{{ typeLabel(r.release_type) }}</NkTag></td>
              <td>
                <NkSelect
                  :model-value="r.status"
                  :options="statusOptions"
                  size="sm"
                  style="width: min(130px, 100%)"
                  @update:model-value="changeStatus(r, $event)"
                />
              </td>
              <td class="dm-muted">{{ r.released_at ? formatTime(r.released_at) : '-' }}</td>
              <td class="dm-muted">{{ r.deployed_by || '-' }}</td>
              <td class="dm-muted dm-cell-ellipsis">{{ r.change_summary || '-' }}</td>
              <td>
                <NkButton size="sm" variant="ghost" @click="openForm(r)">编辑</NkButton>
                <NkButton size="sm" variant="ghost" type="danger" @click="remove(r)">删除</NkButton>
              </td>
            </tr>
            <tr v-if="!releases.length">
              <td colspan="8" class="dm-table__empty">暂无发布记录</td>
            </tr>
          </tbody>
        </table>
        <div class="dm-pagination">
          <NkPagination v-model="page" :total="total" :page-size="pageSize" @change="loadReleases" />
        </div>
      </template>

      <template v-else>
        <div class="release-calendar__head">
          <NkButton size="sm" variant="ghost" @click="calendarYear -= 1">上一年</NkButton>
          <span class="release-calendar__year">{{ calendarYear }} 年</span>
          <NkButton size="sm" variant="ghost" @click="calendarYear += 1">下一年</NkButton>
        </div>
        <NkLoading v-if="calendarLoading" />
        <div v-else class="release-calendar">
          <div v-for="month in calendarMonths" :key="month.month" class="release-calendar__month">
            <div class="release-calendar__month-head">
              <span>{{ month.label }}</span>
              <NkTag size="sm" type="neutral">{{ month.items.length }}</NkTag>
            </div>
            <div v-if="month.items.length === 0" class="release-calendar__empty">无发布</div>
            <div
              v-for="r in month.items"
              :key="r.id"
              class="release-calendar__item"
              :class="`release-calendar__item--${r.status}`"
              @click="openForm(r)"
            >
              <div class="release-calendar__item-version">{{ r.version }}</div>
              <div class="release-calendar__item-name">{{ r.name }}</div>
              <div class="release-calendar__item-meta">
                {{ typeLabel(r.release_type) }} · {{ releaseDay(r) }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <NkDialog v-model:visible="formVisible" :title="editingId ? '编辑发布' : '新建发布'" width="760">
      <div class="dm-form-grid">
        <div class="dm-form-item">
          <span class="dm-form-label">版本 *</span>
          <NkInput v-model="form.version" size="sm" placeholder="V3.0.0" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">名称 *</span>
          <NkInput v-model="form.name" size="sm" placeholder="发布名称" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">类型</span>
          <NkSelect v-model="form.release_type" :options="typeOptions" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">状态</span>
          <NkSelect v-model="form.status" :options="statusOptions" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">关联里程碑</span>
          <NkSelect v-model="form.milestone_id" :options="milestoneOptions" placeholder="可选" clearable size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">发布人</span>
          <NkInput v-model="form.deployed_by" size="sm" />
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">发布时间</span>
          <NkInput v-model="form.released_at" size="sm" placeholder="YYYY-MM-DD HH:MM:SS" />
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">变更摘要</span>
          <NkTextarea v-model="form.change_summary" :rows="3" placeholder="本次发布包含的变更" />
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">回滚方案</span>
          <NkTextarea v-model="form.rollback_plan" :rows="3" placeholder="回滚步骤、验证方式" />
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="formVisible = false">取消</NkButton>
        <NkButton :loading="saving" @click="save">保存</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { confirmDialog } from '@/utils/confirm'
import { computed, onMounted, reactive, ref } from 'vue'
import { NKMessage } from '@nkui/vue'
import type { Milestone, Project, Release } from '@/types/developmentManager'
import {
  createRelease,
  deleteRelease,
  listMilestones,
  listReleases,
  updateRelease,
} from '@/api/developmentManager'

const props = defineProps<{ project: Project }>()

const loading = ref(false)
const saving = ref(false)
const releases = ref<Release[]>([])
const milestones = ref<Milestone[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const filters = reactive({ status: '', keyword: '' })
const releaseView = ref<'list' | 'calendar'>('list')
const calendarYear = ref(new Date().getFullYear())
const calendarReleases = ref<Release[]>([])
const calendarLoading = ref(false)
const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

const calendarMonths = computed(() =>
  monthNames.map((label, index) => ({
    month: index + 1,
    label,
    items: calendarReleases.value
      .filter((r) => {
        const d = releaseDate(r)
        return d !== null && d.getFullYear() === calendarYear.value && d.getMonth() === index
      })
      .sort((a, b) => (releaseDate(a)?.getTime() || 0) - (releaseDate(b)?.getTime() || 0)),
  })),
)

function releaseDate(release: Release) {
  const raw = release.released_at || release.created_at
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

function releaseDay(release: Release) {
  const d = releaseDate(release)
  if (!d) return '未定'
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function setReleaseView(mode: 'list' | 'calendar') {
  releaseView.value = mode
  if (mode === 'calendar') {
    const first = calendarReleases.value.map((r) => releaseDate(r)).find((d) => d !== null)
    if (first) calendarYear.value = first.getFullYear()
    loadCalendar()
  }
}

async function loadCalendar() {
  calendarLoading.value = true
  try {
    const res = await listReleases(props.project.id, { page: 1, page_size: 100 })
    calendarReleases.value = res.data.items || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载发布日历失败')
  } finally {
    calendarLoading.value = false
  }
}

const statusOptions = [
  { label: '计划中', value: 'planned' },
  { label: '发布中', value: 'deploying' },
  { label: '已发布', value: 'deployed' },
  { label: '已回滚', value: 'rolled_back' },
]
const typeOptions = [
  { label: 'Major', value: 'major' },
  { label: 'Minor', value: 'minor' },
  { label: 'Patch', value: 'patch' },
  { label: 'Hotfix', value: 'hotfix' },
]
const milestoneOptions = computed(() =>
  milestones.value.map((m) => ({ label: `${m.version} ${m.name}`, value: m.id })),
)

const formVisible = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  version: '',
  name: '',
  release_type: 'minor',
  status: 'planned',
  released_at: '',
  change_summary: '',
  rollback_plan: '',
  deployed_by: '',
  milestone_id: '' as number | '',
})

function typeLabel(type: string) {
  const map: Record<string, string> = { major: 'Major', minor: 'Minor', patch: 'Patch', hotfix: 'Hotfix' }
  return map[type] || type
}

function formatTime(value: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function formatInput(value?: string) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 19).replace('T', ' ')
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function toRFC3339(value: string) {
  let raw = value.trim()
  if (!raw) return ''
  raw = raw.replace('T', ' ')
  if (raw.length === 10) raw += ' 00:00:00'
  if (raw.length === 16) raw += ':00'
  return raw.replace(' ', 'T')
}

async function loadReleases() {
  loading.value = true
  try {
    const res = await listReleases(props.project.id, {
      page: page.value,
      page_size: pageSize,
      status: filters.status || undefined,
      keyword: filters.keyword || undefined,
    })
    releases.value = res.data.items || []
    total.value = res.data.total || 0
  } catch (err: any) {
    NKMessage.error(err.message || '加载发布记录失败')
  } finally {
    loading.value = false
  }
}

async function loadMilestones() {
  try {
    const res = await listMilestones(props.project.id, { page: 1, page_size: 100 })
    milestones.value = res.data.items || []
  } catch {
    // 忽略选项加载失败
  }
}

function search() {
  page.value = 1
  loadReleases()
}

function resetFilters() {
  filters.status = ''
  filters.keyword = ''
  search()
}

function openForm(release?: Release) {
  editingId.value = release?.id || null
  Object.assign(form, {
    version: release?.version || '',
    name: release?.name || '',
    release_type: release?.release_type || 'minor',
    status: release?.status || 'planned',
    released_at: formatInput(release?.released_at),
    change_summary: release?.change_summary || '',
    rollback_plan: release?.rollback_plan || '',
    deployed_by: release?.deployed_by || '',
    milestone_id: release?.milestone_id || '',
  })
  formVisible.value = true
}

async function save() {
  if (!form.version.trim() || !form.name.trim()) {
    NKMessage.warning('版本和名称不能为空')
    return
  }
  saving.value = true
  const payload = {
    version: form.version.trim(),
    name: form.name.trim(),
    release_type: form.release_type,
    status: form.status,
    released_at: toRFC3339(form.released_at),
    change_summary: form.change_summary,
    rollback_plan: form.rollback_plan,
    deployed_by: form.deployed_by,
    milestone_id: form.milestone_id || undefined,
  }
  try {
    if (editingId.value) {
      await updateRelease(editingId.value, payload)
      NKMessage.success('发布已更新')
    } else {
      await createRelease(props.project.id, payload)
      NKMessage.success('发布已创建')
    }
    formVisible.value = false
    await loadReleases()
  } catch (err: any) {
    NKMessage.error(err.message || '保存发布记录失败')
  } finally {
    saving.value = false
  }
}

async function changeStatus(release: Release, status: string) {
  try {
    await updateRelease(release.id, { status })
    release.status = status
  } catch (err: any) {
    NKMessage.error(err.message || '更新状态失败')
  }
}

async function remove(release: Release) {
  if (!(await confirmDialog(`确认删除发布 ${release.version}？`))) return
  try {
    await deleteRelease(release.id)
    NKMessage.success('已删除')
    await loadReleases()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  }
}

onMounted(() => {
  loadMilestones()
  loadReleases()
})
</script>

<style scoped lang="scss">
.release-view-switch {
  display: inline-flex;
  gap: 4px;
  padding: 2px;
  border: 1px solid var(--nk-border-color, #e5e7eb);
  border-radius: 6px;
}
.release-calendar__head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 12px;
}
.release-calendar__year {
  font-size: 16px;
  font-weight: 600;
}
.release-calendar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.release-calendar__month {
  border: 1px solid var(--nk-border-color, #eee);
  border-radius: 8px;
  padding: 10px;
  min-height: 120px;
  background: var(--nk-bg-color, #fff);
}
.release-calendar__month-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
}
.release-calendar__empty {
  color: var(--nk-text-color-secondary, #bbb);
  font-size: 12px;
}
.release-calendar__item {
  border-left: 3px solid var(--nk-color-primary-500, #1677ff);
  border-radius: 4px;
  padding: 6px 8px;
  margin-bottom: 6px;
  background: var(--nk-fill-color, #f7f8fa);
  cursor: pointer;
}
.release-calendar__item--deployed {
  border-left-color: #52c41a;
}
.release-calendar__item--deploying {
  border-left-color: #1677ff;
}
.release-calendar__item--planned {
  border-left-color: #faad14;
}
.release-calendar__item--rolled_back {
  border-left-color: #f5222d;
}
.release-calendar__item-version {
  font-family: var(--nk-font-family-mono, monospace);
  font-size: 12px;
  font-weight: 600;
}
.release-calendar__item-name {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.release-calendar__item-meta {
  font-size: 11px;
  color: var(--nk-text-color-secondary, #888);
}
@include respond-to(lg) {
  .release-calendar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@include respond-to(sm) {
  .release-calendar {
    grid-template-columns: 1fr;
  }
}
</style>
