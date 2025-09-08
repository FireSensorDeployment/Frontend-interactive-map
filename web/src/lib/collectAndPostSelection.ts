// lib/collectAndPostSelection.ts
import * as turf from '@turf/turf'
import { CWFIS_LAYER_ID, CWFIS_SOURCE_ID, CWFIS_WMS_META } from '@/components/map/layers/CwfisFireRisk'

type LayerPick = { layerId: string; mode?: 'intersects' | 'contains' }

export async function collectAndPostSelection(opts: {
  map: mapboxgl.Map
  aoi: GeoJSON.Feature<GeoJSON.Polygon>
  layers: LayerPick[]
  endpoint?: string
}) {
  const { map, aoi, layers, endpoint = '/api/selection' } = opts

  // AOI 的经纬度 bbox（EPSG:4326）
  const [minX, minY, maxX, maxY] = turf.bbox(aoi)

  // 用屏幕像素框只筛视窗内已渲染要素（矢量层）
  const pMin = map.project([minX, minY])
  const pMax = map.project([maxX, maxY])
  const screenBox: [mapboxgl.PointLike, mapboxgl.PointLike] = [pMin, pMax]

  // === 1) 矢量层命中收集 ===
  const perLayer: Record<string, GeoJSON.FeatureCollection> = {}

  for (const { layerId, mode = 'intersects' } of layers) {
    const candidates = map.queryRenderedFeatures(screenBox, { layers: [layerId] }) as unknown as GeoJSON.Feature[]
    const hits: GeoJSON.Feature[] = []
    for (const f of candidates) {
      try {
        const ok = mode === 'contains'
          ? turf.booleanContains(aoi as any, f as any)     // AOI 完全包含要素
          : turf.booleanIntersects(f as any, aoi as any)   // AOI 与要素相交
        if (ok) {
          hits.push({
            ...f,
            properties: { ...(f.properties || {}), _layerId: layerId, _mode: mode }
          })
        }
      } catch { /* ignore malformed geometry */ }
    }
    perLayer[layerId] = { type: 'FeatureCollection', features: hits }
  }

  const flat = Object.values(perLayer).flatMap(fc => fc.features)

  // === 2) 栅格（CWFIS WMS）一起写进 payload ===
  // ⭐ NEW: 读取当前 CWFIS 图层的可见性/透明度和视图参数
  const hasCwfis = !!map.getLayer(CWFIS_LAYER_ID)
  const cwfisVisible =
    hasCwfis ? ((map.getLayoutProperty(CWFIS_LAYER_ID, 'visibility') as any) !== 'none') : false
  const cwfisOpacity =
    hasCwfis ? (map.getPaintProperty(CWFIS_LAYER_ID, 'raster-opacity') as number | null) : null

  // ⭐ NEW: 视图状态（后端如需决定 WMS 分辨率/scale 可参考）
  const viewState = {
    center: map.getCenter().toArray() as [number, number], // [lng, lat]
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch()
  }

  // ⭐ NEW: 组装 CWFIS 区块（若图层不存在则为空对象）
  const raster: Record<string, unknown> = {}
  if (hasCwfis) {
    raster.cwfisFireRisk = {
      kind: 'raster-wms' as const,
      layerId: CWFIS_LAYER_ID,
      sourceId: CWFIS_SOURCE_ID,
      meta: CWFIS_WMS_META,                  // endpoint / version / layer / format …
      visible: cwfisVisible,
      opacity: cwfisOpacity ?? undefined,
      aoiBBox4326: [minX, minY, maxX, maxY], // 给后端直接拼 WMS BBOX（或做统计）
      aoi,                                   // 如需精确 polygon 裁剪/统计
      viewState                              // 可选：当前视图信息
    }
  }

  // === 3) 最终 payload ===
  const payload = {
    type: 'SelectionBundle' as const,
    selection: aoi,
    aoiBBox4326: [minX, minY, maxX, maxY] as [number, number, number, number], // ⭐ NEW: 顶层也给一份
    layers: perLayer,                                     // 各矢量层命中
    features: { type: 'FeatureCollection', features: flat }, // 扁平聚合
    raster,                                               // ⭐ NEW: 栅格信息（含 CWFIS）
    meta: { crs: 'EPSG:4326', ts: Date.now() }
  }

  // 发送
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Upload failed ${res.status}: ${txt}`)
  }

  return payload
}
