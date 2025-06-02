import { create } from 'zustand';

export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    // Auto-remove dopo 3 secondi
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

// 6. Wrapper per sostituire tutti gli alert()
// src/utils/notifications.js
import { useToastStore } from '../hooks/useToast';

export const notify = {
  success: (message) => useToastStore.getState().addToast(message, 'success'),
  error: (message) => useToastStore.getState().addToast(message, 'error'),
  warning: (message) => useToastStore.getState().addToast(message, 'warning'),
  info: (message) => useToastStore.getState().addToast(message, 'info'),
};

// 7. Aggiungi validazione form
// src/utils/validation.js
export const validateGroupName = (name) => {
  if (!name || name.trim().length < 3) {
    return 'Il nome deve avere almeno 3 caratteri';
  }
  if (name.length > 50) {
    return 'Il nome non può superare i 50 caratteri';
  }
  return null;
};

export const validateAmount = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) {
    return 'Inserisci un importo valido maggiore di 0';
  }
  if (num > 999999) {
    return 'Importo troppo alto';
  }
  return null;
};

// 8. Gestione offline
// src/hooks/useOnlineStatus.js
import { useState, useEffect } from 'react';

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

// 9. Fix per i memory leak delle subscription
// src/hooks/useSupabaseSubscription.js
import { useEffect, useRef } from 'react';

export const useSupabaseSubscription = (subscriptionFn, deps = []) => {
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Cleanup precedente subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Setup nuova subscription
    unsubscribeRef.current = subscriptionFn();

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, deps);
};

// 10. Ottimizza gli input numerici per mobile
// src/components/MoneyInput.jsx
import React from 'react';

export const MoneyInput = ({ value, onChange, placeholder, ...props }) => {
  return (
    <input
      type="number"
      inputMode="decimal"
      pattern="[0-9]*"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      step="0.01"
      min="0"
      max="999999"
      className="form-input"
      {...props}
    />
  );
};
