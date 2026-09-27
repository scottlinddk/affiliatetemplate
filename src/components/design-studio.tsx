'use client'

import { useState } from 'react'
import {
  defaultTheme,
  presets,
  themeCss,
  validateTheme,
  type ThemeConfig,
  type ThemePalette,
} from '@/lib/theme'
import type { Product } from '@/lib/types'
import {
  firstFontFamily,
  googleFontCatalog,
  type GoogleFont,
} from '@/lib/google-fonts'
import { ProductCard } from './product-card'
import { Icon } from './icons'
import { ThemeFonts } from './theme-fonts'

type FontRole = 'headingFont' | 'bodyFont' | 'monoFont'

const fontOptions = [
  { label: 'Klassisk · Georgia', value: "Georgia, 'Times New Roman', serif" },
  {
    label: 'Boglig · Palatino',
    value: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
  },
  { label: 'Enkel · Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Moderne · System', value: "system-ui, 'Segoe UI', sans-serif" },
  { label: 'Blød · Trebuchet', value: "'Trebuchet MS', Arial, sans-serif" },
  { label: 'Tydelig · Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Kode · Courier', value: "'Courier New', monospace" },
]

function nearestWeight(value: number, weights: number[]) {
  return weights.reduce((best, weight) =>
    Math.abs(weight - value) < Math.abs(best - value) ? weight : best,
  )
}

const paletteLabels: Record<keyof ThemePalette, string> = {
  background: 'Sidebaggrund',
  foreground: 'Primær tekst',
  card: 'Kortbaggrund',
  primary: 'Primær farve',
  primaryForeground: 'Tekst på primær',
  secondary: 'Sekundær farve',
  secondaryForeground: 'Tekst på sekundær',
  muted: 'Dæmpet baggrund',
  mutedForeground: 'Dæmpet tekst',
  accent: 'Accentfarve',
  accentForeground: 'Tekst på accent',
  border: 'Kanter',
  input: 'Inputfelter',
  ring: 'Fokusmarkering',
  success: 'Positiv status',
  warning: 'Advarsel',
  destructive: 'Fejl',
  imageBackground: 'Billedbaggrund',
  overlayForeground: 'Tekst over billeder',
}

