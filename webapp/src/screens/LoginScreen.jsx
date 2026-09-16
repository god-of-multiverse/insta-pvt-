import { useState } from 'react';
import { api, session } from '../services/api';
import Icon from '../components/Icon';

/** WeChat's login: green app tile, label-aligned fields, full-width green button. */
const AuthScreen = ({ onLoginSuccess }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (isSignup && form.username.trim().length < 3) return setError('Username needs 3+ characters');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid email');
    if (form.password.length < 6) return setError('Password needs 6+ characters');

    setLoading(true);
    setError('');
    try {
      const data = await api.post(isSignup ? '/api/auth/signup' : '/api/auth/login', {
        ...(isSignup ? { username: form.username.trim() } : {}),
        email: form.email.trim(),
        password: form.password,
      });
      if (!data.token) throw new Error('No session returned');
      session.save(data.token, data.user);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const ready =
    form.email.trim() && form.password && (!isSignup || form.username.trim());

  return (
    <div className="wx-shell">
      <form className="wx-auth" onSubmit={submit} noValidate>
        <div className="wx-auth-logo">
          <Icon name="chats" size={44} />
        </div>
        <div className="wx-auth-brand">Inasta</div>
        <div className="wx-auth-tag">Private circles for people you actually know</div>

        {isSignup && (
          <div className="wx-auth-field hair-b">
            <label htmlFor="u">Name</label>
            <input
              id="u"
              value={form.username}
              onChange={set('username')}
              placeholder="Your username"
              autoComplete="username"
            />
          </div>
        )}

        <div className="wx-auth-field hair-b">
          <label htmlFor="e">Email</label>
          <input
            id="e"
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="Email address"
            autoComplete="email"
          />
        </div>

        <div className="wx-auth-field hair-b">
          <label htmlFor="p">Password</label>
          <input
            id="p"
            type="password"
            value={form.password}
            onChange={set('password')}
            placeholder="Password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
          />
        </div>

        <button className="wx-auth-btn" type="submit" disabled={loading || !ready}>
          {loading ? '…' : isSignup ? 'Sign Up' : 'Log In'}
        </button>

        {error && <div className="wx-auth-err">{error}</div>}

        <div
          className="wx-auth-switch"
          role="button"
          tabIndex={0}
          onClick={() => {
            setIsSignup((v) => !v);
            setError('');
          }}
          onKeyDown={(event) => event.key === 'Enter' && setIsSignup((v) => !v)}
        >
          {isSignup ? 'Log in to existing account' : 'Sign Up'}
        </div>

        <div className="wx-auth-foot">No public profile · No algorithm · No ads</div>
      </form>
    </div>
  );
};

export default AuthScreen;
