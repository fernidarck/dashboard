import { useState, useMemo } from 'react';
import {
  X, Pencil, Trash2, Users, Phone, Plus, Search,
  ChevronLeft, ChevronRight, CheckCircle2, ShoppingBag,
  DollarSign, Clock, ArrowRight, MessageSquare, Truck, Package,
  ExternalLink, Check, Calendar, CalendarPlus, CalendarClock
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
      fecha_entrega: '',
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
      (p.notas || '').toLowerCase().includes(q) ||
      (p.fecha_entrega || '').toLowerCase().includes(q)
    );
  }, [pedidos, searchQuery]);

  const countNuevos = pedidos.filter(p => p.estado === 'Nuevo').length;
  const countVisitas = pedidos.filter(p => p.estado === 'Visita Programada').length;
  const countProceso = pedidos.filter(p => p.estado === 'En Proceso').length;
  const countCompletados = pedidos.filter(p => p.estado === 'Completado').length;

  const KANBAN_COLUMNS = [
    {
      key: 'Nuevo',
      title: 'Por Coordinar',
      subtitle: 'Nuevos pedidos',
      color: 'border-orange-200 bg-orange-50/20',
      badge: 'bg-orange-100 text-orange-700',
      icon: Clock
    },
    {
      key: 'Visita Programada',
      title: 'Visita / Entrega',
      subtitle: 'Con fecha agendada',
      color: 'border-amber-200 bg-amber-50/25',
      badge: 'bg-amber-100 text-amber-800',
      icon: Calendar
    },
    {
      key: 'En Proceso',
      title: 'En Ruta / Proceso',
      subtitle: 'Fabricación o despacho',
      color: 'border-blue-200 bg-blue-50/20',
      badge: 'bg-blue-100 text-blue-700',
      icon: Truck
    },
    {
      key: 'Completado',
      title: 'Entregados',
      subtitle: 'Cobrados con éxito',
      color: 'border-emerald-200 bg-emerald-50/20',
      badge: 'bg-emerald-100 text-emerald-700',
      icon: CheckCircle2
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-7 animate-in fade-in duration-500 pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="text-[#FF6B00]" size={28} /> Pedidos & Entregas IA
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Programación de visitas, días de entrega y control de despachos en tiempo real
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total</span>
            <div className="p-1.5 rounded-xl bg-slate-100 text-slate-600"><Package size={15} /></div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{pedidos.length}</p>
          <p className="text-[10.5px] text-slate-400 mt-0.5">En el sistema</p>
        </div>

        <div className="bg-white border border-orange-200 bg-gradient-to-br from-orange-50/40 to-white rounded-3xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-700">Por Coordinar</span>
            <div className="p-1.5 rounded-xl bg-orange-100 text-orange-600"><Clock size={15} /></div>
          </div>
          <p className="text-2xl font-black text-[#FF6B00] mt-2">{countNuevos}</p>
          <p className="text-[10.5px] text-orange-600/80 mt-0.5">Nuevos sin fecha</p>
        </div>

        <div className="bg-white border border-amber-200 bg-gradient-to-br from-amber-50/50 to-white rounded-3xl p-4 shadow-xs ring-1 ring-amber-300/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">Visita / Entrega</span>
            <div className="p-1.5 rounded-xl bg-amber-100 text-amber-700"><Calendar size={15} /></div>
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">{countVisitas}</p>
          <p className="text-[10.5px] text-amber-700/80 mt-0.5">Con fecha agendada</p>
        </div>

        <div className="bg-white border border-blue-200 bg-gradient-to-br from-blue-50/40 to-white rounded-3xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">En Ruta / Proceso</span>
            <div className="p-1.5 rounded-xl bg-blue-100 text-blue-600"><Truck size={15} /></div>
          </div>
          <p className="text-2xl font-black text-blue-600 mt-2">{countProceso}</p>
          <p className="text-[10.5px] text-blue-600/80 mt-0.5">En camino o taller</p>
        </div>

        <div className="bg-white border border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white rounded-3xl p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Entregados</span>
            <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-600"><CheckCircle2 size={15} /></div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{countCompletados}</p>
          <p className="text-[10.5px] text-emerald-600/80 mt-0.5">Finalizados</p>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3">
        <Search size={18} className="text-slate-400 shrink-0 ml-1" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por cliente, producto, teléfono, notas o día de visita (ej: Miércoles)..."
          className="w-full text-xs font-medium text-slate-800 placeholder-slate-400 outline-none bg-transparent"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 cursor-pointer">
            Limpiar
          </button>
        )}
      </div>

      {/* TABLERO KANBAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4.5 items-start">
        {KANBAN_COLUMNS.map(({ key, title, subtitle, color, badge, icon: IconComponent }) => {
          const colPedidos = filteredPedidos.filter(p => p.estado === key);
          return (
            <div key={key} className={`rounded-3xl p-4 sm:p-5 border ${color} min-h-[60vh] flex flex-col space-y-4 shadow-xs`}>
              {/* Columna Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-xl ${badge}`}>
                    <IconComponent size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 leading-none">{title}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-black ${badge}`}>{colPedidos.length}</span>
              </div>

              {/* Lista de Tarjetas */}
              <div className="space-y-3.5 overflow-y-auto max-h-[72vh] pr-0.5">
                {colPedidos.map(pedido => {
                  const waUrl = getCleanWhatsAppUrl(pedido.phone);
                  const matchingLead = leads.find(l => l.phone && String(l.phone).replace(/\D/g, '') === String(pedido.phone).replace(/\D/g, ''));

                  return (
                    <div key={pedido.id} className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-3 group">
                      
                      {/* Top Bar */}
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          #{pedido.id}
                        </span>

                        <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingPedido({ ...pedido })}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
                            title="Editar pedido y fecha"
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
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {pedido.precio && (
                            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {pedido.precio}
                            </span>
                          )}
                          <span className="text-[11px] font-bold text-slate-500">
                            Cant: {pedido.cantidad || '1'}
                          </span>
                        </div>
                      </div>

                      {/* CHIP DESTACADO: FECHA DE VISITA / ENTREGA */}
                      {pedido.fecha_entrega ? (
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50/90 border border-amber-200/90 text-amber-900 text-xs">
                          <div className="flex items-center gap-1.5 font-bold truncate">
                            <Calendar size={14} className="text-amber-600 shrink-0" />
                            <span className="truncate">
                              Visita / Entrega: <strong className="text-amber-950 font-black underline decoration-amber-300">{pedido.fecha_entrega}</strong>
                            </span>
                          </div>
                          <button
                            onClick={() => setEditingPedido({ ...pedido })}
                            className="text-[10px] text-amber-700 hover:text-amber-950 font-black ml-1.5 shrink-0 hover:underline cursor-pointer"
                            title="Cambiar fecha de entrega"
                          >
                            Editar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingPedido({ ...pedido })}
                          className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-amber-50/50 hover:bg-amber-100/50 border border-dashed border-amber-200 transition-colors w-full cursor-pointer"
                        >
                          <CalendarPlus size={13} className="text-amber-600" />
                          <span>+ Asignar día/fecha de visita</span>
                        </button>
                      )}

                      {/* Cliente & Contacto */}
                      <div className="space-y-1 pt-1 border-t border-slate-100 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate max-w-[160px]">
                            <Users size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{pedido.cliente || 'Cliente'}</span>
                          </span>
                          {matchingLead && onOpenConversation && (
                            <button
                              onClick={() => onOpenConversation(matchingLead.id)}
                              className="text-[10px] font-bold text-[#FF6B00] hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
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

                      {/* Acciones de Estado Dinámicas */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                        <div className="flex items-center space-x-1">
                          {/* Retroceder estado */}
                          {key === 'Visita Programada' && (
                            <button
                              onClick={() => onUpdateEstado(pedido.id, 'Nuevo')}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                              title="Regresar a Por Coordinar"
                            >
                              <ChevronLeft size={13} />
                            </button>
                          )}
                          {key === 'En Proceso' && (
                            <button
                              onClick={() => onUpdateEstado(pedido.id, pedido.fecha_entrega ? 'Visita Programada' : 'Nuevo')}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                              title="Regresar estado"
                            >
                              <ChevronLeft size={13} />
                            </button>
                          )}
                          {key === 'Completado' && (
                            <button
                              onClick={() => onUpdateEstado(pedido.id, 'En Proceso')}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                              title="Regresar a En Proceso"
                            >
                              <ChevronLeft size={13} />
                            </button>
                          )}

                          {/* Avanzar estado */}
                          {key === 'Nuevo' && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => onUpdateEstado(pedido.id, 'Visita Programada')}
                                className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                title="Pasar a Visita Programada"
                              >
                                <span>A Visita</span>
                                <ChevronRight size={11} />
                              </button>
                              <button
                                onClick={() => onUpdateEstado(pedido.id, 'En Proceso')}
                                className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                title="Pasar directo a En Proceso"
                              >
                                <span>Ruta</span>
                              </button>
                            </div>
                          )}

                          {key === 'Visita Programada' && (
                            <button
                              onClick={() => onUpdateEstado(pedido.id, 'En Proceso')}
                              className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            >
                              <span>A Ruta</span>
                              <ChevronRight size={11} />
                            </button>
                          )}

                          {key === 'En Proceso' && (
                            <button
                              onClick={() => onUpdateEstado(pedido.id, 'Completado')}
                              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            >
                              <span>Completar</span>
                              <ChevronRight size={11} />
                            </button>
                          )}
                        </div>

                        {/* Selector directo de estado rápido */}
                        <select
                          value={pedido.estado}
                          onChange={(e) => onUpdateEstado(pedido.id, e.target.value)}
                          className="text-[9px] font-black text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-1.5 py-0.5 cursor-pointer outline-none transition-colors"
                        >
                          <option value="Nuevo">Nuevo</option>
                          <option value="Visita Programada">Visita</option>
                          <option value="En Proceso">Ruta</option>
                          <option value="Completado">Entregado</option>
                          <option value="Cancelado">Cancelado</option>
                        </select>
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
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingPedido.id ? `Editar Pedido #${editingPedido.id}` : 'Crear Nuevo Pedido'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Ingresa los datos para coordinar el despacho o visita del producto.</p>
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

              {/* SECCIÓN ESPECIAL: FECHA / DÍA DE VISITA O ENTREGA */}
              <div className="space-y-2 p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/90">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <Calendar size={14} className="text-amber-600" />
                    Día o Fecha de Visita / Entrega:
                  </label>
                  {editingPedido.fecha_entrega && (
                    <button
                      type="button"
                      onClick={() => setEditingPedido({ ...editingPedido, fecha_entrega: '' })}
                      className="text-[10px] text-amber-700 hover:text-amber-950 font-bold underline cursor-pointer"
                    >
                      Quitar fecha
                    </button>
                  )}
                </div>

                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={editingPedido.fecha_entrega || ''}
                    onChange={e => setEditingPedido({ ...editingPedido, fecha_entrega: e.target.value })}
                    placeholder="Ej: Miércoles, o Miércoles por la mañana..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  />
                  {/* Selector rápido tipo calendario nativo */}
                  <input
                    type="date"
                    onChange={e => {
                      if (e.target.value) {
                        const [y, m, d] = e.target.value.split('-');
                        const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
                        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                        const dayName = dayNames[dateObj.getDay()];
                        const formatted = `${dayName} (${d}/${m})`;
                        setEditingPedido(prev => ({
                          ...prev,
                          fecha_entrega: formatted,
                          estado: prev.estado === 'Nuevo' ? 'Visita Programada' : prev.estado
                        }));
                      }
                    }}
                    className="px-2.5 py-2.5 rounded-xl border border-amber-300 bg-white text-xs text-slate-700 cursor-pointer focus:outline-none"
                    title="Elegir fecha del calendario"
                  />
                </div>

                {/* Presets rápidos para 1 clic */}
                <div className="pt-1">
                  <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block mb-1.5">
                    Asignar día rápido:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Miércoles', 'Hoy', 'Mañana', 'Jueves', 'Viernes', 'Sábado'].map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setEditingPedido(prev => ({
                            ...prev,
                            fecha_entrega: day,
                            estado: prev.estado === 'Nuevo' ? 'Visita Programada' : prev.estado
                          }));
                        }}
                        className={`text-[11px] font-black px-3 py-1 rounded-xl border transition-all cursor-pointer ${
                          editingPedido.fecha_entrega === day
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100/60'
                        }`}
                      >
                        {day === 'Miércoles' ? '⭐ Miércoles' : day}
                      </button>
                    ))}
                  </div>
                </div>
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
                  <option value="Nuevo">1. Por Coordinar (Nuevo)</option>
                  <option value="Visita Programada">2. Visita / Entrega Programada 🗓️</option>
                  <option value="En Proceso">3. En Proceso / En Ruta</option>
                  <option value="Completado">4. Completado (Entregado)</option>
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
