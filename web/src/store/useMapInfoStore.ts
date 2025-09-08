// AOI 状态管理，负责保存和更新用户绘制的 AOI（区域），唯一

'use client'
import { create } from 'zustand' // Zustand 提供的函数，用来创建一个“全局状态仓库”（store）

// 这里创建了 store，并导出成 useMapInfoStore 这个钩子（hook）：
// 用来管理地图上的图层信息，比如哪些图层被选中，图层的筛选模式等
// 这个实现方式保证了 全局状态里只会存放唯一一份 图层信息
// 方便后续传递给后端用来生成sensor plan
export type LayerMode = 'intersects' | 'contains'

export type LayerMeta = {
  id: string            // mapbox layerId
  label?: string        // UI 显示名
  selected: boolean     // 是否参与提交
  mode: LayerMode       // 空间筛选方式
}

type MapInfoState = {
  layers: Record<string, LayerMeta>
  // 批量或单个注册图层（初始化时调用一次）
  registerLayers: (defs: { id: string; label?: string; defaultSelected?: boolean; defaultMode?: LayerMode }[]) => void
  // 勾选/取消图层
  toggleLayer: (id: string, selected?: boolean) => void
  // 修改筛选模式
  setLayerMode: (id: string, mode: LayerMode) => void
  // 选中的 layerId 列表（便于调用）
  selectedLayerIds: () => string[]
}

export const useMapInfoStore = create<MapInfoState>((set, get) => ({
  layers: {},
  registerLayers: (defs) => set((s) => {
    const next = { ...s.layers }
    for (const d of defs) {
      next[d.id] = next[d.id] ?? {
        id: d.id,
        label: d.label ?? d.id,
        selected: d.defaultSelected ?? true,
        mode: d.defaultMode ?? 'intersects'
      }
    }
    return { layers: next }
  }),
  toggleLayer: (id, selected) => set((s) => {
    const cur = s.layers[id]
    if (!cur) return s
    return { layers: { ...s.layers, [id]: { ...cur, selected: selected ?? !cur.selected } } }
  }),
  setLayerMode: (id, mode) => set((s) => {
    const cur = s.layers[id]
    if (!cur) return s
    return { layers: { ...s.layers, [id]: { ...cur, mode } } }
  }),
  selectedLayerIds: () => Object.values(get().layers).filter(l => l.selected).map(l => l.id)
}))