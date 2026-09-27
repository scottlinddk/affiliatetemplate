# GitHub Pages example

The example is published at <https://scottlinddk.github.io/affiliatetemplate/>.

`.github/workflows/pages.yml` validates and exports the template on pushes to
`master`, then publishes `out/` with the official GitHub Pages actions. You can
also run **Deploy demo to GitHub Pages** manually from the Actions tab.

The workflow intentionally uses the fictional catalog without feed credentials.
Demo pages remain marked `noindex, nofollow`, and the demo sitemap is empty.

## Use Pages for another copy of the template

1. In the new repository, open **Settings → Pages** and select **GitHub Actions**
   as the source.
2. If the default branch differs, change `branches: [master]` in the workflow.
3. Push your changes or run the workflow manually.

The workflow reads the origin and deployment path from GitHub, so repository
names, account sites, and custom domains do not require hardcoded paths.

## Export locally

For this project's Pages URL, set these build-time environment variables:

```dotenv
NEXT_PUBLIC_SITE_URL=https://scottlinddk.github.io
NEXT_PUBLIC_BASE_PATH=/affiliatetemplate
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
prices in the background. If you adapt this workflow for a live site, configure
approved feeds at build time and rebuild regularly. Continue to host the separate
feed service elsewhere. See the production setup in the main README before
enabling real affiliate offers.
