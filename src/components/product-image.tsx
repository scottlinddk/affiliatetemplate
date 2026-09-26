'use client'
import { useState } from 'react'
export function ProductImage({
  src,
  alt,
  eager = false,
}: {
  src: string
  alt: string
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)
  return (
    <img
      src={failed ? '/images/placeholder.svg' : src}
      alt={alt}
      width="640"
      height="520"
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
    />
  )
}
