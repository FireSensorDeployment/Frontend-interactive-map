'use client'
import { useEffect, useState } from 'react'
import { Source, Layer } from 'react-map-gl/mapbox'
import * as turf from '@turf/turf'
import type { Polygon, MultiPolygon, Feature } from 'geojson'
import { useAOIStore } from '@/store/useAOIStore'

type Props = {
  visible?: boolean
  opacity?: number
  maxAreaKm2?: number
  beforeId?: string
  tileSize?: number // 256 或 512，和 WMS width/height 对应
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

/** Polygon/MultiPolygon(WGS84) → 带 SRID 的 WKT（GeoServer 会重投影） */
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

/** 生成带 CQL_FILTER 的 WMS 瓦片 URL（仅渲染 AOI 相交部分） */
function buildTilesUrl(aoi: Feature<Polygon | MultiPolygon>, tileSize: number) {
  const wkt = toWkt4326(aoi.geometry)
  // ⚠️ 常见几何字段是 SHAPE（不是 GEOMETRY）
  const cql = `INTERSECTS(SHAPE, ${wkt})`
  return `${PSTA_WMS_BASE(tileSize)}&CQL_FILTER=${encodeURIComponent(cql)}`
}

export default function PstaFireRisk({
  visible = true,
  opacity = 0.7,
  maxAreaKm2 = 5000,
  beforeId,
  tileSize = 512
}: Props) {
  const aoi = useAOIStore(s => s.aoi)
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
