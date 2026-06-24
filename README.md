# NutriTrack — Fitness Nutrition Tracker

A production-ready, mobile-first fitness nutrition tracker built with React 19 and Vite. All data stays on your device — no backend, no account required.

---

## Features

### Core Tracking
- **BMR & TDEE calculator** using the Mifflin-St Jeor equation
- **Weight-based macro targets** — protein and fat allocated in g/kg body weight; carbs fill remaining calories
- **Daily food log** with calorie and macro progress bars
- **Serving size multiplier** — every food entry scales accurately from the database serving definition

### Food Input
- **Quick Add with NLP parser** — type naturally: `200g chicken breast`, `2 eggs`, `half can tuna`, `1.5 tbsp peanut butter`
- **Live search with autocomplete** — ranked suggestions as you type
- **Favourites** — star any food to pin it to search results
- **Recent foods** — last 10 foods shown as one-tap chips
- **By Macros mode** — enter protein / carbs / fat directly; calories calculated automatically

### Food Database
- **137 foods** across 13 categories
- **Raw vs cooked variants** for chicken breast, beef, salmon, rice (incl. basmati), oats, sweet potato
- **Malaysian & Asian foods** — nasi lemak, char kway teow, laksa, roti canai, satay, and more
- Categories: Rice & Noodle Dishes · Malaysian & Asian · Western & Fast Food · Protein & Meat · Grains & Cereals · Bread & Bakery · Vegetables · Fruits · Dairy · Nuts & Seeds · Beverages · Snacks & Desserts · Supplements

### Dashboard
- **SVG calorie ring** — consumed vs target at a glance
- **Macro donut rings** — protein, carbs, fat, fiber with over-target highlighting
- **Water tracker** — 8-glass visual with ml counter
- **Weekly bar chart** — 7-day calorie history with target reference line
- **Weekly averages** — calories and protein per day, variance vs target

### Body Composition (Progress tab)
- Log weight, waist, chest, hip, arms, and thighs
- **BMI** with WHO category label
- **Estimated body fat %** (Deurenberg formula)
- **Weekly weight-change rate** (kg/week trend)
- **Weight trend line chart** (up to 30 data points)
- Measurement history table

### Smart Insights
- Rule-based engine generating personalised cards:
  - Protein / fiber gaps with specific food suggestions
  - Calorie target hit / exceeded
  - Weekly deficit or surplus average
  - Weight loss / gain rate — too fast, too slow, or on track
  - Hydration reminder when actively logging

### Goal Recommendation Engine
- Runs on every profile calculation
- Outputs recommended goal (loss / maintain / gain) with written reasoning
- Based on BMI + estimated body fat percentage

### AI Coach (optional)
- Powered by **Claude claude-opus-4-8** via the Anthropic API
- Structured coaching response: Today's Focus · Doing Well · Key Improvement · Today's Tip
- API key entered once and stored locally in the browser

### UX
- **Dark mode** — toggle in the header, preference persisted
- **Mobile-first** — fixed bottom navigation, responsive grid layouts
- All data stored in `localStorage` — works fully offline, no sign-up

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build tool | Vite 8 |
| Charts | Recharts 3 |
| Styling | Plain CSS with CSS custom properties |
| Storage | Browser `localStorage` |
| AI (optional) | Anthropic API — `claude-opus-4-8` |

---

## Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 18+ (tested on v24) |
| npm | 9+ |

---

## Getting Started

```bash
# 1. Clone the repository
git clone <repository-url>
cd calories_recorder

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

On first load, go to the **Profile** tab, fill in your details, and click **Calculate → Save & Start Tracking**. The full app unlocks after saving.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local development server with hot reload |
| `npm run build` | Build optimised production bundle to `dist/` |
| `npm run preview` | Serve the production build locally for verification |
| `npm run lint` | Run ESLint |

---

## Project Structure

```
calories_recorder/
├── public/
├── src/
│   ├── components/
│   │   ├── BMRCalculator.jsx    # Profile form + goal recommendation + macro comparison table
│   │   ├── BodyProgress.jsx     # Body measurements log + BMI/BF% display + weight chart
│   │   ├── CalorieTracker.jsx   # Log view — calorie summary + macro progress bars
│   │   ├── CoachMode.jsx        # AI coach powered by Claude API
│   │   ├── DailyLog.jsx         # Food log table with running totals
│   │   ├── Dashboard.jsx        # Calorie ring + macro rings + water tracker + weekly chart
│   │   ├── FoodInput.jsx        # Quick Add (NLP + search + recents + favourites) and By Macros
│   │   ├── InsightsPanel.jsx    # Smart insight cards
│   │   ├── Navigation.jsx       # Fixed bottom tab bar
│   │   └── NutritionCharts.jsx  # Recharts wrappers — MacroRing, WeeklyCaloriesChart, WeightTrendChart, MacroBreakdownPie
│   ├── utils/
│   │   ├── bodyStats.js         # BMI, body fat estimation, goal recommendation, weekly weight change
│   │   ├── foodDatabase.js      # 137-food database + getCategories / getFoodsByCategory / calculateNutrition
│   │   ├── foodParser.js        # NLP food parser + ranked searchFoods
│   │   ├── insights.js          # Rule-based insights engine
│   │   ├── macroCalculator.js   # BMR, TDEE, daily target, weight-based macros, legacy % macros
│   │   └── storage.js           # localStorage abstraction — single place for all reads and writes
│   ├── App.jsx                  # Root — tab router, dark mode toggle, profile state
│   ├── App.css                  # All component styles
│   └── index.css                # CSS reset + custom properties (light & dark themes)
├── index.html
├── package.json
└── vite.config.js
```

---

## localStorage Keys

All keys are prefixed with `nutri_`. To inspect: DevTools → Application → Local Storage → `http://localhost:5173`.

