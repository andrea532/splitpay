import React from 'react';

const NumberPad = ({ value = '0', onChange }) => {
  const handleNumberClick = (num) => {
    // Gestione del punto decimale
    if (num === '.' && value.includes('.')) return;

    // Limita a 2 decimali
    if (value.includes('.')) {
      const decimals = value.split('.')[1];
      if (decimals && decimals.length >= 2) return;
    }

    // Se il valore è 0, sostituiscilo con il nuovo numero
    if (value === '0' && num !== '.') {
      onChange(num);
    } else {
      onChange(value + num);
    }
  };

  const handleDelete = () => {
    if (value.length > 1) {
      onChange(value.slice(0, -1));
    } else {
      onChange('0');
    }
  };

  return (
    <div className="number-pad">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => handleNumberClick(num.toString())}
          className="number-pad-btn"
        >
          {num}
        </button>
      ))}
      <button
        type="button"
        className="number-pad-btn zero"
        onClick={() => handleNumberClick('0')}
      >
        0
      </button>
      <button
        type="button"
        className="number-pad-btn"
        onClick={() => handleNumberClick('.')}
      >
        .
      </button>
      <button
        type="button"
        className="number-pad-btn delete"
        onClick={handleDelete}
      >
        ⌫
      </button>
    </div>
  );
};

export default NumberPad;
