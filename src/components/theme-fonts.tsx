'use client'

import { useEffect } from 'react'
import { googleFontStylesheets, type GoogleFont } from '@/lib/google-fonts'

/** Preview resources have an explicit lifetime; selecting local fonts removes them. */
export function ThemeFonts({ fonts }: { fonts?: readonly GoogleFont[] }) {
  const stylesheetKey = googleFontStylesheets(fonts).join('\n')

  useEffect(() => {
    const ownedLinks: HTMLLinkElement[] = []
    for (const href of stylesheetKey.split('\n').filter(Boolean)) {
      const existing = Array.from(
        document.head.querySelectorAll<HTMLLinkElement>(
          'link[rel="stylesheet"]',
        ),
      ).some((link) => link.href === href)
      if (existing) continue
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.dataset.themeFont = 'preview'
      document.head.appendChild(link)
      ownedLinks.push(link)
    }
    return () => {
      for (const link of ownedLinks) link.remove()
    }
  }, [stylesheetKey])

  return null
}
