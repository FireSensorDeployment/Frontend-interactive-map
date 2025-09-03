// AOIPreview 组件：在地图上预览用户画的 AOI
// 这个组件会监听全局状态里的 AOI（useAOIStore），并把 AOI 和它的缓冲区渲染到地图上
// 这里使用了 react-map-gl 提供的 Source 和 Layer 组件来把 GeoJSON 数据渲染成填充图层和边界线图层
// 通过 useMemo 优化性能，只有当 AOI 变化时才重新计算缓冲区

'use client'
import { useMemo } from 'react' // 优化性能，避免每次渲染都重复计算 buffer
import { Source, Layer } from 'react-map-gl/mapbox' // react-map-gl 提供的声明式地图组件，分别代表数据源和样式层
import * as turf from '@turf/turf' // Turf.js 提供的地理空间分析工具，这里用它来生成 AOI 的缓冲区
import { useAOIStore } from '@/store/useAOIStore' // 取全局 AOI 数据

// 定义三个常量，用作 Source 和 Layer 的 id。避免硬编码字符串
const PREVIEW_SRC  = 'preview'
const PREVIEW_FILL = 'preview-fill'
const PREVIEW_LINE = 'preview-line'

// 从全局 store 拿到当前 AOI（用户画的多边形）
export default function AOIPreview() {
  const aoi = useAOIStore(s => s.aoi)

  // 用 useMemo 生成地图要显示的数据：
  const preview = useMemo(() => {
    if (!aoi) return { type: 'FeatureCollection', features: [] } as any // 如果没有 AOI → 返回一个空的 FeatureCollection（空数据）
    return turf.buffer(aoi, 0, { units: 'kilometers' }) // 如果有 AOI → 用 turf.buffer 生成一个缓冲区，现在半径是 0 km，其实就是原样返回 AOI 本身。
  }, [aoi]) // [aoi] 表示只有 AOI 改变时才重新计算

  
  return (
    <Source id={PREVIEW_SRC} type="geojson" data={preview as any}> 
      <Layer
        id={PREVIEW_FILL}
        type="fill"
        paint={{ 'fill-color': '#3b82f6', 'fill-opacity': 0.12 }} // 蓝色，透明度 12%
      />
      <Layer
        id={PREVIEW_LINE}
        type="line"
        paint={{ 'line-color': '#3b82f6', 'line-width': 2 }} // 蓝色，线宽 2px
      />
    </Source> // 把preview数据传给 Source 
  )
}
