import { expect, test } from '@playwright/test'

test('editorial routes are discoverable and retain their own canonical URLs', async ({
  page,
  request,
}) => {
  for (const [path, heading] of [
    ['/guides', 'Købsguides'],
    ['/anmeldelser', 'Anmeldelser'],
    ['/sammenligninger', 'Sammenligninger'],
    ['/artikler', 'Artikler'],
  ]) {
    await page.goto(path)
    await expect(
      page.getByRole('heading', { level: 1, name: heading }),
    ).toBeVisible()
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`${path}$`),
    )
    await expect(
      page.getByRole('navigation', { name: 'Indholdstyper' }).getByRole('link'),
    ).toHaveCount(4)
  }
  await page.goto('/guides')
  const href = await page.locator('.guide-card').first().getAttribute('href')
  expect(href).toBeTruthy()
  await page.goto(href!)
  const title = await page.getByRole('heading', { level: 1 }).innerText()
  await expect(
    page.getByRole('navigation', { name: 'Brødkrummer' }).getByText(title),
  ).toBeVisible()
  const structured = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      'null',
  )
  expect(structured[0]['@type']).toBe('Article')
  expect(structured[0].headline).toBe(title)
  expect(structured[1]['@type']).toBe('BreadcrumbList')
  expect(structured[1].itemListElement[2].item).toContain(href!)
  const html = await (await request.get(href!)).text()
  expect(html).toContain('application/ld+json')
  expect(html).toContain(title)
  expect(
    (await request.get(href!.replace('/guides/', '/anmeldelser/'))).status(),
  ).toBe(404)
})
