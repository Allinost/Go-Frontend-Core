<template>
  <div class="goodser">
    <div class="goodser__header">
      <h2 class="goodser__title">Goodser 商品管理</h2>
      <NkButton size="sm" variant="ghost" @click="showSettings = true">设置</NkButton>
    </div>

    <NkTabs v-model="activeTab" :items="tabs" />

    <div class="goodser__content">
      <!-- ==================== 商品列表 Tab ==================== -->
      <div v-if="activeTab === 'products'" class="goodser__tab">
        <div class="goodser__product-toolbar">
          <NkSelect
            v-if="inventories.length"
            v-model="currentInventoryId"
            :options="inventoryOptions"
            style="width: 200px"
            size="sm"
            @change="onInventoryChange"
          />
          <NkInput
            v-model="productQuery"
            placeholder="搜索商品名称/编码..."
            size="sm"
            style="width: 240px"
            @keyup.enter="searchProducts"
          />
          <NkButton size="sm" variant="ghost" @click="searchProducts">搜索</NkButton>
          <div class="goodser__product-toolbar-right">
            <NkButton
              size="sm"
              variant="ghost"
              :class="{ 'goodser__filter-active': hasProductFilter }"
              @click="showProductFilter = true"
            >筛选</NkButton>
            <NkButton size="sm" @click="openCreateProduct">新建商品</NkButton>
          </div>
        </div>

        <div class="goodser__sort-row">
          <span class="goodser__count">共 {{ productTotal }} 件商品</span>
          <span v-if="productTotal > 0" class="goodser__count">第 {{ productPage }} / {{ productTotalPages }} 页</span>
          <div class="goodser__sort-chips">
            <span
              v-for="chip in sortChips"
              :key="chip.key"
              class="goodser__sort-chip"
              :class="{ 'goodser__sort-chip--active': productSortBy === chip.key }"
              @click="toggleSort(chip.key)"
            >{{ chip.label }}{{ productSortBy === chip.key ? (productSortOrder === 'asc' ? ' ↑' : ' ↓') : '' }}</span>
          </div>
        </div>

        <NkLoading v-if="loadingProducts" />
        <div v-else-if="!products.length" class="goodser__empty">
          <NkEmpty :description="productQuery || hasProductFilter ? '未匹配商品' : '暂无商品，点击上方按钮新建'" />
        </div>
        <div v-else class="goodser__product-grid">
          <NkCard
            v-for="p in products"
            :key="p._id"
            class="goodser__product-card"
            @click="openProductDetail(p)"
          >
            <div class="goodser__product-card-top">
              <div class="goodser__product-code">{{ p.code }}</div>
              <NkTag size="sm">{{ p.status_code }}</NkTag>
            </div>
            <div class="goodser__product-name">{{ p.name }}</div>
            <div class="goodser__product-meta">
              <span>数量: {{ p.quantity }}{{ p.reserved_quantity ? ` (预留 ${p.reserved_quantity})` : '' }}</span>
              <span v-if="p.expected_price != null">¥{{ p.expected_price }}</span>
            </div>
            <div class="goodser__product-zone">{{ p.main_zone }}{{ p.sub_zone }}-{{ String(p.seq_number).padStart(4, '0') }}</div>
          </NkCard>
        </div>

        <div class="goodser__pagination">
          <NkButton size="sm" variant="ghost" :disabled="productPage <= 1" @click="goToPage(productPage - 1)">上一页</NkButton>
          <div class="goodser__page-jump">
            <NkInput v-model="jumpPage" type="number" size="xs" style="width:60px" :min="1" :max="productTotalPages" @keyup.enter="handleJumpPage" />
            <NkButton size="xs" variant="ghost" :disabled="!jumpPage" @click="handleJumpPage">跳转</NkButton>
          </div>
          <span class="goodser__page-info">{{ productPage }} / {{ productTotalPages }}</span>
          <NkButton size="sm" variant="ghost" :disabled="productPage >= productTotalPages" @click="goToPage(productPage + 1)">下一页</NkButton>
        </div>
      </div>

      <!-- ==================== 出库订单 Tab ==================== -->
      <div v-if="activeTab === 'orders'" class="goodser__tab">
        <div class="goodser__tab-header">
          <span class="goodser__count">共 {{ orders.length }} 个订单</span>
          <div>
            <NkButton size="sm" variant="ghost" style="margin-right:8px" @click="openCreateOrder('reserve')">新建预留</NkButton>
            <NkButton size="sm" @click="openCreateOrder('outbound')">新建出库</NkButton>
          </div>
        </div>
        <NkLoading v-if="loadingOrders" />
        <div v-else-if="!orders.length" class="goodser__empty">
          <NkEmpty description="暂无出库订单" />
        </div>
        <div v-else class="goodser__order-list">
          <NkCard v-for="o in orders" :key="o._id" class="goodser__order-card" @click="openOrderDetail(o)">
            <div class="goodser__order-card-header">
              <div>
                <span class="goodser__order-no">{{ o.order_no }}</span>
                <NkTag :type="orderStatusType(o.status)" size="sm" style="margin-left:8px">{{ orderStatusLabel(o.status) }}</NkTag>
                <NkTag v-if="o.type === 'reserve'" size="sm" type="warning" style="margin-left:4px">预留</NkTag>
              </div>
              <span class="goodser__order-date">{{ formatDate(o.created_at) }}</span>
            </div>
            <div class="goodser__order-meta">
              <span>{{ o.items?.length || 0 }} 件商品</span>
              <span v-if="o.order_info">{{ o.order_info }}</span>
            </div>
            <div v-if="o.status === 'pending'" class="goodser__order-actions" @click.stop>
              <NkButton size="xs" variant="ghost" @click="handleConfirmOrder(o)">确认</NkButton>
              <NkButton size="xs" variant="ghost" type="danger" @click="handleCancelOrder(o)">取消</NkButton>
            </div>
            <div v-else-if="o.status === 'reserve'" class="goodser__order-actions" @click.stop>
              <NkButton size="xs" variant="ghost" @click="openConvertReserve(o)">转出库</NkButton>
              <NkButton size="xs" variant="ghost" type="danger" @click="handleCancelReserve(o)">取消预留</NkButton>
            </div>
          </NkCard>
        </div>
      </div>

      <!-- ==================== 入库记录 Tab ==================== -->
      <div v-if="activeTab === 'logs'" class="goodser__tab">
        <div class="goodser__tab-header">
          <span class="goodser__count">共 {{ logs.length }} 条记录</span>
          <div>
            <NkButton size="sm" variant="ghost" style="margin-right:8px" @click="openInboundSearch">搜索导入</NkButton>
            <NkButton size="sm" @click="openInboundSingle">单品入库</NkButton>
          </div>
        </div>
        <NkLoading v-if="loadingLogs" />
        <div v-else-if="!logs.length" class="goodser__empty">
          <NkEmpty description="暂无入库记录" />
        </div>
        <div v-else class="goodser__log-list">
          <NkCard v-for="log in logs" :key="log._id" class="goodser__log-card">
            <div class="goodser__log-header">
              <span class="goodser__log-type">{{ log.type === 'single' ? '单品入库' : log.type === 'batch' ? '批量入库' : '搜索导入' }}</span>
              <span class="goodser__log-date">{{ formatDate(log.created_at) }}</span>
            </div>
            <div class="goodser__log-meta">
              <span v-if="log.order_no">单号: {{ log.order_no }}</span>
              <span>{{ log.items?.length || 0 }} 件商品</span>
              <span v-if="log.remark">{{ log.remark }}</span>
            </div>
          </NkCard>
        </div>
      </div>

      <!-- ==================== 库存目录 Tab ==================== -->
      <div v-if="activeTab === 'inventories'" class="goodser__tab">
        <div class="goodser__tab-header">
          <span class="goodser__count">共 {{ inventories.length }} 个目录</span>
          <NkButton size="sm" @click="openCreateInventory">新建目录</NkButton>
        </div>
        <NkLoading v-if="loadingInventories" />
        <div v-else-if="!inventories.length" class="goodser__empty">
          <NkEmpty description="暂无库存目录，点击上方按钮新建" />
        </div>
        <div v-else class="goodser__inventory-grid">
          <NkCard v-for="inv in inventories" :key="inv._id" class="goodser__inv-card" @click="selectInventory(inv)">
            <div class="goodser__inv-info">
              <div class="goodser__inv-name">{{ inv.name }}</div>
              <div class="goodser__inv-meta">排序: {{ inv.sort_order }} · {{ formatDate(inv.created_at) }}</div>
            </div>
            <div class="goodser__inv-actions" @click.stop>
              <NkButton size="xs" variant="ghost" @click="openRenameInventory(inv)">重命名</NkButton>
              <NkButton size="xs" variant="ghost" type="danger" @click="openDeleteInventory(inv)">删除</NkButton>
            </div>
          </NkCard>
        </div>
      </div>
    </div>

    <!-- ==================== Dialogs ==================== -->

    <!-- Create Inventory -->
    <NkDialog v-model:visible="showCreateInvDialog" title="新建库存目录" :width="420">
      <NkInput v-model="newInvName" placeholder="目录名称" />
      <template #footer>
        <NkButton variant="ghost" @click="showCreateInvDialog = false">取消</NkButton>
        <NkButton :disabled="!newInvName.trim()" :loading="saving" @click="handleCreateInventory">确定</NkButton>
      </template>
    </NkDialog>

    <!-- Rename Inventory -->
    <NkDialog v-model:visible="showRenameInvDialog" title="重命名目录" :width="420">
      <NkInput v-model="renameInvName" placeholder="新名称" />
      <template #footer>
        <NkButton variant="ghost" @click="showRenameInvDialog = false">取消</NkButton>
        <NkButton :disabled="!renameInvName.trim()" :loading="saving" @click="handleRenameInventory">确定</NkButton>
      </template>
    </NkDialog>

    <!-- Delete Inventory -->
    <NkDialog v-model:visible="showDeleteInvDialog" title="删除目录" :width="400">
      <p>确定要删除目录 <strong>{{ deletingInv?.name }}</strong> 吗？此操作不可恢复。</p>
      <template #footer>
        <NkButton variant="ghost" @click="showDeleteInvDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="saving" @click="handleDeleteInventory">删除</NkButton>
      </template>
    </NkDialog>

    <!-- Product Filter -->
    <NkDialog v-model:visible="showProductFilter" title="筛选商品" :width="480">
      <div class="goodser__filter-section">
        <label class="goodser__filter-label">主分区</label>
        <div class="goodser__filter-tags">
          <span
            class="goodser__filter-tag"
            :class="{ 'goodser__filter-tag--active': !productFilterZone }"
            @click="productFilterZone = ''"
          >全部</span>
          <span
            v-for="z in availableZones"
            :key="z"
            class="goodser__filter-tag"
            :class="{ 'goodser__filter-tag--active': productFilterZone === z }"
            @click="productFilterZone = productFilterZone === z ? '' : z"
          >{{ z }}</span>
        </div>
      </div>
      <div class="goodser__filter-section">
        <label class="goodser__filter-label">状态</label>
        <div class="goodser__filter-tags">
          <span
            class="goodser__filter-tag"
            :class="{ 'goodser__filter-tag--active': !productFilterStatus }"
            @click="productFilterStatus = ''"
          >全部</span>
          <span
            v-for="sc in statusCodes"
            :key="sc._id"
            class="goodser__filter-tag"
            :class="{ 'goodser__filter-tag--active': productFilterStatus === sc.code }"
            @click="productFilterStatus = productFilterStatus === sc.code ? '' : sc.code"
          >{{ sc.label }}</span>
        </div>
      </div>
      <div class="goodser__filter-section">
        <label class="goodser__filter-label">标签</label>
        <div class="goodser__filter-tags">
          <span
            class="goodser__filter-tag"
            :class="{ 'goodser__filter-tag--active': !productFilterTag }"
            @click="productFilterTag = ''"
          >全部</span>
          <span
            v-for="t in tags"
            :key="t._id"
            class="goodser__filter-tag"
            :class="{ 'goodser__filter-tag--active': productFilterTag === t._id }"
            @click="productFilterTag = productFilterTag === t._id ? '' : t._id"
          >{{ t.name }}</span>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="resetProductFilter">重置</NkButton>
        <NkButton @click="applyProductFilter">确认筛选</NkButton>
      </template>
    </NkDialog>

    <!-- Create/Edit Product -->
    <NkDialog
      v-model:visible="showProductForm"
      :title="editingProduct ? '编辑商品' : '新建商品'"
      :width="560"
    >
      <div class="goodser__product-form">
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">商品名称 *</label>
            <NkInput v-model="productForm.name" placeholder="名称" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">编码预览</label>
            <NkInput :model-value="productCodePreview" disabled placeholder="自动生成" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">主分区</label>
            <NkSelect v-model="productForm.main_zone" :options="zoneOptions" placeholder="选择分区" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">子分区</label>
            <NkSelect v-model="productForm.sub_zone" :options="subZoneOptions" placeholder="选择子分区" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">数量</label>
            <NkInput v-model="productForm.quantity" type="number" placeholder="0" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">状态</label>
            <NkSelect v-model="productForm.status_code" :options="statusCodeOptions" placeholder="选择状态" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">原价</label>
            <NkInput v-model="productForm.original_price" type="number" placeholder="0" />
          </div>
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">市场价</label>
            <NkInput v-model="productForm.market_price" type="number" placeholder="0" />
          </div>
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">期望价</label>
            <NkInput v-model="productForm.expected_price" type="number" placeholder="0" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field">
            <label class="goodser__form-label">存放位置</label>
            <NkInput v-model="productForm.storage_location" placeholder="例如 A-01-01" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field">
            <label class="goodser__form-label">备注</label>
            <NkTextarea v-model="productForm.remark" placeholder="备注信息" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field">
            <label class="goodser__form-label">标签</label>
            <div class="goodser__tag-selector">
              <span
                v-for="t in tags"
                :key="t._id"
                class="goodser__tag-chip"
                :class="{ 'goodser__tag-chip--selected': productFormTags.includes(t._id) }"
                :style="{ borderColor: t.color }"
                @click="toggleProductTag(t._id)"
              >{{ t.name }}</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showProductForm = false">取消</NkButton>
        <NkButton :loading="saving" :disabled="!productForm.name.trim()" @click="handleSaveProduct">保存</NkButton>
      </template>
    </NkDialog>

    <!-- Product Detail -->
    <NkDialog v-model:visible="showProductDetail" :title="detailProduct?.name || '商品详情'" :width="500">
      <div v-if="detailProduct" class="goodser__product-detail">
        <div class="goodser__detail-row"><span class="goodser__detail-label">编码</span><span>{{ detailProduct.code }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">分区</span><span>{{ detailProduct.main_zone }}{{ detailProduct.sub_zone }}-{{ String(detailProduct.seq_number).padStart(4, '0') }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">数量</span><span>{{ detailProduct.quantity }}{{ detailProduct.reserved_quantity ? ` (预留 ${detailProduct.reserved_quantity})` : '' }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">状态</span><NkTag size="sm">{{ detailProduct.status_code }}</NkTag></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">原价</span><span>{{ detailProduct.original_price != null ? '¥' + detailProduct.original_price : '-' }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">市场价</span><span>{{ detailProduct.market_price != null ? '¥' + detailProduct.market_price : '-' }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">期望价</span><span>{{ detailProduct.expected_price != null ? '¥' + detailProduct.expected_price : '-' }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">位置</span><span>{{ detailProduct.storage_location || '-' }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">备注</span><span>{{ detailProduct.remark || '-' }}</span></div>
        <div class="goodser__detail-row">
          <span class="goodser__detail-label">标签</span>
          <span>
            <NkTag v-for="tid in detailProduct.tags" :key="tid" size="sm" style="margin-right:4px">{{ tagName(tid) }}</NkTag>
            <span v-if="!detailProduct.tags?.length">-</span>
          </span>
        </div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">创建时间</span><span>{{ formatDate(detailProduct.created_at) }}</span></div>
      </div>
      <template #footer>
        <NkButton variant="ghost" type="danger" @click="handleDeleteProductFromDetail">删除</NkButton>
        <NkButton @click="openEditProduct">编辑</NkButton>
      </template>
    </NkDialog>

    <!-- Create Order (Outbound/Reserve) -->
    <NkDialog v-model:visible="showOrderForm" :title="orderFormType === 'reserve' ? '新建预留订单' : '新建出库订单'" :width="500">
      <div class="goodser__order-form">
        <div class="goodser__form-field">
          <label class="goodser__form-label">订单号 *</label>
          <NkInput v-model="orderForm.order_no" placeholder="例如 OUT-20240101-001" />
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">订单信息</label>
          <NkInput v-model="orderForm.order_info" placeholder="订单信息" />
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">备注</label>
          <NkTextarea v-model="orderForm.remark" placeholder="备注" />
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">商品 (搜索添加)</label>
          <NkInput v-model="orderProductQuery" placeholder="搜索商品..." size="sm" @keyup.enter="searchOrderProducts" />
          <div v-if="orderSearchResults.length" class="goodser__order-search-results">
            <div v-for="r in orderSearchResults" :key="r._id" class="goodser__order-search-item" @click="addOrderItem(r)">
              <span>{{ r.code }} - {{ r.name }}</span>
              <NkButton size="xs" variant="ghost">添加</NkButton>
            </div>
          </div>
          <div v-if="orderFormItems.length" class="goodser__order-items">
            <div v-for="(item, idx) in orderFormItems" :key="idx" class="goodser__order-item">
              <span class="goodser__order-item-name">{{ item.product_name }} ({{ item.product_code }})</span>
              <NkInput v-model="item.quantity" type="number" size="xs" style="width:80px" placeholder="数量" />
              <NkButton size="xs" variant="ghost" type="danger" @click="orderFormItems.splice(idx, 1)">×</NkButton>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showOrderForm = false">取消</NkButton>
        <NkButton :loading="saving" :disabled="!orderForm.order_no.trim() || !orderFormItems.length" @click="handleCreateOrder">确定</NkButton>
      </template>
    </NkDialog>

    <!-- Order Detail -->
    <NkDialog v-model:visible="showOrderDetail" :title="'订单 ' + (detailOrder?.order_no || '')" :width="500">
      <div v-if="detailOrder" class="goodser__order-detail">
        <div class="goodser__detail-row"><span class="goodser__detail-label">单号</span><span>{{ detailOrder.order_no }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">类型</span><NkTag size="sm">{{ detailOrder.type === 'reserve' ? '预留' : '出库' }}</NkTag></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">状态</span><NkTag :type="orderStatusType(detailOrder.status)" size="sm">{{ orderStatusLabel(detailOrder.status) }}</NkTag></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">信息</span><span>{{ detailOrder.order_info || '-' }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">备注</span><span>{{ detailOrder.remark || '-' }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">商品</span></div>
        <div v-for="(item, idx) in detailOrder.items" :key="idx" class="goodser__detail-item">
          {{ item.product_name }} ({{ item.product_code }}) × {{ item.quantity }}
        </div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">创建时间</span><span>{{ formatDate(detailOrder.created_at) }}</span></div>
        <div v-if="detailOrder.confirmed_at" class="goodser__detail-row"><span class="goodser__detail-label">确认时间</span><span>{{ formatDate(detailOrder.confirmed_at) }}</span></div>
      </div>
    </NkDialog>

    <!-- Convert Reserve to Outbound -->
    <NkDialog v-model:visible="showConvertDialog" title="预留转出库" :width="480">
      <p>将预留订单 <strong>{{ convertingOrder?.order_no }}</strong> 转为正式出库订单</p>
      <div class="goodser__form-field" style="margin-top:12px">
        <label class="goodser__form-label">新订单号 *</label>
        <NkInput v-model="convertOrderNo" placeholder="例如 OUT-20240101-001" />
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showConvertDialog = false">取消</NkButton>
        <NkButton :loading="saving" :disabled="!convertOrderNo.trim()" @click="handleConvertReserve">确定</NkButton>
      </template>
    </NkDialog>

    <!-- Inbound Single -->
    <NkDialog v-model:visible="showInboundSingle" title="单品入库" :width="520">
      <div class="goodser__product-form">
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">商品名称 *</label>
            <NkInput v-model="inboundForm.name" placeholder="名称" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">编码</label>
            <NkInput v-model="inboundForm.code" placeholder="例如 A1-0001" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">主分区</label>
            <NkSelect v-model="inboundForm.main_zone" :options="zoneOptions" placeholder="选择分区" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">子分区</label>
            <NkSelect v-model="inboundForm.sub_zone" :options="subZoneOptions" placeholder="选择子分区" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">数量 *</label>
            <NkInput v-model="inboundForm.quantity" type="number" placeholder="0" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">状态</label>
            <NkSelect v-model="inboundForm.status_code" :options="statusCodeOptions" placeholder="选择状态" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field">
            <label class="goodser__form-label">备注</label>
            <NkTextarea v-model="inboundForm.remark" placeholder="备注" />
          </div>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showInboundSingle = false">取消</NkButton>
        <NkButton :loading="saving" :disabled="!inboundForm.name.trim()" @click="handleInboundSingle">入库</NkButton>
      </template>
    </NkDialog>

    <!-- Inbound Search Import -->
    <NkDialog v-model:visible="showInboundSearch" title="搜索导入" :width="520">
      <div class="goodser__form-field">
        <label class="goodser__form-label">搜索商品</label>
        <NkInput v-model="inboundSearchQuery" placeholder="名称/编码..." size="sm" @keyup.enter="doInboundSearch" />
        <NkButton size="xs" variant="ghost" @click="doInboundSearch" style="margin-top:4px">搜索</NkButton>
      </div>
      <div v-if="inboundSearchResults.length" class="goodser__inbound-search-results">
        <div v-for="r in inboundSearchResults" :key="r._id" class="goodser__inbound-search-item">
          <div class="goodser__inbound-search-info">
            <span>{{ r.code }} - {{ r.name }}</span>
            <span class="goodser__inbound-search-stock">库存: {{ r.quantity }}</span>
          </div>
          <div class="goodser__inbound-search-action">
            <NkInput v-model="r._importQty" type="number" size="xs" style="width:70px" placeholder="数量" />
            <NkButton size="xs" @click="addToInboundImport(r)">添加</NkButton>
          </div>
        </div>
      </div>
      <div v-if="inboundImportItems.length" class="goodser__inbound-import-list">
        <div class="goodser__inbound-import-header">待导入 ({{ inboundImportItems.length }})</div>
        <div v-for="(item, idx) in inboundImportItems" :key="idx" class="goodser__inbound-import-item">
          <span>{{ item.product_name }} ({{ item.product_code }}) × {{ item.quantity }}</span>
          <NkButton size="xs" variant="ghost" type="danger" @click="inboundImportItems.splice(idx, 1)">×</NkButton>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showInboundSearch = false">取消</NkButton>
        <NkButton :loading="saving" :disabled="!inboundImportItems.length" @click="handleInboundSearchImport">导入</NkButton>
      </template>
    </NkDialog>

    <!-- Settings Dialog -->
    <NkDialog v-model:visible="showSettings" title="Goodser 设置" :width="520">
      <NkTabs v-model="settingsTab" :items="settingsTabs" />
      <div v-if="settingsTab === 'tags'" class="goodser__settings-section">
        <div class="goodser__settings-header">
          <span>标签管理</span>
          <NkButton size="xs" @click="openCreateTag">新建标签</NkButton>
        </div>
        <NkLoading v-if="loadingTags" />
        <div v-else class="goodser__settings-list">
          <div v-for="t in tags" :key="t._id" class="goodser__settings-item">
            <span class="goodser__settings-item-name">{{ t.name }}</span>
            <NkButton size="xs" variant="ghost" type="danger" @click="handleDeleteTag(t)">删除</NkButton>
          </div>
          <div v-if="!tags.length" class="goodser__empty"><NkEmpty description="暂无标签" /></div>
        </div>
      </div>
      <div v-if="settingsTab === 'statusCodes'" class="goodser__settings-section">
        <div class="goodser__settings-header">
          <span>状态码管理</span>
          <NkButton size="xs" @click="openCreateStatusCode">新建状态码</NkButton>
        </div>
        <NkLoading v-if="loadingStatusCodes" />
        <div v-else class="goodser__settings-list">
          <div v-for="sc in statusCodes" :key="sc._id" class="goodser__settings-item">
            <span class="goodser__settings-item-name">{{ sc.code }} - {{ sc.label }}</span>
            <NkButton
              v-if="!sc.is_system"
              size="xs"
              variant="ghost"
              type="danger"
              @click="handleDeleteStatusCode(sc)"
            >删除</NkButton>
            <NkTag v-else size="xs">系统</NkTag>
          </div>
          <div v-if="!statusCodes.length" class="goodser__empty"><NkEmpty description="暂无状态码" /></div>
        </div>
      </div>
      <template #footer>
        <NkButton @click="showSettings = false">关闭</NkButton>
      </template>
    </NkDialog>

    <!-- Create Tag Dialog -->
    <NkDialog v-model:visible="showCreateTagDialog" title="新建标签" :width="400">
      <NkInput v-model="newTagName" placeholder="标签名称" />
      <NkInput v-model="newTagColor" placeholder="颜色 (例如 #1890ff)" style="margin-top:8px" />
      <template #footer>
        <NkButton variant="ghost" @click="showCreateTagDialog = false">取消</NkButton>
        <NkButton :loading="saving" :disabled="!newTagName.trim()" @click="handleCreateTag">确定</NkButton>
      </template>
    </NkDialog>

    <!-- Create Status Code Dialog -->
    <NkDialog v-model:visible="showCreateCodeDialog" title="新建状态码" :width="400">
      <NkInput v-model="newCode.code" placeholder="编码 (例如 in_stock)" />
      <NkInput v-model="newCode.label" placeholder="显示名称 (例如 在库)" style="margin-top:8px" />
      <template #footer>
        <NkButton variant="ghost" @click="showCreateCodeDialog = false">取消</NkButton>
        <NkButton :loading="saving" :disabled="!newCode.code.trim() || !newCode.label.trim()" @click="handleCreateStatusCode">确定</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  loadInventories, createInventory, updateInventory, deleteInventory,
  loadProducts, queryProducts, createProduct, updateProduct, deleteProduct,
  loadOutboundOrders, createOutbound, confirmOutbound, cancelOutbound, cancelReserve, reserveToOutbound,
  loadInboundLogs, inboundSingle, inboundSearchImport,
  loadTags, createTag, deleteTag,
  loadStatusCodes, addStatusCode, removeStatusCode,
} from '@/api/goodser'
import type {
  Inventory, Product, OutboundOrder, InboundLog, OrderItem, GoodserTag, StatusCode,
} from '@/types/goodser'

// ---- Tabs ----
const activeTab = ref('products')
const tabs = [
  { label: '商品列表', value: 'products' },
  { label: '出库订单', value: 'orders' },
  { label: '入库记录', value: 'logs' },
  { label: '库存目录', value: 'inventories' },
]

// ---- Shared ----
const saving = ref(false)
const showSettings = ref(false)
const settingsTab = ref('tags')
const settingsTabs = [
  { label: '标签管理', value: 'tags' },
  { label: '状态码', value: 'statusCodes' },
]

// ---- Inventories ----
const inventories = ref<Inventory[]>([])
const loadingInventories = ref(false)
const showCreateInvDialog = ref(false)
const showRenameInvDialog = ref(false)
const showDeleteInvDialog = ref(false)
const newInvName = ref('')
const renameInvName = ref('')
const deletingInv = ref<Inventory | null>(null)
const renamingInv = ref<Inventory | null>(null)

const inventoryOptions = computed(() =>
  inventories.value.map((inv) => ({ label: inv.name, value: inv._id })),
)

async function fetchInventories() {
  loadingInventories.value = true
  try {
    const res = await loadInventories()
    inventories.value = res.data || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载库存目录失败')
  } finally {
    loadingInventories.value = false
  }
}

function openCreateInventory() {
  newInvName.value = ''
  showCreateInvDialog.value = true
}

async function handleCreateInventory() {
  const name = newInvName.value.trim()
  if (!name) return
  saving.value = true
  try {
    await createInventory({ name })
    NKMessage.success('新建成功')
    showCreateInvDialog.value = false
    await fetchInventories()
  } catch (err: any) {
    NKMessage.error(err.message || '新建失败')
  } finally {
    saving.value = false
  }
}

function openRenameInventory(inv: Inventory) {
  renamingInv.value = inv
  renameInvName.value = inv.name
  showRenameInvDialog.value = true
}

async function handleRenameInventory() {
  if (!renamingInv.value || !renameInvName.value.trim()) return
  saving.value = true
  try {
    await updateInventory({ id: renamingInv.value._id, name: renameInvName.value.trim() })
    NKMessage.success('重命名成功')
    showRenameInvDialog.value = false
    await fetchInventories()
  } catch (err: any) {
    NKMessage.error(err.message || '重命名失败')
  } finally {
    saving.value = false
  }
}

function openDeleteInventory(inv: Inventory) {
  deletingInv.value = inv
  showDeleteInvDialog.value = true
}

async function handleDeleteInventory() {
  if (!deletingInv.value) return
  saving.value = true
  try {
    await deleteInventory({ id: deletingInv.value._id })
    NKMessage.success('删除成功')
    showDeleteInvDialog.value = false
    await fetchInventories()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    saving.value = false
  }
}

// ---- Products ----
const currentInventoryId = ref('')
const products = ref<Product[]>([])
const loadingProducts = ref(false)
const productQuery = ref('')
const productSortBy = ref('')
const productSortOrder = ref<'asc' | 'desc'>('asc')
const productFilterZone = ref('')
const productFilterStatus = ref('')
const productFilterTag = ref('')
const productPage = ref(1)
const productHasMore = ref(false)
const productTotal = ref(0)
const jumpPage = ref<number | null>(null)
const showProductFilter = ref(false)
const showProductForm = ref(false)
const showProductDetail = ref(false)
const editingProduct = ref<Product | null>(null)
const detailProduct = ref<Product | null>(null)

const productForm = ref({
  name: '',
  main_zone: '',
  sub_zone: '',
  quantity: 0,
  status_code: '',
  original_price: null as number | null,
  market_price: null as number | null,
  expected_price: null as number | null,
  storage_location: '',
  remark: '',
})
const productFormTags = ref<string[]>([])

const sortChips = [
  { key: '', label: '默认' },
  { key: 'code', label: '编码' },
  { key: 'name', label: '名称' },
  { key: 'quantity', label: '数量' },
  { key: 'expected_price', label: '价格' },
]
const zoneOptions = [
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'C', value: 'C' },
  { label: 'D', value: 'D' },
  { label: 'E', value: 'E' },
]
const subZoneOptions = [
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5', value: '5' },
  { label: '6', value: '6' },
  { label: '7', value: '7' },
  { label: '8', value: '8' },
  { label: '9', value: '9' },
]

const hasProductFilter = computed(() =>
  productFilterZone.value || productFilterStatus.value || productFilterTag.value,
)

const productCodePreview = computed(() => {
  const mz = productForm.value.main_zone || '?'
  const sz = productForm.value.sub_zone || '?'
  return `${mz}${sz}-xxxx`
})

const availableZones = computed(() => {
  const zones = new Set(products.value.map((p) => p.main_zone))
  return Array.from(zones).sort()
})

const statusCodeOptions = computed(() =>
  statusCodes.value.map((sc) => ({ label: `${sc.code} - ${sc.label}`, value: sc.code })),
)

function toggleSort(key: string) {
  if (productSortBy.value === key) {
    productSortOrder.value = productSortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    productSortBy.value = key
    productSortOrder.value = 'asc'
  }
  searchProducts()
}

function selectInventory(inv: Inventory) {
  currentInventoryId.value = inv._id
  activeTab.value = 'products'
  searchProducts()
}

function onInventoryChange() {
  searchProducts()
}

async function searchProducts() {
  if (!currentInventoryId.value) return
  productPage.value = 1
  await goToPage(1)
}

const pageSize = 20
const productTotalPages = computed(() => Math.ceil(productTotal.value / pageSize) || 1)

async function goToPage(page: number) {
  if (!currentInventoryId.value || page < 1) return
  productPage.value = page
  loadingProducts.value = true
  try {
    const hasFilters = hasProductFilter.value || !!productSortBy.value || !!productQuery.value
    if (hasFilters) {
      const res = await queryProducts({
        inventory_id: currentInventoryId.value,
        keyword: productQuery.value || undefined,
        sort_by: productSortBy.value || undefined,
        sort_order: productSortOrder.value,
        main_zone: productFilterZone.value || undefined,
        status_code: productFilterStatus.value || undefined,
        tag_id: productFilterTag.value || undefined,
        page,
        page_size: pageSize,
      })
      products.value = res.data?.items || []
      productHasMore.value = res.data?.has_more || false
      productTotal.value = res.data?.total || 0
    } else {
      const res = await loadProducts({ inventory_id: currentInventoryId.value, page, page_size: pageSize })
      products.value = res.data?.items || []
      productHasMore.value = res.data?.has_more || false
      productTotal.value = res.data?.total || 0
    }
  } catch (err: any) {
    NKMessage.error(err.message || '加载失败')
  } finally {
    loadingProducts.value = false
  }
}

function handleJumpPage() {
  const p = Number(jumpPage.value)
  if (p >= 1 && p <= productTotalPages.value) {
    goToPage(p)
    jumpPage.value = null
  }
}

function resetProductFilter() {
  productFilterZone.value = ''
  productFilterStatus.value = ''
  productFilterTag.value = ''
}

function applyProductFilter() {
  showProductFilter.value = false
  searchProducts()
}

function openCreateProduct() {
  editingProduct.value = null
  productForm.value = { name: '', main_zone: '', sub_zone: '', quantity: 0, status_code: '', original_price: null, market_price: null, expected_price: null, storage_location: '', remark: '' }
  productFormTags.value = []
  showProductForm.value = true
}

function openEditProduct() {
  if (!detailProduct.value) return
  editingProduct.value = detailProduct.value
  const p = detailProduct.value
  productForm.value = {
    name: p.name,
    main_zone: p.main_zone,
    sub_zone: p.sub_zone,
    quantity: p.quantity,
    status_code: p.status_code,
    original_price: p.original_price,
    market_price: p.market_price,
    expected_price: p.expected_price,
    storage_location: p.storage_location || '',
    remark: p.remark || '',
  }
  productFormTags.value = p.tags ? [...p.tags] : []
  showProductForm.value = true
  showProductDetail.value = false
}

function openProductDetail(product: Product) {
  detailProduct.value = product
  showProductDetail.value = true
}

function toggleProductTag(tagId: string) {
  const idx = productFormTags.value.indexOf(tagId)
  if (idx >= 0) {
    productFormTags.value.splice(idx, 1)
  } else {
    productFormTags.value.push(tagId)
  }
}

async function handleSaveProduct() {
  if (!productForm.value.name.trim() || !currentInventoryId.value) return
  saving.value = true
  try {
    const form = productForm.value
    if (editingProduct.value) {
      await updateProduct({
        id: editingProduct.value._id,
        name: form.name,
        main_zone: form.main_zone || undefined,
        sub_zone: form.sub_zone || undefined,
        quantity: form.quantity || undefined,
        status_code: form.status_code || undefined,
        original_price: form.original_price,
        market_price: form.market_price,
        expected_price: form.expected_price,
        storage_location: form.storage_location || undefined,
        remark: form.remark || undefined,
        tags: productFormTags.value.length ? productFormTags.value : undefined,
      })
      NKMessage.success('更新成功')
    } else {
      const code = `${form.main_zone || 'A'}${form.sub_zone || '1'}-0001`
      await createProduct({
        inventory_id: currentInventoryId.value,
        code,
        main_zone: form.main_zone || 'A',
        sub_zone: form.sub_zone || '1',
        seq_number: 1,
        quantity: form.quantity || null,
        status_code: form.status_code || 'in_stock',
        name: form.name,
        original_price: form.original_price,
        market_price: form.market_price,
        expected_price: form.expected_price,
        storage_location: form.storage_location || null,
        remark: form.remark || null,
        tags: productFormTags.value.length ? productFormTags.value : null,
      })
      NKMessage.success('创建成功')
    }
    showProductForm.value = false
    await searchProducts()
  } catch (err: any) {
    NKMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDeleteProductFromDetail() {
  if (!detailProduct.value) return
  saving.value = true
  try {
    await deleteProduct({ id: detailProduct.value._id })
    NKMessage.success('删除成功')
    showProductDetail.value = false
    await searchProducts()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    saving.value = false
  }
}

// ---- Orders ----
const orders = ref<OutboundOrder[]>([])
const loadingOrders = ref(false)
const showOrderForm = ref(false)
const showOrderDetail = ref(false)
const showConvertDialog = ref(false)
const orderFormType = ref<'outbound' | 'reserve'>('outbound')
const orderForm = ref({ order_no: '', order_info: '', remark: '' })
const orderFormItems = ref<OrderItem[]>([])
const orderProductQuery = ref('')
const orderSearchResults = ref<Product[]>([])
const detailOrder = ref<OutboundOrder | null>(null)
const convertingOrder = ref<OutboundOrder | null>(null)
const convertOrderNo = ref('')

async function fetchOrders() {
  if (!currentInventoryId.value) return
  loadingOrders.value = true
  try {
    const res = await loadOutboundOrders({ inventory_id: currentInventoryId.value, page: 1, page_size: 50 })
    orders.value = res.data?.items || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载订单失败')
  } finally {
    loadingOrders.value = false
  }
}

function openCreateOrder(type: 'outbound' | 'reserve') {
  orderFormType.value = type
  orderForm.value = { order_no: '', order_info: '', remark: '' }
  orderFormItems.value = []
  orderProductQuery.value = ''
  orderSearchResults.value = []
  showOrderForm.value = true
}

async function searchOrderProducts() {
  if (!currentInventoryId.value || !orderProductQuery.value.trim()) return
  try {
    const res = await queryProducts({
      inventory_id: currentInventoryId.value,
      keyword: orderProductQuery.value.trim(),
      page_size: 10,
    })
    orderSearchResults.value = res.data?.items || []
  } catch {
    orderSearchResults.value = []
  }
}

function addOrderItem(product: Product) {
  const existing = orderFormItems.value.find((i) => i.product_id === product._id)
  if (existing) {
    existing.quantity++
  } else {
    orderFormItems.value.push({
      product_id: product._id,
      product_name: product.name,
      product_code: product.code,
      quantity: 1,
    })
  }
  orderProductQuery.value = ''
  orderSearchResults.value = []
}

async function handleCreateOrder() {
  if (!currentInventoryId.value || !orderForm.value.order_no.trim() || !orderFormItems.value.length) return
  saving.value = true
  try {
    const items = orderFormItems.value.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      product_code: i.product_code,
      quantity: Number(i.quantity) || 1,
    }))
    await createOutbound({
      inventory_id: currentInventoryId.value,
      order_no: orderForm.value.order_no.trim(),
      type: orderFormType.value,
      status: orderFormType.value === 'reserve' ? 'reserve' : 'pending',
      order_info: orderForm.value.order_info || undefined,
      remark: orderForm.value.remark || undefined,
      items,
    })
    NKMessage.success('创建成功')
    showOrderForm.value = false
    await fetchOrders()
  } catch (err: any) {
    NKMessage.error(err.message || '创建失败')
  } finally {
    saving.value = false
  }
}

function openOrderDetail(order: OutboundOrder) {
  detailOrder.value = order
  showOrderDetail.value = true
}

async function handleConfirmOrder(order: OutboundOrder) {
  saving.value = true
  try {
    await confirmOutbound({ id: order._id })
    NKMessage.success('确认成功')
    await fetchOrders()
  } catch (err: any) {
    NKMessage.error(err.message || '确认失败')
  } finally {
    saving.value = false
  }
}

async function handleCancelOrder(order: OutboundOrder) {
  saving.value = true
  try {
    await cancelOutbound({ id: order._id })
    NKMessage.success('已取消')
    await fetchOrders()
  } catch (err: any) {
    NKMessage.error(err.message || '取消失败')
  } finally {
    saving.value = false
  }
}

async function handleCancelReserve(order: OutboundOrder) {
  saving.value = true
  try {
    await cancelReserve({ id: order._id })
    NKMessage.success('已取消预留')
    await fetchOrders()
  } catch (err: any) {
    NKMessage.error(err.message || '取消失败')
  } finally {
    saving.value = false
  }
}

function openConvertReserve(order: OutboundOrder) {
  convertingOrder.value = order
  convertOrderNo.value = ''
  showConvertDialog.value = true
}

async function handleConvertReserve() {
  if (!convertingOrder.value || !convertOrderNo.value.trim()) return
  saving.value = true
  try {
    const items = (convertingOrder.value.items || []).map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      product_code: i.product_code,
      quantity: i.quantity,
    }))
    await reserveToOutbound({
      id: convertingOrder.value._id,
      inventory_id: convertingOrder.value.inventory_id,
      order_no: convertOrderNo.value.trim(),
      items,
    })
    NKMessage.success('转换成功')
    showConvertDialog.value = false
    await fetchOrders()
  } catch (err: any) {
    NKMessage.error(err.message || '转换失败')
  } finally {
    saving.value = false
  }
}

