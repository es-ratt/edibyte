import Bar from "../components/Bar"
import MealCard from "../components/MealCard"
import { useStore } from "../hooks/useStore"
import { dayIndex, dayLabel, mac, today } from "../lib/nutrition"

export default function Today() {
  const { profile, plan, toggleMeal } = useStore()
  if (!profile || !plan) return null
  const di = dayIndex(plan.start, today()), meals = di >= 0 && di < 7 ? plan.days[di] : null, t = profile.t
  const x = mac((meals ?? []).filter((m) => m.done).flatMap((m) => m.ps))
  return (
    <>
      <h1 className="text-3xl">Today</h1>
      <p className="mb-3 text-sm text-mute">{dayLabel(today())}. Targets: {t.kcal} kcal, {t.prot} g protein.</p>
      <div className="card"><h3 className="mb-2 text-lg">Intake from logged meals</h3>
        <Bar label="Calories" v={x.kcal} t={t.kcal} unit="kcal" /><Bar label="Protein" v={x.p} t={t.prot} unit="g" />
        <Bar label="Carbohydrate" v={x.c} t={t.carb} unit="g" /><Bar label="Fat" v={x.f} t={t.fat} unit="g" />
        <Bar label="Fibre" v={x.fib} t={t.fib} unit="g" /><Bar label="Sodium (limit)" v={x.na} t={t.na} unit="mg" cap />
      </div>
      <h2 className="mb-2 text-xl">Today’s meals</h2>
      {meals ? meals.map((m) => <MealCard key={m.s} m={m} p={profile} onToggle={() => toggleMeal(di, m.s)} />)
        : <div className="card">Your 7-day plan has ended. Rebuild it from the Profile tab.</div>}
      <div className="note">EdiByte offers general guidance, not a diagnosis or medical advice.</div>
    </>
  )
}
