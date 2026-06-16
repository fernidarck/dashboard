import 'dotenv/config';
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
import crypto from 'crypto';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

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

console.log("🚀 SERVER VERSION: 1.0.5 (MEDIA COLUMNS) - Iniciando servidor del Dashboard...");
const app = express();
const port = process.env.PORT || 3002;
const ENV_N8N_OUTBOUND_WEBHOOK = process.env.N8N_OUTBOUND_WEBHOOK || "https://appn8n-n8n.83aqlq.easypanel.host/webhook/send-message";

console.log(`📌 Puerto detectado: ${port}`);
console.log(`📌 Webhook detectado (fallback env): ${ENV_N8N_OUTBOUND_WEBHOOK}`);

app.use(cors());
app.use(express.json());

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
let currentToken = process.env.DASHBOARD_TOKEN || 'dev-insecure-token';

async function requireAuth(req, res, next) {
  // Webhooks de entrada y endpoints públicos del bot no requieren auth
  const publicPaths = [
    '/webhook/',
    '/bot/status/',
    '/agent/prompt',
    '/auth/login',
    '/rag/context',
    '/leads/handoff',
    '/leads/update-contact',
    '/bot/channel-key'
  ];
  if (publicPaths.some(p => req.path.startsWith(p) || req.path === p)) return next();
  if (req.path === '/settings' && req.method === 'GET') return next();

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const tokenSent = authHeader.slice(7);
  const envToken = process.env.DASHBOARD_TOKEN || 'dev-insecure-token';
  const n8nStaticToken = 'onecontrol-n8n-token-static-2026';

  // 1. Verificar tokens estáticos globales
  if (tokenSent === currentToken || tokenSent === envToken || tokenSent === n8nStaticToken) {
    req.user = {
      id: 0,
      username: 'admin',
      name: 'Administrador (Token)',
      role: 'admin',
      channel_phone: null
    };
    return next();
  }

  // 2. Verificar sesiones dinámicas en la base de datos
  try {
    const session = await db.get(
      "SELECT s.token, u.id, u.username, u.name, u.role, u.channel_phone FROM sessions s INNER JOIN users u ON s.user_id = u.id WHERE s.token = ? AND u.active = 1",
      tokenSent
    );
    if (session) {
      req.user = {
        id: session.id,
        username: session.username,
        name: session.name,
        role: session.role,
        channel_phone: session.channel_phone
      };
      return next();
    }
  } catch (err) {
    console.error("❌ Error en requireAuth:", err.message);
  }

  return res.status(401).json({ error: 'Token inválido' });
}

app.use('/api', requireAuth);
// ─────────────────────────────────────────────────────────────────────────────

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
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(indexPath);
  } else {
    next();
  }
});

// --- CONFIGURACIÓN DE ARCHIVOS (RAG) ---
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}
const upload = multer({ dest: 'uploads/' });
const productImagesUpload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
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
        console.log("   - Copiando base de datos inicial desde el root...");
        fs.copyFileSync('./database.sqlite', dbFile);
      }
    }

    db = await open({
      filename: dbFile,
      driver: sqlite3.Database
    });

    console.log("🛠️ Verificando y creando tablas...");
    
    await db.exec(`
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        phone TEXT,
        email TEXT,
        motor TEXT,
        falla TEXT,
        zona TEXT,
        direccion TEXT,
        notas TEXT,
        nit TEXT,
        etiquetas TEXT,
        whatsapp_id TEXT,
        score INTEGER DEFAULT 0,
        estado TEXT DEFAULT 'Nuevo',
        origen TEXT DEFAULT 'WhatsApp',
        botActive INTEGER DEFAULT 1,
        priority TEXT DEFAULT 'normal',
        handoff_reason TEXT,
        archived INTEGER DEFAULT 0,
        channel_phone TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER,
        sender TEXT,
        text TEXT,
        timestamp TEXT,
        mediaUrl TEXT,
        mediaType TEXT,
        FOREIGN KEY(lead_id) REFERENCES leads(id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        category TEXT,
        content TEXT,
        timestamp TEXT
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        descripcion TEXT,
        precio TEXT,
        categoria TEXT,
        stock TEXT DEFAULT 'En stock',
        activo INTEGER DEFAULT 1,
        imagen TEXT,
        catalog_link TEXT,
        timestamp TEXT
      );

      CREATE TABLE IF NOT EXISTS agenda (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente TEXT,
        phone TEXT,
        fecha TEXT,
        hora TEXT,
        servicio TEXT,
        duracion TEXT,
        estado TEXT DEFAULT 'Pendiente',
        notas TEXT
      );

      CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente TEXT,
        phone TEXT,
        producto TEXT,
        cantidad TEXT,
        precio TEXT,
        notas TEXT,
        estado TEXT DEFAULT 'Nuevo',
        timestamp TEXT
      );

      CREATE TABLE IF NOT EXISTS handoff_triggers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword TEXT,
        priority TEXT DEFAULT 'urgent'
      );

      CREATE TABLE IF NOT EXISTS knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic TEXT,
        content TEXT,
        source_lead_id INTEGER,
        frequency INTEGER DEFAULT 1,
        status TEXT DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS whatsapp_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE,
        api_key TEXT,
        name TEXT,
        outbound_webhook TEXT,
        active INTEGER DEFAULT 1,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'operator',
        channel_phone TEXT,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `);

    // Sembrar el usuario administrador por defecto si no hay usuarios
    try {
      const userCount = await db.get("SELECT COUNT(*) as count FROM users");
      if (userCount.count === 0) {
        const hashed = hashPassword('admin');
        await db.run(
          "INSERT INTO users (username, password, name, role, active) VALUES (?, ?, ?, ?, ?)",
          'admin', hashed, 'Administrador', 'admin', 1
        );
        console.log("👤 Usuario administrador inicial creado: 'admin' / 'admin'");
      }
    } catch (e) {
      console.error("⚠️ Error sembrando administrador:", e);
    }

    // Migraciones rápidas (Columnas nuevas)
    try { await db.exec("ALTER TABLE leads ADD COLUMN archived INTEGER DEFAULT 0"); } catch(e){}
    try { await db.exec("ALTER TABLE leads ADD COLUMN direccion TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE leads ADD COLUMN notas TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE leads ADD COLUMN nit TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE leads ADD COLUMN etiquetas TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE leads ADD COLUMN whatsapp_id TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE leads ADD COLUMN timestamp DATETIME DEFAULT CURRENT_TIMESTAMP"); } catch(e){}
    try { await db.exec("ALTER TABLE agenda ADD COLUMN notas TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE products ADD COLUMN imagen TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE products ADD COLUMN catalog_link TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE messages ADD COLUMN mediaUrl TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE messages ADD COLUMN mediaType TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE leads ADD COLUMN channel_phone TEXT"); } catch(e){}

    // Migration of existing settings to whatsapp_channels
    try {
      const fromNum = await getDynamicSetting('ycloud_from', process.env.YCLOUD_FROM);
      const apiKey = await getDynamicSetting('ycloud_api_key', process.env.YCLOUD_API_KEY);
      const outboundWebhook = await getDynamicSetting('n8n_outbound_webhook', process.env.N8N_OUTBOUND_WEBHOOK);
      if (fromNum) {
        const cleanFromNum = String(fromNum).trim();
        if (cleanFromNum) {
          const existing = await db.get("SELECT id FROM whatsapp_channels WHERE phone = ?", cleanFromNum);
          if (!existing) {
            await db.run(
              "INSERT INTO whatsapp_channels (phone, api_key, name, outbound_webhook, active) VALUES (?, ?, ?, ?, 1)",
              cleanFromNum, apiKey || '', 'Canal Principal', outboundWebhook || ''
            );
            console.log(`✅ Canal principal migrado a whatsapp_channels: ${cleanFromNum}`);
          }
        }
      }
    } catch (e) {
      console.error("⚠️ Error migrando canal principal:", e);
    }

    // Set channel_phone to default channel if null
    try {
      const defaultChannel = await db.get("SELECT phone FROM whatsapp_channels LIMIT 1");
      if (defaultChannel?.phone) {
        const cleanDefaultPhone = String(defaultChannel.phone).replace(/\D/g, '');
        await db.run("UPDATE leads SET channel_phone = ? WHERE channel_phone IS NULL OR channel_phone = ''", cleanDefaultPhone);
      }
    } catch(e) {}

    // Load stored token from settings (overrides env var)
    const storedToken = await db.get("SELECT value FROM settings WHERE key='dashboard_token'");
    if (storedToken?.value) currentToken = storedToken.value;

    console.log("✅ Base de datos inicializada correctamente.");
  } catch (err) {
    console.error("❌ ERROR CRÍTICO EN SETUP DE BD:", err);
    throw err;
  }
}

