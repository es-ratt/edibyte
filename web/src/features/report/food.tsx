import { Apple, Bean, Candy, Carrot, Coffee, Cookie, Drumstick, Egg, Fish, Milk, Soup, Utensils, Wheat, type LucideIcon } from 'lucide-react'
import type { FoodBrief } from '@/lib/check/types'
import type { Lang } from '@/lib/i18n'

export function foodName(food: Pick<FoodBrief, 'name_bn' | 'name_en' | 'name_bl'>, lang: Lang): string {
  return lang === 'bn' ? food.name_bn : lang === 'en' ? food.name_en : food.name_bl
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  grain: Wheat,
  lentil: Bean,
  egg: Egg,
  fish: Fish,
  meat: Drumstick,
  vegetable: Carrot,
  fruit: Apple,
  dairy: Milk,
  drink: Coffee,
  snack: Cookie,
  sweet: Candy,
  mixed_dish: Soup,
}

type Props = { category: string; size?: number }

/** Flat food icon by category (no photos of people or food). */
export function FoodIcon({ category, size = 22 }: Props) {
  const Icon = CATEGORY_ICONS[category] ?? Utensils
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-olive-50 text-olive-700">
      <Icon size={size} aria-hidden />
    </span>
  )
}
