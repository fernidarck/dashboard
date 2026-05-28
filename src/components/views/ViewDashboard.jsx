import { Target, Calendar, TrendingUp, AlertTriangle, Zap, Brain } from 'lucide-react';

export default function ViewDashboard({ leads, agenda, stats, onOpenConversation, onConfigureAgent }) {
  const totalLeads = leads.length;
  const urgentLeads = leads.filter(l => l.priority === 'urgent').length;
  const avgScore = totalLeads > 0
    ? Math.round(leads.reduce((sum, l) => sum + (l.score || 0), 0) / totalLeads)
    : 0;
  const botMessages = stats.botMessages || 0;
  const horasAhorradas = Math.max(1, Math.round((botMessages * 5) / 60));

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic">Resumen Elite</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Gestión de impacto y conversiones</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { l: 'Tus Leads',       v: totalLeads,      i: Target,        c: 'text-blue-600',    bg: 'bg-blue-50' },
          { l: 'Citas Activas',   v: agenda.length,   i: Calendar,      c: 'text-emerald-600', bg: 'bg-emerald-50' },
          { l: 'Score Promedio',  v: `${avgScore}%`,  i: TrendingUp,    c: 'text-indigo-600',  bg: 'bg-indigo-50' },
          {
            l: urgentLeads > 0 ? '🚨 Intervenciones' : 'Estado del Bot',
            v: urgentLeads > 0 ? urgentLeads : '✅ OK',
            i: urgentLeads > 0 ? AlertTriangle : Zap,
            c: urgentLeads > 0 ? 'text-red-500' : 'text-[#FF6B00]',
            bg: urgentLeads > 0 ? 'bg-red-50' : 'bg-orange-50'
          },
        ].map((s, i) => (
          <div key={i} className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-[#FF6B00]/30 transition-all">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{s.l}</p>
              <div className={`${s.bg} p-2 rounded-xl`}><s.i size={16} className={s.c} /></div>
            </div>
            <h3 className={`text-3xl font-black tracking-tighter ${s.c} relative z-10`}>{s.v}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">Actividad Reciente</h3>
            <span className="text-[10px] font-black text-emerald-500 uppercase">En Vivo</span>
          </div>
          <div className="space-y-4">
            {leads.slice(0, 5).map(lead => (
              <button
                key={lead.id}
                onClick={() => onOpenConversation(lead.id)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-3xl border border-slate-100 hover:border-[#FF6B00]/40 hover:bg-orange-50/30 transition-all group text-left"
              >
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-slate-900 text-[#FF6B00] flex items-center justify-center font-black text-xs italic shrink-0">{lead.nombre?.[0] || '?'}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{lead.nombre}</p>
                    <p className="text-[10px] font-bold text-slate-400 truncate">{lead.lastMessage || 'Nuevo Lead'}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-[10px] font-black text-[#FF6B00]">{lead.time || 'Ahora'}</p>
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{lead.estado}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 p-10 rounded-[40px] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-10 text-white group-hover:rotate-12 transition-transform duration-700">
            <Brain size={120} />
          </div>
          <div className="relative z-10 space-y-8">
            <h3 className="text-sm font-black text-[#FF6B00] uppercase tracking-[0.2em] italic">Impacto IA</h3>
            <div className="space-y-6">
              <div>
                <p className="text-4xl font-black text-white italic tabular-nums">{horasAhorradas}h</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Tiempo de atención ahorrado</p>
              </div>
              <div className="h-px bg-white/10 w-full" />
              <div>
                <p className="text-4xl font-black text-white italic tabular-nums">{botMessages}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Interacciones automáticas</p>
              </div>
            </div>
            <button onClick={onConfigureAgent} className="w-full py-4 bg-[#FF6B00] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-orange-900/20 hover:bg-white hover:text-slate-900 transition-all">Configurar Agente</button>
          </div>
        </div>
      </div>
    </div>
  );
}
