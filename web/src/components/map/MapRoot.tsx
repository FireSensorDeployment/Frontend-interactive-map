// components/MapRoot.tsx
// 这是wfs的实现方式，用来替代之前的wms，可以和矢量底图的样式层进行空间查询
'use client'
import Map, { NavigationControl } from 'react-map-gl/mapbox'
import mapboxgl from 'mapbox-gl'
import { useCallback } from 'react'
import { useMapInfoStore, PSTA_LAYER_ID, type LayerMode } from '@/store/useMapInfoStore'

// 可查询“矢量样式层”的类型白名单（只针对样式层类型，不是数据源类型）
const VECTOR_LAYER_TYPES = new Set(['fill', 'line', 'symbol', 'circle', 'fill-extrusion'])

// 定义 StyleLayer 类型，表示地图样式中的一个图层
type StyleLayer = {
  id: string
  type: string
  source?: string
  ['source-layer']?: string
}

// 定义组件的 Props 类型
type Props = {
  children?: React.ReactNode
  height?: string | number
  width?: string | number
}

export default function MapRoot({ children, height = '100vh', width = '100vw' }: Props) {
  // 从全局 store 取出“注册图层”方法；注册后 AOI 面板会显示这些可选图层
  const registerLayers = useMapInfoStore((s) => s.registerLayers)

  // 地图样式加载完成时触发：在这里收集并注册需要的样式层（layerId）
  const handleMapLoad = useCallback(
    (e: mapboxgl.MapboxEvent & { target: mapboxgl.Map }) => {
      const map = e.target

      // 再等一帧，确保样式与来源（sources/layers）都已可读
      requestAnimationFrame(() => {
        const style = map.getStyle()
        const allLayers = (style?.layers ?? []) as StyleLayer[]

        // 仅保留“矢量类”样式层（raster/heatmap/hillshade/background 这些不参与要素查询）
        const vectorLayers = allLayers.filter((l) => VECTOR_LAYER_TYPES.has(l.type))

        // 额外加上 building / water（如果存在）
        const extras = ['building', 'water'].filter((id) =>
          vectorLayers.some((l) => l.id === id)
        )

        // 去重
        const finalIds = Array.from(new Set([...extras]))

        // 为了通过类型校验：把常用字面量标注成 LayerMode
        const INTERSECTS: LayerMode = 'intersects'
        // 如果以后想让 building 用 contains，可以这样：
        // const CONTAINS: LayerMode = 'contains'

        // 统一注册：样式层 + PSTA（显式加入）
        registerLayers([
          { id: PSTA_LAYER_ID, label: 'PSTA Fire Threat', defaultSelected: true, defaultMode: INTERSECTS },
          ...finalIds.map((id) => ({
            id,
            label: id,
            defaultSelected: true,
            // 现在都用 intersects；若要对某层特殊处理，改这里返回对应 LayerMode 即可
            defaultMode: INTERSECTS,
          })),
        ])

        console.log('[Registered layers]', [PSTA_LAYER_ID, ...finalIds])
      })
    },
    [registerLayers]
  )

  return (
    <Map
      mapLib={mapboxgl}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
      initialViewState={{ longitude: -123.12, latitude: 49.28, zoom: 11 }}
      mapStyle="mapbox://styles/mapbox/streets-v12"   // 使用纯矢量底图；便于 queryRenderedFeatures / querySourceFeatures
      style={{ height, width }}
      onLoad={handleMapLoad}              // 核心：样式加载完再做层注册
    >
      <NavigationControl position="top-right" />
      {children}
    </Map>
  )
}
