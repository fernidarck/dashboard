import { useMemo, useEffect, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, Heart, MessageCircle, ExternalLink,
  RefreshCw, Users, Video, Image as ImageIcon, Sparkles, ThumbsUp, TrendingUp, UserPlus
} from 'lucide-react';

function getCleanWhatsAppUrl(phone) {
  if (!phone) return null;
  let clean = String(phone).replace(/\D/g, '');
  if (clean.length === 8) clean = '502' + clean;
  return `https://wa.me/${clean}`;
}

function ChannelIcon({ origen }) {
  const orig = String(origen || '').toLowerCase();
  if (orig.includes('instagram')) return <span title="Instagram Direct">📸</span>;
  if (orig.includes('facebook')) return <span title="Facebook Messenger">📘</span>;
  return <span title="WhatsApp">🟢</span>;
}

function LeadRow({ lead, onOpenConversation }) {
  const isUrgent = lead.priority === 'urgent' || !!lead.handoff_reason || lead.estado === 'Intervención Requerida';
  const isWhatsApp = !lead.origen || String(lead.origen).toLowerCase().includes('whatsapp');
  const waUrl = isWhatsApp ? getCleanWhatsAppUrl(lead.phone || lead.whatsapp_id) : null;
  const necesidad = (lead.motor && lead.motor !== 'N/A') ? lead.motor
    : (lead.falla && lead.falla !== 'N/A') ? lead.falla : null;
  const zona = (lead.zona && lead.zona !== 'N/A') ? lead.zona : null;
  const detalle = [necesidad, zona].filter(Boolean).join(' · ');

  return (
    <div className="group flex items-center gap-3.5 py-3 border-b border-slate-100 last:border-0">
      <div className="relative shrink-0">
        <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs ${
          isUrgent ? 'bg-orange-50 text-[#FF6B00]' : 'bg-slate-100 text-slate-500'
        }`}>
          {lead.nombre?.[0]?.toUpperCase() || '?'}
        </div>
        <span className="absolute -bottom-1 -right-1 text-[9px] bg-white rounded-full px-0.5 shadow-xs border border-slate-100 leading-none">
          <ChannelIcon origen={lead.origen} />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900 truncate">{lead.nombre || 'Cliente'}</p>
          {lead.origen && !isWhatsApp && (
            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              {lead.origen.includes('Instagram') ? 'Instagram' : 'Facebook'}
            </span>
          )}
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
      className="w-full flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 text-left hover:bg-slate-50/70 -mx-2 px-2 rounded-lg transition-colors cursor-pointer">
      <div className="relative shrink-0">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-[11px] ${
          isUrgent ? 'bg-red-50 text-red-500' : lead.botActive ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
        }`}>
          {lead.nombre?.[0]?.toUpperCase() || '?'}
        </div>
        <span className="absolute -bottom-1 -right-1 text-[8px] bg-white rounded-full px-0.5 shadow-xs border border-slate-100 leading-none">
          <ChannelIcon origen={lead.origen} />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-semibold text-slate-800 truncate">{lead.nombre || 'Cliente'}</p>
        </div>
        <p className="text-[11px] text-slate-400 truncate">{lead.lastMessage || 'Sin mensajes'}</p>
      </div>
      <span className="text-[10px] text-slate-300 shrink-0">{lead.time || ''}</span>
    </button>
  );
}

