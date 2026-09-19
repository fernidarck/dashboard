import { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap, Sparkles, Check, X, Edit3, Trash2, AlertCircle,
  Plus, ShieldAlert, CheckCircle2, MessageSquare, HelpCircle,
  Search, RefreshCw, Send, ArrowRight, Zap, BookOpen, Layers,
  Sliders, ExternalLink, ThumbsUp, ThumbsDown,
  Image as ImageIcon, Video
} from 'lucide-react';

export default function ViewEntrenamiento({
  trainingRules = [],
  trainingStats = { total: 0, pending: 0, approved: 0, rejected: 0, prohibidas: 0, permitidas: 0 },
  onFetchRules,
  onSaveRule,
  onUpdateRule,
  onDeleteRule,
  onApproveRule,
  onRejectRule,
  onAnalyzeAI,
  onTestPrompt,
  onFetchSessions,
  onCreateSession,
  onUpdateSession,
  onDeleteSession
}) {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'simulator'
  const [filterType, setFilterType] = useState('all'); // 'all' | 'prohibido' | 'permitido' | 'faq' | 'objecion'
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    type: 'permitido',
    title: '',
    what_learned: '',
    what_not_to_say: '',
    prompt_instruction: '',
    rule: '',
    example_question: '',
    example_response: '',
    status: 'approved'
  });

  // Simulator State — chat conversacional con memoria + sesiones guardadas
  const [simInput, setSimInput] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [sessions, setSessions] = useState([]);      // [{id, nombre, mensajes, ...}]
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]); // hilo activo: [{role, content, mediaInfo?, appliedRules?, source?}]

  useEffect(() => {
    onFetchRules?.();
  }, [onFetchRules]);

  // Cargar sesiones guardadas al entrar al tab del probador
  useEffect(() => {
    if (activeTab !== 'simulator' || !onFetchSessions) return;
    (async () => {
      const list = await onFetchSessions();
      setSessions(Array.isArray(list) ? list : []);
    })();
  }, [activeTab, onFetchSessions]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  const handleOpenNewModal = () => {
    setEditingRule(null);
    setFormData({
      type: 'permitido',
      title: '',
      what_learned: '',
      what_not_to_say: '',
      prompt_instruction: '',
      rule: '',
      example_question: '',
      example_response: '',
      status: 'approved'
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (rule) => {
    setEditingRule(rule);
    setFormData({
      type: rule.type || 'permitido',
      title: rule.title || '',
      what_learned: rule.what_learned || '',
      what_not_to_say: rule.what_not_to_say || (rule.type === 'prohibido' ? rule.rule : ''),
      prompt_instruction: rule.prompt_instruction || (rule.type !== 'prohibido' ? rule.rule : ''),
      rule: rule.rule || '',
      example_question: rule.example_question || '',
      example_response: rule.example_response || '',
      status: rule.status || 'approved'
    });
    setModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    // Fallback de rule para compatibilidad
    const dataToSend = {
      ...formData,
      rule: formData.rule.trim() || formData.prompt_instruction.trim() || formData.what_not_to_say.trim() || formData.title.trim()
    };

    if (editingRule) {
      await onUpdateRule?.(editingRule.id, dataToSend);
    } else {
      await onSaveRule?.(dataToSend);
    }
    setModalOpen(false);
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      await onAnalyzeAI?.();
      setActiveTab('pending');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Empezar un chat de prueba nuevo (vacío, aún sin guardar hasta el primer mensaje)
  const handleNewChat = () => {
    setActiveSessionId(null);
    setChatMessages([]);
    setSimInput('');
  };

  // Abrir una sesión guardada
  const handleOpenSession = (session) => {
    setActiveSessionId(session.id);
    setChatMessages(Array.isArray(session.mensajes) ? session.mensajes : []);
    setSimInput('');
  };

  // Borrar una sesión guardada
  const handleDeleteSession = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm('¿Borrar este chat de prueba? No se puede deshacer.')) return;
    const ok = await onDeleteSession?.(id);
    if (ok) {
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) handleNewChat();
    }
  };

  // Enviar un mensaje del "cliente" al probador (con memoria del hilo)
  const handleSendChat = async (e) => {
    e?.preventDefault();
    const text = simInput.trim();
    if (!text || simLoading) return;

    const history = chatMessages.map(m => ({ role: m.role, content: m.content }));
    const userMsg = { role: 'user', content: text };
    const withUser = [...chatMessages, userMsg];
    setChatMessages(withUser);
    setSimInput('');
    setSimLoading(true);

    let botMsg;
    try {
      const res = await onTestPrompt?.(text, history);
      botMsg = {
        role: 'assistant',
        content: res?.reply || res?.error || '(sin respuesta)',
        mediaInfo: res?.mediaInfo || null,
        appliedRules: res?.appliedRules || [],
        source: res?.source || null
      };
    } catch (err) {
      botMsg = { role: 'assistant', content: 'Error: ' + (err?.message || 'no se pudo simular'), mediaInfo: null, appliedRules: [] };
    }

    const finalMsgs = [...withUser, botMsg];
    setChatMessages(finalMsgs);
    setSimLoading(false);

    // Persistir el hilo (crear la sesión en el primer mensaje, o actualizarla)
    const nombre = (activeSession?.nombre) || text.slice(0, 40);
    if (!activeSessionId) {
      const created = await onCreateSession?.(nombre, finalMsgs);
      if (created?.id) {
        setActiveSessionId(created.id);
        setSessions(prev => [{ ...created, mensajes: finalMsgs, nombre }, ...prev]);
      }
    } else {
      await onUpdateSession?.(activeSessionId, { nombre, mensajes: finalMsgs });
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, mensajes: finalMsgs, nombre, updated_at: new Date().toISOString() } : s));
    }
  };

  // Última pregunta del cliente (para el botón de corregir)
  const lastClientQuestion = [...chatMessages].reverse().find(m => m.role === 'user')?.content || '';

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return trainingRules.filter(r => {
      // Tab filter
      if (activeTab === 'pending' && r.status !== 'pending') return false;
      if (activeTab === 'approved' && r.status !== 'approved') return false;

      // Type filter
      if (filterType !== 'all' && r.type !== filterType) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const t = (r.title || '').toLowerCase();
        const rule = (r.rule || '').toLowerCase();
        const exQ = (r.example_question || '').toLowerCase();
        const exR = (r.example_response || '').toLowerCase();
        return t.includes(q) || rule.includes(q) || exQ.includes(q) || exR.includes(q);
      }

      return true;
    });
  }, [trainingRules, activeTab, filterType, searchQuery]);

  const pendingCount = trainingStats.pending || trainingRules.filter(r => r.status === 'pending').length;
  const approvedCount = trainingStats.approved || trainingRules.filter(r => r.status === 'approved').length;

  const getTypeBadge = (type) => {
    switch (type) {
      case 'prohibido':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
            <ShieldAlert size={12} /> ⛔ Prohibido
          </span>
        );
      case 'objecion':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
            <Zap size={12} /> 🎯 Objeción
          </span>
        );
      case 'faq':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            <HelpCircle size={12} /> 💡 FAQ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} /> ✅ Permitido
          </span>
        );
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-[#FF6B00] to-amber-500 rounded-2xl text-white shadow-lg shadow-orange-500/20">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Entrenamiento y Aprendizaje IA</h1>
              <p className="text-xs text-slate-500 font-medium">Supervisá qué debe responder el bot, prohibí errores y descubrí lecciones de conversaciones reales.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs shadow-md hover:shadow-lg transition-all disabled:opacity-60 cursor-pointer"
          >
            <Sparkles size={16} className={isAnalyzing ? "animate-spin text-amber-400" : "text-amber-400"} />
            <span>{isAnalyzing ? 'Escaneando con IA...' : 'Escanear Conversaciones'}</span>
          </button>

          <button
            onClick={handleOpenNewModal}
            className="flex items-center space-x-2 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e56000] text-white rounded-2xl font-bold text-xs shadow-md shadow-orange-500/20 hover:shadow-lg transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Nueva Regla</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('pending')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-amber-50/50 border-amber-300 shadow-sm ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200/80 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Por Revisar</span>
            <div className="p-2 rounded-xl bg-amber-100/80 text-amber-600"><Sparkles size={16} /></div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{pendingCount}</span>
            <span className="text-xs font-semibold text-amber-600">lecciones</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Situaciones detectadas en chats esperando tu aprobación.</p>
        </div>

        <div
          onClick={() => { setActiveTab('approved'); setFilterType('prohibido'); }}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === 'approved' && filterType === 'prohibido'
              ? 'bg-rose-50/50 border-rose-300 shadow-sm ring-2 ring-rose-400/20'
              : 'bg-white border-slate-200/80 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">Qué NO decir (Prohibido)</span>
            <div className="p-2 rounded-xl bg-rose-100/80 text-rose-600"><ShieldAlert size={16} /></div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{trainingStats.prohibidas || 0}</span>
            <span className="text-xs font-semibold text-rose-600">reglas</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Restricciones estrictas de lo que el bot NO debe decir.</p>
        </div>

        <div
          onClick={() => { setActiveTab('approved'); setFilterType('permitido'); }}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === 'approved' && filterType === 'permitido'
              ? 'bg-emerald-50/50 border-emerald-300 shadow-sm ring-2 ring-emerald-400/20'
              : 'bg-white border-slate-200/80 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Qué SÍ decir (Prompts)</span>
            <div className="p-2 rounded-xl bg-emerald-100/80 text-emerald-600"><CheckCircle2 size={16} /></div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{trainingStats.permitidas || 0}</span>
            <span className="text-xs font-semibold text-emerald-600">activos</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Nuevos prompts e instrucciones que la IA aplica en vivo.</p>
        </div>

        <div
          onClick={() => setActiveTab('simulator')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === 'simulator'
              ? 'bg-purple-50/50 border-purple-300 shadow-sm ring-2 ring-purple-400/20'
              : 'bg-white border-slate-200/80 hover:border-purple-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-700">Simulador en Vivo</span>
            <div className="p-2 rounded-xl bg-purple-100/80 text-purple-600"><Zap size={16} /></div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{approvedCount}</span>
            <span className="text-xs font-semibold text-purple-600">reglas activas</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Probá cómo responde la IA aplicando todas las reglas.</p>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl self-start">
          <button
            onClick={() => { setActiveTab('pending'); setFilterType('all'); }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Sugerencias IA</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('approved'); setFilterType('all'); }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'approved' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Reglas Activas</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black">
              {approvedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'simulator' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Zap size={14} className="text-purple-600" />
            <span>Simulador en Vivo</span>
          </button>
        </div>

        {activeTab !== 'simulator' && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar reglas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00] transition-colors w-48 md:w-60"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-[#FF6B00] cursor-pointer"
            >
              <option value="all">Todos los tipos</option>
              <option value="prohibido">⛔ Prohibido</option>
              <option value="permitido">✅ Permitido</option>
              <option value="faq">💡 FAQ</option>
              <option value="objecion">🎯 Objeción</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab Content: Simulator */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna izquierda: lista de chats de prueba guardados */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg"><MessageSquare size={16} /></div>
                <h3 className="text-sm font-bold text-slate-900">Chats de prueba</h3>
              </div>
              <button
                onClick={handleNewChat}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
              >
                <Plus size={13} /> Nuevo
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">Cada chat guarda su propia memoria. Podés crear varios y borrarlos cuando quieras.</p>

            <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
              {/* Chat nuevo sin guardar */}
              {activeSessionId === null && (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-purple-300 bg-purple-50 ring-1 ring-purple-400/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
                    <span className="text-xs font-bold text-purple-900 truncate">Chat nuevo (sin guardar)</span>
                  </div>
                  <span className="text-[10px] text-purple-500 font-semibold shrink-0">se guarda al escribir</span>
                </div>
              )}
              {sessions.length === 0 && activeSessionId !== null && (
                <p className="text-[11px] text-slate-400 py-4 text-center">No hay chats guardados todavía.</p>
              )}
              {sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleOpenSession(s)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                    activeSessionId === s.id
                      ? 'border-purple-300 bg-purple-50 ring-1 ring-purple-400/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare size={13} className={activeSessionId === s.id ? 'text-purple-600 shrink-0' : 'text-slate-400 shrink-0'} />
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${activeSessionId === s.id ? 'text-purple-900' : 'text-slate-700'}`}>{s.nombre || 'Chat de prueba'}</p>
                      <p className="text-[10px] text-slate-400">{(s.mensajes?.length || 0)} mensajes</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    title="Borrar chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Columna derecha: el chat conversacional */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex flex-col" style={{ minHeight: '560px' }}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl"><Zap size={18} /></div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Probador con memoria</h3>
                  <p className="text-[11px] text-slate-400">Escribí como si fueras el cliente. El bot recuerda todo el hilo.</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 hidden sm:inline">🤖 Bot real (deepseek)</span>
            </div>

            {/* Hilo de mensajes */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4" style={{ maxHeight: '420px' }}>
              {chatMessages.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <MessageSquare size={32} className="mx-auto text-slate-300 opacity-60" />
                  <p className="text-xs font-semibold text-slate-500">Escribí el primer mensaje del cliente para empezar.</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">La simulación usa el catálogo (RAG), las reglas aprobadas y recuerda toda la conversación.</p>
                  <div className="flex flex-wrap justify-center gap-1.5 pt-3">
                    {[
                      'Hola, necesito un control para mi portón',
                      'Es Liftmaster',
                      '¿Lo envían a Xela?',
                      '¿Cuánto por 3 controles?'
                    ].map((quick, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSimInput(quick)}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 transition-colors"
                      >
                        {quick}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatMessages.map((m, i) => (
                  m.role === 'user' ? (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[80%] bg-[#FF6B00] text-white rounded-2xl rounded-br-md px-4 py-2.5 text-xs leading-relaxed whitespace-pre-line shadow-sm">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex justify-start">
                      <div className="max-w-[85%] space-y-2">
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl rounded-bl-md px-4 py-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="h-4 w-4 rounded-full bg-[#FF6B00] text-white flex items-center justify-center text-[8px] font-bold">IA</div>
                            <span className="text-[10px] font-bold text-slate-500">Fer (bot)</span>
                          </div>
                          <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">{m.content}</p>
                        </div>

                        {/* Indicador de media (compacto) */}
                        {m.mediaInfo && (m.mediaInfo.willSendImage || m.mediaInfo.willSendVideo) && (
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                            m.mediaInfo.willSendVideo
                              ? 'bg-purple-50 border-purple-200 text-purple-800'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          }`}>
                            {m.mediaInfo.willSendVideo ? <Video size={12} /> : <ImageIcon size={12} />}
                            {m.mediaInfo.willSendVideo ? '🎬 Enviará video' : `📸 Enviará ${m.mediaInfo.images?.length || 1} foto(s)`}
                          </div>
                        )}
                        {m.mediaInfo && m.mediaInfo.images && m.mediaInfo.images.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {m.mediaInfo.images.slice(0, 4).map((img, idx) => (
                              <img
                                key={idx}
                                src={img.url}
                                alt={img.desc || 'Foto'}
                                className="h-11 w-11 object-cover rounded-lg border border-slate-200 bg-white"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ))}
                          </div>
                        )}

                        {/* Reglas aplicadas (compacto) */}
                        {m.appliedRules && m.appliedRules.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {m.appliedRules.slice(0, 3).map((r, idx) => (
                              <span key={idx} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100" title={r.rule}>
                                📘 {r.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                ))
              )}
              {simLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-xs text-slate-400">
                    <RefreshCw size={13} className="animate-spin" /> Fer está escribiendo…
                  </div>
                </div>
              )}
            </div>

            {/* Barra de correción + input */}
            {chatMessages.length > 0 && (
              <div className="px-6 pt-2 flex justify-end">
                <button
                  onClick={() => {
                    setFormData({
                      type: 'prohibido',
                      title: `Corrección para: "${lastClientQuestion.slice(0, 30)}..."`,
                      rule: `PROHIBIDO dar la respuesta anterior. La respuesta correcta debe ser: ...`,
                      example_question: lastClientQuestion,
                      example_response: '',
                      status: 'approved'
                    });
                    setEditingRule(null);
                    setModalOpen(true);
                  }}
                  className="text-[10px] font-bold text-[#FF6B00] hover:underline flex items-center gap-1"
                >
                  <span>Corregir la última respuesta</span>
                  <ArrowRight size={11} />
                </button>
              </div>
            )}
            <form onSubmit={handleSendChat} className="border-t border-slate-100 p-4 flex items-end gap-2">
              <textarea
                rows={1}
                value={simInput}
                onChange={(e) => setSimInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(e); } }}
                placeholder="Escribí como cliente…  (Enter para enviar, Shift+Enter para salto de línea)"
                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-all resize-none max-h-32"
              />
              <button
                type="submit"
                disabled={simLoading || !simInput.trim()}
                className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                title="Enviar"
              >
                {simLoading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab Content: Rules List (Pending & Approved) */}
      {activeTab !== 'simulator' && (
        <div className="space-y-4">
          {filteredRules.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <BookOpen size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {activeTab === 'pending' ? 'No hay sugerencias pendientes' : 'No hay reglas con este filtro'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {activeTab === 'pending'
                  ? 'Presioná el botón "Escanear Conversaciones con IA" para que el sistema busque nuevas lecciones en los chats recientes.'
                  : 'Podés crear una nueva regla manual con el botón superior o aprobar sugerencias de la IA.'}
              </p>
              {activeTab === 'pending' && (
                <button
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing}
                  className="mt-2 inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Escanear Ahora</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`bg-white rounded-3xl p-6 border transition-all flex flex-col justify-between space-y-5 shadow-xs hover:shadow-md ${
                    rule.status === 'pending'
                      ? 'border-amber-300 ring-2 ring-amber-400/20 bg-amber-50/10'
                      : rule.type === 'prohibido'
                      ? 'border-rose-200/90 hover:border-rose-300'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header: Badge & Status */}
                    <div className="flex items-center justify-between gap-2">
                      {getTypeBadge(rule.type)}
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        rule.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : rule.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {rule.status === 'approved' ? '✅ Activa en vivo' : rule.status === 'pending' ? '⏳ Sugerencia Pendiente' : '⏸️ Pausada'}
                      </span>
                    </div>

                    {/* Título */}
                    <div>
                      <h4 className="text-base font-black text-slate-900 leading-snug">{rule.title}</h4>
                    </div>

                    {/* BLOQUE 1: 🎯 ¿QUÉ APRENDIÓ LA IA? */}
                    {(rule.what_learned || rule.source_context) && (
                      <div className="p-3.5 bg-blue-50/70 border border-blue-100/90 rounded-2xl space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-700">
                          <span>🎯</span> ¿Qué aprendió la IA en esta situación?
                        </div>
                        <p className="text-xs text-blue-950 font-medium leading-relaxed">
                          {rule.what_learned || rule.source_context}
                        </p>
                      </div>
                    )}

                    {/* BLOQUE 2: ⛔ QUÉ NO DEBE DECIR */}
                    {(rule.what_not_to_say || rule.type === 'prohibido') && (
                      <div className="p-3.5 bg-rose-50/80 border border-rose-200/80 rounded-2xl space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-700">
                          <ShieldAlert size={13} /> ⛔ Lo que NO debe decir (Regla Prohibida):
                        </div>
                        <p className="text-xs text-rose-950 font-bold leading-relaxed">
                          {rule.what_not_to_say || rule.rule}
                        </p>
                      </div>
                    )}

                    {/* BLOQUE 3: ✨ QUÉ SÍ DEBE RESPONDER / NUEVO PROMPT */}
                    {(rule.prompt_instruction || rule.type !== 'prohibido') && (
                      <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                          <Sparkles size={13} /> ✨ Nuevo Prompt / Lo que SÍ debe responder:
                        </div>
                        <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                          {rule.prompt_instruction || rule.rule}
                        </p>
                      </div>
                    )}

                    {/* BLOQUE 4: 💬 PREGUNTA Y RESPUESTA DE EJEMPLO */}
                    {(rule.example_question || rule.example_response) && (
                      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          💬 Ejemplo en Chat:
                        </span>
                        {rule.example_question && (
                          <div className="flex items-start gap-2 text-xs">
                            <span className="font-bold text-slate-400 shrink-0">👤 Cliente:</span>
                            <span className="italic text-slate-700 font-medium">"{rule.example_question}"</span>
                          </div>
                        )}
                        {rule.example_response && (
                          <div className="flex items-start gap-2 text-xs">
                            <span className="font-bold text-[#FF6B00] shrink-0">🤖 Bot / Asesor:</span>
                            <span className="text-slate-900 font-semibold">"{rule.example_response}"</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Contexto de origen */}
                    {rule.source_context && !rule.what_learned && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-100">
                        <BookOpen size={11} className="text-slate-400 shrink-0" />
                        <span className="truncate">{rule.source_context}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEditModal(rule)}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        title="Editar regla"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => onDeleteRule?.(rule.id)}
                        className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Eliminar regla"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      {rule.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => onRejectRule?.(rule.id)}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-bold text-xs rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
                          >
                            <X size={14} />
                            <span>Descartar</span>
                          </button>
                          <button
                            onClick={() => onApproveRule?.(rule.id)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Check size={14} />
                            <span>Aprobar Regla</span>
                          </button>
                        </>
                      ) : rule.status === 'approved' ? (
                        <button
                          onClick={() => onRejectRule?.(rule.id)}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          Pausar
                        </button>
                      ) : (
                        <button
                          onClick={() => onApproveRule?.(rule.id)}
                          className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          Reactivar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Crear / Editar Regla Estructurada */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-scaleUp space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-orange-100 text-[#FF6B00] rounded-2xl">
                  <GraduationCap size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingRule ? 'Editar Regla de Aprendizaje' : 'Nueva Regla de Aprendizaje IA'}
                  </h3>
                  <p className="text-xs text-slate-400">Estructura qué aprendió el bot, qué tiene prohibido decir y el nuevo prompt.</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* 1. Tipo de Regla */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  1. Tipo de Regla:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'permitido', label: '✅ Permitido', desc: 'Guía de respuesta' },
                    { id: 'prohibido', label: '⛔ Prohibido', desc: 'Qué NO decir' },
                    { id: 'objecion',  label: '🎯 Objeción',  desc: 'Precios / Descuentos' },
                    { id: 'faq',       label: '💡 FAQ',       desc: 'Pregunta fija' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: t.id })}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        formData.type === t.id
                          ? 'border-[#FF6B00] bg-orange-50/50 text-slate-900 ring-2 ring-orange-200'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-bold text-xs">{t.label}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Título */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  2. Título o Tema del Aprendizaje:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Aclarar precio por unidad vs par en mesas de noche"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              {/* 3. ¿Qué aprendió la IA? */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-blue-700 mb-1 flex items-center gap-1">
                  <span>🎯</span> 3. ¿Qué aprendió la IA en esta situación? (Contexto o error detectado):
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Los clientes confunden la foto doble y asumen que Q550 es el precio por las dos mesas."
                  value={formData.what_learned}
                  onChange={(e) => setFormData({ ...formData, what_learned: e.target.value })}
                  className="w-full p-3 bg-blue-50/30 border border-blue-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* 4. ¿Qué NO debe decir? (Regla Prohibida) */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-rose-700 mb-1 flex items-center gap-1">
                  <ShieldAlert size={12} /> 4. ¿Qué NO debe decir el Bot? (Regla Prohibida):
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: PROHIBIDO decir que Q550 es el par. NO omitir el precio del par cuando pregunten por dos unidades."
                  value={formData.what_not_to_say}
                  onChange={(e) => setFormData({ ...formData, what_not_to_say: e.target.value })}
                  className="w-full p-3 bg-rose-50/30 border border-rose-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              {/* 5. ¿Qué SÍ debe responder? (Nuevo Prompt) */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1 flex items-center gap-1">
                  <Sparkles size={12} /> 5. ¿Qué SÍ debe responder? (Nuevo Prompt / Instrucción exacta):
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Aclarar siempre: 'El precio es de Q550 por unidad (1 mesita); si deseas el par completo te queda en Q1,100 con envío gratis.'"
                  value={formData.prompt_instruction}
                  onChange={(e) => setFormData({ ...formData, prompt_instruction: e.target.value })}
                  className="w-full p-3 bg-emerald-50/30 border border-emerald-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* 6. Ejemplo en Chat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    6. Pregunta de Ejemplo del Cliente:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: ¿El precio de Q550 es por las dos mesas?"
                    value={formData.example_question}
                    onChange={(e) => setFormData({ ...formData, example_question: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    7. Respuesta Modelo del Bot:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: El precio es Q550 por unidad; el par le queda en Q1,100."
                    value={formData.example_response}
                    onChange={(e) => setFormData({ ...formData, example_response: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e56000] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
                >
                  {editingRule ? 'Guardar Cambios' : 'Crear Regla de Aprendizaje'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
