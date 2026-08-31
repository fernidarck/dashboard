import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Copy, Check, Trash2, FileText, Film, Image as ImageIcon, RefreshCw } from 'lucide-react';

// Vista de Archivos: subir cualquier archivo (foto, video, PDF) y COPIAR su link
// directo. Sirve para las campañas de Claude/Hermes, que piden links.
export default function ViewArchivos({ apiBase, authToken }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const inputRef = useRef(null);

  const apiFetch = useCallback((url, opts = {}) => {
    const headers = { Authorization: `Bearer ${authToken}`, ...(opts.headers || {}) };
    if (opts.body && !(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    return fetch(url, { ...opts, headers });
  }, [authToken]);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiBase}/api/media`);
      const d = await res.json();
      setFiles(Array.isArray(d) ? d : []);
    } catch { /* */ }
  }, [apiFetch, apiBase]);

  useEffect(() => { load(); }, [load]);

  const subir = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiFetch(`${apiBase}/api/media/upload`, { method: 'POST', body: fd });
      if (res.ok) load();
      else { const e = await res.json().catch(() => ({})); alert('Error: ' + (e.error || 'no se pudo subir')); }
    } catch { alert('Error de conexión'); }
    setUploading(false);
  };

  const copiar = async (f) => {
    try { await navigator.clipboard.writeText(f.url); } catch { /* */ }
    setCopiedId(f.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const borrar = async (id) => {
    if (!confirm('¿Borrar este archivo de la lista?')) return;
    await apiFetch(`${apiBase}/api/media/${id}`, { method: 'DELETE' });
    load();
  };

  const kb = (n) => n ? (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB') : '';
  const iconFor = (mt = '') => mt.startsWith('image/') ? ImageIcon : mt.startsWith('video/') ? Film : FileText;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Archivos</h1>
          <p className="text-sm text-slate-500 mt-1">Subí un archivo y copiá su link — para las campañas.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500" title="Actualizar">
            <RefreshCw size={18} />
          </button>
          <button onClick={() => inputRef.current?.click()} disabled={uploading}
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-[#FF6B00] font-black text-xs uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2">
            <Upload size={16} /> {uploading ? 'Subiendo…' : 'Subir archivo'}
          </button>
          <input ref={inputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; subir(f); }} />
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mb-6">💡 Para video de WhatsApp: máx 15 MB. Para imágenes de campaña, cualquier tamaño.</p>

      {files.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Upload size={40} className="mx-auto mb-3 opacity-40" />
          <p>No hay archivos todavía. Subí uno para obtener su link.</p>
        </div>
      )}

      <div className="space-y-3">
        {files.map((f) => {
          const Icon = iconFor(f.mimetype);
          const isImg = (f.mimetype || '').startsWith('image/');
          return (
            <div key={f.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3">
              <div className="h-14 w-14 rounded-xl bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center border border-slate-100">
                {isImg ? <img src={f.url} alt={f.name} className="w-full h-full object-cover" /> : <Icon size={22} className="text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-700 text-sm truncate">{f.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{f.url}</p>
                <p className="text-[10px] text-slate-400">{kb(f.size)}</p>
              </div>
              <button onClick={() => copiar(f)}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${copiedId === f.id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                {copiedId === f.id ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar link</>}
              </button>
              <button onClick={() => borrar(f.id)} className="shrink-0 p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50" title="Borrar">
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
