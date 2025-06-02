import React, { useState } from 'react';
import { authService } from '../services/authService';
import { isValidEmail, isValidPassword } from '../config/supabase';
import Icon from './Icon';
import '../components/AuthScreen.css';

const AuthScreen = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Errors
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email richiesta';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Email non valida';
    }

    if (!password) {
      newErrors.password = 'Password richiesta';
    } else if (!isValidPassword(password)) {
      newErrors.password = 'Minimo 6 caratteri';
    }

    if (!isLogin) {
      if (!fullName.trim()) {
        newErrors.fullName = 'Nome richiesto';
      }

      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Le password non corrispondono';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      let result;

      if (isLogin) {
        result = await authService.signIn(email, password);
      } else {
        result = await authService.signUp(email, password, fullName);
      }

      if (result.success) {
        if (onAuthSuccess) {
          onAuthSuccess(result.user);
        }
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert('Errore imprevisto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      alert('Inserisci la tua email');
      return;
    }

    if (!isValidEmail(email)) {
      alert('Email non valida');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.resetPassword(email);
      if (result.success) {
        alert(result.message);
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert('Errore imprevisto');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setShowPassword(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <div className="auth-logo">💰</div>
        <h1 className="auth-title">SmartSplit</h1>
        <p className="auth-subtitle">
          {isLogin
            ? 'Gestisci le spese con i tuoi amici'
            : 'Crea il tuo account gratuito'}
        </p>
      </div>

      <div className="auth-content">
        <form onSubmit={handleSubmit} className="auth-form">
          {/* Name field (signup only) */}
          {!isLogin && (
            <div className="auth-input-group">
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <Icon name="user" size={20} />
                </span>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              {errors.fullName && (
                <div className="auth-error">
                  <span>⚠️</span>
                  <span>{errors.fullName}</span>
                </div>
              )}
            </div>
          )}

          {/* Email field */}
          <div className="auth-input-group">
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                <Icon name="mail" size={20} />
              </span>
              <input
                type="email"
                className="auth-input"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <div className="auth-error">
                <span>⚠️</span>
                <span>{errors.email}</span>
              </div>
            )}
          </div>

          {/* Password field */}
          <div className="auth-input-group">
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                <Icon name="lock" size={20} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className="auth-eye-button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} />
              </button>
            </div>
            {errors.password && (
              <div className="auth-error">
                <span>⚠️</span>
                <span>{errors.password}</span>
              </div>
            )}
          </div>

          {/* Confirm password (signup only) */}
          {!isLogin && (
            <div className="auth-input-group">
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <Icon name="lock" size={20} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Conferma password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>
              {errors.confirmPassword && (
                <div className="auth-error">
                  <span>⚠️</span>
                  <span>{errors.confirmPassword}</span>
                </div>
              )}
            </div>
          )}

          <div className="auth-actions">
            <button type="submit" className="auth-submit" disabled={isLoading}>
              {isLoading ? (
                <div className="loading-spinner"></div>
              ) : (
                <>
                  <span>{isLogin ? 'Accedi' : 'Registrati'}</span>
                  <Icon name="arrow-right" size={20} />
                </>
              )}
            </button>

            {isLogin && (
              <button
                type="button"
                className="auth-forgot"
                onClick={handleForgotPassword}
                disabled={isLoading}
              >
                Password dimenticata?
              </button>
            )}
          </div>

          <div className="auth-switch">
            {isLogin ? 'Non hai un account? ' : 'Hai già un account? '}
            <button
              type="button"
              className="auth-switch-button"
              onClick={switchMode}
              disabled={isLoading}
            >
              {isLogin ? 'Registrati' : 'Accedi'}
            </button>
          </div>
        </form>

        {/* Features */}
        <div className="auth-features">
          <h3 className="auth-features-title">Come funziona SmartSplit</h3>
          <div className="auth-feature">
            <span className="auth-feature-icon">✅</span>
            <span className="auth-feature-text">
              Crea gruppi per viaggi, coinquilini o eventi
            </span>
          </div>
          <div className="auth-feature">
            <span className="auth-feature-icon">✅</span>
            <span className="auth-feature-text">
              Ognuno aggiunge le proprie spese
            </span>
          </div>
          <div className="auth-feature">
            <span className="auth-feature-icon">✅</span>
            <span className="auth-feature-text">
              L'app calcola automaticamente chi deve a chi
            </span>
          </div>
          <div className="auth-feature">
            <span className="auth-feature-icon">✅</span>
            <span className="auth-feature-text">
              Sincronizzazione in tempo reale
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
