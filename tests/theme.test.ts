import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  defaultTheme,
  presets,
  themeCss,
  validateTheme,
} from '../src/lib/theme'

test('the design guide and every preset validate and serialize without mutating input', () => {
  for (const theme of [
    defaultTheme,
    ...presets.map((preset) => preset.theme),
  ]) {
    const snapshot = JSON.stringify(theme)
    const validated = validateTheme(JSON.parse(snapshot))
    assert.deepEqual(validated, theme)
    assert.notEqual(validated, theme)
    const css = themeCss(validated)
    assert.ok(css.startsWith(':root{'))
    const mode = theme.mode === 'dark' ? 'dark' : 'light'
    assert.ok(css.includes(`--color-primary:${theme.colors[mode].primary};`))
    assert.ok(css.includes(`--radius-button:${theme.radius.button}px;`))
    assert.equal(JSON.stringify(theme), snapshot)
  }
})

test('light, dark and system modes produce the intended palette and scoped media query', () => {
  const light = themeCss({ ...defaultTheme, mode: 'light' }, '#preview')
  assert.ok(light.startsWith('#preview{color-scheme:light;'))
  assert.ok(!light.includes('@media'))
  const dark = themeCss({ ...defaultTheme, mode: 'dark' })
  assert.ok(
    dark.includes(`--color-background:${defaultTheme.colors.dark.background};`),
  )
  assert.ok(!dark.includes(defaultTheme.colors.light.background))
  const system = themeCss({ ...defaultTheme, mode: 'system' }, '.preview')
  assert.ok(system.includes(defaultTheme.colors.light.background))
  assert.ok(
    system.includes(
      '@media(prefers-color-scheme:dark){.preview{color-scheme:dark;',
    ),
  )
  assert.ok(system.includes(defaultTheme.colors.dark.background))
})

test('validation gives readable paths for missing, misspelled and out-of-range settings', () => {
  assert.throws(() => validateTheme({}), /design is missing version/)
  assert.throws(
    () => validateTheme({ ...defaultTheme, colour: {} }),
    /unknown field colour/,
  )
  assert.throws(
    () => validateTheme({ ...defaultTheme, mode: 'auto' }),
    /design.mode must be one of light, dark, system/,
  )
  assert.throws(
    () =>
      validateTheme({
        ...defaultTheme,
        radius: { ...defaultTheme.radius, card: -1 },
      }),
    /design.radius.card must be at least 0/,
  )
  assert.throws(
    () =>
      validateTheme({
        ...defaultTheme,
        typography: { ...defaultTheme.typography, scale: Number.NaN },
      }),
    /design.typography.scale must be a finite number/,
  )
  assert.throws(
    () =>
      validateTheme({
        ...defaultTheme,
        layout: { ...defaultTheme.layout, density: '1' },
      }),
    /design.layout.density must be a finite number/,
  )
  assert.throws(
    () =>
      validateTheme({
        ...defaultTheme,
        typography: { ...defaultTheme.typography, bodyWeight: 450.5 },
      }),
    /design.typography.bodyWeight must be an integer/,
  )
})

test('CSS and HTML injection cannot escape validated theme values or selectors', () => {
  assert.ok(
    themeCss({
      ...defaultTheme,
      typography: {
        ...defaultTheme.typography,
        bodyFont: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      },
    }).includes(
      "--font-body:system-ui, -apple-system, 'Segoe UI', sans-serif;",
    ),
  )
  for (const payload of [
    'red;}</style><script>alert(1)</script>',
    'url(https://example.com)',
    '#ffffff;--other:red',
  ]) {
    assert.throws(
      () =>
        themeCss({
          ...defaultTheme,
          colors: {
            ...defaultTheme.colors,
            light: { ...defaultTheme.colors.light, primary: payload },
          },
        }),
      /six-digit hexadecimal/,
    )
    assert.throws(
      () =>
        themeCss({
          ...defaultTheme,
          typography: { ...defaultTheme.typography, headingFont: payload },
        }),
      /font stack/,
    )
  }
  for (const payload of [
    'body{}script',
    ':root,body',
    '#id</style>',
    '@import url(x)',
  ]) {
    assert.throws(() => themeCss(defaultTheme, payload), /Theme selector/)
  }
  assert.throws(
    () =>
      themeCss({
        ...defaultTheme,
        typography: { ...defaultTheme.typography, bodyFont: "'Arial, serif" },
      }),
    /font stack/,
  )
})

test('all storefront color and typography variables are supplied by the design guide', () => {
  const css = readFileSync(
    new URL('../src/app/globals.css', import.meta.url),
    'utf8',
  )
  const generated = themeCss(defaultTheme)
  for (const variable of css.matchAll(/var\((--[a-z-]+)\)/g)) {
    assert.ok(
      generated.includes(`${variable[1]}:`),
      `Missing ${variable[1]} in generated theme`,
    )
  }
  assert.doesNotMatch(
    css,
    /#[a-fA-F0-9]{3,8}\b|(?:background|color):\s*(?:white|black)\b/,
  )
})
