'use client'
import { useEffect } from 'react'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import * as turf from '@turf/turf'
import { useMap } from '../MapShell'
import { useAOIStore } from '@/store/useAOIStore'
import type { Feature, Polygon } from 'geojson'

const PREVIEW_SRC = 'preview'
const PREVIEW_FILL = 'preview-fill'
const PREVIEW_LINE = 'preview-line'

export default function DrawAOI() {
  const map = useMap()
  const setAOI = useAOIStore(s => s.setAOI)

  useEffect(() => {
    if (!map) return

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      // 可选：确保键盘删除启用（默认是 true）
      keybindings: true,
    })
    map.addControl(draw, 'top-left')

    const removePreview = () => {
      if (map.getLayer(PREVIEW_FILL)) map.removeLayer(PREVIEW_FILL)
      if (map.getLayer(PREVIEW_LINE)) map.removeLayer(PREVIEW_LINE)
      if (map.getSource(PREVIEW_SRC)) map.removeSource(PREVIEW_SRC)
    }

    const ensurePreviewLayers = (geojson: any) => {
      if (map.getSource(PREVIEW_SRC)) {
        (map.getSource(PREVIEW_SRC) as any).setData(geojson)
        return
      }
      map.addSource(PREVIEW_SRC, { type: 'geojson', data: geojson })
      map.addLayer({
        id: PREVIEW_FILL, type: 'fill', source: PREVIEW_SRC,
        paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.12 }
      })
      map.addLayer({
        id: PREVIEW_LINE, type: 'line', source: PREVIEW_SRC,
        paint: { 'line-color': '#3b82f6', 'line-width': 2 }
      })
    }

    const dump = (feature: Feature<Polygon>) => {
      const aoi: Feature<Polygon> = {
        type: 'Feature',
        geometry: feature.geometry,
        properties: feature.properties ?? {}
      }
      setAOI(aoi)
      const preview = turf.buffer(aoi, 0.3, { units: 'kilometers' })
      ensurePreviewLayers(preview as any)
      ;(window as any).aoi = aoi
    }

    const onCreate = (e: any) => {
      const latest = e.features?.[0]
      if (!latest) return
      // 只保留最后一个 AOI
      const ids = draw.getAll().features.map((f: any) => f.id)
      ids.slice(0, -1).forEach((id: string) => draw.delete(id))
      dump(latest)
    }

    const onUpdate = (e: any) => {
      if (e.features && e.features[0]) dump(e.features[0])
    }

    const onDelete = () => {
      // 用户点击垃圾桶或按键删除 → 清空 AOI 状态与预览层
      setAOI(null)
      removePreview()
      // 同步：window.aoi 也清掉（可选）
      ;(window as any).aoi = null
    }

    map.on('draw.create', onCreate)
    map.on('draw.update', onUpdate)
    map.on('draw.delete', onDelete)

    return () => {
      map.off('draw.create', onCreate)
      map.off('draw.update', onUpdate)
      map.off('draw.delete', onDelete)
      try { map.removeControl(draw) } catch {}
      removePreview()
    }
  }, [map, setAOI])

  return null
}