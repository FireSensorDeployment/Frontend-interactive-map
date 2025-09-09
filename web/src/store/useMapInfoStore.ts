// store/useMapInfoStore.ts
'use client'
import { create } from 'zustand'

/** AOI 空间筛选方式 */
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

export const useMapInfoStore = create<MapInfoState>((set, get) => ({
  // ✅ 空启动：不预置任何图层
  layers: {},

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

  toggleLayer: (id, selected) =>
    set((s) => {
      const cur = s.layers[id]
      if (!cur) return s
      return { layers: { ...s.layers, [id]: { ...cur, selected: selected ?? !cur.selected } } }
    }),

  setLayerMode: (id, mode) =>
    set((s) => {
      const cur = s.layers[id]
      if (!cur) return s
      return { layers: { ...s.layers, [id]: { ...cur, mode } } }
    }),

  removeLayer: (id) =>
    set((s) => {
      if (!s.layers[id]) return s
      const next = { ...s.layers }
      delete next[id]
      return { layers: next }
    }),

  // ✅ reset 也恢复为空
  reset: () => set({ layers: {} }),

  selectedLayerIds: () =>
    Object.values(get().layers)
      .filter((l) => l.selected)
      .map((l) => l.id),
}))
