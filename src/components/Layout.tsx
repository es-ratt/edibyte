import { NavLink, Outlet } from "react-router-dom"

const tabs = [["/", "Today", "🏠"], ["/plan", "Plan", "📅"], ["/foods", "Foods", "🍛"], ["/profile", "Profile", "👤"]]
export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:sticky md:top-0 md:h-screen md:w-52 md:flex-col md:border-r md:border-t-0 md:p-4">
        <div className="hidden px-3 pb-5 md:block"><div className="font-display text-2xl text-forest">EdiByte</div><div className="text-xs text-mute">Eat well, the local way</div></div>
        {tabs.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end className={({ isActive }) => `flex-1 py-2 text-center text-xs md:flex-none md:rounded-2xl md:px-3 md:py-2.5 md:text-left md:text-sm ${isActive ? "font-bold text-forest md:bg-cream" : "text-mute"}`}>
            <span className="block text-lg md:mr-2 md:inline md:text-base">{icon}</span>{label}
          </NavLink>
        ))}
      </nav>
      <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 p-4 pb-24 md:pb-10"><Outlet /></main>
    </div>
  )
}
