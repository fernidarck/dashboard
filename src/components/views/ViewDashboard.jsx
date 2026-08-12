import { useMemo } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

function getCleanWhatsAppUrl(phone) {
  if (!phone) return null;
  let clean = String(phone).replace(/\D/g, '');
  if (clean.length === 8) clean = '502' + clean;
  return `https://wa.me/${clean}`;
}

function LeadRow({ lead, onOpenConversation }) {
  const isUrgent = lead.priority === 'urgent' || !!lead.handoff_reason || lead.estado === 'Intervención Requerida';
  const waUrl = getCleanWhatsAppUrl(lead.phone || lead.whatsapp_id);
  const necesidad = (lead.motor && lead.motor !== 'N/A') ? lead.motor
    : (lead.falla && lead.falla !== 'N/A') ? lead.falla : null;
  const zona = (lead.zona && lead.zona !== 'N/A') ? lead.zona : null;
  const detalle = [necesidad, zona].filter(Boolean).join(' · ');

  return (
    <div className="group flex items-center gap-3.5 py-3 border-b border-slate-100 last:border-0">
      <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
        isUrgent ? 'bg-orange-50 text-[#FF6B00]' : 'bg-slate-100 text-slate-500'
      }`}>
        {lead.nombre?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900 truncate">{lead.nombre || 'Cliente'}</p>
          {isUrgent && <span className="text-[9px] font-bold uppercase tracking-wide text-[#FF6B00] bg-orange-50 rounded px-1.5 py-0.5">Urgente</span>}
        </div>
        <p className="text-[12px] text-slate-400 truncate">{detalle || lead.phone || '—'}</p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={() => onOpenConversation(lead.id)} title="Abrir chat"
          className="p-2 rounded-lg text-slate-400 hover:text-[#FF6B00] hover:bg-orange-50 transition-colors">
          <ArrowRight size={16} />
        </button>
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noreferrer" title="WhatsApp"
            className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
            <ArrowUpRight size={16} />
          </a>
        )}
      </div>
    </div>
  );
}

function ConvRow({ lead, onOpenConversation }) {
  const isUrgent = lead.priority === 'urgent' || !!lead.handoff_reason;
  return (
    <button onClick={() => onOpenConversation(lead.id)}
      className="w-full flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 text-left hover:bg-slate-50/70 -mx-2 px-2 rounded-lg transition-colors">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
        isUrgent ? 'bg-red-50 text-red-500' : lead.botActive ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
      }`}>
        {lead.nombre?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-800 truncate">{lead.nombre || 'Cliente'}</p>
        <p className="text-[11px] text-slate-400 truncate">{lead.lastMessage || 'Sin mensajes'}</p>
      </div>
      <span className="text-[10px] text-slate-300 shrink-0">{lead.time || ''}</span>
    </button>
  );
}

export default function ViewDashboard({ leads = [], pedidos = [], stats = {}, onOpenConversation, onOpenLeads, onConfigureAgent }) {
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
    { label: 'Por hablar',     value: porHablar.length,     color: 'text-[#FF6B00]', dot: 'bg-[#FF6B00]', onClick: onOpenLeads },
    { label: 'En seguimiento', value: enSeguimiento.length,  color: 'text-blue-500',  dot: 'bg-blue-500',  onClick: onOpenLeads },
    { label: 'Pedidos',        value: pedidosCount,         color: 'text-violet-500',dot: 'bg-violet-500' },
    { label: 'Ventas',         value: ventas.length,        color: 'text-emerald-500',dot: 'bg-emerald-500' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-9 animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="flex items-baseline justify-between flex-wrap gap-2 pt-1">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Panel</h2>
          <p className="text-xs text-slate-400 mt-0.5">OneControl · Guatemala</p>
        </div>
        {porHablar.length > 0 && (
          <button onClick={onOpenLeads} className="text-xs font-semibold text-[#FF6B00] hover:text-[#c95400] flex items-center gap-1.5 transition-colors">
            {porHablar.length} por contactar <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* KPIs — minimal con acento de color */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <button key={i} onClick={k.onClick}
            className={`bg-white border border-slate-200 rounded-2xl p-5 text-left transition-all ${k.onClick ? 'hover:border-slate-300 hover:shadow-sm cursor-pointer' : 'cursor-default'}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className={`h-1.5 w-1.5 rounded-full ${k.dot}`} />
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">{k.label}</p>
            </div>
            <p className={`text-3xl font-semibold ${k.color} tabular-nums leading-none`}>{k.value}</p>
          </button>
        ))}
      </div>

      {/* MAIN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-9">

        {/* A quién hablarle */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              A quién hablarle
              <span className="text-[10px] font-bold text-[#FF6B00] bg-orange-50 rounded-full px-2 py-0.5">{porHablar.length}</span>
            </h3>
            {porHablar.length > 0 && (
              <button onClick={onOpenLeads} className="text-[11px] text-slate-400 hover:text-[#FF6B00] flex items-center gap-1 transition-colors">
                Ver todos <ArrowRight size={11} />
              </button>
            )}
          </div>

          {porHablar.length === 0 ? (
            <div className="py-16 text-center bg-white border border-slate-100 rounded-2xl">
              <p className="text-sm text-slate-600 font-medium">Todo al día. Ningún lead pendiente.</p>
              <p className="text-xs text-slate-400 mt-1">Aparecen los que hicieron pedido, mostraron interés o dieron sus datos.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl px-4">
              {porHablar.slice(0, 9).map(lead => (
                <LeadRow key={lead.id} lead={lead} onOpenConversation={onOpenConversation} />
              ))}
            </div>
          )}
        </div>

        {/* Conversaciones + IA */}
        <div className="space-y-7">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              Conversaciones <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
            </h3>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-1">
              {recentConvs.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Sin conversaciones recientes</p>
              ) : recentConvs.map(lead => (
                <ConvRow key={lead.id} lead={lead} onOpenConversation={onOpenConversation} />
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-5">
            <p className="text-[11px] font-semibold text-[#FF6B00] uppercase tracking-wide mb-3">Impacto de la IA</p>
            <div className="flex items-end gap-8">
              <div>
                <p className="text-2xl font-semibold text-white tabular-nums leading-none">{botMessages}</p>
                <p className="text-[10px] text-slate-400 mt-1.5">mensajes automáticos</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-white tabular-nums leading-none">{Math.max(1, Math.round((botMessages * 5) / 60))}h</p>
                <p className="text-[10px] text-slate-400 mt-1.5">tiempo ahorrado</p>
              </div>
            </div>
            {onConfigureAgent && (
              <button onClick={onConfigureAgent} className="mt-4 text-xs font-semibold text-[#FF6B00] hover:text-orange-300 flex items-center gap-1.5 transition-colors">
                Configurar agente <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
