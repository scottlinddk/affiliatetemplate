import Link from 'next/link'
import { getCatalog } from '@/lib/catalog'
import { getGuides } from '@/lib/guides'
import { contentPath } from '@/lib/content-paths'
import { ProductCard } from '@/components/product-card'
import { Icon } from '@/components/icons'
import { getCategories } from '@/lib/categories'
import { BannerPlacement } from '@/components/banner'
import { withBasePath } from '@/lib/paths'
export const revalidate = 3600
export const metadata = { alternates: { canonical: '/' } }
export default async function Home() {
  const catalog = await getCatalog()
  const guides = getGuides()
    .filter((article) => article.type === 'guide')
    .slice(0, 3)
  const featured = [...catalog.products]
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured))
    .slice(0, 4)
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <p className="eyebrow">
            <span /> MINDRE SØGEN. BEDRE VALG.
          </p>
          <h1>
            Find det, der gør
            <br />
            hverdagen <em>bedre.</em>
          </h1>
          <p className="hero-description">
            Fra den første kop kaffe til det sidste læselys.
            <br className="desktop-break" /> Find inspiration, sammenlign
            priser, og vælg med ro i maven.
          </p>
          <div className="hero-buttons">
            <Link href="/produkter" className="button">
              Udforsk produkter <Icon name="arrow" size={18} />
            </Link>
            <Link href="/guides" className="hero-text-link">
              Find din næste købsguide <span>↗</span>
            </Link>
          </div>
          <div className="hero-points">
            <span>
              <Icon name="check" size={16} />
              Priser på tværs af butikker
            </span>
            <span>
              <Icon name="check" size={16} />
              Plads til at vælge rigtigt
            </span>
          </div>
        </div>
        <div className="hero-art">
          <div className="hero-art-label">
            <span>HVERDAGENS SMÅ OPGRADERINGER</span>
            <Icon name="leaf" size={20} />
          </div>
          <img
            src={withBasePath('/images/hero.svg')}
            alt="Illustration af en hyggelig kaffekrog med lampe, kaffekande og kop"
            width="760"
            height="650"
            fetchPriority="high"
          />
          <div className="hero-art-caption">
            <span>Et hjem, der føles som dig.</span>
            <span>HVERDAG / INSPIRATION</span>
          </div>
        </div>
      </section>
      <div className="trust-strip">
        <div className="container">
          <span>
            <Icon name="search" /> Find nye favoritter
          </span>
          <span>
            <Icon name="compare" /> Sammenlign dine muligheder
          </span>
          <span>
            <Icon name="leaf" /> Vælg med omtanke
          </span>
        </div>
      </div>
      <section className="container section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">HVAD LEDER DU EFTER?</p>
            <h2>Små valg. Stor forskel.</h2>
          </div>
          <Link href="/produkter" className="text-link">
            Se alle produkter <Icon name="arrow" size={16} />
          </Link>
        </div>
        <div className="category-grid">
          {getCategories(catalog.products)
            .slice(0, 4)
            .map((c) => (
              <Link
                className="category-card"
                href={`/kategorier/${c.slug}`}
                key={c.slug}
              >
                <div>
                  <h3>{c.name}</h3>
                  <p>{c.count} produkter at udforske</p>
                  <span className="round-link">
                    <Icon name="arrow" size={17} />
                  </span>
                </div>
                <img
                  src={withBasePath(c.image)}
                  alt=""
                  width="150"
                  height="170"
                />
              </Link>
            ))}
        </div>
      </section>
      <section className="container section featured-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">TIL LIVET, DU LEVER</p>
            <h2>Gå på opdagelse</h2>
          </div>
          <Link href="/produkter" className="text-link">
            Udforsk udvalget <Icon name="arrow" size={16} />
          </Link>
        </div>
        {catalog.mode === 'demo' && (
          <p className="demo-notice">
            Du ser en demo med fiktive produkter, butikker og priser. Ingen
            produkter kan købes her.
          </p>
        )}
        {catalog.warnings.map((w) => (
          <p className="info-panel" role="status" key={w}>
            {w}
          </p>
        ))}
        <div className="product-grid home-products">
          {featured.map((p) => (
            <ProductCard product={p} key={p.id} />
          ))}
        </div>
        {!featured.length && (
          <p className="empty-state">
            Der er ingen produkter at vise lige nu. Kig gerne forbi igen.
          </p>
        )}
      </section>
      <BannerPlacement placement="home" />
      <section className="editorial-section">
        <div className="container section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LIDT VIDEN GØR EN FORSKEL</p>
              <h2>Bliv klogere, før du vælger.</h2>
            </div>
            <Link href="/guides" className="text-link">
              Alle købsguides <Icon name="arrow" size={16} />
            </Link>
          </div>
          <div className="guide-grid">
            {guides.map((g) => (
              <Link href={contentPath(g)} className="guide-card" key={g.slug}>
                <img
                  src={withBasePath(g.image)}
                  alt=""
                  width="640"
                  height="420"
                />
                <div className="guide-card-content">
                  <p className="eyebrow">
                    {g.category} · {g.readingTime} min.
                  </p>
                  <h3>{g.title}</h3>
                  <p>{g.description}</p>
                  <span className="text-link">
                    Læs guiden <Icon name="arrow" size={16} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="container about-band">
        <div className="about-emblem">
          <Icon name="leaf" size={36} />
        </div>
        <div>
          <p className="eyebrow">ET GENNEMSIGTIGT VALG</p>
          <h2>Du vælger. Vi gør overblikket lettere.</h2>
          <p>
            Vi samler produkter og praktiske råd, så du kan tage dit eget valg.
            Nogle links er reklamelinks, og vi fortæller altid, hvordan siden er
            finansieret.
          </p>
        </div>
        <Link href="/om" className="button button-secondary">
          Lær os at kende <Icon name="arrow" size={16} />
        </Link>
      </section>
    </>
  )
}
