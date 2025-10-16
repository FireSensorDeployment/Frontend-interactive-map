// 在图中默认位于左上角的画图组件，可以画多边形和删除，画完后会把 AOI 存到全局状态（useAOIStore）里，其他组件可以用这个 AOI 做事
// 这里使用了 mapbox-gl-draw 库来实现绘图功能，并通过 react-map-gl 的 useControl 钩子集成到地图中
// 本项目把 AOI 功能拆成三个独立部分：
// 1. 画图（DrawControl.tsx）：负责用户交互 → 用户在地图上画/删多边形。
// 2. 生成（useAOIStore.ts）：负责状态管理 → 保存 AOI 数据，并在需要时生成缓冲区、面积、边界框。
// 3. 展示（AOIPreview.tsx + AOIPanel.tsx）：负责可视化 → AOIPreview 把 AOI 和缓冲区渲染到地图上；AOIPanel 在面板显示 AOI 的数值信息。

'use client'
import { useControl } from 'react-map-gl/mapbox' // 把外部控件挂载到地图上
import MapboxDraw from '@mapbox/mapbox-gl-draw' // 画图的核心库
import type { Feature, Polygon } from 'geojson'  // 类型声明，告诉 TS AOI 是一个多边形的 GeoJSON 对象
import { useAOIStore } from '@/store/useAOIStore' // 全局状态，用来存画出来的 AOI
import { useSensorStore } from '@/store/useSensorStore' // 全局状态，用来存传感器数据

type Props = {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'  // 控件位置，后面可能会调整
}

export default function DrawControl({ position = 'top-left' }: Props) {
  const setAOI = useAOIStore(s => s.setAOI) // 生成组件，用来存 AOI结果，其他组件可以用
  const clearSensors = useSensorStore(s => s.clearSensors) // 获取清空传感器的方法

  // 用 useControl 把 MapboxDraw 控件挂到地图上
  useControl<MapboxDraw>(
    ({ map }) => {
      console.log("useControl: Creating MapboxDraw and setting up events")

      const draw = new MapboxDraw({
        displayControlsDefault: false, // 默认不显示所有控件，只要多边形和垃圾桶
        controls: { polygon: true, trash: true },
        keybindings: true // 支持快捷键
      })

      // 标记：避免重复清空
      let hasCleared = false

      // 画图事件回调，创建或更新时触发，储存 AOI
      const onCreateOrUpdate = (e: any) => {
        const f = e.features?.[0] // 取第一个多边形
        if (!f) return
        if (f.geometry?.type === 'Polygon') {
          const aoi: Feature<Polygon> = {
            type: 'Feature',
            geometry: f.geometry,
            properties: f.properties ?? {}
          }
          clearSensors() // 清空旧的传感器点（来自之前的 AOI）
          setAOI(aoi)
          // 绘制完成后，重置清空标记，允许下次绘制时再次清空
          hasCleared = false
        }
      }

      // 定义删除事件回调：当用户点垃圾桶时，把 AOI 清空
      const onDelete = () => {
        clearSensors() // 清空传感器点（因为 AOI 没了，传感器也应该消失）
        setAOI(null)
        hasCleared = false // 重置标记
      }

      // 定义模式变更回调：当用户点击多边形工具时，立即清空旧 AOI
      const onModeChange = (e: any) => {
        console.log("Mode changed:", e.mode) // 调试：查看所有模式变化

        if (e.mode === 'draw_polygon' && !hasCleared) {
          console.log("Detected draw_polygon mode (first time)")
          console.log("Entering draw mode - clearing previous AOI")

          // 立即清空旧的图形和状态
          const allFeatures = draw.getAll()
          console.log("Current features count:", allFeatures.features.length)

          if (allFeatures.features.length > 0) {
            draw.deleteAll()
            console.log("Deleted all features")

            // 重新进入绘制模式（因为 deleteAll 会退出绘制模式）
            draw.changeMode('draw_polygon')
            console.log("Re-entered draw_polygon mode")
          }

          clearSensors()
          setAOI(null)
          hasCleared = true // 标记已清空，避免重复
          console.log("Cleared sensors and AOI")
        }
      }

      // 绑定事件
      map.on('draw.create', onCreateOrUpdate)
      map.on('draw.update', onCreateOrUpdate)
      map.on('draw.delete', onDelete)
      map.on('draw.modechange', onModeChange)

      // 保存回调到 map 对象上，以便卸载时正确解绑
      // @ts-expect-error - 临时存储用于清理
      map._drawCallbacks = { onCreateOrUpdate, onDelete, onModeChange }

      console.log("useControl: Returning draw instance", draw)
      return draw
    },
    ({ map }) => { // 卸载时解绑事件， 防止内存泄漏
      console.log("useControl: Cleanup called")
      // @ts-expect-error - 获取之前保存的回调
      const callbacks = map._drawCallbacks

      if (callbacks) {
        map.off('draw.create', callbacks.onCreateOrUpdate)
        map.off('draw.update', callbacks.onCreateOrUpdate)
        map.off('draw.delete', callbacks.onDelete)
        map.off('draw.modechange', callbacks.onModeChange)
        // @ts-expect-error - 清理临时存储
        delete map._drawCallbacks
      }
    },
    { position } // 把控件放到指定位置
  )

  return null // 这个组件本身没有 UI，只是往地图上加了一个控件，想改样式可以直接在全局 CSS 里覆盖这些类名，或者自己在这里写样式
}
