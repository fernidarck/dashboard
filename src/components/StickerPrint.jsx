import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, Printer, Save, Check, RefreshCw, ZoomIn, ZoomOut,
  Tag, User, Package, FileText, ExternalLink, Sliders,
  CheckCircle2, Trash2, Globe, Eye, Smartphone, Download,
  Contrast, Type, ArrowUpDown, ArrowLeftRight, LayoutGrid
} from 'lucide-react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { ONE_CONTROL_LOGO_BASE64 } from '../assets/logoBase64.js';

// ── TAMAÑOS BASE DE STICKERS (SE ADAPTAN A VERTICAL U HORIZONTAL) ───────────
export const STICKER_SIZES = [
  {
    id: '10x15',
    name: '100 x 150 mm (10 x 15 cm)',
    badge: 'Guía Grande 4"x6" ⭐',
    description: 'Estándar grande para paquetería e impresoras térmicas.',
    widthMm: 100,
    heightMm: 150,
    defaultOrientation: 'vertical'
  },
  {
    id: '10x10',
    name: '100 x 100 mm (10 x 10 cm)',
    badge: 'Cuadrado Grande 4"x4"',
    description: 'Ideal para cajas medianas y cajas de motores.',
    widthMm: 100,
    heightMm: 100,
    defaultOrientation: 'vertical'
  },
  {
    id: '10x7.5',
    name: '100 x 75 mm (10 x 7.5 cm)',
    badge: 'Mediano Estándar 4"x3"',
    description: 'Tamaño versátil y balanceado para despachos y cajas.',
    widthMm: 100,
    heightMm: 75,
    defaultOrientation: 'horizontal'
  },
  {
    id: '7.5x5',
    name: '75 x 50 mm (7.5 x 5 cm)',
    badge: 'Caja Compacta 3"x2"',
    description: 'Sticker compacto para paquetes pequeños o accesorios.',
    widthMm: 75,
    heightMm: 50,
    defaultOrientation: 'horizontal'
  },
  {
    id: '5x2.5',
    name: '50 x 25 mm (5 x 2.5 cm)',
    badge: 'Mini / Controles 2"x1"',
    description: 'Mini etiqueta para cajas de controles remotos.',
    widthMm: 50,
    heightMm: 25,
    defaultOrientation: 'horizontal'
  },
  {
    id: 'custom',
    name: 'Personalizado (mm)',
    badge: 'Medida Libre',
    description: 'Especifica ancho y alto exactos en milímetros.',
    widthMm: 100,
    heightMm: 150,
    defaultOrientation: 'vertical'
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

function generateBarcodeSvg(text, height = 24) {
  const clean = '*' + String(text || 'OC-PEDIDO').toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '') + '*';
  const narrow = 1.8;
  const wide = 4.4;
  const gap = 1.8;

  const rects = [];
  let currentX = 4;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const pattern = CODE39_ENCODINGS[char] || CODE39_ENCODINGS['-'];
    for (let j = 0; j < 9; j++) {
      const isBar = (j % 2 === 0);
      const isWide = pattern[j] === '1';
      const width = isWide ? wide : narrow;
      if (isBar) {
        rects.push(`<rect x="${currentX}" y="0" width="${width}" height="${height}" fill="#000000" />`);
      }
      currentX += width;
    }
    currentX += gap;
  }

  const totalWidth = currentX + 4;
  return `<svg viewBox="0 0 ${totalWidth} ${height}" preserveAspectRatio="none" style="width: 100%; height: ${height}px; display: block;">${rects.join('')}</svg>`;
}

// ── GENERADOR DE QR COMO SVG DE CUADRITOS EXACTOS (VECTOR PURO, NÍTIDO) ──────
// La librería genera el QR con trazos (stroke) que a tamaño pequeño se ven
// disparejos/borrosos. Aquí lo construimos módulo por módulo con <rect>, lo que
// da un QR cuadrado, nítido y minimalista a cualquier tamaño y en impresión.
function buildQrSvg(text) {
  let qr;
  try {
    qr = QRCode.create(String(text || 'https://onecontrol.shop'), { errorCorrectionLevel: 'M' });
  } catch (e) {
    return '';
  }
  const n = qr.modules.size;
  const data = qr.modules.data;
  const margin = 2;            // zona de silencio (quiet zone) para que escanee bien
  const dim = n + margin * 2;
  let rects = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (data[y * n + x]) {
        // 1.03 de ancho/alto solapa ligeramente los módulos para evitar
        // líneas blancas finas entre cuadros al escalar.
        rects += `<rect x="${x + margin}" y="${y + margin}" width="1.03" height="1.03"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${dim} ${dim}" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges" style="display:block"><rect width="${dim}" height="${dim}" fill="#ffffff"/><g fill="#000000">${rects}</g></svg>`;
}

// ── ÍCONOS VECTORIALES MINIMALISTAS (PURO SVG EN NEGRO, SIN EMOJIS) ─────────
function SocialIconSvg({ type, size = 11, color = '#000000' }) {
  const style = { width: `${size}px`, height: `${size}px`, display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 };
  if (type === 'web') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    );
  }
  if (type === 'ig') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    );
  }
  if (type === 'fb') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    );
  }
  if (type === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
      </svg>
    );
  }
  if (type === 'wa') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    );
  }
  return null;
}

// ── LIMPIEZA INTELIGENTE DE ZONAS Y DIRECCIÓN ───────────────────────────────
function extractOrCleanZona(zona, direccion, notas) {
  const raw = String(zona || '').trim();
  if (raw && !/^(n\/?a|none|null|undefined|-|\.)$/i.test(raw)) {
    return raw;
  }
  const combined = `${direccion || ''} ${notas || ''}`;
  const m = combined.match(/\b(?:zona|z\.?)\s*(\d{1,2})\b/i);
  if (m) {
    return `Zona ${m[1]}`;
  }
  const mTown = combined.match(/\b(mixco|villa nueva|san crist[oó]bal|santa catarina|carretera al? salvador|san miguel petapa|amatitl[aá]n|fraijanes|chinautla)\b/i);
  if (mTown) {
    return mTown[1];
  }
  return '';
}

