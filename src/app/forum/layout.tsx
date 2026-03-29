import { ForumCategoryTabs } from '@/components/forum/forum-category-tabs'

export default function ForumLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold text-mountain-text">Форум</h1>
        <ForumCategoryTabs />
        {children}
      </div>
    </div>
  )
}
