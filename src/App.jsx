import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, MessageSquare, Users, Calendar, ShoppingBag,
  Brain, Database, Zap, Search, Bell, X, MoreVertical,
  Power, ShieldCheck, LogOut, RefreshCw, Globe, KeyRound, ChevronDown, AtSign, AlertTriangle, Paperclip,
  GraduationCap
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
import ViewComentarios from './components/views/ViewComentarios.jsx';
import ViewArchivos from './components/views/ViewArchivos.jsx';
import ViewEntrenamiento from './components/views/ViewEntrenamiento.jsx';

const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3002' : '';
const CURRENT_USER_ID = 'fer';

export default function App() {
  const savedToken = localStorage.getItem('dashboard_token');
  const [authToken, setAuthToken] = useState(savedToken || null);
  const [sysAlert, setSysAlert] = useState(null); // alerta "bot caído" (banner)

  const {
    currentUser, users,
    leads, messages, agenda, pedidos, documents, products,
    stats, captureStats, aiInsights, aiKnowledge, handoffTriggers, setHandoffTriggers,
    trainingRules, trainingStats, metaInsights,
    agentConfig, setAgentConfig, prompts, setPrompts,
    mensajesBot, setMensajesBot, captureFields, setCaptureFields,
    loading, notification, setNotification,
    channels, selectedChannel, setSelectedChannel,
    fetchLeads, fetchMessages, fetchSettings, fetchRAG, fetchAgenda,
    fetchPedidos, fetchHandoff, fetchLearning, fetchStats, fetchCaptureStats,
    fetchChannels, fetchUsers, fetchTrainingRules, fetchMetaInsights,
    saveSetting, toggleBot, deleteMessages, archiveLead, updateLead,
    sendMessage, sendDocument, updatePedidoEstado, savePedido, deletePedido,
    createCita, deleteCita, saveHandoffTriggers,
    saveCard, updateCard, deleteCard,
    saveProduct, updateProduct, deleteProduct,
    approveKnowledge, ignoreKnowledge,
    saveTrainingRule, updateTrainingRule, deleteTrainingRule, approveTrainingRule, rejectTrainingRule,
    analyzeTrainingWithAI, testTrainingPrompt,
    uploadProductImage, uploadDocument, uploadImageFile, uploadMediaFile, runTestSearch, syncBrainConfig,
    saveChannel, deleteChannel, toggleChannelBot, saveUser, deleteUser,
    playMessageAlert,
  } = useAppData(API_BASE_URL, authToken);

  const [activeTab,      setActiveTab]      = useState('dashboard');
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [openChatNonce,  setOpenChatNonce]  = useState(0);
  const [selectedLead,   setSelectedLead]   = useState({});

  // Alerta "bot caído": consultar cada 30s y mostrar el banner rojo
  useEffect(() => {
    if (!authToken) return;
    let stop = false;
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/system-alert`, { headers: { Authorization: `Bearer ${authToken}` } });
        const a = await res.json();
        if (!stop) setSysAlert(a && a.active ? a : null);
      } catch { /* silencioso */ }
    };
    check();
    const t = setInterval(check, 30000);
    return () => { stop = true; clearInterval(t); };
  }, [authToken]);

  const dismissSysAlert = async () => {
    setSysAlert(null);
    try { await fetch(`${API_BASE_URL}/api/system-alert/clear`, { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } }); } catch { /* */ }
  };

  // Abrir el chat de un lead específico (desde Leads, Dashboard o una notificación).
  // El nonce fuerza que en móvil se muestre el chat, no la lista general.
  const openConversation = (id) => {
    if (!id) return;
    setActiveTab('conversaciones');
    setSelectedChatId(id);
    setOpenChatNonce(n => n + 1);
  };
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

  // Redirect non-admins to dashboard if they try to access cerebro, rag or entrenamiento
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && (activeTab === 'cerebro' || activeTab === 'rag' || activeTab === 'entrenamiento')) {
      setActiveTab('dashboard');
    }
  }, [currentUser, activeTab]);

  // Initial data load
  useEffect(() => {
    fetchChannels();
    fetchLeads(selectedChannel);
    fetchSettings();
    fetchRAG();
    fetchAgenda();
    fetchPedidos();
    fetchHandoff();
    fetchLearning();
    fetchTrainingRules();
    fetchMetaInsights();
    fetchStats();
    fetchCaptureStats();
  }, [selectedChannel]); // eslint-disable-line react-hooks/exhaustive-deps

  // 5-second polling
  useEffect(() => {
    const id = setInterval(() => {
      fetchLeads(selectedChannel);
      fetchStats();
      fetchPedidos();
      if (activeTab === 'conversaciones') fetchMessages(selectedChatId);
    }, 5000);
    return () => clearInterval(id);
  }, [activeTab, selectedChatId, selectedChannel, fetchLeads, fetchStats, fetchPedidos, fetchMessages]);

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
      // Solo autoscroll si el usuario YA está cerca del fondo.
      // Si subió a leer mensajes viejos, no lo tironeamos hacia abajo.
      const c = messagesContainerRef.current;
      if (c) {
        const nearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 120;
        if (nearBottom) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
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

  const currentChannelObj = channels.find(c => {
    const cPhone = String(c.phone || '').replace(/\D/g, '');
    const selPhone = String(selectedChannel || '').replace(/\D/g, '');
    return cPhone === selPhone;
  });
  const activeChannelPhone = currentChannelObj?.phone || (channels[0]?.phone);
  const activeChannelBotEnabled = currentChannelObj
    ? currentChannelObj.bot_active !== 0
    : (channels[0] ? channels[0].bot_active !== 0 : true);

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
      {/* Banner de alerta: bot caído */}
      {sysAlert && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-red-600 text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2 text-sm font-bold min-w-0">
            <AlertTriangle size={18} className="shrink-0" />
            <span className="truncate">
              🚨 El bot no pudo responder{sysAlert.error ? ` — ${sysAlert.error}` : ''}{sysAlert.hora ? ` (${sysAlert.hora})` : ''}. Revisá el saldo de IA.
            </span>
          </div>
          <button onClick={dismissSysAlert} className="shrink-0 text-white/90 hover:text-white p-1 rounded-lg hover:bg-red-700" title="Descartar alerta">
            <X size={18} />
          </button>
        </div>
      )}
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
              <SidebarItem icon={Users}         label="Leads"            id="crm" />
              <SidebarItem icon={Calendar}      label="Agenda IA"        id="agenda" />
              <SidebarItem icon={ShoppingBag}   label="Pedidos IA"       id="pedidos" />
              <SidebarItem icon={Globe}         label="Redes Sociales"  id="comentarios" />
              <SidebarItem icon={Paperclip}     label="Archivos"         id="archivos" />
            </div>
            {currentUser?.role === 'admin' && (
              <div>
                <p className="px-4 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inteligencia</p>
                <SidebarItem icon={Brain}    label="Agente IA"  id="cerebro" />
                <SidebarItem icon={Database} label="Base RAG"   id="rag" />
                <div className="relative">
                  <SidebarItem icon={GraduationCap} label="Entrenamiento" id="entrenamiento" />
                  {trainingStats.pending > 0 && (
                    <span className="absolute top-2.5 right-4 h-4.5 min-w-4.5 px-1 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse shadow-md shadow-amber-500/30">
                      {trainingStats.pending}
                    </span>
                  )}
                </div>
              </div>
            )}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-slate-100 bg-slate-50/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <ShieldCheck size={14} className={currentUser?.role === 'admin' ? "text-emerald-500" : "text-blue-500"} />
              <span>{currentUser?.role === 'admin' ? 'Administrador' : 'Operador'}</span>
            </div>
            <div className="text-[9px] font-bold text-slate-400 truncate max-w-[120px]">{currentUser?.name || currentUser?.username || 'Cargando...'}</div>
          </div>
          <button
            onClick={() => {
              if (activeChannelPhone) {
                toggleChannelBot(activeChannelPhone, !activeChannelBotEnabled);
              }
            }}
            className={`w-full py-3 rounded-2xl flex items-center justify-center space-x-2 font-black text-[10px] uppercase tracking-widest transition-all ${activeChannelBotEnabled ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-200 text-slate-500'}`}
            disabled={!activeChannelPhone}
          >
            <Power size={14} />
            <span>IA {activeChannelBotEnabled ? 'Encendida' : 'Manual'}</span>
          </button>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => { setShowChangePwd(true); setNewPwd(''); setConfirmPwd(''); setChangePwdError(''); setChangePwdOk(false); }}
              className="w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-[#FF6B00] transition-colors flex items-center justify-center space-x-1 mt-1"
            >
              <KeyRound size={12} /><span>Token de Acceso</span>
            </button>
          )}
          <button
            onClick={() => { localStorage.removeItem('dashboard_token'); setAuthToken(null); }}
            className="w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center space-x-1"
          >
            <LogOut size={12} /><span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden bg-[#F8FAFC]">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-10 shrink-0 sticky top-0 z-20">
          <div className="flex items-center space-x-4 md:space-x-6 flex-1 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 bg-slate-100 rounded-xl text-slate-600 shrink-0">
              <MoreVertical size={20} />
            </button>
            <div className="hidden md:flex bg-slate-100 p-2.5 rounded-xl text-slate-400"><Search size={18} /></div>
            
            {/* Filtro de Canal de WhatsApp */}
            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 shadow-sm hover:border-[#FF6B00] transition-all min-w-0 shrink">
              <select
                value={selectedChannel || 'all'}
                disabled={!!currentUser?.channel_phone}
                onChange={(e) => {
                  setSelectedChannel(e.target.value);
                  fetchLeads(e.target.value);
                }}
                className={`bg-transparent text-[9px] font-black uppercase tracking-widest text-slate-700 outline-none appearance-none pr-6 pl-1 truncate max-w-[42vw] md:max-w-none ${currentUser?.channel_phone ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
              >
                {!currentUser?.channel_phone && (
                  <>
                    <option value="all">🌐 Todos los Canales</option>
                    <option value="instagram">📸 Instagram Direct</option>
                    <option value="facebook">📘 Facebook Messenger</option>
                    <option value="whatsapp">🟢 Todos los WhatsApp</option>
                  </>
                )}
                {channels.map(chan => (
                  <option key={chan.id} value={chan.phone}>
                    🟢 {chan.name || 'Canal'} ({chan.phone})
                  </option>
                ))}
                {currentUser?.channel_phone && !channels.some(c => c.phone === currentUser.channel_phone) && (
                  <option value={currentUser.channel_phone}>
                    🟢 Canal Asignado ({currentUser.channel_phone})
                  </option>
                )}
              </select>
              <div className="absolute right-3 pointer-events-none text-slate-400">
                <ChevronDown size={11} />
              </div>
            </div>

            <div className="hidden sm:flex items-center space-x-2 shrink-0">
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
                pedidos={pedidos}
                agenda={agenda}
                stats={stats}
                metaInsights={metaInsights}
                onFetchMetaInsights={fetchMetaInsights}
                onOpenConversation={openConversation}
                onOpenLeads={() => setActiveTab('crm')}
                onConfigureAgent={() => setActiveTab('cerebro')}
              />
            )}
            {activeTab === 'conversaciones' && (
              <ViewConversaciones
                leads={leads}
                messages={messages}
                products={products}
                selectedChatId={selectedChatId}
                openChatNonce={openChatNonce}
                selectedLead={selectedLead}
                onSelectChat={setSelectedChatId}
                onSendMessage={sendMessage}
                onSendDocument={sendDocument}
                onToggleBot={handleToggleBot}
                messagesContainerRef={messagesContainerRef}
                messagesEndRef={messagesEndRef}
              />
            )}
            {activeTab === 'crm' && (
              <ViewCRM
                leads={leads}
                pedidos={pedidos}
                onUpdateLead={updateLead}
                onToggleBot={handleToggleBot}
                onArchive={archiveLead}
                onDeleteMessages={deleteMessages}
                onOpenConversation={openConversation}
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
            {activeTab === 'comentarios' && (
              <ViewComentarios apiBase={API_BASE_URL} authToken={authToken} />
            )}
            {activeTab === 'archivos' && (
              <ViewArchivos apiBase={API_BASE_URL} authToken={authToken} />
            )}
            {activeTab === 'cerebro' && (
              <ViewCerebro
                currentUser={currentUser}
                users={users}
                onSaveUser={saveUser}
                onDeleteUser={deleteUser}
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
                channels={channels}
                onSaveChannel={saveChannel}
                onDeleteChannel={deleteChannel}
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
                onUploadImageFile={uploadImageFile}
                onUploadMediaFile={uploadMediaFile}
                onRunTestSearch={runTestSearch}
              />
            )}
            {activeTab === 'entrenamiento' && (
              <ViewEntrenamiento
                trainingRules={trainingRules}
                trainingStats={trainingStats}
                onFetchRules={fetchTrainingRules}
                onSaveRule={saveTrainingRule}
                onUpdateRule={updateTrainingRule}
                onDeleteRule={deleteTrainingRule}
                onApproveRule={approveTrainingRule}
                onRejectRule={rejectTrainingRule}
                onAnalyzeAI={analyzeTrainingWithAI}
                onTestPrompt={testTrainingPrompt}
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
              onClick={() => { openConversation(notification.lead?.id); setNotification(null); }}
              className="w-full py-2.5 bg-slate-800 hover:bg-[#FF6B00] text-slate-400 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all border-t border-slate-700"
            >
              Ver conversación →
            </button>
          </div>
        </div>
      )}

      {/* Modal: Cambiar Token de Acceso */}
      {showChangePwd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <KeyRound size={16} className="text-[#FF6B00]" />
                <span className="text-[11px] font-black text-white uppercase tracking-widest">Cambiar Token de Acceso</span>
              </div>
              <button onClick={() => setShowChangePwd(false)} className="text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
            </div>
            <form onSubmit={handleChangeToken} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nuevo Token de Acceso</label>
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Confirmar Token</label>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  placeholder="Repite el token de acceso"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-all"
                />
              </div>
              {changePwdError && <p className="text-[11px] font-bold text-red-500">{changePwdError}</p>}
              {changePwdOk    && <p className="text-[11px] font-bold text-emerald-500">✓ Token de acceso actualizado</p>}
              <button
                type="submit"
                disabled={changePwdBusy || !newPwd || !confirmPwd}
                className="w-full py-3.5 bg-slate-900 hover:bg-[#FF6B00] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changePwdBusy ? 'Guardando...' : 'Guardar Token de Acceso'}
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
