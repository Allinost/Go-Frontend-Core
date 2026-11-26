<template>
  <div class="catalogs">
    <div class="catalogs__header">
      <div>
        <h3 class="catalogs__title">谷子图鉴</h3>
        <p class="catalogs__subtitle">
          上传制品图鉴，单张可包含多个柄图；切割后的柄图会与商品图一起用于拍照识别。
        </p>
      </div>
      <div class="catalogs__actions">
        <NkButton size="sm" variant="ghost" :loading="loading" @click="load">刷新</NkButton>
        <NkButton size="sm" type="primary" @click="showCreate = true">新建图鉴</NkButton>
      </div>
    </div>

    <div class="catalogs__filters">
      <NkInput
        v-model="keyword"
        size="sm"
        placeholder="搜索标题或备注"
        clearable
        style="width: 260px"
        @keyup.enter="load"
      />
      <NkButton size="sm" variant="outline" @click="load">搜索</NkButton>
    </div>

    <NkLoading v-if="loading" text="加载图鉴…" />
    <NkEmpty v-else-if="catalogs.length === 0" description="还没有图鉴，先新建一个吧" />
    <div v-else class="catalogs__grid">
      <div v-for="item in catalogs" :key="item._id" class="catalog-card" @click="openDetail(item)">
        <div class="catalog-card__cover">
          <img v-if="item.cover_url" :src="item.cover_url" :alt="item.title" loading="lazy" />
          <span v-else>暂无封面</span>
        </div>
        <div class="catalog-card__body">
          <div class="catalog-card__title">{{ item.title }}</div>
          <div class="catalog-card__remark">{{ item.remark || '—' }}</div>
          <div class="catalog-card__meta">
            <NkTag size="sm" type="info">{{ item.image_count }} 张原图</NkTag>
            <NkTag size="sm" type="success">{{ item.item_count }} 个柄图</NkTag>
          </div>
        </div>
      </div>
    </div>

    <NkDialog v-model:visible="showCreate" title="新建图鉴" :width="460">
      <div class="catalogs__form">
        <NkInput v-model="createForm.title" label="标题" placeholder="例如：2026 冬季谷子图鉴" />
        <NkTextarea v-model="createForm.remark" label="备注" :rows="3" placeholder="可选" />
      </div>
      <template #footer>
        <NkButton variant="outline" @click="showCreate = false">取消</NkButton>
        <NkButton :loading="saving" @click="create">创建</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="showDetail" :title="detail?.title || '图鉴详情'" :width="920">
      <div v-if="detail" class="catalog-detail">
        <div class="catalog-detail__head">
          <div class="catalog-detail__remark">{{ detail.remark || '暂无备注' }}</div>
          <div class="catalog-detail__actions">
            <input ref="fileInput" type="file" accept="image/*" hidden @change="onFileChange" />
            <NkButton size="sm" variant="outline" :loading="uploading" @click="pickFile">上传原图</NkButton>
            <NkButton size="sm" variant="ghost" :loading="detailLoading" @click="reloadDetail">刷新</NkButton>
          </div>
        </div>

        <div class="catalog-detail__add-url">
          <NkInput v-model="newImageUrl" size="sm" placeholder="或粘贴图片 URL" style="flex: 1" />
          <NkButton size="sm" variant="outline" :loading="addingUrl" @click="addImageByUrl">添加</NkButton>
        </div>

        <div class="catalog-detail__section-title">原图与切割</div>
        <NkEmpty v-if="detail.images.length === 0" description="还没有上传原图" />
        <div v-else class="catalog-detail__images">
          <div v-for="image in detail.images" :key="image._id" class="catalog-image">
            <div class="catalog-image__thumb">
              <img :src="image.image_url" alt="图鉴原图" loading="lazy" />
            </div>
            <div class="catalog-image__meta">
              <NkTag size="sm" :type="cropType(image.crop_status)">{{ cropLabel(image.crop_status) }}</NkTag>
              <span v-if="image.crop_error" class="catalog-image__error">{{ image.crop_error }}</span>
            </div>
            <NkButton
              size="xs"
              variant="ghost"
              :loading="segmentingId === image._id"
              @click="segment(image)"
            >自动切割</NkButton>
          </div>
        </div>

        <div class="catalog-detail__section-title">柄图（{{ detail.items.length }}）</div>
        <NkEmpty v-if="detail.items.length === 0" description="切割后会在这里生成柄图，也可手动添加" />
        <div v-else class="catalog-detail__items">
          <div v-for="item in detail.items" :key="item._id" class="catalog-item">
            <div class="catalog-item__thumb">
              <img :src="item.thumb_url || item.image_url" alt="柄图" loading="lazy" />
            </div>
            <div class="catalog-item__body">
              <div class="catalog-item__title">{{ item.title || '未命名柄图' }}</div>
              <div class="catalog-item__product">
                {{ item.product_id ? `关联商品 ${item.product_id}` : '未关联商品' }}
              </div>
            </div>
            <div class="catalog-item__actions">
              <NkButton size="xs" variant="ghost" @click="editItem(item)">编辑</NkButton>
              <NkButton size="xs" variant="ghost" type="danger" @click="removeItem(item)">删除</NkButton>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <NkButton variant="outline" @click="showDetail = false">关闭</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { confirmDialog } from '@/utils/confirm'
