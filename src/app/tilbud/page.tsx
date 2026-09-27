import { getDeals } from '@/lib/deals'
import { Deals } from '@/components/deals'
import { getCatalog } from '@/lib/catalog'
export const revalidate = 3600
export const metadata = {
  title: 'Tilbud og rabatkoder',
  description: 'Find aktuelle kampagner og rabatkoder fra vores forhandlere.',
  alternates: { canonical: '/tilbud' },
}
export default async function DealsPage() {
  const { mode } = await getCatalog()
  return (
    <div className="container section">
      <div className="page-heading">
        <p className="eyebrow">LIDT MERE FOR PENGENE</p>
        <h1>Gode fund. Gode vilkår.</h1>
        <p className="lead">
          Se kampagner og rabatkoder, og læs altid betingelserne hos
          forhandleren.
        </p>
      </div>
      <p className="small-print">
        Reklame · Vi kan modtage provision via links. En rabatkode garanterer
        ikke den laveste pris.
      </p>
      <Deals deals={getDeals(mode)} />
    </div>
  )
}
