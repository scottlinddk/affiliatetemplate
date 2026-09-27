import Image from 'next/image'
import Link from 'next/link'
import { getGuides } from '@/lib/guides'
import { contentPath, contentSection } from '@/lib/content-paths'
import type { ContentType } from '@/lib/types'
import { withBasePath } from '@/lib/paths'

export function ArticleList({ type }: { type: ContentType }) {
  const articles = getGuides().filter((article) => article.type === type)
  const section = contentSection(type)
  return (
    <div className="container">
      <header className="page-heading">
        <span className="eyebrow">Viden til dit næste valg</span>
        <h1>{section.label}</h1>
        <p className="lead">
          Råd, vurderinger og kilder, der hjælper dig med at vælge.
        </p>
      </header>
      <nav className="content-navigation" aria-label="Indholdstyper">
        {(['guide', 'review', 'comparison', 'post'] as const).map((entry) => {
          const section = contentSection(entry)
          return (
            <Link
              key={entry}
              href={section.path}
              aria-current={type === entry ? 'page' : undefined}
            >
              {section.label}
            </Link>
          )
        })}
      </nav>
      <div className="guide-grid">
        {articles.map((article) => (
          <Link
            href={contentPath(article)}
            key={article.slug}
            className="guide-card"
          >
            <Image
              src={withBasePath(article.image)}
              alt=""
              width={1200}
              height={800}
            />
            <div className="guide-card-content">
              <span className="eyebrow">{article.category}</span>
              <h2>{article.title}</h2>
              <p>{article.description}</p>
              <span>{article.readingTime} min. læsning ↗</span>
            </div>
          </Link>
        ))}
      </div>
      {!articles.length && (
        <p className="empty-state">Der er endnu ikke udgivet indhold her.</p>
      )}
      <aside className="info-panel">
        <p>
          Læs om vores metode, erfaringer og brug af kilder.{' '}
          <Link href="/om">Sådan arbejder vi →</Link>
        </p>
      </aside>
    </div>
  )
}
