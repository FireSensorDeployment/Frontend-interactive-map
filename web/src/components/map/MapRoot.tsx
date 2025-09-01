'use client'
import Map, { NavigationControl } from 'react-map-gl/mapbox'
import mapboxgl from 'mapbox-gl'

type Props = {
  children?: React.ReactNode
  height?: string | number
  width?: string | number
}

export default function MapRoot({ children, height = '100vh', width = '100vw' }: Props) {
  return (
    <Map
      mapLib={mapboxgl}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
      initialViewState={{ longitude: -123.12, latitude: 49.28, zoom: 8 }}
      mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
      style={{ height, width }}
    >
      {/* 原生导航控件，也可以自己封装成一个组件 */}
      <NavigationControl position="top-right" />

      {/* 这里放你的所有小组件（控件/图层） */}
      {children}
    </Map>
  )
}
