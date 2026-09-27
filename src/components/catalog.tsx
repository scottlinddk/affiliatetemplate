'use client'
import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import type { Product } from '@/lib/types'
import { lowestPriceOffer } from '@/lib/affiliate'
import { ProductCard } from './product-card'
import { usePreferences } from './preferences'
import { Icon } from './icons'

function subscribeToQuery(listener: () => void) {
  window.addEventListener('popstate', listener)
  return () => window.removeEventListener('popstate', listener)
}
function browserQuery() {
  return window.location.search
}
function serverQuery() {
  return ''
}

const PAGE_SIZE = 24

function CatalogProducts({ products }: { products: Product[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const shown = Math.min(visibleCount, products.length)
  return (
    <>
      <div className="product-grid">
        {products.slice(0, shown).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {products.length > PAGE_SIZE && (
        <div className="catalog-pagination">
          <p role="status">
            Viser {shown} af {products.length} produkter
          </p>
          {shown < products.length && (
            <button
              className="button button-secondary"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              Vis flere produkter
            </button>
          )}
        </div>
      )}
    </>
  )
}

export function Catalog({
  products,
  initialCategory = '',
}: {
  products: Product[]
  initialCategory?: string
}) {
  const query = useSyncExternalStore(
    subscribeToQuery,
    browserQuery,
    serverQuery,
  )
  const params = new URLSearchParams(query)
  const search = params.get('q') || ''
  const category = params.has('category')
    ? params.get('category')!
    : initialCategory
  const brand = params.get('brand') || ''
  const merchant = params.get('merchant') || ''
  const sort = params.get('sort') || 'featured'
  const maxPrice = params.get('max') || ''
  const inStock = params.get('stock') === '1'
  const savedOnly = params.get('saved') === '1'
  const { state, update } = usePreferences()
  // Reset the visible batch when the result criteria change, including history
  // navigation. Saving or comparing a card otherwise leaves its batch visible.
  const resultKey = JSON.stringify([
    search,
    category,
    brand,
    merchant,
    sort,
    maxPrice,
    inStock,
    savedOnly,
    savedOnly ? state.saved : null,
  ])
  const price = (p: Product) => lowestPriceOffer(p)?.price ?? Infinity
  const categories = [...new Set(products.map((p) => p.category))].sort()
  const brands = [...new Set(products.map((p) => p.brand))].sort()
  const merchants = [
    ...new Set(products.flatMap((p) => p.offers.map((o) => o.merchant))),
  ].sort()
  const filtered = products
    .map((p) =>
      merchant
        ? { ...p, offers: p.offers.filter((o) => o.merchant === merchant) }
        : p,
    )
    .filter(
      (p) =>
        p.offers.length > 0 &&
        (!category || p.category === category) &&
        (!brand || p.brand === brand) &&
        (!merchant || p.offers.some((o) => o.merchant === merchant)) &&
        (!search ||
          `${p.name} ${p.brand} ${p.description} ${p.category}`
            .toLocaleLowerCase('da')
            .includes(search.toLocaleLowerCase('da'))) &&
        (!maxPrice || price(p) <= Number(maxPrice)) &&
        (!inStock || Number.isFinite(price(p))) &&
        (!savedOnly || state.saved.includes(p.id)),
    )
    .sort((a, b) =>
      sort === 'price-asc'
        ? price(a) - price(b)
        : sort === 'price-desc'
          ? price(b) - price(a)
          : sort === 'name'
            ? a.name.localeCompare(b.name, 'da')
            : Number(!!b.featured) - Number(!!a.featured),
    )

  function change(patch: Record<string, string>, reset = false) {
    const url = new URL(window.location.href)
    if (reset) url.search = ''
    for (const [key, value] of Object.entries(patch)) {
      if (value || key === 'category') url.searchParams.set(key, value)
      else url.searchParams.delete(key)
    }
    window.history.replaceState(null, '', `${url.pathname}${url.search}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
  function clear() {
    change({}, true)
  }
  return (
    <>
      <div className="catalog-layout">
        <aside className="filters" aria-label="Produktfiltre">
          <div className="filter-title">
            <h2>Filtrér produkter</h2>
            <button className="text-button" onClick={clear}>
              Nulstil
            </button>
          </div>
          <label className="field-label" htmlFor="product-search">
            Søg efter et produkt
          </label>
          <div className="search-input">
            <Icon name="search" size={18} />
            <input
              id="product-search"
              type="search"
              value={search}
              placeholder="Navn, mærke, kategori…"
              onChange={(e) => change({ q: e.target.value })}
            />
          </div>
          <fieldset>
            <legend>Kategorier</legend>
            {['', ...categories].map((c) => (
              <label className="radio-row" key={c}>
                <input
                  type="radio"
                  name="category"
                  checked={category === c}
                  onChange={() => change({ category: c })}
                />
                <span>{c || 'Alle produkter'}</span>
                <small>
                  {products.filter((p) => !c || p.category === c).length}
                </small>
              </label>
            ))}
          </fieldset>
          <div className="filter-field">
            <label className="field-label" htmlFor="brand">
              Mærke
            </label>
            <select
              id="brand"
              value={brand}
              onChange={(e) => change({ brand: e.target.value })}
            >
              <option value="">Alle mærker</option>
              {brands.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <label className="field-label" htmlFor="merchant">
              Forhandler
            </label>
            <select
              id="merchant"
              value={merchant}
              onChange={(e) => change({ merchant: e.target.value })}
            >
              <option value="">Alle forhandlere</option>
              {merchants.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <label className="field-label" htmlFor="max-price">
              Maks. produktpris (kr.)
            </label>
            <input
              id="max-price"
              type="number"
              min="0"
              value={maxPrice}
              placeholder="Intet maksimum"
              onChange={(e) => change({ max: e.target.value })}
            />
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => change({ stock: e.target.checked ? '1' : '' })}
            />{' '}
            Kun på lager
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={savedOnly}
              onChange={(e) => change({ saved: e.target.checked ? '1' : '' })}
            />{' '}
            Mine gemte produkter
          </label>
          <div className="filter-note">
            <Icon name="leaf" />
            <p>
              Tag dig tid til at vælge.
              <br />
              Sammenlign det, der betyder noget for dig.
            </p>
          </div>
        </aside>
        <div>
          <div className="results-bar">
            <p role="status">
              <strong>{filtered.length}</strong> produkter
            </p>
            <label>
              Sortér efter{' '}
              <select
                value={sort}
                onChange={(e) => change({ sort: e.target.value })}
                aria-label="Sortér produkter"
              >
                <option value="featured">Udvalgte først</option>
                <option value="price-asc">Laveste pris</option>
                <option value="price-desc">Højeste pris</option>
                <option value="name">Navn A–Å</option>
              </select>
            </label>
          </div>
          {filtered.length ? (
            <CatalogProducts key={resultKey} products={filtered} />
          ) : (
            <div className="empty-state">
              <Icon name="search" size={32} />
              <h2>Ingen produkter matcher</h2>
              <p>Prøv et andet søgeord, eller giv filtrene lidt mere plads.</p>
              <button className="button button-secondary" onClick={clear}>
                Nulstil filtre
              </button>
            </div>
          )}
        </div>
      </div>
      {state.compare.length > 0 && (
        <div className="compare-tray">
          <span>
            <strong>{state.compare.length} af 4</strong> produkter valgt
          </span>
          <button
            className="text-button"
            onClick={() => update({ compare: [] })}
          >
            Ryd valg
          </button>
          <Link className="button" href="/sammenlign">
            Sammenlign <Icon name="arrow" size={16} />
          </Link>
        </div>
      )}
    </>
  )
}
