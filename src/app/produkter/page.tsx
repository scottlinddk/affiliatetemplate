import { getCatalog } from '@/lib/catalog'
import { Catalog } from '@/components/catalog'
export const revalidate = 3600
export const metadata = {
  title: 'Produkter',
  description:
    'Find og sammenlign produkter til hjemmet, køkkenet og hverdagen.',
  alternates: { canonical: '/produkter' },
}
export default async function ProductsPage() {
  const catalog = await getCatalog()
  return (
    <div className="container section">
      <div className="page-heading">
        <p className="eyebrow">DIT NÆSTE GODE VALG</p>
        <h1>Find dine hverdagsfavoritter.</h1>
        <p className="lead">
          Søg, sortér og sammenlign. Det rigtige valg starter med et godt
          overblik.
        </p>
      </div>
      {catalog.mode === 'demo' && (
        <p className="demo-notice">
          Eksempelindhold · Fiktive produkter, butikker og priser. Købslinks er
          deaktiveret.
        </p>
      )}
      {catalog.warnings.map((w) => (
        <p className="info-panel" role="status" key={w}>
          {w}
        </p>
      ))}
      <Catalog products={catalog.products} />
    </div>
  )
}
