import { useState, useMemo } from 'react';
import {
  X, Pencil, Trash2, Users, Phone, Plus, Search,
  ChevronLeft, ChevronRight, CheckCircle2, ShoppingBag,
  DollarSign, Clock, ArrowRight, MessageSquare, Truck, Package,
  ExternalLink, Check
} from 'lucide-react';

function getCleanWhatsAppUrl(phone) {
  if (!phone) return null;
  let clean = String(phone).replace(/\D/g, '');
  if (clean.length === 8) clean = '502' + clean;
  return `https://wa.me/${clean}`;
}

export default function ViewPedidos({
  pedidos = [],
  products = [],
  leads = [],
  onUpdateEstado,
  onSavePedido,
  onDeletePedido,
  onOpenConversation
}) {
  const [editingPedido, setEditingPedido] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!editingPedido.producto?.trim()) {
      alert('Por favor ingresa el nombre del producto');
      return;
    }
    setSaving(true);
    try {
      const ok = await onSavePedido(editingPedido);
      if (ok) setEditingPedido(null);
    } finally {
      setSaving(false);
    }
  };

  const handleNewPedido = () => {
    setEditingPedido({
      cliente: '',
      phone: '',
      producto: '',
      cantidad: '1',
      precio: '',
      notas: '',
      estado: 'Nuevo'
    });
  };

  const handleSelectProduct = (p) => {
    setEditingPedido(prev => ({
      ...prev,
      producto: p.nombre,
      precio: p.precio ? `Q${p.precio}` : prev.precio
    }));
  };

  // Filtrado
  const filteredPedidos = useMemo(() => {
    if (!searchQuery.trim()) return pedidos;
    const q = searchQuery.toLowerCase();
    return pedidos.filter(p =>
      (p.cliente || '').toLowerCase().includes(q) ||
      (p.producto || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q) ||
      (p.notas || '').toLowerCase().includes(q)
    );
  }, [pedidos, searchQuery]);

  const countNuevos = pedidos.filter(p => p.estado === 'Nuevo').length;
  const countProceso = pedidos.filter(p => p.estado === 'En Proceso').length;
  const countCompletados = pedidos.filter(p => p.estado === 'Completado').length;
  const countCancelados = pedidos.filter(p => p.estado === 'Cancelado').length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="text-[#FF6B00]" size={28} /> Pedidos & Entregas IA
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Detección automática por IA en WhatsApp y coordinación de entregas
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={handleNewPedido}
            className="px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e05e00] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>+ Nuevo Pedido</span>
          </button>
        </div>
      </div>

      {/* KPIS DE PEDIDOS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Pedidos</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600"><Package size={16} /></div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{pedidos.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Registrados en el sistema</p>
        </div>

        <div className="bg-white border border-orange-200 bg-gradient-to-br from-orange-50/40 to-white rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-700">Nuevos (Por Coordinar)</span>
            <div className="p-2 rounded-xl bg-orange-100 text-orange-600"><Clock size={16} /></div>
          </div>
          <p className="text-3xl font-black text-[#FF6B00] mt-2">{countNuevos}</p>
          <p className="text-[11px] text-orange-600/80 mt-1">Requieren confirmación</p>
        </div>

        <div className="bg-white border border-blue-200 bg-gradient-to-br from-blue-50/40 to-white rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">En Proceso / En Ruta</span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600"><Truck size={16} /></div>
          </div>
          <p className="text-3xl font-black text-blue-600 mt-2">{countProceso}</p>
          <p className="text-[11px] text-blue-600/80 mt-1">Fabricación o en camino</p>
        </div>

        <div className="bg-white border border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Completados</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600"><CheckCircle2 size={16} /></div>
          </div>
          <p className="text-3xl font-black text-emerald-600 mt-2">{countCompletados}</p>
          <p className="text-[11px] text-emerald-600/80 mt-1">Entregados y cobrados</p>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3">
        <Search size={18} className="text-slate-400 shrink-0 ml-1" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar pedido por cliente, producto, teléfono o dirección..."
          className="w-full text-xs font-medium text-slate-800 placeholder-slate-400 outline-none bg-transparent"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2">
            Limpiar
          </button>
        )}
      </div>

      {/* TABLERO KANBAN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {[
          { key: 'Nuevo', title: 'Nuevos', color: 'border-orange-200 bg-orange-50/30', badge: 'bg-orange-100 text-orange-700' },
          { key: 'En Proceso', title: 'En Proceso / Ruta', color: 'border-blue-200 bg-blue-50/30', badge: 'bg-blue-100 text-blue-700' },
          { key: 'Completado', title: 'Entregados', color: 'border-emerald-200 bg-emerald-50/30', badge: 'bg-emerald-100 text-emerald-700' }
        ].map(({ key, title, color, badge }) => {
          const colPedidos = filteredPedidos.filter(p => p.estado === key);
          return (
            <div key={key} className={`rounded-3xl p-5 border ${color} min-h-[60vh] flex flex-col space-y-4`}>
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">{title}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${badge}`}>{colPedidos.length}</span>
              </div>

              <div className="space-y-3.5 overflow-y-auto max-h-[70vh] pr-1">
                {colPedidos.map(pedido => {
                  const waUrl = getCleanWhatsAppUrl(pedido.phone);
                  const matchingLead = leads.find(l => l.phone && String(l.phone).replace(/\D/g, '') === String(pedido.phone).replace(/\D/g, ''));

                  return (
                    <div key={pedido.id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-3 group">
                      
                      {/* Top Bar */}
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          #{pedido.id}
                        </span>
                        <div className="flex items-center space-x-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingPedido({ ...pedido })}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
                            title="Editar pedido"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => onDeletePedido(pedido.id)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
                            title="Eliminar pedido"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Producto y Precio */}
                      <div>
                        <h4 className="text-sm font-black text-slate-900 leading-snug">{pedido.producto}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {pedido.precio && (
                            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {pedido.precio}
                            </span>
                          )}
                          <span className="text-[11px] font-bold text-slate-500">
                            Cant: {pedido.cantidad || '1'}
                          </span>
                        </div>
                      </div>

                      {/* Cliente & Contacto */}
                      <div className="space-y-1 pt-1 border-t border-slate-100 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Users size={12} className="text-slate-400" />
                            {pedido.cliente || 'Cliente'}
                          </span>
                          {matchingLead && onOpenConversation && (
                            <button
                              onClick={() => onOpenConversation(matchingLead.id)}
                              className="text-[10px] font-bold text-[#FF6B00] hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <MessageSquare size={10} /> Chat
                            </button>
                          )}
                        </div>

                        {pedido.phone && (
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <Phone size={11} className="text-slate-400" />
                              {pedido.phone}
                            </span>
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5"
                              >
                                WhatsApp <ExternalLink size={9} />
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Notas / Dirección */}
                      {pedido.notas && (
                        <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-600 font-medium leading-relaxed">
                          {pedido.notas}
                        </div>
                      )}

                      {/* Acciones de Estado */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          {key !== 'Nuevo' && (
                            <button
                              onClick={() => onUpdateEstado(pedido.id, key === 'Completado' ? 'En Proceso' : 'Nuevo')}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                              title="Regresar estado"
                            >
                              <ChevronLeft size={14} />
                            </button>
                          )}
                          {key !== 'Completado' && (
                            <button
                              onClick={() => onUpdateEstado(pedido.id, key === 'Nuevo' ? 'En Proceso' : 'Completado')}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-[#FF6B00] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            >
                              <span>{key === 'Nuevo' ? 'A Proceso' : 'Completar'}</span>
                              <ChevronRight size={12} />
                            </button>
                          )}
                        </div>

                        <span className="text-[10px] text-slate-400 font-medium">
                          {pedido.timestamp?.slice(5, 16) || ''}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {colPedidos.length === 0 && (
                  <div className="py-12 text-center bg-white/60 border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-xs font-bold text-slate-400">Sin pedidos en esta etapa</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: CREAR / EDITAR PEDIDO */}
      {editingPedido && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingPedido.id ? `Editar Pedido #${editingPedido.id}` : 'Crear Nuevo Pedido'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Ingresa los datos para coordinar el despacho del producto.</p>
              </div>
              <button
                onClick={() => setEditingPedido(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              
              {/* Selector Rápido de Catálogo si es nuevo */}
              {products.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Seleccionar Producto del Catálogo:</label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
                    {products.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProduct(p)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          editingPedido.producto === p.nombre
                            ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300'
                        }`}
                      >
                        {p.nombre} {p.precio ? `(Q${p.precio})` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Nombre de Producto */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Producto / Modelo:</label>
                <input
                  type="text"
                  required
                  value={editingPedido.producto || ''}
                  onChange={e => setEditingPedido({ ...editingPedido, producto: e.target.value })}
                  placeholder="Ej: Mesa de noche modelo One Night"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              {/* Precio y Cantidad */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Precio (Q):</label>
                  <input
                    type="text"
                    value={editingPedido.precio || ''}
                    onChange={e => setEditingPedido({ ...editingPedido, precio: e.target.value })}
                    placeholder="Ej: Q1,000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Cantidad:</label>
                  <input
                    type="text"
                    value={editingPedido.cantidad || '1'}
                    onChange={e => setEditingPedido({ ...editingPedido, cantidad: e.target.value })}
                    placeholder="1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              {/* Cliente y Teléfono */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Nombre Cliente:</label>
                  <input
                    type="text"
                    value={editingPedido.cliente || ''}
                    onChange={e => setEditingPedido({ ...editingPedido, cliente: e.target.value })}
                    placeholder="Nombre completo"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Teléfono WhatsApp:</label>
                  <input
                    type="text"
                    value={editingPedido.phone || ''}
                    onChange={e => setEditingPedido({ ...editingPedido, phone: e.target.value })}
                    placeholder="35154362"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              {/* Notas / Dirección */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Dirección de Entrega / Notas:</label>
                <textarea
                  rows={3}
                  value={editingPedido.notas || ''}
                  onChange={e => setEditingPedido({ ...editingPedido, notas: e.target.value })}
                  placeholder="Dirección completa, zona, municipio, pago contra entrega..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#FF6B00] resize-none"
                />
              </div>

              {/* Estado */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Estado del Pedido:</label>
                <select
                  value={editingPedido.estado || 'Nuevo'}
                  onChange={e => setEditingPedido({ ...editingPedido, estado: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#FF6B00] bg-white cursor-pointer"
                >
                  <option value="Nuevo">Nuevo (Por Coordinar)</option>
                  <option value="En Proceso">En Proceso / En Ruta</option>
                  <option value="Completado">Completado (Entregado)</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingPedido(null)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-2xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{saving ? 'Guardando...' : 'Guardar Pedido'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
