import { useState, useRef, useMemo, useEffect } from 'react';
import {
  Search, X, AlertTriangle, Bot, Power, Database,
  MoreVertical, SendHorizontal, Tag, Zap, ArrowLeft, Paperclip, FileText,
  ShoppingBag, Sparkles, Check, ExternalLink, Image as ImageIcon,
  UserPlus, Phone, Download, RefreshCw, UploadCloud,
  CheckCheck, Trophy, XCircle, Clock, MapPin, ChevronDown, ListFilter,
  UserCircle, Users, ThumbsUp, Copy, HeartHandshake
} from 'lucide-react';
import QuickQuoteDrawer from '../QuickQuoteDrawer.jsx';

// Configuraciones y etapas reales del Lead (embudo oficial de Leads / CRM de OneControl)
export const LEAD_STAGES = [
  { id: 'En Seguimiento', label: 'En seguimiento', shortLabel: 'En seguimiento', color: '#D97706' },
  { id: 'Venta', label: 'A pedido / Venta', shortLabel: 'A pedido', color: '#059669' },
  { id: 'Cita Agendada', label: 'Cita / Visita agendada', shortLabel: 'Cita / Visita', color: '#4F46E5' },
  { id: 'Perdido', label: 'No compró', shortLabel: 'No compró', color: '#94A3B8' },
  { id: 'Nuevo', label: 'Por hablarles (Nuevo)', shortLabel: 'Por hablarles', color: '#64748B' },
  { id: 'Interesado', label: 'Interesado (Cotizando)', shortLabel: 'Interesado', color: '#0284C7' },
  { id: 'Post-Venta', label: 'Post-venta', shortLabel: 'Post-venta', color: '#0D9488' },
];

export const WHATSAPP_LABELS = LEAD_STAGES;

export function getLeadLabel(lead) {
  if (!lead) return LEAD_STAGES[4]; // Por hablarles (Nuevo)
  const estado = lead.estado || 'Nuevo';
  const found = LEAD_STAGES.find(s => s.id === estado);
  if (found) return found;

  if (estado === 'Cerrado' || estado === 'Vendido' || estado === 'Pedido') {
    return LEAD_STAGES[1]; // Venta
  }
  if (estado === 'Cita') {
    return LEAD_STAGES[2]; // Cita / Visita
  }
  if (estado === 'Descartado') {
    return LEAD_STAGES[3]; // No compró / Perdido
  }
  if (estado === 'Interesado') {
    return LEAD_STAGES[5]; // Interesado
  }
  if (estado === 'Post-Venta' || estado === 'PostVenta' || estado === 'Garantia') {
    return LEAD_STAGES[6]; // Post-Venta
  }
  if (String(lead.etiquetas || '').toLowerCase().includes('seguimiento')) {
    return LEAD_STAGES[0]; // En Seguimiento
  }
  return LEAD_STAGES[4]; // Por hablarles (Nuevo)
}

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

