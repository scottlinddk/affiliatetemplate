# LinkMask affiliate links

[LinkMask](https://github.com/scottlinddk/LinkMask) is enabled automatically in
Next.js server deployments (`npm run build` and `npm start`) and local development.
No additional service or configuration is needed. After affiliate consent, eligible
buttons use a same-origin path such as `/link/offer/i-garden-table/i-shop`.
Before consent, and immediately after reopening privacy settings, they use the
direct merchant URL. Existing disclosure and sponsored-link attributes remain.

Masking covers product offers, deals, editorial program CTAs and product links,
and approved banners. Banner images still require marketing consent. Demo
products and deals never enter the redirect registry; demo purchase buttons stay
disabled. The registry also excludes expired deals and unsupported URLs or IDs.

`npm run generate`, including the GitHub Pages workflow, automatically excludes
the server redirect route and retains the existing consent-aware links: direct
merchant URLs before consent and approved affiliate URLs after consent. Static
hosting cannot provide these HTTP redirects. The build derives masking support
from `STATIC_EXPORT`; no separate LinkMask environment setting is required.

## Paths and destinations

Paths use stable IDs with separate `offer`, `deal`, `program` and `banner`
namespaces. Product offers include both the product slug and offer ID. Each ID
gets an `i-` prefix. Keep IDs stable when only a destination changes.
`NEXT_PUBLIC_BASE_PATH` is included automatically, so a deployment under `/shop`
uses `/shop/link/...`.

The server builds its registry from the existing catalog, active deals, approved
programs and approved banners. No second destination file needs maintaining.
Affiliate URLs must be absolute HTTPS URLs without credentials, whitespace,
backslashes or unencoded non-ASCII characters. IDs use ASCII letters, digits,
hyphens and underscores. Unsupported entries retain their existing consent-aware
link behavior. Conflicting destinations under the same ID fail explicitly.

GET and HEAD return **HTTP 302**, preserving the configured destination exactly
in `Location`, including tracking parameters. Responses include
`Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow` and
`Referrer-Policy: no-referrer`. Unknown paths return 404; other methods on a known
path return 405. Incoming query parameters cannot choose or alter a destination.
Redirect paths are not added to the sitemap.

The catalog follows its existing one-hour server cache. Changes to configured
programs or banners require redeployment. Removed offers and expired deals stop
redirecting once the registry sees the updated data.

Consent selects the link in the browser UI. The redirect endpoint is public and
does not read the visitor's local-storage preference; opening a masked URL
directly redirects. Masking is not encryption: affiliate URLs may still appear
in page data, HTTP response headers and the destination address bar.

## Verify

Run `npm run check`, `npm run build` and `npm start`. For an approved program with
ID `merchant`, inspect its response without following the affiliate destination:

```sh
curl -I http://localhost:3000/link/program/i-merchant
```

Include the deployment base path when configured. Expect 302 and the exact
configured `Location`. A fresh demo has no live product redirects. In the browser,
check that accepting affiliate tracking changes an eligible button to `/link/...`
and reopening privacy settings immediately restores its direct merchant URL.

The dependency is vendored for reproducible installs until its npm release is
available; see [package provenance](../vendor/README.md).
