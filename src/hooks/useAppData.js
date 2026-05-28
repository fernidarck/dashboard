import { useState, useEffect, useRef, useCallback } from 'react';

export function useAppData(apiBase, authToken) {
  const apiFetch = useCallback((url, options = {}) => {
    const headers = { 'Authorization': `Bearer ${authToken}`, ...(options.headers || {}) };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(url, { ...options, headers });
  }, [authToken]);

  // --- STATE ---
  const [leads, setLeads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ botMessages: 0 });
  const [captureStats, setCaptureStats] = useState([]);
  const [aiInsights, setAiInsights] = useState({ topics: [], stats: {} });
  const [aiKnowledge, setAiKnowledge] = useState([]);
  const [handoffTriggers, setHandoffTriggers] = useState([]);
  const [agentConfig, setAgentConfig] = useState({
    nombre: 'OneControl Bot', rol: 'Asistente de Ventas',
    empresa: 'OneControl Guatemala', descripcion: '',
    personalidad: 'Servicial y Profesional', idioma: 'Español',
    tono: 'Amigable', productos: ''
  });
  const [prompts, setPrompts] = useState({ Recepcionista: '', Vendedor: '', Soporte: '' });
  const [mensajesBot, setMensajesBot] = useState({
    bienvenida: '¡Hola! Soy {nombre} de {empresa}. ¿En qué te puedo ayudar hoy? 😊',
    fallback: 'Disculpa, no entendí bien. ¿Podrías repetirlo de otra forma?',
    fuera_horario: 'En este momento estamos fuera de horario. Te responderemos pronto. ¡Gracias!',
    despedida: '¡Fue un placer atenderte! Si necesitas algo más, aquí estaré. 🙌',
  });
  const [captureFields, setCaptureFields] = useState([
    { key: 'nombre',    label: 'Nombre completo',      activo: true,  pregunta: '¿Me podés dar tu nombre completo?' },
    { key: 'direccion', label: 'Dirección de entrega',  activo: true,  pregunta: '¿A qué dirección te lo enviamos?' },
    { key: 'nit',       label: 'NIT / Facturación',     activo: true,  pregunta: '¿Necesitás factura? ¿Cuál es tu NIT?' },
    { key: 'phone',     label: 'Teléfono',              activo: true,  pregunta: '¿Cuál es tu número de teléfono?' },
    { key: 'motor',     label: 'Motor / Producto',      activo: true,  pregunta: '¿Qué modelo de motor te interesa?' },
    { key: 'falla',     label: 'Falla / Problema',      activo: false, pregunta: '¿Cuál es la falla que presenta tu equipo?' },
    { key: 'zona',      label: 'Zona / Municipio',      activo: false, pregunta: '¿En qué zona o municipio estás?' },
    { key: 'email',     label: 'Email',                 activo: false, pregunta: '¿Tenés un correo para la cotización?' },
  ]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const notify = useCallback((text, timeout = 3000) => {
    setNotification(text);
    if (timeout) setTimeout(() => setNotification(null), timeout);
  }, []);

  // Refs para detección de mensajes/pedidos nuevos
  const knownLastClientMsgId = useRef({});
  const knownPedidoCount = useRef(null);
  const playMessageAlert = useRef(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    audio.play().catch(() => {});
  });

  // --- FETCH FUNCTIONS ---
  const fetchLeads = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiBase}/api/leads?t=${Date.now()}`);
      const data = await res.json();
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
    } catch (err) { console.error(err); }
  }, [apiFetch, apiBase]);

  const fetchMessages = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await apiFetch(`${apiBase}/api/messages/${id}?t=${Date.now()}`);
      setMessages(await res.json());
    } catch (err) { console.error(err); }
  }, [apiFetch, apiBase]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiBase}/api/settings`);
      const data = await res.json();
      const settingsArray = Array.isArray(data)
        ? data
        : Object.entries(data).map(([key, value]) => ({ key, value }));
      const config = {};
      const loadedPrompts = {};
      const loadedMensajes = {};
      settingsArray.forEach(s => {
        if (s.key === 'agent_nombre')       config.nombre        = s.value;
        if (s.key === 'agent_rol')          config.rol           = s.value;
        if (s.key === 'agent_empresa')      config.empresa       = s.value;
        if (s.key === 'agent_descripcion')  config.descripcion   = s.value;
        if (s.key === 'agent_personalidad') config.personalidad  = s.value;
        if (s.key === 'agent_idioma')       config.idioma        = s.value;
        if (s.key === 'agent_tono')         config.tono          = s.value;
        if (s.key === 'agent_productos')    config.productos     = s.value;
        if (s.key === 'capture_fields')     { try { setCaptureFields(JSON.parse(s.value)); } catch(e) {} }
        if (s.key === 'msg_bienvenida')     loadedMensajes.bienvenida     = s.value;
        if (s.key === 'msg_fallback')       loadedMensajes.fallback       = s.value;
        if (s.key === 'msg_fuera_horario')  loadedMensajes.fuera_horario  = s.value;
        if (s.key === 'msg_despedida')      loadedMensajes.despedida      = s.value;
        if (s.key === 'prompt_recepcionista') loadedPrompts.Recepcionista = s.value;
        if (s.key === 'prompt_ventas')      loadedPrompts.Vendedor        = s.value;
        if (s.key === 'prompt_soporte')     loadedPrompts.Soporte         = s.value;
      });
      if (Object.keys(config).length)       setAgentConfig(prev => ({ ...prev, ...config }));
      if (Object.keys(loadedPrompts).length) setPrompts(prev => ({ ...prev, ...loadedPrompts }));
      if (Object.keys(loadedMensajes).length) setMensajesBot(prev => ({ ...prev, ...loadedMensajes }));
    } catch (err) { console.error(err); }
  }, [apiFetch, apiBase]);

  const fetchRAG = useCallback(async () => {
    try {
      const [docsRes, prodsRes] = await Promise.all([
        apiFetch(`${apiBase}/api/rag/documents`),
        apiFetch(`${apiBase}/api/products`)
      ]);
      setDocuments(await docsRes.json());
      setProducts(await prodsRes.json());
    } catch (err) { console.error(err); }
  }, [apiFetch, apiBase]);

  const fetchAgenda = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiBase}/api/agenda`);
      setAgenda(await res.json());
    } catch (err) { console.error(err); }
  }, [apiFetch, apiBase]);

  const fetchPedidos = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiBase}/api/pedidos`);
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
  }, [apiFetch, apiBase]);

  const fetchHandoff = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiBase}/api/handoff/triggers`);
      setHandoffTriggers(await res.json());
    } catch (err) { console.error(err); }
  }, [apiFetch, apiBase]);

  const fetchLearning = useCallback(async () => {
    try {
      const [insightsRes, knowledgeRes] = await Promise.all([
        apiFetch(`${apiBase}/api/ai/insights`),
        apiFetch(`${apiBase}/api/ai/knowledge`)
      ]);
      const insightsData = await insightsRes.json();
      setAiInsights(Array.isArray(insightsData) ? { topics: insightsData, stats: {} } : insightsData);
      setAiKnowledge(await knowledgeRes.json());
    } catch (err) { console.error(err); }
  }, [apiFetch, apiBase]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiBase}/api/stats`);
      setStats(await res.json());
    } catch (err) { console.error(err); }
  }, [apiFetch, apiBase]);

  const fetchCaptureStats = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiBase}/api/capture/stats`);
      setCaptureStats(await res.json());
    } catch (err) { console.error(err); }
  }, [apiFetch, apiBase]);

  // --- MUTATION FUNCTIONS ---
  const saveSetting = useCallback(async (key, value) => {
    setLoading(true);
    try {
      await apiFetch(`${apiBase}/api/settings`, {
        method: 'POST',
        body: JSON.stringify({ key, value })
      });
      notify(`✅ ${key.replace('agent_', '').replace('_', ' ')} guardado`);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [apiFetch, apiBase, notify]);

  const toggleBot = useCallback(async (leadId, newState) => {
    setLeads(prev => prev.map(l => l.id === leadId ? {
      ...l, botActive: newState ? 1 : 0,
      priority: newState ? 'normal' : l.priority,
      handoff_reason: newState ? null : l.handoff_reason,
      estado: newState ? 'Activo' : l.estado
    } : l));
    notify(newState ? '✅ Bot activado' : '🔴 Bot desactivado');
    try {
      const res = await apiFetch(`${apiBase}/api/bot/toggle`, {
        method: 'POST',
        body: JSON.stringify({ leadId, enabled: newState })
      });
      if (!res.ok) throw new Error('Server error');
    } catch {
      notify('❌ Error al cambiar estado del bot');
      fetchLeads();
    }
  }, [apiFetch, apiBase, notify, fetchLeads]);

  const deleteMessages = useCallback(async (id) => {
    if (!window.confirm('¿Eliminar todos los mensajes de esta conversación?')) return;
    try {
      await apiFetch(`${apiBase}/api/leads/${id}/messages`, { method: 'DELETE' });
      fetchMessages(id);
    } catch (err) { console.error(err); }
  }, [apiFetch, apiBase, fetchMessages]);

  const archiveLead = useCallback(async (id, currentArchived) => {
    try {
      await apiFetch(`${apiBase}/api/leads/${id}/archive`, {
        method: 'POST',
        body: JSON.stringify({ archived: !currentArchived })
      });
      fetchLeads();
    } catch (err) { console.error(err); }
  }, [apiFetch, apiBase, fetchLeads]);

  const updateLead = useCallback(async (lead) => {
    try {
      await apiFetch(`${apiBase}/api/leads/${lead.id}`, {
        method: 'PUT',
        body: JSON.stringify(lead)
      });
      fetchLeads();
      notify('✅ Lead actualizado correctamente');
    } catch (err) { console.error(err); }
  }, [apiFetch, apiBase, fetchLeads, notify]);

  const sendMessage = useCallback(async (leadId, text) => {
    try {
      const res = await apiFetch(`${apiBase}/api/messages/send`, {
        method: 'POST',
        body: JSON.stringify({ leadId, text, sender: 'agent' })
      });
      if (!res.ok) { notify('❌ Error al enviar: ' + res.status); return false; }
      await Promise.all([fetchMessages(leadId), fetchLeads()]);
      notify('✅ Mensaje enviado', 2000);
      return true;
    } catch { notify('❌ Error de red'); return false; }
  }, [apiFetch, apiBase, fetchMessages, fetchLeads, notify]);

  const updatePedidoEstado = useCallback(async (id, estado) => {
    try {
      await apiFetch(`${apiBase}/api/pedidos/status`, {
        method: 'POST',
        body: JSON.stringify({ id, estado })
      });
      fetchPedidos();
    } catch (err) { console.error(err); }
  }, [apiFetch, apiBase, fetchPedidos]);

  const savePedido = useCallback(async (pedido) => {
    try {
      await apiFetch(`${apiBase}/api/pedidos/${pedido.id}`, {
        method: 'PUT',
        body: JSON.stringify(pedido)
      });
      fetchPedidos();
      notify('✅ Pedido actualizado', 2500);
      return true;
    } catch { return false; }
  }, [apiFetch, apiBase, fetchPedidos, notify]);

  const deletePedido = useCallback(async (id) => {
    if (!window.confirm('¿Eliminar este pedido?')) return;
    try {
      await apiFetch(`${apiBase}/api/pedidos/${id}`, { method: 'DELETE' });
      fetchPedidos();
    } catch (err) { console.error(err); }
  }, [apiFetch, apiBase, fetchPedidos]);

  const createCita = useCallback(async (cita) => {
    try {
      await apiFetch(`${apiBase}/api/agenda`, {
        method: 'POST',
        body: JSON.stringify(cita)
      });
      fetchAgenda();
      notify('✅ Cita agendada');
      return true;
    } catch { return false; }
  }, [apiFetch, apiBase, fetchAgenda, notify]);

  const deleteCita = useCallback(async (id) => {
    try {
      await apiFetch(`${apiBase}/api/agenda/${id}`, { method: 'DELETE' });
      fetchAgenda();
    } catch (err) { console.error(err); }
  }, [apiFetch, apiBase, fetchAgenda]);

  const saveHandoffTriggers = useCallback(async (triggers) => {
    setLoading(true);
    try {
      await apiFetch(`${apiBase}/api/handoff/triggers`, {
        method: 'POST',
        body: JSON.stringify(triggers)
      });
      notify('✅ Triggers de Handoff guardados');
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [apiFetch, apiBase, notify]);

  const saveCard = useCallback(async (card) => {
    try {
      await apiFetch(`${apiBase}/api/rag/save`, {
        method: 'POST',
        body: JSON.stringify(card)
      });
      fetchRAG();
      notify('✅ Tarjeta creada correctamente');
      return true;
    } catch { return false; }
  }, [apiFetch, apiBase, fetchRAG, notify]);

  const updateCard = useCallback(async (id, card) => {
    try {
      await apiFetch(`${apiBase}/api/rag/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(card)
      });
      fetchRAG();
      notify('✅ Tarjeta actualizada');
      return true;
    } catch { return false; }
  }, [apiFetch, apiBase, fetchRAG, notify]);

  const deleteCard = useCallback(async (id) => {
    if (!window.confirm('¿Eliminar esta tarjeta de conocimiento?')) return;
    try {
      await apiFetch(`${apiBase}/api/rag/documents/${id}`, { method: 'DELETE' });
      fetchRAG();
    } catch (err) { console.error(err); }
  }, [apiFetch, apiBase, fetchRAG]);

  const saveProduct = useCallback(async (product) => {
    try {
      await apiFetch(`${apiBase}/api/products`, {
        method: 'POST',
        body: JSON.stringify(product)
      });
      fetchRAG();
      notify('✅ Producto añadido al catálogo');
      return true;
    } catch { return false; }
  }, [apiFetch, apiBase, fetchRAG, notify]);

  const updateProduct = useCallback(async (id, product) => {
    try {
      await apiFetch(`${apiBase}/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(product)
      });
      fetchRAG();
      notify('✅ Producto actualizado');
      return true;
    } catch { return false; }
  }, [apiFetch, apiBase, fetchRAG, notify]);

  const deleteProduct = useCallback(async (id) => {
    if (!window.confirm('¿Eliminar este producto del catálogo?')) return;
    try {
      await apiFetch(`${apiBase}/api/products/${id}`, { method: 'DELETE' });
      fetchRAG();
    } catch (err) { console.error(err); }
  }, [apiFetch, apiBase, fetchRAG]);

  const approveKnowledge = useCallback(async (id) => {
    try {
      await apiFetch(`${apiBase}/api/ai/knowledge/approve/${id}`, { method: 'POST' });
      fetchLearning();
      fetchRAG();
      notify('✅ Conocimiento validado e integrado al RAG');
    } catch (err) { console.error(err); }
  }, [apiFetch, apiBase, fetchLearning, fetchRAG, notify]);

  const ignoreKnowledge = useCallback(async (id) => {
    try {
      await apiFetch(`${apiBase}/api/ai/knowledge/${id}`, { method: 'DELETE' });
      fetchLearning();
    } catch (err) { console.error(err); }
  }, [apiFetch, apiBase, fetchLearning]);

  const uploadProductImage = useCallback(async (file, type, setNew, setEdit) => {
    const formData = new FormData();
    formData.append('image', file);
    setLoading(true);
    try {
      const res = await apiFetch(`${apiBase}/api/products/upload-image`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        if (type === 'new') setNew(prev => ({ ...prev, imagen: data.imageUrl }));
        else if (type === 'edit') setEdit(prev => ({ ...prev, imagen: data.imageUrl }));
        notify('✅ Imagen subida', 3000);
      } else {
        notify('❌ Error al subir imagen', 3000);
      }
    } catch { notify('❌ Error de conexión', 3000); }
    finally { setLoading(false); }
  }, [apiFetch, apiBase, notify]);

  const uploadDocument = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);
    setLoading(true);
    try {
      const res = await apiFetch(`${apiBase}/api/rag/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        notify('✅ Archivo procesado e integrado al conocimiento', 4000);
        fetchRAG();
      } else {
        notify('❌ Error al procesar archivo', 4000);
      }
    } catch { notify('❌ Error de conexión', 4000); }
    finally { setLoading(false); }
  }, [apiFetch, apiBase, fetchRAG, notify]);

  const runTestSearch = useCallback(async (query) => {
    if (!query.trim()) return [];
    try {
      const res = await apiFetch(`${apiBase}/api/rag/test-search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      return data.results || [];
    } catch { return []; }
  }, [apiFetch, apiBase]);

  const syncBrainConfig = useCallback(async (config) => {
    setLoading(true);
    try {
      const saves = [
        { key: 'agent_nombre',       value: config.nombre },
        { key: 'agent_rol',          value: config.rol },
        { key: 'agent_descripcion',  value: config.descripcion },
        { key: 'agent_empresa',      value: config.empresa },
        { key: 'agent_personalidad', value: config.personalidad },
        { key: 'agent_idioma',       value: config.idioma },
        { key: 'agent_tono',         value: config.tono },
        { key: 'agent_productos',    value: config.productos }
      ];
      await Promise.all(saves.map(s => apiFetch(`${apiBase}/api/settings`, {
        method: 'POST',
        body: JSON.stringify(s)
      })));
      notify('✅ Cerebro sincronizado — n8n ya usa la nueva configuración', 4000);
    } catch { notify('❌ Error sincronizando', 3000); }
    finally { setLoading(false); }
  }, [apiFetch, apiBase, notify]);

  return {
    // State
    leads, messages, agenda, pedidos, documents, products,
    stats, captureStats, aiInsights, aiKnowledge, handoffTriggers, setHandoffTriggers,
    agentConfig, setAgentConfig, prompts, setPrompts,
    mensajesBot, setMensajesBot, captureFields, setCaptureFields,
    loading, notification, setNotification,
    // Fetch
    fetchLeads, fetchMessages, fetchSettings, fetchRAG, fetchAgenda,
    fetchPedidos, fetchHandoff, fetchLearning, fetchStats, fetchCaptureStats,
    // Mutations
    saveSetting, toggleBot, deleteMessages, archiveLead, updateLead,
    sendMessage, updatePedidoEstado, savePedido, deletePedido,
    createCita, deleteCita, saveHandoffTriggers,
    saveCard, updateCard, deleteCard,
    saveProduct, updateProduct, deleteProduct,
    approveKnowledge, ignoreKnowledge,
    uploadProductImage, uploadDocument, runTestSearch, syncBrainConfig,
    // Alerts
    playMessageAlert, notify,
  };
}
