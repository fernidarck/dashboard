import { useState, useMemo } from 'react';
import {
  Zap, MessageSquare, CheckCheck, Trophy, XCircle,
  ArrowRight, Tag, MapPin, Phone, ExternalLink,
  Bot, AlertTriangle, Clock, Users
} from 'lucide-react';

function getCleanWhatsAppUrl(phone) {
  if (!phone) return null;
  let clean = String(phone).replace(/\D/g, '');
  if (clean.length === 8) clean = '502' + clean;
  return `https://wa.me/${clean}`;
}

function LeadCard({ lead, onOpenConversation }) {
  const isUrgent = lead.priority === 'urgent' || !!lead.handoff_reason || lead.estado === 'Intervención Requerida';
  const isFollowUp = lead.estado === 'En Seguimiento' || lead.estado === 'Interesado' || lead.estado === 'Cita Agendada';
  const isClosed = lead.estado === 'Venta';
  const waUrl = getCleanWhatsAppUrl(lead.phone || lead.whatsapp_id);

  const statusColor = isClosed
    ? 'bg-emerald-500 text-white'
    : isFollowUp
    ? 'bg-blue-500 text-white'
    : isUrgent
    ? 'bg-red-500 text-white'
    : 'bg-[#FF6B00] text-white';

  const statusLabel = isClosed
    ? '🏆 Cerrado'
    : isFollowUp
    ? '🔄 Seguimiento'
    : isUrgent
    ? '⚡ Urgente'
    : '🔥 Por Hablar';

  return (
    <div className={`bg-white border rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md transition-all group ${
      isUrgent && !isFollowUp && !isClosed ? 'border-orange-200 ring-1 ring-orange-100' : 'border-slate-100'
    }`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${statusColor}`}>
            {lead.nombre?.[0] || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 truncate leading-tight">{lead.nombre}</p>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <Phone size={9} />
              <span className="truncate">{lead.phone || lead.whatsapp_id || '—'}</span>
            </div>
          </div>
        </div>
        <span className={`shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Necesidad del cliente */}
      {(lead.motor || lead.zona || lead.lastMessage) && (
        <div className="space-y-1">
          {lead.motor && lead.motor !== 'N/A' && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-800 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-lg w-fit">
              <Tag size={10} className="text-[#FF6B00]" />
              {lead.motor}
            </div>
          )}
          {lead.zona && lead.zona !== 'N/A' && (
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
              <MapPin size={9} className="text-slate-300" />
              {lead.zona}
            </div>
          )}
          {!lead.motor && lead.lastMessage && (
            <p className="text-[11px] text-slate-500 italic leading-tight truncate">"{lead.lastMessage}"</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-50">
        <button
          onClick={() => onOpenConversation(lead.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-900 text-[#FF6B00] rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#FF6B00] hover:text-white transition-all group/btn"
        >
          <MessageSquare size={11} className="group-hover/btn:scale-110 transition-transform" />
          Chat
        </button>
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-all"
          >
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}

function ConvCard({ lead, onOpenConversation }) {
  const isBot = lead.botActive;
  const isUrgent = lead.priority === 'urgent' || !!lead.handoff_reason;

  return (
    <button
      onClick={() => onOpenConversation(lead.id)}
      className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left hover:shadow-sm transition-all group ${
        isUrgent ? 'border-red-100 bg-red-50/30 hover:border-red-200' : 'border-slate-100 bg-white hover:border-slate-200'
      }`}
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
        isUrgent ? 'bg-red-500 text-white animate-pulse' :
        isBot ? 'bg-slate-900 text-[#FF6B00]' : 'bg-amber-500 text-white'
      }`}>
        {lead.nombre?.[0] || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-black text-slate-800 truncate">{lead.nombre}</p>
          {isUrgent && <span className="shrink-0 text-[8px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-md uppercase">!</span>}
        </div>
        <p className="text-[10px] text-slate-400 truncate font-medium italic">
          {lead.lastMessage || 'Sin mensajes'}
        </p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        <span className="text-[9px] font-bold text-slate-300">{lead.time || ''}</span>
        {isBot
          ? <Bot size={12} className="text-emerald-500" />
          : <AlertTriangle size={12} className="text-amber-500" />
        }
      </div>
    </button>
  );
}

export default function ViewDashboard({ leads, agenda, stats, onOpenConversation, onConfigureAgent }) {
  const [leadTab, setLeadTab] = useState('pending');

  const tieneDatos = (l) => [l.zona, l.direccion, l.motor, l.falla, l.nit].some(v => v && v !== 'N/A' && String(v).trim());
  const isEnSeguimiento = (l) => l.estado === 'En Seguimiento' || l.estado === 'Interesado' || l.estado === 'Cita Agendada';
  const isFollowedUp = (l) => isEnSeguimiento(l) || l.estado === 'Venta' || l.estado === 'Perdido' || l.estado === 'Post-Venta';
  const isPorHablar = (l) => !isFollowedUp(l) && !l.archived && (l.priority === 'urgent' || !l.botActive || l.estado === 'Intervención Requerida' || !!l.handoff_reason || tieneDatos(l) || l.estado === 'Nuevo');

  const activeLeads = useMemo(() => leads.filter(l => !l.archived), [leads]);
  const porHablar = useMemo(() => activeLeads.filter(isPorHablar), [activeLeads]);
  const enSeguimiento = useMemo(() => activeLeads.filter(isEnSeguimiento), [activeLeads]);
  const ventas = useMemo(() => activeLeads.filter(l => l.estado === 'Venta'), [activeLeads]);
  const perdidos = useMemo(() => activeLeads.filter(l => l.estado === 'Perdido'), [activeLeads]);

  // Conversaciones recientes = últimos mensajes por lead
  const recentConvs = useMemo(() => {
    return [...activeLeads]
      .filter(l => l.lastMessage || l.time)
      .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
      .slice(0, 8);
  }, [activeLeads]);

  const tabLeads = useMemo(() => {
    if (leadTab === 'pending') return porHablar.slice(0, 12);
    if (leadTab === 'followup') return enSeguimiento.slice(0, 12);
    if (leadTab === 'closed') return ventas.slice(0, 12);
    return [];
  }, [leadTab, porHablar, enSeguimiento, ventas]);

  const tabs = [
    { id: 'pending', label: `🔥 Por Hablar`, count: porHablar.length, color: 'text-orange-600' },
    { id: 'followup', label: `🔄 Seguimiento`, count: enSeguimiento.length, color: 'text-blue-600' },
    { id: 'closed', label: `🏆 Ventas`, count: ventas.length, color: 'text-emerald-600' },
  ];

  const botMessages = stats.botMessages || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* ─── HEADER ─── */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Panel Principal</h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">OneControl · Guatemala</p>
        </div>
        {porHablar.length > 0 && (
          <div className="flex items-center gap-2 bg-orange-500 text-white px-3 py-1.5 rounded-xl shadow-md shadow-orange-200">
            <Zap size={14} className="animate-bounce" />
            <span className="text-[11px] font-black uppercase">{porHablar.length} leads pendientes</span>
          </div>
        )}
      </div>

      {/* ─── KPI STRIP ─── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'Por Hablar', value: porHablar.length, color: 'text-[#FF6B00]', bg: 'bg-orange-50 border-orange-100', pulse: porHablar.length > 0 },
          { icon: CheckCheck, label: 'En Seguimiento', value: enSeguimiento.length, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
          { icon: Trophy, label: 'Ventas Cerradas', value: ventas.length, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { icon: XCircle, label: 'No Compraron', value: perdidos.length, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' },
        ].map((k, i) => (
          <div key={i} className={`${k.bg} border rounded-2xl p-4 flex items-center gap-3`}>
            <div className={`h-9 w-9 rounded-xl bg-white flex items-center justify-center shadow-xs shrink-0`}>
              <k.icon size={18} className={k.color} />
            </div>
            <div>
              <p className={`text-xl font-black ${k.color} leading-none`}>{k.value}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── MAIN 2-COL LAYOUT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT: Leads Section (3/5 width) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Tab Filter */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setLeadTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    leadTab === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 ${leadTab === tab.id ? tab.color : 'text-slate-400'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => {}}
              className="text-[10px] font-black text-slate-400 hover:text-[#FF6B00] uppercase tracking-wider flex items-center gap-1 transition-colors"
            >
              Ver todos <ArrowRight size={12} />
            </button>
          </div>

          {/* Lead Cards Grid */}
          {tabLeads.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center space-y-2">
              <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
                <Trophy size={24} className="text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-slate-700">
                {leadTab === 'pending' ? '¡Todo atendido! Sin leads pendientes.' :
                 leadTab === 'followup' ? 'No hay clientes en seguimiento.' :
                 'Aún no has registrado ventas cerradas.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tabLeads.map(lead => (
                <LeadCard key={lead.id} lead={lead} onOpenConversation={onOpenConversation} />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Conversaciones Recientes (2/5 width) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">Conversaciones</h3>
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">En Vivo</span>
          </div>

          <div className="space-y-2">
            {recentConvs.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center">
                <MessageSquare size={20} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">Sin conversaciones recientes</p>
              </div>
            ) : (
              recentConvs.map(lead => (
                <ConvCard key={lead.id} lead={lead} onOpenConversation={onOpenConversation} />
              ))
            )}
          </div>

          {/* Mini IA Stats */}
          <div className="bg-slate-900 rounded-2xl p-4 space-y-3 mt-2">
            <p className="text-[10px] font-black text-[#FF6B00] uppercase tracking-widest">Impacto IA</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-black text-white">{botMessages}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Msgs automáticos</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">{Math.max(1, Math.round((botMessages * 5) / 60))}h</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tiempo ahorrado</p>
              </div>
            </div>
            <button
              onClick={onConfigureAgent}
              className="w-full py-2 bg-[#FF6B00] text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-orange-400 transition-all active:scale-95"
            >
              Configurar Agente →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
