import type { DetectedFood } from '../types/food';
import type { NutritionReport, NutritionTotals } from '../types/nutrition';
import type { ChatMessage, ShoppingItem, ShoppingRequest } from '../types/shopping';
import { MOCK_CHAT_REPLY, MOCK_DETECTED, MOCK_REPORT, MOCK_SHOPPING } from '../mocks/meals';

const wait = (ms = 800) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function detectFoods(_image: File): Promise<DetectedFood[]> {
  await wait(1200);
  return MOCK_DETECTED;
}

/** Scales the mock report by each item's portion so edits in the Review step are visible. */
export async function getReport(items: DetectedFood[]): Promise<NutritionReport> {
  await wait();
  const reportItems = items.map((item) => {
    const base = MOCK_REPORT.items.find((r) => r.id === item.id) ?? MOCK_REPORT.items[0];
    const factor = item.portionGrams / base.portionGrams;
    return {
      ...item,
      calories: Math.round(base.calories * factor),
      proteinG: round1(base.proteinG * factor),
      carbsG: round1(base.carbsG * factor),
      fatG: round1(base.fatG * factor),
      fiberG: round1(base.fiberG * factor),
    };
  });
  const totals = reportItems.reduce<NutritionTotals>(
    (sum, i) => ({
      calories: sum.calories + i.calories,
      proteinG: round1(sum.proteinG + i.proteinG),
      carbsG: round1(sum.carbsG + i.carbsG),
      fatG: round1(sum.fatG + i.fatG),
      fiberG: round1(sum.fiberG + i.fiberG),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
  );
  return { items: reportItems, totals, insights: MOCK_REPORT.insights };
}

export async function getShoppingList(req: ShoppingRequest): Promise<ShoppingItem[]> {
  await wait();
  const result: ShoppingItem[] = [];
  let total = 0;
  for (const item of MOCK_SHOPPING) {
    if (total + item.estPriceBdt <= req.budgetBdt) {
      result.push(item);
      total += item.estPriceBdt;
    }
  }
  return result;
}

export async function chat(
  _message: string,
  lang: 'en' | 'bn',
  _history: ChatMessage[],
): Promise<{ reply: string }> {
  await wait(900);
  return { reply: MOCK_CHAT_REPLY[lang] };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