// Helper: resuelve y normaliza medios (imágenes, videos, audios, documentos)
// con compatibilidad de aliases, MIME types y resolución de URLs localhost/uploads
function getMediaInfo(m) {
  if (!m) return { url: null, type: null, text: '' };

  let url = m.mediaUrl || m.media_url || m.imageUrl || m.image_url || m.url || null;
  let type = (m.mediaType || m.media_type || '').toLowerCase();
  let text = m.text || '';

  // Si no hay mediaUrl explícito, pero el texto es o contiene una URL directa de imagen
  if (!url && text) {
    const trimmed = text.trim();
    if (/^https?:\/\/[^\s]+(\.(jpg|jpeg|png|webp|gif|svg)|(\/uploads\/))/i.test(trimmed)) {
      url = trimmed;
      type = 'image';
      text = '';
    }
  }

  // Normalizar tipo de medio
  if (url) {
    if (!type || type.includes('image') || type.includes('foto') || type.includes('photo') || /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(url)) {
      type = 'image';
    } else if (type.includes('video') || /\.(mp4|mov|webm)(\?.*)?$/i.test(url)) {
      type = 'video';
    } else if (type.includes('audio') || type.includes('voice') || /\.(mp3|ogg|wav|m4a)(\?.*)?$/i.test(url)) {
      type = 'audio';
    } else {
      type = 'document';
    }

    // Normalizar localhost https -> http para evitar net::ERR_SSL_PROTOCOL_ERROR
    if (url.startsWith('https://localhost') || url.startsWith('https://127.0.0.1')) {
      url = url.replace('https://', 'http://');
    }

    // Si es una ruta relativa /uploads/... y estamos en dev con Vite en localhost
    if (url.startsWith('/uploads/') && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      url = `http://localhost:3002${url}`;
    }
  }

  // Si el texto es idéntico a la URL del medio, no duplicarlo en la burbuja
  if (url && text && text.trim() === url.trim()) {
    text = '';
  }

  return { url, type, text };
}

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
  onSavePedido,
  onUpdateLead,
  messagesContainerRef,
  messagesEndRef,
  openChatNonce = 0
}) {
  const [messageText, setMessageText] = useState('');
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState('cotizador'); // 'cotizador' | 'perfil'
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [sendingDoc, setSendingDoc] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [stagedFile, setStagedFile] = useState(null);
  const [stagedFilePreview, setStagedFilePreview] = useState(null);
  const [sortMode, setSortMode] = useState('recent'); // 'recent' (WhatsApp) | 'urgent' (Urgentes primero)
  const [imageErrors, setImageErrors] = useState({});
  const dragCounter = useRef(0);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [channelTab, setChannelTab] = useState('todos');
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [showLikeTemplates, setShowLikeTemplates] = useState(false);
  const [copiedTemplateIdx, setCopiedTemplateIdx] = useState(null);
  const [stageFilter, setStageFilter] = useState('todos'); // 'todos' | 'En Seguimiento' | 'Venta' | 'Perdido' etc.
  const labelDropdownRef = useRef(null);
  const likeTemplatesRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  // Cerrar dropdown de etiquetas y de plantillas al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (labelDropdownRef.current && !labelDropdownRef.current.contains(e.target)) {
        setShowLabelDropdown(false);
      }
      if (likeTemplatesRef.current && !likeTemplatesRef.current.contains(e.target)) {
        setShowLikeTemplates(false);
      }
    }
    if (showLabelDropdown || showLikeTemplates) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLabelDropdown, showLikeTemplates]);

  const activeLabel = useMemo(() => {
    return getLeadLabel(selectedLead);
  }, [selectedLead]);

  // Acción rápida para mover etapa / estado del cliente (como en ViewCRM)
  const handleQuickStatus = async (targetEstado) => {
    if (!selectedLead || !selectedLead.id || !onUpdateLead) return;
    const isVenta = targetEstado === 'Venta';
    const isPerdido = targetEstado === 'Perdido';
    const isSeg = targetEstado === 'En Seguimiento' || targetEstado === 'Interesado';
    const isCita = targetEstado === 'Cita Agendada';

    const updated = {
      ...selectedLead,
      estado: targetEstado,
      score: isVenta ? 100 : isPerdido ? 0 : (isSeg || isCita) ? 60 : (selectedLead.score || 50),
      priority: isVenta || isPerdido || isSeg || isCita ? 'normal' : selectedLead.priority,
      handoff_reason: isVenta || isPerdido || isSeg || isCita ? null : selectedLead.handoff_reason
    };

    await onUpdateLead(updated);
  };

  // Al navegar desde Leads/Dashboard/notificación (cambia openChatNonce), abrir el chat
  // específico también en móvil y limpiar filtros para que el lead sea visible de inmediato.
  useEffect(() => {
    if (openChatNonce) {
      setChannelTab('todos');
      setStageFilter('todos');
      setChatSearch('');
      setMobileShowChat(true);
    }
  }, [openChatNonce]);

  const handleStageFile = (file) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      alert(`El archivo "${file.name}" supera el límite de 25 MB.`);
      return;
    }
    setStagedFile(file);
    if (file.type && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setStagedFilePreview(url);
    } else {
      setStagedFilePreview(null);
    }
    setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
  };

  const handleClearStagedFile = () => {
    if (stagedFilePreview) {
      URL.revokeObjectURL(stagedFilePreview);
    }
    setStagedFile(null);
    setStagedFilePreview(null);
  };

  const handleInsertQuoteText = (quoteText) => {
    setMessageText(prev => prev ? `${prev}\n\n${quoteText}` : quoteText);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const clientFirstName = useMemo(() => {
    return selectedLead?.nombre?.trim()?.split(' ')?.[0] || '';
  }, [selectedLead?.nombre]);

  const LIKE_TEMPLATES = useMemo(() => [
    {
      id: 'oficial',
      badge: '⭐ Compra & Redes',
      title: 'Agradecimiento Oficial + Enlaces',
      text: `¡Muchas gracias por su preferencia${clientFirstName ? `, estimado/a ${clientFirstName}` : ''}! 🤝✨\n\nNos alegra mucho haberle servido en *OneControl*. Su satisfacción y seguridad son lo más importante para nosotros.\n\nLe invitamos cordialmente a dejarnos su *Like* 👍 y seguirnos en nuestras páginas oficiales para enterarse de promociones, nuevos equipos y soporte:\n\n👍 *Facebook:* https://facebook.com/1059922890527747\n📸 *Instagram:* https://instagram.com/0ne_control\n🌐 *Sitio Web:* https://onecontrol.shop\n\n¡Quedamos siempre a su entera disposición ante cualquier duda o consulta! 🚪⚡`
    },
    {
      id: 'corto',
      badge: '💬 Amigable & Rápido',
      title: 'Mensaje Directo Post-Compra',
      text: `¡Muchas gracias por su compra${clientFirstName ? `, ${clientFirstName}` : ''}! 🙌 Esperamos que su equipo funcione a la perfección.\n\n¿Nos apoyaría regalándonos un *Like* en nuestras páginas? Nos ayuda muchísimo a seguir creciendo:\n👍 *Facebook:* https://facebook.com/1059922890527747\n📸 *Instagram:* https://instagram.com/0ne_control\n\n¡Cualquier apoyo o consulta de garantía estamos a un mensaje de distancia! 😊`
    },
    {
      id: 'servicio',
      badge: '🛠️ Instalación / Servicio',
      title: 'Servicio Técnico o Mantenimiento',
      text: `¡Muchas gracias por confiar en nuestro servicio técnico y de automatización${clientFirstName ? `, ${clientFirstName}` : ''}! 🛠️✨\n\nEsperamos que el trabajo haya sido 100% de su agrado. Si le gustó nuestra atención, le agradeceríamos mucho un *Like* y recomendación en nuestras redes oficiales:\n👍 *Facebook:* https://facebook.com/1059922890527747\n📸 *Instagram:* https://instagram.com/0ne_control\n\n¡Gracias por ser parte de los clientes satisfechos de *OneControl*! 🚪🔑`
    }
  ], [clientFirstName]);

  const handleInsertTemplate = (text) => {
    setMessageText(prev => prev ? `${prev}\n\n${text}` : text);
    setShowLikeTemplates(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
  };

  const handleSendTemplateDirect = async (text) => {
    if (!selectedChatId) return;
    setShowLikeTemplates(false);
    try {
      if (stagedFile) {
        const fileToSend = stagedFile;
        handleClearStagedFile();
        setMessageText('');
        setSendingDoc(true);
        await onSendDocument?.(selectedChatId, fileToSend, text);
        setSendingDoc(false);
      } else {
        await onSendMessage?.(selectedChatId, text);
      }
    } catch (err) {
      console.error('Error enviando plantilla de agradecimiento:', err);
    }
  };

  const handleCopyTemplate = async (idx, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTemplateIdx(idx);
      setTimeout(() => setCopiedTemplateIdx(null), 2000);
    } catch {
      handleInsertTemplate(text);
    }
  };

  const handleSend = async () => {
    if (!selectedChatId) return;
    const text = messageText.trim();
    if (!text && !stagedFile) return;

    // Si hay un archivo adjunto preparado
    if (stagedFile) {
      const fileToSend = stagedFile;
      const caption = text;
      handleClearStagedFile();
      setMessageText('');
      setSendingDoc(true);
      try {
        await onSendDocument?.(selectedChatId, fileToSend, caption);
      } catch (err) {
        console.error('Error enviando archivo adjunto:', err);
      } finally {
        setSendingDoc(false);
      }
      return;
    }

    // Si es solo mensaje de texto
    if (text) {
      setMessageText('');
      await onSendMessage(selectedChatId, text);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedChatId) return;
    handleStageFile(file);
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

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0 || !selectedChatId) return;
    handleStageFile(files[0]);
  };

  // Pegar imagen o archivos desde el portapapeles (Ctrl/Cmd+V) y adjuntarlos
  const handlePaste = (e) => {
    // Si se pegan archivos copiados del sistema
    const files = e.clipboardData?.files;
    if (files && files.length > 0 && selectedChatId) {
      e.preventDefault();
      handleStageFile(files[0]);
      return;
    }

    const items = e.clipboardData?.items;
    if (!items || !selectedChatId) return;
    for (const it of items) {
      if (it.type && it.type.startsWith('image/')) {
        const blob = it.getAsFile();
        if (!blob) continue;
        e.preventDefault();
        const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
        const file = new File([blob], `captura-${Date.now()}.${ext}`, { type: blob.type });
        handleStageFile(file);
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
    
    // Filtrar por etiqueta de WhatsApp / etapa (Todos, En seguimiento, Ventas, No compró)
    if (stageFilter && stageFilter !== 'todos') {
      list = list.filter(l => {
        const lbl = getLeadLabel(l);
        return lbl.id === stageFilter;
      });
    }

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
    // Ordenar conversaciones:
    // Modo 'recent' (predeterminado): Orden cronológico WhatsApp (último mensaje arriba)
    // Modo 'urgent': Prioriza los leads urgentes arriba y luego por mensaje más reciente
    return list.sort((a, b) => {
      if (sortMode === 'urgent') {
        const aUrgent = a.priority === 'urgent' ? 1 : 0;
        const bUrgent = b.priority === 'urgent' ? 1 : 0;
        if (aUrgent !== bUrgent) return bUrgent - aUrgent;
      }
      const aMsg = Number(a.lastMsgId || 0);
      const bMsg = Number(b.lastMsgId || 0);
      if (aMsg !== bMsg) return bMsg - aMsg;
      return (b.id || 0) - (a.id || 0);
    });
  }, [leads, chatSearch, channelTab, sortMode, stageFilter]);

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

  // Acción rápida: Enviar producto del catálogo al cliente por WhatsApp (texto + FOTO)
  const handleSendProduct = async (product) => {
    const p = product;
    // Misma lógica que la miniatura: primera imagen disponible del producto.
    const metaImgs = Array.isArray(p.imagenes_meta) && p.imagenes_meta.length > 0
      ? p.imagenes_meta
      : Array.isArray(p.imagenes) && p.imagenes.length > 0
      ? p.imagenes.map(u => typeof u === 'string' ? { url: u, desc: '' } : u)
      : p.imagen ? [{ url: p.imagen, desc: '' }] : [];
    let img = metaImgs[0]?.url || '';
    // El backend exige URL absoluta https para mandar la imagen (marcador ENVIAR_IMAGEN).
    if (img && !/^https?:\/\//i.test(img)) {
      img = window.location.origin + (img.startsWith('/') ? '' : '/') + img;
    }
    if (img) img = img.replace(/^http:\/\//i, 'https://');

    let msg = `✨ *${p.nombre}*\n💰 Precio: Q${p.precio}\n${p.descripcion ? `📝 ${p.descripcion}\n` : ''}🚚 Entrega armada y lista para usar.`;
    // Adjuntar la foto: el backend la extrae y la manda como imagen con el texto de caption.
    if (img) msg += `\nENVIAR_IMAGEN:${img}`;
    await onSendMessage(selectedChatId, msg);
    setShowCatalogModal(false);
  };

  // Ventana de 24h de WhatsApp: se abre cuando el CLIENTE escribe y dura 24h desde su
  // último mensaje. Fuera de esa ventana WhatsApp NO entrega mensajes libres (solo
  // plantillas aprobadas), así que avisamos para que el usuario no crea que "no se envió".
  const windowStatus = useMemo(() => {
    const clientMsgs = (messages || []).filter(m => m.sender === 'client');
    if (clientMsgs.length === 0) return { open: false, everWrote: false };
    const times = clientMsgs.map(m => m.created_at).filter(Boolean)
      .map(d => new Date(d).getTime()).filter(t => !isNaN(t));
    if (times.length === 0) return { open: null, everWrote: true }; // sin fecha confiable → no avisamos
    const hours = (Date.now() - Math.max(...times)) / 3600000;
    return { open: hours < 24, everWrote: true, hours };
  }, [messages]);

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

          {/* Filtros rápidos de etapa del Lead */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setStageFilter('todos')}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 cursor-pointer ${
                stageFilter === 'todos'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              Todos
            </button>
            {LEAD_STAGES.slice(0, 5).map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStageFilter(stageFilter === s.id ? 'todos' : s.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  stageFilter === s.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span>{s.shortLabel || s.label}</span>
              </button>
            ))}
          </div>

          {/* Selector de orden: Más recientes (WhatsApp) vs Urgentes */}
          <div className="flex items-center justify-between gap-1 pt-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Orden:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setSortMode('recent')}
                className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all cursor-pointer ${
                  sortMode === 'recent'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🕒 Más recientes
              </button>
              <button
                type="button"
                onClick={() => setSortMode('urgent')}
                className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all cursor-pointer ${
                  sortMode === 'urgent'
                    ? 'bg-red-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-red-600'
                }`}
              >
                ⚠️ Urgentes
              </button>
            </div>
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
            const leadLabel = getLeadLabel(lead);
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
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className={`text-xs font-black truncate ${lead.priority === 'urgent' ? 'text-red-700' : 'text-slate-800'}`}>{lead.nombre}</p>
                        {leadLabel && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0 inline-block"
                            style={{ backgroundColor: leadLabel.color }}
                            title={leadLabel.label}
                          />
                        )}
                      </div>
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
                  Se adjuntará para que puedas escribir un mensaje y confirmar antes de enviar a <span className="text-[#FF6B00] font-bold">{selectedLead.nombre || 'este cliente'}</span>
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
                {selectedLead.phone && (
                  <span className="text-[10px] text-slate-400 font-medium">· {selectedLead.phone}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
            {/* PILL DESPLEGABLE: CONFIGURACIÓN Y ETAPA DEL LEAD */}
            {selectedLead?.id && (
              <div className="relative" ref={labelDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowLabelDropdown(prev => !prev)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200/90 bg-slate-50/90 hover:bg-slate-100/90 text-[12px] font-medium text-slate-700 transition-colors cursor-pointer shrink-0"
                  title="Configuración de etapa del lead"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: activeLabel.color }}
                  />
                  <span className="truncate max-w-[120px] sm:max-w-[160px] text-slate-700">{activeLabel.shortLabel || activeLabel.label}</span>
                  <ChevronDown size={13} className={`text-slate-400 transition-transform duration-150 ${showLabelDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Popover desplegable: estrictamente las configuraciones del lead */}
                {showLabelDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-slate-200/70 border border-slate-100 py-2 z-[300] animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3.5 pb-1.5 text-[11px] font-medium text-slate-400 border-b border-slate-50 flex items-center justify-between">
                      <span>Configuración del Lead</span>
                      <span className="text-[10px] text-slate-400">Etapa</span>
                    </div>

                    <div className="max-h-72 overflow-y-auto py-1">
                      {LEAD_STAGES.map(stage => {
                        const isSelected = activeLabel.id === stage.id;
                        return (
                          <button
                            key={stage.id}
                            type="button"
                            onClick={async () => {
                              await handleQuickStatus(stage.id);
                              setShowLabelDropdown(false);
                            }}
                            className={`w-full px-3.5 py-2 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors cursor-pointer ${
                              isSelected ? 'bg-slate-50/80' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: stage.color }}
                              />
                              <span className={`text-[12.5px] truncate ${isSelected ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                                {stage.label}
                              </span>
                            </div>

                            {/* Checkbox minimalista */}
                            <div
                              className={`w-3.5 h-3.5 rounded-[3px] flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-slate-900 text-white'
                                  : 'border border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check size={10} className="stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Acciones directas de configuración del lead */}
                    <div className="h-px bg-slate-100 my-1" />
                    <div className="px-2 pt-0.5 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowLabelDropdown(false);
                          if (onToggleBot) onToggleBot(selectedLead.id);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl text-left text-[11px] font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Bot size={13} className={selectedLead.botActive ? 'text-emerald-500' : 'text-slate-400'} />
                          <span>{selectedLead.botActive ? 'Pausar IA (Modo Manual)' : 'Activar IA en este chat'}</span>
                        </span>
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedLead.botActive ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLabelDropdown(false);
                          setRightPanelTab('perfil');
                          setShowRightPanel(true);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl text-left text-[11px] font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <UserCircle size={13} className="text-slate-400" />
                        <span>Ver / Editar ficha y datos del lead</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedLead.phone && (!selectedLead.origen || selectedLead.origen.toLowerCase().includes('whatsapp')) && (
              <button
                onClick={() => downloadVCard(selectedLead)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-[#FF6B00] transition-all border border-slate-200 shadow-xs"
                title="Guardar contacto en la agenda del teléfono / WhatsApp (.vcf)"
              >
                <UserPlus size={14} className="text-[#FF6B00]" />
                <span className="hidden lg:inline">Guardar</span>
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
                <span className="hidden md:inline">{selectedLead.botActive ? 'Desactivar IA' : 'Activar IA'}</span>
              </button>
            )}
            {/* BOTÓN HEADER: COTIZADOR RÁPIDO */}
            <button
              type="button"
              onClick={() => {
                if (showRightPanel && rightPanelTab === 'cotizador') {
                  setShowRightPanel(false);
                } else {
                  setRightPanelTab('cotizador');
                  setShowRightPanel(true);
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border shadow-xs cursor-pointer ${
                showRightPanel && rightPanelTab === 'cotizador'
                  ? 'bg-slate-900 text-[#FF6B00] border-slate-900'
                  : 'bg-orange-50 text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white border-orange-200'
              }`}
              title="Abrir cotizador rápido"
            >
              <Sparkles size={13} />
              <span className="hidden sm:inline">Cotizar</span>
            </button>

            {/* BOTÓN HEADER: FICHA DEL LEAD */}
            <button
              type="button"
              onClick={() => {
                if (showRightPanel && rightPanelTab === 'perfil') {
                  setShowRightPanel(false);
                } else {
                  setRightPanelTab('perfil');
                  setShowRightPanel(true);
                }
              }}
              className={`hidden md:flex items-center justify-center p-2.5 rounded-xl transition-all cursor-pointer ${
                showRightPanel && rightPanelTab === 'perfil'
                  ? 'bg-slate-900 text-[#FF6B00]'
                  : 'bg-slate-50 text-slate-400 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="Ver ficha del lead"
            >
              <Database size={18} />
            </button>
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

                    {(() => {
                      const media = getMediaInfo(m);
                      const isImage = media.url && media.type === 'image';
                      const isVideo = media.url && media.type === 'video';
                      const isDoc = media.url && media.type === 'document';
                      const isAudio = media.url && media.type === 'audio';

                      return (
                        <>
                          {/* Imagen adjunta */}
                          {isImage && (
                            <div className="px-3 pt-2">
                              {imageErrors[m.id || i] ? (
                                <div className="p-3 bg-black/10 rounded-xl border border-black/10 flex items-center justify-between gap-2 max-w-sm">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <ImageIcon size={18} className="text-[#FF6B00] shrink-0" />
                                    <span className="text-[10px] text-slate-300 font-bold truncate">Foto adjunta</span>
                                  </div>
                                  <a
                                    href={media.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] font-black text-[#FF6B00] hover:underline shrink-0"
                                  >
                                    Abrir foto ↗
                                  </a>
                                </div>
                              ) : (
                                <img
                                  src={media.url}
                                  alt="imagen adjunta"
                                  loading="lazy"
                                  onError={() => setImageErrors(prev => ({ ...prev, [m.id || i]: true }))}
                                  className="w-full max-w-sm rounded-xl object-cover cursor-pointer hover:opacity-95 transition-opacity max-h-72 border border-black/10 shadow-xs"
                                  onClick={() => window.open(media.url, '_blank')}
                                />
                              )}
                            </div>
                          )}

                          {/* Video adjunto */}
                          {isVideo && (
                            <div className="px-3 pt-2">
                              <video src={media.url} controls className="w-full max-w-sm rounded-xl max-h-72 border border-black/10" />
                            </div>
                          )}

                          {/* Audio adjunto */}
                          {isAudio && (
                            <div className="px-3 pt-2">
                              <audio src={media.url} controls className="w-full max-w-sm" />
                            </div>
                          )}

                          {/* Documento adjunto */}
                          {isDoc && (
                            <a href={media.url} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 px-4 py-3 hover:opacity-90 transition-opacity bg-black/10">
                              <FileText size={20} className="text-[#FF6B00] shrink-0" />
                              <span className="underline break-all font-bold">{media.text || 'Descargar Documento PDF'}</span>
                            </a>
                          )}

                          {/* Texto del mensaje */}
                          {media.text && !isDoc && (
                            <p className="px-4 py-2.5 whitespace-pre-wrap leading-relaxed">
                              {media.text}
                            </p>
                          )}
                        </>
                      );
                    })()}

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
          {/* AVISO: ventana de 24h de WhatsApp cerrada → los mensajes pueden no entregarse */}
          {selectedChatId && windowStatus.open === false && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 animate-in slide-in-from-bottom-2 duration-200">
              <span className="text-lg leading-none shrink-0">⚠️</span>
              <p className="text-[11px] text-amber-800 font-semibold leading-snug">
                {windowStatus.everWrote
                  ? 'Pasaron más de 24h desde el último mensaje del cliente. WhatsApp puede NO entregar tu mensaje hasta que el cliente vuelva a escribir.'
                  : 'Este cliente aún no te ha escrito. WhatsApp puede bloquear tu mensaje hasta que el cliente escriba primero (mándale un saludo corto y espera su respuesta).'}
              </p>
            </div>
          )}
          {/* Tarjeta de Archivo Adjunto (Staged File Preview) */}
          {stagedFile && (
            <div className="mb-3 p-3.5 bg-orange-50/90 border border-orange-200/90 rounded-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 duration-200 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                {stagedFilePreview ? (
                  <img src={stagedFilePreview} alt="Preview" className="h-12 w-12 rounded-xl object-cover border border-orange-200 shrink-0 shadow-xs" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-orange-100 text-[#FF6B00] flex items-center justify-center shrink-0 border border-orange-200">
                    <FileText size={24} />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#FF6B00] bg-white px-2 py-0.5 rounded-md border border-orange-200">
                      📄 Archivo listo para enviar
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {(stagedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  <p className="text-xs font-black text-slate-800 truncate mt-1">{stagedFile.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Escribe un comentario opcional abajo y presiona Enviar (o Enter)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearStagedFile}
                className="p-2 hover:bg-orange-200/70 text-slate-400 hover:text-slate-700 rounded-xl transition-colors shrink-0 cursor-pointer"
                title="Quitar archivo adjunto"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="flex items-center space-x-2 md:space-x-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-[#FF6B00]/20 transition-all">
            <input
              ref={inputRef}
              type="text"
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              onPaste={handlePaste}
              placeholder={stagedFile ? "Escribe un comentario opcional para el archivo..." : "Escribe un mensaje o pega una imagen (Ctrl+V)..."}
              className="flex-1 min-w-0 bg-transparent px-3 md:px-4 py-2 text-base md:text-xs outline-none font-medium text-slate-800"
            />
            
            {/* BOTÓN: ENVIAR PRODUCTO DEL CATÁLOGO */}
            <button
              type="button"
              onClick={() => setShowCatalogModal(true)}
              title="Mandar producto o ficha técnica del catálogo de WhatsApp"
              className="px-3 py-2 bg-orange-50 text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all shrink-0 border border-orange-200 active:scale-95 shadow-xs cursor-pointer"
            >
              <ShoppingBag size={15} />
              <span className="hidden sm:inline">Catálogo</span>
            </button>

            {/* BOTÓN: COTIZADOR RÁPIDO */}
            <button
              type="button"
              onClick={() => {
                if (showRightPanel && rightPanelTab === 'cotizador') {
                  setShowRightPanel(false);
                } else {
                  setRightPanelTab('cotizador');
                  setShowRightPanel(true);
                }
              }}
              title="Abrir cotizador rápido (armar paquete, calcular descuentos, PDF y WhatsApp)"
              className="px-3 py-2 bg-slate-900 text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all shrink-0 active:scale-95 shadow-xs cursor-pointer"
            >
              <Sparkles size={15} />
              <span className="hidden sm:inline">Cotizar</span>
            </button>

            {/* BOTÓN: ADJUNTAR ARCHIVO / PDF */}
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*,video/*" onChange={handleFile} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sendingDoc}
              title="Adjuntar documento o cotización en PDF"
              className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <Paperclip size={18} className={sendingDoc ? 'animate-pulse text-[#FF6B00]' : ''} />
            </button>

            {/* BOTÓN: PLANTILLAS DE GRACIAS Y LIKE */}
            <div className="relative" ref={likeTemplatesRef}>
              <button
                type="button"
                onClick={() => setShowLikeTemplates(prev => !prev)}
                title="Plantillas de Agradecimiento por Compra y Solicitar Like"
                className={`p-2.5 rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  showLikeTemplates
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <ThumbsUp size={18} />
                <span className="hidden xl:inline text-[11px] font-black uppercase tracking-wider">Gracias & Like</span>
              </button>

              {/* POPUP FLOTANTE DE PLANTILLAS */}
              {showLikeTemplates && (
                <div className="absolute bottom-full right-0 mb-3 w-[330px] sm:w-[420px] max-w-[calc(100vw-2rem)] bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-4 z-[200] animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[75vh] overflow-hidden">
                  {/* Encabezado del Popover */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <ThumbsUp size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                          Agradecimiento & Like
                          <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md">Plantilla</span>
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium">Agradece la compra e invita a seguir las redes oficiales</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLikeTemplates(false)}
                      className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Lista de plantillas */}
                  <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-0.5 no-scrollbar">
                    {LIKE_TEMPLATES.map((tmpl, idx) => (
                      <div
                        key={tmpl.id}
                        className="p-3 bg-slate-50 hover:bg-blue-50/40 border border-slate-200/80 hover:border-blue-300 rounded-2xl transition-all group space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                              {tmpl.badge}
                            </span>
                            <span className="text-xs font-bold text-slate-800">{tmpl.title}</span>
                          </div>
                        </div>

                        {/* Caja con vista previa del texto */}
                        <div
                          onClick={() => handleInsertTemplate(tmpl.text)}
                          title="Clic para escribir en el chat"
                          className="p-2.5 bg-white rounded-xl border border-slate-200/60 text-[11px] text-slate-600 font-normal whitespace-pre-wrap leading-relaxed max-h-28 overflow-y-auto no-scrollbar cursor-pointer hover:border-blue-400 transition-colors shadow-2xs"
                        >
                          {tmpl.text}
                        </div>

                        {/* Botones de acción rápida */}
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="text-[9px] text-slate-400 font-medium italic">
                            Clic en el texto para insertar
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyTemplate(idx, tmpl.text)}
                              title="Copiar texto al portapapeles"
                              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              {copiedTemplateIdx === idx ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                              <span>{copiedTemplateIdx === idx ? 'Copiado' : 'Copiar'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInsertTemplate(tmpl.text)}
                              title="Pegar en el chat para editar o revisar"
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            >
                              Insertar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendTemplateDirect(tmpl.text)}
                              title="Enviar directamente por WhatsApp"
                              className="px-2.5 py-1 bg-[#FF6B00] hover:bg-[#e05e00] text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <SendHorizontal size={11} />
                              <span>Enviar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pie del modal */}
                  <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between shrink-0">
                    <span>💡 Puedes editar el mensaje tras insertarlo.</span>
                    <span className="font-bold text-slate-600">OneControl Oficial</span>
                  </div>
                </div>
              )}
            </div>

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

      {/* Panel lateral unificado (Cotizador Rápido / Ficha del Lead) */}
      {showRightPanel && (
        <div className="w-full sm:w-[410px] border-l border-slate-200 bg-white flex flex-col h-full overflow-hidden shrink-0 z-30 animate-in slide-in-from-right-4 duration-300 fixed md:relative right-0 top-0 bottom-0 shadow-2xl md:shadow-none">
          {/* Header con switcher de pestañas */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setRightPanelTab('cotizador')}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  rightPanelTab === 'cotizador'
                    ? 'bg-[#FF6B00] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles size={13} />
                <span>Cotizador</span>
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab('perfil')}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  rightPanelTab === 'perfil'
                    ? 'bg-[#FF6B00] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus size={13} />
                <span>Ficha Lead</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowRightPanel(false)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Cerrar panel lateral"
            >
              <X size={16} />
            </button>
          </div>

          {/* Contenido según pestaña activa */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {rightPanelTab === 'cotizador' ? (
              <QuickQuoteDrawer
                key={selectedChatId || selectedLead?.id || 'quote'}
                selectedLead={selectedLead}
                products={products}
                onClose={() => setShowRightPanel(false)}
                onSendMessage={(a, b) => onSendMessage(selectedChatId, b || a)}
                onSendDocument={(leadId, file, caption) => onSendDocument?.(leadId || selectedChatId, file, caption)}
                onInsertText={handleInsertQuoteText}
                onSavePedido={onSavePedido}
                hideHeader={true}
                className="w-full h-full border-0"
              />
            ) : (
              <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center space-y-3">
                  <div className="h-16 w-16 bg-slate-900 text-[#FF6B00] rounded-2xl flex items-center justify-center font-black text-xl italic mx-auto border-2 border-white shadow-xl">
                    {selectedLead.nombre?.[0] || '?'}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 uppercase italic">{selectedLead.nombre}</h4>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{selectedLead.phone}</p>
                  </div>
                  {selectedLead.phone && (
                    <button
                      onClick={() => downloadVCard(selectedLead)}
                      className="w-full py-2.5 px-3 bg-white hover:bg-orange-50 text-slate-700 hover:text-[#FF6B00] rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all border border-slate-200 shadow-xs active:scale-95 cursor-pointer"
                      title="Descargar vCard para guardar con 1 toque en tu teléfono"
                    >
                      <UserPlus size={13} className="text-[#FF6B00]" />
                      <span>Guardar en Mi Celular</span>
                    </button>
                  )}
                </div>

                {/* 🎯 SECCIÓN: MOVER ETAPA / RESULTADO */}
                <div className="space-y-2.5 bg-slate-50/90 p-4 rounded-3xl border border-slate-200">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                    Mover Etapa del Cliente:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Opción 1: En Seguimiento */}
                    <button
                      type="button"
                      onClick={() => handleQuickStatus('En Seguimiento')}
                      className={`py-2 px-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all border cursor-pointer active:scale-95 ${
                        selectedLead.estado === 'En Seguimiento' || selectedLead.estado === 'Interesado'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                          : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                      }`}
                    >
                      <CheckCheck size={13} />
                      <span>En Seguimiento</span>
                    </button>

                    {/* Opción 2: Cerró Venta */}
                    <button
                      type="button"
                      onClick={() => handleQuickStatus('Venta')}
                      className={`py-2 px-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all border cursor-pointer active:scale-95 ${
                        selectedLead.estado === 'Venta'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200'
                          : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      <Trophy size={13} />
                      <span>Cerró Venta ✓</span>
                    </button>

                    {/* Opción 3: Cita Agendada */}
                    <button
                      type="button"
                      onClick={() => handleQuickStatus('Cita Agendada')}
                      className={`py-2 px-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all border cursor-pointer active:scale-95 ${
                        selectedLead.estado === 'Cita Agendada'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                          : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                      }`}
                    >
                      <Clock size={13} />
                      <span>Cita / Visita</span>
                    </button>

                    {/* Opción 4: No Compró */}
                    <button
                      type="button"
                      onClick={() => handleQuickStatus('Perdido')}
                      className={`py-2 px-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all border cursor-pointer active:scale-95 ${
                        selectedLead.estado === 'Perdido'
                          ? 'bg-slate-700 text-white border-slate-700 shadow-md'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                      }`}
                    >
                      <XCircle size={13} />
                      <span>No Compró</span>
                    </button>
                  </div>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
