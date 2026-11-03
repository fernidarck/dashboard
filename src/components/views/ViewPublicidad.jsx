import { useEffect, useState, useCallback } from 'react';
import { Megaphone, RefreshCw, TrendingUp, Wallet } from 'lucide-react';

// Sección Publicidad: control de lo que se paga en anuncios vs. lo que producen.
// El gasto se puede escribir aquí a mano, o pedirle a Claude que lo registre desde
// Meta por el MCP (herramienta registrar_gasto_anuncio). Cruza con leads/ventas.
export default function ViewPublicidad({ apiBase, authToken }) {
  const [data, setData] = useState({ anuncios: [], totales: {} });
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({}); // ad_source_id -> gasto en edición

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/api/ads/report?t=${Date.now()}`, { headers });
      const j = await r.json();
      if (j.ok) setData({ anuncios: j.anuncios || [], totales: j.totales || {} });
    } catch (e) { /* silencioso */ }
    setLoading(false);
  }, [apiBase, authToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const saveGasto = async (ad) => {
    const raw = drafts[ad.ad_source_id];
    if (raw === undefined) return;
    const gasto = Number(raw);
    if (Number.isNaN(gasto)) return;
    try {
      await fetch(`${apiBase}/api/ads/spend`, {
        method: 'POST', headers,
        body: JSON.stringify({ ad_source_id: ad.ad_source_id, gasto, campaign: ad.campaign || ad.headline || null })
      });
      setDrafts(d => { const n = { ...d }; delete n[ad.ad_source_id]; return n; });
      load();
    } catch (e) { /* */ }
  };

  const q = (n) => (n === null || n === undefined) ? '—' : `Q${Number(n).toLocaleString('es-GT', { maximumFractionDigits: 2 })}`;
  const t = data.totales || {};

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center shadow-md shadow-orange-200">
            <Megaphone size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-tight">Publicidad</h1>
            <p className="text-[11px] text-slate-500 font-semibold">Qué pagás por anuncio vs. qué produce (leads y ventas reales)</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {/* Tarjetas de totales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <TotalCard icon={<Wallet size={14} />} label="Gasto total" value={q(t.gasto)} tone="orange" />
        <TotalCard label="Leads" value={t.leads ?? 0} tone="slate" />
        <TotalCard icon={<TrendingUp size={14} />} label="Ventas" value={t.ventas ?? 0} tone="emerald" />
        <TotalCard label="Costo por venta" value={q(t.costo_por_venta)} tone="slate" />
      </div>

      {/* Nota */}
      <div className="mb-4 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium">
        💡 Escribí el gasto de cada anuncio y Enter — o pedile a Claude <span className="font-bold">“registrá el gasto del anuncio X”</span> y lo llena solo desde Meta (por el MCP).
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-wide">
                <th className="text-left px-3 py-2.5">Anuncio</th>
                <th className="text-right px-3 py-2.5">Gasto (Q)</th>
                <th className="text-right px-3 py-2.5">Leads</th>
                <th className="text-right px-3 py-2.5">Ventas</th>
                <th className="text-right px-3 py-2.5">Conv.</th>
                <th className="text-right px-3 py-2.5">Q / lead</th>
                <th className="text-right px-3 py-2.5">Q / venta</th>
              </tr>
            </thead>
            <tbody>
              {data.anuncios.length === 0 && !loading && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400 font-semibold">Aún no hay anuncios rastreados. Aparecerán cuando lleguen clientes desde un anuncio (click-to-WhatsApp).</td></tr>
              )}
              {data.anuncios.map(ad => {
                const draft = drafts[ad.ad_source_id];
                const gastoVal = draft !== undefined ? draft : (ad.gasto || '');
                const buenaVenta = ad.ventas > 0 && ad.costo_por_venta !== null;
                return (
                  <tr key={ad.ad_source_id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-3 py-2.5">
                      <div className="font-black text-slate-800 truncate max-w-[220px]">{ad.producto || ad.headline || 'Anuncio sin mapear'}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[220px]">{ad.ad_source_id}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number" min="0" step="0.01" inputMode="decimal"
                        className="w-24 text-right px-2 py-1 rounded-lg border border-slate-200 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none font-bold tabular-nums"
                        value={gastoVal}
                        placeholder="0"
                        onChange={e => setDrafts(d => ({ ...d, [ad.ad_source_id]: e.target.value }))}
                        onBlur={() => saveGasto(ad)}
                        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums text-slate-700">{ad.leads}</td>
                    <td className="px-3 py-2.5 text-right font-black tabular-nums text-emerald-600">{ad.ventas}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-600">{ad.conversion_pct}%</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{q(ad.costo_por_lead)}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-black ${buenaVenta ? 'text-slate-900' : (ad.gasto > 0 ? 'text-rose-500' : 'text-slate-400')}`}>
                      {ad.ventas > 0 ? q(ad.costo_por_venta) : (ad.gasto > 0 ? '0 ventas' : '—')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 mt-3 font-medium">
        “Q / venta” = cuánto te costó en anuncios cada venta de ese anuncio. Mientras más bajo, mejor. Un anuncio con gasto y 0 ventas (rojo) es candidato a pausar.
      </p>
    </div>
  );
}

function TotalCard({ icon, label, value, tone = 'slate' }) {
  const tones = {
    orange: 'bg-orange-50 text-[#FF6B00] border-orange-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    slate: 'bg-white text-slate-700 border-slate-200'
  };
  return (
    <div className={`rounded-2xl border px-3 py-3 shadow-xs ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide opacity-80">{icon}{label}</div>
      <div className="text-xl font-black mt-1 tabular-nums">{value}</div>
    </div>
  );
}
