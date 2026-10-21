import type { NutritionTotals } from './nutrition';

export type Goal = 'lose' | 'maintain' | 'gain';

export interface ShoppingRequest {
  totals: NutritionTotals;
  budgetBdt: number;
  goal: Goal;
  dietary: string[];
}

export interface ShoppingItem {
  id: string;
  nameEn: string;
  nameBn: string;
  quantity: string;
  /** Estimated price in BDT. Always display as an estimate. */
  estPriceBdt: number;
  reason?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
