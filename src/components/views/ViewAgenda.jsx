import { useState } from 'react';
import { Plus, Calendar, ChevronRight, Zap, X } from 'lucide-react';

const emptyCita = {
  cliente: '', phone: '', fecha: '', hora: '',
  servicio: '', duracion: '1 hora', estado: 'Pendiente'
};

function MonthView({ agenda }) {
  const days = Array.from({length: 31}, (_, i) => i + 1);
  return (
    <div className="grid grid-cols-7 gap-4 animate-in zoom-in-95 duration-500">
      {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(d => (
        <div key={d} className="text-center py-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">{d}</div>
      ))}
      {days.map(d => {
        const hasCitas = agenda.some(c => new Date(c.fecha).getDate() === d);
        return (
          <div key={d} className="aspect-square bg-white rounded-3xl border border-slate-100 p-3 relative hover:border-[#FF6B00]/30 transition-all cursor-pointer group">
            <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-800">{d}</span>
            {hasCitas && <div className="absolute bottom-3 right-3 h-2 w-2 bg-[#FF6B00] rounded-full shadow-lg shadow-orange-100" />}
          </div>
        );
      })}
    </div>
  );
}

export default function ViewAgenda({ agenda, onCreateCita, onDeleteCita }) {
  const [agendaView, setAgendaView] = useState('Lista');
  const [showNewCita, setShowNewCita] = useState(false);
  const [newCita, setNewCita] = useState(emptyCita);

  const handleCreate = async () => {
    if (!newCita.cliente.trim() || !newCita.fecha) return;
    const ok = await onCreateCita(newCita);
    if (ok) {
      setNewCita(emptyCita);
      setShowNewCita(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">Agenda IA</h2>
          <div className="flex space-x-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
            <button onClick={() => setAgendaView('Calendario')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${agendaView === 'Calendario' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Calendario</button>
            <button onClick={() => setAgendaView('Lista')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${agendaView === 'Lista' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Lista</button>
          </div>
        </div>
        <button onClick={() => setShowNewCita(true)} className="bg-slate-900 text-white px-8 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-[#FF6B00] transition-all flex items-center space-x-2">
          <Plus size={16} /><span>Agendar Servicio</span>
        </button>
      </div>

      {agendaView === 'Calendario' ? (
        <MonthView agenda={agenda} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agenda.map(cita => (
            <div key={cita.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all duration-500 group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-900 group-hover:rotate-12 transition-transform">
                <Calendar size={60} />
              </div>
              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl">
                    <p className="text-[10px] font-black uppercase italic leading-none">{cita.fecha}</p>
                    <p className="text-sm font-black italic">{cita.hora}</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-emerald-100">{cita.estado}</span>
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-800 uppercase italic truncate mb-1">{cita.cliente}</h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center space-x-2">
                    <Zap size={10} className="text-[#FF6B00]" />
                    <span>{cita.servicio}</span>
                  </p>
                </div>
                <div className="flex items-center space-x-4 pt-4 border-t border-slate-50">
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">WhatsApp</p>
                    <p className="text-[11px] font-bold text-slate-800 tabular-nums">{cita.phone}</p>
                  </div>
                  <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800 transition-colors"><ChevronRight size={18} /></button>
                </div>
              </div>
            </div>
          ))}
          {agenda.length === 0 && (
            <div className="col-span-3 py-20 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin citas agendadas</p>
            </div>
          )}
        </div>
      )}

      {/* Modal: Nueva Cita */}
      {showNewCita && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Nueva Cita de Servicio</h3>
              <button onClick={() => setShowNewCita(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800"><X size={20} /></button>
            </div>
            <div className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Cliente', key: 'cliente', placeholder: 'Nombre del cliente' },
                  { label: 'Teléfono', key: 'phone', placeholder: '+502...' },
                  { label: 'Fecha', key: 'fecha', type: 'date' },
                  { label: 'Hora', key: 'hora', type: 'time' },
                  { label: 'Servicio', key: 'servicio', placeholder: 'Instalación, mantenimiento...' },
                  { label: 'Duración', key: 'duracion', placeholder: '1 hora' },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key} className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{label}</label>
                    <input
                      type={type || 'text'}
                      value={newCita[key]}
                      onChange={e => setNewCita({...newCita, [key]: e.target.value})}
                      placeholder={placeholder}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all"
                    />
                  </div>
                ))}
              </div>
              <button onClick={handleCreate} className="w-full py-5 bg-slate-900 text-white rounded-[28px] text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200 hover:bg-[#FF6B00] transition-all active:scale-95">Confirmar Cita</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
