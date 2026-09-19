import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  fetchMovieDetails,
  fetchMovieCredits,
  fetchSimilarMovies,
  fetchMovieVideos,
  getTrailerKey,
  getPosterUrl,
} from '../../services/media-api'
import MediaGrid from '../../components/media/MediaGrid'
import WatchlistButton from '../../components/media/WatchlistButton'

function MovieDetails() {
  const { id } = useParams<{ id: string }>()
  const movieId = Number(id)

  const { data: movie, isLoading: movieLoading } = useQuery({
    queryKey: ['movieDetails', movieId],
    queryFn: () => fetchMovieDetails(movieId),
    enabled: !!movieId,
  })

  const { data: credits } = useQuery({
    queryKey: ['movieCredits', movieId],
    queryFn: () => fetchMovieCredits(movieId),
    enabled: !!movieId,
  })

  const { data: similar } = useQuery({
    queryKey: ['similarMovies', movieId],
    queryFn: () => fetchSimilarMovies(movieId),
    enabled: !!movieId,
  })

  const { data: videos } = useQuery({
    queryKey: ['movieVideos', movieId],
    queryFn: () => fetchMovieVideos(movieId),
    enabled: !!movieId,
  })

  if (movieLoading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!movie) {
    return (
      <div className="flex flex-col items-center justify-center py-40 px-4">
        <h2 className="text-xl font-bold text-gray-100 mb-2">Movie not found</h2>
        <Link to="/watch" className="text-amber-400 hover:text-amber-300 transition-colors text-sm">
          Return to Watch
        </Link>
      </div>
    )
  }

  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : null
  const posterUrl = getPosterUrl(movie.poster_path)
  const cast = credits?.cast?.slice(0, 12) || []
  const similarMovies = Array.isArray(similar) ? similar : similar?.results || []
  const trailerKey = getTrailerKey(videos)

  return (
    <div className="min-h-screen pb-20">
      {/* Backdrop Hero Area */}
      <div className="relative h-[72vh] min-h-[500px] w-full overflow-hidden">
        {backdropUrl && (
          <img
            src={backdropUrl}
            alt={movie.title}
            className="absolute inset-0 w-full h-full object-cover object-top scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0f12] via-[#0d0f12]/85 to-[#0d0f12]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f12] via-[#0d0f12]/60 to-transparent" />

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 lg:p-14">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 items-end md:items-center">
            {/* Poster */}
            {posterUrl && (
              <div className="hidden md:block flex-shrink-0">
                <img
                  src={posterUrl}
                  alt={movie.title}
                  className="w-52 lg:w-60 rounded-2xl shadow-2xl shadow-black/80 border border-white/[0.1] object-cover"
                />
              </div>
            )}

            {/* Details */}
            <div className="flex-1 space-y-4">
              <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-50 tracking-tight leading-tight drop-shadow-md">
                {movie.title}
              </h1>

              {movie.tagline && (
                <p className="text-gray-400 italic text-sm">{movie.tagline}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                {movie.vote_average > 0 && (
                  <span className="font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/25 px-2.5 py-0.5 rounded-full">
                    ★ {movie.vote_average.toFixed(1)}
                  </span>
                )}
                {movie.release_date && (
                  <span className="text-gray-300 font-medium">{movie.release_date.slice(0, 4)}</span>
                )}
                {movie.runtime > 0 && (
                  <span className="text-gray-400">{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>
                )}
                {movie.genres?.map((genre: any) => (
                  <span
                    key={genre.id}
                    className="px-2.5 py-0.5 bg-white/[0.06] border border-white/[0.08] rounded-md text-xs text-gray-300"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>

              {movie.overview && (
                <p className="text-gray-300 text-sm sm:text-base max-w-3xl leading-relaxed">
                  {movie.overview}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to={`/watch/${movie.id}?type=movie`}
                  className="px-6 py-3 bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-gray-950 font-bold text-sm sm:text-base rounded-xl transition-all shadow-lg shadow-amber-400/15 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Watch Now
                </Link>

                <Link
                  to={`/cowatch?type=movie&id=${movie.id}`}
                  className="px-5 py-3 bg-white/[0.08] hover:bg-white/[0.14] active:scale-[0.98] border border-white/[0.12] text-gray-100 font-medium text-sm sm:text-base rounded-xl transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Watch Together
                </Link>

                <WatchlistButton
                  id={movie.id}
                  mediaType="movie"
                  title={movie.title}
                  posterPath={movie.poster_path}
                  rating={movie.vote_average}
                  year={movie.release_date?.slice(0, 4)}
                />

                {trailerKey && (
                  <a
                    href={`https://www.youtube.com/watch?v=${trailerKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 text-gray-300 hover:text-white text-sm font-medium rounded-xl hover:bg-white/[0.06] transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Trailer
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cast Section */}
      {cast.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          <h2 className="text-xl font-bold text-gray-100 mb-6 tracking-tight">Featured Cast</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
            {cast.map((person: any) => (
              <div key={person.id} className="flex-shrink-0 w-28 text-center group">
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-[#13171c] border border-white/[0.06] mb-2 group-hover:border-amber-400/30 transition-all">
                  {person.profile_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w300${person.profile_path}`}
                      alt={person.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <span className="text-2xl">👤</span>
                    </div>
                  )}
                </div>
                <p className="text-xs font-semibold text-gray-200 truncate">{person.name}</p>
                <p className="text-[11px] text-gray-400 truncate">{person.character}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Similar Movies */}
      {similarMovies.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          <h2 className="text-xl font-bold text-gray-100 mb-6 tracking-tight">Similar Titles</h2>
          <MediaGrid items={similarMovies} mediaType="movie" />
        </div>
      )}
    </div>
  )
}

export default MovieDetails
