import { useState } from 'react';
import { api } from '../services/api';

const LoginScreen = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !username)) {
      setMessage('Please fill all fields');
      return;
    }

    setLoading(true);
    setMessage('Connecting...');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const body = isLogin 
        ? { email, password }
        : { username, email, password };

      const data = await api.post(endpoint, body);
      
      setMessage('SUCCESS!');
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      }
    } catch (error) {
      setMessage(`ERROR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-box" onSubmit={handleSubmit}>
        <h1 className="logo-main">Inasta</h1>
        <p className="auth-subtitle">
          {isLogin ? 'Welcome back!' : 'Create an account to share moments'}
        </p>

        {!isLogin && (
          <input
            className="auth-input"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        )}
        <input
          className="auth-input"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="auth-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="auth-button" type="submit" disabled={loading}>
          {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
        </button>

        <p className="auth-toggle" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
        </p>

        {message && <div className="alert-message">{message}</div>}
      </form>
    </div>
  );
};

export default LoginScreen;
