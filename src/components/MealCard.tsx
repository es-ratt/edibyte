import type { PlanMeal, Profile } from "../types"
import { F, mac, names, port, r0, r1 } from "../lib/nutrition"
import { rationale } from "../lib/planner"

export default function MealCard({ m, p, onToggle }: { m: PlanMeal; p: Profile; onToggle: () => void }) {
  const x = mac(m.ps)
  return (
    <div className="card">
      <div className="flex items-center justify-between"><h3 className="text-lg">{m.lab}</h3><span className="text-xs text-mute">{m.time}</span></div>
      <div className="font-semibold">{names(m.ps, "en")}</div>
      <div className="text-xs text-mute">{names(m.ps, "bn")}</div>
      <div className="my-1.5 text-xs text-mute">{m.ps.map(([i, q]) => `${F[i].en}: ${port(F[i], q)}`).join("; ")}</div>
      <div className="text-xs text-mute">{r0(x.kcal)} kcal, protein {r0(x.p)} g, carbs {r0(x.c)} g, fat {r0(x.f)} g, fibre {r1(x.fib)} g</div>
      <div className="note">{rationale(m, p)}</div>
      <button className={m.done ? "btn alt" : "btn"} onClick={onToggle}>{m.done ? "Logged. Undo" : "Log this meal"}</button>
    </div>
  )
}
