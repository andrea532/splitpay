import React, { useState } from 'react';
import { groupsService } from '../services/groupsService';
import Icon from './Icon';

const ExpenseDetailModal = ({
  expense,
  user,
  onClose,
  onDelete,
  formatCurrency,
  showToast,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Sei sicuro di voler eliminare questa spesa?')) {
      return;
    }

    setIsDeleting(true);

    try {
      // Chiama il servizio per eliminare la spesa
      const result = await groupsService.deleteExpense(expense.id);

      if (result.success) {
        if (showToast) {
          showToast('Spesa eliminata con successo!', 'success');
        }
        // Chiama il callback onDelete per aggiornare la lista
        if (onDelete) {
          onDelete(expense.id);
        }
        // Chiudi il modal
        onClose();
      } else {
        if (showToast) {
          showToast(result.error || "Errore durante l'eliminazione", 'error');
        } else {
          alert(result.error || "Errore durante l'eliminazione");
        }
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      if (showToast) {
        showToast("Errore durante l'eliminazione della spesa", 'error');
      } else {
        alert("Errore durante l'eliminazione della spesa");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button className="modal-close" onClick={onClose}>
            <Icon name="close" size={24} />
          </button>
          <h2 className="modal-title">{expense.title}</h2>
          <div style={{ width: 32 }}>
            {expense.created_by === user.id && (
              <button
                className="modal-action"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div
                    className="loading-spinner"
                    style={{ width: 20, height: 20 }}
                  />
                ) : (
                  <Icon name="trash" size={20} color="var(--danger)" />
                )}
              </button>
            )}
          </div>
        </div>

        <div className="modal-body">
          <div className="expense-detail-section">
            <div className="detail-row">
              <span className="detail-label">Importo totale</span>
              <span className="detail-value">
                {formatCurrency(expense.total_amount)}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Data</span>
              <span className="detail-value">
                {new Date(expense.expense_date).toLocaleDateString('it-IT', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            {expense.description && (
              <div className="detail-row">
                <span className="detail-label">Descrizione</span>
                <span className="detail-value">{expense.description}</span>
              </div>
            )}
            {expense.location && (
              <div className="detail-row">
                <span className="detail-label">Luogo</span>
                <span className="detail-value">📍 {expense.location}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Pagato da</span>
              <span className="detail-value">
                {expense.created_by === user.id ? '💳 Te' : '👤 Altro membro'}
              </span>
            </div>
          </div>

          {expense.expense_shares && expense.expense_shares.length > 0 && (
            <div className="expense-detail-section">
              <h3 className="section-subtitle">Chi ha consumato</h3>
              <div className="shares-breakdown">
                {expense.expense_shares.map((share, index) => (
                  <div key={index} className="share-row">
                    <span className="share-name">
                      {share.user_id === user.id ? 'Tu' : 'Membro'}
                    </span>
                    <span className="share-amount">
                      {formatCurrency(share.amount_consumed)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="expense-actions">
            {expense.created_by === user.id && (
              <button
                className="btn btn-danger btn-block"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div
                      className="loading-spinner"
                      style={{ width: 20, height: 20 }}
                    />
                    <span>Eliminazione...</span>
                  </>
                ) : (
                  <>
                    <Icon name="trash" size={20} />
                    <span>Elimina spesa</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetailModal;
