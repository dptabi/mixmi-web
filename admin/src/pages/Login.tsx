import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGooglePopupLoading, setIsGooglePopupLoading] = useState(false);
  const { login, loginWithGoogle, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(email, password);
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGooglePopupLoading(true);
    
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Google login failed:', err);
    } finally {
      setIsGooglePopupLoading(false);
    }
  };


  return (
    <div className="login-container">
      <header className="login-header-bar">
        <img
          src={`${process.env.PUBLIC_URL || ''}/mixmi_logo_v2_160px.svg`}
          alt="Mixmi logo"
          className="login-header-logo"
          width="46"
          height="46"
          loading="lazy"
        />
        <span style={{ fontFamily: 'Poppins', fontSize: '18px', fontWeight: 600 }}>Mixmi Admin</span>
      </header>

      <div className="login-content">
      <div className="login-box">
        <div className="login-header">
            <h1>Sign in to your account</h1>
          <p>Sign in to manage orders and users</p>
        </div>

          {error && (
            <div className="error-message" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          <button 
            onClick={handleGoogleLogin}
            className="google-login-button"
            disabled={isLoading || isGooglePopupLoading}
            aria-label="Sign in with Google"
          >
            {isGooglePopupLoading ? (
              <>
                <span className="spinner-small"></span>
                Signing in...
              </>
            ) : (
              <>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                Continue with Google
              </>
            )}
          </button>

          <div className="login-divider">
            <span>or</span>
          </div>

          <form onSubmit={handleSubmit} className="login-form" aria-label="Login form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              required
                disabled={isLoading || isGooglePopupLoading}
              autoFocus
              autoComplete="email"
              aria-label="Email address"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
                disabled={isLoading || isGooglePopupLoading}
              autoComplete="current-password"
              aria-label="Password"
            />
          </div>

          <button 
            type="submit" 
            className="login-button"
              disabled={isLoading || isGooglePopupLoading}
            aria-label="Sign in with email and password"
          >
            {isLoading ? (
              <>
                <span className="spinner-small"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Mixmi Order Management System</p>
          </div>
        </div>
      </div>
    </div>
  );
}

