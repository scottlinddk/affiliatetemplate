import test from 'node:test'
import assert from 'node:assert/strict'
import {
  firstFontFamily,
  findGoogleFont,
  googleFontCatalog,
  googleFontStylesheets,
  type GoogleFont,
} from '../src/lib/google-fonts'
import { defaultTheme, themeCss, validateTheme } from '../src/lib/theme'

const withFonts = (googleFonts: unknown) => ({
  ...defaultTheme,
  typography: { ...defaultTheme.typography, googleFonts },
})

test('existing local themes and explicit empty font lists make no remote requests', () => {
  const local = structuredClone(defaultTheme)
  delete local.typography.googleFonts
  assert.deepEqual(validateTheme(local), local)
  assert.deepEqual(googleFontStylesheets(), [])
  assert.deepEqual(googleFontStylesheets([]), [])
  assert.deepEqual(validateTheme(withFonts([])).typography.googleFonts, [])
  assert.doesNotMatch(themeCss(local), /https:|@import|googleapis/)
})

test('CSS2 URLs sort and deduplicate weights without changing the theme', () => {
  const fonts: GoogleFont[] = [
    { family: 'DM Sans', weights: [700, 400, 600, 400] },
    { family: 'Lora', weights: [700, 400], italic: true },
  ]
  const original = structuredClone(fonts)
  assert.deepEqual(googleFontStylesheets(fonts), [
    'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400;1,700&display=swap',
  ])
  assert.deepEqual(fonts, original)
})

test('shared families retain custom variable weights alongside catalog styles', () => {
  const inter = findGoogleFont('Inter')!
  const weights = [...new Set([...inter.weights, 450])].sort((a, b) => a - b)
  const theme = validateTheme(
    withFonts([{ family: inter.family, weights, italic: inter.italic }]),
  )
  assert.deepEqual(
    theme.typography.googleFonts![0].weights,
    [100, 200, 300, 400, 450, 500, 600, 700, 800, 900],
  )
  const [href] = googleFontStylesheets(theme.typography.googleFonts)
  assert.match(href, /0,400;0,450;0,500/)
  assert.match(href, /1,400;1,450;1,500/)
})

test('custom Google families work without the curated catalog or a combined request', () => {
  const theme = validateTheme(
    withFonts([
      { family: 'Atkinson Hyperlegible', weights: [400, 700], italic: true },
      { family: 'Custom Family', weights: [450], italic: false },
    ]),
  )
  const links = googleFontStylesheets(theme.typography.googleFonts)
  assert.equal(links.length, 2)
  assert.ok(links[0].includes('Atkinson+Hyperlegible:ital,wght@'))
  assert.ok(links[1].includes('Custom+Family:wght@450'))
  for (const link of links) {
    const url = new URL(link)
    assert.equal(url.origin, 'https://fonts.googleapis.com')
    assert.equal(url.pathname, '/css2')
    assert.equal(url.searchParams.getAll('family').length, 1)
    assert.equal(url.searchParams.get('display'), 'swap')
  }
})

test('Google font descriptors survive JSON round trips and are cloned', () => {
  const input = withFonts([
    { family: 'Inter', weights: [400, 600, 700], italic: true },
  ])
  const theme = validateTheme(JSON.parse(JSON.stringify(input)))
  assert.deepEqual(theme, input)
  theme.typography.googleFonts![0].weights.push(900)
  assert.deepEqual(input.typography.googleFonts, [
    { family: 'Inter', weights: [400, 600, 700], italic: true },
  ])
})

test('digit-leading Google family names work in quoted CSS fallback stacks', () => {
  const theme = validateTheme({
    ...defaultTheme,
    typography: {
      ...defaultTheme.typography,
      headingFont: "'42dot Sans', Arial, sans-serif",
      googleFonts: [{ family: '42dot Sans', weights: [400, 700] }],
    },
  })
  assert.match(
    themeCss(theme),
    /--font-heading:'42dot Sans', Arial, sans-serif;/,
  )
  assert.deepEqual(googleFontStylesheets(theme.typography.googleFonts), [
    'https://fonts.googleapis.com/css2?family=42dot+Sans:wght@400;700&display=swap',
  ])
})

test('font descriptor schema rejects malformed arrays, types, weights and fields', () => {
  for (const value of [null, 'Inter', {}, 1, true]) {
    assert.throws(() => validateTheme(withFonts(value)), /must be an array/)
  }
  for (const value of [null, 'Inter', [], false]) {
    assert.throws(() => validateTheme(withFonts([value])), /must be an object/)
  }
  for (const weights of [null, '400', 400, {}]) {
    assert.throws(
      () => validateTheme(withFonts([{ family: 'Inter', weights }])),
      /weights must be an array/,
    )
  }
  for (const weights of [[], [400.5], [99], [901], ['400'], [Infinity]]) {
    assert.throws(() =>
      validateTheme(withFonts([{ family: 'Inter', weights }])),
    )
  }
  assert.throws(
    () =>
      validateTheme(
        withFonts([{ family: 'Inter', weights: Array(33).fill(400) }]),
      ),
    /at most 32/,
  )
  assert.throws(
    () =>
      validateTheme(
        withFonts(
          ['Inter', 'Lora', 'Outfit', 'Nunito'].map((family) => ({
            family,
            weights: [400],
          })),
        ),
      ),
    /at most 3/,
  )
  for (const italic of ['true', 1, null, []]) {
    assert.throws(
      () =>
        validateTheme(withFonts([{ family: 'Inter', weights: [400], italic }])),
      /italic must be a boolean/,
    )
  }
  assert.throws(
    () => validateTheme(withFonts([{ family: 'Inter' }])),
    /missing weights/,
  )
  assert.throws(
    () =>
      validateTheme(
        withFonts([
          { family: 'Inter', weights: [400], url: 'https://example.com' },
        ]),
      ),
    /unknown field url/,
  )
})

test('family names reject CSS, URLs, markup and case-insensitive duplicates', () => {
  for (const family of [
    '',
    ' Inter',
    'Inter ',
    'Inter  Tight',
    'A'.repeat(81),
    'https://example.com/font',
    'Inter&display=block',
    'Inter:ital@1',
    "Inter';color:red",
    '</style><script>alert(1)</script>',
  ]) {
    assert.throws(() => validateTheme(withFonts([{ family, weights: [400] }])))
  }
  assert.throws(
    () =>
      validateTheme(
        withFonts([
          { family: 'Inter', weights: [400] },
          { family: 'inter', weights: [700] },
        ]),
      ),
    /duplicate family inter/,
  )
})

test('every curated font provides valid fallback stacks and descriptors', () => {
  assert.ok(googleFontCatalog.length >= 16)
  assert.equal(
    new Set(googleFontCatalog.map((font) => font.family)).size,
    googleFontCatalog.length,
  )
  for (const { family, stack, weights, italic } of googleFontCatalog) {
    assert.equal(firstFontFamily(stack), family)
    assert.equal(findGoogleFont(family.toUpperCase())?.stack, stack)
    assert.match(stack, /, (?:sans-serif|serif|monospace)$/)
    assert.doesNotThrow(() =>
      validateTheme({
        ...defaultTheme,
        typography: {
          ...defaultTheme.typography,
          headingFont: stack,
          googleFonts: [{ family, weights, italic }],
        },
      }),
    )
  }
  assert.equal(firstFontFamily('Georgia, serif'), 'Georgia')
  assert.equal(firstFontFamily('"DM Sans", Arial, sans-serif'), 'DM Sans')
  assert.equal(findGoogleFont('Custom Family'), undefined)
})
