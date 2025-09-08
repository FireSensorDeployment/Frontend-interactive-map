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

// WMS GetMap 模板（用于前端渲染）
const CWFIS_FDR_WMS =
  'https://cwfis.cfs.nrcan.gc.ca/geoserver/public/wms?' +
  'service=WMS&version=1.1.1&request=GetMap' +
  '&layers=public:fdr_current&styles=' +
  '&format=image/png&transparent=true' +
  '&srs=EPSG:3857&bbox={bbox-epsg-3857}&width=512&height=512'

export default function CwfisFireRisk({
  visible = true,
  opacity = 0.2,
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

// 供其他模块使用的标识
export { LAYER_ID as CWFIS_LAYER_ID, SRC_ID as CWFIS_SOURCE_ID }

// ⭐ 新增：导出一份“后端可用的 WMS 描述”，不要包含 bbox 之类的运行时参数
export const CWFIS_WMS_META = {
  service: 'WMS' as const,
  endpoint: 'https://cwfis.cfs.nrcan.gc.ca/geoserver/public/wms',
  version: '1.1.1',
  layer: 'public:fdr_current',
  format: 'image/png',
  transparent: true,
  preferredCRS: ['EPSG:4326', 'EPSG:3857'], // 后端可自行选择
  attribution: 'CWFIS © Natural Resources Canada'
}
