import { useState } from 'react';
import { getWeeklyLogs, getBodyLog, today, getDailyLog } from '../utils/storage.js';

async function callClaude(apiKey, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `API error ${res.status}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

function buildPrompt(profile, todayEntries, weeklyLogs, bodyLog) {
  const sum = (arr, key) => arr.reduce((s, e) => s + (e[key] ?? 0), 0);
  const todayTotals = {
    calories: sum(todayEntries, 'calories'),
    protein:  sum(todayEntries, 'protein'),
    carbs:    sum(todayEntries, 'carbs'),
    fat:      sum(todayEntries, 'fat'),
    fiber:    sum(todayEntries, 'fiber'),
  };

  const daysData = weeklyLogs.filter(d => d.entries.length > 0);
  const avgCals   = daysData.length ? Math.round(daysData.reduce((s, d) => s + sum(d.entries, 'calories'), 0) / daysData.length) : 0;
  const avgProt   = daysData.length ? Math.round(daysData.reduce((s, d) => s + sum(d.entries, 'protein'),  0) / daysData.length) : 0;

  const latestBody = bodyLog[bodyLog.length - 1];
  const bodyLine   = latestBody ? `Current weight: ${latestBody.weight} kg` : '';
  const goalMap    = { loss: 'Fat Loss', maintain: 'Maintenance', gain: 'Muscle Gain' };

  return `You are an experienced sports nutrition coach. Analyse the following user data and provide a concise, actionable coaching message.

USER PROFILE:
- ${profile.gender === 'male' ? 'Male' : 'Female'}, ${profile.age} years old, ${profile.height} cm, ${profile.weight} kg
- Goal: ${goalMap[profile.goal] ?? profile.goal}
- Daily calorie target: ${profile.calorieTarget} kcal
- Macro targets: Protein ${profile.macroTargets.protein}g | Carbs ${profile.macroTargets.carbs}g | Fat ${profile.macroTargets.fat}g | Fiber ${profile.macroTargets.fiber}g
- BMR: ${profile.bmr} kcal | TDEE: ${profile.tdee} kcal
${bodyLine}

TODAY'S INTAKE (so far):
- Calories: ${todayTotals.calories} kcal (${profile.calorieTarget - todayTotals.calories > 0 ? profile.calorieTarget - todayTotals.calories + ' remaining' : Math.abs(profile.calorieTarget - todayTotals.calories) + ' over'})
- Protein: ${todayTotals.protein}g / ${profile.macroTargets.protein}g target
- Carbs: ${todayTotals.carbs}g | Fat: ${todayTotals.fat}g | Fiber: ${todayTotals.fiber}g

7-DAY AVERAGE (${daysData.length} days logged):
- Calories: ${avgCals} kcal/day | Protein: ${avgProt}g/day

Provide:
1. **Today's Focus** (1–2 sentences — most important action right now)
2. **What You're Doing Well** (1 specific point)
3. **Key Improvement** (1 specific, actionable recommendation)
4. **Today's Tip** (one practical, specific tip the user can act on today)

Keep the total response under 200 words. Be direct, specific, and encouraging. Do not repeat the numbers back unless necessary.`;
}

export default function CoachMode({ profile }) {
  const [apiKey,   setApiKey]   = useState(() => localStorage.getItem('nutri_coach_key') ?? '');
  const [showKey,  setShowKey]  = useState(false);
  const [advice,   setAdvice]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  function saveKey(k) {
    setApiKey(k);
    localStorage.setItem('nutri_coach_key', k);
  }

  async function getAdvice() {
    if (!apiKey.trim()) { setError('Please enter your Anthropic API key.'); return; }
    if (!profile)       { setError('Set up your profile first.'); return; }
    setLoading(true);
    setError('');
    setAdvice('');
    try {
      const todayEntries = getDailyLog(today());
      const weeklyLogs   = getWeeklyLogs();
      const bodyLog      = getBodyLog();
      const prompt       = buildPrompt(profile, todayEntries, weeklyLogs, bodyLog);
      const text         = await callClaude(apiKey.trim(), prompt);
      setAdvice(text);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="view-content">
      <div className="card">
        <h3>AI Coach</h3>
        <p className="subtitle">
          Get personalised coaching from Claude (claude-opus-4-8) based on your profile and today's data.
        </p>

        <div className="field" style={{ marginBottom: '0.75rem' }}>
          <label>
            Anthropic API Key
            <button
              type="button"
              className="btn-link"
              style={{ marginLeft: '0.5rem' }}
              onClick={() => setShowKey(v => !v)}
            >{showKey ? 'Hide' : 'Show'}</button>
          </label>
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => saveKey(e.target.value)}
            placeholder="sk-ant-..."
          />
          <p className="field-hint">Key is stored locally in your browser only.</p>
        </div>

        <button
          className="btn-primary"
          onClick={getAdvice}
          disabled={loading || !apiKey.trim() || !profile}
        >
          {loading ? 'Thinking…' : 'Get Coach Advice'}
        </button>

        {error && <p className="input-error" style={{ marginTop: '0.75rem' }}>{error}</p>}

        {advice && (
          <div className="coach-response">
            {advice.split('\n').map((line, i) => {
              const bold = line.match(/^\*\*(.+?)\*\*(.*)$/);
              if (bold) {
                return (
                  <p key={i}>
                    <strong>{bold[1]}</strong>{bold[2]}
                  </p>
                );
              }
              return line.trim() ? <p key={i}>{line}</p> : <br key={i} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
