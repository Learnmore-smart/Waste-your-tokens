/**
 * 与 GuiltTracker / 计算页等效影响卡片共用的底纹与主色，保证燃烧页与计算器观感一致。
 */
export type ImpactCardVisual = {
  labelKey: string
  suffixKey: string
  detailKey: string
  gradient: string
  blob: string
  blobPosition: string
  numberColor: string
  /** 用于光斑强弱的参考尺（同 GuiltTracker getIntensity） */
  intensityRef: number
}

export const IMPACT_CARD_VISUALS: readonly ImpactCardVisual[] = [
  {
    labelKey: 'impact.carbonFootprint.label',
    suffixKey: 'impact.carbonFootprint.suffix',
    detailKey: 'impact.carbonFootprint.detail',
    gradient:
      'radial-gradient(ellipse at 100% 100%, rgba(100,85,70,0.5) 0%, rgba(100,85,70,0.15) 35%, transparent 65%)',
    blob: 'rgba(120,100,80,0.25)',
    blobPosition: '-bottom-8 -right-8',
    numberColor: '#7A6B5D',
    intensityRef: 500,
  },
  {
    labelKey: 'impact.drivingKm.label',
    suffixKey: 'impact.drivingKm.suffix',
    detailKey: 'impact.drivingKm.detail',
    gradient: 'linear-gradient(to top, rgba(55,50,45,0.4) 0%, rgba(55,50,45,0.1) 40%, transparent 70%)',
    blob: 'rgba(80,75,70,0.2)',
    blobPosition: '-bottom-6 left-1/2 -translate-x-1/2',
    numberColor: '#5E5854',
    intensityRef: 8,
  },
  {
    labelKey: 'impact.treesToOffset.label',
    suffixKey: 'impact.treesToOffset.suffix',
    detailKey: 'impact.treesToOffset.detail',
    gradient: 'linear-gradient(135deg, rgba(34,139,34,0.22) 0%, rgba(34,139,34,0.06) 45%, transparent 75%)',
    blob: 'rgba(34,139,34,0.18)',
    blobPosition: '-top-6 -left-6',
    numberColor: '#2D8A56',
    intensityRef: 0.05,
  },
  {
    labelKey: 'impact.smartphonesCharged.label',
    suffixKey: 'impact.smartphonesCharged.suffix',
    detailKey: 'impact.smartphonesCharged.detail',
    gradient:
      'radial-gradient(ellipse at 0% 100%, rgba(0,188,188,0.25) 0%, rgba(0,188,188,0.06) 40%, transparent 70%)',
    blob: 'rgba(0,188,188,0.2)',
    blobPosition: '-bottom-6 -left-6',
    numberColor: '#0E8A8A',
    intensityRef: 60,
  },
  {
    labelKey: 'impact.googleSearches.label',
    suffixKey: 'impact.googleSearches.suffix',
    detailKey: 'impact.googleSearches.detail',
    gradient: 'linear-gradient(to left, rgba(210,150,30,0.22) 0%, rgba(210,150,30,0.05) 45%, transparent 75%)',
    blob: 'rgba(210,150,30,0.18)',
    blobPosition: 'top-1/2 -right-6 -translate-y-1/2',
    numberColor: '#9A6B0C',
    intensityRef: 2500,
  },
  {
    labelKey: 'impact.streamingHours.label',
    suffixKey: 'impact.streamingHours.suffix',
    detailKey: 'impact.streamingHours.detail',
    gradient:
      'radial-gradient(ellipse at 50% 50%, rgba(90,90,210,0.22) 0%, rgba(90,90,210,0.05) 45%, transparent 75%)',
    blob: 'rgba(90,90,210,0.18)',
    blobPosition: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    numberColor: '#5050C8',
    intensityRef: 15,
  },
] as const

export function impactIntensity(value: number, ref: number): number {
  if (ref <= 0) return 0
  return Math.min(1, value / ref)
}
