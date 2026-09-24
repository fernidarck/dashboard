import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, Printer, Save, Check, RefreshCw, ZoomIn, ZoomOut,
  Tag, Truck, MapPin, Phone, User, Package,
  DollarSign, FileText, Calendar, ExternalLink, Sliders,
  CheckCircle2, Trash2, QrCode, Globe, Share2, MessageCircle,
  HelpCircle, AlertTriangle, Eye, Smartphone, Download
} from 'lucide-react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
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
    density: 'compact'
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
    density: 'compact'
  }
];

// ── GENERADOR DE CÓDIGO DE BARRAS CODE 39 EN SVG PURO ───────────────────────
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

function generateBarcodeSvg(text, height = 22) {
  const clean = '*' + String(text || 'OC-PEDIDO').toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '') + '*';
  let narrow = 1.6;
  let wide = 4.2;
  let gap = 1.6;
  
  let rects = [];
  let currentX = 8;

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

  const totalWidth = currentX + 8;
  return `<svg viewBox="0 0 ${totalWidth} ${height}" preserveAspectRatio="none" style="width: 100%; height: ${height}px; display: block;">${rects.join('')}</svg>`;
}

// ── LIMPIEZA INTELIGENTE DE ZONAS (EVITA "N/A" Y EXTRAE DE DIRECCIÓN) ───────
function extractOrCleanZona(zona, direccion, notas) {
  const raw = String(zona || '').trim();
  if (raw && !/^(n\/?a|none|null|undefined|-|\.)$/i.test(raw)) {
    return raw;
  }
  // Auto-detectar si la dirección o notas tienen zona (ej: "zona 14", "z. 14", "z14")
  const combined = `${direccion || ''} ${notas || ''}`;
  const m = combined.match(/\b(?:zona|z\.?)\s*(\d{1,2})\b/i);
  if (m) {
    return `Zona ${m[1]}`;
  }
  const mTown = combined.match(/\b(mixco|villa nueva|san crist[oó]bal|santa catarina|carretera al? salvador|san miguel petapa|amatitl[aá]n)\b/i);
  if (mTown) {
    return mTown[1];
  }
  return '';
}

// Destinos predefinidos para el QR de Redes Sociales
const QR_TARGETS = [
  { id: 'web', label: 'Tienda & Redes (onecontrol.shop)', url: 'https://onecontrol.shop' },
  { id: 'whatsapp', label: 'WhatsApp (+502 5965-8803)', url: 'https://wa.me/50259658803' },
  { id: 'catalogo', label: 'Catálogo de Productos', url: 'https://onecontrol.shop/tienda/' },
  { id: 'custom', label: 'Enlace Personalizado', url: '' }
];

