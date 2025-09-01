'use client'
import { Source, Layer } from 'react-map-gl/mapbox'

type Props = {
  opacity?: number
  visible?: boolean
  /** 把本图层插到某个已存在图层之前，控制层级；不传则在最上面 */
  beforeId?: string
}

const SRC_ID = 'risk-psta'
const LAYER_ID = 'risk-psta'

// 省府 PSTA（ArcGIS export）栅格切片（bbox 模板由 mapbox-gl 负责填充）
const BC_PSTA_EXPORT =
  'https://delivery.maps.gov.bc.ca/arcgis/rest/services/whse/bcgw_pub_whse_land_and_natural_resource/MapServer/export' +
  '?f=image&format=png32&transparent=true' +
  '&bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256' +
  '&layers=show:17' // Fire Threat Rating

export default function FireRisk({ opacity = 0.3, visible = true, beforeId }: Props) {
  return (
    <Source
      id={SRC_ID}
      type="raster"
      tiles={[BC_PSTA_EXPORT]}
      tileSize={256}
      attribution="PSTA © Province of BC"
    >
      <Layer
        id={LAYER_ID}
        type="raster"
        paint={{ 'raster-opacity': opacity }}
        layout={{ visibility: visible ? 'visible' : 'none' }}
        // 控制插入顺序（可选）
        beforeId={beforeId}
      />
    </Source>
  )
}
