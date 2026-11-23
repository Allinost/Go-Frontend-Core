<template>
  <NkDialog
    :visible="visible"
    title="编辑导航"
    :width="900"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="sn-editor">
      <div class="sn-editor__toolbar">
        <NkInput v-model="query" placeholder="搜索菜单名称或路径" size="sm" clearable style="width: 260px" />
        <NkButton size="sm" variant="ghost" @click="reset">恢复默认</NkButton>
        <NkButton size="sm" type="primary" @click="close">完成</NkButton>
      </div>
      <div class="sn-editor__hint">
        修改会自动保存到当前浏览器。权限支持“所有用户 / 登录用户 / 仅管理员”，常用功能可手动绑定。
      </div>

      <div class="sn-editor__section">
        <div class="sn-editor__section-title">顶部项</div>
        <div v-for="item in store.config.topItems" :key="item.id" class="sn-editor__row">
          <div class="sn-editor__name">
            <strong>{{ item.label }}</strong>
            <span>{{ item.path }}</span>
          </div>
          <NkSwitch :model-value="item.visible" size="sm" @update:model-value="item.visible = $event" />
          <NkSelect
            :model-value="item.permission"
            :options="permissionOptions"
            size="sm"
            style="width: 130px"
            @update:model-value="item.permission = $event"
          />
        </div>
      </div>

      <div class="sn-editor__section">
        <div class="sn-editor__section-title">常用功能层级</div>
        <div class="sn-editor__row sn-editor__row--settings">
          <NkInput v-model="store.config.favoriteGroup.label" size="sm" style="width: 180px" />
          <span class="sn-editor__inline">显示</span>
          <NkSwitch :model-value="store.config.favoriteGroup.visible" size="sm" @update:model-value="store.toggleFavoriteVisible()" />
          <span class="sn-editor__inline">默认展开</span>
          <NkSwitch
            :model-value="store.config.favoriteGroup.defaultExpanded"
            size="sm"
            @update:model-value="store.setFavoriteDefaultExpanded($event)"
          />
        </div>
        <div v-if="favoriteItems.length === 0" class="sn-editor__empty">尚未绑定常用功能，请在下方菜单项点击“设为常用”。</div>
        <div v-else class="sn-editor__chips">
          <NkTag v-for="item in favoriteItems" :key="item.id" size="sm" type="primary" closable @close="store.toggleFavorite(item.id)">
            {{ item.label }}
          </NkTag>
        </div>
      </div>

      <div v-for="(group, groupIndex) in displayGroups" :key="group.id" class="sn-editor__section">
        <div class="sn-editor__group-head">
          <NkInput
            :model-value="group.label"
            size="sm"
            style="width: 150px"
            @update:model-value="store.renameGroup(group.id, $event)"
          />
          <span class="sn-editor__inline">显示</span>
          <NkSwitch :model-value="group.visible" size="sm" @update:model-value="store.toggleGroupVisible(group.id)" />
          <span class="sn-editor__inline">默认展开</span>
          <NkSwitch
            :model-value="group.defaultExpanded"
            size="sm"
            @update:model-value="store.setGroupDefaultExpanded(group.id, $event)"
          />
          <div class="sn-editor__move">
            <NkButton size="xs" variant="ghost" :disabled="groupIndex === 0" @click="store.moveGroup(group.id, -1)">上移</NkButton>
            <NkButton size="xs" variant="ghost" :disabled="groupIndex === displayGroups.length - 1" @click="store.moveGroup(group.id, 1)">下移</NkButton>
          </div>
        </div>

        <div v-if="group.items.length === 0" class="sn-editor__empty">该分组暂无匹配项</div>
        <div v-for="(item, itemIndex) in group.items" :key="item.id" class="sn-editor__row sn-editor__row--item">
          <div class="sn-editor__name">
            <strong>{{ item.label }}</strong>
            <span>{{ item.path }}</span>
          </div>
          <NkSwitch :model-value="item.visible" size="sm" @update:model-value="store.toggleItemVisible(group.id, item.id)" />
          <NkSelect
            :model-value="item.permission"
            :options="permissionOptions"
            size="sm"
            style="width: 130px"
            @update:model-value="store.setItemPermission(group.id, item.id, $event)"
          />
          <NkSelect
            :model-value="group.id"
            :options="groupOptions(group.id)"
            placeholder="移动到分组"
            size="sm"
            style="width: 130px"
            @update:model-value="store.moveItemToGroup(item.id, group.id, $event)"
          />
          <div class="sn-editor__move">
            <NkButton size="xs" variant="ghost" :disabled="itemIndex === 0" @click="store.moveItem(group.id, item.id, -1)">↑</NkButton>
            <NkButton size="xs" variant="ghost" :disabled="itemIndex === group.items.length - 1" @click="store.moveItem(group.id, item.id, 1)">↓</NkButton>
          </div>
          <NkButton size="xs" variant="ghost" @click="store.toggleFavorite(item.id)">
            {{ store.isFavorite(item.id) ? '取消常用' : '设为常用' }}
          </NkButton>
        </div>
      </div>
    </div>
  </NkDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSidebarStore } from '@/stores/sidebar'