import { onMounted, reactive, ref, watch } from 'vue'
import { NKMessage } from '@nkui/vue'
import {
  addCatalogImage,
  createCatalog,
  deleteCatalogItem,
  getCatalog,
  listCatalogs,
  segmentCatalogImage,
  updateCatalogItem,
  uploadCatalogImage,
} from '@/api/goodserCatalog'
import type { Catalog, CatalogDetail, CatalogImage, CatalogItem } from '@/types/goodserCatalog'

const props = defineProps<{ inventoryId?: string }>()

const catalogs = ref<Catalog[]>([])
const loading = ref(false)
const keyword = ref('')
const showCreate = ref(false)
const saving = ref(false)
const createForm = reactive({ title: '', remark: '' })
const showDetail = ref(false)
const detail = ref<CatalogDetail | null>(null)
const detailLoading = ref(false)
const uploading = ref(false)
const addingUrl = ref(false)
const newImageUrl = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const segmentingId = ref('')

async function load() {
  loading.value = true
  try {
    const res = await listCatalogs({
      inventory_id: props.inventoryId || undefined,
      keyword: keyword.value.trim() || undefined,
    })
    catalogs.value = res.data?.items || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载图鉴失败')
  } finally {
    loading.value = false
  }
}

async function create() {
  if (!createForm.title.trim()) {
    NKMessage.warning('请输入图鉴标题')
    return
  }
  saving.value = true
  try {
    await createCatalog({
      title: createForm.title.trim(),
      remark: createForm.remark.trim(),
      inventory_id: props.inventoryId || undefined,
    })
    NKMessage.success('图鉴已创建')
    showCreate.value = false
    createForm.title = ''
    createForm.remark = ''
    await load()
  } catch (err: any) {
    NKMessage.error(err.message || '创建图鉴失败')
  } finally {
    saving.value = false
  }
}

async function openDetail(item: Catalog) {
  showDetail.value = true
  await loadDetail(item._id)
}

async function loadDetail(id: string) {
  detailLoading.value = true
  try {
    const res = await getCatalog(id)
    detail.value = res.data || null
  } catch (err: any) {
    NKMessage.error(err.message || '加载图鉴详情失败')
  } finally {
    detailLoading.value = false
  }
}

async function reloadDetail() {
  if (detail.value) await loadDetail(detail.value._id)
}

function pickFile() {
  fileInput.value?.click()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !detail.value) return
  uploading.value = true
  try {
    await uploadCatalogImage(detail.value._id, file)
    NKMessage.success('原图已上传')
    await loadDetail(detail.value._id)
    await load()
  } catch (err: any) {
    NKMessage.error(err.message || '上传失败（需要启用 RustFS）')
  } finally {
    uploading.value = false
  }
}

async function addImageByUrl() {
  if (!detail.value || !newImageUrl.value.trim()) return
  addingUrl.value = true
  try {
    await addCatalogImage(detail.value._id, { image_url: newImageUrl.value.trim() })
    newImageUrl.value = ''
    await loadDetail(detail.value._id)
    await load()
  } catch (err: any) {
    NKMessage.error(err.message || '添加图片失败')
  } finally {
    addingUrl.value = false
  }
}

async function segment(image: CatalogImage) {
  segmentingId.value = image._id
  try {
    const res = await segmentCatalogImage(image._id)
    const count = res.data?.items?.length || 0
    NKMessage.success(`切割完成，新增 ${count} 个柄图`)
    if (detail.value) await loadDetail(detail.value._id)
    await load()
  } catch (err: any) {
    NKMessage.error(err.message || '切割失败，请检查视觉服务')
  } finally {
    segmentingId.value = ''
  }
}

