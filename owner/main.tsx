import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { LandingPage } from './LandingPage';
import { AdminLoginScreen } from '../src/screens/AdminLoginScreen';
import { getOwnerToken, setOwnerToken, clearOwnerToken } from '../src/lib/ownerAuth';

type View = 'landing' | 'login' | 'dashboard';

function OwnerApp() {
  const [view, setView] = useState<View>(getOwnerToken() ? 'dashboard' : 'landing');

  const handleLogout = () => { clearOwnerToken(); setView('landing'); };

  if (view === 'landing') {
    return <LandingPage onLoginClick={() => setView('login')} />;
  }

  if (view === 'login') {
    return (
      <AdminLoginScreen
        onLogin={() => setView('dashboard')}
        onBack={() => setView('landing')}
        onTokenSave={setOwnerToken}
        title="Owner Access"
        subtitle="Sign in to the App Owner Panel"
        icon="shield"
      />
    );
  }

  return <SuperAdminDashboard onLogout={handleLogout} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><OwnerApp /></StrictMode>
);
