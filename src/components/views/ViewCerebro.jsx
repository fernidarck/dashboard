import { useState, useEffect } from 'react';
import {
  Save, MessageSquare, Database, AlertTriangle, Plus, Trash2,
  RefreshCw, Sparkles, LineChart, Brain, Pencil, Phone, ShieldCheck, Power
} from 'lucide-react';

export default function ViewCerebro({
  currentUser,
  users = [],
  onSaveUser,
  onDeleteUser,
  agentConfig, setAgentConfig,
  prompts, setPrompts,
  mensajesBot, setMensajesBot,
  captureFields, setCaptureFields,
  captureStats, handoffTriggers, setHandoffTriggers,
  aiInsights, aiKnowledge,
  onSyncBrain, onSaveSetting, onSaveHandoff,
  onApproveKnowledge, onIgnoreKnowledge,
  onRefreshCaptureStats,
  channels = [], onSaveChannel, onDeleteChannel
}) {
  const [subTabIA, setSubTabIA] = useState('General');
  const [selectedAgent, setSelectedAgent] = useState('Recepcionista');

  // User Form States
  const [editingUser, setEditingUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRealName, setUserRealName] = useState('');
  const [userRole, setUserRole] = useState('operator');
  const [userChannelPhone, setUserChannelPhone] = useState(null);
  const [userActive, setUserActive] = useState(true);

  const handleStartAddUser = () => {
    setEditingUser({ id: null });
    setUserName('');
    setUserPassword('');
    setUserRealName('');
    setUserRole('operator');
    setUserChannelPhone(null);
    setUserActive(true);
  };

  const handleStartEditUser = (user) => {
    setEditingUser(user);
    setUserName(user.username || '');
    setUserPassword('');
    setUserRealName(user.name || '');
    setUserRole(user.role || 'operator');
    setUserChannelPhone(user.channel_phone || null);
    setUserActive(!!user.active);
  };

  const handleSaveUserClick = async (e) => {
    e.preventDefault();
    if (!userName.trim() || !userRealName.trim()) return;
    const success = await onSaveUser({
      id: editingUser.id,
      username: userName,
      password: userPassword,
      name: userRealName,
      role: userRole,
      channel_phone: userRole === 'admin' ? null : userChannelPhone, // Admin always gets null channel
      active: userActive ? 1 : 0
    });
    if (success) {
      setEditingUser(null);
    }
  };

  // Channel Form States
  const [editingChannel, setEditingChannel] = useState(null);
  const [chanName, setChanName] = useState('');
  const [chanPhone, setChanPhone] = useState('');
  const [chanApiKey, setChanApiKey] = useState('');
  const [chanWebhook, setChanWebhook] = useState('');
  const [chanActive, setChanActive] = useState(true);

  const handleStartAdd = () => {
    setEditingChannel({ id: null });
    setChanName('');
    setChanPhone('');
    setChanApiKey('');
    setChanWebhook('');
    setChanActive(true);
  };

  const handleStartEdit = (chan) => {
    setEditingChannel(chan);
    setChanName(chan.name || '');
    setChanPhone(chan.phone || '');
    setChanApiKey(chan.api_key || '');
    setChanWebhook(chan.outbound_webhook || '');
    setChanActive(!!chan.active);
  };

  const handleSaveChannelClick = async (e) => {
    e.preventDefault();
    if (!chanPhone.trim()) return;
    const success = await onSaveChannel({
      id: editingChannel.id,
      name: chanName,
      phone: chanPhone,
      api_key: chanApiKey,
      outbound_webhook: chanWebhook,
      active: chanActive ? 1 : 0
    });
    if (success) {
      setEditingChannel(null);
    }
  };

  useEffect(() => {
    if (subTabIA === 'Aprendizaje') {
      // Trigger analysis when tab opens — fire-and-forget
    }
  }, [subTabIA]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic leading-none">Cerebro de la IA</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 italic">Configuración de identidad y comportamiento</p>
        </div>
        <button
          onClick={() => onSyncBrain(agentConfig)}
          className="bg-emerald-500 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase shadow-xl shadow-emerald-200 flex items-center space-x-2 transition-all active:scale-95"
        >
          <Save size={16} /><span>Sincronizar Cerebro</span>
        </button>
      </div>

      <div className="flex space-x-8 border-b border-slate-200">
        {['General', 'Mensajes', 'Captura de Datos', 'Prompt', 'Handoff', 'Aprendizaje', 'Conectores', 'Usuarios'].map(t => (
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
              {[
                { label: 'Nombre del Asistente', key: 'nombre' },
                { label: 'Rol / Puesto', key: 'rol' },
                { label: 'Empresa', key: 'empresa' },
                { label: 'Personalidad', key: 'personalidad' },
                { label: 'Idioma', key: 'idioma' },
                { label: 'Tono de Voz', key: 'tono' },
              ].map(({ label, key }) => (
                <div key={key} className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{label}</label>
                  <input
                    type="text"
                    value={agentConfig[key] || ''}
                    onChange={e => setAgentConfig({...agentConfig, [key]: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              ))}
              <div className="space-y-4 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Descripción del Negocio (Contexto para la IA)</label>
                <textarea rows={4} value={agentConfig.descripcion || ''} onChange={e => setAgentConfig({...agentConfig, descripcion: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-emerald-500 italic" />
              </div>
              <div className="space-y-4 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Productos/Servicios Destacados</label>
                <textarea rows={4} value={agentConfig.productos || ''} onChange={e => setAgentConfig({...agentConfig, productos: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-emerald-500 italic" />
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
                  for (const [k, v] of [
                    ['msg_bienvenida', mensajesBot.bienvenida],
                    ['msg_fallback', mensajesBot.fallback],
                    ['msg_fuera_horario', mensajesBot.fuera_horario],
                    ['msg_despedida', mensajesBot.despedida],
                  ]) {
                    await onSaveSetting(k, v);
                  }
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
                  <textarea rows={3} value={mensajesBot[key] || ''} onChange={e => setMensajesBot({ ...mensajesBot, [key]: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none leading-relaxed" />
                  <div className={`p-3 bg-${color}-50 rounded-xl border border-${color}-100`}>
                    <p className="text-[9px] text-slate-500 italic">
                      Preview: {(mensajesBot[key] || '').replace('{nombre}', agentConfig.nombre).replace('{empresa}', agentConfig.empresa)}
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
              </div>
              <div className="bg-slate-900 p-8 rounded-[32px] text-white">
                <h4 className="text-xs font-black text-[#FF6B00] uppercase mb-4 tracking-widest italic">Guía técnica para n8n</h4>
                <p className="text-[11px] text-slate-400 mb-6 leading-relaxed">
                  Tu flujo de n8n debe enviar un <b>POST</b> a <code className="text-emerald-400">/webhook/n8n</code> con estos campos:
                </p>
                <div className="space-y-3 font-mono text-[10px]">
                  {['"direccion"', '"nit"', '"notas"'].map(f => (
                    <div key={f} className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-blue-400">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-50 pb-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic flex items-center space-x-3">
                <Database size={18} className="text-[#FF6B00]" />
                <span>Datos capturados en producción</span>
              </h3>
              <button onClick={onRefreshCaptureStats} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"><RefreshCw size={14} className="text-slate-500" /></button>
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

          <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-50 pb-6">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">Campos que el bot recolecta</h3>
                <p className="text-[10px] text-slate-400 italic mt-1">Activa campos y personaliza la pregunta que hace el bot</p>
              </div>
              <button
                onClick={() => onSaveSetting('capture_fields', JSON.stringify(captureFields))}
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
                  <Plus size={14} /><span>Agregar</span>
                </button>
                <button
                  onClick={() => onSaveHandoff(handoffTriggers)}
                  className="bg-[#FF6B00] text-white px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all flex items-center space-x-2"
                >
                  <Save size={14} /><span>Guardar</span>
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
                    <button onClick={() => setHandoffTriggers(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 transition-colors">
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
            </div>
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
                          <button onClick={() => onApproveKnowledge(k.id)} className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md">Validar</button>
                          <button onClick={() => onIgnoreKnowledge(k.id)} className="flex-1 py-2 bg-slate-200 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest">Ignorar</button>
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
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">📜 Prompt del {selectedAgent}</h3>
              <button
                onClick={() => onSaveSetting(selectedAgent === 'Vendedor' ? 'prompt_ventas' : `prompt_${selectedAgent.toLowerCase()}`, prompts[selectedAgent])}
                className="bg-[#FF6B00] text-white px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all"
              >
                Guardar Cambios
              </button>
            </div>
            <textarea
              value={prompts?.[selectedAgent] || ""}
              onChange={e => setPrompts(prev => ({...prev, [selectedAgent]: e.target.value}))}
              className="w-full h-[500px] p-8 bg-slate-50 border border-slate-100 rounded-[32px] text-sm font-medium outline-none italic resize-none leading-relaxed"
              placeholder={`Escribe aquí las instrucciones maestras para el ${selectedAgent}...`}
            />
          </div>
        </div>
      )}

      {subTabIA === 'Conectores' && (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
          {/* Configuración Global de Dueño */}
          <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic flex items-center space-x-3">
                  <ShieldCheck size={18} className="text-[#FF6B00]" />
                  <span>Notificaciones de Pedidos</span>
                </h3>
                <p className="text-[10px] text-slate-400 italic mt-1">Configura a qué números del dueño se enviarán las notificaciones de nuevos pedidos</p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Número(s) del Dueño (separados por coma)</label>
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={agentConfig.owner_phone || ''}
                  onChange={e => setAgentConfig({...agentConfig, owner_phone: e.target.value})}
                  placeholder="Ej: +50235154362, +50287654321"
                  className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  onClick={() => onSaveSetting('owner_phone', agentConfig.owner_phone)}
                  className="bg-slate-900 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#FF6B00] transition-colors"
                >
                  Guardar Teléfonos
                </button>
              </div>
            </div>
          </div>

          {/* Gestión de Canales */}
          <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
            <div className="flex justify-between items-center border-b border-slate-50 pb-6">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic flex items-center space-x-3">
                  <Phone size={18} className="text-[#FF6B00]" />
                  <span>Canales de WhatsApp Remitentes</span>
                </h3>
                <p className="text-[10px] text-slate-400 italic mt-1">Administra los números de teléfono activos y sus credenciales de YCloud individuales</p>
              </div>
              {!editingChannel && (
                <button
                  onClick={handleStartAdd}
                  className="bg-emerald-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center space-x-2 shadow-lg active:scale-95 transition-all"
                >
                  <Plus size={14} /><span>Añadir Canal</span>
                </button>
              )}
            </div>

            {editingChannel ? (
              <form onSubmit={handleSaveChannelClick} className="bg-slate-50 p-8 rounded-3xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-300">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest italic">
                  {editingChannel.id ? '✏️ Editar Canal de WhatsApp' : '🆕 Registrar Nuevo Canal de WhatsApp'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Descriptivo</label>
                    <input
                      type="text"
                      value={chanName}
                      onChange={e => setChanName(e.target.value)}
                      placeholder="Ej: Reach Portones Principal"
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-[#FF6B00]"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de WhatsApp (YCloud From)</label>
                    <input
                      type="text"
                      value={chanPhone}
                      onChange={e => setChanPhone(e.target.value)}
                      placeholder="Ej: +50244315578"
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-[#FF6B00]"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">API Key de YCloud</label>
                    <input
                      type="password"
                      value={chanApiKey}
                      onChange={e => setChanApiKey(e.target.value)}
                      placeholder="API Key secreta para este número"
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-[#FF6B00]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Webhook de Salida de n8n</label>
                    <input
                      type="text"
                      value={chanWebhook}
                      onChange={e => setChanWebhook(e.target.value)}
                      placeholder="Ej: https://n8n.domain.com/webhook/send-message"
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-[#FF6B00]"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-white rounded-2xl border border-slate-200 w-fit">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado del Canal</label>
                  <button
                    type="button"
                    onClick={() => setChanActive(!chanActive)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${chanActive ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}
                  >
                    {chanActive ? 'Activo' : 'Inactivo'}
                  </button>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-8 py-3.5 bg-slate-900 hover:bg-[#FF6B00] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md"
                  >
                    Guardar Canal
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingChannel(null)}
                    className="px-8 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="overflow-x-auto rounded-[24px] border border-slate-100 shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Canal</th>
                      <th className="px-6 py-4">Teléfono</th>
                      <th className="px-6 py-4">API Key</th>
                      <th className="px-6 py-4">Webhook de Salida</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                    {channels.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic">No hay canales de WhatsApp registrados. Haz clic en "Añadir Canal" para empezar.</td>
                      </tr>
                    ) : channels.map(chan => (
                      <tr key={chan.id} className="hover:bg-slate-50/55 transition-colors">
                        <td className="px-6 py-4 font-black text-slate-800">{chan.name}</td>
                        <td className="px-6 py-4 text-slate-500">{chan.phone}</td>
                        <td className="px-6 py-4 font-mono text-[10px] text-slate-400">{chan.api_key ? `••••${chan.api_key.substring(chan.api_key.length - 6)}` : 'No configurada'}</td>
                        <td className="px-6 py-4 text-slate-400 truncate max-w-xs">{chan.outbound_webhook || 'Default webhook'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${chan.active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                            {chan.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end items-center space-x-2">
                            <button
                              onClick={() => handleStartEdit(chan)}
                              className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white rounded-xl transition-colors"
                              title="Editar"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => onDeleteChannel(chan.id)}
                              className="p-2 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] text-slate-400 italic leading-relaxed">
                💡 Cada número que agregues aquí funcionará como un canal independiente. Los leads y conversaciones se separarán automáticamente en base al número al que escriba el cliente. En n8n, puedes consultar la API `/api/channels/by-phone/[NÚMERO]` para obtener la API Key de YCloud de forma dinámica.
              </p>
            </div>
          </div>
        </div>
      )}

      {subTabIA === 'Usuarios' && (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
          <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
            <div className="flex items-center justify-between border-b border-slate-50 pb-6">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center"><ShieldCheck size={22} /></div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">Gestión de Usuarios</h3>
                  <p className="text-[10px] text-slate-400 italic">Administra los operadores de ventas y sus canales de WhatsApp asignados</p>
                </div>
              </div>
              {!editingUser && (
                <button
                  onClick={handleStartAddUser}
                  className="flex items-center space-x-2 bg-slate-900 hover:bg-[#FF6B00] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                >
                  <Plus size={14} /><span>Añadir Usuario</span>
                </button>
              )}
            </div>

            {editingUser ? (
              <form onSubmit={handleSaveUserClick} className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                    <input
                      type="text"
                      value={userRealName}
                      onChange={e => setUserRealName(e.target.value)}
                      placeholder="Ej: Carlos Gómez"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuario (Login)</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={e => setUserName(e.target.value)}
                      placeholder="Ej: carlos"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                      disabled={editingUser.id !== null}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Contraseña {editingUser.id !== null && '(Dejar en blanco para mantener)'}
                    </label>
                    <input
                      type="password"
                      value={userPassword}
                      onChange={e => setUserPassword(e.target.value)}
                      placeholder={editingUser.id !== null ? "••••••••" : "Mínimo 6 caracteres"}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-indigo-500"
                      required={editingUser.id === null}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol</label>
                    <select
                      value={userRole}
                      onChange={e => setUserRole(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="operator">Operador de Ventas</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Canal de WhatsApp Asignado</label>
                    <select
                      value={userChannelPhone || ''}
                      onChange={e => setUserChannelPhone(e.target.value || null)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Ninguno (Acceso completo a todos los canales - Solo Admin)</option>
                      {channels.map(chan => (
                        <option key={chan.id} value={chan.phone}>
                          {chan.name} ({chan.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 w-fit">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado de la cuenta</label>
                  <button
                    type="button"
                    onClick={() => setUserActive(!userActive)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${userActive ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}
                  >
                    {userActive ? 'Activo' : 'Inactivo'}
                  </button>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-8 py-3.5 bg-slate-900 hover:bg-[#FF6B00] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md"
                  >
                    Guardar Usuario
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-8 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="overflow-x-auto rounded-[24px] border border-slate-100 shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Usuario</th>
                      <th className="px-6 py-4">Nombre Completo</th>
                      <th className="px-6 py-4">Rol</th>
                      <th className="px-6 py-4">Canal Asignado</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic">No hay usuarios registrados.</td>
                      </tr>
                    ) : users.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50/55 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">@{user.username}</td>
                        <td className="px-6 py-4 font-black text-slate-800">{user.name}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${user.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                            {user.role === 'admin' ? 'Admin' : 'Operador'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">
                          {user.channel_phone ? (
                            <div className="flex items-center space-x-1.5">
                              <Phone size={12} className="text-emerald-500" />
                              <span>{channels.find(c => c.phone === user.channel_phone)?.name || 'Canal'} ({user.channel_phone})</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Acceso Global</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${user.active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                            {user.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end items-center space-x-2">
                            <button
                              onClick={() => handleStartEditUser(user)}
                              className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white rounded-xl transition-colors"
                              title="Editar"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => onDeleteUser(user.id)}
                              className="p-2 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl transition-colors"
                              title="Eliminar"
                              disabled={currentUser?.id === user.id}
                              style={{ opacity: currentUser?.id === user.id ? 0.4 : 1 }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] text-slate-400 italic leading-relaxed">
                💡 Los usuarios con rol de <strong>Operador</strong> solo podrán ver y gestionar los leads, citas, pedidos y mensajes que pertenezcan a su canal asignado. Además, el selector de canales se bloqueará a su número asignado y se les restringirá el acceso a las pestañas de Cerebro de la IA y Base RAG.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
