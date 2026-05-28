import { useState } from 'react';
import {
  Search, X, UserCircle, Phone, Pencil, Trash2, Archive,
  Power, Database, MessageSquare, Tag, Bot
} from 'lucide-react';

function ClientSidebarPanel({ lead, onClose, onToggleBot, onArchive, onDeleteMessages, onEditLead }) {
  if (!lead) return null;
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
            onClick={() => onToggleBot(lead.id, !lead.botActive)}
            className={`p-4 rounded-2xl border flex flex-col items-center justify-center transition-all ${lead.botActive ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}
          >
            <p className="text-[9px] font-black uppercase mb-1">Estado Bot</p>
            <div className="flex items-center space-x-1">
              <Power size={12} />
              <p className="text-[10px] font-black uppercase">{lead.botActive ? 'ENCENDIDO' : 'APAGADO'}</p>
            </div>
          </button>
        </div>
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
        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Etiquetas</label>
          <div className="flex flex-wrap gap-2">
            {(lead.etiquetas || '').split(',').filter(e => e.trim()).map((tag, i) => (
              <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-slate-200 hover:bg-[#FF6B00] hover:text-white hover:border-[#FF6B00] transition-all cursor-default">
                {tag.trim()}
              </span>
            ))}
            <button onClick={() => onEditLead(lead)} className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-emerald-100 hover:bg-emerald-100 transition-all">
              + Gestionar
            </button>
          </div>
        </div>
        <div className="pt-6 border-t border-slate-100 space-y-3">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">WhatsApp ID</p>
            <p className="text-[11px] font-bold text-slate-800 tabular-nums">{lead.whatsapp_id || lead.phone || '—'}</p>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Registrado</p>
            <p className="text-[11px] font-bold text-slate-800">{lead.time || lead.timestamp || '—'}</p>
          </div>
        </div>
        <div className="space-y-3 pt-6 border-t border-slate-100">
          <button onClick={() => onArchive(lead.id, lead.archived)} className="w-full py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg shadow-slate-200 hover:bg-black transition-all active:scale-95">
            <Archive size={14} className="text-amber-400" />
            <span>{lead.archived ? 'Restaurar Lead' : 'Archivar conversación'}</span>
          </button>
          <button onClick={() => onDeleteMessages(lead.id)} className="w-full py-3.5 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 border border-red-100 hover:bg-red-100 transition-all active:scale-95">
            <Trash2 size={14} />
            <span>Eliminar conversación</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ViewCRM({ leads, onUpdateLead, onToggleBot, onArchive, onDeleteMessages }) {
  const [sidebarLeadId, setSidebarLeadId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  const sidebarLead = leads.find(l => l.id === sidebarLeadId);

  const handleSave = () => {
    onUpdateLead(editingLead);
    setEditingLead(null);
  };

  return (
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
              onClick={() => setShowSidebar(!showSidebar)}
              className={`p-2.5 rounded-xl border transition-all ${showSidebar ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-lg shadow-orange-100' : 'bg-white text-slate-400 border-slate-200 shadow-sm'}`}
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
                  onClick={() => { setSidebarLeadId(lead.id); setShowSidebar(true); }}
                  className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${sidebarLeadId === lead.id && showSidebar ? 'bg-emerald-50/30' : ''}`}
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

        {showSidebar && sidebarLead && (
          <ClientSidebarPanel
            lead={sidebarLead}
            onClose={() => setShowSidebar(false)}
            onToggleBot={onToggleBot}
            onArchive={onArchive}
            onDeleteMessages={onDeleteMessages}
            onEditLead={(lead) => setEditingLead({ ...lead })}
          />
        )}
      </div>

      {/* Modal: Editar Lead */}
      {editingLead && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Gestionar Datos de Cliente</h3>
              <button onClick={() => setEditingLead(null)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800"><X size={20} /></button>
            </div>
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                {[
                  { label: 'Nombre Completo', key: 'nombre', type: 'text' },
                  { label: 'Teléfono / WhatsApp', key: 'phone', type: 'text' },
                  { label: 'Email', key: 'email', type: 'email' },
                ].map(({ label, key, type }) => (
                  <div key={key} className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{label}</label>
                    <input type={type} value={editingLead[key] || ''} onChange={e => setEditingLead({...editingLead, [key]: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" />
                  </div>
                ))}
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
                <input type="text" value={editingLead.etiquetas || ''} onChange={e => setEditingLead({...editingLead, etiquetas: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" placeholder="Interesado, Urgente, Motor BFT..." />
              </div>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { label: 'NIT / Datos Factura', key: 'nit' },
                  { label: 'Dirección', key: 'direccion' },
                ].map(({ label, key }) => (
                  <div key={key} className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{label}</label>
                    <input type="text" value={editingLead[key] || ''} onChange={e => setEditingLead({...editingLead, [key]: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Notas Internas</label>
                <textarea rows={4} value={editingLead.notas || ''} onChange={e => setEditingLead({...editingLead, notas: e.target.value})} className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-3xl text-xs font-medium leading-relaxed outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all resize-none italic" placeholder="Notas sobre el cliente..." />
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
              <button onClick={handleSave} className="w-full py-5 bg-slate-900 text-white rounded-[28px] text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200 hover:bg-[#FF6B00] transition-all active:scale-95">Guardar Perfil de Cliente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
