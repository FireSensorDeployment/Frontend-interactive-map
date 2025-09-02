'use client'
import { Source, Layer } from 'react-map-gl/mapbox'

type Props = {
  opacity?: number
  visible?: boolean
  beforeId?: string // 可选：想插在已有图层之前
}

const SRC_ID = 'cwfis-fdr'
const LAYER_ID = 'cwfis-fdr'

// CWFIS WMS：当前火险等级（Fire Danger Rating）
const CWFIS_FDR_WMS =
  'https://cwfis.cfs.nrcan.gc.ca/geoserver/public/wms?' +
  'service=WMS&version=1.1.1&request=GetMap' +
  '&layers=public:fdr_current' +     // ← 关键：正确图层名（可换成其他）
  '&styles=' +                        // WMS 允许空 styles
  '&format=image/png&transparent=true' +
  '&srs=EPSG:3857&bbox={bbox-epsg-3857}' +  // Mapbox 使用 3857
  '&width=256&height=256'

export default function FireRisk({ opacity = 0.6, visible = true, beforeId }: Props) {
  return (
    <Source
      id={SRC_ID}
      type="raster"
      tiles={[CWFIS_FDR_WMS]}
      tileSize={256}
      attribution="CWFIS © Natural Resources Canada"
    >
      <Layer
        id={LAYER_ID}
        type="raster"
        paint={{ 'raster-opacity': opacity }}
        layout={{ visibility: visible ? 'visible' : 'none' }}
        beforeId={beforeId}
      />
    </Source>
  )
}
