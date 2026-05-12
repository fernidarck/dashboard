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
        fetch(`${API_BASE_URL}/api/documents`),
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
      await fetch(`${API_BASE_URL}/api/documents`, {
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
      await fetch(`${API_BASE_URL}/api/documents/${id}`, {
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
      await fetch(`${API_BASE_URL}/api/documents/${id}`, { method: 'DELETE' });
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
    } catch (err) { setNotification('❌ Error de conexión'); }
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
          <div className="flex items-center space-x-4 md:space-x-6">
             <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 bg-slate-100 rounded-xl text-slate-600">
                <MoreVertical size={20} />
             </button>
             <div className="hidden md:flex bg-slate-100 p-2.5 rounded-xl text-slate-400"><Search size={18} /></div>
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
            const botMessages = messages.length; // Approximate from current chat
            const horasAhorradas = Math.max(1, Math.round(totalLeads * 0.5)); // ~30min por lead atendido por bot

            // Distribución de orígenes
            const origenCounts = leads.reduce((acc, l) => {
              const o = l.origen || 'Otro';
              acc[o] = (acc[o] || 0) + 1;
              return acc;
            }, {});
            const origenes = Object.entries(origenCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3);
            const maxOrigen = origenes[0]?.[1] || 1;
            // ────────────────────────────────────────────────────────

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
                                     {lead.priority === 'urgent' ? '🚨 INTERVENCIÓN' : lead.botActive ? `Score: ${lead.score}%` : 'Control Manual'}
                                  </p>
                                  {lead.lastMessageTime && <span className="text-[8px] font-bold text-slate-400 tabular-nums">{lead.lastMessageTime}</span>}
                               </div>
                              </div>
                           </div>
                           {lead.handoff_reason && (
                             <p className="text-[9px] text-red-500 font-bold italic truncate mt-1 leading-none">
                                ⚡ {lead.handoff_reason}
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
                               selectedLead.estado === 'Cita Agendada' ? 'bg-blue-500 text-white' :
                               selectedLead.estado === 'Interesado' ? 'bg-amber-400 text-white' :
                               selectedLead.estado === 'Perdido' ? 'bg-slate-400 text-white' :
                               'bg-slate-100 text-slate-500'
                             }`}>{selectedLead.estado || 'Nuevo'}</span>
                           </div>
                        </div>
                     </div>
                     <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleArchiveLead(selectedLead.id, selectedLead.archived)}
                          title="Archivar Conversación"
                          className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100 transition-all"
                        >
                          <Archive size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteMessages(selectedLead.id)}
                          title="Eliminar Mensajes"
                          className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button 
                          onClick={() => setShowClientSidebarChat(!showClientSidebarChat)}
                          title="Datos del Cliente"
                          className={`p-2.5 rounded-xl border transition-all ${showClientSidebarChat ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-lg shadow-orange-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                        >
                          <UserCircle size={16} />
                        </button>
                        <button onClick={async () => {
                           const newState = !selectedLead.botActive;
                           const leadId = selectedLead.id;
                           if (!leadId) return;
                           setLeads(prev => prev.map(l => l.id === leadId ? {...l, botActive: newState} : l));
                           try {
                             await fetch(`${API_BASE_URL}/api/bot/toggle`, {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ leadId, enabled: newState })
                             });
                             setNotification(newState ? `✅ Bot activado` : `🔴 Bot desactivado`);
                             setTimeout(() => setNotification(null), 3000);
                           } catch(err) { fetchLeads(); }
                        }} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedLead.botActive ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                           {selectedLead.botActive ? 'Desactivar Bot' : 'Activar Bot'}
                        </button>
                     </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-10 space-y-6 no-scrollbar bg-slate-50/20">
                     {messages.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                           <p className="text-slate-400 text-xs italic font-bold">No hay mensajes grabados en esta conversación.</p>
                        </div>
                     ) : (
                       <>
                         {messages.map((msg) => (
                           <div key={msg.id} className={`flex flex-col ${msg.sender === 'client' ? 'items-start' : 'items-end'}`}>
                              <span className="text-[10px] font-black uppercase tracking-widest mb-1 px-2 text-slate-400 flex items-center space-x-2">
                                <span>{msg.sender === 'client' ? 'Cliente' : msg.sender === 'bot' ? 'Bot IA' : 'Agente'}</span>
                                {msg.timestamp && <span className="opacity-60 tabular-nums">· {msg.timestamp}</span>}
                              </span>
                              <div className={`max-w-[70%] p-5 rounded-[28px] text-sm font-medium italic leading-relaxed shadow-sm ${
                                msg.sender === 'client'
                                  ? 'bg-blue-50 border border-blue-200 rounded-tl-none text-slate-700'
                                  : msg.sender === 'bot'
                                  ? 'bg-emerald-700 text-white rounded-tr-none border-r-4 border-emerald-400'
                                  : 'bg-slate-800 text-white rounded-tr-none border-r-4 border-[#FF6B00]'
                              }`}>
                                 {msg.text}
                              </div>
                           </div>
                         ))}
                         <div ref={messagesEndRef} />
                       </>
                     )}
                  </div>
                  <div className="p-8 bg-white border-t border-slate-100">
                     <div className="max-w-4xl mx-auto flex space-x-4">
                        <div className="flex-1 relative flex items-center">
                           <input 
                             type="text" 
                             placeholder="Intervenir chat..." 
                             className="w-full bg-slate-50 border border-slate-200 pl-12 pr-6 py-4 rounded-3xl text-sm outline-none font-medium italic"
                             value={messageText}
                             onChange={(e) => setMessageText(e.target.value)}
                             onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                           />
                        </div>
                        <button onClick={handleSendMessage} className="bg-slate-800 text-[#FF6B00] p-4 rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95"><SendHorizontal size={20} /></button>
                     </div>
                  </div>
               </div>
               {renderClientSidebar(selectedLead, showClientSidebarChat, () => setShowClientSidebarChat(false))}
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

          {/* VIEW: AGENDA */}
          {activeTab === 'agenda' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
               <div className="flex justify-between items-end">
                 <div>
                   <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic leading-none">Agenda OneControl</h2>
                   <p className="text-sm font-medium text-slate-400 mt-2 italic">Citas capturadas por la IA y agendadas manualmente</p>
                 </div>
                 <div className="flex space-x-3">
                   <button onClick={() => setShowNewCita(true)} className="flex items-center space-x-2 px-6 py-3 bg-[#FF6B00] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all">
                     <Plus size={15} /><span>Nueva Cita</span>
                   </button>
                   {['Lista', 'Mes'].map(tab => (
                     <button key={tab} onClick={() => setAgendaView(tab)} className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border-2 transition-all ${agendaView === tab ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}>{tab}</button>
                   ))}
                 </div>
               </div>

               {/* MODAL NUEVA CITA */}
               {showNewCita && (
                 <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                   <div className="bg-white rounded-[40px] p-10 w-full max-w-lg shadow-2xl space-y-6">
                     <div className="flex items-center justify-between">
                       <div>
                         <h3 className="text-xl font-black text-slate-900 italic tracking-tight">Nueva Cita</h3>
                         <p className="text-[11px] text-slate-400 mt-1 font-medium">Completa los datos de la cita</p>
                       </div>
                       <button onClick={() => { setShowNewCita(false); setNewCita(emptyCita); }} className="p-2 text-slate-400 hover:text-slate-700 transition-colors"><X size={20} /></button>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <div className="col-span-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Cliente</label>
                         <input type="text" placeholder="Nombre del cliente" value={newCita.cliente} onChange={e => setNewCita({...newCita, cliente: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6B00] transition-all" />
                       </div>
                       <div className="col-span-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Teléfono</label>
                         <input type="text" placeholder="+502 0000 0000" value={newCita.phone} onChange={e => setNewCita({...newCita, phone: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6B00] transition-all" />
                       </div>
                       <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Fecha</label>
                         <input type="date" value={newCita.fecha} onChange={e => setNewCita({...newCita, fecha: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6B00] transition-all" />
                       </div>
                       <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Hora</label>
                         <input type="time" value={newCita.hora} onChange={e => setNewCita({...newCita, hora: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6B00] transition-all" />
                       </div>
                       <div className="col-span-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Servicio</label>
                         <input type="text" placeholder="Ej: Mantenimiento motor, Instalación portón..." value={newCita.servicio} onChange={e => setNewCita({...newCita, servicio: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6B00] transition-all" />
                       </div>
                       <div className="col-span-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Duración estimada</label>
                         <select value={newCita.duracion} onChange={e => setNewCita({...newCita, duracion: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6B00] transition-all">
                           {['30 min', '1 hora', '1.5 horas', '2 horas', 'Medio día', 'Todo el día'].map(d => <option key={d}>{d}</option>)}
                         </select>
                       </div>
                     </div>
                     <div className="flex justify-end space-x-3 pt-2">
                       <button onClick={() => { setShowNewCita(false); setNewCita(emptyCita); }} className="px-6 py-3 text-[11px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
                       <button onClick={async () => {
                         if (!newCita.cliente.trim() || !newCita.fecha) return;
                         await fetch(`${API_BASE_URL}/api/agenda`, {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify(newCita)
                         });
                         setShowNewCita(false);
                         setNewCita(emptyCita);
                         fetch(`${API_BASE_URL}/api/agenda`).then(r => r.json()).then(setAgenda);
                         setNotification('✅ Cita agendada correctamente');
                         setTimeout(() => setNotification(null), 3000);
                       }} className="px-8 py-3 bg-[#FF6B00] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all">
                         Guardar Cita
                       </button>
                     </div>
                   </div>
                 </div>
               )}

               {agendaView === 'Lista' ? (
                 <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                   {agenda.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-20 space-y-4">
                       <Calendar size={40} className="text-slate-200" />
                       <p className="text-sm font-bold text-slate-400 italic">No hay citas agendadas</p>
                       <button onClick={() => setShowNewCita(true)} className="flex items-center space-x-2 px-6 py-3 bg-[#FF6B00] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all">
                         <Plus size={14} /><span>Agregar primera cita</span>
                       </button>
                     </div>
                   ) : (
                   <table className="w-full text-left">
                      <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <tr><th className="px-8 py-5">FECHA/HORA</th><th className="px-6 py-5">CLIENTE</th><th className="px-6 py-5">SERVICIO</th><th className="px-6 py-5">DURACIÓN</th><th className="px-6 py-5 text-center">ESTADO</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {agenda.map(cita => (
                          <tr key={cita.id} className="hover:bg-slate-50 transition-colors">
                             <td className="px-8 py-5">
                               <p className="text-xs font-black text-slate-800">{cita.fecha}</p>
                               <p className="text-[10px] font-bold text-[#FF6B00] mt-1">{cita.hora}</p>
                             </td>
                             <td className="px-6 py-5">
                               <p className="text-xs font-black text-slate-800 leading-none">{cita.cliente}</p>
                               <p className="text-[10px] text-slate-400 font-bold mt-1">{cita.phone}</p>
                             </td>
                             <td className="px-6 py-5 text-xs text-slate-600 font-semibold italic max-w-[200px]">{cita.servicio}</td>
                             <td className="px-6 py-5">
                               <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{cita.duracion || '—'}</span>
                             </td>
                             <td className="px-6 py-5 text-center">
                               <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{cita.estado}</span>
                             </td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                   )}
                 </div>
               ) : <MonthView />}
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
                             <span className="text-[9px] font-bold text-slate-400 italic">{pedido.timestamp}</span>
                           </div>
                           <h4 className="text-sm font-black text-slate-900 mb-1">{pedido.producto}</h4>
                           <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-500 mb-4">
                             <Users size={12} className="text-slate-300" />
                             <span>{pedido.cliente}</span>
                           </div>

                           {pedido.notas && (
                             <p className="text-[10px] text-slate-400 italic leading-relaxed mb-4 line-clamp-2">{pedido.notas}</p>
                           )}

                           <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                             <div className="flex -space-x-1">
                               {col !== 'Nuevo' && (
                                 <button onClick={() => updatePedidoEstado(pedido.id, 'Nuevo')} className="h-8 w-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-orange-50 hover:text-orange-500 transition-colors border border-white"><ChevronLeft size={14} /></button>
                               )}
                               {col !== 'Completado' && (
                                 <button onClick={() => updatePedidoEstado(pedido.id, col === 'Nuevo' ? 'En Proceso' : 'Completado')} className="h-8 w-16 rounded-full bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest flex items-center justify-center hover:bg-[#FF6B00] transition-all border border-white shadow-sm">
                                   Siguiente <ChevronRight size={12} className="ml-1" />
                                 </button>
                               )}
                             </div>
                             {col === 'Completado' && (
                               <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100"><CheckCircle2 size={14} /></div>
                             )}
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
                         ];
                         await Promise.all(saves.map(s => fetch(`${API_BASE_URL}/api/settings`, {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json' },
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

               {/* Sincronización Automática al Cambiar Pestaña Aprendizaje */}
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
                    <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
                      <div className="flex items-center space-x-4 mb-8">
                        <div className="h-12 w-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                          <MessageSquare size={24} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">Flujo de Conversación</h3>
                          <p className="text-[10px] text-slate-400 italic">Configura cómo inicia la charla el bot</p>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saludo Inicial</span>
                            <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                          </div>
                          <p className="text-xs text-slate-600 italic">"Hola, soy {agentConfig.nombre} de {agentConfig.empresa}. ¿En qué puedo ayudarte hoy?"</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                           <p className="text-[9px] text-blue-700 italic leading-relaxed text-center">
                             💡 Estos mensajes se generan dinámicamente usando el cerebro de la IA. No necesitas configurarlos manualmente.
                           </p>
                        </div>
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
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Panel de Insights */}
                        <div className="lg:col-span-1 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
                           <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic flex items-center space-x-3">
                              <LineChart size={18} className="text-emerald-500" />
                              <span>Insights de Mercado</span>
                           </h3>
                           <div className="space-y-4">
                              {aiInsights.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic text-center py-10">Analizando conversaciones...</p>
                              ) : aiInsights.map((ins, i) => (
                                <div key={i} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex justify-between items-center">
                                  <div>
                                    <p className="text-[11px] font-black text-slate-700">{ins.topic}</p>
                                    <p className="text-[9px] text-slate-400 uppercase tracking-widest">Menciones: {ins.count}</p>
                                  </div>
                                  <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${ins.trend === 'Subiendo' ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-500'}`}>{ins.trend}</span>
                                </div>
                              ))}
                           </div>
                           <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                              <p className="text-[9px] text-emerald-700 italic leading-relaxed">
                                💡 {aiInsights[0] ? `"${aiInsights[0].topic}" es el tema más consultado.` : "La IA está aprendiendo de tus clientes."}
                              </p>
                           </div>
                        </div>

                        {/* Mapa de Conocimiento */}
                        <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                           <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic flex items-center space-x-3">
                                 <Brain size={18} className="text-[#FF6B00]" />
                                 <span>Mapa de Conocimiento (Aprendido)</span>
                              </h3>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {aiKnowledge.length === 0 ? (
                                <div className="md:col-span-2 py-20 text-center border-2 border-dashed border-slate-50 rounded-[40px]">
                                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin conocimientos nuevos por ahora</p>
                                </div>
                              ) : aiKnowledge.map((k, i) => (
                                <div key={i} className={`p-6 rounded-[32px] border ${k.status === 'approved' ? 'bg-white border-slate-100' : 'bg-orange-50/30 border-orange-100'} space-y-3`}>
                                  <div className="flex justify-between">
                                    <span className="text-[10px] font-black text-[#FF6B00] uppercase tracking-widest italic">{k.topic || 'Nuevo Conocimiento'}</span>
                                    <span className={`text-[8px] font-black uppercase ${k.status === 'approved' ? 'text-emerald-500' : 'text-orange-500 animate-pulse'}`}>{k.status}</span>
                                  </div>
                                  <p className="text-[11px] font-black text-slate-800 italic">Capturado: {k.content?.slice(0, 50)}...</p>
                                  <div className="pt-2 flex space-x-2">
                                    {k.status === 'pending' && (
                                      <>
                                        <button onClick={() => approveKnowledge(k.id)} className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md">Validar</button>
                                        <button className="flex-1 py-2 bg-slate-200 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest">Ignorar</button>
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
                              <span>🧠 Prompt del {selectedAgent}</span>
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

          {/* VIEW: RAG */}
          {activeTab === 'rag' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic">Base de Conocimientos</h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 italic">
                    {ragSubTab === 'conocimiento'
                      ? `${documents.length} tarjeta${documents.length !== 1 ? 's' : ''} · el agente usa esto para responder`
                      : `${products.length} producto${products.length !== 1 ? 's' : ''} · catálogo activo en el agente`}
                  </p>
                </div>
                <div className="flex space-x-3">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.txt" />
                  {ragSubTab === 'conocimiento' ? (<>
                    <button onClick={() => fileInputRef.current.click()} className="bg-white text-slate-600 px-5 py-3 rounded-2xl text-[10px] font-black uppercase border border-slate-200 shadow-sm flex items-center space-x-2 hover:border-[#FF6B00]/40 transition-all">
                      <Link2 size={14} /><span>Subir PDF</span>
                    </button>
                    <button onClick={() => { setShowNewCard(true); setEditingCard(null); }} className="bg-slate-900 text-white px-7 py-3 rounded-2xl text-[10px] font-black uppercase shadow-xl flex items-center space-x-2 hover:bg-black transition-all">
                      <Plus size={14} /><span>Nueva Tarjeta</span>
                    </button>
                  </>) : (
                    <button onClick={() => { setShowNewProduct(true); setEditingProduct(null); }} className="bg-slate-900 text-white px-7 py-3 rounded-2xl text-[10px] font-black uppercase shadow-xl flex items-center space-x-2 hover:bg-black transition-all">
                      <Plus size={14} /><span>Agregar Producto</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex space-x-1 bg-slate-100 p-1 rounded-2xl w-fit">
                {[
                  ['conocimiento', 'Conocimiento', BookOpen], 
                  ['catalogo', 'Catálogo', Tag],
                  ['tester', 'Probador', Search]
                ].map(([id, label, Icon]) => (
                  <button key={id} onClick={() => setRagSubTab(id)} className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${ragSubTab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Icon size={13} /><span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Formulario nueva tarjeta */}
              {showNewCard && (
                <div className="bg-white border-2 border-slate-900 rounded-[32px] p-8 space-y-5 animate-in slide-in-from-top-4 duration-300 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-slate-900 p-2 rounded-xl"><BookOpen size={16} className="text-[#FF6B00]" /></div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Nueva Tarjeta de Conocimiento</h3>
                    </div>
                    <button onClick={() => { setShowNewCard(false); setNewCard({ name: '', category: 'General', content: '' }); }} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={20} /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Título</label>
                      <input type="text" placeholder="Ej: Lista de Precios 2024" value={newCard.name} onChange={e => setNewCard(p => ({...p, name: e.target.value}))}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none italic focus:ring-2 focus:ring-slate-900 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Categoría</label>
                      <select value={newCard.category} onChange={e => setNewCard(p => ({...p, category: e.target.value}))}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all">
                        {CARD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Contenido</label>
                    <textarea placeholder="Escribe aquí la información que el agente debe conocer para responder preguntas..." value={newCard.content} onChange={e => setNewCard(p => ({...p, content: e.target.value}))}
                      className="w-full h-40 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none italic resize-none focus:ring-2 focus:ring-slate-900 transition-all leading-relaxed" />
                  </div>
                  <div className="flex justify-end space-x-3 pt-2">
                    <button onClick={() => { setShowNewCard(false); setNewCard({ name: '', category: 'General', content: '' }); }} className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-slate-700 transition-colors">Cancelar</button>
                    <button onClick={handleSaveCard} disabled={!newCard.name.trim() || !newCard.content.trim()}
                      className="bg-[#FF6B00] text-white px-10 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-black transition-all flex items-center space-x-2 disabled:opacity-30 disabled:cursor-not-allowed">
                      <Save size={14} /><span>Guardar Tarjeta</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Formulario editar tarjeta (inline, full-width) */}
              {editingCard && (
                <div className="bg-white border-2 border-[#FF6B00] rounded-[32px] p-8 space-y-5 animate-in slide-in-from-top-4 duration-300 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-[#FF6B00] p-2 rounded-xl"><Pencil size={14} className="text-white" /></div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Editando Tarjeta</h3>
                    </div>
                    <button onClick={() => setEditingCard(null)} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={20} /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Título</label>
                      <input type="text" value={editingCard.name} onChange={e => setEditingCard(p => ({...p, name: e.target.value}))}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none italic focus:ring-2 focus:ring-[#FF6B00] transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Categoría</label>
                      <select value={editingCard.category} onChange={e => setEditingCard(p => ({...p, category: e.target.value}))}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6B00] transition-all">
                        {CARD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <textarea value={editingCard.content} onChange={e => setEditingCard(p => ({...p, content: e.target.value}))}
                    className="w-full h-48 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none italic resize-none focus:ring-2 focus:ring-[#FF6B00] transition-all leading-relaxed" />
                  <div className="flex justify-end space-x-3 pt-2">
                    <button onClick={() => setEditingCard(null)} className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-slate-700 transition-colors">Cancelar</button>
                    <button onClick={() => handleUpdateCard(editingCard.id)}
                      className="bg-[#FF6B00] text-white px-10 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-black transition-all flex items-center space-x-2">
                      <Save size={14} /><span>Guardar Cambios</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Grid de tarjetas */}
              {documents.length === 0 && !showNewCard ? (
                <div className="bg-white p-20 rounded-[40px] border-2 border-dashed border-slate-100 text-center">
                  <Database size={48} className="mx-auto text-slate-200 mb-5" />
                  <p className="text-slate-400 font-black italic text-sm">Sin tarjetas todavía</p>
                  <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mt-2">Creá una tarjeta o subí un PDF</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {documents.map(doc => {
                    const style = CATEGORY_STYLES[doc.category] || CATEGORY_STYLES['General'];
                    return (
                      <div key={doc.id} className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all flex flex-col justify-between group">
                        <div>
                          {/* Header tarjeta */}
                          <div className="flex items-center justify-between mb-4">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${style.badge} flex items-center space-x-1.5`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                              <span>{doc.category}</span>
                            </span>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                              <button onClick={() => { setEditingCard({...doc}); setShowNewCard(false); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                                className="p-1.5 bg-slate-50 hover:bg-[#FF6B00] hover:text-white rounded-lg text-slate-400 transition-all">
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => handleDeleteDocument(doc.id)}
                                className="p-1.5 bg-slate-50 hover:bg-red-500 hover:text-white rounded-lg text-slate-400 transition-all">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          {/* Título */}
                          <h4 className="text-sm font-black text-slate-800 italic mb-3 leading-tight group-hover:text-[#FF6B00] transition-colors line-clamp-2">{doc.name}</h4>
                          {/* Preview contenido */}
                          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">{doc.content}</p>
                        </div>
                        {/* Footer */}
                        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-50">
                          <div className="flex items-center space-x-1.5">
                            <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Activo en IA</span>
                          </div>
                          <span className="text-[9px] text-slate-300 font-bold">{doc.timestamp}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── PROBADOR DE BÚSQUEDA ── */}
              {ragSubTab === 'tester' && (
                <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
                  <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                    <div className="max-w-2xl mx-auto text-center space-y-4">
                      <h3 className="text-xl font-black text-slate-800 italic uppercase">Probador de Inteligencia</h3>
                      <p className="text-[11px] text-slate-400 font-medium leading-relaxed px-10">
                        Escribe una pregunta como la haría un cliente. El sistema buscará en tus tarjetas y catálogo para mostrarte qué información encontrará la IA.
                      </p>
                      
                      <div className="relative mt-8">
                        <input 
                          type="text" 
                          value={testQuery}
                          onChange={e => setTestQuery(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && runTestSearch()}
                          placeholder="¿Qué precios tienen los motores?"
                          className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[30px] text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6B00] pr-32 transition-all italic shadow-inner"
                        />
                        <button 
                          onClick={runTestSearch}
                          disabled={isSearching}
                          className="absolute right-3 top-3 bottom-3 bg-[#FF6B00] text-white px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all disabled:opacity-50"
                        >
                          {isSearching ? 'Buscando...' : 'Probar'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center space-x-3 border-b border-slate-50 pb-4">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultados Encontrados</span>
                         <span className="h-px flex-1 bg-slate-50" />
                      </div>

                      {testResults.length === 0 ? (
                        <div className="py-20 text-center border-2 border-dashed border-slate-50 rounded-[40px]">
                           <Search size={40} className="mx-auto text-slate-100 mb-4" />
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No hay resultados para mostrar</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {testResults.map((res, i) => (
                            <div key={i} className="bg-slate-50 border border-slate-100 rounded-[32px] p-6 space-y-3 hover:border-[#FF6B00]/30 transition-all group">
                               <div className="flex justify-between items-center">
                                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${res.tipo === 'Tarjeta' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {res.tipo}
                                  </span>
                                  <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full group-hover:animate-ping" />
                               </div>
                               <h4 className="text-xs font-black text-slate-800 uppercase italic">{res.titulo}</h4>
                               <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-4 italic">{res.contenido}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── CATÁLOGO DE PRODUCTOS ── */}
              {ragSubTab === 'catalogo' && (<>
                {/* Formulario nuevo producto */}
                {showNewProduct && (
                  <div className="bg-white border-2 border-slate-900 rounded-[32px] p-8 space-y-5 animate-in slide-in-from-top-4 duration-300 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-slate-900 p-2 rounded-xl"><Tag size={14} className="text-[#FF6B00]" /></div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Nuevo Producto</h3>
                      </div>
                      <button onClick={() => { setShowNewProduct(false); setNewProduct(emptyProduct); }} className="text-slate-300 hover:text-slate-600"><X size={20} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Nombre del Producto</label>
                        <input type="text" placeholder="Ej: Motor Liftmaster 1/2 HP" value={newProduct.nombre} onChange={e => setNewProduct(p => ({...p, nombre: e.target.value}))}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none italic focus:ring-2 focus:ring-slate-900 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Precio</label>
                        <input type="text" placeholder="Ej: Q1,200.00" value={newProduct.precio} onChange={e => setNewProduct(p => ({...p, precio: e.target.value}))}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none italic focus:ring-2 focus:ring-slate-900 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Descripción</label>
                      <textarea placeholder="Características, compatibilidad, incluye instalación, garantía..." value={newProduct.descripcion} onChange={e => setNewProduct(p => ({...p, descripcion: e.target.value}))}
                        className="w-full h-28 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none italic resize-none focus:ring-2 focus:ring-slate-900 transition-all leading-relaxed" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Categoría</label>
                        <select value={newProduct.categoria} onChange={e => setNewProduct(p => ({...p, categoria: e.target.value}))}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all">
                          {PRODUCT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Stock</label>
                        <select value={newProduct.stock} onChange={e => setNewProduct(p => ({...p, stock: e.target.value}))}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all">
                          {STOCK_OPTIONS.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Imagen del Producto</label>
                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center space-x-3">
                          <input type="text" placeholder="https://... (o sube una)" value={newProduct.imagen} onChange={e => setNewProduct(p => ({...p, imagen: e.target.value}))}
                            className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none italic focus:ring-2 focus:ring-slate-900 transition-all" />
                          {newProduct.imagen && <img src={newProduct.imagen} alt="preview" className="h-12 w-12 rounded-xl object-cover border border-slate-200" onError={e => e.target.style.display='none'} />}
                        </div>
                        <div className="flex items-center space-x-3">
                          <label className="flex-1 cursor-pointer bg-slate-100 hover:bg-slate-200 py-3 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center space-x-2 transition-all">
                            <Plus size={14} className="text-slate-500" />
                            <span className="text-[10px] font-black uppercase text-slate-500">Subir desde PC/Celular</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleProductImageUpload(e, 'new')} />
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-2">
                      <button onClick={() => { setShowNewProduct(false); setNewProduct(emptyProduct); }} className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-slate-700 transition-colors">Cancelar</button>
                      <button onClick={handleSaveProduct} disabled={!newProduct.nombre.trim()}
                        className="bg-[#FF6B00] text-white px-10 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-black transition-all flex items-center space-x-2 disabled:opacity-30">
                        <Save size={14} /><span>Guardar Producto</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Formulario editar producto */}
                {editingProduct && (
                  <div className="bg-white border-2 border-[#FF6B00] rounded-[32px] p-8 space-y-5 animate-in slide-in-from-top-4 duration-300 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-[#FF6B00] p-2 rounded-xl"><Pencil size={14} className="text-white" /></div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Editando Producto</h3>
                      </div>
                      <button onClick={() => setEditingProduct(null)} className="text-slate-300 hover:text-slate-600"><X size={20} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Nombre</label>
                        <input type="text" value={editingProduct.nombre} onChange={e => setEditingProduct(p => ({...p, nombre: e.target.value}))}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none italic focus:ring-2 focus:ring-[#FF6B00] transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Precio</label>
                        <input type="text" value={editingProduct.precio} onChange={e => setEditingProduct(p => ({...p, precio: e.target.value}))}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none italic focus:ring-2 focus:ring-[#FF6B00] transition-all" />
                      </div>
                    </div>
                    <textarea value={editingProduct.descripcion} onChange={e => setEditingProduct(p => ({...p, descripcion: e.target.value}))}
                      className="w-full h-28 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none italic resize-none focus:ring-2 focus:ring-[#FF6B00] transition-all leading-relaxed" />
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Imagen del Producto</label>
                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center space-x-3">
                          <input type="text" placeholder="https://..." value={editingProduct.imagen || ''} onChange={e => setEditingProduct(p => ({...p, imagen: e.target.value}))}
                            className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none italic focus:ring-2 focus:ring-[#FF6B00] transition-all" />
                          {editingProduct.imagen && <img src={editingProduct.imagen} alt="preview" className="h-12 w-12 rounded-xl object-cover border border-slate-200" onError={e => e.target.style.display='none'} />}
                        </div>
                        <div className="flex items-center space-x-3">
                          <label className="flex-1 cursor-pointer bg-slate-100 hover:bg-slate-200 py-3 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center space-x-2 transition-all">
                            <Plus size={14} className="text-slate-500" />
                            <span className="text-[10px] font-black uppercase text-slate-500">Cambiar Imagen</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleProductImageUpload(e, 'edit')} />
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <select value={editingProduct.categoria} onChange={e => setEditingProduct(p => ({...p, categoria: e.target.value}))}
                        className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6B00]">
                        {PRODUCT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <select value={editingProduct.stock} onChange={e => setEditingProduct(p => ({...p, stock: e.target.value}))}
                        className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6B00]">
                        {STOCK_OPTIONS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex justify-end space-x-3 pt-2">
                      <button onClick={() => setEditingProduct(null)} className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-slate-700 transition-colors">Cancelar</button>
                      <button onClick={() => handleUpdateProduct(editingProduct.id)}
                        className="bg-[#FF6B00] text-white px-10 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-black transition-all flex items-center space-x-2">
                        <Save size={14} /><span>Guardar Cambios</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Grid productos */}
                {products.length === 0 && !showNewProduct ? (
                  <div className="bg-white p-20 rounded-[40px] border-2 border-dashed border-slate-100 text-center">
                    <Tag size={48} className="mx-auto text-slate-200 mb-5" />
                    <p className="text-slate-400 font-black italic text-sm">Sin productos todavía</p>
                    <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mt-2">Agregá tu primer producto al catálogo</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {products.map(prod => {
                      const stockStyle = STOCK_STYLES[prod.stock] || STOCK_STYLES['En stock'];
                      return (
                        <div key={prod.id} className="bg-white rounded-[28px] border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all flex flex-col justify-between group overflow-hidden">
                          {prod.imagen && <img src={prod.imagen} alt={prod.nombre} className="w-full h-40 object-cover" onError={e => e.target.style.display='none'} />}
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${stockStyle}`}>{prod.stock}</span>
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => { setEditingProduct({...prod}); setShowNewProduct(false); window.scrollTo({top:0,behavior:'smooth'}); }}
                                  className="p-1.5 bg-slate-50 hover:bg-[#FF6B00] hover:text-white rounded-lg text-slate-400 transition-all"><Pencil size={12} /></button>
                                <button onClick={() => handleDeleteProduct(prod.id)}
                                  className="p-1.5 bg-slate-50 hover:bg-red-500 hover:text-white rounded-lg text-slate-400 transition-all"><Trash2 size={12} /></button>
                              </div>
                            </div>
                            <h4 className="text-sm font-black text-slate-800 italic mb-1 leading-tight group-hover:text-[#FF6B00] transition-colors line-clamp-2">{prod.nombre}</h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{prod.categoria}</p>
                            {prod.descripcion && <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">{prod.descripcion}</p>}
                          </div>
                          <div className="flex items-center justify-between px-6 pb-6 pt-4 border-t border-slate-50">
                            {prod.precio ? (
                              <span className="text-base font-black text-emerald-600 italic">{prod.precio}</span>
                            ) : (
                              <span className="text-[10px] text-slate-300 italic">Sin precio</span>
                            )}
                            <div className="flex items-center space-x-1.5">
                              <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">En IA</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>)}

            </div>
          )}

        </div>

        {/* MODAL EDITAR LEAD */}
        {editingLead && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] border-2 border-[#FF6B00] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-4">
                  <div className="bg-[#FF6B00] p-3 rounded-2xl shadow-lg shadow-orange-100">
                    <UserCircle className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 italic uppercase leading-none">Editar Lead</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Actualización manual de datos</p>
                  </div>
                </div>
                <button onClick={() => setEditingLead(null)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[60vh] no-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Nombre Completo</label>
                  <input type="text" value={editingLead.nombre} onChange={e => setEditingLead({...editingLead, nombre: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6B00] transition-all italic" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Email</label>
                  <input type="text" value={editingLead.email} onChange={e => setEditingLead({...editingLead, email: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6B00] transition-all italic" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Dirección de Entrega</label>
                  <input type="text" value={editingLead.direccion || ''} onChange={e => setEditingLead({...editingLead, direccion: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6B00] transition-all italic" placeholder="Ej: 4ta Ave 10-20 Zona 10..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">NIT (Facturación)</label>
                  <input type="text" value={editingLead.nit || ''} onChange={e => setEditingLead({...editingLead, nit: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6B00] transition-all italic" placeholder="Ej: 1234567-8" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Etiquetas (separadas por coma)</label>
                  <input type="text" value={editingLead.etiquetas || ''} onChange={e => setEditingLead({...editingLead, etiquetas: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6B00] transition-all italic" placeholder="Ej: VIP, Cliente Fiel, Motor..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">ID WhatsApp / Usuario</label>
                  <input type="text" value={editingLead.whatsapp_id || ''} onChange={e => setEditingLead({...editingLead, whatsapp_id: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6B00] transition-all italic" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Estado</label>
                  <select value={editingLead.estado || 'Nuevo'} onChange={e => setEditingLead({...editingLead, estado: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6B00]">
                    {['Nuevo', 'Calificado', 'Venta', 'Soporte', 'Rechazado'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Puntuación (%)</label>
                  <input type="number" value={editingLead.score || 0} onChange={e => setEditingLead({...editingLead, score: parseInt(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF6B00] transition-all italic" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Notas del Cliente</label>
                  <textarea value={editingLead.notas || ''} onChange={e => setEditingLead({...editingLead, notas: e.target.value})} className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#FF6B00] transition-all italic resize-none" placeholder="Cualquier observación importante..." />
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end space-x-4">
                <button onClick={() => setEditingLead(null)} className="px-8 py-3 text-[11px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
                <button onClick={handleUpdateLead} className="bg-slate-900 text-white px-10 py-3 rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-black transition-all flex items-center space-x-2">
                  <Save size={16} />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
