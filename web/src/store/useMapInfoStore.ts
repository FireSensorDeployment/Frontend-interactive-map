// store/useMapInfoStore.ts
// 这个实现方式保证了 全局状态里只会存放唯一一份图层信息，且可以后续扩展勾选不同图层
'use client'
import { create } from 'zustand'

/** AOI 空间筛选方式，包含 相交 和 内部 */
export type LayerMode = 'intersects' | 'contains'

/** 面板里可被勾选/统计的图层元信息 */
export type LayerMeta = {
  id: string
  label?: string
  selected: boolean
  mode: LayerMode
}

/** 和 PstaFireRisk 保持一致的 layerId（便于统一引用） */
export const PSTA_LAYER_ID = 'psta-wms-layer'

// 定义 MapInfoState，描述这个 store 里存的内容和操作：
// layers: 一个字典，key 是图层 id，value 是 LayerMeta（图层元信息）
// registerLayers: 注册一组图层定义（id + 可选 label + 可选默认选中状态 + 可选默认模式）
// toggleLayer: 切换某个图层的选中状态（如果传了 selected 就设置成那个值，否则取反）
// setLayerMode: 设置某个图层的筛选模式（intersects / contains）
// removeLayer: 从 store 里移除某个图层
// reset: 重置 store，清空所有图层
// selectedLayerIds: 返回当前被选中的图层 id 列表
type MapInfoState = {
  layers: Record<string, LayerMeta>
  registerLayers: (
    defs: { id: string; label?: string; defaultSelected?: boolean; defaultMode?: LayerMode }[]
  ) => void
  toggleLayer: (id: string, selected?: boolean) => void
  setLayerMode: (id: string, mode: LayerMode) => void
  removeLayer: (id: string) => void
  reset: () => void
  selectedLayerIds: () => string[]
}

// 创建并导出 useMapInfoStore 这个钩子（hook）：
// create<MapInfoState>：告诉 Zustand，这个 store 的结构必须符合 MapInfoState。
// layers: {}：初始值是空对象，也就是一开始没有任何图层。
// 各种方法的实现都比较直观，都是基于 set 和 get 来更新或读取当前状态。
// 这个实现方式保证了 全局状态里只会存放唯一一份图层信息
export const useMapInfoStore = create<MapInfoState>((set, get) => ({
  // ✅ 空启动：不预置任何图层
  layers: {},

  // ✅ 支持批量注册图层定义（不会覆盖已存在的，只会更新 label）
  registerLayers: (defs) =>
    set((s) => {
      const next = { ...s.layers }
      for (const d of defs) {
        if (next[d.id]) {
          next[d.id] = {
            ...next[d.id],
            label: d.label ?? next[d.id].label,
          }
        } else {
          next[d.id] = {
            id: d.id,
            label: d.label ?? d.id,
            selected: d.defaultSelected ?? true,
            mode: d.defaultMode ?? 'intersects',
          }
        }
      }
      return { layers: next }
    }),

  // ✅ 支持传入 selected 来显式设置选中状态
  toggleLayer: (id, selected) =>
    set((s) => {
      const cur = s.layers[id]
      if (!cur) return s
      return { layers: { ...s.layers, [id]: { ...cur, selected: selected ?? !cur.selected } } }
    }),

  // ✅ 直接设置 mode
  setLayerMode: (id, mode) =>
    set((s) => {
      const cur = s.layers[id]
      if (!cur) return s
      return { layers: { ...s.layers, [id]: { ...cur, mode } } }
    }),

  // ✅ 删除某个图层
  removeLayer: (id) =>
    set((s) => {
      if (!s.layers[id]) return s
      const next = { ...s.layers }
      delete next[id]
      return { layers: next }
    }),

  // ✅ reset 也恢复为空
  reset: () => set({ layers: {} }),

  // ✅ 返回当前被选中的图层 id 列表
  selectedLayerIds: () =>
    Object.values(get().layers)
      .filter((l) => l.selected)
      .map((l) => l.id),
}))