export default function ViewDashboard({
  leads = [],
  pedidos = [],
  stats = {},
  metaInsights = null,
  onFetchMetaInsights,
  onOpenConversation,
  onOpenLeads,
  onConfigureAgent
}) {
  const [loadingMeta, setLoadingMeta] = useState(false);

  useEffect(() => {
    if (!metaInsights && onFetchMetaInsights) {
      onFetchMetaInsights();
    }
  }, [metaInsights, onFetchMetaInsights]);

  const handleRefreshMeta = async () => {
    setLoadingMeta(true);
    try {
      await onFetchMetaInsights?.();
    } finally {
      setLoadingMeta(false);
    }
  };

  const cleanPh = (p) => String(p || '').replace(/\D/g, '');
  const pedidoPhones = useMemo(() => new Set((pedidos || []).map(p => cleanPh(p.phone)).filter(Boolean)), [pedidos]);
  const hizoPedido = (l) => pedidoPhones.has(cleanPh(l.phone));
  const esProspecto = (l) => [l.zona, l.direccion, l.nit].some(v => v && v !== 'N/A' && v !== 'null' && String(v).trim());
  const isEnSeguimiento = (l) => l.estado === 'En Seguimiento' || l.estado === 'Cita Agendada';
  const isFollowedUp = (l) => isEnSeguimiento(l) || l.estado === 'Venta' || l.estado === 'Perdido' || l.estado === 'Post-Venta';

  const isPorHablar = (l) => {
    if (l.archived || isFollowedUp(l)) return false;
    if (hizoPedido(l)) return true;
    if (String(l.nombre || '').trim().toLowerCase() === 'agente') return false;
    return esProspecto(l) || !!l.handoff_reason;
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

  const ig = metaInsights?.instagram;
  const fb = metaInsights?.facebook;
  const posts = metaInsights?.posts || [];

  return (
    <div className="max-w-6xl mx-auto space-y-9 animate-in fade-in duration-500 pb-10">

      {/* HEADER */}
      <div className="flex items-baseline justify-between flex-wrap gap-2 pt-1">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Panel Principal</h2>
          <p className="text-xs text-slate-400 mt-0.5">OneControl · Guatemala</p>
        </div>
        {porHablar.length > 0 && (
          <button onClick={onOpenLeads} className="text-xs font-bold text-[#FF6B00] hover:text-[#c95400] flex items-center gap-1.5 transition-colors cursor-pointer">
            {porHablar.length} por contactar <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* KPIs — Negocio */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <button key={i} onClick={k.onClick}
            className={`bg-white border border-slate-200 rounded-2xl p-5 text-left transition-all ${k.onClick ? 'hover:border-slate-300 hover:shadow-sm cursor-pointer' : 'cursor-default'}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className={`h-1.5 w-1.5 rounded-full ${k.dot}`} />
              <p className="text-[11px] text-slate-400 uppercase tracking-widest font-black">{k.label}</p>
            </div>
            <p className={`text-3xl font-black ${k.color} tabular-nums leading-none`}>{k.value}</p>
          </button>
        ))}
      </div>

      {/* BANNER DESTACADO DE NUEVOS SEGUIDORES GANADOS HOY */}
      {(metaInsights?.stats?.totalGainedToday > 0 || ig?.gained_today > 0 || fb?.gained_today > 0) && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-5 rounded-3xl text-white shadow-xl shadow-emerald-600/20 flex items-center justify-between flex-wrap gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shrink-0 shadow-inner">
              🎉
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-white/25 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                  Crecimiento Hoy
                </span>
                <span className="text-emerald-200 text-xs font-bold">Meta / Redes Sociales</span>
              </div>
              <h4 className="text-base font-black mt-1 tracking-tight">
                ¡Ganaste +{(metaInsights?.stats?.totalGainedToday || ((ig?.gained_today || 0) + (fb?.gained_today || 0)))} nuevos seguidores hoy!
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {ig?.gained_today > 0 && (
              <span className="text-xs font-black bg-white/20 backdrop-blur-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 border border-white/20">
                <span>📸</span> Instagram: +{ig.gained_today}
              </span>
            )}
            {fb?.gained_today > 0 && (
              <span className="text-xs font-black bg-white/20 backdrop-blur-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 border border-white/20">
                <span>📘</span> Facebook: +{fb.gained_today}
              </span>
            )}
          </div>
        </div>
      )}

      {/* REDES SOCIALES & META INSIGHTS (Instagram & Facebook) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 text-white rounded-2xl shadow-md shadow-pink-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                Redes Sociales & Meta Engagement
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                  Instagram & Facebook
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Likes, seguidores y publicaciones destacadas en tiempo real.</p>
            </div>
          </div>

          <button
            onClick={handleRefreshMeta}
            disabled={loadingMeta}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw size={13} className={loadingMeta ? "animate-spin text-[#FF6B00]" : "text-slate-500"} />
            <span>{loadingMeta ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        </div>

        {/* Resumen Canales Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Instagram Card */}
          <div className="p-4.5 rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50/40 via-white to-orange-50/30 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                {ig?.profile_picture_url ? (
                  <img src={ig.profile_picture_url} alt="IG" className="h-10 w-10 rounded-full object-cover border border-pink-200 shadow-xs" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center font-bold text-sm">IG</div>
                )}
                <div>
                  <h4 className="text-xs font-black text-slate-900">{ig?.name || '@onecontrol.shop'}</h4>
                  <p className="text-[10px] text-pink-600 font-bold">@{ig?.username || '0ne_control'}</p>
                </div>
              </div>
              <a
                href={`https://instagram.com/${ig?.username || '0ne_control'}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition-colors"
              >
                <ExternalLink size={14} />
              </a>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-pink-100/60 text-center">
              <div>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-base font-black text-slate-900 leading-tight">
                    {(ig?.followers_count ?? '—').toLocaleString()}
                  </p>
                  {ig?.gained_today > 0 && (
                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded-full">
                      +{ig.gained_today}
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Seguidores</p>
              </div>
              <div>
                <p className="text-base font-black text-slate-900 leading-tight">{ig?.media_count ?? posts.length}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Posts</p>
              </div>
              <div>
                <p className="text-base font-black text-pink-600 leading-tight flex items-center justify-center gap-1">
                  <Heart size={12} className="fill-pink-500 text-pink-500" />
                  <span>{(metaInsights?.stats?.totalLikes || 0).toLocaleString()}</span>
                </p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Likes</p>
              </div>
            </div>
          </div>

          {/* Facebook Card */}
          <div className="p-4.5 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/40 via-white to-slate-50 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                {fb?.picture ? (
                  <img src={fb.picture} alt="FB" className="h-10 w-10 rounded-full object-cover border border-blue-200 shadow-xs" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">FB</div>
                )}
                <div>
                  <h4 className="text-xs font-black text-slate-900">{fb?.name || 'Onecontrolshop'}</h4>
                  <p className="text-[10px] text-blue-600 font-bold">Página Oficial</p>
                </div>
              </div>
              <a
                href={fb?.link || 'https://facebook.com/1059922890527747'}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <ExternalLink size={14} />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-100/60 text-center">
              <div>
                <p className="text-base font-black text-slate-900 leading-tight">{fb?.fan_count ?? '—'}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Me Gusta</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-base font-black text-blue-600 leading-tight">
                    {(fb?.followers_count ?? fb?.fan_count ?? '—').toLocaleString()}
                  </p>
                  {fb?.gained_today > 0 && (
                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded-full">
                      +{fb.gained_today}
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Seguidores</p>
              </div>
            </div>
          </div>

          {/* Interacciones Totales */}
          <div className="p-4.5 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/40 via-white to-pink-50/30 flex flex-col justify-between space-y-3 sm:col-span-2 lg:col-span-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-700">Alcance & Interacción</span>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium flex items-center gap-1.5"><Heart size={14} className="text-pink-500 fill-pink-500" /> Total Likes en posts:</span>
                <span className="font-black text-slate-900">{(metaInsights?.stats?.totalLikes || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium flex items-center gap-1.5"><MessageCircle size={14} className="text-blue-500" /> Comentarios registrados:</span>
                <span className="font-black text-slate-900">{(metaInsights?.stats?.totalComments || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium flex items-center gap-1.5"><Users size={14} className="text-emerald-500" /> Audiencia total:</span>
                <div className="flex items-center gap-1">
                  <span className="font-black text-slate-900">{(metaInsights?.stats?.totalFollowers || 0).toLocaleString()}</span>
                  {(metaInsights?.stats?.totalGainedToday > 0) && (
                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                      +{metaInsights.stats.totalGainedToday} hoy
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Publicaciones & Reels Recientes */}
        {posts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Publicaciones y Reels Destacados</span>
              <span className="text-[10px] font-bold text-slate-400">Conteo de Likes y Comentarios</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {posts.slice(0, 8).map((post) => (
                <div key={post.id} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl overflow-hidden hover:border-pink-300 hover:shadow-md transition-all flex flex-col group">
                  {/* Thumbnail */}
                  <div className="relative aspect-square bg-slate-900 overflow-hidden">
                    {post.thumbnail ? (
                      <img
                        src={post.thumbnail}
                        alt="Post"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-bold">Sin imagen</div>
                    )}
                    <span className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white flex items-center gap-1">
                      {post.media_type === 'VIDEO' ? <Video size={10} /> : <ImageIcon size={10} />}
                      <span>{post.media_type === 'VIDEO' ? 'Reel' : 'Post'}</span>
                    </span>
                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-[#FF6B00] text-white opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  {/* Caption & Metrics */}
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
                        Ver post →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MAIN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-9">

        {/* A quién hablarle */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              A quién hablarle
              <span className="text-[10px] font-black text-[#FF6B00] bg-orange-50 rounded-full px-2 py-0.5">{porHablar.length}</span>
            </h3>
            {porHablar.length > 0 && (
              <button onClick={onOpenLeads} className="text-[11px] font-bold text-slate-400 hover:text-[#FF6B00] flex items-center gap-1 transition-colors cursor-pointer">
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
            <h3 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
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

          <div className="bg-slate-900 rounded-2xl p-5 shadow-lg">
            <p className="text-[11px] font-black text-[#FF6B00] uppercase tracking-widest mb-3">Impacto de la IA</p>
            <div className="flex items-end gap-8">
              <div>
                <p className="text-2xl font-black text-white tabular-nums leading-none">{botMessages}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1.5">mensajes automáticos</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white tabular-nums leading-none">{Math.max(1, Math.round((botMessages * 5) / 60))}h</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1.5">tiempo ahorrado</p>
              </div>
            </div>
            {onConfigureAgent && (
              <button onClick={onConfigureAgent} className="mt-4 text-xs font-bold text-[#FF6B00] hover:text-orange-300 flex items-center gap-1.5 transition-colors cursor-pointer">
                Configurar agente <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
