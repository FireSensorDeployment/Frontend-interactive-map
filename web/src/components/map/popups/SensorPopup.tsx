/**
 * SensorPopup 组件：显示单个传感器的详细信息
 *
 * 功能：
 * - 显示传感器 ID 和坐标
 * - 使用 inline styles（与项目风格一致）
 * - 可点击关闭
 */

'use client'

import { Popup } from 'react-map-gl/mapbox'
import type { SensorPoint } from '@/types/sensor'

type SensorPopupProps = {
  /** 传感器数据 */
  sensor: SensorPoint
  /** 关闭 popup 的回调函数 */
  onClose: () => void
}

export default function SensorPopup({ sensor, onClose }: SensorPopupProps) {
  return (
    <Popup
      longitude={sensor.lng}
      latitude={sensor.lat}
      anchor="bottom"
      onClose={onClose}
      closeButton={true}
      closeOnClick={false}
    >
      <div style={{ padding: 12, width: 280 }}>
        {/* 标题 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          paddingBottom: 8,
          borderBottom: '1px solid #e5e7eb'
        }}>
          {/* 传感器图标 */}
          <div style={{
            width: 12,
            height: 12,
            backgroundColor: '#3b82f6',
            borderRadius: '50%',
            border: '2px solid #ffffff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            flexShrink: 0
          }} />
          <h3 style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#111827',
            margin: 0
          }}>
            传感器详情
          </h3>
        </div>

        {/* 传感器 ID */}
        <div style={{ marginBottom: 8 }}>
          <p style={{
            fontSize: 11,
            color: '#6b7280',
            marginBottom: 2,
            fontWeight: 500
          }}>
            传感器 ID
          </p>
          <p style={{
            fontSize: 12,
            color: '#111827',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            wordBreak: 'break-all'
          }}>
            {sensor.id}
          </p>
        </div>

        {/* 坐标信息 */}
        <div style={{ marginBottom: 8 }}>
          <p style={{
            fontSize: 11,
            color: '#6b7280',
            marginBottom: 4,
            fontWeight: 500
          }}>
            坐标
          </p>
          <div style={{
            fontSize: 11,
            color: '#4b5563',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
          }}>
            <div style={{ display: 'flex', marginBottom: 2 }}>
              <span style={{ width: 40, color: '#6b7280' }}>经度:</span>
              <span>{sensor.lng.toFixed(6)}</span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ width: 40, color: '#6b7280' }}>纬度:</span>
              <span>{sensor.lat.toFixed(6)}</span>
            </div>
          </div>
        </div>

        {/* 额外的 metadata（如果有） - 过滤掉 id 因为已经显示 */}
        {sensor.metadata && (() => {
          const entries = Object.entries(sensor.metadata).filter(([key]) => key !== 'id')
          if (entries.length === 0) return null

          return (
            <div style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px solid #e5e7eb'
            }}>
              <p style={{
                fontSize: 11,
                color: '#6b7280',
                marginBottom: 4,
                fontWeight: 500
              }}>
                附加信息
              </p>
              {entries.map(([key, value]) => (
                <div key={key} style={{
                  fontSize: 11,
                  color: '#6b7280',
                  marginBottom: 2,
                  display: 'flex',
                  gap: 6
                }}>
                  <span style={{ fontWeight: 500, minWidth: 60 }}>{key}:</span>
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
    </Popup>
  )
}
