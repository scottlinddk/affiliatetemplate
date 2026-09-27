import { ArticleList } from '@/components/article-list'
export const metadata = {
  title: 'Sammenligninger',
  alternates: { canonical: '/sammenligninger' },
}
export default function Page() {
  return <ArticleList type="comparison" />
}
