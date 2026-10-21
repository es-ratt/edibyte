import type { DetectedFood } from '../types/food';
import type { NutritionReport } from '../types/nutrition';
import type { ShoppingItem } from '../types/shopping';

export const MOCK_DETECTED: DetectedFood[] = [
  { id: 'f1', nameEn: 'Rice', nameBn: 'ভাত', confidence: 0.94, portionGrams: 200, portionLabel: '1 plate' },
  { id: 'f2', nameEn: 'Lentil soup (dal)', nameBn: 'ডাল', confidence: 0.88, portionGrams: 120, portionLabel: '1 bowl' },
  { id: 'f3', nameEn: 'Mashed potato (aloo bhorta)', nameBn: 'আলু ভর্তা', confidence: 0.71, portionGrams: 80 },
  { id: 'f4', nameEn: 'Fried fish', nameBn: 'ভাজা মাছ', confidence: 0.52, portionGrams: 70, portionLabel: '1 piece' },
];

export const MOCK_REPORT: NutritionReport = {
  items: [
    { ...MOCK_DETECTED[0], calories: 260, proteinG: 5, carbsG: 57, fatG: 0.5, fiberG: 0.8 },
    { ...MOCK_DETECTED[1], calories: 140, proteinG: 9, carbsG: 22, fatG: 2.5, fiberG: 5 },
    { ...MOCK_DETECTED[2], calories: 95, proteinG: 2, carbsG: 16, fatG: 3, fiberG: 1.5 },
    { ...MOCK_DETECTED[3], calories: 150, proteinG: 15, carbsG: 3, fatG: 9, fiberG: 0 },
  ],
  totals: { calories: 645, proteinG: 31, carbsG: 98, fatG: 15, fiberG: 7.3 },
  insights: [
    { type: 'good', textEn: 'Good fiber from lentils.', textBn: 'ডাল থেকে ভালো ফাইবার পাওয়া গেছে।' },
    { type: 'warn', textEn: 'This meal is high in refined carbs.', textBn: 'এই খাবারে শর্করার পরিমাণ বেশি।' },
    { type: 'tip', textEn: 'Add a vegetable side to balance the plate.', textBn: 'প্লেট সুষম করতে একটি সবজি যোগ করুন।' },
  ],
};

export const MOCK_SHOPPING: ShoppingItem[] = [
  { id: 's1', nameEn: 'Eggs', nameBn: 'ডিম', quantity: '6 pieces', estPriceBdt: 72, reason: 'Affordable protein' },
  { id: 's2', nameEn: 'Spinach (palong shak)', nameBn: 'পালং শাক', quantity: '500 g', estPriceBdt: 30, reason: 'Fiber and iron' },
  { id: 's3', nameEn: 'Red lentils (masoor dal)', nameBn: 'মসুর ডাল', quantity: '500 g', estPriceBdt: 65, reason: 'Plant protein' },
  { id: 's4', nameEn: 'Seasonal vegetables', nameBn: 'মৌসুমি সবজি', quantity: '1 kg', estPriceBdt: 60, reason: 'Balance the plate' },
];

export const MOCK_CHAT_REPLY = {
  en: 'Eggs, lentils, and small fish are affordable high-protein options. Prices vary by market.',
  bn: 'ডিম, ডাল ও ছোট মাছ কম খরচে প্রোটিনের ভালো উৎস। বাজারভেদে দাম আলাদা হতে পারে।',
};
