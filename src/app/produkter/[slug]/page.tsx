import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCatalog } from '@/lib/catalog'
import { getOfferStatus } from '@/lib/affiliate'
import { schemaAvailability } from '@/lib/product-schema'
import { ProductActions, ProductCard } from '@/components/product-card'
import { ProductImage } from '@/components/product-image'
import { OfferTable } from '@/components/offer-table'
import { Icon } from '@/components/icons'
import { site } from '@/config/site'
import { BannerPlacement } from '@/components/banner'
import { absoluteSiteUrl } from '@/lib/paths'
export const revalidate = 3600
export async function generateStaticParams() {
  const { products } = await getCatalog()
  return products.map((p) => ({ slug: p.slug }))
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { products } = await getCatalog()
  const p = products.find((p) => p.slug === slug)
  return {
    title: p?.name,
    description: p?.description,
    alternates: { canonical: `/produkter/${slug}` },
    openGraph: p
      ? { title: p.name, description: p.description, images: [p.image] }
      : undefined,
  }
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { products } = await getCatalog()
  const product = products.find((p) => p.slug === slug)
  if (!product) notFound()
  const offers = product.offers.filter((o) => getOfferStatus(o) === 'current')
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: absoluteSiteUrl(product.image),
    brand: { '@type': 'Brand', name: product.brand },
    offers: offers.map((o) => ({
      '@type': 'Offer',
      price: o.price,
      priceCurrency: o.currency,
      availability: schemaAvailability(o.inStock),
      url: o.url,
      seller: { '@type': 'Organization', name: o.merchant },
    })),
  }
  const related = products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 3)
  return (
    <div className="container section">
      {!product.demo && offers.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <nav className="breadcrumb" aria-label="Brødkrumme">
        <Link href="/">Forside</Link>
        <span>/</span>
        <Link href="/produkter">Produkter</Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>
      {product.demo && (
        <p className="demo-notice">
          Eksempelprodukt · Beskrivelse, priser og forhandlere er fiktive.
        </p>
      )}
      <div className="product-detail">
        <div className="detail-image">
          <ProductImage src={product.image} alt={product.imageAlt} eager />
        </div>
        <div className="detail-copy">
          <p className="eyebrow">
            {product.brand} / {product.category}
          </p>
          <h1>{product.name}</h1>
          <p className="lead">{product.description}</p>
          <ul className="feature-list">
            {product.features.map((f) => (
              <li key={f}>
                <Icon name="check" size={18} />
                {f}
              </li>
            ))}
          </ul>
          <ProductActions product={product} />
          <a href="#priser" className="button">
            Se priser og forhandlere <Icon name="arrow" size={17} />
          </a>
          <p className="small-print">{site.affiliateDisclosure}</p>
        </div>
      </div>
      <div id="priser">
        <OfferTable product={product} />
      </div>
      <p className="small-print">
        {site.priceDisclaimer} Priser, der er ældre end syv dage, skjules.
      </p>
      <BannerPlacement placement="product" />
      {Object.keys(product.specs).length > 0 && (
        <section className="spec-section">
          <h2>Det praktiske overblik</h2>
          <dl className="spec-grid">
            {Object.entries(product.specs).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {related.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <h2>Udforsk også</h2>
            <Link href="/produkter" className="text-link">
              Alle produkter <Icon name="arrow" size={16} />
            </Link>
          </div>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
