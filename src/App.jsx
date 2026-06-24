import { useState, useEffect, lazy, Suspense } from 'react';
import Navigation from './components/Navigation.jsx';
import CalorieTracker from './components/CalorieTracker.jsx';
import InsightsPanel from './components/InsightsPanel.jsx';
import CoachMode from './components/CoachMode.jsx';
import DataBackup from './components/DataBackup.jsx';

// Lazy-loaded: these pull in recharts (~300 kB) and only load when first visited
const Dashboard     = lazy(() => import('./components/Dashboard.jsx'));
const BodyProgress  = lazy(() => import('./components/BodyProgress.jsx'));
const BMRCalculator = lazy(() => import('./components/BMRCalculator.jsx'));
const MealPlanner   = lazy(() => import('./components/MealPlanner.jsx'));
import { getProfile, saveProfile, clearProfile, getDarkMode, saveDarkMode, getDailyLog, today } from './utils/storage.js';
import './App.css';

export default function App() {
  const [profile,   setProfile]   = useState(() => getProfile());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dark,      setDark]      = useState(() => getDarkMode());

  // Apply dark mode to <html> element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    saveDarkMode(dark);
  }, [dark]);

  function handleSaveProfile(data) {
    saveProfile(data);
    setProfile(data);
    setActiveTab('dashboard');
  }

  function handleEditProfile() {
    setActiveTab('profile');
  }

  function handleResetProfile() {
    clearProfile();
    setProfile(null);
    setActiveTab('profile');
  }

  // Live today entries (for Dashboard macro rings)
  const [todayEntries, setTodayEntries] = useState(() => getDailyLog(today()));

  // Re-read today's entries whenever the Log tab is active so Dashboard stays fresh
  useEffect(() => {
    setTodayEntries(getDailyLog(today()));
  }, [activeTab]);

  const showOnboarding = !profile && activeTab === 'profile';
  const needsProfile   = !profile;

  const fallback = <div className="lazy-loading">Loading…</div>;

  function renderContent() {
    if (needsProfile && activeTab !== 'profile') {
      return (
        <div className="view-content">
          <div className="card">
            <h2>Welcome!</h2>
            <p className="subtitle" style={{ marginBottom: '1rem' }}>
              Set up your profile to get personalised calorie and macro targets.
            </p>
            <button className="btn-primary" onClick={() => setActiveTab('profile')}>
              Get Started →
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Suspense fallback={fallback}>
            <Dashboard profile={profile} todayEntries={todayEntries} />
          </Suspense>
        );
      case 'log':
        return (
          <CalorieTracker
            profile={profile}
            onEditProfile={handleEditProfile}
          />
        );
      case 'plan':
        return (
          <Suspense fallback={fallback}>
            <MealPlanner />
          </Suspense>
        );
      case 'progress':
        return (
          <Suspense fallback={fallback}>
            <BodyProgress profile={profile} />
          </Suspense>
        );
      case 'insights':
        return <InsightsPanel profile={profile} />;
      case 'profile':
        return (
          <div className="view-content">
            {profile && (
              <div className="card profile-strip-card">
                <div className="profile-info-row">
                  <div>
                    <p className="profile-name">{profile.gender === 'male' ? 'Male' : 'Female'} · {profile.age} yrs · {profile.weight} kg · {profile.height} cm</p>
                    <p className="profile-stats">BMR {profile.bmr} kcal · TDEE {profile.tdee} kcal · Target {profile.calorieTarget} kcal</p>
                  </div>
                  <button className="btn-link danger-link" onClick={handleResetProfile}>Reset</button>
                </div>
              </div>
            )}
            <DataBackup />
            <Suspense fallback={fallback}>
              <BMRCalculator onSave={handleSaveProfile} />
            </Suspense>
            <CoachMode profile={profile} />
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <span className="app-logo">NutriTrack</span>
          <span className="header-date">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </div>
        <button
          className="dark-toggle"
          onClick={() => setDark(d => !d)}
          aria-label="Toggle dark mode"
        >
          {dark ? '☀️' : '🌙'}
        </button>
      </header>

      <main className="app-main">
        {renderContent()}
      </main>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
