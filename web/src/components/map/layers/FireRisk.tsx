'use client'
import { useEffect } from 'react'
import { useMap } from '../MapShell'

export default function FireRisk() {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    const srcId = 'risk-psta'
    const layerId = 'risk-psta'

    const bcPstaExport =
      'https://delivery.maps.gov.bc.ca/arcgis/rest/services/whse/bcgw_pub_whse_land_and_natural_resource/MapServer/export'
      + '?f=image&format=png32&transparent=true'
      + '&bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256'
      + '&layers=show:17' // BC Wildfire PSTA Fire Threat Rating

    const onLoad = () => {
      if (!map.getSource(srcId)) {
        map.addSource(srcId, {
          type: 'raster',
          tiles: [bcPstaExport],
          tileSize: 256,
          attribution: 'PSTA © Province of BC',
        } as any)
      }
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'raster',
          source: srcId,
          paint: { 'raster-opacity': 0.3 },
        })
      }
    }

    if (map.loaded()) onLoad()
    else map.once('load', onLoad)

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId)
      if (map.getSource(srcId)) map.removeSource(srcId)
    }
  }, [map])

  return null
}
