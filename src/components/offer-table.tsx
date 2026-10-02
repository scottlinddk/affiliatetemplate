'use client'
import type { Product } from '@/lib/types'
import { formatPrice, getOfferStatus } from '@/lib/affiliate'
import { maskSlug } from '@/lib/linkmask-paths'
import { AffiliateLink } from './affiliate-link'
import { Icon } from './icons'
export function OfferTable({ product }: { product: Product }) {
  const offers = [...product.offers].sort(
    (a, b) => a.price + (a.shipping ?? 0) - (b.price + (b.shipping ?? 0)),
  )
  return (
    <div className="offers">
      <div className="section-heading">
        <h2>Priser hos forhandlerne</h2>
        <span>
          {offers.length} {offers.length === 1 ? 'forhandler' : 'forhandlere'}
        </span>
      </div>
      <p className="muted">
        Sorteret efter produktpris + kendt fragt. Ukendt fragt kan påvirke
        rækkefølgen.
      </p>
      <div className="offer-list">
        {offers.map((offer) => {
          const status = product.demo
            ? offer.inStock
              ? 'current'
              : 'unavailable'
            : getOfferStatus(offer)
          return (
            <div className="offer-row" key={offer.id}>
              <div>
                <h3>{offer.merchant}</h3>
                <span
                  className={`stock ${status === 'current' ? 'in-stock' : ''}`}
                >
                  {status === 'current' ? (
                    <>
                      <Icon name="check" size={14} /> På lager
                    </>
                  ) : status === 'stale' ? (
                    'Prisen skal opdateres'
                  ) : (
                    'Ikke på lager'
                  )}
                </span>
              </div>
              <div>
                <strong className="offer-price">
                  {status === 'current'
                    ? formatPrice(offer.price, offer.currency)
                    : 'Tjek hos butik'}
                </strong>
                <small>
                  {status === 'current'
                    ? offer.shipping === undefined
                      ? 'Fragt oplyses hos butikken'
                      : offer.shipping === 0
                        ? 'Gratis fragt'
                        : `+ ${formatPrice(offer.shipping, offer.currency)} i fragt`
                    : 'Pris vises ikke'}
                </small>
              </div>
              <div>
                <AffiliateLink
                  url={offer.url}
                  affiliateUrl={offer.affiliateUrl}
                  maskedSlug={maskSlug('offer', product.slug, offer.id)}
                  demo={product.demo}
                >
                  Se hos butik <Icon name="arrow" size={16} />
                </AffiliateLink>
                <small className="offer-date">
                  {product.demo
                    ? 'Fiktivt tilbud'
                    : `Hentet ${new Date(offer.updatedAt).toLocaleDateString('da-DK', { timeZone: 'Europe/Copenhagen' })}`}
                </small>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
