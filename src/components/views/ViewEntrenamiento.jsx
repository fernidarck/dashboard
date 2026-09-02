import { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap, Sparkles, Check, X, Edit3, Trash2, AlertCircle,
  Plus, ShieldAlert, CheckCircle2, MessageSquare, HelpCircle,
  Search, RefreshCw, Send, ArrowRight, Zap, BookOpen, Layers,
  Sliders, ExternalLink, ThumbsUp, ThumbsDown
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
  onTestPrompt
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
    rule: '',
    example_question: '',
    example_response: '',
    status: 'approved'
  });

  // Simulator State
  const [simQuestion, setSimQuestion] = useState('');
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    onFetchRules?.();
  }, [onFetchRules]);

  const handleOpenNewModal = () => {
    setEditingRule(null);
    setFormData({
      type: 'permitido',
      title: '',
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
      rule: rule.rule || '',
      example_question: rule.example_question || '',
      example_response: rule.example_response || '',
      status: rule.status || 'approved'
    });
    setModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.rule.trim()) return;

    if (editingRule) {
      await onUpdateRule?.(editingRule.id, formData);
    } else {
      await onSaveRule?.(formData);
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

  const handleRunSimulation = async (e) => {
    e?.preventDefault();
    if (!simQuestion.trim()) return;
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await onTestPrompt?.(simQuestion);
      setSimResult(res);
    } finally {
      setSimLoading(false);
    }
  };

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
            <span className="text-xs font-semibold text-amber-600">sugerencias</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Lecciones detectadas por la IA esperando tu aprobación.</p>
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
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">Reglas Prohibidas</span>
            <div className="p-2 rounded-xl bg-rose-100/80 text-rose-600"><ShieldAlert size={16} /></div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{trainingStats.prohibidas || 0}</span>
            <span className="text-xs font-semibold text-rose-600">activas</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Lo que el bot tiene estrictamente PROHIBIDO decir.</p>
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
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Guías Aprobadas</span>
            <div className="p-2 rounded-xl bg-emerald-100/80 text-emerald-600"><CheckCircle2 size={16} /></div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{trainingStats.permitidas || 0}</span>
            <span className="text-xs font-semibold text-emerald-600">activas</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Respuestas ideales y guías que el bot aplica en vivo.</p>
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
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-700">Simulador</span>
            <div className="p-2 rounded-xl bg-purple-100/80 text-purple-600"><Zap size={16} /></div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{approvedCount}</span>
            <span className="text-xs font-semibold text-purple-600">en vivo</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Probá cómo responde la IA aplicando las reglas.</p>
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
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-xl"><Zap size={18} /></div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Probador de Respuestas</h3>
                <p className="text-[11px] text-slate-400">Escribí como si fueras un cliente para evaluar la respuesta.</p>
              </div>
            </div>

            <form onSubmit={handleRunSimulation} className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  Mensaje del Cliente:
                </label>
                <textarea
                  rows={4}
                  value={simQuestion}
                  onChange={(e) => setSimQuestion(e.target.value)}
                  placeholder="Ej: Hola, ¿cuál es el precio de la mesa One Night? ¿Hacen descuento si compro dos?"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-all resize-none"
                />
              </div>

              {/* Sugerencias Rápidas */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  '¿Las mesas vienen armadas?',
                  '¿El precio de Q550 es por el par?',
                  '¿Tienen la mesa One Night?',
                  '¿Cuánto cobran de envío a Mixco?',
                  '¿Aceptan Visacuotas?'
                ].map((quick, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSimQuestion(quick)}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 transition-colors"
                  >
                    {quick}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={simLoading || !simQuestion.trim()}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {simLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                <span>{simLoading ? 'Simulando...' : 'Evaluar Respuesta'}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Resultado de la IA</span>
              {simResult && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">✅ Reglas Aplicadas</span>}
            </div>

            {simResult ? (
              <div className="space-y-4 animate-fadeIn">
                {/* Simulated Chat Balloon */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-full bg-[#FF6B00] text-white flex items-center justify-center text-[10px] font-bold">IA</div>
                    <span className="text-xs font-bold text-slate-800">Respuesta Generada del Bot:</span>
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed pl-8">
                    {simResult.reply}
                  </p>
                </div>

                {/* Applied Rules Summary */}
                {simResult.appliedRules && simResult.appliedRules.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-widest text-purple-700">Reglas Aprendidas que Influyeron:</span>
                    <div className="space-y-1.5">
                      {simResult.appliedRules.map((r, i) => (
                        <div key={i} className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl text-xs flex items-start gap-2">
                          <span className="text-purple-600 mt-0.5">•</span>
                          <div>
                            <p className="font-bold text-purple-900">{r.title}</p>
                            <p className="text-[11px] text-purple-700">{r.rule}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Feedback */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">¿No te gustó la respuesta? Creá una regla correctiva:</span>
                  <button
                    onClick={() => {
                      setFormData({
                        type: 'prohibido',
                        title: `Corrección para: "${simQuestion.slice(0, 30)}..."`,
                        rule: `PROHIBIDO dar la respuesta anterior. La respuesta correcta debe ser: ...`,
                        example_question: simQuestion,
                        example_response: '',
                        status: 'approved'
                      });
                      setEditingRule(null);
                      setModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-[#FF6B00] hover:underline flex items-center gap-1"
                  >
                    <span>Corregir esta respuesta</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <MessageSquare size={32} className="mx-auto text-slate-300 opacity-60" />
                <p className="text-xs font-semibold text-slate-500">Ingresá una pregunta en el probador para ver la respuesta simulada.</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">La simulación tiene en cuenta el catálogo RAG y todas las reglas aprobadas en tiempo real.</p>
              </div>
            )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between space-y-4 ${
                    rule.status === 'pending'
                      ? 'border-amber-200/80 shadow-sm ring-1 ring-amber-400/20'
                      : rule.type === 'prohibido'
                      ? 'border-rose-100 hover:border-rose-200'
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Badge and Status */}
                    <div className="flex items-center justify-between">
                      {getTypeBadge(rule.type)}
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        rule.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : rule.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {rule.status === 'approved' ? 'Activa en vivo' : rule.status === 'pending' ? 'Pendiente' : 'Descartada'}
                      </span>
                    </div>

                    {/* Title and Rule Description */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">{rule.title}</h4>
                      <p className="mt-1.5 text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        {rule.rule}
                      </p>
                    </div>

                    {/* Example Question / Response */}
                    {(rule.example_question || rule.example_response) && (
                      <div className="space-y-1.5 text-[11px]">
                        {rule.example_question && (
                          <div className="flex items-start gap-1.5 text-slate-600">
                            <span className="font-bold text-slate-400 shrink-0">❓ Cliente:</span>
                            <span className="italic text-slate-700">"{rule.example_question}"</span>
                          </div>
                        )}
                        {rule.example_response && (
                          <div className="flex items-start gap-1.5 text-slate-600">
                            <span className="font-bold text-emerald-600 shrink-0">💬 Respuesta:</span>
                            <span className="text-slate-800">"{rule.example_response}"</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Source Context */}
                    {rule.source_context && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-50">
                        <BookOpen size={11} className="text-slate-400" />
                        <span className="truncate">{rule.source_context}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEditModal(rule)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                        title="Editar regla"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => onDeleteRule?.(rule.id)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
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
                            className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-bold text-xs rounded-xl transition-colors flex items-center space-x-1 cursor-pointer"
                          >
                            <X size={14} />
                            <span>Descartar</span>
                          </button>
                          <button
                            onClick={() => onApproveRule?.(rule.id)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center space-x-1 cursor-pointer"
                          >
                            <Check size={14} />
                            <span>Aprobar</span>
                          </button>
                        </>
                      ) : rule.status === 'approved' ? (
                        <button
                          onClick={() => onRejectRule?.(rule.id)}
                          className="px-3 py-1 bg-slate-100 hover:bg-amber-50 text-slate-500 hover:text-amber-700 font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
                        >
                          Pausar
                        </button>
                      ) : (
                        <button
                          onClick={() => onApproveRule?.(rule.id)}
                          className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
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

      {/* Modal: Crear / Editar Regla */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-orange-50 text-[#FF6B00] rounded-xl">
                  <GraduationCap size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  {editingRule ? 'Editar Regla de Entrenamiento' : 'Nueva Regla de Entrenamiento'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Tipo de Regla:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'permitido', label: '✅ Permitido', desc: 'Guía de respuesta' },
                    { id: 'prohibido', label: '⛔ Prohibido', desc: 'Qué NO decir' },
                    { id: 'faq',       label: '💡 FAQ',       desc: 'Pregunta fija' },
                    { id: 'objecion',  label: '🎯 Objeción',  desc: 'Precio / Envíos' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: t.id })}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        formData.type === t.id
                          ? 'border-[#FF6B00] bg-orange-50/40 text-slate-900 ring-1 ring-[#FF6B00]'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-bold text-xs">{t.label}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Título / Tema:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Aclarar precio por unidad en mesas de noche"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Regla o Instrucción Exacta para el Bot:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={formData.type === 'prohibido' ? 'PROHIBIDO decir que... Siempre aclarar que...' : 'Cuando el cliente pregunte sobre X, responder siempre con...'}
                  value={formData.rule}
                  onChange={(e) => setFormData({ ...formData, rule: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Ejemplo de Consulta del Cliente (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: ¿Cuánto sale el par?"
                    value={formData.example_question}
                    onChange={(e) => setFormData({ ...formData, example_question: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Ejemplo de Respuesta Recomendada (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: El precio es Q550 por unidad; el par le queda en Q1,100."
                    value={formData.example_response}
                    onChange={(e) => setFormData({ ...formData, example_response: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF6B00] hover:bg-[#e56000] text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
                >
                  {editingRule ? 'Guardar Cambios' : 'Crear Regla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
