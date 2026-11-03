import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, Printer, Save, Check, RefreshCw, ZoomIn, ZoomOut,
  Tag, Truck, MapPin, Phone, User, Package,
  DollarSign, FileText, Calendar, ExternalLink, Sliders,
  CheckCircle2, Trash2, QrCode, Globe, Share2, MessageCircle,
  HelpCircle, AlertTriangle, Eye, Smartphone, Download, Contrast, Type
} from 'lucide-react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { ONE_CONTROL_LOGO_BASE64 } from '../assets/logoBase64.js';

// ── TAMAÑOS PREESTABLECIDOS DE STICKERS ─────────────────────────────────────
export const STICKER_SIZES = [
  {
    id: '10x15',
    name: '100 x 150 mm (10 x 15 cm)',
    badge: 'Guía Grande 4"x6" ⭐',
    description: 'Estándar grande para paquetería e impresoras térmicas (100x150 mm).',
    widthMm: 100,
    heightMm: 150,
    aspect: '100 / 150',
    density: 'spacious'
  },
  {
    id: '10x10',
    name: '100 x 100 mm (10 x 10 cm)',
    badge: 'Cuadrado Grande 4"x4"',
    description: 'Ideal para cajas medianas y cajas de motores.',
    widthMm: 100,
    heightMm: 100,
    aspect: '100 / 100',
    density: 'medium'
  },
  {
    id: '10x7.5',
    name: '100 x 75 mm (10 x 7.5 cm)',
    badge: 'Mediano Estándar 4"x3"',
    description: 'Tamaño versátil y balanceado para despachos y cajas.',
    widthMm: 100,
    heightMm: 75,
    aspect: '100 / 75',
    density: 'compact'
  },
  {
    id: '7.5x5',
    name: '75 x 50 mm (7.5 x 5 cm)',
    badge: 'Caja Compacta 3"x2"',
    description: 'Sticker compacto para paquetes pequeños o accesorios.',
    widthMm: 75,
    heightMm: 50,
    aspect: '75 / 50',
    density: 'small'
  },
  {
    id: '5x2.5',
    name: '50 x 25 mm (5 x 2.5 cm)',
    badge: 'Mini / Controles 2"x1"',
    description: 'Mini etiqueta para pegar directo en cajas de controles remotos.',
    widthMm: 50,
    heightMm: 25,
    aspect: '50 / 25',
    density: 'tiny'
  },
  {
    id: 'custom',
    name: 'Personalizado (mm)',
    badge: 'Medida Libre',
    description: 'Especifica ancho y alto exactos en milímetros (ej. 100 x 150).',
    widthMm: 100,
    heightMm: 150,
    aspect: '100 / 150',
    density: 'spacious'
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

function generateBarcodeSvg(text, height = 26) {
  const clean = '*' + String(text || 'OC-PEDIDO').toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '') + '*';
  let narrow = 1.8;
  let wide = 4.5;
  let gap = 1.8;

  let rects = [];
  let currentX = 6;

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

  const totalWidth = currentX + 6;
  return `<svg viewBox="0 0 ${totalWidth} ${height}" preserveAspectRatio="none" style="width: 100%; height: ${height}px; display: block;">${rects.join('')}</svg>`;
}

// ── LIMPIEZA INTELIGENTE DE ZONAS (EVITA "N/A" Y EXTRAE DE DIRECCIÓN) ───────
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
  const mTown = combined.match(/\b(mixco|villa nueva|san crist[oó]bal|santa catarina|carretera al? salvador|san miguel petapa|amatitl[aá]n)\b/i);
  if (mTown) {
    return mTown[1];
  }
  return '';
}

// Destinos predefinidos para el QR de Redes Sociales y Web
const QR_TARGETS = [
  { id: 'web', label: 'Página Web & Redes (onecontrol.shop)', url: 'https://onecontrol.shop' },
  { id: 'whatsapp', label: 'WhatsApp Directo (+502 5965-8803)', url: 'https://wa.me/50259658803' },
  { id: 'catalogo', label: 'Catálogo de Productos (onecontrol.shop/tienda)', url: 'https://onecontrol.shop/tienda/' },
  { id: 'custom', label: 'Enlace Personalizado', url: '' }
];

