// pedido-parse.js — Parsers PUROS para armar el pedido automático del bot.
//
// Problema que resuelve: antes el pedido se guardaba SIEMPRE con cantidad "1" y el
// precio de UNA unidad del catálogo (ignoraba cuántos pidió el cliente y el total que
// el bot ya cotizó en el chat, incluido el par con descuento y el envío).
//
// Estas funciones NO inventan montos: sacan la cantidad de lo que dijo el CLIENTE y el
// total SOLO cuando el BOT lo dijo explícito; además devuelven todos los montos que el
// bot mencionó para dejarlos como nota (par, envío, etc.) y que el dueño los vea.

function norm(s) {
  return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// número en palabra → valor
const NUM_PAL = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };

// sustantivos de "unidad" que pueden seguir a un número (controles, bastones, etc.)
const UNID = '(unidad(?:es)?|control(?:es)?|remoto(?:s)?|pieza(?:s)?|baston(?:es)?|mesa(?:s)?|mesita(?:s)?|juego(?:s)?|motor(?:es)?|kit(?:s)?|fotocelda(?:s)?|botonera(?:s)?)';

// Extrae la cantidad pedida de los mensajes del CLIENTE (texto concatenado).
// Devuelve entero >= 1 (default 1). Evita confundir precios ("Q300"), teléfonos,
// y direcciones ("8 calle", "zona 10") porque exige un sustantivo de unidad o una
// palabra de intención de compra junto al número.
export function parseCantidad(clientText) {
  const t = norm(clientText);
  let cant = 0;

  // "el par" / "un par" / "la pareja" / "los dos" / "ambos/ambas" → 2 ; "docena" → 12
  if (/\b(el|un|los|las|la)\s+(par|pareja)\b/.test(t) || /\blos\s+dos\b/.test(t) || /\bamb[oa]s\b/.test(t)) cant = Math.max(cant, 2);
  if (/\bdocena\b/.test(t)) cant = Math.max(cant, 12);

  // número (dígito) + sustantivo de unidad:  "2 unidades", "3 controles"
  let m;
  const reDig = new RegExp('\\b(\\d{1,3})\\s+' + UNID, 'g');
  while ((m = reDig.exec(t)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 50) cant = Math.max(cant, n);
  }

  // número en palabra + sustantivo de unidad:  "dos controles"
  const rePal = new RegExp('\\b(' + Object.keys(NUM_PAL).join('|') + ')\\s+' + UNID, 'g');
  while ((m = rePal.exec(t)) !== null) cant = Math.max(cant, NUM_PAL[m[1]] || 0);

  // intención de compra + número suelto:  "quiero 2", "me llevo 3", "serían 2"
  const reIntent = /\b(quiero|llevo|me\s+llevo|me\s+lo\s+llevo|necesito|dame|me\s+da|ser[ia]n?|son)\s+(\d{1,3})\b/g;
  while ((m = reIntent.exec(t)) !== null) {
    const n = parseInt(m[2], 10);
    if (n >= 1 && n <= 50) cant = Math.max(cant, n);
  }

  return cant >= 1 ? cant : 1;
}

// Extrae montos en quetzales citados por el BOT.
// Devuelve { total, montos:[...] }:
//  - total: un "total ... QX" / "serían QX" / "son QX" EXPLÍCITO (null si no lo dijo; no inventa).
//  - montos: todos los Q que mencionó (para dejar nota: par, envío, etc.).
export function parseMontosBot(botText) {
  const t = norm(botText);
  const montos = [];
  const reQ = /q\s?\.?\s?([0-9][0-9.,]*)/g;
  let m;
  while ((m = reQ.exec(t)) !== null) {
    const val = parseFloat(m[1].replace(/,/g, '')); // "1,500" → 1500 ; "120" → 120
    if (!isNaN(val) && val > 0) montos.push(val);
  }
  let total = null;
  const reTotal = /(total|ser[ií]an?|son|quedar[ií]a\s+en|a\s+pagar)[^q]{0,25}q\s?\.?\s?([0-9][0-9.,]*)/i;
  const mt = reTotal.exec(t);
  if (mt) {
    const val = parseFloat(mt[2].replace(/,/g, ''));
    if (!isNaN(val) && val > 0) total = val;
  }
  return { total, montos: [...new Set(montos)] };
}

// Formatea un número como "Q120" o "Q120.50".
export function fmtQ(n) {
  if (n == null || isNaN(n)) return '';
  return 'Q' + (Number.isInteger(n) ? String(n) : n.toFixed(2));
}
