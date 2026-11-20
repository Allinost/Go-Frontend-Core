<template>
  <div class="v3ins">
    <div class="v3ins-cards">
      <NkCard class="v3ins-card"><div class="v3ins-label">任务</div><div class="v3ins-value">{{ dashboard?.tasks || 0 }}</div></NkCard>
      <NkCard class="v3ins-card"><div class="v3ins-label">完成率</div><div class="v3ins-value">{{ (dashboard?.percent || 0).toFixed(1) }}%</div></NkCard>
      <NkCard class="v3ins-card"><div class="v3ins-label">进行中</div><div class="v3ins-value">{{ (dashboard?.doing || 0) + (dashboard?.review || 0) }}</div></NkCard>
      <NkCard class="v3ins-card"><div class="v3ins-label">风险</div><div class="v3ins-value">{{ dashboard?.risks_open || 0 }}</div></NkCard>
      <NkCard class="v3ins-card"><div class="v3ins-label">预估/实际</div><div class="v3ins-value">{{ dashboard?.estimate_hours || 0 }} / {{ dashboard?.actual_hours || 0 }}h</div></NkCard>
    </div>

    <NkCard class="v3ins-panel">
      <div class="v3ins-title">看板</div>
      <NkLoading v-if="loading" />
      <div v-else class="v3ins-board">
        <div v-for="col in board" :key="col.status" class="v3ins-column">
          <div class="v3ins-column-head">
            <span>{{ statusLabel(col.status) }}</span>
            <NkTag size="sm" type="neutral">{{ col.tasks.length }}</NkTag>
          </div>
          <div v-for="t in col.tasks" :key="t.id" class="v3ins-task">
            <div class="v3ins-task-code">{{ t.code }}</div>
            <div class="v3ins-task-title">{{ t.title }}</div>
            <div class="v3ins-task-meta">{{ t.priority }} · {{ t.owner || '未分配' }}</div>
          </div>
        </div>
      </div>
    </NkCard>

    <div class="v3ins-row">
      <NkCard class="v3ins-panel">
        <div class="v3ins-title">路线图</div>
        <div v-if="roadmap.length === 0" class="v3ins-muted">暂无里程碑</div>
        <div v-for="item in roadmap" :key="item.milestone.id" class="v3ins-roadmap">
          <div class="v3ins-roadmap-head">
            <strong>{{ item.milestone.version }}</strong>
            <span>{{ item.milestone.name }}</span>
            <NkTag size="sm" :type="item.milestone.status === 'done' ? 'success' : 'primary'">{{ item.milestone.status }}</NkTag>
          </div>
          <div class="v3ins-progress"><span :style="{ width: item.progress.percent + '%' }" /></div>
          <div class="v3ins-muted">{{ item.progress.done }}/{{ item.progress.total }} · {{ item.progress.percent.toFixed(1) }}%</div>
        </div>
      </NkCard>

      <NkCard class="v3ins-panel">
        <div class="v3ins-title">本周</div>
        <div class="v3ins-week">
          <div><span class="v3ins-label">新建任务</span><strong>{{ weekly?.created_tasks || 0 }}</strong></div>
          <div><span class="v3ins-label">完成任务</span><strong>{{ weekly?.done_tasks || 0 }}</strong></div>
          <div><span class="v3ins-label">工时</span><strong>{{ weekly?.log_hours || 0 }}h</strong></div>
          <div><span class="v3ins-label">新增风险</span><strong>{{ weekly?.risks_opened || 0 }}</strong></div>
          <div><span class="v3ins-label">发布</span><strong>{{ weekly?.releases || 0 }}</strong></div>
        </div>
      </NkCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import type { Project } from '@/types/developmentManager'
import type { BoardColumn, ProjectDashboard, RoadmapItem, WeeklyReport } from '@/types/developmentManager'
import { getBoard, getDashboard, getRoadmap, getWeeklyReport } from '@/api/developmentManager'

const props = defineProps<{ project: Project }>()
const loading = ref(false)
const dashboard = ref<ProjectDashboard | null>(null)
const board = ref<BoardColumn[]>([])
const roadmap = ref<RoadmapItem[]>([])
const weekly = ref<WeeklyReport | null>(null)

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    todo: '待办', doing: '进行中', blocked: '阻塞', review: '评审', done: '完成', cancelled: '取消',
  }
  return labels[status] || status
}

async function load() {
  loading.value = true
  try {
    const [d, b, r, w] = await Promise.all([
      getDashboard(props.project.id),
      getBoard(props.project.id),
      getRoadmap(props.project.id),
      getWeeklyReport(props.project.id),
    ])
    dashboard.value = d.data
    board.value = b.data.columns || []
    roadmap.value = r.data.items || []
    weekly.value = w.data
  } catch (err: any) {
    NKMessage.error(err.message || '加载看板失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.v3ins {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.v3ins-cards {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}
.v3ins-card {
  padding: 12px;
}
.v3ins-label {
  color: var(--nk-text-color-secondary, #888);
  font-size: 12px;
}
.v3ins-value {
  font-size: 22px;
  font-weight: 600;
  margin-top: 4px;
}
.v3ins-panel {
  padding: 16px;
}
.v3ins-title {
  font-weight: 600;
  margin-bottom: 12px;
}
.v3ins-board {
  display: grid;
  grid-template-columns: repeat(6, minmax(180px, 1fr));
  gap: 10px;
  overflow-x: auto;
}
.v3ins-column {
  background: var(--nk-fill-color, #f7f8fa);
  border-radius: 8px;
  padding: 8px;
  min-height: 140px;
}
.v3ins-column-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
}
.v3ins-task {
  background: var(--nk-bg-color, #fff);
  border: 1px solid var(--nk-border-color, #eee);
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 6px;
}
.v3ins-task-code {
  font-size: 11px;
  color: var(--nk-text-color-secondary, #888);
}
.v3ins-task-title {
  font-size: 13px;
  margin: 2px 0;
}
.v3ins-task-meta {
  font-size: 11px;
  color: var(--nk-text-color-secondary, #888);
}
.v3ins-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.v3ins-roadmap {
  border-bottom: 1px solid var(--nk-border-color, #eee);
  padding: 8px 0;
}
.v3ins-roadmap-head {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}
.v3ins-progress {
  height: 6px;
  border-radius: 3px;
  background: var(--nk-fill-color, #f0f0f0);
  margin: 6px 0;
  overflow: hidden;
}
.v3ins-progress span {
  display: block;
  height: 100%;
  background: var(--nk-color-primary-500, #1677ff);
}
.v3ins-week {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  font-size: 13px;
}
.v3ins-week strong {
  display: block;
  font-size: 18px;
}
.v3ins-muted {
  color: var(--nk-text-color-secondary, #888);
  font-size: 13px;
}
@media (max-width: 1100px) {
  .v3ins-cards {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .v3ins-row {
    grid-template-columns: 1fr;
  }
}
</style>
