export interface DetectedFood {
  id: string;
  nameEn: string;
  nameBn: string;
  /** 0 to 1. Items below 0.6 are flagged for review in the UI. */
  confidence: number;
  portionGrams: number;
  portionLabel?: string;
}
