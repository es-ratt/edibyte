import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useApp } from '@/hooks/useApp'
import { fmtNum } from '@/lib/i18n'
import type { Nutrients } from '@/types/api'

// Fixed series order and colours (see --color-chart-* in index.css).
const SERIES = [
  { key: 'protein_g', label: 'common.protein', color: '#5f7a1f', kcalPerG: 4 },
  { key: 'carbs_g', label: 'common.carbs', color: '#c9a227', kcalPerG: 4 },
  { key: 'fat_g', label: 'common.fat', color: '#a0583a', kcalPerG: 9 },
] as const

/** Donut of where the meal's energy comes from, with a text legend carrying the values. */
export default function MacroDonut({ totals }: { totals: Nutrients }) {
  const { t, lang } = useApp()
  const data = SERIES.map((s) => ({ ...s, name: t(s.label), grams: totals[s.key], kcal: totals[s.key] * s.kcalPerG }))
  const energy = data.reduce((a, d) => a + d.kcal, 0) || 1
  const pct = (k: number) => Math.round((100 * k) / energy)

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="size-44 shrink-0" role="img" aria-label={data.map((d) => `${d.name} ${pct(d.kcal)}%`).join(', ')}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="kcal"
              nameKey="name"
              innerRadius="62%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="#ffffff"
              strokeWidth={2}
              isAnimationActive={!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(_v, _n, item) => {
                const d = item.payload as (typeof data)[number]
                return [`${fmtNum(d.grams, lang, 1)} ${t('common.g')} · ${fmtNum(pct(d.kcal), lang)}%`, d.name]
              }}
              contentStyle={{ borderRadius: 12, border: '1px solid #d9e0bb', color: '#1f2616' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2">
        {data.map((d) => (
          <li key={d.key} className="flex items-center justify-between gap-3 rounded-xl bg-olive-50 px-3 py-2">
            <span className="flex items-center gap-2 font-semibold text-ink">
              <span aria-hidden className="size-3 rounded-full" style={{ background: d.color }} />
              {d.name}
            </span>
            <span className="text-ink">
              {fmtNum(d.grams, lang, 1)} {t('common.g')} <span className="text-muted">· {fmtNum(pct(d.kcal), lang)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
