<template>
  <div class="ia-assets">
    <div class="ia-assets__header">
      <h2 class="ia-assets__title">标的管理</h2>
      <NkButton type="primary" @click="openCreate">新建标的</NkButton>
    </div>
    <div class="ia-assets__filters">
      <NkInput v-model="filters.keyword" placeholder="代码/名称/发行方" size="sm" style="width: 200px" clearable @keyup.enter="load" />
      <NkSelect v-model="filters.asset_type" :options="assetTypeOptions" size="sm" clearable placeholder="类型" @change="load" />
      <NkSelect v-model="filters.market" :options="marketOptions" size="sm" clearable placeholder="市场" @change="load" />
      <NkSelect v-model="filters.status" :options="statusOptions" size="sm" clearable placeholder="状态" @change="load" />
      <NkButton size="sm" @click="load">搜索</NkButton>
    </div>
    <NkLoading v-if="loading" />
    <table v-else class="ia-assets__table">
      <thead>
        <tr>
          <th>代码</th>
          <th>名称</th>
          <th>类型</th>
          <th>市场</th>
          <th>币种</th>
          <th>发行方</th>
          <th class="text-right">年化</th>
          <th>风险</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in assets" :key="a.id">
          <td>{{ a.code }}</td>
          <td>{{ a.name }}</td>
          <td><NkTag>{{ assetTypeLabel(a.asset_type) }}</NkTag></td>
          <td>{{ marketLabel(a.market) }}</td>
          <td>{{ a.currency || '-' }}</td>
          <td>{{ a.issuer || '-' }}</td>
          <td class="text-right">{{ a.annual_rate ? (a.annual_rate * 100).toFixed(2) + '%' : '-' }}</td>
          <td>{{ a.risk_level || '-' }}</td>
          <td><NkTag :type="statusTag(a.status)">{{ statusLabel(a.status) }}</NkTag></td>
          <td>
            <div class="ia-assets__btns">
              <NkButton size="xs" @click="openEdit(a)">编辑</NkButton>
              <NkButton size="xs" type="danger" @click="handleDelete(a)">删除</NkButton>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <NkEmpty v-if="!loading && assets.length === 0" description="暂无标的" />
    <NkPagination v-if="total > pageSize" v-model="page" :total="total" :page-size="pageSize" @change="load" />

    <NkDialog v-model:visible="dialogVisible" :title="editingId ? '编辑标的' : '新建标的'" width="720px">
      <div class="ia-assets__form">
        <div class="ia-assets__row">
          <div class="ia-assets__field ia-assets__field--code">
            <label class="ia-assets__label">代码 *</label>
            <div class="ia-assets__code-row">
              <NkInput v-model="form.code" placeholder="如 600519 / 00700 / AAPL" @blur="onCodeBlur" @keyup.enter="handleResolve" />
              <NkButton :loading="resolving" :disabled="!form.code" @click="handleResolve">解析</NkButton>
            </div>
          </div>
          <div class="ia-assets__field">
            <label class="ia-assets__label">名称 *</label>
            <NkInput v-model="form.name" placeholder="名称" />
          </div>
        </div>

        <div v-if="resolved || resolving" class="ia-assets__resolve">
          <div class="ia-assets__resolve-header">
            <span class="ia-assets__resolve-title">实时行情（仅参考）</span>
            <NkTag v-if="resolveWarning" type="warning" size="sm">{{ resolveWarning }}</NkTag>
          </div>
          <div class="ia-assets__resolve-grid">
            <div class="ia-assets__resolve-item">
              <span class="ia-assets__resolve-label">最新价</span>
              <span class="ia-assets__resolve-value">{{ num(resolved?.price) }}</span>
            </div>
            <div class="ia-assets__resolve-item">
              <span class="ia-assets__resolve-label">涨跌额</span>
              <span class="ia-assets__resolve-value" :class="amtClass(resolved?.change_amt)">
                {{ signed(resolved?.change_amt) }}
              </span>
            </div>
            <div class="ia-assets__resolve-item">
              <span class="ia-assets__resolve-label">涨跌幅</span>
              <span class="ia-assets__resolve-value" :class="amtClass(resolved?.change_pct)">
                {{ pct(resolved?.change_pct) }}
              </span>
            </div>
            <div class="ia-assets__resolve-item">
              <span class="ia-assets__resolve-label">昨收</span>
              <span class="ia-assets__resolve-value">{{ num(resolved?.prev_close) }}</span>
            </div>
            <div class="ia-assets__resolve-item">
              <span class="ia-assets__resolve-label">开盘</span>
              <span class="ia-assets__resolve-value">{{ num(resolved?.open) }}</span>
            </div>
            <div class="ia-assets__resolve-item">
              <span class="ia-assets__resolve-label">最高</span>
              <span class="ia-assets__resolve-value">{{ num(resolved?.high) }}</span>
            </div>
            <div class="ia-assets__resolve-item">
              <span class="ia-assets__resolve-label">最低</span>
              <span class="ia-assets__resolve-value">{{ num(resolved?.low) }}</span>
            </div>
            <div class="ia-assets__resolve-item">
              <span class="ia-assets__resolve-label">换手率</span>
              <span class="ia-assets__resolve-value">{{ pct(resolved?.turnover_rate) }}</span>
            </div>
            <div class="ia-assets__resolve-item">
              <span class="ia-assets__resolve-label">成交量</span>
              <span class="ia-assets__resolve-value">{{ volume(resolved?.volume) }}</span>
            </div>
            <div class="ia-assets__resolve-item">
              <span class="ia-assets__resolve-label">成交额</span>
              <span class="ia-assets__resolve-value">{{ turnover(resolved?.turnover) }}</span>
            </div>
            <div class="ia-assets__resolve-item">
              <span class="ia-assets__resolve-label">涨停</span>
              <span class="ia-assets__resolve-value ia-resolve--up">{{ num(resolved?.high_limit) }}</span>
            </div>
            <div class="ia-assets__resolve-item">
              <span class="ia-assets__resolve-label">跌停</span>
              <span class="ia-assets__resolve-value ia-resolve--down">{{ num(resolved?.low_limit) }}</span>
            </div>
            <div class="ia-assets__resolve-item">
              <span class="ia-assets__resolve-label">PE(TTM)</span>
              <span class="ia-assets__resolve-value">{{ num(resolved?.pe) }}</span>
            </div>
            <div class="ia-assets__resolve-item">
              <span class="ia-assets__resolve-label">PE(动态)</span>
              <span class="ia-assets__resolve-value">{{ num(resolved?.pe_dynamic) }}</span>
            </div>
            <div class="ia-assets__resolve-item">
              <span class="ia-assets__resolve-label">总市值(亿)</span>
              <span class="ia-assets__resolve-value">{{ num(resolved?.total_mv_yi) }}</span>
            </div>
            <div class="ia-assets__resolve-item">
              <span class="ia-assets__resolve-label">流通市值(亿)</span>
              <span class="ia-assets__resolve-value">{{ num(resolved?.float_mv_yi) }}</span>
            </div>
          </div>
        </div>

        <div class="ia-assets__row">
          <div class="ia-assets__field">
            <label class="ia-assets__label">类型 *</label>
            <NkSelect v-model="form.asset_type" :options="assetTypeOptions" />
          </div>
          <div class="ia-assets__field">
            <label class="ia-assets__label">市场 *</label>
            <NkSelect v-model="form.market" :options="marketOptions" />
          </div>
        </div>
        <div class="ia-assets__row">
          <div class="ia-assets__field">
            <label class="ia-assets__label">子类型</label>
            <NkInput v-model="form.sub_type" placeholder="可选" />
          </div>
          <div class="ia-assets__field">
            <label class="ia-assets__label">币种</label>
            <NkInput v-model="form.currency" placeholder="CNY" />
          </div>
        </div>
        <div class="ia-assets__row">
          <div class="ia-assets__field">
            <label class="ia-assets__label">发行方/管理人</label>
            <NkInput v-model="form.issuer" />
          </div>
          <div class="ia-assets__field">
            <label class="ia-assets__label">风险等级</label>
            <NkSelect v-model="form.risk_level" :options="riskOptions" clearable />
          </div>
        </div>
        <div v-if="isDepositOrWealth" class="ia-assets__row">
          <div class="ia-assets__field">
            <label class="ia-assets__label">年化利率</label>
            <NkInput v-model.number="form.annual_rate" type="number" placeholder="0.025" />
          </div>
          <div class="ia-assets__field">
            <label class="ia-assets__label">封闭期(天)</label>
            <NkInput v-model.number="form.lock_days" type="number" placeholder="0" />
          </div>
        </div>
        <div v-if="isDepositOrWealth" class="ia-assets__row">
          <div class="ia-assets__field">
            <label class="ia-assets__label">起息日</label>
            <NkInput v-model="form.start_date" type="date" />
          </div>
          <div class="ia-assets__field">
            <label class="ia-assets__label">到期日</label>
            <NkInput v-model="form.maturity_date" type="date" />
          </div>
        </div>
        <div v-if="form.asset_type === 'etf'" class="ia-assets__field">
          <label class="ia-assets__label">跟踪指数代码</label>
          <NkInput v-model="form.tracking_index" placeholder="如 CSI300" />
        </div>
        <div v-if="editingId" class="ia-assets__field">
          <label class="ia-assets__label">状态</label>
          <NkSelect v-model="form.status" :options="statusOptions" />
        </div>
        <div class="ia-assets__field">
          <label class="ia-assets__label">备注</label>
          <NkTextarea v-model="form.remark" />
        </div>
      </div>
      <template #footer>
        <NkButton @click="dialogVisible = false">取消</NkButton>
        <NkButton type="primary" :loading="saving" @click="handleSave">保存</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { listAssets, createAsset, updateAsset, deleteAsset, resolveAsset } from '@/api/ia'
