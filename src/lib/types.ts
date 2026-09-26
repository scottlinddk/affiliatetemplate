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