function orderStatusType(status: string) {
  if (status === 'confirmed') return 'success'
  if (status === 'cancelled') return 'danger'
  if (status === 'reserve') return 'warning'
  return 'info'
}

function orderStatusLabel(status: string) {
  if (status === 'confirmed') return '已确认'
  if (status === 'cancelled') return '已取消'
  if (status === 'reserve') return '预留中'
  return '待处理'
}

// ---- Logs ----
const logs = ref<InboundLog[]>([])
const loadingLogs = ref(false)
const showInboundSingle = ref(false)
const showInboundSearch = ref(false)
const inboundForm = ref({ name: '', code: '', main_zone: '', sub_zone: '', quantity: 0, status_code: '', remark: '' })
const inboundSearchQuery = ref('')
const inboundSearchResults = ref<(Product & { _importQty?: number })[]>([])
const inboundImportItems = ref<OrderItem[]>([])

async function fetchLogs() {
  if (!currentInventoryId.value) return
  loadingLogs.value = true
  try {
    const res = await loadInboundLogs({ inventory_id: currentInventoryId.value, page: 1, page_size: 50 })
    logs.value = res.data?.items || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载入库记录失败')
  } finally {
    loadingLogs.value = false
  }
}

function openInboundSingle() {
  inboundForm.value = { name: '', code: '', main_zone: '', sub_zone: '', quantity: 0, status_code: '', remark: '' }
  showInboundSingle.value = true
}