async function editItem(item: CatalogItem) {
  const title = window.prompt('柄图标题', item.title || '')
  if (title === null) return
  const productId = window.prompt('关联商品 ID（留空取消关联）', item.product_id || '')
  if (productId === null) return
  try {
    await updateCatalogItem(item._id, { title, product_id: productId.trim() })
    if (detail.value) await loadDetail(detail.value._id)
    NKMessage.success('柄图已更新')
  } catch (err: any) {
    NKMessage.error(err.message || '更新柄图失败')
  }
}

async function removeItem(item: CatalogItem) {
  if (!(await confirmDialog('删除这个柄图？'))) return
  try {
    await deleteCatalogItem(item._id)
    if (detail.value) await loadDetail(detail.value._id)
    await load()
  } catch (err: any) {
    NKMessage.error(err.message || '删除柄图失败')
  }
}

function cropLabel(status: string) {
  if (status === 'done') return '已切割'
  if (status === 'processing') return '切割中'
  if (status === 'failed') return '切割失败'
  return '待切割'
}

function cropType(status: string): 'success' | 'danger' | 'warning' | 'info' {
  if (status === 'done') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'processing') return 'warning'
  return 'info'
}

watch(() => props.inventoryId, load)
onMounted(load)
</script>

<style scoped lang="scss">
.catalogs {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.catalogs__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.catalogs__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}
.catalogs__subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--nk-text-color-secondary, #737373);
}
.catalogs__actions {
  display: flex;
  gap: 8px;
}
.catalogs__filters {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.catalogs__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 12px;
}
.catalog-card {
  border: 1px solid var(--nk-border-color, #e5e5e5);
  border-radius: 12px;
  background: var(--nk-bg-color, #fff);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
.catalog-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px color-mix(in srgb, #0f172a 10%, transparent);
  border-color: color-mix(in srgb, var(--nk-color-primary-500, #3b82f6) 30%, transparent);
}
.catalog-card__cover {
  height: 130px;
  background: color-mix(in srgb, var(--nk-color-neutral-100, #f5f5f5) 70%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--nk-text-color-secondary, #999);
  font-size: 12px;
}
.catalog-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.catalog-card__body {
  padding: 10px 12px 12px;
}
.catalog-card__title {
  font-weight: 600;
  font-size: 14px;
  color: var(--nk-color-neutral-900, #171717);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.catalog-card__remark {
  margin-top: 3px;
  font-size: 11px;
  color: var(--nk-text-color-secondary, #737373);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.catalog-card__meta {
  margin-top: 8px;
  display: flex;
  gap: 6px;
}
.catalogs__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.catalog-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.catalog-detail__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.catalog-detail__remark {
  font-size: 12px;
  color: var(--nk-text-color-secondary, #737373);
}
.catalog-detail__actions {
  display: flex;
  gap: 8px;
}
.catalog-detail__add-url {
  display: flex;
  gap: 8px;
}
.catalog-detail__section-title {
  font-weight: 600;
  font-size: 13px;
  margin-top: 4px;
}
.catalog-detail__images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}
.catalog-image {
  border: 1px solid var(--nk-border-color, #e5e5e5);
  border-radius: 10px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.catalog-image__thumb {
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  background: color-mix(in srgb, var(--nk-color-neutral-100, #f5f5f5) 70%, transparent);
}
.catalog-image__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.catalog-image__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 11px;
}
.catalog-image__error {
  color: var(--nk-color-error, #ef4444);
}
.catalog-detail__items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
.catalog-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--nk-border-color, #e5e5e5);
  border-radius: 10px;
  padding: 8px;
}
.catalog-item__thumb {
  width: 54px;
  height: 54px;
  border-radius: 8px;
  overflow: hidden;
  background: color-mix(in srgb, var(--nk-color-neutral-100, #f5f5f5) 70%, transparent);
  flex-shrink: 0;
}
.catalog-item__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.catalog-item__body {
  flex: 1;
  min-width: 0;
}
.catalog-item__title {
  font-size: 13px;
  font-weight: 500;
  color: var(--nk-color-neutral-900, #171717);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.catalog-item__product {
  margin-top: 3px;
  font-size: 11px;
  color: var(--nk-text-color-secondary, #737373);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.catalog-item__actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
@media (max-width: 640px) {
  .catalogs__header {
    flex-direction: column;
  }
  .catalogs__grid {
    grid-template-columns: 1fr;
  }
  .catalog-detail__head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
