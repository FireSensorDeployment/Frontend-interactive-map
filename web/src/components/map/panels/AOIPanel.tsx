'use client'
import { useRef } from 'react'
import { useAOIStore } from '@/store/useAOIStore'

export default function AOIPanel() {
  const { aoi, bbox, areaKm2 } = useAOIStore()
  const preRef = useRef<HTMLPreElement | null>(null)

  const text = aoi ? JSON.stringify(aoi, null, 2) : '（画一个多边形后会显示）'

  const handleCopy = () => {
    if (!aoi) return
    navigator.clipboard?.writeText(JSON.stringify(aoi, null, 2))
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 12, bottom: 12, width: 420,
        background: 'rgba(255,255,255,0.9)',
        padding: 12, borderRadius: 8,
        boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        zIndex: 10
      }}
    >
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8}}>
        <b>AOI (GeoJSON)</b>
        <button onClick={handleCopy} style={{padding:'4px 8px', border:'1px solid #ddd', borderRadius:6, cursor:'pointer'}}>
          Copy
        </button>
      </div>

      {/* 衍生信息 */}
      <div style={{ fontSize: 12, color: '#444', marginBottom: 6 }}>
        {bbox && <>BBOX: [{bbox.join(', ')}] · </>}
        {areaKm2 !== null && <>Area ≈ {areaKm2} km²</>}
      </div>

      <pre ref={preRef} style={{maxHeight: 180, overflow:'auto', fontSize: 12, margin:0}}>
        {text}
      </pre>
    </div>
  )
}
