import React, { useState, useEffect } from 'react';
import { Plus, Search, Upload, Layout, Lightbulb, Save, Database, LogOut, Users, UsersRound, Package } from 'lucide-react';
import BudgetForm from '../components/BudgetForm';
import SplashScreen from '../components/SplashScreen';
import AdminUsers from '../components/AdminUsers';
import AdminProducts from '../components/AdminProducts';
import { Budget, BudgetBackup, Salesperson } from '../types';
import { generateBudgetNumber } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';

const Dashboard: React.FC = () => {
  const { user, token, logout } = useAuth();
  const { showModal } = useModal();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [activeBudgetId, setActiveBudgetId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSplash, setShowSplash] = useState(true);
  const [viewMode, setViewMode] = useState<'budgets' | 'users' | 'products'>('budgets');
  
  // Super Admin view mode (show all or just mine)
  const [showAllUsersBudgets, setShowAllUsersBudgets] = useState(false);
  const [activeAdminUserIdTab, setActiveAdminUserIdTab] = useState<string | null>(null);
  const [adminUsersDict, setAdminUsersDict] = useState<Record<string, string>>({});

  // Fetch budgets from API
  const fetchBudgets = async () => {
    try {
        const res = await fetch('/api/budgets', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setBudgets(data);
        }
    } catch (err) {
        console.error("Erro ao buscar orçamentos", err);
    }
  };

  useEffect(() => {
    fetchBudgets();
    // Fetch users for everyone to show budget owner names
    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` }})
    .then(res => res.json())
    .then(users => {
        if (Array.isArray(users)) {
            const dict: Record<string, string> = {};
            users.forEach((u: any) => dict[u.id] = u.name);
            setAdminUsersDict(dict);
        }
    })
    .catch(console.error);
  }, [token, user]);

  const createNewBudget = () => {
    const newId = generateBudgetNumber(budgets);
    const newBudget: Budget = {
      id: newId,
      createdAt: Date.now(),
      lastModified: Date.now(),
      user_id: user?.id,
      client: {
        name: '',
        document: '',
        address: '',
        email: '',
        phone: '',
        architect: '',
        salesperson: user?.name || Salesperson.UNSELECTED,
        notes: ''
      },
      items: [],
      globalDiscountPercent: 0,
      shippingCost: 0,
      otherExpenses: 0
    };

    setBudgets(prev => [newBudget, ...prev]);
    setActiveBudgetId(newId);
    setSearchTerm('');
    // Optionally create empty budget on server immediately
    fetch('/api/budgets', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newBudget)
    }).catch(console.error);
  };

  const handleUpdateBudget = async (updated: Budget) => {
    setBudgets(prev => prev.map(b => b.id === updated.id ? updated : b));
    
    // Save to server
    try {
        await fetch('/api/budgets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updated)
        });
    } catch (err) {
        console.error("Erro ao salvar", err);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    showModal({
      title: 'Excluir Orçamento',
      message: 'Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.',
      type: 'confirm',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setBudgets(prev => prev.filter(b => b.id !== id));
        if (activeBudgetId === id) {
          setActiveBudgetId(null);
        }
        try {
            await fetch(`/api/budgets/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error("Erro ao excluir", err);
        }
      }
    });
  };

  // ... (Exportações JSON mantidas. Idealmente o import poderia ser via API mas para simplificar mantem local array e salva dps)
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const content = ev.target?.result as string;
        let importedBudgets: Budget | Budget[] = JSON.parse(content);
        
        // Handle both single and multiple imports (array or dict backups)
        let arrayToImport: Budget[] = [];
        
        if (Array.isArray(importedBudgets)) {
          arrayToImport = importedBudgets;
        } else if (importedBudgets && (importedBudgets as any).data && Array.isArray((importedBudgets as any).data)) {
          arrayToImport = (importedBudgets as any).data;
        } else if (importedBudgets && (importedBudgets as any).budgets) { // old backup format
          const oldBackup = importedBudgets as any;
          arrayToImport = Array.isArray(oldBackup.budgets) ? oldBackup.budgets : Object.values(oldBackup.budgets);
        } else if (importedBudgets && typeof importedBudgets === 'object') {
          arrayToImport = [importedBudgets as Budget];
        }

        // Validate, fix user_id, and assign
        for (const inputBudget of arrayToImport) {
           if (inputBudget && inputBudget.id && inputBudget.client) {
             const budgetObj = {
               ...inputBudget,
               user_id: (inputBudget.user_id && inputBudget.user_id.trim() !== '') ? inputBudget.user_id : (user?.id || ''),
               createdAt: inputBudget.createdAt || Date.now(),
               lastModified: inputBudget.lastModified || Date.now()
             };
             
             // Update local state if needed
             setBudgets(prev => {
                const existing = prev.find(p => p.id === budgetObj.id);
                if (existing) return prev.map(p => p.id === budgetObj.id ? budgetObj : p);
                return [...prev, budgetObj];
             });

             // Post to server
             await fetch('/api/budgets', {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                     'Authorization': `Bearer ${token}`
                 },
                 body: JSON.stringify(budgetObj)
             });
             
             setActiveBudgetId(budgetObj.id);
           }
        }
        
        showModal({
          title: 'Importação Concluída',
          message: `Arquivo importado com sucesso! ${arrayToImport.length} orçamento(s) processado(s).`,
          type: 'success'
        });
        fetchBudgets(); // reload clean list from server

      } catch (err) {
        console.error(err);
        showModal({
          title: 'Erro na Importação',
          message: 'Erro ao processar arquivo JSON. Verifique se o formato está correto.',
          type: 'error'
        });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  };

  const exportActiveBudget = () => {
    const activeBudget = budgets.find(b => b.id === activeBudgetId);
    if (!activeBudget) {
      showModal({
        title: 'Aviso',
        message: 'Nenhum orçamento selecionado.',
        type: 'warning'
      });
      return;
    }
    const safeName = activeBudget.client.name ? activeBudget.client.name.trim().replace(/\s+/g, '_').toUpperCase() : 'CLIENTE_SEM_NOME';
    const dateStr = new Date().toISOString().slice(0,10);
    const fileName = `ORCAMENTO_${safeName}_${activeBudget.id}_${dateStr}.json`;
    const blob = new Blob([JSON.stringify(activeBudget, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
  };

  const exportAllBudgets = () => {
    if (budgets.length === 0) {
      showModal({
        title: 'Aviso',
        message: 'Nenhum orçamento para exportar.',
        type: 'warning'
      });
      return;
    }
    const backup: BudgetBackup = { version: 1, data: budgets };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `BACKUP_LUZ_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
    a.click();
  };

  // Unique Users in Budgets for Admin Tabs
  const uniqueUsersInBudgets = Array.from(new Set(budgets.map(b => b.user_id))).filter(Boolean) as string[];

  // Lógica de Filtro Aprimorada
  const filteredBudgets = budgets.filter(b => {
    // Check user filter for all users
    if (!showAllUsersBudgets) {
        if (b.user_id && b.user_id !== user?.id) return false;
    }
    
    // Check search term
    const search = searchTerm.toUpperCase().trim();
    if (!search) return true;
    return (
      (b.client.name && b.client.name.toUpperCase().includes(search)) ||
      (b.client.phone && b.client.phone.replace(/\D/g, '').includes(search.replace(/\D/g, ''))) ||
      (b.id && b.id.includes(search)) ||
      (b.client.document && b.client.document.includes(search))
    );
  });

  const activeBudget = budgets.find(b => b.id === activeBudgetId);

  return (
    <div className="flex flex-col h-screen bg-gray-100 print:h-auto print:bg-white">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      
      {/* Barra Superior */}
      <div className="bg-gray-900 text-white shadow-md no-print z-10 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Logo area */}
            <div className="flex items-center gap-3 flex-shrink-0 cursor-pointer" onClick={() => setViewMode('budgets')}>
              <div className="bg-white text-black p-1.5 rounded">
                <Lightbulb size={20} className="fill-current" />
              </div>
              <span className="font-bold text-lg tracking-wider hidden md:block">LUZ GESTÃO</span>
            </div>

            {/* Busca */}
            <div className={`flex-1 max-w-xl transition-all ${viewMode !== 'budgets' ? 'opacity-0 pointer-events-none' : ''}`}>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-transparent rounded-md leading-5 bg-gray-800 text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-gray-700 focus:border-gray-600 focus:text-white sm:text-sm"
                  placeholder="Buscar orçamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Ações / Admin Profile */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {viewMode === 'budgets' && user?.is_admin && (
                <>
                  <label className="p-2 text-gray-400 hover:text-white rounded hover:bg-gray-800 cursor-pointer" title="Importar JSON">
                    <Upload size={20} />
                    <input 
                      type="file" 
                      accept=".json" 
                      className="hidden" 
                      onChange={handleImportJSON} 
                    />
                  </label>
                  <button onClick={exportAllBudgets} className="p-2 text-gray-400 hover:text-white rounded hover:bg-gray-800" title="Exportar Todos">
                    <Database size={20} />
                  </button>
                  <button onClick={exportActiveBudget} className="p-2 text-gray-400 hover:text-white rounded hover:bg-gray-800" title="Exportar Atual">
                    <Save size={20} />
                  </button>
                </>
              )}
              
              <div className="h-6 w-px bg-gray-700 mx-1"></div>
              
              <button
                onClick={() => setShowAllUsersBudgets(!showAllUsersBudgets)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${showAllUsersBudgets ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                title={showAllUsersBudgets ? 'Visualizando Todos' : 'Meus Orçamentos'}
              >
                <UsersRound size={18} />
                <span className="hidden lg:inline">{showAllUsersBudgets ? 'Todos' : 'Meus Orçamentos'}</span>
              </button>

              {user?.is_admin && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setViewMode(viewMode === 'products' ? 'budgets' : 'products')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === 'products' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                  >
                    <Package size={18} />
                    <span>Produtos</span>
                  </button>
                  <button 
                    onClick={() => setViewMode(viewMode === 'users' ? 'budgets' : 'users')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === 'users' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                  >
                    <Users size={18} />
                    <span>Usuários</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 pl-2">
                 <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold leading-none">{user?.name}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{user?.is_admin ? 'Admin' : 'Vendedor'}</p>
                 </div>
                 <button onClick={logout} className="p-2 ml-2 text-gray-400 border border-gray-700 rounded hover:bg-red-900/50 hover:text-red-400 hover:border-red-800 transition" title="Sair">
                    <LogOut size={16} />
                 </button>
              </div>

            </div>
          </div>
        </div>

        {/* Sistema de Abas */}
        {viewMode === 'budgets' && (
            <div className="flex flex-col bg-gray-800 px-2 pt-2">
              
              <div className="flex overflow-x-auto overflow-y-hidden custom-scrollbar">
                  <button
                    onClick={createNewBudget}
                    className="flex items-center justify-center gap-1 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-t-md text-sm font-medium transition-colors mr-1 flex-shrink-0"
                  >
                    <Plus size={16} /> Novo
                  </button>
                  
                  {filteredBudgets.map(b => (
                    <button
                      key={b.id}
                      onClick={() => setActiveBudgetId(b.id)}
                      className={`flex flex-col items-start px-4 py-1.5 text-sm font-medium rounded-t-md transition-all flex-shrink-0 max-w-[200px] min-w-[120px] border-r border-gray-700 ${
                        activeBudgetId === b.id 
                          ? 'bg-gray-100 text-gray-900 shadow-sm relative top-[1px]' 
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                      }`}
                    >
                      <span className="truncate w-full text-left">{b.client.name || '(Sem Nome)'}</span>
                      <div className="flex items-center justify-between w-full mt-0.5">
                        <span className={`text-[10px] px-1 rounded ${activeBudgetId === b.id ? 'bg-gray-300' : 'bg-black/20'}`}>{b.id}</span>
                        {/* Se estiver com tudo ativo, mostra quem é o dono */}
                        {showAllUsersBudgets && b.user_id !== user?.id && (
                             <span className="text-[9px] text-amber-500 font-bold ml-2 truncate max-w-[80px]" title={adminUsersDict[b.user_id] || 'Outro Usuário'}>{adminUsersDict[b.user_id] || 'Outro Usuário'}</span>
                        )}
                      </div>
                    </button>
                  ))}
                  {filteredBudgets.length === 0 && (
                    <div className="px-4 py-2 text-sm text-gray-400 italic">Nenhum orçamento encontrado.</div>
                  )}
              </div>
            </div>
        )}
      </div>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto bg-gray-200 p-4 print:p-0 print:bg-white print:overflow-visible">
        {viewMode === 'users' ? (
           <AdminUsers />
        ) : viewMode === 'products' ? (
           <AdminProducts />
        ) : activeBudget ? (
          <BudgetForm 
            budget={activeBudget}
            onUpdate={handleUpdateBudget}
            onDelete={handleDeleteBudget}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                <Lightbulb size={40} className="text-indigo-600" />
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-2">Pronto para começar?</h2>

              <p className="text-gray-500 mb-8">
                Selecione um orçamento existente na lista acima ou crie um novo orçamento agora mesmo para começar seu trabalho.
              </p>

              <div className="space-y-3 w-full">
                <button
                  onClick={createNewBudget}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold shadow-md hover:bg-indigo-700 hover:shadow-lg transform transition-all active:scale-[0.98]"
                >
                  <Plus size={20} />
                  Criar Novo Orçamento
                </button>

                {budgets.length > 0 && (
                  <p className="text-xs text-gray-400 mt-4 italic">
                    Ou clique em uma das abas de orçamento acima para continuar.
                  </p>
                )}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;