function formatCleanAddress(rawDir) {
  if (!rawDir) return '';
  return String(rawDir)
    .replace(/\r\n/g, '\n')
    .replace(/\n{2,}/g, ' · ')
    .replace(/\n/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const QR_TARGETS = [
  { id: 'web', label: 'Página Web & Redes (onecontrol.shop)', url: 'https://onecontrol.shop' },
  { id: 'whatsapp', label: 'WhatsApp Directo (+502 5965-8803)', url: 'https://wa.me/50259658803' },
  { id: 'catalogo', label: 'Catálogo de Productos (onecontrol.shop/tienda)', url: 'https://onecontrol.shop/tienda/' },
  { id: 'custom', label: 'Enlace Personalizado', url: '' }
];

const DEFAULT_OPTIONS = {
  colorMode: 'bw',            // 'bw' (Blanco y Negro térmico) | 'color'
  orientation: 'vertical',    // 'vertical' | 'horizontal'
  textScale: 'normal',        // 'normal' | 'large' | 'xlarge'
  showLogo: true,
  showSender: true,
  showBarcode: true,
  showPrice: true,
  showNit: true,
  showNotes: true,
  showSocialQr: true,
  showWebsite: true,
  websiteUrl: 'www.onecontrol.shop',
  showSocials: true,
  socialHandle: '@onecontrol.shop',
  showTiktok: true,
  showInstagram: true,
  showFacebook: true,
  showWhatsapp: true,
  whatsappNumber: '5965-8803',
  prominentSocials: true,
  socialQrTarget: 'web',
  customQrUrl: ''
};

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

  // Tamaño guardado o default ('10x15' = 100x150mm)
  const [sizeId, setSizeId] = useState(() => {
    return localStorage.getItem('onecontrol_sticker_size') || '10x15';
  });
  const [customW, setCustomW] = useState(() => {
    return Number(localStorage.getItem('onecontrol_sticker_custom_w')) || 100;
  });
  const [customH, setCustomH] = useState(() => {
    return Number(localStorage.getItem('onecontrol_sticker_custom_h')) || 150;
  });

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

  // Opciones persistentes
  const [options, setOptions] = useState(() => {
    try {
      const saved = localStorage.getItem('onecontrol_sticker_options_v3');
      if (saved) {
        return { ...DEFAULT_OPTIONS, ...JSON.parse(saved) };
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_OPTIONS;
  });

  const updateOptions = (patch) => {
    setOptions(prev => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      try {
        localStorage.setItem('onecontrol_sticker_options_v3', JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  const [qrSvg, setQrSvg] = useState('');
  const [croppedLogos, setCroppedLogos] = useState({
    bw: ONE_CONTROL_LOGO_BASE64,
    color: ONE_CONTROL_LOGO_BASE64
  });
  const [savingLead, setSavingLead] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [mobileTab, setMobileTab] = useState('preview');
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [marklifeStatus, setMarklifeStatus] = useState('');
  const [showMarklifeModal, setShowMarklifeModal] = useState(false);
  const [showPrintChoiceModal, setShowPrintChoiceModal] = useState(false);
  const stickerCardRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pre-procesar el logo: recortar márgenes blancos sobrantes y generar versión Blanco y Negro Puro (#000000)
  useEffect(() => {
    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.width;
        const h = img.height;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const ctx = tempCanvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        let minX = w, minY = h, maxX = 0, maxY = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];
            if (a > 20 && (r < 242 || g < 242 || b < 242)) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX <= minX || maxY <= minY) {
          minX = 0; minY = 0; maxX = w - 1; maxY = h - 1;
        } else {
          const pad = 8;
          minX = Math.max(0, minX - pad);
          minY = Math.max(0, minY - pad);
          maxX = Math.min(w - 1, maxX + pad);
          maxY = Math.min(h - 1, maxY + pad);
        }

        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;

        const colorCanvas = document.createElement('canvas');
        colorCanvas.width = cropW;
        colorCanvas.height = cropH;
        const colorCtx = colorCanvas.getContext('2d');
        colorCtx.fillStyle = '#FFFFFF';
        colorCtx.fillRect(0, 0, cropW, cropH);
        colorCtx.drawImage(tempCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
        const colorDataUrl = colorCanvas.toDataURL('image/png');

        const bwCanvas = document.createElement('canvas');
        bwCanvas.width = cropW;
        bwCanvas.height = cropH;
        const bwCtx = bwCanvas.getContext('2d');
        bwCtx.drawImage(colorCanvas, 0, 0);
        const bwImgData = bwCtx.getImageData(0, 0, cropW, cropH);
        const bwData = bwImgData.data;

        for (let i = 0; i < bwData.length; i += 4) {
          const minChannel = Math.min(bwData[i], bwData[i + 1], bwData[i + 2]);
          const v = minChannel < 185 ? 0 : 255;
          bwData[i] = v;
          bwData[i + 1] = v;
          bwData[i + 2] = v;
          bwData[i + 3] = 255;
        }
        bwCtx.putImageData(bwImgData, 0, 0);
        const bwDataUrl = bwCanvas.toDataURL('image/png');

        if (isMounted) {
          setCroppedLogos({ bw: bwDataUrl, color: colorDataUrl });
        }
      } catch (err) {
        console.warn('No se pudo procesar logo B/N:', err);
      }
    };
    img.src = ONE_CONTROL_LOGO_BASE64;
    return () => { isMounted = false; };
  }, []);

  const initializedPedidoIdRef = useRef(null);

  useEffect(() => {
    if (!pedido) return;
    if (initializedPedidoIdRef.current === pedido.id) return;
    initializedPedidoIdRef.current = pedido.id;

    const notasText = (pedido.notas || '').trim();
    let initialDir = (matchedLead?.direccion || '').trim();
    let initialNotas = notasText;
    let initialNit = matchedLead?.nit || 'C/F';

    // Si el lead no tenía dirección separada pero las notas del pedido son la dirección,
    // usarla como dirección principal y NO duplicarla en el campo de notas adicionales.
    if (!initialDir && notasText) {
      initialDir = notasText;
      initialNotas = '';
    } else if (initialDir && notasText && initialDir.toLowerCase() === notasText.toLowerCase()) {
      initialNotas = '';
    }

    const initialZona = extractOrCleanZona(matchedLead?.zona, initialDir, notasText);
    const initialEsContraEntrega = !/completad/i.test(pedido.estado || '');
    const initialPagado = /completad/i.test(pedido.estado || '');

    setForm({
      cliente: pedido.cliente || matchedLead?.nombre || '',
      phone: pedido.phone || matchedLead?.phone || '',
      direccion: formatCleanAddress(initialDir),
      zona: initialZona,
      municipio: 'Guatemala',
      departamento: 'Guatemala',
      producto: pedido.producto || '',
      cantidad: pedido.cantidad || '1',
      precio: pedido.precio || '',
      esContraEntrega: initialEsContraEntrega,
      pagado: initialPagado,
      nit: initialNit || 'C/F',
      notas: initialNotas,
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

  useEffect(() => {
    // QR vectorial de cuadritos exactos: nítido en pantalla e impresión térmica.
    setQrSvg(buildQrSvg(currentQrUrl));
  }, [currentQrUrl]);

  // Manejar cambio de tamaño de sticker
  const handleSizeChange = (id) => {
    setSizeId(id);
    localStorage.setItem('onecontrol_sticker_size', id);
    const preset = STICKER_SIZES.find(s => s.id === id);
    if (preset && preset.defaultOrientation && id !== 'custom') {
      updateOptions({ orientation: preset.defaultOrientation });
    }
  };

  const handleOrientationChange = (newOrientation) => {
    updateOptions({ orientation: newOrientation });
    if (sizeId === 'custom') {
      const minSide = Math.min(customW, customH);
      const maxSide = Math.max(customW, customH);
      if (newOrientation === 'vertical') {
        handleCustomWChange(minSide);
        handleCustomHChange(maxSide);
      } else {
        handleCustomWChange(maxSide);
        handleCustomHChange(minSide);
      }
    }
  };

  const handleCustomWChange = (val) => {
    setCustomW(val);
    localStorage.setItem('onecontrol_sticker_custom_w', String(val));
  };

  const handleCustomHChange = (val) => {
    setCustomH(val);
    localStorage.setItem('onecontrol_sticker_custom_h', String(val));
  };

  // Dimensiones finales adaptadas a la orientación (Vertical vs Horizontal)
  const activeSize = useMemo(() => {
    const found = STICKER_SIZES.find(s => s.id === sizeId) || STICKER_SIZES[0];
    let rawW = found.widthMm;
    let rawH = found.heightMm;
    if (sizeId === 'custom') {
      rawW = Math.max(25, Math.min(250, Number(customW) || 100));
      rawH = Math.max(20, Math.min(300, Number(customH) || 150));
    }

    const minDim = Math.min(rawW, rawH);
    const maxDim = Math.max(rawW, rawH);
    const isHorizontal = options.orientation === 'horizontal';

    // Si es cuadrado (ej. 100x100), w y h son iguales pero 'isHorizontal' cambia la distribución interna
    const w = isHorizontal ? maxDim : minDim;
    const h = isHorizontal ? minDim : maxDim;

    const area = w * h;
    const shortSide = Math.min(w, h);
    const density = shortSide <= 32 ? 'tiny' : area <= 4200 ? 'small' : area <= 8200 ? 'compact' : area <= 11500 ? 'medium' : 'spacious';

    return {
      ...found,
      widthMm: w,
      heightMm: h,
      isHorizontal,
      density
    };
  }, [sizeId, customW, customH, options.orientation]);

  // Escala adaptativa responsive para la vista previa en pantalla
  const isSmallScreen = windowWidth < 640;
  const stickerWidthPx = Math.round(activeSize.widthMm * 3.78);
  const stickerHeightPx = Math.round(activeSize.heightMm * 3.78);
  const availableWidth = isSmallScreen ? Math.max(260, windowWidth - 40) : 540;
  const availableHeight = isSmallScreen ? 460 : 540;
  const autoScaleW = stickerWidthPx > availableWidth ? (availableWidth / stickerWidthPx) : 1;
  const autoScaleH = stickerHeightPx > availableHeight ? (availableHeight / stickerHeightPx) : 1;
  const autoScaleRatio = Math.min(autoScaleW, autoScaleH, 1);
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
          notas: form.notas || form.direccion,
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

  // ── MÉTRICAS DE DISEÑO MINIMALISTA Y AUTO-ADAPTATIVO (VERTICAL & HORIZONTAL) ──
  const layoutMetrics = useMemo(() => {
    const { widthMm, heightMm, density, isHorizontal } = activeSize;
    const isBw = options.colorMode === 'bw';
    const textMult = options.textScale === 'xlarge' ? 1.2 : options.textScale === 'large' ? 1.1 : 1.0;
    const socialBoost = options.prominentSocials ? 1.1 : 1.0;

    const isTiny = density === 'tiny';
    const isSmall = density === 'small';
    const isCompact = density === 'compact';
    const isMedium = density === 'medium';
    const isSpacious = density === 'spacious';

    // Escala proporcional según el área de la etiqueta respecto al estándar de su categoría
    const areaRatio = Math.sqrt((widthMm * heightMm) / (isSpacious ? 15000 : isMedium ? 10000 : isCompact ? 7500 : isSmall ? 3750 : 1250));
    const baseScale = Math.min(Math.max(areaRatio, 0.78), 1.45);

    const px = (val) => Math.max(6.5, Math.round(val * baseScale * textMult * 10) / 10);
    const rawPx = (val) => Math.max(3, Math.round(val * baseScale));

    if (isTiny) {
      return {
        isBw, isTiny: true, isSmall: false, isCompact: false, isMedium: false, isSpacious: false, isHorizontal,
        outerPad: rawPx(4),
        cellPad: '2px 4px',
        frameBorder: isBw ? 1.5 : 1,
        gridBorder: 1,
        logoH: rawPx(13),
        brandTitle: px(9.5),
        brandSub: px(6.5),
        orderNum: px(8.5),
        microLabel: px(6),
        clientName: px(10),
        clientPhone: px(9),
        addressText: px(8),
        zonaText: px(7.5),
        prodName: px(8.5),
        prodQty: px(8.5),
        payAmount: px(10),
        nitText: px(7),
        notesText: px(7),
        qrSize: rawPx(26),
        webUrl: Math.round(px(8) * socialBoost),
        socialHandle: Math.round(px(7.5) * socialBoost),
        socialNet: px(6.5),
        barcodeH: rawPx(12),
        barcodeLabel: px(6.5)
      };
    }

    if (isSmall) {
      // ej: 75 x 50 mm o 50 x 75 mm
      return {
        isBw, isTiny: false, isSmall: true, isCompact: false, isMedium: false, isSpacious: false, isHorizontal,
        outerPad: rawPx(6),
        cellPad: '3px 6px',
        frameBorder: isBw ? 1.5 : 1.2,
        gridBorder: 1,
        logoH: rawPx(18),
        brandTitle: px(11),
        brandSub: px(7.5),
        orderNum: px(9.5),
        microLabel: px(6.5),
        clientName: px(12),
        clientPhone: px(10.5),
        addressText: px(9),
        zonaText: px(8.5),
        prodName: px(9.5),
        prodQty: px(10),
        payAmount: px(12.5),
        nitText: px(8),
        notesText: px(8),
        qrSize: rawPx(58),
        webUrl: Math.round(px(9) * socialBoost),
        socialHandle: Math.round(px(8.5) * socialBoost),
        socialNet: px(7.5),
        barcodeH: rawPx(15),
        barcodeLabel: px(7.5)
      };
    }

    if (isCompact) {
      // ej: 100 x 75 mm o 75 x 100 mm
      return {
        isBw, isTiny: false, isSmall: false, isCompact: true, isMedium: false, isSpacious: false, isHorizontal,
        outerPad: rawPx(8),
        cellPad: isHorizontal ? '4px 7px' : '5px 8px',
        frameBorder: isBw ? 2 : 1.5,
        gridBorder: isBw ? 1.2 : 1,
        logoH: rawPx(23),
        brandTitle: px(13),
        brandSub: px(8.5),
        orderNum: px(11),
        microLabel: px(7.5),
        clientName: px(14.5),
        clientPhone: px(12),
        addressText: px(10.5),
        zonaText: px(9.5),
        prodName: px(11),
        prodQty: px(11.5),
        payAmount: px(15),
        nitText: px(9),
        notesText: px(8.5),
        qrSize: rawPx(isHorizontal ? 80 : 92),
        webUrl: Math.round(px(10.5) * socialBoost),
        socialHandle: Math.round(px(10) * socialBoost),
        socialNet: px(8),
        barcodeH: rawPx(18),
        barcodeLabel: px(8)
      };
    }

    if (isMedium) {
      // ej: 100 x 100 mm
      return {
        isBw, isTiny: false, isSmall: false, isCompact: false, isMedium: true, isSpacious: false, isHorizontal,
        outerPad: rawPx(10),
        cellPad: '6px 9px',
        frameBorder: isBw ? 2 : 1.5,
        gridBorder: isBw ? 1.3 : 1,
        logoH: rawPx(28),
        brandTitle: px(15),
        brandSub: px(9.5),
        orderNum: px(12.5),
        microLabel: px(8),
        clientName: px(17),
        clientPhone: px(13.5),
        addressText: px(12),
        zonaText: px(10.5),
        prodName: px(12.5),
        prodQty: px(13),
        payAmount: px(18),
        nitText: px(10),
        notesText: px(9.5),
        qrSize: rawPx(104),
        webUrl: Math.round(px(11.5) * socialBoost),
        socialHandle: Math.round(px(11) * socialBoost),
        socialNet: px(9),
        barcodeH: rawPx(22),
        barcodeLabel: px(9)
      };
    }

    // 100 x 150 mm (Vertical) o 150 x 100 mm (Horizontal)
    return {
      isBw, isTiny: false, isSmall: false, isCompact: false, isMedium: false, isSpacious: true, isHorizontal,
      outerPad: rawPx(12),
      cellPad: isHorizontal ? '6px 10px' : '8px 11px',
      frameBorder: isBw ? 2.2 : 1.8,
      gridBorder: isBw ? 1.5 : 1.2,
      logoH: rawPx(isHorizontal ? 32 : 36),
      brandTitle: px(isHorizontal ? 16 : 18),
      brandSub: px(10.5),
      orderNum: px(isHorizontal ? 13.5 : 14.5),
      microLabel: px(8.5),
      clientName: px(isHorizontal ? 18.5 : 21),
      clientPhone: px(isHorizontal ? 14.5 : 16),
      addressText: px(isHorizontal ? 12.5 : 13.5),
      zonaText: px(12),
      prodName: px(isHorizontal ? 13 : 14.5),
      prodQty: px(isHorizontal ? 14 : 15),
      payAmount: px(isHorizontal ? 19.5 : 22),
      nitText: px(11),
      notesText: px(10.5),
      qrSize: rawPx(isHorizontal ? 82 : 120),
      webUrl: Math.round(px(isHorizontal ? 12.5 : 13.5) * socialBoost),
      socialHandle: Math.round(px(isHorizontal ? 10 : 13) * socialBoost),
      socialNet: px(10),
      barcodeH: rawPx(isHorizontal ? 24 : 30),
      barcodeLabel: px(10)
    };
  }, [activeSize, options.colorMode, options.textScale, options.prominentSocials]);

  // Redes activas con íconos SVG minimalistas
  const activeSocialPlatforms = useMemo(() => {
    const list = [];
    if (options.showTiktok) list.push({ id: 'tiktok', label: 'TikTok' });
    if (options.showInstagram) list.push({ id: 'ig', label: 'Instagram' });
    if (options.showFacebook) list.push({ id: 'fb', label: 'Facebook' });
    if (options.showWhatsapp && options.whatsappNumber) {
      list.push({ id: 'wa', label: options.whatsappNumber });
    }
    return list;
  }, [options.showTiktok, options.showInstagram, options.showFacebook, options.showWhatsapp, options.whatsappNumber]);

  const zonaVisual = extractOrCleanZona(form.zona, form.direccion, form.notas);
  const activeLogoSrc = options.colorMode === 'bw' ? croppedLogos.bw : croppedLogos.color;
  const barcodeCodeText = `OC-${String(form.numeroPedido || '0').padStart(4, '0')}`;

  // Evitar mostrar en "Observaciones" el mismo texto si es idéntico a la dirección
  const cleanNotasToDisplay = useMemo(() => {
    if (!options.showNotes || !form.notas) return '';
    const n = form.notas.trim();
    const d = (form.direccion || '').trim();
    if (!n || n.toLowerCase() === d.toLowerCase()) return '';
    return n;
  }, [options.showNotes, form.notas, form.direccion]);

  // ── GENERADOR DE HTML PARA IMPRESIÓN DIRECTA ──────────────────────────────
  const generatePrintableHtml = () => {
    const { widthMm, heightMm } = activeSize;
    const innerMarkup = stickerCardRef.current ? stickerCardRef.current.outerHTML : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sticker Pedido #${form.numeroPedido} (${widthMm}x${heightMm}mm) - OneControl</title>
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
      .print-page-wrapper {
        width: ${widthMm}mm !important;
        height: ${heightMm}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        overflow: hidden !important;
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
        padding: 10px 16px;
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
        padding: 72px 12px 30px 12px !important;
        background: #e2e8f0 !important;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        min-height: 100vh;
      }
      .print-page-wrapper {
        background: #ffffff;
        box-shadow: 0 12px 30px rgba(0,0,0,0.18);
        margin: 10px auto;
      }
    }
    html, body {
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
  </style>
</head>
<body>
  <div class="screen-toolbar">
    <div style="display:flex; align-items:center; gap:8px;">
      <div>
        <div style="font-weight: 900; font-size: 12px; line-height: 1.2;">Sticker Pedido #${form.numeroPedido}</div>
        <div style="font-size: 10px; color: #94a3b8;">${widthMm}x${heightMm}mm (${activeSize.isHorizontal ? 'Horizontal' : 'Vertical'}) · ${options.colorMode === 'bw' ? 'Blanco y Negro' : 'Color'}</div>
      </div>
    </div>
    <button class="screen-btn" onclick="window.print()">
      IMPRIMIR / PDF
    </button>
  </div>
  <div class="print-page-wrapper">
    ${innerMarkup}
  </div>
</body>
</html>`;
  };

  // ── IMPRESIÓN ESTÁNDAR / SISTEMA ──────────────────────────────────────────
  const executeSystemPrint = () => {
    const html = generatePrintableHtml();
    const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (typeof window !== 'undefined' && window.innerWidth < 768);

    if (isMobileDevice) {
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

  const handlePrint = () => {
    const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (typeof window !== 'undefined' && window.innerWidth < 768);
    if (isMobileDevice) {
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

  // ── INTEGRACIÓN MARKLIFE & EXPORTACIÓN DE IMAGEN PNG ──────────────────────
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
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      onclone: (_clonedDoc, clonedElement) => {
        let curr = clonedElement;
        while (curr && curr.style) {
          if (curr.classList && curr.classList.contains('hidden')) {
            curr.classList.remove('hidden');
            curr.style.display = 'flex';
          }
          if (curr.style.transform && curr !== clonedElement) {
            curr.style.transform = 'none';
            curr.style.marginBottom = '0px';
          }
          curr = curr.parentElement;
        }
      }
    });

    if (options.colorMode === 'bw') {
      const ctx = canvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const v = lum < 190 ? 0 : 255;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Error al convertir el sticker a imagen.'));
      }, 'image/png', 1.0);
    });
  };

  const handleSaveAndOpenMarklife = async () => {
    setIsExportingImage(true);
    setMarklifeStatus('saving');
    try {
      const blob = await generateStickerPngBlob();
      const fileName = `sticker-pedido-${form.numeroPedido || 'envio'}-${activeSize.widthMm}x${activeSize.heightMm}mm.png`;
      downloadBlob(blob, fileName);

      try {
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
        }
      } catch (clipErr) {
        // ignore
      }

      setMarklifeStatus('saved');

      setTimeout(() => {
        handleOpenMarklifeApp();
      }, 700);
    } catch (err) {
      console.error('Error preparando sticker para Marklife:', err);
      setMarklifeStatus('error');
      alert('Error preparando sticker: ' + err.message);
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleDownloadStickerImage = async () => {
    setIsExportingImage(true);
    try {
      const blob = await generateStickerPngBlob();
      const fileName = `sticker-pedido-${form.numeroPedido || 'envio'}-${activeSize.widthMm}x${activeSize.heightMm}mm.png`;
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
      window.location.href = 'intent:#Intent;package=com.feioou.deliprint.yxq;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.feioou.deliprint.yxq;end';
    } else if (isIOS) {
      window.open('https://apps.apple.com/app/marklife/id1535497463', '_blank');
    } else {
      window.open('https://play.google.com/store/apps/details?id=com.feioou.deliprint.yxq', '_blank');
    }
  };

  const QUICK_ZONAS = [
    'Zona 1', 'Zona 4', 'Zona 7', 'Zona 9', 'Zona 10',
    'Zona 11', 'Zona 12', 'Zona 13', 'Zona 14', 'Zona 15',
    'Zona 16', 'Mixco', 'Villa Nueva', 'Carretera al Salvador'
  ];

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

  const M = layoutMetrics;
  const isBw = M.isBw;
  const isHoriz = M.isHorizontal;
  // Factor para encoger la letra del producto si el nombre es largo (así cabe completo).
  const prodLen = String(form.producto || '').length;
  const prodFontScale = prodLen > 70 ? 0.66 : prodLen > 52 ? 0.76 : prodLen > 38 ? 0.87 : 1;
  const lineStyle = `${M.gridBorder}px solid #000000`;
  const frameStyle = `${M.frameBorder}px solid #000000`;
  const accentBg = isBw ? '#000000' : '#FF6B00';
  const labelColor = isBw ? '#000000' : '#475569';

  const microLabelCss = {
    fontSize: `${M.microLabel}px`,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.7px',
    color: labelColor,
    lineHeight: 1.05,
    marginBottom: '2px',
    display: 'block'
  };

  // Sub-bloque reutilizable: Cuadro Ordenado del Destinatario (Tabla Minimalista)
  const renderRecipientTable = (growVertically = false) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: growVertically ? '1 1 auto' : '0 0 auto',
        justifyContent: 'space-between',
        borderBottom: lineStyle
      }}
    >
      {/* FILA 1: CLIENTE (IZQUIERDA) | TELÉFONO (DERECHA) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: form.phone ? '1.35fr 0.85fr' : '1fr',
          borderBottom: lineStyle
        }}
      >
        <div style={{ padding: M.cellPad, borderRight: form.phone ? lineStyle : 'none', minWidth: 0 }}>
          <span style={microLabelCss}>DESTINATARIO / CLIENTE</span>
          <div
            style={{
              fontSize: `${M.clientName}px`,
              fontWeight: 900,
              textTransform: 'uppercase',
              color: '#000000',
              lineHeight: 1.12,
              wordBreak: 'break-word'
            }}
          >
            {form.cliente || 'CLIENTE FINAL'}
          </div>
        </div>

        {form.phone && (
          <div style={{ padding: M.cellPad, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={microLabelCss}>TELÉFONO</span>
            <div
              style={{
                fontSize: `${M.clientPhone}px`,
                fontWeight: 900,
                color: '#000000',
                lineHeight: 1.12,
                letterSpacing: '0.2px',
                wordBreak: 'break-all'
              }}
            >
              {form.phone}
            </div>
          </div>
        )}
      </div>

      {/* FILA 2: DIRECCIÓN DE ENTREGA (BIEN ORDENADA EN SU PROPIA CASILLA) */}
      <div
        style={{
          padding: M.cellPad,
          flex: growVertically ? '1 1 auto' : '0 0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          borderBottom: (zonaVisual || form.municipio) && !M.isTiny ? lineStyle : 'none'
        }}
      >
        <span style={microLabelCss}>DIRECCIÓN EXACTA DE ENTREGA</span>
        <div
          style={{
            fontSize: `${M.addressText}px`,
            fontWeight: 800,
            color: '#000000',
            lineHeight: 1.25,
            wordBreak: 'break-word'
          }}
        >
          {form.direccion || 'Dirección pendiente de confirmar'}
        </div>
      </div>

      {/* FILA 3: ZONA / SECTOR | MUNICIPIO / DEPARTAMENTO */}
      {(zonaVisual || form.municipio) && !M.isTiny && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: zonaVisual && form.municipio ? '1fr 1fr' : '1fr'
          }}
        >
          {zonaVisual && (
            <div
              style={{
                padding: M.cellPad,
                borderRight: form.municipio ? lineStyle : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px'
              }}
            >
              <div>
                <span style={microLabelCss}>ZONA / SECTOR</span>
                <span
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    fontSize: `${M.zonaText}px`,
                    fontWeight: 900,
                    padding: '1.5px 7px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    lineHeight: 1.15
                  }}
                >
                  {zonaVisual}
                </span>
              </div>
            </div>
          )}

          {form.municipio && (
            <div style={{ padding: M.cellPad, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={microLabelCss}>MUNICIPIO / DEPTO.</span>
              <div
                style={{
                  fontSize: `${M.zonaText}px`,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  color: '#000000',
                  lineHeight: 1.15
                }}
              >
                {form.municipio}{form.departamento && form.departamento !== form.municipio ? `, ${form.departamento}` : ''}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Sub-bloque reutilizable: Producto + Cantidad
  const renderProductRow = (withBottomBorder = true) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        borderBottom: withBottomBorder ? lineStyle : 'none'
      }}
    >
      <div style={{ padding: M.cellPad, borderRight: lineStyle, minWidth: 0 }}>
        <span style={microLabelCss}>PRODUCTO / DESCRIPCIÓN</span>
        <div
          style={{
            // Encoger la letra cuando el nombre es largo, para que SIEMPRE quepa
            // completo en máx. 2-3 líneas sin desbordar la etiqueta (alto fijo).
            fontSize: `${Math.round(M.prodName * prodFontScale * 10) / 10}px`,
            fontWeight: 900,
            color: '#000000',
            lineHeight: 1.15,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: M.isTiny ? 1 : 2,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word'
          }}
        >
          {form.producto || 'Producto de catálogo'}
        </div>
      </div>

      <div
        style={{
          padding: M.cellPad,
          minWidth: M.isTiny ? '38px' : '58px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <span style={microLabelCss}>CANT.</span>
        <div
          style={{
            fontSize: `${M.prodQty}px`,
            fontWeight: 900,
            color: '#000000',
            lineHeight: 1.1
          }}
        >
          {form.cantidad || '1'}
        </div>
      </div>
    </div>
  );

  // Sub-bloque reutilizable: Cobro + NIT + Notas
  const renderPaymentBlock = (withBottomBorder = true) => {
    if (!options.showPrice) return null;
    return (
      <div style={{ borderBottom: withBottomBorder ? lineStyle : 'none', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: options.showNit && form.nit ? '1fr auto' : '1fr'
          }}
        >
          <div style={{ padding: M.cellPad, borderRight: options.showNit && form.nit ? lineStyle : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
              <div>
                <span style={microLabelCss}>CONDICIÓN DE PAGO</span>
                <span
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    fontSize: `${M.microLabel + 1}px`,
                    fontWeight: 900,
                    padding: '1.5px 6px',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    lineHeight: 1.15
                  }}
                >
                  {form.esContraEntrega ? 'COBRO CONTRA ENTREGA' : 'PAGADO · NO COBRAR'}
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={microLabelCss}>TOTAL A COBRAR</span>
                <div
                  style={{
                    fontSize: `${M.payAmount}px`,
                    fontWeight: 900,
                    color: '#000000',
                    lineHeight: 1.05
                  }}
                >
                  {form.esContraEntrega ? (form.precio || 'POR CONFIRMAR') : 'Q0.00'}
                </div>
              </div>
            </div>
          </div>

          {options.showNit && form.nit && (
            <div
              style={{
                padding: M.cellPad,
                minWidth: '58px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center'
              }}
            >
              <span style={microLabelCss}>NIT</span>
              <div style={{ fontSize: `${M.nitText}px`, fontWeight: 900, color: '#000000', lineHeight: 1.1 }}>
                {form.nit}
              </div>
            </div>
          )}
        </div>

        {cleanNotasToDisplay && !M.isTiny && (
          <div style={{ padding: M.cellPad, borderTop: `1px dashed #000000` }}>
            <span style={microLabelCss}>OBSERVACIONES DE ENTREGA</span>
            <div style={{ fontSize: `${M.notesText}px`, fontWeight: 800, color: '#000000', lineHeight: 1.2 }}>
              {cleanNotasToDisplay}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Sub-bloque reutilizable: Página Web, Redes Sociales y QR Minimalista
  const renderSocialAndWebBlock = (withBottomBorder = true) => {
    if (!options.showSocialQr && !options.showWebsite && !options.showSocials) return null;
    if (M.isTiny) {
      return (
        <div
          style={{
            padding: '2px 4px',
            borderBottom: withBottomBorder ? lineStyle : 'none',
            backgroundColor: '#000000',
            color: '#ffffff',
            fontSize: `${M.webUrl}px`,
            fontWeight: 900,
            textAlign: 'center',
            letterSpacing: '0.3px',
            lineHeight: 1.1
          }}
        >
          {(options.websiteUrl || 'onecontrol.shop').toUpperCase()} · {options.socialHandle || '@onecontrol.shop'}
        </div>
      );
    }

    const hasQr = options.showSocialQr && qrSvg;
    const hasSocials = options.showSocials;

    return (
      <div
        style={{
          borderBottom: withBottomBorder ? lineStyle : 'none',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* PÁGINA WEB: BARRA DE ANCHO COMPLETO ARRIBA (siempre cabe, nunca se desborda) */}
        {options.showWebsite && options.websiteUrl && (
          <div
            style={{
              backgroundColor: '#000000',
              color: '#ffffff',
              padding: M.isSpacious ? '3px 8px' : '2px 6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              overflow: 'hidden',
              minWidth: 0,
              borderBottom: (hasQr || hasSocials) ? lineStyle : 'none'
            }}
          >
            <SocialIconSvg type="web" size={Math.max(9, M.webUrl - 2)} color="#ffffff" />
            <span
              style={{
                fontSize: `${M.webUrl}px`,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0
              }}
            >
              {options.websiteUrl}
            </span>
          </div>
        )}

        {/* ABAJO: QR (izq) + HANDLE y REDES SOLO-ÍCONOS (der) */}
        {(hasQr || hasSocials) && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: hasQr && hasSocials ? 'auto 1fr' : '1fr',
              alignItems: 'stretch'
            }}
          >
            {hasQr && (
              <div
                style={{
                  padding: M.cellPad,
                  borderRight: hasSocials ? lineStyle : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div
                  aria-label="QR OneControl"
                  style={{
                    width: `${M.qrSize}px`,
                    height: `${M.qrSize}px`,
                    display: 'block',
                    backgroundColor: '#ffffff'
                  }}
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              </div>
            )}

            {hasSocials && (
              <div
                style={{
                  padding: M.cellPad,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: M.isSpacious ? '5px' : '4px',
                  minWidth: 0,
                  maxWidth: '100%'
                }}
              >
                <div
                  style={{
                    fontSize: `${M.socialHandle}px`,
                    fontWeight: 900,
                    color: '#000000',
                    letterSpacing: '0.2px',
                    lineHeight: 1.1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%'
                  }}
                >
                  {options.socialHandle || '@onecontrol.shop'}
                </div>

                {activeSocialPlatforms.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'nowrap',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: M.isSpacious ? '12px' : '9px'
                    }}
                  >
                    {activeSocialPlatforms.map(net => (
                      <SocialIconSvg
                        key={net.id}
                        type={net.id}
                        size={Math.max(13, Math.round(M.socialNet + 5))}
                        color="#000000"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

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
                <span className="hidden md:inline-block text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-white font-black">
                  {activeSize.widthMm}x{activeSize.heightMm}mm · {isHoriz ? 'Horizontal' : 'Vertical'} · {isBw ? 'B/N' : 'Color'}
                </span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">
                Diseño minimalista estructurado con orientación Vertical/Horizontal y modo Blanco y Negro.
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

        {/* SELECTOR DE PESTAÑAS PARA MÓVIL */}
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
            <span>Ver Sticker</span>
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
            <span>Opciones, Orientación & Datos</span>
          </button>
        </div>

        {/* BODY (2 COLUMNAS: CONFIGURACIÓN Y VISTA PREVIA) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          
          {/* COLUMNA IZQUIERDA: CONFIGURACIÓN Y DATOS */}
          <div className={`lg:col-span-6 xl:col-span-5 p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[82vh] ${
            mobileTab === 'preview' ? 'hidden lg:block' : 'block'
          }`}>
            
            {/* 1. MODO BLANCO Y NEGRO, ORIENTACIÓN VERTICAL/HORIZONTAL Y ESCALA */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3.5 shadow-md">
              {/* Blanco y Negro vs Color */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 text-orange-400">
                    <Contrast size={13} />
                    Modo de Color:
                  </span>
                  <span className="text-[10px] font-bold text-slate-300">
                    {isBw ? 'Blanco y Negro Puro' : 'Con Color'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateOptions({ colorMode: 'bw' })}
                    className={`py-2 px-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      isBw
                        ? 'bg-white text-black border-white font-black ring-2 ring-[#FF6B00]'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <span className="w-5 h-5 rounded bg-black text-white text-[9px] font-black flex items-center justify-center shrink-0">
                      B/N
                    </span>
                    <span className="text-xs font-black">Blanco y Negro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateOptions({ colorMode: 'color' })}
                    className={`py-2 px-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      !isBw
                        ? 'bg-[#FF6B00] text-white border-[#FF6B00] font-black ring-2 ring-white'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <span className="w-5 h-5 rounded bg-gradient-to-br from-orange-400 to-emerald-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                      C
                    </span>
                    <span className="text-xs font-black">A Color</span>
                  </button>
                </div>
              </div>

              {/* Orientación: Vertical vs Horizontal */}
              <div className="pt-2.5 border-t border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 text-orange-400">
                    <LayoutGrid size={13} />
                    Orientación del Sticker:
                  </span>
                  <span className="text-[10px] font-bold text-slate-300">
                    {activeSize.widthMm} x {activeSize.heightMm} mm
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleOrientationChange('vertical')}
                    className={`py-2 px-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      !isHoriz
                        ? 'bg-white text-black border-white font-black ring-2 ring-[#FF6B00]'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <ArrowUpDown size={15} className={!isHoriz ? 'text-[#FF6B00]' : 'text-slate-400'} />
                    <div>
                      <div className="text-xs font-black leading-tight">Vertical</div>
                      <div className={`text-[9.5px] font-bold ${!isHoriz ? 'text-slate-600' : 'text-slate-400'}`}>
                        Formato alto
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOrientationChange('horizontal')}
                    className={`py-2 px-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      isHoriz
                        ? 'bg-white text-black border-white font-black ring-2 ring-[#FF6B00]'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <ArrowLeftRight size={15} className={isHoriz ? 'text-[#FF6B00]' : 'text-slate-400'} />
                    <div>
                      <div className="text-xs font-black leading-tight">Horizontal</div>
                      <div className={`text-[9.5px] font-bold ${isHoriz ? 'text-slate-600' : 'text-slate-400'}`}>
                        Formato ancho
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Tamaño de Letra */}
              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1">
                  <Type size={13} className="text-orange-400" />
                  Tamaño de Texto:
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'normal', label: 'Estándar' },
                    { id: 'large', label: 'Grande' },
                    { id: 'xlarge', label: 'Extra Grande' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => updateOptions({ textScale: t.id })}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black transition-all cursor-pointer ${
                        options.textScale === t.id
                          ? 'bg-[#FF6B00] text-white shadow-xs'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. SELECTOR DE MEDIDA DE STICKER */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sliders size={13} className="text-[#FF6B00]" />
                  Medida del Sticker / Rollo:
                </label>
                <span className="text-[10.5px] font-black text-[#FF6B00] bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
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
                          ? 'border-[#FF6B00] bg-orange-50/70 shadow-xs ring-1 ring-[#FF6B00]'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="text-[11.5px] font-black text-slate-900 leading-snug">{s.name}</div>
                      <div className={`text-[10px] font-bold mt-1 ${isSelected ? 'text-[#FF6B00]' : 'text-slate-400'}`}>
                        {s.badge}
                      </div>
                    </button>
                  );
                })}
              </div>

              {sizeId === 'custom' && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Ancho (mm):</label>
                      <input
                        type="number"
                        value={customW}
                        onChange={e => handleCustomWChange(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900"
                        min="25"
                        max="250"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Alto (mm):</label>
                      <input
                        type="number"
                        value={customH}
                        onChange={e => handleCustomHChange(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900"
                        min="20"
                        max="300"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. DATOS DEL DESTINATARIO (ORDENADOS POR CAMPO) */}
            <div className="space-y-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <User size={13} className="text-[#FF6B00]" />
                  Datos del Cliente & Dirección
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
                    Nombre del Cliente:
                  </label>
                  <input
                    type="text"
                    value={form.cliente}
                    onChange={e => setForm(prev => ({ ...prev, cliente: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#FF6B00]"
                    placeholder="Nombre completo"
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
                  placeholder="Calle, avenida, número de casa, colonia, referencia..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Zona / Sector:
                  </label>
                  <input
                    type="text"
                    value={form.zona}
                    onChange={e => setForm(prev => ({ ...prev, zona: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:border-[#FF6B00]"
                    placeholder="Ej: Zona 14"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Municipio / Departamento:
                  </label>
                  <input
                    type="text"
                    value={form.municipio}
                    onChange={e => setForm(prev => ({ ...prev, municipio: e.target.value, departamento: '' }))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#FF6B00]"
                    placeholder="Ej: Guatemala, Mixco..."
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
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

            {/* 4. REDES SOCIALES, PÁGINA WEB & QR */}
            <div className="space-y-3 p-4 bg-orange-50/50 rounded-2xl border border-orange-200/90">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Globe size={14} className="text-[#FF6B00]" />
                  Página Web, Redes Sociales & QR
                </span>
                <label className="flex items-center gap-1.5 text-[10.5px] font-black text-[#FF6B00] bg-white px-2 py-0.5 rounded-lg border border-orange-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.prominentSocials}
                    onChange={e => updateOptions({ prominentSocials: e.target.checked })}
                    className="accent-[#FF6B00] rounded cursor-pointer"
                  />
                  <span>Destacar Tamaño</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.showWebsite}
                      onChange={e => updateOptions({ showWebsite: e.target.checked })}
                      className="accent-[#FF6B00] rounded cursor-pointer"
                    />
                    <span>Página Web</span>
                  </label>
                  {options.showWebsite && (
                    <input
                      type="text"
                      value={options.websiteUrl}
                      onChange={e => updateOptions({ websiteUrl: e.target.value })}
                      className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-900"
                      placeholder="www.onecontrol.shop"
                    />
                  )}
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.showSocials}
                      onChange={e => updateOptions({ showSocials: e.target.checked })}
                      className="accent-[#FF6B00] rounded cursor-pointer"
                    />
                    <span>Usuario de Redes</span>
                  </label>
                  {options.showSocials && (
                    <input
                      type="text"
                      value={options.socialHandle}
                      onChange={e => updateOptions({ socialHandle: e.target.value })}
                      className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-900"
                      placeholder="@onecontrol.shop"
                    />
                  )}
                </div>
              </div>

              {options.showSocials && (
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'showTiktok', label: 'TikTok' },
                    { key: 'showInstagram', label: 'Instagram' },
                    { key: 'showFacebook', label: 'Facebook' },
                    { key: 'showWhatsapp', label: 'WhatsApp' }
                  ].map(net => (
                    <button
                      key={net.key}
                      type="button"
                      onClick={() => updateOptions({ [net.key]: !options[net.key] })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all cursor-pointer ${
                        options[net.key]
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-400 border-slate-200'
                      }`}
                    >
                      {options[net.key] ? '✓ ' : ''}{net.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.showSocialQr}
                    onChange={e => updateOptions({ showSocialQr: e.target.checked })}
                    className="accent-[#FF6B00] rounded cursor-pointer"
                  />
                  <span>Mostrar Código QR</span>
                </label>
                {options.showSocialQr && (
                  <select
                    value={options.socialQrTarget}
                    onChange={e => updateOptions({ socialQrTarget: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    {QR_TARGETS.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* 5. PRODUCTO Y COBRO */}
            <div className="space-y-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Package size={13} className="text-[#FF6B00]" />
                Producto, Cobro & Observaciones
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Producto:
                  </label>
                  <input
                    type="text"
                    value={form.producto}
                    onChange={e => setForm(prev => ({ ...prev, producto: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
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
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
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
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-emerald-700"
                    placeholder="Ej: Q250.00"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    NIT:
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={form.nit}
                      onChange={e => setForm(prev => ({ ...prev, nit: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
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

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="radio"
                    name="tipoCobro"
                    checked={form.esContraEntrega}
                    onChange={() => setForm(prev => ({ ...prev, esContraEntrega: true, pagado: false }))}
                    className="accent-[#FF6B00] cursor-pointer"
                  />
                  <span>Cobrar Contra Entrega</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="radio"
                    name="tipoCobro"
                    checked={!form.esContraEntrega}
                    onChange={() => setForm(prev => ({ ...prev, esContraEntrega: false, pagado: true }))}
                    className="accent-emerald-600 cursor-pointer"
                  />
                  <span>Pagado (No cobrar)</span>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-200/60">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <FileText size={12} className="text-[#FF6B00]" />
                    Observaciones adicionales al repartidor:
                  </label>
                  {form.notas && (
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, notas: '' }))}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 size={11} /> Limpiar
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={form.notas}
                  onChange={e => setForm(prev => ({ ...prev, notas: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                  placeholder="Instrucciones extra (ej. entregar en garita, llamar antes)..."
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {QUICK_NOTES.map(note => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => appendNote(note)}
                      className="text-[9.5px] font-medium px-2 py-0.5 bg-white hover:bg-orange-50 text-slate-600 border border-slate-200 rounded-lg cursor-pointer"
                    >
                      + {note}
                    </button>
                  ))}
                </div>
              </div>
            </div>

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
                    <span>¡Guardado!</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Guardar en Lead & Pedido</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <ExternalLink size={13} />
                <span>Pestaña nueva / PDF</span>
              </button>
            </div>
          </div>

          {/* COLUMNA DERECHA: VISTA PREVIA MINIMALISTA CON CONTROLES RÁPIDOS */}
          <div className={`lg:col-span-6 xl:col-span-7 p-3 sm:p-5 bg-slate-100 flex flex-col justify-between items-center overflow-y-auto max-h-[82vh] ${
            mobileTab === 'edit' ? 'hidden lg:flex' : 'flex'
          }`}>
            
            {/* BARRA RÁPIDA DE CONTROLES (B/N, VERTICAL/HORIZONTAL, MEDIDA, ZOOM) */}
            <div className="w-full space-y-2 mb-3 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-1.5 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
                {/* Blanco y Negro vs Color */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => updateOptions({ colorMode: 'bw' })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                      isBw ? 'bg-black text-white shadow-xs' : 'text-slate-600 hover:text-black'
                    }`}
                  >
                    B/N
                  </button>
                  <button
                    type="button"
                    onClick={() => updateOptions({ colorMode: 'color' })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                      !isBw ? 'bg-[#FF6B00] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Color
                  </button>
                </div>

                {/* Vertical vs Horizontal */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleOrientationChange('vertical')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                      !isHoriz ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowUpDown size={12} />
                    <span>Vertical</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOrientationChange('horizontal')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                      isHoriz ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowLeftRight size={12} />
                    <span>Horizontal</span>
                  </button>
                </div>

                {/* Tamaños rápidos */}
                <div className="flex items-center gap-1">
                  {[
                    { id: '10x15', label: '100x150' },
                    { id: '10x10', label: '100x100' },
                    { id: '10x7.5', label: '100x75' }
                  ].map(sz => (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => handleSizeChange(sz.id)}
                      className={`px-2 py-1 rounded-lg text-[10.5px] font-black border transition-all cursor-pointer ${
                        sizeId === sz.id
                          ? 'bg-orange-50 text-[#FF6B00] border-[#FF6B00]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>

                {/* Zoom */}
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                    className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span className="text-[10px] font-black text-slate-700 w-8 text-center">
                    {Math.round(effectiveScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
                    className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* CONTENEDOR VISUAL DEL STICKER */}
            <div
              className="flex-1 flex flex-col items-center justify-start p-1 sm:p-2 w-full overflow-x-auto"
              style={{
                minHeight: `${Math.round((stickerHeightPx * effectiveScale) + 18)}px`
              }}
            >
              <div
                style={{
                  width: `${stickerWidthPx}px`,
                  height: `${stickerHeightPx}px`,
                  transform: `scale(${effectiveScale})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out',
                  marginBottom: effectiveScale < 1 ? `-${Math.round(stickerHeightPx * (1 - effectiveScale))}px` : '0px'
                }}
                className="bg-white text-black shadow-2xl overflow-hidden shrink-0 select-none"
              >
                {/* TARJETA REAL DEL STICKER: GRILLA SUIZA MINIMALISTA */}
                <div
                  ref={stickerCardRef}
                  style={{
                    width: `${stickerWidthPx}px`,
                    height: `${stickerHeightPx}px`,
                    maxWidth: `${stickerWidthPx}px`,
                    maxHeight: `${stickerHeightPx}px`,
                    padding: `${M.outerPad}px`,
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                  }}
                >
                  {/* MARCO INTERIOR ESTRUCTURADO MINIMALISTA */}
                  <div
                    style={{
                      border: frameStyle,
                      flex: '1 1 auto',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      overflow: 'hidden'
                    }}
                  >
                    {/* 1. ENCABEZADO MINIMALISTA */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: M.cellPad,
                        borderBottom: frameStyle,
                        flexShrink: 0
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        {options.showLogo && (
                          <img
                            src={activeLogoSrc}
                            alt="OneControl"
                            style={{
                              height: `${M.logoH}px`,
                              width: 'auto',
                              maxWidth: `${Math.round(stickerWidthPx * 0.34)}px`,
                              objectFit: 'contain',
                              display: 'block',
                              flexShrink: 0
                            }}
                          />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: `${M.brandTitle}px`,
                              fontWeight: 900,
                              letterSpacing: '0.4px',
                              textTransform: 'uppercase',
                              lineHeight: 1,
                              color: '#000000'
                            }}
                          >
                            ONECONTROL
                          </div>
                          {options.showSender && !M.isTiny && (
                            <div
                              style={{
                                fontSize: `${M.brandSub}px`,
                                fontWeight: 700,
                                color: '#000000',
                                marginTop: '2px',
                                letterSpacing: '0.2px',
                                lineHeight: 1.1
                              }}
                            >
                              PBX / WA: {options.whatsappNumber || '5965-8803'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div
                          style={{
                            backgroundColor: accentBg,
                            color: '#ffffff',
                            fontSize: `${M.orderNum}px`,
                            fontWeight: 900,
                            padding: M.isTiny ? '1px 5px' : '2px 8px',
                            letterSpacing: '0.5px',
                            lineHeight: 1.15,
                            display: 'inline-block'
                          }}
                        >
                          PEDIDO #{form.numeroPedido}
                        </div>
                        {form.fechaEntrega && !M.isTiny && (
                          <div
                            style={{
                              fontSize: `${M.brandSub}px`,
                              fontWeight: 800,
                              color: '#000000',
                              marginTop: '2px',
                              textTransform: 'uppercase',
                              lineHeight: 1.1
                            }}
                          >
                            ENTREGA: {form.fechaEntrega}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. CUERPO CENTRAL ADAPTADO A ORIENTACIÓN (VERTICAL vs HORIZONTAL) */}
                    {isHoriz && !M.isTiny ? (
                      /* ── DISTRIBUCIÓN HORIZONTAL (2 COLUMNAS ESTRUCTURADAS) ── */
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.25fr 0.95fr',
                          flex: '1 1 auto',
                          minHeight: 0,
                          borderBottom: options.showBarcode ? lineStyle : 'none'
                        }}
                      >
                        {/* Columna Izquierda: Datos del Cliente + Producto */}
                        <div
                          style={{
                            borderRight: lineStyle,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minWidth: 0
                          }}
                        >
                          {renderRecipientTable(true)}
                          {renderProductRow(false)}
                        </div>

                        {/* Columna Derecha: Cobro + Web / Redes / QR */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minWidth: 0
                          }}
                        >
                          {renderPaymentBlock(true)}
                          <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            {renderSocialAndWebBlock(false)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ── DISTRIBUCIÓN VERTICAL (FILAS LIMPIAS DE ANCHO COMPLETO) ── */
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          flex: '1 1 auto',
                          justifyContent: 'space-between',
                          minHeight: 0
                        }}
                      >
                        {renderRecipientTable(true)}
                        {renderProductRow(true)}
                        {renderPaymentBlock(true)}
                        {renderSocialAndWebBlock(options.showBarcode)}
                      </div>
                    )}

                    {/* 3. PIE DE CÓDIGO DE BARRAS MINIMALISTA */}
                    {options.showBarcode && (
                      <div
                        style={{
                          padding: M.isTiny ? '2px 4px' : '4px 10px',
                          textAlign: 'center',
                          backgroundColor: '#ffffff',
                          flexShrink: 0
                        }}
                      >
                        <div
                          dangerouslySetInnerHTML={{
                            __html: generateBarcodeSvg(barcodeCodeText, M.barcodeH)
                          }}
                        />
                        <div
                          style={{
                            fontSize: `${M.barcodeLabel}px`,
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            letterSpacing: '2.5px',
                            color: '#000000',
                            marginTop: '2px',
                            lineHeight: 1
                          }}
                        >
                          {barcodeCodeText}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* BOTÓN INFERIOR DE IMPRESIÓN (DESKTOP) */}
            <div className="w-full hidden sm:flex items-center justify-between pt-4 border-t border-slate-200 shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Formato {isHoriz ? 'Horizontal' : 'Vertical'} ({activeSize.widthMm}x{activeSize.heightMm}mm) · {isBw ? 'Blanco y Negro' : 'Color'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMarklifeModal(true)}
                  className="px-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-[#FF6B00] border border-orange-200 text-xs font-black rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-2xs"
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

        {/* BARRA DE ACCIÓN FIJA EN MÓVIL */}
        <div className="lg:hidden p-2 sm:p-2.5 bg-white border-t border-slate-200 flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab(t => t === 'preview' ? 'edit' : 'preview')}
            className="py-2.5 px-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 flex items-center justify-center gap-1 shrink-0 cursor-pointer"
          >
            {mobileTab === 'preview' ? (
              <>
                <Sliders size={13} />
                <span>Opciones</span>
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
              <h3 className="text-sm font-black text-slate-900">¿Cómo deseas imprimir?</h3>
              <button
                onClick={() => setShowPrintChoiceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowPrintChoiceModal(false);
                  setShowMarklifeModal(true);
                }}
                className="w-full p-3.5 rounded-2xl bg-orange-50 hover:bg-orange-100/90 border-2 border-[#FF6B00] text-left transition-all cursor-pointer flex items-center gap-3 shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center font-black shrink-0">
                  <Smartphone size={20} />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-black text-orange-950 flex items-center justify-between">
                    <span>App Marklife (Bluetooth)</span>
                    <span className="text-[9px] bg-[#FF6B00] text-white px-1.5 py-0.5 rounded-md font-black">Recomendado</span>
                  </div>
                  <div className="text-[11px] text-orange-900/80 font-medium mt-0.5 leading-snug">
                    Guarda la etiqueta en tu galería y abre Marklife.
                  </div>
                </div>
              </button>

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
                  <div className="text-xs font-black text-slate-900">Impresora del Teléfono / PDF</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                    Impresoras Wi-Fi, AirPrint de red o guardar archivo en PDF.
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: IMPRIMIR CON APLICACIÓN MARKLIFE ────────────────────────── */}
      {showMarklifeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-60 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-[#FF6B00] flex items-center justify-center font-black">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Imprimir con App Marklife</h3>
                  <p className="text-[11px] text-slate-500">
                    {activeSize.widthMm}x{activeSize.heightMm}mm ({isHoriz ? 'Horizontal' : 'Vertical'}) · {isBw ? 'Blanco y Negro' : 'Color'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMarklifeModal(false);
                  setMarklifeStatus('');
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {marklifeStatus === 'saved' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span className="font-bold">¡Sticker guardado en alta resolución! Abriendo Marklife...</span>
              </div>
            )}

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleSaveAndOpenMarklife}
                disabled={isExportingImage}
                className="w-full py-3.5 px-4 bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              >
                {isExportingImage ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Guardando y abriendo Marklife...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>1. Guardar Sticker y Abrir Marklife</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadStickerImage}
                  disabled={isExportingImage}
                  className="py-2.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download size={13} />
                  <span>Solo Descargar PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenMarklifeApp}
                  className="py-2.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <ExternalLink size={13} />
                  <span>Abrir Marklife</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
