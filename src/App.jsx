import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard, MessageSquare, Users, Calendar, ShoppingBag,
  Brain, Database, Zap, SendHorizontal, Search, Bell, X,
  MoreVertical, CheckCircle2, AlertTriangle, UserCircle, Phone,
  Pencil, Trash2, Plus, Save, TrendingUp, Target, Archive,
  RefreshCw, Power, ShieldCheck, ChevronRight, ChevronLeft,
  Bot, Sparkles, BookOpen, Tag, LineChart, Globe, Link2, LogOut
} from 'lucide-react';
import Login from './components/Login.jsx';

const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3002' : '';
const CURRENT_USER_ID = 'fer';

// --- STYLES & CONSTANTS ---
const CATEGORY_STYLES = {
  'General': { badge: 'bg-slate-50 text-slate-500 border-slate-100', dot: 'bg-slate-300' },
  'Precios': { badge: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-400' },
  'Soporte': { badge: 'bg-blue-50 text-blue-600 border-blue-100', dot: 'bg-blue-400' },
  'Horarios': { badge: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-400' },
  'Técnico': { badge: 'bg-purple-50 text-purple-600 border-purple-100', dot: 'bg-purple-400' }
};

const CARD_CATEGORIES = ['General', 'Precios', 'Soporte', 'Horarios', 'Técnico'];
const PRODUCT_CATEGORIES = ['Motores', 'Portones', 'Controles', 'Cámaras', 'Accesorios', 'Servicios'];
const STOCK_OPTIONS = ['En stock', 'Poco stock', 'Agotado'];
const STOCK_STYLES = {
  'En stock': 'bg-emerald-50 text-emerald-600 border-emerald-100',
  'Poco stock': 'bg-amber-50 text-amber-600 border-amber-100',
  'Agotado': 'bg-red-50 text-red-600 border-red-100'
};

const emptyProduct = {
  nombre: '',
  descripcion: '',
  precio: '',
  categoria: 'Motores',
  stock: 'En stock',
  imagen: ''
};

const emptyCita = {
  cliente: '',
  phone: '',
  fecha: '',
  hora: '',
  servicio: '',
  duracion: '1 hora',
  estado: 'Pendiente'
};

// --- LOGIC COMPONENTS ---
const AprendizajeLogic = ({ API_BASE_URL, subTabIA }) => {
  useEffect(() => {
    if (subTabIA === 'Aprendizaje') {
      const syncLearning = async () => {
        try {
          await apiFetch(`${API_BASE_URL}/api/ai/analyze`, { method: 'POST' });
        } catch (e) {
          console.error("Error syncing learning data", e);
        }
      };
      syncLearning();
    }
  }, [subTabIA, API_BASE_URL]);
  return null;
};

const App = () => {
  const savedToken = localStorage.getItem('dashboard_token');
  const [authToken, setAuthToken] = useState(savedToken || null);

  const apiFetch = useCallback((url, options = {}) => {
    const headers = { 'Authorization': `Bearer ${authToken}`, ...(options.headers || {}) };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(url, { ...options, headers });
  }, [authToken]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null); // { text, type: 'message'|'success'|'error', lead? }
  
  // Data States
  const [leads, setLeads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ botMessages: 0 });
  
  // Selection States
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [selectedLead, setSelectedLead] = useState({});
  const [sidebarLeadId, setSidebarLeadId] = useState(null);
  
  // UI States
  const [showClientSidebarChat, setShowClientSidebarChat] = useState(false);
  const [showClientSidebarCRM, setShowClientSidebarCRM] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [botEnabled, setBotEnabled] = useState(true);
  
  // Agent Config States
  const [subTabIA, setSubTabIA] = useState('General');
  const [agentConfig, setAgentConfig] = useState({
    nombre: 'OneControl Bot',
    rol: 'Asistente de Ventas',
    empresa: 'OneControl Guatemala',
    descripcion: '',
    personalidad: 'Servicial y Profesional',
    idioma: 'Español',
    tono: 'Amigable',
    productos: ''
  });
  
  const [prompts, setPrompts] = useState({
    Recepcionista: '',
    Vendedor: '',
    Soporte: ''
  });
  const [captureStats, setCaptureStats] = useState([]);
  const [captureFields, setCaptureFields] = useState([
    { key: 'nombre',    label: 'Nombre completo',    activo: true,  pregunta: '¿Me podés dar tu nombre completo?' },
    { key: 'direccion', label: 'Dirección de entrega', activo: true, pregunta: '¿A qué dirección te lo enviamos?' },
    { key: 'nit',       label: 'NIT / Facturación',  activo: true,  pregunta: '¿Necesitás factura? ¿Cuál es tu NIT? (si es consumidor final podés decir "CF")' },
    { key: 'phone',     label: 'Teléfono',           activo: true,  pregunta: '¿Cuál es tu número de teléfono?' },
    { key: 'motor',     label: 'Motor / Producto',   activo: true,  pregunta: '¿Qué modelo de motor o producto te interesa?' },
    { key: 'falla',     label: 'Falla / Problema',   activo: false, pregunta: '¿Cuál es la falla que presenta tu equipo?' },
    { key: 'zona',      label: 'Zona / Municipio',   activo: false, pregunta: '¿En qué zona o municipio estás?' },
    { key: 'email',     label: 'Email',              activo: false, pregunta: '¿Tenés un correo electrónico para enviarte la cotización?' },
  ]);

  const [mensajesBot, setMensajesBot] = useState({
    bienvenida: '¡Hola! Soy {nombre} de {empresa}. ¿En qué te puedo ayudar hoy? 😊',
    fallback: 'Disculpa, no entendí bien. ¿Podrías repetirlo de otra forma?',
    fuera_horario: 'En este momento estamos fuera de horario. Te responderemos pronto. ¡Gracias!',
    despedida: '¡Fue un placer atenderte! Si necesitas algo más, aquí estaré. 🙌',
  });
  const [selectedAgent, setSelectedAgent] = useState('Recepcionista');
  const [handoffTriggers, setHandoffTriggers] = useState([]);
  
  // Learning States
  const [aiInsights, setAiInsights] = useState([]);
  const [aiKnowledge, setAiKnowledge] = useState([]);
  
  // RAG States
  const [ragSubTab, setRagSubTab] = useState('conocimiento');
  const [showNewCard, setShowNewCard] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [newCard, setNewCard] = useState({ name: '', category: 'General', content: '' });
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState(emptyProduct);
  
  // Agenda States
  const [agendaView, setAgendaView] = useState('Lista');
  const [showNewCita, setShowNewCita] = useState(false);
  const [newCita, setNewCita] = useState(emptyCita);
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Pedidos edit state
  const [editingPedido, setEditingPedido] = useState(null);

  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const playMessageAlert = useRef(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    audio.play().catch(() => {});
  });
  // Detectar mensajes entrantes: clave = leadId, valor = lastClientMsgId conocido
  const knownLastClientMsgId = useRef({});
  // Detectar pedidos nuevos
  const knownPedidoCount = useRef(null);

  // --- DATA FETCHING ---
  const fetchLeads = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/leads?t=${Date.now()}`);
      const data = await res.json();
      // Detectar mensajes nuevos: comparar ID del último mensaje del cliente
      // Usar ID en vez de tiempo+sender porque el bot responde antes del próximo poll
      const known = knownLastClientMsgId.current;
      const isFirstLoad = Object.keys(known).length === 0;
      data.forEach(lead => {
        const prev = known[lead.id];
        const curr = lead.lastClientMsgId;
        if (!isFirstLoad && curr && curr !== prev) {
          playMessageAlert.current();
          setNotification({ text: lead.lastMessage || 'Nuevo mensaje', lead, type: 'message' });
          setTimeout(() => setNotification(null), 6000);
        }
        known[lead.id] = curr;
      });
      setLeads(data);
      if (data.length > 0 && !selectedChatId) {
        setSelectedChatId(data[0].id);
      }
    } catch (err) { console.error(err); }
  };

  const fetchMessages = async (id) => {
    if (!id) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/messages/${id}?t=${Date.now()}`);
      const data = await res.json();
      setMessages(data);
    } catch (err) { console.error(err); }
  };

  const fetchSettings = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/settings`);
      const data = await res.json();
      const config = { ...agentConfig };
      const loadedPrompts = { ...prompts };
      
      const settingsArray = Array.isArray(data)
        ? data
        : Object.entries(data).map(([key, value]) => ({ key, value }));

      const loadedMensajes = { ...mensajesBot };
      settingsArray.forEach(s => {
        if (s.key === 'agent_nombre') config.nombre = s.value;
        if (s.key === 'agent_rol') config.rol = s.value;
        if (s.key === 'agent_empresa') config.empresa = s.value;
        if (s.key === 'agent_descripcion') config.descripcion = s.value;
        if (s.key === 'agent_personalidad') config.personalidad = s.value;
        if (s.key === 'agent_idioma') config.idioma = s.value;
        if (s.key === 'agent_tono') config.tono = s.value;
        if (s.key === 'agent_productos') config.productos = s.value;
        if (s.key === 'capture_fields') { try { setCaptureFields(JSON.parse(s.value)); } catch(e) {} }
        if (s.key === 'msg_bienvenida') loadedMensajes.bienvenida = s.value;
        if (s.key === 'msg_fallback') loadedMensajes.fallback = s.value;
        if (s.key === 'msg_fuera_horario') loadedMensajes.fuera_horario = s.value;
        if (s.key === 'msg_despedida') loadedMensajes.despedida = s.value;
        if (s.key === 'prompt_recepcionista') loadedPrompts.Recepcionista = s.value;
        if (s.key === 'prompt_ventas') loadedPrompts.Vendedor = s.value;
        if (s.key === 'prompt_soporte') loadedPrompts.Soporte = s.value;
      });

      setAgentConfig(config);
      setPrompts(loadedPrompts);
      setMensajesBot(loadedMensajes);
    } catch (err) { console.error(err); }
  };

  const fetchRAG = async () => {
    try {
      const [docsRes, prodsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/rag/documents`),
        fetch(`${API_BASE_URL}/api/products`)
      ]);
      setDocuments(await docsRes.json());
      setProducts(await prodsRes.json());
    } catch (err) { console.error(err); }
  };

  const fetchAgenda = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/agenda`);
      setAgenda(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchPedidos = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/pedidos`);
      const data = await res.json();
      setPedidos(data);
      const count = data.length;
      if (knownPedidoCount.current !== null && count > knownPedidoCount.current) {
        const newest = data[0];
        playMessageAlert.current();
        setNotification({ text: `${newest?.producto || 'Nuevo pedido'} — ${newest?.cliente || ''}`, type: 'pedido', pedido: newest });
        setTimeout(() => setNotification(null), 8000);
      }
      knownPedidoCount.current = count;
    } catch (err) { console.error(err); }
  };

  const fetchCaptureStats = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/capture/stats`);
      setCaptureStats(await res.json());
    } catch(err) { console.error(err); }
  };

  const fetchLearning = async () => {
    try {
      const [insightsRes, knowledgeRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/ai/insights`),
        fetch(`${API_BASE_URL}/api/ai/knowledge`)
      ]);
      const insightsData = await insightsRes.json();
      // nuevo formato: { topics, stats } — fallback si viene array (versión vieja)
      if (Array.isArray(insightsData)) {
        setAiInsights({ topics: insightsData, stats: {} });
      } else {
        setAiInsights(insightsData);
      }
      setAiKnowledge(await knowledgeRes.json());
    } catch (err) { console.error(err); }
  };

  const fetchHandoff = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/handoff/triggers`);
      setHandoffTriggers(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchStats = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/stats`);
      const data = await res.json();
      setStats(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchLeads();
    fetchSettings();
    fetchRAG();
    fetchAgenda();
    fetchPedidos();
    fetchHandoff();
    fetchLearning();
    fetchStats();
    fetchCaptureStats();
    
    const interval = setInterval(() => {
      fetchLeads();
      fetchStats();
      fetchPedidos();
      if (activeTab === 'conversaciones') fetchMessages(selectedChatId);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [selectedChatId, activeTab]);

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
      const lead = leads.find(l => l.id === selectedChatId);
      if (lead) setSelectedLead(lead);
    }
  }, [selectedChatId, leads]);

  const prevChatIdRef = useRef(null);
  useEffect(() => {
    if (!messages.length) return;
    const isNewChat = prevChatIdRef.current !== selectedChatId;
    prevChatIdRef.current = selectedChatId;
    if (isNewChat) {
      // Abrir chat nuevo: esperar paint completo y saltar sin animación
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const c = messagesContainerRef.current;
          if (c) {
            c.style.scrollBehavior = 'auto';
            c.scrollTop = c.scrollHeight;
          }
        });
      });
    } else {
      // Mensaje nuevo: scroll suave
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // --- ACTIONS ---
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChatId) return;
    const text = messageText;
    setMessageText('');
    setNotification('💬 Enviando...');
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/messages/send`, {
        method: 'POST',

        body: JSON.stringify({ leadId: selectedChatId, text, sender: 'agent' })
      });
      if (!response.ok) {
         setNotification('❌ Error al enviar: ' + response.status);
         return;
      }
      await fetchMessages(selectedChatId);
      await fetchLeads(); // Actualiza el sidebar con el último mensaje
      setNotification('✅ Mensaje enviado');
      setTimeout(() => setNotification(null), 2000);
    } catch (err) { 
      console.error(err); 
      setNotification('❌ Error de red');
    }
  };

  const handleToggleBot = async (leadId) => {
    if (!leadId) return;
    const lead = leads.find(l => l.id === leadId) || selectedLead;
    const newState = !lead.botActive;
    
    // Optimistic Update
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          botActive: newState ? 1 : 0,
          priority: newState ? 'normal' : l.priority,
          handoff_reason: newState ? null : l.handoff_reason,
          estado: newState ? 'Activo' : l.estado
        };
      }
      return l;
    }));
    
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead(prev => ({
        ...prev,
        botActive: newState ? 1 : 0,
        priority: newState ? 'normal' : prev.priority,
        handoff_reason: newState ? null : prev.handoff_reason,
        estado: newState ? 'Activo' : prev.estado
      }));
    }
    
    setNotification(newState ? `✅ Bot activado` : `🔴 Bot desactivado`);
    setTimeout(() => setNotification(null), 3000);
    
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/bot/toggle`, {
        method: 'POST',

        body: JSON.stringify({ leadId, enabled: newState })
      });
      if (!response.ok) {
        throw new Error('Server error');
      }
    } catch (err) {
      console.error("❌ Error toggling bot:", err);
      setNotification(`❌ Error al cambiar estado del bot`);
      setTimeout(() => setNotification(null), 3000);
      fetchLeads(); // Rollback
    }
  };

  const saveSetting = async (key, value) => {
    setLoading(true);
    try {
      await apiFetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',

        body: JSON.stringify({ key, value })
      });
      setNotification(`✅ ${key.replace('agent_', '').replace('_', ' ')} guardado`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const saveHandoffTriggers = async () => {
    setLoading(true);
    try {
      await apiFetch(`${API_BASE_URL}/api/handoff/triggers`, {
        method: 'POST',

        body: JSON.stringify(handoffTriggers)
      });
      setNotification('✅ Triggers de Handoff guardados');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const approveKnowledge = async (id) => {
    try {
      await apiFetch(`${API_BASE_URL}/api/ai/knowledge/approve/${id}`, {
        method: 'POST'
      });
      fetchLearning();
      fetchRAG();
      setNotification('✅ Conocimiento validado e integrado al RAG');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) { console.error(err); }
  };

  const ignoreKnowledge = async (id) => {
    try {
      await apiFetch(`${API_BASE_URL}/api/ai/knowledge/${id}`, { method: 'DELETE' });
      fetchLearning();
    } catch (err) { console.error(err); }
  };

  const updatePedidoEstado = async (id, nuevoEstado) => {
    try {
      await apiFetch(`${API_BASE_URL}/api/pedidos/status`, {
        method: 'POST',

        body: JSON.stringify({ id, estado: nuevoEstado })
      });
      fetchPedidos();
    } catch (err) { console.error(err); }
  };

  const savePedido = async () => {
    if (!editingPedido) return;
    try {
      await apiFetch(`${API_BASE_URL}/api/pedidos/${editingPedido.id}`, {
        method: 'PUT',

        body: JSON.stringify(editingPedido)
      });
      setEditingPedido(null);
      fetchPedidos();
      setNotification('✅ Pedido actualizado');
      setTimeout(() => setNotification(null), 2500);
    } catch (err) { console.error(err); }
  };

  const deletePedido = async (id) => {
    if (!window.confirm('¿Eliminar este pedido?')) return;
    try {
      await apiFetch(`${API_BASE_URL}/api/pedidos/${id}`, { method: 'DELETE' });
      fetchPedidos();
    } catch (err) { console.error(err); }
  };

  // --- RAG ACTIONS ---
  const handleSaveCard = async () => {
    if (!newCard.name.trim() || !newCard.content.trim()) return;
    try {
      await apiFetch(`${API_BASE_URL}/api/rag/save`, {
        method: 'POST',

        body: JSON.stringify(newCard)
      });
      setNewCard({ name: '', category: 'General', content: '' });
      setShowNewCard(false);
      fetchRAG();
      setNotification('✅ Tarjeta creada correctamente');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) { console.error(err); }
  };

  const handleUpdateCard = async (id) => {
    try {
      await apiFetch(`${API_BASE_URL}/api/rag/documents/${id}`, {
        method: 'PUT',

        body: JSON.stringify(editingCard)
      });
      setEditingCard(null);
      fetchRAG();
      setNotification('✅ Tarjeta actualizada');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) { console.error(err); }
  };

  const handleSaveProduct = async () => {
    if (!newProduct.nombre.trim()) return;
    try {
      await apiFetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',

        body: JSON.stringify(newProduct)
      });
      setNewProduct(emptyProduct);
      setShowNewProduct(false);
      fetchRAG();
      setNotification('✅ Producto añadido al catálogo');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) { console.error(err); }
  };

  const handleUpdateProduct = async (id) => {
    try {
      await apiFetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'PUT',

        body: JSON.stringify(editingProduct)
      });
      setEditingProduct(null);
      fetchRAG();
      setNotification('✅ Producto actualizado');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) { console.error(err); }
  };

  const handleDeleteDocument = async (id) => {
    if (!window.confirm('¿Eliminar esta tarjeta de conocimiento?')) return;
    try {
      await apiFetch(`${API_BASE_URL}/api/rag/documents/${id}`, { method: 'DELETE' });
      fetchRAG();
    } catch (err) { console.error(err); }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('¿Eliminar este producto del catálogo?')) return;
    try {
      await apiFetch(`${API_BASE_URL}/api/products/${id}`, { method: 'DELETE' });
      fetchRAG();
    } catch (err) { console.error(err); }
  };

  const runTestSearch = async () => {
    if (!testQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/rag/test-search?query=${encodeURIComponent(testQuery)}`);
      const data = await res.json();
      setTestResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/rag/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        setNotification('✅ Archivo procesado e integrado al conocimiento');
        fetchRAG();
      } else {
        setNotification('❌ Error al procesar archivo');
      }
    } catch (err) { setNotification('❌ Error de conexión'); }
    setLoading(false);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleProductImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/products/upload-image`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        if (type === 'new') setNewProduct(prev => ({...prev, imagen: data.imageUrl}));
        else if (type === 'edit') setEditingProduct(prev => ({...prev, imagen: data.imageUrl}));
        setNotification('✅ Imagen subida');
      } else {
        setNotification('❌ Error al subir imagen');
      }
    } catch (err) {
      setNotification('❌ Error de conexión');
    } finally {
      setLoading(false);
    }
    setTimeout(() => setNotification(null), 3000);
  };

  // --- CRM ACTIONS ---
  const [editingLead, setEditingLead] = useState(null);
  
  const handleUpdateLead = async () => {
    if (!editingLead) return;
    try {
      await apiFetch(`${API_BASE_URL}/api/leads/${editingLead.id}`, {
        method: 'PUT',

        body: JSON.stringify(editingLead)
      });
      setEditingLead(null);
      fetchLeads();
      setNotification('✅ Lead actualizado correctamente');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) { console.error(err); }
  };

  const handleDeleteMessages = async (id) => {
    if (!window.confirm('¿Eliminar todos los mensajes de esta conversación?')) return;
    try {
      await apiFetch(`${API_BASE_URL}/api/leads/${id}/messages`, { method: 'DELETE' });
      fetchMessages(id);
    } catch (err) { console.error(err); }
  };

  const handleArchiveLead = async (id, currentStatus) => {
    try {
      await apiFetch(`${API_BASE_URL}/api/leads/${id}/archive`, {
        method: 'POST',

        body: JSON.stringify({ archived: !currentStatus })
      });
      fetchLeads();
    } catch (err) { console.error(err); }
  };

  // --- SUB-COMPONENTS ---
  const SidebarItem = ({ icon: Icon, label, id }) => (
    <button 
      onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
      className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${activeTab === id ? 'bg-slate-900 text-[#FF6B00] shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
    >
      <Icon size={18} className={activeTab === id ? 'text-[#FF6B00]' : 'group-hover:scale-110 transition-transform'} />
      <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );

  const MonthView = () => {
    const days = Array.from({length: 31}, (_, i) => i + 1);
    return (
      <div className="grid grid-cols-7 gap-4 animate-in zoom-in-95 duration-500">
        {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(d => (
          <div key={d} className="text-center py-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">{d}</div>
        ))}
        {days.map(d => {
          const hasCitas = agenda.some(c => new Date(c.fecha).getDate() === d);
          return (
            <div key={d} className={`aspect-square bg-white rounded-3xl border border-slate-100 p-3 relative hover:border-[#FF6B00]/30 transition-all cursor-pointer group`}>
              <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-800">{d}</span>
              {hasCitas && (
                <div className="absolute bottom-3 right-3 h-2 w-2 bg-[#FF6B00] rounded-full shadow-lg shadow-orange-100" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderClientSidebar = (lead, isOpen, onClose) => {
    if (!lead || !isOpen) return null;
    return (
      <div className="w-80 border-l border-slate-100 bg-white flex flex-col shrink-0 animate-in slide-in-from-right duration-500 overflow-y-auto no-scrollbar">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10">
           <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest italic">Perfil del Lead</h3>
           <button onClick={onClose} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>
        
        <div className="p-8 space-y-8">
           <div className="text-center">
              <div className="h-24 w-24 rounded-[32px] bg-slate-900 text-[#FF6B00] flex items-center justify-center font-black text-2xl mx-auto mb-4 border-4 border-white shadow-2xl shadow-slate-200">
                 {lead.nombre?.[0] || '?'}
              </div>
              <h4 className="text-lg font-black text-slate-800 leading-none mb-2">{lead.nombre}</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center space-x-2">
                 <span className={`h-2 w-2 rounded-full ${lead.botActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                 <span>{lead.botActive ? 'IA Gestionando' : 'Control Humano'}</span>
              </p>
           </div>

           <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                 <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Score IA</p>
                 <p className="text-xl font-black text-slate-800 italic">{lead.score || 0}%</p>
              </div>
              <button 
                onClick={async () => {
                  const newState = !lead.botActive;
                  const leadId = lead.id;
                  if (!leadId) return;
                  setLeads(prev => prev.map(l => l.id === leadId ? {...l, botActive: newState} : l));
                  try {
                    await apiFetch(`${API_BASE_URL}/api/bot/toggle`, {
                      method: 'POST',
                      body: JSON.stringify({ leadId, enabled: newState })
                    });
                    setNotification(newState ? `✅ Bot activado` : `🔴 Bot desactivado`);
                    setTimeout(() => setNotification(null), 3000);
                  } catch(err) { fetchLeads(); }
                }}
                className={`p-4 rounded-2xl border flex flex-col items-center justify-center transition-all ${lead.botActive ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}
              >
                 <p className="text-[9px] font-black uppercase mb-1">Estado Bot</p>
                 <div className="flex items-center space-x-1">
                    <Power size={12} />
                    <p className="text-[10px] font-black uppercase">{lead.botActive ? 'ENCENDIDO' : 'APAGADO'}</p>
                 </div>
              </button>
           </div>

           {/* Datos Capturados */}
           <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Datos Capturados por IA</label>
              <div className="space-y-3">
                 {[
                   { l: 'Dirección', v: lead.direccion, i: Database },
                   { l: 'NIT/Factura', v: lead.nit, i: Tag },
                   { l: 'Email', v: lead.email, i: MessageSquare },
                   { l: 'Notas', v: lead.notas, i: Pencil }
                 ].map((d, i) => (
                   <div key={i} className="flex flex-col space-y-1.5 p-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                      <div className="flex items-center space-x-2">
                         <d.i size={12} className="text-slate-300 group-hover:text-[#FF6B00] transition-colors" />
                         <span className="text-[9px] font-black text-slate-400 uppercase">{d.l}</span>
                      </div>
                      <span className="text-[11px] font-black text-slate-800 truncate pl-5">{d.v || '—'}</span>
                   </div>
                 ))}
              </div>
           </div>

           {/* Etiquetas */}
           <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Etiquetas</label>
              <div className="flex flex-wrap gap-2">
                 {(lead.etiquetas || '').split(',').filter(e => e.trim()).map((tag, i) => (
                   <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-slate-200 hover:bg-[#FF6B00] hover:text-white hover:border-[#FF6B00] transition-all cursor-default">
                     {tag.trim()}
                   </span>
                 ))}
                 <button 
                   onClick={() => setEditingLead({...lead})}
                   className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-emerald-100 hover:bg-emerald-100 transition-all"
                 >
                   + Gestionar
                 </button>
              </div>
           </div>

           {/* Metadata */}
           <div className="pt-6 border-t border-slate-100 space-y-3">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">WhatsApp ID</p>
                <p className="text-11px font-bold text-slate-800 tabular-nums">{lead.whatsapp_id || lead.phone || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Registrado</p>
                <p className="text-11px font-bold text-slate-800">{lead.time || lead.timestamp || '—'}</p>
              </div>
           </div>

           {/* Acciones */}
           <div className="space-y-3 pt-6 border-t border-slate-100">
              <button 
                onClick={() => handleArchiveLead(lead.id, lead.archived)}
                className="w-full py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg shadow-slate-200 hover:bg-black transition-all active:scale-95"
              >
                <Archive size={14} className="text-amber-400" />
                <span>{lead.archived ? 'Restaurar Lead' : 'Archivar conversación'}</span>
              </button>
              <button 
                onClick={() => handleDeleteMessages(lead.id)}
                className="w-full py-3.5 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 border border-red-100 hover:bg-red-100 transition-all active:scale-95"
              >
                <Trash2 size={14} />
                <span>Eliminar conversación</span>
              </button>
           </div>
        </div>
      </div>
    );
  };

  if (!authToken) {
    return <Login onLogin={(token) => setAuthToken(token)} />;
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] md:hidden animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto no-scrollbar z-[101] transition-transform duration-500 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center space-x-3">
              <div className="bg-[#FF6B00] p-2.5 rounded-2xl shadow-xl shadow-orange-100 ring-4 ring-orange-50">
                <Zap className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black leading-none tracking-tighter uppercase italic text-slate-800">OneControl</h1>
                <span className="text-[9px] text-[#FF6B00] font-black uppercase tracking-[0.3em]">SaaS Elite v4.0</span>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 text-slate-400">
               <X size={20} />
            </button>
          </div>

          <nav className="space-y-6">
            <div>
              <p className="px-4 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Negocio</p>
              <SidebarItem icon={LayoutDashboard} label="Dashboard" id="dashboard" />
              <div className="relative">
                <SidebarItem icon={MessageSquare} label="Conversaciones" id="conversaciones" />
                {leads.filter(l => l.priority === 'urgent').length > 0 && (
                  <span className="absolute top-2 right-4 h-5 w-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse shadow-lg">
                    {leads.filter(l => l.priority === 'urgent').length}
                  </span>
                )}
              </div>
              <SidebarItem icon={Users} label="Base de Clientes" id="crm" />
              <SidebarItem icon={Calendar} label="Agenda IA" id="agenda" />
              <SidebarItem icon={ShoppingBag} label="Pedidos IA" id="pedidos" />
            </div>
            <div>
              <p className="px-4 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inteligencia</p>
              <SidebarItem icon={Brain} label="Agente IA" id="cerebro" />
              <SidebarItem icon={Database} label="Base RAG" id="rag" />
            </div>
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-slate-100 bg-slate-50/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Maestro Activo</span>
            </div>
            <div className="text-[9px] font-bold text-slate-400">ID: {CURRENT_USER_ID}</div>
          </div>
          <button 
            onClick={() => setBotEnabled(!botEnabled)}
            className={`w-full py-3 rounded-2xl flex items-center justify-center space-x-2 font-black text-[10px] uppercase tracking-widest transition-all ${botEnabled ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-200 text-slate-500'}`}
          >
            <Power size={14} />
            <span>IA {botEnabled ? 'Encendida' : 'Manual'}</span>
          </button>
          <button
            onClick={() => { localStorage.removeItem('dashboard_token'); setAuthToken(null); }}
            className="w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center space-x-1 mt-1"
          >
            <LogOut size={12} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>


      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-10 shrink-0 sticky top-0 z-20">
          <div className="flex items-center space-x-4 md:space-x-6 flex-1">
             <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 bg-slate-100 rounded-xl text-slate-600">
                <MoreVertical size={20} />
             </button>
             
             {activeTab === 'rag' ? (
               <div className="flex-1 max-w-xl relative group animate-in slide-in-from-left-4 duration-500">
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF6B00] transition-colors">
                   <Search size={16} />
                 </div>
                 <input 
                   type="text" 
                   value={testQuery}
                   onChange={e => {
                     setTestQuery(e.target.value);
                     if (!e.target.value.trim()) setTestResults([]);
                   }}
                   onKeyDown={e => e.key === 'Enter' && runTestSearch()}
                   placeholder="Buscador de Inteligencia RAG..."
                   className="w-full pl-12 pr-32 py-3 bg-slate-100 border-transparent rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-all italic"
                 />
                 <button 
                   onClick={runTestSearch}
                   disabled={isSearching}
                   className="absolute right-2 top-1.5 bottom-1.5 bg-slate-900 text-white px-4 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[#FF6B00] transition-all disabled:opacity-50 flex items-center space-x-2 shadow-sm"
                 >
                   {isSearching ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} className="text-[#FF6B00]" />}
                   <span>{isSearching ? '...' : 'Probar'}</span>
                 </button>
               </div>
             ) : (
               <div className="hidden md:flex bg-slate-100 p-2.5 rounded-xl text-slate-400"><Search size={18} /></div>
             )}

             <div className="flex items-center space-x-2">
                <Globe size={14} className="text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none italic text-slate-400">Guatemala</span>
             </div>
          </div>
          
          <div className="flex items-center space-x-4 md:space-x-6">
             {loading && <RefreshCw size={14} className="animate-spin text-emerald-500" />}
             {notification && typeof notification === 'string' && <div className={`text-white text-[9px] md:text-[10px] font-black px-3 md:px-4 py-1.5 rounded-lg uppercase shadow-lg ${notification.startsWith('❌') ? 'bg-red-500' : 'bg-emerald-500'}`}>{notification}</div>}
             <button
               onClick={() => {
                 playMessageAlert.current();
                 setNotification({ text: 'Hola! Soy Fernando 👋 me interesa el control genius', lead: { nombre: 'Fernando Garcia', phone: '+50235154362', estado: 'Interesado' }, type: 'message' });
                 setTimeout(() => setNotification(null), 6000);
               }}
               className="hidden md:flex items-center space-x-1 bg-blue-50 border border-blue-200 text-blue-600 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
               title="Probar notificación"
             >
               <Bell size={12} /><span>Test</span>
             </button>
             <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl md:rounded-2xl bg-slate-900 flex items-center justify-center font-black text-[#FF6B00] border-2 border-white shadow-xl italic">OC</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 no-scrollbar">
          
          {/* VIEW: DASHBOARD (RESUMEN) */}
          {activeTab === 'dashboard' && (() => {
            // --- MÉTRICAS REALES ---
            const totalLeads = leads.length;
            const urgentLeads = leads.filter(l => l.priority === 'urgent').length;
            const avgScore = totalLeads > 0 
              ? Math.round(leads.reduce((sum, l) => sum + (l.score || 0), 0) / totalLeads) 
              : 0;
            
            // Impacto IA (Métricas Reales)
            const botMessages = stats.botMessages || 0; 
            const horasAhorradas = Math.max(1, Math.round((botMessages * 5) / 60)); // 5 minutos por mensaje

            return (
              <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic">Resumen Elite</h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Gestión de impacto y conversiones</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { l: 'Tus Leads', v: totalLeads, i: Target, c: 'text-blue-600', bg: 'bg-blue-50' },
                    { l: 'Citas Activas', v: agenda.length, i: Calendar, c: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { l: 'Score Promedio', v: `${avgScore}%`, i: TrendingUp, c: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { l: urgentLeads > 0 ? '🚨 Intervenciones' : 'Estado del Bot', v: urgentLeads > 0 ? urgentLeads : '✅ OK', i: urgentLeads > 0 ? AlertTriangle : Zap, c: urgentLeads > 0 ? 'text-red-500' : 'text-[#FF6B00]', bg: urgentLeads > 0 ? 'bg-red-50' : 'bg-orange-50' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-[#FF6B00]/30 transition-all">
                      <div className="flex justify-between items-start mb-4 relative z-10">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{s.l}</p>
                         <div className={`${s.bg} p-2 rounded-xl`}><s.i size={16} className={s.c} /></div>
                      </div>
                      <h3 className={`text-3xl font-black tracking-tighter ${s.c} relative z-10`}>{s.v}</h3>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="md:col-span-2 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                      <div className="flex items-center justify-between">
                         <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">Actividad Reciente</h3>
                         <span className="text-[10px] font-black text-emerald-500 uppercase">En Vivo</span>
                      </div>
                      <div className="space-y-4">
                         {leads.slice(0, 5).map(lead => (
                           <button
                             key={lead.id}
                             onClick={() => { setActiveTab('conversaciones'); setSelectedChatId(lead.id); }}
                             className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-3xl border border-slate-100 hover:border-[#FF6B00]/40 hover:bg-orange-50/30 transition-all group text-left"
                           >
                              <div className="flex items-center space-x-4 min-w-0">
                                 <div className="h-10 w-10 rounded-xl bg-slate-900 text-[#FF6B00] flex items-center justify-center font-black text-xs italic shrink-0">{lead.nombre?.[0] || '?'}</div>
                                 <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-800 truncate">{lead.nombre}</p>
                                    <p className="text-[10px] font-bold text-slate-400 truncate">{lead.lastMessage || 'Nuevo Lead'}</p>
                                 </div>
                              </div>
                              <div className="text-right shrink-0 ml-3">
                                 <p className="text-[10px] font-black text-[#FF6B00]">{lead.time || 'Ahora'}</p>
                                 <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{lead.estado}</p>
                              </div>
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="bg-slate-900 p-10 rounded-[40px] shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-10 opacity-10 text-white group-hover:rotate-12 transition-transform duration-700">
                         <Brain size={120} />
                      </div>
                      <div className="relative z-10 space-y-8">
                         <h3 className="text-sm font-black text-[#FF6B00] uppercase tracking-[0.2em] italic">Impacto IA</h3>
                         <div className="space-y-6">
                            <div>
                               <p className="text-4xl font-black text-white italic tabular-nums">{horasAhorradas}h</p>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Tiempo de atención ahorrado</p>
                            </div>
                            <div className="h-px bg-white/10 w-full" />
                            <div>
                               <p className="text-4xl font-black text-white italic tabular-nums">{botMessages}</p>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Interacciones automáticas</p>
                            </div>
                         </div>
                         <button onClick={() => setActiveTab('cerebro')} className="w-full py-4 bg-[#FF6B00] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-orange-900/20 hover:bg-white hover:text-slate-900 transition-all">Configurar Agente</button>
                      </div>
                   </div>
                </div>
              </div>
            );
          })()}

                {/* VIEW: CONVERSACIONES */}
          {activeTab === 'conversaciones' && (
            <div className="flex h-full animate-in fade-in duration-500 bg-white border-t border-slate-100">
               <div className="w-80 border-r border-slate-100 flex flex-col shrink-0">
                  <div className="p-6 border-b border-slate-50">
                     <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 italic">Bandeja de entrada</h3>
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input type="text" placeholder="Buscar chat..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF6B00] transition-all" />
                     </div>
                  </div>
                  <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-slate-50">
                     {leads.map(lead => (
                        <button key={lead.id} onClick={() => setSelectedChatId(lead.id)} className={`w-full p-6 text-left hover:bg-slate-50 transition-all relative ${selectedChatId === lead.id ? 'bg-emerald-50/20' : ''} ${lead.priority === 'urgent' ? 'bg-red-50/60 border-l-4 border-red-500' : ''}`}>
                           <div className="flex items-center space-x-3 mb-2">
                              <div className="relative">
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-[10px] shadow-sm ${
                                  lead.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                                  lead.botActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {lead.priority === 'urgent' ? <AlertTriangle size={14} /> : lead.botActive ? <Bot size={14} /> : lead.nombre[0]}
                                </div>
                                {lead.priority === 'urgent' && (
                                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className={`text-xs font-black truncate ${lead.priority === 'urgent' ? 'text-red-700' : 'text-slate-800'}`}>{lead.nombre}</p>
                               <div className="flex justify-between items-center">
                                  <p className={`text-[9px] font-black uppercase tracking-tighter ${
                                    lead.priority === 'urgent' ? 'text-red-500' :
                                    lead.botActive ? 'text-emerald-500' : 'text-slate-400'
                                  }`}>
                                     {lead.priority === 'urgent' ? '⚠️ INTERVENCIÓN' : lead.botActive ? `Score: ${lead.score}%` : 'Control Manual'}
                                  </p>
                                  {lead.lastMessageTime && <span className="text-[8px] font-bold text-slate-400 tabular-nums">{lead.lastMessageTime}</span>}
                               </div>
                              </div>
                           </div>
                           {lead.handoff_reason && (
                             <p className="text-[9px] text-red-500 font-bold italic truncate mt-1 leading-none">
                                ⚠️ {lead.handoff_reason}
                             </p>
                           )}
                           {!lead.handoff_reason && (
                             <p className="text-[11px] text-slate-500 truncate mt-1 font-medium italic leading-none">
                                {lead.lastMessage ? `"${lead.lastMessage}"` : "Sin mensajes recientes"}
                             </p>
                           )}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="flex-1 flex flex-col bg-[#FDFDFD]">
                  <div className="h-20 border-b border-slate-100 px-8 flex items-center justify-between bg-white/80 backdrop-blur-md">
                     <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-800 text-[#FF6B00] flex items-center justify-center font-black text-sm border border-[#FF6B00]">OC</div>
                        <div>
                           <p className="text-sm font-black text-slate-800">{selectedLead.nombre}</p>
                           <div className="flex items-center space-x-2">
                             <p className={`text-[9px] font-bold uppercase tracking-widest ${selectedLead.botActive ? 'text-emerald-500' : 'text-red-500'}`}>
                               {selectedLead.botActive ? 'IA Gestionando' : 'Modo Manual'}
                             </p>
                             <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                               selectedLead.estado === 'Venta' ? 'bg-emerald-500 text-white' :
                               selectedLead.estado === 'Frío' ? 'bg-blue-500 text-white' :
                               'bg-amber-500 text-white'
                             }`}>{selectedLead.estado}</span>
                           </div>
                        </div>
                     </div>
                     <div className="flex items-center space-x-3">
                        <button 
                          onClick={() => handleToggleBot(selectedLead.id)} 
                          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            selectedLead.botActive 
                            ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          <Power size={14} />
                          <span>{selectedLead.botActive ? 'Desactivar Bot' : 'Activar Bot'}</span>
                        </button>
                        <button onClick={() => setShowClientSidebarChat(!showClientSidebarChat)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"><Database size={18} /></button>
                        <button className="p-2.5 bg-slate-50 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"><MoreVertical size={18} /></button>
                     </div>
                  </div>

                  <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
                     {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.sender === 'client' ? 'justify-start' : 'justify-end'}`}>
                           <div className={`max-w-[70%] rounded-2xl text-[11px] font-medium shadow-sm overflow-hidden ${
                              m.sender === 'client' ? 'bg-white border border-slate-100 text-slate-800 rounded-tl-none' : 'bg-slate-900 text-white rounded-tr-none'
                           }`}>
                              {m.mediaUrl && m.mediaType === 'image' && (
                                <img
                                  src={m.mediaUrl}
                                  alt="imagen"
                                  className="w-full max-w-xs rounded-t-2xl object-cover cursor-pointer"
                                  onClick={() => window.open(m.mediaUrl, '_blank')}
                                />
                              )}
                              {m.text && (
                                <p className="px-4 py-3">{m.text}</p>
                              )}
                              <p className={`px-4 pb-2 text-[8px] font-bold uppercase tracking-widest ${m.sender === 'client' ? 'text-slate-300' : 'text-slate-500'}`}>
                                 {m.timestamp || 'Ahora'}
                              </p>
                           </div>
                        </div>
                     ))}
                     <div ref={messagesEndRef} />
                  </div>

                  <div className="p-6 bg-white border-t border-slate-100">
                     <div className="flex items-center space-x-4 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-[#FF6B00]/20 transition-all">
                        <input 
                           type="text" 
                           value={messageText}
                           onChange={e => setMessageText(e.target.value)}
                           onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                           placeholder="Escribe un mensaje..." 
                           className="flex-1 bg-transparent px-4 py-2 text-xs outline-none" 
                        />
                        <button onClick={handleSendMessage} className="p-3 bg-slate-900 text-[#FF6B00] rounded-xl hover:bg-[#FF6B00] hover:text-white transition-all"><SendHorizontal size={18} /></button>
                     </div>
                  </div>
               </div>

               {showClientSidebarChat && (
                  <div className="w-80 border-l border-slate-100 p-6 space-y-8 animate-in slide-in-from-right-4 duration-500 bg-white">
                     <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest italic">Perfil del Lead</h3>
                        <button onClick={() => setShowClientSidebarChat(false)} className="text-slate-400 hover:text-slate-800"><X size={16} /></button>
                     </div>
                     
                     <div className="space-y-6">
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                           <div className="h-16 w-16 bg-slate-900 text-[#FF6B00] rounded-2xl flex items-center justify-center font-black text-xl italic mb-4 mx-auto border-2 border-white shadow-xl">{selectedLead.nombre?.[0]}</div>
                           <h4 className="text-center font-black text-slate-800 uppercase italic">{selectedLead.nombre}</h4>
                           <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{selectedLead.phone}</p>
                        </div>

                        <div className="space-y-4">
                           {[
                             { l: 'Estado', v: selectedLead.estado, i: Tag, c: 'text-emerald-500' },
                             { l: 'Score', v: `${selectedLead.score}%`, i: Zap, c: 'text-amber-500' },
                             { l: 'Prioridad', v: selectedLead.priority, i: AlertTriangle, c: selectedLead.priority === 'urgent' ? 'text-red-500' : 'text-slate-400' }
                           ].map((item, i) => (
                             <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center space-x-3">
                                   <item.i size={14} className={item.c} />
                                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.l}</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-800 uppercase">{item.v}</span>
                             </div>
                           ))}
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Datos Capturados</h4>
                           <div className="space-y-3">
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
                                    <div className={`p-3 rounded-xl border text-[10px] font-bold truncate italic ${selectedLead[key] ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
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
          )}

          {/* VIEW: CLIENTES (CRM EVOLUCIONADO) */}
           {activeTab === 'crm' && (
              <div className="max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                 <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic leading-none">Base de Clientes</h2>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 italic">Control total de datos, estados y seguimiento</p>
                    </div>
                    <div className="flex space-x-4">
                       <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input type="text" placeholder="Buscar cliente..." className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none w-64 shadow-sm italic" />
                       </div>
                       {sidebarLeadId && (
                           <button 
                             onClick={() => setShowClientSidebarCRM(!showClientSidebarCRM)}
                             title="Detalles del Cliente"
                             className={`p-2.5 rounded-xl border transition-all ${showClientSidebarCRM ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-lg shadow-orange-100' : 'bg-white text-slate-400 border-slate-200 shadow-sm'}`}
                           >
                             <UserCircle size={18} />
                           </button>
                        )}
                    </div>
                 </div>

                 <div className="flex space-x-6 items-start">
                    <div className="flex-1 bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                       <table className="w-full text-left min-w-[1000px]">
                          <thead className="bg-slate-50 border-b border-slate-100">
                             <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-8 py-6">CLIENTE</th>
                                <th className="px-6 py-6">CONTACTO</th>
                                <th className="px-6 py-6">ESTADO / SCORE</th>
                                <th className="px-6 py-6">PROGRESO</th>
                                <th className="px-8 py-6 text-right">ACCIONES</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {leads.filter(l => !l.archived).map(lead => (
                               <tr 
                                 key={lead.id} 
                                 onClick={() => { setSidebarLeadId(lead.id); setShowClientSidebarCRM(true); }}
                                 className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${sidebarLeadId === lead.id && showClientSidebarCRM ? 'bg-emerald-50/30' : ''}`}
                               >
                                  <td className="px-8 py-5">
                                     <div className="flex items-center space-x-3">
                                        <div className={`h-12 w-12 rounded-[18px] flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${lead.priority === 'urgent' ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-900 text-[#FF6B00]'}`}>
                                           {lead.priority === 'urgent' ? '!' : (lead.nombre?.[0] || '?')}
                                        </div>
                                        <div>
                                           <p className="text-sm font-black text-slate-800 leading-none group-hover:text-[#FF6B00] transition-colors">{lead.nombre}</p>
                                           <p className="text-[9px] font-bold text-slate-400 mt-1.5 uppercase tracking-tighter">ID WA: {lead.whatsapp_id || lead.phone || '—'}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-5">
                                     <div className="flex items-center space-x-2 text-[11px] font-black text-slate-700">
                                        <Phone size={10} className="text-slate-300" />
                                        <span>{lead.phone || '—'}</span>
                                     </div>
                                  </td>
                                  <td className="px-6 py-5">
                                     <div className="flex flex-col space-y-2">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest w-fit shadow-sm border ${
                                           lead.priority === 'urgent' ? 'bg-red-500 text-white border-red-500' :
                                           lead.estado === 'Venta' ? 'bg-emerald-500 text-white border-emerald-500' :
                                           lead.estado === 'Cita Agendada' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                           lead.estado === 'Interesado' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                           lead.estado === 'Post-Venta' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                           lead.estado === 'Perdido' ? 'bg-slate-50 text-slate-400 border-slate-100' :
                                           'bg-slate-100 text-slate-500 border-slate-200'
                                         }`}>{lead.estado || 'Nuevo'}</span>
                                        <div className="flex items-center space-x-1">
                                           {[1,2,3,4,5].map(s => (
                                             <div key={s} className={`h-1.5 w-1.5 rounded-full ${s <= (lead.score || 0)/20 ? 'bg-amber-400' : 'bg-slate-200'}`} />
                                           ))}
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-5">
                                     <div className="w-24 space-y-1.5">
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                           <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${lead.score || 0}%` }} />
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-8 py-5 text-right">
                                     <div className="flex items-center justify-end space-x-1.5">
                                        <button onClick={(e) => { e.stopPropagation(); setEditingLead({...lead}); }} title="Editar" className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-[#FF6B00] transition-all">
                                           <Pencil size={12} />
                                        </button>
                                     </div>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                     {renderClientSidebar(leads.find(l => l.id === sidebarLeadId), showClientSidebarCRM, () => setShowClientSidebarCRM(false))}
                 </div>
              </div>
           )}

          {/* VIEW: AGENDA IA */}
          {activeTab === 'agenda' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-6">
                     <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">Agenda IA</h2>
                     <div className="flex space-x-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                        <button onClick={() => setAgendaView('Calendario')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${agendaView === 'Calendario' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Calendario</button>
                        <button onClick={() => setAgendaView('Lista')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${agendaView === 'Lista' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Lista</button>
                     </div>
                  </div>
                  <button onClick={() => setShowNewCita(true)} className="bg-slate-900 text-white px-8 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-[#FF6B00] transition-all flex items-center space-x-2">
                     <Plus size={16} />
                     <span>Agendar Servicio</span>
                  </button>
               </div>

               {agendaView === 'Calendario' ? (
                 <MonthView />
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {agenda.map(cita => (
                      <div key={cita.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all duration-500 group relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-900 group-hover:rotate-12 transition-transform">
                            <Calendar size={60} />
                         </div>
                         <div className="relative z-10 space-y-6">
                            <div className="flex justify-between items-start">
                               <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl">
                                  <p className="text-[10px] font-black uppercase italic leading-none">{cita.fecha}</p>
                                  <p className="text-sm font-black italic">{cita.hora}</p>
                               </div>
                               <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-emerald-100">
                                  {cita.estado}
                               </span>
                            </div>
                            <div>
                               <h4 className="text-lg font-black text-slate-800 uppercase italic truncate mb-1">{cita.cliente}</h4>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center space-x-2">
                                  <Zap size={10} className="text-[#FF6B00]" />
                                  <span>{cita.servicio}</span>
                               </p>
                            </div>
                            <div className="flex items-center space-x-4 pt-4 border-t border-slate-50">
                               <div className="flex-1">
                                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">WhatsApp</p>
                                  <p className="text-[11px] font-bold text-slate-800 tabular-nums">{cita.phone}</p>
                               </div>
                               <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800 transition-colors"><ChevronRight size={18} /></button>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          )}

          {/* VIEW: PEDIDOS (Tablero Kanban) */}
          {activeTab === 'pedidos' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
               <div className="flex justify-between items-end">
                 <div>
                   <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic leading-none">Gestión de Pedidos</h2>
                   <p className="text-sm font-medium text-slate-400 mt-2 italic">Control de ventas y coordinación de entregas</p>
                 </div>
                 <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center space-x-2">
                   <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                   <span>Pedidos en tiempo real</span>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                 {['Nuevo', 'En Proceso', 'Completado'].map(col => (
                   <div key={col} className="bg-slate-50/50 rounded-[40px] p-6 border border-slate-100 min-h-[70vh] flex flex-col space-y-4">
                     <div className="flex items-center justify-between px-4 mb-2">
                       <h3 className={`text-[11px] font-black uppercase tracking-widest ${col === 'Nuevo' ? 'text-orange-600' : col === 'En Proceso' ? 'text-blue-600' : 'text-emerald-600'}`}>{col}</h3>
                       <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-slate-400 border border-slate-100">{pedidos.filter(p => p.estado === col).length}</span>
                     </div>

                     <div className="space-y-4 overflow-y-auto max-h-[65vh] pr-2 custom-scrollbar">
                       {pedidos.filter(p => p.estado === col).map(pedido => (
                         <div key={pedido.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                           <div className="flex justify-between items-start mb-4">
                             <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">#{pedido.id}</span>
                             <div className="flex items-center space-x-2">
                               <button
                                 onClick={() => setEditingPedido({ ...pedido })}
                                 className="h-8 w-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all"
                               ><Pencil size={13} /></button>
                               <button
                                 onClick={() => deletePedido(pedido.id)}
                                 className="h-8 w-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                               ><Trash2 size={13} /></button>
                             </div>
                           </div>
                           <h4 className="text-sm font-black text-slate-900 mb-1">{pedido.producto}</h4>
                           <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-500 mb-1">
                             <Users size={12} className="text-slate-300" />
                             <span>{pedido.cliente}</span>
                           </div>
                           {pedido.phone && (
                             <div className="flex items-center space-x-2 text-[10px] text-slate-400 mb-3">
                               <Phone size={10} className="text-slate-300" />
                               <span>{pedido.phone}</span>
                             </div>
                           )}

                           {pedido.notas && (
                             <p className="text-[10px] text-slate-400 italic leading-relaxed mb-4 line-clamp-2">{pedido.notas}</p>
                           )}

                           <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                             <div className="flex items-center space-x-2">
                               {col !== 'Nuevo' && (
                                 <button onClick={() => updatePedidoEstado(pedido.id, col === 'Completado' ? 'En Proceso' : 'Nuevo')} className="h-8 w-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-orange-50 hover:text-orange-500 transition-colors border border-slate-100"><ChevronLeft size={14} /></button>
                               )}
                               {col !== 'Completado' && (
                                 <button onClick={() => updatePedidoEstado(pedido.id, col === 'Nuevo' ? 'En Proceso' : 'Completado')} className="h-8 px-4 rounded-full bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest flex items-center justify-center hover:bg-[#FF6B00] transition-all shadow-sm">
                                   Siguiente <ChevronRight size={12} className="ml-1" />
                                 </button>
                               )}
                             </div>
                             {col === 'Completado' && (
                               <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100"><CheckCircle2 size={14} /></div>
                             )}
                             <span className="text-[9px] text-slate-300 italic">{pedido.timestamp?.slice(5,16)}</span>
                           </div>
                         </div>
                       ))}
                       {pedidos.filter(p => p.estado === col).length === 0 && (
                         <div className="py-10 text-center">
                           <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Sin pedidos</p>
                         </div>
                       )}
                     </div>
                   </div>
                 ))}
               </div>

               {/* Modal editar pedido */}
               {editingPedido && (
                 <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                   <div className="bg-white rounded-[40px] w-full max-w-md p-8 space-y-6 shadow-2xl">
                     <div className="flex justify-between items-center">
                       <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Editar Pedido #{editingPedido.id}</h3>
                       <button onClick={() => setEditingPedido(null)} className="h-8 w-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200 transition-colors"><X size={14} /></button>
                     </div>
                     <div className="space-y-4">
                       {[
                         { label: 'Producto', key: 'producto' },
                         { label: 'Cliente', key: 'cliente' },
                         { label: 'Teléfono', key: 'phone' },
                         { label: 'Cantidad', key: 'cantidad' },
                         { label: 'Precio', key: 'precio' },
                       ].map(({ label, key }) => (
                         <div key={key}>
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">{label}</label>
                           <input
                             type="text"
                             value={editingPedido[key] || ''}
                             onChange={e => setEditingPedido({ ...editingPedido, [key]: e.target.value })}
                             className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#FF6B00]/30"
                           />
                         </div>
                       ))}
                       <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Notas</label>
                         <textarea
                           rows={3}
                           value={editingPedido.notas || ''}
                           onChange={e => setEditingPedido({ ...editingPedido, notas: e.target.value })}
                           className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#FF6B00]/30 resize-none"
                         />
                       </div>
                       <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Estado</label>
                         <select
                           value={editingPedido.estado || 'Nuevo'}
                           onChange={e => setEditingPedido({ ...editingPedido, estado: e.target.value })}
                           className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#FF6B00]/30"
                         >
                           {['Nuevo', 'En Proceso', 'Completado', 'Cancelado'].map(s => <option key={s}>{s}</option>)}
                         </select>
                       </div>
                     </div>
                     <div className="flex space-x-3 pt-2">
                       <button onClick={() => setEditingPedido(null)} className="flex-1 py-3 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors">Cancelar</button>
                       <button onClick={savePedido} className="flex-1 py-3 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#FF6B00] transition-all">Guardar</button>
                     </div>
                   </div>
                 </div>
               )}
            </div>
          )}

          {/* VIEW: AGENTE IA (CEREBRO) */}
          {activeTab === 'cerebro' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
               <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic leading-none">Cerebro de la IA</h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 italic">Configuración de identidad y comportamiento</p>
                  </div>
                  <button 
                     onClick={async () => {
                       setLoading(true);
                       try {
                         const saves = [
                           { key: 'agent_nombre', value: agentConfig.nombre },
                           { key: 'agent_rol', value: agentConfig.rol },
                           { key: 'agent_descripcion', value: agentConfig.descripcion },
                           { key: 'agent_empresa', value: agentConfig.empresa },
                           { key: 'agent_personalidad', value: agentConfig.personalidad },
                           { key: 'agent_idioma', value: agentConfig.idioma },
                           { key: 'agent_tono', value: agentConfig.tono },
                           { key: 'agent_productos', value: agentConfig.productos }
                         ];
                         await Promise.all(saves.map(s => fetch(`${API_BASE_URL}/api/settings`, {
                           method: 'POST',
                   
                           body: JSON.stringify(s)
                         })));
                         setNotification('✅ Cerebro sincronizado — n8n ya usa la nueva configuración');
                         setTimeout(() => setNotification(null), 4000);
                       } catch(e) {
                         setNotification('❌ Error sincronizando');
                       } finally { setLoading(false); }
                     }}
                     className="bg-emerald-500 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase shadow-xl shadow-emerald-200 flex items-center space-x-2 transition-all active:scale-95"
                  >
                     <Save size={16} />
                     <span>Sincronizar Cerebro</span>
                  </button>
               </div>

               <AprendizajeLogic API_BASE_URL={API_BASE_URL} subTabIA={subTabIA} />

               <div className="flex space-x-8 border-b border-slate-200">
                  {['General', 'Mensajes', 'Captura de Datos', 'Prompt', 'Handoff', 'Aprendizaje'].map(t => (
                    <button 
                      key={t}
                      onClick={() => setSubTabIA(t)}
                      className={`pb-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${subTabIA === t ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                      {t}
                    </button>
                  ))}
               </div>

                {subTabIA === 'General' && (
                  <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                    <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nombre del Asistente</label>
                          <input 
                            type="text" 
                            value={agentConfig.nombre}
                            onChange={e => setAgentConfig({...agentConfig, nombre: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Rol / Puesto</label>
                          <input 
                            type="text" 
                            value={agentConfig.rol}
                            onChange={e => setAgentConfig({...agentConfig, rol: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Empresa</label>
                          <input 
                            type="text" 
                            value={agentConfig.empresa}
                            onChange={e => setAgentConfig({...agentConfig, empresa: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Personalidad</label>
                          <input 
                            type="text" 
                            value={agentConfig.personalidad}
                            onChange={e => setAgentConfig({...agentConfig, personalidad: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Idioma</label>
                          <input 
                            type="text" 
                            value={agentConfig.idioma}
                            onChange={e => setAgentConfig({...agentConfig, idioma: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tono de Voz</label>
                          <input 
                            type="text" 
                            value={agentConfig.tono}
                            onChange={e => setAgentConfig({...agentConfig, tono: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="space-y-4 md:col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Descripción del Negocio (Contexto para la IA)</label>
                          <textarea 
                            rows={4}
                            value={agentConfig.descripcion}
                            onChange={e => setAgentConfig({...agentConfig, descripcion: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-emerald-500 italic"
                          />
                        </div>
                        <div className="space-y-4 md:col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Productos/Servicios Destacados</label>
                          <textarea 
                            rows={4}
                            value={agentConfig.productos}
                            onChange={e => setAgentConfig({...agentConfig, productos: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-emerald-500 italic"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {subTabIA === 'Mensajes' && (
                  <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                    <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                      <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center"><MessageSquare size={22} /></div>
                          <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">Mensajes del Bot</h3>
                            <p className="text-[10px] text-slate-400 italic">Textos que el bot usa en situaciones clave</p>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            setLoading(true);
                            try {
                              await Promise.all([
                                { key: 'msg_bienvenida', value: mensajesBot.bienvenida },
                                { key: 'msg_fallback', value: mensajesBot.fallback },
                                { key: 'msg_fuera_horario', value: mensajesBot.fuera_horario },
                                { key: 'msg_despedida', value: mensajesBot.despedida },
                              ].map(s => fetch(`${API_BASE_URL}/api/settings`, {
                                method: 'POST',
                        
                                body: JSON.stringify(s)
                              })));
                              setNotification('✅ Mensajes guardados');
                              setTimeout(() => setNotification(null), 3000);
                            } catch(e) { setNotification('❌ Error al guardar'); }
                            finally { setLoading(false); }
                          }}
                          className="flex items-center space-x-2 bg-emerald-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg"
                        >
                          <Save size={14} /><span>Guardar</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                          { key: 'bienvenida', label: '👋 Saludo inicial', hint: 'Primer mensaje cuando llega un cliente. Usa {nombre} y {empresa}.', color: 'emerald' },
                          { key: 'fallback', label: '🤔 No entendí', hint: 'Cuando el bot no comprende el mensaje.', color: 'amber' },
                          { key: 'fuera_horario', label: '🌙 Fuera de horario', hint: 'Cuando el cliente escribe fuera del horario de atención.', color: 'blue' },
                          { key: 'despedida', label: '🙌 Despedida', hint: 'Cuando se cierra una conversación satisfactoriamente.', color: 'purple' },
                        ].map(({ key, label, hint, color }) => (
                          <div key={key} className="space-y-3">
                            <div>
                              <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{label}</label>
                              <p className="text-[9px] text-slate-400 italic mt-0.5">{hint}</p>
                            </div>
                            <textarea
                              rows={3}
                              value={mensajesBot[key]}
                              onChange={e => setMensajesBot({ ...mensajesBot, [key]: e.target.value })}
                              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none leading-relaxed"
                            />
                            <div className={`p-3 bg-${color}-50 rounded-xl border border-${color}-100`}>
                              <p className="text-[9px] text-slate-500 italic">
                                Preview: {mensajesBot[key]
                                  .replace('{nombre}', agentConfig.nombre)
                                  .replace('{empresa}', agentConfig.empresa)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[9px] text-slate-400 italic leading-relaxed">
                          💡 Estos mensajes se inyectan al prompt del bot en n8n. Usa <code className="bg-white px-1 rounded">{'{'+'nombre}'}</code> y <code className="bg-white px-1 rounded">{'{'+'empresa}'}</code> como variables dinámicas.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {subTabIA === 'Captura de Datos' && (
                  <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                       <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                          <div>
                             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic flex items-center space-x-3">
                                <Database size={18} className="text-[#FF6B00]" />
                                <span>Configuración de Captura de Datos</span>
                             </h3>
                             <p className="text-[10px] text-slate-400 italic mt-1">Cómo la IA debe recolectar la información del cliente</p>
                          </div>
                          <div className="flex items-center space-x-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase">
                             <Sparkles size={14} />
                             <span>Automatización Activa</span>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                             <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <h4 className="text-xs font-black text-slate-700 uppercase mb-4 flex items-center space-x-2">
                                   <div className="h-2 w-2 bg-emerald-500 rounded-full" />
                                   <span>Campos que la IA detecta</span>
                                </h4>
                                <ul className="space-y-3">
                                   {[
                                      { l: 'Nombre Completo', d: 'Se guarda automáticamente al inicio' },
                                      { l: 'Dirección de Entrega', d: 'Detectado por frases como "estoy en..." o "vivo en..."' },
                                      { l: 'NIT / Facturación', d: 'Detectado por números de 6-9 dígitos o mención de NIT' },
                                      { l: 'Notas Especiales', d: 'Cualquier detalle relevante de la conversación' }
                                   ].map((f, i) => (
                                      <li key={i} className="flex flex-col">
                                         <span className="text-[11px] font-black text-slate-800">{f.l}</span>
                                         <span className="text-[9px] text-slate-400 italic">{f.d}</span>
                                      </li>
                                   ))}
                                </ul>
                             </div>
                             
                             <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
                                <h4 className="text-xs font-black text-orange-700 uppercase mb-2">Instrucciones para el Prompt</h4>
                                <p className="text-[10px] text-orange-600 leading-relaxed italic">
                                   Para que esto funcione, asegúrate de que tu <b>Prompt</b> (pestaña Prompt) incluya una instrucción como:
                                   <br/><br/>
                                   <code className="bg-white/50 p-2 rounded block text-[9px] border border-orange-200">
                                      "Si el cliente muestra interés, solicita amablemente su nombre, dirección para la entrega y su NIT para la factura."
                                   </code>
                                </p>
                             </div>
                          </div>

                          <div className="bg-slate-900 p-8 rounded-[32px] text-white">
                             <h4 className="text-xs font-black text-[#FF6B00] uppercase mb-4 tracking-widest italic">Guía técnica para n8n</h4>
                             <p className="text-[11px] text-slate-400 mb-6 leading-relaxed">
                                Tu flujo de n8n debe enviar un <b>POST</b> a <code className="text-emerald-400">/webhook/n8n</code> con estos campos en el JSON:
                             </p>
                             <div className="space-y-3 font-mono text-[10px]">
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                   <span className="text-blue-400">"direccion"</span>
                                   <span className="text-slate-500">// Texto de la ubicación</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                   <span className="text-blue-400">"nit"</span>
                                   <span className="text-slate-500">// NIT del cliente</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                   <span className="text-blue-400">"notas"</span>
                                   <span className="text-slate-500">// Detalles adicionales</span>
                                </div>
                             </div>
                             <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10">
                                <p className="text-[9px] text-slate-400 italic">
                                   💡 La IA calificará el lead con mayor score a medida que proporcione estos datos.
                                </p>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Stats reales de captura */}
                    <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic flex items-center space-x-3">
                          <Database size={18} className="text-[#FF6B00]" />
                          <span>Datos capturados en producción</span>
                        </h3>
                        <button onClick={fetchCaptureStats} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"><RefreshCw size={14} className="text-slate-500" /></button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {captureStats.map(f => (
                          <div key={f.key} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-black text-slate-700">{f.label}</span>
                              <span className="text-[10px] font-bold text-slate-400">{f.captured}/{f.total} leads · {f.pct}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${f.pct >= 70 ? 'bg-emerald-500' : f.pct >= 40 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${f.pct}%` }} />
                            </div>
                          </div>
                        ))}
                        {captureStats.length === 0 && <p className="text-[10px] text-slate-400 italic col-span-2 text-center py-6">Cargando...</p>}
                      </div>
                    </div>

                    {/* Config campos activos */}
                    <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                        <div>
                          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">Campos que el bot recolecta</h3>
                          <p className="text-[10px] text-slate-400 italic mt-1">Activa campos y personaliza la pregunta que hace el bot</p>
                        </div>
                        <button
                          onClick={async () => {
                            setLoading(true);
                            try {
                              await apiFetch(`${API_BASE_URL}/api/settings`, {
                                method: 'POST',
                        
                                body: JSON.stringify({ key: 'capture_fields', value: JSON.stringify(captureFields) })
                              });
                              setNotification('✅ Campos guardados');
                              setTimeout(() => setNotification(null), 3000);
                            } catch(e) { setNotification('❌ Error'); }
                            finally { setLoading(false); }
                          }}
                          className="flex items-center space-x-2 bg-emerald-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-600 transition-all shadow-lg"
                        ><Save size={14} /><span>Guardar</span></button>
                      </div>
                      <div className="space-y-3">
                        {captureFields.map((f, i) => (
                          <div key={f.key} className={`p-5 rounded-3xl border transition-all ${f.activo ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 opacity-60'}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => setCaptureFields(prev => prev.map((x, j) => j === i ? { ...x, activo: !x.activo } : x))}
                                  className={`w-10 h-6 rounded-full transition-all relative shrink-0 ${f.activo ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                >
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${f.activo ? 'left-5' : 'left-1'}`} />
                                </button>
                                <span className="text-[11px] font-black text-slate-800">{f.label}</span>
                              </div>
                              <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${f.activo ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{f.activo ? 'Activo' : 'Inactivo'}</span>
                            </div>
                            {f.activo && (
                              <input
                                type="text"
                                value={f.pregunta}
                                onChange={e => setCaptureFields(prev => prev.map((x, j) => j === i ? { ...x, pregunta: e.target.value } : x))}
                                className="w-full p-3 bg-white border border-slate-100 rounded-2xl text-[11px] font-medium text-slate-600 outline-none focus:ring-2 focus:ring-[#FF6B00]/30 italic"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

               {subTabIA === 'Handoff' && (
                  <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                     <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                        <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                           <div>
                              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic flex items-center space-x-3">
                                 <AlertTriangle size={18} className="text-[#FF6B00]" />
                                 <span>Palabras que activan Handoff</span>
                              </h3>
                              <p className="text-[10px] text-slate-400 italic mt-1">Cuando el cliente escribe estas palabras, el bot se apaga y se alerta al agente</p>
                           </div>
                           <div className="flex space-x-3">
                              <button
                                 onClick={() => setHandoffTriggers(prev => [...prev, { keywords: '', reason: 'Nueva categoría' }])}
                                 className="bg-slate-100 text-slate-600 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center space-x-2"
                              >
                                 <Plus size={14} />
                                 <span>Agregar</span>
                              </button>
                              <button
                                 onClick={saveHandoffTriggers}
                                 className="bg-[#FF6B00] text-white px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all flex items-center space-x-2"
                              >
                                 <Save size={14} />
                                 <span>Guardar</span>
                              </button>
                           </div>
                        </div>
                        <div className="space-y-4">
                           {handoffTriggers.map((trigger, idx) => (
                              <div key={idx} className="bg-slate-50 border border-slate-100 rounded-[24px] p-6 space-y-4">
                                 <div className="flex items-center justify-between">
                                    <input
                                       type="text"
                                       value={trigger.reason}
                                       onChange={e => setHandoffTriggers(prev => prev.map((t, i) => i === idx ? {...t, reason: e.target.value} : t))}
                                       className="text-xs font-black text-slate-700 uppercase tracking-widest bg-transparent outline-none border-b border-slate-200 pb-1 w-64"
                                       placeholder="Nombre de categoría"
                                    />
                                    <button
                                       onClick={() => setHandoffTriggers(prev => prev.filter((_, i) => i !== idx))}
                                       className="text-red-400 hover:text-red-600 transition-colors"
                                    >
                                       <Trash2 size={14} />
                                    </button>
                                 </div>
                                 <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Palabras clave (separadas por coma)</label>
                                    <input
                                       type="text"
                                       value={trigger.keywords}
                                       onChange={e => setHandoffTriggers(prev => prev.map((t, i) => i === idx ? {...t, keywords: e.target.value} : t))}
                                       className="w-full mt-2 p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none italic focus:ring-1 focus:ring-[#FF6B00]"
                                       placeholder="precio, presupuesto, cuánto cuesta"
                                    />
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               )}

               {subTabIA === 'Aprendizaje' && (
                  <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">

                     {/* Stats rápidos */}
                     {aiInsights?.stats && (
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         {[
                           { label: 'Mensajes analizados', value: aiInsights.stats.totalMensajes || 0, color: 'text-slate-800' },
                           { label: 'Tasa de conversión', value: `${aiInsights.stats.convRate || 0}%`, color: 'text-emerald-600' },
                           { label: 'Objeciones detectadas', value: aiInsights.stats.objeciones || 0, color: 'text-orange-500' },
                           { label: 'Hora pico', value: aiInsights.stats.horasPico || 'N/A', color: 'text-blue-600' },
                         ].map((s, i) => (
                           <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{s.label}</p>
                             <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                           </div>
                         ))}
                       </div>
                     )}

                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Panel de Topics */}
                        <div className="lg:col-span-1 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
                           <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic flex items-center space-x-3">
                              <LineChart size={18} className="text-emerald-500" />
                              <span>Lo que más preguntan</span>
                           </h3>
                           <div className="space-y-3">
                              {(!aiInsights?.topics || aiInsights.topics.length === 0) ? (
                                <p className="text-[10px] text-slate-400 italic text-center py-10">Analizando conversaciones...</p>
                              ) : aiInsights.topics.map((ins, i) => {
                                const max = aiInsights.topics[0]?.count || 1;
                                const pct = Math.round((ins.count / max) * 100);
                                return (
                                  <div key={i} className="space-y-1">
                                    <div className="flex justify-between items-center">
                                      <p className="text-[11px] font-black text-slate-700">{ins.topic}</p>
                                      <span className="text-[9px] font-black text-slate-400">{ins.count}</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-[#FF6B00] rounded-full transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                           </div>
                           <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                              <p className="text-[9px] text-emerald-700 italic leading-relaxed">
                                💡 {aiInsights?.topics?.[0] ? `"${aiInsights.topics[0].topic}" es el tema más consultado con ${aiInsights.topics[0].count} menciones.` : "La IA está aprendiendo de tus clientes."}
                              </p>
                           </div>
                        </div>

                        {/* Mapa de Conocimiento */}
                        <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                           <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic flex items-center space-x-3">
                                 <Brain size={18} className="text-[#FF6B00]" />
                                 <span>Temas aprendidos de clientes</span>
                              </h3>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {aiKnowledge.length === 0 ? (
                                <div className="md:col-span-2 py-20 text-center border-2 border-dashed border-slate-50 rounded-[40px]">
                                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin conocimientos nuevos por ahora</p>
                                </div>
                              ) : aiKnowledge.map((k, i) => (
                                <div key={i} className={`p-6 rounded-[32px] border ${k.status === 'approved' ? 'bg-white border-slate-100' : 'bg-orange-50/30 border-orange-100'} space-y-3`}>
                                  <div className="flex justify-between items-start">
                                    <span className="text-[10px] font-black text-[#FF6B00] uppercase tracking-widest italic leading-tight">{k.topic || 'Nuevo Conocimiento'}</span>
                                    <div className="flex items-center space-x-2 shrink-0">
                                      <span className="text-[8px] font-black text-slate-400">{k.frequency}x</span>
                                      <span className={`text-[8px] font-black uppercase ${k.status === 'approved' ? 'text-emerald-500' : 'text-orange-500 animate-pulse'}`}>{k.status}</span>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-slate-500 italic leading-relaxed line-clamp-2">{k.content?.slice(0, 80)}</p>
                                  <div className="pt-2 flex space-x-2">
                                    {k.status === 'pending' && (
                                      <>
                                        <button onClick={() => approveKnowledge(k.id)} className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md">Validar</button>
                                        <button onClick={() => ignoreKnowledge(k.id)} className="flex-1 py-2 bg-slate-200 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest">Ignorar</button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {subTabIA === 'Prompt' && (
                  <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                     <div className="flex space-x-3">
                        {['Recepcionista', 'Vendedor', 'Soporte'].map(agent => (
                           <button 
                             key={agent} 
                             onClick={() => setSelectedAgent(agent)}
                             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedAgent === agent ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
                           >
                              {agent}
                           </button>
                        ))}
                     </div>

                     <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                        <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                           <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic flex items-center space-x-3">
                              <span>📜 Prompt del {selectedAgent}</span>
                           </h3>
                           <button 
                             onClick={() => saveSetting(selectedAgent === 'Vendedor' ? 'prompt_ventas' : `prompt_${selectedAgent.toLowerCase().replace(' ', '_')}`, prompts[selectedAgent])}
                             className="bg-[#FF6B00] text-white px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all"
                           >
                             Guardar Cambios
                           </button>
                        </div>
                        <textarea 
                          value={prompts?.[selectedAgent] || ""} 
                          onChange={(e) => setPrompts(prev => ({...prev, [selectedAgent]: e.target.value}))} 
                          className="w-full h-[500px] p-8 bg-slate-50 border border-slate-100 rounded-[32px] text-sm font-medium outline-none italic resize-none leading-relaxed"
                          placeholder={`Escribe aquí las instrucciones maestras para el ${selectedAgent}...`}
                        />
                     </div>
                  </div>
                )}
              </div>
          )}

          {/* VIEW: BASE RAG (CONOCIMIENTO) */}
          {activeTab === 'rag' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-6">
                     <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">Base de Conocimiento RAG</h2>
                     <div className="flex space-x-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                        <button onClick={() => setRagSubTab('conocimiento')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${ragSubTab === 'conocimiento' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Conocimiento</button>
                        <button onClick={() => setRagSubTab('catalogo')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${ragSubTab === 'catalogo' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Catálogo</button>
                     </div>
                  </div>
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => fileInputRef.current.click()}
                      className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-800 shadow-sm flex items-center space-x-2"
                    >
                       <Link2 size={18} />
                       <span className="text-[9px] font-black uppercase">Subir Documento</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.txt,.xlsx,.xls" />
                    <button 
                      onClick={() => {
                        if (ragSubTab === 'conocimiento') setShowNewCard(true);
                        else setShowNewProduct(true);
                      }}
                      className="bg-slate-900 text-white px-8 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-[#FF6B00] transition-all flex items-center space-x-2"
                    >
                       <Plus size={16} />
                       <span>Añadir {ragSubTab === 'conocimiento' ? 'Tarjeta' : 'Producto'}</span>
                    </button>
                  </div>
               </div>

              {/* Resultados de Búsqueda Inteligente */}
              {testResults.length > 0 ? (
                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6 animate-in zoom-in-95 duration-500">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                     <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultados de Inteligencia</span>
                        <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">{testResults.length} Encontrados</span>
                     </div>
                     <button onClick={() => { setTestResults([]); setTestQuery(''); }} className="text-[9px] font-black text-slate-400 uppercase hover:text-red-500 transition-colors flex items-center space-x-1">
                        <X size={12} /><span>Limpiar</span>
                     </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {testResults.map((res, i) => (
                      <div key={i} className="bg-slate-50 border border-slate-100 rounded-[28px] p-6 space-y-3 hover:border-[#FF6B00]/30 transition-all group relative overflow-hidden">
                         <div className="flex justify-between items-center relative z-10">
                            <div className="flex items-center space-x-2">
                               <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${res.tipo === 'Tarjeta' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                 {res.tipo}
                               </span>
                               {res.score > 0 && (
                                 <span className="bg-slate-900 text-[#FF6B00] text-[8px] font-black px-2 py-1 rounded-lg flex items-center space-x-1">
                                   <Zap size={8} fill="#FF6B00" />
                                   <span>{res.score > 50 ? 'ALTA' : res.score > 20 ? 'MEDIA' : 'BAJA'} RELEVANCIA</span>
                                 </span>
                               )}
                            </div>
                            <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full group-hover:animate-ping" />
                         </div>
                         <h4 className="text-xs font-black text-slate-800 uppercase italic relative z-10">{res.titulo}</h4>
                         <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-4 italic relative z-10">{res.contenido}</p>
                         <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            {res.tipo === 'Tarjeta' ? <BookOpen size={40} /> : <Tag size={40} />}
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : testQuery && !isSearching && (
                <div className="bg-white p-12 rounded-[32px] border border-slate-200 border-dashed text-center space-y-4 animate-in fade-in duration-500">
                   <div className="bg-slate-50 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                      <Search size={32} />
                   </div>
                   <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase italic">Sin coincidencias exactas</h3>
                      <p className="text-[10px] text-slate-400 italic">Intenta buscar con palabras más simples o verifica el catálogo.</p>
                   </div>
                </div>
              )}


               {/* Tabs Content */}
               {ragSubTab === 'conocimiento' ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {documents.map(doc => (
                      <div key={doc.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-100 transition-all duration-500 group relative">
                         <div className="absolute top-6 right-6 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingCard(doc)} className="p-2 bg-slate-900 text-white rounded-xl hover:bg-[#FF6B00] transition-colors shadow-lg"><Pencil size={14} /></button>
                            <button onClick={() => handleDeleteDocument(doc.id)} className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14} /></button>
                         </div>
                         <div className="space-y-6">
                            <span className={`px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-tighter border ${CATEGORY_STYLES[doc.category]?.badge || CATEGORY_STYLES.General.badge}`}>
                               {doc.category || 'General'}
                            </span>
                            <div>
                               <h4 className="text-lg font-black text-slate-800 uppercase italic leading-tight mb-2">{doc.name}</h4>
                               <p className="text-[11px] text-slate-400 leading-relaxed italic line-clamp-4">{doc.content}</p>
                            </div>
                            <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-[8px] font-black text-slate-300 uppercase tracking-widest italic">
                               <span>Actualizado</span>
                               <span className="tabular-nums">{doc.timestamp || '00/00/00'}</span>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {products.map(prod => (
                      <div key={prod.id} className="bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-100 transition-all duration-500 group overflow-hidden flex flex-col">
                         <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden flex items-center justify-center">
                            {prod.imagen ? (
                              <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            ) : (
                              <ShoppingBag size={48} className="text-slate-200 group-hover:scale-110 transition-transform duration-700" />
                            )}
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                               <button onClick={() => setEditingProduct(prod)} className="bg-white p-3 rounded-2xl text-slate-900 hover:bg-[#FF6B00] hover:text-white transition-all shadow-xl active:scale-90"><Pencil size={18} /></button>
                               <button onClick={() => handleDeleteProduct(prod.id)} className="bg-white p-3 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-xl active:scale-90"><Trash2 size={18} /></button>
                            </div>
                            <span className={`absolute top-4 right-4 px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-tighter border shadow-lg ${STOCK_STYLES[prod.stock] || STOCK_STYLES['En stock']}`}>
                               {prod.stock}
                            </span>
                         </div>
                         <div className="p-6 space-y-4 flex-1 flex flex-col">
                            <span className="text-[8px] font-black text-[#FF6B00] uppercase tracking-widest">{prod.categoria}</span>
                            <div className="flex-1">
                               <h4 className="text-sm font-black text-slate-800 uppercase italic leading-tight mb-1">{prod.nombre}</h4>
                               <p className="text-[10px] text-slate-400 italic line-clamp-2">{prod.descripcion}</p>
                            </div>
                            <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                               <span className="text-lg font-black text-slate-900 tabular-nums italic">Q{prod.precio}</span>
                               <span className="h-2 w-2 bg-emerald-400 rounded-full"></span>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          )}

        </div>
      </main>

      {/* MODAL: NUEVA TARJETA RAG */}
      {showNewCard && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="p-10 border-b border-slate-50 flex justify-between items-center">
                 <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Nueva Tarjeta de Conocimiento</h3>
                 <button onClick={() => setShowNewCard(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800"><X size={20} /></button>
              </div>
              <div className="p-10 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre / Título</label>
                       <input type="text" value={newCard.name} onChange={e => setNewCard({...newCard, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" placeholder="Ej: Garantía de Motores" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Categoría</label>
                       <select value={newCard.category} onChange={e => setNewCard({...newCard, category: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all">
                          {CARD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                       </select>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Contenido</label>
                    <textarea rows={6} value={newCard.content} onChange={e => setNewCard({...newCard, content: e.target.value})} className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-3xl text-xs font-medium leading-relaxed outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all resize-none italic" placeholder="Escribe aquí la información que la IA usará para responder..."></textarea>
                 </div>
                 <button onClick={handleSaveCard} className="w-full py-5 bg-slate-900 text-white rounded-[28px] text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200 hover:bg-[#FF6B00] transition-all active:scale-95">Integrar al Conocimiento</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: EDITAR TARJETA RAG */}
      {editingCard && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="p-10 border-b border-slate-50 flex justify-between items-center">
                 <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Editar Conocimiento</h3>
                 <button onClick={() => setEditingCard(null)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800"><X size={20} /></button>
              </div>
              <div className="p-10 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre / Título</label>
                       <input type="text" value={editingCard.name} onChange={e => setEditingCard({...editingCard, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Categoría</label>
                       <select value={editingCard.category} onChange={e => setEditingCard({...editingCard, category: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all">
                          {CARD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                       </select>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Contenido</label>
                    <textarea rows={6} value={editingCard.content} onChange={e => setEditingCard({...editingCard, content: e.target.value})} className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-3xl text-xs font-medium leading-relaxed outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all resize-none italic"></textarea>
                 </div>
                 <button onClick={() => handleUpdateCard(editingCard.id)} className="w-full py-5 bg-slate-900 text-white rounded-[28px] text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200 hover:bg-[#FF6B00] transition-all active:scale-95">Guardar Cambios</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: NUEVO PRODUCTO */}
      {showNewProduct && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="p-10 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white z-10">
                 <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Nuevo Producto del Catálogo</h3>
                 <button onClick={() => setShowNewProduct(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800"><X size={20} /></button>
              </div>
              <div className="p-10 space-y-8">
                 <div className="flex flex-col md:flex-row gap-8">
                    <div className="w-48 space-y-4 shrink-0">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">Imagen</label>
                       <div className="aspect-square bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100 flex items-center justify-center relative group overflow-hidden">
                          {newProduct.imagen ? (
                            <img src={newProduct.imagen} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <Plus size={24} className="text-slate-300 group-hover:scale-110 transition-transform" />
                          )}
                          <input type="file" onChange={(e) => handleProductImageUpload(e, 'new')} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                       </div>
                       <p className="text-[8px] text-slate-400 text-center italic leading-tight">Haz clic para subir imagen del producto</p>
                    </div>
                    <div className="flex-1 space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre del Producto</label>
                          <input type="text" value={newProduct.nombre} onChange={e => setNewProduct({...newProduct, nombre: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" placeholder="Ej: Motor Residencial BFT" />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Precio (Q)</label>
                             <input type="text" value={newProduct.precio} onChange={e => setNewProduct({...newProduct, precio: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all tabular-nums" placeholder="2500.00" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Stock</label>
                             <select value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all">
                                {STOCK_OPTIONS.map(o => <option key={o}>{o}</option>)}
                             </select>
                          </div>
                        </div>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Categoría</label>
                        <select value={newProduct.categoria} onChange={e => setNewProduct({...newProduct, categoria: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all">
                           {PRODUCT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Link del Catálogo (opcional)</label>
                        <input type="text" value={newProduct.catalog_link || ''} onChange={e => setNewProduct({...newProduct, catalog_link: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" placeholder="https://..." />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Descripción Detallada</label>
                     <textarea rows={4} value={newProduct.descripcion} onChange={e => setNewProduct({...newProduct, descripcion: e.target.value})} className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-3xl text-xs font-medium leading-relaxed outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all resize-none italic" placeholder="Características técnicas, garantía, etc..."></textarea>
                  </div>
                  <button onClick={handleSaveProduct} className="w-full py-5 bg-slate-900 text-white rounded-[28px] text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200 hover:bg-[#FF6B00] transition-all active:scale-95">Publicar en Catálogo</button>
               </div>
            </div>
         </div>
      )}


      {/* MODAL: EDITAR PRODUCTO */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="p-10 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white z-10">
                 <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Editar Producto</h3>
                 <button onClick={() => setEditingProduct(null)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800"><X size={20} /></button>
              </div>
              <div className="p-10 space-y-8">
                 <div className="flex flex-col md:flex-row gap-8">
                    <div className="w-48 space-y-4 shrink-0">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">Imagen</label>
                       <div className="aspect-square bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100 flex items-center justify-center relative group overflow-hidden">
                          {editingProduct.imagen ? (
                            <img src={editingProduct.imagen} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingBag size={24} className="text-slate-300 group-hover:scale-110 transition-transform" />
                          )}
                          <input type="file" onChange={(e) => handleProductImageUpload(e, 'edit')} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                       </div>
                    </div>
                    <div className="flex-1 space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre del Producto</label>
                          <input type="text" value={editingProduct.nombre} onChange={e => setEditingProduct({...editingProduct, nombre: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Precio (Q)</label>
                             <input type="text" value={editingProduct.precio} onChange={e => setEditingProduct({...editingProduct, precio: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all tabular-nums" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Stock</label>
                             <select value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all">
                                {STOCK_OPTIONS.map(o => <option key={o}>{o}</option>)}
                             </select>
                          </div>
                       </div>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Categoría</label>
                       <select value={editingProduct.categoria} onChange={e => setEditingProduct({...editingProduct, categoria: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all">
                          {PRODUCT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Link del Catálogo</label>
                       <input type="text" value={editingProduct.catalog_link || ''} onChange={e => setEditingProduct({...editingProduct, catalog_link: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Descripción Detallada</label>
                    <textarea rows={4} value={editingProduct.descripcion} onChange={e => setEditingProduct({...editingProduct, descripcion: e.target.value})} className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-3xl text-xs font-medium leading-relaxed outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all resize-none italic"></textarea>
                 </div>
                 <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer group">
                       <input type="checkbox" checked={editingProduct.activo} onChange={e => setEditingProduct({...editingProduct, activo: e.target.checked ? 1 : 0})} className="hidden" />
                       <div className={`h-6 w-11 rounded-full relative transition-all ${editingProduct.activo ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                          <div className={`absolute top-1 h-4 w-4 bg-white rounded-full transition-all ${editingProduct.activo ? 'left-6' : 'left-1'}`} />
                       </div>
                       <span className="text-[10px] font-black text-slate-400 uppercase group-hover:text-slate-800 transition-colors">Activo en catálogo</span>
                    </label>
                 </div>
                 <button onClick={() => handleUpdateProduct(editingProduct.id)} className="w-full py-5 bg-slate-900 text-white rounded-[28px] text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200 hover:bg-[#FF6B00] transition-all active:scale-95">Guardar Cambios</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: EDITAR LEAD (GESTIÓN CRM) */}
      {editingLead && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="p-10 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white z-10">
                 <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Gestionar Datos de Cliente</h3>
                 <button onClick={() => setEditingLead(null)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800"><X size={20} /></button>
              </div>
              <div className="p-10 space-y-8">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre Completo</label>
                       <input type="text" value={editingLead.nombre} onChange={e => setEditingLead({...editingLead, nombre: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Teléfono / WhatsApp</label>
                       <input type="text" value={editingLead.phone} onChange={e => setEditingLead({...editingLead, phone: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Email</label>
                       <input type="email" value={editingLead.email} onChange={e => setEditingLead({...editingLead, email: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Estado del Lead</label>
                       <select value={editingLead.estado} onChange={e => setEditingLead({...editingLead, estado: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all">
                          <option>Nuevo</option>
                          <option>En Gestión</option>
                          <option>Venta Cerrada</option>
                          <option>Perdido</option>
                          <option>Intervención Requerida</option>
                       </select>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Etiquetas (separadas por coma)</label>
                    <input type="text" value={editingLead.etiquetas} onChange={e => setEditingLead({...editingLead, etiquetas: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" placeholder="Interesado, Urgente, Motor BFT..." />
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">NIT / Datos Factura</label>
                       <input type="text" value={editingLead.nit || ''} onChange={e => setEditingLead({...editingLead, nit: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Dirección</label>
                       <input type="text" value={editingLead.direccion || ''} onChange={e => setEditingLead({...editingLead, direccion: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Notas Internas</label>
                    <textarea rows={4} value={editingLead.notas} onChange={e => setEditingLead({...editingLead, notas: e.target.value})} className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-3xl text-xs font-medium leading-relaxed outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all resize-none italic" placeholder="Notas sobre el cliente..."></textarea>
                 </div>

                 <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                    <div className="flex items-center space-x-4">
                       <Bot size={24} className={editingLead.botActive ? 'text-emerald-500' : 'text-slate-300'} />
                       <div>
                          <p className="text-[10px] font-black text-slate-800 uppercase italic">Estado del Asistente IA</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{editingLead.botActive ? 'IA Gestionando automáticamente' : 'IA Desactivada para este cliente'}</p>
                       </div>
                    </div>
                    <button 
                      onClick={() => setEditingLead({...editingLead, botActive: editingLead.botActive ? 0 : 1})}
                      className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editingLead.botActive ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}
                    >
                       {editingLead.botActive ? 'Activado' : 'Desactivado'}
                    </button>
                 </div>

                 <button onClick={handleUpdateLead} className="w-full py-5 bg-slate-900 text-white rounded-[28px] text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200 hover:bg-[#FF6B00] transition-all active:scale-95">Guardar Perfil de Cliente</button>
              </div>
           </div>
        </div>
      )}

      {/* TOAST FLOTANTE — Notificación de mensaje entrante */}
      {notification && typeof notification === 'object' && notification.type === 'message' && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 rounded-3xl shadow-2xl shadow-slate-900/40 border border-slate-700 overflow-hidden w-80">
            <div className="bg-[#FF6B00] px-4 py-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-white animate-ping" />
                <span className="text-[9px] font-black text-white uppercase tracking-widest">Nuevo Mensaje</span>
              </div>
              <button onClick={() => setNotification(null)} className="text-white/70 hover:text-white transition-colors">
                <X size={12} />
              </button>
            </div>
            <div className="p-4 flex items-start space-x-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-800 text-[#FF6B00] flex items-center justify-center font-black text-sm shrink-0 border border-slate-700">
                {notification.lead?.nombre?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white leading-none mb-1">{notification.lead?.nombre || 'Cliente'}</p>
                <p className="text-[10px] text-slate-400 font-medium leading-tight truncate">{notification.text}</p>
                <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                  notification.lead?.estado === 'Venta' ? 'bg-emerald-500/20 text-emerald-400' :
                  notification.lead?.estado === 'Interesado' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-slate-700 text-slate-400'
                }`}>{notification.lead?.estado || 'Nuevo'}</span>
              </div>
            </div>
            <button
              onClick={() => { setActiveTab('conversaciones'); setSelectedChatId(notification.lead?.id); setNotification(null); }}
              className="w-full py-2.5 bg-slate-800 hover:bg-[#FF6B00] text-slate-400 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all border-t border-slate-700"
            >
              Ver conversación →
            </button>
          </div>
        </div>
      )}

      {/* TOAST FLOTANTE — Notificación de pedido nuevo */}
      {notification && typeof notification === 'object' && notification.type === 'pedido' && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 rounded-3xl shadow-2xl shadow-slate-900/40 border border-slate-700 overflow-hidden w-80">
            <div className="bg-emerald-500 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-white animate-ping" />
                <span className="text-[9px] font-black text-white uppercase tracking-widest">Nuevo Pedido</span>
              </div>
              <button onClick={() => setNotification(null)} className="text-white/70 hover:text-white transition-colors">
                <X size={12} />
              </button>
            </div>
            <div className="p-4 flex items-start space-x-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center font-black text-lg shrink-0 border border-slate-700">
                🛒
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white leading-none mb-1">{notification.pedido?.cliente || 'Cliente'}</p>
                <p className="text-[10px] text-slate-400 font-medium leading-tight truncate">{notification.text}</p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400">Nuevo</span>
              </div>
            </div>
            <button
              onClick={() => { setActiveTab('pedidos'); setNotification(null); }}
              className="w-full py-2.5 bg-slate-800 hover:bg-emerald-500 text-slate-400 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all border-t border-slate-700"
            >
              Ver pedidos →
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;