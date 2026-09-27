# Editing content

## Brand and page copy

Start with `src/config/site.ts`, the site environment values and the homepage. Replace the demo identity and review the about and privacy pages. Those pages describe shipped behavior, but hosting, new analytics or external services may change what you need to disclose.

Local SVG illustrations are included in `public/images/`. Replace them with media you have permission to use. Live merchant images remain external to respect the feed usage model.

## Publish editorial content

Add a file in `content/guides/` with a unique lowercase, hyphen-separated filename. This remains the shared source directory for all editorial types. Choose the type before publishing:

| `type`                               | Permanent route           | Listing            |
| ------------------------------------ | ------------------------- | ------------------ |
| `guide` (default for existing files) | `/guides/<slug>`          | `/guides`          |
| `review`                             | `/anmeldelser/<slug>`     | `/anmeldelser`     |
| `comparison`                         | `/sammenligninger/<slug>` | `/sammenligninger` |
| `post`                               | `/artikler/<slug>`        | `/artikler`        |

The interactive product comparison tool stays at `/sammenlign`. Existing guide URLs are preserved. Do not change a published filename or type without a permanent redirect from its old URL at your host. Canonicals, breadcrumbs, sitemap, related links and the optional LLM index use the same route mapping.

```markdown
---
title: 'A clear, useful guide title'
type: guide
description: 'A short description for the card and search results.'
category: 'Your topic'
date: '2026-09-26'
image: '/images/coffee.svg'
---

An introduction that explains who the guide is for.

## A useful question to start with

Original, practical advice based on your knowledge and sources.

- A concrete thing to check
- Another useful comparison

[Explore the catalog](/produkter)
```

`title`, `description`, `category`, `date` and `image` are required. `type` defaults to `guide`. **Unknown keys fail the build**, including nested fields, so typos cannot silently remove content. Reading time is calculated automatically. Rebuild when you add, remove or edit an article.

Optional fields:

| Field      | Format and behavior                                                                                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `updated`  | Real `YYYY-MM-DD` date, on or after publication; displayed as “Opdateret” and used in Open Graph, Article JSON-LD and sitemap. Only change after a genuine revision. |
| `author`   | A non-empty person's name; rendered visibly and in metadata/Article JSON-LD. Omission does not invent an author.                                                     |
| `products` | Product slug array for `review` or `comparison`; every slug must exist in the build catalog. Renders links to the products.                                          |
| `verdict`  | Non-empty plain-text assessment for `review` or `comparison`. Renders “Vores vurdering”.                                                                             |
| `faq`      | Array of `{ q, a }` plain-text strings; visible questions/answers and matching FAQPage JSON-LD share this source. Allowed for every type.                            |
| `sources`  | Array of `{ title, url }`; displayed under “Kilder”. Use original sources and direct HTTPS URLs, never affiliate redirects.                                          |
| `related`  | Zero to five other article filename slugs, in order. Overrides automatic suggestions; `[]` disables them.                                                            |
| `pillar`   | Another article filename slug for a visible link to the topic's main overview.                                                                                       |

For example, add the following fields to a review with a real named author and product references from your catalog:

```yaml
type: review
author: 'The actual author name'
updated: '2026-09-27'
products:
  - gtin-05701234567897
verdict: 'A specific assessment supported by the article.'
faq:
  - q: 'Who is this product suitable for?'
    a: 'Explain the relevant use case and limitations.'
sources:
  - title: 'Manufacturer specifications'
    url: 'https://manufacturer.example/product'
```

These are illustrative values: substitute an existing product slug and real sources. Related and pillar slugs must name other existing files. Without `related`, suggestions prioritize shared products, category and content type, with up to three other articles when available. The pillar is linked separately. Articles emit Article and BreadcrumbList structured data. FAQ markup describes the visible content; it does not guarantee Google FAQ rich results.

Write headings from `##` down because the page already renders the title as its main heading. Supported Markdown includes paragraphs, links, headings, lists, emphasis, quotes and code. Raw HTML and embedded scripts are disabled; the renderer restricts element types and uses safe URL handling. Inline images are intentionally excluded from the Markdown body; use the frontmatter image for the article illustration.

Do not claim a product was tested if it was not. Distinguish your own experience, manufacturer information and general buying advice. Use dates that match publication or a genuine revision, and link to relevant original sources where needed.

## Article images

Put original or licensed editorial artwork in `public/images/articles/` and use a path such as `/images/articles/choosing-coffee-equipment.webp`. Use lowercase topic-based names, ideally matching the article slug. Recommended canvas: **1200 × 800 pixels (3:2)**, with important details away from the edges. Prefer WebP or AVIF for photos (aim below 250 KB); SVG is suitable for your own illustrations. The bundled SVGs remain valid examples.

