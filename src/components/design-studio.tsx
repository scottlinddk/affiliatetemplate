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
import { ProductCard } from './product-card'
import { Icon } from './icons'

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
]

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
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {!fontOptions.some((font) => font.value === value) && (
          <option value={value}>Fra designfil · {value}</option>
        )}
        {fontOptions.map((font) => (
          <option value={font.value} key={font.value}>
            {font.label}
          </option>
        ))}
      </select>
    </label>
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
    key: keyof ThemeConfig['typography'],
    value: string | number,
  ) {
    apply({ ...theme, typography: { ...theme.typography, [key]: value } })
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
                              preset.theme.colors.light[
                                key as keyof ThemePalette
                              ],
                          }}
                        />
                      ),
                    )}
                  </span>
                  <span>{preset.name}</span>
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
              onChange={(value) => typography('headingFont', value)}
            />
            <FontSelect
              label="Skrifttype til brødtekst"
              value={theme.typography.bodyFont}
              onChange={(value) => typography('bodyFont', value)}
            />
            <p className="studio-hint">
              Lokale skrifter med fallback. Flere skriftnavne og vægte kan
              angives i JSON.
            </p>
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
            <Slider
              label="Overskrifters vægt"
              value={theme.typography.headingWeight}
              min={100}
              max={900}
              step={100}
              onChange={(value) => typography('headingWeight', value)}
            />
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
