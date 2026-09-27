import type { Metadata } from 'next'
import { DesignStudio } from '@/components/design-studio'
import { getCatalog } from '@/lib/catalog'
import './design.css'

export const metadata: Metadata = {
  title: 'Designværksted',
  description:
    'Prøv farver, typografi og former, og hent dit eget design til skabelonen.',
  robots: { index: false, follow: false },
}

export default async function DesignPage() {
  const catalog = await getCatalog()
  return <DesignStudio products={catalog.products.slice(0, 2)} />
}
