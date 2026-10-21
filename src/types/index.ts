export interface FoodItem { id: string; en: string; bn: string; cat: string; sv: string; g: number; kcal: number; p: number; c: number; f: number; fib: number; na: number; gi: number; diet: number; al: string[]; t: string }
export interface Targets { kcal: number; prot: number; carb: number; fat: number; fib: number; na: number; sugar: boolean }
export interface Profile { age: number; sex: "m" | "f"; h: number; w: number; tw: number; act: "sed" | "light" | "mod" | "act"; goals: string[]; conds: string[]; alg: string[]; diet: number; dis: string; t: Targets }
export type Slot = "b" | "m" | "l" | "a" | "d"
export interface PlanMeal { s: Slot; lab: string; time: string; ps: [string, number][]; done: boolean }
export interface MealPlan { start: string; days: PlanMeal[][]; cau: string[]; by: string }
