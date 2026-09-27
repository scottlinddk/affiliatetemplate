import { ArticleList } from '@/components/article-list'
export const metadata = {
  title: 'Artikler',
  alternates: { canonical: '/artikler' },
}
export default function Page() {
  return <ArticleList type="post" />
}
