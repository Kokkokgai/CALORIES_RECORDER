const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_META  = {
  breakfast: { label: 'Breakfast', icon: '🌅' },
  lunch:     { label: 'Lunch',     icon: '🥗' },
  dinner:    { label: 'Dinner',    icon: '🍽️' },
  snack:     { label: 'Snack',     icon: '🍎' },
};

function fmt(val) {
  return val !== null && val !== undefined ? `${val}g` : '—';
}

function sum(entries, field) {
  return entries.reduce((acc, e) => acc + (e[field] ?? 0), 0);
}

function MealSection({ mealKey, entries, anyMacros, onDelete, onSavePreset }) {
  const meta  = MEAL_META[mealKey];
  const kcal  = sum(entries, 'calories');

  return (
    <div className="meal-section">
      <div className="meal-section-header">
        <span className="meal-section-title">
          {meta.icon} {meta.label}
        </span>
        <span className="meal-section-kcal">{kcal} kcal</span>
        <button
          className="btn-preset-save"
          onClick={() => onSavePreset(mealKey, entries)}
          title={`Save ${meta.label} as preset`}
        >
          Save preset
        </button>
      </div>

      <table className="log-table">
        <tbody>
          {entries.map(entry => (
            <tr key={entry.id}>
              <td>{entry.foodName}</td>
              <td className="num-col cal-cell">{entry.calories}</td>
              {anyMacros && (
                <>
                  <td className="num-col macro-col">{fmt(entry.protein)}</td>
                  <td className="num-col macro-col">{fmt(entry.carbs)}</td>
                  <td className="num-col macro-col">{fmt(entry.fat)}</td>
                  <td className="num-col macro-col">{fmt(entry.fiber)}</td>
                </>
              )}
              <td>
                <button
                  className="btn-delete"
                  onClick={() => onDelete(entry.id)}
                  aria-label={`Remove ${entry.foodName}`}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DailyLog({ entries, onDelete, onSavePreset }) {
  if (entries.length === 0) {
    return (
      <div className="card">
        <h3>Today&apos;s Log</h3>
        <p className="empty-state">No food logged yet. Add your first meal above.</p>
      </div>
    );
  }

  const anyMacros = entries.some(e => e.protein !== null && e.protein !== undefined);

  // Group entries by meal; entries without a meal tag fall into snack
  const groups = {};
  for (const e of entries) {
    const key = MEAL_ORDER.includes(e.meal) ? e.meal : 'snack';
    (groups[key] ??= []).push(e);
  }

  const totalCal = sum(entries, 'calories');

  return (
    <div className="card">
      <div className="log-header">
        <h3>Today&apos;s Log</h3>
        <span className="log-total-badge">{totalCal} kcal total</span>
      </div>

      {anyMacros && (
        <div className="log-macro-header">
          <span className="log-col-food">Food</span>
          <span className="log-col-num">kcal</span>
          <span className="log-col-num">P</span>
          <span className="log-col-num">C</span>
          <span className="log-col-num">F</span>
          <span className="log-col-num">Fi</span>
          <span className="log-col-action"></span>
        </div>
      )}

      {MEAL_ORDER.filter(k => groups[k]?.length).map(key => (
        <MealSection
          key={key}
          mealKey={key}
          entries={groups[key]}
          anyMacros={anyMacros}
          onDelete={onDelete}
          onSavePreset={onSavePreset}
        />
      ))}

      <div className="log-totals-row">
        <span className="total-label">Total</span>
        <span className="num-col total-cal">{totalCal}</span>
        {anyMacros && (
          <>
            <span className="num-col total-macro">{sum(entries,'protein')}g</span>
            <span className="num-col total-macro">{sum(entries,'carbs')}g</span>
            <span className="num-col total-macro">{sum(entries,'fat')}g</span>
            <span className="num-col total-macro">{sum(entries,'fiber')}g</span>
          </>
        )}
      </div>
    </div>
  );
}
