import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, Printer, Save, Check, RefreshCw, ZoomIn, ZoomOut,
  Maximize2, Tag, Truck, MapPin, Phone, User, Package,
  DollarSign, FileText, Calendar, ExternalLink, Sliders,
  CheckCircle2, AlertCircle, Building2, HelpCircle
} from 'lucide-react';
import { ONE_CONTROL_LOGO_BASE64 } from '../assets/logoBase64.js';

// ── TAMAÑOS PREESTABLECIDOS DE STICKERS ─────────────────────────────────────
export const STICKER_SIZES = [
  {
    id: '10x15',
    name: '10 x 15 cm (4" x 6")',
    badge: 'Guía Grande / Zebra',
    description: 'Estándar para paquetería (Guatex, Cargo Expreso, Encomiendas).',
    widthMm: 100,
    heightMm: 150,
    aspect: '100 / 150',
    density: 'spacious'
  },
  {
    id: '10x10',
    name: '10 x 10 cm (4" x 4")',
    badge: 'Cuadrado Grande',
    description: 'Ideal para cajas medianas y cajas de motores.',
    widthMm: 100,
    heightMm: 100,
    aspect: '100 / 100',
    density: 'medium'
  },
  {
    id: '10x7.5',
    name: '10 x 7.5 cm (4" x 3")',
    badge: 'Mediano Estándar ⭐',
    description: 'Tamaño más versátil y balanceado para despachos y cajas.',
    widthMm: 100,
    heightMm: 75,
    aspect: '100 / 75',
    density: 'normal'
  },
  {
    id: '7.5x5',
    name: '7.5 x 5 cm (3" x 2")',
    badge: 'Caja Compacta',
    description: 'Sticker mediano para muebles pequeños o accesorios.',
    widthMm: 75,
    heightMm: 50,
    aspect: '75 / 50',
    density: 'compact'
  },
  {
    id: '5x2.5',
    name: '5 x 2.5 cm (2" x 1")',
    badge: 'Mini / Controles',
    description: 'Mini etiqueta para pegar directo en cajas de controles remotos.',
    widthMm: 50,
    heightMm: 25,
    aspect: '50 / 25',
    density: 'tiny'
  },
  {
    id: 'custom',
    name: 'Personalizado',
    badge: 'Medida Libre',
    description: 'Especifica ancho y alto exactos en milímetros.',
    widthMm: 100,
    heightMm: 75,
    aspect: '100 / 75',
    density: 'normal'
  }
];

// ── GENERADOR DE CÓDIGO DE BARRAS CODE 39 EN SVG PURO ───────────────────────
// Code 39 es universal, súper robusto y legible por cualquier lector o celular.
const CODE39_ENCODINGS = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
  'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
  'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
  'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
  'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
  'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
  'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
  '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100'
};

function generateBarcodeSvg(text, height = 36) {
  const clean = '*' + String(text || 'OC-PEDIDO').toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '') + '*';
  let narrow = 2;
  let wide = 5;
  let gap = 2;
  
  let rects = [];
  let currentX = 10;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const pattern = CODE39_ENCODINGS[char] || CODE39_ENCODINGS['-'];
    for (let j = 0; j < 9; j++) {
      const isBar = (j % 2 === 0);
      const isWide = pattern[j] === '1';
      const width = isWide ? wide : narrow;
      if (isBar) {
        rects.push(`<rect x="${currentX}" y="0" width="${width}" height="${height}" fill="#000" />`);
      }
      currentX += width;
    }
    currentX += gap;
  }

  const totalWidth = currentX + 10;
  return `<svg viewBox="0 0 ${totalWidth} ${height}" preserveAspectRatio="none" style="width: 100%; height: ${height}px; display: block;">${rects.join('')}</svg>`;
}

