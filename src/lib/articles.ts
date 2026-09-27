import { cache } from 'react'
import { getCatalog } from './catalog'
import { getGuides } from './guides'
import { validateArticleContent } from './content-directives'
import { validateArticlePolicy } from './article-policy'
import type { Guide, Product } from './types'
import { contentSection } from './content-paths'

export function validateArticle(article: Guide, products: Product[]) {
  const result = validateArticleContent(article.content, products, {
    source: article.slug,
    productSlugs: article.products,
  })
  validateArticlePolicy(result.affiliateTextLinks, article.slug)
}

/** Static params validate every article before publishing any detail route. */
export const getValidatedArticles = cache(async () => {
  const articles = getGuides()
  const catalog = await getCatalog()
  for (const article of articles) validateArticle(article, catalog.products)
  return { articles, catalog }
})

export async function articleStaticParams() {
  const { articles } = await getValidatedArticles()
  return articles.map(({ slug, type }) => ({
    section: contentSection(type).path.slice(1),
    slug,
  }))
}
