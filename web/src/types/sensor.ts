/**
 * 传感器点类型定义
 *
 * 这个文件定义了传感器数据的结构，确保前端代码使用正确的数据格式
 */

/**
 * 单个传感器点的数据结构
 *
 * @example
 * const sensor: SensorPoint = {
 *   id: "sensor-001",
 *   lat: 49.2827,
 *   lng: -123.1207,
 *   metadata: { priority: 0.95 }
 * }
 */
export interface SensorPoint {
  /**
   * 传感器的唯一标识符
   * 例如: "sensor-001", "sensor-abc123"
   */
  id: string

  /**
   * 纬度坐标 (WGS84坐标系)
   * 有效范围: -90 到 90
   */
  lat: number

  /**
   * 经度坐标 (WGS84坐标系)
   * 有效范围: -180 到 180
   */
  lng: number

  /**
   * 可选的额外信息
   * 可能包含: 优先级、传感器类型、覆盖半径等
   */
  metadata?: {
    priority?: number           // 优先级分数 (0-1)
    coverageRadius?: number     // 覆盖半径 (米)
    sensorType?: string         // 传感器类型
    [key: string]: unknown      // 允许其他自定义字段
  }
}
