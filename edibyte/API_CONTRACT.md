# Edibyte API Contract (provisional)

This contract is agreed between the frontend and backend teams. It stays provisional until both sides confirm it. Change it here first, then in code.

Base URL: `VITE_API_BASE_URL` (default `http://localhost:8000`)

General rules:

- All responses are JSON and UTF-8.
- User-facing text comes in both languages (`nameEn`/`nameBn`, `textEn`/`textBn`). The frontend does not translate.
- Money is in BDT (Bangladeshi Taka) as numbers, not strings.
- Weights are in grams, energy in kcal.
- Errors use `{ "error": { "code": "string", "message": "string" } }` with a matching HTTP status.

---

## POST /api/detect

Detect foods in a meal photo.

Request: `multipart/form-data`

| Field | Type | Notes |
|---|---|---|
| `image` | file | JPEG or PNG, resized client-side to about 1024 px on the long edge |

Response `200`:

```json
[
  {
    "id": "f1",
    "nameEn": "Rice",
    "nameBn": "ভাত",
    "confidence": 0.93,
    "portionGrams": 200,
    "portionLabel": "1 plate"
  }
]
```

`confidence` is 0 to 1. The frontend flags items below 0.6 for review.

---

## POST /api/nutrition

Calculate nutrition for the (user-corrected) food list. This is the authoritative calculation.

Request:

```json
{ "items": [ { "id": "f1", "nameEn": "Rice", "nameBn": "ভাত", "confidence": 1, "portionGrams": 200 } ] }
```

Response `200`:

```json
{
  "items": [
    {
      "id": "f1",
      "nameEn": "Rice",
      "nameBn": "ভাত",
      "confidence": 1,
      "portionGrams": 200,
      "calories": 260,
      "proteinG": 5,
      "carbsG": 57,
      "fatG": 0.5,
      "fiberG": 0.8
    }
  ],
  "totals": { "calories": 260, "proteinG": 5, "carbsG": 57, "fatG": 0.5, "fiberG": 0.8 },
  "insights": [
    { "type": "warn", "textEn": "Protein is low for this meal.", "textBn": "এই খাবারে প্রোটিন কম।" }
  ]
}
```

`insights[].type` is one of `good`, `warn`, `tip`.

---

## POST /api/shopping

Generate a budget-aware shopping list.

Request:

```json
{
  "totals": { "calories": 260, "proteinG": 5, "carbsG": 57, "fatG": 0.5, "fiberG": 0.8 },
  "budgetBdt": 300,
  "goal": "maintain",
  "dietary": ["no_beef"]
}
```

`goal` is one of `lose`, `maintain`, `gain`.

Response `200`:

```json
[
  {
    "id": "s1",
    "nameEn": "Eggs",
    "nameBn": "ডিম",
    "quantity": "6 pieces",
    "estPriceBdt": 72,
    "reason": "Affordable protein"
  }
]
```

Prices are estimates and must be labeled as such in the UI.

---

## POST /api/chat

Nutrition assistant.

Request:

```json
{
  "message": "What is a cheap high-protein dinner?",
  "lang": "bn",
  "history": [ { "role": "user", "content": "..." }, { "role": "assistant", "content": "..." } ]
}
```

Response `200`:

```json
{ "reply": "..." }
```

The backend should answer in `lang` and avoid medical diagnosis or treatment advice.
