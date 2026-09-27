/** Preserve actual stock data; an unknown value must not become InStock. */
export function schemaAvailability(inStock: unknown): string | undefined {
  if (inStock === true) return 'https://schema.org/InStock'
  if (inStock === false) return 'https://schema.org/OutOfStock'
  return undefined
}
