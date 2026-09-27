import type { MetadataRoute } from 'next'
import { absoluteSiteUrl } from '@/lib/paths'
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
      (p) => ({ url: absoluteSiteUrl(p || '/') }),
    ),
    ...getCategories(products).map((c) => ({
      url: absoluteSiteUrl(`/kategorier/${c.slug}`),
    })),
    ...products.map((p) => ({
      url: absoluteSiteUrl(`/produkter/${p.slug}`),
    })),
    ...getGuides().map((g) => ({
      url: absoluteSiteUrl(`/guides/${g.slug}`),
      lastModified: g.date,
    })),
  ]
}
