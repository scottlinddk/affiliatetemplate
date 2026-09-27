import design from '../config/design.json'
import schema from '../config/design.schema.json'
import atelier from '../config/themes/atelier.json'
import botanical from '../config/themes/botanical.json'
import cherry from '../config/themes/cherry.json'
import fieldNotes from '../config/themes/field-notes.json'
import lavender from '../config/themes/lavender.json'
import midnight from '../config/themes/midnight.json'
import nordic from '../config/themes/nordic.json'
import ocean from '../config/themes/ocean.json'
import studio from '../config/themes/studio.json'
import terracotta from '../config/themes/terracotta.json'
import type { GoogleFont } from './google-fonts'

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
    googleFonts?: GoogleFont[]
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
  items?: SchemaNode
  minItems?: number
  maxItems?: number
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
  } else if (node.type === 'array') {
    if (!Array.isArray(value)) fail('must be an array')
    const items = value as unknown[]
    if (node.minItems !== undefined && items.length < node.minItems)
      fail(`must contain at least ${node.minItems} item(s)`)
    if (node.maxItems !== undefined && items.length > node.maxItems)
      fail(`must contain at most ${node.maxItems} item(s)`)
    if (node.items) {
      items.forEach((item, index) =>
        check(item, node.items!, `${path}[${index}]`),
      )
    }
  } else if (node.type === 'boolean') {
    if (typeof value !== 'boolean') fail('must be a boolean')
  } else if (node.type === 'string') {
    if (typeof value !== 'string') fail('must be a string')
    const text = value as string
    if (node.minLength !== undefined && text.length < node.minLength)
      fail('must not be empty')
    if (node.maxLength !== undefined && text.length > node.maxLength)
      fail(`must be at most ${node.maxLength} characters`)
    if (node.pattern && !new RegExp(node.pattern).test(text)) {
      fail(
        path.endsWith('.family')
          ? 'must be a font family name containing letters, digits, spaces or hyphens'
          : path.endsWith('Font')
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
  const config = structuredClone(input) as ThemeConfig
  const families = new Set<string>()
  for (const font of config.typography.googleFonts ?? []) {
    const family = font.family.toLowerCase()
    if (families.has(family)) {
      throw new Error(
        `Invalid design configuration: design.typography.googleFonts contains duplicate family ${font.family}.`,
      )
    }
    families.add(family)
  }
  return config
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

export const presets: {
  id: string
  name: string
  description: string
  tags: string[]
  theme: ThemeConfig
}[] = [
  {
    id: 'botanical',
    name: 'Botanical editorial',
    description:
      'Grønne nuancer, klassiske serifoverskrifter og diskrete hjørner.',
    tags: ['Naturlig', 'Redaktionel', 'Lokale fonte'],
    theme: validateTheme(botanical),
  },
  {
    id: 'ocean',
    name: 'Ocean minimal',
    description: 'Klare blå toner, kompakte mellemrum og enkel sans-serif.',
    tags: ['Minimal', 'Kølig', 'Lokale fonte'],
    theme: validateTheme(ocean),
  },
  {
    id: 'studio',
    name: 'Warm studio',
    description: 'Ferskentoner, bløde kort og indbydende pilleformede knapper.',
    tags: ['Varm', 'Afrundet', 'Lokale fonte'],
    theme: validateTheme(studio),
  },
  {
    id: 'midnight',
    name: 'Midnight tech',
    description:
      'Elektrisk cyan på dyb marineblå med geometrisk skrift og tæt layout.',
    tags: ['Mørk', 'Teknologi', 'Google Fonts'],
    theme: validateTheme(midnight),
  },
  {
    id: 'atelier',
    name: 'Atelier luxe',
    description:
      'Creme og antikt guld, elegant serif og luft omkring skarpe kanter.',
    tags: ['Luksus', 'Serif', 'Google Fonts'],
    theme: validateTheme(atelier),
  },
  {
    id: 'cherry',
    name: 'Cherry pop',
    description:
      'Livlig pink, legende rund skrift og markante, forskudte skygger.',
    tags: ['Legende', 'Markant', 'Google Fonts'],
    theme: validateTheme(cherry),
  },
  {
    id: 'nordic',
    name: 'Nordic mono',
    description:
      'Rolig monokrom, monospaceoverskrifter og præcise, kompakte mellemrum.',
    tags: ['Minimal', 'Monospace', 'Google Fonts'],
    theme: validateTheme(nordic),
  },
  {
    id: 'terracotta',
    name: 'Terracotta journal',
    description:
      'Ler og pergament, litterære serifoverskrifter og behagelig læseafstand.',
    tags: ['Varm', 'Redaktionel', 'Google Fonts'],
    theme: validateTheme(terracotta),
  },
  {
    id: 'lavender',
    name: 'Lavender cloud',
    description:
      'Blød violet, luftige mellemrum, pilleknapper og diffuse farvede skygger.',
    tags: ['Blød', 'Afrundet', 'Google Fonts'],
    theme: validateTheme(lavender),
  },
  {
    id: 'field-notes',
    name: 'Field notes',
    description:
      'Oliven og havre, udtryksfuld serif og solide kort med taktile skygger.',
    tags: ['Friluftsliv', 'Jordfarver', 'Google Fonts'],
    theme: validateTheme(fieldNotes),
  },
]
