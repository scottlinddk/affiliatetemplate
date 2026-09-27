import type { Metadata } from 'next'
import Link from 'next/link'
import { site } from '@/config/site'

export const metadata: Metadata = {
  title: 'Privatliv & dine valg',
  description: `Læs om lokal lagring, eksterne billeder og dit valg af reklamelinks på ${site.name}.`,
  alternates: { canonical: '/privatliv' },
}

export default function PrivacyPage() {
  return (
    <div className="container article">
      <header className="page-heading">
        <span className="eyebrow">Privatliv</span>
        <h1>Du har et valg.</h1>
        <p className="lead">
          Her kan du læse, hvad denne skabelon gemmer i din browser, og hvad der
          sker, når du besøger en forhandler.
        </p>
      </header>
      <aside className="info-panel">
        <h2>Indstillinger, du kan ændre</h2>
        <p>
          Brug “Privatlivsindstillinger” i bunden af siden for at ændre dit valg
          om reklamelinks. Et afslag forhindrer ikke, at du kan læse guider
          eller sammenligne produkter.
        </p>
      </aside>
      <div className="prose">
        <h2>Hvem står bag siden?</h2>
        <p>Udgiver: {site.publisher}.</p>
        {site.contactEmail ? (
          <p>
            Du kan kontakte udgiveren på{' '}
            <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> om
            sidens behandling af oplysninger.
          </p>
        ) : (
          <p>
            Dette er en demo. Ejeren skal indsætte korrekte oplysninger om
            udgiver og kontakt, før siden lanceres.
          </p>
        )}
        <h2>Det gemmer vi i browseren</h2>
        <p>
          Dit valg om reklamelinks gemmes lokalt i browseren, så vi kan huske
          det ved senere besøg. Dine favoritter og valgte produkter til
          sammenligning gemmes også lokalt, når du bruger de funktioner.
          Oplysningerne synkroniseres ikke til en brugerkonto.
        </p>
        <p>
          Du kan ændre valget via “Privatlivsindstillinger” eller fjerne den
          lokale lagring i browserens indstillinger. Sletter du browserens
          webstedsdata, forsvinder dine gemte valg og favoritter også.
        </p>
        <h2>Reklamelinks og Partner-ads</h2>
        <p>
          Hvis du tillader reklamelinks og klikker på et tilbud med et
          Partner-ads-link, går besøget via Partner-ads til forhandleren.
          Partner-ads og forhandleren kan behandle oplysninger om klikket og
          bruge cookies eller lignende teknologi til at tilskrive et eventuelt
          køb til dette website.
        </p>
        <p>
          Uden dit tilvalg bruger siden et direkte link til forhandleren. Et
          tilbud uden en gyldig direkte destination kan ikke åbnes. Du kan
          trække dit tilvalg tilbage via indstillingerne; det ændrer fremtidige
          links, men sletter ikke oplysninger eller cookies, der allerede ligger
          hos tredjeparter.
        </p>
        <p>
          Læs også{' '}
          <a
            href="https://www.partner-ads.com/dk/persondatapolitik_txt_aff.php"
            rel="noopener noreferrer"
          >
            Partner-ads’ information om databehandling ved reklamelinks
          </a>{' '}
          og den relevante forhandlers egen privatlivs- og cookieinformation.
        </p>
        <h2>Analyseværktøjer og billeder</h2>
        <p>
          Skabelonen installerer ingen tredjepartsanalyse, annoncepixels eller
          marketing-scripts. Der er ingen nyhedsbrevstilmelding,
          brugerregistrering eller kontaktformular i grundversionen.
        </p>
        <p>
          I demotilstand bruges lokale illustrationer. I et live produktkatalog
          kan billeder blive hentet direkte fra forhandlerens billedserver.
          Browseren sender da en almindelig forespørgsel til denne server, som
          blandt andet kan se din IP-adresse. Billeder kan hentes, uden at du
          har klikket på et reklamelink.
        </p>
        <p>
          Hvis ejeren har tilføjet godkendte reklamebannere, indlæses de
          eksterne bannerbilleder først, når du har tilladt affiliate-sporing.
          De kan hente indhold fra annoncørens server, som også kan modtage
          tekniske oplysninger om forespørgslen.
        </p>
        <h2>Skrifttyper</h2>
        <p>
          Hvis sidens design eller dit valg i designværkstedet bruger Google
          Fonts, henter browseren skrifttypestile fra fonts.googleapis.com og
          skrifttypefiler fra fonts.gstatic.com. Google modtager dermed tekniske
          oplysninger om forespørgslen, herunder din IP-adresse. Design med
          lokale skrifttyper sender ikke disse forespørgsler. Indlæsning af
          skrifttyper er separat fra dit valg om reklamelinks.
        </p>
        <h2>Drift og opbevaring</h2>
        <p>
          Den valgte hostingudbyder kan behandle tekniske oplysninger i
          forbindelse med levering af websitet, for eksempel serverlogs. Hvilke
          oplysninger der gemmes, hvor længe de gemmes, og hvem der modtager
          dem, afhænger af ejerens drift og aftaler.
        </p>
        <p>
          Før en offentlig lancering skal ejeren tilpasse denne tekst til den
          faktiske hosting, eventuelle nye integrationer, relevante rettigheder
          og kontaktmuligheder. Denne standardside beskriver skabelonens
          funktioner og er ikke i sig selv en vurdering af en konkret websites
          juridiske forpligtelser.
        </p>
        <p>
          <Link href="/om">
            Læs mere om reklamelinks og vores tilgang{' '}
            <span aria-hidden="true">→</span>
          </Link>
        </p>
      </div>
    </div>
  )
}
