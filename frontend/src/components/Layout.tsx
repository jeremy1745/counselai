import { Outlet, Link } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="bg-slate-900 px-6 py-3 flex items-center gap-3">
        <Link to="/" className="text-xl font-bold text-white">CAISE</Link>
        <span className="text-sm text-slate-400">AI Legal Assistant</span>
      </header>
      <main className="flex-1 flex overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
