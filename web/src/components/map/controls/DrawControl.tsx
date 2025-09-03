// 在图中默认位于左上角的画图组件，可以画多边形和删除，画完后会把 AOI 存到全局状态（useAOIStore）里，其他组件可以用这个 AOI 做事
// 这里使用了 mapbox-gl-draw 库来实现绘图功能，并通过 react-map-gl 的 useControl 钩子集成到地图中
// 本项目把 AOI 功能拆成三个独立部分：
// 1. 画图（DrawControl.tsx）：负责用户交互 → 用户在地图上画/删多边形。
// 2. 生成（useAOIStore.ts）：负责状态管理 → 保存 AOI 数据，并在需要时生成缓冲区、面积、边界框。
// 3. 展示（AOIPreview.tsx + AOIPanel.tsx）：负责可视化 → AOIPreview 把 AOI 和缓冲区渲染到地图上；AOIPanel 在面板显示 AOI 的数值信息。

'use client'
import { useCallback } from 'react' // 让回调函数不会在每次渲染时重新生成（优化性能）
import { useControl } from 'react-map-gl/mapbox' // 把外部控件挂载到地图上
import MapboxDraw from '@mapbox/mapbox-gl-draw' // 画图的核心库
import type { Feature, Polygon } from 'geojson'  // 类型声明，告诉 TS AOI 是一个多边形的 GeoJSON 对象
import { useAOIStore } from '@/store/useAOIStore' // 全局状态，用来存画出来的 AOI

type Props = {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'  // 控件位置，后面可能会调整
}

export default function DrawControl({ position = 'top-left' }: Props) {
  const setAOI = useAOIStore(s => s.setAOI) // 生成组件，用来存 AOI结果，其他组件可以用

  // 画图事件回调，创建或更新时触发，储存 AOI
  const onCreateOrUpdate = useCallback((e: any) => { //当用户画了一个 AOI 或更新 AOI 时触发
    const f = e.features?.[0] // 取第一个多边形
    if (!f) return
    if (f.geometry?.type === 'Polygon') { // 如果它真的是 Polygon，就封装成 GeoJSON 格式 → 存到全局状态。
      const aoi: Feature<Polygon> = {
        type: 'Feature',
        geometry: f.geometry,
        properties: f.properties ?? {}
      }
      setAOI(aoi)
    }
  }, [setAOI])

  // 定义删除事件回调：当用户点垃圾桶时，把 AOI 清空
  const onDelete = useCallback(() => setAOI(null), [setAOI])

  // 用 useControl 把 MapboxDraw 控件挂到地图上
  const draw = useControl<MapboxDraw>(
    () => new MapboxDraw({
      displayControlsDefault: false, // 默认不显示所有控件，只要多边形和垃圾桶
      controls: { polygon: true, trash: true },
      keybindings: true // 支持快捷键
    }),
    ({ map }) => { // 挂载时绑定事件
      map.on('draw.create', onCreateOrUpdate)
      map.on('draw.update', onCreateOrUpdate)
      map.on('draw.delete', onDelete)
    },
    ({ map }) => { // 卸载时解绑事件， 防止内存泄漏
      map.off('draw.create', onCreateOrUpdate)
      map.off('draw.update', onCreateOrUpdate)
      map.off('draw.delete', onDelete)
    },
    { position } // 把控件放到指定位置
  )

  return null // 这个组件本身没有 UI，只是往地图上加了一个控件，想改样式可以直接在全局 CSS 里覆盖这些类名，或者自己在这里写样式
}
