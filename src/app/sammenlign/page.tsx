import { getCatalog } from '@/lib/catalog'
import { Comparison } from '@/components/comparison'
export const revalidate = 3600
export const metadata = {
  title: 'Sammenlign produkter',
  description: 'Sammenlign op til fire produkter side om side.',
  alternates: { canonical: '/sammenlign' },
  robots: { index: false, follow: true },
}
export default async function ComparePage() {
  const { products } = await getCatalog()
  return (
    <div className="container section">
      <div className="page-heading">
        <p className="eyebrow">GIV DIT VALG LIDT PLADS</p>
        <h1>Sammenlign dine favoritter.</h1>
        <p className="lead">
          Hvad betyder mest for dig? Se forskellene, før du beslutter dig.
        </p>
      </div>
      <Comparison products={products} />
    </div>
  )
}
