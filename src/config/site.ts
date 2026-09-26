export const site = {
  name: 'Velvalgt',
  tagline: 'Gode valg. Mere hverdagsglæde.',
  description:
    'Find produkter til en bedre hverdag. Sammenlign priser, udforsk vores købsguides, og find det, der passer til dig.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  locale: 'da-DK',
  language: 'da',
  currency: 'DKK',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || '',
  publisher: process.env.NEXT_PUBLIC_PUBLISHER_NAME || 'Velvalgt (demo)',
  affiliateDisclosure:
    'Reklame: Siden indeholder reklamelinks. Vi kan modtage provision, når du handler via et link.',
  priceDisclaimer:
    'Priser og lagerstatus kan ændre sig. Den aktuelle pris og eventuelle leveringsomkostninger fremgår hos forhandleren.',
  maxPriceAgeDays: 7,
}
