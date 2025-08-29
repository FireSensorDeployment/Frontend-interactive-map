'use client'
import { useEffect, useRef, createContext, useContext } from 'react'
import mapboxgl from 'mapbox-gl'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string

const MapContext = createContext<mapboxgl.Map | null>(null)
export const useMap = () => useContext(MapContext)

const BC_BOUNDS: mapboxgl.LngLatBoundsLike = [[-139.1, 48.2], [-114.05, 60.1]]  // BC 省界，初始限制

export default function MapShell({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',  // 卫星+街道图，可以选择其他样式地图https://docs.mapbox.com/api/maps/styles/?utm_source=chatgpt.com#mapbox-styles
      projection: 'mercator',  // 投影方式，mercator是平铺
      bounds: BC_BOUNDS,
    })
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapRef.current = map
    map.once('load', () => map.resize())
    return () => map.remove()
  }, [])

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <MapContext.Provider value={mapRef.current}>
        {children}
      </MapContext.Provider>
    </div>
  )
}
