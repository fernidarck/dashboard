import { useState, useRef, useMemo, useEffect } from 'react';
import {
  Search, X, AlertTriangle, Bot, Power, Database,
  MoreVertical, SendHorizontal, Tag, Zap, ArrowLeft, Paperclip, FileText,
  ShoppingBag, Sparkles, Check, ExternalLink, Image as ImageIcon,
  UserPlus, Phone, Download, RefreshCw, UploadCloud
} from 'lucide-react';

function ChannelBadge({ origen, size = 'sm' }) {
  const orig = String(origen || '').toLowerCase();
  if (orig.includes('instagram')) {
    return (
      <span className={`inline-flex items-center gap-1 font-black uppercase tracking-wider rounded-md bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-orange-500/15 text-pink-700 border border-pink-200/80 ${size === 'xs' ? 'text-[8px] px-1.5 py-0.5' : 'text-[9px] px-2 py-0.5'}`}>
        <span>📸</span> Instagram Direct
      </span>
    );
  }
  if (orig.includes('facebook')) {
    return (
      <span className={`inline-flex items-center gap-1 font-black uppercase tracking-wider rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 ${size === 'xs' ? 'text-[8px] px-1.5 py-0.5' : 'text-[9px] px-2 py-0.5'}`}>
        <span>📘</span> Facebook Messenger
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 font-black uppercase tracking-wider rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${size === 'xs' ? 'text-[8px] px-1.5 py-0.5' : 'text-[9px] px-2 py-0.5'}`}>
      <span>🟢</span> WhatsApp
    </span>
  );
}

const getChannelBadge = (lead) => {
  const orig = String(lead?.origen || '').toLowerCase();
  const cPhone = String(lead?.channel_phone || '');
  if (orig.includes('instagram')) return { icon: '📸', label: 'Instagram Direct', color: 'bg-pink-100 text-pink-700 border-pink-200' };
  if (orig.includes('facebook')) return { icon: '📘', label: 'Facebook Messenger', color: 'bg-blue-100 text-blue-700 border-blue-200' };
  if (orig.includes('web')) return { icon: '💻', label: 'Web onecontrol.shop', color: 'bg-purple-100 text-purple-700 border-purple-200' };
  if (cPhone.includes('35154362')) return { icon: '📱', label: 'Reach (35154362)', color: 'bg-amber-100 text-amber-800 border-amber-200' };
  return { icon: '🌟', label: 'OneControl (59658803)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
};

const getChannelIcon = (origen, channelPhone) => {
  const orig = String(origen || '').toLowerCase();
  const cPhone = String(channelPhone || '');
  if (orig.includes('instagram')) return '📸';
  if (orig.includes('facebook')) return '📘';
  if (orig.includes('web')) return '💻';
  if (cPhone.includes('35154362')) return '📱';
  return '🌟';
};

export default function ViewConversaciones({
  leads = [],
  messages = [],
  products = [],
  selectedChatId,
  selectedLead = {},
  onSelectChat,
  onSendMessage,
  onSendDocument,
  onToggleBot,
  messagesContainerRef,
  messagesEndRef,
  openChatNonce = 0
}) {
  const [messageText, setMessageText] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [sendingDoc, setSendingDoc] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [channelTab, setChannelTab] = useState('todos');
  const fileInputRef = useRef(null);

  // Al navegar desde Leads/Dashboard/notificación (cambia openChatNonce), abrir el chat
  // específico también en móvil (no quedarse en la lista general).
  useEffect(() => {
    if (openChatNonce) setMobileShowChat(true);
  }, [openChatNonce]);

  const handleSend = async () => {
    if (!messageText.trim()) return;
    const text = messageText;
    setMessageText('');
    await onSendMessage(selectedChatId, text);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedChatId) return;
    if (file.size > 25 * 1024 * 1024) { alert('El archivo supera el límite de 25 MB.'); return; }
    setSendingDoc(true);
    try { await onSendDocument?.(selectedChatId, file); }
    finally { setSendingDoc(false); }
  };

  // Drag and Drop tipo WhatsApp Web
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragging) setIsDragging(true);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0 || !selectedChatId) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 25 * 1024 * 1024) {
        alert(`El archivo "${file.name}" supera el límite de 25 MB.`);
        continue;
      }
      setSendingDoc(true);
      try {
        await onSendDocument?.(selectedChatId, file);
      } catch (err) {
        console.error('Error enviando archivo arrastrado:', err);
      } finally {
        setSendingDoc(false);
      }
    }
  };

  // Pegar imagen o archivos desde el portapapeles (Ctrl/Cmd+V) y enviarlos como WhatsApp Web
  const handlePaste = async (e) => {
    // Si se pegan archivos copiados del sistema
    const files = e.clipboardData?.files;
    if (files && files.length > 0 && selectedChatId) {
      e.preventDefault();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 25 * 1024 * 1024) { alert(`El archivo "${file.name}" supera el límite de 25 MB.`); continue; }
        setSendingDoc(true);
        try { await onSendDocument?.(selectedChatId, file); }
        finally { setSendingDoc(false); }
      }
      return;
    }

    const items = e.clipboardData?.items;
    if (!items || !selectedChatId) return;
    for (const it of items) {
      if (it.type && it.type.startsWith('image/')) {
        const blob = it.getAsFile();
        if (!blob) continue;
        e.preventDefault();
        if (blob.size > 25 * 1024 * 1024) { alert('La imagen es muy grande (máximo 25 MB).'); return; }
        const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
        const file = new File([blob], `captura-${Date.now()}.${ext}`, { type: blob.type });
        setSendingDoc(true);
        try { await onSendDocument?.(selectedChatId, file); }
        finally { setSendingDoc(false); }
        return;
      }
    }
  };

  // Función para guardar / descargar contacto en la agenda del teléfono (.vcf vCard)
  const downloadVCard = (lead) => {
    if (!lead || !lead.phone) return;
    const cleanPhone = String(lead.phone).replace(/[^0-9+]/g, '');
    const cleanName = String(lead.nombre || '').trim() || `Cliente ${cleanPhone}`;
    const vCardData = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${cleanName}`,
      `N:${cleanName};;;;`,
      `TEL;TYPE=CELL,VOICE:${cleanPhone}`,
      `ORG:OneControl CRM`,
      lead.motor && lead.motor !== 'N/A' ? `TITLE:Motor ${lead.motor}` : '',
      `NOTE:Motor: ${lead.motor || 'N/A'} | Zona: ${lead.zona || 'N/A'} | Origen: ${lead.origen || 'WhatsApp'} | OneControl`,
      'END:VCARD'
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${cleanName.replace(/[^a-zA-Z0-9_-]/g, '_')}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtrado y ordenamiento en tiempo real de leads en la bandeja
  const filteredLeads = useMemo(() => {
    let list = [...leads];
    
    // Filtrar por pestaña de canal
    if (channelTab === 'onecontrol') {
      list = list.filter(l => String(l.channel_phone || '').includes('59658803') || (!l.channel_phone && !String(l.origen).toLowerCase().includes('instagram') && !String(l.origen).toLowerCase().includes('facebook') && !String(l.origen).toLowerCase().includes('web')));
    } else if (channelTab === 'reach') {
      list = list.filter(l => String(l.channel_phone || '').includes('35154362'));
    } else if (channelTab === 'instagram') {
      list = list.filter(l => l.origen && String(l.origen).toLowerCase().includes('instagram'));
    } else if (channelTab === 'facebook') {
      list = list.filter(l => l.origen && String(l.origen).toLowerCase().includes('facebook'));
    } else if (channelTab === 'webchat') {
      list = list.filter(l => l.origen && String(l.origen).toLowerCase().includes('web'));
    }

    if (chatSearch.trim()) {
      const rawQ = chatSearch.toLowerCase().trim();
      const numQ = rawQ.replace(/\D/g, '');
      list = list.filter(l => {
        const nameMatch = (l.nombre || '').toLowerCase().includes(rawQ);
        const phoneMatch = (l.phone || '').toLowerCase().includes(rawQ) || (numQ.length >= 4 && (l.phone || '').replace(/\D/g, '').includes(numQ));
        const motorMatch = (l.motor || '').toLowerCase().includes(rawQ);
        const msgMatch = (l.lastMessage || '').toLowerCase().includes(rawQ);
        const estadoMatch = (l.estado || '').toLowerCase().includes(rawQ);
        const origenMatch = (l.origen || '').toLowerCase().includes(rawQ);
        return nameMatch || phoneMatch || motorMatch || msgMatch || estadoMatch || origenMatch;
      });
    }
    // Ordenar: urgentes primero, luego la conversación con mensaje más reciente en primera fila
    return list.sort((a, b) => {
      const aUrgent = a.priority === 'urgent' ? 1 : 0;
      const bUrgent = b.priority === 'urgent' ? 1 : 0;
      if (aUrgent !== bUrgent) return bUrgent - aUrgent;
      const aMsg = Number(a.lastMsgId || 0);
      const bMsg = Number(b.lastMsgId || 0);
      if (aMsg !== bMsg) return bMsg - aMsg;
      return (b.id || 0) - (a.id || 0);
    });
  }, [leads, chatSearch, channelTab]);

  // Filtrado de productos para enviar desde el catálogo
  const filteredProducts = useMemo(() => {
    const activeProds = products.filter(p => p.activo !== 0);
    if (!catalogSearch.trim()) return activeProds;
    const q = catalogSearch.toLowerCase();
    return activeProds.filter(p =>
      (p.nombre || '').toLowerCase().includes(q) ||
      (p.descripcion || '').toLowerCase().includes(q) ||
      (p.categoria || '').toLowerCase().includes(q)
    );
  }, [products, catalogSearch]);

  // Acción rápida: Enviar producto del catálogo al cliente por WhatsApp
  const handleSendProduct = async (product) => {
    const msg = `✨ *${product.nombre}*\n💰 Precio: Q${product.precio}\n${product.descripcion ? `📝 ${product.descripcion}\n` : ''}🚚 Entrega armada y lista para usar.`;
    await onSendMessage(selectedChatId, msg);
    setShowCatalogModal(false);
  };

  return (
    <div className="flex h-full animate-in fade-in duration-500 bg-white border-t border-slate-100 relative">
      {/* Lead list */}
      <div className={`w-full md:w-80 border-r border-slate-100 flex-col shrink-0 ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 md:p-5 border-b border-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest italic">Bandeja de entrada</h3>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{filteredLeads.length}</span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              value={chatSearch}
              onChange={e => setChatSearch(e.target.value)}
              placeholder="Buscar nombre, ID, motor..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF6B00] transition-all"
            />
            {chatSearch && (
              <button onClick={() => setChatSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filtro rápido de canales */}
          <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl overflow-x-auto no-scrollbar">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'onecontrol', label: '🌟 OneControl' },
              { id: 'reach', label: '📱 Reach' },
              { id: 'instagram', label: '📸 IG' },
              { id: 'facebook', label: '📘 FB' },
              { id: 'webchat', label: '💻 Web' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setChannelTab(tab.id)}
                className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg shrink-0 transition-all cursor-pointer ${
                  channelTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-slate-50">
          {filteredLeads.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs px-4">
              No hay conversaciones en este filtro.
            </div>
          ) : filteredLeads.map(lead => {
            const badgeInfo = getChannelBadge(lead);
            return (
              <button
                key={lead.id}
                onClick={() => { onSelectChat(lead.id); setMobileShowChat(true); }}
                className={`w-full p-4 md:p-5 text-left hover:bg-slate-50 transition-all relative ${
                  selectedChatId === lead.id ? 'bg-orange-50/40 border-l-4 border-[#FF6B00]' : ''
                } ${lead.priority === 'urgent' ? 'bg-red-50/60' : ''}`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className="relative shrink-0">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs shadow-sm ${
                      lead.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                      lead.estado === 'Venta' ? 'bg-emerald-100 text-emerald-600' :
                      lead.botActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-900 text-[#FF6B00]'
                    }`}>
                      {lead.priority === 'urgent' ? <AlertTriangle size={14} /> : lead.estado === 'Venta' ? '🏆' : lead.botActive ? <Bot size={14} /> : (lead.nombre?.[0] || '?')}
                    </div>
                    {/* Badge con el ícono del canal de origen */}
                    <span className="absolute -bottom-1 -right-1 text-[10px] bg-white rounded-full px-0.5 shadow-xs border border-slate-100 leading-none" title={badgeInfo.label}>
                      {getChannelIcon(lead.origen, lead.channel_phone)}
                    </span>
                    {lead.priority === 'urgent' && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className={`text-xs font-black truncate ${lead.priority === 'urgent' ? 'text-red-700' : 'text-slate-800'}`}>{lead.nombre}</p>
                      {lead.lastMessageTime && <span className="text-[8px] font-bold text-slate-400 tabular-nums shrink-0 ml-1">{lead.lastMessageTime}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[10px] text-slate-400 font-bold tabular-nums truncate">{lead.phone || 'Sin número'}</p>
                      <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-md border ${badgeInfo.color}`}>
                        {badgeInfo.label}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className={`text-[9px] font-black uppercase tracking-tighter ${
                        lead.priority === 'urgent' ? 'text-red-500' :
                        lead.estado === 'Venta' ? 'text-emerald-600' :
                        lead.botActive ? 'text-emerald-500' : 'text-slate-400'
                      }`}>
                        {lead.priority === 'urgent' ? '⚠️ INTERVENCIÓN' : lead.estado === 'Venta' ? '🏆 VENTA' : lead.botActive ? `Score: ${lead.score || 0}%` : 'Modo Manual'}
                      </p>
                    </div>
                  </div>
                </div>
                {lead.motor && lead.motor !== 'N/A' && (
                  <div className="mb-1 inline-flex items-center gap-1 text-[9px] font-black text-orange-800 bg-orange-100/70 px-2 py-0.5 rounded-md">
                    <Tag size={9} className="text-[#FF6B00]" />
                    <span className="truncate">{lead.motor}</span>
                  </div>
                )}
                {lead.handoff_reason && (
                  <p className="text-[9px] text-red-500 font-bold italic truncate mt-1 leading-none">⚠️ {lead.handoff_reason}</p>
                )}
                {!lead.handoff_reason && (
                  <p className="text-[11px] text-slate-500 truncate mt-1 font-medium italic leading-none">
                    {lead.lastMessage ? `"${lead.lastMessage}"` : "Sin mensajes recientes"}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat area con soporte Drag and Drop tipo WhatsApp Web */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex-1 flex-col bg-[#FDFDFD] min-w-0 relative ${mobileShowChat ? 'flex' : 'hidden md:flex'}`}
      >
        {/* Overlay visual cuando se arrastra un archivo encima */}
        {isDragging && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-[250] flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
            <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl border-2 border-dashed border-[#FF6B00] flex flex-col items-center text-center space-y-4">
              <div className="h-20 w-20 rounded-3xl bg-orange-100 text-[#FF6B00] flex items-center justify-center animate-bounce shadow-md">
                <FileText size={40} className="stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Soltá tu PDF o Archivo aquí
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  Se enviará automáticamente por WhatsApp a <span className="text-[#FF6B00] font-bold">{selectedLead.nombre || 'este cliente'}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">
                <span>📄 PDF</span>
                <span>•</span>
                <span>🖼️ Imagen</span>
                <span>•</span>
                <span>📊 Documento</span>
              </div>
            </div>
          </div>
        )}

        {/* Indicador flotante cuando se está subiendo el archivo */}
        {sendingDoc && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 z-50 text-xs font-black border border-slate-700 animate-in slide-in-from-top duration-200">
            <RefreshCw size={15} className="animate-spin text-[#FF6B00]" />
            <span>Enviando documento por WhatsApp...</span>
          </div>
        )}

        <div className="h-20 border-b border-slate-100 px-4 md:px-8 flex items-center justify-between bg-white/80 backdrop-blur-md">
          <div className="flex items-center space-x-2 md:space-x-4 min-w-0">
            <button onClick={() => setMobileShowChat(false)} className="md:hidden p-2 -ml-1 text-slate-500 hover:text-slate-800 shrink-0"><ArrowLeft size={20} /></button>
            <div className="h-10 w-10 rounded-xl bg-slate-800 text-[#FF6B00] flex items-center justify-center font-black text-sm border border-[#FF6B00] shrink-0 relative">
              {selectedLead.nombre?.[0] || 'OC'}
              <span className="absolute -bottom-1 -right-1 text-[10px] bg-white rounded-full px-0.5 shadow-xs border border-slate-200 leading-none">
                {getChannelIcon(selectedLead.origen)}
              </span>
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">{selectedLead.nombre || 'Selecciona un chat'}</p>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <ChannelBadge origen={selectedLead.origen} size="xs" />
                <p className={`text-[9px] font-bold uppercase tracking-widest ${selectedLead.botActive ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {selectedLead.botActive ? 'IA Gestionando' : 'Modo Manual / Humano'}
                </p>
                {selectedLead.estado && (
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                    selectedLead.estado === 'Venta' ? 'bg-emerald-500 text-white' :
                    selectedLead.estado === 'En Seguimiento' ? 'bg-blue-500 text-white' :
                    'bg-slate-700 text-white'
                  }`}>{selectedLead.estado}</span>
                )}
                {selectedLead.phone && (
                  <span className="text-[10px] text-slate-400 font-medium">· {selectedLead.phone}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
            {selectedLead.phone && (!selectedLead.origen || selectedLead.origen.toLowerCase().includes('whatsapp')) && (
              <button
                onClick={() => downloadVCard(selectedLead)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-[#FF6B00] transition-all border border-slate-200 shadow-xs"
                title="Guardar contacto en la agenda del teléfono / WhatsApp (.vcf)"
              >
                <UserPlus size={14} className="text-[#FF6B00]" />
                <span className="hidden sm:inline">Guardar Contacto</span>
              </button>
            )}
            {selectedLead.id && (
              <button
                onClick={() => onToggleBot(selectedLead.id)}
                className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  selectedLead.botActive
                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <Power size={14} />
                <span className="hidden sm:inline">{selectedLead.botActive ? 'Desactivar IA' : 'Activar IA'}</span>
              </button>
            )}
            <button onClick={() => setShowSidebar(!showSidebar)} className="hidden md:block p-2.5 bg-slate-50 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all" title="Ver ficha del lead"><Database size={18} /></button>
          </div>
        </div>

        {/* Mensajes */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 no-scrollbar">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
              <Bot size={32} className="text-slate-300" />
              <p className="text-xs font-bold">No hay mensajes en esta conversación.</p>
              <p className="text-[10px]">Envía un mensaje o ficha del catálogo para iniciar el contacto.</p>
            </div>
          ) : (
            messages.map((m, i) => {
              const isClient = m.sender === 'client';
              const isAgent = m.sender === 'agent' || m.sender === 'user' || m.sender === 'human';
              const isBot = m.sender === 'bot';
              const origLower = String(selectedLead.origen || '').toLowerCase();
              const isInstagram = origLower.includes('instagram');
              const isFacebook = origLower.includes('facebook');

              const senderLabel = isClient
                ? (isInstagram ? `👤 ${selectedLead.nombre || 'Cliente'} (Instagram)` : isFacebook ? `👤 ${selectedLead.nombre || 'Cliente'} (Facebook)` : `👤 ${selectedLead.nombre || 'Cliente'}`)
                : isAgent
                ? (isInstagram ? '📸 Tú (Instagram Direct)' : isFacebook ? '📘 Tú (Messenger)' : '📱 Tú (WhatsApp / Panel)')
                : '🤖 IA OneControl';

              return (
                <div key={i} className={`flex ${isClient ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] md:max-w-[65%] rounded-2xl text-[11px] font-medium shadow-sm overflow-hidden ${
                    isClient
                      ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                      : isAgent
                      ? 'bg-slate-900 text-white rounded-tr-none border border-slate-800'
                      : 'bg-slate-800 text-white rounded-tr-none border border-slate-700'
                  }`}>
                    {/* Indicador de quién envió el mensaje */}
                    <div className={`px-4 pt-2.5 pb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-wider ${
                      isClient ? 'text-[#FF6B00]' : isAgent ? 'text-emerald-400' : 'text-blue-300'
                    }`}>
                      <span>
                        {senderLabel}
                      </span>
                    </div>

                    {/* Imagen adjunta */}
                    {m.mediaUrl && m.mediaType === 'image' && (
                      <div className="px-3 pt-2">
                        <img
                          src={m.mediaUrl}
                          alt="imagen adjunta"
                          className="w-full max-w-sm rounded-xl object-cover cursor-pointer hover:opacity-95 transition-opacity max-h-72 border border-black/10"
                          onClick={() => window.open(m.mediaUrl, '_blank')}
                        />
                      </div>
                    )}

                    {/* Video adjunto */}
                    {m.mediaUrl && m.mediaType === 'video' && (
                      <div className="px-3 pt-2">
                        <video src={m.mediaUrl} controls className="w-full max-w-sm rounded-xl max-h-72 border border-black/10" />
                      </div>
                    )}

                    {/* Documento adjunto */}
                    {m.mediaUrl && m.mediaType === 'document' && (
                      <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 px-4 py-3 hover:opacity-90 transition-opacity bg-black/10">
                        <FileText size={20} className="text-[#FF6B00] shrink-0" />
                        <span className="underline break-all font-bold">{m.text || 'Descargar Documento PDF'}</span>
                      </a>
                    )}

                    {/* Texto del mensaje */}
                    {m.text && m.mediaType !== 'document' && (
                      <p className="px-4 py-2.5 whitespace-pre-wrap leading-relaxed">
                        {m.text}
                      </p>
                    )}

                    {/* Timestamp */}
                    <p className={`px-4 pb-2 text-[8px] font-bold uppercase tracking-widest ${isClient ? 'text-slate-400' : 'text-slate-400'}`}>
                      {m.timestamp || 'Ahora'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 md:p-6 bg-white border-t border-slate-100">
          <div className="flex items-center space-x-2 md:space-x-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-[#FF6B00]/20 transition-all">
            <input
              type="text"
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              onPaste={handlePaste}
              placeholder="Escribe un mensaje o pega una imagen (Ctrl+V)..."
              className="flex-1 min-w-0 bg-transparent px-3 md:px-4 py-2 text-base md:text-xs outline-none font-medium text-slate-800"
            />
            
            {/* BOTÓN: ENVIAR PRODUCTO DEL CATÁLOGO */}
            <button
              type="button"
              onClick={() => setShowCatalogModal(true)}
              title="Mandar producto o ficha técnica del catálogo de WhatsApp"
              className="px-3 py-2 bg-orange-50 text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all shrink-0 border border-orange-200 active:scale-95 shadow-xs"
            >
              <ShoppingBag size={15} />
              <span className="hidden sm:inline">Catálogo</span>
            </button>

            {/* BOTÓN: ADJUNTAR ARCHIVO / PDF */}
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*,video/*" onChange={handleFile} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sendingDoc}
              title="Adjuntar documento o cotización en PDF"
              className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all shrink-0 disabled:opacity-50"
            >
              <Paperclip size={18} className={sendingDoc ? 'animate-pulse text-[#FF6B00]' : ''} />
            </button>

            {/* BOTÓN: ENVIAR MENSAJE */}
            <button
              type="button"
              onClick={handleSend}
              title="Enviar mensaje por WhatsApp"
              className="p-3 bg-slate-900 text-[#FF6B00] rounded-xl hover:bg-[#FF6B00] hover:text-white transition-all active:scale-95 shadow-sm"
            >
              <SendHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Selector Rápido de Catálogo de Productos */}
      {showCatalogModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[300] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl rounded-[36px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-orange-100 text-[#FF6B00] flex items-center justify-center font-black">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Catálogo de Productos</h3>
                  <p className="text-[11px] font-bold text-slate-400">Selecciona un producto para enviar la cotización con foto por WhatsApp</p>
                </div>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Buscador de productos */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  placeholder="Buscar motor, control, cremallera, accesorio..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] font-medium"
                />
              </div>
            </div>

            {/* Lista de productos */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 no-scrollbar">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <ShoppingBag size={32} className="mx-auto text-slate-300" />
                  <p className="text-sm font-bold">No se encontraron productos en el catálogo.</p>
                  <p className="text-xs">Ve a la pestaña Cerebro / Catálogo para registrar o activar productos.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredProducts.map(p => {
                    const metaImgs = Array.isArray(p.imagenes_meta) && p.imagenes_meta.length > 0
                      ? p.imagenes_meta
                      : Array.isArray(p.imagenes) && p.imagenes.length > 0
                      ? p.imagenes.map(u => typeof u === 'string' ? { url: u, desc: '' } : u)
                      : p.imagen ? [{ url: p.imagen, desc: '' }] : [];
                    const mainImg = metaImgs[0]?.url;

                    return (
                      <div
                        key={p.id}
                        className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-[#FF6B00] hover:shadow-md transition-all group"
                      >
                        <div>
                          <div className="flex items-start space-x-3 mb-3">
                            {mainImg ? (
                              <img src={mainImg} alt={p.nombre} className="h-16 w-16 rounded-xl object-cover border border-slate-100 shrink-0" />
                            ) : (
                              <div className="h-16 w-16 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                                <ImageIcon size={20} />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="text-[9px] font-black text-[#FF6B00] uppercase tracking-wider block truncate">
                                {p.categoria || 'General'}
                              </span>
                              <h4 className="text-xs font-black text-slate-800 leading-snug line-clamp-2">{p.nombre}</h4>
                              <div className="mt-1 flex items-baseline space-x-2">
                                <span className="text-sm font-black text-emerald-600">{p.precio ? `Q${p.precio}` : 'Consultar'}</span>
                                {p.precio_oferta && (
                                  <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                    🔥 Q{p.precio_oferta}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {p.descripcion && (
                            <p className="text-[10px] text-slate-500 line-clamp-2 italic mb-2">
                              {p.descripcion}
                            </p>
                          )}

                          {/* Miniaturas de fotos adicionales con etiquetas */}
                          {metaImgs.length > 1 && (
                            <div className="mb-3 pt-2 border-t border-slate-50">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                Fotos disponibles ({metaImgs.length}):
                              </p>
                              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                                {metaImgs.map((imgObj, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSendProduct(p, imgObj.url)}
                                    title={`Enviar ficha con esta foto: ${imgObj.desc || 'Foto ' + (idx + 1)}`}
                                    className="relative group/thumb shrink-0 focus:outline-none"
                                  >
                                    <img
                                      src={imgObj.url}
                                      alt="foto"
                                      className="h-10 w-10 rounded-lg object-cover border border-slate-200 hover:border-[#FF6B00] transition-colors"
                                    />
                                    {imgObj.desc && (
                                      <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[6px] font-bold px-1 rounded truncate max-w-[40px]">
                                        {imgObj.desc}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSendProduct(p)}
                          className="w-full py-2.5 bg-slate-900 hover:bg-[#FF6B00] text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all active:scale-95 shadow-sm mt-2"
                        >
                          <SendHorizontal size={13} />
                          <span>Enviar Ficha por WhatsApp</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lead sidebar (chat view) */}
      {showSidebar && (
        <div className="w-80 border-l border-slate-100 p-6 space-y-8 animate-in slide-in-from-right-4 duration-500 bg-white overflow-y-auto no-scrollbar">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest italic">Perfil del Lead</h3>
            <button onClick={() => setShowSidebar(false)} className="text-slate-400 hover:text-slate-800"><X size={16} /></button>
          </div>
          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center space-y-3">
              <div className="h-16 w-16 bg-slate-900 text-[#FF6B00] rounded-2xl flex items-center justify-center font-black text-xl italic mx-auto border-2 border-white shadow-xl">{selectedLead.nombre?.[0] || '?'}</div>
              <div>
                <h4 className="font-black text-slate-800 uppercase italic">{selectedLead.nombre}</h4>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{selectedLead.phone}</p>
              </div>
              {selectedLead.phone && (
                <button
                  onClick={() => downloadVCard(selectedLead)}
                  className="w-full py-2.5 px-3 bg-white hover:bg-orange-50 text-slate-700 hover:text-[#FF6B00] rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all border border-slate-200 shadow-xs active:scale-95"
                  title="Descargar vCard para guardar con 1 toque en tu teléfono"
                >
                  <UserPlus size={13} className="text-[#FF6B00]" />
                  <span>Guardar en Mi Celular</span>
                </button>
              )}
            </div>
            <div className="space-y-3">
              {[
                { l: 'Estado', v: selectedLead.estado, i: Tag, c: 'text-emerald-500' },
                { l: 'Score', v: `${selectedLead.score || 0}%`, i: Zap, c: 'text-amber-500' },
                { l: 'Prioridad', v: selectedLead.priority, i: AlertTriangle, c: selectedLead.priority === 'urgent' ? 'text-red-500' : 'text-slate-400' }
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center space-x-3">
                    <item.i size={14} className={item.c} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.l}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-800 uppercase">{item.v || '—'}</span>
                </div>
              ))}
            </div>
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Datos Capturados</h4>
              <div className="space-y-2.5">
                {[
                  { label: 'Nombre', key: 'nombre' },
                  { label: 'Dirección', key: 'direccion' },
                  { label: 'NIT', key: 'nit' },
                  { label: 'Motor', key: 'motor' },
                  { label: 'Falla', key: 'falla' },
                  { label: 'Zona', key: 'zona' },
                  { label: 'Notas', key: 'notas' },
                ].map(({ label, key }) => (
                  <div key={key} className="space-y-1">
                    <p className="text-[8px] font-black text-slate-300 uppercase ml-2">{label}</p>
                    <div className={`p-2.5 rounded-xl border text-[10px] font-bold truncate italic ${selectedLead[key] ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                      {selectedLead[key] || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
