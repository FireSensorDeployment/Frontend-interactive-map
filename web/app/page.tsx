'use client'
// import Map, { NavigationControl, Source, Layer, useControl } from 'react-map-gl/mapbox'
import MapRoot from '@/components/map/MapRoot'
import FireRisk from '@/components/map/layers/FireRisk'
import DrawControl from '@/components/map/controls/DrawControl'
import AOIPreview from '@/components/map/layers/AOIPreview'
import AOIPanel from '@/components/map/panels/AOIPanel'
import PstaFireRisk from '@/components/map/layers/PstaFireRisk'
import CwfisFireRisk from '@/components/map/layers/CwfisFireRisk'

export default function Page() {
  // const DBG = { Map, NavigationControl, Source, Layer, DrawControl, PstaFireRisk, AOIPanel, useControl, CwfisFireRisk}
  // Object.entries(DBG).forEach(([k, v]) => console.log(`DBG ${k}:`, v ? 'OK' : 'UNDEFINED'))
  return (
    <MapRoot>
      <DrawControl position="top-left" />
      <AOIPreview />
      <PstaFireRisk visible opacity={0.7} /* beforeId 可选 */ />
      <CwfisFireRisk />
      <AOIPanel />
    </MapRoot>
  )
}