// Helper: obtener canal configurado por número o fallback al primero activo
async function getChannelConfig(channelPhone) {
  try {
    let cleanChan = channelPhone ? String(channelPhone).replace(/\D/g, '') : null;
    let channel = null;
    if (cleanChan) {
      channel = await db.get("SELECT * FROM whatsapp_channels WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ? AND active = 1", cleanChan);
    }
    if (!channel) {
      channel = await db.get("SELECT * FROM whatsapp_channels WHERE active = 1 LIMIT 1");
    }
    return channel;
  } catch (e) {
    console.error("❌ Error en getChannelConfig:", e);
    return null;
  }
}

// Helper: obtener configuraciones dinámicas de la base de datos
async function getDynamicSetting(key, fallback) {
  try {
    const row = await db.get("SELECT value FROM settings WHERE key=?", key);
    return row?.value || fallback;
  } catch (e) {
    return fallback;
  }
}

// Helper: extrae ENVIAR_IMAGEN del texto del bot y devuelve texto limpio + URL
function parseImageFromText(text) {
  if (!text) return { cleanText: text, imageUrl: null };
  const match = text.match(/ENVIAR_IMAGEN:\s*(https?:\/\/[^\s\n]+)/i);
  if (!match) return { cleanText: text, imageUrl: null };
  const imageUrl = match[1].trim();
  const cleanText = text.replace(/\n?ENVIAR_IMAGEN:\s*https?:\/\/[^\s\n]+/gi, '').trim();
  return { cleanText, imageUrl };
}

// Helper: envía imagen vía YCloud WhatsApp API
async function sendImageViaYCloud(toPhone, imageUrl, caption = '', channelPhone = null) {
  try {
    const channel = await getChannelConfig(channelPhone);
    const apiKey = channel ? channel.api_key : await getDynamicSetting('ycloud_api_key', process.env.YCLOUD_API_KEY);
    const fromNum = channel ? channel.phone : await getDynamicSetting('ycloud_from', process.env.YCLOUD_FROM);
    const payload = { from: fromNum, to: toPhone, type: 'image', image: { link: imageUrl } };
    if (caption) payload.image.caption = caption;
    await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify(payload)
    });
    console.log(`🖼️ Imagen enviada a ${toPhone} desde ${fromNum}: ${imageUrl}`);
  } catch(e) {
    console.error('❌ Error enviando imagen via YCloud:', e.message);
  }
}

