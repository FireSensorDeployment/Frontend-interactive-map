'use client'
import MapShell from '@/components/map/MapShell'
import FireRisk from '@/components/map/layers/FireRisk'
import DrawAOI from '@/components/map/aoi/DrawAOI'
import AOIPanel from '@/components/map/panels/AOIPanel'


// 聚合组件
export default function Page() {
  return (
    <main style={{ margin: 0, padding: 0 }}>
      <MapShell>
        <FireRisk /> {/* 火险图层 */}
        <DrawAOI /> {/* 绘制 AOI */}
        <AOIPanel /> {/* AOI 面板 */}
      </MapShell>
    </main>
  )
}
