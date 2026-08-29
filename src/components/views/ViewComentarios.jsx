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

  const marcarVisto = async (id) => {
    await apiFetch(`${apiBase}/api/comments/${id}/status`, { method: 'POST', body: JSON.stringify({ status: 'visto' }) });
    load();
  };

  const filtered = comments.filter((c) => {
    if (filter === 'delicados') return c.is_delicate;
    if (filter === 'nuevos') return c.status === 'nuevo';
    if (filter === 'respondidos') return ['respondido', 'manual'].includes(c.status);
    return true;
  });

  const nuevos = comments.filter((c) => c.status === 'nuevo').length;
  const delicados = comments.filter((c) => c.is_delicate && c.status === 'nuevo').length;

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
            <AtSign className="text-pink-600" size={26} /> Comentarios
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {nuevos} sin responder{delicados > 0 && <span className="text-red-600 font-bold"> · {delicados} delicado(s) ⚠️</span>}
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500" title="Actualizar">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {[['todos', 'Todos'], ['nuevos', 'Nuevos'], ['delicados', 'Delicados'], ['respondidos', 'Respondidos']].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${filter === id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading && comments.length === 0 && <p className="text-slate-400 text-center py-10">Cargando…</p>}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <MessageCircle size={40} className="mx-auto mb-3 opacity-40" />
          <p>No hay comentarios {filter !== 'todos' ? 'en este filtro' : 'todavía'}.</p>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((c) => (
          <div key={c.id} className={`rounded-2xl border p-4 bg-white ${c.is_delicate && c.status === 'nuevo' ? 'border-red-200 bg-red-50/40' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-700 text-sm">@{c.from_name || 'usuario'}</span>
              <div className="flex items-center gap-2">
                {badge(c)}
                <span className="text-[10px] text-slate-400">{c.timestamp || ''}</span>
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
