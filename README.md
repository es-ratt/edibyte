<div align="center">

# 🥗 edibyte

### Nutrition Intelligence Platform

**Eat Smart. Live Better.**

AI-assisted food recognition, nutrition insights, and budget-friendly shopping for everyday foods in Bangladesh.

</div>

---

## Introduction

**Edibyte** is an AI-powered nutrition web application that helps people understand what they eat and make better food decisions. It focuses on familiar Bangladeshi foods, with prices in Bangladeshi Taka (৳) and an English/Bangla interface as goals.

**The problem:** Most nutrition apps are built around Western foods and prices. Many people in Bangladesh have no easy way to estimate the nutrition in a home-cooked meal or to plan healthy eating on a tight budget.

**Who it's for:** Students, families, and health-conscious individuals in Bangladesh who want simple, affordable, and understandable nutrition guidance.

**How it works (intended workflow):** AI identifies foods in a photo, the user reviews and corrects the result, the system estimates nutrition, and Edibyte suggests an affordable shopping list.

>  **Project status:** Edibyte is a collaborative hackathon project under active development. This repository contains the **frontend**. See [Implementation Status](#-implementation-status) for what is working, simulated, or still pending.

---

## Key Features

| Feature | Description | Status |
|---|---|---|
|  AI Food Scanner | Upload a meal or ingredient photo and review detected items and portions | _See status table_ |
|  Nutrition Report | Estimated nutrients shown with charts | _See status table_ |
|  Smart Shopping List | Shopping list with estimated local prices in ৳ | _See status table_ |
|  Budget-Friendly Suggestions | Affordable alternatives for healthier choices | Planned |
|  AI Nutrition Assistant | Chat-style assistant for nutrition questions | _See status table_ |
|  Profile & Preferences | User goals, dietary preferences | _See status table_ |
|  Bangla / English | Bilingual interface | _See status table_ |
|  Responsive UI | Works across phone, tablet, and desktop | _See status table_ |

<!-- TODO: Fill in the Status column from the real codebase using the legend below. -->

---

## Implementation Status

**Legend:** Done = implemented in frontend; Mock = demo data only; Backend = waiting for backend; Planned = not started

| Area | Status |
|---|---|
| Upload food image UI | TBD |
| Review & edit detected items | TBD |
| Nutrition report & charts | TBD |
| Shopping list | TBD |
| AI assistant chat | TBD |
| Profile & preferences | TBD |
| Bangla / English toggle | TBD |
| Real food-recognition AI | Backend |
| Authoritative nutrition calculations | Backend |
| Real price data | Backend |

---

## Screenshots & Demo

> Screenshots and a live demo will be added once available.

| Home | Food Scanner | Nutrition Report |
|:---:|:---:|:---:|
| `docs/screenshots/home.png` _(add)_ | `docs/screenshots/scanner.png` _(add)_ | `docs/screenshots/report.png` _(add)_ |

| Shopping List | AI Assistant | Mobile View |
|:---:|:---:|:---:|
| `docs/screenshots/shopping.png` _(add)_ | `docs/screenshots/assistant.png` _(add)_ | `docs/screenshots/mobile.png` _(add)_ |

**Live demo:** `<DEPLOYMENT_URL>` _(not deployed yet)_

---

## Technology Stack

**Frontend (this repository)**

- [React](https://react.dev/) – UI library
- [TypeScript](https://www.typescriptlang.org/) – type safety
- [Vite](https://vitejs.dev/) – dev server and build tool
- [Tailwind CSS](https://tailwindcss.com/) – styling
- [React Router](https://reactrouter.com/) – page routing
- [Recharts](https://recharts.org/) – nutrition charts
- [Lucide React](https://lucide.dev/) – icons

<!-- TODO: Verify each against package.json and remove anything not installed. -->

**Planned backend (separate, owned by the backend teammate)**

- Python with FastAPI, AI/vision model integration, nutrition database and calculation logic

---

## Project Structure

```text
edibyte/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Route-level pages
│   ├── services/        # API client and mock services
│   ├── types/           # Shared TypeScript types
│   ├── mocks/           # Mock/demo data
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility helpers
│   ├── App.tsx
│   └── main.tsx
├── .env.example
├── package.json
└── README.md
```

<!-- TODO: Replace this tree with the real one (run `tree -I node_modules -L 3`). Delete any folder that does not exist. -->

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm (bundled with Node.js)
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository**

```bash
   git clone <REPOSITORY_URL>
```

2. **Go to the project directory**

```bash
   cd <PROJECT_FOLDER>
```

3. **Install dependencies**

```bash
   npm install
```

4. **Set up environment variables** (see [Environment Variables](#-environment-variables))

```bash
   cp .env.example .env
```

5. **Start the development server**

```bash
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

<!-- TODO: Confirm these names and behavior match the code, or update the table. -->

>  Vite exposes `VITE_*` variables to the browser. **Never put private API keys, passwords, or secret tokens in frontend environment variables.** Keep secrets on the backend.

---

## Mock Data & API Integration

While the backend is unavailable, the frontend can run on mock data so the interface can be built and demoed independently.

**Responsibilities**

| Frontend (this repo) | Backend (separate) |
|---|---|
| Interface and interactions | Raw-data processing |
| Client-side validation | AI model / API execution |
| Charts and visualizations | Authoritative nutrition calculations |
| Calling the API | Structured API responses |

The frontend and backend will communicate through an agreed API contract. If an `API_CONTRACT.md` exists, see [API_CONTRACT.md](./API_CONTRACT.md). **The contract is provisional until the team confirms it.**

<!-- TODO: Describe how mock mode is actually toggled and which features it covers. Remove the API_CONTRACT link if the file does not exist. -->

---

## Application Workflow

```text
Upload Food → Review Food Items → View Nutrition Report → Generate Shopping List
```

1. **Upload Food** – choose a photo of a meal or ingredients.
2. **Review Food Items** – confirm or correct detected foods and portion sizes.
3. **View Nutrition Report** – see estimated calories, macronutrients, and insights.
4. **Generate Shopping List** – get an affordable list with estimated prices in ৳.

> Each step is currently **functional / simulated / waiting for backend** according to the [Implementation Status](#-implementation-status) table.

---

## Design & User Experience

- Light backgrounds with soft emerald and mint gradients
- Rounded cards and readable typography
- Clear navigation
- Responsive layouts for mobile, tablet, and desktop
- Accessible interactions (focus states, labels, sufficient contrast)

<!-- TODO: Trim any principle that is not actually reflected in the UI. -->

---

## Development Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run the linter |

<!-- TODO: Match this table exactly to the "scripts" section of package.json. -->

---

## Roadmap

- [ ] Core UI pages (scanner, report, shopping list, assistant, profile)
- [ ] Mock data for offline development
- [ ] Integrate real food-recognition API
- [ ] Connect nutrition data sources
- [ ] Accurate nutrition calculations
- [ ] Budget-aware shopping recommendations
- [ ] Connect AI nutrition assistant
- [ ] Improve Bangla localization
- [ ] Deploy the application

<!-- TODO: Tick [x] only for items verified as complete. -->

---

## Team Collaboration & Contributing

1. **Clone** the shared repository.
2. **Create a feature branch** from the main branch:
```bash
   git checkout -b feature/short-description
```
3. **Make focused changes** – keep each branch to one purpose.
4. **Test locally** – run `npm run dev` and `npm run build` to check nothing breaks.
5. **Commit** with a clear message:
```bash
   git add .
   git commit -m "Describe what you changed"
```
6. **Push** your branch:
```bash
   git push -u origin feature/short-description
```
7. **Open a pull request** and ask a teammate to review it before merging.

---

## Responsible Use & Limitations

- Nutrition values are **estimates** and may not be exact.
- AI food recognition **can make mistakes**; always review detected items.
- Portion sizes should be checked by the user.
- Market prices are **estimates** unless verified by a reliable source.
- Edibyte provides **general nutrition information only**. It is not medical advice, diagnosis, or treatment. Consult a qualified professional for health concerns.

---

## License & Acknowledgements

**License:** Not yet specified. <!-- Update if a LICENSE file is added. -->

**Acknowledgements:** To be added (data sources, libraries, and services will be listed here once confirmed).

---

<div align="center">

Built with  for the hackathon · **Eat Smart. Live Better.**

</div>