async function handleInboundSingle() {
  if (!currentInventoryId.value || !inboundForm.value.name.trim()) return
  saving.value = true
  try {
    const f = inboundForm.value
    await inboundSingle({
      inventory_id: currentInventoryId.value,
      name: f.name.trim(),
      code: f.code || `${f.main_zone || 'A'}${f.sub_zone || '1'}-0001`,
      main_zone: f.main_zone || 'A',
      sub_zone: f.sub_zone || '1',
      seq_number: 1,
      quantity: f.quantity || null,
      status_code: f.status_code || 'in_stock',
      remark: f.remark || null,
    })
    NKMessage.success('入库成功')
    showInboundSingle.value = false
    await fetchLogs()
  } catch (err: any) {
    NKMessage.error(err.message || '入库失败')
  } finally {
    saving.value = false
  }
}

function openInboundSearch() {
  inboundSearchQuery.value = ''
  inboundSearchResults.value = []
  inboundImportItems.value = []
  showInboundSearch.value = true
}

async function doInboundSearch() {
  if (!currentInventoryId.value || !inboundSearchQuery.value.trim()) return
  try {
    const res = await queryProducts({
      inventory_id: currentInventoryId.value,
      keyword: inboundSearchQuery.value.trim(),
      page_size: 20,
    })
    inboundSearchResults.value = (res.data?.items || []).map((p) => ({ ...p, _importQty: 0 }))
  } catch {
    inboundSearchResults.value = []
  }
}

