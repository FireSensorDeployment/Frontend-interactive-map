'use client'
import MapRoot from '@/components/map/MapRoot'
import FireRisk from '@/components/map/layers/FireRisk'
import DrawControl from '@/components/map/controls/DrawControl'
import AOIPreview from '@/components/map/layers/AOIPreview'
import AOIPanel from '@/components/map/panels/AOIPanel'
import PstaAoiWms from '@/components/map/layers/PstaFireRisk'
import CwfisFdrWms from '@/components/map/layers/CwfisFireRisk'
import PstaFireRisk from '@/components/map/layers/PstaFireRisk'
import CwfisFireRisk from '@/components/map/layers/CwfisFireRisk'

export default function Page() {
  return (
    <MapRoot>
      <DrawControl position="top-left" />
      <AOIPreview />
      <PstaFireRisk />
      <CwfisFireRisk />
      <AOIPanel />
    </MapRoot>
  )
}
