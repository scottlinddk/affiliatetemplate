'use client'
import Link from 'next/link'
import type { Product } from '@/lib/types'
import { lowestPriceOffer, formatPrice } from '@/lib/affiliate'
import { usePreferences } from './preferences'
import { Icon } from './icons'
import { ProductImage } from './product-image'
export function ProductActions({ product }: { product: Product }) {
  const { state, update } = usePreferences()
  const compared = state.compare.includes(product.id)
  const saved = state.saved.includes(product.id)
  return (
    <div className="product-actions">
      <button
        className="compare-toggle"
        aria-pressed={compared}
        disabled={!compared && state.compare.length >= 4}
        onClick={() =>
          update({
            compare: compared
              ? state.compare.filter((id) => id !== product.id)
              : [...state.compare, product.id],
          })
        }
      >
        <Icon name={compared ? 'check' : 'compare'} size={16} />
        {compared
          ? 'Tilføjet'
          : state.compare.length >= 4
            ? 'Maks. 4 produkter'
            : 'Sammenlign'}
      </button>
      <button
        className={`save-button ${saved ? 'saved' : ''}`}
        aria-label={`${saved ? 'Fjern' : 'Gem'} ${product.name}`}
        aria-pressed={saved}
        onClick={() =>
          update({
            saved: saved
              ? state.saved.filter((id) => id !== product.id)
              : [...state.saved, product.id],
          })
        }
      >
        <Icon name="heart" size={18} />
      </button>
    </div>
  )
}
export function ProductCard({ product }: { product: Product }) {
  const offer = lowestPriceOffer(product)
  return (
    <article className="product-card">
      <Link className="product-image" href={`/produkter/${product.slug}`}>
        <ProductImage src={product.image} alt={product.imageAlt} />
        <span className="product-badge">
          {product.demo ? 'Eksempelprodukt' : product.category}
        </span>
      </Link>
      <div className="product-card-body">
        <p className="overline">
          {product.brand} <span> / {product.category}</span>
        </p>
        <h3>
          <Link href={`/produkter/${product.slug}`}>{product.name}</Link>
        </h3>
        <p className="product-description">{product.description}</p>
        <div className="price-row">
          <span>
            {offer ? (
              <>
                <small>Fra </small>
                <strong>{formatPrice(offer.price, offer.currency)}</strong>
              </>
            ) : (
              <strong>Se produkt</strong>
            )}
          </span>
          <Link
            className="round-link"
            href={`/produkter/${product.slug}`}
            aria-label={`Se ${product.name}`}
          >
            <Icon name="arrow" size={18} />
          </Link>
        </div>
        <p className="merchant-count">
          {product.offers.length}{' '}
          {product.offers.length === 1 ? 'forhandler' : 'forhandlere'}
          {product.demo ? ' · demopriser' : ''}
        </p>
        <ProductActions product={product} />
      </div>
    </article>
  )
}
