import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { groupsService } from '../services/groupsService';
import AuthScreen from './AuthScreen';
import Icon from './Icon';
import Modal from './Modal';

const SmartSplitApp = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [groupExpenses, setGroupExpenses] = useState([]);
  const [groupBalances, setGroupBalances] = useState(null);

  // Modals
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Form data
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    description: '',
    totalAmount: '',
    location: '',
    shares: {},
  });

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserGroups();
    }
  }, [user]);

  useEffect(() => {
    if (activeGroup) {
      loadGroupData();
      // Setup real-time subscription
      const unsubscribe = groupsService.subscribeToGroupChanges(
        activeGroup.id,
        {
          onExpenseChange: () => loadGroupData(),
          onMemberChange: () => loadGroupData(),
          onShareChange: () => loadGroupData(),
        }
      );

      return unsubscribe;
    }
  }, [activeGroup]);

  const initializeAuth = async () => {
    try {
      // Check for existing session
      const {
        data: { session },
      } = await authService.getCurrentSession();

      if (session?.user) {
        setUser(session.user);
      }

      // Setup auth state listener
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
      console.error('Auth initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserGroups = async () => {
    try {
      const result = await groupsService.getUserGroups();
      if (result.success) {
        setGroups(result.groups);
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadGroupData = async () => {
    if (!activeGroup) return;

    try {
      // Load expenses
      const expensesResult = await groupsService.getGroupExpenses(
        activeGroup.id
      );
      if (expensesResult.success) {
        setGroupExpenses(expensesResult.expenses);
      }

      // Load balances
      const balancesResult = await groupsService.calculateGroupBalances(
        activeGroup.id
      );
      if (balancesResult.success) {
        setGroupBalances(balancesResult);
      }

      // Refresh group details
      const groupResult = await groupsService.getGroupDetails(activeGroup.id);
      if (groupResult.success) {
        setActiveGroup(groupResult.group);
      }
    } catch (error) {
      console.error('Error loading group data:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      alert('Inserisci un nome per il gruppo');
      return;
    }

    try {
      const result = await groupsService.createGroup(
        newGroupName,
        newGroupDescription
      );
      if (result.success) {
        alert(result.message);
        setNewGroupName('');
        setNewGroupDescription('');
        setShowCreateGroupModal(false);
        loadUserGroups();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert('Si è verificato un errore imprevisto');
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      alert('Inserisci il codice invito');
      return;
    }

    try {
      const result = await groupsService.joinGroupByInviteCode(inviteCode);
      if (result.success) {
        alert(result.message);
        setInviteCode('');
        setShowJoinGroupModal(false);
        loadUserGroups();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert('Si è verificato un errore imprevisto');
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.title.trim()) {
      alert('Inserisci un titolo per la spesa');
      return;
    }

    const totalAmount = parseFloat(expenseForm.totalAmount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      alert('Inserisci un importo valido');
      return;
    }

    // Verifica che ci siano consumi
    const hasShares = Object.values(expenseForm.shares).some(
      (amount) => parseFloat(amount) > 0
    );

    if (!hasShares) {
      alert('Almeno una persona deve aver consumato qualcosa');
      return;
    }

    try {
      const result = await groupsService.createExpense(
        activeGroup.id,
        expenseForm
      );
      if (result.success) {
        alert(result.message);
        setExpenseForm({
          title: '',
          description: '',
          totalAmount: '',
          location: '',
          shares: {},
        });
        setShowAddExpenseModal(false);
        loadGroupData();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert('Si è verificato un errore imprevisto');
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Sei sicuro di voler uscire?')) {
      const result = await authService.signOut();
      if (!result.success) {
        alert(result.error);
      }
    }
  };

  const shareInviteCode = (code) => {
    if (navigator.share) {
      navigator.share({
        title: 'Codice Invito SmartSplit',
        text: `Unisciti al mio gruppo su SmartSplit con il codice: ${code}`,
      });
    } else {
      // Fallback: copia negli appunti
      navigator.clipboard
        .writeText(code)
        .then(() => {
          alert(`Codice invito copiato: ${code}`);
        })
        .catch(() => {
          alert(`Condividi questo codice: ${code}`);
        });
    }
  };

  const openExpenseModal = () => {
    if (!activeGroup?.group_members || activeGroup.group_members.length === 0) {
      alert('Il gruppo deve avere almeno un membro per aggiungere spese');
      return;
    }

    // Inizializza shares per tutti i membri
    const initialShares = {};
    activeGroup.group_members.forEach((member) => {
      initialShares[member.user_id] = '';
    });

    setExpenseForm({
      title: '',
      description: '',
      totalAmount: '',
      location: '',
      shares: initialShares,
    });
    setShowAddExpenseModal(true);
  };

  const calculateTotalShares = () => {
    return Object.values(expenseForm.shares).reduce((sum, amount) => {
      const num = parseFloat(amount);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={setUser} />;
  }

  // LISTA GRUPPI
  if (!activeGroup) {
    return (
      <div className="smartsplit-container">
        {/* Header */}
        <div className="header">
          <h1 className="header-title">I tuoi gruppi</h1>
          <div className="header-buttons">
            <button
              className="header-button"
              onClick={() => setShowProfileModal(true)}
            >
              <Icon name="user" size={20} color="white" />
            </button>
            <button
              className="header-button"
              onClick={() => setShowCreateGroupModal(true)}
            >
              <Icon name="add" size={20} color="white" />
            </button>
          </div>
        </div>

        <div className="content">
          {/* Quick Actions */}
          <div className="quick-actions">
            <button
              className="quick-action-button"
              onClick={() => setShowCreateGroupModal(true)}
            >
              <Icon name="add" size={24} color="#2196F3" />
              <span className="quick-action-text">Crea Gruppo</span>
            </button>

            <button
              className="quick-action-button"
              onClick={() => setShowJoinGroupModal(true)}
            >
              <Icon name="qr-code" size={24} color="#4CAF50" />
              <span className="quick-action-text">Unisciti</span>
            </button>
          </div>

          {/* Groups List */}
          {groups.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h2 className="empty-text">Nessun gruppo ancora</h2>
              <p className="empty-subtext">
                Crea un gruppo o unisciti a uno esistente per iniziare!
              </p>
            </div>
          ) : (
            <div>
              {groups.map((item) => (
                <div
                  key={item.id}
                  className="group-card"
                  onClick={() => setActiveGroup(item)}
                >
                  <div className="group-info">
                    <h3 className="group-name">{item.name}</h3>
                    <p className="group-details">
                      {item.memberCount} membri • {item.expenseCount} spese
                    </p>
                    {item.totalAmount > 0 && (
                      <p className="group-amount">
                        Totale: {item.totalAmount.toFixed(2)}€
                      </p>
                    )}
                    <p className="group-role">
                      {item.userRole === 'admin' ? '👑 Admin' : '👤 Membro'}
                    </p>
                  </div>
                  <Icon name="chevron-forward" size={20} color="#666" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modals */}
        {showCreateGroupModal && (
          <Modal
            title="Nuovo Gruppo"
            onClose={() => setShowCreateGroupModal(false)}
            onSave={handleCreateGroup}
          >
            <div className="form-group">
              <input
                className="form-input"
                placeholder="Nome del gruppo"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="form-group">
              <textarea
                className="form-input form-textarea"
                placeholder="Descrizione (opzionale)"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                maxLength={200}
              />
            </div>
          </Modal>
        )}

        {showJoinGroupModal && (
          <Modal
            title="Unisciti a Gruppo"
            onClose={() => setShowJoinGroupModal(false)}
            onSave={handleJoinGroup}
          >
            <div className="form-group">
              <input
                className="form-input"
                placeholder="Codice invito"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={10}
                style={{ textTransform: 'uppercase' }}
              />
              <p className="help-text">
                💡 Chiedi il codice invito al creatore del gruppo
              </p>
            </div>
          </Modal>
        )}

        {showProfileModal && (
          <Modal
            title="Profilo"
            onClose={() => setShowProfileModal(false)}
            showSave={false}
          >
            <div className="profile-info">
              <Icon name="user" size={40} color="#2196F3" />
              <h3 className="profile-name">
                {user.user_metadata?.full_name || user.email}
              </h3>
              <p className="profile-email">{user.email}</p>
            </div>

            <div className="profile-stats">
              <h4 className="stats-title">Le tue statistiche:</h4>
              <p className="stat-item">👥 {groups.length} gruppi</p>
              <p className="stat-item">
                💰 {groups.reduce((sum, g) => sum + g.expenseCount, 0)} spese
                create
              </p>
            </div>

            <div style={{ marginTop: '24px' }}>
              <button
                className="btn btn-error"
                onClick={handleLogout}
                style={{ width: '100%' }}
              >
                Esci
              </button>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // DETTAGLI GRUPPO
  return (
    <div className="smartsplit-container">
      {/* Header */}
      <div className="header">
        <button onClick={() => setActiveGroup(null)}>
          <Icon name="arrow-back" size={24} color="white" />
        </button>
        <h1 className="header-title">{activeGroup.name}</h1>
        <button onClick={() => shareInviteCode(activeGroup.invite_code)}>
          <Icon name="share" size={24} color="white" />
        </button>
      </div>

      <div className="content" style={{ overflowY: 'auto' }}>
        {/* Group Info */}
        <div className="group-info-card">
          <h2 className="group-info-title">{activeGroup.name}</h2>
          {activeGroup.description && (
            <p className="group-info-description">{activeGroup.description}</p>
          )}
          <div className="group-info-stats">
            <span className="group-info-stat">
              👥 {activeGroup.group_members?.length || 0} membri
            </span>
            <span className="group-info-stat">
              💰 {groupExpenses.length} spese
            </span>
            <button
              onClick={() => shareInviteCode(activeGroup.invite_code)}
              className="invite-button"
            >
              <span className="invite-button-text">
                📱 Invita: {activeGroup.invite_code}
              </span>
            </button>
          </div>
        </div>

        {/* Bilanci */}
        {groupBalances && groupBalances.balances.length > 0 && (
          <div className="section">
            <h2 className="section-title">💰 Bilanci</h2>
            {groupBalances.balances.map((balance, index) => (
              <div key={index} className="balance-card">
                <div className="balance-info">
                  <h4 className="balance-name">
                    {balance.full_name || balance.email}
                  </h4>
                  <p className="balance-details">
                    Pagato: {parseFloat(balance.total_paid).toFixed(2)}€ •
                    Consumato: {parseFloat(balance.total_consumed).toFixed(2)}€
                  </p>
                </div>
                <span
                  className={`balance-amount ${
                    parseFloat(balance.balance) >= 0
                      ? 'balance-positive'
                      : 'balance-negative'
                  }`}
                >
                  {parseFloat(balance.balance) >= 0 ? '+' : ''}
                  {parseFloat(balance.balance).toFixed(2)}€
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Regolamenti */}
        {groupBalances && groupBalances.settlements.length > 0 && (
          <div className="section">
            <h2 className="section-title">🔄 Regolamenti</h2>
            {groupBalances.settlements.map((settlement, index) => (
              <div key={index} className="settlement-card">
                <p className="settlement-text">
                  {settlement.from} deve {settlement.amount.toFixed(2)}€ a{' '}
                  {settlement.to}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Spese */}
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">💳 Spese Recenti</h2>
            <button
              className="btn-icon btn-icon-sm btn-secondary"
              onClick={openExpenseModal}
            >
              <Icon name="add" size={20} color="white" />
            </button>
          </div>

          {groupExpenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🧾</div>
              <h3 className="empty-text">Nessuna spesa ancora</h3>
              <p className="empty-subtext">
                Tocca + per aggiungere la prima spesa!
              </p>
            </div>
          ) : (
            groupExpenses.map((expense) => (
              <div key={expense.id} className="expense-card">
                <div className="expense-header">
                  <h4 className="expense-title">{expense.title}</h4>
                  <span className="expense-amount">
                    {parseFloat(expense.total_amount).toFixed(2)}€
                  </span>
                </div>

                <p className="expense-creator">
                  💳 Pagato da{' '}
                  {expense.created_by === user.id ? 'Te' : 'Altro utente'}
                </p>

                {expense.description && (
                  <p className="expense-description">{expense.description}</p>
                )}

                {expense.location && (
                  <p className="expense-location">📍 {expense.location}</p>
                )}

                <p className="expense-date">
                  📅{' '}
                  {new Date(expense.expense_date).toLocaleDateString('it-IT')}
                </p>

                {expense.expense_shares &&
                  expense.expense_shares.length > 0 && (
                    <div className="expense-shares">
                      <h5 className="expense-shares-title">Consumi:</h5>
                      {expense.expense_shares.map((share, index) => (
                        <p key={index} className="expense-share">
                          • {share.user_id === user.id ? 'Tu' : 'Altro utente'}:{' '}
                          {parseFloat(share.amount_consumed).toFixed(2)}€
                        </p>
                      ))}
                    </div>
                  )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpenseModal && (
        <Modal
          title="Nuova Spesa"
          onClose={() => setShowAddExpenseModal(false)}
          onSave={handleAddExpense}
        >
          <div className="form-group">
            <input
              className="form-input"
              placeholder="Titolo spesa (es: Cena ristorante)"
              value={expenseForm.title}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, title: e.target.value })
              }
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <textarea
              className="form-input form-textarea"
              placeholder="Descrizione (opzionale)"
              value={expenseForm.description}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, description: e.target.value })
              }
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <input
              className="form-input"
              placeholder="Importo totale pagato"
              value={expenseForm.totalAmount}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, totalAmount: e.target.value })
              }
              type="number"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <input
              className="form-input"
              placeholder="Luogo (opzionale)"
              value={expenseForm.location}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, location: e.target.value })
              }
              maxLength={100}
            />
          </div>

          <label className="form-label">
            Quanto ha consumato ogni persona?
          </label>
          {activeGroup.group_members?.map((member) => (
            <div key={member.user_id} className="member-expense-input">
              <span className="member-label">
                {member.user_id === user.id
                  ? 'Tu'
                  : `Utente ${member.user_id.slice(-4)}`}
              </span>
              <input
                className="amount-input"
                placeholder="0.00"
                value={expenseForm.shares[member.user_id] || ''}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    shares: {
                      ...expenseForm.shares,
                      [member.user_id]: e.target.value,
                    },
                  })
                }
                type="number"
                step="0.01"
              />
              <span className="currency-label">€</span>
            </div>
          ))}

          <div className="total-section">
            <p className="total-label">
              Totale consumato: {calculateTotalShares().toFixed(2)}€
            </p>
            <p className="total-paid">
              Importo pagato:{' '}
              {parseFloat(expenseForm.totalAmount || 0).toFixed(2)}€
            </p>
          </div>

          <div className="help-section">
            <p className="help-text">
              💡 <strong>Ricorda:</strong>
              <br />
              • Solo tu puoi aggiungere le TUE spese
              <br />
              • Inserisci l'importo che HAI PAGATO
              <br />
              • Indica quanto ha consumato ogni persona
              <br />• I calcoli avvengono automaticamente!
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SmartSplitApp;
