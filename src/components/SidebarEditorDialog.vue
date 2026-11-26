<template>
  <NkDialog
    :visible="visible"
    title="编辑导航"
    :width="980"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="sn-editor">
      <div class="sn-editor__toolbar">
        <NkInput v-model="query" placeholder="搜索菜单名称或路径" size="sm" clearable style="width: 260px" />
        <NkButton size="sm" variant="ghost" @click="addGroup">新增层级</NkButton>
        <NkButton size="sm" variant="ghost" @click="reset">恢复默认</NkButton>
        <NkButton size="sm" type="primary" @click="close">完成</NkButton>
      </div>
      <div class="sn-editor__hint">
        修改自动保存到当前浏览器。系统层级（用户管理、业务模块、硬件运维、软件运维、数据运维、工具组件、其他）不可删除；
        删除自定义层级时，其下功能会自动移动到「其他」。层级图标可点击左侧图标更换。
      </div>

      <div class="sn-editor__section">
        <div class="sn-editor__section-title">顶部项 / 仪表盘</div>
        <template v-for="entry in store.config.topItems" :key="entry.id">
          <div class="sn-editor__row">
            <button type="button" class="sn-icon-btn" title="选择图标" @click="togglePicker('top:' + entry.id)">
              <NkIcon :name="entry.icon || 'home'" size="sm" />
            </button>
            <div class="sn-editor__name">
              <strong>{{ entry.label }}</strong>
              <span>{{ entry.path }}</span>
            </div>
            <NkSwitch :model-value="entry.visible" size="sm" @update:model-value="entry.visible = $event" />
            <NkSelect
              :model-value="entry.permission"
              :options="permissionOptions"
              size="sm"
              style="width: 130px"
              @update:model-value="entry.permission = $event"
            />
          </div>
          <div v-if="iconPickerFor === 'top:' + entry.id" class="sn-icon-grid">
            <button
              v-for="icon in sidebarIcons"
              :key="icon.name"
              type="button"
              class="sn-icon-option"
              :class="{ active: entry.icon === icon.name }"
              :title="icon.label"
              @click="chooseTopIcon(entry.id, icon.name)"
            >
              <NkIcon :name="icon.name" size="sm" />
            </button>
          </div>
        </template>
      </div>

      <div class="sn-editor__section">
        <div class="sn-editor__section-title">常用功能层级</div>
        <div class="sn-editor__row sn-editor__row--settings">
          <button type="button" class="sn-icon-btn" title="选择图标" @click="togglePicker('favorites')">
            <NkIcon :name="store.config.favoriteGroup.icon" size="sm" />
          </button>
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
        <div v-if="iconPickerFor === 'favorites'" class="sn-icon-grid">
          <button
            v-for="icon in sidebarIcons"
            :key="icon.name"
            type="button"
            class="sn-icon-option"
            :class="{ active: store.config.favoriteGroup.icon === icon.name }"
            :title="icon.label"
            @click="chooseFavoriteIcon(icon.name)"
          >
            <NkIcon :name="icon.name" size="sm" />
          </button>
        </div>
        <div v-if="favoriteItems.length === 0" class="sn-editor__empty">尚未绑定常用功能，请在下方菜单项点击“设为常用”。</div>
        <div v-else class="sn-editor__chips">
          <NkTag v-for="entry in favoriteItems" :key="entry.id" size="sm" type="primary" closable @close="store.toggleFavorite(entry.id)">
            {{ entry.label }}
          </NkTag>
        </div>
      </div>

      <div v-for="(group, groupIndex) in displayGroups" :key="group.id" class="sn-editor__section">
        <div class="sn-editor__group-head">
          <button type="button" class="sn-icon-btn sn-icon-btn--group" title="选择图标" @click="togglePicker(group.id)">
            <NkIcon :name="group.icon" size="sm" />
          </button>
          <NkInput
            :model-value="group.label"
            size="sm"
            style="width: 160px"
            :disabled="group.system"
            @update:model-value="store.renameGroup(group.id, $event)"
          />
          <NkTag v-if="group.system" size="sm" type="neutral">系统</NkTag>
          <NkTag v-else size="sm" type="info">自定义</NkTag>
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
          <NkButton
            v-if="!group.system"
            size="xs"
            variant="ghost"
            type="danger"
            @click="removeGroup(group.id, group.label)"
          >删除</NkButton>
        </div>

        <div v-if="iconPickerFor === group.id" class="sn-icon-grid">
          <button
            v-for="icon in sidebarIcons"
            :key="icon.name"
            type="button"
            class="sn-icon-option"
            :class="{ active: group.icon === icon.name }"
            :title="icon.label"
            @click="chooseGroupIcon(group.id, icon.name)"
          >
            <NkIcon :name="icon.name" size="sm" />
          </button>
        </div>

        <div v-if="group.id === 'other'" class="sn-editor__other-hint">
          「其他」是系统保留的兜底层级，删除自定义层级时其功能会自动归入这里。
        </div>

        <div v-if="group.items.length === 0" class="sn-editor__empty">{{ group.id === 'other' ? '暂无迁移功能' : '该分组暂无匹配项' }}</div>
        <div v-for="(entry, itemIndex) in group.items" :key="group.id + ':' + entry.id" class="sn-editor__row sn-editor__row--item">
          <span class="sn-editor__item-dot" />
          <div class="sn-editor__name">
            <strong>{{ entry.label }}</strong>
            <span>{{ entry.path }}</span>
          </div>
          <NkSwitch :model-value="entry.visible" size="sm" @update:model-value="store.toggleItemVisible(group.id, entry.id)" />
          <NkSelect
            :model-value="entry.permission"
            :options="permissionOptions"
            size="sm"
            style="width: 130px"
            @update:model-value="store.setItemPermission(group.id, entry.id, $event)"
          />
          <NkSelect
            :model-value="group.id"
            :options="groupOptions(group.id)"
            placeholder="移动到分组"
            size="sm"
            style="width: 130px"
            @update:model-value="store.moveItemToGroup(entry.id, group.id, $event)"
          />
          <div class="sn-editor__move">
            <NkButton size="xs" variant="ghost" :disabled="itemIndex === 0" @click="store.moveItem(group.id, entry.id, -1)">上移</NkButton>
            <NkButton size="xs" variant="ghost" :disabled="itemIndex === group.items.length - 1" @click="store.moveItem(group.id, entry.id, 1)">下移</NkButton>
          </div>
          <NkButton size="xs" variant="ghost" @click="store.toggleFavorite(entry.id)">
            {{ store.isFavorite(entry.id) ? '取消常用' : '设为常用' }}
          </NkButton>
        </div>
      </div>
    </div>
  </NkDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSidebarStore } from '@/stores/sidebar'
