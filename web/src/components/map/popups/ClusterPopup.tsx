/**
 * ClusterPopup 组件：显示 cluster 中包含的传感器列表
 *
 * 功能：
 * 1. 接收传感器列表作为 props
 * 2. 使用 inline styles 样式化（与项目风格保持一致）
 * 3. 支持大量传感器的滚动显示（50+）
 * 4. 显示每个传感器的详细信息（ID、坐标）
 */

'use client'

import { Popup } from 'react-map-gl/mapbox'
import type { SensorPoint } from '@/types/sensor'

type ClusterPopupProps = {
  /** Cluster 的地理坐标 [longitude, latitude] */
  coordinates: [number, number]
  /** Cluster 中包含的传感器列表 */
  sensors: SensorPoint[]
  /** 关闭 popup 的回调函数 */
  onClose: () => void
}

export default function ClusterPopup({ coordinates, sensors, onClose }: ClusterPopupProps) {
  return (
    <Popup
      longitude={coordinates[0]}
      latitude={coordinates[1]}
      anchor="bottom"
      onClose={onClose}
      closeButton={true}
      closeOnClick={false}
    >
      <div style={{ padding: 14, width: 200 }}>
        {/* 标题 */}
        <h3 style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#111827',
          marginBottom: 8,
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: 8
        }}>
          传感器集群 ({sensors.length} 个传感器)
        </h3>

        {/* 传感器列表 - 支持滚动 */}
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {sensors.map((sensor, index) => (
            <div
              key={sensor.id}
              style={{
                padding: 8,
                backgroundColor: '#f9fafb',
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                marginBottom: 8,
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#eff6ff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                {/* 点图标 - 移到左侧 */}
                <div style={{ flexShrink: 0, paddingTop: 2 }}>
                  <div style={{
                    width: 12,
                    height: 12,
                    backgroundColor: '#3b82f6',
                    borderRadius: '50%',
                    border: '2px solid #ffffff',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* 传感器标题 */}
                  <div style={{ marginBottom: 6 }}>
                    <p style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#111827',
                      marginBottom: 2
                    }}>
                      传感器 #{index + 1}
                    </p>
                    <p style={{
                      fontSize: 11,
                      color: '#6b7280',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
                    }}>
                      {sensor.id}
                    </p>
                  </div>

                  {/* 坐标信息 - 使用表格布局 */}
                  <div style={{ fontSize: 11, color: '#4b5563', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                    <div style={{ display: 'flex', marginBottom: 2 }}>
                      <span style={{ width: 40, color: '#6b7280' }}>经度:</span>
                      <span>{sensor.lng.toFixed(6)}</span>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <span style={{ width: 40, color: '#6b7280' }}>纬度:</span>
                      <span>{sensor.lat.toFixed(6)}</span>
                    </div>
                  </div>

                  {/* 额外的 metadata（如果有） - 过滤掉 id 因为已经显示 */}
                  {sensor.metadata && (() => {
                    const entries = Object.entries(sensor.metadata).filter(([key]) => key !== 'id')
                    if (entries.length === 0) return null

                    return (
                      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #e5e7eb' }}>
                        {entries.map(([key, value]) => (
                          <div key={key} style={{
                            fontSize: 11,
                            color: '#6b7280',
                            marginBottom: 2,
                            display: 'flex',
                            gap: 6
                          }}>
                            <span style={{ fontWeight: 500 }}>{key}:</span>
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 如果传感器数量很多，显示提示 */}
        {sensors.length > 10 && (
          <p style={{
            marginTop: 8,
            fontSize: 12,
            color: '#6b7280',
            textAlign: 'center'
          }}>
            向下滚动查看更多传感器
          </p>
        )}
      </div>
    </Popup>
  )
}
