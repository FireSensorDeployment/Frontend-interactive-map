'use client'
import MapRoot from '@/components/map/MapRoot'
import FireRisk from '@/components/map/layers/FireRisk'
import DrawControl from '@/components/map/controls/DrawControl'
import AOIPreview from '@/components/map/layers/AOIPreview'
import AOIPanel from '@/components/map/panels/AOIPanel'

export default function Page() {
  return (
    <MapRoot>
      <DrawControl position="top-left" />
      <AOIPreview />
      <FireRisk />
      <AOIPanel />
    </MapRoot>
  )
}
