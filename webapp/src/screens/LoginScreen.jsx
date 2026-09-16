import { useState } from 'react';
import { api, session } from '../services/api';
import Icon from '../components/Icon';

const AuthPanel = ({ initialMode = 'login', onLoginSuccess }) => {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSignup = mode === 'signup';
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const validate = () => {
    if (isSignup && form.username.trim().length < 3) return 'Username needs at least 3 characters.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return 'That email address does not look right.';
    if (form.password.length < 6) return 'Password needs at least 6 characters.';
    return '';
  };

  const submit = async (event) => {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
      const body = isSignup
        ? { username: form.username.trim(), email: form.email.trim(), password: form.password }
        : { email: form.email.trim(), password: form.password };

      const data = await api.post(endpoint, body);
      if (!data.token) throw new Error('The server did not return a session.');
      session.save(data.token, data.user);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="auth-head">
        <div className="wordmark" style={{ justifyContent: 'center' }}>
          <span className="mark" />
          Inasta
        </div>
        <h2>{isSignup ? 'Make your first circle' : 'Welcome back'}</h2>
        <p>{isSignup ? 'Private by default. No public profile is ever created.' : 'Pick up where you left off.'}</p>
      </div>

      <div className="segmented" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={!isSignup}
          className={!isSignup ? 'on' : ''}
          onClick={() => { setMode('login'); setError(''); }}
        >
          Log in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isSignup}
          className={isSignup ? 'on' : ''}
          onClick={() => { setMode('signup'); setError(''); }}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={submit} className="stack" noValidate>
        {isSignup && (
          <div>
            <label className="field-label" htmlFor="auth-username">Username</label>
            <input
              id="auth-username"
              className="field"
              value={form.username}
              onChange={set('username')}
              placeholder="how friends will find you"
              autoComplete="username"
            />
          </div>
        )}

        <div>
          <label className="field-label" htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            className="field"
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="auth-password">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="auth-password"
              className="field"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              placeholder="at least 6 characters"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              style={{ paddingRight: 46 }}
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowPassword((v) => !v)}
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <Icon name={showPassword ? 'eyeOff' : 'search'} size={17} />
            </button>
          </div>
        </div>

        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : isSignup ? 'Create account' : 'Log in'}
        </button>
      </form>

      {error && <div className="form-error">{error}</div>}

      <div className="auth-hint">
        <Icon name="lock" size={12} style={{ verticalAlign: '-2px', marginRight: 6 }} />
        Nothing you post is ever public. You choose the circle every single time.
      </div>
    </div>
  );
};

export default AuthPanel;
