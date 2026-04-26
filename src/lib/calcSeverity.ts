/** 与计算器 / 主内容辐射一致的分级上界（与 `ImpactCalculator` 逻辑同步） */
export const CALC_MAX_TOKENS = 10_000_000_000

const TIER_MAX: readonly number[] = [
  0,
  10_000,
  100_000,
  1_000_000,
  10_000_000,
  100_000_000,
  1_000_000_000,
  10_000_000_000,
  Infinity,
] as const

export const CALC_SEVERITY_KEYS = [
  'calc.severity.none',
  'calc.severity.minimal',
  'calc.severity.low',
  'calc.severity.moderate',
  'calc.severity.elevated',
  'calc.severity.high',
  'calc.severity.severe',
  'calc.severity.extreme',
  'calc.severity.extreme', // 与上一档同文案，&gt;10B
] as const

/**
 * 连续档位 0‥8+：便于插值主内容辐射色；0 = 无 / 最淡绿，8 = 最高档品红紫。
 */
export function getCalcTierFloat(totalTokens: number): number {
  if (totalTokens <= 0) return 0
  for (let k = 1; k < TIER_MAX.length; k++) {
    if (totalTokens <= TIER_MAX[k]!) {
      const prev = TIER_MAX[k - 1]!
      const cap = TIER_MAX[k] === Infinity ? Math.max(CALC_MAX_TOKENS * 1.2, totalTokens) : TIER_MAX[k]!
      const span = cap - prev
      const f = span > 0 ? (totalTokens - prev) / span : 0
      return Math.min(8, k - 1 + f)
    }
  }
  return 8
}

export function getCalcSeverityKey(
  totalTokens: number
): (typeof CALC_SEVERITY_KEYS)[number] {
  for (let i = 0; i < TIER_MAX.length; i++) {
    if (totalTokens <= TIER_MAX[i]!) {
      return CALC_SEVERITY_KEYS[i]!
    }
  }
  return 'calc.severity.extreme'
}

/** 与 `getCalcSeverityKey` 相同，便于使用短名或兼容旧 import。 */
export { getCalcSeverityKey as getSeverity }

type Rgb = readonly [number, number, number]

function lerp(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0]! + (b[0]! - a[0]!) * t),
    Math.round(a[1]! + (b[1]! - a[1]!) * t),
    Math.round(a[2]! + (b[2]! - a[2]!) * t),
  ] as const
}

function rgb([r, g, b]: Rgb, alpha: number) {
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`
}

/** 9 个档的基调（上光 / 下暖光 / 侧向点缀）— 自淡青绿一路到紫红 */
const TIER_RADIANT: readonly { c: Rgb; b: Rgb; s: Rgb }[] = [
  { c: [240, 248, 244], b: [235, 242, 238], s: [220, 235, 228] },
  { c: [220, 245, 232], b: [210, 236, 220], s: [190, 228, 205] },
  { c: [200, 238, 210], b: [185, 225, 195], s: [160, 215, 175] },
  { c: [245, 240, 200], b: [240, 220, 160], s: [230, 200, 120] },
  { c: [255, 230, 190], b: [255, 200, 140], s: [255, 180, 100] },
  { c: [255, 210, 175], b: [255, 160, 120], s: [240, 130, 90] },
  { c: [255, 195, 185], b: [240, 140, 130], s: [220, 100, 95] },
  { c: [235, 200, 230], b: [210, 160, 200], s: [180, 120, 175] },
  { c: [210, 185, 235], b: [175, 140, 210], s: [140, 100, 185] },
]

/** 与 `CalculatorMainRadiant` / `buildMainRadiantBackground` 同步的弹簧，便于卡片点缀同色跟手 */
export const CALC_RADIANT_SPRING = { stiffness: 34, damping: 28, mass: 0.55 } as const

function sampleTierRadiantRgb(tierFloat: number): { c: Rgb; btm: Rgb; s: Rgb } {
  const t = Math.max(0, Math.min(8, tierFloat))
  const i0 = Math.min(7, Math.floor(t))
  const i1 = Math.min(8, i0 + 1)
  const u = t - i0
  const a = TIER_RADIANT[i0]!
  const b = TIER_RADIANT[i1]!
  return {
    c: lerp(a.c, b.c, u),
    btm: lerp(a.b, b.b, u),
    s: lerp(a.s, b.s, u),
  }
}

/**
 * 主背景右侧光斑（`95% 55%` 那层）的 RGB，用于计算器卡片右上角小辐射，保证与 `main` 同色。
 */
export function tierSideAccentRgba(tierFloat: number, alpha: number): string {
  const { s, btm } = sampleTierRadiantRgb(tierFloat)
  return rgb(lerp(s, btm, 0.3), alpha)
}

/**
 * 由 tierFloat 插值，生成与 `CalculatorMainRadiant` 一致的多层背景串。
 */
export function buildMainRadiantBackground(tierFloat: number): string {
  const { c, btm, s } = sampleTierRadiantRgb(tierFloat)
  return [
    `radial-gradient(ellipse 100% 75% at 50% 0%, ${rgb(c, 0.5)}, ${rgb(lerp(c, btm, 0.5), 0.22)} 40%, transparent 65%)`,
    `radial-gradient(ellipse 120% 90% at 50% 110%, ${rgb(btm, 0.45)}, ${rgb(lerp(btm, s, 0.4), 0.15)} 50%, transparent 70%)`,
    `radial-gradient(ellipse 55% 50% at 5% 45%, ${rgb(lerp(s, c, 0.3), 0.2)}, transparent 60%)`,
    `radial-gradient(ellipse 55% 50% at 95% 55%, ${rgb(lerp(s, btm, 0.3), 0.18)}, transparent 60%)`,
    `radial-gradient(ellipse 45% 40% at 50% 35%, ${rgb(lerp(c, s, 0.2), 0.08)}, transparent 72%)`,
  ].join(', ')
}
