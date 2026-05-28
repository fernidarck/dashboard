import { useState } from 'react';
import {
  Search, X, AlertTriangle, Bot, Power, Database,
  MoreVertical, SendHorizontal, Tag, Zap
} from 'lucide-react';

export default function ViewConversaciones({
  leads, messages, selectedChatId, selectedLead,
  onSelectChat, onSendMessage, onToggleBot,
  messagesContainerRef, messagesEndRef
}) {
  const [messageText, setMessageText] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);

  const handleSend = async () => {
    if (!messageText.trim()) return;
    const text = messageText;
    setMessageText('');
    await onSendMessage(selectedChatId, text);
  };

  return (
    <div className="flex h-full animate-in fade-in duration-500 bg-white border-t border-slate-100">
      {/* Lead list */}
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
            <button key={lead.id} onClick={() => onSelectChat(lead.id)} className={`w-full p-6 text-left hover:bg-slate-50 transition-all relative ${selectedChatId === lead.id ? 'bg-emerald-50/20' : ''} ${lead.priority === 'urgent' ? 'bg-red-50/60 border-l-4 border-red-500' : ''}`}>
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
                <p className="text-[9px] text-red-500 font-bold italic truncate mt-1 leading-none">⚠️ {lead.handoff_reason}</p>
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

      {/* Chat area */}
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
              onClick={() => onToggleBot(selectedLead.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                selectedLead.botActive
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
              }`}
            >
              <Power size={14} />
              <span>{selectedLead.botActive ? 'Desactivar Bot' : 'Activar Bot'}</span>
            </button>
            <button onClick={() => setShowSidebar(!showSidebar)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"><Database size={18} /></button>
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
                  <img src={m.mediaUrl} alt="imagen" className="w-full max-w-xs rounded-t-2xl object-cover cursor-pointer" onClick={() => window.open(m.mediaUrl, '_blank')} />
                )}
                {m.text && <p className="px-4 py-3">{m.text}</p>}
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
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-transparent px-4 py-2 text-xs outline-none"
            />
            <button onClick={handleSend} className="p-3 bg-slate-900 text-[#FF6B00] rounded-xl hover:bg-[#FF6B00] hover:text-white transition-all"><SendHorizontal size={18} /></button>
          </div>
        </div>
      </div>

      {/* Lead sidebar (chat view) */}
      {showSidebar && (
        <div className="w-80 border-l border-slate-100 p-6 space-y-8 animate-in slide-in-from-right-4 duration-500 bg-white">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest italic">Perfil del Lead</h3>
            <button onClick={() => setShowSidebar(false)} className="text-slate-400 hover:text-slate-800"><X size={16} /></button>
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
  );
}