import type { SidebarItemConfig } from '@/types/sidebar'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>()

const store = useSidebarStore()
const query = ref('')

const permissionOptions = [
  { label: '所有用户', value: 'all' },
  { label: '登录用户', value: 'user' },
  { label: '仅管理员', value: 'admin' },
]

const displayGroups = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return store.config.groups
    .map((group) => ({
      ...group,
      items: keyword
        ? group.items.filter(
            (item) =>
              item.label.toLowerCase().includes(keyword) ||
              item.path.toLowerCase().includes(keyword),
          )
        : group.items,
    }))
    .filter((group) => {
      if (!keyword) return true
      return group.label.toLowerCase().includes(keyword) || group.items.length > 0
    })
})

const favoriteItems = computed(() =>
  store.config.favorites
    .map((id) => store.allItems[id])
    .filter((item): item is SidebarItemConfig => !!item),
)

function groupOptions(currentId: string) {
  return store.config.groups
    .filter((g) => g.id !== currentId)
    .map((g) => ({ label: g.label, value: g.id }))
}

function reset() {
  if (window.confirm('恢复默认导航配置？当前自定义会被覆盖。')) {
    store.reset()
  }
}

function close() {
  emit('update:visible', false)
}
</script>

<style scoped lang="scss">
.sn-editor {
  max-height: 68vh;
  overflow-y: auto;
  padding-right: 4px;
}
.sn-editor__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.sn-editor__toolbar .nk-btn:last-child {
  margin-left: auto;
}
.sn-editor__hint {
  margin-bottom: 12px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(22, 119, 255, 0.08);
  color: var(--nk-color-primary-700, #0958d9);
  font-size: 12px;
}
.sn-editor__section {
  border-top: 1px solid var(--nk-border-color, #eee);
  padding: 12px 0;
}
.sn-editor__section:first-of-type {
  border-top: none;
}
.sn-editor__section-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.sn-editor__group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.sn-editor__row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--nk-border-color, #f0f0f0);
}
.sn-editor__row:last-child {
  border-bottom: none;
}
.sn-editor__row--item {
  padding-left: 16px;
}
.sn-editor__name {
  flex: 1;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sn-editor__name strong {
  font-size: 13px;
}
.sn-editor__name span {
  font-size: 11px;
  color: var(--nk-text-color-secondary, #999);
  font-family: var(--nk-font-family-mono, monospace);
}
.sn-editor__inline {
  font-size: 12px;
  color: var(--nk-text-color-secondary, #888);
}
.sn-editor__move {
  display: flex;
  gap: 2px;
}
.sn-editor__empty {
  color: var(--nk-text-color-secondary, #999);
  font-size: 12px;
  padding: 6px 0;
}
.sn-editor__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
@media (max-width: 700px) {
  .sn-editor__row {
    flex-wrap: wrap;
  }
  .sn-editor__name {
    flex-basis: 100%;
  }
}
</style>
