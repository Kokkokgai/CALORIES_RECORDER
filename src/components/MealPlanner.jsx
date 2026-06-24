import { useState, useRef } from 'react';
import {
  currentWeekMonday, getWeekDates, shiftWeek,
  getMealPlan, saveMealPlan, today, getDailyLog, saveDailyLog,
} from '../utils/storage.js';
import { FOOD_DATABASE } from '../utils/foodDatabase.js';
import { toTitleCasePublic as ttc } from '../utils/foodDatabase.js';
import { searchFoods } from '../utils/foodParser.js';
import { calculateNutrition } from '../utils/foodDatabase.js';

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_META  = {
  breakfast: { label: 'Breakfast', icon: '🌅' },
  lunch:     { label: 'Lunch',     icon: '🥗' },
  dinner:    { label: 'Dinner',    icon: '🍽️' },
  snack:     { label: 'Snack',     icon: '🍎' },
};

function dayLabel(dateStr) {
  return new Date(dateStr + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function weekRangeLabel(dates) {
  const s = new Date(dates[0] + 'T00:00');
  const e = new Date(dates[6] + 'T00:00');
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(s)} – ${fmt(e)}, ${e.getFullYear()}`;
}

function dayPlanKcal(dayPlan) {
  return MEAL_ORDER.flatMap(m => dayPlan[m] ?? []).reduce((s, i) => s + (i.kcal ?? 0), 0);
}

// ── Inline food picker used inside a meal slot ─────────────────────────────
function FoodPicker({ onPick, onClose }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

  function handleSearch(val) {
    setQuery(val);
    setResults(val.trim() ? searchFoods(val, 6) : []);
  }

  return (
    <div className="fp-wrap">
      <div className="fp-input-row">
        <input
          ref={inputRef}
          autoFocus
          type="text"
          className="fp-input"
          placeholder="Search food…"
          value={query}
          onChange={e => handleSearch(e.target.value)}
        />
        <button className="btn-delete" onClick={onClose} title="Cancel">✕</button>
      </div>
      {results.length > 0 && (
        <div className="fp-results">
          {results.map(({ key, entry }) => (
            <div key={key} className="fp-result" onClick={() => onPick(key, entry)}>
              <span className="fp-result-name">{ttc(key)}</span>
              <span className="fp-result-meta">{entry.servingSize}{entry.servingUnit} · {entry.calories} kcal</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shopping list derived from the week's plan ─────────────────────────────
function ShoppingList({ plan, weekDates }) {
  const [checked, setChecked] = useState({});

  // Aggregate by foodKey, sum quantities
  const shopMap = {};
  for (const date of weekDates) {
    for (const mealKey of MEAL_ORDER) {
      for (const item of (plan[date]?.[mealKey] ?? [])) {
        if (!item.foodKey || !FOOD_DATABASE[item.foodKey]) continue;
        if (!shopMap[item.foodKey]) {
          shopMap[item.foodKey] = {
            name: ttc(item.foodKey),
            qty: 0,
            unit: FOOD_DATABASE[item.foodKey].servingUnit,
            category: FOOD_DATABASE[item.foodKey].category,
          };
        }
        shopMap[item.foodKey].qty += item.qty;
      }
    }
  }

  // Group by category
  const byCategory = {};
  for (const [key, item] of Object.entries(shopMap)) {
    (byCategory[item.category] ??= []).push({ key, ...item });
  }

  function copyToClipboard() {
    const lines = [];
    for (const [cat, items] of Object.entries(byCategory)) {
      lines.push(cat);
      for (const it of items) lines.push(`  • ${it.name} — ${Math.round(it.qty)}${it.unit}`);
      lines.push('');
    }
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
  }

  const hasItems = Object.keys(shopMap).length > 0;

  return (
    <div className="shop-list">
      <div className="shop-list-header">
        <p className="subtitle">Auto-generated from this week's meal plan.</p>
        {hasItems && (
          <button className="btn-secondary btn-sm" onClick={copyToClipboard}>Copy</button>
        )}
      </div>
      {!hasItems ? (
        <p className="empty-state">Plan some meals first to generate a shopping list.</p>
      ) : (
        Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat} className="shop-category">
            <p className="shop-cat-label">{cat}</p>
            {items.map(item => (
              <label key={item.key} className={`shop-item${checked[item.key] ? ' checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={!!checked[item.key]}
                  onChange={() => setChecked(c => ({ ...c, [item.key]: !c[item.key] }))}
                />
                <span className="shop-item-name">{item.name}</span>
                <span className="shop-item-qty">{Math.round(item.qty)}{item.unit}</span>
              </label>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

// ── Single day card ────────────────────────────────────────────────────────
function DayCard({ dateStr, dayPlan, onUpdate, isToday, onLogDay }) {
  // editSlot: { meal } | null
  const [editSlot, setEditSlot] = useState(null);

  const totalKcal = dayPlanKcal(dayPlan);

  function addItem(meal, foodKey, entry) {
    const nutrition = calculateNutrition(foodKey, entry.servingSize);
    const item = {
      id:      Date.now() + Math.random(),
      foodKey,
      qty:     entry.servingSize,
      name:    ttc(foodKey),
      kcal:    nutrition.calories,
      protein: nutrition.protein,
      carbs:   nutrition.carbs,
      fat:     nutrition.fat,
      fiber:   nutrition.fiber,
    };
    const updated = { ...dayPlan, [meal]: [...(dayPlan[meal] ?? []), item] };
    onUpdate(updated);
    setEditSlot(null);
  }

  function removeItem(meal, id) {
    const updated = { ...dayPlan, [meal]: (dayPlan[meal] ?? []).filter(i => i.id !== id) };
    onUpdate(updated);
  }

  return (
    <div className={`plan-day-card${isToday ? ' plan-today' : ''}`}>
      <div className="plan-day-header">
        <div>
          <span className="plan-day-label">{dayLabel(dateStr)}</span>
          {isToday && <span className="plan-today-badge">Today</span>}
        </div>
        <div className="plan-day-right">
          {totalKcal > 0 && <span className="plan-day-kcal">{totalKcal} kcal</span>}
          {isToday && totalKcal > 0 && (
            <button className="btn-secondary btn-sm" onClick={onLogDay} title="Copy plan to today's log">Log today</button>
          )}
        </div>
      </div>

      {MEAL_ORDER.map(mealKey => {
        const meta  = MEAL_META[mealKey];
        const items = dayPlan[mealKey] ?? [];
        const mealKcal = items.reduce((s, i) => s + (i.kcal ?? 0), 0);

        return (
          <div key={mealKey} className="plan-meal-slot">
            <div className="plan-meal-header">
              <span className="plan-meal-label">{meta.icon} {meta.label}</span>
              {mealKcal > 0 && <span className="plan-meal-kcal">{mealKcal} kcal</span>}
            </div>

            {items.map(item => (
              <div key={item.id} className="plan-item">
                <span className="plan-item-name">{item.name} <span className="plan-item-qty">({item.qty}{FOOD_DATABASE[item.foodKey]?.servingUnit ?? ''})</span></span>
                <span className="plan-item-kcal">{item.kcal} kcal</span>
                <button className="btn-delete plan-item-del" onClick={() => removeItem(mealKey, item.id)}>✕</button>
              </div>
            ))}

            {editSlot?.meal === mealKey ? (
              <FoodPicker
                onPick={(key, entry) => addItem(mealKey, key, entry)}
                onClose={() => setEditSlot(null)}
              />
            ) : (
              <button className="plan-add-btn" onClick={() => setEditSlot({ meal: mealKey })}>
                + Add food
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main MealPlanner ───────────────────────────────────────────────────────
export default function MealPlanner() {
  const [monday, setMonday] = useState(currentWeekMonday);
  const [view,   setView]   = useState('plan'); // 'plan' | 'shopping'
  const [plan,   setPlan]   = useState(() => getMealPlan(currentWeekMonday()));

  const weekDates   = getWeekDates(monday);
  const todayStr    = today();
  const isThisWeek  = weekDates.includes(todayStr);

  function navigateWeek(delta) {
    const newMonday = shiftWeek(monday, delta);
    setMonday(newMonday);
    setPlan(getMealPlan(newMonday));
  }

  function updateDay(dateStr, dayPlan) {
    const next = { ...plan, [dateStr]: dayPlan };
    setPlan(next);
    saveMealPlan(monday, next);
  }

  function logTodayPlan() {
    const dayPlan  = plan[todayStr] ?? {};
    const existing = getDailyLog(todayStr);
    const toAdd    = MEAL_ORDER.flatMap(mealKey =>
      (dayPlan[mealKey] ?? []).map(item => ({
        id:       Date.now() + Math.random(),
        foodName: `${item.name} (${item.qty}${FOOD_DATABASE[item.foodKey]?.servingUnit ?? ''})`,
        calories: item.kcal,
        protein:  item.protein,
        carbs:    item.carbs,
        fat:      item.fat,
        fiber:    item.fiber,
        meal:     mealKey,
      }))
    );
    saveDailyLog(todayStr, [...existing, ...toAdd]);
    alert(`Logged ${toAdd.length} item${toAdd.length !== 1 ? 's' : ''} to today's log.`);
  }

  return (
    <div className="view-content">
      <div className="card plan-header-card">
        <div className="plan-week-nav">
          <button className="btn-secondary btn-sm" onClick={() => navigateWeek(-1)}>‹ Prev</button>
          <div className="plan-week-label">
            <span>{weekRangeLabel(weekDates)}</span>
            {isThisWeek && <span className="plan-this-week">This week</span>}
          </div>
          <button className="btn-secondary btn-sm" onClick={() => navigateWeek(1)}>Next ›</button>
        </div>

        <div className="mode-tabs" style={{ marginTop: '0.75rem' }}>
          <button className={`mode-tab${view === 'plan'     ? ' active' : ''}`} onClick={() => setView('plan')}>Meal Plan</button>
          <button className={`mode-tab${view === 'shopping' ? ' active' : ''}`} onClick={() => setView('shopping')}>🛒 Shopping List</button>
        </div>
      </div>

      {view === 'shopping' ? (
        <div className="card">
          <h3>Shopping List</h3>
          <ShoppingList plan={plan} weekDates={weekDates} />
        </div>
      ) : (
        weekDates.map(dateStr => (
          <DayCard
            key={dateStr}
            dateStr={dateStr}
            dayPlan={plan[dateStr] ?? {}}
            onUpdate={dayPlan => updateDay(dateStr, dayPlan)}
            isToday={dateStr === todayStr}
            onLogDay={logTodayPlan}
          />
        ))
      )}
    </div>
  );
}
