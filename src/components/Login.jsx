import { useState } from 'react';
import { Zap, Lock } from 'lucide-react';

const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3002' : '';

export default function Login({ onLogin }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/stats`, {
        headers: { 'Authorization': `Bearer ${token.trim()}` }
      });
      if (res.ok) {
        localStorage.setItem('dashboard_token', token.trim());
        onLogin(token.trim());
      } else {
        setError('Token incorrecto');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl shadow-slate-100 p-12 w-full max-w-md space-y-10">
        <div className="text-center space-y-4">
          <div className="bg-[#FF6B00] p-4 rounded-3xl shadow-xl shadow-orange-100 ring-4 ring-orange-50 w-fit mx-auto">
            <Zap className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic text-slate-800">OneControl</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Dashboard Maestro</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Token de Acceso</label>
            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-all"
                autoFocus
              />
            </div>
            {error && <p className="text-[11px] font-bold text-red-500">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-[#FF6B00] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verificando...' : 'Entrar al Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
