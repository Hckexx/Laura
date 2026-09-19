import { useEffect, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import ContentRow from '../../components/media/ContentRow'
import ContinueWatchingRow from '../progress/ContinueWatchingRow'
import { getContinueWatching, removeContinueWatching, type ContinueWatchingRecord } from '../progress/storage'
import { WATCH_CATEGORIES } from './categories'
import { fetchWatchCategory } from './category-service'

export default function WatchHub() {
  const [history, setHistory] = useState<ContinueWatchingRecord[]>([])
  const categoryQueries = useQueries({
    queries: WATCH_CATEGORIES.map((category) => ({
      queryKey: ['watch-category', category.id],
      queryFn: () => fetchWatchCategory(category),
      staleTime: 1000 * 60 * 10,
      retry: 1,
    })),
  })

  useEffect(() => {
    const refreshLocalRows = () => {
      setHistory(getContinueWatching())
    }
    refreshLocalRows()
    window.addEventListener('focus', refreshLocalRows)
    window.addEventListener('storage', refreshLocalRows)
    return () => {
      window.removeEventListener('focus', refreshLocalRows)
      window.removeEventListener('storage', refreshLocalRows)
    }
  }, [])

  const removeHistory = (record: ContinueWatchingRecord) => {
    setHistory(removeContinueWatching(record.mediaId, record.mediaType))
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="px-4 pb-8 pt-9 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-50 sm:text-4xl">Watch</h1>
        <p className="mt-2 text-sm text-gray-400">Movies, series, and your saved picks in one place.</p>
      </header>

      <ContinueWatchingRow records={history} onRemove={removeHistory} />
      {WATCH_CATEGORIES.map((category, index) => {
        const query = categoryQueries[index]
        if (query.isLoading) return (
          <section key={category.id} className="mb-12 px-4 sm:px-6 lg:px-8" aria-label={`${category.title} loading`}>
            <h2 className="mb-4 text-lg font-bold text-gray-100 sm:text-xl">{category.title}</h2>
            <div className="flex gap-4 overflow-hidden">{Array.from({ length: 6 }, (_, card) => <div key={card} className="aspect-[2/3] w-36 shrink-0 animate-pulse rounded-xl bg-[#171b21] sm:w-44" />)}</div>
          </section>
        )
        if (query.isError) return (
          <section key={category.id} className="mb-12 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4 rounded-xl bg-[#13171c] px-4 py-4">
              <p className="text-sm text-gray-300">{category.title} could not be loaded.</p>
              <button type="button" onClick={() => void query.refetch()} className="rounded-lg px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-400/10">Try again</button>
            </div>
          </section>
        )
        return <ContentRow key={category.id} title={category.title} items={query.data || []} />
      })}
    </div>
  )
}
