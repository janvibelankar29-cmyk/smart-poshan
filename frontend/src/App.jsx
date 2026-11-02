import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './context/AppContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import FoodStock from './pages/FoodStock';
import DailyDistribution from './pages/DailyDistribution';
import DistributionHistory from './pages/DistributionHistory';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';
import Sidebar from './components/Sidebar';

function AppContent() {
  const { user, isOnline, offlineQueue } = useApp();
  const [activePage, setActivePage] = useState('dashboard');

  if (!user) return <LoginPage />;

  const pages = {
    'dashboard':    <Dashboard />,
    'food-stock':   <FoodStock />,
    'distribution': <DailyDistribution />,
    'history':      <DistributionHistory />,
    'reports':      <Reports />,
    'settings':     <SettingsPage />,
  };

  return (
    <div className="app-layout">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="main-content">
        {pages[activePage] || <Dashboard />}
      </main>

      {/* Offline status bar */}
      {!isOnline && (
        <div className="offline-bar">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'#ef4444', display:'inline-block', animation:'pulse 1.5s ease-in-out infinite' }} />
            You are currently offline. Records will sync automatically when connection is restored.
          </div>
          {offlineQueue.length > 0 && (
            <span style={{ background:'#f59e0b', color:'white', borderRadius:999, fontSize:11, padding:'2px 10px', fontWeight:700 }}>
              {offlineQueue.length} pending
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' },
          success: { iconTheme: { primary: '#16a34a', secondary: '#f0fdf4' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fef2f2' } },
        }}
      />
    </AppProvider>
  );
}

export default App;
