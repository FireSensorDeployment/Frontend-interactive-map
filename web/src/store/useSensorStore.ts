/**
 * 传感器状态管理 (Zustand Store)
 *
 * 这个 store 管理所有传感器相关的状态：
 * - 传感器列表
 * - 加载状态
 * - 错误信息
 *
 * 类似于现有的 useAOIStore，遵循相同的模式
 */

'use client'

import { create } from 'zustand'
import type { SensorPoint } from '@/types/sensor'

/**
 * 传感器状态的数据结构
 */
type SensorState = {
  // ========== 数据 ==========
  /**
   * 当前显示的传感器列表
   * 空数组 [] 表示没有传感器
   */
  sensors: SensorPoint[]

  /**
   * 是否正在从后端获取传感器数据
   * true = 正在加载中（显示加载动画）
   * false = 已完成加载
   */
  isLoading: boolean

  /**
   * 错误信息
   * null = 没有错误
   * string = 错误消息（例如："网络连接失败"）
   */
  error: string | null

  // ========== 操作方法 ==========
  /**
   * 设置传感器列表
   *
   * @param sensors - 新的传感器数组
   *
   * @example
   * const { setSensors } = useSensorStore()
   * setSensors([
   *   { id: "s1", lat: 49.28, lng: -123.12 },
   *   { id: "s2", lat: 49.29, lng: -123.11 }
   * ])
   */
  setSensors: (sensors: SensorPoint[]) => void

  /**
   * 清空所有传感器
   *
   * @example
   * const { clearSensors } = useSensorStore()
   * clearSensors()  // 地图上的传感器点都会消失
   */
  clearSensors: () => void

  /**
   * 设置加载状态
   *
   * @param loading - 是否正在加载
   *
   * @example
   * const { setLoading } = useSensorStore()
   * setLoading(true)   // 开始加载 → 显示加载动画
   * // ... 调用 API ...
   * setLoading(false)  // 加载完成 → 隐藏加载动画
   */
  setLoading: (loading: boolean) => void

  /**
   * 设置错误信息
   *
   * @param error - 错误消息，null 表示清除错误
   *
   * @example
   * const { setError } = useSensorStore()
   * setError("网络连接失败") // 显示错误提示
   * setError(null)           // 清除错误
   */
  setError: (error: string | null) => void
}

/**
 * 传感器状态管理 Hook
 *
 * 这是一个全局 store，任何组件都可以访问
 *
 * @example
 * // 在任何组件中使用
 * function MyComponent() {
 *   const sensors = useSensorStore(s => s.sensors)
 *   const isLoading = useSensorStore(s => s.isLoading)
 *   const setSensors = useSensorStore(s => s.setSensors)
 *
 *   return (
 *     <div>
 *       {isLoading && <p>加载中...</p>}
 *       <p>传感器数量: {sensors.length}</p>
 *     </div>
 *   )
 * }
 */
export const useSensorStore = create<SensorState>((set) => ({
  // ========== 初始状态 ==========
  sensors: [],          // 一开始没有传感器
  isLoading: false,     // 一开始不在加载
  error: null,          // 一开始没有错误

  // ========== 操作方法的实现 ==========
  setSensors: (sensors) =>
    set({
      sensors,        // 更新传感器列表
      error: null     // 清除之前的错误（如果有）
    }),

  clearSensors: () =>
    set({
      sensors: [],    // 清空传感器列表
      error: null     // 同时清除错误
    }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({
      error,
      isLoading: false  // 出错时停止加载状态
    })
}))
