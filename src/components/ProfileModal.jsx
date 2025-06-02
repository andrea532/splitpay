import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import Icon from './Icon';

const ProfileModal = ({ user, groups, onClose, showToast }) => {
  const [stats, setStats] = useState({
    groupsCount: 0,
    expensesCount: 0,
    totalAmount: 0,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user.user_metadata?.full_name || '');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    // Calcola statistiche dai gruppi
    const totalAmount = groups.reduce((sum, g) => sum + g.totalAmount, 0);
    const totalExpenses = groups.reduce((sum, g) => sum + g.expenseCount, 0);

    setStats({
      groupsCount: groups.length,
      expensesCount: totalExpenses,
      totalAmount: totalAmount,
    });

    // Carica anche le statistiche dal server se disponibili
    const result = await authService.getUserStats();
    if (result.success) {
      setStats((prev) => ({
        ...prev,
        ...result.stats,
      }));
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Sei sicuro di voler uscire?')) {
      const result = await authService.signOut();
      if (result.success) {
        showToast('Logout effettuato');
        onClose();
      } else {
        showToast(result.error, 'error');
      }
    }
  };

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      showToast('Il nome non può essere vuoto', 'error');
      return;
    }

    const result = await authService.updateProfile({
      full_name: fullName.trim(),
    });
    if (result.success) {
      showToast('Profilo aggiornato!');
      setIsEditing(false);
    } else {
      showToast(result.error, 'error');
    }
  };

  const formatCurrency = (amount) => {
    return `€${parseFloat(amount).toFixed(2)}`;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button className="modal-close" onClick={onClose}>
            <Icon name="close" size={24} />
          </button>
          <h2 className="modal-title">Profilo</h2>
          <div style={{ width: 32 }}>
            {!isEditing && (
              <button
                className="modal-action"
                onClick={() => setIsEditing(true)}
              >
                <Icon name="edit" size={20} />
              </button>
            )}
          </div>
        </div>

        <div className="modal-body">
          {/* Profile Header */}
          <div className="profile-header">
            <div className="profile-avatar">
              {(user.user_metadata?.full_name || user.email)
                .charAt(0)
                .toUpperCase()}
            </div>

            {isEditing ? (
              <div className="profile-edit-form">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoFocus
                />
                <div className="edit-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setFullName(user.user_metadata?.full_name || '');
                    }}
                  >
                    Annulla
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleUpdateProfile}
                  >
                    Salva
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="profile-name">
                  {user.user_metadata?.full_name || 'Nome non impostato'}
                </h3>
                <p className="profile-email">{user.email}</p>
              </>
            )}
          </div>

          {/* Stats Grid */}
          <div className="profile-stats">
            <div className="profile-stat">
              <span className="stat-icon">👥</span>
              <span className="stat-value">{stats.groupsCount}</span>
              <span className="stat-label">Gruppi</span>
            </div>
            <div className="profile-stat">
              <span className="stat-icon">🧾</span>
              <span className="stat-value">{stats.expensesCount}</span>
              <span className="stat-label">Spese totali</span>
            </div>
            <div className="profile-stat">
              <span className="stat-icon">💰</span>
              <span className="stat-value">
                {formatCurrency(stats.totalAmount)}
              </span>
              <span className="stat-label">Importo totale</span>
            </div>
          </div>

          {/* Account Info */}
          <div className="profile-section">
            <h3 className="section-label">Informazioni account</h3>
            <div className="info-list">
              <div className="info-row">
                <span className="info-label">ID utente:</span>
                <span className="info-value">{user.id.slice(0, 8)}...</span>
              </div>
              <div className="info-row">
                <span className="info-label">Membro dal:</span>
                <span className="info-value">
                  {new Date(user.created_at || Date.now()).toLocaleDateString(
                    'it-IT'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="profile-actions">
            <button
              className="btn btn-secondary btn-block"
              onClick={() => showToast('Funzione in arrivo!', 'info')}
            >
              <Icon name="settings" size={20} /> Impostazioni
            </button>

            <button className="btn btn-ghost btn-block" onClick={handleLogout}>
              Esci dall'account
            </button>
          </div>

          {/* App Version */}
          <div className="app-version">
            <p>SmartSplit v2.0.0</p>
            <p className="version-info">Made with ❤️ in Italy</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
