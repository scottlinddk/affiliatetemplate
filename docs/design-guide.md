# Design guide

The storefront reads **`src/config/design.json`** at build time. This is the design guide for pages, navigation, product cards, comparison tables, forms, consent panels and editorial content. The social preview image uses the configured palette too.

## Start with a preset

Open [the design playground](https://scottlinddk.github.io/affiliatetemplate/design/) or `/design` locally. Choose a preset, adjust its settings and download `design.json`. Replace `src/config/design.json` with that file. Run `npm run check` and `npm run generate` to validate and build it.

The playground changes its preview only. It does not save to your repository or change other visitors' sites. JSON import supports the full configuration, including values without a dedicated visual control. Invalid imports leave the previous preview intact.

Ten starting points are included in `src/config/themes/`:

| Preset                  | Character                                                  | Fonts                        |
| ----------------------- | ---------------------------------------------------------- | ---------------------------- |
| **Botanical editorial** | Warm paper, forest green and restrained corners            | Georgia / Arial (local)      |
| **Ocean minimal**       | Cool neutrals, blue accents and crisp shapes               | System sans (local)          |
| **Warm studio**         | Warm colors, bold typography and graphic details           | System fonts (local)         |
| **Midnight tech**       | Dark surfaces, bright accents and a compact technical feel | Space Grotesk / Inter        |
| **Atelier luxe**        | Cream and gold, expressive serif headings and sharp edges  | Cormorant Garamond / DM Sans |
| **Cherry pop**          | Pink, playful typography and rounded shapes                | Outfit / Nunito              |
| **Nordic mono**         | Neutral colors, precise typography and minimal decoration  | Space Mono / IBM Plex Sans   |
| **Terracotta journal**  | Warm earth tones and an editorial rhythm                   | Lora / Source Sans 3         |
| **Lavender cloud**      | Soft violet, generous space and pill buttons               | Manrope / DM Sans            |
| **Field notes**         | Earthy greens, characterful headings and practical details | Fraunces / Work Sans         |

Each has light and dark palettes. Presets are independent starting points; edits to the active `design.json` do not modify the other presets.

### Try a random starting point

Use **Tilfældige farver & skrifter** in the playground to generate a fresh color palette and font combination. Each click creates coordinated light and dark colors and selects heading, body and monospace fonts from local fonts and the curated Google Fonts catalog. It generates new palettes instead of selecting one of the presets.

Your appearance mode, layout, corners, shadows and typography sizes stay as configured; font weights adjust when the new family needs a supported weight. The generator checks text contrast on the main generated surfaces. Images retain their original colors, so review the complete design with your own content before publishing.

Keep clicking to explore, or use **Fortryd randomisering** to return to the design before the latest click. A subsequent edit, import or preset selection clears this one-step undo. Refine any generated result with the normal controls and download it as `design.json`; no additional configuration format is needed.

## Configuration reference

`$schema` points your editor to `./design.schema.json` for autocomplete. Keep `version` set to `1`. `name` labels your theme, while the public website name remains in `src/config/site.ts`.

| Group                              | Settings                                       | What changes                                                                                                     |
| ---------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `mode`                             | `light`, `dark`, `system`                      | Use one palette or follow the visitor's operating-system preference.                                             |
| `colors.light`, `colors.dark`      | See below                                      | Each appearance has its own complete semantic palette.                                                           |
| `typography`                       | `headingFont`, `bodyFont`, `monoFont`          | Font stacks for headings, body/interface text and code.                                                          |
| `typography`                       | `baseSize`, `scale`                            | Base type size in pixels and a unitless type multiplier.                                                         |
| `typography`                       | `headingWeight`, `bodyWeight`, `strongWeight`  | Font weights; the selected font must support the chosen weights.                                                 |
| `typography`                       | `headingLineHeight`, `bodyLineHeight`          | Unitless line-height ratios.                                                                                     |
| `typography`                       | `headingLetterSpacing`, `bodyLetterSpacing`    | Letter spacing in `em`.                                                                                          |
| `radius`                           | `card`, `button`, `input`                      | Corner sizes in pixels. Zero gives square corners. Circular icon controls remain circular.                       |
| `shadows.card`, `shadows.floating` | `x`, `y`, `blur`, `spread`, `opacity`, `color` | Shadow geometry in pixels, opacity from 0 to 1, and a hex color. Set opacity to zero to hide a shadow.           |
| `layout`                           | `contentWidth`, `sectionSpacing`, `gap`        | Maximum content width, section padding and grid gaps in pixels. Responsive layouts still adapt to small screens. |
| `layout`                           | `density`                                      | Unitless spacing multiplier for a more compact or more spacious layout.                                          |

The schema documents accepted ranges. Build-time validation rejects unknown keys, missing settings and unsafe or unsupported values, so misspelled settings do not silently disappear.

### Colors

Use six-digit hex values such as `#28513e`. Configure both palettes, even if the current mode is `light`.

| Token                               | Purpose                                    |
| ----------------------------------- | ------------------------------------------ |
| `background`, `foreground`          | Page background and main text.             |
| `card`                              | Cards, form surfaces and floating panels.  |
| `primary`, `primaryForeground`      | Primary buttons and their text.            |
| `secondary`, `secondaryForeground`  | Secondary surfaces and their text.         |
| `muted`, `mutedForeground`          | Subdued surfaces and supporting text.      |
| `accent`, `accentForeground`        | Highlighted areas and accent text.         |
| `border`, `input`                   | Dividers and form-control borders.         |
| `ring`                              | Keyboard-focus outline.                    |
| `success`, `warning`, `destructive` | Status indications.                        |
| `imageBackground`                   | Product illustration backgrounds.          |
| `overlayForeground`                 | Text displayed over the hero illustration. |

Choose foreground/background pairs together and check legibility in both modes. Syntactically valid colors can still have poor contrast. Keep visible keyboard focus when changing the ring color.

### Fonts

The original Botanical, Ocean and Studio presets use local/system fonts. The seven newer presets include Google Fonts pairings. A font stack is a CSS family list, for example:

```json
{
  "headingFont": "Georgia, 'Times New Roman', serif",
  "bodyFont": "Arial, Helvetica, sans-serif",
  "monoFont": "'Courier New', monospace"
}
```

This is a partial illustration of the `typography` group, not a complete theme. Keep the other typography fields when editing your file.

#### Google Fonts

Choose a Google Font in the playground to set both its font stack and download configuration. The exported JSON carries these settings to your published site. No API key is needed.

For manual configuration, add the optional `googleFonts` array inside `typography`, alongside your font stacks:

```json
{
  "headingFont": "'Lora', Georgia, serif",
  "bodyFont": "'Inter', Arial, sans-serif",
  "monoFont": "'Courier New', monospace",
  "googleFonts": [
    { "family": "Lora", "weights": [400, 500, 600, 700], "italic": true },
    { "family": "Inter", "weights": [400, 500, 600, 700] }
  ]
}
```

This is a partial `typography` example: retain the size, weight, line-height and tracking settings from your complete theme. Up to three families can be configured. Family names are Google Fonts names, not CSS stacks or URLs. Select weights and italic styles offered by that family. The playground includes curated choices; other Google Font family names can also be configured.

The site loads the configured fonts from Google's CSS2 service in the visitor's browser using `display=swap`. The build itself does not contact Google, so static exports work without font downloads at build time. The playground loads selected fonts as needed, rather than downloading every preset's fonts when it opens. Fallback fonts remain usable if Google is unavailable or a family/style combination is invalid. Only font loading is shared globally; preview styling stays within the preview.

Google Fonts support is optional and backward compatible. Omit `googleFonts` or use an empty array to avoid Google font requests. Use local font stacks as well when switching a theme fully back to system fonts. A Google Font's name in a stack alone does not download it.

Loading fonts from Google creates browser requests to `fonts.googleapis.com` and `fonts.gstatic.com`; this is separate from affiliate tracking preferences. See the [Google Fonts CSS2 documentation](https://developers.google.com/fonts/docs/css2) for supported family/style syntax.

#### Self-hosted fonts

To use your own webfont files, add licensed files to `public/fonts/`, declare them with `@font-face` in your CSS, then put that family name in the JSON without a Google Fonts entry. Font asset URLs must include the deployed base path on GitHub Pages, for example `/affiliatetemplate/fonts/my-font.woff2`. Use `font-display: swap` and include a fallback family.

## What is separate from the theme

- Identity, language, descriptions and disclosure copy: `src/config/site.ts` and page content.
- Product and guide illustrations: `public/images/` and the corresponding content entries. Existing artwork keeps its original colors.
- Product data, categories and editorial content: `src/data/` and `content/guides/`.
- Layout structure, icon shapes and interaction behavior: React components and CSS.

The theme changes shared visual settings across the existing layout. Replace imagery and content as well when creating a substantially different brand. The playground remains available at `/design`; its footer link appears in demo mode, and the page is marked `noindex`.

## Publish changes

On this repository, a successful push to `master` triggers the Pages workflow. For your own copy, enable GitHub Actions as its Pages publishing source as described in [GitHub Pages deployment](github-pages.md). Every deployed theme change needs a new build; editing a local JSON file does not change an already published site.
