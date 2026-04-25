import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { AdminLoginScreen } from '../src/screens/AdminLoginScreen';
import { getToken, setToken } from '../src/lib/auth';

function SuperAdminApp() {
  const [authed, setAuthed] = useState(!!getToken());

  if (!authed) {
    return (
      <AdminLoginScreen
        onLogin={() => setAuthed(true)}
        onBack={() => {}}
      />
    );
  }

  return <SuperAdminDashboard onLogout={() => setAuthed(false)} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SuperAdminApp />
  </StrictMode>
);
