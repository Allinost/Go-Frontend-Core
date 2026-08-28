<template>
  <div class="ia-page">
    <div class="ia-page__header">
      <h2 class="ia-page__title">投资分析</h2>
    </div>
    <NkTabs v-model="activeTab" :items="tabs" />
    <div class="ia-page__content">
      <OverviewView v-if="activeTab === 'overview'" />
      <AccountsView v-else-if="activeTab === 'accounts'" />
      <AssetsView v-else-if="activeTab === 'assets'" />
      <PositionsView v-else-if="activeTab === 'positions'" />
      <TransactionsView v-else-if="activeTab === 'transactions'" />
      <CashFlowsView v-else-if="activeTab === 'cash-flows'" />
      <AllocationsView v-else-if="activeTab === 'allocations'" />
      <FeesView v-else-if="activeTab === 'fees'" />
      <FxRatesView v-else-if="activeTab === 'fx-rates'" />
      <DcaPlansView v-else-if="activeTab === 'dca'" />
      <AlertsView v-else-if="activeTab === 'alerts'" />
      <AdviceView v-else-if="activeTab === 'advice'" />
      <RiskView v-else-if="activeTab === 'risk'" />
      <EquityCurveView v-else-if="activeTab === 'equity-curve'" />
      <ReturnsView v-else-if="activeTab === 'returns'" />
      <TradesReviewView v-else-if="activeTab === 'trades-review'" />
      <DividendReportView v-else-if="activeTab === 'dividends'" />
      <FeesReportView v-else-if="activeTab === 'fees-report'" />
      <ScreenView v-else-if="activeTab === 'screen'" />
      <IndexAnalysisView v-else-if="activeTab === 'index-analysis'" />
      <ImportView v-else-if="activeTab === 'import'" />
      <TasksView v-else-if="activeTab === 'tasks'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import OverviewView from './views/OverviewView.vue'
import AccountsView from './views/AccountsView.vue'
import AssetsView from './views/AssetsView.vue'
import PositionsView from './views/PositionsView.vue'
import TransactionsView from './views/TransactionsView.vue'
import CashFlowsView from './views/CashFlowsView.vue'
import AllocationsView from './views/AllocationsView.vue'
import FeesView from './views/FeesView.vue'
import FxRatesView from './views/FxRatesView.vue'
import DcaPlansView from './views/DcaPlansView.vue'
import AlertsView from './views/AlertsView.vue'
import AdviceView from './views/AdviceView.vue'
import RiskView from './views/RiskView.vue'
import EquityCurveView from './views/EquityCurveView.vue'
import ReturnsView from './views/ReturnsView.vue'
import TradesReviewView from './views/TradesReviewView.vue'
import DividendReportView from './views/DividendReportView.vue'
import FeesReportView from './views/FeesReportView.vue'
import ScreenView from './views/ScreenView.vue'
import IndexAnalysisView from './views/IndexAnalysisView.vue'
import ImportView from './views/ImportView.vue'
import TasksView from './views/TasksView.vue'

const activeTab = ref('overview')
const tabs = [
  { label: '资产总览', value: 'overview' },
  { label: '账户管理', value: 'accounts' },
  { label: '标的管理', value: 'assets' },
  { label: '持仓列表', value: 'positions' },
  { label: '交易记录', value: 'transactions' },
  { label: '资金流水', value: 'cash-flows' },
  { label: '资产配置', value: 'allocations' },
  { label: '独立费用', value: 'fees' },
  { label: '汇率', value: 'fx-rates' },
  { label: '定投计划', value: 'dca' },
  { label: '价格告警', value: 'alerts' },
  { label: '买卖建议', value: 'advice' },
  { label: '风险指标', value: 'risk' },
  { label: '收益曲线', value: 'equity-curve' },
  { label: '收益率', value: 'returns' },
  { label: '交易复盘', value: 'trades-review' },
  { label: '分红报告', value: 'dividends' },
  { label: '费用报告', value: 'fees-report' },
  { label: '个股筛选', value: 'screen' },
  { label: '指数分析', value: 'index-analysis' },
  { label: '数据导入', value: 'import' },
  { label: '任务触发', value: 'tasks' },
]
</script>

<style lang="scss" scoped>
.ia-page {
  &__header {
    margin-bottom: $nk-spacing-lg;
  }
  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }
  &__content {
    margin-top: $nk-spacing-lg;
  }
}
</style>
