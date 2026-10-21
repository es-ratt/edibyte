import { useState } from "react"
import MealCard from "../components/MealCard"
import { useStore } from "../hooks/useStore"
import { addDays, dayLabel } from "../lib/nutrition"

export default function Plan() {
  const { profile, plan, toggleMeal } = useStore()
  const [d, setD] = useState(0)
  if (!profile || !plan) return null
  return (
    <>
      <h1 className="text-3xl">Your week</h1>
      <p className="mb-2 text-sm text-mute">{plan.by}.</p>
      <div className="mb-3">{plan.days.map((_, i) => <button key={i} className={`chip ${i === d ? "on" : ""}`} onClick={() => setD(i)}>{dayLabel(addDays(plan.start, i))}</button>)}</div>
      {plan.days[d].map((m) => <MealCard key={m.s} m={m} p={profile} onToggle={() => toggleMeal(d, m.s)} />)}
      <div className="card"><h3 className="mb-1 text-lg">Good to know</h3>{plan.cau.map((c) => <p key={c} className="text-sm text-mute">{c}</p>)}</div>
    </>
  )
}