The build requires an existing local image file and rejects traversal, external, query-string and malformed paths with the article name in the error. This validates the path and file, not image dimensions or licensing. Inline Markdown images are excluded. Advertiser feed/product images are a separate pipeline: keep them hotlinked to the advertiser through ProductImage, with no copying, download or image proxy.

## Monetised Markdown blocks

Use typed leaf directives on their own line, with blank lines around them:

```markdown
::product{slug="your-existing-product-slug"}

::offer-table{slug="your-existing-product-slug"}

::cta{program="approved-merchant" label="See the merchant's offer"}
```

`product` renders the product card and its best current offer; `offer-table` renders every merchant offer, including stale/unavailable status; `cta` selects a configured approved program. Product cards use the existing lowest item price logic, while the CTA compares product price plus known shipping and discloses unknown shipping. Demo purchase actions remain disabled.

Every monetised outbound link uses AffiliateLink with `sponsored nofollow noopener noreferrer`. Until explicit affiliate consent, the link points directly to the merchant. Revoking consent restores direct links. Plain Markdown links to Partner-ads (including reference links and subdomains) fail validation. Use ordinary Markdown links for internal navigation and untracked HTTPS sources. Other affiliate networks are not automatically detected: all affiliate links must use directives, and all direct URLs must be genuinely untracked.

Raw HTML stays disabled. Unknown directives, unsupported attributes, missing required attributes, unknown product slugs and unknown/unapproved programs fail the build. Frontmatter `products` is checked against the same catalog. Validation runs during static route generation and rendering, so a changed feed cannot silently turn a product reference into a broken link. A feed outage affecting referenced products must be resolved before publishing a new build.

### Approved CTA programs

`src/data/programs.json` is empty by default. Add only real programs and campaign URLs you have verified:

```json
[
  {
    "id": "approved-merchant",
    "name": "Actual merchant name",
    "approved": true,
    "url": "https://merchant.example/offer",
    "affiliateUrl": "https://www.partner-ads.com/dk/klikbanner.php?partnerid=123&bannerid=456"
  }
]
```

This is a non-working example. The registry `id` is your editorial key, not the Partner-ads program/banner ID. Replace both destinations and identifiers; verify the tracking URL resolves to the stated direct destination. `approved: true` records existing permission, not a new approval request. Invalid, duplicate or unknown registry fields fail validation. Follow any program-specific text-link wording and creative requirements. The [directive design](content-directives-design.md) explains the shared validation/rendering contract.

### Stable product references

Live product slugs use `gtin-<14-digit validated GTIN>` or `product-<hash of identity namespace and source product ID>`. The namespace is the actual `programId` when configured, otherwise `feed:<rid>`. Merchant renaming and feed ordering do not change them. Rows lacking both a valid GTIN and a source ID are rejected. Demo slugs remain unchanged. Copy the current slug from the catalog; do not derive it from the product name. Adding a program ID later changes the identity of products that have no valid GTIN, so review references and redirects before that change.

Before launch, replace old name-prefixed live URLs and references with these identifier slugs. If upgrading a published site, export its old URL-to-product mapping first and configure permanent redirects at the host before deploying. Historical merchant names cannot be reconstructed, so redirects are not inferred. Static exports require host-level redirects. A changed GTIN or merchant source ID is an identity change and needs editorial review.

## Maintain offers and coupons

Edit the array in `src/data/deals.json`. A deal has the following shape:

```json
{
  "id": "your-campaign",
  "title": "A factual description of the offer",
  "merchant": "Approved merchant",
  "description": "Explain what the visitor can save or receive.",
  "code": "REAL-APPROVED-CODE",
  "startsAt": "2026-10-01T00:00:00+02:00",
  "expiresAt": "2026-10-31T23:59:59+01:00",
  "url": "https://merchant.example/campaign",
  "terms": "Minimum order, exclusions and other material conditions.",
  "demo": true
}
```

This is a **non-working example**. Replace the details with an authorized, verified campaign and use `demo: false` only when it is real. `code` is optional for offers that need no code. `affiliateUrl` is optional and should contain the actual approved tracking URL for the direct `url` destination. A demo entry's outbound purchase action is disabled.

Use complete timestamps with a time-zone offset. Start and end times are interpreted as specific instants. Expired or future real campaigns are omitted from the active listing. Labelled demo cards stay visible only in fictional demo mode; the live catalog hides every `demo: true` campaign. If no real campaign is configured, the live offers page shows an empty state rather than example coupons. Also remove old entries during routine editorial maintenance. Rebuild the site after changes, especially on static hosting.

