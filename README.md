# Frontend-interactive-map

web/
├─ app/
│  ├─ page.tsx                      # 入口：渲染 <MapShell />
│  └─ api/
│     ├─ sensors/
│     │  └─ plan/route.ts           # FE-06: mock 方案接口 (POST AOI → FC<Point>)
│     └─ feedback/route.ts          # FE-09: 反馈埋点 mock
│
├─ src/
│  ├─ components/map/
│  │  ├─ MapShell.tsx               # 地图外壳/容器（加载 Mapbox、注入子图层/控件）
│  │  ├─ controls/
│  │  │  ├─ Navigation.tsx          # navigationControl / 其他 Map 控件
│  │  │  └─ PlanActions.tsx         # 生成方案按钮、替换/叠加开关（FE-08）
│  │  ├─ aoi/
│  │  │  ├─ DrawAOI.tsx             # FE-04: 集成 mapbox-gl-draw；只保留最新 AOI
│  │  │  └─ AOIMetaPanel.tsx        # FE-05: 展示 bbox/顶点数/面积(先 mock)
│  │  ├─ layers/
│  │  │  ├─ PointsLayer.tsx         # FE-07: 非聚合点图层
│  │  │  ├─ ClustersLayer.tsx       # FE-07: 聚合层/文本层/点击放大
│  │  │  └─ PinRadiusRing.tsx       # FE-11: 固定像素半径外圈(视觉指示)
│  │  ├─ popups/
│  │  │  └─ PointPopup.tsx          # FE-07: 气泡 id / radius_m
│  │  └─ modes/
│  │     └─ DropPinMode.tsx         # FE-10: 放置/拖拽 Pin（可选一期）
│  │
│  ├─ hooks/
│  │  ├─ useMapInstance.ts          # 仅客户端创建 map 实例，处理 SSR
│  │  ├─ useClusters.ts             # 监听缩放/范围，驱动聚合
│  │  └─ useKeyboardShortcuts.ts    # (可选) 删除/撤销等快捷键
│  │
│  ├─ store/                        # Zustand（推荐）或 Jotai（都行）
│  │  ├─ useAOIStore.ts             # AOI GeoJSON、bbox、面积、选中态
│  │  ├─ usePlanStore.ts            # 当前方案点集、方案列表、替换/叠加逻辑
│  │  └─ useUIStore.ts              # 右侧面板开合、loading/toast 等
│  │
│  ├─ services/
│  │  ├─ apiClient.ts               # fetch 封装（重试/错误处理）
│  │  ├─ planService.ts             # POST /api/sensors/plan（FE-08/06）
│  │  └─ feedbackService.ts         # POST /api/feedback（FE-09）
│  │
│  ├─ lib/
│  │  ├─ geo.ts                     # turf 辅助、bbox/面积计算、FC 工具
│  │  └─ mapStyles.ts               # 统一样式（点层、文本、圈层 paint/layout）
│  │
│  └─ types/
│     └─ geojson.ts                 # Feature/FeatureCollection/Point 类型定义
│
└─ styles/globals.css
