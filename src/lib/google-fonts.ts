/** Optional remote fonts. Local fallback stacks keep the site usable offline. */
export type GoogleFont = {
  family: string
  weights: number[]
  italic?: boolean
}

export type GoogleFontOption = GoogleFont & {
  stack: string
  italic: boolean
}

const sans = 'Arial, Helvetica, sans-serif'
const serif = "Georgia, 'Times New Roman', serif"
const mono = "'Courier New', monospace"

/** Available weights and italic styles for the curated Google Fonts menu. */
export const googleFontCatalog: GoogleFontOption[] = [
  {
    family: 'Inter',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    italic: true,
    stack: `'Inter', ${sans}`,
  },
  {
    family: 'DM Sans',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    italic: true,
    stack: `'DM Sans', ${sans}`,
  },
  {
    family: 'Space Grotesk',
    weights: [300, 400, 500, 600, 700],
    italic: false,
    stack: `'Space Grotesk', ${sans}`,
  },
  {
    family: 'Outfit',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    italic: false,
    stack: `'Outfit', ${sans}`,
  },
  {
    family: 'Nunito',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    italic: true,
    stack: `'Nunito', ${sans}`,
  },
  {
    family: 'IBM Plex Sans',
    weights: [100, 200, 300, 400, 500, 600, 700],
    italic: true,
    stack: `'IBM Plex Sans', ${sans}`,
  },
  {
    family: 'Source Sans 3',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    italic: true,
    stack: `'Source Sans 3', ${sans}`,
  },
  {
    family: 'Manrope',
    weights: [200, 300, 400, 500, 600, 700, 800],
    italic: false,
    stack: `'Manrope', ${sans}`,
  },
  {
    family: 'Work Sans',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    italic: true,
    stack: `'Work Sans', ${sans}`,
  },
  {
    family: 'Cormorant Garamond',
    weights: [300, 400, 500, 600, 700],
    italic: true,
    stack: `'Cormorant Garamond', ${serif}`,
  },
  {
    family: 'Lora',
    weights: [400, 500, 600, 700],
    italic: true,
    stack: `'Lora', ${serif}`,
  },
  {
    family: 'Fraunces',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    italic: true,
    stack: `'Fraunces', ${serif}`,
  },
  {
    family: 'Playfair Display',
    weights: [400, 500, 600, 700, 800, 900],
    italic: true,
    stack: `'Playfair Display', ${serif}`,
  },
  {
    family: 'Merriweather',
    weights: [300, 400, 500, 600, 700, 800, 900],
    italic: true,
    stack: `'Merriweather', ${serif}`,
  },
  {
    family: 'Roboto Slab',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    italic: false,
    stack: `'Roboto Slab', ${serif}`,
  },
  {
    family: 'Space Mono',
    weights: [400, 700],
    italic: true,
    stack: `'Space Mono', ${mono}`,
  },
]

/** Font stacks are validated by the design schema before reaching the studio. */
export function firstFontFamily(stack: string): string {
  return stack
    .split(',')[0]
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2')
}

export function findGoogleFont(family: string): GoogleFontOption | undefined {
  return googleFontCatalog.find(
    (font) => font.family.toLowerCase() === family.toLowerCase(),
  )
}

/**
 * One request per family isolates unavailable custom families from working fonts.
 * Runtime CSS supports imported themes without an API key or network at build time.
 * https://developers.google.com/fonts/docs/css2
 */
export function googleFontStylesheets(
  fonts: readonly GoogleFont[] = [],
): string[] {
  return fonts.map(({ family, weights, italic }) => {
    const sortedWeights = [...new Set(weights)].sort((a, b) => a - b)
    const styles = italic
      ? `ital,wght@${[0, 1].flatMap((style) => sortedWeights.map((weight) => `${style},${weight}`)).join(';')}`
      : `wght@${sortedWeights.join(';')}`
    const name = encodeURIComponent(family).replace(/%20/g, '+')
    return `https://fonts.googleapis.com/css2?family=${name}:${styles}&display=swap`
  })
}
