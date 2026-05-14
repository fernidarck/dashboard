import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, MessageSquare, Users, Calendar, ShoppingBag, 
  Brain, Database, Zap, SendHorizontal, Search, Bell, X, 
  MoreVertical, CheckCircle2, AlertTriangle, UserCircle, Phone, 
  Pencil, Trash2, Plus, Save, TrendingUp, Target, Archive,
  RefreshCw, Power, ShieldCheck, ChevronRight, ChevronLeft,
  Bot, Sparkles, BookOpen, Tag, LineChart, Globe, Link2
} from 'lucide-react';

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
          await fetch(`${API_BASE_URL}/api/ai/analyze`, { method: 'POST' });
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Data States
  const [leads, setLeads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [products, setProducts] = useState([]);
  
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

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const playMessageAlert = useRef(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    audio.play().catch(() => {});
  });

  // --- DATA FETCHING ---
  const fetchLeads = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/leads`);
      const data = await res.json();
      setLeads(data);
      if (data.length > 0 && !selectedChatId) {
        setSelectedChatId(data[0].id);
      }
    } catch (err) { console.error(err); }
  };

  const fetchMessages = async (id) => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/${id}`);
      const data = await res.json();
      setMessages(data);
    } catch (err) { console.error(err); }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`);
      const data = await res.json();
      const config = { ...agentConfig };
      const loadedPrompts = { ...prompts };
      
      data.forEach(s => {
        if (s.key === 'agent_nombre') config.nombre = s.value;
        if (s.key === 'agent_rol') config.rol = s.value;
        if (s.key === 'agent_empresa') config.empresa = s.value;
        if (s.key === 'agent_descripcion') config.descripcion = s.value;
        if (s.key === 'agent_personalidad') config.personalidad = s.value;
        if (s.key === 'agent_idioma') config.idioma = s.value;
        if (s.key === 'agent_tono') config.tono = s.value;
        if (s.key === 'agent_productos') config.productos = s.value;
        
        if (s.key === 'prompt_recepcionista') loadedPrompts.Recepcionista = s.value;
        if (s.key === 'prompt_ventas') loadedPrompts.Vendedor = s.value;
        if (s.key === 'prompt_soporte') loadedPrompts.Soporte = s.value;
      });
      
      setAgentConfig(config);
      setPrompts(loadedPrompts);
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
      const res = await fetch(`${API_BASE_URL}/api/agenda`);
      setAgenda(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchPedidos = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/pedidos`);
      setPedidos(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchLearning = async () => {
    try {
      const [insightsRes, knowledgeRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/ai/insights`),
        fetch(`${API_BASE_URL}/api/ai/knowledge`)
      ]);
      setAiInsights(await insightsRes.json());
      setAiKnowledge(await knowledgeRes.json());
    } catch (err) { console.error(err); }
  };

  const fetchHandoff = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/handoff/triggers`);
      setHandoffTriggers(await res.json());
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
    
    const interval = setInterval(() => {
      fetchLeads();
      if (activeTab === 'conversaciones') fetchMessages(selectedChatId);
      if (activeTab === 'pedidos') fetchPedidos();
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- ACTIONS ---
  const handleAction = async (action, data) => {
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/api/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data })
      });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChatId) return;
    const text = messageText;
    setMessageText('');
    try {
      await fetch(`${API_BASE_URL}/api/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selectedChatId, text, sender: 'agent' })
      });
      fetchMessages(selectedChatId);
    } catch (err) { console.error(err); }
  };

  const saveSetting = async (key, value) => {
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API_BASE_URL}/api/handoff/triggers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(handoffTriggers)
      });
      setNotification('✅ Triggers de Handoff guardados');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const approveKnowledge = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/api/ai/knowledge/approve/${id}`, {
        method: 'POST'
      });
      fetchLearning();
      fetchRAG();
      setNotification('✅ Conocimiento validado e integrado al RAG');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) { console.error(err); }
  };

  const updatePedidoEstado = async (id, nuevoEstado) => {
    try {
      await fetch(`${API_BASE_URL}/api/pedidos/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: nuevoEstado })
      });
      fetchPedidos();
    } catch (err) { console.error(err); }
  };

  // --- RAG ACTIONS ---
  const handleSaveCard = async () => {
    if (!newCard.name.trim() || !newCard.content.trim()) return;
    try {
      await fetch(`${API_BASE_URL}/api/rag/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API_BASE_URL}/api/rag/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API_BASE_URL}/api/rag/documents/${id}`, { method: 'DELETE' });
      fetchRAG();
    } catch (err) { console.error(err); }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('¿Eliminar este producto del catálogo?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/products/${id}`, { method: 'DELETE' });
      fetchRAG();
    } catch (err) { console.error(err); }
  };

  const runTestSearch = async () => {
    if (!testQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/rag/test-search?query=${encodeURIComponent(testQuery)}`);
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
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
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
      const res = await fetch(`${API_BASE_URL}/api/products/upload-image`, {
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
    setLoading(false);
    setTimeout(() => setNotification(null), 3000);
  };

  // --- CRM ACTIONS ---
  const [editingLead, setEditingLead] = useState(null);
  
  const handleUpdateLead = async () => {
    if (!editingLead) return;
    try {
      await fetch(`${API_BASE_URL}/api/leads/${editingLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API_BASE_URL}/api/messages/${id}`, { method: 'DELETE' });
      fetchMessages(id);
    } catch (err) { console.error(err); }
  };

  const handleArchiveLead = async (id, currentStatus) => {
    try {
      await fetch(`${API_BASE_URL}/api/leads/${id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                 <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Estado</p>
                 <p className="text-[10px] font-black text-[#FF6B00] uppercase truncate">{lead.estado || 'Nuevo'}</p>
              </div>
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
            onClick={() => { setBotEnabled(!botEnabled); handleAction('toggle_bot', { enabled: !botEnabled }); }}
            className={`w-full py-3 rounded-2xl flex items-center justify-center space-x-2 font-black text-[10px] uppercase tracking-widest transition-all ${botEnabled ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-200 text-slate-500'}`}
          >
            <Power size={14} />
            <span>IA {botEnabled ? 'Encendida' : 'Manual'}</span>
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
             {notification && <div className={`text-white text-[9px] md:text-[10px] font-black px-3 md:px-4 py-1.5 rounded-lg uppercase shadow-lg animate-bounce ${notification.startsWith('❌') ? 'bg-red-500' : notification.startsWith('💬') ? 'bg-blue-500' : 'bg-emerald-500'}`}>{notification}</div>}
             <button
               onClick={() => {
                 playMessageAlert.current();
                 setNotification('💬 Prueba: Notificación activa!');
                 setTimeout(() => setNotification(null), 4000);
               }}
               className="hidden md:flex items-center space-x-1 bg-blue-50 border border-blue-200 text-blue-600 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
               title="Probar notificación"
             >
               <Bell size={12} /><span>Test</span>
             </button>
             <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl md:rounded-2xl bg-slate-900 flex items-center justify-center font-black text-[#FF6B00] border-2 border-white shadow-xl italic">OC</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 no-scrollbar">
          
          {/* VIEW: DASHBOARD (RESUMEN) */}
          {activeTab === 'dashboard' && (() => {
            // ── MÉTRICAS REALES ──────────────────────────────────────
            const totalLeads = leads.length;
            const urgentLeads = leads.filter(l => l.priority === 'urgent').length;
            const avgScore = totalLeads > 0 
              ? Math.round(leads.reduce((sum, l) => sum + (l.score || 0), 0) / totalLeads) 
              : 0;

            return (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                   <div>
                      <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">Resumen Operativo</h2>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">Monitoreo en tiempo real de tu ecosistema SaaS</p>
                   </div>
                   <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 flex items-center space-x-4 shadow-sm">
                      <div className="flex -space-x-2">
                        {[1,2,3].map(i => <div key={i} className="h-7 w-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black italic">OC</div>)}
                      </div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Team OneControl Activo</div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Leads Totales', val: totalLeads, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+12%' },
                    { label: 'Urgentes', val: urgentLeads, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', trend: '-5%' },
                    { label: 'Engagement Promedio', val: `${avgScore}%`, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', trend: '+8%' },
                    { label: 'Agenda Semanal', val: agenda.length, icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+2' }
                  ].map((m, i) => (
                    <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all duration-500 group">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`${m.bg} ${m.color} p-4 rounded-2xl group-hover:scale-110 transition-transform`}>
                          <m.icon size={20} />
                        </div>
                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">{m.trend}</span>
                      </div>
                      <h3 className="text-3xl font-black text-slate-800 tracking-tighter mb-1">{m.val}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                       <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">Actividad de Leads</h3>
                       <div className="flex space-x-2">
                          <button className="text-[10px] font-black px-4 py-2 bg-slate-900 text-white rounded-xl uppercase tracking-widest">Día</button>
                          <button className="text-[10px] font-black px-4 py-2 text-slate-400 hover:text-slate-800 rounded-xl uppercase tracking-widest transition-colors">Semana</button>
                       </div>
                    </div>
                    <div className="h-64 flex items-end justify-between px-4 pb-4">
                      {[40, 70, 45, 90, 65, 80, 50, 95, 60, 75, 40, 85].map((h, i) => (
                        <div key={i} className="w-4 bg-slate-50 rounded-full relative group cursor-pointer" style={{ height: '100%' }}>
                           <div className="absolute bottom-0 w-full bg-slate-900 rounded-full group-hover:bg-[#FF6B00] transition-all duration-700" style={{ height: `${h}%` }}>
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                                 {h} Interacciones
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl shadow-slate-300 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-8 opacity-10 text-[#FF6B00] group-hover:rotate-12 transition-transform duration-700">
                        <Sparkles size={120} />
                     </div>
                     <div className="relative z-10 space-y-6">
                        <div className="bg-[#FF6B00]/10 p-4 rounded-3xl w-fit">
                           <Bot size={32} className="text-[#FF6B00]" />
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-white tracking-tighter uppercase italic mb-2">IA Status: Óptimo</h3>
                           <p className="text-[11px] text-slate-400 leading-relaxed italic">Tu asistente virtual está procesando el 85% de las consultas de forma autónoma. El equipo humano solo interviene en casos críticos.</p>
                        </div>
                        <div className="pt-6 space-y-4">
                           <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                              <span className="text-slate-400">Eficiencia RAG</span>
                              <span className="text-[#FF6B00]">94%</span>
                           </div>
                           <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-[#FF6B00] w-[94%] rounded-full shadow-lg shadow-orange-500/20" />
                           </div>
                        </div>
                        <button onClick={() => setActiveTab('cerebro')} className="w-full py-4 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#FF6B00] hover:text-white transition-all active:scale-95">Optimizar Agente</button>
                     </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* VIEW: CONVERSACIONES (CRM) */}
          {activeTab === 'conversaciones' && (
            <div className="h-full flex space-x-8 animate-in fade-in slide-in-from-right-4 duration-700">
               {/* Chat List */}
               <div className="w-96 flex flex-col space-y-6">
                  <div className="relative group">
                     <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF6B00] transition-colors" />
                     <input type="text" placeholder="Buscar cliente o mensaje..." className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-[24px] text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all italic shadow-sm" />
                  </div>
                  
                  <div className="flex-1 space-y-3 overflow-y-auto pr-2 no-scrollbar">
                     {leads.map(lead => (
                       <button 
                        key={lead.id}
                        onClick={() => setSelectedChatId(lead.id)}
                        className={`w-full p-6 rounded-[32px] border transition-all duration-500 flex items-center space-x-4 relative overflow-hidden group ${selectedChatId === lead.id ? 'bg-white border-[#FF6B00] shadow-xl shadow-slate-100' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                       >
                          {lead.priority === 'urgent' && (
                            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-red-500 animate-pulse" />
                          )}
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-sm relative shrink-0 ${selectedChatId === lead.id ? 'bg-slate-900 text-[#FF6B00]' : 'bg-slate-50 text-slate-400'}`}>
                             {lead.nombre?.[0] || '?'}
                             {lead.botActive === 0 && <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white" />}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                             <div className="flex justify-between items-center mb-1">
                                <h4 className="text-xs font-black text-slate-800 uppercase italic truncate">{lead.nombre}</h4>
                                <span className="text-[8px] font-bold text-slate-400 uppercase tabular-nums">{lead.time || 'Ahora'}</span>
                             </div>
                             <p className="text-[10px] text-slate-400 truncate italic">{lead.estado || 'En línea'}</p>
                          </div>
                          {lead.priority === 'urgent' && (
                            <AlertTriangle size={14} className="text-red-500 animate-bounce" />
                          )}
                       </button>
                     ))}
                  </div>
               </div>

               {/* Chat Window */}
               <div className="flex-1 bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-100 flex flex-col relative overflow-hidden">
                  {selectedChatId ? (
                    <>
                      <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md z-10">
                         <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center font-black text-[#FF6B00] italic">
                               {leads.find(l => l.id === selectedChatId)?.nombre?.[0] || '?'}
                            </div>
                            <div>
                               <h3 className="text-sm font-black text-slate-800 uppercase italic leading-none mb-1">{leads.find(l => l.id === selectedChatId)?.nombre}</h3>
                               <div className="flex items-center space-x-2">
                                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{botEnabled ? 'IA Activa' : 'Chat Manual'}</span>
                               </div>
                            </div>
                         </div>
                         <div className="flex space-x-3">
                            <button onClick={() => setShowClientSidebarCRM(true)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800 transition-colors"><Database size={18} /></button>
                            <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800 transition-colors"><MoreVertical size={18} /></button>
                         </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-10 space-y-6 no-scrollbar bg-[#FDFEFF]">
                         {messages.map((msg, i) => (
                           <div key={i} className={`flex ${msg.sender === 'client' ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2 duration-500`}>
                              <div className={`max-w-[80%] p-6 rounded-[28px] relative group ${msg.sender === 'client' ? 'bg-slate-100 text-slate-800 rounded-bl-none' : 'bg-slate-900 text-white rounded-br-none shadow-xl shadow-slate-200'}`}>
                                 <p className="text-11px font-medium leading-relaxed italic">{msg.text}</p>
                                 <span className={`text-[8px] font-bold uppercase mt-3 block ${msg.sender === 'client' ? 'text-slate-400' : 'text-slate-500'}`}>{msg.timestamp}</span>
                              </div>
                           </div>
                         ))}
                         <div ref={messagesEndRef} />
                      </div>

                      <div className="p-8 bg-white border-t border-slate-50">
                         <div className="bg-slate-50 rounded-[28px] p-2 flex items-center space-x-2 border border-slate-100 focus-within:ring-4 focus-within:ring-orange-50 focus-within:border-[#FF6B00] transition-all">
                            <input 
                              type="text" 
                              value={messageText}
                              onChange={e => setMessageText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                              placeholder="Escribe un mensaje para el cliente..." 
                              className="flex-1 bg-transparent px-6 py-3 text-xs font-bold outline-none italic" 
                            />
                            <button 
                              onClick={handleSendMessage}
                              className="bg-slate-900 text-white h-12 w-12 rounded-2xl flex items-center justify-center hover:bg-[#FF6B00] transition-all shadow-lg active:scale-95 shrink-0"
                            >
                               <SendHorizontal size={20} />
                            </button>
                         </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-slate-300">
                       <div className="bg-slate-50 p-10 rounded-[48px] animate-pulse">
                          <MessageSquare size={64} />
                       </div>
                       <p className="text-xs font-black uppercase tracking-[0.3em] italic">Selecciona una conversación</p>
                    </div>
                  )}
               </div>

               {renderClientSidebar(leads.find(l => l.id === selectedChatId), showClientSidebarCRM, () => setShowClientSidebarCRM(false))}
            </div>
          )}

          {/* VIEW: CRM (BASE DE CLIENTES) */}
          {activeTab === 'crm' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">Base de Clientes</h2>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">Gestión centralizada de contactos y prospectos</p>
                  </div>
                  <div className="flex space-x-3">
                    <button onClick={() => fetchLeads()} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-800 shadow-sm"><RefreshCw size={18} /></button>
                    <button className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center space-x-2">
                       <Plus size={16} />
                       <span>Nuevo Lead</span>
                    </button>
                  </div>
               </div>

               <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-50">
                           <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                           <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                           <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Score IA</th>
                           <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Origen</th>
                           <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {leads.map(lead => (
                          <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                             <td className="px-8 py-6">
                                <div className="flex items-center space-x-4">
                                   <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs italic group-hover:bg-slate-900 group-hover:text-[#FF6B00] transition-all">
                                      {lead.nombre?.[0] || '?'}
                                   </div>
                                   <div>
                                      <p className="text-xs font-black text-slate-800 uppercase italic leading-none mb-1">{lead.nombre}</p>
                                      <p className="text-[10px] font-bold text-slate-400 tabular-nums">{lead.phone}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-6">
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-emerald-100">
                                   {lead.estado || 'Activo'}
                                </span>
                             </td>
                             <td className="px-8 py-6">
                                <div className="flex items-center space-x-2">
                                   <div className="flex-1 h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-[#FF6B00] rounded-full" style={{ width: `${lead.score || 0}%` }} />
                                   </div>
                                   <span className="text-[10px] font-black text-slate-800 italic">{lead.score || 0}%</span>
                                </div>
                             </td>
                             <td className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase italic">{lead.origen || 'WhatsApp'}</td>
                             <td className="px-8 py-6">
                                <button 
                                  onClick={() => { setSelectedChatId(lead.id); setActiveTab('conversaciones'); setShowClientSidebarCRM(true); }}
                                  className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all"
                                >
                                   <UserCircle size={18} />
                                </button>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
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

          {/* VIEW: AGENTE IA (CEREBRO) */}
          {activeTab === 'cerebro' && (
            <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic leading-none text-center">Configuración de Inteligencia</h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2 text-center">Define el ADN de tu asistente virtual</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['General', 'Prompts', 'Aprendizaje'].map(t => (
                    <button 
                      key={t}
                      onClick={() => setSubTabIA(t)}
                      className={`p-6 rounded-[32px] border transition-all duration-500 text-left relative overflow-hidden group ${subTabIA === t ? 'bg-slate-900 border-transparent shadow-2xl shadow-slate-300' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                    >
                       <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${subTabIA === t ? 'text-[#FF6B00]' : 'text-slate-400'}`}>{t}</div>
                       <div className={`text-sm font-black uppercase italic ${subTabIA === t ? 'text-white' : 'text-slate-800'}`}>Configurar {t}</div>
                       <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform ${subTabIA === t ? 'text-white' : 'text-slate-900'}`}>
                          {t === 'General' ? <Bot size={40} /> : t === 'Prompts' ? <Zap size={40} /> : <Brain size={40} />}
                       </div>
                    </button>
                  ))}
               </div>

               <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm space-y-10">
                  {subTabIA === 'General' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre del Agente</label>
                             <input type="text" value={agentConfig.nombre} onChange={e => setAgentConfig({...agentConfig, nombre: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Rol en la Empresa</label>
                             <input type="text" value={agentConfig.rol} onChange={e => setAgentConfig({...agentConfig, rol: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tono de Voz</label>
                             <select value={agentConfig.tono} onChange={e => setAgentConfig({...agentConfig, tono: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all">
                                <option>Amigable</option>
                                <option>Profesional</option>
                                <option>Directo</option>
                                <option>Vendedor</option>
                             </select>
                          </div>
                       </div>
                       <div className="space-y-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Descripción de la Empresa</label>
                             <textarea rows={8} value={agentConfig.descripcion} onChange={e => setAgentConfig({...agentConfig, descripcion: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all resize-none italic" placeholder="Explica qué hace OneControl para que la IA entienda el negocio..."></textarea>
                          </div>
                       </div>
                    </div>
                  )}

                  {subTabIA === 'Prompts' && (
                    <div className="space-y-8">
                       <div className="flex space-x-2 bg-slate-50 p-1 rounded-2xl w-fit">
                          {['Recepcionista', 'Vendedor', 'Soporte'].map(a => (
                            <button key={a} onClick={() => setSelectedAgent(a)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedAgent === a ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{a}</button>
                          ))}
                       </div>
                       <div className="space-y-4">
                          <div className="flex items-center justify-between">
                             <h4 className="text-xs font-black text-slate-800 uppercase italic">Instrucciones de Comportamiento</h4>
                             <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-lg">MODO EXPERTO ACTIVO</span>
                          </div>
                          <textarea 
                            rows={12} 
                            value={prompts[selectedAgent]} 
                            onChange={e => setPrompts({...prompts, [selectedAgent]: e.target.value})}
                            className="w-full px-8 py-8 bg-slate-900 text-white border-transparent rounded-[40px] text-xs font-medium leading-relaxed outline-none focus:ring-8 focus:ring-[#FF6B00]/10 transition-all resize-none italic shadow-inner" 
                            placeholder={`Define cómo debe actuar el agente de ${selectedAgent.toLowerCase()}...`}>
                          </textarea>
                       </div>
                    </div>
                  )}

                  {subTabIA === 'Aprendizaje' && (
                    <div className="space-y-10">
                       <AprendizajeLogic API_BASE_URL={API_BASE_URL} subTabIA={subTabIA} />
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                             <h4 className="text-xs font-black text-slate-800 uppercase italic flex items-center space-x-2">
                                <TrendingUp size={16} className="text-[#FF6B00]" />
                                <span>Tópicos más consultados</span>
                             </h4>
                             <div className="space-y-3">
                                {aiInsights.length > 0 ? aiInsights.map((insight, i) => (
                                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-[#FF6B00]/30 transition-all">
                                     <span className="text-[11px] font-black text-slate-800 uppercase italic">{insight.topic}</span>
                                     <div className="flex items-center space-x-3">
                                        <span className="text-[9px] font-black text-slate-400 tabular-nums">{insight.count} Hits</span>
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${insight.trend === 'Subiendo' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>{insight.trend}</span>
                                     </div>
                                  </div>
                                )) : <div className="text-slate-300 italic text-[10px]">Analizando tendencias en tiempo real...</div>}
                             </div>
                          </div>
                          <div className="space-y-6">
                             <h4 className="text-xs font-black text-slate-800 uppercase italic flex items-center space-x-2">
                                <ShieldCheck size={16} className="text-emerald-500" />
                                <span>Validación de Conocimiento</span>
                             </h4>
                             <div className="space-y-4">
                                {aiKnowledge.filter(k => k.status === 'pending').length > 0 ? aiKnowledge.filter(k => k.status === 'pending').map((k, i) => (
                                  <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 relative group">
                                     <div className="flex justify-between items-start">
                                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase">{k.topic}</span>
                                        <span className="text-[8px] font-black text-slate-300">Frec: {k.frequency}x</span>
                                     </div>
                                     <p className="text-[10px] text-slate-500 leading-relaxed italic line-clamp-3">"{k.content}"</p>
                                     <div className="flex space-x-2 pt-2">
                                        <button onClick={() => approveKnowledge(k.id)} className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all">Aprobar e Integrar</button>
                                        <button className="px-4 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-[9px] font-black uppercase hover:bg-slate-200 transition-all">Ignorar</button>
                                     </div>
                                  </div>
                                )) : (
                                  <div className="p-8 border-2 border-dashed border-slate-100 rounded-[40px] text-center space-y-4">
                                     <div className="bg-slate-50 h-12 w-12 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                                        <Target size={24} />
                                     </div>
                                     <p className="text-[10px] text-slate-400 font-medium italic">No hay nuevos datos para validar. La IA está operando bajo los parámetros establecidos.</p>
                                  </div>
                                )}
                             </div>
                          </div>
                       </div>
                    </div>
                  )}

                  <div className="pt-10 border-t border-slate-50 flex justify-end">
                     <button 
                      onClick={() => {
                        if (subTabIA === 'General') {
                          Object.entries(agentConfig).forEach(([key, val]) => saveSetting(`agent_${key}`, val));
                        } else if (subTabIA === 'Prompts') {
                          saveSetting(`prompt_${selectedAgent.toLowerCase() === 'vendedor' ? 'ventas' : selectedAgent.toLowerCase()}`, prompts[selectedAgent]);
                        }
                      }}
                      className="bg-slate-900 text-[#FF6B00] px-12 py-4 rounded-[28px] text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-slate-200 hover:bg-black transition-all flex items-center space-x-3 active:scale-95"
                     >
                        <Save size={18} />
                        <span>Guardar Cambios</span>
                     </button>
                  </div>
               </div>
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

          {/* VIEW: PEDIDOS IA */}
          {activeTab === 'pedidos' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">Gestión de Pedidos IA</h2>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">Seguimiento de órdenes capturadas por el asistente</p>
                  </div>
                  <button onClick={() => fetchPedidos()} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-800 shadow-sm"><RefreshCw size={18} /></button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {pedidos.map(pedido => (
                    <div key={pedido.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-100 transition-all duration-500 group relative">
                       <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-900 group-hover:rotate-12 transition-transform">
                          <ShoppingBag size={64} />
                       </div>
                       <div className="relative z-10 space-y-6">
                          <div className="flex justify-between items-start">
                             <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl">
                                <p className="text-[10px] font-black uppercase italic leading-none">Orden</p>
                                <p className="text-sm font-black italic">#{pedido.id}</p>
                             </div>
                             <select 
                              value={pedido.estado} 
                              onChange={(e) => updatePedidoEstado(pedido.id, e.target.value)}
                              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border outline-none cursor-pointer ${pedido.estado === 'Completado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : pedido.estado === 'Cancelado' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}
                             >
                                {['Nuevo', 'En Proceso', 'Completado', 'Cancelado'].map(s => <option key={s}>{s}</option>)}
                             </select>
                          </div>
                          
                          <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Producto solicitado</p>
                             <h4 className="text-lg font-black text-slate-800 uppercase italic leading-tight">{pedido.producto}</h4>
                             <p className="text-[11px] font-bold text-[#FF6B00] mt-1 italic">Cant: {pedido.cantidad} — Q{pedido.precio}</p>
                          </div>

                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cliente</p>
                             <div className="flex justify-between items-center">
                                <span className="text-[11px] font-black text-slate-800 uppercase italic">{pedido.cliente}</span>
                                <span className="text-[10px] font-bold text-slate-400 tabular-nums">{pedido.phone}</span>
                             </div>
                          </div>

                          {pedido.notas && (
                            <div className="p-4 bg-amber-50/30 rounded-2xl border border-amber-100/50">
                               <p className="text-[9px] font-black text-amber-600 uppercase mb-1">Notas de IA</p>
                               <p className="text-[10px] text-slate-500 italic leading-relaxed">"{pedido.notas}"</p>
                            </div>
                          )}

                          <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-[8px] font-black text-slate-300 uppercase tracking-widest italic">
                             <span>Recibido</span>
                             <span className="tabular-nums">{pedido.timestamp}</span>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
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

    </div>
  );
};

export default App;