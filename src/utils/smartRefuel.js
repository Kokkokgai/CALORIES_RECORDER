import { FOOD_DATABASE } from './foodDatabase.js';

/**
 * Returns ranked food suggestions that fit within the remaining macro budget.
 * Pure algorithm — no AI.
 *
 * @param {{ remainingCal:number, remainingProtein:number, remainingCarbs:number, remainingFat:number }} budget
 * @param {number} limit
 * @returns {{ key:string, entry:object, score:number, tag:string, tagColor:string }[]}
 */
export function getSmartRefuel({ remainingCal, remainingProtein, remainingCarbs, remainingFat }, limit = 6) {
  if (remainingCal < 80) return [];

  const proteinPriority = remainingProtein > 15;
  const carbPriority    = !proteinPriority && remainingCarbs > 30;

  const results = [];

  for (const [key, entry] of Object.entries(FOOD_DATABASE)) {
    const { calories, protein, fat } = entry;
    if (calories <= 0) continue;

    // Filter: one serving must fit within budget with ≤20% overshoot
    if (calories > remainingCal * 1.2) continue;
    // Skip tiny-calorie condiment-style entries that add no satiety
    if (calories < 40) continue;

    // Protein efficiency: g protein per 100 kcal (higher = leaner)
    const proteinEff = (protein / calories) * 100;

    // Calorie fit: how closely one serving fills remaining budget (0–1)
    const calFit = calories / remainingCal;

    // Protein contribution: how much of the protein gap this fills
    const proteinFill = remainingProtein > 0
      ? Math.min(1, protein / remainingProtein)
      : 0;

    // Fat penalty when on a fat deficit
    const fatPenalty = remainingFat < 5 && fat > 15 ? 0.3 : 0;

    const score = proteinPriority
      ? proteinFill * 0.50 + (proteinEff / 50) * 0.25 + calFit * 0.25 - fatPenalty
      : carbPriority
        ? calFit * 0.55 + proteinFill * 0.25 + (proteinEff / 50) * 0.20 - fatPenalty
        : calFit * 0.45 + proteinFill * 0.35 + (proteinEff / 50) * 0.20 - fatPenalty;

    // Human-readable tag
    let tag, tagColor;
    if (proteinEff > 25)      { tag = 'High protein'; tagColor = 'var(--color-accent)'; }
    else if (proteinEff > 14) { tag = 'Good protein'; tagColor = '#2563eb'; }
    else if (calories < 150)  { tag = 'Low cal';      tagColor = '#7c3aed'; }
    else                      { tag = 'Good fit';     tagColor = 'var(--color-text-muted)'; }

    results.push({ key, entry, score, tag, tagColor });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
