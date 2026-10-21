import { useState } from "react"
import { FOODS } from "../data/foods"
import { foodTags } from "../lib/nutrition"

export default function Foods() {
  const [q, setQ] = useState(""), [cat, setCat] = useState("")
  const list = FOODS.filter((f) => (!cat || f.cat === cat) && (f.en + f.bn + f.cat).toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <h1 className="text-3xl">Foods</h1>
      <p className="mb-3 text-sm text-mute">{FOODS.length} everyday foods. Values are approximate, per household serving.</p>
      <input className="field mb-2" placeholder="Search foods (English or বাংলা)" value={q} onChange={(e) => setQ(e.target.value)} />
      <select className="field mb-3" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
        <option value="">All categories</option>{[...new Set(FOODS.map((f) => f.cat))].map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
      </select>
      {list.map((f) => (
        <div key={f.id} className="card">
          <div className="flex justify-between"><b>{f.en}</b><span className="text-sm text-mute">{f.bn}</span></div>
          <div className="text-xs text-mute">{f.cat.replace("_", " ")}, {f.sv} ({f.g} g)</div>
          <div className="my-1.5 grid grid-cols-2 gap-1 text-xs sm:grid-cols-4">
            <span>{f.kcal} kcal</span><span>Protein {f.p} g</span><span>Carbs {f.c} g</span><span>Fat {f.f} g</span>
            <span>Fibre {f.fib} g</span><span>Sodium {f.na} mg</span><span>GI {f.gi || "n/a"}</span>
          </div>
          {foodTags(f).map((t) => <span key={t} className="chip">{t}</span>)}
        </div>
      ))}
    </>
  )
}
