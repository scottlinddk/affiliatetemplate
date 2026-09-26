import type { Product } from './types'
export type Category = {
  slug: string
  name: string
  description: string
  image: string
  count: number
}
export function categorySlug(name: string) {
  const readable =
    name
      .toLowerCase()
      .replace(/æ/g, 'ae')
      .replace(/ø/g, 'oe')
      .replace(/å/g, 'aa')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100) || 'kategori'
  return readable
}
export function getCategories(products: Product[]): Category[] {
  const names = [...new Set(products.map((p) => p.category))]
  return names.map((name) => {
    const base = categorySlug(name)
    const collisions = names.filter((n) => categorySlug(n) === base)
    // Stable deterministic suffix only when distinct labels have the same slug.
    const suffix =
      collisions.length > 1
        ? '-' +
          Array.from(name)
            .reduce(
              (hash, c) => (Math.imul(hash, 31) + c.charCodeAt(0)) >>> 0,
              0,
            )
            .toString(36)
        : ''
    const matching = products.filter((p) => p.category === name)
    return {
      slug: base + suffix,
      name,
      description:
        'Find og sammenlign produkter inden for ' +
        name.toLocaleLowerCase('da') +
        '.',
      image: matching[0]?.image || '/images/placeholder.svg',
      count: matching.length,
    }
  })
}
