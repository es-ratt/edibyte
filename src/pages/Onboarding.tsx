import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { useStore } from "../hooks/useStore"
import { calcTargets } from "../lib/nutrition"
import { generatePlan } from "../services/api"
import type { Profile } from "../types"

type Form = Omit<Profile, "t">
type List = "goals" | "conds" | "alg"
const blank: Form = { age: 30, sex: "f", h: 160, w: 60, tw: 55, act: "light", goals: [], conds: [], alg: [], diet: 4, dis: "" }
const OPTS: [List, string, [string, string][]][] = [
  ["goals", "Goals", [["loss", "Weight loss"], ["muscle", "Muscle gain"], ["diab", "Manage diabetes"], ["heart", "Heart health"], ["preg", "Pregnancy"]]],
  ["conds", "Conditions", [["t2d", "Type 2 diabetes"], ["pre", "Prediabetes"], ["htn", "Hypertension"], ["chol", "High cholesterol"], ["pcos", "PCOS"], ["ckd", "CKD"]]],
  ["alg", "Allergies and intolerances", [["lactose", "Lactose"], ["gluten", "Gluten"], ["nuts", "Nuts"], ["shellfish", "Shellfish"], ["egg", "Egg"], ["soy", "Soy"], ["fish", "Fish"]]],
]
export default function Onboarding() {
  const { profile, setProfile, setPlan } = useStore(), nav = useNavigate()
  const [f, setF] = useState<Form>(profile ?? blank), [busy, setBusy] = useState(false), [err, setErr] = useState("")
  const num = (k: "age" | "h" | "w" | "tw", label: string) => (
    <div><label className="l">{label}</label><input className="field" type="number" required min={1} step="any" value={f[k]} onChange={(e) => setF({ ...f, [k]: +e.target.value })} /></div>
  )
  const tog = (k: List, v: string) => setF((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }))
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr("")
    try {
      const p: Profile = { ...f, t: calcTargets(f) }
      const plan = await generatePlan(p)
      setProfile(p); setPlan(plan); nav("/")
    } catch { setErr("Could not build your plan. Check your connection and try again."); setBusy(false) }
  }
  if (busy) return <div className="mx-auto mt-[30vh] text-center"><div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-4 border-line border-t-saffron" /><b>Building your week from the food dataset…</b></div>
  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="text-3xl">{profile ? "Edit profile" : "Welcome to EdiByte"}</h1>
      <p className="mb-3 text-sm text-mute">Personalized nutrition from everyday Bangladeshi foods. Your data stays in this browser.</p>
      <form className="card" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {num("age", "Age")}
          <div><label className="l">Sex</label><select className="field" value={f.sex} onChange={(e) => setF({ ...f, sex: e.target.value as "m" | "f" })}><option value="f">Female</option><option value="m">Male</option></select></div>
          {num("h", "Height (cm)")}{num("w", "Weight (kg)")}{num("tw", "Target weight (kg)")}
          <div><label className="l">Activity</label><select className="field" value={f.act} onChange={(e) => setF({ ...f, act: e.target.value as Form["act"] })}><option value="sed">Sedentary</option><option value="light">Light</option><option value="mod">Moderate</option><option value="act">Active</option></select></div>
        </div>
        {OPTS.map(([k, title, opts]) => (
          <div key={k}><label className="l">{title}</label>
            {opts.map(([v, l]) => <label key={v} className="mr-3 inline-flex items-center gap-1 text-sm"><input type="checkbox" checked={f[k].includes(v)} onChange={() => tog(k, v)} />{l}</label>)}</div>
        ))}
        <label className="l">Diet pattern</label>
        <select className="field" value={f.diet} onChange={(e) => setF({ ...f, diet: +e.target.value })}>
          <option value={4}>Omnivore</option><option value={3}>Pescatarian</option><option value={2}>Eggetarian</option><option value={1}>Vegetarian</option><option value={0}>Vegan</option></select>
        <label className="l">Disliked foods (comma separated)</label>
        <input className="field" value={f.dis} onChange={(e) => setF({ ...f, dis: e.target.value })} />
        {err && <div className="note" role="alert">{err}</div>}
        <div className="mt-4"><button className="btn">Save and build my plan</button></div>
      </form>
    </main>
  )
}
