function fmt(val) {
  return val !== null && val !== undefined ? `${val}g` : "—";
}

export default function DailyLog({ entries, onDelete }) {
  if (entries.length === 0) {
    return (
      <div className="card">
        <h3>Today&apos;s Log</h3>
        <p className="empty-state">No food logged yet. Add your first meal above.</p>
      </div>
    );
  }

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein:  acc.protein  + (e.protein ?? 0),
      carbs:    acc.carbs    + (e.carbs   ?? 0),
      fat:      acc.fat      + (e.fat     ?? 0),
      fiber:    acc.fiber    + (e.fiber   ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  const anyMacros = entries.some(
    (e) => e.protein !== null && e.protein !== undefined
  );

  return (
    <div className="card">
      <h3>Today&apos;s Log</h3>
      <table className="log-table">
        <thead>
          <tr>
            <th>Food</th>
            <th className="num-col">kcal</th>
            {anyMacros && (
              <>
                <th className="num-col">Protein</th>
                <th className="num-col">Carbs</th>
                <th className="num-col">Fat</th>
                <th className="num-col">Fiber</th>
              </>
            )}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
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
        <tfoot>
          <tr>
            <td className="total-label">Total</td>
            <td className="num-col total-cal">{totals.calories}</td>
            {anyMacros && (
              <>
                <td className="num-col total-macro">{totals.protein}g</td>
                <td className="num-col total-macro">{totals.carbs}g</td>
                <td className="num-col total-macro">{totals.fat}g</td>
                <td className="num-col total-macro">{totals.fiber}g</td>
              </>
            )}
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
