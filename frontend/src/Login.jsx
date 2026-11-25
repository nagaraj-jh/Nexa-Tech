
import { useState } from 'react';
import './Auth.css';

function Login({ onLogin, onShowRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        'http://localhost:5000/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      onLogin(data);
    } catch (err) {
      setError(err.message || 'Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* LEFT BRANDING PANEL */}
      <div className="auth-visual">

        <div className="auth-orb orb-one"></div>
        <div className="auth-orb orb-two"></div>
        <div className="auth-orb orb-three"></div>

        <div className="auth-visual-content">

          <div className="auth-brand">
            <div className="auth-brand-icon">N</div>
            <span>Nexa-Tech</span>
          </div>

          <div className="auth-illustration">

            <div className="auth-glass-card glass-card-one">
              <span>AI</span>
            </div>

            <div className="auth-glass-card glass-card-two">
              <span>✦</span>
            </div>

            <div className="auth-glass-card glass-card-three">
              <span>01</span>
            </div>

            <div className="auth-core">
              <span>N</span>
            </div>

          </div>

          <div className="auth-intro">
            <span className="auth-eyebrow">
              INTELLIGENT PROMPT TESTING
            </span>

            <h1>
              Test smarter.
              <br />
              <span>Build better prompts.</span>
            </h1>

            <p>
              Your intelligent workspace for prompt testing,
              regression detection and AI evaluation.
              Discover a smarter way to improve your AI prompts.
            </p>
          </div>

          <div className="auth-features">
            <div className="auth-feature">
              <span>✦</span>
              AI Evaluation
            </div>

            <div className="auth-feature">
              <span>✓</span>
              Regression Testing
            </div>

            <div className="auth-feature">
              <span>↗</span>
              Smart Analytics
            </div>
          </div>

        </div>

        <div className="auth-visual-footer">
          © 2026 Nexa-Tech. All rights reserved.
        </div>

      </div>

      {/* RIGHT LOGIN PANEL */}
      <div className="auth-form-section">

        <div className="auth-form-wrapper">

          <div className="auth-mobile-brand">
            <div className="auth-brand-icon">N</div>
            <span>Nexa-Tech</span>
          </div>

          <div className="auth-heading">

            <span className="auth-eyebrow">
              WELCOME BACK
            </span>

            <h2>Sign in to your account</h2>

            <p>
              Enter your details to access your workspace.
            </p>

          </div>

          <form onSubmit={handleSubmit} className="auth-form">

            <div className="auth-field">
              <label htmlFor="login-email">
                Email address
              </label>

              <input
                id="login-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">
                Password
              </label>

              <div className="password-input-wrapper">

                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>

              </div>
            </div>

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
              <span>→</span>
            </button>

          </form>

          <p className="auth-switch">
            Don't have an account?

            <button
              type="button"
              onClick={onShowRegister}
            >
              Create account
            </button>
          </p>

          <div className="auth-security">
            <span>🔒</span>
            Secure authentication powered by Nexa-Tech
          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;