// Helper para normalizar textos para comparación
const normalize = (text) => {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

// Helper para detectar estado según palabras clave
function detectStatus(text, currentStatus) {
  if (!text) return currentStatus;
  const t = normalize(text);
  if (t.includes('precio') || t.includes('cotizar') || t.includes('cuanto') || t.includes('costo') || t.includes('valor')) {
    return 'Interesado';
  }
  if (t.includes('agendar') || t.includes('cita') || t.includes('servicio') || t.includes('reunion') || t.includes('programar')) {
    return 'Cita Agendada';
  }
  if (t.includes('comprado') || t.includes('pago') || t.includes('transferencia') || t.includes('comprobante') || t.includes('deposito')) {
    return 'Venta';
  }
  return currentStatus;
}


// Detección de Handoff
async function detectHandoff(text) {
  if (!text) return null;
  const t = normalize(text);
  
  // Palabras clave críticas fijas
  const critical = ['humano', 'persona', 'agente', 'asesor', 'atencion al cliente', 'hablar con alguien', 'emergencia', 'urgente', 'queja', 'reclamo', 'comprar ya', 'quiero comprar'];
  for (const word of critical) {
    if (t.includes(word)) return `Palabra clave detectada: "${word}"`;
  }

  // Buscar en triggers configurables de la BD
  try {
    const triggers = await db.all("SELECT keyword FROM handoff_triggers");
    for (const trig of triggers) {
      if (t.includes(normalize(trig.keyword))) return `Trigger configurado: "${trig.keyword}"`;
    }
  } catch(e) {}

  return null;
}

// Función inteligente para guardar mensajes y actualizar leads
async function saveSmartMessage(leadId, sender, text, timestamp, mediaUrl = null, mediaType = null) {
  // 1. Guardar mensaje
  await db.run(
    "INSERT INTO messages (lead_id, sender, text, timestamp, mediaUrl, mediaType) VALUES (?, ?, ?, ?, ?, ?)",
    leadId, sender, text, timestamp, mediaUrl, mediaType
  );

  // 2. Si es del cliente, intentar extraer datos (Simulado por ahora, n8n hace el pesado)
  if (sender === 'client' && text) {
    const t = normalize(text);
    
    // Auto-update de etiquetas según contenido
    if (t.includes('precio') || t.includes('cuanto cuesta')) {
      await db.run("UPDATE leads SET etiquetas = COALESCE(etiquetas || ',', '') || 'Interesado' WHERE id = ? AND (etiquetas NOT LIKE '%Interesado%' OR etiquetas IS NULL)", leadId);
    }
    
    // Incrementar score por interacción
    await db.run("UPDATE leads SET score = MIN(score + 5, 100) WHERE id = ?", leadId);
  }
}

// --- ENDPOINTS ---

app.get('/api/stats', async (req, res) => {
  try {
    const row = await db.get("SELECT COUNT(*) as count FROM messages WHERE sender = 'bot'");
    res.json({ botMessages: row ? row.count : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/capture/stats', async (req, res) => {
  try {
    let totalQuery = "SELECT COUNT(*) as c FROM leads WHERE archived = 0";
    const params = [];
    if (req.user.channel_phone) {
      totalQuery += " AND REPLACE(REPLACE(REPLACE(channel_phone, '+', ''), ' ', ''), '-', '') = ?";
      params.push(String(req.user.channel_phone).replace(/\D/g, ''));
    }
    const total = await db.get(totalQuery, ...params);

    const fields = [
      { key: 'nombre',    label: 'Nombre' },
      { key: 'phone',     label: 'Teléfono' },
      { key: 'direccion', label: 'Dirección' },
      { key: 'nit',       label: 'NIT' },
      { key: 'email',     label: 'Email' },
      { key: 'motor',     label: 'Motor / Producto' },
      { key: 'falla',     label: 'Falla / Problema' },
      { key: 'zona',      label: 'Zona' },
      { key: 'notas',     label: 'Notas' },
    ];
    const stats = await Promise.all(fields.map(async f => {
      let q = `SELECT COUNT(*) as c FROM leads WHERE archived = 0 AND ${f.key} IS NOT NULL AND TRIM(${f.key}) != ''`;
      const fParams = [];
      if (req.user.channel_phone) {
        q += " AND REPLACE(REPLACE(REPLACE(channel_phone, '+', ''), ' ', ''), '-', '') = ?";
        fParams.push(String(req.user.channel_phone).replace(/\D/g, ''));
      }
      const row = await db.get(q, ...fParams);
      return { ...f, captured: row.c, total: total.c, pct: total.c > 0 ? Math.round((row.c / total.c) * 100) : 0 };
    }));
    res.json(stats);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/leads', async (req, res) => {
  try {
    const { archived, channel_phone } = req.query;
    const isArchived = archived === 'true' ? 1 : 0;
    
    // Force filtering by the operator's channel phone if defined
    let activeChannelPhone = channel_phone;
    if (req.user.channel_phone) {
      activeChannelPhone = req.user.channel_phone;
    }
    
    let query = `
      SELECT l.*,
        (SELECT text FROM messages m WHERE m.lead_id = l.id ORDER BY id DESC LIMIT 1) as lastMessage,
        (SELECT timestamp FROM messages m WHERE m.lead_id = l.id ORDER BY id DESC LIMIT 1) as lastMessageTime,
        (SELECT sender FROM messages m WHERE m.lead_id = l.id ORDER BY id DESC LIMIT 1) as lastMessageSender,
        (SELECT id FROM messages m WHERE m.lead_id = l.id AND m.sender = 'client' ORDER BY id DESC LIMIT 1) as lastClientMsgId
      FROM leads l
      WHERE l.archived = ?
    `;
    const params = [isArchived];

    if (activeChannelPhone && activeChannelPhone !== 'all') {
      const cleanChan = String(activeChannelPhone).replace(/\D/g, '');
      query += ` AND REPLACE(REPLACE(REPLACE(l.channel_phone, '+', ''), ' ', ''), '-', '') = ?`;
      params.push(cleanChan);
    }

    query += ` ORDER BY l.priority DESC, l.id DESC`;

    const rows = await db.all(query, ...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const { nombre, phone, origen, botActive, email, channel_phone } = req.body;
    let targetChannel = channel_phone;
    if (!targetChannel) {
      const defaultChan = await db.get("SELECT phone FROM whatsapp_channels LIMIT 1");
      targetChannel = defaultChan?.phone || '';
    }
    const cleanChannelPhone = targetChannel ? String(targetChannel).replace(/\D/g, '') : '';

    const result = await db.run(
      "INSERT INTO leads (nombre, phone, origen, botActive, email, channel_phone) VALUES (?, ?, ?, ?, ?, ?)",
      nombre || 'Cliente Nuevo', phone, origen || 'Manual', botActive ?? 1, email || '', cleanChannelPhone
    );
    res.json({ id: result.lastID, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar Lead completo
app.put('/api/leads/:id', async (req, res) => {
  try {
    const { nombre, phone, email, motor, falla, zona, direccion, notas, nit, etiquetas, estado, score, priority, botActive } = req.body;
    await db.run(
      `UPDATE leads SET 
        nombre=?, phone=?, email=?, motor=?, falla=?, zona=?, direccion=?, 
        notas=?, nit=?, etiquetas=?, estado=?, score=?, priority=?, botActive=? 
      WHERE id=?`,
      nombre, phone, email, motor, falla, zona, direccion, 
      notas, nit, etiquetas, estado, score, priority, botActive, req.params.id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint Webhook para n8n (Recibir mensajes de WhatsApp)
app.post('/api/webhook/whatsapp', async (req, res) => {
  try {
    const data = req.body;
    const phone = data.phone;
    const mensajePrincipal = data.message || data.text;
    const mensajeSecundario = data.bot_response; // Si n8n ya tiene la respuesta de la IA
    const senderPrincipal = data.sender || 'client';
    const mediaUrl = data.mediaUrl;
    const mediaType = data.mediaType;
    const channel_phone = data.channel_phone || data.business_phone || data.to || null;

    if (!phone) return res.status(400).json({ error: "Falta phone" });

    // Normalize target/channel phone if provided
    let cleanChannelPhone = null;
    if (channel_phone) {
      cleanChannelPhone = String(channel_phone).replace(/\D/g, '');
    } else {
      // Fallback: look at default channel
      const defaultChan = await db.get("SELECT phone FROM whatsapp_channels LIMIT 1");
      if (defaultChan) {
        cleanChannelPhone = String(defaultChan.phone).replace(/\D/g, '');
      }
    }

    // Buscar lead por teléfono (normalizado) y canal
    const cleanPhone = String(phone).replace(/\D/g, '');
    let existingLead;
    if (cleanChannelPhone) {
      existingLead = await db.get(
        "SELECT id, botActive FROM leads WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ? AND REPLACE(REPLACE(REPLACE(channel_phone, '+', ''), ' ', ''), '-', '') = ?",
        cleanPhone, cleanChannelPhone
      );
    } else {
      existingLead = await db.get(
        "SELECT id, botActive FROM leads WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?",
        cleanPhone
      );
    }

    let leadId;
    if (!existingLead) {
      const result = await db.run(
        "INSERT INTO leads (nombre, phone, origen, botActive, estado, channel_phone) VALUES (?, ?, 'WhatsApp (n8n)', 1, 'Nuevo', ?)",
        data.name || 'Cliente WhatsApp', phone, cleanChannelPhone
      );
      leadId = result.lastID;
    } else {
      leadId = existingLead.id;
    }

    const now = new Date();
    const guateTime = new Date(now.getTime() - (6 * 60 * 60 * 1000));
    const time = guateTime.getUTCHours().toString().padStart(2, '0') + ':' + guateTime.getUTCMinutes().toString().padStart(2, '0') + (guateTime.getUTCHours() >= 12 ? ' PM' : ' AM');

    console.log(`📩 Procesando Webhook - Lead ID: ${leadId} (Canal: ${cleanChannelPhone})`);

    // ── DETECCIÓN AUTOMÁTICA DE HANDOFF ────────────────────────────────────
    const handoffReason = data.handoff_reason || await detectHandoff(mensajePrincipal);
    if (handoffReason) {
      // No re-disparar si el bot ya está inactivo
      const leadState = await db.get("SELECT botActive FROM leads WHERE id = ?", leadId);
      if (leadState && leadState.botActive === 0) {
        console.log(`ℹ️ Lead ${leadId}: handoff detectado pero bot ya está inactivo — ignorado`);
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

app.get('/api/webhook/setup-all-ycloud', async (req, res) => {
  try {
    const channels = await db.all("SELECT phone, api_key FROM whatsapp_channels WHERE active = 1");
    const results = [];

    for (const channel of channels) {
      const apiKey = channel.api_key;
      const phone = channel.phone;
      if (!apiKey || apiKey.trim() === '') {
        results.push({ phone, status: "ignored (empty api key)" });
        continue;
      }

      console.log(`🔧 Configurando webhook YCloud para canal ${phone}...`);
      
      // 1. Obtener webhooks existentes para verificar si ya está configurado
      const getRes = await fetch("https://api.ycloud.com/v2/webhookEndpoints", {
        headers: { "X-API-Key": apiKey, "Accept": "application/json" }
      });

      if (!getRes.ok) {
        results.push({ phone, status: `error fetching: ${getRes.status} ${await getRes.text()}` });
        continue;
      }

      const getJson = await getRes.json();
      const targetUrl = "https://appn8n-n8n.83aqlq.easypanel.host/webhook/21228c18-514c-4039-9afb-ac40c3635f7c";
      const existing = getJson.items?.find(item => item.url === targetUrl);

      if (existing) {
        if (existing.status === 'active') {
          results.push({ phone, status: "already active" });
          continue;
        } else {
          // Reactivar si está deshabilitado
          const patchRes = await fetch(`https://api.ycloud.com/v2/webhookEndpoints/${existing.id}`, {
            method: 'PATCH',
            headers: {
              "X-API-Key": apiKey,
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({ status: 'active' })
          });
          results.push({ phone, status: `reactivated: ${patchRes.status}` });
          continue;
        }
      }

      // 2. Crear nuevo webhook endpoint
      const postRes = await fetch("https://api.ycloud.com/v2/webhookEndpoints", {
        method: 'POST',
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          url: targetUrl,
          enabledEvents: [
            "whatsapp.inbound_message.received",
            "whatsapp.smb.message.echoes",
            "contact.attributes_changed"
          ],
          eventProperties: [
            {
              event: "contact.attributes_changed",
              properties: ["tags"]
            }
          ],
          status: "active"
        })
      });

      if (postRes.ok) {
        results.push({ phone, status: "created successfully" });
      } else {
        results.push({ phone, status: `failed creating: ${postRes.status} ${await postRes.text()}` });
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/webhook/n8n', async (req, res) => {
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
  const channel_phone = req.body.channel_phone || req.body.business_phone || req.body.to || null;

  try {
    const cleanPhone = String(data.phone).replace(/\D/g, '');
    const mensajePrincipal = data.mensaje || data.respuesta_cliente || data.mensaje_cliente || data.texto_cliente || data.client_message;
    const mensajeSecundario = data.respuesta_bot || data.texto_limpio || data.bot_response || data.output;

    // Normalize target/channel phone if provided
    let cleanChannelPhone = null;
    if (channel_phone) {
      cleanChannelPhone = String(channel_phone).replace(/\D/g, '');
    } else {
      // Fallback: look at default channel
      const defaultChan = await db.get("SELECT phone FROM whatsapp_channels LIMIT 1");
      if (defaultChan) {
        cleanChannelPhone = String(defaultChan.phone).replace(/\D/g, '');
      }
    }

    console.log(`📨 WEBHOOK N8N recibido:`, JSON.stringify({ phone: data.phone, channel_phone: cleanChannelPhone, mensaje: mensajePrincipal?.slice?.(0,50), respuesta_bot: mensajeSecundario?.slice?.(0,50), media_url: data.media_url, mediaUrl: data.mediaUrl }));
    console.log(`🔍 Buscando contacto para número normalizado: ${cleanPhone} y canal ${cleanChannelPhone}`);
    
    let existingLead;
    if (cleanChannelPhone) {
      existingLead = await db.get(
        "SELECT id, nombre, estado, score FROM leads WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ? AND REPLACE(REPLACE(REPLACE(channel_phone, '+', ''), ' ', ''), '-', '') = ?",
        cleanPhone, cleanChannelPhone
      );
    } else {
      existingLead = await db.get(
        "SELECT id, nombre, estado, score FROM leads WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?",
        cleanPhone
      );
    }
    
    let currentEstado = data.etiqueta || (existingLead ? existingLead.estado : "Nuevo");
    const STATUS_SCORES = { 'Nuevo': 10, 'Interesado': 40, 'Cita Agendada': 75, 'Venta': 100, 'Post-Venta': 100, 'Perdido': 0, 'Intervención Requerida': 85 };
    
    let detectedEstado = detectStatus(mensajePrincipal, currentEstado);
    detectedEstado = detectStatus(mensajeSecundario, detectedEstado);
    
    const finalEstado = detectedEstado;
    const finalScore = STATUS_SCORES[finalEstado] || data.score || (existingLead ? existingLead.score : 10);

    let leadId;

    if (existingLead) {
      console.log(`   ✅ Lead existente encontrado: ID ${existingLead.id}`);
      const updates = ["estado = ?", "score = ?"];
      const params = [finalEstado, finalScore];

      if (data.bot_apagado !== undefined) {
        updates.push("botActive = ?");
        params.push(data.bot_apagado ? 0 : 1);
      }
      
      params.push(existingLead.id);
      await db.run(`UPDATE leads SET ${updates.join(", ")} WHERE id = ?`, ...params);
      leadId = existingLead.id;
    } else {
      console.log("   🆕 Creando nuevo lead...");
      const result = await db.run(`INSERT INTO leads (nombre, phone, email, score, estado, origen, botActive, motor, falla, zona, direccion, notas, nit, channel_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        nombre, data.phone, email, finalScore, finalEstado, origen, 1, motor, falla, zona, data.direccion || null, data.notas || null, data.nit || null, cleanChannelPhone);
      leadId = result.lastID;
    }

    const mediaUrl = data.media_url || data.mediaUrl || data.image_url || data.file_url;

    // Client message — media_url is the bot's image, don't attach it here
    if (mensajePrincipal) {
      await saveSmartMessage(leadId, data.sender || 'client', mensajePrincipal, time);
    }
    // Bot response — attach media_url to bot sender
    if (mensajeSecundario || mediaUrl) {
      const { cleanText: cleanBot, imageUrl: botImageUrl } = parseImageFromText(mensajeSecundario || '');
      const botImageFinal = mediaUrl || botImageUrl;
      if (cleanBot) await saveSmartMessage(leadId, 'bot', cleanBot, time);
      if (botImageFinal) await saveSmartMessage(leadId, 'bot', '', time, botImageFinal, 'image');
    }

    // Auto-crear pedido cuando el bot cierra venta (#PEDIDO_LISTO)
    if (data.etiqueta === 'PEDIDO_LISTO') {
      const lead = await db.get("SELECT nombre, phone, channel_phone FROM leads WHERE id = ?", leadId);
      const producto = data.pedido_producto || 'Ver conversación';
      const guateDate = new Date(now.getTime() - (6 * 60 * 60 * 1000));
      const timestamp = guateDate.getUTCFullYear() + '-' +
        String(guateDate.getUTCMonth() + 1).padStart(2, '0') + '-' +
        String(guateDate.getUTCDate()).padStart(2, '0') + ' ' +
        String(guateDate.getUTCHours()).padStart(2, '0') + ':' +
        String(guateDate.getUTCMinutes()).padStart(2, '0');
      const pedidoResult = await db.run(
        "INSERT INTO pedidos (cliente, phone, producto, cantidad, notas, estado, timestamp) VALUES (?, ?, ?, ?, ?, 'Nuevo', ?)",
        lead?.nombre || nombre, lead?.phone || data.phone, producto, '1', mensajeSecundario?.slice(0, 200) || '', timestamp
      );
      console.log(`🛒 Pedido auto-creado #${pedidoResult.lastID} para lead ${leadId}: ${producto}`);
      await notificarDueno(
        `🛒 *NUEVO PEDIDO #${pedidoResult.lastID}*\n👤 ${lead?.nombre || nombre}\n📦 ${producto}\n📱 ${lead?.phone || data.phone}\n\nRevisa el dashboard para gestionar el pedido.`,
        lead?.channel_phone || cleanChannelPhone
      );
    }

    res.json({ success: true, action: existingLead ? "updated" : "created" });
  } catch (err) {
    console.error("❌ Error webhook n8n:", err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint dedicado para activar Handoff (n8n puede llamar esto directamente)
app.post('/api/leads/handoff', async (req, res) => {
  try {
    const { leadId, phone, reason, mensaje, nombre: nombreParam, channel_phone } = req.body;
    if (!leadId && !phone) return res.status(400).json({ error: "Se necesita leadId o phone" });

    let cleanChannelPhone = null;
    if (channel_phone) {
      cleanChannelPhone = String(channel_phone).replace(/\D/g, '');
    } else {
      const defaultChan = await db.get("SELECT phone FROM whatsapp_channels LIMIT 1");
      if (defaultChan) {
        cleanChannelPhone = String(defaultChan.phone).replace(/\D/g, '');
      }
    }

    let id = leadId;
    if (!id && phone) {
      const cleanPhone = String(phone).replace(/\D/g, '');
      let lead;
      if (cleanChannelPhone) {
        lead = await db.get(
          "SELECT id FROM leads WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ? AND REPLACE(REPLACE(REPLACE(channel_phone, '+', ''), ' ', ''), '-', '') = ?",
          cleanPhone, cleanChannelPhone
        );
      } else {
        lead = await db.get(
          "SELECT id FROM leads WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?",
          cleanPhone
        );
      }
      
      if (!lead) {
        // Crear lead si no existe y viene con nombre
        const result = await db.run(
          "INSERT INTO leads (nombre, phone, estado, origen, botActive, priority, channel_phone) VALUES (?, ?, 'Intervención Requerida', 'WhatsApp (n8n)', 0, 'urgent', ?)",
          nombreParam || 'Cliente Nuevo', phone, cleanChannelPhone
        );
        id = result.lastID;
      } else {
        id = lead.id;
      }
    }

    // Bug 2 fix: si el bot ya está inactivo o el lead ya está en gestión, no re-disparar handoff
    const currentLead = await db.get("SELECT estado, botActive FROM leads WHERE id = ?", id);
    if (currentLead && (currentLead.estado === 'En Gestión' || currentLead.botActive === 0)) {
      // Solo guardar el mensaje del cliente si viene, pero no re-marcar como urgente
      if (mensaje && mensaje.trim()) {
        const now = new Date();
        const guateTime = new Date(now.getTime() - (6 * 60 * 60 * 1000));
        const time = guateTime.getUTCHours().toString().padStart(2, '0') + ':' + guateTime.getUTCMinutes().toString().padStart(2, '0') + (guateTime.getUTCHours() >= 12 ? ' PM' : ' AM');
        await db.run("INSERT INTO messages (lead_id, sender, text, timestamp) VALUES (?, ?, ?, ?)", id, 'client', mensaje.trim(), time);
      }
      const skipReason = currentLead.botActive === 0 ? 'Bot ya inactivo — handoff ignorado' : 'Lead ya en gestión manual';
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

// Endpoint para toggle de bot por lead
app.post('/api/leads/:id/bot-toggle', async (req, res) => {
  try {
    const { botActive } = req.body;
    await db.run("UPDATE leads SET botActive = ? WHERE id = ?", botActive ? 1 : 0, req.params.id);
    console.log(`🤖 Bot ${botActive ? 'ACTIVADO' : 'DESACTIVADO'} para lead ${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
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
    const leadId = req.params.leadId;
    if (req.user.channel_phone) {
      const lead = await db.get("SELECT channel_phone FROM leads WHERE id = ?", leadId);
      if (!lead) return res.status(404).json({ error: "Lead no encontrado" });
      const cleanLeadChan = String(lead.channel_phone || '').replace(/\D/g, '');
      const cleanUserChan = String(req.user.channel_phone).replace(/\D/g, '');
      if (cleanLeadChan !== cleanUserChan) {
        return res.status(403).json({ error: "No tienes permiso para ver este lead" });
      }
    }
    const rows = await db.all("SELECT * FROM messages WHERE lead_id = ? ORDER BY id ASC", leadId);
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
    const reqChannel = req.query.channel_phone || req.query.to || req.query.business_phone;
    let cleanChannelPhone = reqChannel ? String(reqChannel).replace(/\D/g, '') : null;

    if (!cleanChannelPhone) {
      // Fallback: look at default channel
      const defaultChan = await db.get("SELECT phone FROM whatsapp_channels LIMIT 1");
      if (defaultChan) {
        cleanChannelPhone = String(defaultChan.phone).replace(/\D/g, '');
      }
    }

    let lead;
    if (cleanChannelPhone) {
      lead = await db.get(
        "SELECT botActive, priority, handoff_reason, nombre, estado FROM leads WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ? AND REPLACE(REPLACE(REPLACE(channel_phone, '+', ''), ' ', ''), '-', '') = ?",
        cleanPhone, cleanChannelPhone
      );
    } else {
      lead = await db.get(
        "SELECT botActive, priority, handoff_reason, nombre, estado FROM leads WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?",
        cleanPhone
      );
    }

    if (!lead) {
      // Si el lead no existe aún, el bot puede responder (nuevo cliente)
      return res.json({ botActive: true, priority: 'normal', handoff_reason: null, found: false });
    }

    console.log(`🤖 Consulta de estado bot para ${cleanPhone} (canal ${cleanChannelPhone}): botActive=${!!lead.botActive}, priority=${lead.priority}`);
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
// Fallback environment variables
const ENV_OWNER_PHONE = process.env.OWNER_PHONE;
const ENV_YCLOUD_API_KEY = process.env.YCLOUD_API_KEY;
const ENV_YCLOUD_FROM = process.env.YCLOUD_FROM;

// ─── HANDOFF TRIGGERS CRUD ───────────────────────────────────────────────────
app.get('/api/handoff/triggers', async (_req, res) => {
  try {
    const rows = await db.all("SELECT * FROM handoff_triggers ORDER BY id ASC");
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/handoff/triggers', async (req, res) => {
  try {
    const triggers = req.body;
    if (!Array.isArray(triggers)) return res.status(400).json({ error: "Se esperaba un array" });
    await db.run("DELETE FROM handoff_triggers");
    for (const t of triggers) {
      if (t.keyword?.trim()) {
        await db.run("INSERT INTO handoff_triggers (keyword, priority) VALUES (?, ?)", t.keyword.trim(), t.priority || 'urgent');
      }
    }
    res.json({ success: true, saved: triggers.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ─────────────────────────────────────────────────────────────────────────────

async function notificarDueno(mensaje, channelPhone = null) {
  try {
    const channel = await getChannelConfig(channelPhone);
    const apiKey = channel ? channel.api_key : await getDynamicSetting('ycloud_api_key', process.env.YCLOUD_API_KEY);
    const fromNum = channel ? channel.phone : await getDynamicSetting('ycloud_from', process.env.YCLOUD_FROM);
    const ownerNum = await getDynamicSetting('owner_phone', process.env.OWNER_PHONE);
    
    if (!ownerNum) {
      console.log('⚠️ No se configuró número de teléfono del dueño para notificaciones.');
      return;
    }

    // Permitir múltiples números separados por coma, punto y coma, o espacios
    const targetPhones = ownerNum.split(/[,;\s]+/).map(p => p.trim()).filter(p => p.length > 0);

    if (targetPhones.length === 0) {
      console.log('⚠️ No se encontraron números válidos en owner_phone:', ownerNum);
      return;
    }

    console.log(`📲 Enviando notificaciones a ${targetPhones.length} destinatarios desde ${fromNum}...`);

    await Promise.all(targetPhones.map(async (toPhone) => {
      try {
        const res = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
          body: JSON.stringify({
            from: fromNum,
            to: toPhone,
            type: 'text',
            text: { body: mensaje }
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error(`❌ Error enviando notificación a ${toPhone}: ${res.status} ${errText}`);
        } else {
          console.log(`📲 Notificación enviada a ${toPhone}: ${mensaje.substring(0,50)}...`);
        }
      } catch (err) {
        console.error(`❌ Error enviando notificación a ${toPhone}:`, err.message);
      }
    }));
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

    // Buscar canal del lead
    let channelPhone = null;
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    if (cleanPhone) {
      const lead = await db.get("SELECT channel_phone FROM leads WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ? LIMIT 1", cleanPhone);
      channelPhone = lead?.channel_phone || null;
    }

    // Notificar al dueño por WhatsApp
    const msg = `🛒 *NUEVO PEDIDO #${result.lastID}*\n\n👤 Cliente: ${cliente || 'Sin nombre'}\n📱 Tel: ${phone || 'Sin teléfono'}\n📦 Producto: ${producto}\n🔢 Cantidad: ${cantidad || '1'}${precio ? '\n💰 Precio: ' + precio : ''}${notas ? '\n📝 Notas: ' + notas : ''}\n\n⏰ ${timestamp}\n\n✅ Ve al Dashboard para gestionar el pedido.`;
    await notificarDueno(msg, channelPhone);
    res.json({ success: true, id: result.lastID });
  } catch(err) {
    console.error('❌ Error creando pedido:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pedidos', async (req, res) => {
  try {
    if (req.user.channel_phone) {
      const cleanChan = String(req.user.channel_phone).replace(/\D/g, '');
      const rows = await db.all(
        `SELECT p.* FROM pedidos p
         INNER JOIN leads l ON REPLACE(REPLACE(REPLACE(p.phone, '+', ''), ' ', ''), '-', '') = REPLACE(REPLACE(REPLACE(l.phone, '+', ''), ' ', ''), '-', '')
         WHERE REPLACE(REPLACE(REPLACE(l.channel_phone, '+', ''), ' ', ''), '-', '') = ?
         ORDER BY p.id DESC`,
        cleanChan
      );
      res.json(rows);
    } else {
      const rows = await db.all('SELECT * FROM pedidos ORDER BY id DESC');
      res.json(rows);
    }
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

// Alias POST /api/pedidos/status (compatibilidad frontend)
app.post('/api/pedidos/status', async (req, res) => {
  try {
    const { id, estado } = req.body;
    const validStates = ['Nuevo', 'En Proceso', 'Completado', 'Cancelado'];
    if (!id) return res.status(400).json({ error: 'Falta id' });
    if (!validStates.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
    await db.run('UPDATE pedidos SET estado = ? WHERE id = ?', estado, id);
    res.json({ success: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/pedidos/:id', async (req, res) => {
  try {
    const { cliente, phone, producto, cantidad, precio, notas, estado } = req.body;
    await db.run(
      'UPDATE pedidos SET cliente=?, phone=?, producto=?, cantidad=?, precio=?, notas=?, estado=? WHERE id=?',
      cliente, phone, producto, cantidad || '1', precio || '', notas || '', estado, req.params.id
    );
    res.json({ success: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/pedidos/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM pedidos WHERE id = ?', req.params.id);
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

app.get('/api/bot/channel-key', async (req, res) => {
  try {
    const phone = req.query.phone;
    if (!phone) return res.status(400).json({ error: "Falta phone" });
    const cleanPhone = String(phone).replace(/\D/g, '');
    const channel = await db.get(
      "SELECT api_key FROM whatsapp_channels WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ? AND active = 1",
      cleanPhone
    );
    if (channel && channel.api_key && channel.api_key.trim() !== '') {
      return res.json({ api_key: channel.api_key });
    }
    // Fallback a la API key por defecto del env
    const defaultApiKey = await getDynamicSetting('ycloud_api_key', process.env.YCLOUD_API_KEY);
    res.json({ api_key: defaultApiKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) throw new Error("Key is required");
    // Limpiar IDs de actualización que n8n va acumulando al final del prompt
    const cleanValue = typeof value === 'string'
      ? value.replace(/\s*\(ID_ACTUALIZACION:\s*\d+\)/g, '').trimEnd()
      : value;
    console.log(`⚙️ Guardando configuración: ${key} (${cleanValue?.length || 0} chars)`);
    await db.run("REPLACE INTO settings (key, value) VALUES (?, ?)", key, cleanValue);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CANALES DE WHATSAPP (CRUD) ──────────────────────────────────────────────
app.get('/api/channels', async (_req, res) => {
  try {
    const rows = await db.all("SELECT * FROM whatsapp_channels ORDER BY id ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/channels/by-phone/:phone', async (req, res) => {
  try {
    const cleanPhone = String(req.params.phone).replace(/\D/g, '');
    const channel = await db.get("SELECT * FROM whatsapp_channels WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ? AND active = 1", cleanPhone);
    if (!channel) {
      return res.status(404).json({ error: "Canal no encontrado o inactivo" });
    }
    res.json(channel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/channels', async (req, res) => {
  try {
    const { phone, api_key, name, outbound_webhook, active } = req.body;
    if (!phone) return res.status(400).json({ error: "El teléfono es requerido" });
    const cleanPhone = String(phone).trim();
    
    // Check if phone already exists
    const existing = await db.get("SELECT id FROM whatsapp_channels WHERE phone = ?", cleanPhone);
    if (existing) {
      return res.status(400).json({ error: "Este número de teléfono ya está registrado" });
    }

    const result = await db.run(
      "INSERT INTO whatsapp_channels (phone, api_key, name, outbound_webhook, active) VALUES (?, ?, ?, ?, ?)",
      cleanPhone, api_key || '', name || 'Canal WhatsApp', outbound_webhook || '', active ?? 1
    );
    res.json({ success: true, id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/channels/:id', async (req, res) => {
  try {
    const { phone, api_key, name, outbound_webhook, active } = req.body;
    if (!phone) return res.status(400).json({ error: "El teléfono es requerido" });
    const cleanPhone = String(phone).trim();

    await db.run(
      "UPDATE whatsapp_channels SET phone=?, api_key=?, name=?, outbound_webhook=?, active=? WHERE id=?",
      cleanPhone, api_key, name, outbound_webhook, active ?? 1, req.params.id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/channels/:id', async (req, res) => {
  try {
    const countRow = await db.get("SELECT COUNT(*) as c FROM whatsapp_channels");
    if (countRow.c <= 1) {
      return res.status(400).json({ error: "No se puede eliminar el último canal activo" });
    }
    await db.run("DELETE FROM whatsapp_channels WHERE id = ?", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña son requeridos" });
    }
    const cleanUsername = String(username).trim().toLowerCase();
    const hashed = hashPassword(password);

    const user = await db.get("SELECT * FROM users WHERE username = ? AND active = 1", cleanUsername);
    if (!user || user.password !== hashed) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

    // Generar session token
    const token = crypto.randomBytes(32).toString('hex');
    await db.run("INSERT INTO sessions (token, user_id) VALUES (?, ?)", token, user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        channel_phone: user.channel_phone
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      await db.run("DELETE FROM sessions WHERE token = ?", token);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', async (req, res) => {
  res.json({ user: req.user });
});

// Middleware para verificar que el usuario sea administrador
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: "Acceso denegado: se requiere rol de administrador" });
}

app.get('/api/users', requireAdmin, async (_req, res) => {
  try {
    const rows = await db.all("SELECT id, username, name, role, channel_phone, active, created_at FROM users ORDER BY id ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const { username, password, name, role, channel_phone, active } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: "Usuario, contraseña y nombre son requeridos" });
    }
    const cleanUsername = String(username).trim().toLowerCase();
    
    // Check if username already exists
    const existing = await db.get("SELECT id FROM users WHERE username = ?", cleanUsername);
    if (existing) {
      return res.status(400).json({ error: "Este nombre de usuario ya está registrado" });
    }

    const hashed = hashPassword(password);
    const result = await db.run(
      "INSERT INTO users (username, password, name, role, channel_phone, active) VALUES (?, ?, ?, ?, ?, ?)",
      cleanUsername, hashed, name, role || 'operator', channel_phone || null, active ?? 1
    );
    res.json({ success: true, id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { username, password, name, role, channel_phone, active } = req.body;
    if (!username || !name) {
      return res.status(400).json({ error: "Usuario y nombre son requeridos" });
    }
    const cleanUsername = String(username).trim().toLowerCase();

    // Check if another user has the same username
    const existing = await db.get("SELECT id FROM users WHERE username = ? AND id != ?", cleanUsername, req.params.id);
    if (existing) {
      return res.status(400).json({ error: "Este nombre de usuario ya está en uso" });
    }

    if (password && password.trim() !== '') {
      // Update password as well
      const hashed = hashPassword(password);
      await db.run(
        "UPDATE users SET username=?, password=?, name=?, role=?, channel_phone=?, active=? WHERE id=?",
        cleanUsername, hashed, name, role, channel_phone || null, active ?? 1, req.params.id
      );
    } else {
      // Update without password
      await db.run(
        "UPDATE users SET username=?, name=?, role=?, channel_phone=?, active=? WHERE id=?",
        cleanUsername, name, role, channel_phone || null, active ?? 1, req.params.id
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    // Prevent deleting the currently logged-in user
    if (req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({ error: "No puedes eliminar tu propio usuario" });
    }
    // Prevent deleting the primary admin user (id = 1) if it's the only admin
    const countAdmins = await db.get("SELECT COUNT(*) as c FROM users WHERE role = 'admin'");
    const targetUser = await db.get("SELECT role FROM users WHERE id = ?", req.params.id);
    if (targetUser && targetUser.role === 'admin' && countAdmins.c <= 1) {
      return res.status(400).json({ error: "No se puede eliminar el último administrador" });
    }

    // Delete active sessions for the user first
    await db.run("DELETE FROM sessions WHERE user_id = ?", req.params.id);
    await db.run("DELETE FROM users WHERE id = ?", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/change-token', async (req, res) => {
  try {
    const { newToken } = req.body;
    if (!newToken || typeof newToken !== 'string' || newToken.trim().length < 8) {
      return res.status(400).json({ error: 'El token debe tener al menos 8 caracteres' });
    }
    const token = newToken.trim();
    await db.run("REPLACE INTO settings (key, value) VALUES ('dashboard_token', ?)", token);
    currentToken = token;
    console.log('🔑 Token de acceso actualizado');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages/send', async (req, res) => {
  try {
    const { leadId, text, sender, phone } = req.body;
    if (!leadId || !text) return res.status(400).json({ error: "Faltan datos" });

    if (req.user.channel_phone) {
      const lead = await db.get("SELECT channel_phone FROM leads WHERE id = ?", leadId);
      if (!lead) return res.status(404).json({ error: "Lead no encontrado" });
      const cleanLeadChan = String(lead.channel_phone || '').replace(/\D/g, '');
      const cleanUserChan = String(req.user.channel_phone).replace(/\D/g, '');
      if (cleanLeadChan !== cleanUserChan) {
        return res.status(403).json({ error: "No tienes permiso para enviar mensajes a este lead" });
      }
    }

    const msgSender = sender || 'agent';
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    // Extraer imagen si el texto trae ENVIAR_IMAGEN:
    const { cleanText, imageUrl } = parseImageFromText(text);

    const result = await db.run("INSERT INTO messages (lead_id, sender, text, timestamp) VALUES (?, ?, ?, ?)", leadId, msgSender, cleanText, time);
    const savedMessage = { id: result.lastID, lead_id: leadId, sender: msgSender, text: cleanText, timestamp: time };

    // Guardar imagen como mensaje separado si existe
    if (imageUrl) {
      await db.run("INSERT INTO messages (lead_id, sender, text, mediaUrl, mediaType, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
        leadId, msgSender, '', imageUrl, 'image', time);
    }

    if (msgSender === 'agent') {
      const lead = await db.get("SELECT phone, channel_phone FROM leads WHERE id = ?", leadId);
      const targetPhone = phone || lead?.phone;
      if (targetPhone) {
        // Obtenemos la configuración de canal específica para el lead
        const channel = await getChannelConfig(lead?.channel_phone);
        const outboundWebhook = channel?.outbound_webhook || await getDynamicSetting('n8n_outbound_webhook', process.env.N8N_OUTBOUND_WEBHOOK);

        if (outboundWebhook && outboundWebhook.trim() !== '') {
          // Enviar texto limpio a n8n
          if (cleanText) {
            fetch(outboundWebhook, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: targetPhone,
                text: cleanText,
                channel_phone: lead?.channel_phone || channel?.phone || null
              })
            }).catch(err => console.error("❌ Error enviando texto a n8n:", err.message));
          }
          // Enviar imagen directo por YCloud si existe
          if (imageUrl) {
            sendImageViaYCloud(targetPhone, imageUrl, '', lead?.channel_phone);
          }
        } else {
          // FALLBACK DIRECTO A YCLOUD: Si no hay webhook de n8n, enviar el texto directamente a YCloud
          const apiKey = channel ? channel.api_key : await getDynamicSetting('ycloud_api_key', process.env.YCLOUD_API_KEY);
          const fromNum = channel ? channel.phone : await getDynamicSetting('ycloud_from', process.env.YCLOUD_FROM);
          if (apiKey && fromNum && cleanText) {
            console.log(`📩 Enviando texto directamente por YCloud (Sin n8n) desde ${fromNum} a ${targetPhone}`);
            fetch('https://api.ycloud.com/v2/whatsapp/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
              body: JSON.stringify({
                from: fromNum,
                to: targetPhone,
                type: 'text',
                text: { body: cleanText }
              })
            }).then(async r => {
              if (!r.ok) {
                const t = await r.text();
                console.error(`❌ Error directo YCloud: ${r.status} ${t}`);
              }
            }).catch(err => console.error("❌ Error de red directo YCloud:", err.message));
          }
          if (imageUrl) {
            sendImageViaYCloud(targetPhone, imageUrl, '', lead?.channel_phone);
          }
        }
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

    const msgBienvenida   = (s.msg_bienvenida   || '').replace('{nombre}', nombre).replace('{empresa}', empresa);
    const msgFallback     = (s.msg_fallback     || '');
    const msgFueraHorario = (s.msg_fuera_horario|| '');
    const msgDespedida    = (s.msg_despedida    || '');

    // Obtener catálogo de productos dinámicamente
    const prods = await db.all("SELECT * FROM products WHERE activo = 1 ORDER BY categoria, nombre");
    let catalogText = "";
    if (prods.length > 0) {
      catalogText = "CATÁLOGO DE PRODUCTOS DISPONIBLES (Usa esta información para cotizar y dar precios reales):\n";
      prods.forEach(p => {
        catalogText += `• ${p.nombre} — Precio: ${p.precio || 'Consultar'} | Stock: ${p.stock}\n`;
        if (p.descripcion) catalogText += `  Detalles: ${p.descripcion}\n`;
        if (p.imagen) catalogText += `  IMAGEN_PARA_ENVIAR: ${p.imagen}\n`;
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

    const mensajesSection = [
      msgBienvenida   ? `MENSAJE DE BIENVENIDA (usa este texto exacto cuando el cliente escribe por primera vez):\n"${msgBienvenida}"` : '',
      msgFallback     ? `MENSAJE DE FALLBACK (cuando no entiendes el mensaje del cliente):\n"${msgFallback}"` : '',
      msgFueraHorario ? `MENSAJE FUERA DE HORARIO:\n"${msgFueraHorario}"` : '',
      msgDespedida    ? `MENSAJE DE DESPEDIDA:\n"${msgDespedida}"` : '',
    ].filter(Boolean).join('\n\n');

    const systemPrompt = `Eres ${nombre}, ${rol} de ${empresa}.

EMPRESA:
${descripcion}

${catalogText}
${ragText}
TONO: ${tono}
IDIOMA: ${idioma}

${mensajesSection ? `MENSAJES CONFIGURADOS:\n${mensajesSection}\n` : ''}
INSTRUCCIONES DE COMPORTAMIENTO:
${instrucciones}

REGLAS IMPORTANTES:
- Responde siempre en ${idioma}
- Nunca digas que eres una IA a menos que te lo pregunten directamente
- Si no sabes algo, pide más detalles o transfiere al equipo humano
- Sé conciso en WhatsApp (máximo 3-4 líneas por respuesta)
- SI EL PRODUCTO TIENE UNA IMAGEN_PARA_ENVIAR: Incluye el texto "ENVIAR_IMAGEN: [URL_DE_LA_IMAGEN]" al final de tu mensaje para que el sistema la envíe automáticamente.

REGLA DE ESCALACIÓN (OBLIGATORIA):
Cuando NO puedas resolver autónomamente (cotización de envío, precio especial, soporte técnico, caso complejo) y necesites que un asesor contacte al cliente:
1. Di al cliente: "Perfecto, registré tu consulta. Un asesor te contactará pronto. 🙌"
2. En la ÚLTIMA línea escribe ÚNICAMENTE: #PEDIDO_LISTO
Esto notifica al equipo automáticamente. NUNCA digas "asesor te contactará" sin agregar #PEDIDO_LISTO al final.`.trim();

    res.json({ systemPrompt, nombre, rol, empresa, tono, idioma, tipo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AGENDA ───────────────────────────────────────────────────────────────────
app.get('/api/agenda', async (req, res) => {
  try {
    if (req.user.channel_phone) {
      const cleanChan = String(req.user.channel_phone).replace(/\D/g, '');
      const rows = await db.all(
        `SELECT a.* FROM agenda a
         INNER JOIN leads l ON REPLACE(REPLACE(REPLACE(a.phone, '+', ''), ' ', ''), '-', '') = REPLACE(REPLACE(REPLACE(l.phone, '+', ''), ' ', ''), '-', '')
         WHERE REPLACE(REPLACE(REPLACE(l.channel_phone, '+', ''), ' ', ''), '-', '') = ?
         ORDER BY a.fecha ASC, a.hora ASC`,
        cleanChan
      );
      res.json(rows);
    } else {
      const rows = await db.all("SELECT * FROM agenda ORDER BY fecha ASC, hora ASC");
      res.json(rows);
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/agenda', async (req, res) => {
  try {
    const { cliente, phone, fecha, hora, servicio, duracion, estado, notas } = req.body;
    if (!cliente || !fecha) return res.status(400).json({ error: "Cliente y fecha son requeridos" });
    const result = await db.run(
      "INSERT INTO agenda (cliente, phone, fecha, hora, servicio, duracion, estado, notas) VALUES (?,?,?,?,?,?,?,?)",
      cliente, phone || '', fecha, hora || '', servicio || '', duracion || '1 hora', estado || 'Pendiente', notas || ''
    );
    res.json({ success: true, id: result.lastID });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/agenda/:id', async (req, res) => {
  try {
    const { cliente, phone, fecha, hora, servicio, duracion, estado, notas } = req.body;
    await db.run(
      "UPDATE agenda SET cliente=?, phone=?, fecha=?, hora=?, servicio=?, duracion=?, estado=?, notas=? WHERE id=?",
      cliente, phone || '', fecha, hora || '', servicio || '', duracion || '1 hora', estado || 'Pendiente', notas || '', req.params.id
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/agenda/:id', async (req, res) => {
  try {
    await db.run("DELETE FROM agenda WHERE id = ?", req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ─────────────────────────────────────────────────────────────────────────────

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


// Endpoint para que n8n busque la imagen de un producto por nombre/keyword
app.get('/api/products/find-image', async (req, res) => {
  try {
    const q = req.query.q || req.query.query || '';
    if (!q) return res.json({ found: false, imagen: null, nombre: null });

    const normalizeKw = (k) => k.replace(/es$/, '').replace(/s$/, '');
    const keywords = q.toLowerCase().split(/\s+/).filter(k => k.length > 2).map(normalizeKw);

    const prods = await db.all("SELECT * FROM products WHERE activo = 1 AND imagen IS NOT NULL AND imagen != '' ORDER BY nombre");

    if (prods.length === 0) return res.json({ found: false, imagen: null, nombre: null });

    const scored = prods.map(p => {
      const lower = ((p.nombre || '') + ' ' + (p.descripcion || '') + ' ' + (p.categoria || '')).toLowerCase();
      let score = 0;
      keywords.forEach(kw => { if (lower.includes(kw)) score++; });
      return { ...p, score };
    }).filter(p => p.score > 0).sort((a, b) => b.score - a.score);

    if (scored.length === 0) return res.json({ found: false, imagen: null, nombre: null, message: 'No se encontró imagen para: ' + q });

    const best = scored[0];
    res.json({ found: true, nombre: best.nombre, imagen: best.imagen, precio: best.precio || '', catalog_link: best.catalog_link || '' });
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
          if (p.imagen) context += `  IMAGEN_PARA_ENVIAR: ${p.imagen}\n`;
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

app.delete('/api/ai/knowledge/:id', async (req, res) => {
  try {
    await db.run("DELETE FROM knowledge_base WHERE id = ?", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ai/insights', async (req, res) => {
  try {
    const msgs = await db.all("SELECT m.text, m.sender, m.timestamp, l.estado FROM messages m LEFT JOIN leads l ON m.lead_id = l.id ORDER BY m.id DESC LIMIT 500");
    const clientMsgs = msgs.filter(m => m.sender === 'client');

    // Categorías ANTIGRAVITY con sinónimos
    const categorias = [
      { label: 'Precio / Cotización',   keys: ['precio','cuanto','cuánto','cuesta','vale','valor','cobran','cobras','presupuesto','cotiza'] },
      { label: 'Motor',                 keys: ['motor','bull','buffalo','ritar','nice','came','doorhan','phobos','genius','ditec'] },
      { label: 'Portón / Puerta',       keys: ['portón','porton','puerta','reja','cancel','corredizo','abatible','seccional','levadizo'] },
      { label: 'Control / Mando',       keys: ['control','mando','remoto','teléfono','celular','app','bluetooth','wifi','programar'] },
      { label: 'Instalación',           keys: ['instalar','instalación','colocar','poner','instalo','montaje','visita','técnico'] },
      { label: 'Falla / Reparación',    keys: ['falla','fallo','daño','roto','no abre','no cierra','traba','ruido','lento','bloqueado','repara','arregla'] },
      { label: 'Garantía',              keys: ['garantía','garantia','garantizado','cubre','daños'] },
      { label: 'Tiempo / Entrega',      keys: ['cuándo','cuando','tiempo','días','horas','rápido','urgente','hoy','mañana','semana'] },
      { label: 'Pago / Forma de pago',  keys: ['pago','pagar','transferencia','tarjeta','efectivo','depósito','deposito','cheque','cuotas'] },
      { label: 'Zona / Dirección',      keys: ['zona','colonia','dirección','direccion','municipio','departamento','villa','mixco','antigua','petén','quetzal'] },
    ];

    const counts = categorias.map(cat => {
      const count = clientMsgs.filter(m => {
        const t = (m.text||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
        return cat.keys.some(k => t.includes(k.normalize('NFD').replace(/[̀-ͯ]/g,'')));
      }).length;
      return { topic: cat.label, count };
    }).filter(c => c.count > 0).sort((a,b) => b.count - a.count);

    // Tasa de conversión
    const totalLeads = await db.get("SELECT COUNT(*) as c FROM leads");
    const ventas = await db.get("SELECT COUNT(*) as c FROM leads WHERE estado = 'Venta'");
    const convRate = totalLeads.c > 0 ? Math.round((ventas.c / totalLeads.c) * 100) : 0;

    // Objeciones detectadas
    const objKeys = ['caro','no tengo','después','pensarlo','pensar','esperar','luego','no puedo','otro momento'];
    const objCount = clientMsgs.filter(m => {
      const t = (m.text||'').toLowerCase();
      return objKeys.some(k => t.includes(k));
    }).length;

    // Hora pico (hora UTC-6 con más mensajes)
    const hourCounts = {};
    msgs.forEach(m => {
      if (!m.timestamp) return;
      const h = new Date(m.timestamp).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort((a,b) => b[1]-a[1])[0];

    res.json({
      topics: counts.slice(0, 8),
      stats: {
        totalMensajes: clientMsgs.length,
        totalLeads: totalLeads.c,
        ventas: ventas.c,
        convRate,
        objeciones: objCount,
        horasPico: peakHour ? `${peakHour[0]}:00 (${peakHour[1]} msgs)` : 'N/A'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/analyze', async (req, res) => {
  try {
    const recent = await db.all("SELECT m.lead_id, m.text, l.nombre FROM messages m LEFT JOIN leads l ON m.lead_id = l.id WHERE m.sender = 'client' ORDER BY m.id DESC LIMIT 200");

    const topicos = [
      { keys: ['precio','cuanto','cuesta','valor','presupuesto','cotiza'], label: 'Precios y Cotizaciones', icon: '💰' },
      { keys: ['motor','bull','buffalo','genius','nice','came'], label: 'Consultas de Motores', icon: '⚙️' },
      { keys: ['instalar','instalacion','colocar','visita','técnico'], label: 'Solicitudes de Instalación', icon: '🔧' },
      { keys: ['falla','daño','roto','no abre','no cierra','repara','arregla'], label: 'Fallas y Reparaciones', icon: '🛠️' },
      { keys: ['control','remoto','programar','app','bluetooth'], label: 'Controles y Mandos', icon: '📱' },
      { keys: ['garantia','garantía','cubre'], label: 'Consultas de Garantía', icon: '🛡️' },
      { keys: ['tiempo','cuando','dias','urgente','hoy','mañana'], label: 'Tiempos de Entrega', icon: '⏱️' },
      { keys: ['pago','transferencia','tarjeta','efectivo','cuotas'], label: 'Formas de Pago', icon: '💳' },
    ];

    const norm = t => (t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');

    for (const topico of topicos) {
      const matching = recent.filter(m => topico.keys.some(k => norm(m.text).includes(k)));
      if (matching.length === 0) continue;
      const existing = await db.get("SELECT id, frequency FROM knowledge_base WHERE topic = ?", topico.label);
      if (existing) {
        await db.run("UPDATE knowledge_base SET frequency = ?, status = 'pending' WHERE id = ?", existing.frequency + matching.length, existing.id);
      } else {
        const sample = matching[0].text?.slice(0, 300) || '';
        await db.run(
          "INSERT INTO knowledge_base (topic, content, source_lead_id, frequency, status) VALUES (?, ?, ?, ?, 'pending')",
          topico.label, `${topico.icon} Ejemplo: "${sample}"`, matching[0].lead_id, matching.length
        );
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper para normalización y búsqueda inteligente (Spanish Stemming básico)
const smartSearch = (query, items) => {
  if (!query) return [];
  
  const normalize = (txt) => {
    return String(txt || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
      .replace(/[^a-z0-9]/g, " ")     // Alfanumérico solamente
      .trim();
  };

  const stem = (word) => {
    if (word.length <= 3) return word;
    // Manejo básico de plurales en español
    if (word.endsWith('es')) return word.slice(0, -2);
    if (word.endsWith('s')) return word.slice(0, -1);
    return word;
  };

  const queryClean = normalize(query);
  const keywords = queryClean.split(/\s+/).filter(k => k.length >= 2).map(stem);

  if (keywords.length === 0) return items.map(i => ({ ...i, score: 0 }));

  return items.map(item => {
    const textToSearch = normalize(`${item.titulo} ${item.contenido}`);
    let score = 0;
    
    keywords.forEach(kw => {
      // Coincidencia exacta de raíz (más puntos)
      const regexExact = new RegExp(`\\b${kw}\\w*\\b`, 'g');
      const matches = textToSearch.match(regexExact);
      if (matches) score += matches.length * 10;
      
      // Coincidencia parcial (menos puntos)
      if (textToSearch.includes(kw)) score += 2;
    });

    // Bonus si el título contiene la palabra
    const titleClean = normalize(item.titulo);
    keywords.forEach(kw => {
      if (titleClean.includes(kw)) score += 5;
    });

    return { ...item, score };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
};

app.get('/api/rag/test-search', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.json({ results: [] });

  try {
    // Obtenemos todo el conocimiento disponible para filtrar en memoria con lógica inteligente
    const docs = await db.all("SELECT 'Tarjeta' as tipo, name as titulo, content as contenido FROM documents");
    const prods = await db.all("SELECT 'Producto' as tipo, nombre as titulo, descripcion || COALESCE('\nIMAGEN: ' || imagen, '') as contenido FROM products WHERE activo = 1");
    
    const allItems = [...docs, ...prods];
    const results = smartSearch(query, allItems);

    res.json({ results: results.slice(0, 10) }); // Limitamos a los 10 mejores
  } catch (err) {
    console.error("❌ Error en test-search inteligente:", err);
    res.status(500).json({ error: err.message });
  }
});

app.use('/uploads', express.static(join(__dirname, 'uploads')));
app.use(express.static(join(__dirname, 'dist'), { setHeaders: (res, path) => { if (path.endsWith('.html')) { res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); res.setHeader('Pragma', 'no-cache'); res.setHeader('Expires', '0'); } } }));

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error("❌ ERROR EN EXPRESS:", err);
  res.status(500).send(`Error interno: ${err.message}`);
});

// Todas las demás rutas al index.html
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
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

