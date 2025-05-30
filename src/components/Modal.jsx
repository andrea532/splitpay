import React, { useEffect } from 'react';

const Modal = ({
  title,
  children,
  onClose,
  onSave,
  showSave = true,
  saveText = 'Salva',
  cancelText = 'Annulla',
}) => {
  // Chiudi modal con ESC
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    // Previeni scroll del body quando modal è aperto
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  // Chiudi modal cliccando sull'overlay
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container">
        <div className="modal-header">
          <button className="modal-cancel" onClick={onClose}>
            {cancelText}
          </button>
          <h3 className="modal-title">{title}</h3>
          {showSave ? (
            <button className="modal-save" onClick={onSave}>
              {saveText}
            </button>
          ) : (
            <div style={{ width: '50px' }} />
          )}
        </div>

        <div className="modal-content">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
