// components/PstaFireRisk.tsx
// 这是个针对 PSTA 火险的图层组件
// 它使用 WFS 拉取要素，并用 Mapbox GL 的表达式来渲染颜色
// 只在 AOI 内显示，且当 AOI 面积过大时不显示（避免卡顿）
// 同时做了地图要素的处理，保证不会影响到底图信息的获取
'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Source, Layer } from 'react-map-gl/mapbox'
import * as turf from '@turf/turf'
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson'
import { useAOIStore } from '@/store/useAOIStore'

// ======= 常量：保持与旧版一致的 ID（方便 AOIPanel 用同一个 layerId 查询） =======
const SRC_ID = 'psta-wms-src'
const LAYER_ID = 'psta-wms-layer'

// ======= WFS（GeoServer，DataBC） =======
const WFS_ENDPOINT = 'https://openmaps.gov.bc.ca/geo/pub/ows'
const TYPE_NAME = 'pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_PSTA_FIRE_THREAT_RTG_SP'

// ======= ArcGIS 渲染样式（读取官方 renderer，用于颜色表达式） =======
// 从官方 ArcGIS MapServer 读取该图层的渲染规则（class breaks / unique values 等）
const PSTA_META =
  'https://delivery.maps.gov.bc.ca/arcgis/rest/services/whse/bcgw_pub_whse_land_and_natural_resource/MapServer/17?f=pjson'

// ---------- 工具：AOI -> WKT(SRID=4326) ----------
// 把 AOI（Polygon/MultiPolygon，坐标是经纬度）转成带 SRID 的 WKT，用于 WFS 的 CQL_FILTER
function toWkt4326(geom: Polygon | MultiPolygon): string {
  const fmt = (ring: number[][]) => ring.map(([x, y]) => `${x} ${y}`).join(',')
  if (geom.type === 'Polygon') {
    const rings = geom.coordinates.map(r => `(${fmt(r as any)})`).join(',')
    return `SRID=4326;POLYGON(${rings})`
  } else {
    const polys = geom.coordinates
      .map(poly => '(' + poly.map(r => `(${fmt(r as any)})`).join(',') + ')')
      .join(',')
    return `SRID=4326;MULTIPOLYGON(${polys})`
  }
}

// 构造一次 WFS 请求：指定几何字段名（不同服务可能叫 SHAPE 或 GEOMETRY）、分页参数等
function buildWfsUrl(
  aoi: Feature<Polygon | MultiPolygon>,
  geomField: 'SHAPE' | 'GEOMETRY',
  count: number,
  startIndex: number
) {
  const wkt = toWkt4326(aoi.geometry)
  const cql = `INTERSECTS(${geomField}, ${wkt})`   // 只取与 AOI 相交的要素
  const qs = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: TYPE_NAME,
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    count: String(count),             // 每页条数
    startIndex: String(startIndex),   // 起始索引
    CQL_FILTER: cql
  })
  return `${WFS_ENDPOINT}?${qs.toString()}`
}

// ---------- 拉 WFS：分页 + 几何字段兜底 ----------
// 尝试用 SHAPE 字段；若该服务没有，则用 GEOMETRY 字段兜底。
// 分页拉取，直到达到 cap 或没数据为止。
async function fetchAllWfs(
  aoi: Feature<Polygon | MultiPolygon>,
  cap: number,
  signal?: AbortSignal
): Promise<FeatureCollection> {
  for (const geomField of ['SHAPE', 'GEOMETRY'] as const) {
    const page = Math.min(1000, cap)
    const features: GeoJSON.Feature[] = []
    let start = 0
    while (features.length < cap) {
      const url = buildWfsUrl(aoi, geomField, Math.min(page, cap - features.length), start)
      const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`WFS ${res.status} ${res.statusText}`)
      const fc = (await res.json()) as FeatureCollection
      if (!fc.features?.length) break
      features.push(...fc.features)
      if (fc.features.length < Math.min(page, cap - features.length)) break
      start += fc.features.length
    }
    if (features.length > 0) return { type: 'FeatureCollection', features }
  }
  return { type: 'FeatureCollection', features: [] }
}

// ---------- ArcGIS renderer -> Mapbox 表达式 ----------
function arcColorToRgba(c: number[] | undefined) {
  if (!c || c.length < 3) return '#cccccc'
  const [r, g, b, a = 255] = c
  const alpha = Math.max(0, Math.min(1, a / 255))
  return `rgba(${r},${g},${b},${alpha})`
}

// 规范化字段名用于匹配（忽略大小写和非字母数字）
function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * 将 ArcGIS renderer 转为 Mapbox fill-color 表达式
 * - autoResolveField: 根据 WFS 要素的属性名，自动把 renderer.field 对齐到实际属性键
 */
