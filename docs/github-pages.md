# GitHub Pages example

The example is published at <https://scottlinddk.github.io/affiliatetemplate/>.

`.github/workflows/pages.yml` validates and exports the template on pushes to
`master`, on a daily schedule at **02:17 UTC**, and when run manually from the
Actions tab. It publishes `out/` with the official GitHub Pages actions.

The published example uses real Dansk Restlager products from the separately
hosted JSON feed API. The workflow reads feed settings from GitHub settings;
without a feed configuration, a copy of the template uses the fictional catalog.
`NEXT_PUBLIC_TEMPLATE_SHOWCASE=true` keeps this public template example marked
`noindex, nofollow`, with an empty sitemap and the design playground linked in
the footer, even when it displays real products. Showcase mode does not turn
real prices or affiliate links into fictional demo data. Fictional campaigns
are hidden from the offers page whenever live feeds are configured.

## Use Pages for another copy of the template

1. In the new repository, open **Settings → Pages** and select **GitHub Actions**
   as the source.
2. If the default branch differs, change `branches: [master]` in the workflow.
3. Push your changes or run the workflow manually.

The workflow reads the origin and deployment path from GitHub, so repository
names, account sites, and custom domains do not require hardcoded paths.

For real products, add these values under **Settings → Secrets and variables →
Actions** before running the workflow:

| Type                | Name                     | Value                                                                                                                                         |
| ------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository variable | `PARTNER_ADS_API_URL`    | The deployed API base URL, for example `https://partner-ads-json-feed.vercel.app`.                                                            |
| Repository secret   | `PARTNER_ADS_FEEDS`      | Your JSON array of approved extracts with `rid`, `merchant`, `approved: true` and `currency: "DKK"`. `programId` and `bannerId` are optional. |
| Repository secret   | `PARTNER_ADS_PARTNER_ID` | Your actual partner ID, to validate attribution on supplied tracking links; also required when constructing links from direct URLs.           |

Paste the JSON array without surrounding shell quotes. Keep private feed
configuration out of workflow source and committed files. A blank
`PARTNER_ADS_FEEDS` selects fictional demo mode; a configured live feed never
falls back to fictional products if it fails. A live configuration also needs
a reachable `PARTNER_ADS_API_URL`.

For a production site under your own identity, set
`NEXT_PUBLIC_TEMPLATE_SHOWCASE=false` in the workflow and configure your
publisher name and contact email. Review the [launch checklist](launch-checklist.md)
and [Partner-ads setup](partner-ads.md). GitHub does not copy repository secrets
or variables into new template repositories, so each site needs its own settings.

## Export locally

For this project's Pages URL, set these build-time environment variables:

```dotenv
NEXT_PUBLIC_SITE_URL=https://scottlinddk.github.io
NEXT_PUBLIC_BASE_PATH=/affiliatetemplate
NEXT_PUBLIC_TEMPLATE_SHOWCASE=true
```

Then run `npm run generate`. `NEXT_PUBLIC_SITE_URL` is the origin only;
`NEXT_PUBLIC_BASE_PATH` is empty for a site hosted at the domain root. Both are
compiled into the output, so rebuild after changing either value.

The export command verifies local routes, images, styles, scripts, canonical
URLs, and the robots sitemap URL. It also creates `out/.nojekyll`.

Use root-relative internal paths in content (for example `/produkter`), and store
public asset paths without the prefix (for example `/images/coffee.svg`).
`next/link` adds the configured path to navigation; `withBasePath` does the same
for images. External advertiser image and destination URLs remain unchanged.

## Static hosting and live feeds

GitHub Pages serves the generated files; it cannot run the feed service or refresh
prices in the browser. The scheduled workflow fetches fresh data and rebuilds
the static site; the feed service continues running elsewhere.

Before static generation, `scripts/prepare-catalog.ts` fetches each approved
extract once, including every API page. All routes then read the same temporary
catalog snapshot, so a large catalog does not trigger separate feed downloads
for every product page. The snapshot is removed after the export and must not
be committed.

A failed or inconsistent feed, a feed with no valid products, or stale/invalid
source timestamps aborts the export. A fresh valid feed with only out-of-stock
products still publishes those unavailable statuses. The deploy job
only runs after a successful build, preserving the last published site during
a feed outage. Check scheduled Actions runs and review a real product after
deployment: a failed refresh does not make previously published prices fresh.

The API's root path may return `404`; use `/health` for service status. Its
`/api/feeds` endpoint lists only cached extracts and can be empty after a cold
start. Configure explicit extract IDs rather than treating that inventory as
a permanent source of configuration.
