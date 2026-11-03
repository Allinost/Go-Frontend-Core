<template>
  <div class="goodser">
    <div class="goodser__header">
      <h2 class="goodser__title">Goodser 商品管理</h2>
      <NkButton size="sm" variant="ghost" @click="showSettings = true">设置</NkButton>
    </div>

    <div class="goodser__tabs">
      <NkTabs v-model="activeTab" :items="tabs" />
    </div>

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

        <div class="goodser__batch-bar" v-if="products.length">
          <div @click.stop>
            <NkCheckbox size="sm" :model-value="allPageSelected" @change="toggleSelectAllProducts">全选本页</NkCheckbox>
          </div>
          <span v-if="selectedProductIds.length" class="goodser__count">已选 {{ selectedProductIds.length }} 件</span>
          <div v-if="selectedProductIds.length" class="goodser__batch-actions">
            <NkButton size="xs" variant="ghost" @click="clearProductSelection">取消选择</NkButton>
            <NkButton size="xs" variant="ghost" type="danger" @click="showBatchDeleteDialog = true">批量删除</NkButton>
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
              <div class="goodser__product-card-left">
                <div @click.stop>
                  <NkCheckbox
                    size="sm"
                    :model-value="selectedProductIds.includes(p._id)"
                    @change="toggleProductSelection(p._id, $event)"
                  />
                </div>
                <div class="goodser__product-code">{{ p.code }}</div>
              </div>
              <NkTag size="sm">{{ p.status_code }}</NkTag>
            </div>
            <div class="goodser__product-name">{{ p.name }}</div>
            <div class="goodser__product-meta">
              <span>可用 {{ p.quantity }}</span>
              <span v-if="p.reserved_quantity">锁定 {{ p.reserved_quantity }}</span>
              <span>总量 {{ p.total_quantity ?? p.quantity + (p.reserved_quantity || 0) }}</span>
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

      <!-- ==================== 系列视图 Tab ==================== -->
      <SeriesTab
        v-if="activeTab === 'series'"
        v-model:inventory-id="currentInventoryId"
        :inventories="inventories"
        @open-series="openSeriesProducts"
      />

      <!-- ==================== 组合包 Tab ==================== -->
      <CombosTab
        v-if="activeTab === 'combos'"
        v-model:inventory-id="currentInventoryId"
        :inventories="inventories"
        @changed="fetchCombos"
      />

      <!-- ==================== 捆 Tab ==================== -->
      <BundlesTab
        v-if="activeTab === 'bundles'"
        v-model:inventory-id="currentInventoryId"
        :inventories="inventories"
        :dictionaries="dictionaries"
        :status-codes="statusCodes"
        @order-bundle="openCreateOrder('outbound', $event)"
        @changed="fetchBundles"
      />

      <!-- ==================== 统计 Tab ==================== -->
      <StatsTab
        v-if="activeTab === 'stats'"
        v-model:inventory-id="currentInventoryId"
        :inventories="inventories"
      />

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
              <template v-if="o.type === 'reserve'">
                <NkButton size="xs" variant="ghost" @click="openConvertReserve(o)">转出库</NkButton>
                <NkButton size="xs" variant="ghost" type="danger" @click="handleCancelReserve(o)">取消预留</NkButton>
              </template>
              <template v-else>
                <NkButton size="xs" variant="ghost" @click="handleConfirmOrder(o)">确认出库</NkButton>
                <NkButton size="xs" variant="ghost" type="danger" @click="handleCancelOrder(o)">取消</NkButton>
              </template>
            </div>
            <div v-else-if="canReturn(o)" class="goodser__order-actions" @click.stop>
              <NkButton size="xs" variant="ghost" @click="openReturnDialog(o)">退货</NkButton>
            </div>
          </NkCard>
        </div>
      </div>

      <!-- ==================== 退货单 Tab ==================== -->
      <ReturnsTab
        v-if="activeTab === 'returns'"
        :inventory-id="currentInventoryId"
        @view-order="openOrderById"
        @changed="handleReturnsChanged"
      />

      <!-- ==================== 入库记录 Tab ==================== -->
      <LogsTab
        v-if="activeTab === 'logs'"
        :inventory-id="currentInventoryId"
        :status-codes="statusCodes"
        @changed="searchProducts"
      />

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
    <NkDialog v-model:visible="showBatchDeleteDialog" title="批量删除商品" :width="420">
      <p>确定删除已选的 <strong>{{ selectedProductIds.length }}</strong> 件商品吗？仅可用与锁定库存均为 0 的商品可删除，删除后不可恢复。</p>
      <template #footer>
        <NkButton variant="ghost" @click="showBatchDeleteDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="batchDeleting" @click="handleBatchDeleteProducts">删除</NkButton>
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
        <label class="goodser__filter-label">系列 / 角色</label>
        <NkSelect v-model="productFilterSeries" :options="filterSeriesOptions" placeholder="全部系列" />
        <NkSelect
          v-model="productFilterCharacter"
          :options="filterCharacterOptions"
          placeholder="全部角色"
          style="margin-top:6px"
        />
      </div>
      <div class="goodser__filter-section">
        <label class="goodser__filter-label">套型 / 商品类型</label>
        <NkSelect v-model="productFilterSetType" :options="filterSetTypeOptions" placeholder="全部套型" />
        <NkSelect
          v-model="productFilterProductType"
          :options="filterProductTypeOptions"
          placeholder="全部商品类型"
          style="margin-top:6px"
        />
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
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">系列</label>
            <NkSelect v-model="productForm.series_id" :options="seriesOptions" placeholder="未设置" />
          </div>
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">套型</label>
            <NkSelect v-model="productForm.set_type_id" :options="setTypeOptions" placeholder="未设置" />
          </div>
          <div class="goodser__form-field goodser__form-field--third">
            <label class="goodser__form-label">商品类型</label>
            <NkSelect v-model="productForm.product_type_id" :options="productTypeOptions" placeholder="未设置" />
          </div>
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field">
            <label class="goodser__form-label">角色（可多选）</label>
            <div class="goodser__tag-selector">
              <span
                v-for="ch in characterDictionaries"
                :key="ch._id"
                class="goodser__tag-chip"
                :class="{ 'goodser__tag-chip--selected': productFormCharacters.includes(ch._id) }"
                @click="toggleProductCharacter(ch._id)"
              >{{ ch.name }}</span>
              <span v-if="!characterDictionaries.length" class="goodser__return-tip">暂无角色字典，请先在设置中创建</span>
            </div>
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
        <div class="goodser__detail-row"><span class="goodser__detail-label">库存</span><span>可用 {{ detailProduct.quantity }} · 锁定 {{ detailProduct.reserved_quantity || 0 }} · 总量 {{ detailProduct.total_quantity ?? detailProduct.quantity + (detailProduct.reserved_quantity || 0) }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">状态</span><NkTag size="sm">{{ detailProduct.status_code }}</NkTag></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">系列</span><span>{{ dictionaryName(detailProduct.series_id) }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">角色</span><span>{{ characterNames(detailProduct.character_ids) }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">套型</span><span>{{ dictionaryName(detailProduct.set_type_id) }}</span></div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">商品类型</span><span>{{ dictionaryName(detailProduct.product_type_id) }}</span></div>
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
          <label class="goodser__form-label">组合包（可选）</label>
          <div class="goodser__combo-picker">
            <NkSelect
              v-model="orderForm.combo_id"
              :options="comboSelectOptions"
              placeholder="不使用组合包"
              :disabled="!!bundleOrder.bundle_id"
              @change="onComboChange"
            />
            <NkInput
              v-if="orderForm.combo_id"
              v-model="orderForm.combo_quantity"
              type="number"
              size="sm"
              style="width:90px"
              placeholder="数量"
            />
          </div>
          <p v-if="orderForm.combo_id" class="goodser__return-tip">提交后会按组件明细展开并扣减组件库存。</p>
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">捆（可选）</label>
          <NkSelect
            v-model="bundleOrder.bundle_id"
            :options="bundleSelectOptions"
            placeholder="不使用捆"
            :disabled="!!orderForm.combo_id"
            @change="onBundleOrderChange"
          />
          <template v-if="bundleOrder.bundle_id && selectedBundle">
            <div class="goodser__form-row" style="margin-top:8px">
              <div class="goodser__form-field">
                <label class="goodser__form-label">主商品</label>
                <NkSelect
                  v-model="bundleOrder.main_product_id"
                  :options="bundleMainOrderOptions"
                  placeholder="选择主商品"
                  @change="refreshBundleOrderPreview"
                />
              </div>
              <div class="goodser__form-field goodser__form-field--third">
                <label class="goodser__form-label">主商品数量 / 单捆</label>
                <NkInput
                  v-model="bundleOrder.main_quantity"
                  type="number"
                  size="sm"
                  @change="refreshBundleOrderPreview"
                />
              </div>
              <div class="goodser__form-field goodser__form-field--third">
                <label class="goodser__form-label">捆数</label>
                <NkInput
                  v-model="bundleOrder.quantity"
                  type="number"
                  size="sm"
                  @change="refreshBundleOrderPreview"
                />
              </div>
            </div>
            <div class="goodser__order-items" style="margin-top:8px">
              <div class="goodser__form-label">副区商品数量 / 单捆</div>
              <div v-for="s in selectedBundle.sub_products" :key="s.product_id" class="goodser__order-item">
                <span class="goodser__order-item-name">
                  {{ s.product_name }}（{{ s.product_code }} · 可用 {{ s.available }}）
                </span>
                <NkInput
                  v-model="bundleOrder.sub_quantities[s.product_id]"
                  type="number"
                  size="xs"
                  style="width:80px"
                  @change="refreshBundleOrderPreview"
                />
              </div>
            </div>
            <p v-if="bundlePreviewError" class="goodser__return-tip" style="color:#d4380d">{{ bundlePreviewError }}</p>
            <p v-else-if="bundlePreview" class="goodser__return-tip">
              单捆 ¥{{ bundlePreview.unit_price }} · 共 {{ bundlePreview.quantity }} 捆 · 总价 ¥{{ bundlePreview.total_price }}
              （主商品 ¥{{ bundlePreview.main_amount }} / 副区 ¥{{ bundlePreview.sub_amount }}）
            </p>
            <p v-else-if="bundlePreviewLoading" class="goodser__return-tip">正在计算捆价格...</p>
          </template>
        </div>
        <div v-if="!bundleOrder.bundle_id" class="goodser__form-field">
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
        <NkButton :loading="saving" :disabled="!orderForm.order_no.trim() || (!orderFormItems.length && !orderForm.combo_id && !bundleOrder.bundle_id) || (!!bundleOrder.bundle_id && !bundlePreview)" @click="handleCreateOrder">确定</NkButton>
      </template>
    </NkDialog>

    <!-- Order Detail -->
    <NkDialog v-model:visible="showOrderDetail" :title="'订单 ' + (detailOrder?.order_no || '')" :width="520">
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
        <div v-if="detailOrder.bundle_snapshot" class="goodser__detail-row">
          <span class="goodser__detail-label">捆</span>
          <span>
            {{ detailOrder.bundle_snapshot.bundle_name }} × {{ detailOrder.bundle_quantity }}
            · 单捆 ¥{{ detailOrder.bundle_snapshot.unit_price }}
            · 总价 ¥{{ detailOrder.bundle_snapshot.total_price }}
          </span>
        </div>
        <div class="goodser__detail-row"><span class="goodser__detail-label">创建时间</span><span>{{ formatDate(detailOrder.created_at) }}</span></div>
        <div v-if="detailOrder.confirmed_at" class="goodser__detail-row"><span class="goodser__detail-label">确认时间</span><span>{{ formatDate(detailOrder.confirmed_at) }}</span></div>
        <div v-if="detailOrder.converted_at" class="goodser__detail-row"><span class="goodser__detail-label">转出库时间</span><span>{{ formatDate(detailOrder.converted_at) }}</span></div>
        <div v-if="detailOrder.returned_at" class="goodser__detail-row"><span class="goodser__detail-label">全部退货时间</span><span>{{ formatDate(detailOrder.returned_at) }}</span></div>

        <template v-if="detailOrder.type === 'outbound'">
          <div class="goodser__detail-row" style="margin-top:12px">
            <span class="goodser__detail-label">退货记录</span>
            <span>{{ orderReturns.length ? `${orderReturns.length} 条` : '无' }}</span>
          </div>
          <NkLoading v-if="loadingReturns" />
          <div v-for="ret in orderReturns" :key="ret._id" class="goodser__return-item">
            <div class="goodser__return-item-head">
              <NkTag :type="returnStatusType(ret.status)" size="sm">{{ returnStatusLabel(ret.status) }}</NkTag>
              <span class="goodser__return-reason">{{ returnReasonLabel(ret.reason) }}</span>
              <span class="goodser__return-date">{{ formatDate(ret.created_at) }}</span>
            </div>
            <div class="goodser__return-item-body">
              <span v-for="(it, i) in ret.items || []" :key="i" class="goodser__return-item-line">
                {{ it.product_name }} × {{ it.quantity }}{{ it.restock ? ' · 回库' : '' }}
              </span>
            </div>
            <div v-if="ret.status === 'pending'" class="goodser__order-actions">
              <NkButton size="xs" variant="ghost" @click="handleConfirmReturn(ret)">确认退货</NkButton>
              <NkButton size="xs" variant="ghost" type="danger" @click="handleCancelReturn(ret)">取消</NkButton>
            </div>
          </div>
        </template>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showOrderDetail = false">关闭</NkButton>
        <NkButton v-if="detailOrder && canReturn(detailOrder)" @click="openReturnDialog(detailOrder)">退货</NkButton>
      </template>
    </NkDialog>

    <!-- Create Return Order -->
    <NkDialog v-model:visible="showReturnDialog" title="新建退货单" :width="580">
      <div v-if="returnOrder" class="goodser__return-form">
        <div class="goodser__detail-row"><span class="goodser__detail-label">原出库单</span><span>{{ returnOrder.order_no }}</span></div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">退货原因</label>
          <NkSelect v-model="returnReason" :options="returnReasonOptions" @change="onReturnReasonChange" />
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">退货商品（可多选）</label>
          <div v-if="!returnFormItems.length" class="goodser__empty">
            <NkEmpty description="该订单已无可退商品" />
          </div>
          <div v-for="(item, idx) in returnFormItems" :key="idx" class="goodser__return-row">
            <NkCheckbox v-model="item.selected" :disabled="item.maxQuantity <= 0" />
            <span class="goodser__return-name">{{ item.product_name }} ({{ item.product_code }})</span>
            <span class="goodser__return-max">可退 {{ item.maxQuantity }}</span>
            <NkInput
              v-model="item.quantity"
              type="number"
              size="xs"
              style="width:70px"
              :disabled="!item.selected || item.maxQuantity <= 0"
            />
            <NkCheckbox
              v-model="item.restock"
              size="sm"
              :disabled="returnReason === 'refund_only' || !item.selected"
            >回库</NkCheckbox>
          </div>
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">备注</label>
          <NkTextarea v-model="returnRemark" placeholder="退货备注" />
        </div>
        <p class="goodser__return-tip">创建后需在订单详情中确认退货，确认时才按“回库”设置调整库存。</p>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showReturnDialog = false">取消</NkButton>
        <NkButton :loading="saving" :disabled="!returnFormItems.some((i) => i.selected)" @click="handleCreateReturn">创建退货单</NkButton>
      </template>
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
      <div v-if="settingsTab === 'dictionaries'" class="goodser__settings-section">
        <div class="goodser__settings-header">
          <span>维度字典</span>
          <NkButton size="xs" @click="openCreateDictionary">新建{{ dictionaryKindLabel }}</NkButton>
        </div>
        <div class="goodser__sort-chips" style="margin-bottom: 8px">
          <span
            v-for="kind in dictionaryKindOptions"
            :key="kind.value"
            class="goodser__sort-chip"
            :class="{ 'goodser__sort-chip--active': dictionaryKind === kind.value }"
            @click="switchDictionaryKind(kind.value)"
          >{{ kind.label }}</span>
        </div>
        <NkLoading v-if="loadingDictionaries" />
        <div v-else class="goodser__settings-list">
          <div v-for="d in dictionariesForKind" :key="d._id" class="goodser__settings-item">
            <span class="goodser__settings-item-name">
              {{ d.name }}
              <span class="goodser__dictionary-code">{{ d.code }}</span>
              <span v-if="d.kind === 'character' && d.parent_id" class="goodser__dictionary-code">
                · {{ dictionaryName(d.parent_id) }}
              </span>
              <NkTag v-if="!d.enabled" size="xs" type="info" style="margin-left:4px">停用</NkTag>
            </span>
            <span class="goodser__settings-item-actions">
              <NkButton size="xs" variant="ghost" @click="openEditDictionary(d)">编辑</NkButton>
              <NkButton size="xs" variant="ghost" type="danger" @click="handleDeleteDictionary(d)">删除</NkButton>
            </span>
          </div>
          <div v-if="!dictionariesForKind.length" class="goodser__empty">
            <NkEmpty :description="`暂无${dictionaryKindLabel}字典`" />
          </div>
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

    <!-- Create/Edit Dictionary -->
    <NkDialog
      v-model:visible="showDictionaryDialog"
      :title="(editingDictionary ? '编辑' : '新建') + dictionaryKindLabel"
      :width="440"
    >
      <div class="goodser__product-form">
        <div v-if="dictionaryKind === 'character'" class="goodser__form-field">
          <label class="goodser__form-label">所属系列</label>
          <NkSelect v-model="dictionaryForm.parent_id" :options="parentSeriesOptions" placeholder="不归属系列" />
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">名称 *</label>
          <NkInput v-model="dictionaryForm.name" placeholder="显示名称" />
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">编码 *</label>
          <NkInput v-model="dictionaryForm.code" placeholder="唯一编码，例如 genshin" />
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">排序</label>
            <NkInput v-model="dictionaryForm.sort_order" type="number" placeholder="0" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">启用</label>
            <div style="padding-top: 6px">
              <NkCheckbox v-model="dictionaryForm.enabled">启用</NkCheckbox>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showDictionaryDialog = false">取消</NkButton>
        <NkButton
          :loading="saving"
          :disabled="!dictionaryForm.name.trim() || !dictionaryForm.code.trim()"
          @click="handleSaveDictionary"
        >保存</NkButton>
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
  createReturn, loadReturns, confirmReturn, cancelReturn,
  loadTags, createTag, deleteTag,
  loadStatusCodes, addStatusCode, removeStatusCode,
  loadDictionaries, createDictionary, updateDictionary, deleteDictionary,
  loadCombos,
  loadBundles, previewBundle,
} from '@/api/goodser'
import type {
  Inventory, Product, OutboundOrder, OrderItem, GoodserTag, StatusCode,
  ReturnOrder, ReturnReason,
  Dictionary, DictionaryKind, SeriesSummary, Combo,
  Bundle, BundlePreviewResp,
} from '@/types/goodser'
import ReturnsTab from './components/ReturnsTab.vue'
import StatsTab from './components/StatsTab.vue'
import SeriesTab from './components/SeriesTab.vue'
import CombosTab from './components/CombosTab.vue'
import BundlesTab from './components/BundlesTab.vue'
import LogsTab from './components/LogsTab.vue'
import {
  bundlePriceModeLabel,
  formatDate,
  orderStatusLabel,
  orderStatusType,
  returnReasonLabel,
  returnStatusLabel,
  returnStatusType,
} from './utils'

// ---- Tabs ----
const activeTab = ref('products')
const tabs = [
  { label: '商品列表', value: 'products' },
  { label: '系列视图', value: 'series' },
  { label: '组合包', value: 'combos' },
  { label: '捆', value: 'bundles' },
  { label: '统计', value: 'stats' },
  { label: '出库订单', value: 'orders' },
  { label: '退货单', value: 'returns' },
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
  { label: '维度字典', value: 'dictionaries' },
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
const productFilterSeries = ref('')
const productFilterCharacter = ref('')
const productFilterSetType = ref('')
const productFilterProductType = ref('')
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
  series_id: '',
  set_type_id: '',
  product_type_id: '',
})
const productFormTags = ref<string[]>([])
const productFormCharacters = ref<string[]>([])

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
  productFilterZone.value ||
  productFilterStatus.value ||
  productFilterTag.value ||
  productFilterSeries.value ||
  productFilterCharacter.value ||
  productFilterSetType.value ||
  productFilterProductType.value,
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
  if (activeTab.value === 'orders') {
    fetchOrders()
  } else {
    searchProducts()
  }
}

