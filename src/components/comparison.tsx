'use client'
import Link from 'next/link'
import type { Product } from '@/lib/types'
import { usePreferences } from './preferences'
import { ProductImage } from './product-image'
import { lowestPriceOffer, formatPrice } from '@/lib/affiliate'
import { Icon } from './icons'
export function Comparison({ products }: { products: Product[] }) {
  const { state, update } = usePreferences()
  const selected = state.compare
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => !!p)
  const specs = [...new Set(selected.flatMap((p) => Object.keys(p.specs)))]
  const price = lowestPriceOffer
  if (!selected.length)
    return (
      <div className="empty-state">
        <Icon name="compare" size={40} />
        <h2>Hvad står valget mellem?</h2>
        <p>
          Vælg op til fire produkter, og se priser og egenskaber side om side.
        </p>
        <Link className="button" href="/produkter">
          Find produkter <Icon name="arrow" size={17} />
        </Link>
        {state.compare.length > 0 && (
          <button
            className="text-button"
            onClick={() => update({ compare: [] })}
          >
            Ryd tidligere valg
          </button>
        )}
      </div>
    )
  return (
    <>
      <div className="results-bar">
        <p role="status">{selected.length} produkter valgt · højst 4</p>
        <button className="text-button" onClick={() => update({ compare: [] })}>
          Ryd sammenligning
        </button>
      </div>
      {selected.length < state.compare.length && (
        <p className="info-panel">
          Nogle tidligere valgte produkter findes ikke længere i udvalget.
        </p>
      )}
      <div
        className="comparison-scroll"
        tabIndex={0}
        role="region"
        aria-label="Produktsammenligning – rul vandret"
      >
        <table className="comparison-table">
          <thead>
            <tr>
              <th scope="col">Dit overblik</th>
              {selected.map((p) => (
                <th scope="col" key={p.id}>
                  <button
                    className="remove-compare"
                    aria-label={`Fjern ${p.name}`}
                    onClick={() =>
                      update({
                        compare: state.compare.filter((id) => id !== p.id),
                      })
                    }
                  >
                    <Icon name="close" size={16} />
                  </button>
                  <ProductImage src={p.image} alt={p.imageAlt} />
                  <Link href={`/produkter/${p.slug}`}>{p.name}</Link>
                  {p.demo && <small>Eksempelprodukt</small>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Produktpris</th>
              {selected.map((p) => {
                const o = price(p)
                return (
                  <td key={p.id}>
                    <strong>
                      {o
                        ? formatPrice(o.price, o.currency)
                        : 'Ingen aktuel pris'}
                    </strong>
                    <small>Fragt kan tilkomme</small>
                  </td>
                )
              })}
            </tr>
            <tr>
              <th scope="row">Mærke</th>
              {selected.map((p) => (
                <td key={p.id}>{p.brand}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Kategori</th>
              {selected.map((p) => (
                <td key={p.id}>{p.category}</td>
              ))}
            </tr>
            {specs.map((spec) => (
              <tr key={spec}>
                <th scope="row">{spec}</th>
                {selected.map((p) => (
                  <td key={p.id}>{p.specs[spec] || 'Ikke oplyst'}</td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row">Forhandlere</th>
              {selected.map((p) => (
                <td key={p.id}>
                  <Link
                    className="button button-secondary"
                    href={`/produkter/${p.slug}#priser`}
                  >
                    Se {p.offers.length} tilbud <Icon name="arrow" size={15} />
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="small-print">
        Produktoplysninger kommer fra forhandlerne. Vi har ikke selv testet
        produkterne. Demoindhold er fiktivt.
      </p>
    </>
  )
}
