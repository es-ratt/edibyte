export default function Bar({ label, v, t, unit, cap }: { label: string; v: number; t: number; unit: string; cap?: boolean }) {
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-xs text-mute"><span>{label}</span><span>{Math.round(v)} / {t} {unit}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full ${cap && v > t ? "bg-red-700" : "bg-forest"}`} style={{ width: `${Math.min(100, (v / t) * 100)}%` }} /></div>
    </div>
  )
}
