import { useState, useEffect } from 'react';
import { MacroRing, WeeklyCaloriesChart } from './NutritionCharts.jsx';
import { today, getWater, saveWater, getWeeklyLogs } from '../utils/storage.js';

const WATER_GOAL = 8; // glasses per day

function CalorieRing({ consumed, target }) {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const over = consumed > target;
  const remaining = target - consumed;

  return (
    <div className="calorie-ring-wrap">
      <div className="calorie-ring">
        <svg width={140} height={140} viewBox="0 0 140 140">
          <circle cx={70} cy={70} r={56} fill="none" stroke="var(--color-border)" strokeWidth={10} />
          <circle
            cx={70} cy={70} r={56}
            fill="none"
            stroke={over ? 'var(--color-danger)' : 'var(--color-accent)'}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 56}`}
            strokeDashoffset={`${2 * Math.PI * 56 * (1 - pct / 100)}`}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '70px 70px', transition: 'stroke-dashoffset 0.5s' }}
          />
        </svg>
        <div className="calorie-ring-center">
          <span className="cal-ring-consumed">{consumed}</span>
          <span className="cal-ring-label">kcal</span>
        </div>
      </div>
      <div className="cal-ring-stats">
        <div className="cal-ring-stat">
          <span className="stat-val">{target}</span>
          <span className="stat-lbl">Target</span>
        </div>
        <div className="cal-ring-stat">
          <span className="stat-val" style={{ color: remaining < 0 ? 'var(--color-danger)' : undefined }}>
            {remaining < 0 ? `+${Math.abs(remaining)}` : remaining}
          </span>
          <span className="stat-lbl">{remaining < 0 ? 'Over' : 'Left'}</span>
        </div>
      </div>
    </div>
  );
}

function WaterTracker() {
  const date = today();
  const [glasses, setGlasses] = useState(() => getWater(date));

  function change(delta) {
    const next = Math.max(0, Math.min(WATER_GOAL + 4, glasses + delta));
    setGlasses(next);
    saveWater(date, next);
  }

  return (
    <div className="water-tracker">
      <div className="water-header">
        <span className="water-title">💧 Water</span>
        <span className="water-goal">{glasses}/{WATER_GOAL} glasses</span>
      </div>
      <div className="water-glasses">
        {Array.from({ length: WATER_GOAL }, (_, i) => (
          <button
            key={i}
            className={`water-glass${i < glasses ? ' filled' : ''}`}
            onClick={() => setGlasses(g => {
              const next = i < g ? i : i + 1;
              saveWater(date, next);
              return next;
            })}
            aria-label={`${i + 1} glass${i + 1 > 1 ? 'es' : ''}`}
          >
            💧
          </button>
        ))}
      </div>
      <div className="water-controls">
        <button className="water-btn" onClick={() => change(-1)}>−</button>
        <span className="water-ml">{glasses * 250} ml</span>
        <button className="water-btn" onClick={() => change(1)}>+</button>
      </div>
    </div>
  );
}

export default function Dashboard({ profile, todayEntries }) {
  const [weeklyLogs, setWeeklyLogs] = useState([]);

  useEffect(() => {
    setWeeklyLogs(getWeeklyLogs());
  }, [todayEntries]);

  if (!profile) return null;

  const { calorieTarget, macroTargets } = profile;

  const totals = todayEntries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories ?? 0),
      protein:  acc.protein  + (e.protein  ?? 0),
      carbs:    acc.carbs    + (e.carbs    ?? 0),
      fat:      acc.fat      + (e.fat      ?? 0),
      fiber:    acc.fiber    + (e.fiber    ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  const weeklyAvgCals = weeklyLogs.length
    ? Math.round(weeklyLogs.reduce((s, d) => s + d.entries.reduce((a, e) => a + e.calories, 0), 0) / weeklyLogs.length)
    : 0;

  const weeklyAvgProtein = weeklyLogs.length
    ? Math.round(weeklyLogs.reduce((s, d) => s + d.entries.reduce((a, e) => a + (e.protein ?? 0), 0), 0) / weeklyLogs.length)
    : 0;

  return (
    <div className="view-content">
      <div className="card">
        <h3>Today's Calories</h3>
        <CalorieRing consumed={totals.calories} target={calorieTarget} />
      </div>

      <div className="card">
        <h3>Macros Today</h3>
        <div className="macro-rings-grid">
          <MacroRing label="Protein" consumed={totals.protein} target={macroTargets.protein} color="#2d6a4f" />
          <MacroRing label="Carbs"   consumed={totals.carbs}   target={macroTargets.carbs}   color="#2563eb" />
          <MacroRing label="Fat"     consumed={totals.fat}     target={macroTargets.fat}      color="#d97706" />
          <MacroRing label="Fiber"   consumed={totals.fiber}   target={macroTargets.fiber}    color="#7c3aed" />
        </div>
      </div>

      <WaterTracker />

      <div className="card">
        <h3>Weekly Calories</h3>
        <WeeklyCaloriesChart weeklyLogs={weeklyLogs} calorieTarget={calorieTarget} />
        <div className="weekly-stats">
          <div className="weekly-stat-item">
            <span className="ws-val">{weeklyAvgCals}</span>
            <span className="ws-lbl">Avg kcal/day</span>
          </div>
          <div className="weekly-stat-item">
            <span className="ws-val">{weeklyAvgProtein}g</span>
            <span className="ws-lbl">Avg protein/day</span>
          </div>
          <div className="weekly-stat-item">
            <span className="ws-val" style={{ color: weeklyAvgCals < calorieTarget ? 'var(--color-accent)' : 'var(--color-danger)' }}>
              {weeklyAvgCals < calorieTarget ? `−${calorieTarget - weeklyAvgCals}` : `+${weeklyAvgCals - calorieTarget}`}
            </span>
            <span className="ws-lbl">vs target</span>
          </div>
        </div>
      </div>
    </div>
  );
}