function addToInboundImport(product: Product & { _importQty?: number }) {
  const qty = product._importQty || 1
  if (qty <= 0) return
  inboundImportItems.value.push({
    product_id: product._id,
    product_name: product.name,
    product_code: product.code,
    quantity: qty,
  })
  product._importQty = 0
}

async function handleInboundSearchImport() {
  if (!currentInventoryId.value || !inboundImportItems.value.length) return
  saving.value = true
  try {
    await inboundSearchImport({
      inventory_id: currentInventoryId.value,
      items: inboundImportItems.value.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        product_code: i.product_code,
        quantity: i.quantity,
      })),
    })
    NKMessage.success('导入成功')
    showInboundSearch.value = false
    await fetchLogs()
  } catch (err: any) {
    NKMessage.error(err.message || '导入失败')
  } finally {
    saving.value = false
  }
}

// ---- Tags ----
const tags = ref<GoodserTag[]>([])
const loadingTags = ref(false)
const showCreateTagDialog = ref(false)
const newTagName = ref('')
const newTagColor = ref('#1890ff')

async function fetchTags() {
  loadingTags.value = true
  try {
    const res = await loadTags()
    tags.value = res.data || []
  } catch {
    tags.value = []
  } finally {
    loadingTags.value = false
  }
}

function openCreateTag() {
  newTagName.value = ''
  newTagColor.value = '#1890ff'
  showCreateTagDialog.value = true
}

