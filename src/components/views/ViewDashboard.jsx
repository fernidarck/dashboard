import { useMemo } from 'react';
import {
  MessageSquare, CheckCheck, Trophy, ShoppingBag,
  ArrowRight, Tag, MapPin, Phone, ExternalLink,
  Bot, AlertTriangle, Flame
} from 'lucide-react';

function getCleanWhatsAppUrl(phone) {
  if (!phone) return null;
  let clean = String(phone).replace(/\D/g, '');
  if (clean.length === 8) clean = '502' + clean;
  return `https://wa.me/${clean}`;
}

function LeadCard({ lead, onOpenConversation }) {
  const isUrgent = lead.priority === 'urgent' || !!lead.handoff_reason || lead.estado === 'Intervención Requerida';
  const waUrl = getCleanWhatsAppUrl(lead.phone || lead.whatsapp_id);
  const necesidad = (lead.motor && lead.motor !== 'N/A') ? lead.motor
    : (lead.falla && lead.falla !== 'N/A') ? lead.falla : null;

  return (
    <div className={`bg-white border rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all ${
      isUrgent ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-150 border-slate-200'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
            isUrgent ? 'bg-red-500 text-white' : 'bg-slate-900 text-[#FF6B00]'
          }`}>
            {lead.nombre?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 truncate leading-tight">{lead.nombre || 'Cliente'}</p>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
              <Phone size={9} />
              <span className="truncate">{lead.phone || lead.whatsapp_id || '—'}</span>
            </div>
          </div>
        </div>
        {isUrgent && (
          <span className="shrink-0 text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-red-500 text-white tracking-wide">Urgente</span>
        )}
      </div>

      {(necesidad || lead.zona) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {necesidad && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-orange-800 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-lg">
              <Tag size={10} className="text-[#FF6B00]" />{necesidad}
            </span>
          )}
          {lead.zona && lead.zona !== 'N/A' && (
            <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
              <MapPin size={9} className="text-slate-400" />{lead.zona}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-50">
        <button
          onClick={() => onOpenConversation(lead.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-900 text-[#FF6B00] rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#FF6B00] hover:text-white transition-all"
        >
          <MessageSquare size={11} /> Abrir Chat
        </button>
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noreferrer"
            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-all" title="Abrir en WhatsApp">
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
      className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left hover:shadow-sm transition-all ${
        isUrgent ? 'border-red-100 bg-red-50/40 hover:border-red-200' : 'border-slate-100 bg-white hover:border-slate-200'
      }`}
    >
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
        isUrgent ? 'bg-red-500 text-white' : isBot ? 'bg-slate-900 text-[#FF6B00]' : 'bg-amber-500 text-white'
      }`}>
        {lead.nombre?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-slate-800 truncate">{lead.nombre || 'Cliente'}</p>
        <p className="text-[10px] text-slate-400 truncate font-medium italic">{lead.lastMessage || 'Sin mensajes'}</p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        <span className="text-[9px] font-bold text-slate-300">{lead.time || ''}</span>
        {isBot ? <Bot size={13} className="text-emerald-500" /> : <AlertTriangle size={13} className="text-amber-500" />}
      </div>
    </button>
  );
}

export default function ViewDashboard({ leads = [], pedidos = [], stats = {}, onOpenConversation, onOpenLeads, onConfigureAgent }) {
  // ── Lógica de etapas (misma que la vista de Leads) ──
  const cleanPh = (p) => String(p || '').replace(/\D/g, '');
  const pedidoPhones = useMemo(() => new Set((pedidos || []).map(p => cleanPh(p.phone)).filter(Boolean)), [pedidos]);
  const hizoPedido = (l) => pedidoPhones.has(cleanPh(l.phone));
  const esProspecto = (l) => [l.zona, l.direccion, l.falla, l.nit].some(v => v && v !== 'N/A' && v !== 'null' && String(v).trim());
  const isEnSeguimiento = (l) => l.estado === 'En Seguimiento' || l.estado === 'Cita Agendada';
  const isFollowedUp = (l) => isEnSeguimiento(l) || l.estado === 'Venta' || l.estado === 'Perdido' || l.estado === 'Post-Venta';
  const isPorHablar = (l) => {
    if (l.archived || isFollowedUp(l)) return false;
    return hizoPedido(l) || esProspecto(l) || (Number(l.score) || 0) >= 60
      || l.priority === 'urgent' || l.estado === 'Intervención Requerida' || !!l.handoff_reason;
  };

  const activeLeads = useMemo(() => leads.filter(l => !l.archived), [leads]);
  const porHablar = useMemo(() => activeLeads.filter(isPorHablar).sort((a, b) => {
    const pa = (a.priority === 'urgent' ? 2 : 0) + (hizoPedido(a) ? 1 : 0);
    const pb = (b.priority === 'urgent' ? 2 : 0) + (hizoPedido(b) ? 1 : 0);
    if (pa !== pb) return pb - pa;
    return (Number(b.score) || 0) - (Number(a.score) || 0);
  }), [activeLeads]); // eslint-disable-line react-hooks/exhaustive-deps
  const enSeguimiento = useMemo(() => activeLeads.filter(isEnSeguimiento), [activeLeads]); // eslint-disable-line react-hooks/exhaustive-deps
  const ventas = useMemo(() => activeLeads.filter(l => l.estado === 'Venta'), [activeLeads]);
  const pedidosCount = pedidos?.length || 0;

  const recentConvs = useMemo(() => [...activeLeads]
    .filter(l => l.lastMessage || l.time)
    .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
    .slice(0, 7), [activeLeads]);

  const botMessages = stats.botMessages || 0;

  const kpis = [
    { icon: Flame,      label: 'Por Hablar',     value: porHablar.length,   accent: 'text-[#FF6B00]', ring: 'ring-orange-100', onClick: onOpenLeads },
    { icon: CheckCheck, label: 'En Seguimiento', value: enSeguimiento.length, accent: 'text-blue-600',  ring: 'ring-blue-100' },
    { icon: ShoppingBag,label: 'Pedidos',        value: pedidosCount,       accent: 'text-violet-600',ring: 'ring-violet-100' },
    { icon: Trophy,     label: 'Ventas',         value: ventas.length,      accent: 'text-emerald-600',ring: 'ring-emerald-100' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Panel Principal</h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">OneControl · Guatemala</p>
        </div>
        {porHablar.length > 0 && (
          <button onClick={onOpenLeads} className="flex items-center gap-2 bg-[#FF6B00] text-white pl-3 pr-2 py-2 rounded-2xl shadow-lg shadow-orange-200 hover:bg-[#e05e00] transition-all active:scale-95">
            <Flame size={15} />
            <span className="text-[11px] font-black uppercase tracking-wide">{porHablar.length} por hablar</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <button key={i} onClick={k.onClick} className={`bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 text-left transition-all ${k.onClick ? `hover:ring-2 ${k.ring} hover:-translate-y-0.5 cursor-pointer` : 'cursor-default'}`}>
            <div className="h-11 w-11 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
              <k.icon size={19} className={k.accent} />
            </div>
            <div>
              <p className={`text-2xl font-black ${k.accent} leading-none tabular-nums`}>{k.value}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{k.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* MAIN */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT: Por Hablar (protagonista) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Flame size={15} className="text-[#FF6B00]" /> A quién hablarle
              <span className="text-[10px] font-black text-white bg-[#FF6B00] px-2 py-0.5 rounded-full">{porHablar.length}</span>
            </h3>
            {porHablar.length > 0 && (
              <button onClick={onOpenLeads} className="text-[10px] font-black text-slate-400 hover:text-[#FF6B00] uppercase tracking-wider flex items-center gap-1 transition-colors">
                Ver todos <ArrowRight size={12} />
              </button>
            )}
          </div>

          {porHablar.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center space-y-2">
              <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
                <Trophy size={22} className="text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-slate-700">¡Todo al día! Ningún lead pendiente por contactar.</p>
              <p className="text-[11px] text-slate-400">Acá aparecen los que hicieron pedido, mostraron interés o dieron sus datos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {porHablar.slice(0, 8).map(lead => (
                <LeadCard key={lead.id} lead={lead} onOpenConversation={onOpenConversation} />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Conversaciones + IA */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              Conversaciones <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">En vivo</span>
          </div>

          <div className="space-y-2">
            {recentConvs.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center">
                <MessageSquare size={20} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">Sin conversaciones recientes</p>
              </div>
            ) : recentConvs.map(lead => (
              <ConvCard key={lead.id} lead={lead} onOpenConversation={onOpenConversation} />
            ))}
          </div>

          <div className="bg-slate-900 rounded-2xl p-4 space-y-3">
            <p className="text-[10px] font-black text-[#FF6B00] uppercase tracking-widest">Impacto de la IA</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-black text-white tabular-nums">{botMessages}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Mensajes automáticos</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white tabular-nums">{Math.max(1, Math.round((botMessages * 5) / 60))}h</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tiempo ahorrado</p>
              </div>
            </div>
            {onConfigureAgent && (
              <button onClick={onConfigureAgent} className="w-full py-2 bg-[#FF6B00] text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-orange-400 transition-all active:scale-95">
                Configurar Agente →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
