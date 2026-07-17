<template>
  <div class="storage-mgmt">
    <h2 class="storage-mgmt__title">文件存储管理</h2>

    <NkTabs v-model="activeTab" :items="tabs" @change="onTabChange" />

    <!-- ===================== Tab 1: 文件浏览器 ===================== -->
    <div v-show="activeTab === 'browser'" class="storage-mgmt__tab-content">
      <NkCard class="storage-mgmt__browser">
        <template #header>
          <div class="storage-mgmt__browser-header">
            <div class="storage-mgmt__browser-path">
              <NkInput
                v-model="prefixInput"
                placeholder="输入路径前缀 (如 goodser/images)"
                size="sm"
                style="width: 300px"
                @keyup.enter="navigateToPrefix"
              />
              <NkButton size="sm" variant="ghost" @click="navigateToPrefix">浏览</NkButton>
            </div>
            <div class="storage-mgmt__browser-actions">
              <NkButton size="sm" @click="openUploadDialog">上传文件</NkButton>
              <NkButton v-if="selectedFiles.length > 0" size="sm" type="danger" @click="confirmBatchDelete">批量删除 ({{ selectedFiles.length }})</NkButton>
            </div>
          </div>
          <div class="storage-mgmt__breadcrumb">
            <span class="storage-mgmt__breadcrumb-root" @click="navigateToPrefixDirect('')">根目录</span>
            <span v-for="(part, idx) in pathParts" :key="idx" class="storage-mgmt__breadcrumb-item">
              <span class="storage-mgmt__breadcrumb-sep">/</span>
              <span
                :class="{ 'storage-mgmt__breadcrumb-link': idx < pathParts.length - 1, 'storage-mgmt__breadcrumb-active': idx === pathParts.length - 1 }"
                @click="navigateToPart(idx)"
              >{{ part }}</span>
            </span>
          </div>
        </template>

        <NkLoading v-if="loadingFiles" />

        <div v-else-if="!dirList.length && !fileList.length" class="storage-mgmt__empty">
          <NkEmpty description="暂无文件" />
        </div>

        <template v-else>
          <table class="storage-mgmt__file-table">
            <thead>
              <tr>
                <th style="width: 36px">
                  <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" />
                </th>
                <th>文件名</th>
                <th style="width: 100px">大小</th>
                <th style="width: 80px">类型</th>
                <th style="width: 160px">修改时间</th>
                <th style="width: 240px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="dir in dirList" :key="dir" class="storage-mgmt__row--dir">
                <td></td>
                <td>
                  <div class="storage-mgmt__file-cell">
                    <NkIcon name="folder" size="sm" class="storage-mgmt__file-icon" />
                    <span class="storage-mgmt__file-link" @click="enterDirByName(dir)">{{ dir }}/</span>
                  </div>
                </td>
                <td>-</td>
                <td><NkTag size="xs" variant="outline">目录</NkTag></td>
                <td>-</td>
                <td><span class="storage-mgmt__dir-hint">点击进入</span></td>
              </tr>
              <tr v-for="file in fileList" :key="file.path" :class="{ 'storage-mgmt__row--selected': isSelected(file) }">
                <td>
                  <input
                    type="checkbox"
                    :checked="isSelected(file)"
                    @change="toggleSelectFile(file)"
                  />
                </td>
                <td>
                  <div class="storage-mgmt__file-cell">
                    <NkIcon name="file" size="sm" class="storage-mgmt__file-icon" />
                    <span :title="file.name">{{ file.name }}</span>
                  </div>
                </td>
                <td>{{ formatSize(file.size) }}</td>
                <td>
                  <NkTag v-if="file.content_type" size="xs" variant="outline">{{ file.content_type.split('/')[1] || file.content_type }}</NkTag>
                </td>
                <td>{{ formatDate(file.last_modified) }}</td>
                <td>
                  <NkButton size="xs" variant="ghost" @click="showFileInfo(file)">详情</NkButton>
                  <NkButton size="xs" variant="ghost" @click="copyUrl(file)">复制 URL</NkButton>
                  <NkButton size="xs" variant="ghost" @click="downloadFileAction(file)">下载</NkButton>
                  <NkButton size="xs" variant="ghost" type="danger" @click="confirmDeleteFile(file)">删除</NkButton>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="storage-mgmt__pagination">
            <span class="storage-mgmt__pagination-info">共 {{ totalFiles }} 个文件</span>
            <NkPagination
              v-model="currentPage"
              :total="totalFiles"
              :page-size="pageSize"
              @change="loadFiles"
            />
          </div>
        </template>
      </NkCard>
    </div>

    <!-- ===================== Tab 2: 使用扫描 ===================== -->
    <div v-show="activeTab === 'scan'" class="storage-mgmt__tab-content">
      <div class="storage-mgmt__scan-overview">
        <NkCard class="storage-mgmt__scan-stat">
          <div class="storage-mgmt__scan-stat-value">{{ scanResult?.total_files ?? '-' }}</div>
          <div class="storage-mgmt__scan-stat-label">文件总数</div>
        </NkCard>
        <NkCard class="storage-mgmt__scan-stat">
          <div class="storage-mgmt__scan-stat-value">{{ scanResult ? formatSize(scanResult.total_size) : '-' }}</div>
          <div class="storage-mgmt__scan-stat-label">总大小</div>
        </NkCard>
        <NkCard class="storage-mgmt__scan-stat storage-mgmt__scan-stat--success">
          <div class="storage-mgmt__scan-stat-value">{{ scanResult?.referenced_files ?? '-' }}</div>
          <div class="storage-mgmt__scan-stat-label">已引用</div>
        </NkCard>
        <NkCard class="storage-mgmt__scan-stat storage-mgmt__scan-stat--danger">
          <div class="storage-mgmt__scan-stat-value">{{ scanResult?.orphan_files ?? '-' }}</div>
          <div class="storage-mgmt__scan-stat-label">孤立文件</div>
        </NkCard>
      </div>

      <div class="storage-mgmt__scan-toolbar">
        <NkInput v-model="scanTargets" placeholder="扫描目标 (如 zzz_goodser_products.image_url，逗号分隔)" size="sm" style="width: 400px" />
        <NkButton size="sm" :loading="scanning" @click="handleScan">重新扫描</NkButton>
        <NkButton v-if="scanResult?.orphans?.length" size="sm" type="danger" :loading="cleaning" @click="confirmCleanAll">清理全部孤立文件</NkButton>
      </div>

      <NkLoading v-if="scanning" />

      <template v-else-if="scanResult">
        <NkCard class="storage-mgmt__scan-section">
          <template #header><span class="storage-mgmt__section-title">扫描目标明细</span></template>
          <table class="storage-mgmt__table">
            <thead>
              <tr>
                <th>表名</th>
                <th>列名</th>
                <th>引用数</th>
                <th>扫描行数</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in scanResult.scan_targets" :key="`${t.table}.${t.column}`">
                <td>{{ t.table }}</td>
                <td><NkTag size="xs">{{ t.column }}</NkTag></td>
                <td>{{ t.referenced_count }}</td>
                <td>{{ t.scanned_rows }}</td>
              </tr>
              <tr v-if="!scanResult.scan_targets.length">
                <td colspan="4" class="storage-mgmt__table-empty"><NkEmpty description="暂无扫描目标" /></td>
              </tr>
            </tbody>
          </table>
        </NkCard>

        <NkCard class="storage-mgmt__scan-section">
          <template #header>
            <div class="storage-mgmt__section-header">
              <span class="storage-mgmt__section-title">孤立文件列表 ({{ scanResult.orphans.length }})</span>
              <div class="storage-mgmt__section-actions">
                <label class="storage-mgmt__checkbox-label">
                  <input type="checkbox" :checked="allOrphansSelected" @change="toggleAllOrphans" />
                  全选
                </label>
                <NkButton size="xs" type="danger" :disabled="!selectedOrphans.length" :loading="cleaning" @click="confirmCleanSelected">删除选中</NkButton>
              </div>
            </div>
          </template>
          <table class="storage-mgmt__table">
            <thead>
              <tr>
                <th style="width: 36px"></th>
                <th>文件名</th>
                <th>路径</th>
                <th>大小</th>
                <th>修改时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="orphan in scanResult.orphans" :key="orphan.path">
                <td>
                  <input
                    type="checkbox"
                    :checked="isOrphanSelected(orphan)"
                    @change="toggleOrphan(orphan)"
                  />
                </td>
                <td>{{ orphan.name }}</td>
                <td class="storage-mgmt__path-cell">{{ orphan.path }}</td>
                <td>{{ formatSize(orphan.size) }}</td>
                <td>{{ formatDate(orphan.last_modified) }}</td>
              </tr>
            </tbody>
          </table>
        </NkCard>
      </template>

      <NkEmpty v-else description="点击「重新扫描」开始扫描" />
    </div>

    <!-- ===================== Tab 3: 文件引用 ===================== -->
    <div v-show="activeTab === 'references'" class="storage-mgmt__tab-content">
      <div class="storage-mgmt__ref-toolbar">
        <NkButton size="sm" @click="loadRefStats">刷新统计</NkButton>
        <NkButton size="sm" @click="showRegisterDialog = true">手动注册引用</NkButton>
        <NkButton size="sm" variant="outline" @click="showSyncDialog = true">全量同步</NkButton>
      </div>

      <div v-if="refStats" class="storage-mgmt__ref-stats">
        <NkCard class="storage-mgmt__ref-stat">
          <div class="storage-mgmt__ref-stat-value">{{ refStats.total_references }}</div>
          <div class="storage-mgmt__ref-stat-label">总引用条数</div>
        </NkCard>
        <NkCard class="storage-mgmt__ref-stat">
          <div class="storage-mgmt__ref-stat-value">{{ refStats.total_files }}</div>
          <div class="storage-mgmt__ref-stat-label">去重文件数</div>
        </NkCard>
      </div>

      <NkCard class="storage-mgmt__ref-query">
        <template #header>查询引用</template>
        <div class="storage-mgmt__ref-query-form">
          <NkInput v-model="refQuery.module_name" placeholder="模块名" size="sm" style="width: 150px" />
          <NkInput v-model="refQuery.object_key" placeholder="对象键" size="sm" style="width: 240px" />
          <NkInput v-model="refQuery.table_name" placeholder="表名" size="sm" style="width: 180px" />
          <NkInput v-model="refQuery.record_id" placeholder="记录 ID" size="sm" style="width: 180px" />
          <NkButton size="sm" @click="searchReferences">搜索</NkButton>
        </div>

        <NkLoading v-if="refLoading" />

        <table v-else-if="refList.length" class="storage-mgmt__table">
          <thead>
            <tr>
              <th>模块</th>
              <th>表名</th>
              <th>列名</th>
              <th>记录 ID</th>
              <th>对象键</th>
              <th>类型</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ref in refList" :key="ref.id">
              <td><NkTag size="xs">{{ ref.module_name }}</NkTag></td>
              <td>{{ ref.table_name }}</td>
              <td><NkTag size="xs" variant="outline">{{ ref.column_name }}</NkTag></td>
              <td class="storage-mgmt__mono">{{ ref.record_id }}</td>
              <td class="storage-mgmt__path-cell">{{ ref.object_key }}</td>
              <td>{{ ref.reference_type }}</td>
              <td>{{ formatDate(ref.created_at) }}</td>
            </tr>
          </tbody>
        </table>

        <NkEmpty v-else-if="!refLoading" description="输入条件搜索引用记录" />

        <div v-if="refTotal > 0" class="storage-mgmt__pagination">
          <span class="storage-mgmt__pagination-info">共 {{ refTotal }} 条</span>
          <NkPagination v-model="refPage" :total="refTotal" :page-size="refPageSize" @change="searchReferences" />
        </div>
      </NkCard>
    </div>

    <!-- ===================== Tab 4: 扫描目标 ===================== -->
    <div v-show="activeTab === 'targets'" class="storage-mgmt__tab-content">
      <div class="storage-mgmt__target-toolbar">
        <NkButton size="sm" @click="openCreateTarget">新增目标</NkButton>
        <NkButton size="sm" variant="ghost" :loading="targetsLoading" @click="loadTargets">刷新</NkButton>
      </div>

      <NkLoading v-if="targetsLoading" />
      <NkEmpty v-else-if="!targets.length" description="暂无扫描目标配置" />

      <table v-else class="storage-mgmt__table">
        <thead>
          <tr>
            <th>ID</th>
            <th>存储</th>
            <th>模块</th>
            <th>表名</th>
            <th>列名</th>
            <th>类型</th>
            <th>状态</th>
            <th>描述</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in targets" :key="t.id">
            <td>{{ t.id }}</td>
            <td><NkTag size="xs">{{ t.storage_name }}</NkTag></td>
            <td>{{ t.module_name }}</td>
            <td>{{ t.table_name }}</td>
            <td><NkTag size="xs" variant="outline">{{ t.column_name }}</NkTag></td>
            <td>{{ t.reference_type }}</td>
            <td>
              <NkTag :type="t.enabled ? 'success' : 'warning'" size="xs">
                {{ t.enabled ? '启用' : '停用' }}
              </NkTag>
            </td>
            <td class="storage-mgmt__desc-cell">{{ t.description || '-' }}</td>
            <td>
              <NkButton size="xs" variant="ghost" @click="openEditTarget(t)">编辑</NkButton>
              <NkButton size="xs" variant="ghost" type="danger" @click="confirmDeleteTarget(t)">删除</NkButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ===================== Dialogs ===================== -->

    <!-- Upload Dialog -->
    <NkDialog v-model:visible="showUploadDialog" title="上传文件" :width="500">
      <div class="storage-mgmt__dialog-form">
        <div class="storage-mgmt__form-field">
          <label class="storage-mgmt__form-label">路径前缀</label>
          <NkInput v-model="uploadPath" placeholder="如 goodser/images" />
        </div>
        <div class="storage-mgmt__form-field">
          <label class="storage-mgmt__form-label">Content-Type（可选）</label>
          <NkInput v-model="uploadContentType" placeholder="不传则自动检测" />
        </div>
        <div class="storage-mgmt__form-field">
          <label class="storage-mgmt__form-label">选择文件</label>
          <input type="file" @change="onFileSelect" />
        </div>
        <div v-if="uploadProgress > 0 && uploadProgress < 100" class="storage-mgmt__upload-progress">
          <NkProgress :percent="uploadProgress" />
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showUploadDialog = false">取消</NkButton>
        <NkButton :loading="uploading" :disabled="!selectedFile" @click="handleUpload">上传</NkButton>
      </template>
    </NkDialog>

    <!-- File Info Dialog -->
    <NkDialog v-model:visible="showInfoDialog" title="文件详情" :width="520">
      <div v-if="fileInfo" class="storage-mgmt__info-grid">
        <div class="storage-mgmt__info-row"><span class="storage-mgmt__info-label">文件名</span><span>{{ fileInfo.name }}</span></div>
        <div class="storage-mgmt__info-row"><span class="storage-mgmt__info-label">路径</span><span class="storage-mgmt__mono">{{ fileInfo.path }}</span></div>
        <div class="storage-mgmt__info-row"><span class="storage-mgmt__info-label">大小</span><span>{{ formatSize(fileInfo.size) }}</span></div>
        <div class="storage-mgmt__info-row"><span class="storage-mgmt__info-label">Content-Type</span><span>{{ fileInfo.content_type || '-' }}</span></div>
        <div class="storage-mgmt__info-row"><span class="storage-mgmt__info-label">ETag</span><span class="storage-mgmt__mono">{{ fileInfo.etag || '-' }}</span></div>
        <div class="storage-mgmt__info-row"><span class="storage-mgmt__info-label">修改时间</span><span>{{ formatDate(fileInfo.last_modified) }}</span></div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showInfoDialog = false">关闭</NkButton>
      </template>
    </NkDialog>

    <!-- Signed URL Dialog -->
    <NkDialog v-model:visible="showUrlDialog" title="签名 URL" :width="600">
      <div v-if="signedUrl" class="storage-mgmt__url-content">
        <div class="storage-mgmt__form-field">
          <label class="storage-mgmt__form-label">过期时间（秒）</label>
          <NkInput v-model.number="urlExpire" type="number" placeholder="3600" :min="60" :max="604800" />
          <span class="storage-mgmt__url-hint">范围：60 ~ 604800（1 分钟 ~ 7 天）</span>
        </div>
        <div class="storage-mgmt__url-box">
          <code class="storage-mgmt__url-text">{{ signedUrl.url }}</code>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showUrlDialog = false">关闭</NkButton>
        <NkButton v-if="signedUrl" @click="copyToClipboard(signedUrl.url)">复制 URL</NkButton>
        <NkButton v-else :loading="urlLoading" @click="generateSignedUrl">生成 URL</NkButton>
      </template>
    </NkDialog>

    <!-- Delete Single Dialog -->
    <NkDialog v-model:visible="showDeleteDialog" title="确认删除" :width="400">
      <p>确定要删除文件 <strong>{{ deletingFile?.name }}</strong> 吗？此操作不可恢复。</p>
      <template #footer>
        <NkButton variant="ghost" @click="showDeleteDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="deleting" @click="handleDelete">确认删除</NkButton>
      </template>
    </NkDialog>

    <!-- Batch Delete Dialog -->
    <NkDialog v-model:visible="showBatchDeleteDialog" title="确认批量删除" :width="420">
      <p>确定要删除选中的 <strong>{{ selectedFiles.length }}</strong> 个文件吗？此操作不可恢复。</p>
      <template #footer>
        <NkButton variant="ghost" @click="showBatchDeleteDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="batchDeleting" @click="handleBatchDelete">确认删除</NkButton>
      </template>
    </NkDialog>

    <!-- Cleanup Dialog -->
    <NkDialog v-model:visible="showCleanDialog" title="确认清理" :width="420">
      <p v-if="cleanAll">确定要清理全部 {{ scanResult?.orphans.length }} 个孤立文件吗？此操作不可恢复。</p>
      <p v-else>确定要删除选中的 <strong>{{ selectedOrphans.length }}</strong> 个孤立文件吗？</p>
      <template #footer>
        <NkButton variant="ghost" @click="showCleanDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="cleaning" @click="handleClean">确认清理</NkButton>
      </template>
    </NkDialog>

    <!-- Register Reference Dialog -->
    <NkDialog v-model:visible="showRegisterDialog" title="手动注册引用" :width="520">
      <div class="storage-mgmt__dialog-form">
        <div class="storage-mgmt__form-field">
          <label class="storage-mgmt__form-label">对象键 *</label>
          <NkInput v-model="refForm.object_key" placeholder="goodser/images/abc.jpg" />
        </div>
        <div class="storage-mgmt__form-row">
          <div class="storage-mgmt__form-field">
            <label class="storage-mgmt__form-label">模块名 *</label>
            <NkInput v-model="refForm.module_name" placeholder="goodser" />
          </div>
          <div class="storage-mgmt__form-field">
            <label class="storage-mgmt__form-label">引用类型</label>
            <NkInput v-model="refForm.reference_type" placeholder="image" />
          </div>
        </div>
        <div class="storage-mgmt__form-row">
          <div class="storage-mgmt__form-field">
            <label class="storage-mgmt__form-label">表名</label>
            <NkInput v-model="refForm.table_name" placeholder="zzz_goodser_products" />
          </div>
          <div class="storage-mgmt__form-field">
            <label class="storage-mgmt__form-label">列名</label>
            <NkInput v-model="refForm.column_name" placeholder="image_url" />
          </div>
        </div>
        <div class="storage-mgmt__form-field">
          <label class="storage-mgmt__form-label">记录 ID</label>
          <NkInput v-model="refForm.record_id" placeholder="uuid-xxx" />
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showRegisterDialog = false">取消</NkButton>
        <NkButton :loading="refRegistering" :disabled="!refForm.object_key || !refForm.module_name" @click="handleRegisterRef">注册</NkButton>
      </template>
    </NkDialog>

    <!-- Sync Dialog -->
    <NkDialog v-model:visible="showSyncDialog" title="全量同步引用" :width="480">
      <div class="storage-mgmt__dialog-form">
        <div class="storage-mgmt__form-field">
          <label class="storage-mgmt__form-label">扫描目标（可选）</label>
          <NkInput v-model="syncTargets" placeholder="zzz_goodser_products.image_url,zzz_goodser_products.images" />
          <span class="storage-mgmt__url-hint">不传则自动从 scan_targets 表读取配置</span>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showSyncDialog = false">取消</NkButton>
        <NkButton :loading="syncing" @click="handleSync">开始同步</NkButton>
      </template>
    </NkDialog>

    <!-- Target Create/Edit Dialog -->
    <NkDialog v-model:visible="showTargetDialog" :title="editingTarget ? '编辑扫描目标' : '新增扫描目标'" :width="520">
      <div class="storage-mgmt__dialog-form">
        <div class="storage-mgmt__form-row">
          <div class="storage-mgmt__form-field">
            <label class="storage-mgmt__form-label">存储名称 *</label>
            <NkInput v-model="targetForm.storage_name" placeholder="rustfs" />
          </div>
          <div class="storage-mgmt__form-field">
            <label class="storage-mgmt__form-label">模块名 *</label>
            <NkInput v-model="targetForm.module_name" placeholder="goodser" />
          </div>
        </div>
        <div class="storage-mgmt__form-field">
          <label class="storage-mgmt__form-label">表名 *</label>
          <NkInput v-model="targetForm.table_name" placeholder="zzz_goodser_products" />
        </div>
        <div class="storage-mgmt__form-row">
          <div class="storage-mgmt__form-field">
            <label class="storage-mgmt__form-label">列名 *</label>
            <NkInput v-model="targetForm.column_name" placeholder="image_url" />
          </div>
          <div class="storage-mgmt__form-field">
            <label class="storage-mgmt__form-label">引用类型</label>
            <NkInput v-model="targetForm.reference_type" placeholder="image" />
          </div>
        </div>
        <div class="storage-mgmt__form-field">
          <label class="storage-mgmt__form-label">描述</label>
          <NkInput v-model="targetForm.description" placeholder="描述信息" />
        </div>
        <div class="storage-mgmt__form-field">
          <label class="storage-mgmt__form-checkbox">
            <input type="checkbox" v-model="targetForm.enabled" />
            启用
          </label>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showTargetDialog = false">取消</NkButton>
        <NkButton :loading="targetSaving" :disabled="!targetForm.storage_name || !targetForm.module_name || !targetForm.table_name || !targetForm.column_name" @click="handleSaveTarget">确认</NkButton>
      </template>
    </NkDialog>

    <!-- Delete Target Dialog -->
    <NkDialog v-model:visible="showDeleteTargetDialog" title="确认删除" :width="400">
      <p>确定要删除扫描目标 <strong>{{ deletingTarget?.table_name }}.{{ deletingTarget?.column_name }}</strong> 吗？</p>
      <template #footer>
        <NkButton variant="ghost" @click="showDeleteTargetDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="deletingTargetLoading" @click="handleDeleteTarget">确认删除</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import {
  listFiles, getFileInfo, getSignedUrl, downloadFile as getDownloadUrl,
  uploadFile, deleteFile, batchDeleteFiles,
  scanFiles, cleanupFiles, getBucketStats,
} from '@/api/rustfs'
import type {
  RustFSFile, FileListData, FileInfoData,
  SignedUrlData, ScanResult, BucketStats,
} from '@/api/rustfs'
import {
  registerReferences, queryReferences, getReferenceStats, syncReferences,
} from '@/api/references'
import type { ReferenceItem, ReferenceStats, ReferenceListData } from '@/api/references'
import {
  listScanTargets, createScanTarget, updateScanTarget, deleteScanTarget,
} from '@/api/scanTargets'
import type { ScanTarget, ScanTargetListData } from '@/api/scanTargets'
import { NKMessage } from '@nkui/vue/src/utils/message'

