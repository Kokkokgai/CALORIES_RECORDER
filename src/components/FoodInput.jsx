import { useState, useEffect, useRef } from 'react';
import { FOOD_DATABASE, calculateNutrition, toTitleCasePublic as ttc } from '../utils/foodDatabase.js';
import { parseFood, searchFoods } from '../utils/foodParser.js';
import { getRecents, addRecent, getFavourites, toggleFavourite } from '../utils/storage.js';

export default function FoodInput({ onAdd }) {
  const [mode, setMode] = useState('quick'); // 'quick' | 'macros'

  // ── Quick Add state ───────────────────────────────────────────────────────
  const [input,       setInput]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [parsed,      setParsed]      = useState(null);
  const [selected,    setSelected]    = useState(null); // { key, entry }
  const [qty,         setQty]         = useState('');
  const [showSugg,    setShowSugg]    = useState(false);

  const [recents,     setRecents]     = useState(() => getRecents());
  const [favs,        setFavs]        = useState(() => getFavourites());

  const inputRef = useRef(null);

  // ── By Macros state ───────────────────────────────────────────────────────
  const [macroName,    setMacroName]    = useState('');
  const [macroProtein, setMacroProtein] = useState('');
  const [macroCarbs,   setMacroCarbs]   = useState('');
  const [macroFat,     setMacroFat]     = useState('');

  // ── Derived: Quick Add ────────────────────────────────────────────────────
  useEffect(() => {
    if (!input.trim()) {
      setSuggestions([]);
      setParsed(null);
      if (!selected) return;
      return;
    }
    setSuggestions(searchFoods(input, 7));
    if (!selected) setParsed(parseFood(input));
  }, [input, selected]);

  const selectedCalc = selected && parseFloat(qty) > 0
    ? calculateNutrition(selected.key, parseFloat(qty))
    : null;

  const previewResult = selected ? selectedCalc : parsed;

  const canAddQuick = !!(previewResult?.calories > 0);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function pickSuggestion(key) {
    const entry = FOOD_DATABASE[key];
    setSelected({ key, entry });
    setQty(String(entry.servingSize));
    setInput(ttc(key));
    setSuggestions([]);
    setShowSugg(false);
  }

  function pickRecent(key) { pickSuggestion(key); }

  function handleFavToggle(e, key) {
    e.stopPropagation();
    const next = toggleFavourite(key);
    setFavs(next);
  }

  function clearSelection() {
    setSelected(null);
    setQty('');
    setParsed(null);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleQuickAdd() {
    if (!canAddQuick) return;
    const result = selected ? selectedCalc : parsed;
    const foodKey  = selected?.key ?? parsed?.foodKey;
    const quantity = selected ? parseFloat(qty) : parsed?.quantity;
    const unit     = selected?.entry?.servingUnit ?? parsed?.unit ?? '';
    const label    = foodKey
      ? `${ttc(foodKey)} (${quantity} ${unit})`
      : (input.trim() || 'Food');

    onAdd({
      foodName: label,
      calories: result.calories,
      protein:  result.protein,
      carbs:    result.carbs,
      fat:      result.fat,
      fiber:    result.fiber,
    });

    if (foodKey) {
      addRecent(foodKey);
      setRecents(getRecents());
    }

    setInput('');
    setParsed(null);
    setSelected(null);
    setQty('');
    setSuggestions([]);
  }

  // ── By Macros ─────────────────────────────────────────────────────────────
  const p = parseFloat(macroProtein) || 0;
  const c = parseFloat(macroCarbs)   || 0;
  const f = parseFloat(macroFat)     || 0;
  const macroCalories = Math.round(p * 4 + c * 4 + f * 9);
  const canAddMacros  = macroName.trim() && (p > 0 || c > 0 || f > 0) && macroCalories > 0;

  function handleMacroAdd(e) {
    e.preventDefault();
    if (!canAddMacros) return;
    onAdd({ foodName: macroName.trim(), calories: macroCalories, protein: p||null, carbs: c||null, fat: f||null, fiber: null });
    setMacroName(''); setMacroProtein(''); setMacroCarbs(''); setMacroFat('');
  }

  const recentEntries = recents.slice(0, 6).filter(k => FOOD_DATABASE[k]);

  return (
    <div className="card">
      <h3>Add Food</h3>

      <div className="mode-tabs">
        <button className={`mode-tab${mode === 'quick'  ? ' active' : ''}`} type="button" onClick={() => setMode('quick')}>Quick Add</button>
        <button className={`mode-tab${mode === 'macros' ? ' active' : ''}`} type="button" onClick={() => setMode('macros')}>By Macros</button>
      </div>

      {/* ── Quick Add ───────────────────────────────────────────────────── */}
      {mode === 'quick' && (
        <div className="quick-add">
          {/* Recents */}
          {recentEntries.length > 0 && !input && !selected && (
            <div className="recents-row">
              <span className="recents-lbl">Recent:</span>
              {recentEntries.map(k => (
                <button key={k} className="chip" type="button" onClick={() => pickRecent(k)}>
                  {ttc(k)}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="quick-input-wrap" style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); setSelected(null); setQty(''); }}
              onFocus={() => setShowSugg(true)}
              onBlur={() => setTimeout(() => setShowSugg(false), 150)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (canAddQuick) handleQuickAdd(); } }}
              placeholder='e.g. 200g chicken breast or 2 eggs'
              className="quick-input"
            />
            {input && (
              <button className="quick-clear" type="button" onClick={clearSelection} aria-label="Clear">✕</button>
            )}

            {/* Suggestions dropdown */}
            {showSugg && suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map(({ key, entry }) => (
                  <div
                    key={key}
                    className="sug-item"
                    onMouseDown={() => pickSuggestion(key)}
                  >
                    <div className="sug-info">
                      <span className="sug-name">{ttc(key)}</span>
                      <span className="sug-meta">{entry.calories} kcal / {entry.servingSize}{entry.servingUnit} · {entry.category}</span>
                    </div>
                    <button
                      className={`fav-btn${favs.includes(key) ? ' fav-on' : ''}`}
                      onMouseDown={e => handleFavToggle(e, key)}
                      aria-label={favs.includes(key) ? 'Remove favourite' : 'Add favourite'}
                    >★</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quantity row when a food is selected from list */}
          {selected && (
            <div className="field" style={{ marginTop: '0.5rem' }}>
              <label>
                Quantity
                <span className="field-unit-hint"> ({selected.entry.servingUnit})</span>
              </label>
              <div className="qty-row">
                <input
                  type="number"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  min="0" step="0.1"
                  className="qty-input"
                  placeholder={String(selected.entry.servingSize)}
                  autoFocus
                />
                <span className="qty-unit">{selected.entry.servingUnit}</span>
              </div>
              <p className="field-hint">
                1 serving = {selected.entry.servingSize} {selected.entry.servingUnit} · {selected.entry.calories} kcal
              </p>
            </div>
          )}

          {/* Nutrition preview */}
          {previewResult && (
            <div className="estimation-result">
              <div className="estimation-header">
                <span className="estimation-label">{previewResult.calories} kcal</span>
                {previewResult.multiplier != null && (
                  <span className="estimation-source">×{previewResult.multiplier.toFixed(2)} serving</span>
                )}
              </div>
              <div className="estimation-macros">
                <span className="macro-pill">P {previewResult.protein}g</span>
                <span className="macro-pill">C {previewResult.carbs}g</span>
                <span className="macro-pill">F {previewResult.fat}g</span>
                <span className="macro-pill">Fi {previewResult.fiber}g</span>
              </div>
            </div>
          )}

          <div className="calories-row" style={{ marginTop: '0.75rem' }}>
            <button type="button" className="btn-primary" disabled={!canAddQuick} onClick={handleQuickAdd}>
              Add to Log
            </button>
          </div>
        </div>
      )}

      {/* ── By Macros ───────────────────────────────────────────────────── */}
      {mode === 'macros' && (
        <form onSubmit={handleMacroAdd} className="food-form">
          <div className="field">
            <label>Food name</label>
            <input type="text" value={macroName} onChange={e => setMacroName(e.target.value)}
              placeholder="e.g. homemade salad, protein shake" />
          </div>
          <div className="macros-row">
            <div className="field">
              <label>Protein (g)</label>
              <input type="number" value={macroProtein} onChange={e => setMacroProtein(e.target.value)} placeholder="0" min="0" step="0.1" />
            </div>
            <div className="field">
              <label>Carbs (g)</label>
              <input type="number" value={macroCarbs} onChange={e => setMacroCarbs(e.target.value)} placeholder="0" min="0" step="0.1" />
            </div>
            <div className="field">
              <label>Fat (g)</label>
              <input type="number" value={macroFat} onChange={e => setMacroFat(e.target.value)} placeholder="0" min="0" step="0.1" />
            </div>
          </div>
          {(p > 0 || c > 0 || f > 0) && (
            <div className="macro-calc-result">
              <div className="macro-calc-breakdown">
                {p > 0 && <span>{p}g P × 4</span>}
                {c > 0 && <span>{c}g C × 4</span>}
                {f > 0 && <span>{f}g F × 9</span>}
              </div>
              <span className="macro-calc-total">{macroCalories} kcal</span>
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={!canAddMacros}>Add to Log</button>
        </form>
      )}
    </div>
  );
}
