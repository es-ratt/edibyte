import type { FoodItem, Profile, Targets } from "../types"
import { FOODS } from "../data/foods"

export const F: Record<string, FoodItem> = Object.fromEntries(FOODS.map((f) => [f.id, f]))
export const K = ["kcal", "p", "c", "f", "fib", "na"] as const
export type Macros = Record<(typeof K)[number], number>
export const r0 = Math.round
export const r1 = (x: number) => Math.round(x * 10) / 10

export function calcTargets(p: Pick<Profile, "age" | "sex" | "h" | "w" | "act" | "goals" | "conds">): Targets {
  const mult = { sed: 1.2, light: 1.375, mod: 1.55, act: 1.725 }[p.act]
  let k = (10 * p.w + 6.25 * p.h - 5 * p.age + (p.sex === "m" ? 5 : -161)) * mult
  const g = p.goals, c = p.conds
  if (g.includes("loss")) k *= 0.8
  if (g.includes("muscle")) k *= 1.1
  if (g.includes("preg")) k += 300
  k = r0(k / 10) * 10
  let pr = 1.2
  if (g.includes("loss")) pr = 1.6
  if (g.includes("muscle")) pr = 1.8
  if (g.includes("preg")) pr = 1.5
  if (c.includes("ckd")) pr = 0.9
  const prot = r0(pr * p.w)
  const sugar = c.some((x) => ["t2d", "pre", "pcos"].includes(x)) || g.includes("diab")
  const carb = r0((k * (sugar ? 0.42 : 0.5)) / 4)
  return { kcal: k, prot, carb, fat: Math.max(20, r0((k - 4 * prot - 4 * carb) / 9)), fib: sugar ? 35 : 30, na: c.includes("htn") || g.includes("heart") ? 1500 : 2300, sugar }
}
export const mac = (ps: [string, number][]): Macros => {
  const a: Macros = { kcal: 0, p: 0, c: 0, f: 0, fib: 0, na: 0 }
  for (const [id, q] of ps) for (const k of K) a[k] += F[id][k] * q
  return a
}
export const port = (f: FoodItem, q: number) => {
  const [n, ...u] = f.sv.split(" ")
  const v = r1(parseFloat(n) * q)
  return `${v} ${u.join(" ")}${v > 1 ? "s" : ""}`
}
export const names = (ps: [string, number][], l: "en" | "bn") => ps.slice(0, 3).map(([i]) => F[i][l]).join(" + ")
export const care = (p: Profile) => p.conds.some((x) => ["htn", "chol", "ckd"].includes(x)) || p.goals.includes("heart")
export const okf = (f: FoodItem, p: Profile) => {
  if (f.diet > p.diet || f.al.some((a) => p.alg.includes(a))) return false
  const d = p.dis.toLowerCase().split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean)
  return !d.some((x) => f.en.toLowerCase().includes(x) || f.bn.includes(x))
}
const NI: Record<string, string> = { iron: "iron rich", ca: "calcium rich" }
export const foodTags = (f: FoodItem) => [
  ...(f.na <= 140 ? ["low sodium"] : []), ...(f.gi && f.gi <= 55 ? ["low GI"] : []),
  ...(f.fib >= 4 ? ["high fibre"] : []), ...(f.p >= 15 ? ["high protein"] : []),
  ...f.t.split(" ").filter(Boolean).map((x) => NI[x] ?? x), ...f.al.map((x) => "contains " + x),
]
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10)
export const today = () => iso(new Date())
export const addDays = (s: string, n: number) => { const d = new Date(s + "T12:00"); d.setDate(d.getDate() + n); return iso(d) }
export const dayLabel = (s: string) => new Date(s + "T12:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
export const dayIndex = (start: string, d: string) => r0((new Date(d + "T12:00").getTime() - new Date(start + "T12:00").getTime()) / 864e5)
