const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'log',       label: 'Log',       icon: '✏️' },
  { id: 'plan',      label: 'Plan',      icon: '📅' },
  { id: 'progress',  label: 'Progress',  icon: '📈' },
  { id: 'insights',  label: 'Insights',  icon: '💡' },
  { id: 'profile',   label: 'Profile',   icon: '👤' },
];

export default function Navigation({ activeTab, onTabChange }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(t => (
        <button
          key={t.id}
          className={`nav-item${activeTab === t.id ? ' active' : ''}`}
          onClick={() => onTabChange(t.id)}
          aria-label={t.label}
        >
          <span className="nav-icon">{t.icon}</span>
          <span className="nav-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
