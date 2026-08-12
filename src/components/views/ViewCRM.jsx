import { useState, useMemo } from 'react';
import {
  Search, X, UserCircle, Phone, Pencil, Trash2, Archive,
  Power, Database, MessageSquare, Tag, Bot, AlertTriangle,
  Flame, CheckCircle2, Clock, Sparkles, Send, ArrowRight,
  Filter, MessageCircle
} from 'lucide-react';

function ClientSidebarPanel({
  lead,
  onClose,
  onToggleBot,
  onArchive,
  onDeleteMessages,
  onEditLead,
  onOpenConversation
}) {
  if (!lead) return null;

  const needsAttention = lead.priority === 'urgent' || !lead.botActive || lead.estado === 'Intervención Requerida' || !!lead.handoff_reason;

  return (
    <div className="w-84 md:w-96 border-l border-slate-100 bg-white flex flex-col shrink-0 animate-in slide-in-from-right duration-500 overflow-y-auto no-scrollbar shadow-2xl z-20">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
        <div>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest italic">Ficha del Lead</h3>
          <p className="text-[10px] font-bold text-slate-400">Detalles & Accesos Rápidos</p>
        </div>
        <button onClick={onClose} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-slate-600 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Header Lead Profile */}
        <div className="text-center bg-slate-50/70 p-6 rounded-3xl border border-slate-100">
          <div className="relative inline-block mb-3">
            <div className={`h-20 w-20 rounded-[28px] flex items-center justify-center font-black text-2xl mx-auto border-4 border-white shadow-xl ${
              lead.priority === 'urgent'
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-slate-900 text-[#FF6B00]'
            }`}>
              {lead.priority === 'urgent' ? '!' : (lead.nombre?.[0] || '?')}
            </div>
            {needsAttention && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md animate-bounce">
                !
              </span>
            )}
          </div>
          <h4 className="text-lg font-black text-slate-800 leading-tight mb-1">{lead.nombre}</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center space-x-2">
            <span className={`h-2 w-2 rounded-full ${lead.botActive ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
            <span>{lead.botActive ? 'IA Gestionando' : 'Control Humano / Manual'}</span>
          </p>

          {/* Botón directo para ir a la conversación */}
          <button
            onClick={() => onOpenConversation && onOpenConversation(lead.id)}
            className="mt-4 w-full py-3 px-4 bg-[#FF6B00] hover:bg-[#e05e00] text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-orange-200 transition-all active:scale-95 group"
          >
            <MessageSquare size={16} className="group-hover:scale-110 transition-transform" />
            <span>Abrir Chat Directo</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Alerta si requiere hablarle */}
        {needsAttention && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-1">
            <div className="flex items-center space-x-2 text-red-700 font-black text-[11px] uppercase tracking-wider">
              <AlertTriangle size={14} className="animate-bounce" />
              <span>Requiere que le hables</span>
            </div>
            <p className="text-[11px] text-red-600 font-medium leading-snug">
              {lead.handoff_reason || (lead.priority === 'urgent' ? 'Lead marcado como urgente para atención humana.' : 'El bot está apagado. Responder manualmente.')}
            </p>
          </div>
        )}

        {/* Score e IA Toggle */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Score IA</p>
            <p className="text-xl font-black text-slate-800 italic">{lead.score || 0}%</p>
          </div>
          <button
            onClick={() => onToggleBot(lead.id, !lead.botActive)}
            className={`p-4 rounded-2xl border flex flex-col items-center justify-center transition-all ${
              lead.botActive
                ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'
                : 'bg-amber-50 border-amber-100 text-amber-600 hover:bg-amber-100'
            }`}
          >
            <p className="text-[9px] font-black uppercase mb-1">Modo Asistente</p>
            <div className="flex items-center space-x-1">
              <Power size={12} />
              <p className="text-[10px] font-black uppercase">{lead.botActive ? 'IA ACTIVA' : 'MANUAL'}</p>
            </div>
          </button>
        </div>

        {/* Datos Capturados */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Datos Capturados</label>
            <span className="text-[9px] font-bold text-slate-400">Extracción Automática</span>
          </div>
          <div className="space-y-2 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
            {[
              { l: 'Zona / Lugar', v: lead.zona, i: Database },
              { l: 'Dirección', v: lead.direccion, i: Database },
              { l: 'Motor / Producto', v: lead.motor, i: Tag },
              { l: 'Falla / Necesidad', v: lead.falla, i: Tag },
              { l: 'NIT / Factura', v: lead.nit, i: Tag },
              { l: 'Email', v: lead.email, i: MessageSquare },
              { l: 'Notas', v: lead.notas, i: Pencil }
            ].map((d, i) => (
              <div key={i} className="flex flex-col space-y-1 p-2 rounded-xl bg-white border border-slate-100 group">
                <div className="flex items-center space-x-2">
                  <d.i size={12} className="text-slate-300 group-hover:text-[#FF6B00] transition-colors" />
                  <span className="text-[9px] font-black text-slate-400 uppercase">{d.l}</span>
                </div>
                <span className="text-[11px] font-bold text-slate-800 truncate pl-5">
                  {(d.v && d.v !== 'N/A') ? d.v : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Etiquetas */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Etiquetas</label>
          <div className="flex flex-wrap gap-1.5">
            {(lead.etiquetas || '').split(',').filter(e => e.trim()).map((tag, i) => (
              <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-slate-200">
                {tag.trim()}
              </span>
            ))}
            <button
              onClick={() => onEditLead(lead)}
              className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-emerald-100 hover:bg-emerald-100 transition-all"
            >
              + Gestionar
            </button>
          </div>
        </div>

        {/* Info adicional */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-bold text-slate-400 uppercase">WhatsApp ID:</span>
            <span className="font-black text-slate-700">{lead.whatsapp_id || lead.phone || '—'}</span>
          </div>
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-bold text-slate-400 uppercase">Registrado:</span>
            <span className="font-black text-slate-700">{lead.time || lead.timestamp || '—'}</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="space-y-2.5 pt-4 border-t border-slate-100">
          <button
            onClick={() => onArchive(lead.id, lead.archived)}
            className="w-full py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 shadow-md hover:bg-black transition-all active:scale-95"
          >
            <Archive size={14} className="text-amber-400" />
            <span>{lead.archived ? 'Restaurar Lead' : 'Archivar conversación'}</span>
          </button>
          <button
            onClick={() => onDeleteMessages(lead.id)}
            className="w-full py-3 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 border border-red-100 hover:bg-red-100 transition-all active:scale-95"
          >
            <Trash2 size={14} />
            <span>Eliminar conversación</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ViewCRM({
  leads = [],
  onUpdateLead,
  onToggleBot,
  onArchive,
  onDeleteMessages,
  onOpenConversation
}) {
  const [sidebarLeadId, setSidebarLeadId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'attention' | 'with_data' | 'bot' | 'sales'
  const [searchQuery, setSearchQuery] = useState('');

  const sidebarLead = leads.find(l => l.id === sidebarLeadId);

  // Calificado = con datos capturados
  const tieneDatos = (l) => [l.zona, l.direccion, l.motor, l.falla, l.nit].some(v => v && v !== 'N/A' && String(v).trim());

  // Requiere atención = Urgente, Bot apagado, o Estado Intervención / Handoff
  const needsAttention = (l) => l.priority === 'urgent' || !l.botActive || l.estado === 'Intervención Requerida' || !!l.handoff_reason;

  // Conteos
  const attentionCount = useMemo(() => leads.filter(l => !l.archived && needsAttention(l)).length, [leads]);
  const withDataCount = useMemo(() => leads.filter(l => !l.archived && tieneDatos(l)).length, [leads]);
  const botCount = useMemo(() => leads.filter(l => !l.archived && l.botActive && l.priority !== 'urgent').length, [leads]);
  const salesCount = useMemo(() => leads.filter(l => !l.archived && (l.estado === 'Venta' || l.estado === 'Interesado' || l.estado === 'Cita Agendada')).length, [leads]);
  const totalCount = useMemo(() => leads.filter(l => !l.archived).length, [leads]);

  // Filtrado de leads
  const visibleLeads = useMemo(() => {
    return leads.filter(lead => {
      if (lead.archived) return false;

      // Filtro por tab
      if (filterTab === 'attention' && !needsAttention(lead)) return false;
      if (filterTab === 'with_data' && !tieneDatos(lead)) return false;
      if (filterTab === 'bot' && (!lead.botActive || lead.priority === 'urgent')) return false;
      if (filterTab === 'sales' && !(lead.estado === 'Venta' || lead.estado === 'Interesado' || lead.estado === 'Cita Agendada')) return false;

      // Filtro por búsqueda de texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (lead.nombre || '').toLowerCase().includes(q);
        const matchPhone = (lead.phone || '').toLowerCase().includes(q) || (lead.whatsapp_id || '').toLowerCase().includes(q);
        const matchMsg = (lead.lastMessage || '').toLowerCase().includes(q);
        const matchMotor = (lead.motor || '').toLowerCase().includes(q);
        const matchZona = (lead.zona || '').toLowerCase().includes(q);
        const matchTags = (lead.etiquetas || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchMsg && !matchMotor && !matchZona && !matchTags) {
          return false;
        }
      }

      return true;
    });
  }, [leads, filterTab, searchQuery]);

  const handleSave = () => {
    onUpdateLead(editingLead);
    setEditingLead(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header & KPI Summary Cards */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic leading-none">Leads</h2>
              <span className="px-3 py-1 bg-slate-900 text-[#FF6B00] rounded-full text-xs font-black tracking-widest shadow-sm">
                {totalCount} Total
              </span>
            </div>
            <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mt-1.5 italic">
              Monitorea a quiénes debes hablarles y accede directamente al chat
            </p>
          </div>

          {/* Quick Search */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, teléfono, mensaje..."
                className="pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs outline-none w-72 md:w-80 shadow-sm focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-100 transition-all italic font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {sidebarLeadId && (
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className={`p-2.5 rounded-2xl border transition-all ${
                  showSidebar
                    ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-lg shadow-orange-100'
                    : 'bg-white text-slate-400 border-slate-200 shadow-sm hover:text-slate-700'
                }`}
                title="Ver detalle del lead seleccionado"
              >
                <UserCircle size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Tarjetas KPI de Estado Rápido / Filtros Interactivos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {/* Card 1: Por hablarles / Requieren atención */}
          <button
            onClick={() => setFilterTab(filterTab === 'attention' ? 'all' : 'attention')}
            className={`p-4 rounded-3xl border text-left transition-all relative overflow-hidden group ${
              filterTab === 'attention'
                ? 'bg-red-500 text-white border-red-500 shadow-xl shadow-red-200 scale-[1.02]'
                : attentionCount > 0
                ? 'bg-white border-red-200 hover:border-red-400 shadow-sm hover:shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                filterTab === 'attention' ? 'text-red-100' : 'text-red-500'
              }`}>
                ⚠️ Por Hablarles
              </span>
              <div className={`p-1.5 rounded-xl ${
                filterTab === 'attention' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-500'
              }`}>
                <AlertTriangle size={16} className={attentionCount > 0 ? 'animate-bounce' : ''} />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-black tracking-tight ${
                filterTab === 'attention' ? 'text-white' : 'text-red-600'
              }`}>
                {attentionCount}
              </span>
              <span className={`text-[10px] font-bold ${
                filterTab === 'attention' ? 'text-red-100' : 'text-slate-400'
              }`}>
                requieren atención
              </span>
            </div>
            {attentionCount > 0 && filterTab !== 'attention' && (
              <span className="inline-block mt-2 text-[9px] font-black text-red-600 uppercase tracking-tight underline">
                Ver lista prioritaria →
              </span>
            )}
          </button>

          {/* Card 2: Con datos capturados */}
          <button
            onClick={() => setFilterTab(filterTab === 'with_data' ? 'all' : 'with_data')}
            className={`p-4 rounded-3xl border text-left transition-all relative overflow-hidden ${
              filterTab === 'with_data'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-200 scale-[1.02]'
                : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                filterTab === 'with_data' ? 'text-indigo-100' : 'text-slate-400'
              }`}>
                📋 Con Datos
              </span>
              <div className={`p-1.5 rounded-xl ${
                filterTab === 'with_data' ? 'bg-indigo-700 text-white' : 'bg-indigo-50 text-indigo-600'
              }`}>
                <Database size={16} />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-black tracking-tight ${
                filterTab === 'with_data' ? 'text-white' : 'text-slate-800'
              }`}>
                {withDataCount}
              </span>
              <span className={`text-[10px] font-bold ${
                filterTab === 'with_data' ? 'text-indigo-100' : 'text-slate-400'
              }`}>
                leads calificados
              </span>
            </div>
          </button>

          {/* Card 3: En Gestión IA */}
          <button
            onClick={() => setFilterTab(filterTab === 'bot' ? 'all' : 'bot')}
            className={`p-4 rounded-3xl border text-left transition-all relative overflow-hidden ${
              filterTab === 'bot'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl shadow-emerald-200 scale-[1.02]'
                : 'bg-white border-slate-200 hover:border-emerald-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                filterTab === 'bot' ? 'text-emerald-100' : 'text-slate-400'
              }`}>
                🤖 En Gestión IA
              </span>
              <div className={`p-1.5 rounded-xl ${
                filterTab === 'bot' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <Bot size={16} />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-black tracking-tight ${
                filterTab === 'bot' ? 'text-white' : 'text-slate-800'
              }`}>
                {botCount}
              </span>
              <span className={`text-[10px] font-bold ${
                filterTab === 'bot' ? 'text-emerald-100' : 'text-slate-400'
              }`}>
                respondiendo auto
              </span>
            </div>
          </button>

          {/* Card 4: Interesados / Ventas */}
          <button
            onClick={() => setFilterTab(filterTab === 'sales' ? 'all' : 'sales')}
            className={`p-4 rounded-3xl border text-left transition-all relative overflow-hidden ${
              filterTab === 'sales'
                ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-xl shadow-orange-200 scale-[1.02]'
                : 'bg-white border-slate-200 hover:border-orange-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                filterTab === 'sales' ? 'text-orange-100' : 'text-slate-400'
              }`}>
                ⭐ Ventas / Oportunidades
              </span>
              <div className={`p-1.5 rounded-xl ${
                filterTab === 'sales' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-[#FF6B00]'
              }`}>
                <Flame size={16} />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-black tracking-tight ${
                filterTab === 'sales' ? 'text-white' : 'text-slate-800'
              }`}>
                {salesCount}
              </span>
              <span className={`text-[10px] font-bold ${
                filterTab === 'sales' ? 'text-orange-100' : 'text-slate-400'
              }`}>
                alta conversión
              </span>
            </div>
          </button>
        </div>

        {/* Barra de Filtros secundarios */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1 flex items-center gap-1">
            <Filter size={12} /> Filtro:
          </span>

          {[
            { id: 'all', label: `Todos (${totalCount})` },
            { id: 'attention', label: `🚨 Por Hablarles (${attentionCount})`, alert: attentionCount > 0 },
            { id: 'with_data', label: `📋 Con Datos (${withDataCount})` },
            { id: 'bot', label: `🤖 En IA (${botCount})` },
            { id: 'sales', label: `⭐ Oportunidades (${salesCount})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filterTab === tab.id
                  ? 'bg-slate-900 text-[#FF6B00] shadow-md shadow-slate-200'
                  : tab.alert
                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {filterTab !== 'all' && (
            <button
              onClick={() => setFilterTab('all')}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline ml-2"
            >
              Restablecer
            </button>
          )}

          <div className="ml-auto text-[10px] font-bold text-slate-400">
            Mostrando <span className="text-slate-800 font-black">{visibleLeads.length}</span> leads
          </div>
        </div>
      </div>

      {/* Main Content: Table + Sidebar */}
      <div className="flex space-x-6 items-start">
        <div className="flex-1 bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-5">LEAD / CLIENTE</th>
                <th className="px-5 py-5">ATENCIÓN & ESTADO</th>
                <th className="px-5 py-5">DATOS CAPTURADOS</th>
                <th className="px-4 py-5">SCORE IA</th>
                <th className="px-6 py-5 text-right">ACCIONES RÁPIDAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100">
                        <UserCircle size={28} />
                      </div>
                      <p className="text-sm font-bold text-slate-600">No se encontraron leads con este criterio</p>
                      <p className="text-xs text-slate-400">Prueba cambiando el filtro o la búsqueda.</p>
                      {filterTab !== 'all' && (
                        <button
                          onClick={() => { setFilterTab('all'); setSearchQuery(''); }}
                          className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                        >
                          Ver todos los leads
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                visibleLeads.map(lead => {
                  const leadNeedsAttention = needsAttention(lead);
                  const isSelected = sidebarLeadId === lead.id && showSidebar;

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => { setSidebarLeadId(lead.id); setShowSidebar(true); }}
                      className={`hover:bg-slate-50/90 transition-all group cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50/40 border-l-4 border-[#FF6B00]'
                          : leadNeedsAttention
                          ? 'bg-red-50/30'
                          : ''
                      }`}
                    >
                      {/* Columna: Lead / Contacto */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3.5">
                          <div className="relative shrink-0">
                            <div className={`h-11 w-11 rounded-[16px] flex items-center justify-center font-black text-xs shadow-sm ${
                              lead.priority === 'urgent'
                                ? 'bg-red-600 text-white animate-pulse'
                                : !lead.botActive
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-900 text-[#FF6B00]'
                            }`}>
                              {lead.priority === 'urgent' ? '!' : (lead.nombre?.[0] || '?')}
                            </div>
                            {leadNeedsAttention && (
                              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white animate-ping" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-[240px]">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-black text-slate-800 leading-none group-hover:text-[#FF6B00] transition-colors truncate">
                                {lead.nombre}
                              </p>
                              {lead.priority === 'urgent' && (
                                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-md uppercase">
                                  Urgente
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-400 mt-1">
                              <Phone size={10} className="text-slate-300 shrink-0" />
                              <span className="truncate">{lead.phone || lead.whatsapp_id || 'Sin teléfono'}</span>
                            </div>
                            {/* Vista previa del último mensaje */}
                            {lead.lastMessage && (
                              <p className="text-[11px] text-slate-500 truncate mt-1 italic font-medium leading-tight">
                                "{lead.lastMessage}"
                              </p>
                            )}
                            {lead.handoff_reason && (
                              <p className="text-[10px] text-red-600 font-bold italic truncate mt-0.5">
                                ⚠️ {lead.handoff_reason}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Columna: Atención & Estado */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col space-y-1.5">
                          {/* Badge de necesidad de intervención */}
                          {leadNeedsAttention ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500 text-white shadow-sm w-fit animate-pulse">
                              <AlertTriangle size={10} />
                              <span>Requiere Hablarle</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
                              <Bot size={10} />
                              <span>IA Activa</span>
                            </span>
                          )}

                          {/* Badge de Estado del Embudo */}
                          <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider w-fit border ${
                            lead.estado === 'Venta' ? 'bg-emerald-500 text-white border-emerald-500' :
                            lead.estado === 'Cita Agendada' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            lead.estado === 'Interesado' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            lead.estado === 'Post-Venta' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                            lead.estado === 'Perdido' ? 'bg-slate-50 text-slate-400 border-slate-100' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {lead.estado || 'Nuevo'}
                          </span>
                        </div>
                      </td>

                      {/* Columna: Datos Capturados */}
                      <td className="px-5 py-4">
                        <div className="max-w-[200px] space-y-1">
                          {tieneDatos(lead) ? (
                            <div className="flex flex-wrap gap-1">
                              {lead.motor && lead.motor !== 'N/A' && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-bold rounded-md truncate max-w-[180px]">
                                  🔧 {lead.motor}
                                </span>
                              )}
                              {lead.zona && lead.zona !== 'N/A' && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-bold rounded-md truncate max-w-[180px]">
                                  📍 {lead.zona}
                                </span>
                              )}
                              {lead.nit && lead.nit !== 'N/A' && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-bold rounded-md">
                                  📄 NIT: {lead.nit}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-300 italic">
                              Sin datos aún
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Columna: Score IA */}
                      <td className="px-4 py-4">
                        <div className="w-24 space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-black text-slate-700">
                            <span>{lead.score || 0}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-700 ${
                                (lead.score || 0) >= 70 ? 'bg-emerald-500' :
                                (lead.score || 0) >= 40 ? 'bg-amber-500' : 'bg-slate-300'
                              }`}
                              style={{ width: `${lead.score || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Columna: Acciones Rápidas */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* BOTÓN PRINCIPAL: ABRIR CHAT DIRECTO */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenConversation) onOpenConversation(lead.id);
                            }}
                            title="Abrir chat directo con este lead"
                            className="px-3.5 py-2 rounded-xl bg-slate-900 text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white font-black text-[10px] uppercase tracking-wider flex items-center space-x-1.5 shadow-sm transition-all active:scale-95 group/btn"
                          >
                            <MessageSquare size={13} className="group-hover/btn:scale-110 transition-transform" />
                            <span>Chat</span>
                          </button>

                          {/* Botón Editar */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingLead({ ...lead });
                            }}
                            title="Editar datos del lead"
                            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                          >
                            <Pencil size={13} />
                          </button>

                          {/* Botón Ver Ficha */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSidebarLeadId(lead.id);
                              setShowSidebar(true);
                            }}
                            title="Ver detalles"
                            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                          >
                            <UserCircle size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sidebar Panel lateral con datos y chat directo */}
        {showSidebar && sidebarLead && (
          <ClientSidebarPanel
            lead={sidebarLead}
            onClose={() => setShowSidebar(false)}
            onToggleBot={onToggleBot}
            onArchive={onArchive}
            onDeleteMessages={onDeleteMessages}
            onEditLead={(lead) => setEditingLead({ ...lead })}
            onOpenConversation={onOpenConversation}
          />
        )}
      </div>

      {/* Modal: Editar Lead */}
      {editingLead && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Gestionar Lead</h3>
                <p className="text-[10px] font-bold text-slate-400">Actualiza la información de contacto y estado</p>
              </div>
              <button onClick={() => setEditingLead(null)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Nombre Completo', key: 'nombre', type: 'text' },
                  { label: 'Teléfono / WhatsApp', key: 'phone', type: 'text' },
                  { label: 'Email', key: 'email', type: 'email' },
                ].map(({ label, key, type }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">{label}</label>
                    <input
                      type={type}
                      value={editingLead[key] || ''}
                      onChange={e => setEditingLead({ ...editingLead, [key]: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all"
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Estado del Lead</label>
                  <select
                    value={editingLead.estado || 'Nuevo'}
                    onChange={e => setEditingLead({ ...editingLead, estado: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all"
                  >
                    <option value="Nuevo">Nuevo</option>
                    <option value="Interesado">Interesado</option>
                    <option value="Cita Agendada">Cita Agendada</option>
                    <option value="Venta">Venta Cerrada</option>
                    <option value="Intervención Requerida">Intervención Requerida</option>
                    <option value="Post-Venta">Post-Venta</option>
                    <option value="Perdido">Perdido</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Etiquetas (separadas por coma)</label>
                <input
                  type="text"
                  value={editingLead.etiquetas || ''}
                  onChange={e => setEditingLead({ ...editingLead, etiquetas: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all"
                  placeholder="Interesado, Urgente, Motor BFT..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'NIT / Datos Factura', key: 'nit' },
                  { label: 'Dirección / Zona', key: 'direccion' },
                  { label: 'Motor / Producto', key: 'motor' },
                  { label: 'Falla / Necesidad', key: 'falla' },
                ].map(({ label, key }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">{label}</label>
                    <input
                      type="text"
                      value={editingLead[key] || ''}
                      onChange={e => setEditingLead({ ...editingLead, [key]: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Notas Internas</label>
                <textarea
                  rows={3}
                  value={editingLead.notas || ''}
                  onChange={e => setEditingLead({ ...editingLead, notas: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium leading-relaxed outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all resize-none italic"
                  placeholder="Notas sobre el cliente o seguimiento..."
                />
              </div>

              {/* Toggle de Bot */}
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center space-x-3">
                  <Bot size={22} className={editingLead.botActive ? 'text-emerald-500' : 'text-slate-400'} />
                  <div>
                    <p className="text-[10px] font-black text-slate-800 uppercase italic">Asistente IA para este Lead</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">
                      {editingLead.botActive ? 'IA responde automáticamente' : 'Modo manual (el humano debe responder)'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingLead({ ...editingLead, botActive: editingLead.botActive ? 0 : 1 })}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    editingLead.botActive
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {editingLead.botActive ? 'IA Activada' : 'Modo Manual'}
                </button>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="w-1/3 py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="w-2/3 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-[#FF6B00] transition-all active:scale-95"
                >
                  Guardar Datos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
