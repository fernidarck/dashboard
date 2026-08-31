import { useState, useRef } from 'react';
import {
  Plus, X, Pencil, Trash2, Search, RefreshCw,
  Sparkles, BookOpen, Tag, ShoppingBag, Bot,
  Info, Image as ImageIcon, ShieldAlert
} from 'lucide-react';

const CATEGORY_STYLES = {
  'General':  { badge: 'bg-slate-50 text-slate-500 border-slate-100' },
  'Precios':  { badge: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  'Soporte':  { badge: 'bg-blue-50 text-blue-600 border-blue-100' },
  'Horarios': { badge: 'bg-amber-50 text-amber-600 border-amber-100' },
  'Técnico':  { badge: 'bg-purple-50 text-purple-600 border-purple-100' },
};
const CARD_CATEGORIES     = ['General', 'Precios', 'Soporte', 'Horarios', 'Técnico'];
const PRODUCT_CATEGORIES  = ['Motores', 'Portones', 'Controles', 'Cámaras', 'Accesorios', 'Servicios'];
const STOCK_STYLES        = {
  'En stock':   'bg-emerald-50 text-emerald-600 border-emerald-100',
  'Poco stock': 'bg-amber-50 text-amber-600 border-amber-100',
  'Agotado':    'bg-red-50 text-red-600 border-red-100',
};

const emptyCard = {
  name: '',
  category: 'General',
  content: '',
  imagen: '',
  imagenes: [],
  imagenes_meta: []
};

const emptyProduct = {
  nombre: '',
  descripcion: '',
  reglas_bot: '',
  precio: '',
  precio_oferta: '',
  categoria: 'General',
  stock: 'En stock',
  imagen: '',
  imagenes: [],
  imagenes_meta: [],
  catalog_link: ''
};

// Helper para obtener fotos con descripción de cualquier producto o tarjeta
function getImagesMeta(item) {
  if (!item) return [];
  if (Array.isArray(item.imagenes_meta) && item.imagenes_meta.length > 0) {
    return item.imagenes_meta;
  }
  if (Array.isArray(item.imagenes) && item.imagenes.length > 0) {
    return item.imagenes.map(u => typeof u === 'string' ? { url: u, desc: '' } : u);
  }
  if (item.imagen) {
    return [{ url: item.imagen, desc: '' }];
  }
  return [];
}

export default function ViewRAG({
  documents = [],
  products = [],
  onSaveCard,
  onUpdateCard,
  onDeleteCard,
  onSaveProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUploadDocument,
  onUploadImageFile,
  onRunTestSearch,
}) {
  const [ragSubTab,      setRagSubTab]      = useState('conocimiento');
  const [showNewCard,    setShowNewCard]    = useState(false);
  const [editingCard,    setEditingCard]    = useState(null);
  const [newCard,        setNewCard]        = useState(emptyCard);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct,     setNewProduct]     = useState(emptyProduct);
  const [testQuery,      setTestQuery]      = useState('');
  const [testResults,    setTestResults]    = useState([]);
  const [isSearching,    setIsSearching]    = useState(false);
  const fileInputRef = useRef(null);

  const handleRunSearch = async () => {
    if (!testQuery.trim()) return;
    setIsSearching(true);
    const results = await onRunTestSearch(testQuery);
    setTestResults(results);
    setIsSearching(false);
  };

  const handleSaveCard = async () => {
    if (!newCard.name.trim() || !newCard.content.trim()) return;
    const ok = await onSaveCard(newCard);
    if (ok) { setNewCard(emptyCard); setShowNewCard(false); }
  };

  const handleUpdateCard = async () => {
    if (!editingCard) return;
    const ok = await onUpdateCard(editingCard.id, editingCard);
    if (ok) setEditingCard(null);
  };

  const handleSaveProduct = async () => {
    if (!newProduct.nombre.trim()) return;
    const ok = await onSaveProduct(newProduct);
    if (ok) { setNewProduct(emptyProduct); setShowNewProduct(false); }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    const ok = await onUpdateProduct(editingProduct.id, editingProduct);
    if (ok) setEditingProduct(null);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) onUploadDocument(file);
  };

  // Manejo de subida de imagen para Productos
  const handleProductImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = await onUploadImageFile?.(file);
    if (url) {
      const setter = type === 'new' ? setNewProduct : setEditingProduct;
      setter(prev => {
        const existing = getImagesMeta(prev);
        if (existing.length >= 5) return prev;
        const next = [...existing, { url, desc: '' }];
        return {
          ...prev,
          imagenes_meta: next,
          imagenes: next.map(x => x.url),
          imagen: next[0]?.url || ''
        };
      });
    }
    e.target.value = '';
  };

  // Manejo de subida de imagen para Tarjetas de Conocimiento (RAG)
  const handleCardImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = await onUploadImageFile?.(file);
    if (url) {
      const setter = type === 'new' ? setNewCard : setEditingCard;
      setter(prev => {
        const existing = getImagesMeta(prev);
        if (existing.length >= 4) return prev;
        const next = [...existing, { url, desc: '' }];
        return {
          ...prev,
          imagenes_meta: next,
          imagenes: next.map(x => x.url),
          imagen: next[0]?.url || ''
        };
      });
    }
    e.target.value = '';
  };

  // Eliminar imagen de un ítem
  const removeImage = (idx, setter) => {
    setter(prev => {
      const existing = getImagesMeta(prev).filter((_, i) => i !== idx);
      return {
        ...prev,
        imagenes_meta: existing,
        imagenes: existing.map(x => x.url),
        imagen: existing[0]?.url || ''
      };
    });
  };

  // Actualizar la descripción de una foto específica
  const updateImageDesc = (idx, desc, setter) => {
    setter(prev => {
      const existing = getImagesMeta(prev).map((item, i) => i === idx ? { ...item, desc } : item);
      return {
        ...prev,
        imagenes_meta: existing
      };
    });
  };

  // Agregar un medio (VIDEO o foto) por URL — para pegar el link del video copiado
  // de la sección Archivos. Luego se le escribe la regla en "¿Qué muestra?".
  const addMediaByUrl = (setter) => {
    const url = window.prompt('Pegá el link del archivo (video o foto), copiado de la sección Archivos:');
    if (!url || !url.trim()) return;
    setter(prev => {
      const existing = [...getImagesMeta(prev), { url: url.trim(), desc: '' }];
      return { ...prev, imagenes_meta: existing, imagenes: existing.map(x => x.url), imagen: existing[0]?.url || '' };
    });
  };
  const esVideo = (u = '') => /\.(mp4|mov|webm|avi|m4v)(\?|$)/i.test(u);

  // Componente reutilizable para galería y especificación de fotos
  const renderImageManager = (item, type, isCard = false) => {
    const images = getImagesMeta(item);
    const maxImgs = isCard ? 4 : 5;
    const setter = isCard
      ? (type === 'new' ? setNewCard : setEditingCard)
      : (type === 'new' ? setNewProduct : setEditingProduct);
    const onUpload = isCard ? handleCardImageUpload : handleProductImageUpload;

    return (
      <div className="space-y-3 bg-slate-50/80 p-4 rounded-3xl border border-slate-100">
        <div className="flex justify-between items-center">
          <div>
            <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
              📸 Fotos & Especificación ({images.length}/{maxImgs})
            </label>
            <p className="text-[9px] text-slate-400 font-medium">
              Escribe qué muestra cada foto para que la IA sepa exactamente cuál enviar cuando el cliente la pida.
            </p>
          </div>
          {images.length < maxImgs && (
            <div className="flex items-center gap-2">
              <label className="cursor-pointer px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-[#FF6B00] hover:border-orange-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs">
                <Plus size={12} /> Subir Foto
                <input type="file" onChange={(e) => onUpload(e, type)} className="hidden" accept="image/*" />
              </label>
              <button type="button" onClick={() => addMediaByUrl(setter)}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-[#FF6B00] hover:border-orange-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs">
                <Plus size={12} /> Video por URL
              </button>
            </div>
          )}
        </div>

        {images.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center">
            <ImageIcon size={20} className="mx-auto text-slate-300 mb-1" />
            <p className="text-[10px] text-slate-400 font-bold">Sin fotos adjuntas aún.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {images.map((img, i) => (
              <div key={i} className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="h-14 w-14 rounded-xl overflow-hidden relative shrink-0 border border-slate-100 bg-slate-100 flex items-center justify-center">
                  {esVideo(img.url) ? (
                    <video src={img.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={img.url} alt={`foto ${i+1}`} className="w-full h-full object-cover" />
                  )}
                  {esVideo(img.url) && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-[8px] font-black">🎬 VIDEO</span>
                  )}
                  {i === 0 && !esVideo(img.url) && (
                    <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[7px] font-black py-0.5 text-center uppercase">
                      Principal
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                    {esVideo(img.url) ? '¿Cuándo mandar este VIDEO? (ej: cuando pregunten cómo funciona)' : '¿Qué muestra esta foto? (Instrucción para IA):'}
                  </label>
                  <input
                    type="text"
                    value={img.desc || ''}
                    onChange={(e) => updateImageDesc(i, e.target.value, setter)}
                    placeholder={esVideo(img.url) ? 'Ej: cuando pregunten cómo funciona, cuando pidan el video' : 'Ej: Foto del motor instalado, control remoto, tabla de cuotas...'}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium outline-none focus:ring-1 focus:ring-[#FF6B00] text-slate-800"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(i, setter)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0"
                  title="Eliminar foto"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div className="flex items-center space-x-6">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">Base de Conocimiento RAG</h2>
            <p className="text-xs text-slate-400 font-medium mt-1">Entrena a la IA con productos, precios, fotos y reglas de venta</p>
          </div>
          <div className="flex space-x-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
            <button onClick={() => setRagSubTab('conocimiento')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${ragSubTab === 'conocimiento' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Conocimiento</button>
            <button onClick={() => setRagSubTab('catalogo')}     className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${ragSubTab === 'catalogo'     ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Catálogo</button>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {/* Inline search */}
          <div className="relative group flex items-center bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <Search size={16} className="absolute left-4 text-slate-400 group-focus-within:text-[#FF6B00] transition-colors pointer-events-none" />
            <input
              type="text"
              value={testQuery}
              onChange={e => { setTestQuery(e.target.value); if (!e.target.value.trim()) setTestResults([]); }}
              onKeyDown={e => e.key === 'Enter' && handleRunSearch()}
              placeholder="Buscar en RAG..."
              className="pl-10 pr-2 py-3 bg-transparent text-xs font-bold outline-none italic w-44"
            />
            <button
              onClick={handleRunSearch}
              disabled={isSearching}
              className="px-3 py-3 bg-slate-900 text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white transition-all disabled:opacity-50"
            >
              {isSearching ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            </button>
          </div>

          {ragSubTab === 'conocimiento' ? (
            <>
              <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" accept=".pdf,.xlsx,.xls,.txt" />
              <button onClick={() => fileInputRef.current?.click()} className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-slate-400 transition-all shadow-sm">Subir PDF/Excel</button>
              <button onClick={() => setShowNewCard(true)} className="px-5 py-3 bg-slate-900 text-[#FF6B00] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#FF6B00] hover:text-white transition-all shadow-sm flex items-center gap-1.5"><Plus size={14} /> Nueva Tarjeta</button>
            </>
          ) : (
            <button onClick={() => setShowNewProduct(true)} className="px-5 py-3 bg-slate-900 text-[#FF6B00] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#FF6B00] hover:text-white transition-all shadow-sm flex items-center gap-1.5"><Plus size={14} /> Nuevo Producto</button>
          )}
        </div>
      </div>

      {/* Resultados de prueba de búsqueda */}
      {testResults.length > 0 ? (
        <div className="bg-orange-50/50 p-8 rounded-[36px] border border-orange-100 space-y-4 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#FF6B00]" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Coincidencias RAG para: "{testQuery}"</h3>
            </div>
            <button onClick={() => { setTestResults([]); setTestQuery(''); }} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {testResults.map((res, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-orange-100 text-[#FF6B00]">{res.tipo}</span>
                  <span className="text-[9px] font-black text-slate-400">Score: {res.score}</span>
                </div>
                <h4 className="text-xs font-black text-slate-800">{res.titulo}</h4>
                <p className="text-[10px] text-slate-500 line-clamp-3 mt-1 whitespace-pre-wrap">{res.contenido}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Content Grid */}
      {ragSubTab === 'conocimiento' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map(doc => {
            const cardImgs = getImagesMeta(doc);
            return (
              <div key={doc.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group relative flex flex-col justify-between">
                <div className="absolute top-6 right-6 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingCard(doc)} className="p-2 bg-slate-900 text-white rounded-xl hover:bg-[#FF6B00] transition-colors shadow-lg"><Pencil size={14} /></button>
                  <button onClick={() => onDeleteCard(doc.id)} className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14} /></button>
                </div>
                <div className="space-y-4">
                  <span className={`px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-tighter border ${CATEGORY_STYLES[doc.category]?.badge || CATEGORY_STYLES.General.badge}`}>{doc.category || 'General'}</span>
                  <div>
                    <h4 className="text-lg font-black text-slate-800 uppercase italic leading-tight mb-2">{doc.name}</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed italic line-clamp-4">{doc.content}</p>
                  </div>

                  {/* Fotos adjuntas de la tarjeta */}
                  {cardImgs.length > 0 && (
                    <div className="pt-2 border-t border-slate-50">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <ImageIcon size={10} className="text-[#FF6B00]" /> {cardImgs.length} Foto(s) para enviar:
                      </p>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                        {cardImgs.map((img, i) => (
                          <div key={i} className="relative group/img shrink-0" title={img.desc || 'Foto adjunta'}>
                            <img src={img.url} alt="foto" className="h-12 w-12 rounded-xl object-cover border border-slate-200" />
                            {img.desc && (
                              <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[7px] font-bold px-1 rounded-md max-w-[50px] truncate">
                                {img.desc}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-[8px] font-black text-slate-300 uppercase tracking-widest italic mt-4">
                  <span>Actualizado</span>
                  <span className="tabular-nums">{doc.timestamp || '—'}</span>
                </div>
              </div>
            );
          })}
          {documents.length === 0 && (
            <div className="col-span-3 py-20 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
              <BookOpen size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Sin tarjetas de conocimiento</p>
              <p className="text-xs text-slate-300 mt-1">Crea una tarjeta con información de precios, garantías, visacuotas o instalación.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map(prod => {
            const prodImgs = getImagesMeta(prod);
            return (
              <div key={prod.id} className="bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col">
                <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden flex items-center justify-center">
                  {prodImgs.length > 0
                    ? <img src={prodImgs[0].url} alt={prod.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <ShoppingBag size={48} className="text-slate-200 group-hover:scale-105 transition-transform duration-500" />
                  }
                  {prodImgs.length > 1 && (
                    <span className="absolute bottom-3 left-3 bg-slate-900/80 text-white text-[8px] font-black px-2 py-0.5 rounded-lg shadow-md flex items-center gap-1">
                      <ImageIcon size={10} /> {prodImgs.length} fotos
                    </span>
                  )}
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                    <button onClick={() => setEditingProduct(prod)} className="bg-white p-3 rounded-2xl text-slate-900 hover:bg-[#FF6B00] hover:text-white transition-all shadow-xl active:scale-90" title="Editar producto y reglas"><Pencil size={18} /></button>
                    <button onClick={() => onDeleteProduct(prod.id)} className="bg-white p-3 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-xl active:scale-90" title="Eliminar producto"><Trash2 size={18} /></button>
                  </div>
                  {(() => {
                    const raw = (prod.stock || '').toString().trim();
                    const q = parseInt(raw, 10);
                    const hasNum = !isNaN(q);
                    let label = '', style = '';
                    if (hasNum) {
                      label = q <= 0 ? 'Agotado' : `Stock: ${q}`;
                      style = q <= 0 ? STOCK_STYLES['Agotado'] : q <= 3 ? STOCK_STYLES['Poco stock'] : STOCK_STYLES['En stock'];
                    } else if (raw) {
                      label = raw;
                      style = /agot/i.test(raw) ? STOCK_STYLES['Agotado']
                            : /(poca|bajo|pedido|fabricaci|producci|encargo)/i.test(raw) ? STOCK_STYLES['Poco stock']
                            : STOCK_STYLES['En stock'];
                    }
                    return label ? <span className={`absolute top-4 right-4 px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-tighter border shadow-lg ${style}`}>{label}</span> : null;
                  })()}
                </div>

                <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[8px] font-black text-[#FF6B00] uppercase tracking-widest">{prod.categoria}</span>
                    <h4 className="text-sm font-black text-slate-800 uppercase italic leading-tight">{prod.nombre}</h4>
                    
                    {/* Descripción para cliente */}
                    {prod.descripcion && (
                      <p className="text-[10px] text-slate-500 italic line-clamp-2 leading-relaxed">
                        {prod.descripcion}
                      </p>
                    )}

                    {/* Reglas del bot destacadas */}
                    {prod.reglas_bot && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-2 flex items-start gap-1.5 mt-2">
                        <Bot size={12} className="text-amber-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[8px] font-black text-amber-700 uppercase leading-none">Regla Interna IA:</p>
                          <p className="text-[9px] text-amber-800 italic line-clamp-2 leading-tight mt-0.5">{prod.reglas_bot}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                    {prod.precio_oferta ? (
                      <span className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-slate-400 line-through tabular-nums italic">Q{prod.precio}</span>
                        <span className="text-lg font-black text-[#FF6B00] tabular-nums italic">Q{prod.precio_oferta}</span>
                        <span className="text-[8px] font-black text-[#FF6B00] uppercase bg-orange-50 px-1.5 py-0.5 rounded-full">Oferta</span>
                      </span>
                    ) : (
                      <span className="text-lg font-black text-slate-900 tabular-nums italic">{prod.precio ? `Q${prod.precio}` : 'Consultar'}</span>
                    )}
                    <span className="h-2 w-2 bg-emerald-400 rounded-full" />
                  </div>
                </div>
              </div>
            );
          })}
          {products.length === 0 && (
            <div className="col-span-4 py-20 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
              <ShoppingBag size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Sin productos en catálogo</p>
              <p className="text-xs text-slate-300 mt-1">Agrega motores, cremalleras, controles o kits con sus precios y fotos.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal: Nueva Tarjeta de Conocimiento */}
      {showNewCard && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">Nueva Tarjeta de Conocimiento</h3>
              <button onClick={() => setShowNewCard(false)} className="p-2.5 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800"><X size={18} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Título de la Tarjeta</label>
                  <input type="text" value={newCard.name} onChange={e => setNewCard({...newCard, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all" placeholder="Ej: Tabla de Visacuotas / Garantías" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Categoría</label>
                  <select value={newCard.category} onChange={e => setNewCard({...newCard, category: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all">
                    {CARD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Información / Respuestas que usará la IA</label>
                <textarea rows={5} value={newCard.content} onChange={e => setNewCard({...newCard, content: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-xs font-medium leading-relaxed outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all resize-none" placeholder="Escribe las políticas, precios de instalación, horarios o información clave..." />
              </div>

              {/* Subida y especificación de fotos en la tarjeta */}
              {renderImageManager(newCard, 'new', true)}

              <button onClick={handleSaveCard} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#FF6B00] transition-all active:scale-95">Guardar en Base de Conocimiento</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Tarjeta de Conocimiento */}
      {editingCard && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">Editar Tarjeta de Conocimiento</h3>
              <button onClick={() => setEditingCard(null)} className="p-2.5 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800"><X size={18} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Título de la Tarjeta</label>
                  <input type="text" value={editingCard.name} onChange={e => setEditingCard({...editingCard, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Categoría</label>
                  <select value={editingCard.category} onChange={e => setEditingCard({...editingCard, category: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all">
                    {CARD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Información / Respuestas que usará la IA</label>
                <textarea rows={5} value={editingCard.content} onChange={e => setEditingCard({...editingCard, content: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-xs font-medium leading-relaxed outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all resize-none" />
              </div>

              {/* Subida y especificación de fotos en la tarjeta */}
              {renderImageManager(editingCard, 'edit', true)}

              <button onClick={handleUpdateCard} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#FF6B00] transition-all active:scale-95">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Producto (con separación clara de ficha vs reglas de bot) */}
      {showNewProduct && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[44px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">Nuevo Producto del Catálogo</h3>
              <button onClick={() => setShowNewProduct(false)} className="p-2.5 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800"><X size={18} /></button>
            </div>
            <div className="p-8 space-y-6">
              {/* Datos básicos */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre del Producto / Modelo</label>
                <input type="text" value={newProduct.nombre} onChange={e => setNewProduct({...newProduct, nombre: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all" placeholder="Ej: Motor Residencial BFT Deimos BT A600" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Precio Normal (Q)</label>
                  <input type="text" value={newProduct.precio} onChange={e => setNewProduct({...newProduct, precio: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all" placeholder="Ej: 3500.00" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#FF6B00] uppercase tracking-widest ml-2">🔥 Precio Oferta (Q)</label>
                  <input type="text" value={newProduct.precio_oferta || ''} onChange={e => setNewProduct({...newProduct, precio_oferta: e.target.value})} className="w-full px-5 py-3.5 bg-orange-50/50 border border-orange-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all" placeholder="Opcional. Ej: 3200.00" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Categoría</label>
                  <select value={newProduct.categoria} onChange={e => setNewProduct({...newProduct, categoria: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all">
                    {PRODUCT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">📦 Stock</label>
                  <input type="text" list="stock-opts" value={newProduct.stock ?? 'En stock'} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all" placeholder="Cantidad (ej: 5) o estado" />
                  <datalist id="stock-opts">
                    <option value="En stock" />
                    <option value="A pedido (4 días)" />
                    <option value="Fabricación" />
                    <option value="Agotado" />
                    <option value="Pocas unidades" />
                  </datalist>
                  <p className="text-[9px] text-slate-400 italic ml-2 leading-relaxed">Número (ej: 5) o estado. 🟢 <b>En stock</b> = lo ofrece disponible. 🔨 <b>A pedido (4 días)</b> / <b>Fabricación</b> = lo ofrece pero aclara que es a pedido (~4 días). 🔴 <b>Agotado</b> = no lo ofrece (solo si preguntan por él). 0 = Agotado.</p>
                </div>
              </div>

              {/* CAMPO 1: FICHA PARA EL CLIENTE */}
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-2">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                    📄 Ficha / Descripción para el Cliente (Visible en WhatsApp)
                  </label>
                  <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                    Visible en cotizaciones
                  </span>
                </div>
                <textarea rows={3} value={newProduct.descripcion} onChange={e => setNewProduct({...newProduct, descripcion: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium leading-relaxed outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all resize-none" placeholder="Ej: Motor para portón corredizo de hasta 600kg. Incluye 2 controles remotos, 3 metros de cremallera metálica y 1 año de garantía..." />
              </div>

              {/* CAMPO 2: REGLAS INTERNAS DEL BOT */}
              <div className="space-y-2 bg-amber-50/70 p-4 rounded-3xl border border-amber-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Bot size={15} className="text-amber-600" />
                    <label className="text-[10px] font-black text-amber-900 uppercase tracking-widest">
                      🤖 Reglas e Instrucciones para la IA (Interno)
                    </label>
                  </div>
                  <span className="text-[8px] font-black text-amber-700 uppercase bg-amber-100 px-2 py-0.5 rounded-md">
                    Solo para el Bot · No se envía al cliente
                  </span>
                </div>
                <textarea rows={3} value={newProduct.reglas_bot || ''} onChange={e => setNewProduct({...newProduct, reglas_bot: e.target.value})} className="w-full px-4 py-3 bg-white border border-amber-200 rounded-2xl text-xs font-medium leading-relaxed outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all resize-none text-amber-900 placeholder:text-amber-400" placeholder="Ej: No ofrecer si el portón es menor a 400kg. Si el cliente pide descuento, ofrecer el precio de oferta en Q3,200. Si preguntan si incluye instalación, decir que sí dentro de la capital..." />
                <p className="text-[9px] text-amber-700/80 italic">
                  💡 Usa este campo para poner condiciones: cuándo ofrecerlo, cuándo no enviarlo, objeciones o qué decir si piden rebaja.
                </p>
              </div>

              {/* Subida de fotos con especificación para el producto */}
              {renderImageManager(newProduct, 'new', false)}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Link del Catálogo Web (opcional)</label>
                <input type="text" value={newProduct.catalog_link || ''} onChange={e => setNewProduct({...newProduct, catalog_link: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all" placeholder="https://onecontrol.shop/..." />
              </div>

              <button onClick={handleSaveProduct} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#FF6B00] transition-all active:scale-95">Publicar en Catálogo</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Producto (con separación clara de ficha vs reglas de bot) */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[44px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">Editar Producto</h3>
              <button onClick={() => setEditingProduct(null)} className="p-2.5 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800"><X size={18} /></button>
            </div>
            <div className="p-8 space-y-6">
              {/* Datos básicos */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre del Producto / Modelo</label>
                <input type="text" value={editingProduct.nombre} onChange={e => setEditingProduct({...editingProduct, nombre: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Precio Normal (Q)</label>
                  <input type="text" value={editingProduct.precio} onChange={e => setEditingProduct({...editingProduct, precio: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#FF6B00] uppercase tracking-widest ml-2">🔥 Precio Oferta (Q)</label>
                  <input type="text" value={editingProduct.precio_oferta || ''} onChange={e => setEditingProduct({...editingProduct, precio_oferta: e.target.value})} className="w-full px-5 py-3.5 bg-orange-50/50 border border-orange-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all" placeholder="Opcional" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Categoría</label>
                  <select value={editingProduct.categoria} onChange={e => setEditingProduct({...editingProduct, categoria: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all">
                    {PRODUCT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">📦 Stock</label>
                  <input type="text" list="stock-opts" value={editingProduct.stock ?? 'En stock'} onChange={e => setEditingProduct({...editingProduct, stock: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all" placeholder="Cantidad (ej: 5) o estado" />
                  <p className="text-[9px] text-slate-400 italic ml-2 leading-relaxed">Número (ej: 5) o estado. 🟢 <b>En stock</b> = lo ofrece disponible. 🔨 <b>A pedido (4 días)</b> / <b>Fabricación</b> = lo ofrece pero aclara que es a pedido (~4 días). 🔴 <b>Agotado</b> = no lo ofrece (solo si preguntan por él). 0 = Agotado.</p>
                </div>
              </div>

              {/* CAMPO 1: FICHA PARA EL CLIENTE */}
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-2">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                    📄 Ficha / Descripción para el Cliente (Visible en WhatsApp)
                  </label>
                  <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                    Visible en cotizaciones
                  </span>
                </div>
                <textarea rows={3} value={editingProduct.descripcion} onChange={e => setEditingProduct({...editingProduct, descripcion: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium leading-relaxed outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all resize-none" />
              </div>

              {/* CAMPO 2: REGLAS INTERNAS DEL BOT */}
              <div className="space-y-2 bg-amber-50/70 p-4 rounded-3xl border border-amber-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Bot size={15} className="text-amber-600" />
                    <label className="text-[10px] font-black text-amber-900 uppercase tracking-widest">
                      🤖 Reglas e Instrucciones para la IA (Interno)
                    </label>
                  </div>
                  <span className="text-[8px] font-black text-amber-700 uppercase bg-amber-100 px-2 py-0.5 rounded-md">
                    Solo para el Bot · No se envía al cliente
                  </span>
                </div>
                <textarea rows={3} value={editingProduct.reglas_bot || ''} onChange={e => setEditingProduct({...editingProduct, reglas_bot: e.target.value})} className="w-full px-4 py-3 bg-white border border-amber-200 rounded-2xl text-xs font-medium leading-relaxed outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all resize-none text-amber-900 placeholder:text-amber-400" placeholder="Ej: No ofrecer si el portón es de más de 400kg. Si piden rebaja, dar en Q3,200..." />
                <p className="text-[9px] text-amber-700/80 italic">
                  💡 Usa este campo para poner condiciones: cuándo ofrecerlo, cuándo no enviarlo, objeciones o qué decir si piden rebaja.
                </p>
              </div>

              {/* Subida de fotos con especificación para el producto */}
              {renderImageManager(editingProduct, 'edit', false)}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Link del Catálogo Web (opcional)</label>
                <input type="text" value={editingProduct.catalog_link || ''} onChange={e => setEditingProduct({...editingProduct, catalog_link: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-[#FF6B00] transition-all" />
              </div>

              <button onClick={handleUpdateProduct} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#FF6B00] transition-all active:scale-95">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
