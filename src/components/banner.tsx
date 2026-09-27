'use client'

import { getBannerForPlacement, type Banner } from '@/lib/banners'
import { usePreferences } from './preferences'

/** The image element itself is absent until consent, including in server HTML. */
export function BannerContent({
  banner,
  marketing,
}: {
  banner: Banner
  marketing: boolean
}) {
  const destination =
    marketing && banner.affiliateUrl ? banner.affiliateUrl : banner.url
  return (
    <aside
      className="container section advertiser-banner"
      aria-label={`Reklame: ${banner.title}`}
    >
      <p className="eyebrow">Reklame</p>
      <a
        href={destination}
        rel="sponsored nofollow noopener noreferrer"
        target="_blank"
      >
        {marketing ? (
          <img
            src={banner.image}
            alt={banner.alt}
            width={banner.width}
            height={banner.height}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
          />
        ) : (
          <span>{banner.title} · Besøg annoncøren</span>
        )}
        <span className="sr-only"> (reklame, åbner i ny fane)</span>
      </a>
      {!marketing && (
        <p className="muted">
          Annoncebilledet vises kun med tilladelse til affiliate-sporing.
        </p>
      )}
    </aside>
  )
}

export function BannerPlacement({
  placement,
}: {
  placement: Banner['placement']
}) {
  const { state } = usePreferences()
  const banner = getBannerForPlacement(placement)
  return banner ? (
    <BannerContent
      banner={banner}
      marketing={state.decided && state.marketing}
    />
  ) : null
}
