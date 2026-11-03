<template>
  <div class="goodser__tab">
    <div class="goodser__tab-header">
      <div class="goodser__tab-heading">
        <span class="goodser__tab-title">系列视图</span>
        <span class="goodser__count">共 {{ seriesCards.length }} 个系列</span>
      </div>
      <NkButton size="sm" @click="openCreate">新建系列</NkButton>
    </div>
    <div class="goodser__product-toolbar">
      <NkSelect
        v-if="inventories.length"
        :model-value="inventoryId"
        :options="inventoryOptions"
        style="width: 200px"
        size="sm"
        @update:model-value="emit('update:inventoryId', $event)"
      />
    </div>
    <NkLoading v-if="loading" />
    <div v-else-if="!seriesCards.length" class="goodser__empty">
      <NkEmpty description="暂无系列数据，点击右上角新建系列后给商品关联系列" />
    </div>
    <div v-else class="goodser__series-grid">
      <NkCard
        v-for="s in seriesCards"
        :key="s.series_id || s.series_name"
        class="goodser__series-card"
        @click="emit('open-series', s)"
      >
        <div class="goodser__series-name">{{ s.series_name || '未命名系列' }}</div>
        <div class="goodser__series-meta">
          <span>商品 {{ s.product_count }}</span>
          <span>可用 {{ s.available }}</span>
          <span>总量 {{ s.total_quantity }}</span>
        </div>
        <div v-if="findDictionary(s)" class="goodser__series-actions" @click.stop>
          <NkButton size="xs" variant="ghost" @click="openEdit(s)">编辑</NkButton>
          <NkButton size="xs" variant="ghost" type="danger" @click="askDelete(s)">删除</NkButton>
        </div>
      </NkCard>
    </div>

    <NkDialog
      v-model:visible="showFormDialog"
      :title="editing ? '编辑系列' : '新建系列'"
      :width="440"
    >
      <div class="goodser__product-form">
        <div class="goodser__form-field">
          <label class="goodser__form-label">系列名称 *</label>
          <NkInput v-model="form.name" placeholder="例如 盗墓笔记" />
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">编码</label>
          <NkInput v-model="form.code" placeholder="留空自动生成，例如 dmbj" />
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">排序</label>
            <NkInput v-model="form.sort_order" type="number" placeholder="0" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">状态</label>
            <div style="padding-top: 6px">
              <NkCheckbox v-model="form.enabled">启用</NkCheckbox>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showFormDialog = false">取消</NkButton>
        <NkButton :loading="saving" :disabled="!form.name.trim()" @click="handleSave">保存</NkButton>
      </template>
    </NkDialog>

    <ConfirmDialog
      v-model:visible="showDeleteDialog"
      title="删除系列"
      :message="`确定删除「${deleting?.series_name || ''}」吗？仍被商品或捆引用的系列无法删除。`"
      confirm-text="删除"
      danger
      :loading="saving"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  createDictionary,
  deleteDictionary,
  loadSeriesSummary,
  updateDictionary,
} from '@/api/goodser'
import type { Dictionary, Inventory, SeriesSummary } from '@/types/goodser'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps<{
  inventoryId: string
  inventories: Inventory[]
  dictionaries: Dictionary[]
}>()

const emit = defineEmits<{
  (e: 'update:inventoryId', value: string): void
  (e: 'open-series', series: SeriesSummary): void
  (e: 'changed'): void
}>()

const seriesSummary = ref<SeriesSummary[]>([])
const loading = ref(false)
const saving = ref(false)
const showFormDialog = ref(false)
const showDeleteDialog = ref(false)
const editing = ref<Dictionary | null>(null)
const deleting = ref<SeriesSummary | null>(null)
const form = ref({ name: '', code: '', sort_order: 0, enabled: true })
let requestSeq = 0