| Key | Contents |
|---|---|
| `nutri_profile` | User profile — age, weight, height, gender, goal, BMR, TDEE, macro targets |
| `nutri_log_YYYY-MM-DD` | Array of food log entries for that date |
| `nutri_water_YYYY-MM-DD` | Water glass count (integer) for that date |
| `nutri_body_log` | Array of all body measurement objects (weight, waist, chest, etc.) |
| `nutri_recents` | Array of up to 10 recently logged food keys |
| `nutri_favourites` | Array of starred food keys |
| `nutri_dark` | Boolean — dark mode on/off preference |
| `nutri_coach_key` | Anthropic API key (Coach Mode only, browser-local) |

> Data is tied to one browser on one device. Clearing browser storage or using incognito will wipe all entries.

---

## AI Coach Setup (optional)

1. Open the **Profile** tab and scroll to **AI Coach**.
2. Paste your Anthropic API key (starts with `sk-ant-`).
3. Click **Get Coach Advice**.

The key is saved to `localStorage` only. The app calls the Anthropic API directly from the browser — no proxy server involved.

Get a key at: [https://console.anthropic.com](https://console.anthropic.com)

---

## Deployment

This is a fully static app — no server required. Build once, deploy the `dist/` folder anywhere.

```bash
npm run build
# Output: dist/
```

### Netlify — drag and drop

1. Run `npm run build`
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Deploy manually**
3. Drag and drop the `dist/` folder

### Netlify — CLI

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

### Vercel

```bash
npm install -g vercel
vercel --prod
```

Vercel auto-detects Vite and uses `dist/` as the output directory.

### GitHub Pages

1. Add the `gh-pages` package:

```bash
npm install --save-dev gh-pages
```

2. Add a `deploy` script to `package.json`:

```json
"scripts": {
  "deploy": "gh-pages -d dist"
}
```

3. Set the base path in `vite.config.js` (replace with your repo name):

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/your-repo-name/',
  plugins: [react()],
})
```

4. Build and deploy:

```bash
npm run build
npm run deploy
```

### Cloudflare Pages

1. Push the repo to GitHub.
2. In Cloudflare Pages → **Create a project** → connect your repo.
3. Set:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Click **Save and Deploy**.

---

## Extending the Food Database

Add entries to `src/utils/foodDatabase.js`:

```js
'your food name': {
  category: 'Protein & Meat',  // must match a value in CATEGORY_ORDER
  servingSize: 100,
  servingUnit: 'g',            // g | ml | piece | tbsp | tsp | cup | can | slice | bar | scoop | serving | bowl | plate | sticks | glass
  calories: 200,
  protein: 30,
  carbs: 0,
  fat: 8,
  fiber: 0,
},
```

The NLP parser and search pick it up automatically — no other changes needed.

---

## Macro Formula Reference

### BMR — Mifflin-St Jeor

```
Male:   BMR = (10 × weight kg) + (6.25 × height cm) − (5 × age) + 5
Female: BMR = (10 × weight kg) + (6.25 × height cm) − (5 × age) − 161
```

### TDEE & Daily Target

```
TDEE         = BMR × activity multiplier
Daily Target = TDEE + goal adjustment
```

| Goal | Adjustment |
|---|---|
| Weight Loss | −500 kcal |
| Maintenance | 0 kcal |
| Muscle Gain | +300 kcal |

### Weight-Based Macro Allocation

| Goal | Protein | Fat | Carbs |
|---|---|---|---|
| Weight Loss | 2.0 g/kg | 0.8 g/kg | (remaining kcal) ÷ 4 |
| Maintenance | 1.8 g/kg | 0.9 g/kg | (remaining kcal) ÷ 4 |
| Muscle Gain | 1.8 g/kg | 1.0 g/kg | (remaining kcal) ÷ 4 |

### Calorie Scaling (Atwater)

```
Protein: 4 kcal/g   |   Carbohydrate: 4 kcal/g   |   Fat: 9 kcal/g
```

### Serving Size Multiplier

```
multiplier      = enteredQuantity / servingSize
nutritionValue  = storedValue × multiplier
```

---

## License

MIT