function rendererToFillExpr(renderer: any, sampleProps?: Record<string, any>): any {
  if (!renderer) return '#cccccc'
  const type = (renderer.type || renderer.rendererType || '').toLowerCase()

  const allKeys = sampleProps ? Object.keys(sampleProps) : []
  const resolveField = (name: string | undefined) => {
    if (!name) return undefined
    const target = norm(name)
    const hit = allKeys.find(k => norm(k) === target)
    return hit ?? name // 若没找到，先按原名用（有些情况下 WFS 与 ArcGIS 字段名一致）
  }

  // simpleRenderer
  if (type.includes('simple')) {
    const color = arcColorToRgba(renderer.symbol?.color)
    return color
  }

  // classBreaksRenderer
  if (type.includes('classbreak')) {
    const fieldSrc = renderer.field || renderer.normalizationField || renderer.attributeField
    const field = resolveField(fieldSrc)
    const infos = (renderer.classBreakInfos || []).slice().sort((a:any,b:any) => {
      const aa = a.maxValue ?? a.classMaxValue ?? a.max ?? 0
      const bb = b.maxValue ?? b.classMaxValue ?? b.max ?? 0
      return aa - bb
    })
    if (!field || infos.length === 0) return '#cccccc'

    // step 表达式： baseColor + (阈值,颜色)...
    const baseColor = arcColorToRgba(infos[0]?.symbol?.color)
    const expr: any[] = ['step', ['to-number', ['get', field], 0], baseColor]
    for (let i = 1; i < infos.length; i++) {
      const brk = infos[i-1].maxValue ?? infos[i-1].classMaxValue ?? infos[i-1].max
      const col = arcColorToRgba(infos[i]?.symbol?.color)
      if (Number.isFinite(brk)) {
        expr.push(Number(brk), col)
      }
    }
    return expr
  }

  // uniqueValueRenderer
  if (type.includes('uniquevalue')) {
    const fieldSrc = renderer.field1 || renderer.field || renderer.attributeField
    const field = resolveField(fieldSrc)
    const infos = renderer.uniqueValueInfos || []
    if (!field || infos.length === 0) return '#cccccc'
    const expr: any[] = ['match', ['to-string', ['get', field]]]
    for (const info of infos) {
      expr.push(String(info.value ?? ''), arcColorToRgba(info.symbol?.color))
    }
    const def = arcColorToRgba(renderer.defaultSymbol?.color) || '#cccccc'
    expr.push(def)
    return expr
  }

  // 兜底
  return '#cccccc'
}

type Props = {
  visible?: boolean
  opacity?: number
  maxAreaKm2?: number      // AOI 超过就不加载（避免大范围卡顿）
  beforeId?: string
  tileSize?: number        // 兼容旧签名（WFS 不需要）
  maxFeatures?: number     // WFS 上限（分页拉取）
}

export default function PstaFireRisk({
  visible = true,
  opacity = 0.7,
  maxAreaKm2 = 5000,
  beforeId,
  tileSize,                // 兼容旧签名，实际不使用
  maxFeatures = 5000,
}: Props) {
  const aoi = useAOIStore(s => s.aoi) as Feature<Polygon | MultiPolygon> | null

  const [data, setData] = useState<FeatureCollection | null>(null)
  const [fillExpr, setFillExpr] = useState<any>('#ffffff') // 初始给个白色，后续用 renderer 覆盖
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const aoiKm2 = useMemo(() => (aoi ? turf.area(aoi) / 1e6 : 0), [aoi])

  // 一次性拉官方 renderer，并保存（先不依赖 data）
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(PSTA_META)
        if (!res.ok) return
        const json = await res.json()
        const expr = rendererToFillExpr(json?.drawingInfo?.renderer)
        if (!cancelled && expr) setFillExpr(expr)
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [])

  // 拉取 WFS 要素（限制 AOI 面积；分页；字段兜底）
  useEffect(() => {
    setError(null)
    if (!visible || !aoi) {
      setData(null)
      abortRef.current?.abort()
      abortRef.current = null
      return
    }
    if (aoiKm2 > maxAreaKm2) {
      setData(null)
      setError(`AOI too large: ${aoiKm2.toFixed(0)} km² > ${maxAreaKm2} km²`)
      return
    }

    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller

    ;(async () => {
      try {
        const fc = await fetchAllWfs(aoi, maxFeatures, controller.signal)
        setData(fc)

        // 如果之前拿到的 renderer 表达式里字段对不上，这里用样本属性再对齐一次
        if (fc.features?.length && typeof fillExpr !== 'string') {
          const sampleProps = (fc.features[0]?.properties || {}) as Record<string, any>
          // 重新生成一次表达式，让字段名与 WFS 属性键对齐
          const res = await fetch(PSTA_META)
          if (res.ok) {
            const json = await res.json()
            const exprAligned = rendererToFillExpr(json?.drawingInfo?.renderer, sampleProps)
            if (exprAligned) setFillExpr(exprAligned)
          }
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') setError(e?.message || String(e))
      }
    })()

    return () => controller.abort()
  }, [visible, aoi, aoiKm2, maxAreaKm2, maxFeatures])

  const hasData = (data?.features?.length ?? 0) > 0
  const visibility = visible && hasData ? 'visible' : 'none'

  return (
    <Source id={SRC_ID} type="geojson" data={data ?? { type: 'FeatureCollection', features: [] }}>
      {/* 填充按官方分级上色；不透明度由 props.opacity 控制 */}
      <Layer
        id={LAYER_ID}
        type="fill"
        paint={{ 'fill-color': fillExpr, 'fill-opacity': opacity }}
        layout={{ visibility }}
        beforeId={beforeId}
      />
      {/* 轮廓线（固定暗灰），便于观察边界 */}
      <Layer
        id={`${LAYER_ID}-outline`}
        type="line"
        paint={{ 'line-color': '#374151', 'line-width': 1, 'line-opacity': Math.min(opacity ?? 0.7, 0.95) }}
        layout={{ visibility }}
        beforeId={beforeId}
      />
    </Source>
  )
}

export { LAYER_ID as PSTA_LAYER_ID }