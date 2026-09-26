'use client'
import { useState } from 'react'
import type { Deal } from '@/lib/types'
import { isActiveDeal } from '@/lib/deals'
import { AffiliateLink } from './affiliate-link'
import { Icon } from './icons'
export function Deals({ deals }: { deals: Deal[] }) {
  const [status, setStatus] = useState('')
  const active = deals.filter((d) => d.demo || isActiveDeal(d))
  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setStatus(`Koden ${code} er kopieret.`)
    } catch {
      setStatus(
        `Kopiering er ikke tilgængelig. Markér og kopiér koden ${code} manuelt.`,
      )
    }
  }
  return (
    <>
      <p role="status" className="copy-status">
        {status}
      </p>
      <div className="deal-grid">
        {active.map((d) => (
          <article className="deal-card" key={d.id}>
            <div className="deal-top">
              <span className="deal-symbol">{d.code ? '%' : '↗'}</span>
              <p className="eyebrow">
                {d.merchant}
                {d.demo && <span className="demo-tag">DEMO</span>}
              </p>
            </div>
            <h2>{d.title}</h2>
            <p>{d.description}</p>
            {d.code && (
              <div className="coupon">
                <code>{d.code}</code>
                <button onClick={() => copy(d.code!)}>Kopiér kode</button>
              </div>
            )}
            <p className="deal-expiry">
              {d.demo
                ? 'Eksempel på kampagne'
                : `Udløber ${new Date(d.expiresAt).toLocaleDateString('da-DK', { timeZone: 'Europe/Copenhagen' })}`}
            </p>
            <details>
              <summary>Vilkår for tilbuddet</summary>
              <p>{d.terms}</p>
            </details>
            <AffiliateLink
              url={d.url}
              affiliateUrl={d.affiliateUrl}
              demo={d.demo}
            >
              Se tilbud hos butik <Icon name="arrow" size={16} />
            </AffiliateLink>
          </article>
        ))}
      </div>
      {!active.length && (
        <div className="empty-state">
          <h2>Ingen aktive tilbud lige nu</h2>
          <p>Vi viser kun kampagner inden for deres gyldighedsperiode.</p>
        </div>
      )}
    </>
  )
}
