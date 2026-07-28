<template>
  <div class="sc-create">
    <div class="sc-create__header">
      <h2 class="sc-create__title">创建商品</h2>
    </div>

    <NkCard class="sc-create__card">
      <div class="sc-create__form">
        <div class="sc-create__row">
          <div class="sc-create__field sc-create__field--half">
            <label class="sc-create__label">商品名 <span class="sc-create__required">*</span></label>
            <NkInput v-model="form.name" placeholder="自定义商品名" />
          </div>
          <div class="sc-create__field sc-create__field--half">
            <label class="sc-create__label">平台 <span class="sc-create__required">*</span></label>
            <NkSelect v-model="form.platform" :options="platformOptions" placeholder="选择平台" />
          </div>
        </div>

        <div class="sc-create__field">
          <label class="sc-create__label">商品 URL <span class="sc-create__required">*</span></label>
          <NkInput v-model="form.url" placeholder="商品页完整 URL" />
        </div>

        <div class="sc-create__row">
          <div class="sc-create__field sc-create__field--half">
            <label class="sc-create__label">目标价</label>
            <NkInput v-model.number="form.target_price" type="number" placeholder="0=不限制" />
          </div>
          <div class="sc-create__field sc-create__field--half">
            <label class="sc-create__label">降价比例（%）</label>
            <NkInput v-model.number="form.price_drop_ratio" type="number" placeholder="0=不限制" />
          </div>
        </div>

        <div class="sc-create__row">
          <div class="sc-create__field sc-create__field--half">
            <label class="sc-create__label">检查周期</label>
            <NkSelect v-model="form.check_interval" :options="intervalOptions" placeholder="1h" />
          </div>
          <div class="sc-create__field sc-create__field--half">
            <label class="sc-create__label">Cron 表达式</label>
            <NkInput v-model="form.cron_expr" placeholder="优先级高于检查周期" />
          </div>
        </div>

        <div class="sc-create__field">
          <label class="sc-create__label">专属 Webhook</label>
          <NkSelect v-model="form.custom_webhook_ids" :options="webhookOptions" multiple placeholder="不选则使用默认标签" />
        </div>

        <div class="sc-create__field">
          <label class="sc-create__label">备注</label>
          <NkInput v-model="form.remark" type="textarea" :rows="3" placeholder="备注信息" />
        </div>

        <div class="sc-create__actions">
          <NkButton variant="ghost" @click="$router.push('/modules/zzz/shopchecker/products')">取消</NkButton>
          <NkButton :loading="saving" :disabled="!form.name || !form.platform || !form.url" @click="handleSave">创建</NkButton>
        </div>
      </div>
    </NkCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { createProduct } from '@/api/shopchecker'
import { listConfigs } from '@/api/webhook'
import type { WebhookConfig } from '@/types/webhook'
import { NKMessage } from '@nkui/vue/src/utils/message'

const router = useRouter()

const form = reactive({
  name: '',
  platform: '' as string,
  url: '',
  target_price: 0,
  price_drop_ratio: 0,
  check_interval: '1h',
  cron_expr: '',
  custom_webhook_ids: [] as string[],
  remark: '',
})

const platformOptions = [
  { label: '京东', value: 'jd' },
  { label: '淘宝', value: 'taobao' },
  { label: '拼多多', value: 'pdd' },
]

const intervalOptions = [
  { label: '30 分钟', value: '30m' },
  { label: '1 小时', value: '1h' },
  { label: '2 小时', value: '2h' },
  { label: '3 小时', value: '3h' },
  { label: '4 小时', value: '4h' },
  { label: '6 小时', value: '6h' },
  { label: '1 天', value: '1d' },
  { label: '7 天', value: '7d' },
]

const webhookOptions = ref<{ label: string; value: string }[]>([])
const saving = ref(false)

async function loadWebhooks() {
  try {
    const res = await listConfigs({ page_size: 200 })
    webhookOptions.value = res.data.items.map((w: WebhookConfig) => ({ label: w.name, value: w._id }))
  } catch {
    // webhook 加载失败不阻塞创建
  }
}

async function handleSave() {
  saving.value = true
  try {
    const payload: any = { ...form }
    if (!payload.target_price) delete payload.target_price
    if (!payload.price_drop_ratio) delete payload.price_drop_ratio
    if (!payload.cron_expr) delete payload.cron_expr
    if (!payload.custom_webhook_ids?.length) delete payload.custom_webhook_ids
    if (!payload.remark) delete payload.remark

    await createProduct(payload)
    NKMessage.success('创建成功')
    router.push('/modules/zzz/shopchecker/products')
  } catch (err: any) {
    NKMessage.error(err.message || '创建失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadWebhooks)
</script>

<style lang="scss" scoped>
.sc-create {
  &__header {
    margin-bottom: $nk-spacing-lg;
  }
  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }
  &__card {
    padding: $nk-spacing-xl;
  }
  &__form {
    max-width: 720px;
  }
  &__row {
    display: flex;
    gap: $nk-spacing-lg;
  }
  &__field {
    margin-bottom: $nk-spacing-lg;
    flex: 1;
    &--half { flex: 0 0 calc(50% - #{$nk-spacing-lg} / 2); }
  }
  &__label {
    display: block;
    font-size: $nk-font-size-sm;
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-700;
    margin-bottom: $nk-spacing-xs;
  }
  &__required {
    color: $nk-color-error;
  }
  &__actions {
    display: flex;
    gap: $nk-spacing-sm;
    justify-content: flex-end;
    margin-top: $nk-spacing-xl;
    padding-top: $nk-spacing-lg;
    border-top: 1px solid $nk-color-neutral-200;
  }
}
</style>