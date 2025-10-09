/**
 * API 合约类型定义
 *
 * 定义前端和后端之间的数据传输格式
 * 确保双方使用相同的数据结构
 */

import type { Feature, Polygon } from 'geojson'
import type { SensorPoint } from './sensor'

/**
 * 发送给后端的请求数据
 *
 * 当用户画完 AOI 后，前端把这个数据发给 /api/route
 */
export interface SensorPlacementRequest {
  /**
   * 用户画的 AOI 多边形 (GeoJSON 格式)
   */
  aoi: Feature<Polygon>

  /**
   * 可选参数
   */
  options?: {
    /**
     * 最多返回多少个传感器
     * 默认: 100
     */
    maxSensors?: number

    /**
     * 传感器之间的最小间距 (米)
     */
    minSpacing?: number

    /**
     * 放置策略: 'optimal' (最优), 'grid' (网格), 'random' (随机)
     */
    strategy?: 'optimal' | 'grid' | 'random' | 'clustered'
  }
}

/**
 * 后端返回的响应数据 (成功时)
 *
 * 包含传感器坐标列表
 */
export interface SensorPlacementResponse {
  /**
   * 传感器坐标数组
   * 可能为空 [] (如果没有找到合适的位置)
   */
  sensors: SensorPoint[]

  /**
   * AOI 的 ID (可选)
   */
  aoiId?: string

  /**
   * 额外信息 (可选)
   */
  metadata?: {
    algorithm?: string      // 使用的算法名称
    executionTimeMs?: number // 执行时间 (毫秒)
    coveragePercent?: number // AOI 覆盖率 (0-100)
  }
}

/**
 * 后端返回的错误响应
 *
 * 当 API 调用失败时返回
 */
export interface SensorPlacementError {
  /**
   * 错误消息 (给人看的)
   */
  error: string

  /**
   * 错误代码 (给程序判断的)
   */
  code?: 'INVALID_AOI' | 'AOI_TOO_LARGE' | 'AOI_TOO_SMALL' | 'ALGORITHM_FAILED' | 'INTERNAL_ERROR'

  /**
   * 详细错误信息 (用于调试)
   */
  details?: {
    field?: string    // 哪个字段出错了
    expected?: string // 期望的值
    received?: string // 实际收到的值
  }
}

/**
 * 类型守卫函数：判断响应是否是错误
 *
 * 用法:
 * if (isSensorPlacementError(response)) {
 *   console.error(response.error)
 * } else {
 *   console.log(response.sensors)
 * }
 */
export function isSensorPlacementError(
  response: SensorPlacementResponse | SensorPlacementError
): response is SensorPlacementError {
  return 'error' in response
}
