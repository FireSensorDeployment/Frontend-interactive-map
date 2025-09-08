README – Interactive Map Demo
1. 项目简介

这是一个基于 Next.js (App Router) 和 react-map-gl 的交互式地图 Demo。
主要功能：

显示 Mapbox 地图（卫星 + 街道样式）

用户可以在地图上画多边形（AOI, Area of Interest）

自动计算 AOI 的面积和边界框，并显示在右下角面板

在 AOI 范围内加载不同的火险图层（CWFIS 全加拿大火险指数，BC PSTA 火险威胁评级）

2. 项目结构
地图核心

MapRoot.tsx

包装好的地图容器。

内部用 <Map> 来加载 Mapbox 地图。

放置基础控件（右上角的缩放/旋转）。

接受 children → 你可以往里面加各种工具和图层。

AOI (Area of Interest) 相关

DrawControl.tsx

在地图左上角放一个“画多边形/删除”工具。

用户画完或更新 AOI 时，会存到全局状态（Zustand store）。

AOIPreview.tsx

在地图上渲染 AOI 的蓝色填充和边框（一个视觉预览）。

AOIPanel.tsx

页面右下角显示 AOI 的数据：GeoJSON 文本、BBOX、面积。

提供“Copy”按钮，可以复制 AOI 数据。

火险图层

CwfisFireRisk.tsx

使用 CWFIS（加拿大国家火险信息系统）的 WMS 服务。

显示 全加拿大火险等级（栅格图层）。

FireRisk.tsx

更复杂的版本：结合 CWFIS + BC 省 PSTA 数据。

PSTA 数据是矢量的，需要手动拉取 + 渲染。

当前代码里 CWFIS 部分注释掉了，主要演示 PSTA 图层。

PstaFireRisk.tsx

使用 DataBC 的 WMS 服务。

可以根据用户画的 AOI 生成带 CQL_FILTER 的 WMS URL → 只显示 AOI 相交部分。

如果 AOI 太大（面积超过设定阈值），就不加载，避免拖垮性能。

3. 怎么运行

安装依赖：

npm install


配置 Mapbox token：
在项目根目录创建 .env.local：

NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=你的_mapbox_token


启动开发服务器：

npm run dev


打开 http://localhost:3000

4. 使用说明

打开页面，你会看到一张卫星地图。

左上角有画图工具：

点击多边形按钮 → 在地图上点点点 → 双击结束。

点击垃圾桶按钮 → 删除 AOI。

画好 AOI 后：

AOI 会被蓝色覆盖。

右下角会显示 AOI 的数据（面积、边界框、GeoJSON）。

火险图层（CWFIS/PSTA）：

会根据 AOI 范围加载数据。

如果 AOI 太大，PSTA 图层会自动关闭。

5. 整体流程

* 页面加载

MapRoot.tsx 把一个 Mapbox 地图渲染在屏幕上。

地图底图样式是卫星+街道。

* 用户交互

用户在地图左上角用 DrawControl.tsx 画一个多边形（AOI = Area of Interest）。

画完后，这个 AOI 会存到 全局状态管理器（Zustand store）。

* AOI 可视化

AOIPreview.tsx 会读取这个 AOI，把它显示成蓝色半透明区域。

AOIPanel.tsx 会在右下角显示 AOI 的 GeoJSON、面积、边界框。

* 火险数据加载

CwfisFireRisk.tsx：加载 全国火险指数（FWI） WMS 图层。

PstaFireRisk.tsx：加载 BC 省火险威胁评级（PSTA） WMS 图层，并且支持 CQL_FILTER → 只显示 AOI 覆盖的部分。