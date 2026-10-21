import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { MealPlan, Profile } from "../types"

interface State { profile: Profile | null; plan: MealPlan | null }
interface Store extends State { setProfile: (p: Profile | null) => void; setPlan: (p: MealPlan | null) => void; toggleMeal: (day: number, slot: string) => void; reset: () => void }
const Ctx = createContext<Store | null>(null)
const empty: State = { profile: null, plan: null }

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(() => { try { return JSON.parse(localStorage.getItem("edibyte-v2") ?? "") as State } catch { return empty } })
  useEffect(() => { try { localStorage.setItem("edibyte-v2", JSON.stringify(s)) } catch { /* storage unavailable */ } }, [s])
  const value: Store = {
    ...s,
    setProfile: (profile) => setS((x) => ({ ...x, profile })),
    setPlan: (plan) => setS((x) => ({ ...x, plan })),
    toggleMeal: (day, slot) => setS((x) => x.plan ? { ...x, plan: { ...x.plan, days: x.plan.days.map((d, i) => i !== day ? d : d.map((m) => m.s === slot ? { ...m, done: !m.done } : m)) } } : x),
    reset: () => setS(empty),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export function useStore() { const c = useContext(Ctx); if (!c) throw new Error("StoreProvider missing"); return c }
