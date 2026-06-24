import { useState, useEffect } from 'react';
import FoodInput from './FoodInput.jsx';
import DailyLog from './DailyLog.jsx';
import {
  today, getDailyLog, saveDailyLog,
  getYesterday, getPresets, addPreset, deletePreset,
} from '../utils/storage.js';

const MEAL_META = {
  breakfast: { label: 'Breakfast', icon: '🌅' },
  lunch:     { label: 'Lunch',     icon: '🥗' },
  dinner:    { label: 'Dinner',    icon: '🍽️' },
  snack:     { label: 'Snack',     icon: '🍎' },
};

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
  const [entries,  setEntries]  = useState(() => getDailyLog(today()));
  const [presets,  setPresets]  = useState(() => getPresets());

  // preset draft: { meal, items } — waiting for user to name it
  const [draft,    setDraft]    = useState(null);
  const [draftName, setDraftName] = useState('');

  useEffect(() => { saveDailyLog(today(), entries); }, [entries]);

  function handleAdd(entry) {
    setEntries(prev => [...prev, { id: Date.now(), ...entry }]);
  }

  function handleDelete(id) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function handleCopyYesterday() {
    const yEntries = getDailyLog(getYesterday());
    if (!yEntries.length) { alert('No entries found for yesterday.'); return; }
    const copied = yEntries.map(e => ({ ...e, id: Date.now() + Math.random() }));
    setEntries(prev => [...prev, ...copied]);
  }

  // DailyLog fires this when user clicks "Save preset" on a meal group
  function handleSavePreset(meal, items) {
    const meta = MEAL_META[meal] ?? { label: meal, icon: '🍽️' };
    setDraft({ meal, items });
    setDraftName(`My ${meta.label}`);
  }

  function confirmSavePreset() {
    if (!draftName.trim() || !draft) return;
    const totalKcal = draft.items.reduce((a, e) => a + (e.calories ?? 0), 0);
    const preset = {
      id:    Date.now(),
      name:  draftName.trim(),
      meal:  draft.meal,
      kcal:  totalKcal,
      items: draft.items.map(({ foodName, calories, protein, carbs, fat, fiber }) =>
        ({ foodName, calories, protein, carbs, fat, fiber })
      ),
    };
    addPreset(preset);
    setPresets(getPresets());
    setDraft(null);
    setDraftName('');
  }

  function handleAddPreset(preset) {
    const toAdd = preset.items.map(item => ({
      ...item,
      id:   Date.now() + Math.random(),
      meal: preset.meal,
    }));
    setEntries(prev => [...prev, ...toAdd]);
  }

  function handleDeletePreset(id) {
    deletePreset(id);
    setPresets(getPresets());
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
          <div className="summary-actions">
            <button className="btn-link" onClick={handleCopyYesterday}>Copy yesterday</button>
            <button className="btn-link" onClick={onEditProfile}>Edit profile</button>
          </div>
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

      {/* Meal Presets */}
      {(presets.length > 0 || draft) && (
        <div className="card">
          <h3>Meal Presets</h3>

          {/* Naming draft */}
          {draft && (
            <div className="preset-draft">
              <span className="preset-draft-label">
                {MEAL_META[draft.meal]?.icon} Save {draft.items.length} item{draft.items.length !== 1 ? 's' : ''} as:
              </span>
              <div className="preset-draft-row">
                <input
                  type="text"
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmSavePreset(); if (e.key === 'Escape') setDraft(null); }}
                  className="preset-name-input"
                  autoFocus
                  maxLength={40}
                />
                <button className="btn-primary btn-sm" onClick={confirmSavePreset} disabled={!draftName.trim()}>Save</button>
                <button className="btn-secondary btn-sm" onClick={() => setDraft(null)}>Cancel</button>
              </div>
            </div>
          )}

          {presets.map(preset => {
            const meta = MEAL_META[preset.meal] ?? { icon: '🍽️' };
            return (
              <div key={preset.id} className="preset-row">
                <div className="preset-info">
                  <span className="preset-name">{meta.icon} {preset.name}</span>
                  <span className="preset-meta">{preset.items.length} item{preset.items.length !== 1 ? 's' : ''} · {preset.kcal} kcal</span>
                </div>
                <div className="preset-actions">
                  <button className="btn-secondary btn-sm" onClick={() => handleAddPreset(preset)}>Add to log</button>
                  <button className="btn-delete" onClick={() => handleDeletePreset(preset.id)} aria-label="Delete preset">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FoodInput onAdd={handleAdd} />
      <DailyLog entries={entries} onDelete={handleDelete} onSavePreset={handleSavePreset} />
    </div>
  );
}
