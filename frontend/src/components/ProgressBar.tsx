interface Props {
  value: number // percent, may exceed 100
  label: string
  detail?: string
  tone?: 'olive' | 'mustard'
}

/** Accessible progress bar. Values above 100% are shown full with a mustard colour. */
export function ProgressBar({ value, label, detail, tone = 'olive' }: Props) {
  const clamped = Math.max(0, Math.min(100, value))
  const over = value > 100
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold text-ink">{label}</span>
        {detail && <span className="text-muted">{detail}</span>}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        aria-valuetext={detail}
        className="h-3 w-full overflow-hidden rounded-full bg-olive-100"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${over || tone === 'mustard' ? 'bg-mustard' : 'bg-olive-600'}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
