import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { ShieldCheck, UserX, UserCheck, Plus, Trash2, ToggleLeft, ToggleRight, KeyRound } from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  is_admin: number;
  is_active: number;
  budget_count: number;
}

const AdminUsers = () => {
  const { token } = useAuth();
  const { showModal } = useModal();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form status
  const [name, setName] = useState('');
  const [message, setMessage] = useState<{type: 'error'|'success', text: string} | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setUsers(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: 'Usuário criado! A senha padrão é 142536' });
      setName('');
      fetchUsers();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (userId: string, currentStatus: number) => {
    try {
      const res = await fetch(`/api/users/${userId}/toggle`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: currentStatus ? 0 : 1 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchUsers();
    } catch (e: any) {
      showModal({
        title: 'Erro',
        message: e.message,
        type: 'error'
      });
    }
  };

  const handleDelete = async (userId: string) => {
    showModal({
      title: 'Excluir Usuário',
      message: 'Atenção: Tem certeza que deseja excluir este usuário permanentemente?',
      type: 'confirm',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          fetchUsers();
          showModal({
            title: 'Sucesso',
            message: 'Usuário excluído com sucesso.',
            type: 'success'
          });
        } catch (e: any) {
          showModal({
            title: 'Erro',
            message: e.message,
            type: 'error'
          });
        }
      }
    });
  };

  const handleResetPassword = async (userId: string) => {
    showModal({
      title: 'Redefinir Senha',
      message: 'Deseja redefinir a senha para a senha padrão (142536)?',
      type: 'confirm',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/users/${userId}/reset-password`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          showModal({
            title: 'Senha Redefinida',
            message: 'Senha redefinida com sucesso. O usuário pode acessar com a senha padrão (142536).',
            type: 'success'
          });
        } catch (e: any) {
          showModal({
            title: 'Erro',
            message: e.message,
            type: 'error'
          });
        }
      }
    });
  };

  return (
    <div className="flex h-full bg-gray-100 p-6 gap-6">
      {/* Sidebar de Cadastro */}
      <div className="w-1/3 bg-white p-6 rounded-lg shadow-sm h-fit">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ShieldCheck className="text-indigo-600" />
            Cadastrar Usuário
        </h2>
        
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-md mb-6">
            <h3 className="font-bold text-blue-800 text-sm mb-1">Aviso Importante</h3>
            <p className="text-xs text-blue-700">A senha padrão para o primeiro acesso de qualquer usuário recém-criado é <b>142536</b>. No primeiro login, o sistema exigirá a redefinição por uma senha forte.</p>
        </div>

        {message && (
            <div className={`p-3 rounded mb-4 text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {message.text}
            </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Primeiro Nome (Login)</label>
                <input 
                    type="text" 
                    required 
                    value={name}
                    onChange={e => {
                        const val = e.target.value;
                        if (/\s/.test(val)) {
                            setMessage({ type: 'error', text: 'Espaço não é permitido, use apenas alfanuméricos e caracteres especiais.' });
                        } else {
                            setMessage(null);
                        }
                        setName(val.replace(/\s/g, ''));
                    }}
                    className="w-full border border-gray-300 p-2 rounded focus:ring focus:ring-indigo-200 focus:border-indigo-500 outline-none" 
                    placeholder="Nome"
                />
            </div>
            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-bold py-2 rounded shadow hover:bg-indigo-700 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
                <Plus size={18} />
                Registrar Usuário
            </button>
        </form>
      </div>

      {/* Lista de Usuários */}
      <div className="flex-1 bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4">Usuários do Sistema</h2>
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
                    <th className="p-3 font-semibold">Nome (Login)</th>
                    <th className="p-3 font-semibold text-center">Status</th>
                    <th className="p-3 font-semibold text-center">Orçamentos</th>
                    <th className="p-3 font-semibold text-center">Ações</th>
                </tr>
            </thead>
            <tbody>
                {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-900">{u.name} {u.is_admin ? <span className="ml-2 text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full">ADMIN</span> : ''}</td>
                        <td className="p-3 text-center">
                            {u.is_active ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-md">
                                    <UserCheck size={14} /> Ativo
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded-md">
                                    <UserX size={14} /> Inativo
                                </span>
                            )}
                        </td>
                        <td className="p-3 text-center font-bold text-gray-700">{u.budget_count}</td>
                        <td className="p-3 text-center">
                            {!u.is_admin && (
                                <div className="flex items-center justify-center gap-2">
                                    <button 
                                        onClick={() => handleResetPassword(u.id)}
                                        className="text-indigo-500 hover:text-indigo-700 transition"
                                        title="Redefinir Senha"
                                    >
                                        <KeyRound size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleToggle(u.id, u.is_active)}
                                        className={`transition ${u.is_active ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}
                                        title={u.is_active ? 'Desativar acesso' : 'Ativar acesso'}
                                    >
                                        {u.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(u.id)}
                                        className="text-red-500 hover:text-red-700 transition"
                                        title="Excluir Usuário"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            )}
                        </td>
                    </tr>
                ))}
                {users.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-gray-400">Nenhum usuário cadastrado.</td></tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
