import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import './admin.css';
import './i18n';
import { useTranslation } from 'react-i18next';
import { Dashboard } from './Dashboard';
import { AdminLoginScreen } from '../src/screens/AdminLoginScreen';
import { clearToken, getToken, setToken } from '../src/lib/auth';

function DashboardApp() {
  const [authed, setAuthed] = useState(!!getToken());
  const { t } = useTranslation();

  const handleLogout = () => { clearToken(); setAuthed(false); };

  if (!authed) {
    return (
      <AdminLoginScreen
        onLogin={() => setAuthed(true)}
        onBack={() => {}}
        onTokenSave={setToken}
        appId="admin"
        title={t('login.title')}
        subtitle={t('login.subtitle')}
        icon="utensils"
      />
    );
  }

  return <Dashboard onLogout={handleLogout} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><DashboardApp /></StrictMode>
);
