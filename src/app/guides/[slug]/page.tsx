import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { site } from '@/config/site'
import { getGuide, getGuides } from '@/lib/guides'
import { withBasePath } from '@/lib/paths'

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return getGuides().map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = getGuide((await params).slug)
  if (!guide) return { title: 'Guiden blev ikke fundet' }
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      type: 'article',
      title: guide.title,
      description: guide.description,
      url: `/guides/${guide.slug}`,
      publishedTime: guide.date,
      images: [
        { url: guide.image, width: 1200, height: 800, alt: guide.title },
      ],
    },
  }
}

export default async function GuidePage({ params }: Props) {
  const guide = getGuide((await params).slug)
  if (!guide) notFound()
  const related = getGuides()
    .filter((other) => other.slug !== guide.slug)
    .slice(0, 2)

  return (
    <article className="container article">
      <nav className="breadcrumb" aria-label="Brødkrummer">
        <Link href="/">Forside</Link>
        <span aria-hidden="true">/</span>
        <Link href="/guides">Guides</Link>
        <span aria-hidden="true">/</span>
        <span>{guide.category}</span>
      </nav>
      <header className="page-heading">
        <span className="eyebrow">{guide.category}</span>
        <h1>{guide.title}</h1>
        <p className="lead">{guide.description}</p>
        <p>
          <time dateTime={guide.date}>
            {new Intl.DateTimeFormat('da-DK', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC',
            }).format(new Date(guide.date))}
          </time>{' '}
          · {guide.readingTime} min. læsning
        </p>
      </header>
      <Image
        className="article-image"
        src={withBasePath(guide.image)}
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
      <div className="prose">
        <ReactMarkdown
          skipHtml
          allowedElements={[
            'h2',
            'h3',
            'h4',
            'p',
            'a',
            'strong',
            'em',
            'ul',
            'ol',
            'li',
            'blockquote',
            'br',
            'hr',
            'code',
            'pre',
          ]}
          components={{
            a: ({ href, children }) =>
              href?.startsWith('/') && !href.startsWith('//') ? (
                <Link href={href}>{children}</Link>
              ) : (
                <a href={href} rel="noopener noreferrer">
                  {children}
                </a>
              ),
          }}
        >
          {guide.content}
        </ReactMarkdown>
      </div>
      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Mere inspiration</span>
            <h2>Et godt valg mere.</h2>
          </div>
          <Link href="/guides">
            Alle guides <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="guide-grid">
          {related.map((other) => (
            <Link
              href={`/guides/${other.slug}`}
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
                <span className="eyebrow">{other.category}</span>
                <h3>{other.title}</h3>
                <p>{other.description}</p>
                <span>
                  {other.readingTime} min. læsning{' '}
                  <span aria-hidden="true">↗</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </article>
  )
}
