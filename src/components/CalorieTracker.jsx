import { useState, useEffect } from 'react';
import FoodInput from './FoodInput.jsx';
import DailyLog from './DailyLog.jsx';
import { today, getDailyLog, saveDailyLog } from '../utils/storage.js';

function MacroBar({ label, consumed, target, color }) {
  const pct  = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const over = consumed > target;
  return (
    <div className="macro-bar-row">
      <div className="macro-bar-label-row">
        <span className="macro-bar-name">{label}</span>
        <span className="macro-bar-nums" style={{ color: over ? 'var(--color-danger)' : undefined }}>
          {consumed}g / {target}g
        </span>
      </div>
      <div className="macro-bar-track">
        <div className="macro-bar-fill" style={{ width: `${pct}%`, backgroundColor: over ? 'var(--color-danger)' : color }} />
      </div>
    </div>
  );
}

export default function CalorieTracker({ profile, onEditProfile }) {
  const [entries, setEntries] = useState(() => getDailyLog(today()));

  useEffect(() => { saveDailyLog(today(), entries); }, [entries]);

  function handleAdd(entry) {
    setEntries(prev => [...prev, { id: Date.now(), ...entry }]);
  }

  function handleDelete(id) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories ?? 0),
      protein:  acc.protein  + (e.protein  ?? 0),
      carbs:    acc.carbs    + (e.carbs    ?? 0),
      fat:      acc.fat      + (e.fat      ?? 0),
      fiber:    acc.fiber    + (e.fiber    ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  const { calorieTarget, macroTargets: mt } = profile;
  const remaining = calorieTarget - totals.calories;
  const progress  = Math.min((totals.calories / calorieTarget) * 100, 100);
  const calColor  = totals.calories > calorieTarget ? 'var(--color-danger)'
    : totals.calories > calorieTarget * 0.9 ? 'var(--color-warn)' : 'var(--color-accent)';

  return (
    <div className="view-content">
      {/* Calorie summary */}
      <div className="card summary-card">
        <div className="summary-header">
          <h2>Today's Log</h2>
          <button className="btn-link" onClick={onEditProfile}>Edit Profile</button>
        </div>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Target</span>
            <span className="summary-value">{calorieTarget} kcal</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Consumed</span>
            <span className="summary-value">{totals.calories} kcal</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Remaining</span>
            <span className="summary-value" style={{ color: remaining < 0 ? 'var(--color-danger)' : undefined }}>
              {remaining < 0 ? `${Math.abs(remaining)} over` : `${remaining} kcal`}
            </span>
          </div>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progress}%`, backgroundColor: calColor }} />
        </div>
        <p className="progress-label">{Math.round(progress)}% of daily target</p>
      </div>

      {/* Macro bars */}
      {mt && (
        <div className="card">
          <h3>Macro Targets</h3>
          <div className="macro-bars">
            <MacroBar label="Protein" consumed={totals.protein} target={mt.protein} color="#2d6a4f" />
            <MacroBar label="Carbs"   consumed={totals.carbs}   target={mt.carbs}   color="#2563eb" />
            <MacroBar label="Fat"     consumed={totals.fat}     target={mt.fat}     color="#d97706" />
            <MacroBar label="Fiber"   consumed={totals.fiber}   target={mt.fiber}   color="#7c3aed" />
          </div>
        </div>
      )}

      <FoodInput onAdd={handleAdd} />
      <DailyLog entries={entries} onDelete={handleDelete} />
    </div>
  );
}
