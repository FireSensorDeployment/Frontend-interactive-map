import * as turf from '@turf/turf'
import type { Feature, Polygon } from 'geojson'

export const calcAreaKm2 = (f: Feature<Polygon>) => Number((turf.area(f) / 1e6).toFixed(2))
export const calcBBox = (f: Feature) => turf.bbox(f) as [number, number, number, number]
