import { useState } from 'react';
import { getSmartRefuel } from '../utils/smartRefuel.js';
import { toTitleCasePublic as ttc } from '../utils/foodDatabase.js';
import { today } from '../utils/storage.js';

// Default meal based on time of day (same logic as FoodInput)
function defaultMeal() {
  const h = new Date().getHours();
  if (h >= 5  && h < 11) return 'breakfast';
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 15 && h < 21) return 'dinner';
  return 'snack';
}

export default function SmartRefuel({ totals, profile, onAdd }) {
  const [open, setOpen] = useState(false);

  const { calorieTarget, macroTargets: mt } = profile;

  const remainingCal     = calorieTarget - totals.calories;
  const remainingProtein = mt.protein - totals.protein;
  const remainingCarbs   = mt.carbs   - totals.carbs;
  const remainingFat     = mt.fat     - totals.fat;

  // Only show when there's a meaningful gap
  if (remainingCal < 100 && remainingProtein < 10) return null;
  if (remainingCal <= 0) return null;

  const suggestions = open
    ? getSmartRefuel({ remainingCal, remainingProtein, remainingCarbs, remainingFat })
    : [];

  function handleAdd(key, entry) {
    onAdd({
      foodName: `${ttc(key)} (${entry.servingSize} ${entry.servingUnit})`,
      calories: entry.calories,
      protein:  entry.protein,
      carbs:    entry.carbs,
      fat:      entry.fat,
      fiber:    entry.fiber,
      meal:     defaultMeal(),
    });
  }

  const urgentLabel = remainingProtein > 20
    ? `${remainingProtein}g protein gap`
    : `${remainingCal} kcal left`;

  return (
    <div className="card refuel-card">
      <div className="refuel-header" onClick={() => setOpen(o => !o)} role="button">
        <div className="refuel-title">
          <span className="refuel-icon">🎯</span>
          <div>
            <p className="refuel-heading">What should I eat?</p>
            <p className="refuel-sub">{urgentLabel} — {open ? 'tap to hide' : 'tap to see suggestions'}</p>
          </div>
        </div>
        <span className="ws-chevron">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="refuel-body">
          <div className="refuel-budget">
            {remainingCal > 0     && <span className="budget-pill">🔥 {remainingCal} kcal left</span>}
            {remainingProtein > 0 && <span className="budget-pill protein">💪 {remainingProtein}g protein</span>}
            {remainingCarbs > 0   && <span className="budget-pill carbs">🌾 {remainingCarbs}g carbs</span>}
            {remainingFat > 0     && <span className="budget-pill fat">🫒 {remainingFat}g fat</span>}
          </div>

          {suggestions.length === 0 ? (
            <p className="empty-state" style={{ padding: '1rem 0' }}>No foods found that fit your remaining budget.</p>
          ) : (
            <div className="refuel-list">
              {suggestions.map(({ key, entry, tag, tagColor }) => (
                <div key={key} className="refuel-item">
                  <div className="refuel-item-info">
                    <div className="refuel-item-top">
                      <span className="refuel-item-name">{ttc(key)}</span>
                      <span className="refuel-item-tag" style={{ color: tagColor, borderColor: tagColor }}>{tag}</span>
                    </div>
                    <span className="refuel-item-meta">
                      {entry.servingSize}{entry.servingUnit} · {entry.calories} kcal · P {entry.protein}g · C {entry.carbs}g · F {entry.fat}g
                    </span>
                  </div>
                  <button className="btn-secondary btn-sm refuel-add" onClick={() => handleAdd(key, entry)}>
                    + Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
