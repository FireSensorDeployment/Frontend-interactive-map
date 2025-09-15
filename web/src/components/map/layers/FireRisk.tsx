// 这个使用了 CWFIS 的 WMS 服务和 BC Gov 的 ArcGIS 服务
// CWFIS 的 WMS 服务直接用 URL 就行
// BC Gov 的 ArcGIS 服务需要自己拉要素并渲染（因为没有现成的瓦片服务）
// 这里的 PSTA 图层只显示 AOI 相交部分，且当 AOI 面积过大时不显示
// ！！目前这个文档不在使用，仅供参考

'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Source, Layer } from 'react-map-gl/mapbox'
import * as turf from '@turf/turf'
import type { FeatureCollection, Feature, Polygon } from 'geojson'
import { useAOIStore } from '@/store/useAOIStore'

type Props = {
  cwfisVisible?: boolean
  cwfisOpacity?: number
  cwfisBeforeId?: string
  pstaVisible?: boolean
  pstaOpacity?: number
  /** 建议不传，让 PSTA 默认在最上层；如需传请保证高于 CWFIS */
  pstaBeforeId?: string
  pstaMaxAreaKm2?: number
}

const CWFIS_SRC_ID  = 'cwfis-fdr-src'
const CWFIS_LAYER_ID= 'cwfis-fdr-layer'
const CWFIS_FDR_WMS =
  'https://cwfis.cfs.nrcan.gc.ca/geoserver/public/wms?' +
  'service=WMS&version=1.1.1&request=GetMap' +
  '&layers=public:fdr_current&styles=' +
  '&format=image/png&transparent=true' +
  '&srs=EPSG:3857&bbox={bbox-epsg-3857}&width=512&height=512'

const PSTA_SRC_ID   = 'psta-risk-src'
const PSTA_FILL_ID  = 'psta-risk-fill'
const PSTA_LINE_ID  = 'psta-risk-line'
const PSTA_QUERY =
  'https://delivery.maps.gov.bc.ca/arcgis/rest/services/whse/bcgw_pub_whse_land_and_natural_resource/MapServer/17/query'
const PSTA_META =
  'https://delivery.maps.gov.bc.ca/arcgis/rest/services/whse/bcgw_pub_whse_land_and_natural_resource/MapServer/17?f=pjson'
const PAGE_SIZE = 1000
const EMPTY_FC: FeatureCollection = { type: 'FeatureCollection', features: [] }

/** ArcGIS color [r,g,b,a] -> rgba() string */
function arcColorToRgba(c: number[] | undefined) {
  if (!c || c.length < 3) return '#cccccc'
  const [r, g, b, a = 255] = c
  const alpha = Math.max(0, Math.min(1, a / 255))
  return `rgba(${r},${g},${b},${alpha})`
}

/** 把 ArcGIS renderer 转成 Mapbox 表达式（只做 fill 用） */
function rendererToFillExpr(renderer: any): any {
  if (!renderer) return '#cccccc'
  const type = (renderer.type || renderer.rendererType || '').toLowerCase()

  // simpleRenderer
  if (type.includes('simple')) {
    const color = arcColorToRgba(renderer.symbol?.color)
    return color
  }

  // classBreaksRenderer
  if (type.includes('classbreak')) {
    const field = renderer.field || renderer.normalizationField || renderer.attributeField
    const infos = (renderer.classBreakInfos || []).slice().sort((a:any,b:any) => {
      const aa = a.maxValue ?? a.classMaxValue ?? a.max ?? 0
      const bb = b.maxValue ?? b.classMaxValue ?? b.max ?? 0
      return aa - bb
    })
    if (!field || infos.length === 0) return '#cccccc'

    // 用 step： [ 'step', ['to-number',['get',field], base], color0, break1, color1, ... ]
    // base 用最小分级色；阈值用各段 maxValue
    const baseColor = arcColorToRgba(infos[0]?.symbol?.color)
    const expr: any[] = ['step', ['to-number', ['get', field], 0], baseColor]
    for (let i = 1; i < infos.length; i++) {
      const brk = infos[i-1].maxValue ?? infos[i-1].classMaxValue ?? infos[i-1].max
      const col = arcColorToRgba(infos[i]?.symbol?.color)
      if (Number.isFinite(brk)) {
        expr.push(Number(brk), col)
      }
    }
    return expr
  }

  // uniqueValueRenderer
  if (type.includes('uniquevalue')) {
    const field = renderer.field1 || renderer.field || renderer.attributeField
    const infos = renderer.uniqueValueInfos || []
    if (!field || infos.length === 0) return '#cccccc'
    const expr: any[] = ['match', ['to-string', ['get', field]]]
    for (const info of infos) {
      expr.push(String(info.value ?? ''), arcColorToRgba(info.symbol?.color))
    }
    // default color
    const def = arcColorToRgba(renderer.defaultSymbol?.color) || '#cccccc'
    expr.push(def)
    return expr
  }

  // 兜底
  return '#cccccc'
}

