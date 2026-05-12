import express from 'express';
import cors from 'cors';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import pdf from 'pdf-parse';
import fs from 'fs';
import * as XLSX from 'xlsx';


process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
  process.exit(1);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🚀 SERVER VERSION: 1.0.4 (FIXED SYNTAX) - Iniciando servidor del Dashboard...");
const app = express();
const port = process.env.PORT || 3000;
const N8N_OUTBOUND_WEBHOOK = process.env.N8N_OUTBOUND_WEBHOOK || "https://appn8n-n8n.83aqlq.easypanel.host/webhook/send-message";

console.log(`📌 Puerto detectado: ${port}`);
console.log(`📌 Webhook detectado: ${N8N_OUTBOUND_WEBHOOK}`);

app.use(cors());
app.use(express.json());

// Logger de peticiones (Para depuración en logs de EasyPanel)
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// --- HEALTH CHECK (Para EasyPanel) ---
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Ruta raíz explícita
app.get('/', (req, res, next) => {
  const indexPath = join(process.cwd(), 'dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next(); // Pasar a static o error
  }
});

// --- CONFIGURACIÓN DE ARCHIVOS (RAG) ---
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
const upload = multer({ dest: 'uploads/' });
const productImagesUpload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
    }
  })
});


// --- INICIALIZACIÓN DE BD ---
let db;

async function setup() {
  try {
    console.log("📦 Diagnóstico inicial...");
    console.log(`   - Directorio actual: ${process.cwd()}`);
    console.log(`   - Variables de entorno: PORT=${process.env.PORT}, DATA_DIR=${process.env.DATA_DIR}`);

    const dataDir = process.env.DATA_DIR || './data';
    console.log(`📂 Configurando directorio de datos: ${dataDir}`);

    if (!fs.existsSync(dataDir)) {
      console.log(`   - Creando directorio ${dataDir}...`);
      fs.mkdirSync(dataDir, { recursive: true });
    } else {
      console.log(`   - El directorio ${dataDir} ya existe.`);
    }

    const dbFile = join(dataDir, 'database.sqlite');
    console.log(`🗄️ Archivo de base de datos: ${dbFile}`);
    
    const isNew = !fs.existsSync(dbFile);
    if (isNew) {
      console.log("   - Base de datos no encontrada. Verificando migración...");
      if (fs.existsSync('./database.sqlite')) {
        console.log("   🚚 Migrando database.sqlite desde el root...");
        fs.copyFileSync('./database.sqlite', dbFile);
      } else {
        console.log("   - Iniciando con base de datos limpia.");
      }
    }

    console.log("🔌 Conectando a SQLite...");
    db = await open({
      filename: dbFile,
      driver: sqlite3.Database
    });
    console.log("✅ Conexión establecida.");

    console.log("🏗️ Asegurando tablas...");
    
    // Diagnóstico de Frontend
    const distPath = join(__dirname, 'dist');
    console.log(`📂 Verificando archivos estáticos en: ${distPath}`);
    if (fs.existsSync(distPath)) {
      const files = fs.readdirSync(distPath);
      console.log(`   ✅ Carpeta dist encontrada. Archivos: ${files.join(', ')}`);
    } else {
      console.log(`   ⚠️ ADVERTENCIA: Carpeta dist NO encontrada. El frontend no cargará.`);
    }

    await db.exec(`CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      phone TEXT,
      email TEXT,
      score INTEGER,
      estado TEXT,
      origen TEXT,
      time TEXT,
      botActive BOOLEAN,
      motor TEXT,
      falla TEXT,
      zona TEXT,
      priority TEXT DEFAULT 'normal',
      handoff_reason TEXT,
      direccion TEXT,
      notas TEXT,
      nit TEXT
    )`);

    // Migración: añadir columnas nuevas si no existen
    try { await db.exec(`ALTER TABLE leads ADD COLUMN priority TEXT DEFAULT 'normal'`); } catch(_) {}
    try { await db.exec(`ALTER TABLE leads ADD COLUMN handoff_reason TEXT`); } catch(_) {}
    try { await db.exec(`ALTER TABLE leads ADD COLUMN direccion TEXT`); } catch(_) {}
    try { await db.exec(`ALTER TABLE leads ADD COLUMN notas TEXT`); } catch(_) {}
    try { await db.exec(`ALTER TABLE leads ADD COLUMN nit TEXT`); } catch(_) {}
    try { await db.exec(`ALTER TABLE leads ADD COLUMN etiquetas TEXT`); } catch(_) {}
    try { await db.exec(`ALTER TABLE leads ADD COLUMN whatsapp_id TEXT`); } catch(_) {}
    try { await db.exec(`ALTER TABLE leads ADD COLUMN archived INTEGER DEFAULT 0`); } catch(_) {}
    try { await db.exec(`ALTER TABLE products ADD COLUMN imagen TEXT`); } catch(_) {}
    try { await db.exec(`ALTER TABLE products ADD COLUMN catalog_link TEXT`); } catch(_) {}

    await db.exec(`CREATE TABLE IF NOT EXISTS knowledge_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT,
      content TEXT,
      source_lead_id INTEGER,
      frequency INTEGER DEFAULT 1,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending' -- pending, approved, ignored
    )`);

    await db.exec(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      precio TEXT,
      categoria TEXT DEFAULT 'General',
      stock TEXT DEFAULT 'En stock',
      activo INTEGER DEFAULT 1,
      timestamp TEXT
    )`);

    await db.exec(`CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      category TEXT,
      content TEXT,
      timestamp TEXT
    )`);

    await db.exec(`CREATE TABLE IF NOT EXISTS agenda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT,
      hora TEXT,
      cliente TEXT,
      phone TEXT,
      servicio TEXT,
      duracion TEXT,
      estado TEXT,
      day INTEGER
    )`);

    await db.exec(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      sender TEXT,
      text TEXT,
      mediaUrl TEXT,
      mediaType TEXT,
      timestamp TEXT
    )`);

    await db.exec(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);

    await db.exec(`CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente TEXT,
      phone TEXT,
      producto TEXT,
      cantidad TEXT DEFAULT '1',
      precio TEXT,
      notas TEXT,
      estado TEXT DEFAULT 'Nuevo',
      timestamp TEXT
    )`);
    try { await db.exec(`ALTER TABLE pedidos ADD COLUMN precio TEXT`); } catch(_) {}
    try { await db.exec(`ALTER TABLE pedidos ADD COLUMN notas TEXT`); } catch(_) {}

    // --- MIGRACIONES ---
    console.log("🛠️ Verificando migraciones de tabla...");
    const columns = await db.all("PRAGMA table_info(messages)");
    const hasMediaUrl = columns.some(c => c.name === 'mediaUrl');
    if (!hasMediaUrl) {
      console.log("   - Añadiendo columnas de multimedia a la tabla 'messages'...");
      try {
        await db.exec("ALTER TABLE messages ADD COLUMN mediaUrl TEXT");
        await db.exec("ALTER TABLE messages ADD COLUMN mediaType TEXT");
        console.log("   ✅ Migración completada.");
      } catch (e) {
        console.error("   ❌ Error en migración:", e.message);
      }
    }

    console.log("⚙️ Configurando valores por defecto...");
    const defaultPrompts = {
      'prompt_recepcionista': 'Eres el Agente Recepcionista de OneControl. Tu objetivo es saludar cordialmente, identificar la necesidad del cliente y derivarlo al departamento correcto o agendar una cita básica.',
      'prompt_ventas': 'Eres el Agente de Ventas de OneControl. Eres experto en portones eléctricos y motores. Tu objetivo es cerrar ventas, dar precios y convencer al cliente con beneficios técnicos.',
      'prompt_soporte': 'Eres el Agente de Soporte Técnico de OneControl. Ayudas a los clientes con fallas en sus motores o dudas de instalación de forma paciente y técnica.',
      'handoff_triggers': JSON.stringify([
        { keywords: "agente,asesor,humano,persona real,hablar con alguien,operador,quiero hablar", reason: "Solicitud de agente humano" },
        { keywords: "molesto,enojado,frustrado,queja,quiero quejarme,mala atención,pésimo", reason: "Frustración / Queja detectada" },
        { keywords: "urgente,emergencia,para ya,ahora mismo,no funciona,se rompió,accidente", reason: "Urgencia / Emergencia" },
        { keywords: "no me entiendes,no entiendo,robot,bot inutil", reason: "Confusión con el bot" },
        { keywords: "cuánto cuesta,precio,presupuesto,cotización,quiero comprar,pagar,listo para", reason: "Intención de compra alta" }
      ])
    };

    for (const [key, value] of Object.entries(defaultPrompts)) {
      const check = await db.get("SELECT value FROM settings WHERE key = ?", key);
      if (!check) {
        await db.run("INSERT INTO settings (key, value) VALUES (?, ?)", key, value);
      }
    }

    const leadCount = await db.get("SELECT COUNT(*) as count FROM leads");
    if (leadCount && leadCount.count === 0) {
      console.log("📝 Insertando datos de ejemplo...");
      await db.run("INSERT INTO leads (nombre, phone, email, score, estado, origen, time, botActive, motor, falla, zona) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
        'Erik Manuel Taveras', '15613744309', 'eriktaveras@gmail.com', 20, 'Nuevo', 'WhatsApp', '10:30 AM', 1, 'N/A', 'N/A', 'N/A');
    }

    console.log("✅ Base de datos lista");
  } catch (err) {
    console.error("❌ ERROR CRÍTICO EN SETUP():", err);
    throw err; // Re-lanzar para que lo atrape el catch global
  }
}

