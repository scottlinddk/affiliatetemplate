# Affiliate website template

A Danish affiliate website built with **React, Next.js App Router and TypeScript**. This version replaces the original Vue/Nuxt application. It runs without a database and starts with a clearly labelled, fictional demo catalog.

The included brand, **Velvalgt**, is a starting point: replace the identity, editorial content and demo data with your own before launching.

**[Open the live GitHub Pages demo](https://scottlinddk.github.io/affiliatetemplate/)** · **[Try the design playground](https://scottlinddk.github.io/affiliatetemplate/design/)**

## Make the design your own

Edit **[`src/config/design.json`](src/config/design.json)** to set the design guide for the entire storefront. It has editor autocomplete through [`design.schema.json`](src/config/design.schema.json), and invalid settings fail the build with a readable error.

- Semantic colors for light and dark appearances, including backgrounds, text, buttons, borders, focus rings and status messages.
- Separate heading, body and monospace fonts, with optional Google Fonts loading; type size, scale, weights, line height and letter spacing.
- Card, button and input corners; card and floating-panel shadows.
- Content width, section spacing, grid gaps and density.

Choose from ten presets, including Midnight Tech, Atelier Luxe, Cherry Pop and Field Notes, or open `/design` to experiment visually, select Google Fonts, import a JSON theme and download your changes. Replace `src/config/design.json` with the downloaded file, then rebuild. Playground changes are previews; downloading does not modify your repository. The demo footer links to the playground.

Read [the design guide](docs/design-guide.md) for every setting, font setup and preset examples. See [GitHub Pages deployment](docs/github-pages.md) to publish a copy under your own account.

## Start in a few minutes

Requirements: Node.js 22 or newer and npm. To create your own repository with GitHub CLI:

```sh
gh repo create my-affiliate-site --template scottlinddk/affiliatetemplate --private --clone
cd my-affiliate-site
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). No API key, database, Partner-ads account or environment file is needed for the demo.

For an existing clone, start at `npm ci`. Copy `.env.example` to `.env.local` when you are ready to configure a live site. Never commit private feed settings or credentials.

## What is included

- Responsive Danish storefront, product details and category navigation.
- Search, category/brand/price filters and sorting, with shareable catalog URLs.
- Multiple offers per product, known delivery charges, stock indicators and freshness checks.
- Up to four products in a comparison and browser-local favorites.
- Server-side product import through [partner-ads-json-feed](https://github.com/scottlinddk/partner-ads-json-feed), matching validated product identifiers across merchants and rejecting invalid data.
- Affiliate links that respect the visitor's saved choice; direct merchant links without affiliate consent.
- Optional approved banner placements, loaded only after the visitor allows affiliate tracking.
- A manually maintained offers/coupon page with validity dates and clear conditions.
- Typed Markdown guides, reviews, comparisons and posts with consent-aware product/offer/CTA blocks, strict build validation, author/FAQ/source rendering and related links.
- Article, breadcrumb and FAQ structured data, stable product URLs, sitemap and configurable AI crawler rules with an optional `llms.txt` index.
- Visible advertising disclosure, an about page, an editable privacy page and persistent privacy settings.
- Local demo illustrations, accessible labels, empty/error states and automated checks.

This is a storefront and publishing template. It does not include a checkout, order management, login, newsletter service, analytics dashboard or a Partner-ads account. Those are separate services. The template makes no claim of automatic legal compliance or verified demo offers.

## Configure your site

| Setting                      | Purpose                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`       | Your public HTTPS origin; used for canonical URLs and search metadata.                                                                                                   |
| `NEXT_PUBLIC_BASE_PATH`      | Optional deployment subdirectory, such as `/affiliatetemplate` for GitHub Pages; leave empty at a domain root. Set before building.                                      |
| `NEXT_PUBLIC_PUBLISHER_NAME` | The actual person or business publishing the website.                                                                                                                    |
| `NEXT_PUBLIC_CONTACT_EMAIL`  | A real contact address shown on information pages.                                                                                                                       |
| `PARTNER_ADS_PARTNER_ID`     | Your affiliate ID; required when constructing tracking links from direct product URLs.                                                                                   |
| `PARTNER_ADS_API_URL`        | Server-only base URL of your separately running JSON feed API, e.g. `http://localhost:1337`. Required for live feeds.                                                    |
| `PARTNER_ADS_FEEDS`          | Server-only JSON array of approved extracts with `rid`, `programId`, `merchant`, `approved: true`, `currency: "DKK"` and optional `bannerId`. Leave unset for demo mode. |

Edit the brand name, description, language and other site defaults in `src/config/site.ts`. Details and an example feed configuration are in [Partner-ads setup](docs/partner-ads.md).

Live data requires a separate deployment of [partner-ads-json-feed](https://github.com/scottlinddk/partner-ads-json-feed). This template calls its paginated `GET /api/feed/:rid` endpoint from the server; the service downloads and parses Partner-ads XML. Each configured extract must contain products from one approved advertiser in DKK. The extract `rid` is separate from partner, program and banner IDs. The API does not discover advertiser programs or replace account approval.

If upgrading from direct XML feeds, replace each `url` entry with its feed-extract `rid`, explicitly add `currency: "DKK"`, set `PARTNER_ADS_API_URL`, and rebuild. Full merchant-feed URLs cannot be substituted for an extract ID. See the [migration and local setup instructions](docs/partner-ads.md#local-development-with-live-data).

The template does not infer advertiser approval. You need an approved affiliate account, an approved website and approval for each program you use. `approved: true` records your confirmation; it does not make an approval request.

## Commands

| Command                | Result                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm ci`               | Install exactly the locked dependencies.                                                               |
| `npm run dev`          | Start local development.                                                                               |
| `npm run build`        | Create a production Next.js build.                                                                     |
| `npm start`            | Serve that production build.                                                                           |
| `npm run generate`     | Export a static website to `out/`.                                                                     |
| `npm run check`        | Run lint, TypeScript checks and unit tests.                                                            |
| `npm run check:config` | Check production launch settings and feed configuration; intentionally fails for an unconfigured demo. |
| `npm run test:e2e`     | Run browser tests; install Playwright Chromium first.                                                  |

Install the browser needed for end-to-end tests with `npx playwright install chromium`.
Browser tests start their own server on port 3100. Set `PLAYWRIGHT_PORT` to use a different port when another checkout is running. Reusing an existing server requires the explicit `PLAYWRIGHT_REUSE_SERVER=true` setting outside CI.

## Content and data

- `src/data/products.json`: illustrative demo products. Demo merchant links are disabled.
- `src/data/deals.json`: editorial offers, codes, validity dates and terms. Keep example offers labelled as demo.
- `src/data/banners.json`: optional approved advertiser creative; empty by default.
- `content/guides/*.md`: guides, reviews, comparisons and posts with validated frontmatter; no CMS required.
- `src/data/programs.json`: approved CTA programs for editorial Markdown, empty by default.
- `src/app/om/page.tsx` and `src/app/privatliv/page.tsx`: public information pages to adapt to your business and hosting.
- `public/images/`: bundled illustrations; live product images remain on the advertiser's host.

See [editing content](docs/content.md) for guide and offer examples. The included guides are original general buying advice, not product tests or independent reviews.

## Deployment and keeping prices current

For a Node-compatible host, run `npm ci`, `npm run check`, `npm run check:config` and `npm run build`, then serve with `npm start`. Set the same environment values in your host. Set public environment variables **before the build**, because Next.js embeds them in the frontend. The JSON feed API must be reachable from the build environment and the running Next.js server; deploy it first and use its deployed base URL. Rebuild after changing feed configuration.

The server caches the processed catalog for one hour, preserving the API's `meta.cachedAt` as each offer's update time. This is the time the service downloaded the source, not proof of when an advertiser changed a price. The API has its own cache (one hour by default); reading cached API data does not reset its timestamp. Next.js revalidation is request-driven; it is not a background scheduler. New product routes and changed guide content should be picked up with a fresh deployment.

For static hosting, run `npm run generate` and publish **`out/`**, with directory-index support. There is no server-side revalidation in an exported site. Schedule a fresh build and deploy at least daily, check its success, and rebuild immediately after content or feed changes. A normal server build is the better fit for a catalog that changes often.

Partner-ads' feed guide calls for prices to be refreshed at least weekly. The template excludes offers older than seven days from current price selection. Static HTML, search-engine caches and an already-open browser tab can still lag behind: a regular successful rebuild remains necessary. The merchant always confirms the final price, stock and delivery charge.

Read the [launch checklist](docs/launch-checklist.md) before making the site public.

## Implementation notes

The migration removes Nuxt, Vuex and Vue components in favor of React server-rendered pages and small client components for search, preferences and comparison. XML downloads and parsing belong to the separate JSON feed service. Feed settings remain on the server, and browsers never request the feed API. Markdown is rendered through `react-markdown` with raw HTML disabled and a restricted element list. Product data is validated before display; feed failures are surfaced instead of silently substituting demo products into a live catalog.

The implementation is informed by the [Partner-ads overview](https://www.partner-ads.com/dk/guide-affiliate-annoncoer.php), [product-feed guide](https://www.partner-ads.com/dk/guide-til-affiliate-hele-produktfeeds.php), [XML specification](https://www.partner-ads.com/dk/feed_advinfo.htm) and [affiliate terms](https://www.partner-ads.com/dk/affiliatebetingelser.php). [Partner-ads setup](docs/partner-ads.md) documents the supported scope and links to the relevant primary sources.