async function searchProducts() {
  if (!currentInventoryId.value) return
  productPage.value = 1
  await goToPage(1)
}

const pageSize = 20
const productTotalPages = computed(() => Math.ceil(productTotal.value / pageSize) || 1)
const selectedProductIds = ref<string[]>([])
const allPageSelected = computed(() => products.value.length > 0 && products.value.every((p) => selectedProductIds.value.includes(p._id)))
const showBatchDeleteDialog = ref(false)
const batchDeleting = ref(false)

function toggleProductSelection(id: string, checked: boolean) {
  if (checked) {
    if (!selectedProductIds.value.includes(id)) selectedProductIds.value.push(id)
  } else {
    selectedProductIds.value = selectedProductIds.value.filter((item) => item !== id)
  }
}

function toggleSelectAllProducts(checked: boolean) {
  selectedProductIds.value = checked ? products.value.map((p) => p._id) : []
}

function clearProductSelection() {
  selectedProductIds.value = []
}

async function handleBatchDeleteProducts() {
  if (!selectedProductIds.value.length) return
  batchDeleting.value = true
  let success = 0
  let failed = 0
  for (const id of [...selectedProductIds.value]) {
    try {
      await deleteProduct({ id })
      success++
    } catch {
      failed++
    }
  }
  batchDeleting.value = false
  showBatchDeleteDialog.value = false
  selectedProductIds.value = []
  if (success) NKMessage.success(`已删除 ${success} 件商品`)
  if (failed) NKMessage.error(`${failed} 件商品删除失败，请检查库存或关联数据`)
  await searchProducts()
}

