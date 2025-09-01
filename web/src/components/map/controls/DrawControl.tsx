'use client'
import { useCallback } from 'react'
import { useControl } from 'react-map-gl/mapbox'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import type { Feature, Polygon } from 'geojson'
import { useAOIStore } from '@/store/useAOIStore'

type Props = {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export default function DrawControl({ position = 'top-left' }: Props) {
  const setAOI = useAOIStore(s => s.setAOI)

  const onCreateOrUpdate = useCallback((e: any) => {
    const f = e.features?.[0]
    if (!f) return
    if (f.geometry?.type === 'Polygon') {
      const aoi: Feature<Polygon> = {
        type: 'Feature',
        geometry: f.geometry,
        properties: f.properties ?? {}
      }
      setAOI(aoi)
    }
  }, [setAOI])

  const onDelete = useCallback(() => setAOI(null), [setAOI])

  // 创建控件
  const draw = useControl<MapboxDraw>(
    () => new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      keybindings: true
    }),
    ({ map }) => {
      map.on('draw.create', onCreateOrUpdate)
      map.on('draw.update', onCreateOrUpdate)
      map.on('draw.delete', onDelete)
    },
    ({ map }) => {
      map.off('draw.create', onCreateOrUpdate)
      map.off('draw.update', onCreateOrUpdate)
      map.off('draw.delete', onDelete)
    },
    { position } // 控件位置
  )

  return null
}
