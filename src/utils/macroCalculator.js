/**
 * macroCalculator.js
 * Single source of truth for all BMR, TDEE, and macro calculations.
 */

export { calcBMI, bmiLabel, estimateBodyFat, bodyFatLabel, recommendGoal, waistHeightRisk } from './bodyStats.js';

// ---------------------------------------------------------------------------
// JSDoc type definitions
// ---------------------------------------------------------------------------

/**
 * @typedef {'male'|'female'} Gender
 * @typedef {'loss'|'maintain'|'gain'} GoalKey
 */

/**
 * @typedef {Object} MacroResult
 * @property {number} protein - grams of protein
 * @property {number} carbs   - grams of carbohydrates
 * @property {number} fat     - grams of fat
 * @property {number} fiber   - grams of fiber
 */

/**
 * @typedef {Object} FullProfile
 * @property {number} bmr
 * @property {number} tdee
 * @property {number} calorieTarget
 * @property {MacroResult} macroTargets
 * @property {MacroResult} macroTargetsLegacy - percentage-based result for comparison
 */

// ---------------------------------------------------------------------------
// Lookup tables (used by both utility functions and the UI to build dropdowns)
// ---------------------------------------------------------------------------

/** @type {{ value: number, label: string }[]} */
export const ACTIVITY_LEVELS = [
  { value: 1.2,   label: "Sedentary (little or no exercise)" },
  { value: 1.375, label: "Lightly active (1–3 days/week)" },
  { value: 1.55,  label: "Moderately active (3–5 days/week)" },
  { value: 1.725, label: "Very active (6–7 days/week)" },
  { value: 1.9,   label: "Extra active (hard exercise + physical job)" },
];

/**
 * Goal options.
 * `kcalAdjust` is added to TDEE to derive the daily calorie target.
 * @type {{ value: GoalKey, label: string, kcalAdjust: number }[]}
 */
export const GOALS = [
  { value: "loss",     label: "Weight Loss (−500 kcal)",  kcalAdjust: -500 },
  { value: "maintain", label: "Maintenance",               kcalAdjust:    0 },
  { value: "gain",     label: "Muscle Gain (+300 kcal)",  kcalAdjust:  300 },
];

/**
 * Protein and fat multipliers (g per kg body weight) for each goal.
 * Carbs receive all remaining calories after protein + fat are allocated.
 *
 * Evidence basis:
 *  - Protein: ISSN position stand (2017): 1.6–2.2 g/kg for trained individuals.
 *    Weight-loss value is set to 2.0 g/kg to preserve lean mass in a deficit.
 *  - Fat: minimum ~0.7 g/kg recommended; higher during muscle gain supports
 *    hormonal function.
 *
 * @type {Record<GoalKey, { protein: number, fat: number }>}
 */
export const MACRO_RATES = {
  loss:     { protein: 2.0, fat: 0.8 },
  maintain: { protein: 1.8, fat: 0.9 },
  gain:     { protein: 1.8, fat: 1.0 },
};

/** Fiber targets (g/day) per gender — based on Institute of Medicine guidelines. */
const FIBER_TARGETS = { male: 38, female: 25 };

// ---------------------------------------------------------------------------
// Core calculations
// ---------------------------------------------------------------------------

/**
 * Mifflin-St Jeor BMR equation.
 * @param {number} weight - kg
 * @param {number} height - cm
 * @param {number} age    - years
 * @param {Gender} gender
 * @returns {number} BMR in kcal/day (rounded)
 */
export function calculateBMR(weight, height, age, gender) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(gender === "male" ? base + 5 : base - 161);
}

/**
 * Total Daily Energy Expenditure.
 * @param {number} bmr
 * @param {number} activityLevel - multiplier from ACTIVITY_LEVELS
 * @returns {number} TDEE in kcal/day (rounded)
 */
export function calculateTDEE(bmr, activityLevel) {
  return Math.round(bmr * activityLevel);
}

/**
 * Derive the daily calorie target by applying the goal adjustment to TDEE.
 * @param {number}  tdee
 * @param {GoalKey} goalKey
 * @returns {number} kcal/day
 */
export function calculateDailyTarget(tdee, goalKey) {
  const goal = GOALS.find((g) => g.value === goalKey);
  return tdee + (goal?.kcalAdjust ?? 0);
}

// ---------------------------------------------------------------------------
// Macro systems
// ---------------------------------------------------------------------------

/**
 * Weight-based macro allocation (primary / recommended system).
 *
 * 1. Protein = weight × rate  (g/kg)
 * 2. Fat     = weight × rate  (g/kg)
 * 3. Carbs   = (targetCalories − protein kcal − fat kcal) ÷ 4   [residual]
 * 4. Fiber   = fixed per gender
 *
 * @param {number}  weight         - kg
 * @param {number}  targetCalories - daily kcal target
 * @param {GoalKey} goalKey
 * @param {Gender}  gender
 * @returns {MacroResult}
 */
export function calculateMacrosByWeight(weight, targetCalories, goalKey, gender) {
  const rates = MACRO_RATES[goalKey] ?? MACRO_RATES.maintain;

  const protein = Math.round(weight * rates.protein);
  const fat     = Math.round(weight * rates.fat);

  const proteinCals  = protein * 4;
  const fatCals      = fat * 9;
  const remaining    = targetCalories - proteinCals - fatCals;
  const carbs        = Math.max(0, Math.round(remaining / 4));

  return {
    protein,
    carbs,
    fat,
    fiber: FIBER_TARGETS[gender] ?? 25,
  };
}

/**
 * Legacy percentage-based macro allocation (kept for comparison display only).
 *
 * Split: 30% protein / 45% carbs / 25% fat of total daily calories.
 *
 * @param {number} targetCalories
 * @param {Gender} gender
 * @returns {MacroResult}
 */
export function calculateMacrosByPercentage(targetCalories, gender) {
  return {
    protein: Math.round((targetCalories * 0.30) / 4),
    carbs:   Math.round((targetCalories * 0.45) / 4),
    fat:     Math.round((targetCalories * 0.25) / 9),
    fiber:   FIBER_TARGETS[gender] ?? 25,
  };
}

/**
 * Run all calculations from raw form inputs and return a complete profile object
 * ready to be persisted and consumed by CalorieTracker.
 *
 * @param {{ age: number, weight: number, height: number, gender: Gender,
 *           activityLevel: number, goal: GoalKey }} params
 * @returns {FullProfile & typeof params}
 */
export function buildProfile({ age, weight, height, gender, activityLevel, goal }) {
  const bmr           = calculateBMR(weight, height, age, gender);
  const tdee          = calculateTDEE(bmr, activityLevel);
  const calorieTarget = calculateDailyTarget(tdee, goal);
  const macroTargets  = calculateMacrosByWeight(weight, calorieTarget, goal, gender);
  const macroTargetsLegacy = calculateMacrosByPercentage(calorieTarget, gender);

  return {
    age, weight, height, gender, activityLevel, goal,
    bmr, tdee, calorieTarget, macroTargets, macroTargetsLegacy,
  };
}
