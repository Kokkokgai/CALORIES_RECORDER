import { useState } from 'react';
import { getBodyLog, addBodyEntry, today } from '../utils/storage.js';
import { calcBMI, bmiLabel, estimateBodyFat, bodyFatLabel, weeklyWeightChange } from '../utils/bodyStats.js';
import { WeightTrendChart } from './NutritionCharts.jsx';

const MEASUREMENTS = [
  { key: 'waist', label: 'Waist (cm)' },
  { key: 'chest', label: 'Chest (cm)' },
  { key: 'hip',   label: 'Hip (cm)' },
  { key: 'armL',  label: 'Left Arm (cm)' },
  { key: 'armR',  label: 'Right Arm (cm)' },
  { key: 'thighL',label: 'Left Thigh (cm)' },
  { key: 'thighR',label: 'Right Thigh (cm)' },
];

function fmt(v) { return v != null ? `${v}` : '—'; }

export default function BodyProgress({ profile }) {
  const [log, setLog]         = useState(() => getBodyLog());
  const [weight, setWeight]   = useState('');
  const [extras, setExtras]   = useState({});
  const [saved, setSaved]     = useState(false);

  function handleSave(e) {
    e.preventDefault();
    const w = parseFloat(weight);
    if (!w || w <= 0) return;

    const entry = {
      date: today(),
      weight: w,
      ...Object.fromEntries(
        Object.entries(extras).map(([k, v]) => [k, parseFloat(v) || null])
      ),
    };

    addBodyEntry(entry);
    const next = getBodyLog();
    setLog(next);
    setWeight('');
    setExtras({});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const latestEntry = log[log.length - 1];
  const wkChange    = weeklyWeightChange(log);

  const bmi    = profile && latestEntry ? calcBMI(latestEntry.weight, profile.height) : null;
  const bfPct  = bmi && profile         ? estimateBodyFat(bmi, profile.age, profile.gender === 'male') : null;
  const bmiCat = bmi                    ? bmiLabel(bmi)  : null;
  const bfCat  = bfPct                  ? bodyFatLabel(bfPct, profile?.gender === 'male') : null;

  return (
    <div className="view-content">
      {/* Log new entry */}
      <div className="card">
        <h3>Log Measurements</h3>
        <form onSubmit={handleSave} className="form">
          <div className="form-row">
            <div className="field">
              <label>Weight (kg) *</label>
              <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
                placeholder="72.0" min="20" step="0.1" />
            </div>
          </div>

          <details className="measurements-details">
            <summary className="measurements-summary">Optional measurements</summary>
            <div className="measurements-grid">
              {MEASUREMENTS.map(m => (
                <div className="field" key={m.key}>
                  <label>{m.label}</label>
                  <input
                    type="number"
                    value={extras[m.key] ?? ''}
                    onChange={e => setExtras(prev => ({ ...prev, [m.key]: e.target.value }))}
                    placeholder="—"
                    min="0" step="0.1"
                  />
                </div>
              ))}
            </div>
          </details>

          <button type="submit" className="btn-primary" disabled={!weight}>
            {saved ? '✓ Saved' : 'Save Entry'}
          </button>
        </form>
      </div>

      {/* Current stats */}
      {latestEntry && (
        <div className="card">
          <h3>Current Stats</h3>
          <div className="result-grid">
            <div className="result-item">
              <span className="result-label">Weight</span>
              <span className="result-value">{latestEntry.weight} kg</span>
            </div>
            {bmi && (
              <div className="result-item">
                <span className="result-label">BMI</span>
                <span className="result-value" style={{ color: bmiCat?.color }}>{bmi.toFixed(1)}</span>
                <span className="result-note">{bmiCat?.label}</span>
              </div>
            )}
            {bfPct && (
              <div className="result-item">
                <span className="result-label">Est. Body Fat</span>
                <span className="result-value" style={{ color: bfCat?.color }}>{bfPct.toFixed(1)}%</span>
                <span className="result-note">{bfCat?.label}</span>
              </div>
            )}
          </div>

          {wkChange !== null && (
            <div className="weight-change-banner" style={{
              background: wkChange < 0 ? 'var(--color-accent-light)' : '#fff3cd',
              borderColor: wkChange < 0 ? 'var(--color-accent)' : '#ffc107',
            }}>
              <span style={{ color: wkChange < 0 ? 'var(--color-accent)' : '#b45309' }}>
                {wkChange > 0 ? '+' : ''}{wkChange.toFixed(2)} kg/week trend
              </span>
            </div>
          )}

          {latestEntry.waist && profile?.height && (
            <div className="whr-note">
              Waist-to-height ratio: {(latestEntry.waist / profile.height).toFixed(2)}
            </div>
          )}
        </div>
      )}

      {/* Weight chart */}
      <div className="card">
        <h3>Weight Trend</h3>
        <WeightTrendChart bodyLog={log} />
      </div>

      {/* Log history */}
      {log.length > 0 && (
        <div className="card">
          <h3>History</h3>
          <table className="log-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="num-col">Weight</th>
                <th className="num-col">Waist</th>
                <th className="num-col">Chest</th>
                <th className="num-col">Hip</th>
              </tr>
            </thead>
            <tbody>
              {[...log].reverse().slice(0, 14).map(e => (
                <tr key={e.date}>
                  <td>{e.date}</td>
                  <td className="num-col">{e.weight} kg</td>
                  <td className="num-col">{fmt(e.waist)}</td>
                  <td className="num-col">{fmt(e.chest)}</td>
                  <td className="num-col">{fmt(e.hip)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