function serialize(theme: ThemeConfig) {
  return `${JSON.stringify({ ...theme, $schema: './design.schema.json' }, null, 2)}\n`
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="studio-slider">
      <span>
        {label}
        <output>
          {value}
          {unit}
        </output>
      </span>
      <input
        type="range"
        aria-label={label}
        min={Math.min(min, value)}
        max={Math.max(max, value)}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function FontSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="studio-field">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {!fontOptions.some((font) => font.value === value) &&
          !googleFontCatalog.some((font) => font.stack === value) && (
            <option value={value}>Valgt · {firstFontFamily(value)}</option>
          )}
        <optgroup label="Lokale skrifter">
          {fontOptions.map((font) => (
            <option value={font.value} key={font.value}>
              {font.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Google Fonts">
          {googleFontCatalog.map((font) => (
            <option value={font.stack} key={font.family}>
              Google · {font.family}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  )
}

function CustomGoogleFont({
  onApply,
}: {
  onApply: (role: FontRole, stack: string, font: GoogleFont) => void
}) {
  const [role, setRole] = useState<FontRole>('headingFont')
  const [family, setFamily] = useState('')
  const [fallback, setFallback] = useState('sans-serif')
  const [weights, setWeights] = useState('400, 700')
  const [italic, setItalic] = useState(false)
  const [error, setError] = useState('')

  return (
    <details className="studio-custom-font">
      <summary>Tilføj en anden Google Font</summary>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          try {
            const name = family.trim().replace(/\s+/g, ' ')
            if (
              name.length > 80 ||
              !/^[A-Za-z0-9]+(?:[ -][A-Za-z0-9]+)*$/.test(name)
            )
              throw new Error(
                'Angiv skriftnavnet fra Google Fonts med bogstaver, tal, mellemrum eller bindestreger.',
              )
            const selectedWeights = [
              ...new Set(
                weights.split(',').map((weight) => Number(weight.trim())),
              ),
            ].sort((a, b) => a - b)
            if (
              selectedWeights.length > 9 ||
              selectedWeights.some(
                (weight) =>
                  !Number.isInteger(weight) || weight < 100 || weight > 900,
              )
            )
              throw new Error(
                'Angiv vægte mellem 100 og 900 adskilt af kommaer, fx 400, 700.',
              )
            onApply(role, `'${name}', ${fallback}`, {
              family: name,
              weights: selectedWeights,
              italic,
            })
            setError('')
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : 'Skriften kunne ikke tilføjes.',
            )
          }
        }}
      >
        <label className="studio-field">
          <span>Brug Google Font til</span>
          <select
            aria-label="Brug Google Font til"
            value={role}
            onChange={(event) => setRole(event.target.value as FontRole)}
          >
            <option value="headingFont">Overskrifter</option>
            <option value="bodyFont">Brødtekst</option>
            <option value="monoFont">Kode og tal</option>
          </select>
        </label>
        <label className="studio-field">
          <span>Google Fonts familienavn</span>
          <input
            value={family}
            onChange={(event) => setFamily(event.target.value)}
            placeholder="Fx Roboto Slab"
            maxLength={80}
            required
          />
        </label>
        <label className="studio-field">
          <span>Reservefont</span>
          <select
            aria-label="Reservefont"
            value={fallback}
            onChange={(event) => setFallback(event.target.value)}
          >
            <option value="sans-serif">Sans-serif · enkel</option>
            <option value="serif">Serif · klassisk</option>
            <option value="monospace">Monospace · fast bredde</option>
          </select>
        </label>
        <label className="studio-field">
          <span>Google Fonts vægte</span>
          <input
            value={weights}
            onChange={(event) => setWeights(event.target.value)}
            placeholder="400, 700"
            required
          />
        </label>
        <label className="studio-pill">
          <input
            type="checkbox"
            checked={italic}
            onChange={(event) => setItalic(event.target.checked)}
          />
          Hent også kursiv
        </label>
        <p className="studio-hint">
          Brug det præcise navn og kun vægte og kursiv, som findes på{' '}
          <a href="https://fonts.google.com/" target="_blank" rel="noreferrer">
            Google Fonts
          </a>
          . Et ukendt navn eller en utilgængelig vægt viser reservefonten.
        </p>
        <button className="studio-button" type="submit">
          Anvend Google Font
        </button>
        {error && (
          <p className="studio-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </details>
  )
}

export function DesignStudio({ products }: { products: Product[] }) {
  const [theme, setTheme] = useState(defaultTheme)
  const [draft, setDraft] = useState(() => serialize(defaultTheme))
  const [selectedPreset, setSelectedPreset] = useState('current')
  const [palette, setPalette] = useState<'light' | 'dark'>(
    defaultTheme.mode === 'dark' ? 'dark' : 'light',
  )
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const headingGoogleFont = theme.typography.googleFonts?.find(
    (font) =>
      font.family.toLowerCase() ===
      firstFontFamily(theme.typography.headingFont).toLowerCase(),
  )

  function apply(next: ThemeConfig, preset = 'custom') {
    const valid = validateTheme(next)
    setTheme(valid)
    setDraft(serialize(valid))
    setSelectedPreset(preset)
    if (valid.mode !== 'system') setPalette(valid.mode)
    setError('')
    setNotice('')
  }

  function typography(
    key: Exclude<keyof ThemeConfig['typography'], 'googleFonts'>,
    value: string | number,
  ) {
    apply({ ...theme, typography: { ...theme.typography, [key]: value } })
  }

  function selectFont(role: FontRole, stack: string, custom?: GoogleFont) {
    const catalogFont = googleFontCatalog.find((font) => font.stack === stack)
    let chosen =
      custom ??
      (catalogFont && {
        family: catalogFont.family,
        weights: catalogFont.weights,
        italic: catalogFont.italic,
      })
    const nextTypography = { ...theme.typography, [role]: stack }
    const familiesIn = (fontStack: string) =>
      fontStack.split(',').map((family) =>
        family
          .trim()
          .replace(/^['"]|['"]$/g, '')
          .toLowerCase(),
      )
    const roles = ['headingFont', 'bodyFont', 'monoFont'] as const
    const usedFamilies = roles.flatMap((key) => familiesIn(nextTypography[key]))
    if (chosen) {
      const family = chosen.family.toLowerCase()
      const shared = roles.some(
        (key) =>
          key !== role && familiesIn(nextTypography[key]).includes(family),
      )
      const previous = nextTypography.googleFonts?.find(
        (font) => font.family.toLowerCase() === family,
      )
      if (shared && previous) {
        chosen = {
          ...chosen,
          weights: [...new Set([...previous.weights, ...chosen.weights])].sort(
            (a, b) => a - b,
          ),
          italic: Boolean(previous.italic || chosen.italic),
        }
      }
    }
    const fonts = (nextTypography.googleFonts ?? []).filter(
      (font) =>
        usedFamilies.includes(font.family.toLowerCase()) &&
        font.family.toLowerCase() !== chosen?.family.toLowerCase(),
    )
    if (chosen) {
      fonts.push(chosen)
      // Every displayed weight must exist in the selected Google family.
      if (role === 'headingFont')
        nextTypography.headingWeight = nearestWeight(
          nextTypography.headingWeight,
          chosen.weights,
        )
      if (role === 'bodyFont') {
        nextTypography.bodyWeight = nearestWeight(
          nextTypography.bodyWeight,
          chosen.weights,
        )
        nextTypography.strongWeight = nearestWeight(
          nextTypography.strongWeight,
          chosen.weights,
        )
      }
    }
    if (fonts.length) nextTypography.googleFonts = fonts
    else delete nextTypography.googleFonts
    try {
      apply({ ...theme, typography: nextTypography })
    } catch (cause) {
      // Custom forms show errors beside their inputs. Imported configurations
      // can also exceed limits when a menu choice adds a fourth fallback family.
      if (custom) throw cause
      setError(
        cause instanceof Error ? cause.message : 'Skriften kunne ikke vælges.',
      )
      setNotice('')
    }
  }

  function importJson(text: string) {
    try {
      apply(validateTheme(JSON.parse(text)))
      setNotice('Designet er indlæst i forhåndsvisningen.')
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Designfilen kunne ikke indlæses.',
      )
      setNotice('')
    }
  }

  async function importFile(file: File | undefined) {
    if (!file) return
    if (file.size > 100_000) {
      setError('Designfilen er for stor. Vælg en JSON-fil på højst 100 KB.')
      return
    }
    try {
      const text = await file.text()
      setDraft(text)
      importJson(text)
    } catch {
      setError(
        'Filen kunne ikke læses. Prøv at indsætte JSON-teksten nedenfor.',
      )
    }
  }

  function download() {
    const url = URL.createObjectURL(
      new Blob([serialize(theme)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'design.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice(
      'Designfilen er klar. Erstat src/config/design.json i dit projekt med den hentede fil.',
    )
  }

  return (
    <div className="design-studio">
      <ThemeFonts fonts={theme.typography.googleFonts} />
      <style>{themeCss(theme, '#design-preview')}</style>
      <header className="studio-heading">
        <div>
          <p className="studio-kicker">DIT BRAND. DIN STEMNING.</p>
          <h1>Gør skabelonen til din.</h1>
          <p>
            Vælg et udgangspunkt, leg med detaljerne, og hent din designfil.
          </p>
        </div>
        <button
          className="studio-button studio-button-primary"
          onClick={download}
        >
          Hent design.json <Icon name="arrow" size={17} />
        </button>
      </header>

      <div className="studio-layout">
        <aside className="studio-controls" aria-label="Designindstillinger">
          <div className="studio-control-intro">
            <h2>Dit design</h2>
            <p>
              Ændringer vises kun i forhåndsvisningen og gemmes ikke automatisk.
            </p>
          </div>

          <section
            className="studio-control-section"
            aria-labelledby="studio-presets"
          >
            <h3 id="studio-presets">01 / Vælg en stemning</h3>
            <p className="studio-preset-current">
              {presets.length} design ·{' '}
              {selectedPreset === 'custom' ? 'Tilpasset: ' : 'Aktuelt: '}
              {theme.name}
            </p>
            <div className="studio-presets">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  className="studio-preset"
                  aria-pressed={selectedPreset === preset.id}
                  onClick={() => apply(preset.theme, preset.id)}
                >
                  <span className="studio-preset-swatches" aria-hidden="true">
                    {['background', 'primary', 'secondary', 'accent'].map(
                      (key) => (
                        <span
                          key={key}
                          style={{
                            backgroundColor:
                              preset.theme.colors[
                                preset.theme.mode === 'dark' ? 'dark' : 'light'
                              ][key as keyof ThemePalette],
                          }}
                        />
                      ),
                    )}
                  </span>
                  <span className="studio-preset-text">
                    <strong>{preset.name}</strong>
                    <span>{preset.description}</span>
                  </span>
                  <span aria-hidden="true">
                    {selectedPreset === preset.id ? '✓' : '↗'}
                  </span>
                </button>
              ))}
            </div>
            <button
              className="studio-reset"
              onClick={() => apply(defaultTheme, 'current')}
            >
              Nulstil til sidens design
            </button>
            <fieldset className="studio-mode">
              <legend>Udseende</legend>
              <div>
                {(
                  [
                    ['light', 'Lyst'],
                    ['dark', 'Mørkt'],
                    ['system', 'System'],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="theme-mode"
                      value={value}
                      checked={theme.mode === value}
                      onChange={() => apply({ ...theme, mode: value })}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <details className="studio-control-section" open>
            <summary>02 / Farvepalet</summary>
            <label className="studio-field">
              <span>Rediger farver til</span>
              <select
                value={palette}
                onChange={(event) => {
                  const next = event.target.value as 'light' | 'dark'
                  setPalette(next)
                  apply({ ...theme, mode: next })
                }}
              >
                <option value="light">Lyst udseende</option>
                <option value="dark">Mørkt udseende</option>
              </select>
            </label>
            <p className="studio-hint">
              Begge paletter følger med filen. Skift udseende for at se
              resultatet.
            </p>
            <div className="studio-colors">
              {Object.entries(paletteLabels).map(([key, label]) => (
                <label className="studio-color" key={key}>
                  <input
                    type="color"
                    aria-label={`${label} (${palette === 'light' ? 'lys' : 'mørk'})`}
                    value={theme.colors[palette][key as keyof ThemePalette]}
                    onChange={(event) =>
                      apply({
                        ...theme,
                        colors: {
                          ...theme.colors,
                          [palette]: {
                            ...theme.colors[palette],
                            [key]: event.target.value,
                          },
                        },
                      })
                    }
                  />
                  <span>
                    {label}
                    <code>
                      {theme.colors[palette][key as keyof ThemePalette]}
                    </code>
                  </span>
                </label>
              ))}
            </div>
          </details>

          <details className="studio-control-section" open>
            <summary>03 / Typografi</summary>
            <FontSelect
              label="Skrifttype til overskrifter"
              value={theme.typography.headingFont}
              onChange={(value) => selectFont('headingFont', value)}
            />
            <FontSelect
              label="Skrifttype til brødtekst"
              value={theme.typography.bodyFont}
              onChange={(value) => selectFont('bodyFont', value)}
            />
            <FontSelect
              label="Skrifttype til kode og tal"
              value={theme.typography.monoFont}
              onChange={(value) => selectFont('monoFont', value)}
            />
            <p className="studio-hint">
              Kun valgte Google Fonts hentes fra Google i besøgendes browser.
              Lokale skrifter kræver ingen hentning. Reservefonte holder teksten
              læsbar, hvis en skrifttype ikke kan hentes.
            </p>
            <CustomGoogleFont onApply={selectFont} />
            <Slider
              label="Grundstørrelse"
              value={theme.typography.baseSize}
              min={12}
              max={22}
              unit=" px"
              onChange={(value) => typography('baseSize', value)}
            />
            <Slider
              label="Tekstskala"
              value={theme.typography.scale}
              min={0.8}
              max={1.25}
              step={0.05}
              unit="×"
              onChange={(value) => typography('scale', value)}
            />
            {headingGoogleFont ? (
              <label className="studio-field">
                <span>Overskrifters vægt</span>
                <select
                  aria-label="Overskrifters vægt"
                  value={theme.typography.headingWeight}
                  onChange={(event) =>
                    typography('headingWeight', Number(event.target.value))
                  }
                >
                  {[
                    ...new Set([
                      ...headingGoogleFont.weights,
                      theme.typography.headingWeight,
                    ]),
                  ]
                    .sort((a, b) => a - b)
                    .map((weight) => (
                      <option key={weight} value={weight}>
                        {weight}
                      </option>
                    ))}
                </select>
              </label>
            ) : (
              <Slider
                label="Overskrifters vægt"
                value={theme.typography.headingWeight}
                min={100}
                max={900}
                step={100}
                onChange={(value) => typography('headingWeight', value)}
              />
            )}
            <Slider
              label="Bogstavafstand i overskrifter"
              value={theme.typography.headingLetterSpacing}
              min={-0.08}
              max={0.08}
              step={0.01}
              unit=" em"
              onChange={(value) => typography('headingLetterSpacing', value)}
            />
            <Slider
              label="Linjeafstand i brødtekst"
              value={theme.typography.bodyLineHeight}
              min={1.25}
              max={2.2}
              step={0.05}
              unit="×"
              onChange={(value) => typography('bodyLineHeight', value)}
            />
          </details>

          <details className="studio-control-section">
            <summary>04 / Former & luft</summary>
            {(
              [
                ['card', 'Hjørner på kort'],
                ['button', 'Hjørner på knapper'],
                ['input', 'Hjørner på felter'],
              ] as const
            ).map(([key, label]) => (
              <Slider
                key={key}
                label={label}
                value={theme.radius[key]}
                min={0}
                max={48}
                unit=" px"
                onChange={(value) =>
                  apply({ ...theme, radius: { ...theme.radius, [key]: value } })
                }
              />
            ))}
            <label className="studio-pill">
              <input
                type="checkbox"
                checked={theme.radius.button >= 1000}
                onChange={(event) =>
                  apply({
                    ...theme,
                    radius: {
                      ...theme.radius,
                      button: event.target.checked ? 1000 : 4,
                    },
                  })
                }
              />
              Helt runde knapper
            </label>
            <Slider
              label="Indholdsbredde"
              value={theme.layout.contentWidth}
              min={960}
              max={1600}
              step={20}
              unit=" px"
              onChange={(value) =>
                apply({
                  ...theme,
                  layout: { ...theme.layout, contentWidth: value },
                })
              }
            />
            <Slider
              label="Afstand mellem sektioner"
              value={theme.layout.sectionSpacing}
              min={24}
              max={100}
              step={4}
              unit=" px"
              onChange={(value) =>
                apply({
                  ...theme,
                  layout: { ...theme.layout, sectionSpacing: value },
                })
              }
            />
            <Slider
              label="Afstand mellem kort"
              value={theme.layout.gap}
              min={8}
              max={40}
              step={2}
              unit=" px"
              onChange={(value) =>
                apply({ ...theme, layout: { ...theme.layout, gap: value } })
              }
            />
            <Slider
              label="Luft i komponenter"
              value={theme.layout.density}
              min={0.75}
              max={1.25}
              step={0.05}
              unit="×"
              onChange={(value) =>
                apply({ ...theme, layout: { ...theme.layout, density: value } })
              }
            />
            <p className="studio-hint">
              Indholdsbredde er en maksimumværdi. Den ses først, når der er nok
              plads på skærmen.
            </p>
          </details>

          <details className="studio-control-section">
            <summary>05 / Skygger</summary>
            <Slider
              label="Kortskyggens blødhed"
              value={theme.shadows.card.blur}
              min={0}
              max={60}
              unit=" px"
              onChange={(value) =>
                apply({
                  ...theme,
                  shadows: {
                    ...theme.shadows,
                    card: { ...theme.shadows.card, blur: value },
                  },
                })
              }
            />
            <Slider
              label="Kortskyggens styrke"
              value={theme.shadows.card.opacity}
              min={0}
              max={0.4}
              step={0.01}
              onChange={(value) =>
                apply({
                  ...theme,
                  shadows: {
                    ...theme.shadows,
                    card: { ...theme.shadows.card, opacity: value },
                  },
                })
              }
            />
            <p className="studio-hint">
              Retning, farve og skygger på flydende paneler kan også tilpasses i
              JSON.
            </p>
          </details>
        </aside>

        <div className="studio-workspace">
          <section
            className="studio-preview-shell"
            aria-labelledby="preview-title"
          >
            <div className="studio-preview-toolbar">
              <span id="preview-title">
                <span className="studio-live-dot" /> Forhåndsvisning
              </span>
              <span>{theme.name}</span>
            </div>
            <div
              id="design-preview"
              className="studio-preview"
              aria-label="Forhåndsvisning af tema"
            >
              <div className="studio-preview-content">
                <div className="studio-preview-brand">
                  <Icon name="leaf" size={22} />
                  <span>Hverdagsvalg</span>
                  <span className="studio-preview-tag">Dit næste udtryk</span>
                </div>
                <section className="studio-sample-hero">
                  <p className="eyebrow">MINDRE SØGEN. BEDRE VALG.</p>
                  <h2>
                    Små valg.
                    <br />
                    <em>Din egen stil.</em>
                  </h2>
                  <p>
                    Farver, former og typografi giver de samme produkter en helt
                    ny stemning. Find et udtryk, der passer til dit brand.
                  </p>
                  <div className="studio-sample-buttons">
                    <a className="button" href="#preview-products">
                      Gå på opdagelse <Icon name="arrow" size={16} />
                    </a>
                    <a
                      className="button button-secondary"
                      href="#preview-details"
                    >
                      Se detaljerne
                    </a>
                  </div>
                </section>
                <section
                  id="preview-products"
                  className="studio-preview-products"
                >
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">TIL LIVET, DU LEVER</p>
                      <h2>Udvalgte favoritter</h2>
                    </div>
                  </div>
                  <div className="product-grid">
                    {products.map((product) => (
                      <ProductCard product={product} key={product.id} />
                    ))}
                  </div>
                </section>
                <section
                  className="studio-sample-details"
                  id="preview-details"
                  aria-labelledby="studio-detail-title"
                >
                  <div>
                    <p className="eyebrow">HELT NED I DETALJEN</p>
                    <h2 id="studio-detail-title">Et sammenhængende udtryk</h2>
                    <p>
                      Prøv også felter, kanter, sekundære farver og
                      statusfarver.
                    </p>
                  </div>
                  <label className="studio-sample-input">
                    Søg i dit univers
                    <input type="search" placeholder="Find din næste favorit" />
                  </label>
                  <div className="studio-sample-statuses">
                    <span className="studio-status-success">På lager</span>
                    <span className="studio-status-warning">Få tilbage</span>
                    <span className="studio-status-error">Udsolgt</span>
                  </div>
                  <p className="studio-sample-code">
                    <code>Varenr. HV-0248</code>
                  </p>
                </section>
              </div>
            </div>
          </section>

          <section className="studio-json" aria-labelledby="studio-json-title">
            <div className="studio-json-heading">
              <div>
                <p className="studio-kicker">GEM, GENBRUG, GØR DET TIL DIT</p>
                <h2 id="studio-json-title">Én fil. Et helt design.</h2>
              </div>
              <span className="studio-file-label">design.json</span>
            </div>
            <p>
              Hent filen, og erstat <code>src/config/design.json</code> i dit
              projekt. Byg og udgiv siden igen for at bruge designet på hele
              sitet.
            </p>
            <details className="studio-json-editor">
              <summary>Rediger eller importér JSON</summary>
              <p>
                Indsæt en komplet designfil. Tryk på Anvend JSON for at validere
                og se ændringerne.
              </p>
              <label className="studio-field">
                Importér designfil
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(event) => {
                    void importFile(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
              </label>
              <label className="studio-field" htmlFor="studio-json-source">
                Design som JSON
              </label>
              <textarea
                id="studio-json-source"
                value={draft}
                spellCheck={false}
                onChange={(event) => {
                  setDraft(event.target.value)
                  setError('')
                  setNotice('')
                }}
              />
              <div className="studio-json-actions">
                <button
                  className="studio-button"
                  onClick={() => importJson(draft)}
                >
                  Anvend JSON
                </button>
                <span>
                  {draft !== serialize(theme)
                    ? 'Teksten er ikke anvendt endnu.'
                    : 'Teksten matcher forhåndsvisningen.'}
                </span>
              </div>
            </details>
            {error && (
              <p className="studio-error" role="alert">
                Designet kunne ikke anvendes. {error} Det senest gyldige design
                vises stadig.
              </p>
            )}
            <p className="studio-notice" role="status">
              {notice}
            </p>
            <button
              className="studio-button studio-button-primary"
              onClick={download}
            >
              Hent design.json <Icon name="arrow" size={17} />
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
