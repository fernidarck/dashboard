import { jsPDF } from 'jspdf';

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
  doc.rect(40, 32, 532, 4, 'F');

  // 2. Encabezado: Logotipo / Nombre de la empresa
  let y = 56;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // #0F172A
  doc.text('ONE', 40, y);
  doc.setTextColor(255, 107, 0); // #FF6B00
  doc.text('CONTROL', 90, y);

  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // #64748B
  doc.text('Automatización de Portones y Control de Acceso Inteligente', 40, y);
  y += 11;
  doc.text('PBX / WhatsApp: +502 5965-8803  |  Guatemala  |  www.onecontrol.shop', 40, y);

  // 3. Metadatos de la Cotización (a la derecha)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('COTIZACIÓN FORMAL', 572, 56, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Nº: ${quoteNum}`, 572, 69, { align: 'right' });
  doc.text(`Fecha: ${dateStr}`, 572, 81, { align: 'right' });

  // Badge de validez
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(476, 88, 96, 14, 3, 3, 'FD');
  doc.setTextColor(180, 83, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('VÁLIDA POR 15 DÍAS', 524, 98, { align: 'center' });

  // 4. Línea divisoria
  y = 108;
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(1);
  doc.line(40, y, 572, y);

  // 5. Tarjeta de Datos del Cliente
  y = 116;
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
    const descLines = it.description ? doc.splitTextToSize(it.description, 270) : [];
    const rowHeight = Math.max(22, 16 + (descLines.length * 9));

    // Fondo fila
    doc.setFillColor(isEven ? 255 : 250, isEven ? 255 : 251, isEven ? 255 : 252);
    doc.rect(40, y, 532, rowHeight, 'F');

    // Línea inferior
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.8);
    doc.line(40, y + rowHeight, 572, y + rowHeight);

    // Nombre producto
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(it.name || 'Producto', 50, y + 12);

    // Descripción debajo si existe
    if (descLines.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(descLines, 50, y + 21);
    }

    // Cantidad (centrado)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(it.qty), 345, y + 13, { align: 'center' });

    // Precio Unitario (derecha)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Q${fmtQ(it.unit_price)}`, 455, y + 13, { align: 'right' });

    // Subtotal (derecha)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Q${fmtQ(it.qty * it.unit_price)}`, 562, y + 13, { align: 'right' });

    y += rowHeight;
  });

  // 7. Totales (Alineados a la derecha)
  y += 10;
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

  // 8. Términos y Garantías (Caja inferior con diseño)
  if (activePresets.length > 0 || (customNotes && customNotes.trim())) {
    y += 24;
    const termsCount = activePresets.length + (customNotes && customNotes.trim() ? 1 : 0);
    const boxH = 26 + (termsCount * 13);

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

    activePresets.forEach(preset => {
      doc.text(`•  ${preset}`, 54, ty);
      ty += 12;
    });

    if (customNotes && customNotes.trim()) {
      doc.text(`•  ${customNotes.trim()}`, 54, ty);
      ty += 12;
    }

    y += boxH;
  }

  // 9. Pie de página formal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'OneControl Guatemala  •  PBX / WhatsApp: +502 5965-8803  •  ¡Gracias por su preferencia!',
    306,
    765,
    { align: 'center' }
  );

  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  return { blob, file, filename, quoteNum };
}
