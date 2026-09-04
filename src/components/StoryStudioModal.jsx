import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Download, Share2, Copy, Check, Sparkles, UploadCloud,
  Palette, RefreshCw, Layers, Move, ZoomIn, ZoomOut, Eye,
  Flame, ShoppingBag, Tag, CheckCircle2, ChevronRight, Wand2
} from 'lucide-react';

const TEMPLATES = [
  {
    id: 'nordic_sand',
    name: '🌾 Arena Nórdica Minimalista',
    badge: 'Minimalista & Cálido',
    category: 'minimal',
    bgType: 'light',
    primaryColor: '#4A5543',
    secondaryColor: '#7A8B71',
    darkBg: '#F7F5F0',
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(74, 85, 67, 0.15)',
    textColor: '#242B20',
    textMuted: '#667362',
    priceCardBg: '#FFFFFF',
    priceColor: '#2E382A',
    ctaBg: '#2E382A',
    ctaColor: '#FFFFFF',
    accentBadge: '🌿 DISEÑO NÓRDICO & ALTA CALIDAD'
  },
  {
    id: 'slate_studio',
    name: '🖤 Apple Slate Dark (Titanio)',
    badge: 'Minimalista Dark',
    category: 'dark',
    bgType: 'dark',
    primaryColor: '#38BDF8',
    secondaryColor: '#818CF8',
    darkBg: '#0F1218',
    cardBg: '#161B24',
    cardBorder: 'rgba(255, 255, 255, 0.09)',
    textColor: '#FFFFFF',
    textMuted: '#94A3B8',
    priceCardBg: '#1E2430',
    priceColor: '#38BDF8',
    ctaBg: '#FFFFFF',
    ctaColor: '#0F1218',
    accentBadge: '⚡ EDICIÓN ESPECIAL • TITANIO'
  },
  {
    id: 'mint_clean',
    name: '🍃 Salvia & Menta Editorial',
    badge: 'Fresco & Clean',
    category: 'minimal',
    bgType: 'light',
    primaryColor: '#059669',
    secondaryColor: '#34D399',
    darkBg: '#F1F7F4',
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(5, 150, 105, 0.16)',
    textColor: '#132E23',
    textMuted: '#527867',
    priceCardBg: '#FFFFFF',
    priceColor: '#047857',
    ctaBg: '#132E23',
    ctaColor: '#FFFFFF',
    accentBadge: '🍃 CALIDAD 100% ORIGINAL'
  },
  {
    id: 'pure_magazine',
    name: '📰 Editorial B&W (Alta Gama)',
    badge: 'Revista Monocromática',
    category: 'minimal',
    bgType: 'light',
    primaryColor: '#000000',
    secondaryColor: '#374151',
    darkBg: '#FAFAFA',
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(0, 0, 0, 0.85)',
    textColor: '#000000',
    textMuted: '#4B5563',
    priceCardBg: '#FFFFFF',
    priceColor: '#000000',
    ctaBg: '#000000',
    ctaColor: '#FFFFFF',
    accentBadge: '◼ ONE CONTROL GUATEMALA'
  },
  {
    id: 'terracotta_warm',
    name: '🏺 Terracota & Arcilla Cálida',
    badge: 'Cálido Moderno',
    category: 'minimal',
    bgType: 'light',
    primaryColor: '#EA580C',
    secondaryColor: '#F97316',
    darkBg: '#FAF6F0',
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(234, 88, 12, 0.2)',
    textColor: '#382314',
    textMuted: '#855F45',
    priceCardBg: '#FFFFFF',
    priceColor: '#C2410C',
    ctaBg: '#C2410C',
    ctaColor: '#FFFFFF',
    accentBadge: '✨ ENTREGA RÁPIDA & GARANTÍA'
  },
  {
    id: 'midnight_glass',
    name: '🌌 Midnight Glass (Índigo)',
    badge: 'Glassmorphism',
    category: 'dark',
    bgType: 'dark',
    primaryColor: '#6366F1',
    secondaryColor: '#06B6D4',
    darkBg: '#0A0D1A',
    cardBg: '#13192E',
    cardBorder: 'rgba(99, 102, 241, 0.35)',
    textColor: '#FFFFFF',
    textMuted: '#A5B4FC',
    priceCardBg: '#1B233D',
    priceColor: '#38BDF8',
    ctaBg: '#6366F1',
    ctaColor: '#FFFFFF',
    accentBadge: '🌌 PRODUCTO DESTACADO OFICIAL'
  },
  {
    id: 'orange_impact',
    name: '🔥 Marca OneControl (Naranja & Negro)',
    badge: 'Oficial & Llamativo',
    category: 'ofertas',
    bgType: 'dark',
    primaryColor: '#FF6B00',
    secondaryColor: '#FFA347',
    darkBg: '#090D16',
    cardBg: '#131A29',
    cardBorder: 'rgba(255, 107, 0, 0.4)',
    textColor: '#FFFFFF',
    textMuted: '#94A3B8',
    priceCardBg: '#1E2638',
    priceColor: '#FFFFFF',
    ctaBg: '#FF6B00',
    ctaColor: '#FFFFFF',
    accentBadge: '🔥 ¡OFERTA POR TIEMPO LIMITADO!'
  },
  {
    id: 'minimal_clean',
    name: '✨ Blanco Minimalista & Clean',
    badge: 'Elegante',
    category: 'minimal',
    bgType: 'light',
    primaryColor: '#0F172A',
    secondaryColor: '#10B981',
    darkBg: '#F8FAFC',
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(226, 232, 240, 0.9)',
    textColor: '#0F172A',
    textMuted: '#64748B',
    priceCardBg: '#FFFFFF',
    priceColor: '#10B981',
    ctaBg: '#0F172A',
    ctaColor: '#FFFFFF',
    accentBadge: '⭐ PRODUCTO DESTACADO • 100% ORIGINAL'
  },
  {
    id: 'cyber_neon',
    name: '⚡ Cyber Neon & Novedad',
    badge: 'Llamativo',
    category: 'ofertas',
    bgType: 'dark',
    primaryColor: '#06B6D4',
    secondaryColor: '#A855F7',
    darkBg: '#08081A',
    cardBg: '#10112D',
    cardBorder: 'rgba(6, 182, 212, 0.4)',
    textColor: '#FFFFFF',
    textMuted: '#94A3B8',
    priceCardBg: '#131438',
    priceColor: '#FFFFFF',
    ctaBg: '#06B6D4',
    ctaColor: '#08081A',
    accentBadge: '⚡ FLASH SALE • ÚLTIMAS UNIDADES'
  },
  {
    id: 'luxury_gold',
    name: '💎 Oro Imperial & Lujo',
    badge: 'Premium',
    category: 'premium',
    bgType: 'dark',
    primaryColor: '#F59E0B',
    secondaryColor: '#FCD34D',
    darkBg: '#121214',
    cardBg: '#1C1C21',
    cardBorder: 'rgba(245, 158, 11, 0.4)',
    textColor: '#FFFFFF',
    textMuted: '#A1A1AA',
    priceCardBg: '#242018',
    priceColor: '#FEF3C7',
    ctaBg: '#F59E0B',
    ctaColor: '#18181B',
    accentBadge: '✨ CALIDAD SUPERIOR • ALTA GAMA'
  },
  {
    id: 'red_sale',
    name: '🚨 Gran Liquidación (Rojo Fuego)',
    badge: 'Urgencia',
    category: 'ofertas',
    bgType: 'dark',
    primaryColor: '#EF4444',
    secondaryColor: '#FBBF24',
    darkBg: '#180407',
    cardBg: '#2A0A10',
    cardBorder: 'rgba(239, 68, 68, 0.45)',
    textColor: '#FFFFFF',
    textMuted: '#FECACA',
    priceCardBg: '#360D12',
    priceColor: '#FEF08A',
    ctaBg: '#EF4444',
    ctaColor: '#FFFFFF',
    accentBadge: '🚨 SÚPER DESCUENTO • HASTA AGOTAR'
  }
];

