import { create } from 'zustand'
import type { Feature, Polygon } from 'geojson'
import { calcAreaKm2, calcBBox } from '@/lib/geo'

type AOIState = {
  aoi: Feature<Polygon> | null
  bbox: [number, number, number, number] | null
  areaKm2: number | null
  setAOI: (f: Feature<Polygon> | null) => void
}

export const useAOIStore = create<AOIState>((set) => ({
  aoi: null,
  bbox: null,
  areaKm2: null,
  setAOI: (f) => set({
    aoi: f,
    bbox: f ? calcBBox(f) : null,
    areaKm2: f ? calcAreaKm2(f) : null,
  }),
}))
