import test from 'node:test'
import assert from 'node:assert/strict'
import { presets, type ThemePalette } from '../src/lib/theme'

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

test('preset gallery has ten identifiable designs with distinct typography and geometry', () => {
  assert.equal(presets.length, 10)
  assert.equal(new Set(presets.map(({ id }) => id)).size, presets.length)
  assert.equal(new Set(presets.map(({ name }) => name)).size, presets.length)
  assert.equal(
    new Set(
      presets.map(({ theme }) =>
        JSON.stringify([
          theme.typography,
          theme.radius,
          theme.shadows,
          theme.layout,
        ]),
      ),
    ).size,
    presets.length,
  )
  for (const preset of presets) {
    assert.equal(preset.name, preset.theme.name)
    assert.ok(preset.description.length > 20)
    assert.ok(preset.tags.length > 0)
  }
  assert.equal(presets.find(({ id }) => id === 'midnight')?.theme.mode, 'dark')
})

test('every preset keeps semantic text and surface pairs readable in both modes', () => {
  const pairs: [keyof ThemePalette, keyof ThemePalette][] = [
    ['foreground', 'background'],
    ['foreground', 'card'],
    ['primaryForeground', 'primary'],
    ['secondaryForeground', 'secondary'],
    ['accentForeground', 'accent'],
    ['mutedForeground', 'background'],
    ['mutedForeground', 'card'],
    ['mutedForeground', 'muted'],
  ]
  for (const { id, theme } of presets) {
    for (const mode of ['light', 'dark'] as const) {
      for (const [foreground, background] of pairs) {
        const ratio = contrast(
          theme.colors[mode][foreground],
          theme.colors[mode][background],
        )
        assert.ok(
          ratio >= 4.5,
          `${id} ${mode}: ${foreground} on ${background} is ${ratio.toFixed(2)}:1; expected at least 4.5:1`,
        )
      }
    }
  }
})

test('Google Font presets request the families and weights their text uses', () => {
  const remotePresets = presets.filter(
    ({ theme }) => theme.typography.googleFonts?.length,
  )
  assert.equal(remotePresets.length, 7)
  for (const { id, theme } of remotePresets) {
    const type = theme.typography
    for (const [stack, weights] of [
      [type.headingFont, [type.headingWeight]],
      [type.bodyFont, [type.bodyWeight, type.strongWeight]],
    ] as const) {
      const family = stack.split(',')[0].replace(/['"]/g, '')
      const descriptor = type.googleFonts!.find(
        (font) => font.family === family,
      )
      assert.ok(descriptor, `${id}: ${family} must be requested`)
      for (const weight of weights) {
        assert.ok(
          descriptor.weights.includes(weight),
          `${id}: ${family} ${weight} must be loaded`,
        )
      }
    }
  }
})