async function handleCreateTag() {
  if (!newTagName.value.trim()) return
  saving.value = true
  try {
    await createTag({ name: newTagName.value.trim(), color: newTagColor.value || null })
    NKMessage.success('创建成功')
    showCreateTagDialog.value = false
    await fetchTags()
  } catch (err: any) {
    NKMessage.error(err.message || '创建标签失败')
  } finally {
    saving.value = false
  }
}

async function handleDeleteTag(tag: GoodserTag) {
  saving.value = true
  try {
    await deleteTag({ id: tag._id })
    NKMessage.success('已删除')
    await fetchTags()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    saving.value = false
  }
}

// ---- Status Codes ----
const statusCodes = ref<StatusCode[]>([])
const loadingStatusCodes = ref(false)
const showCreateCodeDialog = ref(false)
const newCode = ref({ code: '', label: '' })

const tagName = (tagId: string) => tags.value.find((t) => t._id === tagId)?.name || tagId

async function fetchStatusCodes() {
  loadingStatusCodes.value = true
  try {
    const res = await loadStatusCodes()
    statusCodes.value = res.data || []
  } catch {
    statusCodes.value = []
  } finally {
    loadingStatusCodes.value = false
  }
}

function openCreateStatusCode() {
  newCode.value = { code: '', label: '' }
  showCreateCodeDialog.value = true
}

