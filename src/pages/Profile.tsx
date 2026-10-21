import { useNavigate } from "react-router-dom"
import { useStore } from "../hooks/useStore"

export default function ProfilePage() {
  const { profile, reset } = useStore(), nav = useNavigate()
  if (!profile) return null
  const t = profile.t
  const rows: [string, string][] = [["Calories", `${t.kcal} kcal`], ["Protein", `${t.prot} g`], ["Carbohydrate", `${t.carb} g`], ["Fat", `${t.fat} g`], ["Fibre", `${t.fib} g`], ["Sodium limit", `${t.na} mg`]]
  return (
    <>
      <h1 className="text-3xl">Profile</h1>
      <div className="card"><h3 className="mb-2 text-lg">Your daily targets</h3>
        {rows.map(([a, b]) => <div key={a} className="flex justify-between py-0.5"><span>{a}</span><b>{b}</b></div>)}
        <p className="mt-2 text-xs text-mute">Mifflin-St Jeor energy needs, adjusted for your goals and conditions.</p></div>
      <div className="card"><p className="mb-3 text-sm text-mute">{profile.age} years, {profile.h} cm, {profile.w} kg, target {profile.tw} kg.</p>
        <button className="btn" onClick={() => nav("/onboarding")}>Edit profile and rebuild plan</button>{" "}
        <button className="btn alt" onClick={() => { if (confirm("Delete all EdiByte data from this browser?")) { reset(); nav("/onboarding") } }}>Reset all data</button></div>
    </>
  )
}
