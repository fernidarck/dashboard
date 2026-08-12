import { useState, useMemo, useEffect } from 'react';
import {
  Search, X, UserCircle, Phone, Pencil, Trash2, Archive,
  Power, Database, MessageSquare, Tag, Bot, AlertTriangle,
  Flame, CheckCircle2, Clock, Sparkles, Send, ArrowRight,
  Filter, MessageCircle, ExternalLink, Zap, Check, CheckCheck,
  Copy, MapPin, Wrench
} from 'lucide-react';

function getCleanWhatsAppUrl(phone) {
  if (!phone) return null;
  let clean = String(phone).replace(/\D/g, '');
  if (clean.length === 8) clean = '502' + clean;
  return `https://wa.me/${clean}`;
}

function ClientSidebarPanel({
  lead,
  onClose,
  onToggleBot,
  onArchive,
  onDeleteMessages,
  onEditLead,
  onOpenConversation,
  onMarkFollowUp
}) {
  if (!lead) return null;

  const isFollowedUp = lead.estado === 'En Seguimiento' || lead.estado === 'Venta' || lead.estado === 'Cita Agendada' || lead.estado === 'Post-Venta';
  const needsAttention = !isFollowedUp && (lead.priority === 'urgent' || !lead.botActive || lead.estado === 'Intervención Requerida' || !!lead.handoff_reason);
  const waUrl = getCleanWhatsAppUrl(lead.phone || lead.whatsapp_id);

  return (
    <div className="w-84 md:w-96 border-l border-slate-100 bg-white flex flex-col shrink-0 animate-in slide-in-from-right duration-500 overflow-y-auto no-scrollbar shadow-2xl z-20">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
        <div>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest italic">Ficha del Lead</h3>
          <p className="text-[10px] font-bold text-slate-400">Detalles & Necesidad del Cliente</p>
        </div>
        <button onClick={onClose} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-slate-600 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Header Lead Profile */}
        <div className="text-center bg-slate-50/80 p-6 rounded-3xl border border-slate-100">
          <div className="relative inline-block mb-3">
            <div className={`h-20 w-20 rounded-[28px] flex items-center justify-center font-black text-2xl mx-auto border-4 border-white shadow-xl ${
              lead.priority === 'urgent' && !isFollowedUp
                ? 'bg-red-600 text-white animate-pulse'
                : isFollowedUp
                ? 'bg-blue-600 text-white'
                : !lead.botActive
                ? 'bg-amber-500 text-white'
                : 'bg-slate-900 text-[#FF6B00]'
            }`}>
              {lead.priority === 'urgent' && !isFollowedUp ? '!' : (lead.nombre?.[0] || '?')}
            </div>
            {needsAttention && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md animate-bounce">
                !
              </span>
            )}
            {isFollowedUp && (
              <span className="absolute -bottom-1 -right-1 h-6 w-6 bg-emerald-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md border-2 border-white">
                <Check size={12} />
              </span>
            )}
          </div>
          <h4 className="text-lg font-black text-slate-800 leading-tight mb-1">{lead.nombre}</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center space-x-2">
            <span className={`h-2 w-2 rounded-full ${lead.botActive ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
            <span>{lead.botActive ? 'IA Gestionando' : 'Control Humano / Manual'}</span>
          </p>

          {/* Botones de acción directa */}
          <div className="mt-4 space-y-2">
            {/* Botón para marcar seguimiento */}
            <button
              onClick={() => onMarkFollowUp(lead, lead.estado === 'En Seguimiento' ? 'Nuevo' : 'En Seguimiento')}
              className={`w-full py-2.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-sm border ${
                lead.estado === 'En Seguimiento'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-200 shadow-md'
              }`}
            >
              <CheckCheck size={16} />
              <span>{lead.estado === 'En Seguimiento' ? '✓ En Seguimiento (Cambiar)' : 'Marcar como Atendido'}</span>
            </button>

            <button
              onClick={() => onOpenConversation && onOpenConversation(lead.id)}
              className="w-full py-3 px-4 bg-[#FF6B00] hover:bg-[#e05e00] text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-orange-200 transition-all active:scale-95 group"
            >
              <MessageSquare size={16} className="group-hover:scale-110 transition-transform" />
              <span>Abrir Chat en OneControl</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>

            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center space-x-2 shadow-md transition-all active:scale-95"
              >
                <ExternalLink size={14} />
                <span>Abrir en WhatsApp</span>
              </a>
            )}
          </div>
        </div>

        {/* Resumen de Necesidad Capturada */}
        <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200 space-y-2">
          <div className="flex items-center space-x-2 text-[#FF6B00] font-black text-[11px] uppercase tracking-wider">
            <Sparkles size={14} />
            <span>¿Qué necesita este cliente?</span>
          </div>
          <div className="space-y-1.5 text-xs">
            {lead.motor && lead.motor !== 'N/A' && (
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <Tag size={13} className="text-[#FF6B00]" /> Motor: <span className="font-black text-orange-700">{lead.motor}</span>
              </p>
            )}
            {lead.zona && lead.zona !== 'N/A' && (
              <p className="font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-400" /> Ubicación: <span>{lead.zona}</span>
              </p>
            )}
            {lead.falla && lead.falla !== 'N/A' && (
              <p className="font-medium text-slate-600 flex items-center gap-1.5 italic">
                <Wrench size={13} className="text-slate-400" /> Detalle: {lead.falla}
              </p>
            )}
            {lead.lastMessage && (
              <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-xl border border-orange-100">
                "{lead.lastMessage}"
              </p>
            )}
          </div>
        </div>

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

        {/* Todos los Datos Capturados */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ficha Técnica Completa</label>
            <span className="text-[9px] font-bold text-slate-400">Datos Extraídos</span>
          </div>
          <div className="space-y-2 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
            {[
              { l: 'Motor / Producto', v: lead.motor, i: Tag, highlight: true },
              { l: 'Zona / Lugar', v: lead.zona, i: Database },
              { l: 'Dirección', v: lead.direccion, i: Database },
              { l: 'Falla / Necesidad', v: lead.falla, i: Tag },
              { l: 'NIT / Factura', v: lead.nit, i: Tag },
              { l: 'Email', v: lead.email, i: MessageSquare },
              { l: 'Notas', v: lead.notas, i: Pencil }
            ].map((d, i) => (
              <div key={i} className={`flex flex-col space-y-1 p-2 rounded-xl border ${d.highlight && d.v && d.v !== 'N/A' ? 'bg-orange-50/50 border-orange-100' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center space-x-2">
                  <d.i size={12} className={d.highlight && d.v && d.v !== 'N/A' ? 'text-[#FF6B00]' : 'text-slate-300'} />
                  <span className={`text-[9px] font-black uppercase ${d.highlight && d.v && d.v !== 'N/A' ? 'text-[#FF6B00]' : 'text-slate-400'}`}>{d.l}</span>
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

        {/* Acciones de administración */}
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
  const [searchQuery, setSearchQuery] = useState('');

  const sidebarLead = leads.find(l => l.id === sidebarLeadId);

  // Calificado = con datos capturados de producto/zona/falla/nit
  const tieneDatos = (l) => [l.zona, l.direccion, l.motor, l.falla, l.nit].some(v => v && v !== 'N/A' && String(v).trim());

  // ¿Ya se le dio seguimiento / está atendido / cerrado?
  const isFollowedUp = (l) => l.estado === 'En Seguimiento' || l.estado === 'Venta' || l.estado === 'Cita Agendada' || l.estado === 'Post-Venta';

  // 🎯 UNIFICADO: Por Hablarles (Clientes pendientes que piden ayuda O que ya tienen datos listos para cotizar)
  const isPorHablar = (l) => {
    if (isFollowedUp(l)) return false;
    // Si es urgente, pide intervención, o el bot está apagado, o ya tiene datos capturados
    return l.priority === 'urgent' || !l.botActive || l.estado === 'Intervención Requerida' || !!l.handoff_reason || tieneDatos(l);
  };

  // Conteos
  const porHablarCount = useMemo(() => leads.filter(l => !l.archived && isPorHablar(l)).length, [leads]);
  const followUpCount = useMemo(() => leads.filter(l => !l.archived && l.estado === 'En Seguimiento').length, [leads]);
  const botCount = useMemo(() => leads.filter(l => !l.archived && l.botActive && !isPorHablar(l)).length, [leads]);
  const salesCount = useMemo(() => leads.filter(l => !l.archived && (l.estado === 'Venta' || l.estado === 'Interesado' || l.estado === 'Cita Agendada')).length, [leads]);
  const totalCount = useMemo(() => leads.filter(l => !l.archived).length, [leads]);

  // Tab activo: por defecto empieza en 'por_hablar' (Urgentes + Con datos unificados)
  const [filterTab, setFilterTab] = useState(() => (leads.some(l => !l.archived && isPorHablar(l)) ? 'por_hablar' : 'all'));

  // Si cambian los leads y hay pendientes
  useEffect(() => {
    if (porHablarCount > 0 && filterTab === 'all' && !searchQuery) {
      setFilterTab('por_hablar');
    }
  }, [porHablarCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Acción rápida: Marcar como Atendido / En Seguimiento
  const handleMarkFollowUp = async (lead, targetEstado = 'En Seguimiento') => {
    const updated = {
      ...lead,
      estado: targetEstado,
      priority: targetEstado === 'Intervención Requerida' ? 'urgent' : 'normal',
      handoff_reason: targetEstado === 'Intervención Requerida' ? lead.handoff_reason : null
    };
    await onUpdateLead(updated);
  };

  // Peso de prioridad para ordenar:
  // 1º: Urgentes / Intervención requerida explícita (100)
  // 2º: Con datos capturados listos para cotizar motor/zona (90)
  // 3º: Modo manual sin atender (80)
  // 4º: En Seguimiento activo (60)
  // 5º: IA Activa general (20)
  const getLeadPriorityWeight = (l) => {
    if (isPorHablar(l)) {
      if (l.priority === 'urgent' || l.estado === 'Intervención Requerida' || !!l.handoff_reason) return 100;
      if (tieneDatos(l)) return 90; // ¡Con datos listos para cotizar primero!
      return 80; // Manual
    }
    if (l.estado === 'En Seguimiento') return 60;
    if (l.estado === 'Venta' || l.estado === 'Cita Agendada') return 50;
    if (l.botActive) return 20;
    return 0;
  };

  // Filtrado y ORDENAMIENTO inteligente
  const visibleLeads = useMemo(() => {
    const filtered = leads.filter(lead => {
      if (lead.archived) return false;

      // Filtro por tab unificado
      if (filterTab === 'por_hablar' && !isPorHablar(lead)) return false;
      if (filterTab === 'follow_up' && lead.estado !== 'En Seguimiento') return false;
      if (filterTab === 'bot' && (!lead.botActive || isPorHablar(lead))) return false;
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
        const matchEstado = (lead.estado || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchMsg && !matchMotor && !matchZona && !matchTags && !matchEstado) {
          return false;
        }
      }

      return true;
    });

    // Ordenar de mayor a menor prioridad (los que tienen datos y urgencias primero)
    return filtered.sort((a, b) => {
      const wA = getLeadPriorityWeight(a);
      const wB = getLeadPriorityWeight(b);
      if (wA !== wB) return wB - wA;
      // Desempate por ID o timestamp más reciente
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  }, [leads, filterTab, searchQuery]);

  const handleSave = () => {
    onUpdateLead(editingLead);
    setEditingLead(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Banner de Acción Inmediata: Por Hablarles (Con Datos & Urgentes Unificados) */}
      {porHablarCount > 0 && (
        <div className="bg-gradient-to-r from-red-500 via-orange-500 to-[#FF6B00] p-4 md:p-5 rounded-[28px] text-white shadow-xl shadow-orange-500/20 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in duration-500">
          <div className="flex items-center space-x-3 text-left">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <Zap size={24} className="text-white animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-black uppercase tracking-tight">
                🔥 {porHablarCount} {porHablarCount === 1 ? 'lead listo' : 'leads listos'} para enviar información o cotización
              </h3>
              <p className="text-xs text-white/90 font-medium">
                Aquí ves directamente el motor y la zona que necesitan. Chatea con ellos y márcalos como <span className="underline font-bold">"✓ Atendido"</span>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterTab('por_hablar')}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap shadow-md active:scale-95 ${
              filterTab === 'por_hablar'
                ? 'bg-white text-slate-900 shadow-white/30 ring-2 ring-white'
                : 'bg-slate-900 hover:bg-black text-[#FF6B00]'
            }`}
          >
            {filterTab === 'por_hablar' ? 'Viendo Lista Principal ✓' : 'Ver Lista Principal →'}
          </button>
        </div>
      )}

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
              Bandeja unificada con datos de motor y zona · Envía información al instante
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
                placeholder="Buscar por nombre, teléfono, motor, zona..."
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
          {/* Card 1: UNIFICADO: Por Hablarles (Con Datos & Urgentes) */}
          <button
            onClick={() => setFilterTab(filterTab === 'por_hablar' ? 'all' : 'por_hablar')}
            className={`p-4 rounded-3xl border text-left transition-all relative overflow-hidden group ${
              filterTab === 'por_hablar'
                ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-xl shadow-orange-200 scale-[1.02]'
                : porHablarCount > 0
                ? 'bg-white border-orange-300 hover:border-[#FF6B00] shadow-sm hover:shadow-md ring-2 ring-orange-100'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                filterTab === 'por_hablar' ? 'text-orange-100' : 'text-[#FF6B00]'
              }`}>
                🔥 Por Hablarles / Con Datos
              </span>
              <div className={`p-1.5 rounded-xl ${
                filterTab === 'por_hablar' ? 'bg-orange-700 text-white' : 'bg-orange-50 text-[#FF6B00]'
              }`}>
                <Zap size={16} className={porHablarCount > 0 ? 'animate-bounce' : ''} />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-black tracking-tight ${
                filterTab === 'por_hablar' ? 'text-white' : 'text-[#FF6B00]'
              }`}>
                {porHablarCount}
              </span>
              <span className={`text-[10px] font-bold ${
                filterTab === 'por_hablar' ? 'text-orange-100' : 'text-slate-400'
              }`}>
                listos para cotizar
              </span>
            </div>
          </button>

          {/* Card 2: En Seguimiento (Ya atendidos) */}
          <button
            onClick={() => setFilterTab(filterTab === 'follow_up' ? 'all' : 'follow_up')}
            className={`p-4 rounded-3xl border text-left transition-all relative overflow-hidden ${
              filterTab === 'follow_up'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-200 scale-[1.02]'
                : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                filterTab === 'follow_up' ? 'text-blue-100' : 'text-blue-600'
              }`}>
                🔄 En Seguimiento
              </span>
              <div className={`p-1.5 rounded-xl ${
                filterTab === 'follow_up' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-600'
              }`}>
                <CheckCheck size={16} />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-black tracking-tight ${
                filterTab === 'follow_up' ? 'text-white' : 'text-slate-800'
              }`}>
                {followUpCount}
              </span>
              <span className={`text-[10px] font-bold ${
                filterTab === 'follow_up' ? 'text-blue-100' : 'text-slate-400'
              }`}>
                ya contactados
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
                🤖 En IA Automática
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
                chateando auto
              </span>
            </div>
          </button>

          {/* Card 4: Ventas / Cierres */}
          <button
            onClick={() => setFilterTab(filterTab === 'sales' ? 'all' : 'sales')}
            className={`p-4 rounded-3xl border text-left transition-all relative overflow-hidden ${
              filterTab === 'sales'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xl shadow-purple-200 scale-[1.02]'
                : 'bg-white border-slate-200 hover:border-purple-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                filterTab === 'sales' ? 'text-purple-100' : 'text-slate-400'
              }`}>
                ⭐ Ventas & Cierres
              </span>
              <div className={`p-1.5 rounded-xl ${
                filterTab === 'sales' ? 'bg-purple-700 text-white' : 'bg-purple-50 text-purple-600'
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
                filterTab === 'sales' ? 'text-purple-100' : 'text-slate-400'
              }`}>
                oportunidades
              </span>
            </div>
          </button>
        </div>

        {/* Barra de Filtros rápidos */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1 flex items-center gap-1">
            <Filter size={12} /> Pestaña:
          </span>

          {[
            { id: 'por_hablar', label: `🔥 Por Hablarles / Con Datos (${porHablarCount})`, alert: porHablarCount > 0 },
            { id: 'follow_up', label: `🔄 En Seguimiento (${followUpCount})` },
            { id: 'bot', label: `🤖 En IA (${botCount})` },
            { id: 'sales', label: `⭐ Ventas/Cierres (${salesCount})` },
            { id: 'all', label: `Todos (${totalCount})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filterTab === tab.id
                  ? 'bg-slate-900 text-[#FF6B00] shadow-md shadow-slate-200'
                  : tab.alert
                  ? 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
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
              Ver todos
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
                <th className="px-6 py-5">LEAD / CONTACTO</th>
                <th className="px-5 py-5">¿QUÉ NECESITA? (MOTOR / ZONA / DETALLES)</th>
                <th className="px-4 py-5">ESTADO & SCORE</th>
                <th className="px-6 py-5 text-right">ACCIONES INMEDIATAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleLeads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100">
                        <CheckCircle2 size={28} />
                      </div>
                      <p className="text-sm font-bold text-slate-700">
                        {filterTab === 'por_hablar' ? '¡Excelente! No tienes leads pendientes por enviarles información.' : 'No se encontraron leads con este criterio.'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {filterTab === 'por_hablar' ? 'Todos los prospectos ya tienen seguimiento o están siendo atendidos por la IA.' : 'Prueba cambiando el filtro o la búsqueda.'}
                      </p>
                      {filterTab !== 'all' && (
                        <button
                          onClick={() => { setFilterTab('all'); setSearchQuery(''); }}
                          className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-black transition-all"
                        >
                          Ver todos los leads
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                visibleLeads.map(lead => {
                  const leadIsPorHablar = isPorHablar(lead);
                  const isSelected = sidebarLeadId === lead.id && showSidebar;
                  const waUrl = getCleanWhatsAppUrl(lead.phone || lead.whatsapp_id);

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => { setSidebarLeadId(lead.id); setShowSidebar(true); }}
                      className={`hover:bg-slate-50/90 transition-all group cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50/50 border-l-4 border-[#FF6B00]'
                          : leadIsPorHablar
                          ? 'bg-orange-50/20'
                          : lead.estado === 'En Seguimiento'
                          ? 'bg-blue-50/20'
                          : ''
                      }`}
                    >
                      {/* Columna 1: Lead / Contacto */}
                      <td className="px-6 py-4">
                        <div className="flex items-start space-x-3.5">
                          <div className="relative shrink-0 mt-0.5">
                            <div className={`h-11 w-11 rounded-[16px] flex items-center justify-center font-black text-xs shadow-sm ${
                              lead.priority === 'urgent' && leadIsPorHablar
                                ? 'bg-red-600 text-white animate-pulse'
                                : leadIsPorHablar
                                ? 'bg-[#FF6B00] text-white'
                                : lead.estado === 'En Seguimiento'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-900 text-[#FF6B00]'
                            }`}>
                              {lead.priority === 'urgent' && leadIsPorHablar ? '!' : (lead.nombre?.[0] || '?')}
                            </div>
                            {leadIsPorHablar && (
                              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white animate-ping" />
                            )}
                            {lead.estado === 'En Seguimiento' && (
                              <span className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full text-white text-[8px] flex items-center justify-center border border-white">
                                <Check size={10} />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 max-w-[240px]">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-black text-slate-800 leading-none group-hover:text-[#FF6B00] transition-colors truncate">
                                {lead.nombre}
                              </p>
                              {lead.priority === 'urgent' && leadIsPorHablar && (
                                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-md uppercase">
                                  Urgente
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-400 mt-1">
                              <Phone size={10} className="text-slate-300 shrink-0" />
                              <span className="truncate">{lead.phone || lead.whatsapp_id || 'Sin teléfono'}</span>
                            </div>

                            {/* Motivo de Handoff o Último Mensaje */}
                            {lead.handoff_reason && leadIsPorHablar ? (
                              <p className="text-[10px] text-red-600 font-black italic truncate mt-1 bg-red-100/60 px-2 py-0.5 rounded-md w-fit">
                                ⚠️ {lead.handoff_reason}
                              </p>
                            ) : lead.lastMessage ? (
                              <p className="text-[11px] text-slate-600 truncate mt-1 italic font-medium leading-tight">
                                "{lead.lastMessage}"
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Columna 2: ¿QUÉ NECESITA? (MOTOR / ZONA / DATOS DESTACADOS) */}
                      <td className="px-5 py-4">
                        <div className="max-w-[340px] space-y-1.5">
                          {/* Motor o Producto Destacado */}
                          {lead.motor && lead.motor !== 'N/A' ? (
                            <div className="inline-flex items-center space-x-1.5 text-xs font-black text-orange-950 bg-orange-100/80 border border-orange-200 px-2.5 py-1 rounded-xl shadow-xs">
                              <Tag size={12} className="text-[#FF6B00] shrink-0" />
                              <span className="truncate">{lead.motor}</span>
                            </div>
                          ) : (
                            <span className="inline-block text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                              Consulta general
                            </span>
                          )}

                          {/* Zona y Detalles de la necesidad */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            {lead.zona && lead.zona !== 'N/A' && (
                              <span className="font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                <MapPin size={10} className="text-slate-400" /> {lead.zona}
                              </span>
                            )}
                            {lead.nit && lead.nit !== 'N/A' && (
                              <span className="font-bold text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md">
                                NIT: {lead.nit}
                              </span>
                            )}
                            {lead.falla && lead.falla !== 'N/A' && (
                              <span className="text-slate-500 italic truncate max-w-[200px]">
                                {lead.falla}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Columna 3: Estado & Score */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col space-y-1.5">
                          {/* Badge de Estado */}
                          {leadIsPorHablar ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#FF6B00] text-white shadow-xs w-fit">
                              <Zap size={10} />
                              <span>Listo para Cotizar</span>
                            </span>
                          ) : lead.estado === 'En Seguimiento' ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 w-fit">
                              <CheckCheck size={11} className="text-blue-600" />
                              <span>En Seguimiento</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
                              <Bot size={10} />
                              <span>IA Activa</span>
                            </span>
                          )}

                          {/* Score Bar */}
                          <div className="w-24 space-y-0.5">
                            <div className="flex justify-between items-center text-[9px] font-black text-slate-500">
                              <span>Score: {lead.score || 0}%</span>
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
                        </div>
                      </td>

                      {/* Columna 4: Acciones Inmediatas */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* BOTÓN: MARCAR COMO ATENDIDO CON 1 CLIC */}
                          {leadIsPorHablar ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkFollowUp(lead, 'En Seguimiento');
                              }}
                              title="Marcar como atendido (ya se le dio seguimiento)"
                              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider flex items-center space-x-1 shadow-md shadow-emerald-200 transition-all active:scale-95"
                            >
                              <Check size={13} className="stroke-[3]" />
                              <span>Atendido</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkFollowUp(lead, lead.estado === 'En Seguimiento' ? 'Nuevo' : 'En Seguimiento');
                              }}
                              title="Alternar estado de seguimiento"
                              className={`px-2.5 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center space-x-1 transition-all border ${
                                lead.estado === 'En Seguimiento'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                              }`}
                            >
                              <CheckCheck size={12} />
                              <span>{lead.estado === 'En Seguimiento' ? 'Seguimiento' : 'Reabrir'}</span>
                            </button>
                          )}

                          {/* BOTÓN 1: CHATEAR DIRECTO EN ONE CONTROL */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenConversation) onOpenConversation(lead.id);
                            }}
                            title="Abrir chat en el panel para mandar información"
                            className="px-3 py-2 rounded-xl bg-slate-900 text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white font-black text-[10px] uppercase tracking-wider flex items-center space-x-1.5 shadow-sm transition-all active:scale-95 group/btn"
                          >
                            <MessageSquare size={13} className="group-hover/btn:scale-110 transition-transform" />
                            <span>Chat</span>
                          </button>

                          {/* BOTÓN 2: WHATSAPP DIRECTO */}
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="Abrir WhatsApp directamente"
                              className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}

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
                            title="Ver detalles completos"
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
            onMarkFollowUp={handleMarkFollowUp}
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
                    <option value="En Seguimiento">En Seguimiento (Ya Atendido)</option>
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