async function handleCreateStatusCode() {
  if (!newCode.value.code.trim() || !newCode.value.label.trim()) return
  saving.value = true
  try {
    await addStatusCode({ code: newCode.value.code.trim(), label: newCode.value.label.trim() })
    NKMessage.success('创建成功')
    showCreateCodeDialog.value = false
    await fetchStatusCodes()
  } catch (err: any) {
    NKMessage.error(err.message || '创建失败')
  } finally {
    saving.value = false
  }
}

async function handleDeleteStatusCode(sc: StatusCode) {
  saving.value = true
  try {
    await removeStatusCode({ id: sc._id })
    NKMessage.success('已删除')
    await fetchStatusCodes()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    saving.value = false
  }
}

// ---- Utils ----
function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ---- Watchers ----
watch(activeTab, (tab) => {
  if (tab === 'products') {
    if (!currentInventoryId.value && inventories.value.length) {
      currentInventoryId.value = inventories.value[0]._id
    }
    if (currentInventoryId.value) {
      searchProducts()
    }
  }
  if (tab === 'orders') fetchOrders()
  if (tab === 'logs') fetchLogs()
})

// ---- Init ----
onMounted(async () => {
  await fetchInventories()
  await fetchTags()
  await fetchStatusCodes()
  if (inventories.value.length) {
    currentInventoryId.value = inventories.value[0]._id
    searchProducts()
  }
})
</script>

