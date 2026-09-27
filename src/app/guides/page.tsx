import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getGuides } from '@/lib/guides'
import { withBasePath } from '@/lib/paths'

export const metadata: Metadata = {
  title: 'Købsguides',
  description:
    'Enkle overvejelser, der hjælper dig med at vælge kaffeudstyr, belysning og produkter til hjemmekontoret.',
  alternates: { canonical: '/guides' },
}

export default function GuidesPage() {
  const guides = getGuides()
  return (
    <div className="container">
      <header className="page-heading">
        <span className="eyebrow">Lidt viden. Bedre valg.</span>
        <h1>Find det, der passer til dig.</h1>
        <p className="lead">
          Gode køb begynder med de rigtige spørgsmål. Her får du praktiske råd
          til de ting, du bruger i hverdagen.
        </p>
      </header>
      <div className="guide-grid">
        {guides.map((guide) => (
          <Link
            href={`/guides/${guide.slug}`}
            className="guide-card"
            key={guide.slug}
          >
            <Image
              src={withBasePath(guide.image)}
              alt=""
              width={1200}
              height={800}
            />
            <div className="guide-card-content">
              <span className="eyebrow">{guide.category}</span>
              <h2>{guide.title}</h2>
              <p>{guide.description}</p>
              <span>
                {guide.readingTime} min. læsning{' '}
                <span aria-hidden="true">↗</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
      <aside className="info-panel">
        <h2>Et godt udgangspunkt</h2>
        <p>
          Vores guides hjælper dig med at stille spørgsmål og sammenligne. De er
          ikke produkttests. Kontrollér altid den konkrete models oplysninger
          hos forhandleren.
        </p>
        <Link href="/om">
          Læs om vores tilgang <span aria-hidden="true">→</span>
        </Link>
      </aside>
    </div>
  )
}
