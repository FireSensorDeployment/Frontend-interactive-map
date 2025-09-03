// 地图的根组件，放所有控件和图层
// 这里的实现方式是: 使用 react-map-gl/mapbox 作为 Mapbox GL 的 React 封装库

'use client'
import Map, { NavigationControl } from 'react-map-gl/mapbox'
import mapboxgl from 'mapbox-gl'

type Props = {
  children?: React.ReactNode
  height?: string | number
  width?: string | number
}

export default function MapRoot({ children, height = '100vh', width = '100vw' }: Props) { // 默认全屏
  return (
    <Map
      mapLib={mapboxgl}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
      initialViewState={{ longitude: -123.12, latitude: 49.28, zoom: 8 }} //这个是温哥华的定位，可以改成全加拿大的
      mapStyle="mapbox://styles/mapbox/satellite-streets-v12" // 卫星街道图，也可以改成别的
      style={{ height, width }}
    >
      {/* 原生导航控件，也可以自己封装成一个组件, 因为没啥用所以直接这么简单写了 */}
      <NavigationControl position="top-right" />

      {/* 这里放你的所有小组件（控件/图层） */}
      {children}
    </Map>
  )
}
