/**
 * 坐标验证工具
 *
 * 用于验证地理坐标是否有效
 * 防止无效数据显示在地图上
 */

import type { SensorPoint } from '@/types/sensor'

/**
 * 检查纬度是否有效
 *
 * 纬度范围: -90 (南极) 到 90 (北极)
 *
 * @param lat - 纬度值
 * @returns 是否有效
 *
 * @example
 * isValidLatitude(49.28)   // true  ✅ 温哥华
 * isValidLatitude(91)      // false ❌ 超出范围
 * isValidLatitude(NaN)     // false ❌ 不是数字
 */
export function isValidLatitude(lat: number): boolean {
  return (
    typeof lat === 'number' &&  // 确保是数字
    !isNaN(lat) &&              // 确保不是 NaN
    lat >= -90 &&               // 不能小于 -90
    lat <= 90                   // 不能大于 90
  )
}

/**
 * 检查经度是否有效
 *
 * 经度范围: -180 (西) 到 180 (东)
 *
 * @param lng - 经度值
 * @returns 是否有效
 *
 * @example
 * isValidLongitude(-123.12) // true  ✅ 温哥华
 * isValidLongitude(181)     // false ❌ 超出范围
 * isValidLongitude(NaN)     // false ❌ 不是数字
 */
export function isValidLongitude(lng: number): boolean {
  return (
    typeof lng === 'number' &&  // 确保是数字
    !isNaN(lng) &&              // 确保不是 NaN
    lng >= -180 &&              // 不能小于 -180
    lng <= 180                  // 不能大于 180
  )
}

/**
 * 检查坐标对是否都有效
 *
 * @param lat - 纬度值
 * @param lng - 经度值
 * @returns 是否都有效
 *
 * @example
 * isValidCoordinate(49.28, -123.12) // true  ✅
 * isValidCoordinate(91, -123.12)    // false ❌ 纬度无效
 * isValidCoordinate(49.28, 181)     // false ❌ 经度无效
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return isValidLatitude(lat) && isValidLongitude(lng)
}

/**
 * 检查传感器点对象是否有效
 *
 * TypeScript 类型守卫函数
 * 不仅检查类型，还验证坐标范围
 *
 * @param point - 要验证的传感器点
 * @returns 是否是有效的传感器点
 *
 * @example
 * const data = { id: "s1", lat: 49.28, lng: -123.12 }
 * if (isValidSensorPoint(data)) {
 *   // TypeScript 现在知道 data 是 SensorPoint 类型
 *   console.log(data.id)
 * }
 */
export function isValidSensorPoint(point: unknown): point is SensorPoint {
  // 首先检查是否是对象
  if (!point || typeof point !== 'object') {
    return false
  }

  const p = point as any

  return (
    // 检查 id 字段
    typeof p.id === 'string' &&
    p.id.length > 0 &&
    // 检查坐标字段
    typeof p.lat === 'number' &&
    typeof p.lng === 'number' &&
    // 验证坐标有效性
    isValidCoordinate(p.lat, p.lng) &&
    // metadata 是可选的，如果存在必须是对象
    (p.metadata === undefined || typeof p.metadata === 'object')
  )
}

/**
 * 过滤传感器数组，只保留有效的传感器
 *
 * @param sensors - 传感器数组（可能包含无效数据）
 * @returns 只包含有效传感器的数组
 *
 * @example
 * const data = [
 *   { id: "s1", lat: 49.28, lng: -123.12 },  // ✅ 有效
 *   { id: "s2", lat: 91, lng: -123.12 },     // ❌ 纬度无效
 *   { id: "s3", lat: 49.29, lng: 181 }       // ❌ 经度无效
 * ]
 * const valid = filterValidSensors(data)
 * // 结果: [{ id: "s1", lat: 49.28, lng: -123.12 }]
 */
export function filterValidSensors(sensors: unknown[]): SensorPoint[] {
  const validSensors = sensors.filter(isValidSensorPoint)

  // 如果有无效数据，在控制台警告
  if (validSensors.length < sensors.length) {
    const invalidCount = sensors.length - validSensors.length
    console.warn(
      `过滤掉 ${invalidCount} 个无效传感器点`,
      sensors.filter(s => !isValidSensorPoint(s))
    )
  }

  return validSensors
}
