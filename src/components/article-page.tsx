import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { site } from '@/config/site'
import { getValidatedArticles } from '@/lib/articles'
import { getRelatedGuides } from '@/lib/guides'
import { contentPath, contentSection } from '@/lib/content-paths'
import {
  articleMetadata,
  articleStructuredData,
  serializeStructuredData,
} from '@/lib/article-seo'
import type { ContentType } from '@/lib/types'
import { withBasePath } from '@/lib/paths'
import { ArticleMarkdown } from './article-markdown'
import { BannerPlacement } from './banner'

function formatDate(date: string) {
  return new Intl.DateTimeFormat('da-DK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date))
}

export async function generateArticleMetadata(type: ContentType, slug: string) {
  const { articles } = await getValidatedArticles()
  const article = articles.find(
    (entry) => entry.slug === slug && entry.type === type,
  )
  return article
    ? articleMetadata(article)
    : { title: 'Artiklen blev ikke fundet' }
}

export async function ArticlePage({
  type,
  slug,
}: {
  type: ContentType
  slug: string
}) {
  const { articles, catalog } = await getValidatedArticles()
  const article = articles.find(
    (entry) => entry.slug === slug && entry.type === type,
  )
  if (!article) notFound()
  const section = contentSection(type)
  const related = getRelatedGuides(article, articles)
  const pillar = articles.find((entry) => entry.slug === article.pillar)

  return (
    <article className="container article">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(articleStructuredData(article)),
        }}
      />
      <nav className="breadcrumb" aria-label="Brødkrummer">
        <Link href="/">Forside</Link>
        <span aria-hidden="true">/</span>
        <Link href={section.path}>{section.label}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{article.title}</span>
      </nav>
      <header className="page-heading">
        <span className="eyebrow">{article.category}</span>
        <h1>{article.title}</h1>
        <p className="lead">{article.description}</p>
        {article.author && (
          <p className="article-author">Af {article.author}</p>
        )}
        <p>
          Udgivet{' '}
          <time dateTime={article.date}>{formatDate(article.date)}</time>
          {article.updated && (
            <>
              {' '}
              · Opdateret{' '}
              <time dateTime={article.updated}>
                {formatDate(article.updated)}
              </time>
            </>
          )}{' '}
          · {article.readingTime} min. læsning
        </p>
      </header>
      <Image
        className="article-image"
        src={withBasePath(article.image)}
        alt=""
        width={1200}
        height={800}
        priority
      />
      <aside className="info-panel">
        <p>
          {site.affiliateDisclosure} <Link href="/om">Sådan arbejder vi.</Link>
        </p>
      </aside>
      {pillar && (
        <p className="article-pillar">
          Læs også vores overblik:{' '}
          <Link href={contentPath(pillar)}>{pillar.title}</Link>
        </p>
      )}
      <BannerPlacement placement="article-inline" />
      <div className="prose">
        <ArticleMarkdown
          content={article.content}
          products={catalog.products}
        />
        {article.verdict && (
          <section aria-labelledby="article-verdict">
            <h2 id="article-verdict">Vores vurdering</h2>
            <p>{article.verdict}</p>
          </section>
        )}
        {!!article.products?.length && (
          <section aria-labelledby="article-products">
            <h2 id="article-products">Produkter i artiklen</h2>
            <ul>
              {article.products.map((slug) => {
                const product = catalog.products.find(
                  (product) => product.slug === slug,
                )!
                return (
                  <li key={slug}>
                    <Link href={`/produkter/${slug}`}>{product.name}</Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
        {!!article.faq?.length && (
          <section aria-labelledby="article-faq">
            <h2 id="article-faq">Ofte stillede spørgsmål</h2>
            {article.faq.map(({ q, a }) => (
              <div key={q}>
                <h3>{q}</h3>
                <p>{a}</p>
              </div>
            ))}
          </section>
        )}
        {!!article.sources?.length && (
          <section aria-labelledby="article-sources">
            <h2 id="article-sources">Kilder</h2>
            <ul>
              {article.sources.map(({ title, url }) => (
                <li key={url}>
                  <a href={url} rel="noopener noreferrer">
                    {title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <BannerPlacement placement="article-end" />
      {!!related.length && (
        <section>
          <div className="section-heading">
            <h2>Læs også</h2>
            <Link href={section.path}>
              Alle {section.label.toLowerCase()} →
            </Link>
          </div>
          <div className="guide-grid">
            {related.map((other) => (
              <Link
                href={contentPath(other)}
                key={other.slug}
                className="guide-card"
              >
                <Image
                  src={withBasePath(other.image)}
                  alt=""
                  width={1200}
                  height={800}
                />
                <div className="guide-card-content">
                  <span className="eyebrow">
                    {contentSection(other.type).label} · {other.category}
                  </span>
                  <h3>{other.title}</h3>
                  <p>{other.description}</p>
                  <span>{other.readingTime} min. læsning ↗</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
