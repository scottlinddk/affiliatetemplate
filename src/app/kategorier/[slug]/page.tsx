import { notFound } from 'next/navigation'
import { getCategories } from '@/lib/categories'
import { getCatalog } from '@/lib/catalog'
import { Catalog } from '@/components/catalog'
export const revalidate = 3600
export async function generateStaticParams() {
  const { products } = await getCatalog()
  return getCategories(products).map((c) => ({ slug: c.slug }))
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { products } = await getCatalog()
  const category = getCategories(products).find((c) => c.slug === slug)
  return {
    title: category?.name,
    description: category?.description,
    alternates: { canonical: `/kategorier/${slug}` },
  }
}
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const catalog = await getCatalog()
  const category = getCategories(catalog.products).find((c) => c.slug === slug)
  if (!category) notFound()
  return (
    <div className="container section">
      <div className="page-heading">
        <p className="eyebrow">FIND DIT NÆSTE VALG</p>
        <h1>{category.name}</h1>
        <p className="lead">{category.description}</p>
      </div>
      {catalog.mode === 'demo' && (
        <p className="demo-notice">
          Eksempelindhold · Fiktive produkter, butikker og priser.
        </p>
      )}
      {catalog.warnings.map((w) => (
        <p className="info-panel" key={w}>
          {w}
        </p>
      ))}
      <Catalog products={catalog.products} initialCategory={category.name} />
    </div>
  )
}
