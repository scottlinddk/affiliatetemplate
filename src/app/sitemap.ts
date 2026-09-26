import type { MetadataRoute } from 'next'
import { site } from '@/config/site'
import { getCatalog } from '@/lib/catalog'
import { getGuides } from '@/lib/guides'
import { getCategories } from '@/lib/categories'
export const revalidate = 3600
export const dynamic = 'force-static'
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, mode } = await getCatalog()
  if (mode === 'demo') return []
  return [
    ...['', '/produkter', '/guides', '/om', '/privatliv', '/tilbud'].map(
      (p) => ({ url: new URL(p || '/', site.url).href }),
    ),
    ...getCategories(products).map((c) => ({
      url: new URL(`/kategorier/${c.slug}`, site.url).href,
    })),
    ...products.map((p) => ({
      url: new URL(`/produkter/${p.slug}`, site.url).href,
    })),
    ...getGuides().map((g) => ({
      url: new URL(`/guides/${g.slug}`, site.url).href,
      lastModified: g.date,
    })),
  ]
}
