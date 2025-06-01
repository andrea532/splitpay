import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { groupsService } from '../services/groupsService';
import AuthScreen from './AuthScreen';
import Icon from './Icon';

const SmartSplitApp = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [groupExpenses, setGroupExpenses] = useState([]);
  const [groupBalances, setGroupBalances] = useState(null);

  // Stati per modals semplificati
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Form data semplificati
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [myShare, setMyShare] = useState('');

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadGroups();
    }
  }, [user]);

  useEffect(() => {
    if (activeGroup) {
      loadGroupData();
    }
  }, [activeGroup]);

  const initializeAuth = async () => {
    try {
      const { data: { session } } = await authService.getCurrentSession();
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

  const loadGroups = async () => {
    const result = await groupsService.getUserGroups();
    if (result.success) {
      setGroups(result.groups);
    } else {
      showMessage(result.error);
    }
  };

  const loadGroupData = async () => {
    if (!activeGroup) return;

    const expensesResult = await groupsService.getGroupExpenses(activeGroup.id);
    if (expensesResult.success) {
      setGroupExpenses(expensesResult.expenses);
    }

    const balancesResult = await groupsService.calculateGroupBalances(activeGroup.id);
    if (balancesResult.success) {
      setGroupBalances(balancesResult);
    }
  };

  const showMessage = (message, isError = true) => {
    alert(message); // Semplificato - in futuro si può migliorare con toast
  };

  const showSuccess = (message) => {
    showMessage(message, false);
  };

  // AZIONI SEMPLIFICATE

  const createGroup = async () => {
    if (!groupName.trim()) {
      showMessage('Inserisci un nome per il gruppo');
      return;
    }

    const result = await groupsService.createGroup(groupName.trim());
    if (result.success) {
      showSuccess('Gruppo creato! Condividi il codice: ' + result.group.invite_code);
      setGroupName('');
      setShowCreateGroup(false);
      loadGroups();
    } else {
      showMessage(result.error);
    }
  };

  const joinGroup = async () => {
    if (!inviteCode.trim()) {
      showMessage('Inserisci il codice invito');
      return;
    }

    const result = await groupsService.joinGroupByInviteCode(inviteCode.trim());
    if (result.success) {
      showSuccess(result.message);
      setInviteCode('');
      setShowJoinGroup(false);
      loadGroups();
    } else {
      showMessage(result.error);
    }
  };

  const addExpense = async () => {
    if (!expenseTitle.trim()) {
      showMessage('Inserisci un titolo per la spesa');
      return;
    }

    const amount = parseFloat(expenseAmount);
    const share = parseFloat(myShare);

    if (isNaN(amount) || amount <= 0) {
      showMessage('Inserisci un importo valido');
      return;
    }

    if (isNaN(share) || share <= 0) {
      showMessage('Inserisci quanto hai consumato');
      return;
    }

    if (share > amount) {
      showMessage('Non puoi aver consumato più di quanto hai pagato');
      return;
    }

    // Versione semplificata: solo il creatore consuma
    const expenseData = {
      title: expenseTitle.trim(),
      totalAmount: amount.toString(),
      shares: {
        [user.id]: share.toString()
      }
    };

    const result = await groupsService.createExpense(activeGroup.id, expenseData);
    if (result.success) {
      showSuccess('Spesa aggiunta!');
      setExpenseTitle('');
      setExpenseAmount('');
      setMyShare('');
      setShowAddExpense(false);
      loadGroupData();
    } else {
      showMessage(result.error);
    }
  };

  const logout = async () => {
    if (confirm('Vuoi uscire?')) {
      await authService.signOut();
    }
  };

  const shareGroup = (code) => {
    if (navigator.share) {
      navigator.share({
        title: 'Unisciti al mio gruppo SmartSplit',
        text: `Codice invito: ${code}`
      });
    } else {
      navigator.clipboard.writeText(code).then(() => {
        showSuccess(`Codice copiato: ${code}`);
      }).catch(() => {
        showSuccess(`Condividi questo codice: ${code}`);
      });
    }
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

  // SCHERMATA LISTA GRUPPI
  if (!activeGroup) {
    return (
      <div className="smartsplit-container">
        {/* Header semplificato */}
        <div className="header">
          <h1 className="header-title">💰 SmartSplit</h1>
          <button className="header-button" onClick={logout}>
            <Icon name="logout" size={20} color="white" />
          </button>
        </div>

        <div className="content">
          {/* Benvenuto */}
          <div className="welcome-card">
            <h2>Ciao {user.user_metadata?.full_name || user.email}! 👋</h2>
            <p>Gestisci le spese di gruppo in modo semplice</p>
          </div>

          {/* Azioni principali */}
          <div className="action-buttons">
            <button 
              className="action-btn primary"
              onClick={() => setShowCreateGroup(true)}
            >
              <Icon name="add" size={24} />
              Crea Gruppo
            </button>
            
            <button 
              className="action-btn secondary"
              onClick={() => setShowJoinGroup(true)}
            >
              <Icon name="qr-code" size={24} />
              Unisciti a Gruppo
            </button>
          </div>

          {/* Lista gruppi */}
          <div className="groups-section">
            <h3>I tuoi gruppi ({groups.length})</h3>
            
            {groups.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <p>Nessun gruppo ancora</p>
                <p className="empty-subtext">
                  Crea il tuo primo gruppo o unisciti a uno esistente!
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <div 
                  key={group.id} 
                  className="group-card simple"
                  onClick={() => setActiveGroup(group)}
                >
                  <div className="group-info">
                    <h4>{group.name}</h4>
                    <p>{group.memberCount} membri • {group.expenseCount} spese</p>
                    {group.totalAmount > 0 && (
                      <p className="group-total">Totale: €{group.totalAmount.toFixed(2)}</p>
                    )}
                  </div>
                  <Icon name="chevron-forward" size={20} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Crea Gruppo */}
        {showCreateGroup && (
          <SimpleModal
            title="Crea Nuovo Gruppo"
            onClose={() => setShowCreateGroup(false)}
            onSave={createGroup}
          >
            <input
              type="text"
              placeholder="Nome del gruppo (es: Viaggio Roma 2024)"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="simple-input"
              maxLength={50}
            />
            <p className="help-text">
              💡 Dopo aver creato il gruppo, riceverai un codice da condividere
            </p>
          </SimpleModal>
        )}

        {/* Modal Unisciti */}
        {showJoinGroup && (
          <SimpleModal
            title="Unisciti a Gruppo"
            onClose={() => setShowJoinGroup(false)}
            onSave={joinGroup}
          >
            <input
              type="text"
              placeholder="Codice invito (es: ABC123)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="simple-input"
              maxLength={10}
              style={{ textTransform: 'uppercase' }}
            />
            <p className="help-text">
              💡 Chiedi il codice a chi ha creato il gruppo
            </p>
          </SimpleModal>
        )}
      </div>
    );
  }

  // SCHERMATA DETTAGLI GRUPPO
  return (
    <div className="smartsplit-container">
      {/* Header gruppo */}
      <div className="header">
        <button onClick={() => setActiveGroup(null)}>
          <Icon name="arrow-back" size={24} color="white" />
        </button>
        <h1 className="header-title">{activeGroup.name}</h1>
        <button onClick={() => shareGroup(activeGroup.invite_code)}>
          <Icon name="share" size={24} color="white" />
        </button>
      </div>

      <div className="content">
        {/* Info gruppo */}
        <div className="group-header-card">
          <div className="group-header-info">
            <h2>{activeGroup.name}</h2>
            <p>👥 {activeGroup.group_members?.length || 0} membri</p>
          </div>
          <button 
            className="invite-btn"
            onClick={() => shareGroup(activeGroup.invite_code)}
          >
            Invita: {activeGroup.invite_code}
          </button>
        </div>

        {/* Pulsante aggiungi spesa */}
        <button 
          className="add-expense-btn"
          onClick={() => setShowAddExpense(true)}
        >
          <Icon name="add" size={24} />
          Aggiungi Spesa
        </button>

        {/* Bilanci semplificati */}
        {groupBalances && groupBalances.balances.length > 0 && (
          <div className="balances-section">
            <h3>💰 Situazione</h3>
            {groupBalances.balances.map((balance, index) => (
              <div key={index} className="balance-simple">
                <span className="balance-name">
                  {balance.user_id === user.id ? 'Tu' : (balance.full_name || 'Utente')}
                </span>
                <span className={`balance-amount ${parseFloat(balance.balance) >= 0 ? 'positive' : 'negative'}`}>
                  {parseFloat(balance.balance) >= 0 ? '+' : ''}€{Math.abs(parseFloat(balance.balance)).toFixed(2)}
                </span>
              </div>
            ))}

            {/* Regolamenti semplificati */}
            {groupBalances.settlements.length > 0 && (
              <div className="settlements">
                <h4>🔄 Chi deve pagare:</h4>
                {groupBalances.settlements.map((settlement, index) => (
                  <div key={index} className="settlement-simple">
                    <p>
                      {settlement.fromUserId === user.id ? 'Tu devi' : settlement.from + ' deve'} 
                      <strong> €{settlement.amount.toFixed(2)} </strong>
                      {settlement.toUserId === user.id ? 'a te' : 'a ' + settlement.to}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Spese */}
        <div className="expenses-section">
          <h3>🧾 Spese Recenti</h3>
          
          {groupExpenses.length === 0 ? (
            <div className="empty-state small">
              <p>Nessuna spesa ancora</p>
              <p className="empty-subtext">Aggiungi la prima spesa!</p>
            </div>
          ) : (
            groupExpenses.slice(0, 10).map((expense) => (
              <div key={expense.id} className="expense-simple">
                <div className="expense-main">
                  <h4>{expense.title}</h4>
                  <span className="expense-amount">€{parseFloat(expense.total_amount).toFixed(2)}</span>
                </div>
                <p className="expense-details">
                  💳 {expense.created_by === user.id ? 'Tu hai pagato' : 'Pagato da altro utente'} • 
                  📅 {new Date(expense.expense_date).toLocaleDateString('it-IT')}
                </p>
                {expense.expense_shares && expense.expense_shares.length > 0 && (
                  <p className="expense-consumption">
                    🍽️ Consumato: €{expense.expense_shares.reduce((sum, share) => 
                      sum + parseFloat(share.amount_consumed), 0).toFixed(2)}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Aggiungi Spesa */}
      {showAddExpense && (
        <SimpleModal
          title="Nuova Spesa"
          onClose={() => setShowAddExpense(false)}
          onSave={addExpense}
        >
          <input
            type="text"
            placeholder="Cosa hai pagato? (es: Cena ristorante)"
            value={expenseTitle}
            onChange={(e) => setExpenseTitle(e.target.value)}
            className="simple-input"
            maxLength={100}
          />
          
          <input
            type="number"
            placeholder="Quanto hai pagato in totale?"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
            className="simple-input"
            step="0.01"
          />
          
          <input
            type="number"
            placeholder="Quanto hai consumato tu?"
            value={myShare}
            onChange={(e) => setMyShare(e.target.value)}
            className="simple-input"
            step="0.01"
          />
          
          <div className="help-section">
            <p className="help-text">
              💡 <strong>Esempio:</strong><br/>
              • Hai pagato €50 per una pizza<br/>
              • Tu hai mangiato per €20<br/>
              • Il resto lo dividerete con gli altri dopo
            </p>
          </div>
        </SimpleModal>
      )}
    </div>
  );
};

// Componente Modal Semplificato
const SimpleModal = ({ title, children, onClose, onSave }) => {
  return (
    <div className="simple-modal-overlay" onClick={onClose}>
      <div className="simple-modal" onClick={(e) => e.stopPropagation()}>
        <div className="simple-modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>
        
        <div className="simple-modal-content">
          {children}
        </div>
        
        <div className="simple-modal-actions">
          <button onClick={onClose} className="btn-cancel">Annulla</button>
          <button onClick={onSave} className="btn-save">Salva</button>
        </div>
      </div>
    </div>
  );
};

export default SmartSplitApp;
  );
};

export default SmartSplitApp;
