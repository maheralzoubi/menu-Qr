import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import './i18n';
import { useTranslation } from 'react-i18next';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { LandingPage } from './LandingPage';
import { AdminLoginScreen } from '../src/screens/AdminLoginScreen';
import { VerifyEmailScreen } from './VerifyEmailScreen';
import { getOwnerToken, setOwnerToken, clearOwnerToken } from '../src/lib/ownerAuth';

type View = 'landing' | 'login' | 'dashboard' | 'verify';

function initialView(): View {
  if (getOwnerToken()) return 'dashboard';
  return new URLSearchParams(window.location.search).get('view') === 'login' ? 'login' : 'landing';
}

function OwnerApp() {
  const [view, setView] = useState<View>(initialView);
  const [verifyEmail, setVerifyEmail] = useState('');
  const { t } = useTranslation();

  // Attach nav state to the current history entry without touching the URL on first load.
  useEffect(() => {
    window.history.replaceState({ view }, '', window.location.href);
  }, []);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const state = e.state as { view: View } | null;
      setView(state?.view ?? initialView());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const goToLogin = () => {
    setView('login');
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'login');
    window.history.pushState({ view: 'login' }, '', url);
  };

  const goToVerify = (email: string) => {
    setVerifyEmail(email);
    setView('verify');
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'verify');
    window.history.pushState({ view: 'verify' }, '', url);
  };

  const handleLogin = () => {
    setView('dashboard');
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    window.history.replaceState({ view: 'dashboard' }, '', url);
  };

  const handleBackToLanding = () => {
    setView('landing');
    window.history.back();
  };

  const handleLogout = () => {
    clearOwnerToken();
    setView('landing');
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({ view: 'landing' }, '', url);
  };

  if (view === 'landing') {
    return <LandingPage onLoginClick={goToLogin} />;
  }

  if (view === 'verify') {
    if (!verifyEmail) return <LandingPage onLoginClick={goToLogin} />;
    return <VerifyEmailScreen email={verifyEmail} onVerified={goToLogin} />;
  }

  if (view === 'login') {
    return (
      <AdminLoginScreen
        onLogin={handleLogin}
        onBack={handleBackToLanding}
        onTokenSave={setOwnerToken}
        onNeedsVerification={goToVerify}
        appId="owner"
        title={t('login.title')}
        subtitle={t('login.subtitle')}
        icon="shield"
      />
    );
  }

  return <SuperAdminDashboard onLogout={handleLogout} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><OwnerApp /></StrictMode>
);
