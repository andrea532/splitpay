// Utilità per il feedback aptico (vibrazioni)
export const vibrate = (type = 'light') => {
  if (!('vibrate' in navigator)) {
    console.log('Vibration API not supported');
    return;
  }

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(20);
        break;
      case 'heavy':
        navigator.vibrate(30);
        break;
      case 'success':
        navigator.vibrate([10, 50, 10]);
        break;
      case 'warning':
        navigator.vibrate([20, 50, 20]);
        break;
      case 'error':
        navigator.vibrate([30, 50, 30, 50, 30]);
        break;
      case 'selection':
        navigator.vibrate(5);
        break;
      default:
        navigator.vibrate(10);
    }
  } catch (error) {
    console.error('Vibration error:', error);
  }
};

// Utilità per rilevare il supporto haptic
export const isHapticSupported = () => {
  return 'vibrate' in navigator;
};

// Pattern personalizzati per feedback specifici
export const hapticPatterns = {
  tap: () => vibrate('light'),
  longPress: () => vibrate('medium'),
  impact: () => vibrate('heavy'),
  success: () => vibrate('success'),
  warning: () => vibrate('warning'),
  error: () => vibrate('error'),
  selection: () => vibrate('selection'),

  // Pattern personalizzati
  notification: () => navigator.vibrate && navigator.vibrate([100, 50, 100]),
  message: () => navigator.vibrate && navigator.vibrate([50, 100, 50]),
  alert: () => navigator.vibrate && navigator.vibrate([200, 100, 200]),
};

// Hook per React
import { useCallback } from 'react';

export const useHaptic = () => {
  const trigger = useCallback((type = 'light') => {
    vibrate(type);
  }, []);

  return {
    trigger,
    isSupported: isHapticSupported(),
    patterns: hapticPatterns,
  };
};
