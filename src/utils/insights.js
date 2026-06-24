import { weeklyWeightChange } from './bodyStats.js';

function totals(entries) {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories ?? 0),
      protein:  acc.protein  + (e.protein  ?? 0),
      carbs:    acc.carbs    + (e.carbs    ?? 0),
      fat:      acc.fat      + (e.fat      ?? 0),
      fiber:    acc.fiber    + (e.fiber    ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

export function generateInsights({ profile, todayEntries = [], weeklyLogs = [], bodyLog = [] }) {
  if (!profile) return [];

  const { macroTargets, calorieTarget, goal } = profile;
  const today = totals(todayEntries);
  const insights = [];

  // ── Protein ──────────────────────────────────────────────────────────────
  const proteinGap = macroTargets.protein - today.protein;
  if (proteinGap > 20) {
    insights.push({
      type: 'warning',
      icon: '🥩',
      title: 'Protein below target',
      message: `Protein intake is below target by ${proteinGap}g. Add chicken breast, Greek yogurt, eggs, or a protein shake to hit your goal.`,
    });
  } else if (today.protein >= macroTargets.protein * 0.9 && todayEntries.length > 0) {
    insights.push({
      type: 'success',
      icon: '💪',
      title: 'Excellent protein intake',
      message: `Your protein intake is ${today.protein}g — right on target!`,
    });
  }

  // ── Fiber ─────────────────────────────────────────────────────────────────
  if (today.fiber < macroTargets.fiber * 0.5 && todayEntries.length > 0) {
    insights.push({
      type: 'info',
      icon: '🥦',
      title: 'Fiber intake too low',
      message: `Only ${today.fiber}g fiber today — target is ${macroTargets.fiber}g. Add broccoli, apples, oats, or legumes.`,
    });
  }

  // ── Calorie overage ───────────────────────────────────────────────────────
  const calsOver = today.calories - calorieTarget;
  if (calsOver > 50) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      title: 'Calorie target exceeded',
      message: `You have exceeded today's target by ${calsOver} kcal. Consider a lighter dinner or skip a snack.`,
    });
  } else if (calsOver >= -80 && calsOver <= 50 && todayEntries.length > 0) {
    insights.push({
      type: 'success',
      icon: '🎯',
      title: 'On target today',
      message: `Calories are right on target — great discipline!`,
    });
  }

  // ── Weekly calorie average ────────────────────────────────────────────────
  const daysWithData = weeklyLogs.filter(d => d.entries.length > 0);
  if (daysWithData.length >= 3) {
    const avgCals = daysWithData.reduce((s, d) => s + totals(d.entries).calories, 0) / daysWithData.length;
    const diff = avgCals - calorieTarget;
    const abs = Math.abs(Math.round(diff));

    if (diff < -150) {
      insights.push({
        type: 'info',
        icon: '📉',
        title: 'Weekly calorie deficit',
        message: `You are averaging a ${abs} kcal deficit over the past week.`,
      });
    } else if (diff > 200 && goal === 'loss') {
      insights.push({
        type: 'warning',
        icon: '📊',
        title: 'Weekly calorie surplus',
        message: `Weekly average is ${abs} kcal above your fat-loss target. Check portion sizes.`,
      });
    } else if (diff > 0 && goal === 'gain') {
      insights.push({
        type: 'success',
        icon: '📈',
        title: 'On track for muscle gain',
        message: `Weekly average is ${abs} kcal above maintenance — consistent surplus for muscle growth.`,
      });
    }
  }

  // ── Fat intake ────────────────────────────────────────────────────────────
  const fatOver = today.fat - macroTargets.fat;
  if (fatOver > 15 && goal === 'loss') {
    insights.push({
      type: 'info',
      icon: '🫒',
      title: 'Fat intake high',
      message: `Fat is ${fatOver}g above target. Reduce cooking oils, cheese, and processed snacks.`,
    });
  }

  // ── Body weight trend ─────────────────────────────────────────────────────
  const wkChange = weeklyWeightChange(bodyLog);
  if (wkChange !== null) {
    if (goal === 'loss') {
      if (wkChange < -1.5) {
        insights.push({ type: 'warning', icon: '⚡', title: 'Weight loss too fast', message: 'Losing more than 1.5 kg/week risks muscle loss. Add ~200 kcal to slow the rate.' });
      } else if (wkChange > 0.2) {
        insights.push({ type: 'warning', icon: '📊', title: 'Weight trending up', message: 'Despite a fat-loss goal, weight is trending up. Review portion sizes and log carefully.' });
      } else if (wkChange <= -0.2) {
        insights.push({ type: 'success', icon: '✅', title: 'Healthy weight loss rate', message: `Losing ~${Math.abs(wkChange).toFixed(2)} kg/week — exactly on track!` });
      }
    } else if (goal === 'gain') {
      if (wkChange > 0.5) {
        insights.push({ type: 'warning', icon: '⚡', title: 'Gaining too fast', message: 'Over 0.5 kg/week may include excess fat. Reduce surplus by ~150 kcal.' });
      } else if (wkChange > 0.1) {
        insights.push({ type: 'success', icon: '✅', title: 'Optimal gain rate', message: `Gaining ~${wkChange.toFixed(2)} kg/week — lean and steady!` });
      }
    }
  }

  // ── Hydration nudge (always) ──────────────────────────────────────────────
  if (todayEntries.length > 2) {
    insights.push({
      type: 'info',
      icon: '💧',
      title: 'Stay hydrated',
      message: 'Aim for 8 glasses (2 L) of water per day. Hydration supports metabolism and performance.',
    });
  }

  return insights;
}
