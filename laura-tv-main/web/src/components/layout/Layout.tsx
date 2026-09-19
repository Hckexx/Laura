import Navbar from './Navbar'
import Footer from './Footer'
import { Outlet } from 'react-router-dom'

function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Navbar />
      <main className="flex-1 pt-16 flex flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default Layout