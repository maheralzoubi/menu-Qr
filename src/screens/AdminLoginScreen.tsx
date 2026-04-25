import { useState, FormEvent } from 'react';
import { Utensils, Shield, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onLogin: () => void;
  onBack: () => void;
  /** Called with the raw JWT so each app can save it to the right key */
  onTokenSave: (token: string) => void;
  title?: string;
  subtitle?: string;
  icon?: 'utensils' | 'shield';
}

export const AdminLoginScreen = ({
  onLogin,
  onBack,
  onTokenSave,
  title = 'Admin Access',
  subtitle = 'Sign in to manage the restaurant',
  icon = 'utensils',
}: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Login failed');
        return;
      }
      onTokenSave(data.token);
      onLogin();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const Icon = icon === 'shield' ? Shield : Utensils;

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center text-on-primary mx-auto">
            <Icon className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-headline font-extrabold">{title}</h1>
          <p className="text-sm text-on-surface-variant">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="admin@restaurant.com" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}

          <button type="submit" disabled={isLoading}
            className="w-full py-4 rounded-2xl btn-gradient text-white font-bold text-sm shadow-xl shadow-primary/20 disabled:opacity-60 transition-all">
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <button onClick={onBack} className="w-full text-center text-xs text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">
          Back to app
        </button>
      </motion.div>
    </div>
  );
};
