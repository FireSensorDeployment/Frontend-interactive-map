'use client'
import { create } from 'zustand'
import type { Feature, Polygon } from 'geojson'

type AOIState = {
  aoi: Feature<Polygon> | null
  setAOI: (f: Feature<Polygon> | null) => void
}

export const useAOIStore = create<AOIState>((set) => ({
  aoi: null,
  setAOI: (f) => set({ aoi: f })
}))
