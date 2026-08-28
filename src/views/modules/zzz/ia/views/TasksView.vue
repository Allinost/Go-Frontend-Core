<template>
  <div class="ia-tasks">
    <div class="ia-tasks__header">
      <h2 class="ia-tasks__title">手动任务</h2>
    </div>
    <div class="ia-tasks__grid">
      <NkCard v-for="t in tasks" :key="t.key" class="ia-tasks__card">
        <template #header>{{ t.label }}</template>
        <p class="ia-tasks__desc">{{ t.desc }}</p>
        <NkButton type="primary" :loading="loadingKey === t.key" @click="run(t)">立即执行</NkButton>
        <div v-if="results[t.key]" class="ia-tasks__result">
          <pre>{{ JSON.stringify(results[t.key], null, 2) }}</pre>
        </div>
      </NkCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { runAccrue, runCheckAlerts, runCheckRisk, runMaturityCheck, runRefreshFx, runSnapshot, refreshQuotes } from '@/api/ia'
import { NKMessage } from '@nkui/vue/src/utils/message'

const loadingKey = ref('')
const results = reactive<Record<string, any>>({})

const tasks = [
  { key: 'snapshot', label: '生成快照', desc: '立即生成当日组合快照（幂等覆盖）', fn: runSnapshot },
  { key: 'refresh-fx', label: '刷新汇率', desc: '拉取 CNY→USD/HKD 最新汇率', fn: runRefreshFx },
  { key: 'accrue', label: '自动计息', desc: '对存款/理财执行自动计息（幂等）', fn: runAccrue },
  { key: 'check-alerts', label: '告警检查', desc: '立即执行价格告警检查（幂等）', fn: runCheckAlerts },
  { key: 'check-risk', label: '风险巡检', desc: '执行集中度与配置偏差巡检', fn: runCheckRisk },
  { key: 'maturity-check', label: '到期提醒', desc: '检测临近到期资产并推送提醒', fn: runMaturityCheck },
  { key: 'refresh-quotes', label: '行情刷新', desc: '拉取全部持仓标的最新行情并刷新市值', fn: refreshQuotes },
]

async function run(t: typeof tasks[0]) {
  loadingKey.value = t.key
  try {
    const res = await t.fn()
    results[t.key] = res.data
    NKMessage.success(`${t.label} 已完成`)
  } catch (e: any) {
    NKMessage.error(e.message || '执行失败')
  } finally {
    loadingKey.value = ''
  }
}
</script>

<style lang="scss" scoped>
.ia-tasks {
  &__header { margin-bottom: $nk-spacing-lg; }
  &__title { font-size: $nk-font-size-xl; font-weight: $nk-font-weight-semibold; color: $nk-color-neutral-900; }
  &__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: $nk-spacing-lg; }
  &__desc { font-size: $nk-font-size-sm; color: $nk-color-neutral-500; margin: 0 0 $nk-spacing-md; }
  &__result { margin-top: $nk-spacing-md; }
  &__result pre { background: $nk-color-neutral-50; padding: $nk-spacing-sm; border-radius: $nk-radius-sm; font-size: $nk-font-size-xs; overflow: auto; max-height: 200px; }
}
</style>
