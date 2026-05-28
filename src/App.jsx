import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, MessageSquare, Users, Calendar, ShoppingBag,
  Brain, Database, Zap, Search, Bell, X, MoreVertical,
  Power, ShieldCheck, LogOut, RefreshCw, Globe, KeyRound
} from 'lucide-react';
import Login from './components/Login.jsx';
import LogoMark from './components/LogoMark.jsx';
import { useAppData } from './hooks/useAppData.js';
import ViewDashboard from './components/views/ViewDashboard.jsx';
import ViewConversaciones from './components/views/ViewConversaciones.jsx';
import ViewCRM from './components/views/ViewCRM.jsx';
import ViewAgenda from './components/views/ViewAgenda.jsx';
import ViewPedidos from './components/views/ViewPedidos.jsx';
import ViewCerebro from './components/views/ViewCerebro.jsx';
import ViewRAG from './components/views/ViewRAG.jsx';

const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3002' : '';
const CURRENT_USER_ID = 'fer';

export default function App() {
  const savedToken = localStorage.getItem('dashboard_token');
  const [authToken, setAuthToken] = useState(savedToken || null);

  const {
    leads, messages, agenda, pedidos, documents, products,
    stats, captureStats, aiInsights, aiKnowledge, handoffTriggers, setHandoffTriggers,
    agentConfig, setAgentConfig, prompts, setPrompts,
    mensajesBot, setMensajesBot, captureFields, setCaptureFields,
    loading, notification, setNotification,
    fetchLeads, fetchMessages, fetchSettings, fetchRAG, fetchAgenda,
    fetchPedidos, fetchHandoff, fetchLearning, fetchStats, fetchCaptureStats,
    saveSetting, toggleBot, deleteMessages, archiveLead, updateLead,
    sendMessage, updatePedidoEstado, savePedido, deletePedido,
    createCita, deleteCita, saveHandoffTriggers,
    saveCard, updateCard, deleteCard,
    saveProduct, updateProduct, deleteProduct,
    approveKnowledge, ignoreKnowledge,
    uploadProductImage, uploadDocument, runTestSearch, syncBrainConfig,
    playMessageAlert,
  } = useAppData(API_BASE_URL, authToken);

  const [activeTab,      setActiveTab]      = useState('dashboard');
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [selectedLead,   setSelectedLead]   = useState({});
  const [botEnabled,     setBotEnabled]     = useState(true);
  const [showChangePwd,  setShowChangePwd]  = useState(false);
  const [newPwd,         setNewPwd]         = useState('');
  const [confirmPwd,     setConfirmPwd]     = useState('');
  const [changePwdError, setChangePwdError] = useState('');
  const [changePwdOk,    setChangePwdOk]    = useState(false);
  const [changePwdBusy,  setChangePwdBusy]  = useState(false);

  const messagesEndRef       = useRef(null);
  const messagesContainerRef = useRef(null);
  const prevChatIdRef        = useRef(null);

  // Initial data load
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 5-second polling
  useEffect(() => {
    const id = setInterval(() => {
      fetchLeads();
      fetchStats();
      fetchPedidos();
      if (activeTab === 'conversaciones') fetchMessages(selectedChatId);
    }, 5000);
    return () => clearInterval(id);
  }, [activeTab, selectedChatId, fetchLeads, fetchStats, fetchPedidos, fetchMessages]);

  // Auto-select first lead
  useEffect(() => {
    if (leads.length > 0 && !selectedChatId) setSelectedChatId(leads[0].id);
  }, [leads, selectedChatId]);

  // Sync selectedLead and fetch messages when selection changes
  useEffect(() => {
    if (!selectedChatId) return;
    fetchMessages(selectedChatId);
    const lead = leads.find(l => l.id === selectedChatId);
    if (lead) setSelectedLead(lead);
  }, [selectedChatId, leads]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll behavior on new messages
  useEffect(() => {
    if (!messages.length) return;
    const isNewChat = prevChatIdRef.current !== selectedChatId;
    prevChatIdRef.current = selectedChatId;
    if (isNewChat) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const c = messagesContainerRef.current;
          if (c) { c.style.scrollBehavior = 'auto'; c.scrollTop = c.scrollHeight; }
        });
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleBot = (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) toggleBot(leadId, !lead.botActive);
  };

  const handleChangeToken = async (e) => {
    e.preventDefault();
    setChangePwdError('');
    if (newPwd.length < 8) { setChangePwdError('Mínimo 8 caracteres'); return; }
    if (newPwd !== confirmPwd) { setChangePwdError('Las contraseñas no coinciden'); return; }
    setChangePwdBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/change-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ newToken: newPwd }),
      });
      if (!res.ok) { const d = await res.json(); setChangePwdError(d.error || 'Error'); return; }
      localStorage.setItem('dashboard_token', newPwd);
      setAuthToken(newPwd);
      setChangePwdOk(true);
      setTimeout(() => { setShowChangePwd(false); setChangePwdOk(false); setNewPwd(''); setConfirmPwd(''); }, 1500);
    } catch { setChangePwdError('Error de conexión'); }
    finally { setChangePwdBusy(false); }
  };

  if (!authToken) return <Login onLogin={(token) => { localStorage.setItem('dashboard_token', token); setAuthToken(token); }} />;

  const SidebarItem = ({ icon: Icon, label, id }) => (
    <button
      onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
      className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${activeTab === id ? 'bg-slate-900 text-[#FF6B00] shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
    >
      <Icon size={18} className={activeTab === id ? 'text-[#FF6B00]' : 'group-hover:scale-110 transition-transform'} />
      <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] md:hidden animate-in fade-in duration-300" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto no-scrollbar z-[101] transition-transform duration-500 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center space-x-3">
              <LogoMark size={42} />
              <div>
                <h1 className="text-xl font-black leading-none tracking-tighter text-slate-800">OneControl</h1>
                <span className="text-[9px] text-[#FF6B00] font-black uppercase tracking-[0.3em]">SaaS Elite v4.0</span>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 text-slate-400"><X size={20} /></button>
          </div>

          <nav className="space-y-6">
            <div>
              <p className="px-4 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Negocio</p>
              <SidebarItem icon={LayoutDashboard} label="Dashboard"        id="dashboard" />
              <div className="relative">
                <SidebarItem icon={MessageSquare} label="Conversaciones" id="conversaciones" />
                {leads.filter(l => l.priority === 'urgent').length > 0 && (
                  <span className="absolute top-2 right-4 h-5 w-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse shadow-lg">
                    {leads.filter(l => l.priority === 'urgent').length}
                  </span>
                )}
              </div>
              <SidebarItem icon={Users}         label="Base de Clientes" id="crm" />
              <SidebarItem icon={Calendar}      label="Agenda IA"        id="agenda" />
              <SidebarItem icon={ShoppingBag}   label="Pedidos IA"       id="pedidos" />
            </div>
            <div>
              <p className="px-4 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inteligencia</p>
              <SidebarItem icon={Brain}    label="Agente IA"  id="cerebro" />
              <SidebarItem icon={Database} label="Base RAG"   id="rag" />
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
            onClick={() => setBotEnabled(v => !v)}
            className={`w-full py-3 rounded-2xl flex items-center justify-center space-x-2 font-black text-[10px] uppercase tracking-widest transition-all ${botEnabled ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-200 text-slate-500'}`}
          >
            <Power size={14} />
            <span>IA {botEnabled ? 'Encendida' : 'Manual'}</span>
          </button>
          <button
            onClick={() => { setShowChangePwd(true); setNewPwd(''); setConfirmPwd(''); setChangePwdError(''); setChangePwdOk(false); }}
            className="w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-[#FF6B00] transition-colors flex items-center justify-center space-x-1 mt-1"
          >
            <KeyRound size={12} /><span>Cambiar Contraseña</span>
          </button>
          <button
            onClick={() => { localStorage.removeItem('dashboard_token'); setAuthToken(null); }}
            className="w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center space-x-1"
          >
            <LogOut size={12} /><span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-10 shrink-0 sticky top-0 z-20">
          <div className="flex items-center space-x-4 md:space-x-6 flex-1">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 bg-slate-100 rounded-xl text-slate-600">
              <MoreVertical size={20} />
            </button>
            <div className="hidden md:flex bg-slate-100 p-2.5 rounded-xl text-slate-400"><Search size={18} /></div>
            <div className="flex items-center space-x-2">
              <Globe size={14} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none italic">Guatemala</span>
            </div>
          </div>
          <div className="flex items-center space-x-4 md:space-x-6">
            {loading && <RefreshCw size={14} className="animate-spin text-emerald-500" />}
            {notification && typeof notification === 'string' && (
              <div className={`text-white text-[9px] md:text-[10px] font-black px-3 md:px-4 py-1.5 rounded-lg uppercase shadow-lg ${notification.startsWith('❌') ? 'bg-red-500' : 'bg-emerald-500'}`}>
                {notification}
              </div>
            )}
            <button
              onClick={() => {
                playMessageAlert.current();
                setNotification({ text: 'Hola! me interesa el control genius', lead: { nombre: 'Fernando Garcia', phone: '+50235154362', estado: 'Interesado' }, type: 'message' });
                setTimeout(() => setNotification(null), 6000);
              }}
              className="hidden md:flex items-center space-x-1 bg-blue-50 border border-blue-200 text-blue-600 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
            >
              <Bell size={12} /><span>Test</span>
            </button>
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl md:rounded-2xl bg-slate-900 flex items-center justify-center font-black text-[#FF6B00] border-2 border-white shadow-xl italic">OC</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar" style={{ padding: activeTab === 'conversaciones' ? 0 : undefined }}>
          <div className={activeTab !== 'conversaciones' ? 'p-4 md:p-10' : 'h-full flex flex-col'}>
            {activeTab === 'dashboard' && (
              <ViewDashboard
                leads={leads}
                agenda={agenda}
                stats={stats}
                onOpenConversation={(id) => { setActiveTab('conversaciones'); setSelectedChatId(id); }}
                onConfigureAgent={() => setActiveTab('cerebro')}
              />
            )}
            {activeTab === 'conversaciones' && (
              <ViewConversaciones
                leads={leads}
                messages={messages}
                selectedChatId={selectedChatId}
                selectedLead={selectedLead}
                onSelectChat={setSelectedChatId}
                onSendMessage={sendMessage}
                onToggleBot={handleToggleBot}
                messagesContainerRef={messagesContainerRef}
                messagesEndRef={messagesEndRef}
              />
            )}
            {activeTab === 'crm' && (
              <ViewCRM
                leads={leads}
                onUpdateLead={updateLead}
                onToggleBot={handleToggleBot}
                onArchive={archiveLead}
                onDeleteMessages={deleteMessages}
              />
            )}
            {activeTab === 'agenda' && (
              <ViewAgenda
                agenda={agenda}
                onCreateCita={createCita}
                onDeleteCita={deleteCita}
              />
            )}
            {activeTab === 'pedidos' && (
              <ViewPedidos
                pedidos={pedidos}
                onUpdateEstado={updatePedidoEstado}
                onSavePedido={savePedido}
                onDeletePedido={deletePedido}
              />
            )}
            {activeTab === 'cerebro' && (
              <ViewCerebro
                agentConfig={agentConfig}
                setAgentConfig={setAgentConfig}
                prompts={prompts}
                setPrompts={setPrompts}
                mensajesBot={mensajesBot}
                setMensajesBot={setMensajesBot}
                captureFields={captureFields}
                setCaptureFields={setCaptureFields}
                captureStats={captureStats}
                handoffTriggers={handoffTriggers}
                setHandoffTriggers={setHandoffTriggers}
                aiInsights={aiInsights}
                aiKnowledge={aiKnowledge}
                onSyncBrain={syncBrainConfig}
                onSaveSetting={saveSetting}
                onSaveHandoff={saveHandoffTriggers}
                onApproveKnowledge={approveKnowledge}
                onIgnoreKnowledge={ignoreKnowledge}
                onRefreshCaptureStats={fetchCaptureStats}
              />
            )}
            {activeTab === 'rag' && (
              <ViewRAG
                documents={documents}
                products={products}
                onSaveCard={saveCard}
                onUpdateCard={updateCard}
                onDeleteCard={deleteCard}
                onSaveProduct={saveProduct}
                onUpdateProduct={updateProduct}
                onDeleteProduct={deleteProduct}
                onUploadDocument={uploadDocument}
                onUploadProductImage={uploadProductImage}
                onRunTestSearch={runTestSearch}
              />
            )}
          </div>
        </div>
      </main>

      {/* Toast: mensaje entrante */}
      {notification && typeof notification === 'object' && notification.type === 'message' && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 rounded-3xl shadow-2xl shadow-slate-900/40 border border-slate-700 overflow-hidden w-80">
            <div className="bg-[#FF6B00] px-4 py-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-white animate-ping" />
                <span className="text-[9px] font-black text-white uppercase tracking-widest">Nuevo Mensaje</span>
              </div>
              <button onClick={() => setNotification(null)} className="text-white/70 hover:text-white transition-colors"><X size={12} /></button>
            </div>
            <div className="p-4 flex items-start space-x-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-800 text-[#FF6B00] flex items-center justify-center font-black text-sm shrink-0 border border-slate-700">
                {notification.lead?.nombre?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white leading-none mb-1">{notification.lead?.nombre || 'Cliente'}</p>
                <p className="text-[10px] text-slate-400 font-medium leading-tight truncate">{notification.text}</p>
                <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                  notification.lead?.estado === 'Venta'      ? 'bg-emerald-500/20 text-emerald-400' :
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

      {/* Modal: Cambiar Contraseña */}
      {showChangePwd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <KeyRound size={16} className="text-[#FF6B00]" />
                <span className="text-[11px] font-black text-white uppercase tracking-widest">Cambiar Contraseña</span>
              </div>
              <button onClick={() => setShowChangePwd(false)} className="text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
            </div>
            <form onSubmit={handleChangeToken} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nueva Contraseña</label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-all"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Confirmar Contraseña</label>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-all"
                />
              </div>
              {changePwdError && <p className="text-[11px] font-bold text-red-500">{changePwdError}</p>}
              {changePwdOk    && <p className="text-[11px] font-bold text-emerald-500">✓ Contraseña actualizada</p>}
              <button
                type="submit"
                disabled={changePwdBusy || !newPwd || !confirmPwd}
                className="w-full py-3.5 bg-slate-900 hover:bg-[#FF6B00] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changePwdBusy ? 'Guardando...' : 'Guardar Contraseña'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast: pedido nuevo */}
      {notification && typeof notification === 'object' && notification.type === 'pedido' && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 rounded-3xl shadow-2xl shadow-slate-900/40 border border-slate-700 overflow-hidden w-80">
            <div className="bg-emerald-500 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-white animate-ping" />
                <span className="text-[9px] font-black text-white uppercase tracking-widest">Nuevo Pedido</span>
              </div>
              <button onClick={() => setNotification(null)} className="text-white/70 hover:text-white transition-colors"><X size={12} /></button>
            </div>
            <div className="p-4 flex items-start space-x-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center font-black text-lg shrink-0 border border-slate-700">🛒</div>
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
}
