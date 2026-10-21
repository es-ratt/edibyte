import type { DetectedFood } from './food';

export interface NutritionTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export type InsightType = 'good' | 'warn' | 'tip';

export interface Insight {
  type: InsightType;
  textEn: string;
  textBn: string;
}

export interface NutritionReport {
  items: (DetectedFood & NutritionTotals)[];
  totals: NutritionTotals;
  insights: Insight[];
}
