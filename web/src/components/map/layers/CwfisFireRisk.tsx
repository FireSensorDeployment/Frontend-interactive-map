'use client'
import { Source, Layer } from 'react-map-gl/mapbox'

type Props = {
  visible?: boolean
  opacity?: number
  beforeId?: string
  tileSize?: number
}

const SRC_ID = 'cwfis-fdr-src'
const LAYER_ID = 'cwfis-fdr-layer'
const CWFIS_FDR_WMS =
  'https://cwfis.cfs.nrcan.gc.ca/geoserver/public/wms?' +
  'service=WMS&version=1.1.1&request=GetMap' +
  '&layers=public:fdr_current&styles=' +
  '&format=image/png&transparent=true' +
  '&srs=EPSG:3857&bbox={bbox-epsg-3857}&width=512&height=512'

export default function CwfisFireRisk({
  visible = true,
  opacity = 0.6,
  beforeId,
  tileSize = 512
}: Props) {
  return (
    <Source
      id={SRC_ID}
      type="raster"
      tiles={[CWFIS_FDR_WMS]}
      tileSize={tileSize}
      attribution="CWFIS © Natural Resources Canada"
    >
      <Layer
        id={LAYER_ID}
        type="raster"
        paint={{ 'raster-opacity': opacity, 'raster-fade-duration': 0 }}
        layout={{ visibility: visible ? 'visible' : 'none' }}
        beforeId={beforeId}
      />
    </Source>
  )
}

export { LAYER_ID as CWFIS_LAYER_ID }
