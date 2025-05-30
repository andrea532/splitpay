import React from 'react';

// Componente per le icone usando emoji e simboli
const Icon = ({ name, size = 24, color = '#000', style = {} }) => {
  const iconMap = {
    add: '+',
    'arrow-back': '←',
    people: '👥',
    'chevron-forward': '→',
    'people-outline': '👥',
    close: '✕',
    logout: '🚪',
    user: '👤',
    settings: '⚙️',
    'qr-code': '📱',
    share: '📤',
    refresh: '🔄',
    wallet: '💰',
    receipt: '🧾',
    calendar: '📅',
    location: '📍',
    remove: '−',
    trash: '🗑️',
    'receipt-outline': '🧾',
    card: '💳',
    checkmark: '✓',
    alert: '⚠️',
    information: 'ℹ️',
    star: '⭐',
    download: '⬇️',
    upload: '⬆️',
    copy: '📋',
    edit: '✏️',
    save: '💾',
    help: '❓',
    heart: '❤️',
    home: '🏠',
    search: '🔍',
    filter: '🔽',
    sort: '↕️',
    menu: '☰',
    more: '⋯',
    eye: '👁️',
    'eye-off': '🙈',
    lock: '🔒',
    unlock: '🔓',
    warning: '⚠️',
    error: '❌',
    success: '✅',
    info: 'ℹ️',
    mail: '📧',
    'arrow-right': '→',
    check: '✅',
  };

  const iconText = iconMap[name] || '●';

  return (
    <span
      style={{
        fontSize: size,
        color,
        fontWeight: 'bold',
        textAlign: 'center',
        lineHeight: `${size * 1.2}px`,
        display: 'inline-block',
        userSelect: 'none',
        ...style,
      }}
    >
      {iconText}
    </span>
  );
};

export default Icon;
