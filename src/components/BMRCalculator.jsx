import { useState } from 'react';
import {
  ACTIVITY_LEVELS,
  GOALS,
  MACRO_RATES,
  buildProfile,
} from '../utils/macroCalculator.js';
import { calcBMI, bmiLabel, estimateBodyFat, bodyFatLabel, recommendGoal } from '../utils/bodyStats.js';
import { MacroBreakdownPie } from './NutritionCharts.jsx';

export default function BMRCalculator({ onSave }) {
  const [form, setForm] = useState({
    age: '', gender: 'male', weight: '', height: '',
    activityLevel: 1.55, goal: 'maintain',
  });
  const [result, setResult] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setResult(null);
  }

  function handleCalculate(e) {
    e.preventDefault();
    const age    = parseInt(form.age);
    const weight = parseFloat(form.weight);
    const height = parseFloat(form.height);
    if (!age || !weight || !height || age <= 0 || weight <= 0 || height <= 0) return;

    const profile = buildProfile({
      age, weight, height,
      gender:        form.gender,
      activityLevel: parseFloat(form.activityLevel),
      goal:          form.goal,
    });

    // Goal recommendation
    const bmi   = calcBMI(weight, height);
    const bfPct = estimateBodyFat(bmi, age, form.gender === 'male');
    const rec   = recommendGoal(bmi, bfPct, form.gender === 'male');

    setResult({ ...profile, bmi, bfPct, recommendation: rec });
  }

  const isValid = form.age && form.weight && form.height &&
    parseInt(form.age) > 0 && parseFloat(form.weight) > 0 && parseFloat(form.height) > 0;

  return (
    <div className="card">
      <h2>Profile &amp; Calorie Target</h2>
      <p className="subtitle">
        Calculate your BMR, TDEE, and personalised daily macro targets.
      </p>

      <form onSubmit={handleCalculate} className="form">
        <div className="form-row">
          <div className="field">
            <label>Age</label>
            <input type="number" name="age" value={form.age} onChange={handleChange} placeholder="25" min="10" max="120" />
          </div>
          <div className="field">
            <label>Gender</label>
            <select name="gender" value={form.gender} onChange={handleChange}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>Weight (kg)</label>
            <input type="number" name="weight" value={form.weight} onChange={handleChange} placeholder="70" min="20" step="0.1" />
          </div>
          <div className="field">
            <label>Height (cm)</label>
            <input type="number" name="height" value={form.height} onChange={handleChange} placeholder="170" min="50" />
          </div>
        </div>

        <div className="field">
          <label>Activity Level</label>
          <select name="activityLevel" value={form.activityLevel} onChange={handleChange}>
            {ACTIVITY_LEVELS.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Goal</label>
          <select name="goal" value={form.goal} onChange={handleChange}>
            {GOALS.map(g => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-primary" disabled={!isValid}>Calculate</button>
      </form>

      {result && <ResultBlock result={result} onSave={() => onSave(result)} />}
    </div>
  );
}

// ── Result block ─────────────────────────────────────────────────────────────

const MACRO_ROWS = [
  { label: 'Protein', key: 'protein', pctNote: '30% of calories', weightNote: r => `${r.protein.toFixed(1)} g/kg` },
  { label: 'Carbs',   key: 'carbs',   pctNote: '45% of calories', weightNote: ()  => 'remaining kcal ÷ 4' },
  { label: 'Fat',     key: 'fat',     pctNote: '25% of calories', weightNote: r => `${r.fat.toFixed(1)} g/kg` },
  { label: 'Fiber',   key: 'fiber',   pctNote: 'fixed guideline', weightNote: ()  => 'fixed guideline' },
];

function ResultBlock({ result, onSave }) {
  const { bmr, tdee, calorieTarget, macroTargets, macroTargetsLegacy, goal, bmi, bfPct, recommendation } = result;
  const rates   = MACRO_RATES[goal];
  const bmiCat  = bmiLabel(bmi);
  const bfCat   = bodyFatLabel(bfPct, result.gender === 'male');

  return (
    <div className="result-block">
      {/* ── Goal Recommendation ──────────────────────────────────────── */}
      <div className="recommendation-box" style={{
        background: 'var(--color-accent-light)',
        borderColor: 'var(--color-accent)',
      }}>
        <p className="rec-title">Goal Recommendation</p>
        <div className="rec-stats">
          <span>BMI <strong style={{ color: bmiCat.color }}>{bmi.toFixed(1)}</strong> ({bmiCat.label})</span>
          <span>Est. Body Fat <strong style={{ color: bfCat.color }}>{bfPct.toFixed(1)}%</strong> ({bfCat.label})</span>
        </div>
        <p className="rec-reason">{recommendation.reason}</p>
        {recommendation.goal !== goal && (
          <p className="rec-note">You selected: <em>{GOALS.find(g => g.value === goal)?.label}</em></p>
        )}
      </div>

      {/* ── Calorie summary ──────────────────────────────────────────── */}
      <div className="result-grid">
        <div className="result-item">
          <span className="result-label">BMR</span>
          <span className="result-value">{bmr} kcal</span>
        </div>
        <div className="result-item">
          <span className="result-label">TDEE</span>
          <span className="result-value">{tdee} kcal</span>
        </div>
        <div className="result-item result-item--highlight">
          <span className="result-label">Daily Target</span>
          <span className="result-value">{calorieTarget} kcal</span>
        </div>
      </div>

      {/* ── Macro targets ────────────────────────────────────────────── */}
      <p className="macro-targets-label">Daily macro targets (weight-based)</p>
      <div className="result-grid result-grid--macros">
        <div className="result-item">
          <span className="result-label">Protein</span>
          <span className="result-value">{macroTargets.protein}g</span>
          <span className="result-note">{rates.protein.toFixed(1)} g/kg</span>
        </div>
        <div className="result-item">
          <span className="result-label">Carbs</span>
          <span className="result-value">{macroTargets.carbs}g</span>
          <span className="result-note">remaining kcal</span>
        </div>
        <div className="result-item">
          <span className="result-label">Fat</span>
          <span className="result-value">{macroTargets.fat}g</span>
          <span className="result-note">{rates.fat.toFixed(1)} g/kg</span>
        </div>
        <div className="result-item">
          <span className="result-label">Fiber</span>
          <span className="result-value">{macroTargets.fiber}g</span>
          <span className="result-note">daily goal</span>
        </div>
      </div>

      {/* ── Macro pie ─────────────────────────────────────────────────── */}
      <MacroBreakdownPie
        protein={macroTargets.protein}
        carbs={macroTargets.carbs}
        fat={macroTargets.fat}
      />

      {/* ── Comparison table ──────────────────────────────────────────── */}
      <p className="macro-targets-label" style={{ marginTop: '1rem' }}>System comparison</p>
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Macro</th>
            <th>% System (legacy)</th>
            <th>Weight-Based (current)</th>
          </tr>
        </thead>
        <tbody>
          {MACRO_ROWS.map(({ label, key, pctNote, weightNote }) => (
            <tr key={key}>
              <td>{label}</td>
              <td>
                {macroTargetsLegacy[key]}g
                <span className="comparison-note">{pctNote}</span>
              </td>
              <td className="col-new">
                {macroTargets[key]}g
                <span className="comparison-note">{weightNote(rates)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="btn-primary" onClick={onSave}>
        Save &amp; Start Tracking
      </button>
    </div>
  );
}
