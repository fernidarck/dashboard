import { useState, useMemo, useRef } from 'react';
import {
  X, Plus, Minus, Trash2, Printer, Copy, SendHorizontal,
  ShoppingBag, Search, Sparkles, Check, DollarSign,
  Percent, FileText, ChevronDown, ChevronUp, Package,
  RotateCcw, ShieldCheck, Truck, Clock, CheckCircle2,
  RefreshCw, Download
} from 'lucide-react';
import { generateQuotePdf } from '../utils/quotePdfGenerator.js';

const fmtQ = (n) => new Intl.NumberFormat('es-GT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(parseFloat(n) || 0);

export default function QuickQuoteDrawer({
  selectedLead = {},
  products = [],
  onClose,
  onSendMessage,
  onSendDocument,
  onInsertText,
  onSavePedido,
  hideHeader = false,
  className = ''
}) {
  const [items, setItems] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [discountType, setDiscountType] = useState('amount'); // 'amount' | 'percent'
  const [discountValue, setDiscountValue] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingPdf, setSendingPdf] = useState(false);
  const [pdfSentSuccess, setPdfSentSuccess] = useState(false);
  const [savedOrder, setSavedOrder] = useState(false);
  const [scheduledDay, setScheduledDay] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Notas predeterminadas tipo checklist
  const [presetNotes, setPresetNotes] = useState({
    'Garantía por escrito de 1 año en motores y equipos': true,
    'Entrega inmediata y armada lista para funcionar': true,
    'Cotización válida por 15 días': true,
    'Instalación técnica profesional garantizada': false,
  });

  const searchInputRef = useRef(null);

  // Filtrado de productos disponibles
  const filteredProducts = useMemo(() => {
    const list = products.filter(p => p.activo !== 0);
    if (!productSearch.trim()) return list.slice(0, 10);
    const q = productSearch.toLowerCase().trim();
    return list.filter(p =>
      (p.nombre || '').toLowerCase().includes(q) ||
      (p.categoria || '').toLowerCase().includes(q) ||
      (p.descripcion || '').toLowerCase().includes(q)
    ).slice(0, 12);
  }, [products, productSearch]);

  // Agregar producto desde catálogo
  const handleAddProduct = (prod) => {
    // Si ya existe en la lista, aumentar cantidad
    const existingIdx = items.findIndex(it => it.product_id === prod.id);
    if (existingIdx >= 0) {
      setItems(prev => prev.map((it, idx) =>
        idx === existingIdx ? { ...it, qty: it.qty + 1 } : it
      ));
    } else {
      const price = parseFloat(prod.precio_oferta || prod.precio) || 0;
      setItems(prev => [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random()}`,
          product_id: prod.id,
          name: prod.nombre,
          qty: 1,
          unit_price: price,
          description: prod.descripcion ? prod.descripcion.slice(0, 100) : '',
          image: prod.imagen || prod.imagenes?.[0] || ''
        }
      ]);
    }
    setProductSearch('');
    setShowProductDropdown(false);
  };

  // Agregar ítem libre / personalizado (ej: Instalación, Cremallera adicional, Flete)
  const handleAddCustomItem = (presetName = '', defaultPrice = 0) => {
    setItems(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}-${Math.random()}`,
        product_id: null,
        name: presetName || 'Servicio o Ítem Especial',
        qty: 1,
        unit_price: defaultPrice,
        description: '',
        image: ''
      }
    ]);
  };

  // Actualizar campo de un ítem
  const handleUpdateItem = (idx, field, value) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      return { ...it, [field]: value };
    }));
  };

  // Eliminar ítem
  const handleRemoveItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Cambiar cantidad
  const handleChangeQty = (idx, delta) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const nextQty = Math.max(1, (parseInt(it.qty, 10) || 1) + delta);
      return { ...it, qty: nextQty };
    }));
  };

  // Cálculos financieros
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => {
      const q = parseFloat(it.qty) || 0;
      const p = parseFloat(it.unit_price) || 0;
      return sum + (q * p);
    }, 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    const val = parseFloat(discountValue) || 0;
    if (val <= 0) return 0;
    if (discountType === 'percent') {
      return (subtotal * val) / 100;
    }
    return Math.min(subtotal, val);
  }, [subtotal, discountValue, discountType]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  // Generar texto para WhatsApp
  const generateWhatsAppMessage = () => {
    const dateStr = new Date().toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    let text = `📄 *COTIZACIÓN — ONECONTROL*\n`;
    if (selectedLead?.nombre) text += `👤 *Cliente:* ${selectedLead.nombre}\n`;
    text += `📅 *Fecha:* ${dateStr}\n\n`;
    text += `🛍️ *Detalle de Equipos y Servicios:*\n`;

    items.forEach((item) => {
      const q = parseFloat(item.qty) || 1;
      const up = parseFloat(item.unit_price) || 0;
      const lineTotal = q * up;
      text += `• ${q}x *${item.name}* ➔ Q${fmtQ(lineTotal)}${q > 1 ? ` (Q${fmtQ(up)} c/u)` : ''}\n`;
      if (item.description && item.description.trim()) {
        text += `  _${item.description.trim()}_\n`;
      }
    });

    text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💵 *Subtotal:* Q${fmtQ(subtotal)}\n`;
    if (discountAmount > 0) {
      text += `🏷️ *Descuento Especial:* -Q${fmtQ(discountAmount)}\n`;
    }
    text += `💰 *TOTAL A PAGAR:* *Q${fmtQ(total)}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;

    const activePresets = Object.entries(presetNotes).filter(([_, active]) => active).map(([k]) => k);
    if (activePresets.length > 0 || customNotes.trim()) {
      text += `\n📌 *Condiciones y Garantía:*\n`;
      activePresets.forEach(preset => {
        text += `✅ ${preset}\n`;
      });
      if (customNotes.trim()) {
        text += `ℹ️ ${customNotes.trim()}\n`;
      }
    }

    text += `\n🤝 _¿Deseas que coordinemos la entrega o instalación? Con gusto te asistimos._`;
    return text;
  };

  // Acción: Pegar en el input de chat para que el agente revise antes de enviar
  const handleInsertIntoChat = () => {
    if (items.length === 0) return;
    const msg = generateWhatsAppMessage();
    onInsertText?.(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Acción: Copiar al portapapeles
  const handleCopyToClipboard = async () => {
    if (items.length === 0) return;
    const msg = generateWhatsAppMessage();
    try {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onInsertText?.(msg);
    }
  };

  // Acción: Enviar directamente por WhatsApp
  const handleSendDirect = async () => {
    if (items.length === 0 || !onSendMessage) return;
    setSending(true);
    try {
      const msg = generateWhatsAppMessage();
      await onSendMessage(selectedLead?.phone || selectedLead?.id, msg);
    } finally {
      setSending(false);
    }
  };

  // Acción: Guardar como Pedido en el CRM
  const handleSaveAsPedido = async () => {
    if (items.length === 0 || !onSavePedido) return;
    setSavedOrder(true);
    try {
      const prodSummary = items.map(i => `${i.qty}x ${i.name}`).join(' + ');
      let fechaEntregaCombined = '';
      if (scheduledDay && scheduledTime) {
        fechaEntregaCombined = `${scheduledDay} · ${scheduledTime}`;
      } else if (scheduledDay) {
        fechaEntregaCombined = scheduledDay;
      } else if (scheduledTime) {
        fechaEntregaCombined = scheduledTime;
      }

      await onSavePedido({
        cliente: selectedLead?.nombre || 'Cliente WhatsApp',
        phone: selectedLead?.phone || '',
        producto: prodSummary,
        cantidad: '1',
        precio: `Q${fmtQ(total)}`,
        notas: `Cotizado desde chat. Subtotal: Q${fmtQ(subtotal)}, Descuento: Q${fmtQ(discountAmount)}. ${customNotes || ''}`,
        fecha_entrega: fechaEntregaCombined,
        estado: fechaEntregaCombined ? 'Visita Programada' : 'Nuevo'
      });
      setTimeout(() => setSavedOrder(false), 3000);
    } catch (e) {
      console.error('Error guardando pedido:', e);
      setSavedOrder(false);
    }
  };

  // Acción: Imprimir o Generar PDF Membretado profesional (Estilo CRM)
  const handlePrintPdf = () => {
    if (items.length === 0) return;
    const dateStr = new Date().toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const quoteNum = `COT-${Math.floor(100000 + Math.random() * 900000)}`;
    const activePresets = Object.entries(presetNotes).filter(([_, active]) => active).map(([k]) => k);

    const printHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cotización ${quoteNum} - ${selectedLead?.nombre || 'Cliente'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #1e293b; padding: 40px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
    .company h1 { font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
    .company h1 span { color: #FF6B00; }
    .company p { font-size: 11px; color: #64748b; line-height: 1.5; }
    .meta { text-align: right; }
    .meta h2 { font-size: 18px; font-weight: 900; color: #0f172a; }
    .meta p { font-size: 11px; color: #64748b; margin-top: 2px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; margin-top: 6px; }
    .divider { border: none; border-top: 2px solid #f1f5f9; margin: 20px 0; }
    .client-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .client-card .label { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; }
    .client-card .val { font-size: 12px; font-weight: 700; color: #1e293b; margin-top: 1px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #0f172a; color: #fff; padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
    th.r { text-align: right; }
    th.c { text-align: center; }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; vertical-align: top; }
    td.r { text-align: right; }
    td.c { text-align: center; }
    .desc { font-size: 10px; color: #64748b; margin-top: 3px; }
    .totals { margin-left: auto; width: 280px; border-collapse: collapse; }
    .totals td { padding: 6px 12px; border: none; font-size: 12px; }
    .totals tr.grand-total td { font-weight: 900; font-size: 16px; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 10px; }
    .terms { margin-top: 36px; padding: 16px; background: #fffaf5; border: 1px dashed #fed7aa; border-radius: 12px; font-size: 11px; color: #475569; }
    .terms h4 { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #ea580c; margin-bottom: 6px; }
    .terms ul { margin-left: 18px; line-height: 1.6; }
    @media print {
      body { padding: 0; background: #fff; }
      .terms { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">
      <img src="${window.location.origin}/logo-onecontrol.png" alt="OneControl" style="height: 48px; width: auto; object-fit: contain; margin-bottom: 8px; display: block;" onerror="this.style.display='none'" />
      <h1>ONE<span>CONTROL</span></h1>
      <p>Automatización de Portones y Control de Acceso Inteligente</p>
      <p>PBX / WhatsApp: +502 5965-8803 | Guatemala</p>
      <p>www.onecontrol.shop</p>
    </div>
    <div class="meta">
      <h2>COTIZACIÓN</h2>
      <p><strong>Nº:</strong> ${quoteNum}</p>
      <p><strong>Fecha:</strong> ${dateStr}</p>
      <span class="badge">Válida por 15 días</span>
    </div>
  </div>

  <div class="client-card">
    <div>
      <p class="label">Cliente</p>
      <p class="val">${selectedLead?.nombre || 'Consumidor Final'}</p>
    </div>
    <div>
      <p class="label">Teléfono / WhatsApp</p>
      <p class="val">${selectedLead?.phone || '—'}</p>
    </div>
    <div>
      <p class="label">Ubicación / Zona</p>
      <p class="val">${selectedLead?.direccion || selectedLead?.zona || 'Ciudad de Guatemala'}</p>
    </div>
    <div>
      <p class="label">NIT</p>
      <p class="val">${selectedLead?.nit || 'CF'}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 50%;">Descripción / Equipo</th>
        <th class="c" style="width: 15%;">Cantidad</th>
        <th class="r" style="width: 17%;">Precio Unitario</th>
        <th class="r" style="width: 18%;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(it => `
        <tr>
          <td>
            <strong>${it.name}</strong>
            ${it.description ? `<div class="desc">${it.description}</div>` : ''}
          </td>
          <td class="c">${it.qty}</td>
          <td class="r">Q${fmtQ(it.unit_price)}</td>
          <td class="r"><strong>Q${fmtQ(it.qty * it.unit_price)}</strong></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <table class="totals">
    <tbody>
      <tr>
        <td>Subtotal</td>
        <td style="text-align: right;">Q${fmtQ(subtotal)}</td>
      </tr>
      ${discountAmount > 0 ? `
        <tr>
          <td style="color: #ea580c;">Descuento</td>
          <td style="text-align: right; color: #ea580c;">- Q${fmtQ(discountAmount)}</td>
        </tr>
      ` : ''}
      <tr class="grand-total">
        <td>TOTAL</td>
        <td style="text-align: right;">Q${fmtQ(total)}</td>
      </tr>
    </tbody>
  </table>

  ${(activePresets.length > 0 || customNotes.trim()) ? `
    <div class="terms">
      <h4>Términos de la Oferta y Garantía:</h4>
      <ul>
        ${activePresets.map(p => `<li>${p}</li>`).join('')}
        ${customNotes.trim() ? `<li>${customNotes.trim()}</li>` : ''}
      </ul>
    </div>
  ` : ''}

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 350);
    };
  </script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=850,height=950');
    if (win) {
      win.document.write(printHtml);
      win.document.close();
    }
  };

  // Acción: Generar PDF formal y enviarlo directamente por WhatsApp al cliente
  const handleSendPdfWhatsApp = async () => {
    if (items.length === 0) return;
    if (!selectedLead || !selectedLead.id) {
      alert('Selecciona un chat o cliente para enviar la cotización.');
      return;
    }
    setSendingPdf(true);
    try {
      const { file, quoteNum } = generateQuotePdf({
        selectedLead,
        items,
        subtotal,
        discountAmount,
        total,
        presetNotes,
        customNotes
      });

      const caption = `📄 *Cotización Formal ONE CONTROL (${quoteNum})*\nHola ${selectedLead.nombre || ''}, te adjunto la cotización formal en PDF con los detalles y precios solicitados. ¡Quedo a la orden ante cualquier duda!`;

      if (onSendDocument) {
        await onSendDocument(selectedLead.id, file, caption);
        setPdfSentSuccess(true);
        setTimeout(() => setPdfSentSuccess(false), 4000);
      } else {
        // Fallback: descarga directa si no hay callback
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error generando/enviando PDF:', err);
      alert('Error al generar el PDF: ' + err.message);
    } finally {
      setSendingPdf(false);
    }
  };

  // Acción: Descargar archivo PDF generado
  const handleDownloadPdf = () => {
    if (items.length === 0) return;
    try {
      const { file } = generateQuotePdf({
        selectedLead,
        items,
        subtotal,
        discountAmount,
        total,
        presetNotes,
        customNotes
      });
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error descargando PDF:', err);
      handlePrintPdf();
    }
  };

  // Presets rápidos para añadir con 1 clic
  const PRESET_SERVICES = [
    { label: 'Instalación Básica', price: 450 },
    { label: 'Control Extra', price: 150 },
    { label: 'Cremallera 1m', price: 120 },
    { label: 'Flete / Envío', price: 75 },
    { label: 'Mantenimiento', price: 350 },
  ];

  return (
    <div className={`flex flex-col h-full bg-white ${className || 'border-l border-slate-200 w-full sm:w-[410px] shrink-0 animate-in slide-in-from-right-4 duration-300 shadow-xl md:shadow-none z-30'}`}>
      {/* HEADER */}
      {!hideHeader ? (
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-2.5">
            <img src="/logo-onecontrol.png" alt="OneControl" className="h-8 w-auto object-contain bg-white rounded-lg p-1 shrink-0 shadow-xs" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                Cotizador Rápido
              </h3>
              <p className="text-[10px] text-slate-400 font-medium truncate max-w-[210px]">
                {selectedLead?.nombre ? `Para: ${selectedLead.nombre}` : 'Cotización instantánea'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => setItems([])}
                title="Limpiar cotización"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Cerrar cotizador"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-slate-600 shrink-0">
          <div className="flex items-center space-x-2 min-w-0">
            <img src="/logo-onecontrol.png" alt="OneControl" className="h-4 w-auto object-contain shrink-0" />
            <p className="text-[11px] text-slate-700 font-bold truncate">
              {selectedLead?.nombre ? `Cotizando a: ${selectedLead.nombre}` : 'Cotización para el chat'}
            </p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setItems([])}
              title="Limpiar cotización"
              className="text-[10px] font-black text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-red-50"
            >
              <RotateCcw size={11} />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      )}

      {/* CONTENIDO SCROLLEABLE */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {/* BUSCADOR DE PRODUCTOS */}
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3 text-slate-400" size={14} />
            <input
              ref={searchInputRef}
              type="text"
              value={productSearch}
              onChange={e => {
                setProductSearch(e.target.value);
                setShowProductDropdown(true);
              }}
              onFocus={() => setShowProductDropdown(true)}
              placeholder="Buscar motor, control, cremallera..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-all"
            />
            {productSearch && (
              <button
                type="button"
                onClick={() => setProductSearch('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* DROPDOWN DE PRODUCTOS */}
          {showProductDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto no-scrollbar">
              <div className="p-2 border-b border-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Catálogo ({filteredProducts.length})</span>
                <button
                  type="button"
                  onClick={() => setShowProductDropdown(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  Cerrar
                </button>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 font-medium">
                  No se encontraron productos con "{productSearch}"
                </div>
              ) : (
                filteredProducts.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddProduct(p)}
                    className="w-full p-2.5 hover:bg-orange-50/70 text-left flex items-center space-x-3 transition-colors border-b border-slate-50 last:border-0 cursor-pointer"
                  >
                    {p.imagen ? (
                      <img src={p.imagen} alt="" className="h-8 w-8 rounded-lg object-cover bg-slate-100 shrink-0" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-orange-100 text-[#FF6B00] flex items-center justify-center shrink-0">
                        <Package size={14} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{p.nombre}</p>
                      <p className="text-[10px] text-slate-400">{p.categoria || 'General'}</p>
                    </div>
                    <span className="text-xs font-black text-[#FF6B00] shrink-0">
                      Q{fmtQ(p.precio_oferta || p.precio)}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* CHIPS RÁPIDOS (PRESETS DE SERVICIOS) */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
            <span>+ Agregar Rápido</span>
            <button
              type="button"
              onClick={() => handleAddCustomItem()}
              className="text-[#FF6B00] hover:underline cursor-pointer"
            >
              + Personalizado
            </button>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_SERVICES.map((srv, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddCustomItem(srv.label, srv.price)}
                className="px-2 py-1 bg-slate-100 hover:bg-orange-100 hover:text-[#FF6B00] text-slate-700 rounded-lg text-[10px] font-black transition-all cursor-pointer border border-transparent hover:border-orange-200"
              >
                + {srv.label} (Q{srv.price})
              </button>
            ))}
          </div>
        </div>

        {/* LISTA DE ITEMS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Ítems en Cotización ({items.length})
            </span>
          </div>

          {items.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-2">
              <ShoppingBag size={28} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Cotización vacía</p>
              <p className="text-[10px] text-slate-400">
                Selecciona productos del catálogo o usa los botones rápidos para armar el paquete.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 relative group hover:border-[#FF6B00]/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <textarea
                      value={it.name}
                      onChange={e => handleUpdateItem(idx, 'name', e.target.value)}
                      placeholder="Nombre del ítem o servicio..."
                      rows={it.name && it.name.length > 40 ? 2 : 1}
                      className="font-bold text-xs text-slate-800 bg-transparent flex-1 outline-none border-b border-transparent focus:border-slate-300 resize-none leading-relaxed"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer shrink-0"
                      title="Eliminar ítem"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Descripción o detalle opcional */}
                  {it.showDesc || (it.description && it.description.trim()) ? (
                    <div className="pt-0.5">
                      <textarea
                        value={it.description || ''}
                        onChange={e => handleUpdateItem(idx, 'description', e.target.value)}
                        placeholder="Descripción o especificación adicional..."
                        rows={2}
                        className="w-full text-[11px] text-slate-600 bg-white/80 border border-slate-200 rounded-lg p-2 outline-none focus:border-[#FF6B00] resize-none leading-relaxed"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUpdateItem(idx, 'showDesc', true)}
                      className="text-[10px] text-slate-400 hover:text-[#FF6B00] font-medium transition-colors cursor-pointer text-left block"
                    >
                      + Detalle / especificación
                    </button>
                  )}

                  {/* CANTIDAD, PRECIO Y SUBTOTAL */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    {/* Control de Cantidad */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleChangeQty(idx, -1)}
                        className="p-1 hover:bg-slate-100 text-slate-600 cursor-pointer"
                      >
                        <Minus size={11} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={it.qty}
                        onChange={e => handleUpdateItem(idx, 'qty', Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-8 text-center text-xs font-bold text-slate-800 outline-none bg-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => handleChangeQty(idx, 1)}
                        className="p-1 hover:bg-slate-100 text-slate-600 cursor-pointer"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    {/* Precio Unitario */}
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] font-bold text-slate-400">Q</span>
                      <input
                        type="number"
                        step="any"
                        value={it.unit_price}
                        onChange={e => handleUpdateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-20 px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-right outline-none focus:border-[#FF6B00]"
                      />
                    </div>

                    {/* Subtotal Línea */}
                    <div className="text-right min-w-[70px]">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Subtotal</span>
                      <span className="font-black text-xs text-slate-900">
                        Q{fmtQ((parseFloat(it.qty) || 0) * (parseFloat(it.unit_price) || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AJUSTES: DESCUENTO Y NOTAS */}
        {items.length > 0 && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            {/* Descuento */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">Descuento</span>
              <div className="flex items-center space-x-1.5">
                <div className="flex bg-slate-200 p-0.5 rounded-lg text-[10px] font-black">
                  <button
                    type="button"
                    onClick={() => setDiscountType('amount')}
                    className={`px-1.5 py-0.5 rounded-md transition-all ${discountType === 'amount' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
                  >
                    Q
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percent')}
                    className={`px-1.5 py-0.5 rounded-md transition-all ${discountType === 'percent' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
                  >
                    %
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  placeholder="0"
                  className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-right outline-none focus:border-[#FF6B00]"
                />
              </div>
            </div>

            {/* Checklist de Presets de Garantía / Términos */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                Términos y Garantías (Checklist)
              </p>
              {Object.entries(presetNotes).map(([k, active]) => (
                <label key={k} className="flex items-center space-x-2 text-[11px] font-medium text-slate-700 cursor-pointer hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={e => setPresetNotes(prev => ({ ...prev, [k]: e.target.checked }))}
                    className="rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00] cursor-pointer"
                  />
                  <span className="truncate">{k}</span>
                </label>
              ))}
            </div>

            {/* Nota libre adicional */}
            <div>
              <input
                type="text"
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                placeholder="Nota extra (ej: Pago 50% anticipo, 50% contra entrega)..."
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-medium text-slate-800 outline-none focus:border-[#FF6B00]"
              />
            </div>

            {/* Agendar Visita / Entrega para el Pedido */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
                  <Clock size={11} className="text-amber-600" />
                  Visita / Entrega (para el pedido)
                </span>
                {(scheduledDay || scheduledTime) && (
                  <button
                    type="button"
                    onClick={() => { setScheduledDay(''); setScheduledTime(''); }}
                    className="text-[9px] text-amber-700 hover:text-amber-950 font-bold underline cursor-pointer"
                  >
                    Quitar
                  </button>
                )}
              </div>
              
              {/* Días rápidos */}
              <div className="flex flex-wrap gap-1">
                {['Sábado', 'Hoy', 'Mañana', 'Jueves', 'Viernes', 'Lunes'].map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setScheduledDay(day)}
                    className={`text-[10px] font-black px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                      scheduledDay === day
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Horas rápidas */}
              <div className="flex items-center gap-1.5 pt-1">
                <div className="flex flex-wrap gap-1 flex-1">
                  {['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'].map(hr => (
                    <button
                      key={hr}
                      type="button"
                      onClick={() => setScheduledTime(hr)}
                      className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-md border transition-all cursor-pointer ${
                        scheduledTime === hr
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50'
                      }`}
                    >
                      {hr}
                    </button>
                  ))}
                </div>
                <input
                  type="time"
                  onChange={e => {
                    if (e.target.value) {
                      const [hh, mm] = e.target.value.split(':');
                      const h = parseInt(hh, 10);
                      const ampm = h >= 12 ? 'PM' : 'AM';
                      const h12 = h % 12 || 12;
                      setScheduledTime(`${String(h12).padStart(2, '0')}:${mm} ${ampm}`);
                    }
                  }}
                  className="px-1.5 py-0.5 rounded-md border border-slate-200 bg-white text-[10px] font-bold text-slate-700 cursor-pointer outline-none"
                  title="Hora personalizada"
                />
              </div>
              
              {(scheduledDay || scheduledTime) && (
                <p className="text-[9.5px] text-amber-800 font-bold bg-amber-50 px-2 py-1 rounded-md border border-amber-200/60">
                  Agendado: {[scheduledDay, scheduledTime].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* RESUMEN TOTAL */}
        {items.length > 0 && (
          <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 shadow-lg">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Subtotal</span>
              <span>Q{fmtQ(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between items-center text-xs text-orange-400">
                <span>Descuento</span>
                <span>- Q{fmtQ(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Total Cotizado</span>
              <span className="text-xl font-black text-[#FF6B00]">
                Q{fmtQ(total)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER CON BOTONES DE ACCIÓN RÁPIDA (DISEÑO MINIMALISTA) */}
      {items.length > 0 && (
        <div className="p-3.5 border-t border-slate-100 bg-white space-y-2 shrink-0">
          {/* BOTÓN 1: ENVIAR COTIZACIÓN PDF POR WHATSAPP */}
          <button
            type="button"
            onClick={handleSendPdfWhatsApp}
            disabled={sendingPdf || sending}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
              pdfSentSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
            }`}
            title="Genera el archivo PDF membretado formal y lo envía al chat de WhatsApp"
          >
            {pdfSentSuccess ? (
              <>
                <Check size={14} className="stroke-[2.5]" />
                <span>¡Cotización PDF enviada!</span>
              </>
            ) : sendingPdf ? (
              <>
                <RefreshCw size={14} className="animate-spin text-slate-300" />
                <span>Generando y enviando PDF...</span>
              </>
            ) : (
              <>
                <FileText size={14} className="text-amber-400" />
                <span>Enviar cotización PDF por WhatsApp</span>
              </>
            )}
          </button>

          {/* BOTÓN 2: ENVIAR RESUMEN TEXTO */}
          <button
            type="button"
            onClick={handleSendDirect}
            disabled={sending || sendingPdf}
            className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            title="Enviar cotización como mensaje de texto en WhatsApp"
          >
            <SendHorizontal size={13} className="text-slate-500" />
            <span>{sending ? 'Enviando texto...' : 'Enviar resumen en texto'}</span>
          </button>

          {/* Botones secundarios: Descargar PDF + Pegar en Chat */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleDownloadPdf}
              title="Descargar archivo PDF membretado"
              className="py-1.5 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-600 hover:text-slate-900 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={13} className="text-slate-400" />
              <span>Descargar PDF</span>
            </button>

            <button
              type="button"
              onClick={handleInsertIntoChat}
              title="Pegar texto en el cuadro de escritura para editarlo antes de mandar"
              className="py-1.5 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-600 hover:text-slate-900 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-slate-400" />}
              <span>{copied ? '¡Pegado!' : 'Pegar en chat'}</span>
            </button>
          </div>

          {/* Botón terciario: Guardar como Pedido */}
          {onSavePedido && (
            <button
              type="button"
              onClick={handleSaveAsPedido}
              disabled={savedOrder}
              className="w-full py-1 text-slate-400 hover:text-slate-600 text-[10.5px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {savedOrder ? (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Guardado en pedidos {(scheduledDay || scheduledTime) ? `(${[scheduledDay, scheduledTime].filter(Boolean).join(' · ')})` : ''}
                </span>
              ) : (
                <span>Guardar en pedidos {(scheduledDay || scheduledTime) ? `(${[scheduledDay, scheduledTime].filter(Boolean).join(' · ')})` : ''}</span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
