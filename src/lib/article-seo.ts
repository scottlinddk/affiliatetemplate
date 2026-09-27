import type { Metadata } from 'next'
import { site } from '../config/site'
import { contentPath, contentSection } from './content-paths'
import type { Guide } from './types'

export function articleMetadata(article: Guide): Metadata {
  const url = contentPath(article)
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: url },
    ...(article.author ? { authors: [{ name: article.author }] } : {}),
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.description,
      url,
      publishedTime: article.date,
      ...(article.updated ? { modifiedTime: article.updated } : {}),
      ...(article.author ? { authors: [article.author] } : {}),
      images: [
        { url: article.image, width: 1200, height: 800, alt: article.title },
      ],
    },
  }
}

export function articleStructuredData(article: Guide) {
  const url = new URL(contentPath(article), site.url).href
  const section = contentSection(article.type)
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${url}#article`,
      mainEntityOfPage: url,
      headline: article.title,
      description: article.description,
      image: new URL(article.image, site.url).href,
      datePublished: article.date,
      ...(article.updated ? { dateModified: article.updated } : {}),
      ...(article.author
        ? { author: { '@type': 'Person', name: article.author } }
        : {}),
      publisher: { '@type': 'Organization', name: site.publisher },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Forside',
          item: new URL('/', site.url).href,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: section.label,
          item: new URL(section.path, site.url).href,
        },
        { '@type': 'ListItem', position: 3, name: article.title, item: url },
      ],
    },
    ...(article.faq?.length
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            '@id': `${url}#faq`,
            mainEntity: article.faq.map(({ q, a }) => ({
              '@type': 'Question',
              name: q,
              acceptedAnswer: { '@type': 'Answer', text: a },
            })),
          },
        ]
      : []),
  ]
}

export function serializeStructuredData(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
