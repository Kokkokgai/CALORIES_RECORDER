import { useEffect, useState } from 'react';
import { generateInsights } from '../utils/insights.js';
import { getWeeklyLogs, getBodyLog, today, getDailyLog } from '../utils/storage.js';
import WeeklySummary from './WeeklySummary.jsx';

const TYPE_STYLE = {
  success: { bg: 'var(--color-accent-light)', border: 'var(--color-accent)', text: 'var(--color-accent)' },
  warning: { bg: '#fff3cd',                   border: '#ffc107',              text: '#b45309' },
  info:    { bg: 'var(--color-bg)',            border: 'var(--color-border)',  text: 'var(--color-text-muted)' },
};

function InsightCard({ insight }) {
  const s = TYPE_STYLE[insight.type] ?? TYPE_STYLE.info;
  return (
    <div className="insight-card" style={{ background: s.bg, borderColor: s.border }}>
      <div className="insight-icon">{insight.icon}</div>
      <div className="insight-body">
        <p className="insight-title" style={{ color: s.text }}>{insight.title}</p>
        <p className="insight-msg">{insight.message}</p>
      </div>
    </div>
  );
}

export default function InsightsPanel({ profile }) {
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    const todayEntries = getDailyLog(today());
    const weeklyLogs   = getWeeklyLogs();
    const bodyLog      = getBodyLog();
    setInsights(generateInsights({ profile, todayEntries, weeklyLogs, bodyLog }));
  }, [profile]);

  if (!profile) return (
    <div className="view-content">
      <div className="card">
        <p className="empty-state">Set up your profile first to see personalised insights.</p>
      </div>
    </div>
  );

  return (
    <div className="view-content">
      <WeeklySummary profile={profile} />
      <div className="card">
        <h3>Smart Insights</h3>
        <p className="subtitle" style={{ marginBottom: '1rem' }}>
          Personalised recommendations based on today's log and your history.
        </p>
        {insights.length === 0 ? (
          <p className="empty-state">Log some food today to get insights.</p>
        ) : (
          <div className="insights-list">
            {insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
          </div>
        )}
      </div>
    </div>
  );
}
