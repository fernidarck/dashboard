import { useState, useMemo } from 'react';
import {
  Truck, Search, Check, Clock, Trash2, Phone, Users, Package,
  CheckCircle2, Pencil, Save
} from 'lucide-react';

const fmtQ = (n) => 'Q' + new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(n) || 0);
const parseMoney = (val) => {
  const s = String(val ?? '').replace(/[^0-9.]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

export default function ViewGuias({ guias = [], onUpdateGuia, onDeleteGuia }) {
  const [filtro, setFiltro] = useState('pendientes'); // pendientes | pagadas | todas
  const [q, setQ] = useState('');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const totalPendiente = useMemo(
    () => guias.filter(g => g.estado_pago !== 'Pagado').reduce((s, g) => s + parseMoney(g.monto), 0),
    [guias]
  );
  const totalPagado = useMemo(
    () => guias.filter(g => g.estado_pago === 'Pagado').reduce((s, g) => s + parseMoney(g.monto), 0),
    [guias]
  );

  const lista = useMemo(() => {
    let l = [...guias];
    if (filtro === 'pendientes') l = l.filter(g => g.estado_pago !== 'Pagado');
    else if (filtro === 'pagadas') l = l.filter(g => g.estado_pago === 'Pagado');
    const term = q.trim().toLowerCase();
    if (term) {
      l = l.filter(g =>
        (g.cliente || '').toLowerCase().includes(term) ||
        (g.producto || '').toLowerCase().includes(term) ||
        (g.phone || '').toLowerCase().includes(term) ||
        (g.repartidor || '').toLowerCase().includes(term)
      );
    }
    return l;
  }, [guias, filtro, q]);

  const togglePago = (g) => {
    if (!onUpdateGuia) return;
    onUpdateGuia({ ...g, estado_pago: g.estado_pago === 'Pagado' ? 'Pendiente' : 'Pagado' });
  };

  const startEdit = (g) => { setEditId(g.id); setEditForm({ ...g }); };
  const saveEdit = () => { if (onUpdateGuia) onUpdateGuia(editForm); setEditId(null); };

  const countPend = guias.filter(g => g.estado_pago !== 'Pagado').length;
  const countPag = guias.filter(g => g.estado_pago === 'Pagado').length;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200">
          <Truck className="text-[#FF6B00]" size={22} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 leading-tight">Guías / Cobros</h2>
          <p className="text-[11px] font-bold text-slate-400">Registro de envíos y control de pagos</p>
        </div>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1.5"><Clock size={12} /> Pendiente de cobro</p>
          <p className="text-2xl font-black text-amber-700 mt-1">{fmtQ(totalPendiente)}</p>
          <p className="text-[11px] font-bold text-amber-500">{countPend} guía(s)</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={12} /> Ya cobrado</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{fmtQ(totalPagado)}</p>
          <p className="text-[11px] font-bold text-emerald-500">{countPag} guía(s)</p>
        </div>
      </div>

      {/* Filtros + búsqueda */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'pendientes', label: 'Pendientes' },
            { id: 'pagadas', label: 'Pagadas' },
            { id: 'todas', label: 'Todas' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setFiltro(t.id)}
              className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${filtro === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar cliente, producto, repartidor…"
            className="w-full sm:w-72 pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-[12px] font-semibold outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <Package size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-bold text-sm">No hay guías aquí.</p>
          <p className="text-[12px] mt-1">Cada vez que imprima un sticker, la guía aparece sola en este registro.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {lista.map(g => {
            const pagado = g.estado_pago === 'Pagado';
            const editing = editId === g.id;
            return (
              <div key={g.id} className={`p-4 rounded-2xl border transition-all ${pagado ? 'bg-emerald-50/40 border-emerald-100' : 'bg-white border-slate-200 shadow-xs'}`}>
                {editing ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input value={editForm.cliente || ''} onChange={e => setEditForm({ ...editForm, cliente: e.target.value })} placeholder="Cliente" className="p-2 rounded-lg border border-slate-200 text-[12px] font-bold" />
                      <input value={editForm.monto || ''} onChange={e => setEditForm({ ...editForm, monto: e.target.value })} placeholder="Monto" className="p-2 rounded-lg border border-slate-200 text-[12px] font-bold" />
                      <input value={editForm.producto || ''} onChange={e => setEditForm({ ...editForm, producto: e.target.value })} placeholder="Producto" className="p-2 rounded-lg border border-slate-200 text-[12px] font-semibold col-span-2" />
                      <input value={editForm.repartidor || ''} onChange={e => setEditForm({ ...editForm, repartidor: e.target.value })} placeholder="Repartidor / paquetería" className="p-2 rounded-lg border border-slate-200 text-[12px] font-semibold" />
                      <input value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Teléfono" className="p-2 rounded-lg border border-slate-200 text-[12px] font-semibold" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditId(null)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-black uppercase">Cancelar</button>
                      <button onClick={saveEdit} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-black uppercase flex items-center gap-1"><Save size={12} /> Guardar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{g.id}</span>
                        <span className="font-black text-slate-900 text-sm truncate flex items-center gap-1.5"><Users size={13} className="text-slate-400 shrink-0" />{g.cliente || 'Cliente'}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${pagado ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{pagado ? 'Pagado' : 'Pendiente'}</span>
                      </div>
                      <p className="text-[12px] font-bold text-slate-600 mt-1 truncate flex items-center gap-1.5"><Package size={12} className="text-slate-300 shrink-0" />{g.producto || 'Producto'}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap text-[11px] font-semibold text-slate-400">
                        {g.monto ? <span className="text-emerald-700 font-black text-[13px]">{fmtQ(g.monto)}</span> : null}
                        {g.phone ? <span className="flex items-center gap-1"><Phone size={10} />{g.phone}</span> : null}
                        {g.repartidor ? <span className="flex items-center gap-1"><Truck size={10} />{g.repartidor}</span> : null}
                        {g.timestamp ? <span>{String(g.timestamp).slice(0, 16)}</span> : null}
                        {pagado && g.fecha_pago ? <span className="text-emerald-500">pagado {g.fecha_pago}</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => togglePago(g)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${pagado ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                        title={pagado ? 'Marcar como pendiente' : 'Marcar como pagado'}
                      >
                        {pagado ? <><Clock size={11} /> Pendiente</> : <><Check size={11} /> Pagado</>}
                      </button>
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => startEdit(g)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-600 hover:text-white transition-all" title="Editar"><Pencil size={12} /></button>
                        <button onClick={() => onDeleteGuia?.(g.id)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-rose-600 hover:text-white transition-all" title="Eliminar"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
