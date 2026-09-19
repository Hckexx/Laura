import { Link } from 'react-router-dom'

interface Genre {
  id: number
  name: string
}

const genres: Genre[] = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 10770, name: 'TV Movie' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
]

function GenrePills() {
  return (
    <div className="space-y-3 text-left">
      <div className="text-[11px] font-mono font-bold tracking-widest text-gray-400 uppercase">
        Explore Genres
      </div>
      <div className="flex flex-wrap gap-2">
        {genres.map((genre) => (
          <Link
            key={genre.id}
            to={`/discover?genre=${genre.id}`}
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 bg-[#12161c] text-gray-300 hover:text-amber-200 hover:bg-amber-400/10 border border-white/[0.08] hover:border-amber-400/30"
          >
            {genre.name}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default GenrePills