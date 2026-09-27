# Design guide

The storefront reads **`src/config/design.json`** at build time. This is the design guide for pages, navigation, product cards, comparison tables, forms, consent panels and editorial content. The social preview image uses the configured palette too.

## Start with a preset

Open [the design playground](https://scottlinddk.github.io/affiliatetemplate/design/) or `/design` locally. Choose a preset, adjust its settings and download `design.json`. Replace `src/config/design.json` with that file. Run `npm run check` and `npm run generate` to validate and build it.

The playground changes its preview only. It does not save to your repository or change other visitors' sites. JSON import supports the full configuration, including values without a dedicated visual control. Invalid imports leave the previous preview intact.

Three starting points are included in `src/config/themes/`:

- **Botanical**: warm paper, forest green, editorial serif headings and restrained corners.
- **Ocean**: cool neutrals, blue accents, sans-serif headings and softer shapes.
- **Studio**: warm colors, bold typography and a more graphic treatment.

Each has light and dark palettes. Presets are independent starting points; edits to the active `design.json` do not modify the other presets.

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

The bundled presets use system fonts and do not require a font service or a network download. A font stack is a CSS family list, for example:

```json
{
  "headingFont": "Georgia, 'Times New Roman', serif",
  "bodyFont": "Arial, Helvetica, sans-serif",
  "monoFont": "'Courier New', monospace"
}
```

This is a partial illustration of the `typography` group, not a complete theme. Keep the other typography fields when editing your file.

Writing a font name does not download the font. To use a custom webfont, add licensed font files to `public/fonts/`, declare them with `@font-face` in your CSS, then put that family name in the JSON. Font asset URLs must include the deployed base path on GitHub Pages, for example `/affiliatetemplate/fonts/my-font.woff2`. Use `font-display: swap` and include a fallback family. Font declarations stay in CSS so the JSON remains a portable list of design settings.

## What is separate from the theme

- Identity, language, descriptions and disclosure copy: `src/config/site.ts` and page content.
- Product and guide illustrations: `public/images/` and the corresponding content entries. Existing artwork keeps its original colors.
- Product data, categories and editorial content: `src/data/` and `content/guides/`.
- Layout structure, icon shapes and interaction behavior: React components and CSS.

The theme changes shared visual settings across the existing layout. Replace imagery and content as well when creating a substantially different brand. The playground remains available at `/design`; its footer link appears in demo mode, and the page is marked `noindex`.

## Publish changes

On this repository, a successful push to `master` triggers the Pages workflow. For your own copy, enable GitHub Actions as its Pages publishing source as described in [GitHub Pages deployment](github-pages.md). Every deployed theme change needs a new build; editing a local JSON file does not change an already published site.
