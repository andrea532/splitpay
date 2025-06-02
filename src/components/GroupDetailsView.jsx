import React, { useState, useEffect } from 'react';
import { groupsService } from '../services/groupsService';
import Icon from './Icon';
import NumberPad from './NumberPad';
import ExpenseDetailModal from './ExpenseDetailModal';
import GroupSettingsModal from './GroupSettingsModal';
import ConsumptionsTab from './ConsumptionsTab';

const GroupDetailsView = ({ group, user, onBack, showToast }) => {
  const [groupData, setGroupData] = useState(group);
  const [groupExpenses, setGroupExpenses] = useState([]);
  const [groupBalances, setGroupBalances] = useState(null);
  const [activeTab, setActiveTab] = useState('consumptions');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // Modals
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showExpenseDetail, setShowExpenseDetail] = useState(null);
  const [showGroupSettings, setShowGroupSettings] = useState(false);

  // Form data
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('0');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseShares, setExpenseShares] = useState({});

  useEffect(() => {
    loadGroupData();

    // Setup real-time subscription
    const unsubscribe = groupsService.subscribeToGroupChanges(group.id, {
      onExpenseChange: () => loadGroupData(),
      onMemberChange: () => loadGroupData(),
      onShareChange: () => loadGroupData(),
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [group.id]);

  const loadGroupData = async () => {
    setIsLoading(true);
    try {
      // Load group with members
      const groupResult = await groupsService.getGroupWithMembers(group.id);
      if (groupResult.success) {
        setGroupData(groupResult.group);
      }

      // Load expenses
      const expensesResult = await groupsService.getGroupExpenses(group.id);
      if (expensesResult.success) {
        setGroupExpenses(expensesResult.expenses);
      }

      // Load balances
      const balancesResult = await groupsService.calculateGroupBalances(
        group.id
      );
      if (balancesResult.success) {
        setGroupBalances(balancesResult);
      }
    } catch (error) {
      console.error('Error loading group data:', error);
      showToast('Errore nel caricamento dei dati', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExpense = async () => {
    console.log('🔍 DEBUG: handleAddExpense called');
    console.log('Title:', expenseTitle);
    console.log('Amount:', expenseAmount);
    console.log('Shares:', expenseShares);
    console.log('Group members:', groupData?.group_members);

    // Previeni doppi click
    if (isAddingExpense) {
      console.log('Already adding expense, skipping...');
      return;
    }

    // Verifica che il gruppo abbia membri
    if (!groupData?.group_members || groupData.group_members.length === 0) {
      showToast('Errore: il gruppo non ha membri caricati', 'error');
      await loadGroupData();
      return;
    }

    // Validazioni
    if (!expenseTitle.trim()) {
      showToast('Inserisci un titolo per la spesa', 'error');
      return;
    }

    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Inserisci un importo valido', 'error');
      return;
    }

    // Controlla che ci siano consumi
    const hasShares = Object.values(expenseShares).some(
      (shareAmount) => parseFloat(shareAmount) > 0
    );

    if (!hasShares) {
      showToast('Aggiungi almeno un consumo', 'error');
      return;
    }

    // Calcola il totale dei consumi
    const totalShares = calculateTotalShares();
    if (Math.abs(totalShares - amount) > 0.01) {
      showToast(
        `Il totale dei consumi (€${totalShares.toFixed(
          2
        )}) deve essere uguale all'importo totale (€${amount.toFixed(2)})`,
        'error'
      );
      return;
    }

    setIsAddingExpense(true);

    try {
      const result = await groupsService.createExpense(group.id, {
        title: expenseTitle.trim(),
        description: expenseDescription.trim(),
        totalAmount: amount.toString(),
        shares: expenseShares,
      });

      console.log('Create expense result:', result);

      if (result.success) {
        showToast('Spesa aggiunta con successo!');
        resetExpenseForm();
        setShowAddExpense(false);
        await loadGroupData(); // Ricarica i dati
      } else {
        showToast(
          result.error || "Errore durante l'aggiunta della spesa",
          'error'
        );
      }
    } catch (error) {
      console.error('Error in handleAddExpense:', error);
      showToast("Errore durante l'aggiunta della spesa", 'error');
    } finally {
      setIsAddingExpense(false);
    }
  };

  const resetExpenseForm = () => {
    setExpenseTitle('');
    setExpenseAmount('0');
    setExpenseDescription('');
    setExpenseShares({});
  };

  const openAddExpenseModal = () => {
    // Initialize shares for all members with empty string
    const shares = {};
    if (groupData?.group_members) {
      groupData.group_members.forEach((member) => {
        shares[member.user_id] = '';
      });
    }
    setExpenseShares(shares);
    setShowAddExpense(true);
  };

  const formatCurrency = (amount) => {
    return `€${parseFloat(amount).toFixed(2)}`;
  };

  const getUserName = (userId, fullName) => {
    return userId === user?.id ? 'Tu' : fullName || 'Utente';
  };

  const shareInviteCode = () => {
    navigator.clipboard.writeText(groupData.invite_code);
    showToast(`Codice ${groupData.invite_code} copiato!`);
  };

  const calculateTotalShares = () => {
    return Object.values(expenseShares).reduce((sum, amount) => {
      const num = parseFloat(amount);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  };

  // Funzione per gestire l'eliminazione di una spesa
  const handleExpenseDeleted = (expenseId) => {
    // Rimuovi la spesa dalla lista locale
    setGroupExpenses((prevExpenses) =>
      prevExpenses.filter((expense) => expense.id !== expenseId)
    );

    // Ricarica i bilanci
    loadGroupData();
  };

  // Funzione per dividere equamente l'importo
  const splitEvenly = () => {
    const memberCount = groupData?.group_members?.length || 1;
    const amount = parseFloat(expenseAmount);
    if (!isNaN(amount) && amount > 0 && memberCount > 0) {
      const sharePerPerson = (amount / memberCount).toFixed(2);
      const newShares = {};
      groupData.group_members.forEach((member) => {
        newShares[member.user_id] = sharePerPerson;
      });
      setExpenseShares(newShares);
    }
  };

  return (
    <div className="app">
      {/* Navigation Bar */}
      <nav className="nav-bar">
        <div className="nav-content">
          <button className="nav-back" onClick={onBack}>
            <Icon name="arrow-back" size={24} />
          </button>
          <h1 className="nav-title">{groupData?.name || group.name}</h1>
          <button
            className="nav-action"
            onClick={() => setShowGroupSettings(true)}
          >
            <Icon name="settings" size={20} />
          </button>
        </div>
      </nav>

      {/* Scrollable Content */}
      <div className="scroll-container">
        <div className="content-wrapper">
          {/* Balance Summary */}
          {groupBalances && (
            <div className="balance-summary">
              <div className="balance-label">Il tuo bilancio</div>
              <div className="balance-amount">
                {(() => {
                  const myBalance = groupBalances.balances.find(
                    (b) => b.user_id === user.id
                  );
                  const amount = parseFloat(myBalance?.balance || 0);
                  return amount >= 0
                    ? `+${formatCurrency(amount)}`
                    : formatCurrency(Math.abs(amount));
                })()}
              </div>
              <div className="balance-actions">
                <button
                  className="balance-action"
                  onClick={() => showToast('Funzione in arrivo!', 'info')}
                >
                  Salda debiti
                </button>
                <button
                  className="balance-action"
                  onClick={() => setActiveTab('stats')}
                >
                  Statistiche
                </button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'consumptions' ? 'active' : ''}`}
              onClick={() => setActiveTab('consumptions')}
            >
              Consumi
            </button>
            <button
              className={`tab ${activeTab === 'expenses' ? 'active' : ''}`}
              onClick={() => setActiveTab('expenses')}
            >
              Spese
            </button>
            <button
              className={`tab ${activeTab === 'balances' ? 'active' : ''}`}
              onClick={() => setActiveTab('balances')}
            >
              Bilanci
            </button>
            <button
              className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              Statistiche
            </button>
          </div>

          {/* Tab Content */}
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <>
              {activeTab === 'consumptions' && (
                <ConsumptionsTab
                  group={groupData || group}
                  user={user}
                  showToast={showToast}
                  formatCurrency={formatCurrency}
                />
              )}

              {activeTab === 'expenses' && (
                <div className="tab-content">
                  {groupExpenses.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">🧾</div>
                      <div className="empty-title">Nessuna spesa</div>
                      <div className="empty-text">
                        Aggiungi la prima spesa del gruppo
                      </div>
                    </div>
                  ) : (
                    <div className="expenses-list">
                      {groupExpenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="expense-item"
                          onClick={() => setShowExpenseDetail(expense)}
                        >
                          <div className="expense-icon">
                            {expense.created_by === user.id ? '💳' : '🧾'}
                          </div>
                          <div className="expense-details">
                            <div className="expense-title">{expense.title}</div>
                            <div className="expense-meta">
                              {getUserName(expense.created_by, 'Qualcuno')} •{' '}
                              {new Date(
                                expense.expense_date
                              ).toLocaleDateString('it-IT')}
                            </div>
                          </div>
                          <div className="expense-amount">
                            <div className="expense-value">
                              {formatCurrency(expense.total_amount)}
                            </div>
                            <div className="expense-status">Pagato</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'balances' && groupBalances && (
                <div className="tab-content">
                  {/* Settlements */}
                  {groupBalances.settlements.length > 0 && (
                    <div className="card">
                      <h2 className="section-title">🔄 Saldi da regolare</h2>
                      <div className="settlement-list">
                        {groupBalances.settlements.map((settlement, index) => (
                          <div key={index} className="settlement-pill">
                            <div className="settlement-text">
                              <span className="settlement-from">
                                {getUserName(
                                  settlement.fromUserId,
                                  settlement.from
                                )}
                              </span>
                              <span>→</span>
                              <span>
                                {getUserName(
                                  settlement.toUserId,
                                  settlement.to
                                )}
                              </span>
                            </div>
                            <span className="settlement-amount">
                              {formatCurrency(settlement.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Individual Balances */}
                  <div className="card">
                    <h2 className="section-title">💰 Bilanci individuali</h2>
                    {groupBalances.balances.map((balance) => (
                      <div key={balance.user_id} className="balance-item">
                        <div className="balance-user">
                          <div className="user-avatar">
                            {(balance.full_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="user-info">
                            <div className="user-name">
                              {getUserName(balance.user_id, balance.full_name)}
                            </div>
                            <div className="user-stats">
                              Pagato: {formatCurrency(balance.total_paid)} •
                              Consumato:{' '}
                              {formatCurrency(balance.total_consumed)}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`balance-value ${
                            parseFloat(balance.balance) >= 0
                              ? 'positive'
                              : 'negative'
                          }`}
                        >
                          {parseFloat(balance.balance) >= 0 ? '+' : ''}
                          {formatCurrency(Math.abs(balance.balance))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'stats' && (
                <div className="tab-content">
                  <div className="stats-container">
                    <div className="stat-card">
                      <div className="stat-icon">💰</div>
                      <div className="stat-value">
                        {formatCurrency(
                          groupExpenses.reduce(
                            (sum, e) => sum + parseFloat(e.total_amount),
                            0
                          )
                        )}
                      </div>
                      <div className="stat-label">Totale spese</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">🧾</div>
                      <div className="stat-value">{groupExpenses.length}</div>
                      <div className="stat-label">Numero spese</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">👥</div>
                      <div className="stat-value">
                        {groupData?.group_members?.length || 0}
                      </div>
                      <div className="stat-label">Membri</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">📊</div>
                      <div className="stat-value">
                        {formatCurrency(
                          groupExpenses.reduce(
                            (sum, e) => sum + parseFloat(e.total_amount),
                            0
                          ) / (groupData?.group_members?.length || 1)
                        )}
                      </div>
                      <div className="stat-label">Media per persona</div>
                    </div>
                  </div>

                  <div className="chart-placeholder">
                    <Icon name="chart" size={48} color="var(--text-tertiary)" />
                    <p>Grafici disponibili prossimamente</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <button className="fab" onClick={openAddExpenseModal}>
        <Icon name="add" size={24} color="white" />
      </button>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!isAddingExpense) {
              setShowAddExpense(false);
            }
          }}
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div className="modal-header">
              <button
                className="modal-close"
                onClick={() => {
                  if (!isAddingExpense) {
                    setShowAddExpense(false);
                  }
                }}
              >
                <Icon name="close" size={24} />
              </button>
              <h2 className="modal-title">Nuova spesa</h2>
              <div style={{ width: 32 }}></div>
            </div>

            <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
              <div className="form-group">
                <label className="form-label">Cosa hai pagato?</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="es. Cena al ristorante"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descrizione (opzionale)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="es. Pizzeria da Mario"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                />
              </div>

              <div className="amount-display">
                <div className="amount-label">Importo totale</div>
                <div className="amount-value">€{expenseAmount || '0'}.00</div>
              </div>

              <NumberPad value={expenseAmount} onChange={setExpenseAmount} />

              <div
                className="form-group"
                style={{ marginTop: 'var(--space-6)' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                  }}
                >
                  <label className="form-label">Chi ha consumato?</label>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={splitEvenly}
                    style={{ fontSize: '14px', padding: '6px 12px' }}
                  >
                    Dividi equamente
                  </button>
                </div>
                {!groupData?.group_members ||
                groupData.group_members.length === 0 ? (
                  <div
                    style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: 'var(--text-secondary)',
                      backgroundColor: 'var(--gray-50)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <p>⚠️ Caricamento membri del gruppo...</p>
                    <p style={{ fontSize: '12px', marginTop: '8px' }}>
                      Se il problema persiste, ricarica la pagina
                    </p>
                  </div>
                ) : (
                  <div className="shares-list">
                    {groupData?.group_members?.map((member) => (
                      <div key={member.user_id} className="share-input-row">
                        <span className="share-user">
                          {member.user_id === user.id
                            ? 'Tu'
                            : member.profiles?.full_name || 'Membro'}
                        </span>
                        <input
                          type="number"
                          className="share-input"
                          placeholder="0.00"
                          value={expenseShares[member.user_id] || ''}
                          onChange={(e) =>
                            setExpenseShares({
                              ...expenseShares,
                              [member.user_id]: e.target.value,
                            })
                          }
                        />
                        <span className="share-currency">€</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="shares-total">
                  <span>Totale consumato:</span>
                  <span
                    style={{
                      color:
                        Math.abs(
                          calculateTotalShares() - parseFloat(expenseAmount)
                        ) > 0.01
                          ? 'var(--danger)'
                          : 'var(--success)',
                    }}
                  >
                    {formatCurrency(calculateTotalShares())}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-primary btn-block"
                onClick={handleAddExpense}
                disabled={isAddingExpense}
              >
                {isAddingExpense ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      className="loading-spinner"
                      style={{ width: 20, height: 20, marginRight: 8 }}
                    />
                    <span>Aggiunta in corso...</span>
                  </div>
                ) : (
                  'Aggiungi spesa'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Detail Modal */}
      {showExpenseDetail && (
        <ExpenseDetailModal
          expense={showExpenseDetail}
          user={user}
          onClose={() => setShowExpenseDetail(null)}
          onDelete={handleExpenseDeleted}
          formatCurrency={formatCurrency}
          showToast={showToast}
        />
      )}

      {/* Group Settings Modal */}
      {showGroupSettings && (
        <GroupSettingsModal
          group={groupData || group}
          user={user}
          onClose={() => setShowGroupSettings(false)}
          onShareCode={shareInviteCode}
          showToast={showToast}
          onGroupDeleted={() => {
            // Torna alla lista dei gruppi dopo l'eliminazione
            onBack();
          }}
        />
      )}
    </div>
  );
};

export default GroupDetailsView;
