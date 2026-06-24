import { FOOD_DATABASE, calculateNutrition } from './foodDatabase.js';

const WORD_NUMBERS = {
  zero: 0, half: 0.5, quarter: 0.25, third: 0.333,
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, double: 2,
};

const UNIT_NORM = {
  g: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', milliliter: 'ml', milliliters: 'ml', millilitre: 'ml',
  l: 'l', liter: 'l', litre: 'l', liters: 'l',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', tbs: 'tbsp',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  cup: 'cup', cups: 'cup',
  can: 'can', cans: 'can',
  slice: 'slice', slices: 'slice',
  bar: 'bar', bars: 'bar',
  scoop: 'scoop', scoops: 'scoop',
  piece: 'piece', pieces: 'piece', pc: 'piece', pcs: 'piece',
  serving: 'serving', servings: 'serving',
  bowl: 'bowl', bowls: 'bowl',
  plate: 'plate', plates: 'plate',
  stick: 'sticks', sticks: 'sticks',
  glass: 'glass', glasses: 'glass',
};

const UNIT_SCALE = { kg: 1000, l: 1000, oz: 28.35 };

function normUnit(raw) {
  return UNIT_NORM[raw?.toLowerCase()] ?? null;
}

function matchKey(text, db) {
  const t = text.toLowerCase().trim();
  if (!t) return null;

  if (db[t]) return t;

  // Try singular
  const sing = t.endsWith('s') ? t.slice(0, -1) : null;
  if (sing && db[sing]) return sing;

  // Scored search
  const scored = Object.keys(db).map(key => {
    let s = 0;
    if (key === t) s = 100;
    else if (key.startsWith(t)) s = 85;
    else if (t.startsWith(key)) s = 80;
    else if (key.includes(t)) s = 70;
    else if (t.includes(key)) s = 65;
    else {
      const tw = t.split(/\s+/);
      const kw = key.split(/\s+/);
      const hits = tw.filter(w => kw.includes(w)).length;
      s = hits > 0 ? (hits / Math.max(tw.length, kw.length)) * 60 : 0;
    }
    return { key, s };
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s);

  return scored[0]?.key ?? null;
}

/**
 * Parse a natural-language food string.
 *
 * Examples:
 *   "200g chicken breast"  → qty=200, unit=g,    food=chicken breast
 *   "2 eggs"               → qty=2,   unit=piece, food=egg
 *   "half can tuna"        → qty=0.5, unit=can,   food=canned tuna
 *   "1.5 tbsp peanut butter" → qty=1.5, unit=tbsp, food=peanut butter
 *
 * @param {string} input
 * @returns {{ foodKey, quantity, unit, calories, protein, carbs, fat, fiber, multiplier } | null}
 */
export function parseFood(input) {
  if (!input?.trim()) return null;

  const db = FOOD_DATABASE;
  const tokens = input.trim().toLowerCase().split(/\s+/);
  let qty = null, unitStr = '', foodStart = 0;

  // ── Step 1: Extract leading quantity ──────────────────────────────────────
  const n0 = parseFloat(tokens[0].replace(',', '.'));
  if (!isNaN(n0)) {
    qty = n0;
    foodStart = 1;
  } else if (WORD_NUMBERS[tokens[0]] !== undefined) {
    qty = WORD_NUMBERS[tokens[0]];
    foodStart = 1;
  }

  // ── Step 2: Extract optional unit ─────────────────────────────────────────
  if (foodStart < tokens.length) {
    const candidate = normUnit(tokens[foodStart]);
    if (candidate) {
      unitStr = candidate;
      foodStart++;
    }
  }

  // ── Step 3: Food text ──────────────────────────────────────────────────────
  let foodText = tokens.slice(foodStart).join(' ');

  // Edge case: "2 eggs" – unit slot was empty, foodText = "eggs"
  // If foodText is a direct or singular DB match, just use it
  if (!foodText && !unitStr && qty !== null) return null;

  // If nothing left after qty, and we have a unit, the "unit" might be the food (e.g. "2 eggs")
  if (!foodText && unitStr) {
    const unitToken = tokens[qty !== null ? 1 : 0] ?? '';
    const fk = matchKey(unitToken, db);
    if (fk) {
      const e = db[fk];
      const fq = qty ?? e.servingSize;
      const n  = calculateNutrition(fk, fq);
      return n ? { foodKey: fk, quantity: fq, unit: e.servingUnit, ...n } : null;
    }
    return null;
  }

  if (!foodText) return null;

  // ── Step 4: Match food ────────────────────────────────────────────────────
  let foodKey = matchKey(foodText, db);

  // If unit is "can" and food is "tuna", prefer "canned tuna" if it exists
  if (unitStr === 'can' && foodKey && !db[foodKey]?.servingUnit?.includes('can')) {
    const withCan = matchKey('canned ' + foodText, db);
    if (withCan && db[withCan].servingUnit === 'can') foodKey = withCan;
  }

  if (!foodKey) return null;

  const entry = db[foodKey];
  let finalQty = qty ?? entry.servingSize;

  // ── Step 5: Unit conversion ───────────────────────────────────────────────
  const rawUnit = tokens[foodStart - 1] ?? '';
  if (UNIT_SCALE[rawUnit]) {
    finalQty = Math.round(finalQty * UNIT_SCALE[rawUnit]);
    unitStr = rawUnit === 'kg' ? 'g' : 'ml';
  }

  const nutrition = calculateNutrition(foodKey, finalQty);
  if (!nutrition) return null;

  return {
    foodKey,
    quantity: finalQty,
    unit: unitStr || entry.servingUnit,
    ...nutrition,
  };
}

/**
 * Search foods by name. Returns ranked results.
 * @param {string} query
 * @param {number} limit
 */
export function searchFoods(query, limit = 8) {
  if (!query?.trim()) return [];
  const q = query.toLowerCase().trim();
  const db = FOOD_DATABASE;

  return Object.entries(db)
    .map(([key, entry]) => {
      let score = 0;
      if (key === q) score = 100;
      else if (key.startsWith(q)) score = 90;
      else if (key.includes(q)) score = 75;
      else if (q.includes(key)) score = 70;
      else {
        const qw = q.split(/\s+/);
        const kw = key.split(/\s+/);
        const hits = qw.filter(w => kw.some(k => k.includes(w) || w.includes(k))).length;
        score = hits > 0 ? (hits / Math.max(qw.length, kw.length)) * 55 : 0;
      }
      return { key, entry, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
