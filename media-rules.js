// media-rules.js — Reglas PURAS y testeables para el envío de fotos/videos del bot.
//
// Resuelve DOS bugs reales (decididos con Fernando, 6-nov-2026):
//
// BUG 1 (foto equivocada): antes la IA copiaba el LINK de la foto desde el contexto, y a
//   veces copiaba el del producto equivocado (links con nombres opacos tipo 20260802_235421.jpg).
//   Solución: la IA ya NO copia links; solo escribe el NOMBRE del producto ([[FOTO:nombre]]) y
//   el sistema resuelve el link correcto con matchProductoPorNombre().
//
// BUG 2 (no mandaba video): el sistema veía la palabra "agotado" en las reglas (que se refería
//   a un COLOR, ej. "negro agotado") y creía que TODO el producto estaba agotado → apagaba todas
//   sus fotos y su video. Solución: mediaBloqueada() solo bloquea si el PRODUCTO está agotado de
//   verdad (campo stock) o hay una regla EXPLÍCITA de "no ofrecer"; un color agotado NO bloquea.

function norm(s) {
  return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ¿Se debe BLOQUEAR el envío de media (fotos/videos) de este producto?
//  - Un COLOR/variante "agotado" mencionado en reglas_bot NO bloquea (el producto sí existe).
//  - Solo bloquea si:
//      a) el campo STOCK indica agotado de verdad (0 / "agotado" / "sin stock" / "no hay"), o
//      b) una regla EXPLÍCITA dice no ofrecer/enviar/mostrar/vender ESTE producto.
export function mediaBloqueada(p) {
  const stock  = norm(p && p.stock);
  const reglas = norm(p && p.reglas_bot);
  const stockAgotado = /^0$|agotad|sin\s*stock|sin\s*existencia|no\s*hay/.test(stock);
  // Bloqueo por regla EXPLÍCITA de no ofrecer EL PRODUCTO (su foto/video). OJO: una regla como
  // "no ofrezcas negro ni azul" se refiere a COLORES agotados, NO al producto → NO debe apagar la
  // media (bug real 9-nov-2026: bastones dejaron de mandar foto por eso). Por eso solo bloquea si
  // el verbo negativo apunta al PRODUCTO o a la MEDIA, no a un color/variante suelto:
  //   a) pronombre de producto antes del verbo: "no LO ofrezcas", "no LA envíes", "no LOS muestres"
  //   b) objeto producto/media después del verbo: "no ofrezcas ESTE PRODUCTO", "no envíes FOTOS"
  // Un color detrás del verbo ("no ofrezcas negro") NO calza ninguno → NO bloquea.
  // (Para marcar TODO el producto como no disponible, usar el campo STOCK = agotado.)
  const verbo = '(?:ofrezcas|ofrecer|ofrescas|muestres|mostrar|env[ií]es|enviar|mandes|mandar|vendas|vender)';
  const objProd = '(?:este|esta|esto|producto|art[ií]culo|modelo|item|foto|fotos|imagen|im[aá]genes|imagenes|video|videos|nada)';
  const reglaNoOfrecer =
        new RegExp('\\bno\\s+(?:la|lo|los|las|le|les)\\s+' + verbo + '\\b').test(reglas) ||
        new RegExp('\\bno\\s+' + verbo + '\\s+' + objProd + '\\b').test(reglas);
  return stockAgotado || reglaNoOfrecer;
}

// Empareja el NOMBRE que la IA escribió en [[FOTO:...]] con el mejor producto del catálogo.
// Devuelve el producto o null (null = no mandar foto; mejor nada que la equivocada).
export function matchProductoPorNombre(nombre, productos) {
  const q = norm(nombre).replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q || !Array.isArray(productos) || productos.length === 0) return null;

  const GEN = new Set(['de', 'la', 'el', 'los', 'las', 'para', 'con', 'modelo', 'o', 'y', 'un', 'una', 'del']);
  const qTok = q.split(' ').filter(t => t.length > 2 && !GEN.has(t));
  const qModelo = (q.match(/modelo\s*(\d+)/) || [])[1];

  let best = null, bestScore = 0;
  for (const p of productos) {
    const n = norm(p && p.nombre).replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!n) continue;
    let score = 0;
    if (n === q) score += 1000;                         // match exacto normalizado
    const nModelo = (n.match(/modelo\s*(\d+)/) || [])[1];
    if (qModelo && nModelo) { score += (qModelo === nModelo) ? 20 : -15; } // "modelo 1" ≠ "modelo 2"
    for (const t of qTok) { if (n.includes(t)) score += (t.length > 4 ? 4 : 2); }
    if (score > bestScore) { bestScore = score; best = p; }
  }
  // Umbral mínimo: al menos una palabra distintiva calzó (evita devolver cualquier cosa).
  return bestScore >= 2 ? best : null;
}

// ¿Es una URL que WhatsApp acepta como FOTO? (jpg/jpeg/png/jfif; NO webp, NO .mp4, NO /product/)
export function esFotoEnviable(url) {
  const u = String(url || '');
  return /\.(jpg|jpeg|png|jfif)(\?.*)?$/i.test(u) && !/\.webp(\?|$)/i.test(u) && !/\/product\//i.test(u);
}
