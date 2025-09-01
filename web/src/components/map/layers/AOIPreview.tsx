'use client'
import { useMemo } from 'react'
import { Source, Layer } from 'react-map-gl/mapbox'
import * as turf from '@turf/turf'
import { useAOIStore } from '@/store/useAOIStore'

const PREVIEW_SRC  = 'preview'
const PREVIEW_FILL = 'preview-fill'
const PREVIEW_LINE = 'preview-line'

export default function AOIPreview() {
  const aoi = useAOIStore(s => s.aoi)

  const preview = useMemo(() => {
    if (!aoi) return { type: 'FeatureCollection', features: [] } as any
    return turf.buffer(aoi, 0, { units: 'kilometers' })
  }, [aoi])

  return (
    <Source id={PREVIEW_SRC} type="geojson" data={preview as any}>
      <Layer
        id={PREVIEW_FILL}
        type="fill"
        paint={{ 'fill-color': '#3b82f6', 'fill-opacity': 0.12 }}
      />
      <Layer
        id={PREVIEW_LINE}
        type="line"
        paint={{ 'line-color': '#3b82f6', 'line-width': 2 }}
      />
    </Source>
  )
}
