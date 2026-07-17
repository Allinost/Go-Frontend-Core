<template>
  <div class="storage-mgmt">
    <h2 class="storage-mgmt__title">文件存储管理</h2>

    <div class="storage-mgmt__backends">
      <NkCard v-for="backend in backends" :key="backend.name" class="storage-mgmt__backend-card">
        <div class="storage-mgmt__backend-info">
          <NkIcon :name="backend.type === 'minio' ? 'cloud' : 'server'" size="lg" class="storage-mgmt__backend-icon" />
          <div>
            <div class="storage-mgmt__backend-name">{{ backend.name }}</div>
            <div class="storage-mgmt__backend-type">{{ backend.type === 'minio' ? 'MinIO' : 'RustFS' }}</div>
          </div>
        </div>
        <div class="storage-mgmt__backend-meta">
          <span class="storage-mgmt__backend-endpoint">{{ backend.endpoint }}</span>
          <span class="storage-mgmt__backend-bucket">{{ backend.bucket }}</span>
        </div>
        <NkTag :type="backend.enabled ? 'success' : 'danger'" size="sm">
          {{ backend.enabled ? '已连接' : '未连接' }}
        </NkTag>
      </NkCard>
      <NkCard v-if="!backends.length && !loadingBackends" class="storage-mgmt__backend-card">
        <NkEmpty description="未配置存储后端" />
      </NkCard>
      <NkCard v-if="loadingBackends" class="storage-mgmt__backend-card">
        <NkLoading />
      </NkCard>
    </div>

    <NkCard class="storage-mgmt__browser">
      <template #header>
        <div class="storage-mgmt__browser-header">
          <div class="storage-mgmt__browser-path">
            <NkSelect
              v-if="backends.length"
              v-model="selectedBackend"
              :options="backendOptions"
              style="width: 180px"
              size="sm"
              @change="onBackendChange"
            />
            <span class="storage-mgmt__path-separator">/</span>
            <span
              v-for="(part, idx) in pathParts"
              :key="idx"
              class="storage-mgmt__path-part"
              :class="{ 'storage-mgmt__path-part--active': idx === pathParts.length - 1 }"
              @click="navigateToPart(idx)"
            >
              {{ part }}
            </span>
            <span v-if="!currentPrefix && selectedBackend" class="storage-mgmt__path-root">根目录</span>
          </div>
          <div class="storage-mgmt__browser-actions">
            <NkButton size="sm" @click="showUploadDialog = true">上传文件</NkButton>
          </div>
        </div>
      </template>

      <NkLoading v-if="loadingFiles" />

      <div v-else-if="!selectedBackend" class="storage-mgmt__select-hint">
        <NkEmpty description="请先选择一个存储后端" />
      </div>

      <div v-else-if="!files.length" class="storage-mgmt__empty">
        <NkEmpty description="暂无文件" />
      </div>

      <div v-else class="storage-mgmt__file-grid">
        <div
          v-for="file in files"
          :key="file.name"
          class="storage-mgmt__file-card"
        >
          <div class="storage-mgmt__file-icon">
            <NkIcon :name="isDir(file) ? 'folder' : 'file'" size="lg" />
          </div>
          <div class="storage-mgmt__file-name" :title="file.name">{{ file.name }}</div>
          <div class="storage-mgmt__file-meta">
            <span v-if="!isDir(file)" class="storage-mgmt__file-size">{{ formatSize(file.size) }}</span>
            <span class="storage-mgmt__file-time">{{ formatDate(file.last_modified) }}</span>
          </div>
          <div class="storage-mgmt__file-actions">
            <NkButton
              v-if="isDir(file)"
              size="xs"
              variant="ghost"
              @click="enterDir(file)"
            >打开</NkButton>
            <NkButton
              v-else
              size="xs"
              variant="ghost"
              type="danger"
              @click="confirmDeleteFile(file)"
            >删除</NkButton>
          </div>
        </div>
      </div>
    </NkCard>

    <NkDialog v-model:visible="showUploadDialog" title="上传文件" :width="480">
      <div class="storage-mgmt__upload-form">
        <div class="storage-mgmt__upload-field">
          <label class="storage-mgmt__upload-label">存储后端</label>
          <NkSelect
            v-model="uploadBackend"
            :options="backendOptions"
            style="width: 100%"
          />
        </div>
        <div class="storage-mgmt__upload-field">
          <label class="storage-mgmt__upload-label">存储路径</label>
          <NkInput v-model="uploadPath" placeholder="例如 /images/logo.png" />
        </div>
        <div class="storage-mgmt__upload-field">
          <label class="storage-mgmt__upload-label">选择文件</label>
          <input type="file" @change="onFileSelect" />
        </div>
        <div v-if="uploadProgress > 0 && uploadProgress < 100" class="storage-mgmt__upload-progress">
          <NkProgress :percent="uploadProgress" />
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showUploadDialog = false">取消</NkButton>
        <NkButton :loading="uploading" :disabled="!selectedFile || !uploadPath" @click="handleUpload">上传</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="showDeleteDialog" title="确认删除" :width="400">
      <p>确定要删除文件 <strong>{{ deletingFile?.name }}</strong> 吗？此操作不可恢复。</p>
      <template #footer>
        <NkButton variant="ghost" @click="showDeleteDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="deleting" @click="handleDelete">确认删除</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { listStorageBackends, listFiles, uploadFile, deleteFile } from '@/api/storage'
import type { StorageBackend, FileItem } from '@/api/storage'
import { NKMessage } from '@nkui/vue/src/utils/message'

const backends = ref<StorageBackend[]>([])
const loadingBackends = ref(false)
const selectedBackend = ref('')
const files = ref<FileItem[]>([])
const loadingFiles = ref(false)
const currentPrefix = ref('')