const DEFAULT_OPTIONS = {
  colorMode: 'bw',          // 'bw' (Blanco y Negro térmico alto contraste) | 'color'
  textScale: 'large',       // 'normal' | 'large' | 'xlarge'
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

  // Tamaño guardado o default ('10x15' = 100x150mm o el último usado)
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

  // Opciones de visualización, Blanco y Negro, Web y Redes Sociales (persistentes)
  const [options, setOptions] = useState(() => {
    try {
      const saved = localStorage.getItem('onecontrol_sticker_options_v2');
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
        localStorage.setItem('onecontrol_sticker_options_v2', JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  const [qrBase64, setQrBase64] = useState('');
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
  // (El logo original tiene partes naranjas que en impresoras B/N salían grises o muy tenues, y márgenes amplios)
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

        // 1. Detectar caja delimitadora (bounding box) real del logo sin el margen blanco gigante
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
          const pad = 10;
          minX = Math.max(0, minX - pad);
          minY = Math.max(0, minY - pad);
          maxX = Math.min(w - 1, maxX + pad);
          maxY = Math.min(h - 1, maxY + pad);
        }

        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;

        // 2. Canvas a Color Recortado
        const colorCanvas = document.createElement('canvas');
        colorCanvas.width = cropW;
        colorCanvas.height = cropH;
        const colorCtx = colorCanvas.getContext('2d');
        colorCtx.fillStyle = '#FFFFFF';
        colorCtx.fillRect(0, 0, cropW, cropH);
        colorCtx.drawImage(tempCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
        const colorDataUrl = colorCanvas.toDataURL('image/png');

        // 3. Canvas Blanco y Negro de Alto Contraste (convierte el naranja y gris a negro sólido #000000)
        const bwCanvas = document.createElement('canvas');
        bwCanvas.width = cropW;
        bwCanvas.height = cropH;
        const bwCtx = bwCanvas.getContext('2d');
        bwCtx.drawImage(colorCanvas, 0, 0);
        const bwImgData = bwCtx.getImageData(0, 0, cropW, cropH);
        const bwData = bwImgData.data;

        for (let i = 0; i < bwData.length; i += 4) {
          const r = bwData[i];
          const g = bwData[i + 1];
          const b = bwData[i + 2];
          // El canal mínimo (minChannel) es 0 en el naranja (#FF8C00) y bajo en el negro (#222), pero 255 en el blanco
          const minChannel = Math.min(r, g, b);
          if (minChannel < 185) {
            bwData[i] = 0;
            bwData[i + 1] = 0;
            bwData[i + 2] = 0;
            bwData[i + 3] = 255;
          } else {
            bwData[i] = 255;
            bwData[i + 1] = 255;
            bwData[i + 2] = 255;
            bwData[i + 3] = 255;
          }
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

  // Ref para EVITAR que el form se reinicie mientras el usuario escribe
  const initializedPedidoIdRef = useRef(null);

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

  // Generar QR en base64 de alta resolución y alto contraste
  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(currentQrUrl, {
      margin: 1,
      width: 260,
      errorCorrectionLevel: 'M',
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

  const handleCustomWChange = (val) => {
    setCustomW(val);
    localStorage.setItem('onecontrol_sticker_custom_w', String(val));
  };

  const handleCustomHChange = (val) => {
    setCustomH(val);
    localStorage.setItem('onecontrol_sticker_custom_h', String(val));
  };

  // Configuración de dimensiones activas y densidad inteligente
  const activeSize = useMemo(() => {
    const found = STICKER_SIZES.find(s => s.id === sizeId) || STICKER_SIZES[0];
    let w = found.widthMm;
    let h = found.heightMm;
    if (sizeId === 'custom') {
      w = Math.max(30, Math.min(250, Number(customW) || 100));
      h = Math.max(20, Math.min(300, Number(customH) || 150));
    }
    const density = h < 38 ? 'tiny' : h < 62 ? 'small' : h <= 85 ? 'compact' : h <= 115 ? 'medium' : 'spacious';
    return {
      ...found,
      widthMm: w,
      heightMm: h,
      density
    };
  }, [sizeId, customW, customH]);

  // Escala adaptativa responsive para la vista previa en pantalla
  const isSmallScreen = windowWidth < 640;
  const stickerWidthPx = Math.round(activeSize.widthMm * 3.78);
  const stickerHeightPx = Math.round(activeSize.heightMm * 3.78);
  const availableWidth = isSmallScreen ? Math.max(260, windowWidth - 44) : 520;
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

  // ── CÁLCULO PROPORCIONAL Y ADAPTATIVO PARA CUALQUIER MEDIDA (ESPECIAL 100x150mm) ──
  const layoutMetrics = useMemo(() => {
    const { widthMm, heightMm, density } = activeSize;
    const isBw = options.colorMode === 'bw';
    const textMult = options.textScale === 'xlarge' ? 1.22 : options.textScale === 'large' ? 1.1 : 1.0;
    const socialBoost = options.prominentSocials ? 1.12 : 1.0;

    // Factor continuo basado en dimensiones reales para medidas personalizadas o grandes
    const wRatio = widthMm / 100;
    const isVerticalLarge = heightMm >= 115; // ej: 100 x 150 mm
    const isMediumSquare = heightMm > 85 && heightMm < 115; // ej: 100 x 100 mm
    const isCompact = density === 'compact'; // ej: 100 x 75 mm
    const isSmall = density === 'small';     // ej: 75 x 50 mm
    const isTiny = density === 'tiny';       // ej: 50 x 25 mm

    // Escala adicional si el usuario pone una etiqueta personalizada aún más grande o pequeña
    const hScale = isVerticalLarge
      ? (heightMm / 150)
      : isMediumSquare
        ? (heightMm / 100)
        : isCompact
          ? (heightMm / 75)
          : isSmall
            ? (heightMm / 50)
            : (heightMm / 25);

    const baseScale = Math.min(Math.max(Math.min(wRatio, hScale), 0.72), 1.65);
    const px = (val) => Math.max(7, Math.round(val * baseScale * textMult));
    const rawPx = (val) => Math.max(4, Math.round(val * baseScale));

    if (isTiny) {
      return {
        isBw,
        isTiny: true,
        isSmall: false,
        isCompact: false,
        isMediumSquare: false,
        isVerticalLarge: false,
        stackMiddle: false,
        pad: rawPx(5),
        gap: rawPx(3),
        borderW: isBw ? 1.5 : 1,
        logoH: rawPx(15),
        headerTitle: px(10),
        headerSub: px(7.5),
        orderBadge: px(9.5),
        destLabel: px(7),
        destName: px(11),
        destPhone: px(9.5),
        destAddr: px(8.5),
        zonaBadge: px(8),
        prodText: px(9),
        prodQty: px(9),
        payTitle: px(7.5),
        payAmount: px(11),
        nitText: px(7.5),
        notesText: px(7.5),
        qrSize: rawPx(28),
        webText: Math.round(px(8.5) * socialBoost),
        socialTitle: px(7.5),
        socialHandle: Math.round(px(8) * socialBoost),
        socialChips: px(7),
        barcodeH: rawPx(14),
        barcodeText: px(7.5)
      };
    }

    if (isSmall) {
      return {
        isBw,
        isTiny: false,
        isSmall: true,
        isCompact: false,
        isMediumSquare: false,
        isVerticalLarge: false,
        stackMiddle: false,
        pad: rawPx(7),
        gap: rawPx(4),
        borderW: isBw ? 1.5 : 1,
        logoH: rawPx(20),
        headerTitle: px(11),
        headerSub: px(8),
        orderBadge: px(10.5),
        destLabel: px(7.5),
        destName: px(13),
        destPhone: px(10.5),
        destAddr: px(9.5),
        zonaBadge: px(9),
        prodText: px(10),
        prodQty: px(10),
        payTitle: px(8),
        payAmount: px(13),
        nitText: px(8),
        notesText: px(8),
        qrSize: rawPx(40),
        webText: Math.round(px(9.5) * socialBoost),
        socialTitle: px(8),
        socialHandle: Math.round(px(9) * socialBoost),
        socialChips: px(7.5),
        barcodeH: rawPx(16),
        barcodeText: px(8)
      };
    }

    if (isCompact) {
      // 100 x 75 mm (378 x 283 px)
      return {
        isBw,
        isTiny: false,
        isSmall: false,
        isCompact: true,
        isMediumSquare: false,
        isVerticalLarge: false,
        stackMiddle: false,
        pad: rawPx(9),
        gap: rawPx(5),
        borderW: isBw ? 2 : 1.5,
        logoH: rawPx(26),
        headerTitle: px(13),
        headerSub: px(9),
        orderBadge: px(12),
        destLabel: px(8.5),
        destName: px(15.5),
        destPhone: px(12.5),
        destAddr: px(10.5),
        zonaBadge: px(10),
        prodText: px(11.5),
        prodQty: px(11),
        payTitle: px(8.5),
        payAmount: px(15.5),
        nitText: px(9),
        notesText: px(8.5),
        qrSize: rawPx(50),
        webText: Math.round(px(10.5) * socialBoost),
        socialTitle: px(8.5),
        socialHandle: Math.round(px(10) * socialBoost),
        socialChips: px(8),
        barcodeH: rawPx(20),
        barcodeText: px(8.5)
      };
    }

    if (isMediumSquare) {
      // 100 x 100 mm (378 x 378 px)
      return {
        isBw,
        isTiny: false,
        isSmall: false,
        isCompact: false,
        isMediumSquare: true,
        isVerticalLarge: false,
        stackMiddle: false,
        pad: rawPx(11),
        gap: rawPx(7),
        borderW: isBw ? 2 : 1.5,
        logoH: rawPx(32),
        headerTitle: px(15),
        headerSub: px(10),
        orderBadge: px(13.5),
        destLabel: px(9.5),
        destName: px(18.5),
        destPhone: px(14),
        destAddr: px(12),
        zonaBadge: px(11),
        prodText: px(13),
        prodQty: px(12.5),
        payTitle: px(9.5),
        payAmount: px(18.5),
        nitText: px(10),
        notesText: px(10),
        qrSize: rawPx(64),
        webText: Math.round(px(12) * socialBoost),
        socialTitle: px(9.5),
        socialHandle: Math.round(px(11.5) * socialBoost),
        socialChips: px(9),
        barcodeH: rawPx(25),
        barcodeText: px(9.5)
      };
    }

    // 100 x 150 mm (378 x 567 px) y formatos verticales grandes:
    // Secciones apiladas a ancho completo para que TODO se vea grande, proporcionado y llene el sticker
    return {
      isBw,
      isTiny: false,
      isSmall: false,
      isCompact: false,
      isMediumSquare: false,
      isVerticalLarge: true,
      stackMiddle: true,
      pad: rawPx(13),
      gap: rawPx(8),
      borderW: isBw ? 2.2 : 1.8,
      logoH: rawPx(40),
      headerTitle: px(18),
      headerSub: px(11),
      orderBadge: px(15),
      destLabel: px(10.5),
      destName: px(22),
      destPhone: px(16.5),
      destAddr: px(13.5),
      zonaBadge: px(12.5),
      prodText: px(14.5),
      prodQty: px(14),
      payTitle: px(11),
      payAmount: px(23),
      nitText: px(11.5),
      notesText: px(11.5),
      qrSize: rawPx(82),
      webText: Math.round(px(14) * socialBoost),
      socialTitle: px(10.5),
      socialHandle: Math.round(px(13.5) * socialBoost),
      socialChips: px(10.5),
      barcodeH: rawPx(32),
      barcodeText: px(11)
    };
  }, [activeSize, options.colorMode, options.textScale, options.prominentSocials]);

  // Lista de redes activas seleccionadas por el usuario
  const activeSocialPlatforms = useMemo(() => {
    const list = [];
    if (options.showTiktok) list.push({ id: 'tiktok', label: 'TikTok' });
    if (options.showInstagram) list.push({ id: 'ig', label: 'Instagram' });
    if (options.showFacebook) list.push({ id: 'fb', label: 'Facebook' });
    if (options.showWhatsapp && options.whatsappNumber) {
      list.push({ id: 'wa', label: `WA: ${options.whatsappNumber}` });
    }
    return list;
  }, [options.showTiktok, options.showInstagram, options.showFacebook, options.showWhatsapp, options.whatsappNumber]);

  const zonaVisual = extractOrCleanZona(form.zona, form.direccion, form.notas);
  const activeLogoSrc = options.colorMode === 'bw' ? croppedLogos.bw : croppedLogos.color;
  const barcodeCodeText = `OC-${String(form.numeroPedido || '0').padStart(4, '0')}`;

  // ── GENERADOR DE HTML PARA IMPRESIÓN DIRECTA (CLONA EL DISEÑO ADAPTATIVO EXACTO) ──
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
      <span style="font-size: 18px;">🏷️</span>
      <div>
        <div style="font-weight: 900; font-size: 12px; line-height: 1.2;">Sticker Pedido #${form.numeroPedido}</div>
        <div style="font-size: 10px; color: #94a3b8;">${widthMm}x${heightMm}mm · ${options.colorMode === 'bw' ? 'Blanco y Negro (Térmico)' : 'Color'} · OneControl</div>
      </div>
    </div>
    <button class="screen-btn" onclick="window.print()">
      🖨️ IMPRIMIR / PDF
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

  // ── INTEGRACIÓN MARKLIFE & EXPORTACIÓN DE IMAGEN PNG (CON SOPORTE B/N PURO) ──
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
      onclone: (_clonedDoc, clonedElement) => {
        // Asegurar que si se exporta desde móvil en la pestaña "Editar", ningún contenedor padre esté oculto ni escalado
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

    // Si está en modo Blanco y Negro, aplicar alto contraste B/N al canvas exportado para impresoras térmicas
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
        // Silencioso si el navegador no permite clipboard
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
  const accentColor = isBw ? '#000000' : '#FF6B00';
  const payAccentBg = isBw ? '#000000' : (form.esContraEntrega ? '#d97706' : '#059669');

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
                  {activeSize.widthMm}x{activeSize.heightMm}mm · {isBw ? '⚫⚪ B/N' : '🎨 Color'}
                </span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">
                Diseño auto-adaptable en Blanco y Negro o Color con redes sociales y página web bien visibles.
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
            <span>✏️ Opciones, B/N, Redes & Tamaño</span>
          </button>
        </div>

        {/* BODY (2 COLUMNAS: CONFIGURACIÓN Y VISTA PREVIA) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          
          {/* COLUMNA IZQUIERDA: CONFIGURACIÓN Y DATOS */}
          <div className={`lg:col-span-6 xl:col-span-5 p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[82vh] ${
            mobileTab === 'preview' ? 'hidden lg:block' : 'block'
          }`}>
            
            {/* 1. MODO DE IMPRESIÓN: BLANCO Y NEGRO vs COLOR + TAMAÑO DE LETRA */}
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-orange-400">
                  <Contrast size={14} />
                  Modo de Impresión del Sticker:
                </span>
                <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full">
                  {isBw ? 'Negro Puro 100% Contraste' : 'Con Color'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateOptions({ colorMode: 'bw' })}
                  className={`py-2.5 px-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                    isBw
                      ? 'bg-white text-black border-white shadow-sm ring-2 ring-[#FF6B00]'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <div className="w-6 h-6 rounded-lg bg-black text-white font-black text-[10px] flex items-center justify-center shrink-0 border border-slate-400">
                    B/N
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black leading-tight">Blanco y Negro</div>
                    <div className={`text-[9.5px] font-bold leading-tight mt-0.5 ${isBw ? 'text-slate-700' : 'text-slate-400'}`}>
                      Térmica / Alto contraste ⭐
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => updateOptions({ colorMode: 'color' })}
                  className={`py-2.5 px-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                    !isBw
                      ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-sm ring-2 ring-white'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-emerald-500 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                    🎨
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black leading-tight">A Color</div>
                    <div className={`text-[9.5px] font-bold leading-tight mt-0.5 ${!isBw ? 'text-orange-100' : 'text-slate-400'}`}>
                      Detalles en naranja/verde
                    </div>
                  </div>
                </button>
              </div>

              {/* Tamaño de Letra / Escala de Contenido */}
              <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1">
                  <Type size={13} className="text-orange-400" />
                  Tamaño de Texto:
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'normal', label: 'Normal' },
                    { id: 'large', label: 'Grande ⭐' },
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

            {/* 2. SELECTOR DE TAMAÑO DE STICKER */}
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
                        min="30"
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
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { w: 100, h: 150, label: '100 x 150 mm' },
                      { w: 100, h: 100, label: '100 x 100 mm' },
                      { w: 100, h: 75, label: '100 x 75 mm' },
                      { w: 80, h: 120, label: '80 x 120 mm' },
                      { w: 75, h: 50, label: '75 x 50 mm' }
                    ].map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          handleCustomWChange(p.w);
                          handleCustomHChange(p.h);
                        }}
                        className="text-[10px] font-black px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#FF6B00] hover:text-[#FF6B00] cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. REDES SOCIALES, PÁGINA WEB & QR (PROMINENTE Y EDITABLE) */}
            <div className="space-y-3 p-4 bg-orange-50/50 rounded-2xl border-2 border-orange-200/90">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Globe size={15} className="text-[#FF6B00]" />
                  Página Web, Redes Sociales & QR
                </span>
                <label className="flex items-center gap-1.5 text-[11px] font-black text-[#FF6B00] bg-white px-2.5 py-1 rounded-lg border border-orange-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.prominentSocials}
                    onChange={e => updateOptions({ prominentSocials: e.target.checked })}
                    className="accent-[#FF6B00] rounded cursor-pointer"
                  />
                  <span>Bien Grandes / Visibles ⭐</span>
                </label>
              </div>

              {/* Página Web */}
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-black text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.showWebsite}
                      onChange={e => updateOptions({ showWebsite: e.target.checked })}
                      className="accent-[#FF6B00] rounded cursor-pointer"
                    />
                    <span>🌐 Mostrar Página Web</span>
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">Destacado en Sticker</span>
                </div>
                {options.showWebsite && (
                  <input
                    type="text"
                    value={options.websiteUrl}
                    onChange={e => updateOptions({ websiteUrl: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-900 focus:outline-none focus:border-[#FF6B00]"
                    placeholder="www.onecontrol.shop"
                  />
                )}
              </div>

              {/* Redes Sociales */}
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-black text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.showSocials}
                      onChange={e => updateOptions({ showSocials: e.target.checked })}
                      className="accent-[#FF6B00] rounded cursor-pointer"
                    />
                    <span>📱 Mostrar Redes Sociales</span>
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">Con íconos visibles</span>
                </div>

                {options.showSocials && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                          Usuario de Redes:
                        </label>
                        <input
                          type="text"
                          value={options.socialHandle}
                          onChange={e => updateOptions({ socialHandle: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-900"
                          placeholder="@onecontrol.shop"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                          WhatsApp / PBX:
                        </label>
                        <input
                          type="text"
                          value={options.whatsappNumber}
                          onChange={e => updateOptions({ whatsappNumber: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-900"
                          placeholder="5965-8803"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                        Redes a mostrar en la etiqueta:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { key: 'showTiktok', label: '♪ TikTok' },
                          { key: 'showInstagram', label: '📷 Instagram' },
                          { key: 'showFacebook', label: 'f Facebook' },
                          { key: 'showWhatsapp', label: '💬 WhatsApp' }
                        ].map(net => (
                          <button
                            key={net.key}
                            type="button"
                            onClick={() => updateOptions({ [net.key]: !options[net.key] })}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all cursor-pointer ${
                              options[net.key]
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}
                          >
                            {options[net.key] ? '✓ ' : ''}{net.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Código QR */}
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-black text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.showSocialQr}
                      onChange={e => updateOptions({ showSocialQr: e.target.checked })}
                      className="accent-[#FF6B00] rounded cursor-pointer"
                    />
                    <span>🏁 Mostrar Código QR Escaneable</span>
                  </label>
                </div>

                {options.showSocialQr && (
                  <div className="space-y-2">
                    <select
                      value={options.socialQrTarget}
                      onChange={e => updateOptions({ socialQrTarget: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-[#FF6B00] cursor-pointer"
                    >
                      {QR_TARGETS.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>

                    {options.socialQrTarget === 'custom' && (
                      <input
                        type="url"
                        value={options.customQrUrl}
                        onChange={e => updateOptions({ customQrUrl: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                        placeholder="https://tu-pagina-o-redes.com"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 4. DATOS DEL DESTINATARIO */}
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

            {/* 5. PRODUCTO Y COBRO */}
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

              {/* Notas / Instrucciones al Repartidor */}
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
                    >
                      <Trash2 size={11} />
                      <span>Limpiar notas</span>
                    </button>
                  )}
                </div>

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

            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className="lg:hidden w-full py-2.5 px-4 bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <Eye size={15} />
              <span>Ver Sticker Generado</span>
            </button>
          </div>

          {/* COLUMNA DERECHA: VISTA PREVIA WYSIWYG CON CONTROLES RÁPIDOS */}
          <div className={`lg:col-span-6 xl:col-span-7 p-3 sm:p-5 bg-slate-100 flex flex-col justify-between items-center overflow-y-auto max-h-[82vh] ${
            mobileTab === 'edit' ? 'hidden lg:flex' : 'flex'
          }`}>
            
            {/* BARRA RÁPIDA DE OPCIONES EN LA VISTA PREVIA (SIEMPRE VISIBLE EN MÓVIL Y DESKTOP) */}
            <div className="w-full space-y-2 mb-3 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
                {/* Toggle Rápido Blanco y Negro vs Color */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => updateOptions({ colorMode: 'bw' })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                      isBw
                        ? 'bg-black text-white shadow-xs'
                        : 'text-slate-600 hover:text-black'
                    }`}
                    title="Impresión en Blanco y Negro puro de alto contraste"
                  >
                    <span>⚫⚪ Blanco y Negro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateOptions({ colorMode: 'color' })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                      !isBw
                        ? 'bg-[#FF6B00] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Impresión a Color"
                  >
                    <span>🎨 Color</span>
                  </button>
                </div>

                {/* Selector rápido de tamaño */}
                <div className="flex items-center gap-1">
                  {[
                    { id: '10x15', label: '100x150' },
                    { id: '10x10', label: '100x100' },
                    { id: '10x7.5', label: '100x75' },
                    { id: '7.5x5', label: '75x50' }
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

                {/* Controles de Zoom */}
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                    className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                    title="Alejar"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span className="text-[10px] font-black text-slate-700 w-9 text-center">
                    {Math.round(effectiveScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
                    className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                    title="Acercar"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* CONTENEDOR VISUAL DEL STICKER (AUTO-ESCALADO RESPONSIVE Y 100% FIEL A IMPRESIÓN) */}
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
                className="bg-white text-black shadow-2xl rounded-xs overflow-hidden shrink-0 select-none"
              >
                {/* TARJETA REAL DEL STICKER (USADA EN IMPRESIÓN Y EN EXPORTACIÓN MARKLIFE PNG) */}
                <div
                  ref={stickerCardRef}
                  style={{
                    width: `${stickerWidthPx}px`,
                    height: `${stickerHeightPx}px`,
                    maxWidth: `${stickerWidthPx}px`,
                    maxHeight: `${stickerHeightPx}px`,
                    padding: `${M.pad}px`,
                    gap: `${M.gap}px`,
                    border: `${M.borderW}px solid #000000`,
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                  }}
                >
                  {/* 1. ENCABEZADO (LOGO + ONECONTROL + PEDIDO #) */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: `${M.borderW}px solid #000000`,
                      paddingBottom: `${Math.max(3, Math.round(M.gap * 0.85))}px`,
                      flexShrink: 0
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: `${Math.max(4, M.gap)}px`, minWidth: 0 }}>
                      {options.showLogo && (
                        <img
                          src={activeLogoSrc}
                          alt="OneControl"
                          style={{
                            height: `${M.logoH}px`,
                            width: 'auto',
                            maxWidth: `${Math.round(stickerWidthPx * 0.36)}px`,
                            objectFit: 'contain',
                            display: 'block',
                            flexShrink: 0
                          }}
                        />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: `${M.headerTitle}px`,
                            fontWeight: 900,
                            letterSpacing: '-0.3px',
                            textTransform: 'uppercase',
                            lineHeight: 1.05,
                            color: isBw ? '#000000' : '#0f172a'
                          }}
                        >
                          ONECONTROL
                        </div>
                        {options.showSender && !M.isTiny && (
                          <div
                            style={{
                              fontSize: `${M.headerSub}px`,
                              fontWeight: 800,
                              color: '#000000',
                              marginTop: '2px',
                              lineHeight: 1.1
                            }}
                          >
                            📞 PBX/WA: {options.whatsappNumber || '5965-8803'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div
                        style={{
                          backgroundColor: accentColor,
                          color: '#ffffff',
                          fontSize: `${M.orderBadge}px`,
                          fontWeight: 900,
                          padding: M.isTiny ? '1px 5px' : '2px 8px',
                          borderRadius: '4px',
                          lineHeight: 1.15,
                          display: 'inline-block'
                        }}
                      >
                        PEDIDO #{form.numeroPedido}
                      </div>
                      {form.fechaEntrega && !M.isTiny && (
                        <div
                          style={{
                            fontSize: `${M.headerSub}px`,
                            fontWeight: 800,
                            color: '#000000',
                            marginTop: '2px',
                            lineHeight: 1.1
                          }}
                        >
                          🗓️ {form.fechaEntrega}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. SECCIÓN DESTINATARIO (SE ADAPTA Y CRECE EN ETIQUETAS GRANDES) */}
                  <div
                    style={{
                      border: `${M.borderW}px solid #000000`,
                      borderRadius: '6px',
                      padding: `${Math.max(4, Math.round(M.pad * 0.75))}px`,
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      flex: M.isVerticalLarge ? '1 1 auto' : '0 1 auto',
                      minHeight: 0
                    }}
                  >
                    <div
                      style={{
                        fontSize: `${M.destLabel}px`,
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        color: '#000000',
                        lineHeight: 1.1
                      }}
                    >
                      📦 ENTREGAR A:
                    </div>

                    <div
                      style={{
                        fontSize: `${M.destName}px`,
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        color: '#000000',
                        lineHeight: 1.1,
                        margin: '2px 0',
                        wordBreak: 'break-word'
                      }}
                    >
                      {form.cliente || 'CLIENTE FINAL'}
                    </div>

                    <div
                      style={{
                        fontSize: `${M.destPhone}px`,
                        fontWeight: 900,
                        color: '#000000',
                        lineHeight: 1.15,
                        marginTop: '1px'
                      }}
                    >
                      📞 TEL: {form.phone || 'Sin número'}
                    </div>

                    <div
                      style={{
                        fontSize: `${M.destAddr}px`,
                        fontWeight: 800,
                        color: '#000000',
                        lineHeight: 1.2,
                        marginTop: '3px',
                        wordBreak: 'break-word'
                      }}
                    >
                      {form.direccion || 'Dirección pendiente de confirmación'}
                    </div>

                    {zonaVisual && (
                      <div style={{ marginTop: '4px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            backgroundColor: '#000000',
                            color: '#ffffff',
                            fontSize: `${M.zonaBadge}px`,
                            fontWeight: 900,
                            padding: M.isTiny ? '1px 5px' : '2px 8px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            lineHeight: 1.2
                          }}
                        >
                          📍 {zonaVisual.toUpperCase()}{form.municipio && form.municipio !== 'Guatemala' ? ' · ' + form.municipio.toUpperCase() : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 3. PRODUCTO Y CANTIDAD */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '6px',
                      padding: `${Math.max(3, Math.round(M.gap * 0.7))}px ${Math.max(4, Math.round(M.pad * 0.5))}px`,
                      borderTop: `${M.borderW}px solid #000000`,
                      borderBottom: `${M.borderW}px solid #000000`,
                      backgroundColor: '#ffffff',
                      flexShrink: 0
                    }}
                  >
                    <div
                      style={{
                        fontSize: `${M.prodText}px`,
                        fontWeight: 900,
                        color: '#000000',
                        lineHeight: 1.15,
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: M.isVerticalLarge ? 2 : 1,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      🛠️ {form.producto || 'Producto sin especificar'}
                    </div>
                    <div
                      style={{
                        fontSize: `${M.prodQty}px`,
                        fontWeight: 900,
                        color: '#000000',
                        border: `${M.borderW}px solid #000000`,
                        padding: M.isTiny ? '1px 4px' : '2px 7px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        backgroundColor: '#ffffff'
                      }}
                    >
                      CANT: {form.cantidad || '1'}
                    </div>
                  </div>

                  {/* 4. SECCIÓN MEDIA: COBRO + REDES SOCIALES / PÁGINA WEB / QR */}
                  {/* En 100x150mm (stackMiddle=true) se apilan a ancho completo para máxima visibilidad */}
                  <div
                    style={{
                      display: M.stackMiddle ? 'flex' : 'grid',
                      flexDirection: M.stackMiddle ? 'column' : undefined,
                      gridTemplateColumns: !M.stackMiddle
                        ? (options.showPrice && (options.showSocialQr || options.showWebsite || options.showSocials) && !M.isTiny ? '0.95fr 1.05fr' : '1fr')
                        : undefined,
                      gap: `${M.gap}px`,
                      alignItems: 'stretch',
                      flexShrink: 0
                    }}
                  >
                    {/* BLOQUE DE COBRO Y NOTAS */}
                    {options.showPrice && (
                      <div
                        style={{
                          border: `${M.borderW}px solid #000000`,
                          borderRadius: '6px',
                          overflow: 'hidden',
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: payAccentBg,
                            color: '#ffffff',
                            fontSize: `${M.payTitle}px`,
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            textAlign: 'center',
                            padding: M.isTiny ? '1px 4px' : '3px 6px',
                            lineHeight: 1.15
                          }}
                        >
                          {form.esContraEntrega ? '⚠️ COBRO CONTRA ENTREGA' : '✓ ESTADO: PAGADO (NO COBRAR)'}
                        </div>

                        <div
                          style={{
                            padding: `${Math.max(3, Math.round(M.pad * 0.55))}px`,
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: M.stackMiddle ? 'row' : 'column',
                            alignItems: 'center',
                            justifyContent: M.stackMiddle ? 'space-around' : 'center',
                            gap: '4px'
                          }}
                        >
                          <div
                            style={{
                              fontSize: `${M.payAmount}px`,
                              fontWeight: 900,
                              color: '#000000',
                              lineHeight: 1.05
                            }}
                          >
                            {form.esContraEntrega ? (form.precio || 'A CONFIRMAR') : 'NO COBRAR'}
                          </div>

                          {options.showNit && form.nit && (
                            <div
                              style={{
                                fontSize: `${M.nitText}px`,
                                fontWeight: 900,
                                color: '#000000',
                                border: isBw ? '1.5px solid #000000' : '1px solid #475569',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                lineHeight: 1.15
                              }}
                            >
                              NIT: {form.nit}
                            </div>
                          )}
                        </div>

                        {options.showNotes && form.notas && !M.isTiny && (
                          <div
                            style={{
                              fontSize: `${M.notesText}px`,
                              fontWeight: 800,
                              color: '#000000',
                              borderTop: '1.5px dashed #000000',
                              padding: '3px 6px',
                              lineHeight: 1.2,
                              textAlign: 'left',
                              wordBreak: 'break-word'
                            }}
                          >
                            📝 <strong>Ref:</strong> {form.notas}
                          </div>
                        )}
                      </div>
                    )}

                    {/* BLOQUE DESTACADO DE PÁGINA WEB, REDES SOCIALES Y QR */}
                    {(options.showSocialQr || options.showWebsite || options.showSocials) && !M.isTiny && (
                      <div
                        style={{
                          border: `${M.borderW}px solid #000000`,
                          borderRadius: '6px',
                          padding: `${Math.max(4, Math.round(M.pad * 0.6))}px`,
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: `${Math.max(6, M.gap)}px`
                        }}
                      >
                        {options.showSocialQr && qrBase64 && (
                          <img
                            src={qrBase64}
                            alt="QR OneControl"
                            style={{
                              width: `${M.qrSize}px`,
                              height: `${M.qrSize}px`,
                              objectFit: 'contain',
                              border: `${M.borderW}px solid #000000`,
                              borderRadius: '4px',
                              backgroundColor: '#ffffff',
                              flexShrink: 0,
                              display: 'block'
                            }}
                          />
                        )}

                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: M.isVerticalLarge ? '4px' : '2px'
                          }}
                        >
                          {/* PÁGINA WEB BIEN VISIBLE */}
                          {options.showWebsite && options.websiteUrl && (
                            <div
                              style={{
                                backgroundColor: '#000000',
                                color: '#ffffff',
                                fontSize: `${M.webText}px`,
                                fontWeight: 900,
                                padding: M.isVerticalLarge ? '3px 7px' : '2px 5px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.2px',
                                lineHeight: 1.15,
                                textAlign: 'center',
                                wordBreak: 'break-all'
                              }}
                            >
                              🌐 {options.websiteUrl}
                            </div>
                          )}

                          {/* USUARIO DE REDES SOCIALES BIEN VISIBLE */}
                          {options.showSocials && (
                            <>
                              <div
                                style={{
                                  fontSize: `${M.socialHandle}px`,
                                  fontWeight: 900,
                                  color: '#000000',
                                  lineHeight: 1.15,
                                  textAlign: 'center',
                                  marginTop: '1px'
                                }}
                              >
                                📱 {options.socialHandle || '@onecontrol.shop'}
                              </div>

                              {/* CHIPS DE REDES SOCIALES ACTIVAS CON ALTO CONTRASTE */}
                              {activeSocialPlatforms.length > 0 && (
                                <div
                                  style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    gap: '3px',
                                    marginTop: '1px'
                                  }}
                                >
                                  {activeSocialPlatforms.map(net => (
                                    <span
                                      key={net.id}
                                      style={{
                                        fontSize: `${M.socialChips}px`,
                                        fontWeight: 900,
                                        color: '#000000',
                                        border: '1.5px solid #000000',
                                        borderRadius: '3px',
                                        padding: M.isVerticalLarge ? '1.5px 5px' : '0.5px 3.5px',
                                        lineHeight: 1.1,
                                        backgroundColor: '#ffffff',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      {net.label}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* EN MINI STICKERS (50x25mm): BARRA VISIBLE DE WEB Y REDES */}
                  {M.isTiny && (options.showWebsite || options.showSocials) && (
                    <div
                      style={{
                        backgroundColor: '#000000',
                        color: '#ffffff',
                        fontSize: `${M.webText}px`,
                        fontWeight: 900,
                        textAlign: 'center',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        lineHeight: 1.1
                      }}
                    >
                      🌐 {options.websiteUrl || 'onecontrol.shop'} · {options.socialHandle || '@onecontrol.shop'}
                    </div>
                  )}

                  {/* 5. PIE DE CÓDIGO DE BARRAS */}
                  {options.showBarcode && (
                    <div
                      style={{
                        marginTop: 'auto',
                        paddingTop: '2px',
                        textAlign: 'center',
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
                          fontSize: `${M.barcodeText}px`,
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          letterSpacing: '1.5px',
                          color: '#000000',
                          marginTop: '1px',
                          lineHeight: 1
                        }}
                      >
                        *{barcodeCodeText}*
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* BOTÓN INFERIOR DE IMPRESIÓN (DESKTOP) */}
            <div className="w-full hidden sm:flex items-center justify-between pt-4 border-t border-slate-200 shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Optimizado en {isBw ? 'Blanco y Negro puro' : 'Color'} para {activeSize.widthMm}x{activeSize.heightMm}mm.
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
                    Guarda la etiqueta en tu galería ({isBw ? 'en Blanco y Negro nítido' : 'a Color'}) y abre Marklife.
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
                    {activeSize.widthMm}x{activeSize.heightMm}mm · {isBw ? 'Blanco y Negro Puro' : 'A Color'}
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

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="font-black text-slate-800 text-[11px] uppercase tracking-wider">
                  Luego dentro de la app Marklife:
                </div>
                <div className="space-y-2 text-[11.5px] text-slate-700">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-[#FF6B00] font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                    <span>Configura tu etiqueta en <strong>{activeSize.widthMm}x{activeSize.heightMm}mm</strong> y toca en <strong>"Imagen"</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-[#FF6B00] font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                    <span>Elige el sticker recién guardado (es la primera imagen de tu galería).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-[#FF6B00] font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                    <span>¡Toca el botón <strong>Imprimir</strong> por Bluetooth y listo!</span>
                  </div>
                </div>
              </div>

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
