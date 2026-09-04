import { useState, useEffect, useCallback } from 'react';
import {
  Send, AlertTriangle, RefreshCw, MessageCircle, Heart, Users,
  ExternalLink, Sparkles, Bot, Settings, ShieldCheck, CheckCircle2,
  Video, Image as ImageIcon, Eye, Check, Globe, Calendar, Clock,
  Plus, Trash2, ArrowRight, Share2, UploadCloud, TrendingUp, UserPlus,
  Wand2, Palette, ChevronLeft, ChevronRight, CalendarDays, List,
  Filter, Layers, CheckCircle, XCircle
} from 'lucide-react';
import StoryStudioModal from '../StoryStudioModal.jsx';

export default function ViewComentarios({ apiBase, authToken, products = [] }) {
  const [activeTab, setActiveTab] = useState('comentarios'); // 'comentarios' | 'feed' | 'bot_settings' | 'calendario'
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [sending, setSending] = useState({});
  const [generatingAI, setGeneratingAI] = useState({});
  const [filter, setFilter] = useState('todos');
  const [platformFilter, setPlatformFilter] = useState('todos');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  // Meta Insights (Feed, Likes & Followers History)
  const [metaInsights, setMetaInsights] = useState(null);
  const [followersHistory, setFollowersHistory] = useState([]);
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

  // Calendario y Publicador
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const [postForm, setPostForm] = useState({
    platform: 'both',
    mediaType: 'image',
    postType: 'post', // 'post' | 'historia' | 'reel'
    mediaUrl: '',
    caption: '',
    scheduledTime: '',
    mode: 'now' // 'now' | 'schedule'
  });

  // Creador de Historias 9:16 (Plantilla & Precio)
  const [storyStudioOpen, setStoryStudioOpen] = useState(false);
  const [storyStudioProduct, setStoryStudioProduct] = useState(null);

  // Vista de Calendario Mensual & Filtros de Publicaciones
  const [calendarViewMode, setCalendarViewMode] = useState('calendar'); // 'calendar' | 'list'
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' })
  );
  const [scheduledStatusFilter, setScheduledStatusFilter] = useState('todos'); // 'todos' | 'published' | 'pending' | 'failed'

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' });

  const formatMonthYearHeader = (date) => {
    const str = date.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getPostDateKey = (post) => {
    const raw = post.scheduled_time || post.published_at || post.created_at || '';
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    if (post.created_at) {
      try {
        const d = new Date(post.created_at);
        if (!isNaN(d.getTime())) return d.toLocaleDateString('en-CA');
      } catch {}
    }
    return '';
  };

  const getCalendarMonthDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Lunes = 0, ..., Domingo = 6
    let startDayIdx = firstDay.getDay() - 1;
    if (startDayIdx === -1) startDayIdx = 6;

    const days = [];
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    // Días del mes anterior
    for (let i = startDayIdx - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDate - i;
      const d = new Date(year, month - 1, dayNum);
      const dateStr = d.toLocaleDateString('en-CA');
      days.push({ dayNum, dateStr, isCurrentMonth: false });
    }

    // Días del mes actual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toLocaleDateString('en-CA');
      days.push({ dayNum: i, dateStr, isCurrentMonth: true });
    }

    // Días del mes siguiente
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = d.toLocaleDateString('en-CA');
      days.push({ dayNum: i, dateStr, isCurrentMonth: false });
    }

    return days;
  };

  const handleUseStoryInPublisher = (storyOutput) => {
    setPostForm(prev => ({
      ...prev,
      platform: prev.platform === 'facebook' ? 'instagram' : prev.platform,
      postType: 'historia',
      mediaType: 'image',
      mediaUrl: storyOutput.mediaUrl,
      caption: storyOutput.caption || prev.caption
    }));
    setPublishStatus('✨ ¡Imagen de historia 9:16 lista con plantilla y precio! Cargada en el publicador.');
    setTimeout(() => setPublishStatus(''), 7000);
  };

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
      const histRes = await apiFetch(`${apiBase}/api/meta/followers-history`);
      if (histRes.ok) {
        const histData = await histRes.json();
        setFollowersHistory(Array.isArray(histData) ? histData : []);
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

  const loadScheduledPosts = useCallback(async () => {
    setLoadingScheduled(true);
    try {
      const res = await apiFetch(`${apiBase}/api/meta/scheduled`);
      if (res.ok) {
        const data = await res.json();
        setScheduledPosts(Array.isArray(data) ? data : []);
      }
    } catch { /* silencioso */ }
    setLoadingScheduled(false);
  }, [apiFetch, apiBase]);

  useEffect(() => {
    loadComments();
    loadMetaInsights();
    loadBotSettings();
    loadScheduledPosts();
    const t = setInterval(loadComments, 20000);
    return () => clearInterval(t);
  }, [loadComments, loadMetaInsights, loadBotSettings, loadScheduledPosts]);

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
        method: 'POST', body: JSON.stringify({ preview: true }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reply) setReplyText((r) => ({ ...r, [id]: data.reply }));
      }
    } catch { /* silencioso */ }
    setGeneratingAI((s) => ({ ...s, [id]: false }));
  };

  const responderConIAUnClic = async (id) => {
    setSending((s) => ({ ...s, [id]: true }));
    try {
      const res = await apiFetch(`${apiBase}/api/comments/${id}/ai-reply`, {
        method: 'POST', body: JSON.stringify({ preview: false }),
      });
      if (res.ok) loadComments();
      else { const d = await res.json().catch(() => ({})); alert('Error: ' + (d.error || 'no se pudo enviar')); }
    } catch { alert('Error de conexión'); }
    setSending((s) => ({ ...s, [id]: false }));
  };

  const testearComentario = async (e) => {
    if (e) e.preventDefault();
    if (!testCommentText.trim()) return;
    setTestingComment(true);
    setTestCommentReply('');
    try {
      const res = await apiFetch(`${apiBase}/api/comments/test-reply`, {
        method: 'POST',
        body: JSON.stringify({ text: testCommentText })
      });
      if (res.ok) {
        const data = await res.json();
        setTestCommentReply(data.reply || 'Sin respuesta');
      }
    } catch {
      setTestCommentReply('Error de conexión con el evaluador.');
    } finally {
      setTestingComment(false);
    }
  };

  const marcarEstado = async (id, status) => {
    await apiFetch(`${apiBase}/api/comments/${id}/status`, {
      method: 'POST', body: JSON.stringify({ status }),
    });
    loadComments();
  };

  const sincronizar = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await apiFetch(`${apiBase}/api/comments/sync`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncMsg(`✅ Sincronizados: ${data.nuevos || 0} nuevos (${data.posts || 0} publicaciones revisadas)`);
        loadComments();
        loadMetaInsights();
      } else {
        setSyncMsg(`❌ ${data.error || 'Error al sincronizar'}`);
      }
    } catch {
      setSyncMsg('❌ Error de conexión al sincronizar');
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 6000);
  };

  // Subir archivo multimedia para el post
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiFetch(`${apiBase}/api/media/upload`, {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (res.ok && data.url) {
        const isVid = file.type.startsWith('video');
        setPostForm(prev => ({
          ...prev,
          mediaUrl: data.url,
          mediaType: isVid ? 'video' : 'image'
        }));
      } else {
        alert('Error al subir archivo: ' + (data.error || 'Desconocido'));
      }
    } catch {
      alert('Error de conexión al subir archivo');
    } finally {
      setUploadingFile(false);
    }
  };

  // Publicar o programar post
  const handlePublishOrSchedule = async (e) => {
    if (e) e.preventDefault();
    if (!postForm.caption && !postForm.mediaUrl) {
      alert('Por favor ingresa al menos texto o una imagen/video');
      return;
    }
    if (postForm.mode === 'schedule' && !postForm.scheduledTime) {
      alert('Por favor selecciona la fecha y hora programada');
      return;
    }

    setPublishing(true);
    setPublishStatus('');
    try {
      const endpoint = postForm.mode === 'schedule' ? '/api/meta/schedule' : '/api/meta/publish';
      const res = await apiFetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(postForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPublishStatus(postForm.mode === 'schedule' ? '✅ ¡Publicación programada exitosamente!' : '🚀 ¡Publicado con éxito en Meta!');
        setPostForm({
          platform: 'both',
          mediaType: 'image',
          mediaUrl: '',
          caption: '',
          scheduledTime: '',
          mode: 'now'
        });
        loadScheduledPosts();
        loadMetaInsights();
      } else {
        setPublishStatus(`❌ Error: ${data.error || data.errors?.join(', ') || 'No se pudo publicar'}`);
      }
    } catch (err) {
      setPublishStatus(`❌ Error de conexión: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const [publishingNow, setPublishingNow] = useState({});

  const handlePublishNow = async (id) => {
    setPublishingNow(prev => ({ ...prev, [id]: true }));
    setPublishStatus('');
    try {
      const res = await apiFetch(`${apiBase}/api/meta/scheduled/${id}/publish-now`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPublishStatus('🚀 ¡Publicación enviada a Meta con éxito!');
        setTimeout(() => setPublishStatus(''), 6000);
        loadScheduledPosts();
        loadMetaInsights();
      } else {
        alert('Error al publicar: ' + (data.error || data.error_msg || data.errors?.join(', ') || 'No se pudo publicar'));
        loadScheduledPosts();
      }
    } catch {
      alert('Error de conexión al forzar publicación');
    } finally {
      setPublishingNow(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDeleteScheduled = async (id) => {
    if (!confirm('¿Eliminar esta publicación programada?')) return;
    try {
      await apiFetch(`${apiBase}/api/meta/scheduled/${id}`, { method: 'DELETE' });
      loadScheduledPosts();
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  const nuevos = comments.filter((c) => c.status === 'nuevo' && !c.bot_reply).length;
  const delicados = comments.filter((c) => c.is_delicate && c.status === 'nuevo').length;

  const filtered = comments.filter((c) => {
    if (platformFilter !== 'todos' && c.platform !== platformFilter) return false;
    if (filter === 'nuevos') return c.status === 'nuevo' && !c.bot_reply;
    if (filter === 'delicados') return c.is_delicate && c.status === 'nuevo';
    if (filter === 'respondidos') return c.status === 'respondido' || c.bot_reply;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Share2 className="text-[#FF6B00]" size={28} /> Redes Sociales & Calendario de Publicaciones
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Instagram <span className="font-bold text-pink-600">@0ne_control</span> & Facebook <span className="font-bold text-blue-600">Onecontrolshop</span> · Publicador, Calendario, Likes y Respuestas IA
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

      {/* 📈 SEGUIDORES & CRECIMIENTO EN VIVO (META TRACKER) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Audiencia Combinada */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden border border-slate-800">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Audiencia Meta</span>
            <span className="p-2 rounded-xl bg-white/10 text-white"><Users size={16} /></span>
          </div>
          <p className="text-3xl font-black mt-2 tabular-nums">
            {(metaInsights?.stats?.totalFollowers || 0).toLocaleString()}
          </p>
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              <TrendingUp size={11} />
              +{(metaInsights?.stats?.totalGainedToday || 0)} nuevos hoy
            </span>
            <span className="text-[10px] text-slate-400 font-bold">
              +{metaInsights?.stats?.totalGainedAllTime || 0} acumulados
            </span>
          </div>
        </div>

        {/* Instagram Followers */}
        <div className="bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-orange-500/10 border border-pink-200/80 rounded-3xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-pink-700 flex items-center gap-1">
                <span>📸</span> Instagram (@0ne_control)
              </span>
              <p className="text-3xl font-black text-slate-900 mt-2 tabular-nums">
                {(metaInsights?.instagram?.followers_count || 0).toLocaleString()}
              </p>
            </div>
            <span className="p-2 rounded-xl bg-pink-100 text-pink-600 font-black text-xs">IG</span>
          </div>
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <TrendingUp size={11} />
              +{(metaInsights?.instagram?.gained_today || 0)} nuevos hoy
            </span>
            <span className="text-[10px] text-pink-600 font-bold">
              {metaInsights?.instagram?.media_count || 0} publicaciones
            </span>
          </div>
        </div>

        {/* Facebook Followers */}
        <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-cyan-500/10 border border-blue-200/80 rounded-3xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1">
                <span>📘</span> Facebook (Onecontrolshop)
              </span>
              <p className="text-3xl font-black text-slate-900 mt-2 tabular-nums">
                {(metaInsights?.facebook?.followers_count || metaInsights?.facebook?.fan_count || 0).toLocaleString()}
              </p>
            </div>
            <span className="p-2 rounded-xl bg-blue-100 text-blue-600 font-black text-xs">FB</span>
          </div>
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <TrendingUp size={11} />
              +{(metaInsights?.facebook?.gained_today || 0)} nuevos hoy
            </span>
            <span className="text-[10px] text-blue-600 font-bold">
              Fans / Seguidores
            </span>
          </div>
        </div>

        {/* Engagement & Likes */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Likes & Reacciones</span>
            <span className="p-2 rounded-xl bg-pink-50 text-pink-500"><Heart size={16} className="fill-pink-500" /></span>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2 tabular-nums">
            {(metaInsights?.stats?.totalLikes || 0).toLocaleString()}
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-bold">
              💬 {comments.length} comentarios en CRM
            </span>
          </div>
        </div>
      </div>

      {/* TABS PRINCIPALES */}
      <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl self-start w-fit flex-wrap gap-y-1">
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
          onClick={() => setActiveTab('calendario')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'calendario' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Calendar size={14} className="text-[#FF6B00]" />
          <span>📅 Calendario & Publicador</span>
          {scheduledPosts.filter(p => p.status === 'pending').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#FF6B00] text-white text-[10px] font-black">
              {scheduledPosts.filter(p => p.status === 'pending').length}
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
      {/* TAB: CALENDARIO & PUBLICADOR (NUEVO) */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'calendario' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* FORMULARIO DE PUBLICACIÓN */}
          <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Share2 size={18} className="text-[#FF6B00]" /> Crear o Programar Publicación
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Publica directamente en Instagram y Facebook sin intermediarios.</p>
            </div>

            {publishStatus && (
              <div className={`p-3.5 rounded-2xl text-xs font-bold ${publishStatus.includes('✅') || publishStatus.includes('🚀') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                {publishStatus}
              </div>
            )}

            <form onSubmit={handlePublishOrSchedule} className="space-y-4">
              
              {/* BANNER CREADOR DE HISTORIAS 9:16 */}
              <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 border border-orange-500/30 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#FF6B00] to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
                    <Wand2 size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <span>Diseñar Historia con Plantilla & Precio</span>
                      <span className="px-1.5 py-0.2 rounded bg-[#FF6B00] text-white text-[9px] font-black">9:16 HD</span>
                    </h4>
                    <p className="text-[10px] text-slate-500">Crea el arte con tu producto, precio tachado y llamado a la acción sin editar a mano.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setStoryStudioProduct(null); setStoryStudioOpen(true); }}
                  className="w-full sm:w-auto px-4 py-2 bg-[#FF6B00] hover:bg-[#e05e00] text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Sparkles size={13} />
                  <span>Abrir Creador 9:16</span>
                </button>
              </div>

              {/* Selector de Red */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Publicar en:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'both', label: '🌟 Ambas', color: 'border-orange-500 bg-orange-50/50 text-orange-700' },
                    { id: 'instagram', label: '📸 Instagram', color: 'border-pink-500 bg-pink-50/50 text-pink-700' },
                    { id: 'facebook', label: '📘 Facebook', color: 'border-blue-500 bg-blue-50/50 text-blue-700' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPostForm({ ...postForm, platform: p.id })}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                        postForm.platform === p.id ? p.color : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de Tipo: Post / Historia / Reel */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tipo de publicación:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'post', label: '🖼️ Post', hint: 'foto o video en el feed' },
                    { id: 'historia', label: '⭕ Historia', hint: 'dura 24h (solo IG)' },
                    { id: 'reel', label: '🎬 Reel', hint: 'video' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      title={t.hint}
                      onClick={() => setPostForm({ ...postForm, postType: t.id })}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                        postForm.postType === t.id ? 'border-[#FF6B00] bg-orange-50/50 text-orange-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {(postForm.postType === 'reel') && <p className="text-[9px] text-slate-400 italic">El reel necesita un video (.mp4).</p>}
                {(postForm.postType === 'historia') && (
                  <div className="p-2.5 rounded-xl bg-orange-50/80 border border-orange-200 text-orange-950 space-y-1">
                    <p className="text-[10px] font-bold">💡 Las historias de Instagram no llevan texto escrito.</p>
                    <p className="text-[9px] text-orange-700">Te recomendamos usar el Creador 9:16 para que la foto ya incluya el precio y la oferta integrados.</p>
                    <button
                      type="button"
                      onClick={() => { setStoryStudioProduct(null); setStoryStudioOpen(true); }}
                      className="text-[10px] font-black text-[#FF6B00] underline hover:text-[#e05e00] flex items-center gap-1 cursor-pointer pt-0.5"
                    >
                      <Wand2 size={11} /> <span>Abrir Creador de Historia con Plantilla</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Agregar producto del catálogo (con miniaturas) */}
              {products.length > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">🛍️ Agregar producto del catálogo:</label>
                    <span className="text-[9px] text-slate-400 font-medium">Toca 9:16 para diseñar historia</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {products.map(p => {
                      let imgUrl = p.imagen || '';
                      try { if (p.imagenes) imgUrl = (typeof p.imagenes === 'string' ? JSON.parse(p.imagenes) : p.imagenes)[0] || imgUrl; } catch { /* */ }
                      const selected = postForm.mediaUrl && postForm.mediaUrl === imgUrl;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setPostForm(prev => ({
                            ...prev,
                            mediaUrl: imgUrl || prev.mediaUrl,
                            mediaType: 'image',
                            caption: `✨ ${p.nombre} ✨\n\n💰 Precio: Q${p.precio}\n🚚 Envío a toda Guatemala, pago contra entrega.\n\n📲 Escribinos por WhatsApp para pedir el tuyo.`
                          }))}
                          className={`shrink-0 w-28 rounded-xl border overflow-hidden text-left transition-all cursor-pointer flex flex-col justify-between ${selected ? 'border-[#FF6B00] ring-2 ring-orange-200' : 'border-slate-200 hover:border-orange-300'}`}
                        >
                          {imgUrl
                            ? <img src={imgUrl} alt={p.nombre} className="h-20 w-full object-cover" />
                            : <div className="h-20 w-full bg-slate-100 flex items-center justify-center text-slate-300 text-[9px]">sin foto</div>}
                          <div className="p-1.5 flex-1 flex flex-col justify-between">
                            <p className="text-[9px] font-bold text-slate-700 truncate">{p.nombre}</p>
                            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                              <span className="text-[9px] text-[#FF6B00] font-black">Q{p.precio}</span>
                              <button
                                type="button"
                                title="Diseñar historia 9:16 de este producto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStoryStudioProduct(p);
                                  setStoryStudioOpen(true);
                                }}
                                className="px-1.5 py-0.5 rounded bg-orange-100 hover:bg-[#FF6B00] text-[#FF6B00] hover:text-white text-[8px] font-black transition-colors flex items-center gap-0.5 cursor-pointer"
                              >
                                <Wand2 size={8} /> 9:16
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-slate-400 italic">Tocá un producto para cargar su foto y texto, o el botón 9:16 para abrir el creador visual.</p>
                </div>
              )}

              {/* Imagen / Video */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">URL de Imagen o Video:</label>
                  <label className="text-[10px] font-bold text-[#FF6B00] hover:underline cursor-pointer flex items-center gap-1">
                    <UploadCloud size={12} />
                    <span>{uploadingFile ? 'Subiendo...' : 'Subir Archivo'}</span>
                    <input type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
                <input
                  type="url"
                  value={postForm.mediaUrl}
                  onChange={e => setPostForm({ ...postForm, mediaUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-[#FF6B00]"
                />
                {postForm.mediaUrl && (
                  <div className="mt-2 relative rounded-2xl overflow-hidden border border-slate-200 h-36 bg-slate-100 flex items-center justify-center">
                    {postForm.mediaType === 'video' ? (
                      <video src={postForm.mediaUrl} className="h-full w-full object-cover" controls />
                    ) : (
                      <img src={postForm.mediaUrl} alt="Preview" className="h-full w-full object-cover" />
                    )}
                  </div>
                )}
              </div>

              {/* Texto / Caption */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">Texto / Caption:</label>
                  <span className="text-[10px] text-slate-400">{postForm.caption.length} caracteres</span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={postForm.caption}
                  onChange={e => setPostForm({ ...postForm, caption: e.target.value })}
                  placeholder="Escribe el texto de tu publicación, emojis, precio y llamado a la acción..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#FF6B00] resize-none"
                />
              </div>

              {/* Modo: Publicar Ahora vs Programar */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPostForm({ ...postForm, mode: 'now' })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      postForm.mode === 'now' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    🚀 Publicar Ahora
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostForm({ ...postForm, mode: 'schedule' })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      postForm.mode === 'schedule' ? 'bg-[#FF6B00] text-white border-[#FF6B00]' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    ⏰ Programar Fecha
                  </button>
                </div>

                {postForm.mode === 'schedule' && (
                  <div className="space-y-1 animate-in fade-in duration-200">
                    <label className="text-[10px] font-bold text-slate-600">Fecha y Hora de Publicación (Guate):</label>
                    <input
                      type="datetime-local"
                      required
                      value={postForm.scheduledTime}
                      onChange={e => setPostForm({ ...postForm, scheduledTime: e.target.value.replace('T', ' ') })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#FF6B00]"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={publishing}
                className="w-full py-3 bg-[#FF6B00] hover:bg-[#e05e00] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {publishing ? <RefreshCw size={14} className="animate-spin" /> : (postForm.mode === 'schedule' ? <Clock size={14} /> : <Send size={14} />)}
                <span>{publishing ? 'Procesando en Meta...' : (postForm.mode === 'schedule' ? 'Guardar en Calendario' : 'Publicar Ahora')}</span>
              </button>
            </form>
          </div>

          {/* HISTORIAL Y CALENDARIO INTERACTIVO */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Barra Superior con Selector de Vista y Filtros */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-orange-500/10 text-[#FF6B00] flex items-center justify-center font-bold shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Historial y Calendario</h3>
                  <p className="text-[10px] text-slate-400">Revisa qué publicaciones se han hecho y cuáles están en cola.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Switch Vista Calendario vs Vista Lista */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setCalendarViewMode('calendar')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      calendarViewMode === 'calendar' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <CalendarDays size={13} className="text-[#FF6B00]" />
                    <span>Calendario</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarViewMode('list')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      calendarViewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <List size={13} />
                    <span>Lista ({scheduledPosts.length})</span>
                  </button>
                </div>

                <button
                  onClick={loadScheduledPosts}
                  disabled={loadingScheduled}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                  title="Actualizar publicaciones"
                >
                  <RefreshCw size={13} className={loadingScheduled ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* VISTA 1: CALENDARIO MENSUAL INTERACTIVO */}
            {calendarViewMode === 'calendar' && (
              <div className="space-y-4">
                
                {/* Header del Mes y Controles de Navegación */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        title="Mes anterior"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      
                      <h4 className="text-sm font-black text-slate-900 min-w-[160px] text-center capitalize">
                        {formatMonthYearHeader(calendarMonth)}
                      </h4>

                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        title="Mes siguiente"
                      >
                        <ChevronRight size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCalendarMonth(new Date());
                          setSelectedCalendarDate(todayStr);
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-orange-50 hover:bg-orange-100 text-[#FF6B00] border border-orange-200 transition-colors cursor-pointer"
                      >
                        Hoy
                      </button>
                    </div>

                    {/* Filtros de Estado */}
                    <div className="flex items-center gap-1 text-[10px] font-bold">
                      {[
                        { id: 'todos', label: 'Todos' },
                        { id: 'published', label: '✅ Hechas' },
                        { id: 'pending', label: '⏳ Programadas' }
                      ].map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setScheduledStatusFilter(f.id)}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            scheduledStatusFilter === f.id
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cuadrícula de Días de la Semana */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                      <div key={d} className="py-1">{d}</div>
                    ))}
                  </div>

                  {/* Cuadrícula de Días del Mes */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {getCalendarMonthDays().map((day, idx) => {
                      const isToday = day.dateStr === todayStr;
                      const isSelected = day.dateStr === selectedCalendarDate;
                      
                      // Filtrar publicaciones de este día
                      const dayPosts = scheduledPosts.filter(p => {
                        const dStr = getPostDateKey(p);
                        if (dStr !== day.dateStr) return false;
                        if (scheduledStatusFilter !== 'todos' && p.status !== scheduledStatusFilter) return false;
                        return true;
                      });

                      const publishedCount = dayPosts.filter(p => p.status === 'published').length;
                      const pendingCount = dayPosts.filter(p => p.status === 'pending').length;

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedCalendarDate(day.dateStr)}
                          className={`min-h-[86px] p-1.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#FF6B00] ring-2 ring-orange-400/30 bg-orange-50/20'
                              : isToday
                              ? 'border-orange-300 bg-orange-50/10'
                              : day.isCurrentMonth
                              ? 'border-slate-100 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                              : 'border-transparent bg-slate-50/20 opacity-35'
                          }`}
                        >
                          {/* Cabecera del día */}
                          <div className="flex items-center justify-between">
                            {isToday ? (
                              <span className="px-1 py-0.2 rounded-md bg-[#FF6B00] text-white text-[8px] font-black leading-none">
                                Hoy
                              </span>
                            ) : <span />}
                            <span className={`text-[11px] font-black ${
                              isToday ? 'text-[#FF6B00]' : isSelected ? 'text-slate-900' : 'text-slate-600'
                            }`}>
                              {day.dayNum}
                            </span>
                          </div>

                          {/* Miniaturas o badges de publicaciones en este día */}
                          <div className="space-y-1 my-1">
                            {dayPosts.slice(0, 2).map((p, pIdx) => (
                              <div
                                key={p.id || pIdx}
                                className={`px-1 py-0.5 rounded-md text-[8px] font-bold truncate flex items-center gap-1 border ${
                                  p.status === 'published'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : p.status === 'failed'
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                                title={`${p.status === 'published' ? '✅ Hecha' : '⏳ Programada'}: ${p.caption}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                  p.status === 'published' ? 'bg-emerald-500' : p.status === 'failed' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
                                }`} />
                                <span className="truncate">
                                  {p.post_type === 'historia' ? '⭕' : p.platform === 'instagram' ? '📸' : p.platform === 'facebook' ? '📘' : '🌟'} {p.caption || 'Publicación'}
                                </span>
                              </div>
                            ))}

                            {dayPosts.length > 2 && (
                              <span className="block text-[8px] font-bold text-slate-400 text-center">
                                +{dayPosts.length - 2} más
                              </span>
                            )}
                          </div>

                          {/* Resumen del día (puntitos) */}
                          <div className="flex items-center justify-end gap-1 text-[8px]">
                            {publishedCount > 0 && (
                              <span className="text-emerald-600 font-bold">✅{publishedCount}</span>
                            )}
                            {pendingCount > 0 && (
                              <span className="text-amber-600 font-bold">⏳{pendingCount}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* DETALLE DEL DÍA SELECCIONADO */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Publicaciones del Día:</span>
                      <h4 className="text-sm font-black text-slate-900 capitalize">
                        {new Date(selectedCalendarDate + 'T12:00:00').toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPostForm(prev => ({
                          ...prev,
                          mode: 'schedule',
                          scheduledTime: `${selectedCalendarDate} 10:00`
                        }));
                      }}
                      className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-[#FF6B00] border border-orange-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Programar para esta fecha</span>
                    </button>
                  </div>

                  {/* Lista de publicaciones del día seleccionado */}
                  {(() => {
                    const selectedDayPosts = scheduledPosts.filter(p => {
                      const dStr = getPostDateKey(p);
                      if (dStr !== selectedCalendarDate) return false;
                      if (scheduledStatusFilter !== 'todos' && p.status !== scheduledStatusFilter) return false;
                      return true;
                    });

                    if (selectedDayPosts.length === 0) {
                      return (
                        <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-2">
                          <Calendar className="mx-auto text-slate-300" size={28} />
                          <p className="text-xs font-bold text-slate-600">No hay publicaciones registradas en esta fecha</p>
                          <p className="text-[11px] text-slate-400">Puedes crear una publicación y programarla para este día desde el formulario.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {selectedDayPosts.map(post => {
                          const isStory = post.post_type === 'historia';
                          const isReel = post.post_type === 'reel';
                          const isPending = post.status === 'pending';
                          const isFailed = post.status === 'failed';
                          const isPublished = post.status === 'published';
                          const isWorking = publishingNow[post.id];

                          return (
                            <div key={post.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                    isPublished ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                    isFailed ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                    'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                                  }`}>
                                    {isPublished ? '✅ Publicado con Éxito' : isFailed ? '❌ Error al Publicar' : '⏳ Programado'}
                                  </span>

                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                                    {isStory ? '⭕ Historia' : isReel ? '🎬 Reel' : '🖼️ Post'}
                                  </span>

                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 uppercase">
                                    {post.platform === 'instagram' ? '📸 IG' : post.platform === 'facebook' ? '📘 FB' : '🌟 Ambas'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {isPending && (
                                    <button
                                      type="button"
                                      onClick={() => handlePublishNow(post.id)}
                                      disabled={isWorking}
                                      className="px-2.5 py-1 bg-[#FF6B00] hover:bg-[#e05e00] text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                      title="Publicar inmediatamente en Meta sin esperar la fecha programada"
                                    >
                                      {isWorking ? <RefreshCw size={10} className="animate-spin" /> : <Send size={10} />}
                                      <span>{isWorking ? 'Publicando...' : 'Publicar Ahora'}</span>
                                    </button>
                                  )}

                                  {isFailed && (
                                    <button
                                      type="button"
                                      onClick={() => handlePublishNow(post.id)}
                                      disabled={isWorking}
                                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                      title="Reintentar publicación en Meta"
                                    >
                                      {isWorking ? <RefreshCw size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                                      <span>{isWorking ? 'Reintentando...' : 'Reintentar'}</span>
                                    </button>
                                  )}

                                  {isPending && (
                                    <button
                                      onClick={() => handleDeleteScheduled(post.id)}
                                      className="p-1.5 rounded-lg bg-white hover:bg-rose-600 hover:text-white text-slate-400 transition-colors cursor-pointer border border-slate-200"
                                      title="Cancelar y eliminar publicación programada"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-3.5 items-start">
                                {post.media_url && (
                                  <div className={`rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300 ${isStory ? 'w-14 h-24' : 'w-18 h-18'}`}>
                                    {post.media_type === 'video' ? (
                                      <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white"><Video size={18} /></div>
                                    ) : (
                                      <img src={post.media_url} alt="Media" className="w-full h-full object-cover" />
                                    )}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <p className="text-xs text-slate-800 font-medium whitespace-pre-line leading-relaxed">
                                    {post.caption || <span className="italic text-slate-400">Sin descripción (Solo imagen)</span>}
                                  </p>

                                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 font-medium pt-0.5">
                                    <span className="flex items-center gap-1 font-bold text-slate-600">
                                      <Clock size={11} />
                                      {isPublished ? `Publicado el: ${post.published_at || post.scheduled_time}` : `Programado para: ${post.scheduled_time}`}
                                    </span>
                                  </div>

                                  {post.error_msg && (
                                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold">
                                      ⚠️ Razón del error: {post.error_msg}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

              </div>
            )}

            {/* VISTA 2: LISTA TRADICIONAL DE TARJETAS */}
            {calendarViewMode === 'list' && (
              <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
                {scheduledPosts.map(post => {
                  const isStory = post.post_type === 'historia';
                  const isReel = post.post_type === 'reel';
                  const isPending = post.status === 'pending';
                  const isFailed = post.status === 'failed';
                  const isPublished = post.status === 'published';
                  const isWorking = publishingNow[post.id];

                  return (
                    <div key={post.id} className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                            isPublished ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            isFailed ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                          }`}>
                            {isPublished ? '✅ Publicado con Éxito' : isFailed ? '❌ Error al Publicar' : '⏳ Programado'}
                          </span>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {isStory ? '⭕ Historia' : isReel ? '🎬 Reel' : '🖼️ Post'}
                          </span>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 uppercase">
                            {post.platform === 'instagram' ? '📸 Instagram' : post.platform === 'facebook' ? '📘 Facebook' : '🌟 Ambas'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handlePublishNow(post.id)}
                              disabled={isWorking}
                              className="px-3 py-1.5 bg-[#FF6B00] hover:bg-[#e05e00] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Publicar inmediatamente en Meta sin esperar la fecha programada"
                            >
                              {isWorking ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                              <span>{isWorking ? 'Publicando...' : 'Publicar Ahora'}</span>
                            </button>
                          )}

                          {isFailed && (
                            <button
                              type="button"
                              onClick={() => handlePublishNow(post.id)}
                              disabled={isWorking}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Reintentar publicación en Meta"
                            >
                              {isWorking ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                              <span>{isWorking ? 'Reintentando...' : 'Reintentar'}</span>
                            </button>
                          )}

                          {isPending && (
                            <button
                              onClick={() => handleDeleteScheduled(post.id)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-500 transition-colors cursor-pointer"
                              title="Cancelar publicación"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-4 items-start">
                        {post.media_url && (
                          <div className={`rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 ${isStory ? 'w-16 h-28' : 'w-20 h-20'}`}>
                            {post.media_type === 'video' ? (
                              <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white"><Video size={20} /></div>
                            ) : (
                              <img src={post.media_url} alt="Media" className="w-full h-full object-cover" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <p className="text-xs text-slate-800 font-medium whitespace-pre-line leading-relaxed line-clamp-3">
                            {post.caption || <span className="italic text-slate-400">Sin descripción</span>}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium pt-1">
                            <span className="flex items-center gap-1 font-bold">
                              <Clock size={11} />
                              {isPublished ? `Publicado: ${post.published_at || post.scheduled_time}` : `Programado: ${post.scheduled_time}`}
                            </span>
                          </div>
                          {post.error_msg && (
                            <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold">
                              ⚠️ Razón del error: {post.error_msg}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {scheduledPosts.length === 0 && (
                  <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-2">
                    <Calendar className="mx-auto text-slate-300" size={36} />
                    <p className="text-xs font-bold text-slate-500">No hay publicaciones programadas</p>
                    <p className="text-[11px] text-slate-400">Crea tu primer post con foto y fecha programada desde el panel izquierdo.</p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

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
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Comentarios</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{comments.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Auto-Respuesta</span>
              <p className="text-xs font-black text-purple-700 mt-2 flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${botSettings.bot_comments_enabled === '1' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                {botSettings.bot_comments_enabled === '1' ? 'Bot Activo' : 'Manual'}
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
            <div className="flex items-center space-x-1.5 flex-wrap">
              {['todos', 'nuevos', 'delicados', 'respondidos'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                    filter === f ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-1.5">
              {[
                { id: 'todos', label: 'Todas las redes' },
                { id: 'instagram', label: '📸 Instagram' },
                { id: 'facebook', label: '📘 Facebook' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatformFilter(p.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    platformFilter === p.id ? 'bg-[#FF6B00] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Comentarios */}
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
              <RefreshCw className="animate-spin text-[#FF6B00]" size={16} />
              <span>Cargando comentarios...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-2">
              <MessageCircle className="mx-auto text-slate-300" size={32} />
              <p className="text-xs font-bold text-slate-500">No hay comentarios en este filtro</p>
              <p className="text-[11px] text-slate-400">Pulsa &quot;Sincronizar Feed & Comentarios&quot; para buscar los últimos de tus publicaciones.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((c) => {
                const isIG = c.platform === 'instagram';
                const isDelicate = !!c.is_delicate;

                return (
                  <div
                    key={c.id}
                    className={`bg-white rounded-3xl p-5 border transition-all space-y-3.5 ${
                      isDelicate ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200/90 shadow-xs'
                    }`}
                  >
                    {/* Header del comentario */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-lg">{isIG ? '📸' : '📘'}</span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-black text-slate-900">{c.from_name || 'Usuario'}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {isIG ? 'Instagram' : 'Facebook'}
                            </span>
                            {isDelicate && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white flex items-center gap-1">
                                <AlertTriangle size={10} /> Delicado (Atención Humana)
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">{c.timestamp || c.created_at}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {c.status !== 'resuelto' && (
                          <button
                            onClick={() => marcarEstado(c.id, 'resuelto')}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          >
                            Marcar Resuelto
                          </button>
                        )}
                        {c.permalink && (
                          <a
                            href={c.permalink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                            title="Ver en la red social"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Contenido del comentario */}
                    <p className="text-xs font-medium text-slate-800 bg-slate-50 p-3 rounded-2xl leading-relaxed">
                      &quot;{c.text}&quot;
                    </p>

                    {/* Si ya fue respondido */}
                    {c.bot_reply && (
                      <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1">
                          <Bot size={11} /> Respuesta enviada:
                        </span>
                        <p className="text-xs text-purple-950 font-medium leading-relaxed">{c.bot_reply}</p>
                      </div>
                    )}

                    {/* Caja de Respuesta Manual / IA */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Responder al comentario:</span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => sugerirRespuestaIA(c.id)}
                            disabled={generatingAI[c.id]}
                            className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-black flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles size={11} className={generatingAI[c.id] ? 'animate-spin' : ''} />
                            <span>{generatingAI[c.id] ? 'Generando...' : 'Sugerir con IA'}</span>
                          </button>
                          <button
                            onClick={() => responderConIAUnClic(c.id)}
                            disabled={sending[c.id]}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black flex items-center gap-1 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            <Bot size={11} />
                            <span>Responder con IA (1-Clic)</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyText[c.id] || ''}
                          onChange={(e) => setReplyText({ ...replyText, [c.id]: e.target.value })}
                          placeholder="Escribe tu respuesta pública..."
                          className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#FF6B00]"
                          onKeyDown={(e) => e.key === 'Enter' && enviarRespuesta(c.id)}
                        />
                        <button
                          onClick={() => enviarRespuesta(c.id)}
                          disabled={sending[c.id] || !(replyText[c.id] || '').trim()}
                          className="px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-black rounded-xl transition-all flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                          <Send size={12} />
                          <span>{sending[c.id] ? 'Enviando...' : 'Enviar'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: MÉTRICAS & LIKES (FEED COMPLETO & REGISTRO HISTÓRICO) */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'feed' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Likes Meta</span>
              <p className="text-3xl font-black text-pink-600 mt-2 flex items-center gap-2">
                <Heart className="fill-pink-500 text-pink-500" size={24} />
                {(metaInsights?.stats?.totalLikes || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Acumulado en publicaciones</p>
            </div>

            <div className="bg-white border border-pink-200 bg-pink-50/30 rounded-3xl p-5 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-pink-700 flex items-center justify-between">
                <span>Instagram (@0ne_control)</span>
                {metaInsights?.instagram?.gained_today > 0 && (
                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                    +{metaInsights.instagram.gained_today} hoy
                  </span>
                )}
              </span>
              <p className="text-3xl font-black text-slate-900 mt-2">
                {(metaInsights?.instagram?.followers_count || metaInsights?.instagram?.followers || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-pink-600 font-bold mt-1">
                {metaInsights?.instagram?.media_count || metaInsights?.instagram?.mediaCount || 0} Publicaciones & Reels
              </p>
            </div>

            <div className="bg-white border border-blue-200 bg-blue-50/30 rounded-3xl p-5 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 flex items-center justify-between">
                <span>Facebook Page</span>
                {metaInsights?.facebook?.gained_today > 0 && (
                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                    +{metaInsights.facebook.gained_today} hoy
                  </span>
                )}
              </span>
              <p className="text-3xl font-black text-slate-900 mt-2">
                {(metaInsights?.facebook?.followers_count || metaInsights?.facebook?.fan_count || metaInsights?.facebook?.fanCount || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-blue-600 font-bold mt-1">Seguidores / Fans</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Comentarios</span>
              <p className="text-3xl font-black text-slate-900 mt-2">{comments.length}</p>
              <p className="text-[11px] text-slate-400 mt-1">Gestionados en CRM</p>
            </div>
          </div>

          {/* REGISTRO HISTÓRICO DE CRECIMIENTO */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="text-emerald-500" size={16} /> Registro Histórico de Seguidores & Crecimiento
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Historial automático de registros tomados de Instagram y Facebook para medir cuántos seguidores nuevos se ganan día a día.
                </p>
              </div>
              <button
                onClick={loadMetaInsights}
                disabled={loadingMeta}
                className="text-xs font-bold text-[#FF6B00] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} className={loadingMeta ? 'animate-spin' : ''} />
                <span>Actualizar Historial</span>
              </button>
            </div>

            {followersHistory.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                Aún no hay suficientes registros históricos acumulados en la base de datos. Se van guardando automáticamente con cada consulta a Meta.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Fecha / Hora (Guate)</th>
                      <th className="py-3 px-4">Red Social</th>
                      <th className="py-3 px-4">Seguidores Registrados</th>
                      <th className="py-3 px-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {followersHistory.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          {row.date_str} {row.timestamp ? `• ${row.timestamp}` : ''}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                            row.platform === 'instagram' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {row.platform === 'instagram' ? '📸 Instagram' : '📘 Facebook'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-900 font-black tabular-nums">
                          {Number(row.followers_count).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            <CheckCircle2 size={10} /> Registro Guardado
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cuadrícula de Publicaciones con Likes */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900">Publicaciones Recientes & Engagement</h3>

            {loadingMeta ? (
              <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
                <RefreshCw className="animate-spin text-[#FF6B00]" size={16} />
                <span>Cargando feed de Meta...</span>
              </div>
            ) : (metaInsights?.feed || []).length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-400">
                No se encontraron publicaciones recientes.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(metaInsights?.feed || []).map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
                  >
                    {/* Media Thumbnail */}
                    <div className="relative aspect-square bg-slate-100 overflow-hidden">
                      {item.media_type === 'VIDEO' ? (
                        <video src={item.media_url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img
                          src={item.media_url || item.thumbnail_url}
                          alt="Post"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-black/60 text-white backdrop-blur-xs flex items-center gap-1">
                        {item.platform === 'instagram' ? '📸 IG' : '📘 FB'}
                        {item.media_type === 'VIDEO' && <Video size={10} />}
                      </span>

                      <div className="absolute bottom-2.5 right-2.5 flex items-center space-x-2 bg-black/70 text-white px-2.5 py-1 rounded-xl text-xs font-black backdrop-blur-xs">
                        <span className="flex items-center gap-1">
                          <Heart size={12} className="fill-pink-500 text-pink-500" />
                          {item.like_count || 0}
                        </span>
                        <span className="flex items-center gap-1 opacity-80">
                          <MessageCircle size={12} />
                          {item.comments_count || 0}
                        </span>
                      </div>
                    </div>

                    {/* Caption & Actions */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <p className="text-xs text-slate-700 font-medium line-clamp-3 leading-relaxed">
                        {item.caption || item.message || 'Sin descripción'}
                      </p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span>{item.timestamp?.slice(0, 10)}</span>
                        {item.permalink && (
                          <a
                            href={item.permalink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#FF6B00] font-bold hover:underline flex items-center gap-0.5"
                          >
                            Ver Post <ExternalLink size={10} />
                          </a>
                        )}
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
      {/* TAB 3: CONFIGURACIÓN DE AUTO-RESPUESTA CON IA */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'bot_settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Ajustes Generales */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Bot className="text-purple-600" size={20} /> Auto-Respuesta del Bot en Comentarios
              </h3>
              <p className="text-xs text-slate-400 mt-1">Configura cómo responde el bot automáticamente a las personas que comentan tus posts y reels.</p>
            </div>

            {settingsMsg && (
              <div className={`p-3.5 rounded-2xl text-xs font-bold ${settingsMsg.includes('✅') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                {settingsMsg}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-5">
              {/* Switch Activar */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <h4 className="text-xs font-black text-slate-900">Auto-Responder Comentarios</h4>
                  <p className="text-[11px] text-slate-500">Responder automáticamente a preguntas de precio, catálogo y envíos.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBotSettings({ ...botSettings, bot_comments_enabled: botSettings.bot_comments_enabled === '1' ? '0' : '1' })}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    botSettings.bot_comments_enabled === '1' ? 'bg-purple-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      botSettings.bot_comments_enabled === '1' ? 'left-7' : 'left-1'
                    }`}
                  />
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

      {/* MODAL CREADOR DE HISTORIAS 9:16 CON PLANTILLA Y PRECIO */}
      <StoryStudioModal
        isOpen={storyStudioOpen}
        onClose={() => setStoryStudioOpen(false)}
        products={products}
        apiBase={apiBase}
        authToken={authToken}
        initialProduct={storyStudioProduct}
        onUseInPublisher={handleUseStoryInPublisher}
      />
    </div>
  );
}
