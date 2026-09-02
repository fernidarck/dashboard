import { useState } from 'react';
import {
  Globe, Copy, Check, Sparkles, MessageSquare, ShieldCheck,
  Send, ExternalLink, Bot, Palette, Phone, ShoppingBag
} from 'lucide-react';

export default function ViewWebChat({ apiBase }) {
  const [copied, setCopied] = useState(false);
  const [botColor, setBotColor] = useState('#FF6B00');
  const [botName, setBotName] = useState('Asistente OneControl');
  const [waPhone, setWaPhone] = useState('35154362');
  const [welcomeMsg, setWelcomeMsg] = useState('¡Hola! 👋 Bienvenido a OneControl. ¿En qué te podemos asesorar hoy? Tenemos mesitas de noche modernas, cajones ocultos NFC y más.');

  // Simulador local del chat
  const [messages, setMessages] = useState([
    { sender: 'bot', text: welcomeMsg }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);

  const embedScript = `<!-- Chatbot IA OneControl para onecontrol.shop -->
<script 
  src="${apiBase || 'https://ycloud-dashboard.83aqlq.easypanel.host'}/api/webchat/widget.js" 
  data-color="${botColor}" 
  data-bot-name="${botName}" 
  data-whatsapp="${waPhone}" 
  data-welcome="${welcomeMsg}" 
  async>
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || loading) return;

    const userText = inputVal.trim();
    setInputVal('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await fetch(`${apiBase || ''}/api/webchat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, sessionId: 'test_simulator' })
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: data.reply || 'Disculpa, no pude procesar tu mensaje.',
          mediaUrl: data.mediaUrl
        }
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: 'Error de conexión con el servidor.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Globe className="text-[#FF6B00]" size={28} /> Bot Web para onecontrol.shop
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Asistente virtual independiente con IA para tu sitio web en WordPress · Conexión directa a WhatsApp y RAG
          </p>
        </div>

        <a
          href="https://onecontrol.shop"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <span>Visitar onecontrol.shop</span>
          <ExternalLink size={14} />
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUMNA IZQUIERDA: CONFIGURADOR Y CÓDIGO WORDPRESS */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* CÓDIGO DE INSERCIÓN */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-orange-100 text-[#FF6B00] font-black text-xs">WP</span>
                <h3 className="text-sm font-black text-slate-900">Código de Inserción para WordPress</h3>
              </div>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-[#FF6B00] hover:bg-[#e05e00] text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? '¡Copiado!' : 'Copiar Código'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Copia este script y pégalo en tu WordPress (en el plugin <strong>WPCode</strong>, <strong>Elementor Custom Code</strong> o en el <strong>Footer</strong> de tu tema).
            </p>

            <div className="bg-slate-900 text-slate-200 font-mono text-xs p-4 rounded-2xl overflow-x-auto leading-relaxed border border-slate-800">
              <pre>{embedScript}</pre>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-3">
              <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={18} />
              <div className="text-xs text-emerald-800 space-y-1">
                <p className="font-bold">Totalmente Autónomo y Seguro</p>
                <p className="text-emerald-700/90 leading-relaxed">
                  El widget no ralentiza tu página web, carga de forma asíncrona y almacena las preguntas de los clientes en tu Dashboard de OneControl automáticamente.
                </p>
              </div>
            </div>
          </div>

          {/* PERSONALIZACIÓN */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Palette size={16} className="text-[#FF6B00]" /> Personalizar Aspecto del Bot Web
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nombre del Asistente:</label>
                <input
                  type="text"
                  value={botName}
                  onChange={e => setBotName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Color Principal:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={botColor}
                    onChange={e => setBotColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={botColor}
                    onChange={e => setBotColor(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">WhatsApp de Respaldo:</label>
                <input
                  type="text"
                  value={waPhone}
                  onChange={e => setWaPhone(e.target.value)}
                  placeholder="35154362"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Mensaje de Bienvenida:</label>
                <textarea
                  rows={2}
                  value={welcomeMsg}
                  onChange={e => setWelcomeMsg(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#FF6B00] resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: SIMULADOR EN VIVO */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Simulador en Tiempo Real</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              ● RAG Activo
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[560px]">
            {/* Header del Widget */}
            <div style={{ backgroundColor: botColor }} className="text-white p-4 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm">{botName}</h4>
                <p className="text-[11px] opacity-90">🟢 En línea · Asesor Inteligente</p>
              </div>
              <div className="p-1.5 bg-white/20 rounded-lg"><Bot size={16} /></div>
            </div>

            {/* Banner WhatsApp */}
            <a
              href={`https://wa.me/502${waPhone}?text=Hola,%20vengo%20de%20onecontrol.shop`}
              target="_blank"
              rel="noreferrer"
              className="text-center text-[11px] font-bold text-emerald-700 bg-emerald-50 py-1.5 px-2 border-b border-emerald-100 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
            >
              <Phone size={11} /> ¿Preferís WhatsApp? Tocá aquí
            </a>

            {/* Mensajes */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 text-xs">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`max-w-[85%] p-3 rounded-2xl ${
                    m.sender === 'user'
                      ? 'ml-auto text-white font-medium rounded-br-xs'
                      : 'mr-auto bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs shadow-xs'
                  }`}
                  style={{ backgroundColor: m.sender === 'user' ? botColor : undefined }}
                >
                  <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                  {m.mediaUrl && (
                    <img
                      src={m.mediaUrl}
                      alt="Producto"
                      className="w-full max-h-36 object-cover rounded-xl mt-2 border border-slate-200"
                    />
                  )}
                </div>
              ))}
              {loading && (
                <div className="mr-auto bg-white p-3 rounded-2xl border border-slate-200/80 rounded-bl-xs text-xs text-slate-400 italic">
                  Escribiendo respuesta...
                </div>
              )}
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder="Escribe: ¿Precio de la mesa One Night?"
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#FF6B00]"
              />
              <button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: botColor }}
                className="w-9 h-9 rounded-xl text-white flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
