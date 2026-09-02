import { useState, useEffect, useCallback } from 'react';
import { Send, AlertTriangle, RefreshCw, AtSign, CheckCircle2, MessageCircle } from 'lucide-react';

// Vista de Comentarios de redes (Instagram). Módulo NUEVO y aislado: se refresca
// solo y no depende del flujo de WhatsApp. Lee /api/comments y responde por Meta.
export default function ViewComentarios({ apiBase, authToken }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [sending, setSending] = useState({});
  const [filter, setFilter] = useState('todos');
  const [platformFilter, setPlatformFilter] = useState('todos');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const apiFetch = useCallback((url, opts = {}) => {
    const headers = { Authorization: `Bearer ${authToken}`, ...(opts.headers || {}) };
    if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    return fetch(url, { ...opts, headers });
  }, [authToken]);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiBase}/api/comments`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch { /* silencioso */ }
    setLoading(false);
  }, [apiFetch, apiBase]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const enviarRespuesta = async (id) => {
    const message = (replyText[id] || '').trim();
    if (!message) return;
    setSending((s) => ({ ...s, [id]: true }));
    try {
      const res = await apiFetch(`${apiBase}/api/comments/${id}/reply`, {
        method: 'POST', body: JSON.stringify({ message }),
      });
      if (res.ok) { setReplyText((r) => ({ ...r, [id]: '' })); load(); }
      else { const d = await res.json().catch(() => ({})); alert('Error: ' + (d.error || 'no se pudo enviar')); }
    } catch { alert('Error de conexión'); }
    setSending((s) => ({ ...s, [id]: false }));
  };

  const sincronizar = async () => {
    setSyncing(true); setSyncMsg('');
    try {
      const res = await apiFetch(`${apiBase}/api/comments/sync`, { method: 'POST' });
      const d = await res.json();
      if (res.ok) { setSyncMsg(d.nuevos > 0 ? `✅ ${d.nuevos} comentario(s) nuevo(s)` : 'Sin comentarios nuevos'); load(); }
      else setSyncMsg('⚠️ ' + (d.error || 'no se pudo sincronizar'));
    } catch { setSyncMsg('⚠️ Error de conexión'); }
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 5000);
  };

  const marcarVisto = async (id) => {
    await apiFetch(`${apiBase}/api/comments/${id}/status`, { method: 'POST', body: JSON.stringify({ status: 'visto' }) });
    load();
  };

  const filtered = comments.filter((c) => {
    if (platformFilter !== 'todos' && c.platform !== platformFilter) return false;
    if (filter === 'delicados') return c.is_delicate;
    if (filter === 'nuevos') return c.status === 'nuevo';
    if (filter === 'respondidos') return ['respondido', 'manual'].includes(c.status);
    return true;
  });

  const nuevos = comments.filter((c) => c.status === 'nuevo').length;
  const delicados = comments.filter((c) => c.is_delicate && c.status === 'nuevo').length;

  const platformBadge = (platform) => {
    if (platform === 'facebook') {
      return (
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          📘 Facebook
        </span>
      );
    }
    return (
      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
        📸 Instagram
      </span>
    );
  };

  const badge = (c) => {
    if (c.status === 'manual') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Respondido (vos)</span>;
    if (c.status === 'respondido') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Respondido (bot)</span>;
    if (c.status === 'visto') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Visto</span>;
    if (c.is_delicate) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1"><AlertTriangle size={11} /> Delicado</span>;
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Nuevo</span>;
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <AtSign className="text-pink-600" size={26} /> Comentarios de Redes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {nuevos} sin responder{delicados > 0 && <span className="text-red-600 font-bold"> · {delicados} delicado(s) ⚠️</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {syncMsg && <span className="text-xs font-bold text-slate-500">{syncMsg}</span>}
          <button onClick={sincronizar} disabled={syncing}
            className="px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm">
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> Sincronizar Feed & Media
          </button>
          <button onClick={load} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500" title="Actualizar">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filtros de Plataforma y Estado */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex gap-1.5 bg-slate-100/80 p-1 rounded-xl">
          {[
            { id: 'todos', label: 'Todas las Redes' },
            { id: 'instagram', label: '📸 Instagram' },
            { id: 'facebook', label: '📘 Facebook' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setPlatformFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                platformFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {[['todos', 'Todos'], ['nuevos', 'Nuevos'], ['delicados', 'Delicados'], ['respondidos', 'Respondidos']].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${filter === id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && comments.length === 0 && <p className="text-slate-400 text-center py-10">Cargando…</p>}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400 bg-white border border-slate-200 rounded-3xl">
          <MessageCircle size={40} className="mx-auto mb-3 opacity-40 text-slate-300" />
          <p className="font-bold text-sm text-slate-600">No hay comentarios {filter !== 'todos' || platformFilter !== 'todos' ? 'en este filtro' : 'todavía'}.</p>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((c) => (
          <div key={c.id} className={`rounded-2xl border p-4 bg-white shadow-xs ${c.is_delicate && c.status === 'nuevo' ? 'border-red-200 bg-red-50/40' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {platformBadge(c.platform)}
                <span className="font-bold text-slate-800 text-sm">
                  {c.platform === 'instagram' ? `@${c.from_name || 'usuario'}` : (c.from_name || 'Usuario Facebook')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {badge(c)}
                <span className="text-[10px] text-slate-400 font-medium">{c.timestamp || ''}</span>
              </div>
            </div>
            <p className="text-slate-800 text-sm mb-3">{c.text || <em className="text-slate-400">(sin texto)</em>}</p>

            {c.bot_reply && (
              <div className="text-xs bg-slate-50 border-l-2 border-slate-300 pl-3 py-2 mb-3 text-slate-600">
                <span className="font-bold">Respuesta:</span> {c.bot_reply}
              </div>
            )}

            {!['respondido', 'manual'].includes(c.status) && (
              <div className="flex items-center gap-2">
                <input
                  value={replyText[c.id] || ''}
                  onChange={(e) => setReplyText((r) => ({ ...r, [c.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && enviarRespuesta(c.id)}
                  placeholder="Escribí una respuesta pública…"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-slate-400"
                />
                <button onClick={() => enviarRespuesta(c.id)} disabled={sending[c.id]}
                  className="p-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50" title="Responder">
                  <Send size={16} />
                </button>
                <button onClick={() => marcarVisto(c.id)}
                  className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50" title="Marcar como visto">
                  <CheckCircle2 size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