// ── COMPONENTE PRINCIPAL MODAL STICKER PRINT ────────────────────────────────
export default function StickerPrint({
  isOpen,
  onClose,
  pedido,
  leads = [],
  onUpdateLead,
  onSavePedido
}) {
  if (!isOpen || !pedido) return null;

  // Encontrar lead asociado por teléfono (limpiando caracteres no numéricos)
  const cleanDigits = (s) => String(s || '').replace(/\D/g, '');
  const matchedLead = useMemo(() => {
    if (!pedido?.phone) return null;
    const pPhone = cleanDigits(pedido.phone);
    if (!pPhone) return null;
    return leads.find(l => {
      const lPhone = cleanDigits(l.phone);
      if (!lPhone) return false;
      return lPhone === pPhone || lPhone.endsWith(pPhone) || pPhone.endsWith(lPhone);
    }) || null;
  }, [pedido, leads]);

  // Tamaño guardado o default
  const [sizeId, setSizeId] = useState(() => {
    return localStorage.getItem('onecontrol_sticker_size') || '10x7.5';
  });
  const [customW, setCustomW] = useState(100);
  const [customH, setCustomH] = useState(75);

  // Datos editables del sticker
  const [form, setForm] = useState({
    cliente: '',
    phone: '',
    direccion: '',
    zona: '',
    municipio: 'Guatemala',
    departamento: 'Guatemala',
    producto: '',
    cantidad: '1',
    precio: '',
    esContraEntrega: true,
    pagado: false,
    nit: 'C/F',
    notas: '',
    fechaEntrega: '',
    numeroPedido: ''
  });

  // Opciones de visualización
  const [options, setOptions] = useState({
    showLogo: true,
    showSender: true,
    showBarcode: true,
    showPrice: true,
    showNit: true,
    showNotes: true
  });

  const [savingLead, setSavingLead] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Inicializar el formulario cuando cambia el pedido o el lead coincidente
  useEffect(() => {
    if (!pedido) return;

    // Si el pedido tiene notas que parecen una dirección o zona, intentar extraer
    const notasText = (pedido.notas || '').trim();
    let initialDir = matchedLead?.direccion || '';
    let initialZona = matchedLead?.zona || '';
    let initialNit = matchedLead?.nit || 'C/F';

    // Si no hay dirección en lead pero notas menciona dirección:
    if (!initialDir && notasText && /zona|calle|avenida|colonia|casa|lote|km|carretera/i.test(notasText)) {
      initialDir = notasText;
    }

    // Detectar si notas menciona zona
    if (!initialZona && notasText) {
      const zMatch = notasText.match(/zona\s*(\d{1,2})/i);
      if (zMatch) initialZona = `Zona ${zMatch[1]}`;
    }

    const initialEsContraEntrega = !/completad/i.test(pedido.estado || '');
    const initialPagado = /completad/i.test(pedido.estado || '');

    setForm({
      cliente: pedido.cliente || matchedLead?.nombre || '',
      phone: pedido.phone || matchedLead?.phone || '',
      direccion: initialDir,
      zona: initialZona,
      municipio: 'Guatemala',
      departamento: 'Guatemala',
      producto: pedido.producto || '',
      cantidad: pedido.cantidad || '1',
      precio: pedido.precio || '',
      esContraEntrega: initialEsContraEntrega,
      pagado: initialPagado,
      nit: initialNit || 'C/F',
      notas: pedido.notas || '',
      fechaEntrega: pedido.fecha_entrega || '',
      numeroPedido: String(pedido.id || '')
    });
  }, [pedido, matchedLead]);

  // Manejar cambio de tamaño
  const handleSizeChange = (id) => {
    setSizeId(id);
    localStorage.setItem('onecontrol_sticker_size', id);
  };

  // Configuración de dimensiones actuales
  const activeSize = useMemo(() => {
    const found = STICKER_SIZES.find(s => s.id === sizeId) || STICKER_SIZES[2];
    if (sizeId === 'custom') {
      return {
        ...found,
        widthMm: Math.max(30, Math.min(250, Number(customW) || 100)),
        heightMm: Math.max(20, Math.min(300, Number(customH) || 75)),
        density: customH < 35 ? 'tiny' : customH < 60 ? 'compact' : customH < 120 ? 'normal' : 'spacious'
      };
    }
    return found;
  }, [sizeId, customW, customH]);

  // Guardar en el Lead (CRM) y Pedido
  const handleSaveToLeadAndPedido = async () => {
    setSavingLead(true);
    try {
      if (matchedLead && onUpdateLead) {
        await onUpdateLead({
          ...matchedLead,
          nombre: form.cliente || matchedLead.nombre,
          phone: form.phone || matchedLead.phone,
          direccion: form.direccion,
          zona: form.zona,
          nit: form.nit
        });
      }

      if (onSavePedido) {
        await onSavePedido({
          ...pedido,
          cliente: form.cliente,
          phone: form.phone,
          producto: form.producto,
          cantidad: form.cantidad,
          precio: form.precio,
          notas: form.notas,
          fecha_entrega: form.fechaEntrega
        });
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Error al guardar datos:', err);
      alert('Error al guardar los datos actualizados.');
    } finally {
      setSavingLead(false);
    }
  };

  // ── GENERADOR DE HTML PARA IMPRESIÓN DIRECTA ──────────────────────────────
  const generatePrintableHtml = () => {
    const { widthMm, heightMm, density } = activeSize;
    const barcodeNumber = `OC-${String(form.numeroPedido).padStart(4, '0')}`;
    const barcodeSvgHtml = generateBarcodeSvg(barcodeNumber, density === 'tiny' ? 20 : density === 'compact' ? 24 : 32);

    // Ajustes visuales según densidad/tamaño
    const isTiny = density === 'tiny';         // 5 x 2.5 cm
    const isCompact = density === 'compact';   // 7.5 x 5 cm
    const isNormal = density === 'normal';     // 10 x 7.5 cm
    const isSpacious = density === 'spacious'; // 10 x 15 cm

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Sticker Pedido #${form.numeroPedido} - OneControl</title>
  <style>
    @page {
      size: ${widthMm}mm ${heightMm}mm;
      margin: 0mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      overflow: hidden;
      line-height: 1.15;
    }
    .sticker-container {
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      padding: ${isTiny ? '1.5mm' : isCompact ? '2.5mm' : '3.5mm'};
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      border: 1px solid #111;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: ${isTiny ? '0.5px' : '1.5px'} solid #000;
      padding-bottom: ${isTiny ? '1mm' : '1.5mm'};
      margin-bottom: ${isTiny ? '1mm' : '1.5mm'};
    }
    .logo-box {
      display: flex;
      align-items: center;
      gap: 2mm;
    }
    .logo-img {
      height: ${isTiny ? '4.5mm' : isCompact ? '6mm' : '9mm'};
      object-fit: contain;
    }
    .logo-title {
      font-size: ${isTiny ? '7pt' : isCompact ? '8.5pt' : '10pt'};
      font-weight: 900;
      letter-spacing: -0.2px;
      text-transform: uppercase;
    }
    .sender-sub {
      font-size: ${isTiny ? '4.5pt' : isCompact ? '5.5pt' : '6.5pt'};
      color: #333;
      font-weight: 600;
    }
    .order-badge {
      text-align: right;
      font-size: ${isTiny ? '6.5pt' : isCompact ? '8pt' : '9pt'};
      font-weight: 900;
    }
    .dest-section {
      border: ${isTiny ? '0.5px' : '1.2px'} solid #000;
      border-radius: ${isTiny ? '1mm' : '1.5mm'};
      padding: ${isTiny ? '1mm' : isCompact ? '1.5mm' : '2mm'};
      margin-bottom: ${isTiny ? '1mm' : '1.5mm'};
      background: #fafafa;
    }
    .dest-label {
      font-size: ${isTiny ? '5pt' : isCompact ? '6pt' : '7pt'};
      font-weight: 800;
      color: #444;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5mm;
    }
    .dest-name {
      font-size: ${isTiny ? '7.5pt' : isCompact ? '10pt' : isNormal ? '11.5pt' : '14pt'};
      font-weight: 900;
      color: #000;
      text-transform: uppercase;
      line-height: 1.1;
      margin-bottom: 0.5mm;
    }
    .dest-phone {
      font-size: ${isTiny ? '7pt' : isCompact ? '8.5pt' : isNormal ? '10pt' : '11pt'};
      font-weight: 800;
      color: #000;
      margin-bottom: 0.5mm;
    }
    .dest-address {
      font-size: ${isTiny ? '6pt' : isCompact ? '7pt' : isNormal ? '8.5pt' : '9.5pt'};
      font-weight: 700;
      color: #111;
      line-height: 1.2;
    }
    .zona-badge {
      display: inline-block;
      background: #000;
      color: #fff;
      font-weight: 900;
      font-size: ${isTiny ? '5.5pt' : isCompact ? '7pt' : '8pt'};
      padding: 0.5mm 1.5mm;
      border-radius: 0.8mm;
      margin-top: 1mm;
      text-transform: uppercase;
    }
    .prod-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: ${isTiny ? '0.5mm 0' : '1.2mm 0'};
      border-top: 0.5px dashed #666;
      border-bottom: 0.5px dashed #666;
      margin-bottom: ${isTiny ? '1mm' : '1.5mm'};
    }
    .prod-text {
      font-size: ${isTiny ? '6pt' : isCompact ? '7.5pt' : '8.5pt'};
      font-weight: 800;
      max-width: 70%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .prod-qty {
      font-size: ${isTiny ? '6pt' : isCompact ? '7.5pt' : '8.5pt'};
      font-weight: 900;
      background: #eee;
      padding: 0.3mm 1mm;
      border-radius: 0.5mm;
    }
    .payment-box {
      border: ${isTiny ? '1px' : '1.8px'} solid #000;
      border-radius: ${isTiny ? '1mm' : '1.5mm'};
      padding: ${isTiny ? '1mm' : isCompact ? '1.5mm' : '2mm'};
      text-align: center;
      background: #ffffff;
      margin-bottom: ${isTiny ? '1mm' : '1.5mm'};
    }
    .payment-title {
      font-size: ${isTiny ? '5pt' : isCompact ? '6.5pt' : '7.5pt'};
      font-weight: 800;
      text-transform: uppercase;
      color: #333;
    }
    .payment-amount {
      font-size: ${isTiny ? '8pt' : isCompact ? '11pt' : isNormal ? '13pt' : '16pt'};
      font-weight: 900;
      color: #000;
    }
    .notes-box {
      font-size: ${isTiny ? '5pt' : isCompact ? '6pt' : '7pt'};
      font-style: italic;
      color: #333;
      margin-bottom: 1mm;
      border-left: 1.5px solid #000;
      padding-left: 1.5mm;
    }
    .footer-bar {
      margin-top: auto;
      text-align: center;
    }
    .barcode-container {
      width: 100%;
      margin: 0 auto;
    }
    .tracking-label {
      font-size: ${isTiny ? '4.5pt' : isCompact ? '5.5pt' : '6.5pt'};
      font-family: monospace;
      font-weight: 800;
      letter-spacing: 1px;
      margin-top: 0.5mm;
    }
  </style>
</head>
<body>
  <div class="sticker-container">
    
    <!-- HEADER -->
    <div class="header">
      <div class="logo-box">
        ${options.showLogo ? `<img src="${ONE_CONTROL_LOGO_BASE64}" class="logo-img" alt="OneControl" />` : ''}
        <div>
          <div class="logo-title">ONECONTROL</div>
          ${options.showSender && !isTiny ? '<div class="sender-sub">PBX: 5965-8803 · onecontrol.shop</div>' : ''}
        </div>
      </div>
      <div class="order-badge">
        <div>#${form.numeroPedido}</div>
        ${form.fechaEntrega && !isTiny ? `<div style="font-size: 5.5pt; font-weight: 600; color: #555;">${form.fechaEntrega}</div>` : ''}
      </div>
    </div>

    <!-- DESTINATARIO -->
    <div class="dest-section">
      <div class="dest-label">ENTREGAR A:</div>
      <div class="dest-name">${form.cliente || 'CLIENTE FINAL'}</div>
      <div class="dest-phone">📞 TEL: ${form.phone || 'Sin número'}</div>
      <div class="dest-address">${form.direccion || 'Dirección pendiente de confirmación'}</div>
      ${form.zona ? `<div class="zona-badge">📍 ${form.zona.toUpperCase()}${form.municipio && form.municipio !== 'Guatemala' ? ' · ' + form.municipio.toUpperCase() : ''}</div>` : ''}
    </div>

    <!-- PRODUCTO -->
    <div class="prod-box">
      <div class="prod-text">${form.producto || 'Producto de catálogo'}</div>
      <div class="prod-qty">Cant: ${form.cantidad || '1'}</div>
    </div>

    <!-- COBRO O PAGO -->
    ${options.showPrice ? `
      <div class="payment-box">
        <div class="payment-title">
          ${form.esContraEntrega ? '⚠️ COBRO CONTRA ENTREGA' : '✓ ESTADO DE CUENTA: PAGADO'}
        </div>
        <div class="payment-amount">
          ${form.esContraEntrega ? (form.precio ? form.precio : 'A CONFIRMAR') : 'NO COBRAR (PAGADO)'}
        </div>
        ${options.showNit && form.nit ? `<div style="font-size: 5.5pt; color: #555; margin-top: 0.5mm;">NIT: ${form.nit}</div>` : ''}
      </div>
    ` : ''}

    <!-- NOTAS / REFERENCIAS -->
    ${options.showNotes && form.notas && !isTiny ? `
      <div class="notes-box">
        Ref: ${form.notas}
      </div>
    ` : ''}

    <!-- CODIGO DE BARRAS & FOOTER -->
    ${options.showBarcode ? `
      <div class="footer-bar">
        <div class="barcode-container">
          ${barcodeSvgHtml}
        </div>
        <div class="tracking-label">${barcodeNumber}</div>
      </div>
    ` : ''}

  </div>
</body>
</html>`;
  };

  // ── IMPRESIÓN VÍA IFRAME AISLADO ──────────────────────────────────────────
  const handlePrint = () => {
    const html = generatePrintableHtml();

    let iframe = document.getElementById('onecontrol-sticker-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'onecontrol-sticker-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // Esperar a que rendericen fuentes e imágenes
    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
    }, 280);
  };

  // Abrir en pestaña nueva por si el usuario prefiere diálogo nativo directo
  const handleOpenInNewTab = () => {
    const html = generatePrintableHtml();
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
  };

  // Atajos rápidos para Zonas de Guatemala
  const QUICK_ZONAS = [
    'Zona 1', 'Zona 4', 'Zona 7', 'Zona 9', 'Zona 10',
    'Zona 11', 'Zona 12', 'Zona 13', 'Zona 14', 'Zona 15',
    'Zona 16', 'Mixco', 'Villa Nueva', 'Carretera al Salvador'
  ];

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-[#FF6B00] flex items-center justify-center font-black">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                Sticker de Envío & Despacho
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold">
                  Pedido #{form.numeroPedido}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Imprime la etiqueta con logo, datos de entrega y monto a cobrar para el paquete.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer size={15} /> Imprimir Sticker
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* BODY (2 COLUMNAS: FORMULARIO Y VISTA PREVIA) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          
          {/* COLUMNA IZQUIERDA: CONFIGURACIÓN Y DATOS (7 COLS) */}
          <div className="lg:col-span-6 xl:col-span-5 p-6 space-y-6 overflow-y-auto max-h-[82vh]">
            
            {/* 1. SELECTOR DE TAMAÑO DE STICKER */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sliders size={13} className="text-[#FF6B00]" />
                  Tamaño de Sticker / Rollo:
                </label>
                <span className="text-[10px] font-bold text-slate-400">
                  {activeSize.widthMm} x {activeSize.heightMm} mm
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STICKER_SIZES.map(s => {
                  const isSelected = sizeId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSizeChange(s.id)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#FF6B00] bg-orange-50/60 shadow-xs ring-1 ring-[#FF6B00]'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="text-xs font-black text-slate-900 leading-snug">{s.name}</div>
                      <div className={`text-[10px] font-bold mt-1 ${isSelected ? 'text-[#FF6B00]' : 'text-slate-400'}`}>
                        {s.badge}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Medida personalizada si selecciona "custom" */}
              {sizeId === 'custom' && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Ancho (mm):</label>
                    <input
                      type="number"
                      value={customW}
                      onChange={e => setCustomW(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      min="30"
                      max="250"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Alto (mm):</label>
                    <input
                      type="number"
                      value={customH}
                      onChange={e => setCustomH(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      min="20"
                      max="300"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. DATOS DEL DESTINATARIO */}
            <div className="space-y-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <User size={13} className="text-[#FF6B00]" />
                  Datos del Destinatario
                </span>
                {matchedLead && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    ✓ Lead vinculado
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Nombre Completo:
                  </label>
                  <input
                    type="text"
                    value={form.cliente}
                    onChange={e => setForm({ ...form, cliente: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#FF6B00]"
                    placeholder="Nombre del cliente"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Teléfono:
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#FF6B00]"
                    placeholder="Ej: 5555-5555"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  Dirección Exacta de Entrega:
                </label>
                <textarea
                  rows={2}
                  value={form.direccion}
                  onChange={e => setForm({ ...form, direccion: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#FF6B00]"
                  placeholder="Calle, avenida, número, colonia, garita, etc."
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  Zona / Sector / Municipio:
                </label>
                <input
                  type="text"
                  value={form.zona}
                  onChange={e => setForm({ ...form, zona: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:border-[#FF6B00]"
                  placeholder="Ej: Zona 11, Mixco, Villa Nueva"
                />

                {/* Chips de Zonas Rápidas */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {QUICK_ZONAS.map(z => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setForm({ ...form, zona: z })}
                      className="text-[9.5px] font-bold px-2 py-0.5 bg-white hover:bg-orange-50 hover:text-orange-700 text-slate-600 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                    >
                      {z}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. PRODUCTO Y COBRO */}
            <div className="space-y-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Package size={13} className="text-[#FF6B00]" />
                Detalles del Pedido & Cobro
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Producto / Contenido:
                  </label>
                  <input
                    type="text"
                    value={form.producto}
                    onChange={e => setForm({ ...form, producto: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Cantidad:
                  </label>
                  <input
                    type="text"
                    value={form.cantidad}
                    onChange={e => setForm({ ...form, cantidad: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Monto Total:
                  </label>
                  <input
                    type="text"
                    value={form.precio}
                    onChange={e => setForm({ ...form, precio: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-emerald-700 focus:outline-none focus:border-[#FF6B00]"
                    placeholder="Ej: Q250.00"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    NIT de Facturación:
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={form.nit}
                      onChange={e => setForm({ ...form, nit: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#FF6B00]"
                      placeholder="C/F o NIT"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, nit: 'C/F' })}
                      className="px-2 py-1 bg-slate-200 text-slate-700 text-[10px] font-black rounded-xl hover:bg-slate-300 cursor-pointer"
                    >
                      C/F
                    </button>
                  </div>
                </div>
              </div>

              {/* Toggle de Tipo de Cobro */}
              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="radio"
                    name="tipoCobro"
                    checked={form.esContraEntrega}
                    onChange={() => setForm({ ...form, esContraEntrega: true, pagado: false })}
                    className="accent-[#FF6B00] cursor-pointer"
                  />
                  <span>⚠️ Cobrar Contra Entrega</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="radio"
                    name="tipoCobro"
                    checked={!form.esContraEntrega}
                    onChange={() => setForm({ ...form, esContraEntrega: false, pagado: true })}
                    className="accent-emerald-600 cursor-pointer"
                  />
                  <span>✓ Pagado (No cobrar)</span>
                </label>
              </div>

              {/* Notas de Entrega */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  Notas / Instrucciones al Repartidor:
                </label>
                <input
                  type="text"
                  value={form.notas}
                  onChange={e => setForm({ ...form, notas: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#FF6B00]"
                  placeholder="Ej: Llamar antes de llegar, entregar en garita"
                />
              </div>
            </div>

            {/* BOTÓN: GUARDAR DATOS EN CRM */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleSaveToLeadAndPedido}
                disabled={savingLead}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>¡Guardado en el CRM!</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Guardar datos en el Lead & Pedido</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                title="Abrir vista de impresión en ventana separada"
              >
                <ExternalLink size={13} />
                <span>Pestaña nueva</span>
              </button>
            </div>

          </div>

          {/* COLUMNA DERECHA: VISTA PREVIA WYSIWYG (5 COLS) */}
          <div className="lg:col-span-6 xl:col-span-7 p-6 bg-slate-100 flex flex-col justify-between items-center overflow-y-auto max-h-[82vh]">
            
            {/* BARRA DE ZOOM Y CONTROLES */}
            <div className="w-full flex items-center justify-between mb-4 px-2">
              <span className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                Vista Previa de Impresión:
              </span>

              <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}
                  className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                  title="Alejar"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="text-[11px] font-black text-slate-700 w-10 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
                  className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                  title="Acercar"
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* CONTENEDOR VISUAL DEL STICKER (ESCALADO CON ZOOM) */}
            <div className="flex-1 flex items-center justify-center p-2 w-full overflow-hidden">
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out'
                }}
                className="bg-white text-black shadow-2xl rounded-sm border-2 border-black overflow-hidden flex flex-col justify-between select-none"
              >
                {/* REPRESENTACIÓN VISUAL EN PANTALLA */}
                <div
                  style={{
                    width: `${activeSize.widthMm * 3.78}px`,
                    minHeight: `${activeSize.heightMm * 3.78}px`,
                    padding: activeSize.density === 'tiny' ? '6px' : activeSize.density === 'compact' ? '10px' : '14px'
                  }}
                  className="flex flex-col justify-between h-full text-slate-950 font-sans"
                >
                  {/* TOP HEADER */}
                  <div className="flex justify-between items-center border-b-2 border-black pb-1.5 mb-2">
                    <div className="flex items-center gap-2">
                      {options.showLogo && (
                        <img
                          src={ONE_CONTROL_LOGO_BASE64}
                          alt="OneControl"
                          style={{
                            height: activeSize.density === 'tiny' ? '18px' : activeSize.density === 'compact' ? '24px' : '32px'
                          }}
                          className="object-contain"
                        />
                      )}
                      <div>
                        <div className="text-xs font-black tracking-tight uppercase">ONECONTROL</div>
                        {options.showSender && activeSize.density !== 'tiny' && (
                          <div className="text-[9px] font-bold text-slate-600">
                            PBX: 5965-8803 · onecontrol.shop
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black">#{form.numeroPedido}</div>
                      {form.fechaEntrega && activeSize.density !== 'tiny' && (
                        <div className="text-[9px] font-semibold text-slate-500">
                          {form.fechaEntrega}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DESTINATARIO */}
                  <div className="border border-black rounded-lg p-2 bg-slate-50/70 mb-2">
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                      ENTREGAR A:
                    </div>
                    <div className={`font-black uppercase tracking-tight leading-tight ${
                      activeSize.density === 'tiny' ? 'text-xs' : activeSize.density === 'compact' ? 'text-sm' : 'text-base'
                    }`}>
                      {form.cliente || 'CLIENTE FINAL'}
                    </div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">
                      📞 TEL: {form.phone || 'Sin número'}
                    </div>
                    <div className="text-[11px] font-medium text-slate-800 leading-snug mt-1">
                      {form.direccion || 'Dirección pendiente de confirmación'}
                    </div>
                    {form.zona && (
                      <div className="inline-block bg-black text-white text-[9.5px] font-black px-2 py-0.5 rounded-sm mt-1.5 uppercase">
                        📍 {form.zona.toUpperCase()}{form.municipio && form.municipio !== 'Guatemala' ? ' · ' + form.municipio.toUpperCase() : ''}
                      </div>
                    )}
                  </div>

                  {/* PRODUCTO */}
                  <div className="flex justify-between items-center py-1.5 border-t border-b border-dashed border-slate-400 mb-2">
                    <div className="text-xs font-bold truncate max-w-[75%]">
                      {form.producto || 'Producto sin especificar'}
                    </div>
                    <div className="text-xs font-black bg-slate-100 px-1.5 py-0.5 rounded">
                      Cant: {form.cantidad || '1'}
                    </div>
                  </div>

                  {/* COBRO / PAGO */}
                  {options.showPrice && (
                    <div className="border-2 border-black rounded-lg p-2 text-center bg-white mb-2">
                      <div className="text-[9px] font-black uppercase text-slate-700 tracking-wider">
                        {form.esContraEntrega ? '⚠️ COBRO CONTRA ENTREGA' : '✓ ESTADO: PAGADO'}
                      </div>
                      <div className={`font-black tracking-tight leading-none my-0.5 ${
                        activeSize.density === 'tiny' ? 'text-sm' : activeSize.density === 'compact' ? 'text-lg' : 'text-xl'
                      }`}>
                        {form.esContraEntrega ? (form.precio || 'A CONFIRMAR') : 'NO COBRAR (PAGADO)'}
                      </div>
                      {options.showNit && form.nit && (
                        <div className="text-[9px] text-slate-600 font-bold">
                          NIT: {form.nit}
                        </div>
                      )}
                    </div>
                  )}

                  {/* NOTAS */}
                  {options.showNotes && form.notas && activeSize.density !== 'tiny' && (
                    <div className="text-[9.5px] italic text-slate-700 border-l-2 border-black pl-1.5 mb-2 leading-tight">
                      Ref: {form.notas}
                    </div>
                  )}

                  {/* BARCODE FOOTER */}
                  {options.showBarcode && (
                    <div className="mt-auto pt-1 text-center">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: generateBarcodeSvg(
                            `OC-${String(form.numeroPedido).padStart(4, '0')}`,
                            activeSize.density === 'tiny' ? 20 : activeSize.density === 'compact' ? 24 : 32
                          )
                        }}
                      />
                      <div className="text-[9px] font-mono font-bold tracking-widest text-slate-700 mt-0.5">
                        *OC-{String(form.numeroPedido).padStart(4, '0')}*
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* BOTÓN INFERIOR DE IMPRESIÓN */}
            <div className="w-full flex items-center justify-between pt-4 border-t border-slate-200">
              <span className="text-xs text-slate-500 font-medium">
                Compatible con impresoras térmicas (Zebra, MUNBYN, Xprinter) y hojas carta/A4.
              </span>
              <button
                type="button"
                onClick={handlePrint}
                className="px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Printer size={16} /> Imprimir Ahora
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
