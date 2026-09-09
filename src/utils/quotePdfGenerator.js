import { jsPDF } from 'jspdf';
import { ONE_CONTROL_LOGO_BASE64 } from '../assets/logoBase64.js';

const fmtQ = (n) => new Intl.NumberFormat('es-GT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(parseFloat(n) || 0);

/**
 * Genera un PDF profesional membretado para cotizaciones de OneControl.
 * Devuelve { blob, file, filename, quoteNum } listo para enviar por WhatsApp o descargar.
 */
export function generateQuotePdf({
  selectedLead = {},
  items = [],
  subtotal = 0,
  discountAmount = 0,
  total = 0,
  presetNotes = {},
  customNotes = ''
}) {
  const doc = new jsPDF({ format: 'letter', unit: 'pt' });
  const dateStr = new Date().toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const quoteNum = `COT-${Math.floor(100000 + Math.random() * 900000)}`;
  const cleanClientName = (selectedLead?.nombre || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Cotizacion-${quoteNum}-${cleanClientName}.pdf`;

  const activePresets = Object.entries(presetNotes || {})
    .filter(([_, active]) => active)
    .map(([k]) => k);

  // 1. Barra superior naranja (#FF6B00)
  doc.setFillColor(255, 107, 0);
  doc.rect(40, 26, 532, 4, 'F');

  // 2. Encabezado: Logotipo oficial de OneControl
  try {
    // Logo 1024x682 (ratio 1.5). Ancho: 82 pt, Alto: 54.7 pt
    doc.addImage(ONE_CONTROL_LOGO_BASE64, 'PNG', 40, 34, 82, 54.7);
  } catch (err) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text('ONE', 40, 56);
    doc.setTextColor(255, 107, 0);
    doc.text('CONTROL', 90, 56);
  }

  // Información de la empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Automatización de Portones y Control de Acceso', 132, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PBX / WhatsApp: +502 5965-8803  •  Guatemala  •  www.onecontrol.shop', 132, 62);
  doc.text('Soluciones Inteligentes Residenciales y Comerciales', 132, 73);
  doc.text('Garantía Oficial de 1 Año en Motores y Equipos', 132, 84);

  // 3. Metadatos de la Cotización (a la derecha)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('COTIZACIÓN FORMAL', 572, 48, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Nº: ${quoteNum}`, 572, 61, { align: 'right' });
  doc.text(`Fecha: ${dateStr}`, 572, 73, { align: 'right' });

  // Badge de validez
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(476, 80, 96, 14, 3, 3, 'FD');
  doc.setTextColor(180, 83, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('VÁLIDA POR 15 DÍAS', 524, 90, { align: 'center' });

  // 4. Línea divisoria
  let y = 98;
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(1);
  doc.line(40, y, 572, y);

  // 5. Tarjeta de Datos del Cliente
  y = 106;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(40, y, 532, 50, 5, 5, 'FD');

  // Columna 1: Cliente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('CLIENTE', 52, y + 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(String(selectedLead?.nombre || 'Consumidor Final').slice(0, 36), 52, y + 27);

  // Columna 2: Teléfono / WhatsApp
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('TELÉFONO / WHATSAPP', 250, y + 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(String(selectedLead?.phone || '—'), 250, y + 27);

  // Columna 3: NIT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('NIT', 460, y + 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(String(selectedLead?.nit || 'CF'), 460, y + 27);

  // Fila inferior de la tarjeta: Ubicación
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const locationStr = selectedLead?.direccion || selectedLead?.zona || 'Ciudad de Guatemala';
  doc.text(`Ubicación: ${locationStr}`, 52, y + 41);

  // 6. Tabla de Productos y Equipos
  y = 178;
  // Encabezado tabla
  doc.setFillColor(15, 23, 42);
  doc.rect(40, y, 532, 20, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPCIÓN / EQUIPO', 50, y + 13);
  doc.text('CANT.', 345, y + 13, { align: 'center' });
  doc.text('PRECIO UNIT.', 455, y + 13, { align: 'right' });
  doc.text('SUBTOTAL', 562, y + 13, { align: 'right' });

  y += 20;

  // Filas de productos
  items.forEach((it, idx) => {
    const isEven = idx % 2 === 0;

    // Medir líneas de nombre y descripción ajustadas a la columna (máx 265 pt)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const nameLines = it.name ? doc.splitTextToSize(String(it.name), 265) : ['Producto'];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const descLines = (it.description && String(it.description).trim())
      ? doc.splitTextToSize(String(it.description).trim(), 265)
      : [];

    const nameLineH = 11;
    const descLineH = 9.5;
    const nameHeight = nameLines.length * nameLineH;
    const descHeight = descLines.length > 0 ? (descLines.length * descLineH + 2) : 0;
    const totalContentHeight = nameHeight + descHeight;
    const rowHeight = Math.max(24, 10 + totalContentHeight + 6);

    // Salto de página automático si se acerca al pie
    if (y + rowHeight > 710) {
      doc.addPage('letter');
      y = 40;
      doc.setFillColor(15, 23, 42);
      doc.rect(40, y, 532, 20, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('DESCRIPCIÓN / EQUIPO', 50, y + 13);
      doc.text('CANT.', 345, y + 13, { align: 'center' });
      doc.text('PRECIO UNIT.', 455, y + 13, { align: 'right' });
      doc.text('SUBTOTAL', 562, y + 13, { align: 'right' });
      y += 20;
    }

    // Fondo fila
    doc.setFillColor(isEven ? 255 : 250, isEven ? 255 : 251, isEven ? 255 : 252);
    doc.rect(40, y, 532, rowHeight, 'F');

    // Línea inferior separadora
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.8);
    doc.line(40, y + rowHeight, 572, y + rowHeight);

    // Renderizar Nombre de Producto (multilínea, no se desborda)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    let textY = y + 12;
    nameLines.forEach((line) => {
      doc.text(line, 50, textY);
      textY += nameLineH;
    });

    // Renderizar Descripción si existe (multilínea debajo del nombre)
    if (descLines.length > 0) {
      textY += 1;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      descLines.forEach((line) => {
        doc.text(line, 50, textY);
        textY += descLineH;
      });
    }

    // Cantidad (centrado, alineado con la primera línea)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(it.qty), 345, y + 12, { align: 'center' });

    // Precio Unitario (derecha, alineado con la primera línea)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Q${fmtQ(it.unit_price)}`, 455, y + 12, { align: 'right' });

    // Subtotal (derecha, alineado con la primera línea)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Q${fmtQ(it.qty * it.unit_price)}`, 562, y + 12, { align: 'right' });

    y += rowHeight;
  });

  // 7. Totales (Alineados a la derecha)
  if (y + 60 > 710) {
    doc.addPage('letter');
    y = 40;
  } else {
    y += 10;
  }
  const totalsLeft = 360;

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', 470, y, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Q${fmtQ(subtotal)}`, 562, y, { align: 'right' });

  // Descuento si aplica
  if (discountAmount > 0) {
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(234, 88, 12);
    doc.text('Descuento aplicado:', 470, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`- Q${fmtQ(discountAmount)}`, 562, y, { align: 'right' });
  }

  // Línea gruesa antes de Total
  y += 7;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1.5);
  doc.line(totalsLeft, y, 572, y);

  // TOTAL
  y += 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL:', 470, y, { align: 'right' });
  doc.setFontSize(14);
  doc.setTextColor(255, 107, 0); // #FF6B00
  doc.text(`Q${fmtQ(total)}`, 562, y, { align: 'right' });

  // 8. Términos y Garantías (Caja inferior con diseño y ajuste de texto)
  if (activePresets.length > 0 || (customNotes && customNotes.trim())) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    const allTermsLines = [];
    activePresets.forEach(preset => {
      const wrapped = doc.splitTextToSize(`•  ${preset}`, 505);
      allTermsLines.push(...wrapped);
    });

    if (customNotes && customNotes.trim()) {
      const wrapped = doc.splitTextToSize(`•  ${customNotes.trim()}`, 505);
      allTermsLines.push(...wrapped);
    }

    const boxH = 24 + (allTermsLines.length * 11.5) + 6;

    if (y + boxH > 730) {
      doc.addPage('letter');
      y = 40;
    } else {
      y += 18;
    }

    doc.setFillColor(255, 251, 245);
    doc.setDrawColor(254, 215, 170);
    doc.setLineWidth(1);
    doc.roundedRect(40, y, 532, boxH, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(234, 88, 12);
    doc.text('TÉRMINOS DE LA OFERTA Y GARANTÍA:', 52, y + 14);

    let ty = y + 26;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);

    allTermsLines.forEach(line => {
      doc.text(line, 54, ty);
      ty += 11.5;
    });

    y += boxH;
  }

  // 9. Pie de página formal en todas las páginas generadas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'OneControl Guatemala  •  PBX / WhatsApp: +502 5965-8803  •  ¡Gracias por su preferencia!',
      306,
      765,
      { align: 'center' }
    );
    if (totalPages > 1) {
      doc.text(`Página ${i} de ${totalPages}`, 562, 765, { align: 'right' });
    }
  }

  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  return { blob, file, filename, quoteNum };
}