import { SIDEBAR_ICONS } from '@/utils/sidebarIcons'
import type { SidebarItemConfig } from '@/types/sidebar'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>()

const store = useSidebarStore()
const query = ref('')
const sidebarIcons = SIDEBAR_ICONS
const iconPickerFor = ref('')

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
            (entry) =>
              entry.label.toLowerCase().includes(keyword) ||
              entry.path.toLowerCase().includes(keyword),
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
    .filter((entry): entry is SidebarItemConfig => !!entry),
)

function groupOptions(currentId: string) {
  return store.config.groups
    .filter((group) => group.id !== currentId)
    .map((group) => ({ label: group.label, value: group.id }))
}

function togglePicker(id: string) {
  iconPickerFor.value = iconPickerFor.value === id ? '' : id
}

function chooseFavoriteIcon(icon: string) {
  store.config.favoriteGroup.icon = icon
  iconPickerFor.value = ''
}

function chooseTopIcon(itemId: string, icon: string) {
  const entry = store.config.topItems.find((item) => item.id === itemId)
  if (entry) entry.icon = icon
  iconPickerFor.value = ''
}

function chooseGroupIcon(groupId: string, icon: string) {
  store.setGroupIcon(groupId, icon)
  iconPickerFor.value = ''
}

function addGroup() {
  store.addGroup('新层级', 'grid')
  iconPickerFor.value = ''
}

function removeGroup(groupId: string, label: string) {
  if (!window.confirm(`删除层级「${label}」？其下功能会移动到「其他」。`)) return
  store.deleteGroup(groupId)
  if (iconPickerFor.value === groupId) iconPickerFor.value = ''
}

function reset() {
  if (window.confirm('恢复默认导航配置？当前自定义会被覆盖。')) {
    store.reset()
    iconPickerFor.value = ''
  }
}

function close() {
  emit('update:visible', false)
}
</script>

<style scoped lang="scss">
.sn-editor {
  max-height: 70vh;
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
  border-radius: 8px;
  background: color-mix(in srgb, var(--nk-color-primary-500, #1677ff) 8%, transparent);
  color: var(--nk-color-primary-700, #0958d9);
  font-size: 12px;
  line-height: 1.55;
}
.sn-editor__section {
  border-top: 1px solid var(--nk-border-color, #eee);
  padding: 14px 0;
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
  padding: 8px 10px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--nk-fill-color, #f5f5f5) 45%, transparent);
}
.sn-editor__row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 4px;
  border-bottom: 1px dashed var(--nk-border-color, #f0f0f0);
}
.sn-editor__row:last-child {
  border-bottom: none;
}
.sn-editor__row--settings {
  background: color-mix(in srgb, var(--nk-fill-color, #f5f5f5) 30%, transparent);
  border-radius: 8px;
  padding: 7px 10px;
  border-bottom: none;
}
.sn-editor__row--item {
  padding-left: 18px;
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
  padding: 8px 10px;
}
.sn-editor__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 6px;
}
.sn-editor__other-hint {
  margin: 0 0 6px;
  padding: 7px 10px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--nk-color-warning, #f59e0b) 10%, transparent);
  color: color-mix(in srgb, var(--nk-color-warning, #f59e0b) 68%, var(--nk-color-neutral-900, #171717));
  font-size: 11px;
}
.sn-editor__item-dot {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: var(--nk-color-neutral-400, #a3a3a3);
  margin-left: 4px;
  flex-shrink: 0;
}
.sn-icon-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--nk-border-color, #e5e5e5);
  border-radius: 8px;
  background: var(--nk-bg-color, #fff);
  color: var(--nk-color-neutral-600, #525252);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.sn-icon-btn:hover {
  border-color: var(--nk-color-primary-500, #3b82f6);
  color: var(--nk-color-primary-600, #2563eb);
  background: color-mix(in srgb, var(--nk-color-primary-500, #3b82f6) 7%, transparent);
}
.sn-icon-btn--group {
  width: 34px;
  height: 34px;
}
.sn-icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 0 10px;
}
.sn-icon-option {
  width: 34px;
  height: 34px;
  border: 1px solid var(--nk-border-color, #e5e5e5);
  border-radius: 8px;
  background: var(--nk-bg-color, #fff);
  color: var(--nk-color-neutral-500, #737373);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.sn-icon-option:hover {
  border-color: var(--nk-color-primary-400, #60a5fa);
  color: var(--nk-color-primary-600, #2563eb);
}
.sn-icon-option.active {
  border-color: var(--nk-color-primary-500, #3b82f6);
  color: var(--nk-color-on-primary, #fff);
  background: var(--nk-color-primary-500, #3b82f6);
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
