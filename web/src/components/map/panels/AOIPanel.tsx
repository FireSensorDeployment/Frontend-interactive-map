'use client'
import { useEffect, useMemo, useState } from 'react'
import * as turf from '@turf/turf'
import { useAOIStore } from '@/store/useAOIStore'
import { useMapInfoStore } from '@/store/useMapInfoStore'
import { useMap } from 'react-map-gl/mapbox'

export default function AOIPanel() {
  const { aoi } = useAOIStore()
  const { layers } = useMapInfoStore() // 里面有 layerId / selected / mode
  const { current: map } = useMap()

  const { bbox, areaKm2, text } = useMemo(() => {
    if (!aoi) {
      return {
        bbox: null as number[] | null,
        areaKm2: null as number | null,
        text: '（画一个多边形后会显示）'
      }
    }
    const bb = turf.bbox(aoi)
    const area = turf.area(aoi) / 1_000_000
    return { bbox: bb, areaKm2: area, text: JSON.stringify(aoi, null, 2) }
  }, [aoi])

  const handleCopy = () => {
    if (aoi) navigator.clipboard?.writeText(JSON.stringify(aoi, null, 2))
  }

  // 本地预览结果
  const [preview, setPreview] = useState<Record<string, GeoJSON.FeatureCollection>>({})

  useEffect(() => {
    if (!map || !aoi) { setPreview({}); return }
    const [minX, minY, maxX, maxY] = turf.bbox(aoi)
    const pMin = map.project([minX, minY])
    const pMax = map.project([maxX, maxY])
    const screenBox: [mapboxgl.PointLike, mapboxgl.PointLike] = [pMin, pMax]

    const next: Record<string, GeoJSON.FeatureCollection> = {}
    for (const l of Object.values(layers)) {
      if (!l.selected) continue
      const candidates = map.queryRenderedFeatures(screenBox, { layers: [l.id] }) as unknown as GeoJSON.Feature[]
      const hits: GeoJSON.Feature[] = []
      for (const f of candidates) {
        try {
          const ok = l.mode === 'contains'
            ? turf.booleanContains(aoi as any, f as any)
            : turf.booleanIntersects(f as any, aoi as any)
          if (ok) hits.push(f)
        } catch {}
      }
      next[l.id] = { type: 'FeatureCollection', features: hits }
    }
    setPreview(next)
  }, [map, aoi, layers])

  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        bottom: 12,
        width: 460,
        background: 'rgba(255,255,255,0.92)',
        padding: 12,
        borderRadius: 8,
        boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12,
        zIndex: 1000,
        pointerEvents: 'auto'
      }}
    >
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
        <b>AOI (GeoJSON)</b>
        <button
          onClick={handleCopy}
          style={{ padding:'4px 8px', border:'1px solid #ddd', borderRadius:6, cursor:'pointer' }}
        >
          Copy
        </button>
      </div>

      <div style={{ color: '#444', marginBottom: 6 }}>
        {bbox && <>BBOX: [{bbox.map(n => n.toFixed(5)).join(', ')}] · </>}
        {areaKm2 !== null && <>Area ≈ {areaKm2.toFixed(2)} km²</>}
      </div>

      <pre style={{ maxHeight: 120, overflow: 'auto', margin: 0, whiteSpace: 'pre-wrap' }}>
        {text}
      </pre>

      {/* 分层预览 */}
      <div style={{ marginTop:10, borderTop:'1px solid #eee', paddingTop:10 }}>
        <b>Layers Preview</b>
        {Object.keys(preview).length === 0 && (
          <div style={{ color:'#666', marginTop:6 }}>暂无命中要素</div>
        )}
        {Object.entries(preview).map(([layerId, fc]) => (
          <div key={layerId} style={{ marginTop:6 }}>
            <div style={{ fontWeight:600 }}>{layerId}</div>
            <div style={{ color:'#666' }}>命中 {fc.features.length} 个要素</div>
            <details>
              <summary style={{ cursor:'pointer' }}>查看前 5 条</summary>
              <pre style={{ maxHeight:160, overflow:'auto', margin:0, whiteSpace:'pre-wrap' }}>
                {JSON.stringify(fc.features.slice(0, 5), null, 2)}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  )
}
