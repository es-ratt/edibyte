# 🥗 edibyte

### Nutrition Intelligence Platform

**Eat Smart. Live Better.**

A Bangla-first AI nutrition coach by Team Qbits. AI-assisted food recognition, nutrition insights, and budget-friendly shopping for everyday foods in Bangladesh.

---

## Introduction

**Edibyte** is an AI-powered nutrition web application that helps people understand what they eat and make better food decisions. It focuses on familiar Bangladeshi foods, with prices in Bangladeshi Taka (BDT) and an English/Bangla interface.

**The problem:** Most nutrition apps are built around Western foods and prices. Many people in Bangladesh have no easy way to estimate the nutrition in a home-cooked meal or to plan healthy eating on a tight budget.

**Who it is for:** Students, families, and health-conscious individuals in Bangladesh who want simple, affordable, and understandable nutrition guidance.

**How it works:** AI identifies foods in a photo, the user reviews and corrects the result, the system estimates nutrition, and Edibyte suggests an affordable shopping list.

> **Project status:** Edibyte is a collaborative hackathon project under active development. This repository contains the **frontend**. See [Implementation Status](#implementation-status) for what is working, simulated, or still pending.

---

## Key Features

| Feature | Description |
|---|---|
| AI Food Scanner | Upload a meal or ingredient photo and review detected items and portions |
| Nutrition Report | Estimated nutrients shown with charts |
| Smart Shopping List | Shopping list with estimated local prices in BDT |
| Budget-Friendly Suggestions | Affordable alternatives for healthier choices |
| AI Nutrition Assistant | Chat-style assistant for nutrition questions |
| Profile and Preferences | User goals, budget, dietary preferences |
| Bangla / English | Bilingual interface |
| Responsive UI | Works across phone, tablet, and desktop |

---

## Implementation Status

**Legend:** Done = implemented in frontend. Mock = demo data only. Backend = waiting for backend. Planned = not started.

| Area | Status |
|---|---|
| Upload food image UI | Planned |
| Review and edit detected items | Planned |
| Nutrition report and charts | Planned |
| Shopping list | Planned |
| AI assistant chat | Planned |
| Profile and preferences | Planned |
| Bangla / English toggle | Planned |
| Real food-recognition AI | Backend |
| Authoritative nutrition calculations | Backend |
| Real price data | Backend |

Update this table as pages are built.

---

## Screenshots and Demo

Screenshots and a live demo will be added once available.

| Home | Food Scanner | Nutrition Report |
|:---:|:---:|:---:|
| `docs/screenshots/home.png` | `docs/screenshots/scanner.png` | `docs/screenshots/report.png` |

| Shopping List | AI Assistant | Mobile View |
|:---:|:---:|:---:|
| `docs/screenshots/shopping.png` | `docs/screenshots/assistant.png` | `docs/screenshots/mobile.png` |

**Live demo:** not deployed yet.

---

## Technology Stack

**Frontend (this repository)**

- [React](https://react.dev/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - type safety
- [Vite](https://vitejs.dev/) - dev server and build tool
- [Tailwind CSS](https://tailwindcss.com/) - styling
- [React Router](https://reactrouter.com/) - page routing
- [Recharts](https://recharts.org/) - nutrition charts
- [Lucide React](https://lucide.dev/) - icons
- [react-i18next](https://react.i18next.com/) - English/Bangla translations

**Planned backend (separate, owned by the backend teammate)**

- Python with FastAPI, vision model integration, nutrition database and calculation logic

---

## Architecture

```
Browser (React) --> services/ (real API or mock) --> FastAPI backend
                                                      - vision model (food detection)
                                                      - nutrition DB (Bangladeshi foods, per 100 g)
                                                      - price table (BDT per kg)
```

The frontend never calculates authoritative nutrition values and never holds private API keys. It renders what the backend returns. While the backend is unavailable, a mock service returns the same data shapes.

---

## Project Structure

```
edibyte/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Route-level pages
│   ├── services/        # API client and mock services
│   ├── types/           # Shared TypeScript types
│   ├── mocks/           # Mock/demo data
│   ├── i18n/            # en.json and bn.json translations
│   ├── context/         # Meal session and profile state
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility helpers
│   ├── App.tsx
│   └── main.tsx
├── API_CONTRACT.md
├── .env.example
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm (bundled with Node.js)
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository**

```
git clone https://github.com/es-ratt/edibyte.git
```

2. **Go to the project directory**

```
cd edibyte
```

3. **Install dependencies**

```
npm install
```

4. **Set up environment variables** (see [Environment Variables](#environment-variables))

```
cp .env.example .env
```

5. **Start the development server**

```
npm run dev
```

6. **Open the app** at the local URL printed in the terminal (Vite usually uses `http://localhost:5173`).

---

## Environment Variables

Create a `.env` file in the project root.

| Variable | Purpose | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API | `http://localhost:8000` |
| `VITE_USE_MOCK_DATA` | Use built-in mock data instead of calling the backend | `true` |

> Vite exposes `VITE_*` variables to the browser. **Never put private API keys, passwords, or secret tokens in frontend environment variables.** Keep secrets on the backend.

---

## Mock Data and API Integration

While the backend is unavailable, the frontend runs on mock data so the interface can be built and demoed independently. Switching is controlled by `VITE_USE_MOCK_DATA`.

| Frontend (this repo) | Backend (separate) |
|---|---|
| Interface and interactions | Raw-data processing |
| Client-side validation | AI model / API execution |
| Charts and visualizations | Authoritative nutrition calculations |
| Calling the API | Structured API responses |

The frontend and backend communicate through the contract in [API_CONTRACT.md](API_CONTRACT.md). **The contract is provisional until the team confirms it.**

---

## Application Workflow

```
Upload Food -> Review Food Items -> View Nutrition Report -> Generate Shopping List
```

1. **Upload Food** - choose a photo of a meal or ingredients.
2. **Review Food Items** - confirm or correct detected foods and portion sizes. Low-confidence items are flagged.
3. **View Nutrition Report** - see estimated calories, macronutrients, and insights.
4. **Generate Shopping List** - get an affordable list with estimated prices in BDT.

---

## Design and User Experience

- Light backgrounds with soft emerald and mint gradients
- Rounded cards and readable typography
- A Bangla-friendly font (Noto Sans Bengali or Hind Siliguri) and Bangla digit formatting
- Clear navigation
- Responsive layouts for mobile, tablet, and desktop
- Accessible interactions (focus states, labels, sufficient contrast)

---

## Development Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run the linter |

---

## Roadmap

- [ ] Core UI pages (scanner, review, report, shopping list, assistant, profile)
- [ ] Mock data for offline development
- [ ] English/Bangla localization
- [ ] Integrate real food-recognition API
- [ ] Connect nutrition data sources
- [ ] Accurate nutrition calculations
- [ ] Budget-aware shopping recommendations
- [ ] Connect AI nutrition assistant
- [ ] Deploy the application

---

## Team Collaboration and Contributing

1. **Clone** the shared repository.
2. **Create a feature branch** from the main branch:

```
git checkout -b feature/short-description
```

3. **Make focused changes** - keep each branch to one purpose.
4. **Test locally** - run `npm run dev` and `npm run build` to check nothing breaks.
5. **Commit** with a clear message:

```
git add .
git commit -m "Describe what you changed"
```

6. **Push** your branch:

```
git push -u origin feature/short-description
```

7. **Open a pull request** and ask a teammate to review it before merging.

---

## Responsible Use and Limitations

- Nutrition values are **estimates** and may not be exact.
- AI food recognition **can make mistakes**; always review detected items.
- Portion sizes should be checked by the user.
- Market prices are **estimates** unless verified by a reliable source.
- Edibyte provides **general nutrition information only**. It is not medical advice, diagnosis, or treatment. Consult a qualified professional for health concerns.

---

## License and Acknowledgements

**License:** Not yet specified.

**Acknowledgements:** To be added (data sources, libraries, and services will be listed here once confirmed).

---

Built for the hackathon by Team Qbits. **Eat Smart. Live Better.**