The template cannot verify that a code is accepted in a merchant's checkout. Test it according to the program's permitted process and describe conditions accurately. Do not invent discount percentages, original prices, countdown scarcity or attribution promises.

## Optional approved banners

`src/data/banners.json` is an empty array by default. You can add approved advertiser creative for the homepage, product pages, or any editorial type:

```json
[
  {
    "id": "your-approved-campaign",
    "title": "Merchant campaign",
    "image": "https://merchant.example/approved-banner.jpg",
    "alt": "Describe the advertised offer and merchant",
    "url": "https://merchant.example/campaign",
    "width": 728,
    "height": 90,
    "approved": true,
    "placement": "home"
  }
]
```

The example is illustrative. Use the original advertiser-hosted HTTPS image and approved dimensions; do not download or proxy the creative. `affiliateUrl` can contain the actual approved tracking URL. The direct `url` must remain valid. `placement` is `home`, `product`, `article-inline` (after the introduction/disclosure) or `article-end` (after the body/FAQ/sources). The first valid approved entry for a placement is used, so each article has at most two banner slots.

The placement displays a “Reklame” label and does not load its remote creative before the visitor allows affiliate tracking. `approved: true` is your confirmation of permission to use this specific creative, not a request for approval. Rebuild after changes and remove expired campaigns.

The [Partner-ads affiliate terms, §3](https://www.partner-ads.com/dk/affiliatebetingelser.php) were checked on **2026-09-27**: the per-page limit is five banners and five text links, with exceptions for price comparison and product guides. Reviews and general posts have no stated exception. The template conservatively applies the five-link budget to **all editorial types**. Each product/CTA reserves one link, offer tables reserve one per offer, and each configured banner reserves one text fallback link. Exceeding the combined budget fails the build and rendering rather than silently truncating a comparison. Counts include stale offers and repeat directives. Program-specific conditions can be stricter.

## Crawler policy and ongoing maintenance

Configure independent answer/search and model-training crawler choices in `src/config/site.ts`; see [crawler policy](crawlers.md) for verified names, default decisions and the optional `llms.txt` index. These controls do not promise traffic, ranking or exclusion by noncompliant crawlers.

Implement shared improvements in this template first, validate them here, then bring the changes into each site with a reviewed merge or cherry-pick. Keep each site's identity, editorial material, approved programs and deployment secrets site-specific.

At launch, monthly thereafter, and whenever adding a program, review bot documentation, Partner-ads terms, individual program conditions, approved creative, destinations and consent behavior. Record the review date and owner in the site's operations notes. These editorial reviews are manual; the included Pages workflow separately schedules a daily product-data rebuild.

## Demo versus live data

`src/data/products.json` provides a working UI before you have approved feeds. The demo's names, merchants, prices and specifications are fictional examples, and its purchase links are disabled. It should not be presented as a real comparison service.

To switch to imported live data, use a separate [partner-ads-json-feed](https://github.com/scottlinddk/partner-ads-json-feed) service, set its server-only `PARTNER_ADS_API_URL`, and configure `PARTNER_ADS_FEEDS` with approved advertiser-specific extract IDs (`rid`), merchant names and `currency: "DKK"`. Only supply optional program and banner IDs when their actual values are known. The deployed API is `https://partner-ads-json-feed.vercel.app`; its root may return `404`, while `/health` checks service status. `/api/feeds` is a temporary cache inventory, so explicit extract configuration remains necessary. There is no need to copy private feed responses into source control. The service must be reachable while building and, for server hosting, serving the storefront. Rebuild after feed configuration or product-route changes.

Invalid live configuration remains in live mode and displays an error rather than substituting demo products. Missing shipping remains unknown; products with unknown availability or invalid prices are omitted. Offer update times preserve the service's `meta.cachedAt` instead of the storefront's fetch time. See [Partner-ads setup](partner-ads.md) for the complete mapping and migration from legacy XML feed URLs.

Static export fetches a complete catalog once and shares its temporary snapshot
across every generated route. A failed, empty or stale configured feed aborts
the export, preserving the last successful Pages deployment. The included
workflow refreshes daily at 02:17 UTC and also supports manual runs. Template
showcase mode (`NEXT_PUBLIC_TEMPLATE_SHOWCASE=true`) keeps the design playground
linked and prevents indexing even with real products; it is independent of
fictional demo mode.

The product and deal TypeScript definitions are in `src/lib/types.ts`. If you extend them, update validation, the relevant interface, tests and these docs together.
