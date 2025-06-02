import React, { useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../services/authService';
import { groupsService } from '../services/groupsService';
import AuthScreen from './AuthScreen';
import Icon from './Icon';
import Modal from './Modal';
import NumberPad from './NumberPad';
import Toast from './Toast';
import GroupDetailsView from './GroupDetailsView';
import ProfileModal from './ProfileModal';
import SkeletonLoader from './SkeletonLoader';
import PullToRefresh from './PullToRefresh';
import { vibrate } from '../utils/haptics';

const SmartSplitApp = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeTab, setActiveTab] = useState('groups');
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Modal states
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Form data
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [groupCategory, setGroupCategory] = useState('general');

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadGroups();
    }
  }, [user]);

  const initializeAuth = async () => {
    try {
      const {
        data: { session },
      } = await authService.getCurrentSession();
      if (session?.user) {
        setUser(session.user);
      }

      authService.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setGroups([]);
          setActiveGroup(null);
        }
      });
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroups = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);

    try {
      const result = await groupsService.getUserGroups();
      if (result.success) {
        setGroups(result.groups);
      }
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    vibrate('light');
    await loadGroups(false);
    setIsRefreshing(false);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      showToast('Inserisci un nome per il gruppo', 'error');
      vibrate('error');
      return;
    }

    vibrate('success');
    const result = await groupsService.createGroup(
      groupName.trim(),
      groupDescription.trim()
    );

    if (result.success) {
      setGroupName('');
      setGroupDescription('');
      setGroupCategory('general');
      setShowCreateGroup(false);
      loadGroups();
      navigator.clipboard.writeText(result.group.invite_code);
      showToast(`Gruppo creato! Codice ${result.group.invite_code} copiato`);
    } else {
      showToast(result.error, 'error');
      vibrate('error');
    }
  };

  const joinGroup = async () => {
    if (!inviteCode.trim()) {
      showToast('Inserisci il codice invito', 'error');
      vibrate('error');
      return;
    }

    vibrate('success');
    const result = await groupsService.joinGroupByInviteCode(inviteCode.trim());
    if (result.success) {
      setInviteCode('');
      setShowJoinGroup(false);
      loadGroups();
      showToast('Ti sei unito al gruppo!');
    } else {
      showToast(result.error, 'error');
      vibrate('error');
    }
  };

  const formatCurrency = (amount) => {
    return `€${parseFloat(amount).toFixed(2)}`;
  };

  const handleGroupClick = (group) => {
    vibrate('light');
    setActiveGroup(group);
  };

  const handleBackFromGroup = () => {
    vibrate('light');
    setActiveGroup(null);
  };

  const handleTabChange = (tab) => {
    vibrate('light');
    setActiveTab(tab);
  };

  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupCategories = {
    trip: { icon: '✈️', label: 'Viaggio' },
    home: { icon: '🏠', label: 'Casa' },
    event: { icon: '🎉', label: 'Evento' },
    general: { icon: '📌', label: 'Generale' },
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p className="loading-text">Caricamento...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={setUser} />;
  }

  // GROUP DETAILS VIEW
  if (activeGroup) {
    return (
      <GroupDetailsView
        group={activeGroup}
        user={user}
        onBack={handleBackFromGroup}
        showToast={showToast}
      />
    );
  }

  // MAIN GROUPS LIST VIEW
  return (
    <div className="app">
      {/* Navigation Bar */}
      <nav className="nav-bar safe-top">
        <div className="nav-content">
          <button className="nav-action" onClick={() => setShowProfile(true)}>
            <Icon name="user" size={20} />
          </button>
          <h1 className="nav-title">SmartSplit</h1>
          <div style={{ width: 40 }}></div>
        </div>
      </nav>

      {/* Scrollable Content with Pull to Refresh */}
      <PullToRefresh onRefresh={handleRefresh} isRefreshing={isRefreshing}>
        <div className="scroll-container">
          <div className="content-wrapper">
            {/* Quick Actions */}
            <div className="quick-actions">
              <button
                className="quick-action primary"
                onClick={() => setShowCreateGroup(true)}
              >
                <div className="quick-action-icon">
                  <Icon name="add" size={24} />
                </div>
                <span className="quick-action-label">Crea gruppo</span>
              </button>

              <button
                className="quick-action success"
                onClick={() => setShowJoinGroup(true)}
              >
                <div className="quick-action-icon">
                  <Icon name="qr-code" size={24} />
                </div>
                <span className="quick-action-label">Usa codice</span>
              </button>
            </div>

            {/* Groups List */}
            {activeTab === 'groups' && (
              <>
                <div className="section-header">
                  <h2 className="section-title">I tuoi gruppi</h2>
                  {groups.length > 0 && (
                    <span className="section-count">{groups.length}</span>
                  )}
                </div>

                {isLoading ? (
                  <SkeletonLoader type="groups" count={3} />
                ) : filteredGroups.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">👥</div>
                    <div className="empty-title">
                      {searchQuery ? 'Nessun risultato' : 'Nessun gruppo'}
                    </div>
                    <div className="empty-text">
                      {searchQuery
                        ? "Prova con un'altra ricerca"
                        : 'Crea un nuovo gruppo o unisciti con un codice'}
                    </div>
                  </div>
                ) : (
                  filteredGroups.map((group) => (
                    <div
                      key={group.id}
                      className="group-item"
                      onClick={() => handleGroupClick(group)}
                    >
                      <div className="group-avatar">
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="group-details">
                        <div className="group-name">{group.name}</div>
                        <div className="group-info">
                          <span>{group.memberCount} membri</span>
                          <span>•</span>
                          <span>{formatCurrency(group.totalAmount)}</span>
                        </div>
                      </div>
                      <div className="group-arrow">
                        <Icon name="chevron-forward" size={20} />
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="activity-section">
                <div className="section-header">
                  <h2 className="section-title">Attività recenti</h2>
                </div>
                <div className="activity-list">
                  <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <div className="empty-title">Nessuna attività</div>
                    <div className="empty-text">
                      Le attività dei tuoi gruppi appariranno qui
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <div className="stats-section">
                <div className="section-header">
                  <h2 className="section-title">Le tue statistiche</h2>
                </div>
                <div className="overall-stats">
                  <div className="stat-card large">
                    <div className="stat-icon">💰</div>
                    <div className="stat-value">
                      {formatCurrency(
                        groups.reduce((sum, g) => sum + g.totalAmount, 0)
                      )}
                    </div>
                    <div className="stat-label">Totale gestito</div>
                  </div>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon">👥</div>
                      <div className="stat-value">{groups.length}</div>
                      <div className="stat-label">Gruppi</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">🧾</div>
                      <div className="stat-value">
                        {groups.reduce((sum, g) => sum + g.expenseCount, 0)}
                      </div>
                      <div className="stat-label">Spese totali</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>

      {/* Bottom Tab Bar */}
      <div className="tab-bar safe-bottom">
        <div className="tab-bar-content">
          <button
            className={`tab-item ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => handleTabChange('groups')}
          >
            <span className="tab-icon">👥</span>
            <span className="tab-label">Gruppi</span>
          </button>
          <button
            className={`tab-item ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => handleTabChange('activity')}
          >
            <span className="tab-icon">📊</span>
            <span className="tab-label">Attività</span>
          </button>
          <button
            className={`tab-item ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => handleTabChange('stats')}
          >
            <span className="tab-icon">📈</span>
            <span className="tab-label">Stats</span>
          </button>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <Modal
          title="Nuovo Gruppo"
          onClose={() => setShowCreateGroup(false)}
          onSave={createGroup}
        >
          <div className="form-group">
            <label className="form-label">Nome del gruppo</label>
            <input
              type="text"
              className="form-input"
              placeholder="es. Vacanza Grecia 2024"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              autoFocus
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descrizione (opzionale)</label>
            <textarea
              className="form-input"
              placeholder="Aggiungi una descrizione..."
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              rows={3}
              maxLength={200}
            />
          </div>
        </Modal>
      )}

      {/* Join Group Modal */}
      {showJoinGroup && (
        <Modal
          title="Unisciti a Gruppo"
          onClose={() => setShowJoinGroup(false)}
          onSave={joinGroup}
        >
          <div className="form-group">
            <label className="form-label">Codice invito</label>
            <input
              type="text"
              className="form-input invite-code-input"
              placeholder="XXXXXXXX"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={8}
              autoFocus
            />
            <p className="help-text">
              💡 Chiedi il codice invito al creatore del gruppo
            </p>
          </div>
        </Modal>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <ProfileModal
          user={user}
          groups={groups}
          onClose={() => setShowProfile(false)}
          showToast={showToast}
        />
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default SmartSplitApp;
