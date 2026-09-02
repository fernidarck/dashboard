import { useState, useEffect, useCallback } from 'react';
import {
  Send, AlertTriangle, RefreshCw, MessageCircle, Heart, Users,
  ExternalLink, Sparkles, Bot, Settings, ShieldCheck, CheckCircle2,
  Video, Image as ImageIcon, Eye, Check, Globe
} from 'lucide-react';

export default function ViewComentarios({ apiBase, authToken }) {
  const [activeTab, setActiveTab] = useState('comentarios'); // 'comentarios' | 'feed' | 'bot_settings'
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [sending, setSending] = useState({});
  const [generatingAI, setGeneratingAI] = useState({});
  const [filter, setFilter] = useState('todos');
  const [platformFilter, setPlatformFilter] = useState('todos');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  // Meta Insights (Feed & Likes)
  const [metaInsights, setMetaInsights] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // Settings de Auto-Respuesta del Bot
  const [botSettings, setBotSettings] = useState({
    bot_comments_enabled: '0',
    comments_wa_phone: '35154362',
    bot_comments_prompt: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  // Test de Comentarios en Vivo
  const [testCommentText, setTestCommentText] = useState('');
  const [testCommentReply, setTestCommentReply] = useState('');
  const [testingComment, setTestingComment] = useState(false);

  const apiFetch = useCallback((url, opts = {}) => {
    const headers = { Authorization: `Bearer ${authToken}`, ...(opts.headers || {}) };
    if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    return fetch(url, { ...opts, headers });
  }, [authToken]);

  const loadComments = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiBase}/api/comments`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch { /* silencioso */ }
    setLoading(false);
  }, [apiFetch, apiBase]);

  const loadMetaInsights = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const res = await apiFetch(`${apiBase}/api/meta/insights`);
      if (res.ok) {
        const data = await res.json();
        setMetaInsights(data);
      }
    } catch { /* silencioso */ }
    setLoadingMeta(false);
  }, [apiFetch, apiBase]);

  const loadBotSettings = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiBase}/api/comments/settings`);
      if (res.ok) {
        const data = await res.json();
        setBotSettings(data);
      }
    } catch { /* silencioso */ }
  }, [apiFetch, apiBase]);

  useEffect(() => {
    loadComments();
    loadMetaInsights();
    loadBotSettings();
    const t = setInterval(loadComments, 20000);
    return () => clearInterval(t);
  }, [loadComments, loadMetaInsights, loadBotSettings]);

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    setSettingsMsg('');
    try {
      const res = await apiFetch(`${apiBase}/api/comments/settings`, {
        method: 'POST',
        body: JSON.stringify(botSettings)
      });
      if (res.ok) {
        setSettingsMsg('✅ Configuración guardada correctamente');
        setTimeout(() => setSettingsMsg(''), 4000);
      } else {
        setSettingsMsg('❌ Error al guardar');
      }
    } catch {
      setSettingsMsg('❌ Error de conexión');
    } finally {
      setSavingSettings(false);
    }
  };

  const enviarRespuesta = async (id) => {
    const message = (replyText[id] || '').trim();
    if (!message) return;
    setSending((s) => ({ ...s, [id]: true }));
    try {
      const res = await apiFetch(`${apiBase}/api/comments/${id}/reply`, {
        method: 'POST', body: JSON.stringify({ message }),
      });
      if (res.ok) { setReplyText((r) => ({ ...r, [id]: '' })); loadComments(); }
      else { const d = await res.json().catch(() => ({})); alert('Error: ' + (d.error || 'no se pudo enviar')); }
    } catch { alert('Error de conexión'); }
    setSending((s) => ({ ...s, [id]: false }));
  };

  const sugerirRespuestaIA = async (id) => {
    setGeneratingAI((s) => ({ ...s, [id]: true }));
    try {
      const res = await apiFetch(`${apiBase}/api/comments/${id}/ai-reply`, {
        method: 'POST',
        body: JSON.stringify({ preview: true }),
      });
      const d = await res.json();
      if (res.ok && d.reply) {
        setReplyText((r) => ({ ...r, [id]: d.reply }));
      } else {
        alert('Error generando respuesta IA: ' + (d.error || 'intenta de nuevo'));
      }
    } catch {
      alert('Error de conexión con la IA');
    } finally {
      setGeneratingAI((s) => ({ ...s, [id]: false }));
    }
  };

  const responderConIAInstantaneo = async (id) => {
    if (!confirm('¿Deseas que la IA responda automáticamente a este comentario en la red social?')) return;
    setSending((s) => ({ ...s, [id]: true }));
    try {
      const res = await apiFetch(`${apiBase}/api/comments/${id}/ai-reply`, {
        method: 'POST',
        body: JSON.stringify({ preview: false }),
      });
      const d = await res.json();
      if (res.ok) {
        loadComments();
      } else {
        alert('Error respondiendo con IA: ' + (d.error || 'intenta de nuevo'));
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setSending((s) => ({ ...s, [id]: false }));
    }
  };

  const sincronizar = async () => {
    setSyncing(true); setSyncMsg('');
    try {
      const res = await apiFetch(`${apiBase}/api/comments/sync`, { method: 'POST' });
      const d = await res.json();
      if (res.ok) {
        setSyncMsg(d.nuevos > 0 ? `✅ ${d.nuevos} comentario(s) nuevo(s)` : 'Feed y comentarios sincronizados');
        loadComments();
        loadMetaInsights();
      } else {
        setSyncMsg('⚠️ ' + (d.error || 'no se pudo sincronizar'));
      }
    } catch { setSyncMsg('⚠️ Error de conexión'); }
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 5000);
  };

  const marcarVisto = async (id) => {
    await apiFetch(`${apiBase}/api/comments/${id}/status`, { method: 'POST', body: JSON.stringify({ status: 'visto' }) });
    loadComments();
  };

  const testearComentario = async (e) => {
    if (e) e.preventDefault();
    if (!testCommentText.trim()) return;
    setTestingComment(true);
    setTestCommentReply('');
    try {
      const res = await apiFetch(`${apiBase}/api/training/test`, {
        method: 'POST',
        body: JSON.stringify({ question: testCommentText })
      });
      const d = await res.json();
      if (res.ok && d.reply) {
        setTestCommentReply(d.reply);
      }
    } catch {
      setTestCommentReply('Error al probar');
    } finally {
      setTestingComment(false);
    }
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
  const respondidos = comments.filter((c) => ['respondido', 'manual'].includes(c.status)).length;

  const ig = metaInsights?.instagram;
  const fb = metaInsights?.facebook;
  const posts = metaInsights?.posts || [];

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
    if (c.status === 'manual') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Respondido (Manual)</span>;
    if (c.status === 'respondido') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1"><Bot size={11} /> Respondido (Bot IA)</span>;
    if (c.status === 'visto') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Visto</span>;
    if (c.is_delicate) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1"><AlertTriangle size={11} /> Delicado</span>;
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Nuevo</span>;
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-7 animate-in fade-in duration-500 pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Globe className="text-[#FF6B00]" size={28} /> Redes Sociales & Meta
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Instagram <span className="font-bold text-pink-600">@0ne_control</span> & Facebook <span className="font-bold text-blue-600">Onecontrolshop</span> · Gestión de Likes, Feed y Respuestas IA
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {syncMsg && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">{syncMsg}</span>}
          <button
            onClick={sincronizar}
            disabled={syncing}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin text-[#FF6B00]' : ''} />
            <span>{syncing ? 'Sincronizando...' : 'Sincronizar Feed & Comentarios'}</span>
          </button>
        </div>
      </div>

      {/* TABS PRINCIPALES */}
      <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl self-start w-fit">
        <button
          onClick={() => setActiveTab('comentarios')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'comentarios' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <MessageCircle size={14} />
          <span>Comentarios & Respuestas</span>
          {nuevos > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
              {nuevos}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'feed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Heart size={14} className="text-pink-500" />
          <span>Métricas & Likes ({metaInsights?.stats?.totalLikes || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('bot_settings')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'bot_settings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Bot size={14} className="text-purple-600" />
          <span>Auto-Respuesta del Bot</span>
          <span className={`h-2 w-2 rounded-full ${botSettings.bot_comments_enabled === '1' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: COMENTARIOS Y RESPUESTAS */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'comentarios' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sin Responder</span>
              <p className="text-2xl font-black text-amber-600 mt-1">{nuevos}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Delicados (Atención)</span>
              <p className="text-2xl font-black text-rose-600 mt-1">{delicados}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Respondidos</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{respondidos}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Registrados</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{comments.length}</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'todos', label: 'Todas las Redes' },
                { id: 'instagram', label: '📸 Instagram' },
                { id: 'facebook', label: '📘 Facebook' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setPlatformFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
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
              {[['todos', 'Todos'], ['nuevos', 'Nuevos'], ['delicados', 'Delicados ⚠️'], ['respondidos', 'Respondidos']].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filter === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Comentarios */}
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">Cargando comentarios...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center bg-white border border-slate-200 rounded-2xl">
              <p className="text-sm font-bold text-slate-700">No hay comentarios en este filtro</p>
              <p className="text-xs text-slate-400 mt-1">Usa el botón "Sincronizar Feed & Comentarios" para verificar si hay nuevos en Instagram o Facebook.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((c) => (
                <div key={c.id} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3 transition-all hover:border-slate-300">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {platformBadge(c.platform)}
                      <span className="font-black text-sm text-slate-900">{c.from_name || 'Usuario'}</span>
                      {badge(c)}
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">{c.timestamp}</span>
                  </div>

                  <p className="text-sm text-slate-800 bg-slate-50/80 p-3 rounded-xl border border-slate-100 font-medium">
                    "{c.text}"
                  </p>

                  {/* Si ya fue respondido, mostrar respuesta */}
                  {c.bot_reply && (
                    <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-950 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-[11px]">
                        <CheckCircle2 size={13} />
                        <span>Respuesta enviada a la red social:</span>
                      </div>
                      <p className="pl-4 font-medium text-slate-800">{c.bot_reply}</p>
                    </div>
                  )}

                  {/* Acciones si no está respondido o para responder de nuevo */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => sugerirRespuestaIA(c.id)}
                        disabled={generatingAI[c.id]}
                        className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sparkles size={13} className={generatingAI[c.id] ? "animate-spin" : ""} />
                        <span>{generatingAI[c.id] ? 'Generando con IA...' : '✨ Sugerir con IA'}</span>
                      </button>

                      <button
                        onClick={() => responderConIAInstantaneo(c.id)}
                        disabled={sending[c.id]}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Bot size={13} />
                        <span>{sending[c.id] ? 'Enviando...' : '🤖 Responder con IA (1-Clic)'}</span>
                      </button>

                      {c.status === 'nuevo' && (
                        <button
                          onClick={() => marcarVisto(c.id)}
                          className="text-[11px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1 transition-colors cursor-pointer"
                        >
                          Marcar como visto
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyText[c.id] || ''}
                        onChange={(e) => setReplyText({ ...replyText, [c.id]: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') enviarRespuesta(c.id); }}
                        placeholder="Escribe una respuesta personalizada o usa 'Sugerir con IA'..."
                        className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-slate-800"
                      />
                      <button
                        onClick={() => enviarRespuesta(c.id)}
                        disabled={sending[c.id] || !replyText[c.id]?.trim()}
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Send size={13} />
                        <span>Enviar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: MÉTRICAS Y FEED (LIKES Y POSTS) */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'feed' && (
        <div className="space-y-6">
          {/* Resumen Canales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Instagram Profile */}
            <div className="p-5 rounded-3xl border border-pink-100 bg-gradient-to-br from-pink-50/50 via-white to-orange-50/40 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {ig?.profile_picture_url ? (
                    <img src={ig.profile_picture_url} alt="IG" className="h-12 w-12 rounded-full object-cover border-2 border-pink-200 shadow-xs" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center font-black text-base">IG</div>
                  )}
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{ig?.name || '@onecontrol.shop'}</h3>
                    <p className="text-xs font-bold text-pink-600">@{ig?.username || '0ne_control'}</p>
                  </div>
                </div>
                <a
                  href={`https://instagram.com/${ig?.username || '0ne_control'}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-white border border-pink-200 text-pink-600 hover:bg-pink-50 font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                >
                  <span>Abrir Instagram</span>
                  <ExternalLink size={13} />
                </a>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-pink-100 text-center">
                <div>
                  <p className="text-xl font-black text-slate-900">{ig?.followers_count ?? '—'}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Seguidores</p>
                </div>
                <div>
                  <p className="text-xl font-black text-slate-900">{ig?.media_count ?? posts.length}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Publicaciones</p>
                </div>
                <div>
                  <p className="text-xl font-black text-pink-600 flex items-center justify-center gap-1">
                    <Heart size={14} className="fill-pink-500 text-pink-500" />
                    <span>{metaInsights?.stats?.totalLikes || 0}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Likes Totales</p>
                </div>
              </div>
            </div>

            {/* Facebook Profile */}
            <div className="p-5 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/50 via-white to-slate-50 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {fb?.picture ? (
                    <img src={fb.picture} alt="FB" className="h-12 w-12 rounded-full object-cover border-2 border-blue-200 shadow-xs" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-base">FB</div>
                  )}
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{fb?.name || 'Onecontrolshop'}</h3>
                    <p className="text-xs font-bold text-blue-600">Página Oficial de Facebook</p>
                  </div>
                </div>
                <a
                  href={fb?.link || 'https://facebook.com/1059922890527747'}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                >
                  <span>Abrir Facebook</span>
                  <ExternalLink size={13} />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-blue-100 text-center">
                <div>
                  <p className="text-xl font-black text-slate-900">{fb?.fan_count ?? '—'}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Me Gusta</p>
                </div>
                <div>
                  <p className="text-xl font-black text-blue-600">{fb?.followers_count ?? fb?.fan_count ?? '—'}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Seguidores</p>
                </div>
              </div>
            </div>
          </div>

          {/* Galería de Posts y Reels */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Publicaciones y Reels de Instagram</span>
              <span className="text-[11px] font-bold text-slate-500">Likes y Comentarios en Vivo</span>
            </div>

            {posts.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No se encontraron publicaciones recientes. Pulsa 'Sincronizar Feed'.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {posts.map((post) => (
                  <div key={post.id} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:border-pink-300 hover:shadow-md transition-all flex flex-col group">
                    <div className="relative aspect-square bg-slate-900 overflow-hidden">
                      {post.thumbnail ? (
                        <img
                          src={post.thumbnail}
                          alt="Post"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">Sin imagen</div>
                      )}
                      <span className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white flex items-center gap-1">
                        {post.media_type === 'VIDEO' ? <Video size={10} /> : <ImageIcon size={10} />}
                        <span>{post.media_type === 'VIDEO' ? 'Reel' : 'Post'}</span>
                      </span>
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5 bg-white">
                      <p className="text-[11px] text-slate-700 font-medium line-clamp-2 leading-snug">
                        {post.caption || 'Publicación en Instagram'}
                      </p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-3">
                          <span className="flex items-center gap-1 font-bold text-pink-600">
                            <Heart size={13} className="fill-pink-500 text-pink-500" />
                            <span>{post.like_count}</span>
                          </span>
                          <span className="flex items-center gap-1 font-bold text-slate-500">
                            <MessageCircle size={13} />
                            <span>{post.comments_count}</span>
                          </span>
                        </div>
                        <a
                          href={post.permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-[#FF6B00] hover:underline"
                        >
                          Ver en IG →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: CONFIGURACIÓN DE AUTO-RESPUESTA DEL BOT */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'bot_settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Bot className="text-purple-600" size={18} /> Auto-Respuesta Inteligente con IA
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">El bot responderá comentarios en publicaciones de Instagram y Facebook de forma autónoma.</p>
              </div>
              {settingsMsg && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">{settingsMsg}</span>}
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              {/* Switch Toggle */}
              <div className="flex items-center justify-between p-4.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-xs font-black text-slate-900">Activar Auto-Respuesta en Comentarios</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Responde con precios, disponibilidad del catálogo RAG e invita a WhatsApp.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBotSettings(s => ({ ...s, bot_comments_enabled: s.bot_comments_enabled === '1' ? '0' : '1' }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    botSettings.bot_comments_enabled === '1' ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    botSettings.bot_comments_enabled === '1' ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Teléfono WhatsApp */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider">Teléfono de WhatsApp para invitar a clientes:</label>
                <input
                  type="text"
                  value={botSettings.comments_wa_phone || ''}
                  onChange={(e) => setBotSettings({ ...botSettings, comments_wa_phone: e.target.value })}
                  placeholder="35154362"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                />
                <p className="text-[10px] text-slate-400">El número que el bot adjuntará en las respuestas para que los clientes continúen por chat.</p>
              </div>

              {/* Filtro de Seguridad Delicados */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
                <ShieldCheck className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-amber-900 space-y-0.5">
                  <p className="font-bold">Protección de Marca & Filtro de Seguridad Activo:</p>
                  <p className="text-[11px] text-amber-800">Cualquier comentario con quejas, reclamos o palabras delicadas se marcará en rojo y el bot **NO responderá automáticamente**, dejándolo para revisión de un asesor humano.</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {savingSettings ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>{savingSettings ? 'Guardando...' : 'Guardar Configuración del Bot'}</span>
              </button>
            </form>
          </div>

          {/* Probador en Vivo de Respuestas */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Probar Respuesta a Comentario</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Simula cómo respondería el bot a un comentario real.</p>
            </div>

            <form onSubmit={testearComentario} className="space-y-3">
              <textarea
                value={testCommentText}
                onChange={(e) => setTestCommentText(e.target.value)}
                placeholder="Ej: ¿Qué precio tiene la mesa de noche One Night y tienen pago contra entrega?"
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-purple-600 resize-none"
              />

              <button
                type="submit"
                disabled={testingComment || !testCommentText.trim()}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {testingComment ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                <span>{testingComment ? 'Evaluando...' : 'Generar Respuesta de Prueba'}</span>
              </button>
            </form>

            {testCommentReply && (
              <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-xl space-y-1 text-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-800">Respuesta Generada:</span>
                <p className="text-slate-800 font-medium leading-relaxed">{testCommentReply}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
