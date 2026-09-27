export type Offer = {
  id: string
  merchant: string
  price: number
  currency: string
  shipping?: number
  inStock: boolean
  url: string
  affiliateUrl?: string
  programId?: string
  updatedAt: string
}

export type Product = {
  id: string
  slug: string
  name: string
  brand: string
  category: string
  description: string
  image: string
  imageAlt: string
  features: string[]
  specs: Record<string, string>
  offers: Offer[]
  featured?: boolean
  demo?: boolean
}

export type Catalog = {
  products: Product[]
  mode: 'demo' | 'live'
  warnings: string[]
}

export type Deal = {
  id: string
  title: string
  merchant: string
  description: string
  code?: string
  startsAt: string
  expiresAt: string
  url: string
  affiliateUrl?: string
  terms: string
  demo?: boolean
}

export type ContentType = 'guide' | 'review' | 'comparison' | 'post'

export type ContentFaq = {
  q: string
  a: string
}

export type ContentSource = {
  title: string
  url: string
}

/** All editorial content retains one stable filename in content/guides. */
export type Guide = {
  slug: string
  type: ContentType
  title: string
  description: string
  category: string
  date: string
  updated?: string
  author?: string
  readingTime: number
  content: string
  image: string
  /** Only reviews and comparisons can declare products and a verdict. */
  products?: string[]
  verdict?: string
  faq?: ContentFaq[]
  sources?: ContentSource[]
  /** An explicit order overrides suggestions; [] disables the related block. */
  related?: string[]
  pillar?: string
}