const showUploadDialog = ref(false)
const uploadBackend = ref('')
const uploadPath = ref('')
const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const uploadProgress = ref(0)

const showDeleteDialog = ref(false)
const deleting = ref(false)
const deletingFile = ref<FileItem | null>(null)

const backendOptions = computed(() =>
  backends.value.map((b) => ({ label: `${b.name} (${b.type === 'minio' ? 'MinIO' : 'RustFS'})`, value: b.name })),
)

const pathParts = computed(() => {
  if (!currentPrefix.value) return []
  return currentPrefix.value.split('/').filter(Boolean)
})

function isDir(file: FileItem): boolean {
  return file.content_type === 'directory' || file.size === 0 && !file.name.includes('.')
}

function formatSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(1)} ${units[i]}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function loadBackends() {
  loadingBackends.value = true
  try {
    const res = await listStorageBackends()
    backends.value = res.data
    if (backends.value.length > 0 && !selectedBackend.value) {
      selectedBackend.value = backends.value[0].name
      uploadBackend.value = selectedBackend.value
      loadFiles()
    }
  } catch (err: any) {
    NKMessage.error(err.message || '加载存储后端失败')
  } finally {
    loadingBackends.value = false
  }
}

async function loadFiles() {
  if (!selectedBackend.value) return
  loadingFiles.value = true
  try {
    const res = await listFiles(selectedBackend.value, currentPrefix.value || undefined)
    files.value = res.data
  } catch (err: any) {
    NKMessage.error(err.message || '加载文件列表失败')
  } finally {
    loadingFiles.value = false
  }
}

function onBackendChange() {
  currentPrefix.value = ''
  uploadBackend.value = selectedBackend.value
  loadFiles()
}

function enterDir(file: FileItem) {
  const prefix = currentPrefix.value ? `${currentPrefix.value}/${file.name}` : file.name
  currentPrefix.value = prefix
  loadFiles()
}

function navigateToPart(idx: number) {
  const parts = pathParts.value
  const prefix = parts.slice(0, idx + 1).join('/')
  currentPrefix.value = prefix
  loadFiles()
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0]
  }
}

async function handleUpload() {
  if (!selectedFile.value || !uploadPath.value || !uploadBackend.value) return
  uploading.value = true
  uploadProgress.value = 0
  try {
    await uploadFile(uploadBackend.value, selectedFile.value, uploadPath.value)
    NKMessage.success('文件上传成功')
    showUploadDialog.value = false
    uploadPath.value = ''
    selectedFile.value = null
    uploadProgress.value = 0
    loadFiles()
  } catch (err: any) {
    NKMessage.error(err.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

function confirmDeleteFile(file: FileItem) {
  deletingFile.value = file
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingFile.value || !selectedBackend.value) return
  deleting.value = true
  try {
    const filePath = currentPrefix.value ? `${currentPrefix.value}/${deletingFile.value.name}` : deletingFile.value.name
    await deleteFile(selectedBackend.value, filePath)
    NKMessage.success('文件已删除')
    showDeleteDialog.value = false
    loadFiles()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

onMounted(loadBackends)
</script>

<style lang="scss" scoped>
.storage-mgmt {
  max-width: 1200px;

  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    margin-bottom: $nk-spacing-xl;
    color: $nk-color-neutral-900;
  }

  &__backends {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: $nk-spacing-lg;
    margin-bottom: $nk-spacing-xl;
  }

  &__backend-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $nk-spacing-lg;
  }

  &__backend-info {
    display: flex;
    align-items: center;
    gap: $nk-spacing-md;
  }

  &__backend-icon {
    color: $nk-color-primary-500;
  }

  &__backend-name {
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-900;
  }

  &__backend-type {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
  }

  &__backend-meta {
    display: flex;
    flex-direction: column;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
    gap: 2px;
  }

  &__browser-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  &__browser-path {
    display: flex;
    align-items: center;
    gap: $nk-spacing-xs;
    font-size: $nk-font-size-sm;
    flex-wrap: wrap;
  }

  &__path-separator {
    color: $nk-color-neutral-400;
  }

  &__path-root {
    color: $nk-color-neutral-600;
  }

  &__path-part {
    cursor: pointer;
    color: $nk-color-primary-600;
    transition: color $nk-duration-fast;

    &:hover {
      color: $nk-color-primary-800;
    }

    &--active {
      color: $nk-color-neutral-900;
      cursor: default;
      font-weight: $nk-font-weight-medium;
    }
  }

  &__browser-actions {
    display: flex;
    gap: $nk-spacing-sm;
  }

  &__select-hint {
    padding: $nk-spacing-3xl 0;
  }

  &__empty {
    padding: $nk-spacing-3xl 0;
  }

  &__file-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: $nk-spacing-md;
  }

  &__file-card {
    border: 1px solid $nk-color-neutral-200;
    border-radius: $nk-radius-md;
    padding: $nk-spacing-md;
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-sm;
    transition: box-shadow $nk-duration-fast, border-color $nk-duration-fast;

    &:hover {
      border-color: $nk-color-primary-300;
      box-shadow: $nk-shadow-sm;
    }
  }

  &__file-icon {
    color: $nk-color-primary-500;
  }

  &__file-name {
    font-size: $nk-font-size-sm;
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-900;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__file-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
  }

  &__file-actions {
    display: flex;
    gap: $nk-spacing-xs;
    margin-top: auto;
  }

  &__upload-form {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-md;
  }

  &__upload-field {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-xs;
  }

  &__upload-label {
    font-size: $nk-font-size-sm;
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-700;
  }

  &__upload-progress {
    margin-top: $nk-spacing-sm;
  }
}
</style>