export default function FireRisk({
  cwfisVisible = true,
  cwfisOpacity = 0.6,
  cwfisBeforeId,
  pstaVisible = true,
  pstaOpacity = 0.7,
  pstaBeforeId,
  pstaMaxAreaKm2 = 5000
}: Props) {
  const aoi = useAOIStore(s => s.aoi)

  const [fc, setFc] = useState<FeatureCollection | null>(null)
  const [status, setStatus] = useState<'idle'|'loading'|'error'|'too-big'|'no-aoi'>('idle')
  const [serverFillExpr, setServerFillExpr] = useState<any | null>(null) // 👈 从服务器拿的样式
  const abortRef = useRef<AbortController | null>(null)

  // 一次性取服务器的 renderer（样式）
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(PSTA_META)
        if (!res.ok) return
        const json = await res.json()
        const expr = rendererToFillExpr(json?.drawingInfo?.renderer)
        if (!cancelled) setServerFillExpr(expr)
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  // 拉取 PSTA 要素（仅在有 AOI 且范围合适时）
  useEffect(() => {
    if (!pstaVisible) { setStatus('idle'); setFc(null); return }
    if (!aoi)         { setStatus('no-aoi'); setFc(null); return }

    const areaKm2 = turf.area(aoi) / 1_000_000
    if (areaKm2 > pstaMaxAreaKm2) { setStatus('too-big'); setFc(null); return }

    setStatus('loading')
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac;
    (async () => {
      try {
        const [minX, minY, maxX, maxY] = turf.bbox(aoi) as [number, number, number, number]
        const envelope = `${minX},${minY},${maxX},${maxY}`

        const all: any[] = []
        let offset = 0
        while (true) {
          const qs = new URLSearchParams({
            f: 'geojson',
            where: '1=1',
            returnGeometry: 'true',
            spatialRel: 'esriSpatialRelIntersects',
            geometry: envelope,
            geometryType: 'esriGeometryEnvelope',
            inSR: '4326',
            outSR: '4326',
            outFields: '*',
            resultOffset: String(offset),
            resultRecordCount: String(PAGE_SIZE),
            geometryPrecision: '6'
          }).toString()
          const res = await fetch(`${PSTA_QUERY}?${qs}`, { signal: ac.signal })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const json = await res.json()
          const batch = Array.isArray(json.features) ? json.features : []
          all.push(...batch)
          if (batch.length < PAGE_SIZE) break
          offset += PAGE_SIZE
        }

        // 只保留多边形 & 按 AOI 相交过滤
        const onlyPolys = all.filter((f: any) => {
          const t = f?.geometry?.type
          return t === 'Polygon' || t === 'MultiPolygon'
        })
        const filtered = onlyPolys.filter((f:any) =>
          turf.booleanIntersects(f as Feature, aoi as Feature<Polygon>)
        )

        setFc({ type: 'FeatureCollection', features: filtered })
        setStatus('idle')
      } catch (e:any) {
        if (e.name === 'AbortError') return
        console.error(e)
        setStatus('error'); setFc(null)
      }
    })()

    return () => abortRef.current?.abort()
  }, [aoi, pstaVisible, pstaMaxAreaKm2])

  // 只让填充作用于 Polygon / MultiPolygon
  const polygonFilter: any = useMemo(() => (['any',
    ['==', ['geometry-type'], 'Polygon'],
    ['==', ['geometry-type'], 'MultiPolygon']
  ]), [])

  return (
    <>
      {/* CWFIS：始终挂着；visibility 控制显隐 */}
      {/*
      <Source key={CWFIS_SRC_ID} id={CWFIS_SRC_ID} type="raster"
              tiles={[CWFIS_FDR_WMS]} tileSize={512}
              attribution="CWFIS © Natural Resources Canada">
        <Layer
          id={CWFIS_LAYER_ID}
          type="raster"
          paint={{ 'raster-opacity': cwfisOpacity, 'raster-fade-duration': 0 }}
          layout={{ visibility: cwfisVisible ? 'visible' : 'none' }}
          beforeId={cwfisBeforeId}
        />
      </Source>
    */}

      {/* PSTA：始终挂着；无数据传空 FC；visibility 控制显隐 */}
      <Source key={PSTA_SRC_ID} id={PSTA_SRC_ID} type="geojson" data={(fc ?? EMPTY_FC) as any}>
        {/* 填充：直接使用服务器 renderer 转出来的表达式（拿不到就给个兜底色） */}
        <Layer
          id={PSTA_FILL_ID}
          type="fill"
          filter={polygonFilter}
          paint={{
            'fill-color': serverFillExpr ?? '#ef4444',
            'fill-opacity': Math.min(pstaOpacity ?? 0.7, 0.9)
          }}
          beforeId={pstaBeforeId}
          layout={{ visibility: pstaVisible && (fc?.features.length ?? 0) > 0 ? 'visible' : 'none' }}
        />
        {/* 细边 */}
        <Layer
          id={PSTA_LINE_ID}
          type="line"
          filter={polygonFilter}
          paint={{
            'line-color': '#374151',
            'line-width': 1,
            'line-opacity': Math.min(pstaOpacity ?? 0.7, 0.95)
          }}
          beforeId={pstaBeforeId}
          layout={{ visibility: pstaVisible && (fc?.features.length ?? 0) > 0 ? 'visible' : 'none' }}
        />
      </Source>
    </>
  )
}
