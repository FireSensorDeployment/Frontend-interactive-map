/**
 * SensorLayer 组件：在地图上显示传感器点并支持自动聚合
 *
 * 功能：
 * 1. 监听 AOI 变化，自动调用后端 API 获取传感器位置
 * 2. 验证传感器坐标的有效性
 * 3. 将传感器数据转换为 GeoJSON 格式
 * 4. 在地图上渲染蓝色传感器点
 * 5. 当缩放级别 < 15 时，自动将邻近的传感器聚合成 cluster
 * 6. 在 cluster 上显示包含的传感器数量
 */

'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Source, Layer, useMap } from 'react-map-gl/mapbox'
import { useAOIStore } from '@/store/useAOIStore'
import { useSensorStore } from '@/store/useSensorStore'
import { filterValidSensors } from '@/lib/validators'
import ClusterPopup from '@/components/map/popups/ClusterPopup'
import SensorPopup from '@/components/map/popups/SensorPopup'
import type { SensorPoint } from '@/types/sensor'
import type { FeatureCollection, Point } from 'geojson'

// Source 和 Layer 的 ID 常量
const SENSOR_SOURCE_ID = 'sensors'
const SENSOR_LAYER_ID = 'sensor-points'
const CLUSTER_LAYER_ID = 'sensor-clusters'
const CLUSTER_COUNT_LAYER_ID = 'sensor-cluster-count'

// Clustering 配置常量
const CLUSTER_MAX_ZOOM = 14 // 在 zoom level 14 及以下时进行聚合
const CLUSTER_RADIUS = 50 // 聚合半径（像素）

/**
 * 将 SensorPoint[] 转换为 GeoJSON FeatureCollection
 *
 * @param sensors - 传感器点数组
 * @returns GeoJSON FeatureCollection
 */
function sensorsToGeoJSON(sensors: SensorPoint[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: sensors.map((sensor) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [sensor.lng, sensor.lat] // GeoJSON 格式是 [经度, 纬度]
      },
      properties: {
        id: sensor.id,
        ...sensor.metadata // 将 metadata 展开到 properties 中
      }
    }))
  }
}

