import { useState } from 'react';
import {
  X, Pencil, Trash2, Users, Phone,
  ChevronLeft, ChevronRight, CheckCircle2
} from 'lucide-react';

export default function ViewPedidos({ pedidos, onUpdateEstado, onSavePedido, onDeletePedido }) {
  const [editingPedido, setEditingPedido] = useState(null);

  const handleSave = async () => {
    const ok = await onSavePedido(editingPedido);
    if (ok) setEditingPedido(null);
  };

  return (
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
            <div className="space-y-4 overflow-y-auto max-h-[65vh] pr-2">
              {pedidos.filter(p => p.estado === col).map(pedido => (
                <div key={pedido.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">#{pedido.id}</span>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => setEditingPedido({ ...pedido })} className="h-8 w-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all"><Pencil size={13} /></button>
                      <button onClick={() => onDeletePedido(pedido.id)} className="h-8 w-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 mb-1">{pedido.producto}</h4>
                  <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-500 mb-1">
                    <Users size={12} className="text-slate-300" />
                    <span>{pedido.cliente}</span>
                  </div>
                  {pedido.phone && (
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 mb-3">
                      <Phone size={10} className="text-slate-300" />
                      <span>{pedido.phone}</span>
                    </div>
                  )}
                  {pedido.notas && (
                    <p className="text-[10px] text-slate-400 italic leading-relaxed mb-4 line-clamp-2">{pedido.notas}</p>
                  )}
                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {col !== 'Nuevo' && (
                        <button onClick={() => onUpdateEstado(pedido.id, col === 'Completado' ? 'En Proceso' : 'Nuevo')} className="h-8 w-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-orange-50 hover:text-orange-500 transition-colors border border-slate-100"><ChevronLeft size={14} /></button>
                      )}
                      {col !== 'Completado' && (
                        <button onClick={() => onUpdateEstado(pedido.id, col === 'Nuevo' ? 'En Proceso' : 'Completado')} className="h-8 px-4 rounded-full bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest flex items-center justify-center hover:bg-[#FF6B00] transition-all shadow-sm">
                          Siguiente <ChevronRight size={12} className="ml-1" />
                        </button>
                      )}
                    </div>
                    {col === 'Completado' && (
                      <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100"><CheckCircle2 size={14} /></div>
                    )}
                    <span className="text-[9px] text-slate-300 italic">{pedido.timestamp?.slice(5,16)}</span>
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

      {/* Modal: Editar pedido */}
      {editingPedido && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md p-8 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Editar Pedido #{editingPedido.id}</h3>
              <button onClick={() => setEditingPedido(null)} className="h-8 w-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200 transition-colors"><X size={14} /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Producto', key: 'producto' },
                { label: 'Cliente', key: 'cliente' },
                { label: 'Teléfono', key: 'phone' },
                { label: 'Cantidad', key: 'cantidad' },
                { label: 'Precio', key: 'precio' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">{label}</label>
                  <input type="text" value={editingPedido[key] || ''} onChange={e => setEditingPedido({ ...editingPedido, [key]: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
                </div>
              ))}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Notas</label>
                <textarea rows={3} value={editingPedido.notas || ''} onChange={e => setEditingPedido({ ...editingPedido, notas: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#FF6B00]/30 resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Estado</label>
                <select value={editingPedido.estado || 'Nuevo'} onChange={e => setEditingPedido({ ...editingPedido, estado: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#FF6B00]/30">
                  {['Nuevo', 'En Proceso', 'Completado', 'Cancelado'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex space-x-3 pt-2">
              <button onClick={() => setEditingPedido(null)} className="flex-1 py-3 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={handleSave} className="flex-1 py-3 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#FF6B00] transition-all">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
