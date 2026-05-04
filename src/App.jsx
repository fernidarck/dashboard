import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LayoutDashboard, Users, Calendar, Database, Zap, 
  BarChart3, Send, Bot, ShieldCheck, HelpCircle, 
  Search, Plus, MoreVertical, CheckCircle2, Clock, 
  AlertTriangle, Power, Save, RefreshCw, Filter, 
  MessageSquare, FileText, Smartphone, Target,
  Brain, Link2, Bell, Settings, ChevronRight,
  TrendingUp, Globe, Mail, Phone, Lock, Trash2,
  PieChart, ArrowUpRight, Sparkles, Paperclip, SendHorizontal, X,
  BadgeCheck, Handshake, Trophy, ThumbsDown, Briefcase, UserCircle,
  ChevronLeft, ChevronRight as ChevronRightIcon
} from 'lucide-react';

/**
 * CONFIGURACIÓN GLOBAL SAAS
 * Vinculado a la Guía de Arquitectura v4.0
 */
const N8N_WEBHOOK_URL = ""; 
const CURRENT_USER_ID = "user_777_guatemala"; 
const API_BASE_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subTabIA, setSubTabIA] = useState('General');
  const [agendaView, setAgendaView] = useState('Lista');
  const [botEnabled, setBotEnabled] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const fileInputRef = useRef(null);

  // --- PERFIL DE USUARIO ---
  const [userProfile] = useState({
    name: "Luis Méndez",
    accountType: "Agencia Elite",
    company: "OneControl Guatemala",
    avatar: "LM"
  });

  // --- DATOS DE LEADS / CONTACTOS ---
  const [leads, setLeads] = useState([]);

  // --- DATOS DE AGENDA ---
  const [agenda, setAgenda] = useState([]);

  // --- DATOS DE MENSAJES ---
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    if (activeTab === 'conversaciones' && selectedChatId) {
      fetch(`${API_BASE_URL}/api/messages/${selectedChatId}`)
        .then(res => res.json())
        .then(data => setMessages(data))
        .catch(console.error);
        
      const interval = setInterval(() => {
        fetch(`${API_BASE_URL}/api/messages/${selectedChatId}`)
          .then(res => res.json())
          .then(data => setMessages(data))
          .catch(console.error);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, selectedChatId]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/leads`)
      .then(res => res.json())
      .then(data => setLeads(data))
      .catch(console.error);
      
    fetch(`${API_BASE_URL}/api/agenda`)
      .then(res => res.json())
      .then(data => setAgenda(data))
      .catch(console.error);
      
    // Polling for real-time updates
    const interval = setInterval(() => {
      fetch(`${API_BASE_URL}/api/leads`)
        .then(res => res.json())
        .then(data => setLeads(data))
        .catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- CONFIGURACIÓN DEL AGENTE IA ---
  const [agentConfig, setAgentConfig] = useState({
    nombre: "Eryum",
    rol: "asistente de ventas de OneControl",
    personalidad: "profesional, amable y entusiasta",
    idioma: "Español",
    tono: "Casual y amigable",
    empresa: "OneControl",
    descripcion: "OneControl es una plataforma de automatización con IA que conecta tu negocio con WhatsApp Business API y Meta Ads.",
    productos: "- Chatbot de IA integrado con WhatsApp\n- Calificación automática de leads"
  });

  // --- LOGICA DE COMUNICACIÓN CON N8N ---
  const handleAction = async (action, data = {}) => {
    setLoading(true);
    console.log(`[n8n] Ejecutando: ${action}`, { userId: CURRENT_USER_ID, ...data });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setLoading(false);
      setNotification(`Sincronizado: ${action}`);
      setTimeout(() => setNotification(null), 3000);
    } catch (e) {
      setLoading(false);
      setNotification("Error de conexión");
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChatId) return;
    
    const textToSend = messageText.trim();
    setMessageText(""); // Optimistic clear

    // Optimistic UI update
    const optimisticMessage = {
      id: Date.now(),
      lead_id: selectedChatId,
      sender: 'agent',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selectedChatId, text: textToSend })
      });
      if (!res.ok) throw new Error("Error enviando mensaje");
    } catch (error) {
      console.error(error);
      setNotification("Error enviando mensaje");
    }
  };

  const selectedLead = leads.find(l => l.id === selectedChatId) || leads[0] || {
    id: 0, nombre: 'Cargando...', score: 0, botActive: false, captura: {}
  };

  // --- COMPONENTES DE UI ---
  const SidebarItem = ({ icon: Icon, label, id }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all group ${
        activeTab === id 
        ? 'bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100/50' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
      }`}
    >
      <Icon size={18} className={`${activeTab === id ? 'text-emerald-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
      <span className="text-sm font-bold tracking-tight">{label}</span>
      {activeTab === id && <div className="ml-auto w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
    </button>
  );

  const MonthView = () => {
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const days = [];
    for (let i = 0; i < 5; i++) days.push(null); 
    for (let i = 1; i <= 31; i++) days.push(i);
    return (
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
        <div className="grid grid-cols-7 border-b border-slate-50 bg-slate-50/30">
          {daysOfWeek.map(day => (
            <div key={day} className="py-4 text-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-slate-50">
          {days.map((day, index) => {
            const hasCita = agenda.filter(a => a.day === day);
            const isToday = day === 3;
            return (
              <div key={index} className={`min-h-[140px] bg-white p-4 transition-all hover:bg-slate-50/80 group ${!day ? 'bg-slate-50/20' : ''}`}>
                {day && (
                  <>
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-xs font-black h-7 w-7 flex items-center justify-center rounded-xl transition-all ${isToday ? 'bg-[#FF6B00] text-white shadow-lg' : 'text-slate-400'}`}>
                        {day}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {hasCita.map(cita => (
                        <div key={cita.id} className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col space-y-0.5 cursor-pointer hover:bg-emerald-100 transition-all shadow-sm">
                          <p className="text-[9px] font-black text-emerald-700 truncate leading-none uppercase">{cita.cliente}</p>
                          <p className="text-[8px] font-bold text-emerald-500 italic">{cita.hora}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto no-scrollbar">
        <div className="p-8">
          <div className="flex items-center space-x-3 mb-10">
            <div className="bg-[#FF6B00] p-2.5 rounded-2xl shadow-xl shadow-orange-100 ring-4 ring-orange-50">
              <Zap className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black leading-none tracking-tighter uppercase italic text-slate-800">OneControl</h1>
              <span className="text-[9px] text-[#FF6B00] font-black uppercase tracking-[0.3em]">SaaS Elite v4.0</span>
            </div>
          </div>

          <nav className="space-y-6">
            <div>
              <p className="px-4 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Negocio</p>
              <SidebarItem icon={LayoutDashboard} label="Dashboard" id="dashboard" />
              <SidebarItem icon={MessageSquare} label="Conversaciones" id="conversaciones" />
              <SidebarItem icon={Users} label="CRM & Leads" id="crm" />
              <SidebarItem icon={Calendar} label="Agenda IA" id="agenda" />
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
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 sticky top-0 z-20">
          <div className="flex items-center space-x-6">
             <div className="bg-slate-100 p-2.5 rounded-xl text-slate-400"><Search size={18} /></div>
             <div className="flex items-center space-x-2">
                <Globe size={14} className="text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none italic">Guatemala</span>
             </div>
          </div>
          
          <div className="flex items-center space-x-6">
             {loading && <RefreshCw size={14} className="animate-spin text-emerald-500" />}
             {notification && <div className="bg-emerald-500 text-white text-[10px] font-black px-4 py-1.5 rounded-lg uppercase shadow-lg animate-bounce">{notification}</div>}
             <div className="h-10 w-10 rounded-2xl bg-slate-900 flex items-center justify-center font-black text-[#FF6B00] border-2 border-white shadow-xl italic">OC</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 no-scrollbar">
          
          {/* VIEW: DASHBOARD (RESUMEN) */}
          {activeTab === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic">Resumen Elite</h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Gestión de impacto y conversiones</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { l: 'Tus Leads', v: leads.length, i: Target, c: 'text-blue-600', bg: 'bg-blue-50' },
                  { l: 'Citas Hoy', v: agenda.length, i: Calendar, c: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { l: 'Score Promedio', v: '78%', i: TrendingUp, c: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { l: 'Ahorro ROI', v: 'Q24.5k', i: Zap, c: 'text-[#FF6B00]', bg: 'bg-orange-50' },
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-900 p-10 rounded-[40px] text-white flex flex-col justify-between shadow-2xl relative overflow-hidden">
                   <div className="relative z-10">
                      <p className="text-[10px] font-black text-[#FF6B00] uppercase tracking-[0.3em] mb-4">Performance IA</p>
                      <h4 className="text-2xl font-black italic mb-2 tracking-tight">Tu Agente IA ha ahorrado <span className="text-emerald-400">42 horas</span> de atención este mes.</h4>
                   </div>
                   <ArrowUpRight className="absolute -right-8 -top-8 text-white/5 w-64 h-64" />
                </div>
                <div className="bg-white p-10 rounded-[40px] border border-slate-200 flex flex-col justify-between shadow-sm">
                   <div className="flex justify-between items-start mb-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Distribución de Leads</p>
                      <PieChart size={20} className="text-slate-300" />
                   </div>
                   <div className="space-y-4">
                      {['Facebook Ads', 'WhatsApp Directo', 'Orgánico'].map((origin, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                           <span className="text-xs font-bold text-slate-500">{origin}</span>
                           <div className="flex-1 mx-4 h-1.5 bg-slate-50 rounded-full overflow-hidden">
                              <div className={`h-full bg-[#FF6B00] rounded-full`} style={{width: `${70 - idx*20}%`}}></div>
                           </div>
                           <span className="text-[10px] font-black text-slate-800">{30 - idx*8}%</span>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          )}

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
                        <button key={lead.id} onClick={() => setSelectedChatId(lead.id)} className={`w-full p-6 text-left hover:bg-slate-50 transition-all relative ${selectedChatId === lead.id ? 'bg-emerald-50/20' : ''}`}>
                           <div className="flex items-center space-x-3 mb-2">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-[10px] shadow-sm ${lead.botActive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                 {lead.botActive ? <Bot size={14} /> : lead.nombre[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-xs font-black text-slate-800 truncate">{lead.nombre}</p>
                                 <p className={`text-[9px] font-black uppercase tracking-tighter ${lead.botActive ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {lead.botActive ? `Score: ${lead.score}%` : 'Control Manual'}
                                 </p>
                              </div>
                           </div>
                           <p className="text-[11px] text-slate-500 truncate mt-1 font-medium italic leading-none">
                              {lead.lastMessage ? `"${lead.lastMessage}"` : "Sin mensajes recientes"}
                           </p>
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
                           <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedLead.botActive ? 'text-emerald-500' : 'text-red-500'}`}>
                             {selectedLead.botActive ? 'IA Gestionando' : 'Modo Manual'}
                           </p>
                        </div>
                     </div>
                     <button onClick={() => handleAction('toggle_bot_chat', { leadId: selectedLead.id })} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedLead.botActive ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'}`}>
                        {selectedLead.botActive ? 'Desactivar Bot' : 'Activar Bot'}
                     </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-10 space-y-6 no-scrollbar bg-slate-50/20">
                     {messages.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                           <p className="text-slate-400 text-xs italic font-bold">No hay mensajes grabados en esta conversación.</p>
                        </div>
                     ) : messages.map((msg) => (
                       <div key={msg.id} className={`flex ${msg.sender === 'client' ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[70%] p-5 rounded-[28px] text-sm font-medium italic leading-relaxed shadow-sm ${msg.sender === 'client' ? 'bg-white border border-slate-200 rounded-tl-none' : 'bg-slate-800 text-white rounded-tr-none border-r-4 border-[#FF6B00]'}`}>
                             {msg.text}
                          </div>
                       </div>
                     ))}
                  </div>
                  <div className="p-8 bg-white border-t border-slate-100">
                     <div className="max-w-4xl mx-auto flex space-x-4">
                        <div className="flex-1 relative flex items-center">
                           <Paperclip size={18} className="absolute left-4 text-slate-400 cursor-pointer" />
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
            </div>
          )}

          {/* VIEW: CRM & LEADS */}
          {activeTab === 'crm' && (
             <div className="max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-start">
                   <div>
                     <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic leading-none">Gestión de Leads</h2>
                     <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 italic">Calificación y seguimiento automático</p>
                   </div>
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input type="text" placeholder="Buscar cliente..." className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none w-64 shadow-sm italic" />
                   </div>
                </div>

                <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                         <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            <th className="px-10 py-6">CLIENTE</th>
                            <th className="px-6 py-6 text-center">SCORE IA</th>
                            <th className="px-6 py-6 text-center">ESTADO</th>
                            <th className="px-10 py-6 text-right">ACCIONES</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {leads.map(lead => (
                           <tr key={lead.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-10 py-6">
                                 <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center font-black text-[#FF6B00] text-xs">
                                       {lead.nombre[0]}
                                    </div>
                                    <div>
                                       <p className="text-sm font-black text-slate-800 leading-none group-hover:text-[#FF6B00] transition-colors">{lead.nombre}</p>
                                       <p className="text-[10px] font-bold text-slate-400 mt-1">{lead.phone}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-6 text-center">
                                 <span className={`text-xs font-black ${lead.score > 80 ? 'text-emerald-500' : 'text-orange-500'}`}>{lead.score}%</span>
                              </td>
                              <td className="px-6 py-6 text-center">
                                 <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest">{lead.estado}</span>
                              </td>
                              <td className="px-10 py-6 text-right">
                                 <div className="flex items-center justify-end space-x-2 text-slate-300">
                                    <button className="p-2 hover:text-emerald-500 transition-colors"><CheckCircle2 size={16} /></button>
                                    <button className="p-2 hover:text-[#FF6B00] transition-colors"><MoreVertical size={16} /></button>
                                 </div>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          )}

          {/* VIEW: AGENDA */}
          {activeTab === 'agenda' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
               <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic leading-none">Agenda OneControl</h2>
                    <p className="text-sm font-medium text-slate-400 mt-2 italic italic">Citas capturadas automáticamente por la IA</p>
                  </div>
                  <div className="flex space-x-3">
                     {['Lista', 'Mes'].map(tab => (
                        <button key={tab} onClick={() => setAgendaView(tab)} className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border-2 transition-all ${agendaView === tab ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}>{tab}</button>
                     ))}
                  </div>
               </div>
               
               {agendaView === 'Lista' ? (
                 <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <tr><th className="px-8 py-5">FECHA/HORA</th><th className="px-6 py-5">CLIENTE</th><th className="px-6 py-5">SERVICIO</th><th className="px-6 py-5 text-center">ESTADO</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {agenda.map( cita => (
                          <tr key={cita.id} className="hover:bg-slate-50 transition-colors">
                             <td className="px-8 py-5"><p className="text-xs font-bold text-slate-800">{cita.fecha}</p><p className="text-[10px] font-medium text-slate-400 italic mt-1 leading-none">{cita.hora}</p></td>
                             <td className="px-6 py-5"><p className="text-xs font-black text-slate-800 leading-none">{cita.cliente}</p><p className="text-[10px] text-slate-400 font-bold mt-1 tracking-tighter leading-none">{cita.phone}</p></td>
                             <td className="px-6 py-5 text-xs text-slate-500 italic max-w-[200px] truncate leading-relaxed">{cita.servicio}</td>
                             <td className="px-4 py-5 text-center"><span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{cita.estado}</span></td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                 </div>
               ) : <MonthView />}
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
                     onClick={() => handleAction('save_config', agentConfig)}
                     className="bg-emerald-500 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase shadow-xl shadow-emerald-200 flex items-center space-x-2 transition-all active:scale-95"
                  >
                     <Save size={16} />
                     <span>Sincronizar Cerebro</span>
                  </button>
               </div>

               <div className="flex space-x-8 border-b border-slate-200">
                  {['General', 'Mensajes', 'Captura de Datos', 'Configuración IA'].map(t => (
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
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                       <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic flex items-center space-x-3">
                          <UserCircle size={18} className="text-[#FF6B00]" />
                          <span>Identidad del Agente</span>
                       </h3>
                       <div className="space-y-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase ml-2 leading-none">Nombre del Agente</label>
                             <input type="text" value={agentConfig.nombre} onChange={(e) => setAgentConfig({...agentConfig, nombre: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none italic" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase ml-2 leading-none">Rol y Tono</label>
                             <input type="text" value={agentConfig.rol} onChange={(e) => setAgentConfig({...agentConfig, rol: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none italic" />
                          </div>
                       </div>
                    </div>
                    <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                       <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic flex items-center space-x-3">
                          <Briefcase size={18} className="text-[#FF6B00]" />
                          <span>Información del Negocio</span>
                       </h3>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2 leading-none">Descripción para el Bot</label>
                          <textarea value={agentConfig.descripcion} onChange={(e) => setAgentConfig({...agentConfig, descripcion: e.target.value})} className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium outline-none italic resize-none" />
                       </div>
                    </div>
                 </div>
               )}
            </div>
          )}

          {/* VIEW: RAG */}
          {activeTab === 'rag' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
               <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic">Base de Conocimientos (RAG)</h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 italic">Entrenamiento de la IA con manuales y PDF</p>
                  </div>
                  <button className="bg-emerald-500 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase shadow-xl flex items-center space-x-2">
                     <Link2 size={16} />
                     <span>Subir Documento</span>
                  </button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { t: 'Precios Motores 2026', c: 'Ventas', s: 'Sincronizado' },
                    { t: 'Manual Instalación FAAC', c: 'Técnico', s: 'Sincronizado' },
                    { t: 'Políticas de Garantía', c: 'Legal', s: 'Sincronizado' },
                  ].map((doc, i) => (
                    <div key={i} className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm hover:border-[#FF6B00]/30 transition-all flex flex-col justify-between group">
                       <div>
                          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-4 block">{doc.c}</span>
                          <h4 className="text-lg font-black text-slate-800 mb-2 italic group-hover:text-[#FF6B00] transition-colors">{doc.t}</h4>
                       </div>
                       <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-50">
                          <div className="flex items-center space-x-2 text-emerald-500">
                             <CheckCircle2 size={14} />
                             <span className="text-[10px] font-black uppercase tracking-widest">{doc.s}</span>
                          </div>
                          <button className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;
