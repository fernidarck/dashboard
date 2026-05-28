import { useState, useRef } from 'react';
import {
  Plus, X, Pencil, Trash2, Search, Zap, RefreshCw,
  Sparkles, BookOpen, Tag, ShoppingBag, Link2
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
const STOCK_OPTIONS       = ['En stock', 'Poco stock', 'Agotado'];
const STOCK_STYLES        = {
  'En stock':   'bg-emerald-50 text-emerald-600 border-emerald-100',
  'Poco stock': 'bg-amber-50 text-amber-600 border-amber-100',
  'Agotado':    'bg-red-50 text-red-600 border-red-100',
};
const emptyCard    = { name: '', category: 'General', content: '' };
const emptyProduct = { nombre: '', descripcion: '', precio: '', categoria: 'Motores', stock: 'En stock', imagen: '' };

export default function ViewRAG({
  documents, products,
  onSaveCard, onUpdateCard, onDeleteCard,
  onSaveProduct, onUpdateProduct, onDeleteProduct,
  onUploadDocument, onUploadProductImage, onRunTestSearch,
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

  const handleProductImageUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    onUploadProductImage(file, type, setNewProduct, setEditingProduct);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div className="flex items-center space-x-6">
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">Base de Conocimiento RAG</h2>
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
          <button
            onClick={() => fileInputRef.current.click()}
            className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-800 shadow-sm flex items-center space-x-2"
          >
            <Link2 size={16} />
            <span className="text-[9px] font-black uppercase">Subir Doc</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.txt,.xlsx,.xls" />
          <button
            onClick={() => { if (ragSubTab === 'conocimiento') setShowNewCard(true); else setShowNewProduct(true); }}
            className="bg-slate-900 text-white px-8 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-[#FF6B00] transition-all flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Añadir {ragSubTab === 'conocimiento' ? 'Tarjeta' : 'Producto'}</span>
          </button>
        </div>
      </div>

      {/* Search Results */}
      {testResults.length > 0 ? (
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6 animate-in zoom-in-95 duration-500">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultados de Inteligencia</span>
              <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">{testResults.length} Encontrados</span>
            </div>
            <button onClick={() => { setTestResults([]); setTestQuery(''); }} className="text-[9px] font-black text-slate-400 uppercase hover:text-red-500 transition-colors flex items-center space-x-1">
              <X size={12} /><span>Limpiar</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testResults.map((res, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-[28px] p-6 space-y-3 hover:border-[#FF6B00]/30 transition-all group relative overflow-hidden">
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${res.tipo === 'Tarjeta' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>{res.tipo}</span>
                    {res.score > 0 && (
                      <span className="bg-slate-900 text-[#FF6B00] text-[8px] font-black px-2 py-1 rounded-lg flex items-center space-x-1">
                        <Zap size={8} fill="#FF6B00" />
                        <span>{res.score > 50 ? 'ALTA' : res.score > 20 ? 'MEDIA' : 'BAJA'} RELEVANCIA</span>
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full group-hover:animate-ping" />
                </div>
                <h4 className="text-xs font-black text-slate-800 uppercase italic relative z-10">{res.titulo}</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-4 italic relative z-10">{res.contenido}</p>
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  {res.tipo === 'Tarjeta' ? <BookOpen size={40} /> : <Tag size={40} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : testQuery && !isSearching ? (
        <div className="bg-white p-12 rounded-[32px] border border-slate-200 border-dashed text-center space-y-4 animate-in fade-in duration-500">
          <div className="bg-slate-50 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto text-slate-300"><Search size={32} /></div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase italic">Sin coincidencias exactas</h3>
            <p className="text-[10px] text-slate-400 italic">Intenta buscar con palabras más simples o verifica el catálogo.</p>
          </div>
        </div>
      ) : null}

      {/* Content Grid */}
      {ragSubTab === 'conocimiento' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map(doc => (
            <div key={doc.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-100 transition-all duration-500 group relative">
              <div className="absolute top-6 right-6 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditingCard(doc)} className="p-2 bg-slate-900 text-white rounded-xl hover:bg-[#FF6B00] transition-colors shadow-lg"><Pencil size={14} /></button>
                <button onClick={() => onDeleteCard(doc.id)} className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14} /></button>
              </div>
              <div className="space-y-6">
                <span className={`px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-tighter border ${CATEGORY_STYLES[doc.category]?.badge || CATEGORY_STYLES.General.badge}`}>{doc.category || 'General'}</span>
                <div>
                  <h4 className="text-lg font-black text-slate-800 uppercase italic leading-tight mb-2">{doc.name}</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed italic line-clamp-4">{doc.content}</p>
                </div>
                <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-[8px] font-black text-slate-300 uppercase tracking-widest italic">
                  <span>Actualizado</span>
                  <span className="tabular-nums">{doc.timestamp || '—'}</span>
                </div>
              </div>
            </div>
          ))}
          {documents.length === 0 && (
            <div className="col-span-3 py-20 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin tarjetas de conocimiento</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map(prod => (
            <div key={prod.id} className="bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-100 transition-all duration-500 group overflow-hidden flex flex-col">
              <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden flex items-center justify-center">
                {prod.imagen
                  ? <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  : <ShoppingBag size={48} className="text-slate-200 group-hover:scale-110 transition-transform duration-700" />
                }
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                  <button onClick={() => setEditingProduct(prod)} className="bg-white p-3 rounded-2xl text-slate-900 hover:bg-[#FF6B00] hover:text-white transition-all shadow-xl active:scale-90"><Pencil size={18} /></button>
                  <button onClick={() => onDeleteProduct(prod.id)} className="bg-white p-3 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-xl active:scale-90"><Trash2 size={18} /></button>
                </div>
                <span className={`absolute top-4 right-4 px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-tighter border shadow-lg ${STOCK_STYLES[prod.stock] || STOCK_STYLES['En stock']}`}>{prod.stock}</span>
              </div>
              <div className="p-6 space-y-4 flex-1 flex flex-col">
                <span className="text-[8px] font-black text-[#FF6B00] uppercase tracking-widest">{prod.categoria}</span>
                <div className="flex-1">
                  <h4 className="text-sm font-black text-slate-800 uppercase italic leading-tight mb-1">{prod.nombre}</h4>
                  <p className="text-[10px] text-slate-400 italic line-clamp-2">{prod.descripcion}</p>
                </div>
                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-lg font-black text-slate-900 tabular-nums italic">Q{prod.precio}</span>
                  <span className="h-2 w-2 bg-emerald-400 rounded-full" />
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div className="col-span-4 py-20 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin productos en catálogo</p>
            </div>
          )}
        </div>
      )}

      {/* Modal: Nueva Tarjeta */}
      {showNewCard && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Nueva Tarjeta de Conocimiento</h3>
              <button onClick={() => setShowNewCard(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800"><X size={20} /></button>
            </div>
            <div className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre / Título</label>
                  <input type="text" value={newCard.name} onChange={e => setNewCard({...newCard, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" placeholder="Ej: Garantía de Motores" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Categoría</label>
                  <select value={newCard.category} onChange={e => setNewCard({...newCard, category: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all">
                    {CARD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Contenido</label>
                <textarea rows={6} value={newCard.content} onChange={e => setNewCard({...newCard, content: e.target.value})} className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-3xl text-xs font-medium leading-relaxed outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all resize-none italic" placeholder="Información que la IA usará para responder..." />
              </div>
              <button onClick={handleSaveCard} className="w-full py-5 bg-slate-900 text-white rounded-[28px] text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200 hover:bg-[#FF6B00] transition-all active:scale-95">Integrar al Conocimiento</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Tarjeta */}
      {editingCard && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Editar Conocimiento</h3>
              <button onClick={() => setEditingCard(null)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800"><X size={20} /></button>
            </div>
            <div className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre / Título</label>
                  <input type="text" value={editingCard.name} onChange={e => setEditingCard({...editingCard, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Categoría</label>
                  <select value={editingCard.category} onChange={e => setEditingCard({...editingCard, category: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all">
                    {CARD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Contenido</label>
                <textarea rows={6} value={editingCard.content} onChange={e => setEditingCard({...editingCard, content: e.target.value})} className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-3xl text-xs font-medium leading-relaxed outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all resize-none italic" />
              </div>
              <button onClick={handleUpdateCard} className="w-full py-5 bg-slate-900 text-white rounded-[28px] text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200 hover:bg-[#FF6B00] transition-all active:scale-95">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Producto */}
      {showNewProduct && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Nuevo Producto del Catálogo</h3>
              <button onClick={() => setShowNewProduct(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800"><X size={20} /></button>
            </div>
            <div className="p-10 space-y-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-48 space-y-4 shrink-0">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">Imagen</label>
                  <div className="aspect-square bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100 flex items-center justify-center relative group overflow-hidden">
                    {newProduct.imagen ? <img src={newProduct.imagen} alt="Preview" className="w-full h-full object-cover" /> : <Plus size={24} className="text-slate-300 group-hover:scale-110 transition-transform" />}
                    <input type="file" onChange={(e) => handleProductImageUpload(e, 'new')} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                  </div>
                  <p className="text-[8px] text-slate-400 text-center italic leading-tight">Clic para subir imagen</p>
                </div>
                <div className="flex-1 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre del Producto</label>
                    <input type="text" value={newProduct.nombre} onChange={e => setNewProduct({...newProduct, nombre: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" placeholder="Ej: Motor Residencial BFT" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Precio (Q)</label>
                      <input type="text" value={newProduct.precio} onChange={e => setNewProduct({...newProduct, precio: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all tabular-nums" placeholder="2500.00" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Stock</label>
                      <select value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all">
                        {STOCK_OPTIONS.map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Categoría</label>
                  <select value={newProduct.categoria} onChange={e => setNewProduct({...newProduct, categoria: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all">
                    {PRODUCT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Link del Catálogo (opcional)</label>
                  <input type="text" value={newProduct.catalog_link || ''} onChange={e => setNewProduct({...newProduct, catalog_link: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Descripción Detallada</label>
                <textarea rows={4} value={newProduct.descripcion} onChange={e => setNewProduct({...newProduct, descripcion: e.target.value})} className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-3xl text-xs font-medium leading-relaxed outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all resize-none italic" placeholder="Características técnicas, garantía, etc..." />
              </div>
              <button onClick={handleSaveProduct} className="w-full py-5 bg-slate-900 text-white rounded-[28px] text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200 hover:bg-[#FF6B00] transition-all active:scale-95">Publicar en Catálogo</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Producto */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Editar Producto</h3>
              <button onClick={() => setEditingProduct(null)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800"><X size={20} /></button>
            </div>
            <div className="p-10 space-y-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-48 space-y-4 shrink-0">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">Imagen</label>
                  <div className="aspect-square bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100 flex items-center justify-center relative group overflow-hidden">
                    {editingProduct.imagen ? <img src={editingProduct.imagen} alt="Preview" className="w-full h-full object-cover" /> : <ShoppingBag size={24} className="text-slate-300 group-hover:scale-110 transition-transform" />}
                    <input type="file" onChange={(e) => handleProductImageUpload(e, 'edit')} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                  </div>
                </div>
                <div className="flex-1 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre del Producto</label>
                    <input type="text" value={editingProduct.nombre} onChange={e => setEditingProduct({...editingProduct, nombre: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Precio (Q)</label>
                      <input type="text" value={editingProduct.precio} onChange={e => setEditingProduct({...editingProduct, precio: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all tabular-nums" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Stock</label>
                      <select value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all">
                        {STOCK_OPTIONS.map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Categoría</label>
                  <select value={editingProduct.categoria} onChange={e => setEditingProduct({...editingProduct, categoria: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all">
                    {PRODUCT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Link del Catálogo</label>
                  <input type="text" value={editingProduct.catalog_link || ''} onChange={e => setEditingProduct({...editingProduct, catalog_link: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Descripción Detallada</label>
                <textarea rows={4} value={editingProduct.descripcion} onChange={e => setEditingProduct({...editingProduct, descripcion: e.target.value})} className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-3xl text-xs font-medium leading-relaxed outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#FF6B00] transition-all resize-none italic" />
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <input type="checkbox" checked={!!editingProduct.activo} onChange={e => setEditingProduct({...editingProduct, activo: e.target.checked ? 1 : 0})} className="hidden" />
                  <div className={`h-6 w-11 rounded-full relative transition-all ${editingProduct.activo ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 h-4 w-4 bg-white rounded-full transition-all ${editingProduct.activo ? 'left-6' : 'left-1'}`} />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase group-hover:text-slate-800 transition-colors">Activo en catálogo</span>
                </label>
              </div>
              <button onClick={handleUpdateProduct} className="w-full py-5 bg-slate-900 text-white rounded-[28px] text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200 hover:bg-[#FF6B00] transition-all active:scale-95">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
