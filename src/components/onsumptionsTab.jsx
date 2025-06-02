import React, { useState, useEffect } from 'react';
import { consumptionsService } from '../services/consumptionsService';
import Icon from './Icon';
import NumberPad from './NumberPad';

const ConsumptionsTab = ({ group, user, showToast, formatCurrency }) => {
  const [consumptions, setConsumptions] = useState([]);
  const [summary, setSummary] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showAddConsumption, setShowAddConsumption] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);

  // Form data
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0');
  const [totalPaid, setTotalPaid] = useState('');

  useEffect(() => {
    loadConsumptions();

    // Subscribe to real-time updates
    const unsubscribe = consumptionsService.subscribeToConsumptions(
      group.id,
      () => loadConsumptions()
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [group.id]);

  const loadConsumptions = async () => {
    setIsLoading(true);
    try {
      // Load consumptions
      const consumptionsResult = await consumptionsService.getGroupConsumptions(
        group.id
      );
      if (consumptionsResult.success) {
        setConsumptions(consumptionsResult.consumptions);
      }

      // Load summary
      const summaryResult = await consumptionsService.getConsumptionSummary(
        group.id
      );
      if (summaryResult.success) {
        setSummary(summaryResult.summary);
      }

      // Load stats
      const statsResult = await consumptionsService.getConsumptionStats(
        group.id
      );
      if (statsResult.success) {
        setStats(statsResult.stats);
      }
    } catch (error) {
      console.error('Error loading consumptions:', error);
      showToast('Errore nel caricamento dei consumi', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddConsumption = async () => {
    if (!description.trim()) {
      showToast('Inserisci una descrizione', 'error');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('Inserisci un importo valido', 'error');
      return;
    }

    const result = await consumptionsService.addConsumption(
      group.id,
      description.trim(),
      amountNum
    );

    if (result.success) {
      showToast('Consumo aggiunto!');
      resetForm();
      setShowAddConsumption(false);
      loadConsumptions();
    } else {
      showToast(result.error, 'error');
    }
  };

  const handleDeleteConsumption = async (consumptionId) => {
    if (!window.confirm('Eliminare questo consumo?')) return;

    const result = await consumptionsService.deleteConsumption(consumptionId);
    if (result.success) {
      showToast('Consumo eliminato');
      loadConsumptions();
    } else {
      showToast(result.error, 'error');
    }
  };

  const handleSettle = async () => {
    const totalPaidNum = parseFloat(totalPaid);
    const totalConsumptions = stats?.total_amount || 0;

    if (isNaN(totalPaidNum) || totalPaidNum <= 0) {
      showToast("Inserisci l'importo pagato", 'error');
      return;
    }

    if (Math.abs(totalPaidNum - totalConsumptions) > 0.01) {
      if (
        !window.confirm(
          `Il totale pagato (${formatCurrency(
            totalPaidNum
          )}) è diverso dal totale dei consumi (${formatCurrency(
            totalConsumptions
          )}). Continuare?`
        )
      ) {
        return;
      }
    }

    const result = await consumptionsService.settleConsumptions(
      group.id,
      user.id,
      totalPaidNum,
      'Pagamento conto'
    );

    if (result.success) {
      showToast('Conto saldato! I debiti sono stati calcolati.');
      setShowSettleModal(false);
      setTotalPaid('');
      loadConsumptions();
    } else {
      showToast(result.error, 'error');
    }
  };

  const resetForm = () => {
    setDescription('');
    setAmount('0');
  };

  const getUserName = (userId, fullName) => {
    return userId === user?.id ? 'Tu' : fullName || 'Utente';
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      {/* Summary Card */}
      {stats && stats.items_count > 0 && (
        <div
          className="card"
          style={{
            background: 'var(--primary-surface)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}
            >
              Totale consumi da saldare
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: '700',
                color: 'var(--primary)',
              }}
            >
              {formatCurrency(stats.total_amount)}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                marginTop: '8px',
              }}
            >
              {stats.items_count} voci • {stats.users_count} persone
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowSettleModal(true)}
              style={{ marginTop: '16px' }}
            >
              <Icon name="card" size={20} />
              Paga il conto
            </button>
          </div>
        </div>
      )}

      {/* User Summary */}
      {summary.length > 0 && (
        <div className="card">
          <h3 className="section-subtitle">Riepilogo per persona</h3>
          {summary.map((userSummary) => (
            <div key={userSummary.user_id} className="balance-item">
              <div className="balance-user">
                <div className="user-avatar">
                  {(userSummary.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <div className="user-name">
                    {getUserName(userSummary.user_id, userSummary.full_name)}
                  </div>
                  <div className="user-stats">
                    {userSummary.items_count}{' '}
                    {userSummary.items_count === 1 ? 'voce' : 'voci'}
                  </div>
                </div>
              </div>
              <div className="balance-value">
                {formatCurrency(userSummary.total_amount)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Consumption List */}
      <div className="section-header">
        <h2 className="section-title">Consumi individuali</h2>
        <button
          className="section-action"
          onClick={() => setShowAddConsumption(true)}
        >
          + Aggiungi
        </button>
      </div>

      {consumptions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🍽️</div>
          <div className="empty-title">Nessun consumo</div>
          <div className="empty-text">Aggiungi cosa hai consumato</div>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddConsumption(true)}
            style={{ marginTop: '16px' }}
          >
            Aggiungi consumo
          </button>
        </div>
      ) : (
        <div className="expenses-list">
          {consumptions.map((consumption) => {
            const isOwn = consumption.user_id === user.id;

            return (
              <div
                key={consumption.id}
                className="expense-item"
                style={{
                  opacity: consumption.is_settled ? 0.6 : 1,
                }}
              >
                <div className="expense-icon">
                  {consumption.is_settled ? '✅' : '🍽️'}
                </div>
                <div className="expense-details">
                  <div className="expense-title">{consumption.description}</div>
                  <div className="expense-meta">
                    {consumption.profiles?.full_name ||
                      (isOwn ? 'Tu' : 'Utente')}{' '}
                    •{' '}
                    {new Date(consumption.created_at).toLocaleTimeString(
                      'it-IT',
                      {
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}
                  </div>
                </div>
                <div className="expense-amount">
                  <div className="expense-value">
                    {formatCurrency(consumption.amount)}
                  </div>
                  {isOwn && !consumption.is_settled && (
                    <button
                      className="btn btn-ghost"
                      onClick={() => handleDeleteConsumption(consumption.id)}
                      style={{ padding: '4px', marginTop: '4px' }}
                    >
                      <Icon name="trash" size={16} color="var(--danger)" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Consumption Modal */}
      {showAddConsumption && (
        <div
          className="modal-backdrop"
          onClick={() => setShowAddConsumption(false)}
        >
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button
                className="modal-close"
                onClick={() => setShowAddConsumption(false)}
              >
                <Icon name="close" size={24} />
              </button>
              <h2 className="modal-title">Aggiungi consumo</h2>
              <div style={{ width: 32 }}></div>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Cosa hai consumato?</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="es. Pizza margherita"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="amount-display">
                <div className="amount-label">Importo</div>
                <div className="amount-value">€{amount || '0'}.00</div>
              </div>

              <NumberPad value={amount} onChange={setAmount} />
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-primary btn-block"
                onClick={handleAddConsumption}
              >
                Aggiungi consumo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Modal */}
      {showSettleModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowSettleModal(false)}
        >
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button
                className="modal-close"
                onClick={() => setShowSettleModal(false)}
              >
                <Icon name="close" size={24} />
              </button>
              <h2 className="modal-title">Paga il conto</h2>
              <div style={{ width: 32 }}></div>
            </div>

            <div className="modal-body">
              <div
                className="card"
                style={{ background: 'var(--gray-50)', marginBottom: '20px' }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{ fontSize: '14px', color: 'var(--text-secondary)' }}
                  >
                    Totale consumi
                  </div>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {formatCurrency(stats?.total_amount || 0)}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Quanto hai pagato?</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0.00"
                  value={totalPaid}
                  onChange={(e) => setTotalPaid(e.target.value)}
                  step="0.01"
                  autoFocus
                  style={{
                    fontSize: '24px',
                    textAlign: 'center',
                    fontWeight: '600',
                  }}
                />
                <p className="help-text">
                  Inserisci l'importo totale che hai pagato (inclusi servizio,
                  coperto, ecc.)
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-primary btn-block"
                onClick={handleSettle}
              >
                Conferma pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumptionsTab;
