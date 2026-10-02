'use client'
import type { ReactNode } from 'react'
import { usePreferences } from './preferences'
import { isDirectMerchantUrl, isSafeAffiliateUrl } from '@/lib/affiliate'
import { maskedHref } from '@/lib/linkmask-paths'

export function AffiliateLink({
  url,
  affiliateUrl,
  maskedSlug,
  children,
  className = 'button',
  demo = false,
}: {
  url: string
  affiliateUrl?: string
  maskedSlug?: string
  children: ReactNode
  className?: string
  demo?: boolean
}) {
  const { state } = usePreferences()
  if (demo || !isDirectMerchantUrl(url))
    return (
      <span className={`${className} disabled-link`} aria-disabled="true">
        {demo ? 'Demo · ikke til salg' : 'Linket er ikke tilgængeligt'}
      </span>
    )
  const tracked =
    state.decided &&
    state.marketing &&
    !!affiliateUrl &&
    isSafeAffiliateUrl(affiliateUrl)
  return (
    <a
      className={className}
      href={
        tracked ? (maskedHref(maskedSlug, affiliateUrl) ?? affiliateUrl) : url
      }
      rel="sponsored nofollow noopener noreferrer"
      target="_blank"
    >
      {children}
      <span className="sr-only"> (reklamelink, åbner i ny fane)</span>
    </a>
  )
}
