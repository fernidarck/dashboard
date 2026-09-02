import { useState, useMemo, useEffect } from 'react';
import {
  Search, X, UserCircle, Phone, Pencil, Trash2, Archive,
  Power, Database, MessageSquare, Tag, Bot, AlertTriangle,
  Flame, CheckCircle2, Clock, Sparkles, Send, ArrowRight,
  Filter, MessageCircle, ExternalLink, Zap, Check, CheckCheck,
  Copy, MapPin, Wrench, XCircle, Trophy, ThumbsDown, RotateCcw
} from 'lucide-react';

function getCleanWhatsAppUrl(phone) {
  if (!phone) return null;
  let clean = String(phone).replace(/\D/g, '');
  if (clean.length === 8) clean = '502' + clean;
  return `https://wa.me/${clean}`;
}

function ChannelBadge({ origen, size = 'sm' }) {
  const orig = String(origen || '').toLowerCase();
  if (orig.includes('instagram')) {
    return (
      <span className={`inline-flex items-center gap-1 font-black uppercase tracking-wider rounded-md bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-orange-500/15 text-pink-700 border border-pink-200/80 ${size === 'xs' ? 'text-[8px] px-1.5 py-0.5' : 'text-[9px] px-2 py-0.5'}`}>
        <span>📸</span> Instagram
      </span>
    );
  }
  if (orig.includes('facebook')) {
    return (
      <span className={`inline-flex items-center gap-1 font-black uppercase tracking-wider rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 ${size === 'xs' ? 'text-[8px] px-1.5 py-0.5' : 'text-[9px] px-2 py-0.5'}`}>
        <span>📘</span> Facebook
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 font-black uppercase tracking-wider rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${size === 'xs' ? 'text-[8px] px-1.5 py-0.5' : 'text-[9px] px-2 py-0.5'}`}>
      <span>🟢</span> WhatsApp
    </span>
  );
}

const getChannelIcon = (origen) => {
  const orig = String(origen || '').toLowerCase();
  if (orig.includes('instagram')) return '📸';
  if (orig.includes('facebook')) return '📘';
  return '🟢';
};

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

  const isFollowedUp = lead.estado === 'En Seguimiento' || lead.estado === 'Interesado' || lead.estado === 'Cita Agendada' || lead.estado === 'Venta' || lead.estado === 'Post-Venta' || lead.estado === 'Perdido';
  const needsAttention = !isFollowedUp && (lead.priority === 'urgent' || !lead.botActive || lead.estado === 'Intervención Requerida' || !!lead.handoff_reason);
  const waUrl = getCleanWhatsAppUrl(lead.phone || lead.whatsapp_id);

  return (
    <div className="fixed inset-0 z-50 w-full md:relative md:inset-auto md:z-20 md:w-96 border-l border-slate-100 bg-white flex flex-col shrink-0 animate-in slide-in-from-right duration-500 overflow-y-auto no-scrollbar shadow-2xl">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
        <div>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest italic">Ficha del Lead</h3>
          <p className="text-[10px] font-bold text-slate-400">Detalles & Control de Cierre</p>
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
              lead.estado === 'Venta'
                ? 'bg-emerald-600 text-white'
                : lead.estado === 'Perdido'
                ? 'bg-slate-400 text-white'
                : lead.estado === 'En Seguimiento' || lead.estado === 'Interesado'
                ? 'bg-blue-600 text-white'
                : lead.priority === 'urgent' && !isFollowedUp
                ? 'bg-red-600 text-white animate-pulse'
                : !lead.botActive
                ? 'bg-amber-500 text-white'
                : 'bg-slate-900 text-[#FF6B00]'
            }`}>
              {lead.estado === 'Venta' ? '🏆' : lead.estado === 'Perdido' ? '✕' : lead.priority === 'urgent' && !isFollowedUp ? '!' : (lead.nombre?.[0] || '?')}
            </div>
            <span className="absolute -bottom-1 -right-1 text-[12px] bg-white rounded-full px-1 shadow-md border border-slate-200 leading-none">
              {getChannelIcon(lead.origen)}
            </span>
            {needsAttention && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md animate-bounce">
                !
              </span>
            )}
            {lead.estado === 'Venta' && (
              <span className="absolute -bottom-1 -right-1 h-6 w-6 bg-emerald-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md border-2 border-white">
                ✓
              </span>
            )}
          </div>
          <h4 className="text-lg font-black text-slate-800 leading-tight mb-1">{lead.nombre}</h4>
          <div className="flex items-center justify-center gap-2 mb-2">
            <ChannelBadge origen={lead.origen} size="xs" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center space-x-2">
            <span className={`h-2 w-2 rounded-full ${lead.botActive ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
            <span>{lead.botActive ? 'IA Gestionando' : 'Control Humano / Manual'}</span>
          </p>

          {/* Botones de acción directa */}
          <div className="mt-4 space-y-2">
            <button
              onClick={() => onOpenConversation && onOpenConversation(lead.id)}
              className="w-full py-3 px-4 bg-[#FF6B00] hover:bg-[#e05e00] text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-orange-200 transition-all active:scale-95 group"
            >
              <MessageSquare size={16} className="group-hover:scale-110 transition-transform" />
              <span>Abrir Chat en OneControl</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>

            {waUrl && (!lead.origen || lead.origen.toLowerCase().includes('whatsapp')) && (
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

        {/* 🎯 SECCIÓN: MOVER DE ETAPA / RESULTADO */}
        <div className="space-y-2.5 bg-slate-50/80 p-4 rounded-3xl border border-slate-200">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
            Mover Etapa del Cliente:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {/* Opción 1: En Seguimiento */}
            <button
              onClick={() => onMarkFollowUp(lead, 'En Seguimiento')}
              className={`py-2 px-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all border ${
                lead.estado === 'En Seguimiento' || lead.estado === 'Interesado'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                  : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
              }`}
            >
              <CheckCheck size={13} />
              <span>En Seguimiento</span>
            </button>

            {/* Opción 2: Cerrado / Venta */}
            <button
              onClick={() => onMarkFollowUp(lead, 'Venta')}
              className={`py-2 px-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all border ${
                lead.estado === 'Venta'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200'
                  : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <Trophy size={13} />
              <span>Cerró Venta ✓</span>
            </button>

            {/* Opción 3: Cita Agendada */}
            <button
              onClick={() => onMarkFollowUp(lead, 'Cita Agendada')}
              className={`py-2 px-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all border ${
                lead.estado === 'Cita Agendada'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                  : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
              }`}
            >
              <Clock size={13} />
              <span>Cita / Visita</span>
            </button>

            {/* Opción 4: No Compró / Perdido */}
            <button
              onClick={() => onMarkFollowUp(lead, 'Perdido')}
              className={`py-2 px-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all border ${
                lead.estado === 'Perdido'
                  ? 'bg-slate-700 text-white border-slate-700 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
              }`}
            >
              <XCircle size={13} />
              <span>No Compró</span>
            </button>
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

        {/* Ficha Técnica Completa */}
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
  pedidos = [],
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

  // ¿Este lead ya hizo un pedido? (cruzando con la lista de pedidos por teléfono)
  const cleanPh = (p) => String(p || '').replace(/\D/g, '');
  const pedidoPhones = useMemo(() => new Set((pedidos || []).map(p => cleanPh(p.phone)).filter(Boolean)), [pedidos]);
  const hizoPedido = (l) => pedidoPhones.has(cleanPh(l.phone));

  // EN SEGUIMIENTO = SOLO los que el usuario movió a mano ("En Seguimiento" o "Cita/Visita")
  const isEnSeguimiento = (l) => l.estado === 'En Seguimiento' || l.estado === 'Cita Agendada';

  // Cerrados = ya cerraron la venta
  const isVentaCerrada = (l) => l.estado === 'Venta';
  // Perdidos / descartados
  const isPerdido = (l) => l.estado === 'Perdido';
  // ¿Ya se está trabajando o está cerrado?
  const isFollowedUp = (l) => isEnSeguimiento(l) || isVentaCerrada(l) || isPerdido(l) || l.estado === 'Post-Venta';

  // INTERESADO EN COMPRAR = dio datos que solo da quien va en serio: ubicación/dirección o factura.
  // (No cuenta "falla"/"motor" porque se llenan con solo mandar una foto.)
  const esProspecto = (l) => [l.zona, l.direccion, l.nit].some(v => v && v !== 'N/A' && v !== 'null' && String(v).trim());
  // 🎯 "Por Hablarles" = SOLO los que muestran intención real: hicieron PEDIDO, dieron datos de
  // compra (ubicación/factura), o pidieron un HUMANO. NO entran: solo foto, solo precio, score/urgente automático.
  const isPorHablar = (l) => {
    if (isFollowedUp(l)) return false;
    if (hizoPedido(l)) return true; // un pedido siempre cuenta
    if (String(l.nombre || '').trim().toLowerCase() === 'agente') return false; // ruido de eco del bot, no es cliente
    return esProspecto(l) || !!l.handoff_reason;
  };

  // Conteos
  const porHablarCount = useMemo(() => leads.filter(l => !l.archived && isPorHablar(l)).length, [leads]);
  const followUpCount = useMemo(() => leads.filter(l => !l.archived && isEnSeguimiento(l)).length, [leads]);
  const salesCount = useMemo(() => leads.filter(l => !l.archived && isVentaCerrada(l)).length, [leads]);
  const lostCount = useMemo(() => leads.filter(l => !l.archived && isPerdido(l)).length, [leads]);
  const botCount = useMemo(() => leads.filter(l => !l.archived && l.botActive && !isPorHablar(l) && !isFollowedUp(l)).length, [leads]);
  const totalCount = useMemo(() => leads.filter(l => !l.archived).length, [leads]);

  // Tab activo: por defecto empieza en 'por_hablar'
  const [filterTab, setFilterTab] = useState(() => (leads.some(l => !l.archived && isPorHablar(l)) ? 'por_hablar' : 'all'));
  const [originFilter, setOriginFilter] = useState('all');

  // Si cambian los leads y hay pendientes
  useEffect(() => {
    if (porHablarCount > 0 && filterTab === 'all' && !searchQuery) {
      setFilterTab('por_hablar');
    }
  }, [porHablarCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Acción rápida: Marcar como Atendido / Cambiar Estado
  const handleMarkFollowUp = async (lead, targetEstado = 'En Seguimiento') => {
    const updated = {
      ...lead,
      estado: targetEstado,
      score: targetEstado === 'Venta' ? 100 : targetEstado === 'Perdido' ? 0 : targetEstado === 'En Seguimiento' || targetEstado === 'Interesado' ? 60 : lead.score || 50,
      priority: targetEstado === 'Intervención Requerida' ? 'urgent' : 'normal',
      handoff_reason: targetEstado === 'Intervención Requerida' ? lead.handoff_reason : null
    };
    await onUpdateLead(updated);
  };

  // Peso de prioridad para ordenar:
  // 1º: Urgentes / Intervención requerida explícita (100)
  // 2º: Con datos capturados listos para cotizar motor/zona (90)
  // 3º: Modo manual sin atender (80)
  // 4º: En Seguimiento activo / Interesados (60)
  // 5º: Ventas Cerradas (50)
  // 6º: IA Activa general (20)
  // 7º: No Compraron / Perdidos (10)
  const getLeadPriorityWeight = (l) => {
    if (isPorHablar(l)) {
      if (l.priority === 'urgent' || l.estado === 'Intervención Requerida' || !!l.handoff_reason) return 100;
      if (tieneDatos(l)) return 90;
      return 80;
    }
    if (isEnSeguimiento(l)) return 60;
    if (isVentaCerrada(l)) return 50;
    if (l.botActive) return 20;
    if (isPerdido(l)) return 10;
    return 0;
  };

  // Filtrado y ORDENAMIENTO inteligente
  const visibleLeads = useMemo(() => {
    const filtered = leads.filter(lead => {
      if (lead.archived) return false;

      // Filtro por canal / origen
      if (originFilter === 'whatsapp' && (lead.origen && !lead.origen.toLowerCase().includes('whatsapp') && lead.origen !== 'Manual')) return false;
      if (originFilter === 'instagram' && (!lead.origen || !lead.origen.toLowerCase().includes('instagram'))) return false;
      if (originFilter === 'facebook' && (!lead.origen || !lead.origen.toLowerCase().includes('facebook'))) return false;

      // Filtro por tab unificado
      if (filterTab === 'por_hablar' && !isPorHablar(lead)) return false;
      if (filterTab === 'follow_up' && !isEnSeguimiento(lead)) return false;
      if (filterTab === 'sales' && !isVentaCerrada(lead)) return false;
      if (filterTab === 'lost' && !isPerdido(lead)) return false;
      if (filterTab === 'bot' && (!lead.botActive || isPorHablar(lead) || isFollowedUp(lead))) return false;

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
        const matchOrigen = (lead.origen || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchMsg && !matchMotor && !matchZona && !matchTags && !matchEstado && !matchOrigen) {
          return false;
        }
      }

      return true;
    });

    // Ordenar de mayor a menor prioridad
    return filtered.sort((a, b) => {
      const wA = getLeadPriorityWeight(a);
      const wB = getLeadPriorityWeight(b);
      if (wA !== wB) return wB - wA;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  }, [leads, filterTab, originFilter, searchQuery]);

  const handleSave = () => {
    onUpdateLead(editingLead);
    setEditingLead(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Banner de Acción Inmediata: Por Hablarles */}
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
                Al enviarles la información, márcalos como <span className="underline font-bold">"✓ En Seguimiento"</span>. Cuando compren, pásalos a <span className="underline font-bold">"🏆 Cerró Venta"</span> o <span className="underline font-bold">"✕ No Compró"</span>.
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
              Embudo de Ventas: Por Hablarles → En Seguimiento → Cerrados / Ventas
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
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
                🔥 1. Por Hablarles
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
                nuevos/con datos
              </span>
            </div>
          </button>

          {/* Card 2: En Seguimiento (Interesados / En Negociación) */}
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
                🔄 2. En Seguimiento
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
                interesados/en trato
              </span>
            </div>
          </button>

          {/* Card 3: Cerrados / Ventas (Solo los que ya compraron) */}
          <button
            onClick={() => setFilterTab(filterTab === 'sales' ? 'all' : 'sales')}
            className={`p-4 rounded-3xl border text-left transition-all relative overflow-hidden ${
              filterTab === 'sales'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl shadow-emerald-200 scale-[1.02]'
                : 'bg-white border-slate-200 hover:border-emerald-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                filterTab === 'sales' ? 'text-emerald-100' : 'text-emerald-600'
              }`}>
                🏆 3. Cerrados / Ventas
              </span>
              <div className={`p-1.5 rounded-xl ${
                filterTab === 'sales' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <Trophy size={16} />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-black tracking-tight ${
                filterTab === 'sales' ? 'text-white' : 'text-slate-800'
              }`}>
                {salesCount}
              </span>
              <span className={`text-[10px] font-bold ${
                filterTab === 'sales' ? 'text-emerald-100' : 'text-slate-400'
              }`}>
                ventas cerradas
              </span>
            </div>
          </button>

          {/* Card 4: No Compraron / Perdidos */}
          <button
            onClick={() => setFilterTab(filterTab === 'lost' ? 'all' : 'lost')}
            className={`p-4 rounded-3xl border text-left transition-all relative overflow-hidden ${
              filterTab === 'lost'
                ? 'bg-slate-800 text-white border-slate-800 shadow-xl shadow-slate-300 scale-[1.02]'
                : 'bg-white border-slate-200 hover:border-slate-400 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                filterTab === 'lost' ? 'text-slate-300' : 'text-slate-500'
              }`}>
                ❌ 4. No Compraron
              </span>
              <div className={`p-1.5 rounded-xl ${
                filterTab === 'lost' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <XCircle size={16} />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-black tracking-tight ${
                filterTab === 'lost' ? 'text-white' : 'text-slate-800'
              }`}>
                {lostCount}
              </span>
              <span className={`text-[10px] font-bold ${
                filterTab === 'lost' ? 'text-slate-400' : 'text-slate-400'
              }`}>
                descartados
              </span>
            </div>
          </button>

          {/* Card 5: En Gestión IA */}
          <button
            onClick={() => setFilterTab(filterTab === 'bot' ? 'all' : 'bot')}
            className={`p-4 rounded-3xl border text-left transition-all relative overflow-hidden ${
              filterTab === 'bot'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-200 scale-[1.02]'
                : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                filterTab === 'bot' ? 'text-indigo-100' : 'text-slate-400'
              }`}>
                🤖 En IA Automática
              </span>
              <div className={`p-1.5 rounded-xl ${
                filterTab === 'bot' ? 'bg-indigo-700 text-white' : 'bg-indigo-50 text-indigo-600'
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
                filterTab === 'bot' ? 'text-indigo-100' : 'text-slate-400'
              }`}>
                chateando auto
              </span>
            </div>
          </button>
        </div>

        {/* Barra de Filtros rápidos */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1 flex items-center gap-1">
            <Filter size={12} /> Etapa:
          </span>

          {[
            { id: 'por_hablar', label: `🔥 Por Hablarles (${porHablarCount})`, alert: porHablarCount > 0 },
            { id: 'follow_up', label: `🔄 En Seguimiento / Interesados (${followUpCount})` },
            { id: 'sales', label: `🏆 Cerrados / Ventas (${salesCount})` },
            { id: 'lost', label: `❌ No Compraron (${lostCount})` },
            { id: 'bot', label: `🤖 En IA (${botCount})` },
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

          {/* Filtro por Canal / Origen */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl ml-2">
            {[
              { id: 'all', label: 'Todos Canales' },
              { id: 'whatsapp', label: '🟢 WA' },
              { id: 'instagram', label: '📸 IG' },
              { id: 'facebook', label: '📘 FB' },
            ].map(o => (
              <button
                key={o.id}
                onClick={() => setOriginFilter(o.id)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                  originFilter === o.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {(filterTab !== 'all' || originFilter !== 'all') && (
            <button
              onClick={() => { setFilterTab('all'); setOriginFilter('all'); }}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline ml-2"
            >
              Restablecer filtros
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
                <th className="px-4 py-5">ETAPA ACTUAL</th>
                <th className="px-6 py-5 text-right">ACCIONES / CAMBIO DE ETAPA</th>
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
                        {filterTab === 'por_hablar'
                          ? '¡Excelente! No tienes leads pendientes por enviarles información.'
                          : filterTab === 'follow_up'
                          ? 'No tienes clientes en seguimiento actualmente.'
                          : filterTab === 'sales'
                          ? 'Aún no has marcado ventas cerradas. Cuando un cliente en seguimiento compre, márcalo como "Cerró Venta".'
                          : filterTab === 'lost'
                          ? 'No hay registros de clientes descartados.'
                          : 'No se encontraron leads con este criterio.'}
                      </p>
                      <p className="text-xs text-slate-400">
                        Prueba cambiando la etapa o buscando por nombre/teléfono.
                      </p>
                      {(filterTab !== 'all' || originFilter !== 'all') && (
                        <button
                          onClick={() => { setFilterTab('all'); setOriginFilter('all'); setSearchQuery(''); }}
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
                          : lead.estado === 'Venta'
                          ? 'bg-emerald-50/20'
                          : lead.estado === 'Perdido'
                          ? 'bg-slate-50/60 opacity-80'
                          : isEnSeguimiento(lead)
                          ? 'bg-blue-50/20'
                          : leadIsPorHablar
                          ? 'bg-orange-50/20'
                          : ''
                      }`}
                    >
                      {/* Columna 1: Lead / Contacto */}
                      <td className="px-6 py-4">
                        <div className="flex items-start space-x-3.5">
                          <div className="relative shrink-0 mt-0.5">
                            <div className={`h-11 w-11 rounded-[16px] flex items-center justify-center font-black text-xs shadow-sm ${
                              lead.estado === 'Venta'
                                ? 'bg-emerald-600 text-white'
                                : lead.estado === 'Perdido'
                                ? 'bg-slate-400 text-white'
                                : lead.priority === 'urgent' && leadIsPorHablar
                                ? 'bg-red-600 text-white animate-pulse'
                                : leadIsPorHablar
                                ? 'bg-[#FF6B00] text-white'
                                : isEnSeguimiento(lead)
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-900 text-[#FF6B00]'
                            }`}>
                              {lead.estado === 'Venta' ? '🏆' : lead.estado === 'Perdido' ? '✕' : lead.priority === 'urgent' && leadIsPorHablar ? '!' : (lead.nombre?.[0] || '?')}
                            </div>
                            <span className="absolute -bottom-1 -right-1 text-[10px] bg-white rounded-full px-0.5 shadow-xs border border-slate-100 leading-none">
                              {getChannelIcon(lead.origen)}
                            </span>
                            {leadIsPorHablar && (
                              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white animate-ping" />
                            )}
                            {isEnSeguimiento(lead) && (
                              <span className="absolute -bottom-1 -right-1 h-4 w-4 bg-blue-500 rounded-full text-white text-[8px] flex items-center justify-center border border-white">
                                <Check size={10} />
                              </span>
                            )}
                            {lead.estado === 'Venta' && (
                              <span className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full text-white text-[8px] flex items-center justify-center border border-white">
                                ✓
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
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="flex items-center space-x-1 text-[10px] font-bold text-slate-400">
                                <Phone size={10} className="text-slate-300 shrink-0" />
                                <span className="truncate">{lead.phone || lead.whatsapp_id || 'Sin teléfono'}</span>
                              </div>
                              {lead.origen && !lead.origen.toLowerCase().includes('whatsapp') && (
                                <ChannelBadge origen={lead.origen} size="xs" />
                              )}
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

                      {/* Columna 3: Etapa Actual & Selector */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col space-y-1.5">
                          {/* Selector de Estado en vivo */}
                          <select
                            value={lead.estado || 'Nuevo'}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleMarkFollowUp(lead, e.target.value)}
                            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-xl border outline-none cursor-pointer transition-all shadow-xs ${
                              lead.estado === 'Venta'
                                ? 'bg-emerald-500 text-white border-emerald-600'
                                : lead.estado === 'Perdido'
                                ? 'bg-slate-200 text-slate-700 border-slate-300'
                                : isEnSeguimiento(lead)
                                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                : leadIsPorHablar
                                ? 'bg-orange-500 text-white border-orange-600'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="Nuevo">⏳ 1. Por Hablarles (Nuevo)</option>
                            <option value="En Seguimiento">🔄 2. En Seguimiento</option>
                            <option value="Interesado">⭐ 2. Interesado (Cotizando)</option>
                            <option value="Cita Agendada">📅 2. Cita / Visita</option>
                            <option value="Venta">🏆 3. Cerró Venta (Compró)</option>
                            <option value="Perdido">❌ 4. No Compró (Perdido)</option>
                            <option value="Post-Venta">🛠️ Post-Venta</option>
                          </select>

                          {/* Mini indicador */}
                          <div className="flex items-center space-x-1 text-[9px] font-bold text-slate-400">
                            <span>Score: {lead.score || 0}%</span>
                            <span>·</span>
                            <span>{lead.botActive ? 'IA Activa' : 'Manual'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Columna 4: Acciones Inmediatas */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* BOTONES DE DECISIÓN RÁPIDA */}
                          {leadIsPorHablar ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkFollowUp(lead, 'En Seguimiento');
                              }}
                              title="Marcar como atendido y pasar a seguimiento"
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider flex items-center space-x-1 shadow-sm transition-all active:scale-95"
                            >
                              <Check size={12} className="stroke-[3]" />
                              <span>Atendido</span>
                            </button>
                          ) : isEnSeguimiento(lead) ? (
                            <div className="flex items-center space-x-1">
                              {/* Botón rápido Venta */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkFollowUp(lead, 'Venta');
                                }}
                                title="Marcar que compró (Cerrar Venta)"
                                className="px-2 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-black text-[9px] uppercase tracking-wider border border-emerald-200 transition-all active:scale-95"
                              >
                                🏆 Compró
                              </button>

                              {/* Botón rápido No Compró */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkFollowUp(lead, 'Perdido');
                                }}
                                title="Marcar que no compró (Descartar)"
                                className="px-2 py-1.5 rounded-xl bg-red-50 hover:bg-red-600 hover:text-white text-red-700 font-black text-[9px] uppercase tracking-wider border border-red-200 transition-all active:scale-95"
                              >
                                ✕ No compró
                              </button>
                            </div>
                          ) : lead.estado === 'Venta' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkFollowUp(lead, 'En Seguimiento');
                              }}
                              title="Regresar a seguimiento si solo estaba interesado"
                              className="px-2 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-black text-[9px] uppercase tracking-wider border border-blue-200 transition-all"
                            >
                              🔄 A Seguimiento
                            </button>
                          ) : null}

                          {/* BOTÓN CHAT */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenConversation) onOpenConversation(lead.id);
                            }}
                            title="Abrir chat en el panel"
                            className="px-3 py-1.5 rounded-xl bg-slate-900 text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white font-black text-[10px] uppercase tracking-wider flex items-center space-x-1.5 shadow-sm transition-all active:scale-95 group/btn"
                          >
                            <MessageSquare size={13} className="group-hover/btn:scale-110 transition-transform" />
                            <span>Chat</span>
                          </button>

                          {/* BOTÓN WHATSAPP */}
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="Abrir WhatsApp directamente"
                              className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
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
                            className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
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
                            className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
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
                <p className="text-[10px] font-bold text-slate-400">Actualiza la información de contacto y etapa</p>
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Etapa del Embudo</label>
                  <select
                    value={editingLead.estado || 'Nuevo'}
                    onChange={e => setEditingLead({ ...editingLead, estado: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all"
                  >
                    <option value="Nuevo">1. Por Hablarles (Nuevo)</option>
                    <option value="En Seguimiento">2. En Seguimiento (En Negociación)</option>
                    <option value="Interesado">2. Interesado (Cotizando)</option>
                    <option value="Cita Agendada">2. Cita / Visita Agendada</option>
                    <option value="Venta">3. Cerró Venta (Compró)</option>
                    <option value="Perdido">4. No Compró (Perdido)</option>
                    <option value="Post-Venta">🛠️ Post-Venta</option>
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
                  placeholder="Motivo por el que no compró o notas de seguimiento..."
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