// --- ENDPOINTS API ---

app.get('/api/leads', async (_req, res) => {
  try {
    const rows = await db.all(`
      SELECT leads.*,
             (SELECT text FROM messages WHERE lead_id = leads.id ORDER BY id DESC LIMIT 1) as lastMessage,
             (SELECT id FROM messages WHERE lead_id = leads.id ORDER BY id DESC LIMIT 1) as lastMessageId,
             (SELECT sender FROM messages WHERE lead_id = leads.id ORDER BY id DESC LIMIT 1) as lastMessageSender,
             (SELECT timestamp FROM messages WHERE lead_id = leads.id ORDER BY id DESC LIMIT 1) as lastMessageTime
      FROM leads ORDER BY leads.id DESC
    `);
    const parsedRows = rows.map(r => ({
      ...r,
      botActive: !!r.botActive,
      captura: { motor: r.motor, falla: r.falla, zona: r.zona }
    }));
    res.json(parsedRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/agenda', async (_req, res) => {
  try {
    const rows = await db.all("SELECT * FROM agenda ORDER BY fecha ASC, hora ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agenda', async (req, res) => {
  try {
    const { fecha, hora, cliente, phone, servicio, duracion } = req.body;
    if (!fecha || !cliente || !phone) return res.status(400).json({ error: "Faltan datos de la cita" });

    const day = parseInt(fecha.split('-')[2]); 
    await db.run("INSERT INTO agenda (fecha, hora, cliente, phone, servicio, duracion, estado, day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
      fecha, hora || "Pendiente", cliente, phone, servicio || "Revisión", duracion || "1 hora", 'Confirmado', day);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PROXY PARA IMÁGENES (Para saltar bloqueos de seguridad/privacidad) ---
app.get('/api/proxy-media', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send("Falta URL");

    console.log(`🖼️ Proxying media: ${url.substring(0, 50)}...`);
    
    const response = await fetch(url, {
      headers: {
        'X-API-Key': 'a25aaba6428e12e4df6310296f675272' // Usando la key detectada en tu n8n
      }
    });

    if (!response.ok) throw new Error(`Error YCloud: ${response.status}`);

    const contentType = response.headers.get('content-type');
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("❌ Error en proxy-media:", err.message);
    res.status(500).send("Error cargando medio");
  }
});

// ─── MOTOR DE DETECCIÓN DE ESTADO AUTOMÁTICO ───────────────────────────────
const STATUS_FUNNEL = ['Nuevo', 'Interesado', 'Cita Agendada', 'Venta', 'Post-Venta', 'Perdido', 'Intervención Requerida'];
const STATUS_SCORES = {
  'Nuevo': 10,
  'Interesado': 40,
  'Cita Agendada': 75,
  'Venta': 100,
  'Post-Venta': 100,
  'Perdido': 0,
  'Intervención Requerida': 85
};

function detectStatus(text, currentStatus) {
  if (!text || typeof text !== 'string') return currentStatus;
  const t = text.toLowerCase();
  const getRank = (s) => STATUS_FUNNEL.indexOf(s);
  
  let detected = currentStatus;

  // Prioridad: Venta / Pago
  if (t.includes("pago") || t.includes("comprobante") || t.includes("transferencia") || t.includes("deposito") || t.includes("ya pagué") || t.includes("listo el deposito")) {
    detected = "Venta";
  }
  // Prioridad: Cita / Visita
  else if (t.includes("agendar") || t.includes("cita") || t.includes("reunión") || t.includes("visita") || t.includes("mañana a las") || t.includes("llegar a") || t.includes("ubicación")) {
    detected = "Cita Agendada";
  }
  // Prioridad: Interés / Precio
  else if (t.includes("precio") || t.includes("cuánto") || t.includes("costo") || t.includes("presupuesto") || t.includes("cotización") || t.includes("me interesa") || t.includes("información")) {
    if (getRank(currentStatus) < getRank("Interesado")) detected = "Interesado";
  }
  // Prioridad: Post-Venta (solo si ya vendió)
  else if (t.includes("gracias") || t.includes("instalado") || t.includes("quedó bien") || t.includes("funciona")) {
    if (getRank(currentStatus) >= getRank("Venta")) detected = "Post-Venta";
  }
  // Prioridad: Perdido
  else if (t.includes("no gracias") || t.includes("muy caro") || t.includes("no me interesa") || t.includes("caro") || t.includes("después")) {
    detected = "Perdido";
  }

  // Avanzar en el funnel o marcar como perdido
  if (getRank(detected) > getRank(currentStatus) || detected === 'Perdido') {
    return detected;
  }
  
  return currentStatus;
}

// ─── MOTOR DE DETECCIÓN DE HANDOFF INTELIGENTE (dinámico desde BD) ────────────
async function detectHandoff(text) {
  if (!text) return null;
  try {
    const row = await db.get("SELECT value FROM settings WHERE key = 'handoff_triggers'");
    const triggers = row ? JSON.parse(row.value) : [];
    for (const trigger of triggers) {
      const keywords = trigger.keywords.split(',').map(k => k.trim()).filter(Boolean);
      for (const kw of keywords) {
        if (text.toLowerCase().includes(kw.toLowerCase())) return trigger.reason;
      }
    }
  } catch(_) {}
  return null;
}

// GET /api/handoff/triggers — devuelve las reglas actuales
app.get('/api/handoff/triggers', async (_req, res) => {
  try {
    const row = await db.get("SELECT value FROM settings WHERE key = 'handoff_triggers'");
    res.json(row ? JSON.parse(row.value) : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/handoff/triggers — guarda las reglas editadas
app.post('/api/handoff/triggers', async (req, res) => {
  try {
    const triggers = req.body;
    if (!Array.isArray(triggers)) return res.status(400).json({ error: "Se esperaba un array" });
    await db.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      'handoff_triggers', JSON.stringify(triggers));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ────────────────────────────────────────────────────────────────────────────

app.post('/webhook/n8n', async (req, res) => {
  const data = req.body;
  console.log("🔍 CUERPO RECIBIDO DESDE N8N:", JSON.stringify(data, null, 2));

  if (!data.phone) {
    return res.status(400).json({ error: "Falta el campo 'phone'" });
  }

  const nombre = data.nombre || "Cliente Nuevo";
  const email = data.email || "N/A";
  const score = data.score || 50;
  const estado = data.etiqueta || "Nuevo";
  const origen = "WhatsApp (n8n)";
  const now = new Date();
  const guateTime = new Date(now.getTime() - (6 * 60 * 60 * 1000));
  const time = guateTime.getUTCHours().toString().padStart(2, '0') + ':' + guateTime.getUTCMinutes().toString().padStart(2, '0') + (guateTime.getUTCHours() >= 12 ? ' PM' : ' AM');
  const motor = data.motor || "N/A";
  const falla = data.falla || "N/A";
  const zona = data.zona || "N/A";

  try {
    const cleanPhone = String(data.phone).replace(/\D/g, '');
    const mensajePrincipal = data.mensaje || data.respuesta_cliente || data.mensaje_cliente || data.texto_cliente || data.client_message;
    const mensajeSecundario = data.respuesta_bot || data.texto_limpio || data.bot_response || data.output;

    console.log(`🔍 Buscando contacto para número normalizado: ${cleanPhone}`);
    const existingLead = await db.get("SELECT id, nombre, estado, score FROM leads WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?", cleanPhone);
    
    let currentEstado = data.etiqueta || (existingLead ? existingLead.estado : "Nuevo");
    let detectedEstado = detectStatus(mensajePrincipal, currentEstado);
    detectedEstado = detectStatus(mensajeSecundario, detectedEstado);
    
    const finalEstado = detectedEstado;
    const finalScore = STATUS_SCORES[finalEstado] || data.score || (existingLead ? existingLead.score : 10);

    let leadId;

    if (existingLead) {
      console.log(`   ✅ Lead existente encontrado: ID ${existingLead.id} (nombre: ${existingLead.nombre})`);
      
      const updates = ["estado = ?", "score = ?", "time = ?"];
      const params = [finalEstado, finalScore, time];

      if (data.bot_apagado !== undefined) {
        updates.push("botActive = ?");
        params.push(data.bot_apagado ? 0 : 1);
      }

      // Actualizar campos si vienen en el payload o si el nombre es genérico
      const genericNames = ['cliente nuevo', 'cliente', 'new client', 'unknown', 'reach'];
      const isGeneric = (n) => !n || genericNames.includes(String(n).toLowerCase().trim());
      
      if (!isGeneric(nombre) && isGeneric(existingLead.nombre)) { updates.push("nombre = ?"); params.push(nombre); }
      if (data.direccion) { updates.push("direccion = ?"); params.push(data.direccion); }
      if (data.notas) { updates.push("notas = ?"); params.push(data.notas); }
      if (data.nit) { updates.push("nit = ?"); params.push(data.nit); }
      
      params.push(existingLead.id);
      await db.run(`UPDATE leads SET ${updates.join(", ")} WHERE id = ?`, ...params);
      console.log(`   ✏️ Lead ${existingLead.id} actualizado: Estado=${finalEstado}, Score=${finalScore}`);
      
      leadId = existingLead.id;
    } else {
      console.log("   🆕 Creando nuevo lead...");
      const result = await db.run(`INSERT INTO leads (nombre, phone, email, score, estado, origen, botActive, motor, falla, zona, direccion, notas, nit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        nombre, data.phone, email, finalScore, finalEstado, origen, 1, motor, falla, zona, data.direccion || null, data.notas || null, data.nit || null);
      leadId = result.lastID;
    }

    const normalize = (t) => t ? String(t).replace(/\s+/g, ' ').trim().toLowerCase() : "";

    const saveSmartMessage = async (lId, sndr, txt, tm, mediaUrl = null, mediaType = null) => {
      const cleanTxt = txt && txt !== "undefined" && txt !== "null" ? String(txt).trim() : "";
      
      // Si no hay texto ni media, no guardamos nada
      if (!cleanTxt && !mediaUrl) return;

      const currentNormalized = normalize(cleanTxt);

      // Evitar duplicados (mismo texto y mismo lead en los últimos 5 mensajes)
      if (cleanTxt) {
        const recent = await db.all("SELECT text FROM messages WHERE lead_id = ? ORDER BY id DESC LIMIT 5", lId);
        if (recent.some(m => normalize(m.text) === currentNormalized)) {
          console.log(`🚫 DUPLICADO BLOQUEADO para lead ${lId}: ${cleanTxt.substring(0, 30)}...`);
          return;
        }
      }

      console.log(`💾 Guardando mensaje (${sndr}) para lead ${lId}: ${cleanTxt.substring(0, 40)}... ${mediaUrl ? '[CON MEDIA]' : ''}`);
      await db.run("INSERT INTO messages (lead_id, sender, text, mediaUrl, mediaType, timestamp) VALUES (?, ?, ?, ?, ?, ?)", 
        lId, sndr, cleanTxt, mediaUrl, mediaType, tm);

      // --- MOTOR DE APRENDIZAJE AUTOMÁTICO ---
      if (sndr === 'client' && cleanTxt) {
        const learningTopics = [
          { key: 'precio', label: 'Precios y Cotizaciones' },
          { key: 'ubicacion', label: 'Ubicación y Direcciones' },
          { key: 'horario', label: 'Horarios de Atención' },
          { key: 'envio', label: 'Métodos de Envío' },
          { key: 'garantia', label: 'Políticas de Garantía' }
        ];
        
        for (const topic of learningTopics) {
          if (currentNormalized.includes(topic.key)) {
            const existing = await db.get("SELECT id FROM knowledge_base WHERE topic = ? AND status = 'pending'", topic.label);
            if (existing) {
              await db.run("UPDATE knowledge_base SET frequency = frequency + 1, last_updated = CURRENT_TIMESTAMP WHERE id = ?", existing.id);
            } else {
              await db.run(
                "INSERT INTO knowledge_base (topic, content, source_lead_id, frequency, status) VALUES (?, ?, ?, 1, 'pending')",
                topic.label, cleanTxt, lId
              );
            }
          }
        }
      }
    };

    const mediaUrl = data.media_url || data.image_url || data.file_url;
    const mediaType = data.media_type || (mediaUrl ? 'image' : null);
    const senderPrincipal = data.sender || 'client';

    console.log(`📩 Procesando Webhook - Lead ID: ${leadId}`);

    // ── DETECCIÓN AUTOMÁTICA DE HANDOFF ────────────────────────────────────
    const handoffReason = data.handoff_reason || await detectHandoff(mensajePrincipal);
    if (handoffReason) {
      // No re-disparar si el agente ya activó el bot manualmente
      const leadState = await db.get("SELECT botActive FROM leads WHERE id = ?", leadId);
      if (leadState && leadState.botActive === 1) {
        console.log(`ℹ️ Lead ${leadId}: handoff detectado pero bot está activo — ignorado`);
      } else {
        console.log(`🚨 HANDOFF DETECTADO para lead ${leadId}: "${handoffReason}"`);
        await db.run(
          "UPDATE leads SET botActive = 0, priority = 'urgent', handoff_reason = ?, estado = 'Intervención Requerida' WHERE id = ?",
          handoffReason, leadId
        );
      }
    }
    // ────────────────────────────────────────────────────────────────────────
    
    if (mensajePrincipal || mediaUrl) {
      await saveSmartMessage(leadId, senderPrincipal, mensajePrincipal, time, mediaUrl, mediaType);
    }

    if (mensajeSecundario && normalize(mensajeSecundario) !== normalize(mensajePrincipal)) {
      await saveSmartMessage(leadId, 'bot', mensajeSecundario, time);
    }

    res.json({ success: true, action: existingLead ? "updated" : "created", handoff: handoffReason || null });
  } catch (err) {
    console.error("❌ Error procesando webhook:", err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint dedicado para activar Handoff (n8n puede llamar esto directamente)
app.post('/api/leads/handoff', async (req, res) => {
  try {
    const { leadId, phone, reason, mensaje, nombre: nombreParam } = req.body;
    if (!leadId && !phone) return res.status(400).json({ error: "Se necesita leadId o phone" });

    let id = leadId;
    if (!id && phone) {
      const cleanPhone = String(phone).replace(/\D/g, '');
      const lead = await db.get("SELECT id FROM leads WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?", cleanPhone);
      if (!lead) {
        // Crear lead si no existe y viene con nombre
        const result = await db.run(
          "INSERT INTO leads (nombre, phone, estado, origen, botActive, priority) VALUES (?, ?, 'Intervención Requerida', 'WhatsApp (n8n)', 0, 'urgent')",
          nombreParam || 'Cliente Nuevo', phone
        );
        id = result.lastID;
      } else {
        id = lead.id;
      }
    }

    // Bug 2 fix: si el agente ya tomó control o reactivó el bot, no re-disparar handoff
    const currentLead = await db.get("SELECT estado, botActive FROM leads WHERE id = ?", id);
    if (currentLead && (currentLead.estado === 'En Gestión' || currentLead.botActive === 1)) {
      // Solo guardar el mensaje del cliente si viene, pero no re-marcar como urgente
      if (mensaje && mensaje.trim()) {
        const now = new Date();
  const guateTime = new Date(now.getTime() - (6 * 60 * 60 * 1000));
  const time = guateTime.getUTCHours().toString().padStart(2, '0') + ':' + guateTime.getUTCMinutes().toString().padStart(2, '0') + (guateTime.getUTCHours() >= 12 ? ' PM' : ' AM');
        await db.run("INSERT INTO messages (lead_id, sender, text, timestamp) VALUES (?, ?, ?, ?)", id, 'client', mensaje.trim(), time);
      }
      const skipReason = currentLead.botActive === 1 ? 'Bot activo — handoff ignorado' : 'Lead ya en gestión manual';
      console.log(`ℹ️ Lead ${id}: ${skipReason}`);
      return res.json({ success: true, skipped: true, reason: skipReason });
    }

    const handoffReason = reason || 'Solicitud manual de Handoff';
    await db.run(
      "UPDATE leads SET botActive = 0, priority = 'urgent', handoff_reason = ?, estado = 'Intervención Requerida' WHERE id = ?",
      handoffReason, id
    );

    // Bug 3 fix: guardar el mensaje del cliente aunque el bot esté apagado
    if (mensaje && mensaje.trim()) {
      const now = new Date();
  const guateTime = new Date(now.getTime() - (6 * 60 * 60 * 1000));
  const time = guateTime.getUTCHours().toString().padStart(2, '0') + ':' + guateTime.getUTCMinutes().toString().padStart(2, '0') + (guateTime.getUTCHours() >= 12 ? ' PM' : ' AM');
      await db.run("INSERT INTO messages (lead_id, sender, text, timestamp) VALUES (?, ?, ?, ?)", id, 'client', mensaje.trim(), time);
    }

    console.log(`🚨 HANDOFF activado para lead ${id}: "${handoffReason}"`);
    res.json({ success: true, leadId: id, reason: handoffReason });
  } catch (err) {
    console.error("❌ Error en handoff:", err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para resolver/cerrar un handoff cuando el agente tomó control
app.post('/api/leads/handoff/resolve', async (req, res) => {
  try {
    const { leadId } = req.body;
    if (!leadId) return res.status(400).json({ error: "Se necesita leadId" });
    await db.run(
      "UPDATE leads SET priority = 'normal', handoff_reason = NULL, estado = 'En Gestión' WHERE id = ?",
      leadId
    );
    console.log(`✅ HANDOFF RESUELTO para lead ${leadId}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/messages/:leadId', async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM messages WHERE lead_id = ? ORDER BY id ASC", req.params.leadId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bot/toggle', async (req, res) => {
  try {
    const { leadId, enabled } = req.body;
    console.log(`🤖 Toggle bot — leadId: ${leadId}, enabled: ${enabled}`);
    if (!leadId) return res.status(400).json({ error: "Falta leadId" });
    let result;
    if (enabled) {
      result = await db.run(
        "UPDATE leads SET botActive = 1, priority = 'normal', handoff_reason = NULL, estado = 'Activo' WHERE id = ?",
        leadId
      );
    } else {
      result = await db.run("UPDATE leads SET botActive = 0 WHERE id = ?", leadId);
    }
    console.log(`✅ Toggle resultado: ${result.changes} fila(s) afectada(s)`);
    if (result.changes === 0) return res.status(404).json({ error: `Lead ${leadId} no encontrado en DB` });
    res.json({ success: true, botActive: !!enabled });
  } catch (err) {
    console.error("❌ Error en toggle:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── ENDPOINT CRÍTICO PARA N8N ───────────────────────────────────────────────
// n8n debe consultar esto ANTES de generar respuesta con IA
// GET /api/bot/status/:phone → { botActive: true/false, priority, handoff_reason }
// Si botActive es false → el nodo IF en n8n debe cortar el flujo
app.get('/api/bot/status/:phone', async (req, res) => {
  try {
    const cleanPhone = String(req.params.phone).replace(/\D/g, '');
    const lead = await db.get(
      "SELECT botActive, priority, handoff_reason, nombre, estado FROM leads WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?",
      cleanPhone
    );

    if (!lead) {
      // Si el lead no existe aún, el bot puede responder (nuevo cliente)
      return res.json({ botActive: true, priority: 'normal', handoff_reason: null, found: false });
    }

    console.log(`🤖 Consulta de estado bot para ${cleanPhone}: botActive=${!!lead.botActive}, priority=${lead.priority}`);
    res.json({
      botActive: !!lead.botActive,
      priority: lead.priority || 'normal',
      handoff_reason: lead.handoff_reason || null,
      nombre: lead.nombre,
      estado: lead.estado,
      found: true
    });
  } catch (err) {
    console.error("❌ Error en /api/bot/status:", err);
    res.status(500).json({ error: err.message });
  }
});

// Archivar lead
app.post('/api/leads/:id/archive', async (req, res) => {
  try {
    const { archived } = req.body;
    await db.run("UPDATE leads SET archived = ? WHERE id = ?", archived ? 1 : 0, req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Eliminar conversación (mensajes)
app.delete('/api/leads/:id/messages', async (req, res) => {
  try {
    await db.run("DELETE FROM messages WHERE lead_id = ?", req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Eliminar lead completo
app.delete('/api/leads/:id', async (req, res) => {
  try {
    await db.run("DELETE FROM messages WHERE lead_id = ?", req.params.id);
    await db.run("DELETE FROM leads WHERE id = ?", req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ─────────────────────────────────────────────────────────────────────────────

// ─── PEDIDOS (Sistema de Órdenes) ─────────────────────────────────────────────
const OWNER_PHONE = '+50235154362';
const YCLOUD_API_KEY = 'a25aaba6428e12e4df6310296f675272';
const YCLOUD_FROM = '+50244315578';

async function notificarDueno(mensaje) {
  try {
    await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': YCLOUD_API_KEY },
      body: JSON.stringify({
        from: YCLOUD_FROM,
        to: OWNER_PHONE,
        type: 'text',
        text: { body: mensaje }
      })
    });
    console.log(`📲 Notificación enviada al dueño: ${mensaje.substring(0,50)}...`);
  } catch(e) {
    console.error('❌ Error enviando notificación al dueño:', e.message);
  }
}

app.post('/api/pedidos', async (req, res) => {
  try {
    const { cliente, phone, producto, cantidad, precio, notas } = req.body;
    if (!producto) return res.status(400).json({ error: 'Falta el producto' });
    const now = new Date();
    const guateTime = new Date(now.getTime() - (6 * 60 * 60 * 1000));
    const timestamp = guateTime.getUTCFullYear() + '-' +
      String(guateTime.getUTCMonth()+1).padStart(2,'0') + '-' + 
      String(guateTime.getUTCDate()).padStart(2,'0') + ' ' + 
      String(guateTime.getUTCHours()).padStart(2,'0') + ':' + 
      String(guateTime.getUTCMinutes()).padStart(2,'0');
    const result = await db.run(
      `INSERT INTO pedidos (cliente, phone, producto, cantidad, precio, notas, estado, timestamp) VALUES (?,?,?,?,?,?,'Nuevo',?)`,
      cliente || 'Cliente', phone || '', producto, cantidad || '1', precio || '', notas || '', timestamp
    );
    console.log(`🛒 Nuevo pedido #${result.lastID}: ${producto} — ${cliente}`);
    // Notificar al dueño por WhatsApp
    const msg = `🛒 *NUEVO PEDIDO #${result.lastID}*\n\n👤 Cliente: ${cliente || 'Sin nombre'}\n📱 Tel: ${phone || 'Sin teléfono'}\n📦 Producto: ${producto}\n🔢 Cantidad: ${cantidad || '1'}${precio ? '\n💰 Precio: ' + precio : ''}${notas ? '\n📝 Notas: ' + notas : ''}\n\n⏰ ${timestamp}\n\n✅ Ve al Dashboard para gestionar el pedido.`;
    await notificarDueno(msg);
    res.json({ success: true, id: result.lastID });
  } catch(err) {
    console.error('❌ Error creando pedido:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pedidos', async (_req, res) => {
  try {
    const rows = await db.all('SELECT * FROM pedidos ORDER BY id DESC');
    res.json(rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/pedidos/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    const validStates = ['Nuevo', 'En Proceso', 'Completado', 'Cancelado'];
    if (!validStates.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
    await db.run('UPDATE pedidos SET estado = ? WHERE id = ?', estado, req.params.id);
    res.json({ success: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});
// ──────────────────────────────────────────────────────────────────────────────

app.get('/api/settings', async (_req, res) => {
  try {
    const rows = await db.all("SELECT * FROM settings");
    const settings = {};
    rows.forEach(row => settings[row.key] = row.value);

    // El dashboard debe recibir los prompts limpios. 
    // n8n usa /api/agent/prompt que ya tiene su propia inyección lógica.
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) throw new Error("Key is required");
    console.log(`⚙️ Guardando configuración: ${key} (${value?.length || 0} chars)`);
    // Usamos REPLACE INTO para máxima compatibilidad con versiones antiguas de SQLite
    await db.run("REPLACE INTO settings (key, value) VALUES (?, ?)", key, value);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages/send', async (req, res) => {
  try {
    const { leadId, text, sender, phone } = req.body;
    if (!leadId || !text) return res.status(400).json({ error: "Faltan datos" });

    const msgSender = sender || 'agent';
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    const result = await db.run("INSERT INTO messages (lead_id, sender, text, timestamp) VALUES (?, ?, ?, ?)", leadId, msgSender, text, time);
    const savedMessage = { id: result.lastID, lead_id: leadId, sender: msgSender, text, timestamp: time };

    if (!sender && msgSender === 'agent' && N8N_OUTBOUND_WEBHOOK) {
      const lead = await db.get("SELECT phone FROM leads WHERE id = ?", leadId);
      const targetPhone = phone || lead?.phone;
      if (targetPhone) {
        fetch(N8N_OUTBOUND_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: targetPhone, text })
        }).catch(err => console.error("❌ Error enviando a n8n:", err.message));
      }
    }

    res.json({ success: true, message: savedMessage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rag/documents', async (_req, res) => {
  try {
    const rows = await db.all("SELECT id, name, category, timestamp, SUBSTR(content, 1, 200) as content FROM documents ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rag/upload', upload.single('file'), async (req, res) => {
  try {
    const { name, category } = req.body;
    const filePath = req.file.path;
    let content = "";

    if (req.file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      content = data.text;
    } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || req.file.mimetype === 'application/vnd.ms-excel') {
      const workbook = XLSX.readFile(filePath);
      let fullText = "";
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        fullText += `--- Hoja: ${sheetName} ---\n`;
        fullText += XLSX.utils.sheet_to_txt(worksheet) + "\n\n";
      });
      content = fullText;
    } else {
      content = fs.readFileSync(filePath, 'utf8');
    }

    await db.run("INSERT INTO documents (name, category, content, timestamp) VALUES (?, ?, ?, ?)", 
      name || req.file.originalname, category || 'General', content, new Date().toLocaleString());

    fs.unlinkSync(filePath); 
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear tarjeta de conocimiento desde texto (sin subir archivo)
app.post('/api/rag/save', async (req, res) => {
  try {
    const { name, category, content } = req.body;
    if (!name || !content) return res.status(400).json({ error: "Nombre y contenido requeridos" });
    await db.run("INSERT INTO documents (name, category, content, timestamp) VALUES (?, ?, ?, ?)",
      name, category || 'General', content, new Date().toLocaleString());
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Editar tarjeta existente
app.put('/api/rag/documents/:id', async (req, res) => {
  try {
    const { name, category, content } = req.body;
    await db.run("UPDATE documents SET name = ?, category = ?, content = ? WHERE id = ?",
      name, category, content, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/rag/documents/:id', async (req, res) => {
  try {
    await db.run("DELETE FROM documents WHERE id = ?", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para que n8n obtenga el prompt completo del agente listo para usar
// ?tipo=recepcionista | ventas | soporte  (opcional, por defecto recepcionista)
app.get('/api/agent/prompt', async (req, res) => {
  try {
    const tipo = (req.query.tipo || 'recepcionista').toLowerCase();

    const rows = await db.all("SELECT key, value FROM settings");
    const s = {};
    rows.forEach(r => s[r.key] = r.value);

    const nombre      = s.agent_nombre      || 'Asistente';
    const rol         = s.agent_rol         || 'asistente virtual';
    const empresa     = s.agent_empresa     || 'la empresa';
    const descripcion = s.agent_descripcion || '';
    const tono        = s.agent_tono        || 'profesional y amable';
    const idioma      = s.agent_idioma      || 'Español';

    const promptMap = {
      recepcionista: s.prompt_recepcionista || '',
      ventas:        s.prompt_ventas        || '',
      soporte:       s.prompt_soporte       || '',
    };
    const instrucciones = promptMap[tipo] || promptMap.recepcionista;

    // Obtener catálogo de productos dinámicamente
    const prods = await db.all("SELECT * FROM products WHERE activo = 1 ORDER BY categoria, nombre");
    let catalogText = "";
    if (prods.length > 0) {
      catalogText = "CATÁLOGO DE PRODUCTOS DISPONIBLES (Usa esta información para cotizar y dar precios reales):\n";
      prods.forEach(p => {
        catalogText += `• ${p.nombre} — Precio: ${p.precio || 'Consultar'} | Stock: ${p.stock}\n`;
        if (p.descripcion) catalogText += `  Detalles: ${p.descripcion}\n`;
      });
    }

    // Obtener base de conocimiento (RAG)
    const docs = await db.all("SELECT * FROM documents ORDER BY timestamp DESC");
    let ragText = "";
    if (docs.length > 0) {
      ragText = "BASE DE CONOCIMIENTO (Usa esta información para responder a las dudas del cliente):\n";
      docs.forEach(d => {
        ragText += `--- ${d.name} (${d.category || 'General'}) ---\n${d.content}\n\n`;
      });
    }

    const systemPrompt = `Eres ${nombre}, ${rol} de ${empresa}.

EMPRESA:
${descripcion}

${catalogText}
${ragText}
TONO: ${tono}
IDIOMA: ${idioma}

INSTRUCCIONES DE COMPORTAMIENTO:
${instrucciones}

REGLAS IMPORTANTES:
- Responde siempre en ${idioma}
- Nunca digas que eres una IA a menos que te lo pregunten directamente
- Si no sabes algo, pide más detalles o transfiere al equipo humano
- Sé conciso en WhatsApp (máximo 3-4 líneas por respuesta)`.trim();

    res.json({ systemPrompt, nombre, rol, empresa, tono, idioma, tipo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CATÁLOGO DE PRODUCTOS ────────────────────────────────────────────────────
app.get('/api/products', async (_req, res) => {
  try {
    res.json(await db.all("SELECT * FROM products ORDER BY categoria, nombre"));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria, stock, imagen, catalog_link } = req.body;
    if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
    const ts = new Date().toLocaleString();
    const r = await db.run(
      "INSERT INTO products (nombre, descripcion, precio, categoria, stock, imagen, catalog_link, timestamp) VALUES (?,?,?,?,?,?,?,?)",
      nombre, descripcion || '', precio || '', categoria || 'General', stock || 'En stock', imagen || '', catalog_link || '', ts
    );
    res.json({ success: true, id: r.lastID });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria, stock, activo, imagen, catalog_link } = req.body;
    await db.run(
      "UPDATE products SET nombre=?, descripcion=?, precio=?, categoria=?, stock=?, activo=?, imagen=?, catalog_link=? WHERE id=?",
      nombre, descripcion, precio, categoria, stock, activo ?? 1, imagen ?? '', catalog_link ?? '', req.params.id
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await db.run("DELETE FROM products WHERE id = ?", req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// SUBIR IMAGEN DE PRODUCTO
app.post('/api/products/upload-image', productImagesUpload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se subió ninguna imagen" });
    const host = req.get('host');
    const protocol = req.protocol;
    const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    res.json({ success: true, imageUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Contexto RAG de productos para n8n
app.get('/api/products/context', async (_req, res) => {
  try {
    const rows = await db.all("SELECT * FROM products WHERE activo = 1 ORDER BY categoria, nombre");
    let context = "";
    
    if (rows.length > 0) {
      const grouped = rows.reduce((acc, p) => {
        if (!acc[p.categoria]) acc[p.categoria] = [];
        acc[p.categoria].push(p);
        return acc;
      }, {});
      context += "CATÁLOGO DE PRODUCTOS:\n\n";
      for (const [cat, prods] of Object.entries(grouped)) {
        context += `[${cat}]\n`;
        for (const p of prods) {
          context += `• ${p.nombre}`;
          if (p.precio) context += ` — ${p.precio}`;
          if (p.stock) context += ` (${p.stock})`;
          context += '\n';
          if (p.descripcion) context += `  ${p.descripcion}\n`;
          if (p.imagen) context += `  IMAGEN: ${p.imagen}\n`;
          if (p.catalog_link) context += `  CATALOGO_LINK: ${p.catalog_link}\n`;
        }
        context += '\n';
      }
    }

    // Obtener documentos RAG generales
    const docs = await db.all("SELECT * FROM documents ORDER BY timestamp DESC");
    if (docs.length > 0) {
      context += "\nBASE DE CONOCIMIENTO (Usa esta información para responder a las dudas del cliente):\n";
      docs.forEach(d => {
        context += `--- ${d.name} (${d.category || 'General'}) ---\n${d.content}\n\n`;
      });
    }

    if (!context) return res.json({ context: "", found: false });
    
    res.json({ context: context.trim(), found: true, total: rows.length + docs.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ─────────────────────────────────────────────────────────────────────────────

// Endpoint para que n8n actualice datos del contacto (nombre, email, etc.)
app.post('/api/leads/update-contact', async (req, res) => {
  try {
    const { phone, leadId, nombre, email, motor, falla, zona, direccion, notas, nit, etiquetas, whatsapp_id, score, estado } = req.body;
    let id = leadId;

    if (!id && phone) {
      const cleanPhone = String(phone).replace(/\D/g, '');
      const lead = await db.get("SELECT id FROM leads WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?", cleanPhone);
      if (!lead) return res.status(404).json({ error: "Lead no encontrado" });
      id = lead.id;
    }

    if (!id) return res.status(400).json({ error: "Se necesita leadId o phone" });

    const updates = [];
    const values = [];
    if (nombre)    { updates.push("nombre = ?");    values.push(nombre); }
    if (email)     { updates.push("email = ?");     values.push(email); }
    if (motor)     { updates.push("motor = ?");     values.push(motor); }
    if (falla)     { updates.push("falla = ?");     values.push(falla); }
    if (zona)      { updates.push("zona = ?");      values.push(zona); }
    if (direccion) { updates.push("direccion = ?"); values.push(direccion); }
    if (notas)     { updates.push("notas = ?");     values.push(notas); }
    if (nit)       { updates.push("nit = ?");       values.push(nit); }
    if (etiquetas) { updates.push("etiquetas = ?"); values.push(etiquetas); }
    if (whatsapp_id) { updates.push("whatsapp_id = ?"); values.push(whatsapp_id); }
    if (score !== undefined) { updates.push("score = ?"); values.push(score); }
    if (estado)    { updates.push("estado = ?");    values.push(estado); }

    if (updates.length === 0) return res.status(400).json({ error: "No hay campos para actualizar" });

    values.push(id);
    await db.run(`UPDATE leads SET ${updates.join(", ")} WHERE id = ?`, ...values);
    console.log(`✏️ Contacto ${id} actualizado: ${updates.join(", ")}`);
    res.json({ success: true, leadId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── RAG: BÚSQUEDA SEMÁNTICA O CONTEXTO GLOBAL ────────────────────────────────────
// GET /api/rag/context?q=texto_del_cliente&maxChars=2500
// ─── RAG: BÚSQUEDA SEMÁNTICA POR KEYWORDS (USADO COMO TOOL) ───────────────────
// GET /api/rag/context?q=consulta&maxChars=2500
app.get('/api/rag/context', async (req, res) => {
  try {
    const q = req.query.q || req.query.query || req.query.search;
    const maxChars = req.query.maxChars || 2500;
    if (!q) return res.json({ context: "No se proporcionó consulta", found: false, sources: [] });

    // Cargar documentos y productos
    const docs = await db.all("SELECT name, category, COALESCE(content, '') as content FROM documents");
    const prods = await db.all("SELECT nombre as name, categoria as category, COALESCE(descripcion, '') || ' - Precio: ' || COALESCE(precio, 'Consultar') || ' - Imagen: ' || COALESCE(imagen, '') || ' - Link: ' || COALESCE(catalog_link, '') as content FROM products WHERE activo = 1");
    
    const allKnowledge = [...docs, ...prods];

    if (allKnowledge.length === 0) return res.json({ context: "No hay información en la base de datos", found: false, sources: [] });

    // Búsqueda simple por palabras clave (Mejorada para plurales)
    const normalizeKw = (k) => k.replace(/es$/, '').replace(/s$/, '');
    const keywords = q.toLowerCase().split(/\s+/)
                      .filter(k => k.length > 2)
                      .map(normalizeKw);
    
    const scored = allKnowledge.map(doc => {
      const lower = (doc.name + ' ' + doc.content).toLowerCase();
      let score = 0;
      keywords.forEach(kw => { if (lower.includes(kw)) score++; });
      return { ...doc, score };
    }).filter(d => d.score > 0 || keywords.length === 0).sort((a, b) => b.score - a.score);

    if (scored.length === 0) return res.json({ context: "No se encontró información relevante para: " + q, found: false, sources: [] });

    // Construir respuesta
    let context = "";
    const sources = [];
    scored.slice(0, 5).forEach(doc => {
      context += `--- RESULTADO: ${doc.name} ---\n${doc.content}\n\n`;
      sources.push(doc.name);
    });

    if (context.length > maxChars) context = context.substring(0, maxChars) + "...";

    res.json({ context: context.trim(), found: true, sources });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mantener /api/rag/query como alias para compatibilidad
app.get('/api/rag/query', async (req, res) => {
  req.url = '/api/rag/context' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
  res.redirect(307, `/api/rag/context?${new URLSearchParams(req.query)}`);
});
// ─────────────────────────────────────────────────────────────────────────────

// ── SISTEMA DE APRENDIZAJE IA ──────────────────────────────────────────────
app.get('/api/ai/knowledge', async (req, res) => {
  try {
    const knowledge = await db.all("SELECT * FROM knowledge_base ORDER BY frequency DESC");
    res.json(knowledge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/knowledge/approve/:id', async (req, res) => {
  try {
    await db.run("UPDATE knowledge_base SET status = 'approved' WHERE id = ?", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ai/insights', async (req, res) => {
  try {
    // Análisis simplificado: Buscar palabras clave frecuentes en mensajes de clientes
    const recentMessages = await db.all("SELECT text FROM messages WHERE sender = 'client' ORDER BY id DESC LIMIT 200");
    
    const keywords = {
      'precio': 0, 'cuánto cuesta': 0, 'valor': 0,
      'ubicación': 0, 'dónde están': 0, 'dirección': 0,
      'horario': 0, 'a qué hora': 0, 'abierto': 0,
      'envío': 0, 'domicilio': 0, 'entrega': 0,
      'garantía': 0, 'seguro': 0,
      'pago': 0, 'transferencia': 0, 'tarjeta': 0
    };

    recentMessages.forEach(m => {
      const txt = (m.text || "").toLowerCase();
      Object.keys(keywords).forEach(k => {
        if (txt.includes(k)) keywords[k]++;
      });
    });

    const topInsights = Object.entries(keywords)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([keyword, count]) => ({
        topic: keyword.charAt(0).toUpperCase() + keyword.slice(1),
        count,
        trend: count > 5 ? 'Subiendo' : 'Estable'
      }));

    res.json(topInsights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/analyze', async (req, res) => {
  try {
    // Escaneo forzado de las últimas conversaciones para encontrar conocimiento
    const recent = await db.all("SELECT lead_id, text FROM messages WHERE sender = 'client' ORDER BY id DESC LIMIT 100");
    const learningTopics = [
      { key: 'precio', label: 'Precios y Cotizaciones' },
      { key: 'ubicacion', label: 'Ubicación y Direcciones' },
      { key: 'horario', label: 'Horarios de Atención' },
      { key: 'envio', label: 'Métodos de Envío' },
      { key: 'garantia', label: 'Políticas de Garantía' }
    ];

    for (const msg of recent) {
      const txt = (msg.text || "").toLowerCase();
      for (const topic of learningTopics) {
        if (txt.includes(topic.key)) {
          const existing = await db.get("SELECT id FROM knowledge_base WHERE topic = ? AND status = 'pending'", topic.label);
          if (!existing) {
            await db.run(
              "INSERT INTO knowledge_base (topic, content, source_lead_id, frequency, status) VALUES (?, ?, ?, 1, 'pending')",
              topic.label, msg.text, msg.lead_id
            );
          }
        }
      }
    }
    res.json({ success: true, message: "Análisis completado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rag/test-search', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.json({ results: [] });

  try {
    const searchTerm = `%${query}%`;
    const docs = await db.all(
      "SELECT 'Tarjeta' as tipo, name as titulo, content as contenido FROM documents WHERE name LIKE ? OR content LIKE ? LIMIT 5",
      [searchTerm, searchTerm]
    );
    const prods = await db.all(
      "SELECT 'Producto' as tipo, nombre as titulo, descripcion as contenido FROM products WHERE nombre LIKE ? OR descripcion LIKE ? LIMIT 5",
      [searchTerm, searchTerm]
    );

    res.json({ results: [...docs, ...prods] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(join(__dirname, 'dist')));

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error("❌ ERROR EN EXPRESS:", err);
  res.status(500).send(`Error interno: ${err.message}`);
});

// Todas las demás rutas al index.html
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist/index.html'));
});


// Iniciar servidor inmediatamente para que EasyPanel vea el servicio activo
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Backend del Dashboard escuchando en http://0.0.0.0:${port}`);
  
  // Inicialización de BD en segundo plano
  setup().then(() => {
    console.log("🎊 Sistema de base de datos listo.");
  }).catch(err => {
    console.error("❌ ERROR CRÍTICO EN SETUP:", err);
  });
});

server.on('error', (err) => {
  console.error("❌ ERROR AL INICIAR SERVIDOR:", err);
  process.exit(1);
});
