import { ArticleList } from '@/components/article-list'
export const metadata = {
  title: 'Anmeldelser',
  alternates: { canonical: '/anmeldelser' },
}
export default function Page() {
  return <ArticleList type="review" />
}
