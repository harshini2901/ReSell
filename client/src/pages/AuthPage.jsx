import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Email-first auth screen:
 *   Step 1 — Enter email → check if account exists
 *   Step 2a — Account found → show Login form
 *   Step 2b — No account → show Register form
 */
export default function AuthPage() {
  const { checkEmail, login, register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('email'); // 'email' | 'login' | 'register'
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return;
    setLoading(true);
    try {
      const exists = await checkEmail(email.trim());
      setStep(exists ? 'login' : 'register');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-logo">ReSell</h1>
        <p className="auth-tagline">Buy and sell smarter.</p>

        {/* Step 1 — Email */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} noValidate>
            <h2>Get started</h2>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={loading}>
              {loading ? 'Checking…' : 'Continue'}
            </button>
          </form>
        )}

        {/* Step 2a — Login */}
        {step === 'login' && (
          <form onSubmit={handleLoginSubmit} noValidate>
            <h2>Welcome back</h2>
            <p className="auth-email-display">{email}</p>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <button
              type="button"
              className="auth-back"
              onClick={() => { setStep('email'); setPassword(''); setError(''); }}
            >
              ← Use a different email
            </button>
          </form>
        )}

        {/* Step 2b — Register */}
        {step === 'register' && (
          <form onSubmit={handleRegisterSubmit} noValidate>
            <h2>Create your account</h2>
            <p className="auth-email-display">{email}</p>
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
            <button
              type="button"
              className="auth-back"
              onClick={() => { setStep('email'); setName(''); setPassword(''); setError(''); }}
            >
              ← Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
