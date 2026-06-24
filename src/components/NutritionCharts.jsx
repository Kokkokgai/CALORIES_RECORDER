import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine,
} from 'recharts';

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Macro ring (donut chart) ──────────────────────────────────────────────
export function MacroRing({ label, consumed, target, color, unit = 'g' }) {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const over = consumed > target;
  const data = [
    { v: Math.round(pct) },
    { v: Math.max(0, 100 - Math.round(pct)) },
  ];

  return (
    <div className="macro-ring">
      <PieChart width={72} height={72}>
        <Pie
          data={data}
          cx={31} cy={31}
          innerRadius={24} outerRadius={34}
          startAngle={90} endAngle={-270}
          dataKey="v"
          strokeWidth={0}
        >
          <Cell fill={over ? 'var(--color-danger)' : color} />
          <Cell fill="var(--color-border)" />
        </Pie>
      </PieChart>
      <div className="macro-ring-text">
        <span className="macro-ring-val" style={{ color: over ? 'var(--color-danger)' : color }}>
          {consumed}{unit}
        </span>
        <span className="macro-ring-name">{label}</span>
        <span className="macro-ring-target">/ {target}{unit}</span>
      </div>
    </div>
  );
}

// ── Weekly calorie bar chart ──────────────────────────────────────────────
export function WeeklyCaloriesChart({ weeklyLogs, calorieTarget }) {
  const data = weeklyLogs.map(({ date, entries }) => {
    const d = new Date(date + 'T00:00:00');
    const cals = entries.reduce((s, e) => s + (e.calories ?? 0), 0);
    return { day: SHORT_DAYS[d.getDay()], calories: cals, date };
  });

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} barCategoryGap="35%">
        <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis hide domain={[0, 'auto']} />
        <Tooltip
          formatter={(v) => [`${v} kcal`, 'Calories']}
          contentStyle={{ fontSize: 12, borderRadius: 6 }}
        />
        <ReferenceLine y={calorieTarget} stroke="var(--color-accent)" strokeDasharray="4 3" strokeWidth={1.5} />
        <Bar
          dataKey="calories"
          radius={[4, 4, 0, 0]}
          fill="var(--color-accent)"
          opacity={0.85}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Weight trend line chart ───────────────────────────────────────────────
export function WeightTrendChart({ bodyLog }) {
  if (bodyLog.length < 2) return (
    <p className="chart-empty">Log at least 2 weigh-ins to see your trend.</p>
  );

  const data = bodyLog.slice(-30).map(e => ({
    date: e.date.slice(5), // MM-DD
    weight: e.weight,
  }));

  const weights = data.map(d => d.weight);
  const minW = Math.floor(Math.min(...weights) - 1);
  const maxW = Math.ceil(Math.max(...weights) + 1);

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis domain={[minW, maxW]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={32} />
        <Tooltip formatter={(v) => [`${v} kg`, 'Weight']} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
        <Line
          type="monotone" dataKey="weight"
          stroke="var(--color-accent)" strokeWidth={2}
          dot={{ r: 3, fill: 'var(--color-accent)' }} activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Macro breakdown pie (for profile / summary) ────────────────────────────
export function MacroBreakdownPie({ protein, carbs, fat }) {
  const total = protein * 4 + carbs * 4 + fat * 9;
  if (total === 0) return null;

  const data = [
    { name: 'Protein', value: Math.round((protein * 4 / total) * 100), color: '#2d6a4f' },
    { name: 'Carbs',   value: Math.round((carbs   * 4 / total) * 100), color: '#2563eb' },
    { name: 'Fat',     value: Math.round((fat     * 9 / total) * 100), color: '#d97706' },
  ];

  return (
    <div className="macro-pie-wrap">
      <PieChart width={120} height={120}>
        <Pie data={data} cx={55} cy={55} outerRadius={52} dataKey="value" strokeWidth={0}>
          {data.map((d) => <Cell key={d.name} fill={d.color} />)}
        </Pie>
        <Tooltip formatter={(v) => [`${v}%`]} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
      </PieChart>
      <div className="macro-pie-legend">
        {data.map(d => (
          <div key={d.name} className="pie-legend-item">
            <span className="pie-dot" style={{ background: d.color }} />
            <span>{d.name} {d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