async function goToPage(page: number) {
  if (!currentInventoryId.value || page < 1) return
  productPage.value = page
  selectedProductIds.value = []
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
        series_id: productFilterSeries.value || undefined,
        character_id: productFilterCharacter.value || undefined,
        set_type_id: productFilterSetType.value || undefined,
        product_type_id: productFilterProductType.value || undefined,
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
  productFilterSeries.value = ''
  productFilterCharacter.value = ''
  productFilterSetType.value = ''
  productFilterProductType.value = ''
}

function applyProductFilter() {
  showProductFilter.value = false
  searchProducts()
}

function openCreateProduct() {
  editingProduct.value = null
  productForm.value = { name: '', main_zone: '', sub_zone: '', quantity: 0, status_code: '', original_price: null, market_price: null, expected_price: null, storage_location: '', remark: '', series_id: '', set_type_id: '', product_type_id: '' }
  productFormTags.value = []
  productFormCharacters.value = []
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
    series_id: p.series_id || '',
    set_type_id: p.set_type_id || '',
    product_type_id: p.product_type_id || '',
  }
  productFormTags.value = p.tags ? [...p.tags] : []
  productFormCharacters.value = p.character_ids ? [...p.character_ids] : []
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

function toggleProductCharacter(characterId: string) {
  const idx = productFormCharacters.value.indexOf(characterId)
  if (idx >= 0) {
    productFormCharacters.value.splice(idx, 1)
  } else {
    productFormCharacters.value.push(characterId)
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
        // 传空字符串表示清空：后端把空字符串归一为 NULL，
        // 而 null 会被当成“不修改”导致清空无效。
        series_id: form.series_id || '',
        set_type_id: form.set_type_id || '',
        product_type_id: form.product_type_id || '',
        character_ids: productFormCharacters.value,
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
        series_id: form.series_id || null,
        set_type_id: form.set_type_id || null,
        product_type_id: form.product_type_id || null,
        character_ids: productFormCharacters.value,
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
const orderForm = ref({ order_no: '', order_info: '', remark: '', combo_id: '', combo_quantity: 1 })
const orderFormItems = ref<OrderItem[]>([])
const orderProductQuery = ref('')
const orderSearchResults = ref<Product[]>([])
const bundleOrder = ref({
  bundle_id: '',
  main_product_id: '',
  main_quantity: 1,
  quantity: 1,
  sub_quantities: {} as Record<string, number>,
})
const bundlePreview = ref<BundlePreviewResp | null>(null)
const bundlePreviewLoading = ref(false)
const bundlePreviewError = ref('')
const detailOrder = ref<OutboundOrder | null>(null)
const convertingOrder = ref<OutboundOrder | null>(null)
const convertOrderNo = ref('')

// ---- Returns ----
const showReturnDialog = ref(false)
const returnOrder = ref<OutboundOrder | null>(null)
const returnReason = ref<ReturnReason>('return_refund')
const returnRemark = ref('')
const orderReturns = ref<ReturnOrder[]>([])
const loadingReturns = ref(false)
const returnFormItems = ref<Array<{
  product_id: string
  product_name: string
  product_code: string
  quantity: number
  restock: boolean
  image_url?: string | null
  selected: boolean
  maxQuantity: number
}>>([])
const returnReasonOptions = [
  { label: '退货退款（默认回库）', value: 'return_refund' },
  { label: '仅退款（不回库）', value: 'refund_only' },
  { label: '运损（默认不回库）', value: 'shipping_damage' },
  { label: '其他', value: 'other' },
]

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

async function openOrderById(outboundOrderId: string) {
  let order = orders.value.find((item) => item._id === outboundOrderId)
  if (!order) {
    await fetchOrders()
    order = orders.value.find((item) => item._id === outboundOrderId)
  }
  if (order) {
    openOrderDetail(order)
  } else {
    NKMessage.warning('未找到关联出库单，请刷新后重试')
  }
}

async function handleReturnsChanged() {
  await fetchOrders()
  await searchProducts()
}

function openCreateOrder(type: 'outbound' | 'reserve', bundleId?: string) {
  orderFormType.value = type
  orderForm.value = { order_no: '', order_info: '', remark: '', combo_id: '', combo_quantity: 1 }
  orderFormItems.value = []
  orderProductQuery.value = ''
  orderSearchResults.value = []
  bundleOrder.value = { bundle_id: '', main_product_id: '', main_quantity: 1, quantity: 1, sub_quantities: {} }
  bundlePreview.value = null
  bundlePreviewError.value = ''
  if (!combos.value.length) {
    fetchCombos()
  }
  if (!bundles.value.length) {
    fetchBundles()
  }
  showOrderForm.value = true
  if (bundleId) {
    bundleOrder.value.bundle_id = bundleId
    onBundleOrderChange()
  }
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
  if (!currentInventoryId.value || !orderForm.value.order_no.trim()) return
  if (!orderFormItems.value.length && !orderForm.value.combo_id && !bundleOrder.value.bundle_id) return
  if (bundleOrder.value.bundle_id && !bundlePreview.value) return
  saving.value = true
  try {
    const items = orderFormItems.value.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      product_code: i.product_code,
      quantity: Number(i.quantity) || 1,
    }))
    const bundleSelection = bundleOrder.value.bundle_id
      ? {
          bundle_id: bundleOrder.value.bundle_id,
          main_product_id: bundleOrder.value.main_product_id,
          main_quantity: Number(bundleOrder.value.main_quantity) || 1,
          quantity: Number(bundleOrder.value.quantity) || 1,
          sub_items: Object.entries(bundleOrder.value.sub_quantities)
            .map(([product_id, quantity]) => ({ product_id, quantity: Number(quantity) || 0 }))
            .filter((item) => item.quantity > 0),
        }
      : null
    await createOutbound({
      inventory_id: currentInventoryId.value,
      order_no: orderForm.value.order_no.trim(),
      type: orderFormType.value,
      order_info: orderForm.value.order_info || undefined,
      remark: orderForm.value.remark || undefined,
      items: bundleSelection ? [] : items,
      combo_id: orderForm.value.combo_id || null,
      combo_quantity: orderForm.value.combo_id ? Number(orderForm.value.combo_quantity) || 1 : null,
      bundle: bundleSelection,
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
  orderReturns.value = []
  showOrderDetail.value = true
  if (order.type === 'outbound') {
    loadOrderReturns(order)
  }
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
    await reserveToOutbound({
      id: convertingOrder.value._id,
      inventory_id: convertingOrder.value.inventory_id,
      order_no: convertOrderNo.value.trim(),
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

function canReturn(order: OutboundOrder | null) {
  if (!order || order.type !== 'outbound') return false
  return order.status === 'confirmed' || order.status === 'partially_returned'
}

async function loadOrderReturns(order: OutboundOrder) {
  loadingReturns.value = true
  try {
    const res = await loadReturns(order.inventory_id, order._id)
    orderReturns.value = res.data || []
  } catch (err: any) {
    orderReturns.value = []
    NKMessage.error(err.message || '加载退货记录失败')
  } finally {
    loadingReturns.value = false
  }
}

async function openReturnDialog(order: OutboundOrder) {
  returnOrder.value = order
  returnReason.value = 'return_refund'
  returnRemark.value = ''
  showOrderDetail.value = false
  showReturnDialog.value = true

  let existing = orderReturns.value
  if (detailOrder.value?._id !== order._id || !existing.length) {
    try {
      const res = await loadReturns(order.inventory_id, order._id)
      existing = res.data || []
    } catch (err: any) {
      NKMessage.error(err.message || '加载退货记录失败')
      showReturnDialog.value = false
      return
    }
  }

  const returned: Record<string, number> = {}
  for (const ret of existing) {
    if (ret.status === 'cancelled') continue
    for (const item of ret.items || []) {
      returned[item.product_id] = (returned[item.product_id] || 0) + item.quantity
    }
  }

  returnFormItems.value = (order.items || []).map((item) => {
    const maxQuantity = Math.max(0, item.quantity - (returned[item.product_id] || 0))
    return {
      product_id: item.product_id,
      product_name: item.product_name,
      product_code: item.product_code,
      quantity: maxQuantity,
      restock: true,
      image_url: item.image_url,
      selected: maxQuantity > 0,
      maxQuantity,
    }
  })
}

function onReturnReasonChange() {
  const restock = returnReason.value === 'return_refund'
  for (const item of returnFormItems.value) {
    item.restock = restock
  }
}

async function handleCreateReturn() {
  if (!returnOrder.value) return
  const items = returnFormItems.value
    .filter((i) => i.selected && Number(i.quantity) > 0)
    .map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      product_code: i.product_code,
      quantity: Math.min(Number(i.quantity) || 0, i.maxQuantity),
      restock: returnReason.value === 'refund_only' ? false : !!i.restock,
      image_url: i.image_url,
    }))
  if (!items.length) {
    NKMessage.warning('请选择退货商品和数量')
    return
  }

  saving.value = true
  try {
    const order = returnOrder.value
    await createReturn(order.inventory_id, order._id, {
      outbound_order_id: order._id,
      reason: returnReason.value,
      remark: returnRemark.value || undefined,
      items,
    })
    NKMessage.success('退货单已创建，请在订单详情中确认')
    showReturnDialog.value = false
    await fetchOrders()
    detailOrder.value = orders.value.find((o) => o._id === order._id) || order
    showOrderDetail.value = true
    await loadOrderReturns(detailOrder.value)
  } catch (err: any) {
    NKMessage.error(err.message || '创建退货单失败')
  } finally {
    saving.value = false
  }
}

async function handleConfirmReturn(ret: ReturnOrder) {
  saving.value = true
  try {
    await confirmReturn(ret.inventory_id, ret._id)
    NKMessage.success('退货已确认')
    await fetchOrders()
    if (detailOrder.value) {
      detailOrder.value = orders.value.find((o) => o._id === detailOrder.value!._id) || detailOrder.value
      await loadOrderReturns(detailOrder.value)
    }
    await searchProducts()
  } catch (err: any) {
    NKMessage.error(err.message || '确认退货失败')
  } finally {
    saving.value = false
  }
}

async function handleCancelReturn(ret: ReturnOrder) {
  saving.value = true
  try {
    await cancelReturn(ret.inventory_id, ret._id)
    NKMessage.success('退货单已取消')
    if (detailOrder.value) {
      await loadOrderReturns(detailOrder.value)
    }
  } catch (err: any) {
    NKMessage.error(err.message || '取消退货失败')
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

// ---- P1 Dictionaries ----
const dictionaries = ref<Dictionary[]>([])
const loadingDictionaries = ref(false)
const dictionaryKind = ref<DictionaryKind>('series')
const showDictionaryDialog = ref(false)
const editingDictionary = ref<Dictionary | null>(null)
const dictionaryForm = ref({
  name: '',
  code: '',
  parent_id: '',
  sort_order: 0,
  enabled: true,
})
const dictionaryKindOptions: Array<{ label: string; value: DictionaryKind }> = [
  { label: '系列', value: 'series' },
  { label: '角色', value: 'character' },
  { label: '套型', value: 'set_type' },
  { label: '商品类型', value: 'product_type' },
]
const dictionaryKindLabel = computed(
  () => dictionaryKindOptions.find((k) => k.value === dictionaryKind.value)?.label || '字典',
)
const dictionariesForKind = computed(() =>
  dictionaries.value.filter((d) => d.kind === dictionaryKind.value),
)
const seriesDictionaries = computed(() =>
  dictionaries.value.filter((d) => d.kind === 'series' && d.enabled),
)
const characterDictionaries = computed(() =>
  dictionaries.value.filter((d) => d.kind === 'character' && d.enabled),
)
const setTypeDictionaries = computed(() =>
  dictionaries.value.filter((d) => d.kind === 'set_type' && d.enabled),
)
const productTypeDictionaries = computed(() =>
  dictionaries.value.filter((d) => d.kind === 'product_type' && d.enabled),
)
const seriesOptions = computed(() =>
  seriesDictionaries.value.map((d) => ({ label: d.name, value: d._id })),
)
const setTypeOptions = computed(() =>
  setTypeDictionaries.value.map((d) => ({ label: d.name, value: d._id })),
)
const productTypeOptions = computed(() =>
  productTypeDictionaries.value.map((d) => ({ label: d.name, value: d._id })),
)
const filterSeriesOptions = computed(() => [{ label: '全部系列', value: '' }, ...seriesOptions.value])
const filterCharacterOptions = computed(() => [
  { label: '全部角色', value: '' },
  ...characterDictionaries.value.map((d) => ({ label: d.name, value: d._id })),
])
const filterSetTypeOptions = computed(() => [{ label: '全部套型', value: '' }, ...setTypeOptions.value])
const parentSeriesOptions = computed(() => [{ label: '不归属系列', value: '' }, ...seriesOptions.value])
const filterProductTypeOptions = computed(() => [
  { label: '全部商品类型', value: '' },
  ...productTypeOptions.value,
])

async function fetchDictionaries() {
  loadingDictionaries.value = true
  try {
    const res = await loadDictionaries()
    dictionaries.value = res.data?.items || []
  } catch (err: any) {
    dictionaries.value = []
    NKMessage.error(err.message || '加载维度字典失败')
  } finally {
    loadingDictionaries.value = false
  }
}

function switchDictionaryKind(kind: DictionaryKind) {
  dictionaryKind.value = kind
}

function openCreateDictionary() {
  editingDictionary.value = null
  dictionaryForm.value = {
    name: '',
    code: '',
    parent_id: '',
    sort_order: 0,
    enabled: true,
  }
  showDictionaryDialog.value = true
}

function openEditDictionary(item: Dictionary) {
  editingDictionary.value = item
  dictionaryForm.value = {
    name: item.name,
    code: item.code,
    parent_id: item.parent_id || '',
    sort_order: item.sort_order,
    enabled: item.enabled,
  }
  showDictionaryDialog.value = true
}

async function handleSaveDictionary() {
  const form = dictionaryForm.value
  if (!form.name.trim() || !form.code.trim()) return
  saving.value = true
  try {
    const parentId = dictionaryKind.value === 'character' ? form.parent_id || '' : null
    if (editingDictionary.value) {
      await updateDictionary({
        id: editingDictionary.value._id,
        name: form.name.trim(),
        code: form.code.trim(),
        parent_id: parentId,
        sort_order: Number(form.sort_order) || 0,
        enabled: form.enabled,
      })
      NKMessage.success('更新成功')
    } else {
      await createDictionary({
        kind: dictionaryKind.value,
        name: form.name.trim(),
        code: form.code.trim(),
        parent_id: parentId,
        sort_order: Number(form.sort_order) || 0,
        enabled: form.enabled,
      })
      NKMessage.success('创建成功')
    }
    showDictionaryDialog.value = false
    await fetchDictionaries()
  } catch (err: any) {
    NKMessage.error(err.message || '保存字典失败')
  } finally {
    saving.value = false
  }
}

async function handleDeleteDictionary(item: Dictionary) {
  saving.value = true
  try {
    await deleteDictionary(item._id)
    NKMessage.success('已删除')
    await fetchDictionaries()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败，可能仍被引用')
  } finally {
    saving.value = false
  }
}

function dictionaryName(id?: string | null) {
  if (!id) return '-'
  return dictionaries.value.find((d) => d._id === id)?.name || id
}

function characterNames(ids?: string[] | null) {
  if (!ids?.length) return '-'
  return ids.map((id) => dictionaryName(id)).join('、')
}

// ---- P1 Series Summary ----
function openSeriesProducts(series: SeriesSummary) {
  if (!series.series_id) {
    NKMessage.info('该系列没有关联商品，或为未设置系列的商品')
    return
  }
  productFilterSeries.value = series.series_id
  activeTab.value = 'products'
  searchProducts()
}

// ---- P1 Combos ----
const combos = ref<Combo[]>([])
const comboSelectOptions = computed(() =>
  combos.value
    .filter((c) => c.status === 'active')
    .map((c) => ({ label: `${c.name}（可售 ${c.availability}）`, value: c._id })),
)

async function fetchCombos() {
  if (!currentInventoryId.value) return
  try {
    const res = await loadCombos(currentInventoryId.value)
    combos.value = res.data?.items || []
  } catch (err: any) {
    combos.value = []
    NKMessage.error(err.message || '加载组合包失败')
  }
}

// ---- P1.5 捆 ----
const bundles = ref<Bundle[]>([])
const bundleSelectOptions = computed(() =>
  bundles.value
    .filter((b) => b.status === 'active')
    .map((b) => ({ label: `${b.name}（${bundlePriceModeLabel(b.price_mode)}）`, value: b._id })),
)
const selectedBundle = computed(() =>
  bundles.value.find((b) => b._id === bundleOrder.value.bundle_id) || null,
)
const bundleMainOrderOptions = computed(() =>
  (selectedBundle.value?.main_products || []).map((p) => ({
    label: `${p.product_name}（${p.product_code} · 可用 ${p.available}）`,
    value: p.product_id,
  })),
)

async function fetchBundles() {
  if (!currentInventoryId.value) return
  try {
    const res = await loadBundles(currentInventoryId.value)
    bundles.value = res.data?.items || []
  } catch (err: any) {
    bundles.value = []
    NKMessage.error(err.message || '加载捆失败')
  }
}

function onComboChange() {
  if (!orderForm.value.combo_id) return
  bundleOrder.value = { bundle_id: '', main_product_id: '', main_quantity: 1, quantity: 1, sub_quantities: {} }
  bundlePreview.value = null
  bundlePreviewError.value = ''
}

function onBundleOrderChange() {
  bundlePreview.value = null
  bundlePreviewError.value = ''
  const selected = selectedBundle.value
  if (!selected) return
  orderForm.value.combo_id = ''
  orderFormItems.value = []
  const main = (selected.main_products || []).find((p) => p.available > 0) || selected.main_products?.[0]
  bundleOrder.value.main_product_id = main?.product_id || ''
  bundleOrder.value.main_quantity = selected.min_main_quantity || 1
  bundleOrder.value.quantity = 1
  const subQuantities: Record<string, number> = {}
  for (const item of selected.sub_products || []) {
    subQuantities[item.product_id] = item.default_quantity || 1
  }
  bundleOrder.value.sub_quantities = subQuantities
  refreshBundleOrderPreview()
}

async function refreshBundleOrderPreview() {
  bundlePreview.value = null
  bundlePreviewError.value = ''
  const selected = selectedBundle.value
  if (!selected || !bundleOrder.value.main_product_id) return
  const subItems = Object.entries(bundleOrder.value.sub_quantities)
    .map(([product_id, quantity]) => ({ product_id, quantity: Number(quantity) || 0 }))
    .filter((item) => item.quantity > 0)
  bundlePreviewLoading.value = true
  try {
    const res = await previewBundle(selected._id, {
      main_product_id: bundleOrder.value.main_product_id,
      main_quantity: Number(bundleOrder.value.main_quantity) || 1,
      quantity: Number(bundleOrder.value.quantity) || 1,
      sub_items: subItems,
    })
    bundlePreview.value = res.data || null
  } catch (err: any) {
    bundlePreviewError.value = err.message || '捆校验失败'
  } finally {
    bundlePreviewLoading.value = false
  }
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
})

// ---- Init ----
onMounted(async () => {
  await fetchInventories()
  await fetchTags()
  await fetchStatusCodes()
  await fetchDictionaries()
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

  &__tabs {
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 1px;
    -webkit-overflow-scrolling: touch;

    :deep(.nk-tabs__header) {
      min-width: max-content;
    }

    &::-webkit-scrollbar {
      height: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: $nk-color-neutral-200;
      border-radius: 2px;
    }
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
      background: $nk-color-neutral-100;
      color: $nk-color-primary-600;
      font-weight: $nk-font-weight-medium;
    }
  }

  // ---- Product Cards ----
  &__batch-bar {
    display: flex;
    align-items: center;
    gap: $nk-spacing-md;
    margin-bottom: $nk-spacing-md;
    padding: 8px 12px;
    border-radius: $nk-radius-md;
    background: $nk-color-neutral-100;
    font-size: $nk-font-size-sm;
  }

  &__batch-actions {
    display: flex;
    gap: $nk-spacing-xs;
    margin-left: auto;
  }

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

  &__product-card-left {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    min-width: 0;
  }

  &__product-code {
    font-size: $nk-font-size-sm;
    color: $nk-color-primary-600;
    font-weight: $nk-font-weight-medium;
    font-family: $nk-font-family-mono;
    letter-spacing: 0.2px;
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
      background: $nk-color-neutral-100;
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
      background: $nk-color-neutral-100;
    }

    &--selected {
      background: $nk-color-neutral-100;
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

  // ---- Series / Combos ----
  &__combo-picker {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
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

  // ---- Return list ----
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

  // ---- Returns ----
  &__return-form {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-sm;
  }

  &__return-row {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    padding: $nk-spacing-xs $nk-spacing-sm;
    background: $nk-color-neutral-50;
    border-radius: $nk-radius-md;
    font-size: $nk-font-size-sm;
  }

  &__return-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__return-max {
    color: $nk-color-neutral-500;
    font-size: $nk-font-size-xs;
    flex-shrink: 0;
  }

  &__return-tip {
    margin: 0;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
  }

  &__return-item {
    padding: $nk-spacing-sm;
    border: 1px solid $nk-color-neutral-200;
    border-radius: $nk-radius-md;
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-xs;
  }

  &__return-item-head {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    font-size: $nk-font-size-xs;
  }

  &__return-reason {
    color: $nk-color-neutral-700;
  }

  &__return-date {
    margin-left: auto;
    color: $nk-color-neutral-500;
  }

  &__return-item-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-700;
  }

  &__return-item-line {
    display: block;
  }

  // ---- Logs ----
  // ---- Inbound Search ----
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

  &__settings-item-actions {
    display: flex;
    gap: $nk-spacing-xs;
    flex-shrink: 0;
  }

  &__dictionary-code {
    margin-left: 6px;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-400;
    font-family: $nk-font-family-mono;
  }
}
</style>
