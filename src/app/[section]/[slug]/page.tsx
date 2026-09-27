import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArticlePage, generateArticleMetadata } from '@/components/article-page'
import { articleStaticParams } from '@/lib/articles'
import { contentTypeFromSection } from '@/lib/content-paths'

type Props = { params: Promise<{ section: string; slug: string }> }
export const dynamicParams = false
export const revalidate = 3600

// One parameter set allows a static export even before every content type has
// published articles. Static product/category routes retain their own handlers.
export function generateStaticParams() {
  return articleStaticParams()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section, slug } = await params
  const type = contentTypeFromSection(section)
  if (!type) notFound()
  return generateArticleMetadata(type, slug)
}

export default async function Page({ params }: Props) {
  const { section, slug } = await params
  const type = contentTypeFromSection(section)
  if (!type) notFound()
  return <ArticlePage type={type} slug={slug} />
}
