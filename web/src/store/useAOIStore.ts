// AOI 状态管理，负责保存和更新用户绘制的 AOI（区域），唯一

'use client'
import { create } from 'zustand' // Zustand 提供的函数，用来创建一个“全局状态仓库”（store）
import type { Feature, Polygon } from 'geojson' // 从 GeoJSON 类型库里拿到类型，用来约束 AOI 必须是一个多边形的 GeoJSON 对象

// 定义一个 TypeScript 类型 AOIState，描述这个 store 里存的内容：
// aoi: 存当前的 AOI（一个 Polygon 的 GeoJSON Feature），默认可能是 null（表示还没有 AOI）。
// setAOI: 一个函数，用来更新 aoi。接受新的 AOI 或 null。
type AOIState = {
  aoi: Feature<Polygon> | null
  setAOI: (f: Feature<Polygon> | null) => void
}

// 这里创建了 store，并导出成 useAOIStore 这个钩子（hook）：
// create<AOIState>：告诉 Zustand，这个 store 的结构必须符合 AOIState。
// aoi: null：初始值是 null，也就是一开始没有画 AOI。
// setAOI: (f) => set({ aoi: f })：当你调用 setAOI(newAOI) 时，Zustand 会更新仓库里的 aoi
// 这个实现方式保证了 全局状态里只会存放唯一一个 AOI
export const useAOIStore = create<AOIState>((set) => ({
  aoi: null,
  setAOI: (f) => set({ aoi: f })
}))
