import type { Metadata } from 'next'
import Link from 'next/link'
import { site } from '@/config/site'
import { getCatalog } from '@/lib/catalog'

export const metadata: Metadata = {
  title: 'Om os & reklamelinks',
  description: `Læs hvordan ${site.name} udvælger produkter, viser priser og tjener penge på reklamelinks.`,
  alternates: { canonical: '/om' },
}

export default async function AboutPage() {
  const { mode } = await getCatalog()
  return (
    <div className="container article">
      <header className="page-heading">
        <span className="eyebrow">Om {site.name}</span>
        <h1>Gode valg kræver klare svar.</h1>
        <p className="lead">
          Vi samler produkter, forhandlerpriser og praktiske købsguides, så du
          kan undersøge dine muligheder ét sted.
        </p>
      </header>
      <div className="legal-grid">
        <section className="info-panel">
          <span className="eyebrow">Åbenhed først</span>
          <h2>Vi bruger reklamelinks</h2>
          <p>
            {site.affiliateDisclosure} Et køb foretages altid hos forhandleren,
            som håndterer betaling, levering og kundeservice.
          </p>
        </section>
        <section className="info-panel">
          <span className="eyebrow">Dit eget valg</span>
          <h2>Du bestemmer, hvor du handler</h2>
          <p>
            Du kan sammenligne de viste tilbud og besøge forhandleren.
            Reklamelinks via Partner-ads bruges kun, når du har valgt at tillade
            dem. Du kan ændre dit valg nederst på siden.
          </p>
        </section>
      </div>
      <div className="prose">
        <h2>Sådan er udvalget sammensat</h2>
        <p>
          Udvalget bygger på de produkter og forhandlere, som er tilføjet til
          sidens katalog. Det er ikke en fuldstændig oversigt over markedet. En
          placering blandt udvalgte produkter er et redaktionelt valg, ikke en
          testplacering eller en garanti for den laveste pris.
        </p>
        <p>
          Købsguides beskriver generelle overvejelser. Vi påstår ikke at have
          testet produkterne og viser ikke konstruerede anmeldelser eller
          stjerner. Produktbeskrivelser og specifikationer skal kontrolleres hos
          den konkrete forhandler.
        </p>
        <h2>Priser og tilgængelighed</h2>
        <p>
          {site.priceDisclaimer} Når en leveringspris ikke er oplyst, indgår den
          ikke i den viste sammenligning. Tilbud med for gamle prisoplysninger
          vises ikke som aktuelle købsmuligheder.
        </p>
        <p>
          Datakilden kan opdatere sig mellem dit besøg her og dit besøg hos
          forhandleren. En rabatkode kan have betingelser og en udløbsdato;
          kontrollér, at rabatten er lagt til i forhandlerens checkout.
        </p>
        {(mode === 'demo' || site.showcase) && (
          <>
            <h2>En skabelon, du kan gøre til din egen</h2>
            <p>
              {mode === 'demo'
                ? 'Dette website demonstrerer en affiliate-skabelon med fiktive produkter, priser, butikker og tilbud. Eksemplerne dokumenterer funktionerne og er ikke verificerede købstilbud.'
                : 'Dette website viser en affiliate-skabelon med rigtige produkter og forhandlerpriser. Produktdata og reklamelinks hentes fra de tilknyttede forhandleres feeds via Partner-ads.'}{' '}
              I <Link href="/design">designværkstedet</Link> kan du afprøve
              skabelonens farver, skrifttyper og færdige design.
            </p>
          </>
        )}
        <h2>Kontakt og udgiver</h2>
        <p>Udgiver: {site.publisher}.</p>
        {site.contactEmail ? (
          <p>
            Spørgsmål eller en oplysning, der skal rettes? Skriv til{' '}
            <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
          </p>
        ) : (
          <p>
            Der er endnu ikke oplyst en kontaktadresse på siden. Spørgsmål om
            køb, levering og reklamation skal rettes til forhandleren.
          </p>
        )}
        <p>
          <Link href="/privatliv">
            Læs om privatliv og dine valg <span aria-hidden="true">→</span>
          </Link>
        </p>
      </div>
    </div>
  )
}