export default function SensorLayer() {
  // 从全局状态获取 AOI 和传感器相关状态
  const aoi = useAOIStore((s) => s.aoi)
  const { sensors, setSensors, setLoading, setError } = useSensorStore()

  // 获取 map 实例
  const { current: map } = useMap()

  // Popup 状态
  const [selectedCluster, setSelectedCluster] = useState<{
    coordinates: [number, number]
    sensors: SensorPoint[]
  } | null>(null)

  const [selectedSensor, setSelectedSensor] = useState<SensorPoint | null>(null)

  // Cluster 点击处理器
  const handleClusterClick = useCallback(async (event: any) => {
    const feature = event.features?.[0]
    if (!feature || !map) return

    const clusterId = feature.properties.cluster_id
    const coordinates = feature.geometry.coordinates as [number, number]

    try {
      // 获取 cluster 中的所有点
      const source = map.getSource(SENSOR_SOURCE_ID) as any
      if (!source) return

      source.getClusterLeaves(
        clusterId,
        100, // 最多获取 100 个点
        0,   // 偏移量
        (error: any, features: any[]) => {
          if (error) {
            console.error('[SensorLayer] 获取 cluster leaves 失败:', error)
            return
          }

          // 将 GeoJSON features 转换为 SensorPoint[]
          const clusterSensors: SensorPoint[] = features.map((f, index) => ({
            id: f.properties?.id || `sensor-${index}`,
            lng: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
            metadata: f.properties
          }))

          setSelectedCluster({
            coordinates,
            sensors: clusterSensors
          })
        }
      )
    } catch (error) {
      console.error('[SensorLayer] Cluster 点击处理失败:', error)
    }
  }, [map])

  // 关闭 popup
  const handleClosePopup = useCallback(() => {
    setSelectedCluster(null)
  }, [])

  const handleCloseSensorPopup = useCallback(() => {
    setSelectedSensor(null)
  }, [])

  // Sensor 点击处理器
  const handleSensorClick = useCallback((event: any) => {
    const feature = event.features?.[0]
    if (!feature) return

    // 从 GeoJSON feature 提取传感器数据
    const sensor: SensorPoint = {
      id: feature.properties?.id || 'unknown',
      lng: feature.geometry.coordinates[0],
      lat: feature.geometry.coordinates[1],
      metadata: feature.properties
    }

    setSelectedSensor(sensor)
  }, [])


  // 监听 cluster 和 sensor 层的点击事件
  useEffect(() => {
    if (!map) return

    const handleMouseEnter = () => {
      if (map.getCanvas()) {
        map.getCanvas().style.cursor = 'pointer'
      }
    }

    const handleMouseLeave = () => {
      if (map.getCanvas()) {
        map.getCanvas().style.cursor = ''
      }
    }

    // Cluster 事件
    map.on('click', CLUSTER_LAYER_ID, handleClusterClick)
    map.on('mouseenter', CLUSTER_LAYER_ID, handleMouseEnter)
    map.on('mouseleave', CLUSTER_LAYER_ID, handleMouseLeave)

    // Sensor 事件
    map.on('click', SENSOR_LAYER_ID, handleSensorClick)
    map.on('mouseenter', SENSOR_LAYER_ID, handleMouseEnter)
    map.on('mouseleave', SENSOR_LAYER_ID, handleMouseLeave)

    return () => {
      // Cluster cleanup
      map.off('click', CLUSTER_LAYER_ID, handleClusterClick)
      map.off('mouseenter', CLUSTER_LAYER_ID, handleMouseEnter)
      map.off('mouseleave', CLUSTER_LAYER_ID, handleMouseLeave)

      // Sensor cleanup
      map.off('click', SENSOR_LAYER_ID, handleSensorClick)
      map.off('mouseenter', SENSOR_LAYER_ID, handleMouseEnter)
      map.off('mouseleave', SENSOR_LAYER_ID, handleMouseLeave)
    }
  }, [map, handleClusterClick, handleSensorClick])

  // 注释：移除了自动关闭逻辑，现在只能通过点击 X 按钮手动关闭 popup

  // 当 AOI 变化时，调用 API 获取传感器数据
  useEffect(() => {
    // 如果没有 AOI，不需要获取传感器
    if (!aoi) {
      return
    }

    // 定义异步函数来调用 API
    async function fetchSensors() {
      try {
        setLoading(true)
        setError(null)
        console.log('[SensorLayer] 开始获取传感器数据...')

        // 调用后端 API
        const response = await fetch('/api', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(aoi)
        })

        if (!response.ok) {
          throw new Error(`API 调用失败: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        // API 返回的是 GeoJSON FeatureCollection，需要转换为 SensorPoint[]
        let sensorPoints: SensorPoint[] = []

        if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
          // 从 GeoJSON Feature 转换为 SensorPoint
          sensorPoints = data.features.map((feature: { geometry: { coordinates: number[] }; properties?: Record<string, unknown> }, index: number) => ({
            id: (feature.properties?.id as string) || `sensor-${index}`,
            lng: feature.geometry.coordinates[0],
            lat: feature.geometry.coordinates[1],
            metadata: feature.properties
          }))
        }

        // 过滤并验证传感器坐标
        const validSensors = filterValidSensors(sensorPoints)

        // 更新全局状态
        setSensors(validSensors)
        setLoading(false)

        console.log(`[SensorLayer] 加载了 ${validSensors.length} 个传感器点`)
      } catch (err) {
        console.error('[SensorLayer] 获取传感器失败:', err)
        setError(err instanceof Error ? err.message : '未知错误')
        setLoading(false)
      }
    }

    // 执行 API 调用
    fetchSensors()
  }, [aoi, setSensors, setLoading, setError])

  // 将传感器数据转换为 GeoJSON 格式用于地图渲染
  const geoJsonData = useMemo(() => {
    return sensorsToGeoJSON(sensors)
  }, [sensors])

  // 如果没有传感器数据，返回空的 Source（避免报错）
  if (sensors.length === 0) {
    return null
  }

  return (
    <>
      <Source
        id={SENSOR_SOURCE_ID}
        type="geojson"
        data={geoJsonData}
        cluster={true}
        clusterMaxZoom={CLUSTER_MAX_ZOOM}
        clusterRadius={CLUSTER_RADIUS}
      >
        {/* Cluster 圆圈层 - 显示聚合的传感器组 */}
        <Layer
          id={CLUSTER_LAYER_ID}
          type="circle"
          filter={['has', 'point_count']}
          paint={{
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#51bbd6', // 2-10 个点：浅蓝色
              10,
              '#f1f075', // 10-30 个点：黄色
              30,
              '#f28cb1'  // 30+ 个点：粉色
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,  // 2-10 个点：小圆圈
              10,
              30,  // 10-30 个点：中圆圈
              30,
              40   // 30+ 个点：大圆圈
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }}
        />

        {/* Cluster 数量标签层 - 显示每个 cluster 包含的传感器数量 */}
        <Layer
          id={CLUSTER_COUNT_LAYER_ID}
          type="symbol"
          filter={['has', 'point_count']}
          layout={{
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
          }}
          paint={{
            'text-color': '#ffffff'
          }}
        />

        {/* 单个传感器点层 - 只显示未被聚合的传感器 */}
        <Layer
          id={SENSOR_LAYER_ID}
          type="circle"
          filter={['!', ['has', 'point_count']]}
          paint={{
            'circle-color': '#3b82f6', // 蓝色
            'circle-radius': 6,         // 半径 6px
            'circle-stroke-width': 2,   // 边框宽度
            'circle-stroke-color': '#ffffff' // 白色边框
          }}
        />
      </Source>

      {/* Cluster Popup - 显示点击的 cluster 详情 */}
      {selectedCluster && (
        <ClusterPopup
          coordinates={selectedCluster.coordinates}
          sensors={selectedCluster.sensors}
          onClose={handleClosePopup}
        />
      )}

      {/* Sensor Popup - 显示点击的单个传感器详情 */}
      {selectedSensor && (
        <SensorPopup
          sensor={selectedSensor}
          onClose={handleCloseSensorPopup}
        />
      )}
    </>
  )
}
