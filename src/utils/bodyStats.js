// ── BMI ───────────────────────────────────────────────────────────────────
export function calcBMI(weightKg, heightCm) {
  const h = heightCm / 100;
  return weightKg / (h * h);
}

export function bmiLabel(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', color: '#2563eb' };
  if (bmi < 25.0) return { label: 'Normal',      color: '#2d6a4f' };
  if (bmi < 30.0) return { label: 'Overweight',  color: '#d97706' };
  return               { label: 'Obese',         color: '#e53e3e' };
}

// Deurenberg et al., 1991
export function estimateBodyFat(bmi, age, isMale) {
  return (1.20 * bmi) + (0.23 * age) - (10.8 * (isMale ? 1 : 0)) - 5.4;
}

export function bodyFatLabel(pct, isMale) {
  const ranges = isMale
    ? [6, 14, 18, 25]   // essential / athletic / fitness / acceptable / obese
    : [14, 21, 25, 32];
  const labels = ['Essential', 'Athletic', 'Fitness', 'Acceptable', 'Obese'];
  const colors = ['#2563eb', '#2d6a4f', '#059669', '#d97706', '#e53e3e'];
  const idx = ranges.findIndex(r => pct < r);
  const i = idx === -1 ? 4 : idx;
  return { label: labels[i], color: colors[i] };
}

// Goal recommendation based on BMI + estimated body fat
export function recommendGoal(bmi, bfPct, isMale) {
  const obese = isMale ? bfPct > 25 : bfPct > 32;
  const lean  = isMale ? bfPct < 12 : bfPct < 20;

  if (bmi > 27 || obese) {
    return {
      goal:   'loss',
      reason: `BMI ${bmi.toFixed(1)} and estimated body fat ${bfPct.toFixed(1)}% indicate a fat-loss phase is recommended. A 500 kcal/day deficit will yield ~0.5 kg/week loss.`,
    };
  }
  if (bmi < 20 || lean) {
    return {
      goal:   'gain',
      reason: `BMI ${bmi.toFixed(1)} and low body fat ${bfPct.toFixed(1)}% suggest a muscle-building phase. A 300 kcal surplus supports lean mass gain.`,
    };
  }
  return {
    goal:   'maintain',
    reason: `BMI ${bmi.toFixed(1)} and estimated body fat ${bfPct.toFixed(1)}% are in a healthy range. Maintenance with body-recomposition is ideal.`,
  };
}

// Waist-to-height ratio (health risk proxy)
export function waistHeightRisk(waistCm, heightCm) {
  const r = waistCm / heightCm;
  if (r < 0.43) return { label: 'Slim',          risk: 'low',       color: '#2563eb' };
  if (r < 0.53) return { label: 'Healthy',        risk: 'low',       color: '#2d6a4f' };
  if (r < 0.58) return { label: 'Overweight',     risk: 'moderate',  color: '#d97706' };
  if (r < 0.63) return { label: 'Very overweight',risk: 'high',      color: '#e53e3e' };
  return               { label: 'Obese',          risk: 'very high', color: '#7f1d1d' };
}

// Weekly weight-change rate (kg / week)
export function weeklyWeightChange(bodyLog) {
  if (bodyLog.length < 2) return null;
  const sorted = [...bodyLog].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-8); // up to 8 points
  const first  = recent[0];
  const last   = recent[recent.length - 1];
  const days   = (new Date(last.date) - new Date(first.date)) / 86_400_000;
  if (days < 2) return null;
  return ((last.weight - first.weight) / days) * 7;
}
