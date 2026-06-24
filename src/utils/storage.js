const PFX = 'nutri_';

function s(key, value) {
  try { localStorage.setItem(PFX + key, JSON.stringify(value)); } catch (_) {}
}
function g(key, fallback = null) {
  try {
    const v = localStorage.getItem(PFX + key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

export function today() {
  return new Date().toISOString().split('T')[0];
}

// ── Profile ────────────────────────────────────────────────────────────────
export const getProfile   = ()          => g('profile', null);
export const saveProfile  = (p)         => s('profile', p);
export const clearProfile = ()          => localStorage.removeItem(PFX + 'profile');

// ── Daily food log (keyed by date) ─────────────────────────────────────────
export const getDailyLog  = (date)      => g(`log_${date}`, []);
export const saveDailyLog = (date, log) => s(`log_${date}`, log);

// ── Weekly snapshot (last 7 days) ──────────────────────────────────────────
export function getWeeklyLogs() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const date = d.toISOString().split('T')[0];
    return { date, entries: getDailyLog(date) };
  });
}

// ── Water log (glasses, keyed by date) ────────────────────────────────────
export const getWater  = (date)           => g(`water_${date}`, 0);
export const saveWater = (date, glasses)  => s(`water_${date}`, glasses);

// ── Body measurements log ──────────────────────────────────────────────────
export const getBodyLog  = ()    => g('body_log', []);
export const saveBodyLog = (log) => s('body_log', log);

export function addBodyEntry(entry) {
  const log = getBodyLog();
  const idx = log.findIndex(e => e.date === entry.date);
  if (idx >= 0) log[idx] = entry; else log.push(entry);
  log.sort((a, b) => a.date.localeCompare(b.date));
  saveBodyLog(log);
}

// ── Recents (last 10 food keys) ───────────────────────────────────────────
export const getRecents = () => g('recents', []);
export function addRecent(key) {
  const prev = getRecents().filter(k => k !== key);
  s('recents', [key, ...prev].slice(0, 10));
}

// ── Favourites (set of food keys) ─────────────────────────────────────────
export const getFavourites    = ()    => g('favourites', []);
export const saveFavourites   = (arr) => s('favourites', arr);
export function toggleFavourite(key) {
  const favs = getFavourites();
  const next = favs.includes(key) ? favs.filter(k => k !== key) : [...favs, key];
  saveFavourites(next);
  return next;
}

// ── Dark mode ──────────────────────────────────────────────────────────────
export const getDarkMode  = ()   => g('dark', false);
export const saveDarkMode = (on) => s('dark', on);

// ── Yesterday's log ────────────────────────────────────────────────────────
export function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// ── Monthly snapshot (last 30 days) ───────────────────────────────────────
export function getMonthlyLogs() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const date = d.toISOString().split('T')[0];
    return { date, entries: getDailyLog(date) };
  });
}

// ── Meal presets ───────────────────────────────────────────────────────────
export const getPresets  = ()    => g('presets', []);
export const savePresets = (arr) => s('presets', arr);
export function addPreset(preset) { savePresets([...getPresets(), preset]); }
export function deletePreset(id)  { savePresets(getPresets().filter(p => p.id !== id)); }

// ── Meal plan (stored by week's Monday date) ───────────────────────────────
export function currentWeekMonday() {
  const d = new Date();
  const dow = d.getDay() || 7; // make Sunday = 7
  d.setDate(d.getDate() - dow + 1);
  return d.toISOString().split('T')[0];
}

export function getWeekDates(mondayStr) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mondayStr + 'T00:00');
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

export function shiftWeek(mondayStr, delta) {
  const d = new Date(mondayStr + 'T00:00');
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().split('T')[0];
}

export const getMealPlan  = (mondayStr)       => g(`plan_${mondayStr}`, {});
export const saveMealPlan = (mondayStr, plan) => s(`plan_${mondayStr}`, plan);
