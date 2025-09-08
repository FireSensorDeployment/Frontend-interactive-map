'use client'
import { Source, Layer } from 'react-map-gl/mapbox' // 从 react-map-gl 里引入两个声明式组件：Source：数据源（比如一组瓦片）；Layer：样式层，用来渲染 Source。

type Props = {
  visible?: boolean // 控制图层显示/隐藏（默认显示）
  opacity?: number // 图层透明度（默认 0.6）
  beforeId?: string // 插入到其他图层之前（用来控制层级）
  tileSize?: number // 瓦片大小（默认 512px）
}

// 给 Source 和 Layer 定义唯一的 id。这样可以在地图里识别、管理它们
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
  opacity = 0.2,
  beforeId,
  tileSize = 512
}: Props) {
  return (
    <Source // 渲染一个 栅格数据源 (raster)
      id={SRC_ID}
      type="raster" // 栅格瓦片（图片，而不是矢量）
      tiles={[CWFIS_FDR_WMS]} // 使用上面定义的 WMS 模板
      tileSize={tileSize} // 瓦片大小（默认 512px）
      attribution="CWFIS © Natural Resources Canada"
    >
    {/* 在这个 Source 上添加一个渲染层 */}
      <Layer
        id={LAYER_ID}
        type="raster"
        paint={{ 'raster-opacity': opacity, 'raster-fade-duration': 0 }} // 根据参数调整透明度, 禁用淡入动画（渲染更快）
        layout={{ visibility: visible ? 'visible' : 'none' }} 
        beforeId={beforeId}
      />
    </Source>
  )
}

export { LAYER_ID as CWFIS_LAYER_ID } // 导出一个常量 CWFIS_LAYER_ID，这样别的地方可以引用这个 layer 的 id（比如做图层顺序控制）
