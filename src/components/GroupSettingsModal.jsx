import React, { useState } from 'react';
import { groupsService } from '../services/groupsService';
import Icon from './Icon';

const GroupSettingsModal = ({
  group,
  user,
  onClose,
  onShareCode,
  showToast,
  onGroupDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteGroup = async () => {
    if (
      !window.confirm(
        `Sei sicuro di voler eliminare il gruppo "${group.name}"?\n\n` +
          `⚠️ ATTENZIONE:\n` +
          `• Verranno eliminate tutte le spese del gruppo\n` +
          `• Tutti i membri perderanno l'accesso\n` +
          `• Questa azione non può essere annullata`
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await groupsService.deleteGroup(group.id);

      if (result.success) {
        showToast('Gruppo eliminato con successo!', 'success');

        // Chiama il callback per aggiornare la lista dei gruppi
        if (onGroupDeleted) {
          onGroupDeleted(group.id);
        }

        // Chiudi il modal
        onClose();
      } else {
        showToast(
          result.error || "Errore durante l'eliminazione del gruppo",
          'error'
        );
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      showToast("Errore durante l'eliminazione del gruppo", 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveMember = (memberId) => {
    showToast('Funzione in arrivo!', 'info');
  };

  const handleShareCode = () => {
    if (navigator.share) {
      // Use Web Share API if available
      navigator
        .share({
          title: `Unisciti al gruppo ${group.name}`,
          text: `Usa questo codice per unirti al gruppo: ${group.invite_code}`,
        })
        .then(() => {
          showToast('Codice condiviso!', 'success');
        })
        .catch((error) => {
          console.error('Error sharing:', error);
          // Fallback to clipboard
          onShareCode();
        });
    } else {
      // Fallback to clipboard
      onShareCode();
    }
  };

  const isCreator = group.created_by === user.id;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button
            className="modal-close"
            onClick={onClose}
            disabled={isDeleting}
          >
            <Icon name="close" size={24} />
          </button>
          <h2 className="modal-title">Impostazioni gruppo</h2>
          <div style={{ width: 32 }}></div>
        </div>

        <div className="modal-body">
          {/* Group Info */}
          <div className="settings-section">
            <h3 className="settings-label">Informazioni gruppo</h3>
            <div className="settings-info">
              <div className="info-row">
                <span className="info-label">Nome:</span>
                <span className="info-value">{group.name}</span>
              </div>
              {group.description && (
                <div className="info-row">
                  <span className="info-label">Descrizione:</span>
                  <span className="info-value">{group.description}</span>
                </div>
              )}
              <div className="info-row">
                <span className="info-label">Creato il:</span>
                <span className="info-value">
                  {new Date(group.created_at).toLocaleDateString('it-IT')}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Creato da:</span>
                <span className="info-value">
                  {isCreator ? 'Te' : 'Altro membro'}
                </span>
              </div>
            </div>
          </div>

          {/* Invite Code */}
          <div className="settings-section">
            <h3 className="settings-label">Codice invito</h3>
            <div className="invite-code-box">
              <span className="invite-code-text">{group.invite_code}</span>
              <button className="invite-code-copy" onClick={onShareCode}>
                <Icon name="copy" size={20} />
              </button>
              <button className="invite-code-share" onClick={handleShareCode}>
                <Icon name="share" size={20} />
              </button>
            </div>
            <p className="help-text">
              Condividi questo codice con chi vuoi invitare nel gruppo
            </p>
          </div>

          {/* Members List */}
          <div className="settings-section">
            <h3 className="settings-label">
              Membri del gruppo ({group.group_members?.length || 0})
            </h3>
            <div className="members-list">
              {group.group_members?.map((member) => {
                const isCurrentUser = member.user_id === user.id;
                const isAdmin = member.role === 'admin';
                const memberName = member.profiles?.full_name || 'Membro';

                return (
                  <div key={member.user_id} className="member-row">
                    <div className="member-info">
                      <span className="member-icon">👤</span>
                      <span className="member-name">
                        {isCurrentUser ? 'Tu' : memberName}
                      </span>
                    </div>
                    <div className="member-actions">
                      {isAdmin && (
                        <span className="member-role admin">Admin</span>
                      )}
                      {!isCurrentUser && isCreator && (
                        <button
                          className="member-remove"
                          onClick={() => handleRemoveMember(member.user_id)}
                        >
                          <Icon name="close" size={16} color="var(--danger)" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Danger Zone - Only show to creator */}
          {isCreator && (
            <div className="settings-section danger-zone">
              <h3 className="settings-label">Zona pericolosa</h3>
              <button
                className="btn btn-danger btn-block"
                onClick={handleDeleteGroup}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div
                      className="loading-spinner"
                      style={{ width: 20, height: 20 }}
                    />
                    <span>Eliminazione in corso...</span>
                  </>
                ) : (
                  <>
                    <Icon name="trash" size={20} />
                    <span>Elimina gruppo</span>
                  </>
                )}
              </button>
              <p className="help-text danger">
                Attenzione: questa azione eliminerà permanentemente il gruppo e
                tutte le spese associate. Non potrà essere annullata.
              </p>
            </div>
          )}

          {/* If not creator, show info message */}
          {!isCreator && (
            <div className="settings-section">
              <p
                className="help-text"
                style={{ textAlign: 'center', marginTop: 20 }}
              >
                Solo il creatore del gruppo può modificare le impostazioni o
                eliminare il gruppo.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupSettingsModal;
