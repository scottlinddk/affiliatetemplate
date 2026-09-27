import configuredBanners from '../data/banners.json'
import { getBannerForPlacement } from './banners'

/** Reserve both banner images and their consent-free text fallbacks. */
export function validateArticlePolicy(
  affiliateTextLinks: number,
  source: string,
  banners: unknown = configuredBanners,
): void {
  const bannerCount = (['article-inline', 'article-end'] as const).filter(
    (placement) => getBannerForPlacement(placement, banners),
  ).length
  // Deliberately keep the same conservative limit for all editorial types,
  // including guides/comparisons for which the network allows exceptions.
  if (bannerCount > 5 || affiliateTextLinks + bannerCount > 5) {
    throw new Error(
      `Article "${source}" exceeds the 5-banner/5-text-link page budget: ${affiliateTextLinks} directive links + ${bannerCount} banner fallbacks. Remove a directive or banner, or reduce the offer table.`,
    )
  }
}
