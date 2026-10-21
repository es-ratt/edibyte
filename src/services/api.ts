import type { MealPlan, Profile } from "../types"
import { buildPlan } from "../lib/planner"

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA !== "false"
const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

// Swap the mock for the FastAPI backend by setting VITE_USE_MOCK_DATA=false.
export async function generatePlan(p: Profile): Promise<MealPlan> {
  if (USE_MOCK) { await new Promise((r) => setTimeout(r, 800)); return buildPlan(p) }
  const res = await fetch(`${BASE}/plan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
  if (!res.ok) throw new Error("Plan request failed")
  return res.json()
}
