import { useState } from 'react';
import { Lock, User, KeyRound } from 'lucide-react';
import LogoMark from './LogoMark.jsx';

const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3002' : '';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('credentials'); // 'credentials' or 'token'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'credentials') {
        if (!username.trim() || !password.trim()) {
          setError('Completa todos los campos');
          setLoading(false);
          return;
        }
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), password: password.trim() })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          localStorage.setItem('dashboard_token', data.token);
          onLogin(data.token, data.user);
        } else {
          setError(data.error || 'Credenciales incorrectas');
        }
      } else {
        if (!token.trim()) {
          setError('El token es requerido');
          setLoading(false);
          return;
        }
        // Test token against stats endpoint
        const res = await fetch(`${API_BASE_URL}/api/stats`, {
          headers: { 'Authorization': `Bearer ${token.trim()}` }
        });
        if (res.ok) {
          // Fetch user info for virtual admin
          const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token.trim()}` }
          });
          const meData = await meRes.json();
          localStorage.setItem('dashboard_token', token.trim());
          onLogin(token.trim(), meData.user);
        } else {
          setError('Token incorrecto');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl shadow-slate-100 p-12 w-full max-w-md space-y-10">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <LogoMark size={64} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic text-slate-800">OneControl</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Dashboard Maestro</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === 'credentials' ? (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Usuario</label>
                <div className="relative">
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Ej: carlos"
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-all"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Contraseña</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-all"
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Token de Acceso</label>
              <div className="relative">
                <KeyRound size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-all"
                  required
                  autoFocus
                />
              </div>
            </div>
          )}

          {error && <p className="text-[11px] font-bold text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-[#FF6B00] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verificando...' : 'Entrar al Dashboard'}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => {
              setMode(mode === 'credentials' ? 'token' : 'credentials');
              setError('');
            }}
            className="text-[9px] font-black uppercase tracking-widest text-[#FF6B00] hover:text-slate-900 transition-colors"
          >
            {mode === 'credentials' ? '🔑 Ingresar con Token de Acceso' : '👤 Ingresar con Usuario / Contraseña'}
          </button>
        </div>
      </div>
    </div>
  );
}
