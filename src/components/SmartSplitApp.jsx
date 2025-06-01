import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { groupsService } from '../services/groupsService';
import AuthScreen from './AuthScreen';
import NumberPad from './NumberPad';
import Icon from './Icon';

const SmartSplitApp = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [groupExpenses, setGroupExpenses] = useState([]);
  const [groupBalances, setGroupBalances] = useState(null);

  // Stati modals
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Form data
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

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
    }
  };

  const loadGroupData = async () => {
    if (!activeGroup) return;

    const [expensesResult, balancesResult] = await Promise.all([
      groupsService.getGroupExpenses(activeGroup.id),
      groupsService.calculateGroupBalances(activeGroup.id)
    ]);

    if (expensesResult.success) {
      setGroupExpenses(expensesResult.expenses);
    }
    if (balancesResult.success) {
      setGroupBalances(balancesResult);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) return;

    const result = await groupsService.createGroup(groupName.trim());
    if (result.success) {
      setGroupName('');
      setShowCreateGroup(false);
      loadGroups();
      // Copia codice automaticamente
      navigator.clipboard.writeText(result.group.invite_code);
      alert(`Gruppo creato! Codice ${result.group.invite_code} copiato negli appunti`);
    }
  };

  const joinGroup = async () => {
    if (!inviteCode.trim()) return;

    const result = await groupsService.joinGroupByInviteCode(inviteCode.trim());
    if (result.success) {
      setInviteCode('');
      setShowJoinGroup(false);
      loadGroups();
    } else {
      alert(result.error);
    }
  };

  const addExpense = async () => {
    if (!expenseTitle.trim() || !expenseAmount) return;

    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) return;

    const result = await groupsService.createExpense(activeGroup.id, {
      title: expenseTitle.trim(),
      totalAmount: amount.toString(),
      shares: {} // Semplificato - la divisione avviene automaticamente
    });

    if (result.success) {
      setExpenseTitle('');
      setExpenseAmount('');
      setShowAddExpense(false);
      loadGroupData();
    }
  };

  const formatCurrency = (amount) => {
    return `€${parseFloat(amount).toFixed(2)}`;
  };

  const getUserName = (userId, fullName) => {
    return userId === user?.id ? 'Tu' : fullName || 'Utente';
  };

  const logout = () => {
    authService.signOut();
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={setUser} />;
  }

  // LISTA GRUPPI
  if (!activeGroup) {
    return (
      <div className="app">
        <div className="top-bar">
          <h1>💰 SmartSplit</h1>
          <button onClick={logout} className="icon-btn">
            🚪
          </button>
        </div>

        <div className="main-content">
          <div className="quick-actions">
            <button 
              className="big-button primary"
              onClick={() => setShowCreateGroup(true)}
            >
              <span className="big-icon">➕</span>
              <span>Crea Gruppo</span>
            </button>
            
            <button 
              className="big-button secondary"
              onClick={() => setShowJoinGroup(true)}
            >
              <span className="big-icon">🎟️</span>
              <span>Usa Codice</span>
            </button>
          </div>

          <div className="groups-list">
            <h2>I tuoi gruppi</h2>
            {groups.length === 0 ? (
              <div className="empty-message">
                <p>Nessun gruppo ancora</p>
                <p className="hint">Crea o unisciti a un gruppo per iniziare</p>
              </div>
            ) : (
              groups.map((group) => (
                <div 
                  key={group.id} 
                  className="group-item"
                  onClick={() => setActiveGroup(group)}
                >
                  <div>
                    <h3>{group.name}</h3>
                    <p>{group.memberCount} persone • {formatCurrency(group.totalAmount)}</p>
                  </div>
                  <span className="arrow">→</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Crea Gruppo */}
        {showCreateGroup && (
          <div className="modal-backdrop" onClick={() => setShowCreateGroup(false)}>
            <div className="modal-simple" onClick={(e) => e.stopPropagation()}>
              <h2>Nuovo Gruppo</h2>
              <input
                type="text"
                placeholder="Nome del gruppo"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="input-simple"
                autoFocus
                maxLength={30}
              />
              <div className="modal-buttons">
                <button onClick={() => setShowCreateGroup(false)} className="btn-text">
                  Annulla
                </button>
                <button onClick={createGroup} className="btn-primary">
                  Crea
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Unisciti */}
        {showJoinGroup && (
          <div className="modal-backdrop" onClick={() => setShowJoinGroup(false)}>
            <div className="modal-simple" onClick={(e) => e.stopPropagation()}>
              <h2>Inserisci Codice</h2>
              <input
                type="text"
                placeholder="CODICE"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="input-simple input-code"
                autoFocus
                maxLength={8}
              />
              <div className="modal-buttons">
                <button onClick={() => setShowJoinGroup(false)} className="btn-text">
                  Annulla
                </button>
                <button onClick={joinGroup} className="btn-primary">
                  Entra
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // DETTAGLIO GRUPPO
  return (
    <div className="app">
      <div className="top-bar">
        <button onClick={() => setActiveGroup(null)} className="icon-btn">
          ←
        </button>
        <h1>{activeGroup.name}</h1>
        <button 
          onClick={() => {
            navigator.clipboard.writeText(activeGroup.invite_code);
            alert(`Codice ${activeGroup.invite_code} copiato!`);
          }} 
          className="icon-btn"
        >
          📋
        </button>
      </div>

      <div className="main-content">
        {/* Pulsante Aggiungi Spesa */}
        <button 
          className="add-expense-button"
          onClick={() => setShowAddExpense(true)}
        >
          <span>➕</span>
          <span>Aggiungi Spesa</span>
        </button>

        {/* Riepilogo Semplice */}
        {groupBalances && groupBalances.balances.length > 0 && (
          <div className="summary-card">
            <h2>💰 Chi deve pagare</h2>
            {groupBalances.settlements.length === 0 ? (
              <p className="all-even">Tutti pari! ✅</p>
            ) : (
              <div className="settlements-list">
                {groupBalances.settlements.map((settlement, index) => (
                  <div key={index} className="settlement-item">
                    <span className="who">
                      {getUserName(settlement.fromUserId, settlement.from)}
                    </span>
                    <span className="arrow">→</span>
                    <span className="to-whom">
                      {getUserName(settlement.toUserId, settlement.to)}
                    </span>
                    <span className="amount">{formatCurrency(settlement.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bilanci Individuali */}
        {groupBalances && groupBalances.balances.length > 0 && (
          <div className="balances-card">
            <h2>📊 Situazione</h2>
            {groupBalances.balances.map((balance, index) => {
              const bal = parseFloat(balance.balance);
              const isPositive = bal >= 0;
              
              return (
                <div key={index} className="balance-row">
                  <span className="person-name">
                    {getUserName(balance.user_id, balance.full_name)}
                  </span>
                  <span className={`balance-amount ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? '+' : ''}{formatCurrency(Math.abs(bal))}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Lista Spese */}
        <div className="expenses-card">
          <h2>🧾 Spese</h2>
          {groupExpenses.length === 0 ? (
            <p className="no-expenses">Nessuna spesa ancora</p>
          ) : (
            groupExpenses.slice(0, 10).map((expense) => (
              <div key={expense.id} className="expense-row">
                <div>
                  <h4>{expense.title}</h4>
                  <p className="expense-info">
                    {getUserName(expense.created_by, 'Qualcuno')} • 
                    {new Date(expense.expense_date).toLocaleDateString('it-IT')}
                  </p>
                </div>
                <span className="expense-amount">{formatCurrency(expense.total_amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Aggiungi Spesa con NumberPad */}
      {showAddExpense && (
        <div className="modal-backdrop" onClick={() => setShowAddExpense(false)}>
          <div className="modal-expense" onClick={(e) => e.stopPropagation()}>
            <h2>Nuova Spesa</h2>
            
            <input
              type="text"
              placeholder="Cosa hai pagato?"
              value={expenseTitle}
              onChange={(e) => setExpenseTitle(e.target.value)}
              className="input-simple"
              autoFocus
            />
            
            <div className="amount-display">
              <span className="currency">€</span>
              <span className="amount-value">{expenseAmount || '0.00'}</span>
            </div>
            
            <NumberPad 
              value={expenseAmount}
              onChange={setExpenseAmount}
            />
            
            <div className="modal-buttons">
              <button onClick={() => setShowAddExpense(false)} className="btn-text">
                Annulla
              </button>
              <button onClick={addExpense} className="btn-primary">
                Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartSplitApp;
