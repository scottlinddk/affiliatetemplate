import {
  firstFontFamily,
  googleFontCatalog,
  type GoogleFont,
} from './google-fonts'
import { validateTheme, type ThemeConfig, type ThemePalette } from './theme'

type FontChoice = { stack: string; google?: GoogleFont }
const localSans: FontChoice[] = [
  { stack: 'Arial, Helvetica, sans-serif' },
  { stack: "system-ui, 'Segoe UI', sans-serif" },
  { stack: "'Trebuchet MS', Arial, sans-serif" },
  { stack: 'Verdana, Geneva, sans-serif' },
]
const localSerif: FontChoice[] = [
  { stack: "Georgia, 'Times New Roman', serif" },
  { stack: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
]
const remoteFonts: FontChoice[] = googleFontCatalog.map(
  ({ stack, ...google }) => ({ stack, google }),
)
const headingFonts = [...localSerif, ...localSans, ...remoteFonts]
const bodyFonts = [
  ...localSans,
  ...remoteFonts.filter(({ stack }) => stack.endsWith('sans-serif')),
]
const monoFonts = [
  { stack: "'Courier New', monospace" },
  { stack: "Consolas, 'Liberation Mono', monospace" },
  ...remoteFonts.filter(({ stack }) => stack.endsWith('monospace')),
]

function hex(hue: number, saturation: number, lightness: number): string {
  const h = (((hue % 360) + 360) % 360) / 60
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = c * (1 - Math.abs((h % 2) - 1))
  const channels =
    h < 1
      ? [c, x, 0]
      : h < 2
        ? [x, c, 0]
        : h < 3
          ? [0, c, x]
          : h < 4
            ? [0, x, c]
            : h < 5
              ? [x, 0, c]
              : [c, 0, x]
  const m = lightness - c / 2
  return `#${channels
    .map((value) =>
      Math.round((value + m) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

function luminance(color: string): number {
  const [r, g, b] = [1, 3, 5].map((offset) => {
    const value = parseInt(color.slice(offset, offset + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return r * 0.2126 + g * 0.7152 + b * 0.0722
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

// Adjust the actual rounded hex color, not HSL lightness alone. The margin
// exceeds the 4.5:1 text threshold on every surface where this token is used.
function readable(
  hue: number,
  saturation: number,
  start: number,
  surfaces: string[],
  dark: boolean,
): string {
  for (let step = 0; step <= 100; step++) {
    const lightness = Math.max(
      0,
      Math.min(1, start + (dark ? step : -step) / 100),
    )
    const color = hex(hue, saturation, lightness)
    if (surfaces.every((surface) => contrast(color, surface) >= 4.6))
      return color
  }
  return dark ? '#ffffff' : '#000000'
}

function palette(
  hue: number,
  accentHue: number,
  saturation: number,
  tint: number,
  dark: boolean,
): ThemePalette {
  const background = hex(hue, tint, dark ? 0.075 : 0.975)
  const card = hex(hue, tint * 0.7, dark ? 0.115 : 0.995)
  const secondary = hex(accentHue, tint, dark ? 0.18 : 0.91)
  const muted = hex(hue, tint * 0.6, dark ? 0.145 : 0.94)
  const surfaces = [background, card, secondary, muted]
  const text = (h: number, s: number, lightness: number) =>
    readable(h, s, lightness, surfaces, dark)
  const primary = text(hue, saturation, dark ? 0.7 : 0.42)
  const accent = text(accentHue, saturation * 0.85, dark ? 0.74 : 0.4)
  const onColor = (color: string) =>
    contrast('#ffffff', color) >= 4.6 ? '#ffffff' : '#111111'
  return {
    background,
    foreground: text(hue, tint * 0.8, dark ? 0.93 : 0.13),
    card,
    primary,
    primaryForeground: onColor(primary),
    secondary,
    secondaryForeground: text(accentHue, tint, dark ? 0.87 : 0.22),
    muted,
    mutedForeground: text(hue, tint * 0.4, dark ? 0.72 : 0.4),
    accent,
    accentForeground: onColor(accent),
    border: hex(hue, tint * 0.65, dark ? 0.29 : 0.81),
    input: hex(hue, tint * 0.5, dark ? 0.4 : 0.65),
    ring: accent,
    success: text(135, 0.48, dark ? 0.7 : 0.33),
    warning: text(38, 0.8, dark ? 0.7 : 0.34),
    destructive: text(5, 0.62, dark ? 0.74 : 0.42),
    imageBackground: hex(hue, tint, dark ? 0.2 : 0.89),
    overlayForeground: hex(hue, tint, 0.98),
  }
}

/** Generate on interaction only; an injectable RNG makes the safeguards testable. */
export function randomizeTheme(
  current: ThemeConfig,
  random: () => number = Math.random,
): ThemeConfig {
  const next = validateTheme(current)
  const pick = <T>(values: T[]): T =>
    values[Math.min(values.length - 1, Math.floor(random() * values.length))]
  const family = (stack: string) => firstFontFamily(stack).toLowerCase()
  const chooseFont = (options: FontChoice[], excluded: string[]) =>
    pick(options.filter(({ stack }) => !excluded.includes(family(stack))))

  let hue = Math.floor(random() * 360)
  const accentOffset = pick([30, -30, 150, 180, 210])
  const saturation = 0.35 + random() * 0.4
  const tint = 0.08 + random() * 0.22
  let light = palette(hue, hue + accentOffset, saturation, tint, false)
  if (light.primary === current.colors.light.primary) {
    hue = (hue + 137) % 360
    light = palette(hue, hue + accentOffset, saturation, tint, false)
  }
  next.colors = {
    light,
    dark: palette(hue, hue + accentOffset, saturation, tint, true),
  }
  next.name = `Tilfældigt design ${light.primary.slice(1).toUpperCase()}`

  const heading = chooseFont(headingFonts, [
    family(current.typography.headingFont),
  ])
  const body = chooseFont(bodyFonts, [
    family(current.typography.bodyFont),
    family(heading.stack),
  ])
  const mono = chooseFont(monoFonts, [family(current.typography.monoFont)])
  const type = next.typography
  type.headingFont = heading.stack
  type.bodyFont = body.stack
  type.monoFont = mono.stack
  const nearestWeight = (value: number, font: FontChoice) =>
    font.google
      ? font.google.weights.reduce((best, weight) =>
          Math.abs(weight - value) < Math.abs(best - value) ? weight : best,
        )
      : value
  type.headingWeight = nearestWeight(type.headingWeight, heading)
  type.bodyWeight = nearestWeight(type.bodyWeight, body)
  type.strongWeight = nearestWeight(type.strongWeight, body)
  const fonts = [heading, body, mono].flatMap((font) =>
    font.google ? [font.google] : [],
  )
  const unique = new Map(fonts.map((font) => [font.family, font]))
  if (unique.size) type.googleFonts = structuredClone([...unique.values()])
  else delete type.googleFonts
  return validateTheme(next)
}
