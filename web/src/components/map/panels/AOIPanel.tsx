'use client'
import { useMemo } from 'react'
import * as turf from '@turf/turf'
import { useAOIStore } from '@/store/useAOIStore'

export default function AOIPanel() {
  const { aoi } = useAOIStore()

  const { bbox, areaKm2, text } = useMemo(() => {
    if (!aoi) return { bbox: null as number[] | null, areaKm2: null as number | null, text: '（画一个多边形后会显示）' }
    const bb = turf.bbox(aoi)
    const area = turf.area(aoi) / 1_000_000
    return { bbox: bb, areaKm2: area, text: JSON.stringify(aoi, null, 2) }
  }, [aoi])

  const handleCopy = () => { if (aoi) navigator.clipboard?.writeText(JSON.stringify(aoi, null, 2)) }

  return (
    <div
      // 用 absolute（放在 MapRoot 里）或 fixed（覆盖全页）都可以
      style={{
        position: 'absolute', // 或 'fixed'
        left: 12,
        bottom: 12,
        width: 420,
        background: 'rgba(255,255,255,0.92)',
        padding: 12,
        borderRadius: 8,
        boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12,
        zIndex: 1000,           // 压过 map 画布和控件
        pointerEvents: 'auto'   // 能点按钮
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

      <pre style={{ maxHeight: 180, overflow: 'auto', margin: 0, whiteSpace: 'pre-wrap' }}>
        {text}
      </pre>
    </div>
  )
}
