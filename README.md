# ☘️ Irish Property Reality Check & Global Buyer's Remorse Comparator

> **Ever wondered what your €550k Dublin 2-bed terraced house with a damp wall buys in Bordeaux, Dubai, Sydney, or Galway?**  
> *Compare house prices, square footage, weather stats, and existential dread metrics across Ireland and 20+ choice global destinations.*

![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)
![Vite](https://img.shields.io/badge/Vite-6.0-purple.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)

---

## 🌟 Highlights & Features

- 🇮🇪 **Dual Comparison Lanes**:
  - **Lane 1 (Around Ireland)**: Compare Dublin budgets against Galway, Limerick, Cork, and Belfast (NI).
  - **Lane 2 (International)**: Compare against 18 premier cities across the UK, Europe, Australia, the Middle East, and North America.
- 📐 **Live Specs & Space Multipliers**: Automatically calculates estimated square meters, square feet, bedroom/bathroom counts, and floor space multipliers (e.g. *2.4x larger living space*).
- ☀️ **Climate & Weather Differentials**: Compares annual sunny days vs Dublin’s average 140 rainy days.
- 🍺 **Guinness Value Equivalence**: Measures space savings in monthly pints of Guinness!
- 🔥 **Existential Dread Meter**: Satirical *Buyer's Remorse Index* score (0–100) with witty real-estate roasts.
- 🔍 **One-Click Real-World Search**:
  - **Google Listings Button**: Generates pre-formatted search queries targeting active listings in each destination matching your budget.
  - **Direct Portal Links**: Opens `Rightmove`, `Idealista`, `Domain.com.au`, `PropertyFinder`, `Zillow`, `SeLoger`, `PropertyPal`, and `Daft.ie`.
- 📊 **In-Depth Side-by-Side Modal**: Full tabular comparison of metrics, architecture styles, BER ratings, and perks.
- 🎉 **Interactive Confetti**: "Accept My Fate" confetti animation for when the reality check hits.

---

## 🌍 Destinations Covered

| Region | Cities Included |
| :--- | :--- |
| **Lane 1: Ireland** | ☘️ Galway, Limerick, Cork, Belfast |
| **UK & Europe** | 🇬🇧 London, Leamington Spa, Manchester<br>🇫🇷 Paris, Bordeaux<br>🇮🇹 South of Italy (Puglia / Sicily)<br>🇪🇸 Barcelona |
| **Australia** | 🇦🇺 Melbourne, Sydney, Brisbane, Perth |
| **Middle East** | 🇦🇪 Dubai, Abu Dhabi |
| **North America** | 🇨🇦 Toronto, Vancouver<br>🇺🇸 New York, Boston, Atlanta, Orlando, Chicago, San Francisco |

---

## 🛠️ Technology Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite 6
- **Styling**: Vanilla CSS (Custom Properties, Glassmorphism design system)
- **Icons & FX**: `lucide-react`, `canvas-confetti`

---

## 🚀 Quickstart

### Prerequisites
- Node.js 18+ and `npm` installed.

### Installation & Local Setup

```bash
# Clone the repository
git clone https://github.com/Redser06/irish-property-reality-check.git

# Navigate into project folder
cd irish-property-reality-check

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the app!

---

## 📦 Building for Production

```bash
# Typecheck & build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 🗂️ Project Structure

```text
irish-property-reality-check/
├── index.html                  # HTML entry point with Google Fonts
├── package.json                # Dependencies and build scripts
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
└── src/
    ├── main.tsx                # React app mounting point
    ├── App.tsx                 # Root component & state manager
    ├── index.css               # Global glassmorphism design system
    ├── types/
    │   └── index.ts            # TypeScript interfaces
    ├── data/
    │   └── citiesData.ts       # 22 Cities dataset & Irish presets
    ├── utils/
    │   └── comparatorEngine.ts # Calculation logic & Remorse Index
    └── components/
        ├── Header.tsx              # App banner & taglines
        ├── PropertyInputForm.tsx   # URL/spec input & presets
        ├── RemorseDashboard.tsx    # Dread gauge & top shock cities
        ├── LaneTabs.tsx            # Filter tabs & sorting controls
        ├── CityCard.tsx            # Destination comparison card
        └── CityDetailModal.tsx     # In-depth side-by-side modal
```

---

## 💡 Contributing & Future Roadmap

Contributions, suggestions, and pull requests are welcome! Potential upcoming enhancements:
- [ ] Integration with Scraper APIs (**Firecrawl** / **Apify**) for live Daft/MyHome property URL parsing.
- [ ] OpenAI / Gemini LLM roasts for individual house descriptions and image vision comparisons.
- [ ] Social Media OG Image generator (*"Share My Misery"* cards for Instagram/Twitter).
- [ ] Live exchange rate feeds (`Fixer.io` / `Open Exchange Rates`).

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