const activeTab = ref('browser')
const tabs = [
  { label: '文件浏览器', value: 'browser' },
  { label: '使用扫描', value: 'scan' },
  { label: '文件引用', value: 'references' },
  { label: '扫描目标', value: 'targets' },
]

function onTabChange(value: string | number) {
  activeTab.value = value as string
  if (activeTab.value === 'browser') loadFiles()
  if (activeTab.value === 'scan') handleScan()
  if (activeTab.value === 'targets') loadTargets()
  if (activeTab.value === 'references') {
    loadRefStats()
    searchReferences()
  }
}

// ---- File Browser ----
const prefixInput = ref('')
const currentPrefix = ref('')
const dirList = ref<string[]>([])
const fileList = ref<RustFSFile[]>([])
const loadingFiles = ref(false)
const totalFiles = ref(0)
const currentPage = ref(1)
const pageSize = ref(50)

const pathParts = computed(() => {
  if (!currentPrefix.value) return []
  return currentPrefix.value.split('/').filter(Boolean)
})

function formatSize(bytes?: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(1)} ${units[i]}`
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function loadFiles() {
  loadingFiles.value = true
  try {
    const offset = (currentPage.value - 1) * pageSize.value
    const res = await listFiles(currentPrefix.value, offset, pageSize.value)
    dirList.value = res.data.dirs || []
    fileList.value = res.data.files || []
    totalFiles.value = res.data.total
  } catch (err: any) {
    NKMessage.error(err.message || '加载文件列表失败')
  } finally {
    loadingFiles.value = false
  }
}

function navigateToPrefix() {
  currentPrefix.value = prefixInput.value
  currentPage.value = 1
  loadFiles()
}

function navigateToPrefixDirect(prefix: string) {
  currentPrefix.value = prefix
  prefixInput.value = prefix
  currentPage.value = 1
  loadFiles()
}

function enterDirByName(dirName: string) {
  const cleanName = dirName.replace(/\/$/, '')
  const prefix = currentPrefix.value ? `${currentPrefix.value}/${cleanName}` : cleanName
  currentPrefix.value = prefix
  prefixInput.value = prefix
  currentPage.value = 1
  loadFiles()
}

function navigateToPart(idx: number) {
  const parts = pathParts.value
  const prefix = parts.slice(0, idx + 1).join('/')
  currentPrefix.value = prefix
  prefixInput.value = prefix
  currentPage.value = 1
  loadFiles()
}

// ---- Multi-select ----
const selectedFilesSet = ref(new Set<string>())

function isSelected(file: RustFSFile): boolean {
  return selectedFilesSet.value.has(file.path)
}

const allSelected = computed(() => fileList.value.length > 0 && fileList.value.every((f) => isSelected(f)))

function toggleSelectAll() {
  if (allSelected.value) {
    selectedFilesSet.value.clear()
  } else {
    selectedFilesSet.value = new Set(fileList.value.map((f) => f.path))
  }
}

function toggleSelectFile(file: RustFSFile) {
  const s = new Set(selectedFilesSet.value)
  if (s.has(file.path)) s.delete(file.path)
  else s.add(file.path)
  selectedFilesSet.value = s
}

const selectedFiles = computed(() => fileList.value.filter((f) => selectedFilesSet.value.has(f.path)))

// ---- Upload ----
const showUploadDialog = ref(false)
const uploadPath = ref('')
const uploadContentType = ref('')
const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const uploadProgress = ref(0)

function openUploadDialog() {
  uploadPath.value = currentPrefix.value
  uploadContentType.value = ''
  selectedFile.value = null
  uploadProgress.value = 0
  showUploadDialog.value = true
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0]
  }
}

async function handleUpload() {
  if (!selectedFile.value) return
  uploading.value = true
  uploadProgress.value = 0
  try {
    await uploadFile(selectedFile.value, uploadPath.value, uploadContentType.value || undefined)
    NKMessage.success('上传成功')
    showUploadDialog.value = false
    loadFiles()
  } catch (err: any) {
    NKMessage.error(err.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

// ---- File Info ----
const showInfoDialog = ref(false)
const fileInfo = ref<FileInfoData | null>(null)

async function showFileInfo(file: RustFSFile) {
  try {
    const res = await getFileInfo(file.path)
    fileInfo.value = res.data
    showInfoDialog.value = true
  } catch (err: any) {
    NKMessage.error(err.message || '获取文件详情失败')
  }
}

// ---- Signed URL ----
const showUrlDialog = ref(false)
const signedUrl = ref<SignedUrlData | null>(null)
const urlLoading = ref(false)
const urlExpire = ref(3600)
const urlFile = ref<RustFSFile | null>(null)

async function copyUrl(file: RustFSFile) {
  urlFile.value = file
  urlExpire.value = 3600
  signedUrl.value = null
  showUrlDialog.value = true
  await generateSignedUrl()
}

async function generateSignedUrl() {
  if (!urlFile.value) return
  urlLoading.value = true
  try {
    const res = await getSignedUrl(urlFile.value.path, urlExpire.value)
    signedUrl.value = res.data
  } catch (err: any) {
    NKMessage.error(err.message || '生成签名 URL 失败')
  } finally {
    urlLoading.value = false
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    NKMessage.success('已复制到剪贴板')
  })
}

// ---- Download ----
function downloadFileAction(file: RustFSFile) {
  window.open(getDownloadUrl(file.path), '_blank')
}

// ---- Delete Single ----
const showDeleteDialog = ref(false)
const deleting = ref(false)
const deletingFile = ref<RustFSFile | null>(null)

function confirmDeleteFile(file: RustFSFile) {
  deletingFile.value = file
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingFile.value) return
  deleting.value = true
  try {
    await deleteFile(deletingFile.value.path)
    NKMessage.success('文件已删除')
    showDeleteDialog.value = false
    selectedFilesSet.value.delete(deletingFile.value.path)
    loadFiles()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

// ---- Batch Delete ----
const showBatchDeleteDialog = ref(false)
const batchDeleting = ref(false)

function confirmBatchDelete() {
  showBatchDeleteDialog.value = true
}

async function handleBatchDelete() {
  batchDeleting.value = true
  try {
    const paths = selectedFiles.value.map((f) => f.path)
    await batchDeleteFiles(paths)
    NKMessage.success('批量删除成功')
    showBatchDeleteDialog.value = false
    selectedFilesSet.value.clear()
    loadFiles()
  } catch (err: any) {
    NKMessage.error(err.message || '批量删除失败')
  } finally {
    batchDeleting.value = false
  }
}

// ---- Scan ----
const scanning = ref(false)
const scanResult = ref<ScanResult | null>(null)
const scanTargets = ref('')
const cleaning = ref(false)
const selectedOrphansSet = ref(new Set<string>())
const showCleanDialog = ref(false)
const cleanAll = ref(false)

const allOrphansSelected = computed(() =>
  (scanResult.value?.orphans?.length ?? 0) > 0 && (scanResult.value?.orphans?.every((o) => isOrphanSelected(o)) ?? false),
)

function isOrphanSelected(orphan: { path: string }): boolean {
  return selectedOrphansSet.value.has(orphan.path)
}

function toggleAllOrphans() {
  if (!scanResult.value) return
  if (allOrphansSelected.value) {
    selectedOrphansSet.value.clear()
  } else {
    selectedOrphansSet.value = new Set(scanResult.value.orphans.map((o) => o.path))
  }
}

function toggleOrphan(orphan: { path: string }) {
  const s = new Set(selectedOrphansSet.value)
  if (s.has(orphan.path)) s.delete(orphan.path)
  else s.add(orphan.path)
  selectedOrphansSet.value = s
}

const selectedOrphans = computed(() =>
  (scanResult.value?.orphans ?? []).filter((o) => selectedOrphansSet.value.has(o.path)),
)

async function handleScan() {
  scanning.value = true
  try {
    const res = await scanFiles(scanTargets.value || undefined)
    scanResult.value = res.data
    selectedOrphansSet.value = new Set()
  } catch (err: any) {
    NKMessage.error(err.message || '扫描失败')
  } finally {
    scanning.value = false
  }
}

function confirmCleanAll() {
  cleanAll.value = true
  showCleanDialog.value = true
}

function confirmCleanSelected() {
  cleanAll.value = false
  showCleanDialog.value = true
}

async function handleClean() {
  cleaning.value = true
  try {
    if (cleanAll.value) {
      await cleanupFiles()
    } else {
      await cleanupFiles(selectedOrphans.value.map((o) => o.path))
    }
    NKMessage.success('清理成功')
    showCleanDialog.value = false
    selectedOrphansSet.value.clear()
    handleScan()
  } catch (err: any) {
    NKMessage.error(err.message || '清理失败')
  } finally {
    cleaning.value = false
  }
}

// ---- Reference ----
const refStats = ref<ReferenceStats | null>(null)
const refLoading = ref(false)
const refList = ref<ReferenceItem[]>([])
const refTotal = ref(0)
const refPage = ref(1)
const refPageSize = ref(20)
const refQuery = reactive({
  module_name: '',
  object_key: '',
  table_name: '',
  record_id: '',
})

const showRegisterDialog = ref(false)
const refRegistering = ref(false)
const refForm = reactive({
  object_key: '',
  module_name: '',
  table_name: '',
  column_name: '',
  record_id: '',
  reference_type: '',
})

const showSyncDialog = ref(false)
const syncing = ref(false)
const syncTargets = ref('')

async function loadRefStats() {
  try {
    const res = await getReferenceStats()
    refStats.value = res.data
  } catch {
    // silent
  }
}

async function searchReferences() {
  refLoading.value = true
  try {
    const params: Record<string, any> = {
      offset: (refPage.value - 1) * refPageSize.value,
      limit: refPageSize.value,
    }
    if (refQuery.module_name) params.module_name = refQuery.module_name
    if (refQuery.object_key) params.object_key = refQuery.object_key
    if (refQuery.table_name) params.table_name = refQuery.table_name
    if (refQuery.record_id) params.record_id = refQuery.record_id
    const res = await queryReferences(params)
    refList.value = res.data.records || []
    refTotal.value = res.data.total
  } catch (err: any) {
    NKMessage.error(err.message || '查询引用失败')
  } finally {
    refLoading.value = false
  }
}

async function handleRegisterRef() {
  refRegistering.value = true
  try {
    await registerReferences([{
      object_key: refForm.object_key,
      module_name: refForm.module_name,
      table_name: refForm.table_name || 'manual',
      column_name: refForm.column_name || 'manual',
      record_id: refForm.record_id || 'manual',
      reference_type: refForm.reference_type || 'file',
    }])
    NKMessage.success('引用注册成功')
    showRegisterDialog.value = false
    loadRefStats()
  } catch (err: any) {
    NKMessage.error(err.message || '注册失败')
  } finally {
    refRegistering.value = false
  }
}

async function handleSync() {
  syncing.value = true
  try {
    await syncReferences(syncTargets.value || undefined)
    NKMessage.success('同步完成')
    showSyncDialog.value = false
    loadRefStats()
  } catch (err: any) {
    NKMessage.error(err.message || '同步失败')
  } finally {
    syncing.value = false
  }
}

// ---- Scan Targets ----
const targets = ref<ScanTarget[]>([])
const targetsLoading = ref(false)
const showTargetDialog = ref(false)
const editingTarget = ref<ScanTarget | null>(null)
const targetSaving = ref(false)
const targetForm = reactive({
  storage_name: 'rustfs',
  table_name: '',
  column_name: '',
  module_name: '',
  reference_type: 'file',
  enabled: true,
  description: '',
})
const showDeleteTargetDialog = ref(false)
const deletingTarget = ref<ScanTarget | null>(null)
const deletingTargetLoading = ref(false)

async function loadTargets() {
  targetsLoading.value = true
  try {
    const res = await listScanTargets()
    targets.value = res.data.targets
  } catch (err: any) {
    NKMessage.error(err.message || '加载扫描目标失败')
  } finally {
    targetsLoading.value = false
  }
}

function openCreateTarget() {
  editingTarget.value = null
  targetForm.storage_name = 'rustfs'
  targetForm.table_name = ''
  targetForm.column_name = ''
  targetForm.module_name = ''
  targetForm.reference_type = 'file'
  targetForm.enabled = true
  targetForm.description = ''
  showTargetDialog.value = true
}

function openEditTarget(t: ScanTarget) {
  editingTarget.value = t
  targetForm.storage_name = t.storage_name
  targetForm.table_name = t.table_name
  targetForm.column_name = t.column_name
  targetForm.module_name = t.module_name
  targetForm.reference_type = t.reference_type
  targetForm.enabled = t.enabled
  targetForm.description = t.description || ''
  showTargetDialog.value = true
}

async function handleSaveTarget() {
  targetSaving.value = true
  try {
    if (editingTarget.value) {
      await updateScanTarget(editingTarget.value.id!, {
        enabled: targetForm.enabled,
        description: targetForm.description,
      })
      NKMessage.success('扫描目标更新成功')
    } else {
      await createScanTarget({
        storage_name: targetForm.storage_name,
        table_name: targetForm.table_name,
        column_name: targetForm.column_name,
        module_name: targetForm.module_name,
        reference_type: targetForm.reference_type,
        enabled: targetForm.enabled,
        description: targetForm.description || undefined,
      })
      NKMessage.success('扫描目标创建成功')
    }
    showTargetDialog.value = false
    loadTargets()
  } catch (err: any) {
    NKMessage.error(err.message || '操作失败')
  } finally {
    targetSaving.value = false
  }
}

function confirmDeleteTarget(t: ScanTarget) {
  deletingTarget.value = t
  showDeleteTargetDialog.value = true
}

async function handleDeleteTarget() {
  if (!deletingTarget.value?.id) return
  deletingTargetLoading.value = true
  try {
    await deleteScanTarget(deletingTarget.value.id)
    NKMessage.success('扫描目标已删除')
    showDeleteTargetDialog.value = false
    loadTargets()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    deletingTargetLoading.value = false
  }
}

onMounted(loadFiles)
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

  &__tab-content {
    margin-top: $nk-spacing-lg;
  }

  &__browser-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    flex-wrap: wrap;
    gap: $nk-spacing-sm;
  }

  &__browser-path {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
  }

  &__browser-actions {
    display: flex;
    gap: $nk-spacing-sm;
  }

  &__breadcrumb {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: $nk-font-size-sm;
    margin-top: $nk-spacing-sm;
    flex-wrap: wrap;
  }

  &__breadcrumb-root {
    cursor: pointer;
    color: $nk-color-primary-600;
    &:hover { color: $nk-color-primary-800; }
  }

  &__breadcrumb-sep {
    color: $nk-color-neutral-400;
    margin: 0 2px;
  }

  &__breadcrumb-link {
    cursor: pointer;
    color: $nk-color-primary-600;
    &:hover { color: $nk-color-primary-800; }
  }

  &__breadcrumb-active {
    color: $nk-color-neutral-900;
    font-weight: $nk-font-weight-medium;
  }

  &__empty {
    padding: $nk-spacing-3xl 0;
  }

  &__file-table {
    width: 100%;
    border-collapse: collapse;
    font-size: $nk-font-size-sm;

    th, td {
      text-align: left;
      padding: $nk-spacing-sm $nk-spacing-md;
      border-bottom: 1px solid $nk-color-neutral-200;
    }

    th {
      font-weight: $nk-font-weight-medium;
      color: $nk-color-neutral-500;
      background: $nk-color-neutral-50;
      font-size: $nk-font-size-xs;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      color: $nk-color-neutral-700;
    }

    tbody tr:hover {
      background: $nk-color-neutral-50;
    }
  }

  &__row--selected {
    background: $nk-color-primary-50 !important;
  }

  &__file-cell {
    display: flex;
    align-items: center;
    gap: $nk-spacing-xs;
  }

  &__file-icon {
    flex-shrink: 0;
    color: $nk-color-primary-500;
  }

  &__file-link {
    cursor: pointer;
    color: $nk-color-primary-600;
    font-weight: $nk-font-weight-medium;
    &:hover { color: $nk-color-primary-800; }
  }

  &__dir-hint {
    color: $nk-color-neutral-400;
    font-size: $nk-font-size-xs;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: $nk-spacing-md;
    margin-top: $nk-spacing-lg;
    padding: $nk-spacing-sm $nk-spacing-md;
  }

  &__pagination-info {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-500;
  }

  // Scan Tab
  &__scan-overview {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: $nk-spacing-lg;
    margin-bottom: $nk-spacing-lg;
  }

  &__scan-stat {
    text-align: center;
    padding: $nk-spacing-lg;

    &--success { border-left: 3px solid $nk-color-success; }
    &--danger { border-left: 3px solid $nk-color-error; }
  }

  &__scan-stat-value {
    font-size: $nk-font-size-2xl;
    font-weight: $nk-font-weight-bold;
    color: $nk-color-neutral-900;
  }

  &__scan-stat-label {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
    margin-top: $nk-spacing-xs;
  }

  &__scan-toolbar {
    display: flex;
    gap: $nk-spacing-sm;
    align-items: center;
    margin-bottom: $nk-spacing-lg;
  }

  &__scan-section {
    margin-bottom: $nk-spacing-lg;
  }

  &__section-title {
    font-weight: $nk-font-weight-semibold;
    font-size: $nk-font-size-base;
    color: $nk-color-neutral-900;
  }

  &__section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  &__section-actions {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
  }

  &__checkbox-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: $nk-font-size-sm;
    cursor: pointer;
  }

  // Table
  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: $nk-font-size-sm;

    th, td {
      text-align: left;
      padding: $nk-spacing-sm $nk-spacing-md;
      border-bottom: 1px solid $nk-color-neutral-200;
    }

    th {
      font-weight: $nk-font-weight-medium;
      color: $nk-color-neutral-500;
      background: $nk-color-neutral-50;
      font-size: $nk-font-size-xs;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      color: $nk-color-neutral-700;
    }

    tbody tr:hover {
      background: $nk-color-neutral-50;
    }
  }

  &__table-empty {
    text-align: center;
    padding: $nk-spacing-2xl;
  }

  &__path-cell {
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__desc-cell {
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__mono {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: $nk-font-size-xs;
  }

  // Reference Tab
  &__ref-toolbar {
    display: flex;
    gap: $nk-spacing-sm;
    margin-bottom: $nk-spacing-lg;
  }

  &__ref-stats {
    display: flex;
    gap: $nk-spacing-lg;
    margin-bottom: $nk-spacing-lg;
  }

  &__ref-stat {
    flex: 1;
    text-align: center;
    padding: $nk-spacing-lg;
  }

  &__ref-stat-value {
    font-size: $nk-font-size-2xl;
    font-weight: $nk-font-weight-bold;
    color: $nk-color-neutral-900;
  }

  &__ref-stat-label {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
    margin-top: $nk-spacing-xs;
  }

  &__ref-query {
    margin-bottom: $nk-spacing-lg;
  }

  &__ref-query-form {
    display: flex;
    gap: $nk-spacing-sm;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: $nk-spacing-lg;
  }

  // Target Tab
  &__target-toolbar {
    display: flex;
    gap: $nk-spacing-sm;
    margin-bottom: $nk-spacing-lg;
  }

  // Dialogs
  &__dialog-form {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-md;
    padding: $nk-spacing-sm 0;
  }

  &__form-field {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-xs;
    flex: 1;
  }

  &__form-row {
    display: flex;
    gap: $nk-spacing-md;
  }

  &__form-label {
    font-size: $nk-font-size-sm;
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-700;
  }

  &__form-checkbox {
    display: flex;
    align-items: center;
    gap: $nk-spacing-xs;
    font-size: $nk-font-size-sm;
    cursor: pointer;
  }

  &__info-grid {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-md;
  }

  &__info-row {
    display: flex;
    gap: $nk-spacing-md;
    font-size: $nk-font-size-sm;

    .storage-mgmt__info-label {
      width: 100px;
      color: $nk-color-neutral-500;
      flex-shrink: 0;
    }
  }

  &__upload-progress {
    margin-top: $nk-spacing-sm;
  }

  &__url-content {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-md;
  }

  &__url-hint {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-400;
  }

  &__url-box {
    background: $nk-color-neutral-50;
    border: 1px solid $nk-color-neutral-200;
    border-radius: $nk-radius-md;
    padding: $nk-spacing-md;
    overflow-x: auto;
    word-break: break-all;
  }

  &__url-text {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-700;
  }
}
</style>