const inventoryOptions = computed(() =>
  props.inventories.map((inv) => ({ label: inv.name, value: inv._id })),
)
const seriesDictionaries = computed(() => props.dictionaries.filter((d) => d.kind === 'series'))
const seriesCards = computed<SeriesSummary[]>(() => {
  const byID = new Map(seriesSummary.value.map((row) => [row.series_id || '', row]))
  const cards: SeriesSummary[] = seriesDictionaries.value.map((item) => {
    const row = byID.get(item._id)
    return (
      row || {
        series_id: item._id,
        series_name: item.name,
        product_count: 0,
        available: 0,
        reserved: 0,
        total_quantity: 0,
        stock_value: 0,
      }
    )
  })
  // 保留没有关联字典的历史汇总行（例如未设置系列的聚合）。
  for (const row of seriesSummary.value) {
    if (!row.series_id || !seriesDictionaries.value.some((d) => d._id === row.series_id)) {
      cards.push(row)
    }
  }
  return cards
})

function findDictionary(series: SeriesSummary) {
  if (!series.series_id) return null
  return seriesDictionaries.value.find((d) => d._id === series.series_id) || null
}

async function fetchSeriesSummary() {
  if (!props.inventoryId) return
  const seq = ++requestSeq
  loading.value = true
  try {
    const res = await loadSeriesSummary(props.inventoryId)
    if (seq !== requestSeq) return
    seriesSummary.value = res.data?.items || []
  } catch (err: any) {
    if (seq !== requestSeq) return
    seriesSummary.value = []
    NKMessage.error(err.message || '加载系列视图失败')
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { name: '', code: '', sort_order: 0, enabled: true }
  showFormDialog.value = true
}

function openEdit(series: SeriesSummary) {
  const item = findDictionary(series)
  if (!item) {
    NKMessage.warning('该系列未关联字典，无法编辑')
    return
  }
  editing.value = item
  form.value = {
    name: item.name,
    code: item.code,
    sort_order: item.sort_order,
    enabled: item.enabled,
  }
  showFormDialog.value = true
}

async function handleSave() {
  if (!form.value.name.trim()) return
  saving.value = true
  try {
    const code = form.value.code.trim() || `series_${Date.now()}`
    if (editing.value) {
      await updateDictionary({
        id: editing.value._id,
        name: form.value.name.trim(),
        code,
        parent_id: null,
        sort_order: Number(form.value.sort_order) || 0,
        enabled: form.value.enabled,
      })
      NKMessage.success('系列已更新')
    } else {
      await createDictionary({
        kind: 'series',
        name: form.value.name.trim(),
        code,
        parent_id: null,
        sort_order: Number(form.value.sort_order) || 0,
        enabled: form.value.enabled,
      })
      NKMessage.success('系列已创建')
    }
    showFormDialog.value = false
    await fetchSeriesSummary()
    emit('changed')
  } catch (err: any) {
    NKMessage.error(err.message || '保存系列失败')
  } finally {
    saving.value = false
  }
}

function askDelete(series: SeriesSummary) {
  deleting.value = series
  showDeleteDialog.value = true
}

async function handleDelete() {
  const series = deleting.value
  if (!series) return
  const item = findDictionary(series)
  if (!item) {
    NKMessage.warning('该系列未关联字典，无法删除')
    return
  }
  saving.value = true
  try {
    await deleteDictionary(item._id)
    NKMessage.success('系列已删除')
    showDeleteDialog.value = false
    deleting.value = null
    await fetchSeriesSummary()
    emit('changed')
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败，系列可能仍被商品或捆引用')
  } finally {
    saving.value = false
  }
}

watch(() => props.inventoryId, fetchSeriesSummary, { immediate: true })
</script>

<style lang="scss" scoped>
@use '../styles/shared';

.goodser {
  &__series-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: $nk-spacing-md;
  }

  &__series-card {
    cursor: pointer;
    transition: box-shadow $nk-duration-fast, border-color $nk-duration-fast;

    &:hover {
      box-shadow: $nk-shadow-md;
      border-color: $nk-color-primary-300;
    }
  }

  &__series-name {
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-900;
    font-size: $nk-font-size-base;
    margin-bottom: $nk-spacing-xs;
  }

  &__series-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px $nk-spacing-md;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
  }

  &__series-actions {
    display: flex;
    justify-content: flex-end;
    gap: $nk-spacing-xs;
    margin-top: $nk-spacing-sm;
    padding-top: $nk-spacing-xs;
    border-top: 1px dashed $nk-color-neutral-100;
  }
}
</style>
