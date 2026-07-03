import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ParticlesBg from './ParticlesBg';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { user, token, login } = useAuth();
  const navigate = useNavigate();

  // Password strength calculation
  const getPasswordStrength = () => {
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.match(/[0-9]/)) score += 1;
    if (password.match(/[A-Z]/)) score += 1;
    if (password.match(/[^A-Za-z0-9]/)) score += 1;
    if (password.length >= 10) score += 1;
    return score;
  };

  const strength = getPasswordStrength();
  
  const getStrengthBarColor = () => {
    if (password.length === 0) return 'bg-gray-600';
    if (strength <= 2) return 'bg-red-500';
    if (strength === 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (password.length === 0) return '';
    if (strength <= 2) return 'Fraca';
    if (strength === 3) return 'Média';
    return 'Forte';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
        return setError('A senha deve ter no mínimo 6 caracteres.');
    }
    if (password !== confirmPassword) {
        return setError('As senhas não coincidem.');
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao redefinir');

      setSuccess(true);
      
      // Keep user logged in with updated status if the backend provides it, otherwise manually format it
      const isRemembered = !!localStorage.getItem('luz_token');
      if (data.token && data.user) {
          login(data.user, data.token, isRemembered);
      } else {
         // Manual override if API is simple
         if (user && token) {
            login({ ...user, is_active: true }, token, isRemembered);
         }
      }

      setTimeout(() => {
          navigate('/');
      }, 2000);
      
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-900 overflow-hidden font-sans">
      <ParticlesBg />

      <div className="relative z-10 w-full mb-20 max-w-md p-8 bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl">
        
        {success ? (
            <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                    <UserCheck size={32} className="text-white" />
                </div>
                <h1 className="text-xl font-bold text-white mb-2">Senha Atualizada!</h1>
                <p className="text-green-300 text-sm">Sua senha foi redefinida com sucesso. Redirecionando para o sistema...</p>
            </div>
        ) : (
            <>
                <div className="flex flex-col items-center mb-8 text-center">
                    <h1 className="text-2xl font-bold text-white tracking-wider">Bem-vindo, {user?.name?.split(' ')[0]}!</h1>
                    <p className="text-gray-400 text-sm mt-2">Como este é seu primeiro acesso, para garantir sua segurança, cadastre uma nova senha.</p>
                </div>

                {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-200 text-sm rounded-lg text-center">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nova Senha Forte</label>
                    <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock size={18} className="text-gray-500" />
                    </div>
                    <input
                        type="password"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all font-medium"
                        placeholder="Mínimo de 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {password.length > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] text-gray-400 uppercase font-bold">Força da Senha</span>
                          <span className={`text-[10px] font-bold uppercase ${strength <= 2 ? 'text-red-400' : strength === 3 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {getStrengthLabel()}
                          </span>
                        </div>
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden flex gap-1">
                          <div className={`h-full flex-1 rounded-full transition-colors ${strength >= 1 ? getStrengthBarColor() : 'bg-transparent'}`}></div>
                          <div className={`h-full flex-1 rounded-full transition-colors ${strength >= 2 ? getStrengthBarColor() : 'bg-transparent'}`}></div>
                          <div className={`h-full flex-1 rounded-full transition-colors ${strength >= 3 ? getStrengthBarColor() : 'bg-transparent'}`}></div>
                          <div className={`h-full flex-1 rounded-full transition-colors ${strength >= 4 ? getStrengthBarColor() : 'bg-transparent'}`}></div>
                        </div>
                      </div>
                    )}
                </div>

                <div className="pt-2">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Confirmar Senha</label>
                    <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock size={18} className="text-gray-500" />
                    </div>
                    <input
                        type="password"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all font-medium"
                        placeholder="Repita a senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 active:scale-95 transition-all mt-4 disabled:opacity-50 shadow-lg"
                >
                    {loading ? 'Salvando...' : 'Atualizar e Proseguir'}
                </button>
                </form>
            </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
