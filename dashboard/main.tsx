import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { Dashboard } from './Dashboard';
import { AdminLoginScreen } from '../src/screens/AdminLoginScreen';
import { clearToken, getToken } from '../src/lib/auth';

function DashboardApp() {
  const [authed, setAuthed] = useState(!!getToken());

  const handleLogout = () => {
    clearToken();
    setAuthed(false);
  };

  if (!authed) {
    return (
      <AdminLoginScreen
        onLogin={() => setAuthed(true)}
        onBack={() => {}}
      />
    );
  }

  return <Dashboard onLogout={handleLogout} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DashboardApp />
  </StrictMode>
);
