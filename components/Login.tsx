import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lightbulb, Lock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ParticlesBg from './ParticlesBg';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedUsername = localStorage.getItem('luz_remembered_username');
    const savedPassword = localStorage.getItem('luz_remembered_password');
    const savedRemember = localStorage.getItem('luz_remember_me') === 'true';

    if (savedRemember) {
      if (savedUsername) setUsername(savedUsername);
      if (savedPassword) setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no login');

      if (rememberMe) {
        localStorage.setItem('luz_remembered_username', username);
        localStorage.setItem('luz_remembered_password', password);
        localStorage.setItem('luz_remember_me', 'true');
      } else {
        localStorage.removeItem('luz_remembered_username');
        localStorage.removeItem('luz_remembered_password');
        localStorage.removeItem('luz_remember_me');
      }

      login(data.user, data.token, rememberMe);
      
      if (!data.user.is_active) {
        navigate('/reset-password');
      } else {
        navigate('/');
      }
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
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white flex items-center justify-center rounded-2xl mb-4 shadow-lg shadow-white/10">
            <Lightbulb size={32} className="text-black fill-black" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wider">LUZ ILUMINAÇÃO</h1>
          <p className="text-gray-400 text-sm mt-1">Gestão de Orçamentos</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-200 text-sm rounded-lg text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Primeiro Nome</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-gray-500" />
              </div>
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all font-medium"
                placeholder="Seu Nome"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-500" />
              </div>
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
            <label htmlFor="remember-me" className="text-sm text-gray-400 cursor-pointer select-none">
              Lembrar de mim
            </label>
            <button
              id="remember-me"
              type="button"
              onClick={() => setRememberMe(!rememberMe)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 ${
                rememberMe ? 'bg-white' : 'bg-white/10'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                  rememberMe ? 'translate-x-6 bg-black' : 'translate-x-1 bg-gray-500'
                }`}
              />
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 active:scale-95 transition-all mt-4 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
