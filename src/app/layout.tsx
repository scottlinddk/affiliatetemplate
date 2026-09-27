import type { Metadata } from 'next'
import Link from 'next/link'
import { site } from '@/config/site'
import { Header } from '@/components/header'
import {
  ConsentSettings,
  PreferenceButton,
  PreferencesProvider,
} from '@/components/preferences'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} – ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: { type: 'website', locale: 'da_DK', siteName: site.name },
  twitter: { card: 'summary_large_image' },
  robots: process.env.PARTNER_ADS_FEEDS?.trim()
    ? { index: true, follow: true }
    : { index: false, follow: false },
}
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang={site.language} data-scroll-behavior="smooth">
      <body>
        <PreferencesProvider>
          <a href="#main" className="skip-link">
            Spring til indhold
          </a>
          <div className="announcement">
            {site.affiliateDisclosure}{' '}
            <Link href="/om">
              Læs mere <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <Header />
          <main id="main">{children}</main>
          <footer className="site-footer">
            <div className="container footer-grid">
              <div>
                <Link href="/" className="logo">
                  {site.name}
                  <span className="logo-dot">.</span>
                </Link>
                <p>
                  Gennemtænkte valg til din hverdag.
                  <br />
                  Produkter, priser og inspiration ét sted.
                </p>
              </div>
              <div>
                <h2>Find dit næste valg</h2>
                <Link href="/produkter">Alle produkter</Link>
                <Link href="/guides">Købsguides</Link>
                <Link href="/anmeldelser">Anmeldelser</Link>
                <Link href="/sammenligninger">Sammenligninger</Link>
                <Link href="/artikler">Artikler</Link>
                <Link href="/tilbud">Tilbud og rabatkoder</Link>
                <Link href="/sammenlign">Sammenlign produkter</Link>
              </div>
              <div>
                <h2>Godt at vide</h2>
                <Link href="/om">Om os og reklamelinks</Link>
                <Link href="/privatliv">Privatliv og cookies</Link>
                <PreferenceButton />
                {site.contactEmail && (
                  <a href={`mailto:${site.contactEmail}`}>Kontakt os</a>
                )}
              </div>
            </div>
            <div className="container footer-bottom">
              <span>
                © {new Date().getFullYear()} {site.publisher}
              </span>
              <p>{site.priceDisclaimer}</p>
            </div>
          </footer>
          <ConsentSettings />
        </PreferencesProvider>
      </body>
    </html>
  )
}
