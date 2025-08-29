'use client';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from '@turf/turf';

export default function Page() {
  const mapDiv = useRef<HTMLDivElement | null>(null);
  const jsonRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    if (!mapDiv.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

    const bcBounds: mapboxgl.LngLatBoundsLike = [[-139.1, 48.2], [-114.05, 60.1]];

    const map = new mapboxgl.Map({
      container: mapDiv.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      projection: 'mercator',
      bounds: bcBounds,
    });

    map.once('load', () => {
      map.resize();

      // ===== 🔥 Fire Risk overlays (保持你原来的，示例只留 PSTA) =====
      const bcPstaExport =
        'https://delivery.maps.gov.bc.ca/arcgis/rest/services/whse/bcgw_pub_whse_land_and_natural_resource/MapServer/export'
        + '?f=image&format=png32&transparent=true'
        + '&bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256'
        + '&layers=show:17'; // 17 = BC Wildfire PSTA Fire Threat Rating
      map.addSource('risk-psta', {
        type: 'raster',
        tiles: [bcPstaExport],
        tileSize: 256,
        attribution: 'PSTA © Province of BC'
      } as mapboxgl.RasterSourceSpecification);
      map.addLayer({
        id: 'risk-psta',
        type: 'raster',
        source: 'risk-psta',
        paint: { 'raster-opacity': 0.3 }
      });
    });

    // 右上角的缩放/旋转控件
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // 左上角的绘制控件
    const Draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
    });
    map.addControl(Draw, 'top-left');

    // —— 打印/显示 AOI 的工具函数 ——
    const dumpAOI = (feature: any) => {
      // 保留 geometry / properties 即可（去掉 mapbox-draw 的内部字段也行）
      const aoi = {
        type: 'Feature',
        geometry: feature.geometry,
        properties: feature.properties ?? {}
      };

      // 1) 控制台打印 GeoJSON
      const text = JSON.stringify(aoi, null, 2);
      console.log('AOI GeoJSON:', text);

      // 2) 面积 & 边界框
      const area_m2 = turf.area(aoi);
      const bbox = turf.bbox(aoi); // [minX, minY, maxX, maxY] (lng,lat)
      console.log(`Area ≈ ${(area_m2/1e6).toFixed(2)} km²; BBOX: [${bbox.join(', ')}]`);

      // 3) 页面面板显示
      if (jsonRef.current) jsonRef.current.textContent = text;

      // 4) 方便调试：window.aoi 可在控制台直接用
      (window as any).aoi = aoi;
    };

    // —— 画完/更新时触发 —— 
    const onCreate = (e: any) => {
      const polygon = e.features[0];
      dumpAOI(polygon);

      // 你的缓冲预览（可留可删）
      const preview = turf.buffer(polygon, 0.3, { units: 'kilometers' });
      const prevSrc = map.getSource('preview') as mapboxgl.GeoJSONSource | undefined;
      if (prevSrc) prevSrc.setData(preview as any);
      else {
        map.addSource('preview', { type: 'geojson', data: preview as any });
        map.addLayer({ id: 'preview-fill', type: 'fill', source: 'preview',
          paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.12 } });
        map.addLayer({ id: 'preview-line', type: 'line', source: 'preview',
          paint: { 'line-color': '#3b82f6', 'line-width': 2 } });
      }
    };

    const onUpdate = (e: any) => {
      if (e.features && e.features[0]) dumpAOI(e.features[0]);
    };

    map.on('draw.create', onCreate);
    map.on('draw.update', onUpdate);

    return () => {
      map.off('draw.create', onCreate);
      map.off('draw.update', onUpdate);
      map.remove();
    };
  }, []);

  const handleCopy = () => {
    const txt = jsonRef.current?.textContent ?? '';
    if (!txt.trim()) return;
    navigator.clipboard?.writeText(txt).then(() => {
      // 轻提示（可换成 toast）
      console.log('AOI GeoJSON copied.');
    });
  };

  return (
    <main style={{ margin: 0, padding: 0 }}>
      <div ref={mapDiv} style={{ height: '100vh', width: '100vw' }} />

      {/* AOI GeoJSON 面板 */}
      <div
        style={{
          position: 'fixed',
          left: 12, bottom: 12, width: 420,
          background: 'rgba(255,255,255,0.9)',
          padding: 12, borderRadius: 8,
          boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          zIndex: 10
        }}
      >
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 6}}>
          <b>AOI (GeoJSON)</b>
          <button onClick={handleCopy} style={{padding:'4px 8px', border:'1px solid #ddd', borderRadius:6, cursor:'pointer'}}>
            Copy
          </button>
        </div>
        <pre ref={jsonRef} style={{maxHeight: 180, overflow:'auto', fontSize: 12, margin:0}}>
          （画一个多边形后会显示）
        </pre>
      </div>
    </main>
  );
}