export default function StoryStudioModal({
  isOpen,
  onClose,
  products = [],
  apiBase = '',
  authToken = '',
  initialProduct = null,
  onUseInPublisher
}) {
  const canvasRef = useRef(null);
  const [selectedTemplate, setSelectedTemplate] = useState('nordic_sand');
  const [templateCategory, setTemplateCategory] = useState('todos'); // 'todos' | 'minimal' | 'dark' | 'ofertas' | 'premium'
  
  // Datos configurables de la historia
  const [storyData, setStoryData] = useState({
    title: 'Motor Portón Eléctrico Corredizo',
    subtitle: 'Kit completo para uso residencial',
    price: '1,200',
    oldPrice: '1,500',
    currency: 'Q',
    badgeText: '🔥 ¡OFERTA POR TIEMPO LIMITADO!',
    brandName: 'OneControl Guatemala',
    benefit1: '🚚 Pago contra entrega',
    benefit2: '📦 Envío a toda Guatemala',
    benefit3: '🛡️ Garantía de 1 año',
    ctaText: '📲 Toca responder para pedir por WhatsApp',
    imageUrl: '',
    imageScale: 1.0,
    imageOffsetY: 0,
    imageOffsetX: 0,
    showOldPrice: true,
    showBenefits: true
  });

  const [loadingImage, setLoadingImage] = useState(false);
  const [imageObject, setImageObject] = useState(null);
  const [copied, setCopied] = useState(false);
  const [publishingToDashboard, setPublishingToDashboard] = useState(false);

  // Inicializar o cargar producto seleccionado
  useEffect(() => {
    if (initialProduct) {
      loadProductIntoStory(initialProduct);
    } else if (products && products.length > 0 && !storyData.imageUrl) {
      loadProductIntoStory(products[0]);
    }
  }, [initialProduct, products]);

  const loadProductIntoStory = (p) => {
    let img = p.imagen || '';
    try {
      if (p.imagenes) {
        const parsed = typeof p.imagenes === 'string' ? JSON.parse(p.imagenes) : p.imagenes;
        if (Array.isArray(parsed) && parsed[0]) img = parsed[0];
      }
    } catch { /* */ }

    // Calcular un precio de antes sugerido (ej. 20% más alto) si no existe
    let rawPrice = String(p.precio || '').replace(/[^0-9.]/g, '');
    let numPrice = parseFloat(rawPrice) || 0;
    let suggestedOld = numPrice > 0 ? Math.round(numPrice * 1.25) : '';

    setStoryData(prev => ({
      ...prev,
      title: p.nombre || 'Producto Destacado',
      subtitle: p.categoria ? `Categoría: ${p.categoria}` : 'Excelente calidad garantizada',
      price: numPrice ? numPrice.toLocaleString() : (p.precio || '0'),
      oldPrice: suggestedOld ? suggestedOld.toLocaleString() : '',
      showOldPrice: Boolean(suggestedOld),
      imageUrl: img || prev.imageUrl,
      imageScale: 1.0,
      imageOffsetY: 0,
      imageOffsetX: 0
    }));
  };

  // Cargar imagen de manera segura para Canvas (con proxy si es externa)
  useEffect(() => {
    if (!storyData.imageUrl) {
      setImageObject(null);
      return;
    }

    setLoadingImage(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      setImageObject(img);
      setLoadingImage(false);
    };

    img.onerror = () => {
      // Si falla por CORS directo, intentar cargarlo a través del proxy del backend
      if (apiBase && !storyData.imageUrl.startsWith('data:') && !storyData.imageUrl.includes('/api/media/proxy')) {
        const proxyUrl = `${apiBase}/api/media/proxy?url=${encodeURIComponent(storyData.imageUrl)}`;
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.onload = () => {
          setImageObject(fallbackImg);
          setLoadingImage(false);
        };
        fallbackImg.onerror = () => {
          console.warn('No se pudo cargar la imagen para el canvas incluso con proxy.');
          setImageObject(null);
          setLoadingImage(false);
        };
        fallbackImg.src = proxyUrl;
      } else {
        setImageObject(null);
        setLoadingImage(false);
      }
    };

    img.src = storyData.imageUrl;
  }, [storyData.imageUrl, apiBase]);

  // Subir imagen local desde PC
  const handleLocalImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setStoryData(prev => ({
        ...prev,
        imageUrl: event.target.result,
        imageScale: 1.0,
        imageOffsetY: 0,
        imageOffsetX: 0
      }));
    };
    reader.readAsDataURL(file);
  };

  // Función de renderizado del Canvas (1080 x 1920 HD)
  const drawStoryCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;

    const tpl = TEMPLATES.find(t => t.id === selectedTemplate) || TEMPLATES[0];

    // ── 1. FONDO PRINCIPAL ─────────────────────────────────────────────────
    ctx.save();
    if (tpl.bgType === 'light') {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      if (tpl.id === 'nordic_sand') {
        grad.addColorStop(0, '#FAF8F5');
        grad.addColorStop(0.5, '#F3EFE7');
        grad.addColorStop(1, '#E8E1D5');
      } else if (tpl.id === 'mint_clean') {
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.5, '#F0F7F4');
        grad.addColorStop(1, '#E2EFE9');
      } else if (tpl.id === 'terracotta_warm') {
        grad.addColorStop(0, '#FCFAF6');
        grad.addColorStop(0.5, '#F7EFE4');
        grad.addColorStop(1, '#EFE2D2');
      } else if (tpl.id === 'pure_magazine') {
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(1, '#F8F8F8');
      } else {
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.5, '#F1F5F9');
        grad.addColorStop(1, '#E2E8F0');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Marco minimalista perimetral fino para estilo editorial puro
      if (tpl.id === 'pure_magazine') {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeRect(40, 40, W - 80, H - 80);
      } else {
        // Patrón sutil de puntos
        ctx.fillStyle = 'rgba(15, 23, 42, 0.025)';
        for (let x = 40; x < W; x += 60) {
          for (let y = 40; y < H; y += 60) {
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      if (tpl.id === 'slate_studio') {
        grad.addColorStop(0, '#151922');
        grad.addColorStop(0.4, '#0F1218');
        grad.addColorStop(1, '#080A0E');
      } else if (tpl.id === 'midnight_glass') {
        grad.addColorStop(0, '#11172E');
        grad.addColorStop(0.4, '#090D1C');
        grad.addColorStop(1, '#04060E');
      } else {
        grad.addColorStop(0, tpl.darkBg);
        grad.addColorStop(0.4, '#111726');
        grad.addColorStop(1, '#05070B');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Glow ambiental superior
      const glowTop = ctx.createRadialGradient(W / 2, 200, 50, W / 2, 200, 600);
      glowTop.addColorStop(0, `${tpl.primaryColor}30`);
      glowTop.addColorStop(1, 'transparent');
      ctx.fillStyle = glowTop;
      ctx.fillRect(0, 0, W, 800);

      // Glow ambiental inferior
      const glowBottom = ctx.createRadialGradient(W / 2, H - 300, 50, W / 2, H - 300, 500);
      glowBottom.addColorStop(0, `${tpl.secondaryColor}22`);
      glowBottom.addColorStop(1, 'transparent');
      ctx.fillStyle = glowBottom;
      ctx.fillRect(0, H - 700, W, 700);
    }
    ctx.restore();

    // ── 2. HEADER: MARCA Y BADGE SUPERIOR ─────────────────────────────────
    ctx.save();
    // Nombre de Marca
    ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = tpl.bgType === 'light' ? (tpl.textMuted || '#475569') : '#94A3B8';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '3px';
    ctx.fillText((storyData.brandName || 'ONECONTROL GUATEMALA').toUpperCase(), W / 2, 110);

    // Pill de Oferta / Tag
    if (storyData.badgeText) {
      const badgeText = storyData.badgeText;
      ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textMetrics = ctx.measureText(badgeText);
      const badgeW = textMetrics.width + 80;
      const badgeH = 72;
      const badgeX = (W - badgeW) / 2;
      const badgeY = 145;

      // Sombra del badge
      ctx.shadowColor = tpl.primaryColor;
      ctx.shadowBlur = tpl.bgType === 'light' ? 12 : 24;
      ctx.shadowOffsetY = 4;

      // Fondo del badge
      const bGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
      bGrad.addColorStop(0, tpl.primaryColor);
      bGrad.addColorStop(1, tpl.secondaryColor);
      ctx.fillStyle = bGrad;
      roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 36);
      ctx.fill();

      // Borde brillante
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 36);
      ctx.stroke();

      // Texto del badge
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, W / 2, badgeY + badgeH / 2);
    }
    ctx.restore();

    // ── 3. TARJETA CONTENEDORA DEL PRODUCTO (FOTO) ────────────────────────
    const cardX = 90;
    const cardY = 260;
    const cardW = 900;
    const cardH = 820;
    const cardRadius = tpl.id === 'pure_magazine' ? 16 : 44;

    ctx.save();
    // Sombra de la tarjeta
    ctx.shadowColor = tpl.bgType === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 16;

    // Fondo de la tarjeta
    ctx.fillStyle = tpl.cardBg;
    roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
    ctx.fill();

    // Borde de la tarjeta
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = tpl.cardBorder;
    ctx.lineWidth = tpl.id === 'pure_magazine' ? 3 : 2.5;
    roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
    ctx.stroke();
    ctx.restore();

    // Dibujar Imagen del Producto recortada dentro de la tarjeta
    ctx.save();
    roundRect(ctx, cardX + 6, cardY + 6, cardW - 12, cardH - 12, cardRadius - 6);
    ctx.clip();

    if (imageObject) {
      const imgW = imageObject.naturalWidth || imageObject.width || 800;
      const imgH = imageObject.naturalHeight || imageObject.height || 800;

      // Calcular escala cover/contain
      const aspect = imgW / imgH;
      let drawW, drawH;
      if (aspect > 1) {
        drawW = (cardW - 40) * (storyData.imageScale || 1.0);
        drawH = drawW / aspect;
      } else {
        drawH = (cardH - 40) * (storyData.imageScale || 1.0);
        drawW = drawH * aspect;
      }

      const drawX = cardX + (cardW - drawW) / 2 + (storyData.imageOffsetX || 0);
      const drawY = cardY + (cardH - drawH) / 2 + (storyData.imageOffsetY || 0);

      // Dibujar imagen con suavizado
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imageObject, drawX, drawY, drawW, drawH);
    } else {
      // Placeholder si no hay imagen
      ctx.fillStyle = tpl.bgType === 'light' ? '#E2E8F0' : '#1E293B';
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.fillStyle = tpl.textMuted;
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📸 Selecciona un producto o sube una foto', cardX + cardW / 2, cardY + cardH / 2);
    }
    ctx.restore();

    // ── 4. TÍTULO Y SUBTÍTULO DEL PRODUCTO ────────────────────────────────
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Título Principal
    ctx.font = '900 56px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = tpl.textColor;

    // Envolver texto largo en 2 líneas si es necesario
    const maxTitleW = 900;
    const titleLines = wrapText(ctx, storyData.title || 'Producto Especial', maxTitleW);
    let titleY = 1110;
    titleLines.slice(0, 2).forEach((line, idx) => {
      ctx.fillText(line, W / 2, titleY + idx * 64);
    });

    // Subtítulo
    if (storyData.subtitle) {
      ctx.font = '500 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = tpl.textMuted;
      ctx.fillText(storyData.subtitle, W / 2, titleY + Math.min(titleLines.length, 2) * 64 + 10);
    }
    ctx.restore();

    // ── 5. SECCIÓN DE PRECIO DESTACADO & DESCUENTO ───────────────────────
    ctx.save();
    const priceBoxY = 1270;
    const priceBoxH = 190;
    const priceBoxW = 900;
    const priceBoxX = (W - priceBoxW) / 2;
    const priceBoxRadius = tpl.id === 'pure_magazine' ? 16 : 36;

    // Fondo del contenedor de precio
    ctx.shadowColor = tpl.bgType === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;

    const pBoxGrad = ctx.createLinearGradient(priceBoxX, priceBoxY, priceBoxX + priceBoxW, priceBoxY + priceBoxH);
    if (tpl.priceCardBg) {
      pBoxGrad.addColorStop(0, tpl.priceCardBg);
      pBoxGrad.addColorStop(1, tpl.priceCardBg);
    } else if (tpl.bgType === 'light') {
      pBoxGrad.addColorStop(0, '#FFFFFF');
      pBoxGrad.addColorStop(1, '#F8FAFC');
    } else {
      pBoxGrad.addColorStop(0, '#1E2638');
      pBoxGrad.addColorStop(1, '#111622');
    }

    ctx.fillStyle = pBoxGrad;
    roundRect(ctx, priceBoxX, priceBoxY, priceBoxW, priceBoxH, priceBoxRadius);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = tpl.cardBorder;
    ctx.lineWidth = 2.5;
    roundRect(ctx, priceBoxX, priceBoxY, priceBoxW, priceBoxH, priceBoxRadius);
    ctx.stroke();

    // Mostrar Precio Anterior tachado si está activado
    if (storyData.showOldPrice && storyData.oldPrice) {
      // Precio anterior
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = tpl.bgType === 'light' ? '#94A3B8' : '#64748B';
      ctx.textAlign = 'center';
      const oldText = `Antes ${storyData.currency}${storyData.oldPrice}`;
      ctx.fillText(oldText, W / 2, priceBoxY + 28);

      // Línea de tachado diagonal roja
      const oldWidth = ctx.measureText(oldText).width;
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(W / 2 - oldWidth / 2 - 10, priceBoxY + 46);
      ctx.lineTo(W / 2 + oldWidth / 2 + 10, priceBoxY + 46);
      ctx.stroke();

      // Precio Actual abajo
      ctx.font = '900 86px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = tpl.priceColor;
      ctx.textAlign = 'center';
      ctx.fillText(`${storyData.currency} ${storyData.price}`, W / 2, priceBoxY + 76);
    } else {
      // Precio único centrado grande
      ctx.font = '900 96px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = tpl.priceColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${storyData.currency} ${storyData.price}`, W / 2, priceBoxY + priceBoxH / 2);
    }
    ctx.restore();

    // ── 6. BENEFICIOS / BADGES INFORMATIVOS ──────────────────────────────
    if (storyData.showBenefits) {
      ctx.save();
      const benefits = [storyData.benefit1, storyData.benefit2, storyData.benefit3].filter(Boolean);
      const benY = 1490;
      const pillH = 54;
      
      ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const totalPills = benefits.length;
      if (totalPills > 0) {
        const gap = 16;
        const pillW = (priceBoxW - (totalPills - 1) * gap) / totalPills;

        benefits.forEach((ben, idx) => {
          const px = priceBoxX + idx * (pillW + gap);
          // Fondo del pill
          ctx.fillStyle = tpl.bgType === 'light' ? (tpl.id === 'nordic_sand' ? '#EAE5DB' : '#E2E8F0') : 'rgba(255, 255, 255, 0.08)';
          roundRect(ctx, px, benY, pillW, pillH, 20);
          ctx.fill();

          // Texto
          ctx.fillStyle = tpl.bgType === 'light' ? (tpl.textColor || '#334155') : '#E2E8F0';
          ctx.fillText(ben, px + pillW / 2, benY + pillH / 2);
        });
      }
      ctx.restore();
    }

    // ── 7. FOOTER / LLAMADO A LA ACCIÓN (CTA) ─────────────────────────────
    ctx.save();
    const ctaY = 1590;
    const ctaH = 100;
    const ctaW = 900;
    const ctaX = (W - ctaW) / 2;
    const ctaRadius = tpl.id === 'pure_magazine' ? 18 : 50;

    // Sombra del botón CTA
    ctx.shadowColor = tpl.ctaBg.startsWith('#') ? tpl.ctaBg : tpl.primaryColor;
    ctx.shadowBlur = tpl.bgType === 'light' ? 20 : 32;
    ctx.shadowOffsetY = 8;

    // Fondo del botón
    ctx.fillStyle = tpl.ctaBg;
    roundRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaRadius);
    ctx.fill();

    // Borde brillante
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 3;
    roundRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaRadius);
    ctx.stroke();

    // Texto del CTA
    ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = tpl.ctaColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(storyData.ctaText || '📲 Toca responder para pedir por WhatsApp', W / 2, ctaY + ctaH / 2);

    // Instrucción final inferior
    ctx.font = '500 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = tpl.bgType === 'light' ? (tpl.textMuted || '#64748B') : '#64748B';
    ctx.textAlign = 'center';
    ctx.fillText('👆 Responde a esta historia para chatear con un asesor', W / 2, 1740);

    ctx.restore();
  }, [selectedTemplate, storyData, imageObject]);

  // Dibujar cada vez que cambien datos o template
  useEffect(() => {
    drawStoryCanvas();
  }, [drawStoryCanvas]);

  // Helper para esquinas redondeadas en Canvas
  function roundRect(ctx, x, y, width, height, radius) {
    if (typeof radius === 'undefined') radius = 5;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // Helper para partir texto en varias líneas
  function wrapText(ctx, text, maxWidth) {
    const words = String(text || '').split(' ');
    const lines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // 1. Descargar imagen PNG en alta definición (1080x1920)
  const handleDownloadHD = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    const safeName = (storyData.title || 'historia').toLowerCase().replace(/[^a-z0-9]/g, '-');
    link.download = `historia-9-16-${safeName}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  // 2. Copiar imagen al portapapeles
  const handleCopyToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (blob && navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        } else {
          alert('Tu navegador no soporta copiar imágenes directamente al portapapeles.');
        }
      }, 'image/png', 1.0);
    } catch {
      alert('Error al copiar al portapapeles');
    }
  };

  // 3. Usar directamente en el Publicador del Dashboard
  const handleSendToPublisher = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setPublishingToDashboard(true);

    try {
      // Exportar como JPEG de alta calidad
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

      // 1. Subir vía endpoint base64
      let finalUrl = '';
      const safeName = (storyData.title || 'historia').toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      const res = await fetch(`${apiBase}/api/media/upload-base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          base64: dataUrl,
          filename: `story_${safeName}_${Date.now()}.jpg`
        })
      });

      if (res.ok) {
        const data = await res.json();
        finalUrl = data.url;
      } else {
        // Fallback: Si el endpoint base64 no respondiera, subir como Blob FormData
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.95));
        const fd = new FormData();
        fd.append('file', blob, `story_${safeName}.jpg`);
        const res2 = await fetch(`${apiBase}/api/media/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` },
          body: fd
        });
        const d2 = await res2.json();
        finalUrl = d2.url;
      }

      if (finalUrl) {
        if (onUseInPublisher) {
          onUseInPublisher({
            mediaUrl: finalUrl,
            postType: 'historia',
            mediaType: 'image',
            caption: `🔥 ${storyData.title} 🔥\n\n💰 Precio Especial: ${storyData.currency}${storyData.price}\n${storyData.benefit1} • ${storyData.benefit2}\n\n📲 Escríbenos para ordenar el tuyo hoy.`
          });
        }
        onClose();
      } else {
        alert('No se pudo subir la imagen generada.');
      }
    } catch (err) {
      alert(`Error al procesar imagen: ${err.message}`);
    } finally {
      setPublishingToDashboard(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER DEL MODAL */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-[#FF6B00] to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Wand2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">Creador de Historias 9:16</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-[#FF6B00] border border-orange-500/30">
                  Plantilla & Precio Automático
                </span>
              </div>
              <p className="text-xs text-slate-400">Genera gráficos verticales HD con tu foto, precio y llamado a la acción listos para Instagram y WhatsApp.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL: 2 COLUMNAS */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto">
          
          {/* COLUMNA IZQUIERDA: CONTROLES & PERSONALIZACIÓN (7 COLS) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* 1. SELECCIÓN RÁPIDA DE PRODUCTO DEL CATÁLOGO */}
            {products.length > 0 && (
              <div className="space-y-2 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <ShoppingBag size={14} className="text-[#FF6B00]" /> 1. Cargar desde el catálogo:
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1.5">
                  {products.map(p => {
                    let img = p.imagen || '';
                    try { if (p.imagenes) img = (typeof p.imagenes === 'string' ? JSON.parse(p.imagenes) : p.imagenes)[0] || img; } catch { /* */ }
                    const isCurrent = storyData.title === p.nombre;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => loadProductIntoStory(p)}
                        className={`shrink-0 w-24 p-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isCurrent
                            ? 'border-[#FF6B00] bg-orange-500/10 ring-2 ring-orange-500/40'
                            : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="h-16 w-full rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center mb-1">
                          {img ? (
                            <img src={img} alt={p.nombre} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[9px] text-slate-500">Sin foto</span>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-white truncate">{p.nombre}</p>
                        <p className="text-[10px] font-black text-[#FF6B00]">Q{p.precio}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. PLANTILLAS DE DISEÑO CON FILTRO DE ESTILO */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Palette size={14} className="text-[#FF6B00]" /> 2. Estilos y Plantillas Visuales:
                </label>
                
                {/* Filtros de Categoría */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {[
                    { id: 'todos', label: 'Todos' },
                    { id: 'minimal', label: '🌿 Minimalistas' },
                    { id: 'dark', label: '🖤 Dark' },
                    { id: 'ofertas', label: '🔥 Ofertas' },
                    { id: 'premium', label: '💎 Lujo' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setTemplateCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        templateCategory === cat.id
                          ? 'bg-[#FF6B00] text-white shadow-xs'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {TEMPLATES.filter(t => templateCategory === 'todos' || t.category === templateCategory).map(t => {
                  const isSelected = selectedTemplate === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplate(t.id);
                        if (t.accentBadge) {
                          setStoryData(prev => ({ ...prev, badgeText: t.accentBadge }));
                        }
                      }}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-[#FF6B00] bg-orange-500/10 ring-2 ring-orange-500/30 shadow-md'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-white truncate flex items-center gap-1.5">
                          <span>{t.name}</span>
                        </p>
                        <span className="text-[10px] text-slate-400 font-medium block truncate">{t.badge}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="h-4 w-4 rounded-full border border-white/20 shadow-xs" style={{ background: t.primaryColor }} title="Color primario" />
                        <span className="h-4 w-4 rounded-full border border-white/20 shadow-xs" style={{ background: t.darkBg }} title="Fondo" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. CAMPOS DE TEXTO Y PRECIOS */}
            <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 space-y-3.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Tag size={14} className="text-[#FF6B00]" /> 3. Textos, Precios y Oferta:
              </label>

              {/* Título & Subtítulo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400">Título del Producto:</span>
                  <input
                    type="text"
                    value={storyData.title}
                    onChange={e => setStoryData({ ...storyData, title: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400">Subtítulo / Modelo:</span>
                  <input
                    type="text"
                    value={storyData.subtitle}
                    onChange={e => setStoryData({ ...storyData, subtitle: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              {/* Precios: Oferta vs Antes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400">Precio de Oferta:</span>
                  <div className="flex gap-1 mt-1">
                    <span className="px-2 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-black text-[#FF6B00]">Q</span>
                    <input
                      type="text"
                      value={storyData.price}
                      onChange={e => setStoryData({ ...storyData, price: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-black text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400">Precio Regular (Tachado):</span>
                  <div className="flex gap-1 mt-1">
                    <span className="px-2 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-black text-slate-400">Q</span>
                    <input
                      type="text"
                      value={storyData.oldPrice}
                      onChange={e => setStoryData({ ...storyData, oldPrice: e.target.value, showOldPrice: true })}
                      placeholder="Ej: 1,500"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-[#FF6B00]"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400">Etiqueta Superior:</span>
                  <input
                    type="text"
                    value={storyData.badgeText}
                    onChange={e => setStoryData({ ...storyData, badgeText: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              {/* Beneficios & Llamado a la acción */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div>
                  <span className="text-[9px] font-bold text-slate-400">Beneficio 1:</span>
                  <input
                    type="text"
                    value={storyData.benefit1}
                    onChange={e => setStoryData({ ...storyData, benefit1: e.target.value })}
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-white focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400">Beneficio 2:</span>
                  <input
                    type="text"
                    value={storyData.benefit2}
                    onChange={e => setStoryData({ ...storyData, benefit2: e.target.value })}
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-white focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400">Beneficio 3:</span>
                  <input
                    type="text"
                    value={storyData.benefit3}
                    onChange={e => setStoryData({ ...storyData, benefit3: e.target.value })}
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400">Botón de Llamado a la Acción (CTA):</span>
                <input
                  type="text"
                  value={storyData.ctaText}
                  onChange={e => setStoryData({ ...storyData, ctaText: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
            </div>

            {/* 4. AJUSTE DE IMAGEN Y SUBIDA MANUAL */}
            <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Layers size={14} className="text-[#FF6B00]" /> 4. Ajustar Foto del Producto:
                </label>
                <label className="text-[10px] font-bold text-[#FF6B00] hover:underline cursor-pointer flex items-center gap-1">
                  <UploadCloud size={12} />
                  <span>Subir otra foto desde PC</span>
                  <input type="file" accept="image/*" onChange={handleLocalImageUpload} className="hidden" />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Zoom / Escala:</span>
                    <span>{Math.round(storyData.imageScale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={storyData.imageScale}
                    onChange={e => setStoryData({ ...storyData, imageScale: parseFloat(e.target.value) })}
                    className="w-full accent-[#FF6B00] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Posición Vertical (Y):</span>
                    <span>{storyData.imageOffsetY}px</span>
                  </div>
                  <input
                    type="range"
                    min="-200"
                    max="200"
                    step="5"
                    value={storyData.imageOffsetY}
                    onChange={e => setStoryData({ ...storyData, imageOffsetY: parseInt(e.target.value) })}
                    className="w-full accent-[#FF6B00] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setStoryData(prev => ({ ...prev, imageScale: 1.0, imageOffsetY: 0, imageOffsetX: 0 }))}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] font-bold border border-slate-800 transition-colors cursor-pointer"
                  >
                    Centrar Foto
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* COLUMNA DERECHA: PREVIEW LIVE EN VIVO (5 COLS) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-4">
            
            <div className="w-full flex items-center justify-between px-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Eye size={14} className="text-[#FF6B00]" /> Vista Previa Historia 9:16 (HD 1080x1920)
              </span>
              {loadingImage && (
                <span className="text-[10px] text-amber-400 flex items-center gap-1 animate-pulse">
                  <RefreshCw size={10} className="animate-spin" /> Cargando foto...
                </span>
              )}
            </div>

            {/* MARCO DEL TELÉFONO / CANVA PREVIEW */}
            <div className="relative w-full max-w-[320px] aspect-[9/16] rounded-[36px] p-2 bg-slate-950 border-4 border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center">
              
              {/* Notifica / Barra de Estado Simulada */}
              <div className="absolute top-3 left-0 right-0 z-10 flex justify-between px-6 text-[9px] font-bold text-white/50 pointer-events-none">
                <span>9:41</span>
                <div className="h-3 w-16 bg-black rounded-full" />
                <span>5G 100%</span>
              </div>

              {/* Canvas 1080x1920 adaptado con CSS */}
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain rounded-[28px] shadow-inner"
                style={{ imageRendering: 'auto' }}
              />
            </div>

            {/* BOTONES DE ACCIÓN PRINCIPALES */}
            <div className="w-full max-w-[320px] space-y-2 pt-2">
              <button
                type="button"
                onClick={handleSendToPublisher}
                disabled={publishingToDashboard}
                className="w-full py-3.5 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#e56000] hover:to-orange-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-orange-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {publishingToDashboard ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Share2 size={16} />
                )}
                <span>{publishingToDashboard ? 'Preparando Publicación...' : '🚀 Usar en el Publicador'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadHD}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Descargar imagen en alta definición 1080x1920"
                >
                  <Download size={13} className="text-emerald-400" />
                  <span>Descargar HD</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyToClipboard}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Copiar imagen al portapapeles"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-amber-400" />}
                  <span>{copied ? '¡Copiado!' : 'Copiar Imagen'}</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