<style lang="scss" scoped>
.goodser {
  max-width: 1200px;

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
    margin: 0;
  }

  &__content {
    margin-top: $nk-spacing-lg;
  }

  &__tab {
    min-height: 200px;
  }

  &__tab-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-md;
  }

  &__count {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-500;
  }

  &__empty {
    padding: $nk-spacing-3xl 0;
  }

  // ---- Inventory Cards ----
  &__inventory-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: $nk-spacing-md;
  }

  &__inv-card {
    cursor: pointer;
    transition: box-shadow $nk-duration-fast;
    &:hover {
      box-shadow: $nk-shadow-md;
    }
  }

  &__inv-info {
    margin-bottom: $nk-spacing-sm;
  }

  &__inv-name {
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-900;
    font-size: $nk-font-size-base;
  }

  &__inv-meta {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
    margin-top: 4px;
  }

  &__inv-actions {
    display: flex;
    gap: $nk-spacing-xs;
  }

  // ---- Product Toolbar ----
  &__product-toolbar {
    display: flex;
    gap: $nk-spacing-sm;
    align-items: center;
    margin-bottom: $nk-spacing-md;
    flex-wrap: wrap;
  }

  &__product-toolbar-right {
    margin-left: auto;
    display: flex;
    gap: $nk-spacing-sm;
  }

  &__filter-active {
    color: $nk-color-primary-600;
    font-weight: $nk-font-weight-medium;
  }

  &__sort-row {
    display: flex;
    align-items: center;
    gap: $nk-spacing-md;
    margin-bottom: $nk-spacing-md;
  }

  &__sort-chips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__sort-chip {
    padding: 3px 12px;
    border-radius: 16px;
    font-size: $nk-font-size-xs;
    background: $nk-color-neutral-100;
    color: $nk-color-neutral-600;
    cursor: pointer;
    transition: all $nk-duration-fast;
    user-select: none;

    &:hover {
      background: $nk-color-neutral-200;
    }

    &--active {
      background: $nk-color-primary-50;
      color: $nk-color-primary-600;
      font-weight: $nk-font-weight-medium;
    }
  }

  // ---- Product Cards ----
  &__product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: $nk-spacing-md;
  }

  &__product-card {
    cursor: pointer;
    transition: box-shadow $nk-duration-fast, border-color $nk-duration-fast;
    &:hover {
      box-shadow: $nk-shadow-md;
      border-color: $nk-color-primary-300;
    }
  }

  &__product-card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-xs;
  }

  &__product-code {
    font-size: $nk-font-size-xs;
    color: $nk-color-primary-600;
    font-weight: $nk-font-weight-medium;
    font-family: $nk-font-family-mono;
  }

  &__product-name {
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-900;
    font-size: $nk-font-size-sm;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__product-meta {
    display: flex;
    justify-content: space-between;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
  }

  &__product-zone {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-400;
    font-family: $nk-font-family-mono;
    margin-top: 4px;
  }

  &__pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: $nk-spacing-md;
    padding: $nk-spacing-lg;
  }

  &__page-jump {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__page-info {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-600;
  }

  // ---- Filter Dialog ----
  &__filter-section {
    margin-bottom: $nk-spacing-md;
  }

  &__filter-label {
    display: block;
    font-size: $nk-font-size-sm;
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-700;
    margin-bottom: $nk-spacing-xs;
  }

  &__filter-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__filter-tag {
    padding: 4px 14px;
    border-radius: 16px;
    font-size: $nk-font-size-xs;
    background: $nk-color-neutral-100;
    color: $nk-color-neutral-600;
    cursor: pointer;
    transition: all $nk-duration-fast;
    user-select: none;

    &:hover {
      background: $nk-color-neutral-200;
    }

    &--active {
      background: $nk-color-primary-50;
      color: $nk-color-primary-600;
      font-weight: $nk-font-weight-medium;
    }
  }

  // ---- Product Form ----
  &__product-form {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-sm;
  }

  &__form-row {
    display: flex;
    gap: $nk-spacing-sm;
  }

  &__form-field {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;

    &--half {
      flex: 0 0 calc(50% - #{$nk-spacing-sm} / 2);
    }

    &--third {
      flex: 0 0 calc(33.33% - #{$nk-spacing-sm} * 2 / 3);
    }
  }

  &__form-label {
    font-size: $nk-font-size-xs;
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-700;
  }

  // ---- Tag Selector ----
  &__tag-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  &__tag-chip {
    padding: 3px 10px;
    border-radius: 12px;
    font-size: $nk-font-size-xs;
    border: 1.5px solid $nk-color-neutral-300;
    cursor: pointer;
    user-select: none;
    transition: all $nk-duration-fast;
    color: $nk-color-neutral-700;

    &:hover {
      background: $nk-color-primary-50;
    }

    &--selected {
      background: $nk-color-primary-50;
      border-color: $nk-color-primary-400;
      color: $nk-color-primary-700;
      font-weight: $nk-font-weight-medium;
    }
  }

  // ---- Product Detail ----
  &__product-detail {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-sm;
  }

  &__detail-row {
    display: flex;
    align-items: center;
    gap: $nk-spacing-md;
    font-size: $nk-font-size-sm;
  }

  &__detail-label {
    color: $nk-color-neutral-500;
    min-width: 80px;
    flex-shrink: 0;
  }

  &__detail-item {
    padding-left: 80px;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-700;
  }

  // ---- Orders ----
  &__order-list {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-md;
  }

  &__order-card {
    cursor: pointer;
    transition: box-shadow $nk-duration-fast;
    &:hover {
      box-shadow: $nk-shadow-md;
    }
  }

  &__order-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-xs;
  }

  &__order-no {
    font-weight: $nk-font-weight-medium;
    font-family: $nk-font-family-mono;
    color: $nk-color-neutral-900;
  }

  &__order-date {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
  }

  &__order-meta {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
    display: flex;
    gap: $nk-spacing-md;
  }

  &__order-actions {
    margin-top: $nk-spacing-sm;
    display: flex;
    gap: $nk-spacing-xs;
  }

  // ---- Order Form ----
  &__order-form {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-sm;
  }

  &__order-search-results {
    margin-top: 4px;
    border: 1px solid $nk-color-neutral-200;
    border-radius: $nk-radius-md;
    max-height: 200px;
    overflow-y: auto;
  }

  &__order-search-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $nk-spacing-xs $nk-spacing-sm;
    cursor: pointer;
    font-size: $nk-font-size-sm;
    transition: background $nk-duration-fast;

    &:hover {
      background: $nk-color-neutral-100;
    }
  }

  &__order-items {
    margin-top: $nk-spacing-sm;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__order-item {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    padding: $nk-spacing-xs $nk-spacing-sm;
    background: $nk-color-neutral-50;
    border-radius: $nk-radius-md;
    font-size: $nk-font-size-sm;
  }

  &__order-item-name {
    flex: 1;
  }

  // ---- Order Detail ----
  &__order-detail {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-sm;
  }

  // ---- Logs ----
  &__log-list {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-md;
  }

  &__log-card {
    transition: box-shadow $nk-duration-fast;
    &:hover {
      box-shadow: $nk-shadow-md;
    }
  }

  &__log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-xs;
  }

  &__log-type {
    font-weight: $nk-font-weight-medium;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-900;
  }

  &__log-date {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
  }

  &__log-meta {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
    display: flex;
    gap: $nk-spacing-md;
    flex-wrap: wrap;
  }

  // ---- Inbound Search ----
  &__inbound-search-results {
    margin-top: $nk-spacing-sm;
    border: 1px solid $nk-color-neutral-200;
    border-radius: $nk-radius-md;
    max-height: 240px;
    overflow-y: auto;
  }

  &__inbound-search-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $nk-spacing-xs $nk-spacing-sm;
    font-size: $nk-font-size-sm;
    border-bottom: 1px solid $nk-color-neutral-100;
  }

  &__inbound-search-info {
    display: flex;
    flex-direction: column;
  }

  &__inbound-search-stock {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
  }

  &__inbound-search-action {
    display: flex;
    align-items: center;
    gap: $nk-spacing-xs;
  }

  &__inbound-import-list {
    margin-top: $nk-spacing-md;
  }

  &__inbound-import-header {
    font-size: $nk-font-size-sm;
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-700;
    margin-bottom: $nk-spacing-xs;
  }

  &__inbound-import-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    font-size: $nk-font-size-sm;
  }

  // ---- Settings ----
  &__settings-section {
    margin-top: $nk-spacing-md;
  }

  &__settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-sm;
    font-weight: $nk-font-weight-medium;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-700;
  }

  &__settings-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__settings-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $nk-spacing-xs $nk-spacing-sm;
    border-radius: $nk-radius-md;
    font-size: $nk-font-size-sm;
    transition: background $nk-duration-fast;

    &:hover {
      background: $nk-color-neutral-50;
    }
  }

  &__settings-item-name {
    color: $nk-color-neutral-800;
  }
}
</style>
