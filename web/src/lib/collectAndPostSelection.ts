// lib/collectAndPostSelection.ts
import * as turf from '@turf/turf'

type LayerPick = { layerId: string; mode?: 'intersects' | 'contains' }

export async function collectAndPostSelection(opts: {
  map: mapboxgl.Map
  aoi: GeoJSON.Feature<GeoJSON.Polygon>
  layers: LayerPick[]
  endpoint?: string
}) {
  const { map, aoi, layers, endpoint = '/api/selection' } = opts
  const bbox4326 = turf.bbox(aoi) // [minX,minY,maxX,maxY] in EPSG:4326

  const [minX, minY, maxX, maxY] = turf.bbox(aoi)
  const pMin = map.project([minX, minY])
  const pMax = map.project([maxX, maxY])
  const screenBox: [mapboxgl.PointLike, mapboxgl.PointLike] = [pMin, pMax]

  const perLayer: Record<string, GeoJSON.FeatureCollection> = {}

  for (const { layerId, mode = 'intersects' } of layers) {
    const candidates = map.queryRenderedFeatures(screenBox, { layers: [layerId] }) as unknown as GeoJSON.Feature[]
    const hits: GeoJSON.Feature[] = []
    for (const f of candidates) {
      try {
        const ok = mode === 'contains'
          ? turf.booleanContains(aoi as any, f as any) // AOI 包含要素
          : turf.booleanIntersects(f as any, aoi as any) // 相交
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
  const payload = {
    type: 'SelectionBundle',
    selection: aoi,
    layers: perLayer,
    features: { type: 'FeatureCollection', features: flat },
    meta: { crs: 'EPSG:4326', ts: Date.now() }
  }

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
