import { BrowserRouter, Navigate, Routes, Route, useParams } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Home from './features/home/Home'
import Discover from './features/discover/Discover'
import Search from './features/search/Search'
import Watchlist from './features/watchlist/Watchlist'
import Profile from './features/profile/Profile'
import MovieDetails from './features/movies/MovieDetails'
import TVDetails from './features/tv/TVDetails'
import SeasonDetails from './features/tv/SeasonDetails'
import Watch from './features/player/Watch'
import WatchHub from './features/watch/WatchHub'
import Cowatch from './features/cowatch/Cowatch'
import Room from './features/cowatch/Room'
import Copyright from './features/legal/Copyright'

function ShareSlugRedirect() {
  const { shareSlug } = useParams<{ shareSlug: string }>()
  return <Room key={shareSlug} />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Watch page - no layout (full screen player) */}
        <Route path="/watch/:mediaId" element={<Watch />} />
        
        {/* All other pages with layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/watch" element={<WatchHub />} />
          <Route path="/movies" element={<Navigate to="/watch" replace />} />
          <Route path="/tv-shows" element={<Navigate to="/watch" replace />} />
          <Route path="/search" element={<Search />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/cowatch" element={<Cowatch />} />
          <Route path="/room/:roomCode" element={<Room />} />
          <Route path="/join/:shareSlug" element={<ShareSlugRedirect />} />
          <Route path="/copyright" element={<Copyright />} />
          <Route path="/movie/:id" element={<MovieDetails />} />
          <Route path="/tv/:id" element={<TVDetails />} />
          <Route path="/tv/:id/season/:seasonNumber" element={<SeasonDetails />} />
          {/* Direct share slug fallback for private lounge links */}
          <Route path="/:shareSlug" element={<ShareSlugRedirect />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
