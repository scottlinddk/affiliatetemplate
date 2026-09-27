import test from 'node:test'
import assert from 'node:assert/strict'
import {
  defaultTheme,
  presets,
  validateTheme,
  type ThemeConfig,
  type ThemePalette,
} from '../src/lib/theme'
import { firstFontFamily, findGoogleFont } from '../src/lib/google-fonts'
import { randomizeTheme } from '../src/lib/theme-randomizer'

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

function luminance(hex: string): number {
  const channels = hex.match(/[a-f\d]{2}/gi)!.map((pair) => {
    const value = Number.parseInt(pair, 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrast(first: string, second: string): number {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

const textPairs: [keyof ThemePalette, keyof ThemePalette][] = [
  ['foreground', 'background'],
  ['foreground', 'card'],
  ['primaryForeground', 'primary'],
  ['secondaryForeground', 'secondary'],
  ['accentForeground', 'accent'],
  ...(['background', 'card', 'muted', 'secondary'] as const).map(
    (background): [keyof ThemePalette, keyof ThemePalette] => [
      'mutedForeground',
      background,
    ],
  ),
  ...(['success', 'warning', 'destructive'] as const).flatMap((foreground) =>
    (['background', 'card', 'secondary'] as const).map(
      (background): [keyof ThemePalette, keyof ThemePalette] => [
        foreground,
        background,
      ],
    ),
  ),
]

function assertReadable(theme: ThemeConfig, label: string): void {
  for (const mode of ['light', 'dark'] as const) {
    const palette = theme.colors[mode]
    for (const [foreground, background] of textPairs) {
      const ratio = contrast(palette[foreground], palette[background])
      assert.ok(
        ratio >= 4.5,
        `${label} ${mode}: ${foreground} on ${background} has contrast ${ratio.toFixed(3)}:1, expected at least 4.5:1`,
      )
    }
    for (const background of ['background', 'card'] as const) {
      const ratio = contrast(palette.ring, palette[background])
      assert.ok(
        ratio >= 3,
        `${label} ${mode}: focus ring on ${background} has contrast ${ratio.toFixed(3)}:1, expected at least 3:1`,
      )
    }
  }
}

function preservedSettings(theme: ThemeConfig) {
  const type = theme.typography
  return {
    $schema: theme.$schema,
    version: theme.version,
    mode: theme.mode,
    radius: theme.radius,
    shadows: theme.shadows,
    layout: theme.layout,
    typography: {
      baseSize: type.baseSize,
      scale: type.scale,
      headingLineHeight: type.headingLineHeight,
      bodyLineHeight: type.bodyLineHeight,
      headingLetterSpacing: type.headingLetterSpacing,
      bodyLetterSpacing: type.bodyLetterSpacing,
    },
  }
}

function assertFontMetadata(theme: ThemeConfig): void {
  const type = theme.typography
  const descriptors = type.googleFonts ?? []
  const roles = [
    [type.headingFont, [type.headingWeight]],
    [type.bodyFont, [type.bodyWeight, type.strongWeight]],
    [type.monoFont, []],
  ] as const
  const families = roles.map(([stack]) => firstFontFamily(stack))
  assert.ok(descriptors.length <= 3)
  assert.equal(
    new Set(descriptors.map(({ family }) => family.toLowerCase())).size,
    descriptors.length,
    'a family shared by multiple roles must be requested only once',
  )
  for (const descriptor of descriptors) {
    assert.ok(
      families.includes(descriptor.family),
      `${descriptor.family} is downloaded without being used`,
    )
    const catalog = findGoogleFont(descriptor.family)
    assert.ok(catalog, `${descriptor.family} must be a known supported font`)
    assert.ok(descriptor.weights.length > 0)
    for (const weight of descriptor.weights) {
      assert.ok(
        catalog.weights.includes(weight),
        `${descriptor.family} does not offer weight ${weight}`,
      )
    }
    assert.ok(!descriptor.italic || catalog.italic)
  }
  for (const [stack, weights] of roles) {
    assert.ok(stack.includes(','), 'every choice needs a fallback font')
    const family = firstFontFamily(stack)
    const catalog = findGoogleFont(family)
    const descriptor = descriptors.find((font) => font.family === family)
    if (!catalog) {
      assert.equal(descriptor, undefined)
      continue
    }
    assert.ok(descriptor, `${family} is selected but will not be downloaded`)
    for (const weight of weights) {
      assert.ok(
        descriptor.weights.includes(weight),
        `${family} weight ${weight} is used but not requested`,
      )
    }
  }
}

function assertNoSharedObjects(first: unknown, second: unknown): void {
  if (
    !first ||
    !second ||
    typeof first !== 'object' ||
    typeof second !== 'object'
  )
    return
  assert.notEqual(first, second, 'nested configuration objects must be cloned')
  for (const key of Object.keys(first)) {
    assertNoSharedObjects(
      (first as Record<string, unknown>)[key],
      (second as Record<string, unknown>)[key],
    )
  }
}

test('hundreds of random starting points remain valid, readable and independently styled', () => {
  const random = seededRandom(0x7359ab1)
  const palettes = new Set<string>()
  const headings = new Set<string>()
  const bodies = new Set<string>()
  const monos = new Set<string>()
  const presetPalettes = new Set(
    presets.map(({ theme }) => JSON.stringify(theme.colors)),
  )
  let localThemes = 0
  let remoteThemes = 0
  for (let sample = 0; sample < 512; sample++) {
    const source = presets[sample % presets.length].theme
    const generated = randomizeTheme(source, random)
    const label = `sample ${sample}`
    assert.deepEqual(validateTheme(generated), generated, label)
    assert.deepEqual(
      validateTheme(JSON.parse(JSON.stringify(generated))),
      generated,
      `${label} must survive JSON export and import`,
    )
    assert.deepEqual(preservedSettings(generated), preservedSettings(source))
    assertReadable(generated, label)
    assertFontMetadata(generated)
    const palette = JSON.stringify(generated.colors)
    assert.ok(
      !presetPalettes.has(palette),
      'randomize must generate new colors',
    )
    palettes.add(palette)
    headings.add(generated.typography.headingFont)
    bodies.add(generated.typography.bodyFont)
    monos.add(generated.typography.monoFont)
    if (generated.typography.googleFonts?.length) remoteThemes++
    else localThemes++
  }
  assert.ok(
    palettes.size >= 128,
    'colors should vary beyond the preset gallery',
  )
  assert.ok(headings.size >= 6, 'heading font choices should be varied')
  assert.ok(bodies.size >= 4, 'body font choices should be varied')
  assert.ok(monos.size >= 2, 'monospace font choices should be varied')
  assert.ok(localThemes > 0, 'randomization should include local-only fonts')
  assert.ok(remoteThemes > 0, 'randomization should include Google Fonts')
})

test('randomization preserves user layout and type metrics across every display mode', () => {
  const random = seededRandom(978521)
  for (const mode of ['light', 'dark', 'system'] as const) {
    const source = validateTheme({
      ...defaultTheme,
      mode,
      radius: { card: 31, button: 997, input: 17 },
      layout: {
        contentWidth: 1537,
        sectionSpacing: 91,
        gap: 37,
        density: 1.23,
      },
      typography: {
        ...defaultTheme.typography,
        baseSize: 19,
        scale: 1.12,
        headingWeight: 899,
        bodyWeight: 450,
        strongWeight: 501,
        headingLineHeight: 1.37,
        bodyLineHeight: 1.93,
        headingLetterSpacing: 0.027,
        bodyLetterSpacing: 0.043,
      },
    })
    for (let sample = 0; sample < 64; sample++) {
      const generated = randomizeTheme(source, random)
      assert.deepEqual(preservedSettings(generated), preservedSettings(source))
      assertFontMetadata(generated)
      if (!findGoogleFont(firstFontFamily(generated.typography.headingFont))) {
        assert.equal(
          generated.typography.headingWeight,
          source.typography.headingWeight,
        )
      }
      if (!findGoogleFont(firstFontFamily(generated.typography.bodyFont))) {
        assert.equal(
          generated.typography.bodyWeight,
          source.typography.bodyWeight,
        )
        assert.equal(
          generated.typography.strongWeight,
          source.typography.strongWeight,
        )
      }
    }
  }
})

test('the same supplied random sequence produces the same configuration', () => {
  assert.deepEqual(
    randomizeTheme(defaultTheme, seededRandom(54891)),
    randomizeTheme(defaultTheme, seededRandom(54891)),
  )
  assert.notDeepEqual(
    randomizeTheme(defaultTheme, seededRandom(54891)),
    randomizeTheme(defaultTheme, seededRandom(98240)),
  )
})

test('generated themes do not mutate or share nested objects with the source or each other', () => {
  const source = structuredClone(
    presets.find(({ id }) => id === 'midnight')!.theme,
  )
  const snapshot = structuredClone(source)
  const first = randomizeTheme(source, seededRandom(36))
  const second = randomizeTheme(source, seededRandom(36))
  assert.deepEqual(source, snapshot)
  assert.deepEqual(first, second)
  assertNoSharedObjects(first, source)
  assertNoSharedObjects(first, second)
  const secondSnapshot = structuredClone(second)
  first.layout.gap = 48
  first.radius.card = 48
  first.shadows.card.color = '#fedcba'
  first.colors.light.primary = '#abcdef'
  first.typography.bodyFont = 'Arial, sans-serif'
  if (first.typography.googleFonts?.length) {
    first.typography.googleFonts[0].weights.push(900)
  }
  assert.deepEqual(source, snapshot)
  assert.deepEqual(second, secondSnapshot)
})

test('valid random-number boundaries still produce readable, loadable themes', () => {
  for (const value of [0, 0.5, 1 - Number.EPSILON]) {
    const generated = randomizeTheme(defaultTheme, () => value)
    assert.deepEqual(validateTheme(generated), generated)
    assertReadable(generated, `random value ${value}`)
    assertFontMetadata(generated)
  }
})

test('repeated randomization supplies a fresh palette and font choice for every role', () => {
  for (const random of [
    seededRandom(32098),
    () => 0,
    () => 1 - Number.EPSILON,
  ]) {
    let previous = structuredClone(defaultTheme)
    for (let click = 0; click < 20; click++) {
      const generated = randomizeTheme(previous, random)
      for (const mode of ['light', 'dark'] as const) {
        assert.notDeepEqual(generated.colors[mode], previous.colors[mode])
        assert.notEqual(
          generated.colors[mode].primary,
          previous.colors[mode].primary,
        )
      }
      for (const role of ['headingFont', 'bodyFont', 'monoFont'] as const) {
        assert.notEqual(
          firstFontFamily(generated.typography[role]),
          firstFontFamily(previous.typography[role]),
          `${role} should change on each click`,
        )
      }
      previous = generated
    }
  }
})

test('the random source is optional for normal interactive use', () => {
  const generated = randomizeTheme(defaultTheme)
  assert.deepEqual(validateTheme(generated), generated)
  assertReadable(generated, 'default random source')
})
