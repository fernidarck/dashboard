import express from 'express';
import cors from 'cors';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import pdf from 'pdf-parse';
import fs from 'fs';

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

console.log("🚀 Iniciando servidor del Dashboard...");
const app = express();
const port = process.env.PORT || 3001;
const N8N_OUTBOUND_WEBHOOK = process.env.N8N_OUTBOUND_WEBHOOK || "https://appn8n-n8n.83aqlq.easypanel.host/webhook/send-message";

console.log(`📌 Puerto detectado: ${port}`);
console.log(`📌 Webhook detectado: ${N8N_OUTBOUND_WEBHOOK}`);

app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN DE ARCHIVOS (RAG) ---
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
const upload = multer({ dest: 'uploads/' });

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
      handoff_reason TEXT
    )`);

    // Migración: añadir columnas nuevas si no existen
    try { await db.exec(`ALTER TABLE leads ADD COLUMN priority TEXT DEFAULT 'normal'`); } catch(_) {}
    try { await db.exec(`ALTER TABLE leads ADD COLUMN handoff_reason TEXT`); } catch(_) {}
    try { await db.exec(`ALTER TABLE products ADD COLUMN imagen TEXT`); } catch(_) {}

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
             (SELECT text FROM messages WHERE lead_id = leads.id ORDER BY id DESC LIMIT 1) as lastMessage
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
  const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  const motor = data.motor || "N/A";
  const falla = data.falla || "N/A";
  const zona = data.zona || "N/A";

  try {
    const cleanPhone = String(data.phone).replace(/\D/g, '');
    console.log(`🔍 Buscando contacto para número normalizado: ${cleanPhone}`);

    const existingLead = await db.get("SELECT id, nombre FROM leads WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?", cleanPhone);
    let leadId;

    if (existingLead) {
      console.log(`   ✅ Lead existente encontrado: ID ${existingLead.id} (nombre: ${existingLead.nombre})`);
      // No tocar botActive — el agente lo controla manualmente desde el dashboard
      if (data.bot_apagado !== undefined) {
        await db.run("UPDATE leads SET estado = ?, time = ?, botActive = ? WHERE id = ?", estado, time, data.bot_apagado ? 0 : 1, existingLead.id);
      } else {
        await db.run("UPDATE leads SET estado = ?, time = ? WHERE id = ?", estado, time, existingLead.id);
      }
      // Actualizar nombre si el actual es "Cliente Nuevo" y n8n ya capturó el real
      if (nombre && nombre !== "Cliente Nuevo" && existingLead.nombre === "Cliente Nuevo") {
        await db.run("UPDATE leads SET nombre = ? WHERE id = ?", nombre, existingLead.id);
        console.log(`   ✏️ Nombre actualizado: "${existingLead.nombre}" → "${nombre}"`);
      }
      leadId = existingLead.id;
    } else {
      console.log("   🆕 Creando nuevo lead...");
      const result = await db.run(`INSERT INTO leads (nombre, phone, email, score, estado, origen, botActive, motor, falla, zona) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        nombre, data.phone, email, score, estado, origen, 1, motor, falla, zona);
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
    };

    const mensajePrincipal = data.mensaje || data.respuesta_cliente || data.mensaje_cliente || data.texto_cliente || data.client_message;
    const mensajeSecundario = data.respuesta_bot || data.texto_limpio || data.bot_response || data.output;
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
        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
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
      const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
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
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/settings', async (_req, res) => {
  try {
    const rows = await db.all("SELECT * FROM settings");
    const settings = {};
    rows.forEach(row => settings[row.key] = row.value);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) throw new Error("Key is required");
    await db.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", key, value);
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
    const { nombre, descripcion, precio, categoria, stock, imagen } = req.body;
    if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
    const ts = new Date().toLocaleString();
    const r = await db.run(
      "INSERT INTO products (nombre, descripcion, precio, categoria, stock, imagen, timestamp) VALUES (?,?,?,?,?,?,?)",
      nombre, descripcion || '', precio || '', categoria || 'General', stock || 'En stock', imagen || '', ts
    );
    res.json({ success: true, id: r.lastID });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria, stock, activo, imagen } = req.body;
    await db.run(
      "UPDATE products SET nombre=?, descripcion=?, precio=?, categoria=?, stock=?, activo=?, imagen=? WHERE id=?",
      nombre, descripcion, precio, categoria, stock, activo ?? 1, imagen ?? '', req.params.id
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

// Contexto RAG de productos para n8n
app.get('/api/products/context', async (_req, res) => {
  try {
    const rows = await db.all("SELECT * FROM products WHERE activo = 1 ORDER BY categoria, nombre");
    if (rows.length === 0) return res.json({ context: "", found: false });
    const grouped = rows.reduce((acc, p) => {
      if (!acc[p.categoria]) acc[p.categoria] = [];
      acc[p.categoria].push(p);
      return acc;
    }, {});
    let context = "CATÁLOGO DE PRODUCTOS:\n\n";
    for (const [cat, prods] of Object.entries(grouped)) {
      context += `[${cat}]\n`;
      for (const p of prods) {
        context += `• ${p.nombre}`;
        if (p.precio) context += ` — ${p.precio}`;
        if (p.stock) context += ` (${p.stock})`;
        context += '\n';
        if (p.descripcion) context += `  ${p.descripcion}\n`;
        if (p.imagen) context += `  IMAGEN: ${p.imagen}\n`;
      }
      context += '\n';
    }
    res.json({ context: context.trim(), found: true, total: rows.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ─────────────────────────────────────────────────────────────────────────────

// Endpoint para que n8n actualice datos del contacto (nombre, email, etc.)
app.post('/api/leads/update-contact', async (req, res) => {
  try {
    const { phone, leadId, nombre, email, motor, falla, zona } = req.body;
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
    if (nombre) { updates.push("nombre = ?"); values.push(nombre); }
    if (email)  { updates.push("email = ?");  values.push(email); }
    if (motor)  { updates.push("motor = ?");  values.push(motor); }
    if (falla)  { updates.push("falla = ?");  values.push(falla); }
    if (zona)   { updates.push("zona = ?");   values.push(zona); }

    if (updates.length === 0) return res.status(400).json({ error: "No hay campos para actualizar" });

    values.push(id);
    await db.run(`UPDATE leads SET ${updates.join(", ")} WHERE id = ?`, ...values);
    console.log(`✏️ Contacto ${id} actualizado: ${updates.join(", ")}`);
    res.json({ success: true, leadId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── RAG: BÚSQUEDA SEMÁNTICA POR KEYWORDS ────────────────────────────────────
// GET /api/rag/context?q=texto_del_cliente&maxChars=2000
// n8n llama esto ANTES de enviar al agente IA para inyectar contexto relevante
app.get('/api/rag/context', async (req, res) => {
  try {
    const { q, maxChars = 2500 } = req.query;
    if (!q) return res.json({ context: "", found: false, sources: [] });

    // Extraer palabras clave (ignorar palabras cortas y stopwords)
    const stopwords = new Set(['para','como','que','con','una','los','las','del','por','este','esta','son','hay','pero','cuando','donde','como','más','muy','bien','hola','buenos','días','tardes','noches']);
    const keywords = q.toLowerCase()
      .replace(/[^a-záéíóúñü\s]/gi, ' ')
      .split(/\s+/)
      .filter(k => k.length > 3 && !stopwords.has(k))
      .slice(0, 12);

    if (keywords.length === 0) return res.json({ context: "", found: false, sources: [] });

    // Cargar todos los documentos y puntuar por relevancia
    const docs = await db.all("SELECT name, category, content FROM documents");
    if (docs.length === 0) return res.json({ context: "", found: false, sources: [] });

    const scored = docs.map(doc => {
      const lower = doc.content.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        const matches = (lower.match(new RegExp(kw, 'g')) || []).length;
        score += matches;
      }
      return { ...doc, score };
    }).filter(d => d.score > 0).sort((a, b) => b.score - a.score);

    if (scored.length === 0) return res.json({ context: "", found: false, sources: [] });

    // Construir contexto con los top 3 documentos más relevantes
    let context = "";
    const sources = [];
    for (const doc of scored.slice(0, 3)) {
      // Buscar el párrafo más relevante dentro del documento
      const paragraphs = doc.content.split(/\n{2,}/).filter(p => p.trim().length > 30);
      const rankedParagraphs = paragraphs.map(p => {
        const lower = p.toLowerCase();
        const score = keywords.reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0);
        return { text: p.trim(), score };
      }).sort((a, b) => b.score - a.score);

      const excerpt = rankedParagraphs.slice(0, 3).map(p => p.text).join('\n').substring(0, 800);
      const block = `📄 [${doc.category} — ${doc.name}]\n${excerpt}\n`;

      if ((context + block).length > Number(maxChars)) break;
      context += block + "\n";
      sources.push(doc.name);
    }

    // Incluir catálogo de productos si la query es sobre productos/precios
    const productKeywords = ['precio','costo','cuánto','cuanto','producto','catálogo','catalogo','stock','disponible','comprar','modelo','marca'];
    const isProductQuery = productKeywords.some(kw => q.toLowerCase().includes(kw));
    if (isProductQuery) {
      const prods = await db.all("SELECT * FROM products WHERE activo = 1 ORDER BY categoria, nombre");
      if (prods.length > 0) {
        let prodContext = "\n\nCATÁLOGO DE PRODUCTOS:\n";
        for (const p of prods) {
          prodContext += `• ${p.nombre}`;
          if (p.precio) prodContext += ` — ${p.precio}`;
          if (p.stock) prodContext += ` (${p.stock})`;
          if (p.descripcion) prodContext += `\n  ${p.descripcion}`;
          prodContext += '\n';
        }
        context += prodContext;
        sources.push('Catálogo de Productos');
      }
    }

    console.log(`📚 RAG query "${q.substring(0, 40)}..." → ${sources.length} fuente(s): ${sources.join(', ')}`);
    res.json({ context: context.trim(), found: context.trim().length > 0, sources });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mantener /api/rag/query como alias para compatibilidad
app.get('/api/rag/query', async (req, res) => {
  req.url = '/api/rag/context' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
  res.redirect(307, `/api/rag/context?${new URLSearchParams(req.query)}`);
});
// ─────────────────────────────────────────────────────────────────────────────

app.use(express.static(join(__dirname, 'dist')));
app.use((_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

setup().then(() => {
  app.listen(port, () => {
    console.log(`🚀 Backend del Dashboard escuchando en http://localhost:${port}`);
  });
});
