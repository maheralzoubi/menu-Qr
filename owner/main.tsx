import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { AdminLoginScreen } from '../src/screens/AdminLoginScreen';
import { getOwnerToken, setOwnerToken, clearOwnerToken } from '../src/lib/ownerAuth';

function OwnerApp() {
  const [authed, setAuthed] = useState(!!getOwnerToken());

  const handleLogout = () => { clearOwnerToken(); setAuthed(false); };

  if (!authed) {
    return (
      <AdminLoginScreen
        onLogin={() => setAuthed(true)}
        onBack={() => {}}
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