export default function StickerPrint({
  isOpen,
  onClose,
  pedido,
  leads = [],
  onUpdateLead,
  onSavePedido
}) {
  if (!isOpen || !pedido) return null;

  // Encontrar lead asociado por teléfono
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
  }, [pedido?.phone, leads]);

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

  // Opciones de visualización y redes sociales
  const [options, setOptions] = useState({
    showLogo: true,
    showSender: true,
    showBarcode: true,
    showPrice: true,
    showNit: true,
    showNotes: true,
    showSocialQr: true,
    socialQrTarget: 'web',
    customQrUrl: '',
    socialHandle: '@onecontrol.shop'
  });

  const [qrBase64, setQrBase64] = useState('');
  const [savingLead, setSavingLead] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [mobileTab, setMobileTab] = useState('preview'); // 'preview' | 'edit' (en móvil default 'preview' para ver el sticker de inmediato)
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [showMarklifeModal, setShowMarklifeModal] = useState(false);
  const [showPrintChoiceModal, setShowPrintChoiceModal] = useState(false);
  const stickerCardRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Ref para EVITAR que el form se reinicie mientras el usuario escribe (por polling de fondo)
  const initializedPedidoIdRef = useRef(null);

  // Inicializar formulario SOLO una vez al abrir el pedido o si cambia de pedido ID
  useEffect(() => {
    if (!pedido) return;
    if (initializedPedidoIdRef.current === pedido.id) return;
    initializedPedidoIdRef.current = pedido.id;

    const notasText = (pedido.notas || '').trim();
    let initialDir = matchedLead?.direccion || '';
    let initialNit = matchedLead?.nit || 'C/F';

    if (!initialDir && notasText && /zona|calle|avenida|colonia|casa|lote|km|carretera/i.test(notasText)) {
      initialDir = notasText;
    }

    const initialZona = extractOrCleanZona(matchedLead?.zona, initialDir, notasText);
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
  }, [pedido?.id]);

  // URL activa para el QR
  const currentQrUrl = useMemo(() => {
    if (options.socialQrTarget === 'custom') {
      return options.customQrUrl.trim() || 'https://onecontrol.shop';
    }
    const found = QR_TARGETS.find(t => t.id === options.socialQrTarget);
    return found ? found.url : 'https://onecontrol.shop';
  }, [options.socialQrTarget, options.customQrUrl]);

  // Generar QR en base64 cuando cambia la URL objetivo
  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(currentQrUrl, {
      margin: 1,
      width: 180,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then(url => {
        if (isMounted) setQrBase64(url);
      })
      .catch(err => {
        console.error('Error generando QR:', err);
      });
    return () => { isMounted = false; };
  }, [currentQrUrl]);

  // Manejar cambio de tamaño de sticker
  const handleSizeChange = (id) => {
    setSizeId(id);
    localStorage.setItem('onecontrol_sticker_size', id);
  };

  // Configuración de dimensiones activas
  const activeSize = useMemo(() => {
    const found = STICKER_SIZES.find(s => s.id === sizeId) || STICKER_SIZES[2];
    if (sizeId === 'custom') {
      const w = Math.max(30, Math.min(250, Number(customW) || 100));
      const h = Math.max(20, Math.min(300, Number(customH) || 75));
      return {
        ...found,
        widthMm: w,
        heightMm: h,
        density: h < 35 ? 'tiny' : h <= 100 ? 'compact' : 'spacious'
      };
    }
    return found;
  }, [sizeId, customW, customH]);

  // Escala adaptativa responsive para móviles (evita que el sticker de 100mm = 378px desborde pantallas de 360-390px)
  const isSmallScreen = windowWidth < 640;
  const stickerWidthPx = activeSize.widthMm * 3.78;
  const availableWidth = isSmallScreen ? Math.max(260, windowWidth - 48) : 550;
  const autoScaleRatio = isSmallScreen && stickerWidthPx > availableWidth ? (availableWidth / stickerWidthPx) : 1;
  const effectiveScale = Number((autoScaleRatio * zoom).toFixed(2));

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
    const barcodeSvgHtml = generateBarcodeSvg(barcodeNumber, density === 'tiny' ? 14 : density === 'compact' ? 18 : 24);

    const isTiny = density === 'tiny';           // < 35mm
    const isCompact = density === 'compact';     // <= 100mm (ej: 10x7.5, 7.5x5)
    const isSpacious = density === 'spacious';   // > 100mm (ej: 10x15)

    const zonaLimpia = extractOrCleanZona(form.zona, form.direccion, form.notas);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sticker Pedido #${form.numeroPedido} - OneControl</title>
  <style>
    @page {
      size: ${widthMm}mm ${heightMm}mm;
      margin: 0mm !important;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @media print {
      .screen-toolbar {
        display: none !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: ${widthMm}mm !important;
        height: ${heightMm}mm !important;
        max-width: ${widthMm}mm !important;
        max-height: ${heightMm}mm !important;
        background: #ffffff !important;
        overflow: hidden !important;
      }
      .sticker-container {
        margin: 0 !important;
        border: 1px solid #000 !important;
        box-shadow: none !important;
      }
    }
    @media screen {
      .screen-toolbar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #0f172a;
        color: white;
        padding: 10px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        z-index: 99999;
        box-shadow: 0 4px 14px rgba(0,0,0,0.3);
        font-family: system-ui, -apple-system, sans-serif;
      }
      .screen-btn {
        background: #FF6B00;
        color: #ffffff;
        font-weight: 900;
        font-size: 13px;
        padding: 8px 16px;
        border-radius: 10px;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      body {
        margin: 0 !important;
        padding: 68px 12px 30px 12px !important;
        background: #f1f5f9 !important;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        min-height: 100vh;
      }
      .sticker-container {
        background: #ffffff;
        box-shadow: 0 10px 25px rgba(0,0,0,0.12);
        margin: 10px auto;
        border-radius: 4px;
      }
    }
    html, body {
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.15;
    }
    .sticker-container {
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      max-height: ${heightMm}mm;
      padding: ${isTiny ? '1.5mm' : isCompact ? '2mm' : '3.5mm'};
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      border: 1px solid #000;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #000;
      padding-bottom: ${isTiny ? '0.5mm' : '1mm'};
      margin-bottom: ${isTiny ? '0.5mm' : '1mm'};
    }
    .logo-box {
      display: flex;
      align-items: center;
      gap: 1.5mm;
    }
    .logo-img {
      height: ${isTiny ? '4mm' : isCompact ? '5.5mm' : '8mm'};
      object-fit: contain;
    }
    .logo-title {
      font-size: ${isTiny ? '6.5pt' : isCompact ? '8pt' : '9.5pt'};
      font-weight: 900;
      letter-spacing: -0.2px;
      text-transform: uppercase;
    }
    .sender-sub {
      font-size: ${isTiny ? '4pt' : isCompact ? '5pt' : '6pt'};
      color: #333;
      font-weight: 600;
    }
    .order-badge {
      text-align: right;
      font-size: ${isTiny ? '6.5pt' : isCompact ? '8pt' : '9pt'};
      font-weight: 900;
    }
    .dest-section {
      border: 1px solid #000;
      border-radius: 1mm;
      padding: ${isTiny ? '0.8mm' : isCompact ? '1.2mm' : '1.8mm'};
      margin-bottom: ${isTiny ? '0.5mm' : '1mm'};
      background: #fafafa;
    }
    .dest-label {
      font-size: ${isTiny ? '4.5pt' : '5.5pt'};
      font-weight: 800;
      color: #333;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .dest-name {
      font-size: ${isTiny ? '7pt' : isCompact ? '9pt' : '12pt'};
      font-weight: 900;
      color: #000;
      text-transform: uppercase;
      line-height: 1.1;
      margin: 0.3mm 0;
    }
    .dest-phone {
      font-size: ${isTiny ? '6.5pt' : isCompact ? '8pt' : '9.5pt'};
      font-weight: 800;
      color: #000;
    }
    .dest-address {
      font-size: ${isTiny ? '5.5pt' : isCompact ? '6.5pt' : '8pt'};
      font-weight: 700;
      color: #111;
      line-height: 1.15;
      margin-top: 0.3mm;
    }
    .zona-badge {
      display: inline-block;
      border: 1px solid #000;
      background: #000;
      color: #fff;
      font-weight: 900;
      font-size: ${isTiny ? '5pt' : isCompact ? '6pt' : '7.5pt'};
      padding: 0.3mm 1.2mm;
      border-radius: 0.6mm;
      margin-top: 0.6mm;
      text-transform: uppercase;
    }
    .prod-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: ${isTiny ? '0.4mm 0' : '0.8mm 0'};
      border-top: 0.5px dashed #444;
      border-bottom: 0.5px dashed #444;
      margin-bottom: ${isTiny ? '0.5mm' : '1mm'};
    }
    .prod-text {
      font-size: ${isTiny ? '5.5pt' : isCompact ? '6.5pt' : '8pt'};
      font-weight: 800;
      max-width: 75%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .prod-qty {
      font-size: ${isTiny ? '5.5pt' : isCompact ? '6.5pt' : '8pt'};
      font-weight: 900;
      background: #eee;
      border: 0.5px solid #bbb;
      padding: 0.2mm 0.8mm;
      border-radius: 0.4mm;
    }
    
    /* GRID DE 2 COLUMNAS PARA TAMAÑOS COMPACTOS (AHORRA 40mm DE ALTURA) */
    .middle-grid {
      display: grid;
      grid-template-columns: ${options.showSocialQr && qrBase64 && !isTiny ? '1.1fr 0.9fr' : '1fr'};
      gap: 1.5mm;
      margin-bottom: ${isTiny ? '0.5mm' : '1mm'};
      align-items: stretch;
    }
    .payment-box {
      border: 1.2px solid #000;
      border-radius: 1mm;
      padding: ${isTiny ? '0.8mm' : '1.2mm'};
      text-align: center;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .payment-title {
      font-size: ${isTiny ? '4.5pt' : isCompact ? '5.5pt' : '6.5pt'};
      font-weight: 800;
      text-transform: uppercase;
      color: #222;
      line-height: 1;
    }
    .payment-amount {
      font-size: ${isTiny ? '7.5pt' : isCompact ? '9.5pt' : '13pt'};
      font-weight: 900;
      color: #000;
      margin: 0.3mm 0;
      line-height: 1.1;
    }
    .social-qr-banner {
      display: flex;
      align-items: center;
      gap: 1.2mm;
      border: 1px solid #000;
      border-radius: 1mm;
      padding: 1mm;
      background: #fafafa;
    }
    .qr-img {
      width: ${isTiny ? '8mm' : isCompact ? '11mm' : '16mm'};
      height: ${isTiny ? '8mm' : isCompact ? '11mm' : '16mm'};
      object-fit: contain;
      border: 0.5px solid #000;
      background: #fff;
      shrink: 0;
    }
    .social-info {
      flex: 1;
      line-height: 1.15;
      overflow: hidden;
    }
    .social-headline {
      font-size: ${isTiny ? '4.5pt' : isCompact ? '5.5pt' : '6.5pt'};
      font-weight: 900;
      text-transform: uppercase;
    }
    .social-link {
      font-size: ${isTiny ? '4pt' : isCompact ? '5pt' : '6pt'};
      font-weight: 700;
      color: #000;
    }
    .social-handles {
      font-size: ${isTiny ? '4pt' : isCompact ? '4.5pt' : '5.5pt'};
      color: #333;
      font-weight: 600;
    }
    .notes-box {
      font-size: ${isTiny ? '4.5pt' : isCompact ? '5.5pt' : '6.5pt'};
      color: #222;
      background: #f7f7f7;
      border-left: 1.5px solid #000;
      padding: 0.6mm 1mm;
      margin-top: 0.6mm;
      border-radius: 0.4mm;
      text-align: left;
    }
    .footer-bar {
      margin-top: auto;
      text-align: center;
      padding-top: 0.5mm;
    }
    .tracking-label {
      font-size: ${isTiny ? '4pt' : isCompact ? '4.5pt' : '5.5pt'};
      font-family: monospace;
      font-weight: 800;
      letter-spacing: 0.8px;
      margin-top: 0.3mm;
    }
  </style>
</head>
<body>
  <div class="screen-toolbar">
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="font-size: 18px;">🏷️</span>
      <div>
        <div style="font-weight: 900; font-size: 12px; line-height: 1.2;">Sticker Pedido #${form.numeroPedido}</div>
        <div style="font-size: 10px; color: #94a3b8;">${widthMm}x${heightMm}mm · OneControl</div>
      </div>
    </div>
    <button class="screen-btn" onclick="window.print()">
      🖨️ IMPRIMIR / PDF
    </button>
  </div>
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
        <div>PEDIDO #${form.numeroPedido}</div>
        ${form.fechaEntrega && !isTiny ? `<div style="font-size: 5pt; font-weight: 600; color: #444;">${form.fechaEntrega}</div>` : ''}
      </div>
    </div>

    <!-- DESTINATARIO -->
    <div class="dest-section">
      <div class="dest-label">ENTREGAR A:</div>
      <div class="dest-name">${form.cliente || 'CLIENTE FINAL'}</div>
      <div class="dest-phone">📞 TEL: ${form.phone || 'Sin número'}</div>
      <div class="dest-address">${form.direccion || 'Dirección pendiente de confirmación'}</div>
      ${zonaLimpia ? `<div class="zona-badge">📍 ${zonaLimpia.toUpperCase()}${form.municipio && form.municipio !== 'Guatemala' ? ' · ' + form.municipio.toUpperCase() : ''}</div>` : ''}
    </div>

    <!-- PRODUCTO -->
    <div class="prod-box">
      <div class="prod-text">${form.producto || 'Producto de catálogo'}</div>
      <div class="prod-qty">Cant: ${form.cantidad || '1'}</div>
    </div>

    <!-- MIDDLE: COBRO Y REDES SOCIALES EN 2 COLUMNAS (NO DESBORDA) -->
    <div class="middle-grid">
      
      <!-- COLUMNA COBRO -->
      ${options.showPrice ? `
        <div class="payment-box">
          <div class="payment-title">
            ${form.esContraEntrega ? '⚠️ COBRO CONTRA ENTREGA' : '✓ ESTADO: PAGADO'}
          </div>
          <div class="payment-amount">
            ${form.esContraEntrega ? (form.precio ? form.precio : 'A CONFIRMAR') : 'NO COBRAR'}
          </div>
          ${options.showNit && form.nit ? `<div style="font-size: 5pt; color: #333;">NIT: ${form.nit}</div>` : ''}
          ${options.showNotes && form.notas && !isTiny ? `<div class="notes-box"><strong>Ref:</strong> ${form.notas}</div>` : ''}
        </div>
      ` : ''}

      <!-- COLUMNA QR Y REDES -->
      ${options.showSocialQr && qrBase64 && !isTiny ? `
        <div class="social-qr-banner">
          <img src="${qrBase64}" class="qr-img" alt="QR" />
          <div class="social-info">
            <div class="social-headline">📱 SÍGUENOS</div>
            <div class="social-link">onecontrol.shop</div>
            <div class="social-handles">${options.socialHandle || '@onecontrol.shop'}</div>
            <div style="font-size: 4.5pt; color: #555;">TikTok · FB · IG</div>
          </div>
        </div>
      ` : ''}

    </div>

    <!-- FOOTER / CÓDIGO DE BARRAS -->
    ${options.showBarcode ? `
      <div class="footer-bar">
        <div>
          ${barcodeSvgHtml}
        </div>
        <div class="tracking-label">${barcodeNumber}</div>
      </div>
    ` : ''}

  </div>
</body>
</html>`;
  };

  // ── IMPRESIÓN ESTÁNDAR / SISTEMA ──────────────────────────────────────────
  const executeSystemPrint = () => {
    const html = generatePrintableHtml();
    const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (typeof window !== 'undefined' && window.innerWidth < 768);

    if (isMobileDevice) {
      // En dispositivos móviles (Android / iOS): abrir ventana limpia y llamar a print()
      const win = window.open('', '_blank');
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
        setTimeout(() => {
          try {
            win.focus();
            win.print();
          } catch (e) {
            console.warn('Auto print:', e);
          }
        }, 400);
        return;
      }
    }

    // En computadoras de escritorio: impresión limpia vía iframe
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

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
    }, 280);
  };

  // Manejar clic en "Imprimir"
  const handlePrint = () => {
    const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (typeof window !== 'undefined' && window.innerWidth < 768);
    if (isMobileDevice) {
      // En móvil, preguntamos si desea imprimir con la app Marklife (Bluetooth) o con la impresora del sistema
      setShowPrintChoiceModal(true);
    } else {
      executeSystemPrint();
    }
  };

  const handleOpenInNewTab = () => {
    const html = generatePrintableHtml();
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
  };

  // ── INTEGRACIÓN MARKLIFE & EXPORTACIÓN DE IMAGEN ─────────────────────────
  const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const generateStickerPngBlob = async () => {
    if (!stickerCardRef.current) {
      throw new Error('No se encontró el contenedor del sticker.');
    }

    const canvas = await html2canvas(stickerCardRef.current, {
      scale: 3, // 300 DPI ultra-nítido para impresoras térmicas
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      onclone: (clonedDoc, clonedElement) => {
        if (clonedElement.parentElement) {
          clonedElement.parentElement.style.transform = 'none';
          clonedElement.parentElement.style.marginBottom = '0px';
        }
      }
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Error al convertir el sticker a imagen.'));
      }, 'image/png', 1.0);
    });
  };

  const handleShareToMarklife = async () => {
    setIsExportingImage(true);
    try {
      const blob = await generateStickerPngBlob();
      const fileName = `sticker-pedido-${form.numeroPedido || 'envio'}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // Si el navegador soporta compartir archivos directamente a apps (Android Chrome, iOS Safari)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Sticker Pedido #${form.numeroPedido}`,
            text: `Sticker de envío Pedido #${form.numeroPedido}`
          });
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') return;
          console.warn('Share error:', shareErr);
        }
      }

      // Si el navegador no soporta Web Share con archivos o canceló, descargamos la imagen
      downloadBlob(blob, fileName);
      alert('¡Imagen guardada en tu teléfono! Abre la app Marklife y selecciona "Imprimir Imagen" o "Importar" para imprimir tu etiqueta por Bluetooth.');
    } catch (err) {
      console.error('Error exportando para Marklife:', err);
      alert('Error preparando sticker: ' + err.message);
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleDownloadStickerImage = async () => {
    setIsExportingImage(true);
    try {
      const blob = await generateStickerPngBlob();
      const fileName = `sticker-pedido-${form.numeroPedido || 'envio'}.png`;
      downloadBlob(blob, fileName);
    } catch (err) {
      console.error('Error descargando imagen:', err);
      alert('Error descargando imagen: ' + err.message);
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleOpenMarklifeApp = () => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isAndroid) {
      // Lanzar directamente la app Marklife en Android o redirigir a Play Store si no está instalada
      window.location.href = 'intent:#Intent;package=com.feioou.deliprint.yxq;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.feioou.deliprint.yxq;end';
    } else if (isIOS) {
      window.open('https://apps.apple.com/app/marklife/id1535497463', '_blank');
    } else {
      window.open('https://play.google.com/store/apps/details?id=com.feioou.deliprint.yxq', '_blank');
    }
  };

  // Atajos rápidos para Zonas de Guatemala
  const QUICK_ZONAS = [
    'Zona 1', 'Zona 4', 'Zona 7', 'Zona 9', 'Zona 10',
    'Zona 11', 'Zona 12', 'Zona 13', 'Zona 14', 'Zona 15',
    'Zona 16', 'Mixco', 'Villa Nueva', 'Carretera al Salvador'
  ];

  // Atajos rápidos para Notas de entrega
  const QUICK_NOTES = [
    'Llamar antes de llegar',
    'Entregar en garita',
    'Pago contra entrega exacto',
    'Portón color café',
    'Envío por Guatex'
  ];

  const appendNote = (text) => {
    setForm(prev => ({
      ...prev,
      notas: prev.notas ? `${prev.notas}, ${text}` : text
    }));
  };

  const zonaVisual = extractOrCleanZona(form.zona, form.direccion, form.notas);

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-6xl h-[95vh] sm:h-auto sm:max-h-[95vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-orange-500/10 text-[#FF6B00] flex items-center justify-center font-black shrink-0">
              <Tag size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-base font-black text-slate-900 flex items-center gap-1.5 truncate">
                <span>Sticker de Envío</span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold shrink-0">
                  #{form.numeroPedido}
                </span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">
                Imprime la etiqueta con logo, QR de redes, datos de entrega y cobro.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowMarklifeModal(true)}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-orange-50 hover:bg-orange-100 text-[#FF6B00] border border-orange-200 text-[11px] sm:text-xs font-black rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Imprimir con aplicación Marklife (Bluetooth)"
            >
              <Smartphone size={14} />
              <span>Marklife</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#FF6B00] hover:bg-[#e05e00] text-white text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer size={14} /> 
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* SELECTOR DE PESTAÑAS PARA MÓVIL (VISIBLE EN PANTALLAS PEQUEÑAS) */}
        <div className="lg:hidden flex border-b border-slate-200 bg-slate-100/90 p-1.5 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'preview'
                ? 'bg-white text-[#FF6B00] shadow-xs border border-orange-200 ring-1 ring-[#FF6B00]'
                : 'text-slate-600 hover:text-slate-900 bg-transparent'
            }`}
          >
            <Eye size={15} />
            <span>👁️ Ver Sticker</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('edit')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'edit'
                ? 'bg-white text-[#FF6B00] shadow-xs border border-orange-200 ring-1 ring-[#FF6B00]'
                : 'text-slate-600 hover:text-slate-900 bg-transparent'
            }`}
          >
            <Sliders size={15} />
            <span>✏️ Editar Datos & Tamaño</span>
          </button>
        </div>

        {/* BODY (2 COLUMNAS: FORMULARIO Y VISTA PREVIA) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          
          {/* COLUMNA IZQUIERDA: CONFIGURACIÓN Y DATOS (7 COLS) */}
          <div className={`lg:col-span-6 xl:col-span-5 p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[82vh] ${
            mobileTab === 'preview' ? 'hidden lg:block' : 'block'
          }`}>
            
            {/* AVISO TIP DE IMPRESIÓN PARA NINGÚN MARGEN */}
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
              <HelpCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <strong>Tip de Impresión:</strong> En la ventana de impresión (Chrome), en <strong>Márgenes</strong> selecciona <strong>"Ninguno"</strong> y activa la casilla <strong>"Gráficos de fondo"</strong> para que imprima al 100% de tu etiqueta.
              </div>
            </div>

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
                    onChange={e => setForm(prev => ({ ...prev, cliente: e.target.value }))}
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
                    onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
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
                  onChange={e => setForm(prev => ({ ...prev, direccion: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#FF6B00]"
                  placeholder="Calle, avenida, número, colonia, garita, etc."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Zona / Sector / Municipio:
                  </label>
                  {zonaVisual && (
                    <span className="text-[10px] font-bold text-emerald-600">
                      Detectado: {zonaVisual}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={form.zona}
                  onChange={e => setForm(prev => ({ ...prev, zona: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:border-[#FF6B00]"
                  placeholder="Ej: Zona 11, Mixco, Villa Nueva"
                />

                <div className="flex flex-wrap gap-1 mt-1.5">
                  {QUICK_ZONAS.map(z => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, zona: z }))}
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
                    onChange={e => setForm(prev => ({ ...prev, producto: e.target.value }))}
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
                    onChange={e => setForm(prev => ({ ...prev, cantidad: e.target.value }))}
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
                    onChange={e => setForm(prev => ({ ...prev, precio: e.target.value }))}
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
                      onChange={e => setForm(prev => ({ ...prev, nit: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#FF6B00]"
                      placeholder="C/F o NIT"
                    />
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, nit: 'C/F' }))}
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
                    onChange={() => setForm(prev => ({ ...prev, esContraEntrega: true, pagado: false }))}
                    className="accent-[#FF6B00] cursor-pointer"
                  />
                  <span>⚠️ Cobrar Contra Entrega</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="radio"
                    name="tipoCobro"
                    checked={!form.esContraEntrega}
                    onChange={() => setForm(prev => ({ ...prev, esContraEntrega: false, pagado: true }))}
                    className="accent-emerald-600 cursor-pointer"
                  />
                  <span>✓ Pagado (No cobrar)</span>
                </label>
              </div>

              {/* 4. NOTAS / INSTRUCCIONES AL REPARTIDOR */}
              <div className="pt-2 border-t border-slate-200/60">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <FileText size={12} className="text-[#FF6B00]" />
                    Notas / Instrucciones al Repartidor:
                  </label>
                  {form.notas && (
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, notas: '' }))}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline cursor-pointer"
                      title="Borrar todo el texto de notas"
                    >
                      <Trash2 size={11} />
                      <span>Limpiar notas</span>
                    </button>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    rows={2}
                    value={form.notas}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => ({ ...prev, notas: val }));
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#FF6B00] resize-y"
                    placeholder="Escribe las notas de entrega o selecciona un atajo abajo..."
                  />
                </div>

                <div className="flex flex-wrap gap-1 mt-1.5">
                  {QUICK_NOTES.map(note => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => appendNote(note)}
                      className="text-[9.5px] font-medium px-2 py-0.5 bg-white hover:bg-orange-50 hover:text-orange-700 text-slate-600 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                    >
                      + {note}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. CONFIGURACIÓN DE REDES SOCIALES & QR */}
            <div className="space-y-3 p-4 bg-orange-50/40 rounded-2xl border border-orange-200/70">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <QrCode size={14} className="text-[#FF6B00]" />
                  QR de Redes Sociales & Web
                </span>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.showSocialQr}
                    onChange={e => setOptions({ ...options, showSocialQr: e.target.checked })}
                    className="accent-[#FF6B00] rounded cursor-pointer"
                  />
                  <span>Mostrar en Sticker</span>
                </label>
              </div>

              {options.showSocialQr && (
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                      Destino al Escanear el QR:
                    </label>
                    <select
                      value={options.socialQrTarget}
                      onChange={e => setOptions({ ...options, socialQrTarget: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#FF6B00] cursor-pointer"
                    >
                      {QR_TARGETS.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {options.socialQrTarget === 'custom' && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Enlace personalizado (URL):</label>
                      <input
                        type="url"
                        value={options.customQrUrl}
                        onChange={e => setOptions({ ...options, customQrUrl: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                        placeholder="https://tu-pagina-o-redes.com"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                        Usuario de Redes:
                      </label>
                      <input
                        type="text"
                        value={options.socialHandle}
                        onChange={e => setOptions({ ...options, socialHandle: e.target.value })}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                        placeholder="@onecontrol.shop"
                      />
                    </div>
                    <div className="flex items-end pb-1 text-[10px] text-slate-500 font-medium">
                      IG · TikTok · Facebook · Web
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* BOTÓN: GUARDAR DATOS EN CRM Y PESTAÑA NUEVA */}
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
                <span>Pestaña nueva / PDF</span>
              </button>
            </div>

            {/* BOTÓN MÓVIL PARA VER EL STICKER TRAS EDITAR */}
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className="lg:hidden w-full py-2.5 px-4 bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <Eye size={15} />
              <span>Ver Sticker Generado</span>
            </button>
          </div>

          {/* COLUMNA DERECHA: VISTA PREVIA WYSIWYG */}
          <div className={`lg:col-span-6 xl:col-span-7 p-3 sm:p-6 bg-slate-100 flex flex-col justify-between items-center overflow-y-auto max-h-[82vh] ${
            mobileTab === 'edit' ? 'hidden lg:flex' : 'flex'
          }`}>
            
            {/* BARRA DE ZOOM Y CONTROLES */}
            <div className="w-full flex items-center justify-between mb-3 px-1 sm:px-2 shrink-0">
              <span className="text-[11px] sm:text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                Vista Previa ({activeSize.widthMm}x{activeSize.heightMm}mm):
              </span>

              <div className="flex items-center gap-1 sm:gap-2 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                  className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                  title="Alejar"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="text-[10px] sm:text-[11px] font-black text-slate-700 w-9 text-center">
                  {Math.round(effectiveScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.min(1.6, z + 0.1))}
                  className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                  title="Acercar"
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="text-[9.5px] font-bold text-slate-400 hover:text-slate-700 ml-0.5 cursor-pointer"
                  title="Ajustar a 100%"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* CONTENEDOR VISUAL DEL STICKER (AUTO-ESCALADO RESPONSIVE) */}
            <div
              className="flex-1 flex flex-col items-center justify-center p-1 sm:p-2 w-full overflow-x-auto"
              style={{
                minHeight: `${Math.round((activeSize.heightMm * 3.78 * effectiveScale) + 16)}px`
              }}
            >
              <div
                style={{
                  width: `${activeSize.widthMm * 3.78}px`,
                  height: `${activeSize.heightMm * 3.78}px`,
                  transform: `scale(${effectiveScale})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out',
                  marginBottom: effectiveScale < 1 ? `-${Math.round((activeSize.heightMm * 3.78) * (1 - effectiveScale))}px` : '0px'
                }}
                className="bg-white text-black shadow-2xl rounded-sm border-2 border-black overflow-hidden flex flex-col justify-between select-none shrink-0"
              >
                {/* REPRESENTACIÓN VISUAL EN PANTALLA */}
                <div
                  ref={stickerCardRef}
                  style={{
                    width: `${activeSize.widthMm * 3.78}px`,
                    height: `${activeSize.heightMm * 3.78}px`,
                    maxHeight: `${activeSize.heightMm * 3.78}px`,
                    padding: activeSize.density === 'tiny' ? '5px' : activeSize.density === 'compact' ? '8px' : '12px'
                  }}
                  className="flex flex-col justify-between h-full text-slate-950 font-sans overflow-hidden bg-white"
                >
                  {/* TOP HEADER */}
                  <div className="flex justify-between items-center border-b border-black pb-1 mb-1">
                    <div className="flex items-center gap-1.5">
                      {options.showLogo && (
                        <img
                          src={ONE_CONTROL_LOGO_BASE64}
                          alt="OneControl"
                          style={{
                            height: activeSize.density === 'tiny' ? '14px' : activeSize.density === 'compact' ? '20px' : '28px'
                          }}
                          className="object-contain"
                        />
                      )}
                      <div>
                        <div className="text-[11px] font-black tracking-tight uppercase leading-none">ONECONTROL</div>
                        {options.showSender && activeSize.density !== 'tiny' && (
                          <div className="text-[8px] font-bold text-slate-600 mt-0.5">
                            PBX: 5965-8803 · onecontrol.shop
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] font-black">PEDIDO #{form.numeroPedido}</div>
                      {form.fechaEntrega && activeSize.density !== 'tiny' && (
                        <div className="text-[8px] font-semibold text-slate-500">
                          {form.fechaEntrega}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DESTINATARIO */}
                  <div className="border border-black rounded p-1.5 bg-slate-50/70 mb-1">
                    <div className="text-[7.5px] font-black text-slate-600 uppercase tracking-widest leading-none">
                      ENTREGAR A:
                    </div>
                    <div className={`font-black uppercase tracking-tight leading-tight my-0.5 ${
                      activeSize.density === 'tiny' ? 'text-[9.5px]' : activeSize.density === 'compact' ? 'text-xs' : 'text-sm'
                    }`}>
                      {form.cliente || 'CLIENTE FINAL'}
                    </div>
                    <div className="text-[10px] font-bold text-slate-900 leading-tight">
                      📞 TEL: {form.phone || 'Sin número'}
                    </div>
                    <div className="text-[9.5px] font-medium text-slate-800 leading-snug mt-0.5">
                      {form.direccion || 'Dirección pendiente de confirmación'}
                    </div>
                    {zonaVisual && (
                      <div className="inline-block bg-black text-white text-[8.5px] font-black px-1.5 py-0.2 rounded-sm mt-1 uppercase">
                        📍 {zonaVisual.toUpperCase()}{form.municipio && form.municipio !== 'Guatemala' ? ' · ' + form.municipio.toUpperCase() : ''}
                      </div>
                    )}
                  </div>

                  {/* PRODUCTO */}
                  <div className="flex justify-between items-center py-1 border-t border-b border-dashed border-slate-400 mb-1">
                    <div className="text-[10px] font-bold truncate max-w-[75%] leading-none">
                      {form.producto || 'Producto sin especificar'}
                    </div>
                    <div className="text-[10px] font-black bg-slate-100 px-1 py-0.2 rounded leading-none">
                      Cant: {form.cantidad || '1'}
                    </div>
                  </div>

                  {/* MIDDLE: 2 COLUMNAS (COBRO A LA IZQUIERDA, QR A LA DERECHA) */}
                  <div className="grid grid-cols-2 gap-1.5 mb-1 items-stretch">
                    
                    {/* COBRO */}
                    {options.showPrice && (
                      <div className="border border-black rounded p-1 text-center bg-white flex flex-col justify-center">
                        <div className="text-[7.5px] font-black uppercase text-slate-700 tracking-wider leading-none">
                          ${form.esContraEntrega ? '⚠️ COBRO CONTRA ENTREGA' : '✓ ESTADO: PAGADO'}
                        </div>
                        <div className="text-xs font-black tracking-tight leading-tight my-0.5">
                          {form.esContraEntrega ? (form.precio || 'A CONFIRMAR') : 'NO COBRAR'}
                        </div>
                        {options.showNit && form.nit && (
                          <div className="text-[7.5px] text-slate-600 font-bold leading-none">
                            NIT: {form.nit}
                          </div>
                        )}
                        {options.showNotes && form.notas && activeSize.density !== 'tiny' && (
                          <div className="text-[7.5px] text-slate-700 italic border-t border-slate-200 pt-0.5 mt-0.5 truncate">
                            Ref: {form.notas}
                          </div>
                        )}
                      </div>
                    )}

                    {/* QR REDES */}
                    {options.showSocialQr && qrBase64 && activeSize.density !== 'tiny' && (
                      <div className="flex items-center gap-1.5 border border-black rounded p-1 bg-slate-50/80">
                        <img
                          src={qrBase64}
                          alt="QR"
                          style={{
                            width: activeSize.density === 'compact' ? '36px' : '46px',
                            height: activeSize.density === 'compact' ? '36px' : '46px'
                          }}
                          className="object-contain border border-black bg-white rounded-xs shrink-0"
                        />
                        <div className="flex-1 leading-tight overflow-hidden">
                          <div className="text-[8px] font-black uppercase tracking-tight text-slate-900">
                            📱 SÍGUENOS
                          </div>
                          <div className="text-[7.5px] font-bold text-black truncate">
                            onecontrol.shop
                          </div>
                          <div className="text-[7px] font-bold text-slate-600 truncate">
                            {options.socialHandle || '@onecontrol.shop'}
                          </div>
                          <div className="text-[6.5px] text-slate-500">
                            TikTok · FB · IG
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* BARCODE FOOTER */}
                  {options.showBarcode && (
                    <div className="mt-auto pt-0.5 text-center">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: generateBarcodeSvg(
                            `OC-${String(form.numeroPedido).padStart(4, '0')}`,
                            activeSize.density === 'tiny' ? 14 : activeSize.density === 'compact' ? 18 : 22
                          )
                        }}
                      />
                      <div className="text-[7.5px] font-mono font-bold tracking-widest text-slate-700 mt-0.5 leading-none">
                        *OC-{String(form.numeroPedido).padStart(4, '0')}*
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* BOTÓN INFERIOR DE IMPRESIÓN (DESKTOP) */}
            <div className="w-full hidden sm:flex items-center justify-between pt-4 border-t border-slate-200 shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Compatible con impresoras térmicas (Zebra, MUNBYN, Xprinter) y app Marklife.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMarklifeModal(true)}
                  className="px-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-[#FF6B00] border border-orange-200 text-xs font-black rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-2xs"
                  title="Exportar imagen o compartir con la app Marklife"
                >
                  <Smartphone size={15} /> App Marklife
                </button>
                <button
                  type="button"
                  onClick={executeSystemPrint}
                  className="px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Printer size={16} /> Imprimir Ahora
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* BARRA DE ACCIÓN FIJA EN MÓVIL (SIEMPRE VISIBLE ABAJO) */}
        <div className="lg:hidden p-2 sm:p-2.5 bg-white border-t border-slate-200 flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab(t => t === 'preview' ? 'edit' : 'preview')}
            className="py-2.5 px-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 flex items-center justify-center gap-1 shrink-0 cursor-pointer"
          >
            {mobileTab === 'preview' ? (
              <>
                <Sliders size={13} />
                <span>Editar</span>
              </>
            ) : (
              <>
                <Eye size={13} />
                <span>Ver</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowMarklifeModal(true)}
            className="py-2.5 px-3 rounded-xl border border-orange-200 text-xs font-black text-[#FF6B00] bg-orange-50 hover:bg-orange-100 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
            title="Imprimir con aplicación Marklife por Bluetooth"
          >
            <Smartphone size={14} />
            <span>Marklife</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 px-2.5 bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer size={15} />
            <span>Imprimir</span>
          </button>
        </div>

      </div>

      {/* ── MODAL: ELECCIÓN DE MÉTODO DE IMPRESIÓN (MÓVIL) ──────────────────── */}
      {showPrintChoiceModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-60 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>¿Cómo deseas imprimir?</span>
              </h3>
              <button
                onClick={() => setShowPrintChoiceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Opción Marklife */}
              <button
                type="button"
                onClick={() => {
                  setShowPrintChoiceModal(false);
                  setShowMarklifeModal(true);
                }}
                className="w-full p-3.5 rounded-2xl bg-orange-50 hover:bg-orange-100/90 border-2 border-[#FF6B00] text-left transition-all cursor-pointer flex items-center gap-3 shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center font-black shrink-0 shadow-sm shadow-orange-500/30">
                  <Smartphone size={20} />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-black text-orange-950 flex items-center justify-between">
                    <span>App Marklife (Bluetooth)</span>
                    <span className="text-[9px] bg-[#FF6B00] text-white px-1.5 py-0.5 rounded-md font-black">Recomendado</span>
                  </div>
                  <div className="text-[11px] text-orange-900/80 font-medium mt-0.5 leading-snug">
                    Para mini impresoras térmicas portátiles conectadas por Bluetooth.
                  </div>
                </div>
              </button>

              {/* Opción Impresora del Sistema / PDF */}
              <button
                type="button"
                onClick={() => {
                  setShowPrintChoiceModal(false);
                  executeSystemPrint();
                }}
                className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all cursor-pointer flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-black shrink-0">
                  <Printer size={20} />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">
                    Impresora del Teléfono / PDF
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                    Impresoras Wi-Fi, AirPrint de red o guardar archivo en PDF.
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: IMPRIMIR CON APPLICACIÓN MARKLIFE ────────────────────────── */}
      {showMarklifeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-60 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-[#FF6B00] flex items-center justify-center font-black">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Imprimir con App Marklife</h3>
                  <p className="text-[11px] text-slate-500">Impresoras térmicas Bluetooth</p>
                </div>
              </div>
              <button
                onClick={() => setShowMarklifeModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Guía rápida */}
            <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-3.5 space-y-2 text-xs text-orange-950">
              <div className="font-black text-orange-900 flex items-center gap-1.5">
                <span>💡 ¿Cómo imprimir en tu celular?</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 font-medium leading-relaxed text-slate-700 text-[11.5px]">
                <li>Toca el botón <strong>"Compartir a Marklife"</strong> abajo.</li>
                <li>En el menú de aplicaciones que aparece en tu teléfono, selecciona <strong>Marklife</strong>.</li>
                <li>La app Marklife se abrirá con el sticker cargado en pantalla listo para imprimir.</li>
              </ol>
            </div>

            {/* Acciones principales */}
            <div className="space-y-2.5 pt-1">
              {/* Botón 1: Compartir directamente */}
              <button
                type="button"
                onClick={handleShareToMarklife}
                disabled={isExportingImage}
                className="w-full py-3 px-4 bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isExportingImage ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Preparando imagen en HD...</span>
                  </>
                ) : (
                  <>
                    <Share2 size={15} />
                    <span>1. Compartir directo a Marklife</span>
                  </>
                )}
              </button>

              {/* Botón 2: Guardar PNG en galería */}
              <button
                type="button"
                onClick={handleDownloadStickerImage}
                disabled={isExportingImage}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Download size={14} />
                <span>2. Guardar Imagen en Teléfono (PNG)</span>
              </button>

              {/* Botón 3: Abrir app Marklife */}
              <button
                type="button"
                onClick={handleOpenMarklifeApp}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ExternalLink size={14} />
                <span>3. Abrir App Marklife en este teléfono</span>
              </button>
            </div>

            <div className="text-[10px] text-slate-400 text-center leading-normal pt-1">
              Compatible con impresoras Marklife (P11, P12, P15, P50, M110, D110 y similares).
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
