import design from '../config/design.json'
import schema from '../config/design.schema.json'
import botanical from '../config/themes/botanical.json'
import ocean from '../config/themes/ocean.json'
import studio from '../config/themes/studio.json'

export type ThemePalette = {
  background: string
  foreground: string
  card: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  border: string
  input: string
  ring: string
  success: string
  warning: string
  destructive: string
  imageBackground: string
  overlayForeground: string
}

export type ThemeShadow = {
  x: number
  y: number
  blur: number
  spread: number
  opacity: number
  color: string
}

export type ThemeConfig = {
  $schema?: string
  version: 1
  name: string
  mode: 'light' | 'dark' | 'system'
  colors: { light: ThemePalette; dark: ThemePalette }
  typography: {
    headingFont: string
    bodyFont: string
    monoFont: string
    baseSize: number
    scale: number
    headingWeight: number
    bodyWeight: number
    strongWeight: number
    headingLineHeight: number
    bodyLineHeight: number
    headingLetterSpacing: number
    bodyLetterSpacing: number
  }
  radius: { card: number; button: number; input: number }
  shadows: { card: ThemeShadow; floating: ThemeShadow }
  layout: {
    contentWidth: number
    sectionSpacing: number
    gap: number
    density: number
  }
}

type SchemaNode = {
  $ref?: string
  type?: string
  enum?: readonly unknown[]
  properties?: Record<string, SchemaNode>
  required?: readonly string[]
  additionalProperties?: boolean
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
}

// Use the same rules as editor autocomplete, so the JSON schema and build cannot drift.
function check(value: unknown, node: SchemaNode, path: string): void {
  if (node.$ref) {
    const key = node.$ref.replace('#/$defs/', '')
    const definition = (schema.$defs as Record<string, SchemaNode>)[key]
    if (!definition) throw new Error(`Unknown design schema definition: ${key}`)
    check(value, definition, path)
    return
  }
  const fail = (message: string): never => {
    throw new Error(`Invalid design configuration: ${path} ${message}.`)
  }
  if (node.enum && !node.enum.includes(value))
    fail(`must be one of ${node.enum.join(', ')}`)
  if (node.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      fail('must be an object')
    const record = value as Record<string, unknown>
    const properties = node.properties ?? {}
    for (const key of node.required ?? []) {
      if (!Object.prototype.hasOwnProperty.call(record, key))
        fail(`is missing ${key}`)
    }
    for (const [key, item] of Object.entries(record)) {
      if (!Object.prototype.hasOwnProperty.call(properties, key)) {
        if (node.additionalProperties === false)
          fail(`contains unknown field ${key}`)
      } else {
        check(item, properties[key], `${path}.${key}`)
      }
    }
  } else if (node.type === 'string') {
    if (typeof value !== 'string') fail('must be a string')
    const text = value as string
    if (node.minLength !== undefined && text.length < node.minLength)
      fail('must not be empty')
    if (node.maxLength !== undefined && text.length > node.maxLength)
      fail(`must be at most ${node.maxLength} characters`)
    if (node.pattern && !new RegExp(node.pattern).test(text)) {
      fail(
        path.includes('Font')
          ? 'must be a comma-separated font stack using plain or quoted font names'
          : 'must be a six-digit hexadecimal color, for example #28513e',
      )
    }
  } else if (node.type === 'number' || node.type === 'integer') {
    if (typeof value !== 'number' || !Number.isFinite(value))
      fail('must be a finite number')
    const number = value as number
    if (node.type === 'integer' && !Number.isInteger(number))
      fail('must be an integer')
    if (node.minimum !== undefined && number < node.minimum)
      fail(`must be at least ${node.minimum}`)
    if (node.maximum !== undefined && number > node.maximum)
      fail(`must be at most ${node.maximum}`)
  }
}

/** Validate before rendering or importing. Unknown keys are rejected to catch spelling mistakes. */
export function validateTheme(input: unknown): ThemeConfig {
  check(input, schema, 'design')
  return structuredClone(input) as ThemeConfig
}

const kebab = (name: string) =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)

function paletteCss(palette: ThemePalette): string {
  return Object.entries(palette)
    .map(([key, value]) => `--color-${kebab(key)}:${value};`)
    .join('')
}

function shadowCss(shadow: ThemeShadow): string {
  const { x, y, blur, spread, color, opacity } = shadow
  return `${x}px ${y}px ${blur}px ${spread}px color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`
}

/** Values are allowlisted by the schema; arbitrary CSS, URLs and HTML cannot enter a style tag. */
export function themeCss(input: ThemeConfig, selector = ':root'): string {
  const config = validateTheme(input)
  if (!/^(?::root|[.#][a-zA-Z][a-zA-Z0-9_-]*)$/.test(selector)) {
    throw new Error(
      'Theme selector must be :root, a single .class or a single #id.',
    )
  }
  const { typography: type, radius, shadows, layout } = config
  const tokens: Record<string, string | number> = {
    '--font-heading': type.headingFont,
    '--font-body': type.bodyFont,
    '--font-mono': type.monoFont,
    '--font-base-size': `${type.baseSize}px`,
    '--type-scale': (type.baseSize / 15) * type.scale,
    '--font-heading-weight': type.headingWeight,
    '--font-body-weight': type.bodyWeight,
    '--font-strong-weight': type.strongWeight,
    '--heading-line-height': type.headingLineHeight,
    '--body-line-height': type.bodyLineHeight,
    '--heading-tracking': `${type.headingLetterSpacing}em`,
    '--body-tracking': `${type.bodyLetterSpacing}em`,
    '--radius-card': `${radius.card}px`,
    '--radius-button': `${radius.button}px`,
    '--radius-input': `${radius.input}px`,
    '--shadow-card': shadowCss(shadows.card),
    '--shadow-floating': shadowCss(shadows.floating),
    '--content-width': `${layout.contentWidth}px`,
    '--section-spacing': `${layout.sectionSpacing}px`,
    '--layout-gap': `${layout.gap}px`,
    '--density': layout.density,
    '--ink': 'var(--color-foreground)',
    '--forest': 'var(--color-primary)',
    '--muted': 'var(--color-muted-foreground)',
    '--paper': 'var(--color-background)',
    '--line': 'var(--color-border)',
    '--sage': 'var(--color-secondary)',
    '--white': 'var(--color-card)',
    '--serif': 'var(--font-heading)',
    '--sans': 'var(--font-body)',
  }
  const base = Object.entries(tokens)
    .map(([key, value]) => `${key}:${value};`)
    .join('')
  const mode = config.mode === 'dark' ? 'dark' : 'light'
  let css = `${selector}{color-scheme:${mode};${base}${paletteCss(config.colors[mode])}}`
  if (config.mode === 'system') {
    css += `@media(prefers-color-scheme:dark){${selector}{color-scheme:dark;${paletteCss(config.colors.dark)}}}`
  }
  return css
}

export const defaultTheme = validateTheme(design)

export const presets: { id: string; name: string; theme: ThemeConfig }[] = [
  {
    id: 'botanical',
    name: 'Botanical editorial',
    theme: validateTheme(botanical),
  },
  { id: 'ocean', name: 'Ocean minimal', theme: validateTheme(ocean) },
  { id: 'studio', name: 'Warm studio', theme: validateTheme(studio) },
]