import type { Asset, CreateAssetReq, UpdateAssetReq, AssetResolveResp } from '@/types/ia'
import { NKMessage } from '@nkui/vue/src/utils/message'

const loading = ref(false)
const saving = ref(false)
const resolving = ref(false)
const assets = ref<Asset[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const filters = reactive({ keyword: '', asset_type: '', market: '', status: '' })

const resolved = ref<AssetResolveResp | null>(null)
const resolveWarning = ref('')
let lastResolvedCode = ''

const assetTypeOptions = [
  { label: '股票', value: 'stock' },
  { label: 'ETF', value: 'etf' },
  { label: '基金', value: 'fund' },
  { label: '存款', value: 'deposit' },
  { label: '理财', value: 'wealth' },
]
const marketOptions = [
  { label: '沪A', value: 'CN-SH' },
  { label: '深A', value: 'CN-SZ' },
  { label: '港股', value: 'HK' },
  { label: '美股', value: 'US' },
  { label: '场外', value: 'OTC' },
  { label: '银行', value: 'BANK' },
]
const riskOptions = [
  { label: 'R1', value: 'R1' },
  { label: 'R2', value: 'R2' },
  { label: 'R3', value: 'R3' },
  { label: 'R4', value: 'R4' },
  { label: 'R5', value: 'R5' },
]
const statusOptions = [
  { label: '正常', value: 'active' },
  { label: '已退市', value: 'delisted' },
  { label: '已到期', value: 'matured' },
]

const assetTypeMap: Record<string, string> = { stock: '股票', etf: 'ETF', fund: '基金', deposit: '存款', wealth: '理财' }
const marketMap: Record<string, string> = { 'CN-SH': '沪A', 'CN-SZ': '深A', HK: '港股', US: '美股', OTC: '场外', BANK: '银行' }
const statusMap: Record<string, string> = { active: '正常', delisted: '已退市', matured: '已到期' }
function assetTypeLabel(t: string) { return assetTypeMap[t] || t }
function marketLabel(m: string) { return marketMap[m] || m }
function statusLabel(s: string) { return statusMap[s] || s }
function statusTag(s: string) {
  if (s === 'active') return 'success'
  if (s === 'delisted') return 'warning'
  return 'info'
}

const dialogVisible = ref(false)
const editingId = ref('')
const form = reactive<CreateAssetReq & UpdateAssetReq>({
  code: '',
  name: '',
  asset_type: 'stock',
  market: 'CN-SH',
  sub_type: '',
  currency: 'CNY',
  issuer: '',
  risk_level: '',
  annual_rate: undefined as any,
  lock_days: undefined as any,
  start_date: '',
  maturity_date: '',
  tracking_index: '',
  remark: '',
  status: 'active',
})

const isDepositOrWealth = computed(() => form.asset_type === 'deposit' || form.asset_type === 'wealth')

async function load() {
  loading.value = true
  try {
    const res = await listAssets({
      page: page.value,
      page_size: pageSize,
      asset_type: filters.asset_type || undefined,
      market: filters.market || undefined,
      status: filters.status || undefined,
      keyword: filters.keyword || undefined,
    })
    assets.value = res.data?.items || []
    total.value = res.data?.total || 0
  } catch (e) {
    assets.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function resetResolve() {
  resolved.value = null
  resolveWarning.value = ''
  lastResolvedCode = ''
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, {
    code: '', name: '', asset_type: 'stock', market: 'CN-SH',
    sub_type: '', currency: 'CNY', issuer: '', risk_level: '',
    annual_rate: undefined, lock_days: undefined,
    start_date: '', maturity_date: '', tracking_index: '',
    remark: '', status: 'active',
  })
  resetResolve()
  dialogVisible.value = true
}

function openEdit(a: Asset) {
  editingId.value = a.id
  Object.assign(form, {
    code: a.code, name: a.name, asset_type: a.asset_type, market: a.market,
    sub_type: a.sub_type, currency: a.currency, issuer: a.issuer, risk_level: a.risk_level,
    annual_rate: a.annual_rate || undefined, lock_days: a.lock_days || undefined,
    start_date: a.start_date, maturity_date: a.maturity_date,
    tracking_index: a.tracking_index, remark: a.remark, status: a.status,
  })
  resetResolve()
  dialogVisible.value = true
}

function onCodeBlur() {
  if (form.code && form.code !== lastResolvedCode) {
    handleResolve()
  }
}

async function handleResolve() {
  if (!form.code) {
    NKMessage.error('请先输入代码')
    return
  }
  if (form.code === lastResolvedCode) return

  resolving.value = true
  try {
    const res = await resolveAsset({
      code: form.code.trim(),
      market: form.market || undefined,
    })
    const data: AssetResolveResp = res.data
    resolved.value = data
    lastResolvedCode = data.code

    if (!form.name && data.name) form.name = data.name
    if (data.market) form.market = data.market
    if (data.currency) form.currency = data.currency
    if (data.asset_type && form.asset_type === 'stock') {
      form.asset_type = data.asset_type
    }

    if (!data.name) {
      resolveWarning.value = '行情获取失败，请手动输入名称'
    } else if (!data.price) {
      resolveWarning.value = '名称已识别，但行情暂不可用'
    } else {
      resolveWarning.value = ''
    }
  } catch (e: any) {
    resolved.value = null
    lastResolvedCode = ''
    resolveWarning.value = e.message || '解析失败'
  } finally {
    resolving.value = false
  }
}

function num(v: number | undefined | null): string {
  if (v == null || v === 0) return '-'
  return v.toFixed(2)
}

function pct(v: number | undefined | null): string {
  if (v == null || v === 0) return '-'
  return (v > 0 ? '+' : '') + v.toFixed(2) + '%'
}

function signed(v: number | undefined | null): string {
  if (v == null || v === 0) return '-'
  return (v > 0 ? '+' : '') + v.toFixed(2)
}

function amtClass(v: number | undefined | null): string {
  if (v == null || v === 0) return ''
  return v > 0 ? 'ia-positive' : 'ia-negative'
}

function volume(v: number | undefined | null): string {
  if (v == null || v === 0) return '-'
  if (v >= 100000000) return (v / 100000000).toFixed(2) + '亿'
  if (v >= 10000) return (v / 10000).toFixed(2) + '万'
  return v.toString()
}

function turnover(v: number | undefined | null): string {
  if (v == null || v === 0) return '-'
  if (v >= 100000000) return (v / 100000000).toFixed(2) + '亿'
  if (v >= 10000) return (v / 10000).toFixed(2) + '万'
  return v.toFixed(0)
}

async function handleSave() {
  if (!form.code || !form.name || !form.asset_type || !form.market) {
    NKMessage.error('请填写必填项')
    return
  }
  saving.value = true
  try {
    const payload: any = { ...form }
    if (!editingId.value) delete payload.status
    if (editingId.value) {
      await updateAsset(editingId.value, payload)
      NKMessage.success('已更新')
    } else {
      await createAsset(payload)
      NKMessage.success('已创建')
    }
    dialogVisible.value = false
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '操作失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(a: Asset) {
  if (!confirm(`确定删除标的「${a.name}」？若存在持仓会失败。`)) return
  try {
    await deleteAsset(a.id)
    NKMessage.success('已删除')
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '删除失败')
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.ia-assets {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-lg;
  }
  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }
  &__filters {
    display: flex;
    gap: $nk-spacing-sm;
    margin-bottom: $nk-spacing-lg;
  }
  &__table {
    width: 100%;
    border-collapse: collapse;
    th, td {
      padding: $nk-spacing-sm $nk-spacing-md;
      border-bottom: 1px solid $nk-color-neutral-200;
      text-align: left;
      white-space: nowrap;
    }
    th {
      background: $nk-color-neutral-50;
      font-weight: $nk-font-weight-medium;
      color: $nk-color-neutral-600;
      font-size: $nk-font-size-sm;
    }
    td { color: $nk-color-neutral-800; }
    tr:hover td { background: $nk-color-neutral-50; }
    .text-right { text-align: right; }
  }
  &__btns { display: flex; gap: $nk-spacing-xs; }
  &__form { display: flex; flex-direction: column; gap: $nk-spacing-md; }
  &__row { display: flex; gap: $nk-spacing-md; & > * { flex: 1; } }
  &__field { display: flex; flex-direction: column; gap: $nk-spacing-xs; }
  &__label {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-600;
    font-weight: $nk-font-weight-medium;
  }
  &__code-row {
    display: flex;
    gap: $nk-spacing-xs;
    align-items: center;
  }
  &__resolve {
    border: 1px solid $nk-color-primary-200;
    background: color-mix(in srgb, $nk-color-primary-500 4%, white);
    border-radius: $nk-radius-md;
    padding: $nk-spacing-md;
  }
  &__resolve-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $nk-spacing-sm;
  }
  &__resolve-title {
    font-size: $nk-font-size-sm;
    color: $nk-color-primary-700;
    font-weight: $nk-font-weight-medium;
  }
  &__resolve-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: $nk-spacing-sm $nk-spacing-md;
  }
  &__resolve-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  &__resolve-label {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
  }
  &__resolve-value {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-900;
    font-weight: $nk-font-weight-medium;
    font-family: $nk-font-family-mono;
  }
}
.ia-positive { color: $nk-color-success; }
.ia-negative { color: $nk-color-error; }
.ia-resolve--up { color: $nk-color-error; }
.ia-resolve--down { color: $nk-color-success; }
</style>
