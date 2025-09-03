'use client'
import { useEffect, useState } from 'react'
import { Source, Layer } from 'react-map-gl/mapbox'
import * as turf from '@turf/turf'
import type { Polygon, MultiPolygon, Feature } from 'geojson' // 约束 AOI 的数据结构
import { useAOIStore } from '@/store/useAOIStore' // 全局状态，读取用户画的 AOI

type Props = {
  visible?: boolean
  opacity?: number
  maxAreaKm2?: number // AOI 超过这个面积就不加载（避免超大范围卡顿）
  beforeId?: string
  tileSize?: number // 瓦片大小（要与 WMS 的 width/height 匹配）
}

const SRC_ID = 'psta-wms-src'
const LAYER_ID = 'psta-wms-layer'

/** DataBC WMS 入口（pub 命名空间） */
const PSTA_WMS_BASE = (tileSize: number) =>
  'https://openmaps.gov.bc.ca/geo/pub/ows?' +
  'service=WMS&version=1.1.1&request=GetMap' +
  '&layers=pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_PSTA_FIRE_THREAT_RTG_SP' +
  '&styles=' + // 必须带，即使为空
  '&format=image/png&transparent=true' +
  '&exceptions=application/vnd.ogc.se_inimage' + // 出错也返回可解码图片
  '&srs=EPSG:3857&bbox={bbox-epsg-3857}' +
  `&width=${tileSize}&height=${tileSize}`


// 把 AOI 的 GeoJSON（WGS84 坐标）转成带 SRID=4326 的 WKT 字符串。
// GeoServer 看到带 SRID 的 WKT，会自动按目标 SRS（我们请求里是 3857）重投影。
function toWkt4326(geom: Polygon | MultiPolygon): string { 
  const fmt = (ring: number[][]) => ring.map(([x, y]) => `${x} ${y}`).join(',')
  if (geom.type === 'Polygon') {
    const rings = geom.coordinates.map(r => `(${fmt(r as any)})`).join(',')
    return `SRID=4326;POLYGON(${rings})`
  } else {
    const polys = geom.coordinates
      .map(poly => '(' + poly.map(r => `(${fmt(r as any)})`).join(',') + ')')
      .join(',')
    return `SRID=4326;MULTIPOLYGON(${polys})`
  }
}

// 构造带过滤条件的 WMS URL：
// 使用 CQL 过滤 WITHIN(SHAPE, WKT)，让服务端只渲染 AOI 内部的像素；
// 字段名常为 SHAPE（不是 GEOMETRY）；
function buildTilesUrl(aoi: Feature<Polygon | MultiPolygon>, tileSize: number) {
  const wkt = toWkt4326(aoi.geometry)
  // 常见几何字段是 SHAPE（不是 GEOMETRY）
  const cql = `INTERSECTS(SHAPE, ${wkt})`
  return `${PSTA_WMS_BASE(tileSize)}&CQL_FILTER=${encodeURIComponent(cql)}`
}

// 定义组件与默认参数：默认显示、70% 不透明、最大面积 5000 km²、512 瓦片。
export default function PstaFireRisk({
  visible = true,
  opacity = 0.7,
  maxAreaKm2 = 5000,
  beforeId,
  tileSize = 512
}: Props) {
    // 从全局状态取 AOI
  const aoi = useAOIStore(s => s.aoi)
  //本地状态存当前使用的瓦片 URL（带不带 CQL）。
  const [tilesUrl, setTilesUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!visible || !aoi) { setTilesUrl(null); return }
    const km2 = turf.area(aoi) / 1e6
    if (km2 > maxAreaKm2) { setTilesUrl(null); return }
    setTilesUrl(buildTilesUrl(aoi as any, tileSize))
  }, [visible, aoi, maxAreaKm2, tileSize])

  return (
    <Source
      id={SRC_ID}
      type="raster"
      // 常驻 Source；只切换 tiles，避免改动 id
      tiles={[tilesUrl ?? PSTA_WMS_BASE(tileSize)]}
      tileSize={tileSize}
      attribution="PSTA © Province of BC"
    >
      <Layer
        id={LAYER_ID}
        type="raster"
        paint={{ 'raster-opacity': opacity, 'raster-fade-duration': 0 }}
        layout={{ visibility: visible && !!tilesUrl ? 'visible' : 'none' }}
        beforeId={beforeId}
      />
    </Source>
  )
}

export { LAYER_ID as PSTA_LAYER_ID }
