'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { site } from '@/config/site'
import { usePreferences } from './preferences'
import { Icon } from './icons'
export function Header() {
  const pathname = usePathname()
  const { state } = usePreferences()
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="logo" href="/" aria-label={`${site.name} – forside`}>
          <span className="logo-mark">
            <Icon name="leaf" size={22} />
          </span>
          {site.name}
          <span className="logo-dot">.</span>
        </Link>
        <nav aria-label="Hovednavigation">
          {[
            ['/produkter', 'Produkter'],
            ['/guides', 'Købsguides'],
            ['/tilbud', 'Tilbud'],
            ['/om', 'Om os'],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname.startsWith(href) ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link
          className="compare-nav"
          href="/sammenlign"
          aria-label={`Sammenlign produkter (${state.compare.length} valgt)`}
        >
          <Icon name="compare" />
          <span>Sammenlign</span>
          <span className="count">{state.compare.length}</span>
        </Link>
      </div>
    </header>
  )
}
