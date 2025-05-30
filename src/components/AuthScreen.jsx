import React, { useState } from 'react';
import { authService } from '../services/authService';
import { isValidEmail, isValidPassword } from '../config/supabase';
import Icon from './Icon';
import './AuthScreen.css';

const AuthScreen = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Form validation
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email è richiesta';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Formato email non valido';
    }

    if (!password) {
      newErrors.password = 'Password è richiesta';
    } else if (!isValidPassword(password)) {
      newErrors.password = 'Password deve essere di almeno 6 caratteri';
    }

    if (!isLogin) {
      if (!fullName.trim()) {
        newErrors.fullName = 'Nome è richiesto';
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

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      let result;

      if (isLogin) {
        result = await authService.signIn(email, password);
      } else {
        result = await authService.signUp(email, password, fullName);
      }

      if (result.success) {
        alert(
          result.message ||
            (isLogin
              ? 'Login effettuato con successo!'
              : 'Registrazione completata!')
        );
        if (onAuthSuccess) {
          onAuthSuccess(result.user);
        }
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert('Si è verificato un errore imprevisto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      alert('Inserisci la tua email per reimpostare la password');
      return;
    }

    if (!isValidEmail(email)) {
      alert("Inserisci un'email valida");
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
      alert('Si è verificato un errore imprevisto');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setConfirmPassword('');
    setErrors({});
    setShowPassword(false);
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  return (
    <div className="auth-container">
      <div className="auth-content">
        {/* Header */}
        <div className="auth-header">
          <h1 className="auth-logo">💰 SmartSplit</h1>
          <h2 className="auth-subtitle">
            {isLogin ? 'Bentornato!' : 'Crea il tuo account'}
          </h2>
          <p className="auth-description">
            {isLogin
              ? 'Accedi per gestire le tue spese di gruppo'
              : 'Registrati per iniziare a condividere le spese con i tuoi amici'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* Nome (solo registrazione) */}
          {!isLogin && (
            <div className="auth-input-container">
              <div className="auth-input-wrapper">
                <Icon name="user" size={20} color="#666" />
                <input
                  className="auth-input"
                  placeholder="Nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={50}
                  disabled={isLoading}
                />
              </div>
              {errors.fullName && (
                <p className="auth-error-text">{errors.fullName}</p>
              )}
            </div>
          )}

          {/* Email */}
          <div className="auth-input-container">
            <div className="auth-input-wrapper">
              <Icon name="mail" size={20} color="#666" />
              <input
                className="auth-input"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={100}
                disabled={isLoading}
              />
            </div>
            {errors.email && <p className="auth-error-text">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="auth-input-container">
            <div className="auth-input-wrapper">
              <Icon name="lock" size={20} color="#666" />
              <input
                className="auth-input"
                placeholder="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={50}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="auth-eye-button"
                disabled={isLoading}
              >
                <Icon
                  name={showPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#666"
                />
              </button>
            </div>
            {errors.password && (
              <p className="auth-error-text">{errors.password}</p>
            )}
          </div>

          {/* Conferma Password (solo registrazione) */}
          {!isLogin && (
            <div className="auth-input-container">
              <div className="auth-input-wrapper">
                <Icon name="lock" size={20} color="#666" />
                <input
                  className="auth-input"
                  placeholder="Conferma password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  maxLength={50}
                  disabled={isLoading}
                />
              </div>
              {errors.confirmPassword && (
                <p className="auth-error-text">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          {/* Forgot Password (solo login) */}
          {isLogin && (
            <button
              type="button"
              className="auth-forgot-button"
              onClick={handleForgotPassword}
              disabled={isLoading}
            >
              Password dimenticata?
            </button>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className={`auth-submit-button ${isLoading ? 'disabled' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <div
                className="loading-spinner"
                style={{ width: '20px', height: '20px' }}
              ></div>
            ) : (
              <div className="auth-submit-content">
                <span>{isLogin ? 'Accedi' : 'Registrati'}</span>
                <Icon name="arrow-right" size={20} color="white" />
              </div>
            )}
          </button>

          {/* Switch Mode */}
          <div className="auth-switch-container">
            <span className="auth-switch-text">
              {isLogin ? 'Non hai un account?' : 'Hai già un account?'}
            </span>
            <button
              type="button"
              onClick={switchMode}
              disabled={isLoading}
              className="auth-switch-button"
            >
              {isLogin ? 'Registrati' : 'Accedi'}
            </button>
          </div>
        </form>

        {/* Features Preview */}
        <div className="auth-features">
          <h3 className="auth-features-title">
            ✨ Cosa puoi fare con SmartSplit:
          </h3>
          <div className="auth-feature-item">
            <Icon name="check" size={16} color="#4CAF50" />
            <span className="auth-feature-text">
              Crea gruppi e invita amici
            </span>
          </div>
          <div className="auth-feature-item">
            <Icon name="check" size={16} color="#4CAF50" />
            <span className="auth-feature-text">
              Ogni utente aggiunge le proprie spese
            </span>
          </div>
          <div className="auth-feature-item">
            <Icon name="check" size={16} color="#4CAF50" />
            <span className="auth-feature-text">
              Calcoli automatici e regolamenti
            </span>
          </div>
          <div className="auth-feature-item">
            <Icon name="check" size={16} color="#4CAF50" />
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
