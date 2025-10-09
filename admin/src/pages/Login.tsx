import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGooglePopupLoading, setIsGooglePopupLoading] = useState(false);
  const [isGoogleRedirectLoading, setIsGoogleRedirectLoading] = useState(false);
  const { login, loginWithGoogle, loginWithGoogleRedirect, error } = useAuth();

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

  const handleGoogleLoginRedirect = async () => {
    setIsGoogleRedirectLoading(true);
    
    try {
      await loginWithGoogleRedirect();
      // Don't reset loading state here as redirect will navigate away
    } catch (err) {
      console.error('Google redirect login failed:', err);
      setIsGoogleRedirectLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>🎨 Mixmi Admin</h1>
          <p>Sign in to manage orders and users</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form" aria-label="Login form">
          {error && (
            <div className="error-message" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@mixmi.co"
              required
              disabled={isLoading || isGooglePopupLoading || isGoogleRedirectLoading}
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
              disabled={isLoading || isGooglePopupLoading || isGoogleRedirectLoading}
              autoComplete="current-password"
              aria-label="Password"
            />
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading || isGooglePopupLoading || isGoogleRedirectLoading}
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

        <div className="login-divider">
          <span>or</span>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="google-login-button"
          disabled={isLoading || isGooglePopupLoading || isGoogleRedirectLoading}
          aria-label="Sign in with Google popup"
        >
          {isGooglePopupLoading ? (
            <>
              <span className="spinner-small"></span>
              Signing in...
            </>
          ) : (
            '🔐 Sign in with Google (Popup)'
          )}
        </button>

        <button 
          onClick={handleGoogleLoginRedirect}
          className="google-login-button google-login-button-secondary"
          disabled={isLoading || isGooglePopupLoading || isGoogleRedirectLoading}
          aria-label="Sign in with Google redirect"
        >
          {isGoogleRedirectLoading ? (
            <>
              <span className="spinner-small"></span>
              Redirecting...
            </>
          ) : (
            '🔄 Sign in with Google (Redirect)'
          )}
        </button>

        <div className="login-footer">
          <p>Mixmi Order Management System</p>
        </div>
      </div>
    </div>
  );
}

