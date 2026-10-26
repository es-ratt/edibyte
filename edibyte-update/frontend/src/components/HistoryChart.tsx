import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '@/hooks/useApp'
import { fmtNum } from '@/lib/i18n'
import type { DayTotal } from '@/lib/history'

/** Calories per day for the last week, with the daily target as a reference line. */
export default function HistoryChart({ days, targetKcal }: { days: DayTotal[]; targetKcal: number }) {
  const { t, lang } = useApp()
  const locale = lang === 'bn' ? 'bn-BD' : 'en-US'
  const data = days.map((d) => ({ day: d.date.toLocaleDateString(locale, { weekday: 'short' }), kcal: d.kcal }))
  return (
    <div
      className="h-64 w-full"
      role="img"
      aria-label={days.map((d, i) => `${data[i].day}: ${fmtNum(d.kcal, lang)} ${t('common.kcal')}`).join(', ')}
    >
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9e0bb" />
          <XAxis dataKey="day" tickLine={false} />
          <YAxis width={44} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => [`${fmtNum(Number(v), lang)} ${t('common.kcal')}`, t('common.calories')]} />
          <ReferenceLine y={targetKcal} stroke="#a0583a" strokeDasharray="5 4" />
          <Bar dataKey="kcal" fill="#5f7a1f" radius={[6, 6, 0, 0]} isAnimationActive={!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
