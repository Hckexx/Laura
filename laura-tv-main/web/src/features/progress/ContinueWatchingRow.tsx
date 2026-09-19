import { Link } from 'react-router-dom'
import { getPosterUrl } from '../../services/media-api'
import { buildContinueWatchingHref, type ContinueWatchingRecord } from './storage'

type Props = {
  records: ContinueWatchingRecord[]
  onRemove: (record: ContinueWatchingRecord) => void
}

export default function ContinueWatchingRow({ records, onRemove }: Props) {
  if (records.length === 0) return null

  return (
    <section className="mb-12">
      <h2 className="mb-4 px-4 text-lg font-bold tracking-tight text-gray-100 sm:px-6 sm:text-xl lg:px-8">
        Continue Watching
      </h2>
      <div className="flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-8 scrollbar-none">
        {records.map((record) => {
          const posterUrl = getPosterUrl(record.posterPath)
          const hasProgress = record.positionSeconds !== undefined && record.durationSeconds !== undefined && record.durationSeconds > 0
          const progress = hasProgress ? Math.min(100, (record.positionSeconds! / record.durationSeconds!) * 100) : 0
          return (
            <article key={`${record.mediaType}:${record.mediaId}`} className="relative flex h-40 w-[18rem] shrink-0 snap-start overflow-hidden rounded-2xl bg-[#13171c] sm:w-[21rem]">
              <Link to={buildContinueWatchingHref(record)} aria-label={`Resume ${record.title}`} className="flex min-w-0 flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/50">
                <div className="relative w-[6.7rem] shrink-0 bg-[#1a1f26]">
                  {posterUrl ? <img src={posterUrl} alt="" className="h-full w-full object-cover" /> : null}
                  <span className="absolute bottom-3 left-3 grid h-8 w-8 place-items-center rounded-full bg-amber-400 text-[#17120a]" aria-hidden="true">
                    <svg className="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center p-4">
                  <h3 className="line-clamp-2 text-sm font-bold leading-5 text-gray-100">{record.title}</h3>
                  <p className="mt-1 truncate text-[11px] text-gray-400">
                    {record.mediaType === 'tv' && record.season !== undefined && record.episode !== undefined
                      ? `S${record.season} E${record.episode}${record.episodeName ? ` · ${record.episodeName}` : ''}`
                      : record.mediaType === 'movie' ? 'Movie' : 'Series'}
                  </p>
                  <span className="mt-4 text-[11px] font-semibold text-amber-300">{hasProgress ? 'Resume' : 'Continue watching'}</span>
                  {hasProgress && <span className="mt-2 h-1 overflow-hidden rounded-full bg-[#242a33]"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${progress}%` }} /></span>}
                </div>
              </Link>
              <button type="button" onClick={() => onRemove(record)} aria-label={`Remove ${record.title} from Continue Watching`} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/75 text-gray-300 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
