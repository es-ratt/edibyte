import type { DetectedFood } from '../types/food';
import type { NutritionReport } from '../types/nutrition';
import type { ChatMessage, ShoppingItem, ShoppingRequest } from '../types/shopping';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body?.error?.message ?? message;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export function detectFoods(image: File): Promise<DetectedFood[]> {
  const form = new FormData();
  form.append('image', image);
  return request<DetectedFood[]>('/api/detect', { method: 'POST', body: form });
}

export function getReport(items: DetectedFood[]): Promise<NutritionReport> {
  return request<NutritionReport>('/api/nutrition', json({ items }));
}

export function getShoppingList(req: ShoppingRequest): Promise<ShoppingItem[]> {
  return request<ShoppingItem[]>('/api/shopping', json(req));
}

export function chat(
  message: string,
  lang: 'en' | 'bn',
  history: ChatMessage[],
): Promise<{ reply: string }> {
  return request<{ reply: string }>('/api/chat', json({ message, lang, history }));
}
