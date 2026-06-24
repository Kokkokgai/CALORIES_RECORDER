import { useState } from 'react';
import { getWeeklyLogs, getMonthlyLogs, getBodyLog } from '../utils/storage.js';

function computeStats(logs, profile) {
  const daysWithData = logs.filter(d => d.entries.length > 0);
  if (!daysWithData.length) return null;

  const { calorieTarget, macroTargets } = profile;

  // Totals per day
  const dayTotals = daysWithData.map(d =>
    d.entries.reduce(
      (acc, e) => ({
        calories: acc.calories + (e.calories ?? 0),
        protein:  acc.protein  + (e.protein  ?? 0),
        carbs:    acc.carbs    + (e.carbs    ?? 0),
        fat:      acc.fat      + (e.fat      ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
  );

  const avgCal     = Math.round(dayTotals.reduce((s, d) => s + d.calories, 0) / dayTotals.length);
  const avgProtein = Math.round(dayTotals.reduce((s, d) => s + d.protein,  0) / dayTotals.length);
  const proteinHit = dayTotals.filter(d => d.protein >= macroTargets.protein * 0.9).length;
  const calHit     = dayTotals.filter(d => Math.abs(d.calories - calorieTarget) <= calorieTarget * 0.1).length;

  // Top 5 foods by occurrence across all log entries
  const foodCounts = {};
  for (const day of daysWithData) {
    for (const e of day.entries) {
      const base = e.foodName.replace(/\s*\([^)]+\)\s*$/, '').trim();
      foodCounts[base] = (foodCounts[base] ?? 0) + 1;
    }
  }
  const top5 = Object.entries(foodCounts).sort(([, a], [, b]) => b - a).slice(0, 5);

  // Best day (closest to target without going over much)
  const bestDay = daysWithData.reduce((best, d) => {
    const dayT = d.entries.reduce((a, e) => a + (e.calories ?? 0), 0);
    const diff = Math.abs(dayT - calorieTarget);
    if (!best || diff < best.diff) return { date: d.date, diff, kcal: dayT };
    return best;
  }, null);

  return {
    daysLogged: daysWithData.length,
    totalDays: logs.length,
    avgCal,
    avgProtein,
    proteinHitDays: proteinHit,
    proteinHitRate: Math.round((proteinHit / dayTotals.length) * 100),
    calHitDays: calHit,
    top5,
    bestDay,
    calDelta: avgCal - calorieTarget,
  };
}

function weightDelta(bodyLog, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recent = bodyLog.filter(e => new Date(e.date) >= cutoff).sort((a, b) => a.date.localeCompare(b.date));
  if (recent.length < 2) return null;
  return +(recent[recent.length - 1].weight - recent[0].weight).toFixed(1);
}

function StatBox({ label, value, sub, color }) {
  return (
    <div className="ws-stat-box">
      <span className="ws-stat-val" style={{ color }}>{value}</span>
      <span className="ws-stat-label">{label}</span>
      {sub && <span className="ws-stat-sub">{sub}</span>}
    </div>
  );
}

export default function WeeklySummary({ profile }) {
  const now    = new Date();
  const isSun  = now.getDay() === 0 && now.getHours() >= 18;

  const [period, setPeriod] = useState('week'); // 'week' | 'month'
  const [open,   setOpen]   = useState(isSun);   // auto-expand on Sunday evening

  const days    = period === 'week' ? 7 : 30;
  const logs    = period === 'week' ? getWeeklyLogs() : getMonthlyLogs();
  const bodyLog = getBodyLog();

  const stats   = computeStats(logs, profile);
  const wDelta  = weightDelta(bodyLog, days);

  const title   = isSun && period === 'week' ? '🎉 This Week\'s Wrap' : `${days}-Day Summary`;

  return (
    <div className={`card ws-card${isSun && period === 'week' ? ' ws-wrapped' : ''}`}>
      <div className="ws-header" onClick={() => setOpen(o => !o)} role="button">
        <div className="ws-title-row">
          <h3>{title}</h3>
          {isSun && period === 'week' && <span className="ws-badge">New</span>}
        </div>
        <div className="ws-controls">
          <div className="mode-tabs ws-period-tabs" onClick={e => e.stopPropagation()}>
            <button className={`mode-tab${period === 'week'  ? ' active' : ''}`} onClick={() => { setPeriod('week');  setOpen(true); }}>7 Days</button>
            <button className={`mode-tab${period === 'month' ? ' active' : ''}`} onClick={() => { setPeriod('month'); setOpen(true); }}>30 Days</button>
          </div>
          <span className="ws-chevron">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <>
          {!stats ? (
            <p className="empty-state">No data logged in this period yet.</p>
          ) : (
            <>
              <div className="ws-stats-grid">
                <StatBox
                  label="Avg calories"
                  value={`${stats.avgCal} kcal`}
                  sub={stats.calDelta > 0 ? `+${stats.calDelta} vs target` : `${stats.calDelta} vs target`}
                  color={Math.abs(stats.calDelta) < 100 ? 'var(--color-accent)' : stats.calDelta > 0 ? 'var(--color-warn)' : 'var(--color-text)'}
                />
                <StatBox
                  label="Protein target"
                  value={`${stats.proteinHitRate}%`}
                  sub={`${stats.proteinHitDays}/${stats.daysLogged} days hit`}
                  color={stats.proteinHitRate >= 80 ? 'var(--color-accent)' : stats.proteinHitRate >= 50 ? 'var(--color-warn)' : 'var(--color-danger)'}
                />
                <StatBox
                  label="Avg protein"
                  value={`${stats.avgProtein}g`}
                  sub={`target ${profile.macroTargets.protein}g`}
                  color="var(--color-text)"
                />
                {wDelta !== null && (
                  <StatBox
                    label="Weight change"
                    value={`${wDelta > 0 ? '+' : ''}${wDelta} kg`}
                    sub={`over ${days} days`}
                    color={profile.goal === 'loss'
                      ? (wDelta < 0 ? 'var(--color-accent)' : 'var(--color-danger)')
                      : (wDelta > 0 ? 'var(--color-accent)' : 'var(--color-text-muted)')}
                  />
                )}
              </div>

              {stats.top5.length > 0 && (
                <div className="ws-top5">
                  <p className="ws-section-label">Top {stats.top5.length} foods</p>
                  <div className="ws-top5-list">
                    {stats.top5.map(([name, count], i) => (
                      <div key={name} className="ws-top5-item">
                        <span className="ws-top5-rank">#{i + 1}</span>
                        <span className="ws-top5-name">{name}</span>
                        <span className="ws-top5-count">{count}×</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {stats.bestDay && (
                <p className="ws-best-day">
                  Best day: <strong>{new Date(stats.bestDay.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
                  &nbsp;— {stats.bestDay.kcal} kcal (closest to target)
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
