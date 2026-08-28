<template>
  <div class="ia-import">
    <div class="ia-import__header">
      <h2 class="ia-import__title">数据导入</h2>
    </div>
    <NkCard>
      <template #header>CSV 对账单导入</template>
      <div class="ia-import__form">
        <div class="ia-import__field">
          <label class="ia-import__label">目标账户 *</label>
          <AccountSelector v-model="accountId" :clearable="false" />
        </div>
        <div class="ia-import__field">
          <label class="ia-import__label">CSV 文件</label>
          <div class="ia-import__drop" :class="{ 'ia-import__drop--over': isDragging }"
            @dragover.prevent="isDragging = true"
            @dragleave="isDragging = false"
            @drop.prevent="handleDrop"
            @click="fileInput?.click()"
          >
            <input ref="fileInput" type="file" accept=".csv" style="display: none" @change="handleFileChange" />
            <p v-if="!csvText">拖拽 CSV 文件到此处，或点击选择</p>
            <p v-else>已选择文件: {{ fileName }} ({{ csvText.split('\n').length }} 行)</p>
          </div>
        </div>
        <div class="ia-import__field">
          <label class="ia-import__label">缺失标的自动创建</label>
          <NkSelect v-model="autoCreate" :options="[{ label: '是', value: true }, { label: '否', value: false }]" />
        </div>
        <div class="ia-import__field">
          <label class="ia-import__label">自动创建默认类型</label>
          <NkInput v-model="defaultType" placeholder="如 stock / etf / fund" />
        </div>
        <NkButton type="primary" :loading="importing" :disabled="!csvText || !accountId" @click="handleImport">开始导入</NkButton>
      </div>
    </NkCard>

    <NkCard v-if="result" class="ia-import__result">
      <template #header>导入结果</template>
      <div class="ia-import__result-stats">
        <div class="ia-import__stat"><span>总行数</span><span>{{ result.total_rows }}</span></div>
        <div class="ia-import__stat ia-import__stat--success"><span>成功</span><span>{{ result.created }}</span></div>
        <div class="ia-import__stat ia-import__stat--warning"><span>重复</span><span>{{ result.duplicates }}</span></div>
        <div class="ia-import__stat ia-import__stat--error"><span>失败</span><span>{{ result.failed }}</span></div>
      </div>
      <div v-if="result.assets_added?.length" class="ia-import__tag-group">
        <span class="ia-import__tag-label">自动创建的标的:</span>
        <NkTag v-for="code in result.assets_added" :key="code" type="success">{{ code }}</NkTag>
      </div>
      <div v-if="result.errors?.length" class="ia-import__errors">
        <p>失败明细:</p>
        <div v-for="(err, i) in result.errors" :key="i" class="ia-import__error">{{ err }}</div>
      </div>
    </NkCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { importTransactions } from '@/api/ia'
import type { ImportResult } from '@/types/ia'
import { NKMessage } from '@nkui/vue/src/utils/message'
import AccountSelector from '../common/AccountSelector.vue'

const accountId = ref('')
const csvText = ref('')
const fileName = ref('')
const isDragging = ref(false)
const importing = ref(false)
const autoCreate = ref(true)
const defaultType = ref('stock')
const result = ref<ImportResult | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  readFile(file)
}

function handleDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  readFile(file)
}

function readFile(file: File) {
  fileName.value = file.name
  const reader = new FileReader()
  reader.onload = (e) => {
    csvText.value = (e.target?.result as string) || ''
  }
  reader.readAsText(file)
}

async function handleImport() {
  if (!csvText.value || !accountId.value) return
  importing.value = true
  try {
    const res = await importTransactions({
      account_id: accountId.value,
      csv: csvText.value,
      auto_create: autoCreate.value,
      default_type: defaultType.value,
    })
    result.value = res.data
    NKMessage.success('导入完成')
  } catch (e: any) {
    NKMessage.error(e.message || '导入失败')
  } finally {
    importing.value = false
  }
}
</script>

<style lang="scss" scoped>
.ia-import {
  &__header {
    margin-bottom: $nk-spacing-lg;
  }
  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }
  &__form {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-md;
  }
  &__field {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-xs;
  }
  &__label {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-600;
    font-weight: $nk-font-weight-medium;
  }
  &__drop {
    border: 2px dashed $nk-color-neutral-300;
    border-radius: $nk-radius-md;
    padding: $nk-spacing-xl;
    text-align: center;
    cursor: pointer;
    color: $nk-color-neutral-500;
    transition: all $nk-duration-fast;
    &:hover, &--over {
      border-color: $nk-color-primary-500;
      background: $nk-color-primary-50;
    }
  }
  &__result {
    margin-top: $nk-spacing-lg;
  }
  &__result-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: $nk-spacing-md;
    margin-bottom: $nk-spacing-md;
  }
  &__stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $nk-spacing-xs;
    padding: $nk-spacing-md;
    border-radius: $nk-radius-md;
    background: $nk-color-neutral-50;
    span:first-child { font-size: $nk-font-size-sm; color: $nk-color-neutral-500; }
    span:last-child { font-size: $nk-font-size-xl; font-weight: $nk-font-weight-bold; }
    &--success span:last-child { color: $nk-color-success; }
    &--warning span:last-child { color: $nk-color-warning; }
    &--error span:last-child { color: $nk-color-error; }
  }
  &__tag-group {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    flex-wrap: wrap;
  }
  &__tag-label {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-600;
  }
  &__errors {
    margin-top: $nk-spacing-md;
    p { font-size: $nk-font-size-sm; color: $nk-color-neutral-600; margin-bottom: $nk-spacing-sm; }
  }
  &__error {
    font-size: $nk-font-size-sm;
    color: $nk-color-error;
    padding: $nk-spacing-xs 0;
  }
}
</style>
