'use client'
import Map, { NavigationControl } from 'react-map-gl/mapbox'
import mapboxgl from 'mapbox-gl'
import { useCallback } from 'react'
import { useMapInfoStore } from '@/store/useMapInfoStore'

// 可查询“矢量样式层”的类型白名单（只针对样式层类型，不是数据源类型）
const VECTOR_LAYER_TYPES = new Set(['fill', 'line', 'symbol', 'circle', 'fill-extrusion'])

type StyleLayer = {
  id: string
  type: string
  source?: string
  ['source-layer']?: string
}

type Props = {
  children?: React.ReactNode
  height?: string | number
  width?: string | number
}

export default function MapRoot({ children, height = '100vh', width = '100vw' }: Props) {

  // 从全局 store 取出“注册图层”方法；注册后你的 AOI 面板会显示这些可选图层
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

        /**
         * ① （可选）收集“真实道路”层：road-/bridge-/tunnel- 前缀、线几何、来自 source-layer='road'，
         *     排除外描边(-case)和文字/盾牌(label/shield)；并只保留四大等级（motorway/trunk/primary/secondary/tertiary/street/residential）
         *     —— 目前这段被注释掉：如果你以后要把道路也注册进来，取消注释，并把下面 finalIds 合并 roadIds 即可。
         *
         * const FOUR_LEVEL_RE = new RegExp(
         *   '^(road|bridge|tunnel)-(?:motorway|trunk|primary|secondary|tertiary|secondary-tertiary|street|residential)(?:-|$)',
         *   'i'
         * )
         * const roadIds = vectorLayers
         *   .filter(l =>
         *     l.type === 'line' &&
         *     (l as any)['source-layer'] === 'road' &&
         *     /^(road|bridge|tunnel)-/i.test(l.id) &&
         *     !/-case$/i.test(l.id) &&
         *     !/label|shield/i.test(l.id) &&
         *     FOUR_LEVEL_RE.test(l.id)
         *   )
         *   .map(l => l.id)
         */

        // ② 额外加上 building / water（如果存在）
        const extras = ['building', 'water'].filter((id) =>
          vectorLayers.some((l) => l.id === id)
        )

        // ③ 去重
        const finalIds = Array.from(new Set([...extras]))

        // ④ 全部注册（道路用 intersects，building 用 contains）
        registerLayers(
          finalIds.map((id) => ({
            id,
            label: id,              // 面板显示用的名字：保持与 layerId 一致
            defaultSelected: true,  // 默认勾选，画 AOI 后就能看到命中
            defaultMode:            // 交集判定；严格可改 'contains'
              id === 'building' ? ('intersects' as const) : ('intersects' as const),
          }))
        )

        console.log('[Registered layers]', finalIds)
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
