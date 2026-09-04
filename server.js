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
import Jimp from 'jimp';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Hora actual de Guatemala (UTC-6) en formato 12h, ej: "08:34 AM".
// Se usa para el timestamp de TODOS los mensajes (cliente, bot y agente),
// así el dashboard muestra la hora local y no la del servidor (UTC).
function horaGuate() {
  return new Date().toLocaleTimeString('en-US', {
    timeZone: 'America/Guatemala',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
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
    '/webhooks/',
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
        priority TEXT DEFAULT 'normal'
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
        bot_active INTEGER DEFAULT 1,
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

      CREATE TABLE IF NOT EXISTS training_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL DEFAULT 'permitido',
        title TEXT NOT NULL,
        rule TEXT NOT NULL,
        example_question TEXT,
        example_response TEXT,
        source_lead_id INTEGER,
        source_context TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS media_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        url TEXT,
        mimetype TEXT,
        size INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS redes_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT DEFAULT 'instagram',
        comment_id TEXT UNIQUE,
        media_id TEXT,
        parent_id TEXT,
        from_id TEXT,
        from_name TEXT,
        text TEXT,
        bot_reply TEXT,
        status TEXT DEFAULT 'nuevo',
        is_delicate INTEGER DEFAULT 0,
        permalink TEXT,
        timestamp TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS scheduled_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT DEFAULT 'both',
        media_type TEXT DEFAULT 'image',
        media_url TEXT,
        caption TEXT NOT NULL,
        scheduled_time TEXT,
        status TEXT DEFAULT 'pending',
        published_at TEXT,
        post_id_ig TEXT,
        post_id_fb TEXT,
        error_msg TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS social_followers_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        followers_count INTEGER NOT NULL,
        date_str TEXT NOT NULL,
        timestamp TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_messages_lead_id_id ON messages(lead_id, id DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_lead_client ON messages(lead_id, sender, id DESC);
      CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
      CREATE INDEX IF NOT EXISTS idx_leads_channel ON leads(channel_phone);
      CREATE INDEX IF NOT EXISTS idx_leads_archived ON leads(archived);
      CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
      CREATE INDEX IF NOT EXISTS idx_leads_origen ON leads(origen);
    `);

    // Migration: add bot_active column to whatsapp_channels if not exists
    try {
      await db.run("ALTER TABLE whatsapp_channels ADD COLUMN bot_active INTEGER DEFAULT 1");
      console.log("Migration: Added bot_active column to whatsapp_channels");
    } catch (e) {
      // Column already exists, safe to ignore
    }

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
    try { await db.exec("ALTER TABLE leads ADD COLUMN ctwa_clid TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE leads ADD COLUMN ad_source_id TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE leads ADD COLUMN ad_source_url TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE leads ADD COLUMN direccion TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE leads ADD COLUMN notas TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE leads ADD COLUMN nit TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE leads ADD COLUMN etiquetas TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE leads ADD COLUMN whatsapp_id TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE leads ADD COLUMN timestamp DATETIME DEFAULT CURRENT_TIMESTAMP"); } catch(e){}
    try { await db.exec("ALTER TABLE agenda ADD COLUMN notas TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE products ADD COLUMN imagen TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE products ADD COLUMN imagenes TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE products ADD COLUMN catalog_link TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE products ADD COLUMN whatsapp_link TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE products ADD COLUMN precio_oferta TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE products ADD COLUMN reglas_bot TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE training_rules ADD COLUMN what_learned TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE training_rules ADD COLUMN what_not_to_say TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE training_rules ADD COLUMN prompt_instruction TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE scheduled_posts ADD COLUMN post_type TEXT DEFAULT 'post'"); } catch(e){}
    try { await db.exec("ALTER TABLE products ADD COLUMN imagenes_meta TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE documents ADD COLUMN imagen TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE documents ADD COLUMN imagenes TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE leads ADD COLUMN lead_alertado INTEGER DEFAULT 0"); } catch(e){}
    // Normalizar prioridad: rojo/urgente SOLO para los que pidieron un humano (handoff_reason).
    // Antes TODOS nacían 'urgent' y muchos quedaban en 'Intervención Requerida' sin pedir nada.
    try { await db.exec("UPDATE leads SET priority = 'normal' WHERE priority = 'urgent' AND (handoff_reason IS NULL OR handoff_reason = '')"); } catch(e){}
    try { await db.exec("ALTER TABLE messages ADD COLUMN mediaUrl TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE messages ADD COLUMN mediaType TEXT"); } catch(e){}
    try { await db.exec("ALTER TABLE leads ADD COLUMN channel_phone TEXT"); } catch(e){}
    try {
      // Limpiar fotos asignadas por error al cliente (las fotos de /uploads/ son siempre del catalogo/bot)
      await db.run("UPDATE messages SET mediaUrl = NULL, mediaType = NULL WHERE sender = 'client' AND mediaUrl LIKE '%/uploads/%'");
      // Eliminar mensajes vacios del bot que solo tenian imagen duplicada
      await db.run("DELETE FROM messages WHERE sender = 'bot' AND (text IS NULL OR text = '' OR trim(text) = '') AND mediaUrl IS NOT NULL");
    } catch(e){}

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
      const last8 = cleanChan.slice(-8);
      channel = await db.get("SELECT * FROM whatsapp_channels WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') LIKE ? AND active = 1", `%${last8}`);
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
    if (!apiKey || !fromNum || !toPhone || !imageUrl) return;

    const cleanFrom = String(fromNum).startsWith('+') ? String(fromNum) : `+${String(fromNum).replace(/\D/g, '')}`;
    const cleanTo = String(toPhone).startsWith('+') ? String(toPhone) : `+${String(toPhone).replace(/\D/g, '')}`;

    console.log(`📸 Enviando imagen por YCloud desde ${cleanFrom} a ${cleanTo}: ${imageUrl}`);
    const res = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        from: cleanFrom,
        to: cleanTo,
        type: 'image',
        image: {
          link: imageUrl,
          ...(caption ? { caption } : {})
        }
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Error enviando imagen YCloud (${res.status}): ${errText}`);
    } else {
      console.log(`✅ Imagen enviada exitosamente por YCloud a ${cleanTo}`);
    }
  } catch(e) {
    console.error('❌ Error enviando imagen via YCloud:', e.message);
  }
}

// Enviar un documento (PDF, etc.) por YCloud
async function sendDocumentViaYCloud(toPhone, docUrl, fileName = 'documento.pdf', caption = '', channelPhone = null) {
  try {
    const channel = await getChannelConfig(channelPhone);
    const apiKey = channel ? channel.api_key : await getDynamicSetting('ycloud_api_key', process.env.YCLOUD_API_KEY);
    const fromNum = channel ? channel.phone : await getDynamicSetting('ycloud_from', process.env.YCLOUD_FROM);
    if (!apiKey || !fromNum || !toPhone || !docUrl) return;

    const cleanFrom = String(fromNum).startsWith('+') ? String(fromNum) : `+${String(fromNum).replace(/\D/g, '')}`;
    const cleanTo = String(toPhone).startsWith('+') ? String(toPhone) : `+${String(toPhone).replace(/\D/g, '')}`;
    const link = String(docUrl || '').replace(/^http:\/\//, 'https://'); // WhatsApp requiere https

    const r = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        from: cleanFrom,
        to: cleanTo,
        type: 'document',
        document: {
          link,
          filename: fileName,
          ...(caption ? { caption } : {})
        }
      })
    });
    if (!r.ok) { const t = await r.text(); console.error(`❌ Error documento YCloud: ${r.status} ${t}`); }
    else console.log(`📄 Documento enviado a ${cleanTo} desde ${cleanFrom}: ${fileName}`);
  } catch(e) {
    console.error('❌ Error enviando documento via YCloud:', e.message);
  }
}

// Enviar un VIDEO por YCloud (WhatsApp: mp4, máx 16MB)
async function sendVideoViaYCloud(toPhone, videoUrl, caption = '', channelPhone = null) {
  try {
    const channel = await getChannelConfig(channelPhone);
    const apiKey = channel ? channel.api_key : await getDynamicSetting('ycloud_api_key', process.env.YCLOUD_API_KEY);
    const fromNum = channel ? channel.phone : await getDynamicSetting('ycloud_from', process.env.YCLOUD_FROM);
    if (!apiKey || !fromNum || !toPhone || !videoUrl) return;

    const cleanFrom = String(fromNum).startsWith('+') ? String(fromNum) : `+${String(fromNum).replace(/\D/g, '')}`;
    const cleanTo = String(toPhone).startsWith('+') ? String(toPhone) : `+${String(toPhone).replace(/\D/g, '')}`;
    const link = String(videoUrl || '').replace(/^http:\/\//, 'https://');

    const r = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        from: cleanFrom,
        to: cleanTo,
        type: 'video',
        video: { link, ...(caption ? { caption } : {}) }
      })
    });
    if (!r.ok) { const t = await r.text(); console.error(`❌ Error video YCloud: ${r.status} ${t}`); }
    else console.log(`🎬 Video enviado a ${cleanTo} desde ${cleanFrom}`);
  } catch(e) {
    console.error('❌ Error enviando video via YCloud:', e.message);
  }
}

// Enviar texto por YCloud
async function sendTextViaYCloud(toPhone, text, channelPhone = null) {
  try {
    if (!toPhone || !text) return;
    const channel = await getChannelConfig(channelPhone);
    const apiKey = channel ? channel.api_key : await getDynamicSetting('ycloud_api_key', process.env.YCLOUD_API_KEY);
    const fromNum = channel ? channel.phone : await getDynamicSetting('ycloud_from', process.env.YCLOUD_FROM);
    if (!apiKey || !fromNum) return;
    await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ from: fromNum, to: toPhone, type: 'text', text: { body: text } })
    });
  } catch(e) {
    console.error('❌ Error enviando texto via YCloud:', e.message);
  }
}

// ─── META GRAPH API (Facebook Messenger & Instagram Direct) ─────────────────
const META_GRAPH = 'https://graph.facebook.com/v21.0';

async function getMetaConfig() {
  const token = await getDynamicSetting('meta_page_token', process.env.META_PAGE_TOKEN);
  const verifyToken = await getDynamicSetting('meta_verify_token', process.env.META_VERIFY_TOKEN || 'onecontrol_ig_verify_2026');
  const igUserId = await getDynamicSetting('ig_user_id', process.env.IG_USER_ID || '17841477412607895');
  const fbPageId = await getDynamicSetting('fb_page_id', process.env.FB_PAGE_ID || '1059922890527747');
  return { token, verifyToken, igUserId, fbPageId };
}

async function sendMetaMessage(recipientId, text, mediaUrl = null, mediaType = 'image') {
  try {
    const { token, igUserId } = await getMetaConfig();
    if (!token) {
      console.error('❌ No hay token de Meta configurado (META_PAGE_TOKEN)');
      return false;
    }
    if (!recipientId) return false;

    let textSuccess = false;

    // 1. Enviar mensaje de texto principal (si existe)
    if (text) {
      const textPayload = {
        recipient: { id: recipientId },
        message: { text }
      };

      try {
        let r = await fetch(`${META_GRAPH}/me/messages?access_token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(textPayload)
        });
        let data = await r.json().catch(() => ({}));

        // Si falla por /me/messages e igUserId existe, reintentar con endpoint IG
        if ((!r.ok || data.error) && igUserId) {
          r = await fetch(`${META_GRAPH}/${igUserId}/messages?access_token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(textPayload)
          });
          data = await r.json().catch(() => ({}));
        }

        if (!r.ok || data.error) {
          console.error(`❌ Error enviando texto Meta a ${recipientId}:`, data.error?.message || JSON.stringify(data));
        } else {
          console.log(`✅ Texto Meta enviado con éxito a ${recipientId}`);
          textSuccess = true;
        }
      } catch (textErr) {
        console.error(`❌ Excepción enviando texto Meta a ${recipientId}:`, textErr.message);
      }
    }

    // 2. Enviar archivo multimedia / foto si existe
    if (mediaUrl) {
      let type = 'image';
      if (mediaType === 'video') type = 'video';
      else if (mediaType === 'audio') type = 'audio';
      else if (mediaType === 'document' || mediaType === 'file') type = 'file';

      const mediaPayload = {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type,
            payload: { url: mediaUrl, is_reusable: true }
          }
        }
      };

      try {
        const r = await fetch(`${META_GRAPH}/me/messages?access_token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mediaPayload)
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || data.error) {
          console.warn(`⚠️ No se pudo adjuntar imagen Meta a ${recipientId}:`, data.error?.message || JSON.stringify(data));
        } else {
          console.log(`✅ Adjunto Meta enviado a ${recipientId}`);
        }
      } catch (mediaErr) {
        console.warn(`⚠️ Excepción enviando adjunto Meta a ${recipientId}:`, mediaErr.message);
      }
    }

    return textSuccess;
  } catch (err) {
    console.error('❌ Excepción enviando mensaje Meta:', err.message);
    return false;
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
  if (t.includes('precio') || t.includes('cotizar') || t.includes('cuanto') || t.includes('costo') || t.includes('valor') || t.includes('pago') || t.includes('transferencia') || t.includes('deposito') || t.includes('comprobante')) {
    if (currentStatus === 'Venta' || currentStatus === 'En Seguimiento' || currentStatus === 'Cita Agendada') return currentStatus;
    return 'Interesado';
  }
  if (t.includes('agendar') || t.includes('cita') || t.includes('servicio') || t.includes('reunion') || t.includes('programar')) {
    if (currentStatus === 'Venta') return currentStatus;
    return 'Cita Agendada';
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
  const cleanT = (text || '').trim();
  if (!cleanT && !mediaUrl) return;

  // Dedup: no reinsertar si en los ultimos 5 mensajes ya existe exactamente este mismo mensaje del mismo remitente
  const recent = await db.all(
    "SELECT sender, text, mediaUrl FROM messages WHERE lead_id = ? ORDER BY id DESC LIMIT 5",
    leadId
  );
  if (cleanT && recent.some(m => m.sender === sender && (m.text || '').trim() === cleanT && (m.mediaUrl === mediaUrl || (!m.mediaUrl && !mediaUrl)))) {
    console.log(`↩️  Mensaje duplicado ignorado (lead ${leadId}, ${sender})`);
    return;
  }

  // 1. Guardar mensaje
  await db.run(
    "INSERT INTO messages (lead_id, sender, text, timestamp, mediaUrl, mediaType) VALUES (?, ?, ?, ?, ?, ?)",
    leadId, sender, cleanT, timestamp, mediaUrl, mediaType
  );

  // Si el bot respondió con éxito, limpiar la alerta de "bot caído" (auto-recuperación).
  // Fire-and-forget con catch: nunca puede afectar el guardado del mensaje.
  if (sender === 'bot') {
    db.run("DELETE FROM settings WHERE key='bot_down_alert'").catch(() => {});
  }

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
        (SELECT id FROM messages m WHERE m.lead_id = l.id AND m.sender = 'client' ORDER BY id DESC LIMIT 1) as lastClientMsgId,
        (SELECT id FROM messages m WHERE m.lead_id = l.id ORDER BY id DESC LIMIT 1) as lastMsgId
      FROM leads l
      WHERE l.archived = ?
    `;
    const params = [isArchived];

    if (activeChannelPhone && activeChannelPhone !== 'all') {
      const lowerChan = String(activeChannelPhone).toLowerCase();
      if (lowerChan === 'instagram') {
        query += ` AND (LOWER(l.origen) LIKE '%instagram%')`;
      } else if (lowerChan === 'facebook') {
        query += ` AND (LOWER(l.origen) LIKE '%facebook%')`;
      } else if (lowerChan === 'whatsapp') {
        query += ` AND (LOWER(l.origen) LIKE '%whatsapp%' OR l.origen = 'Manual' OR l.origen IS NULL)`;
      } else {
        const cleanChan = String(activeChannelPhone).replace(/\D/g, '');
        if (cleanChan.includes('59658803')) {
          // Canal Principal OneControl: incluye WhatsApp 59658803, Instagram Direct, Facebook Messenger y Web
          query += ` AND (
            REPLACE(REPLACE(REPLACE(l.channel_phone, '+', ''), ' ', ''), '-', '') = ?
            OR l.channel_phone IS NULL
            OR LOWER(l.origen) LIKE '%instagram%'
            OR LOWER(l.origen) LIKE '%facebook%'
            OR LOWER(l.origen) LIKE '%web%'
            OR (l.origen = 'Manual' AND (l.channel_phone IS NULL OR l.channel_phone = ''))
          )`;
          params.push(cleanChan);
        } else if (cleanChan) {
          query += ` AND REPLACE(REPLACE(REPLACE(l.channel_phone, '+', ''), ' ', ''), '-', '') = ?`;
          params.push(cleanChan);
        }
      }
    }

    if (req.query.origen && req.query.origen !== 'all') {
      const lowerOrigen = String(req.query.origen).toLowerCase();
      if (lowerOrigen === 'whatsapp') {
        query += ` AND (LOWER(l.origen) LIKE '%whatsapp%' OR l.origen = 'Manual' OR l.origen IS NULL)`;
      } else {
        query += ` AND LOWER(l.origen) LIKE ?`;
        params.push(`%${lowerOrigen}%`);
      }
    }

    query += ` ORDER BY (CASE WHEN l.priority = 'urgent' THEN 1 ELSE 0 END) DESC, COALESCE((SELECT id FROM messages m WHERE m.lead_id = l.id ORDER BY id DESC LIMIT 1), 0) DESC, l.id DESC`;

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
      "INSERT INTO leads (nombre, phone, origen, botActive, email, channel_phone, priority) VALUES (?, ?, ?, ?, ?, ?, 'normal')",
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

// Helper para extraer y normalizar datos de cualquier webhook (n8n, YCloud, WhatsApp directo)
function parseWebhookPayload(data) {
  // 1. Detectar si es un evento crudo de YCloud
  const isYCloudEvent = !!data.whatsappMessage || !!data.type?.startsWith?.('whatsapp.');
  const yMsg = data.whatsappMessage || {};

  // 2. Detectar si es un mensaje enviado por el humano desde su propio teléfono (Echo / Outbound)
  const isEcho = data.is_echo === true ||
    data.from_me === true ||
    data.fromMe === true ||
    data.type === 'whatsapp.smb.message.echoes' ||
    data.event === 'whatsapp.smb.message.echoes' ||
    data.event_type === 'whatsapp.smb.message.echoes' ||
    data.sender === 'agent' ||
    data.sender === 'user' ||
    data.sender === 'human' ||
    data.sender === 'me' ||
    data.sender === 'business' ||
    data.direction === 'outbound';

  let clientPhoneRaw = null;
  let channelPhoneRaw = null;

  if (isEcho) {
    // Si fue enviado desde el teléfono del negocio:
    // El cliente es el destinatario (to / recipient)
    clientPhoneRaw = data.phone || data.to || data.customer || data.customer_phone || data.recipient || yMsg.to || yMsg.recipient;
    channelPhoneRaw = data.channel_phone || data.business_phone || data.from || yMsg.from;
  } else {
    // Si fue enviado por el cliente:
    // El cliente es el remitente (from / phone)
    clientPhoneRaw = data.phone || data.from || data.customer || data.customer_phone || data.sender_phone || yMsg.from || yMsg.customer?.phoneNumber;
    channelPhoneRaw = data.channel_phone || data.business_phone || data.to || yMsg.to;
  }

  // Extraer texto
  const mensajePrincipal = data.mensaje || data.message || data.text || data.body || data.texto || 
    data.client_message || data.agent_message || data.respuesta_cliente || data.mensaje_cliente || 
    data.texto_cliente || yMsg.text?.body || data.data?.message?.conversation || 
    data.data?.message?.extendedTextMessage?.text || '';

  const mensajeSecundario = data.respuesta_bot || data.texto_limpio || data.bot_response || data.output || '';

  // Extraer media
  const mediaUrl = data.media_url || data.mediaUrl || data.image_url || data.file_url || 
    yMsg.image?.link || yMsg.document?.link || yMsg.video?.link || yMsg.audio?.link || null;
  const mediaType = data.media_type || data.mediaType || yMsg.type || (mediaUrl ? 'image' : null);

  const sender = isEcho ? 'agent' : (data.sender || 'client');
  const nombre = data.nombre || data.name || yMsg.customer?.name || null;

  return {
    isEcho,
    clientPhoneRaw,
    channelPhoneRaw,
    mensajePrincipal,
    mensajeSecundario,
    mediaUrl,
    mediaType,
    sender,
    nombre,
    raw: data
  };
}

// Helper para detectar y registrar pedidos automáticamente por IA
async function detectAndCreatePedidoFromMessage(leadId, clientPhone, clientName, clientMsg, botMsg, channelPhone, forced = false) {
  try {
    const text = ((clientMsg || '') + ' ' + (botMsg || '')).toLowerCase();

    // Indicadores de intención de pedido o compra
    const PEDIDO_KEYWORDS = /#pedido_listo|quiero\s+(pedir|ordenar|comprar|que\s+me\s+lo\s+env[ií]en|el\s+env[ií]o\s+a)|hacer\s+el\s+pedido|mi\s+direcci[oó]n\s+es|envi[aá]rmel[oa]|datos\s+para\s+el\s+env[ií]o|pago\s+contra\s+entrega|tomar\s+mis\s+datos/i;

    // forced = n8n ya confirmó el pedido (etiqueta PEDIDO_LISTO). Si no viene forzado, exige keyword.
    if (!forced && !PEDIDO_KEYWORDS.test(text)) return null;

    const cleanPh = String(clientPhone || '').replace(/\D/g, '');
    if (!cleanPh) return null;

    // Evitar crear pedidos duplicados para el mismo teléfono en las últimas 6 horas
    const existingRecent = await db.get(
      "SELECT id FROM pedidos WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ? AND estado = 'Nuevo' ORDER BY id DESC LIMIT 1",
      cleanPh
    );
    if (existingRecent) return null;

    // Buscar producto coincidente del catálogo
    const prods = await db.all("SELECT * FROM products WHERE activo = 1");
    let matchedProduct = null;
    for (const p of prods) {
      const pName = String(p.nombre || '').toLowerCase();
      if (text.includes(pName) || (pName.includes('one night') && text.includes('one night')) || (pName.includes('modelo') && text.includes((pName.match(/modelo\s*\d+/i) || [])[0]))) {
        matchedProduct = p;
        break;
      }
    }

    const productName = matchedProduct ? matchedProduct.nombre : 'Mesa de Noche OneControl';
    const productPrice = matchedProduct ? `Q${matchedProduct.precio}` : 'Q550';
    const notas = clientMsg ? `Detectado por IA: "${clientMsg.slice(0, 150)}"` : 'Pedido automático';

    const now = new Date();
    const guateTime = new Date(now.getTime() - (6 * 60 * 60 * 1000));
    const timestamp = guateTime.getUTCFullYear() + '-' +
      String(guateTime.getUTCMonth()+1).padStart(2,'0') + '-' + 
      String(guateTime.getUTCDate()).padStart(2,'0') + ' ' + 
      String(guateTime.getUTCHours()).padStart(2,'0') + ':' + 
      String(guateTime.getUTCMinutes()).padStart(2,'0');

    const result = await db.run(
      `INSERT INTO pedidos (cliente, phone, producto, cantidad, precio, notas, estado, timestamp) VALUES (?,?,?,?,?,'Nuevo',?)`,
      clientName || 'Cliente WhatsApp', clientPhone || '', productName, '1', productPrice, notas, timestamp
    );

    console.log(`🛒 [IA Pedido Auto-Detectado] Creado Pedido #${result.lastID} para ${clientName} (${clientPhone}) - ${productName}`);

    // Notificar al dueño
    const alerta = `🛒 *NUEVO PEDIDO DETECTADO POR IA #${result.lastID}*\n\n👤 Cliente: ${clientName || 'Cliente'}\n📱 Tel: ${clientPhone}\n📦 Producto: ${productName}\n💰 Precio: ${productPrice}\n📝 Notas: ${notas}\n\n✅ Revisalo en el Dashboard (sección Pedidos IA).`;
    await notificarDueno(alerta, channelPhone);

    return result.lastID;
  } catch (err) {
    console.error("Error detectando pedido:", err.message);
    return null;
  }
}

// Endpoint unificado para procesar webhooks de mensajes
async function processIncomingMessageWebhook(req, res, sourceName = 'WhatsApp') {
  try {
    const data = req.body || {};
    console.log(`🔍 [${sourceName}] CUERPO RECIBIDO:`, JSON.stringify(data, null, 2));

    const parsed = parseWebhookPayload(data);
    if (!parsed.clientPhoneRaw) {
      console.log(`⚠️ [${sourceName}] No se pudo determinar el teléfono del cliente`);
      return res.status(400).json({ error: "Falta el teléfono del cliente (phone/to/from)" });
    }

    const cleanPhone = String(parsed.clientPhoneRaw).replace(/\D/g, '');
    let cleanChannelPhone = null;
    if (parsed.channelPhoneRaw) {
      cleanChannelPhone = String(parsed.channelPhoneRaw).replace(/\D/g, '');
    } else {
      const defaultChan = await db.get("SELECT phone FROM whatsapp_channels LIMIT 1");
      if (defaultChan) cleanChannelPhone = String(defaultChan.phone).replace(/\D/g, '');
    }

    const time = horaGuate();

    console.log(`📨 [${sourceName}] Procesando mensaje:`, {
      sender: parsed.sender,
      isEcho: parsed.isEcho,
      clientPhone: cleanPhone,
      channelPhone: cleanChannelPhone,
      text: parsed.mensajePrincipal?.slice?.(0, 50),
      mediaUrl: parsed.mediaUrl
    });

    // Buscar lead existente SOLO por teléfono (ignorar el canal). Así un mismo cliente
    // NO se duplica aunque escriba/se le escriba por otro canal, y el estado (bot on/off,
    // "modo manual") queda SIEMPRE en el mismo lead que ves en el dashboard.
    let existingLead = await db.get(
      "SELECT id, nombre, estado, score, botActive FROM leads WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ? ORDER BY id ASC LIMIT 1",
      cleanPhone
    );

    let leadId;
    if (existingLead) {
      leadId = existingLead.id;
      const updates = [];
      const params = [];

      // Renombrar si llega un nombre real
      const GENERIC_NAMES = ['agente', 'cliente', 'cliente nuevo', ''];
      if (parsed.nombre && !GENERIC_NAMES.includes(String(parsed.nombre).trim().toLowerCase())
          && GENERIC_NAMES.includes(String(existingLead.nombre || '').trim().toLowerCase())) {
        updates.push("nombre = ?");
        params.push(parsed.nombre);
        console.log(`   ✏️ Renombrando lead ${leadId}: "${existingLead.nombre}" → "${parsed.nombre}"`);
      }

      // Si el mensaje fue enviado por el humano desde su teléfono:
      // Apagar bot para este lead, resolver handoff y mover a En Seguimiento
      if (parsed.isEcho) {
        updates.push("botActive = 0");
        updates.push("priority = 'normal'");
        updates.push("handoff_reason = NULL");
        if (existingLead.estado === 'Nuevo' || existingLead.estado === 'Intervención Requerida') {
          updates.push("estado = 'En Seguimiento'");
        }
        console.log(`📱 [Echo Teléfono] Mensaje enviado por el humano desde el celular para lead ${leadId}. Bot apagado y handoff resuelto.`);
      } else {
        // Mensaje del cliente
        if (data.bot_apagado !== undefined) {
          updates.push("botActive = ?");
          params.push(data.bot_apagado ? 0 : 1);
        }
        if (data.etiqueta) {
          updates.push("estado = ?");
          params.push(data.etiqueta);
        }
      }

      if (updates.length > 0) {
        params.push(leadId);
        await db.run(`UPDATE leads SET ${updates.join(", ")} WHERE id = ?`, ...params);
      }
    } else {
      // Crear nuevo lead
      const initialEstado = parsed.isEcho ? 'En Seguimiento' : (data.etiqueta || 'Nuevo');
      const chanConf = await getChannelConfig(cleanChannelPhone);
      const isChanBotActive = (chanConf && Number(chanConf.bot_active) === 0) ? 0 : 1;
      const initialBotActive = parsed.isEcho ? 0 : isChanBotActive;
      // Atribución de anuncio (click-to-WhatsApp): guardar de qué anuncio vino el lead.
      const ref = data.referral || data.whatsappMessage?.referral || data.whatsappInboundMessage?.referral || {};
      const ctwaClid   = data.ctwa_clid    || ref.ctwa_clid  || null;
      const adSourceId  = data.ad_source_id  || ref.source_id  || null;
      const adSourceUrl = data.ad_source_url || ref.source_url || null;
      const result = await db.run(
        `INSERT INTO leads (nombre, phone, email, score, estado, origen, botActive, motor, falla, zona, direccion, notas, nit, channel_phone, priority, ctwa_clid, ad_source_id, ad_source_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        parsed.nombre || 'Cliente WhatsApp', data.phone || parsed.clientPhoneRaw, data.email || 'N/A',
        data.score || 50, initialEstado, `WhatsApp (${sourceName})`, initialBotActive,
        data.motor || 'N/A', data.falla || 'N/A', data.zona || 'N/A',
        data.direccion || null, data.notas || null, data.nit || null, cleanChannelPhone,
        initialEstado === 'Intervención Requerida' ? 'urgent' : 'normal',
        ctwaClid, adSourceId, adSourceUrl
      );
      leadId = result.lastID;
      console.log(`🆕 [${sourceName}] Creado nuevo lead ID ${leadId} (${cleanPhone})`);
    }

    // Distinguir si el media_url recibido es del cliente o de la respuesta del bot
    const isBotReport = !!parsed.mensajeSecundario && !parsed.isEcho;
    const clientMedia = isBotReport ? null : parsed.mediaUrl;
    const clientMediaType = isBotReport ? null : parsed.mediaType;

    // Guardar mensaje principal (cliente o agente desde el teléfono)
    if (parsed.mensajePrincipal || clientMedia) {
      await saveSmartMessage(leadId, parsed.sender, parsed.mensajePrincipal || '', time, clientMedia, clientMediaType);
      console.log(`💾 [${sourceName}] Mensaje guardado para lead ${leadId} (sender: ${parsed.sender}): "${parsed.mensajePrincipal?.slice?.(0, 60)}"`);
    }

    // Guardar respuesta del bot si viene en el payload
    if (isBotReport) {
      const { cleanText: cleanBot, imageUrl: botImageUrl } = parseImageFromText(parsed.mensajeSecundario || '');
      const botImageFinal = (isBotReport ? parsed.mediaUrl : null) || botImageUrl;
      if (cleanBot || botImageFinal) {
        await saveSmartMessage(leadId, 'bot', cleanBot || '', time, botImageFinal || null, botImageFinal ? 'image' : null);
      }
    }

    // Detección de Handoff automática en mensajes del cliente
    if (!parsed.isEcho && (data.solicita_humano || data.etiqueta === 'SOLICITA_HUMANO' || await detectHandoff(parsed.mensajePrincipal))) {
      const handoffReason = data.handoff_reason || (data.solicita_humano ? 'Cliente pidió hablar con un humano' : await detectHandoff(parsed.mensajePrincipal));
      await db.run(
        "UPDATE leads SET botActive = 0, priority = 'urgent', handoff_reason = ?, estado = 'Intervención Requerida' WHERE id = ?",
        handoffReason, leadId
      );
      try {
        const l = await db.get("SELECT nombre, phone, channel_phone FROM leads WHERE id = ?", leadId);
        const alerta = `🙋 *SOLICITUD DE AYUDA*\n\nUn cliente necesita que le respondas.\n\n👤 ${l?.nombre || 'Cliente'}\n📱 ${l?.phone || cleanPhone}\n📝 ${handoffReason}${parsed.mensajePrincipal ? `\n💬 "${String(parsed.mensajePrincipal).slice(0, 120)}"` : ''}\n\n👉 Entrá al dashboard para responderle.`;
        await notificarDueno(alerta, l?.channel_phone || cleanChannelPhone);
      } catch (e) { console.error('⚠️ Error notificando handoff:', e.message); }
      console.log(`🚨 [${sourceName}] Handoff activado para lead ${leadId}`);
    }

    // Detección y creación automática de Pedidos por IA.
    // forced = n8n marcó PEDIDO_LISTO (etiqueta/estado): así el pedido y el aviso al
    // dueño se crean SIEMPRE al cerrar, aunque el hashtag #PEDIDO_LISTO ya se haya limpiado.
    if (!parsed.isEcho) {
      const forcedPedido = /pedido_listo/i.test(String(data.etiqueta || '') + ' ' + String(data.estado || ''));
      await detectAndCreatePedidoFromMessage(leadId, cleanPhone, parsed.nombre || existingLead?.nombre, parsed.mensajePrincipal, parsed.mensajeSecundario, cleanChannelPhone, forcedPedido);
    }

    res.json({ success: true, leadId, action: existingLead ? "updated" : "created", sender: parsed.sender });
  } catch (err) {
    console.error(`❌ Error en webhook ${sourceName}:`, err);
    res.status(500).json({ error: err.message });
  }
}

// Endpoint Webhook para n8n (Recibir mensajes de WhatsApp)
app.post('/api/webhook/whatsapp', async (req, res) => {
  await processIncomingMessageWebhook(req, res, 'WhatsApp');
});

// Endpoint Webhook para n8n
app.post('/api/webhook/n8n', async (req, res) => {
  await processIncomingMessageWebhook(req, res, 'n8n');
});

// Endpoint Webhook directo para YCloud (recibe tanto mensajes del cliente como echoes del teléfono)
app.post('/api/webhook/ycloud', async (req, res) => {
  await processIncomingMessageWebhook(req, res, 'YCloud');
});
app.post('/webhook/ycloud', async (req, res) => {
  await processIncomingMessageWebhook(req, res, 'YCloud');
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
        const time = horaGuate();
        await saveSmartMessage(id, 'client', mensaje.trim(), time);
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
      const time = horaGuate();
      await saveSmartMessage(id, 'client', mensaje.trim(), time);
    }

    console.log(`🚨 HANDOFF activado para lead ${id}: "${handoffReason}"`);

    // 🔔 Alerta al dueño: hay que responder (solicitud de ayuda)
    try {
      const l = await db.get("SELECT nombre, phone, channel_phone FROM leads WHERE id = ?", id);
      const alerta = `🙋 *SOLICITUD DE AYUDA*\n\nUn cliente necesita que le respondas.\n\n👤 ${l?.nombre || 'Cliente'}\n📱 ${l?.phone || phone || 'Sin teléfono'}\n📝 Motivo: ${handoffReason}${mensaje ? `\n💬 "${String(mensaje).slice(0, 120)}"` : ''}\n\n👉 Entrá al dashboard para responderle.`;
      await notificarDueno(alerta, l?.channel_phone || null);
    } catch (e) { console.error('⚠️ No se pudo notificar el handoff al dueño:', e.message); }

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
      // Intenta obtener el canal desde el lead existente
      const existingLead = await db.get(
        "SELECT channel_phone FROM leads WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ? LIMIT 1",
        cleanPhone
      );
      if (existingLead && existingLead.channel_phone) {
        cleanChannelPhone = String(existingLead.channel_phone).replace(/\D/g, '');
      } else {
        // Fallback: usar el canal principal por defecto
        const defaultChan = await db.get("SELECT phone FROM whatsapp_channels LIMIT 1");
        if (defaultChan) {
          cleanChannelPhone = String(defaultChan.phone).replace(/\D/g, '');
        }
      }
    }

    const channelConfig = await getChannelConfig(cleanChannelPhone);
    if (channelConfig && channelConfig.bot_active === 0) {
      console.log(`🤖 Bot desactivado GLOBALMENTE para el canal ${cleanChannelPhone}`);
      return res.json({
        botActive: false,
        priority: 'normal',
        handoff_reason: "Desactivado globalmente para el canal",
        nombre: 'Cliente',
        estado: 'Manual',
        found: true
      });
    }

    let lead;
    if (cleanChannelPhone) {
      lead = await db.get(
        "SELECT id, botActive, priority, handoff_reason, nombre, estado FROM leads WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ? AND REPLACE(REPLACE(REPLACE(channel_phone, '+', ''), ' ', ''), '-', '') = ?",
        cleanPhone, cleanChannelPhone
      );
      // Fallback SOLO para leads legacy SIN canal asignado (NULL/vacío).
      // Los canales son INDEPENDIENTES: NO tomamos un lead de otro canal (eso mezclaba conversaciones).
      if (!lead) {
        lead = await db.get(
          "SELECT id, botActive, priority, handoff_reason, nombre, estado FROM leads WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ? AND (channel_phone IS NULL OR channel_phone = '') ORDER BY id DESC LIMIT 1",
          cleanPhone
        );
        if (lead) {
          await db.run("UPDATE leads SET channel_phone = ? WHERE id = ?", cleanChannelPhone, lead.id);
          console.log(`🔧 Backfill channel_phone=${cleanChannelPhone} en lead legacy ${lead.id}`);
        }
      }
    } else {
      lead = await db.get(
        "SELECT id, botActive, priority, handoff_reason, nombre, estado FROM leads WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?",
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

// 🚨 Alerta: el bot falló (lo llama el Error Workflow "GUARDIAN" de n8n)
// Se dispara cuando el bot no pudo responder por CUALQUIER motivo (saldo agotado
// de OpenAI/chat, llave vencida, proxy caído, etc). Anti-spam: 1 aviso cada 15 min.
let lastBotDownAlert = 0;
app.post('/api/alert/bot-down', async (req, res) => {
  try {
    const { workflow, node, error } = req.body || {};
    // Guardar el estado para el BANNER del dashboard (siempre, sin throttle,
    // así el aviso visual es confiable aunque el WhatsApp rebote por la regla de 24h)
    try {
      await db.run("REPLACE INTO settings (key, value) VALUES ('bot_down_alert', ?)",
        JSON.stringify({ active: true, node: node || '', error: String(error || '').slice(0, 300), hora: horaGuate(), ts: new Date().toISOString() }));
    } catch (e) { /* no bloquear la alerta si falla el guardado */ }
    const now = Date.now();
    if (now - lastBotDownAlert < 15 * 60 * 1000) {
      return res.json({ success: true, throttled: true });
    }
    lastBotDownAlert = now;
    // Enviar desde el canal principal del bot (el primero configurado)
    const ch = await db.get("SELECT phone FROM whatsapp_channels ORDER BY id LIMIT 1");
    const alerta = `🚨 *EL BOT FALLÓ*\n\nUn cliente escribió y el bot NO pudo responder.\n${node ? `\n⚙️ Nodo: ${node}` : ''}${error ? `\n❌ Motivo: ${String(error).slice(0, 200)}` : ''}\n\n👉 Suele ser: saldo agotado (OpenAI o chat), llave vencida o el proxy caído.\nRevisá los saldos y el dashboard.`;
    await notificarDueno(alerta, ch?.phone || null);
    console.log('🚨 Alerta de bot caído enviada:', node || '', '|', error || '');
    res.json({ success: true });
  } catch (e) {
    console.error('❌ Error en /api/alert/bot-down:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Estado de la alerta del bot para el banner del dashboard
app.get('/api/system-alert', async (_req, res) => {
  try {
    const row = await db.get("SELECT value FROM settings WHERE key='bot_down_alert'");
    if (!row?.value) return res.json({ active: false });
    let a = {}; try { a = JSON.parse(row.value); } catch { a = {}; }
    res.json(a);
  } catch (e) { res.json({ active: false }); }
});

// Descartar la alerta (cuando el dueño ya la vio / recargó el saldo)
app.post('/api/system-alert/clear', async (_req, res) => {
  try {
    await db.run("DELETE FROM settings WHERE key='bot_down_alert'");
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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

app.get('/api/settings', async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM settings");
    const settings = {};
    rows.forEach(row => settings[row.key] = row.value);

    // Inyectar dinámicamente las reglas de entrenamiento aprobadas (a menos que se pida raw=true para el editor)
    if (req.query.raw !== 'true') {
      try {
        const approvedRules = await db.all("SELECT * FROM training_rules WHERE status = 'approved' ORDER BY id ASC");
        if (approvedRules.length > 0) {
          const prohibidas = approvedRules.filter(r => r.type === 'prohibido' || r.what_not_to_say);
          const permitidas = approvedRules.filter(r => r.type !== 'prohibido');

          let trainingSection = "\n\n🧠 REGLAS DE ENTRENAMIENTO Y APRENDIZAJE SUPERVISADO (MÁXIMA PRIORIDAD):\n";
          if (prohibidas.length > 0) {
            trainingSection += "⛔ LO QUE TIENES ESTRICTAMENTE PROHIBIDO (NO DECIR / NO ASUMIR):\n";
            prohibidas.forEach(r => {
              const noSay = r.what_not_to_say || r.rule;
              const promptInst = r.prompt_instruction ? ` 👉 EN SU LUGAR DECIR: ${r.prompt_instruction}` : '';
              trainingSection += `- 🚫 ${r.title}: PROHIBIDO: "${noSay}".${promptInst}${r.example_question ? ` (Si el cliente dice: "${r.example_question}")` : ''}\n`;
            });
          }
          if (permitidas.length > 0) {
            trainingSection += "\n✅ NUEVOS PROMPTS Y GUÍAS DE RESPUESTA APROBADAS:\n";
            permitidas.forEach(r => {
              const promptInst = r.prompt_instruction || r.rule;
              const learned = r.what_learned ? ` [Contexto/Lección: ${r.what_learned}]` : '';
              trainingSection += `- ✨ ${r.title}: ${promptInst}${learned}${r.example_question ? ` (Si pregunta: "${r.example_question}" → Decir: "${r.example_response || promptInst}")` : ''}\n`;
            });
          }

          if (settings.prompt_recepcionista) {
            settings.prompt_recepcionista += trainingSection;
          }
        }
      } catch (e) {
        console.warn("No se pudieron inyectar training_rules en settings:", e.message);
      }
    }

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
    const { phone, api_key, name, outbound_webhook, active, bot_active } = req.body;
    if (!phone) return res.status(400).json({ error: "El teléfono es requerido" });
    const cleanPhone = String(phone).trim();
    
    // Check if phone already exists
    const existing = await db.get("SELECT id FROM whatsapp_channels WHERE phone = ?", cleanPhone);
    if (existing) {
      return res.status(400).json({ error: "Este número de teléfono ya está registrado" });
    }

    const result = await db.run(
      "INSERT INTO whatsapp_channels (phone, api_key, name, outbound_webhook, active, bot_active) VALUES (?, ?, ?, ?, ?, ?)",
      cleanPhone, api_key || '', name || 'Canal WhatsApp', outbound_webhook || '', active ?? 1, bot_active ?? 1
    );
    res.json({ success: true, id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/channels/toggle-bot', async (req, res) => {
  try {
    const { phone, enabled } = req.body;
    if (!phone) return res.status(400).json({ error: "Falta phone" });
    const cleanPhone = String(phone).replace(/\D/g, '');
    const result = await db.run(
      "UPDATE whatsapp_channels SET bot_active = ? WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?",
      enabled ? 1 : 0, cleanPhone
    );
    console.log(`🤖 Toggle bot canal ${cleanPhone} a ${enabled}: ${result.changes} fila(s) afectada(s)`);
    res.json({ success: true, bot_active: !!enabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/channels/:id', async (req, res) => {
  try {
    const { phone, api_key, name, outbound_webhook, active, bot_active } = req.body;
    if (!phone) return res.status(400).json({ error: "El teléfono es requerido" });
    const cleanPhone = String(phone).trim();

    await db.run(
      "UPDATE whatsapp_channels SET phone=?, api_key=?, name=?, outbound_webhook=?, active=?, bot_active=? WHERE id=?",
      cleanPhone, api_key, name, outbound_webhook, active ?? 1, bot_active ?? 1, req.params.id
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
    const time = horaGuate();

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
      const lead = await db.get("SELECT phone, channel_phone, origen, whatsapp_id FROM leads WHERE id = ?", leadId);
      const isInstagram = lead?.origen && String(lead.origen).toLowerCase().includes('instagram');
      const isFacebook = lead?.origen && String(lead.origen).toLowerCase().includes('facebook');

      if (isInstagram || isFacebook) {
        const recipientId = lead.whatsapp_id || lead.phone || phone;
        if (recipientId) {
          if (imageUrl) {
            await sendMetaMessage(recipientId, cleanText, imageUrl, 'image');
          } else if (cleanText) {
            await sendMetaMessage(recipientId, cleanText);
          }
        }
      } else {
        const targetPhone = phone || lead?.phone;
        if (targetPhone) {
          const channel = await getChannelConfig(lead?.channel_phone);
          const outboundWebhook = channel?.outbound_webhook || await getDynamicSetting('n8n_outbound_webhook', process.env.N8N_OUTBOUND_WEBHOOK);
          const chanPhone = lead?.channel_phone || channel?.phone || '+50244315578';
          const formattedChanPhone = String(chanPhone).startsWith('+') ? String(chanPhone) : `+${String(chanPhone).replace(/\D/g, '')}`;
          const formattedTargetPhone = String(targetPhone).startsWith('+') ? String(targetPhone) : `+${String(targetPhone).replace(/\D/g, '')}`;

          if (outboundWebhook && outboundWebhook.trim() !== '') {
            fetch(outboundWebhook, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: formattedTargetPhone,
                text: cleanText,
                image_url: imageUrl || null,
                channel_phone: formattedChanPhone
              })
            }).catch(err => console.error("❌ Error enviando texto a n8n:", err.message));
          } else {
            // FALLBACK DIRECTO A YCLOUD: Si no hay webhook de n8n
            if (imageUrl) {
              sendImageViaYCloud(formattedTargetPhone, imageUrl, cleanText, formattedChanPhone);
            } else if (cleanText) {
              const apiKey = channel ? channel.api_key : await getDynamicSetting('ycloud_api_key', process.env.YCLOUD_API_KEY);
              if (apiKey) {
                fetch('https://api.ycloud.com/v2/whatsapp/messages', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
                  body: JSON.stringify({
                    from: formattedChanPhone,
                    to: formattedTargetPhone,
                    type: 'text',
                    text: { body: cleanText, preview_url: true }
                  })
                }).catch(err => console.error("❌ Error directo YCloud:", err.message));
              }
            }
          }
        }
      }
    }

    res.json({ success: true, message: savedMessage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📎 Enviar un documento (PDF, etc.) desde el chat del dashboard
app.post('/api/messages/send-document', productImagesUpload.single('file'), async (req, res) => {
  try {
    const { leadId, caption } = req.body;
    if (!leadId || !req.file) return res.status(400).json({ error: "Falta leadId o archivo" });
    const lead = await db.get("SELECT phone, channel_phone, origen, whatsapp_id FROM leads WHERE id = ?", leadId);
    if (!lead) return res.status(404).json({ error: "Lead no encontrado" });
    if (req.user && req.user.channel_phone) {
      const a = String(lead.channel_phone || '').replace(/\D/g, '');
      const b = String(req.user.channel_phone).replace(/\D/g, '');
      if (a !== b) return res.status(403).json({ error: "Sin permiso para este lead" });
    }
    const fileName = (req.file.originalname || 'documento.pdf').replace(/\s+/g, '_');
    const docUrl = `https://${req.get('host')}/uploads/${req.file.filename}`;
    const time = horaGuate();
    // Según el tipo: imagen → FOTO, video → VIDEO, resto → documento (tipos WhatsApp/Meta).
    const mime = String(req.file.mimetype || '');
    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');
    const mediaType = isImage ? 'image' : isVideo ? 'video' : 'document';
    const result = await db.run(
      "INSERT INTO messages (lead_id, sender, text, mediaUrl, mediaType, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
      leadId, 'agent', (isImage || isVideo) ? (caption || '') : fileName, docUrl, mediaType, time
    );

    const isInstagram = lead?.origen && String(lead.origen).toLowerCase().includes('instagram');
    const isFacebook = lead?.origen && String(lead.origen).toLowerCase().includes('facebook');

    if (isInstagram || isFacebook) {
      const recipientId = lead.whatsapp_id || lead.phone;
      if (recipientId) {
        await sendMetaMessage(recipientId, caption || '', docUrl, isImage ? 'image' : isVideo ? 'video' : 'document');
      }
    } else if (lead.phone) {
      if (isImage)      sendImageViaYCloud(lead.phone, docUrl, caption || '', lead.channel_phone);
      else if (isVideo) sendVideoViaYCloud(lead.phone, docUrl, caption || '', lead.channel_phone);
      else              sendDocumentViaYCloud(lead.phone, docUrl, fileName, caption || '', lead.channel_phone);
    }
    res.json({ success: true, id: result.lastID, url: docUrl, fileName, mediaType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: normaliza imágenes de productos con descripciones
function normalizeProductImages(p) {
  let arr = [];
  try {
    if (p.imagenes_meta) {
      arr = typeof p.imagenes_meta === 'string' ? JSON.parse(p.imagenes_meta) : p.imagenes_meta;
    } else if (p.imagenes) {
      arr = typeof p.imagenes === 'string' ? JSON.parse(p.imagenes) : p.imagenes;
    }
  } catch (e) { arr = []; }

  if ((!Array.isArray(arr) || arr.length === 0) && p.imagen) {
    arr = [p.imagen];
  }

  return (Array.isArray(arr) ? arr : []).map(item => {
    if (typeof item === 'string') return { url: item, desc: '' };
    if (item && item.url) return { url: item.url, desc: item.desc || item.descripcion || '' };
    return null;
  }).filter(Boolean);
}

// Helper: normaliza imágenes de documentos RAG con descripciones
function normalizeDocImages(d) {
  let arr = [];
  try {
    if (d.imagenes_meta) {
      arr = typeof d.imagenes_meta === 'string' ? JSON.parse(d.imagenes_meta) : d.imagenes_meta;
    } else if (d.imagenes) {
      arr = typeof d.imagenes === 'string' ? JSON.parse(d.imagenes) : d.imagenes;
    }
  } catch (e) { arr = []; }

  if ((!Array.isArray(arr) || arr.length === 0) && d.imagen) {
    arr = [d.imagen];
  }

  return (Array.isArray(arr) ? arr : []).map(item => {
    if (typeof item === 'string') return { url: item, desc: '' };
    if (item && item.url) return { url: item.url, desc: item.desc || item.descripcion || '' };
    return null;
  }).filter(Boolean);
}

app.get('/api/rag/documents', async (_req, res) => {
  try {
    const rows = await db.all("SELECT id, name, category, timestamp, content, imagen, imagenes FROM documents ORDER BY id DESC");
    rows.forEach(d => {
      const meta = normalizeDocImages(d);
      d.imagenes_meta = meta;
      d.imagenes = meta.map(m => m.url);
      d.imagen = meta[0]?.url || d.imagen || '';
    });
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

// Crear tarjeta de conocimiento desde texto (con soporte de fotos)
app.post('/api/rag/save', async (req, res) => {
  try {
    const { name, category, content, imagen, imagenes, imagenes_meta } = req.body;
    if (!name || !content) return res.status(400).json({ error: "Nombre y contenido requeridos" });
    const meta = (Array.isArray(imagenes_meta) ? imagenes_meta : (Array.isArray(imagenes) ? imagenes.map(img => typeof img === 'string' ? { url: img, desc: '' } : img) : (imagen ? [{ url: imagen, desc: '' }] : []))).filter(Boolean).slice(0, 5);
    const urls = meta.map(m => m.url || m);
    await db.run("INSERT INTO documents (name, category, content, imagen, imagenes, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
      name, category || 'General', content, urls[0] || imagen || '', JSON.stringify(meta), new Date().toLocaleString());
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Editar tarjeta existente (con fotos)
app.put('/api/rag/documents/:id', async (req, res) => {
  try {
    const { name, category, content, imagen, imagenes, imagenes_meta } = req.body;
    const meta = (Array.isArray(imagenes_meta) ? imagenes_meta : (Array.isArray(imagenes) ? imagenes.map(img => typeof img === 'string' ? { url: img, desc: '' } : img) : (imagen ? [{ url: imagen, desc: '' }] : []))).filter(Boolean).slice(0, 5);
    const urls = meta.map(m => m.url || m);
    await db.run("UPDATE documents SET name = ?, category = ?, content = ?, imagen = ?, imagenes = ? WHERE id = ?",
      name, category, content, urls[0] || imagen || '', JSON.stringify(meta), req.params.id);
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

// Endpoint DETERMINÍSTICO: dado el mensaje del cliente + la respuesta del bot,
// devuelve las URLs de fotos ETIQUETADAS de productos EN JUEGO cuya etiqueta
// coincide con lo que pide el cliente (ej: "cuando te pidan medidas").
// Excluye SIEMPRE los productos AGOTADOS (nunca manda la foto de un agotado).
// n8n lo llama para adjuntar esas fotos sin depender del criterio del LLM.
app.post('/api/photos/auto-attach', async (req, res) => {
  try {
    const clientMsg = String(req.body.clientMsg || '').toLowerCase();
    const botMsg    = String(req.body.botMsg || '').toLowerCase();
    if (!clientMsg && !botMsg) return res.json({ urls: [] });
    const text = clientMsg + ' \n ' + botMsg;

    const prods = await db.all("SELECT * FROM products WHERE activo = 1");
    const AGOT_RULE  = /agot|sin\s*stock|sin\s*existencia|no\s*(la|lo|los|las)?\s*(ofrezcas|ofrecer|ofrescas|vendas|env[ií]es)/i;
    const STOP = new Set(['mesa','noche','melamina','madera','para','con','del','los','las','una','uno','modelo','color','motor','control']);
    const VIDEO_EXT = /\.(mp4|mov|webm|avi|m4v)(\?|$)/i;
    const urls = [];
    const videos = [];

    for (const p of prods) {
      const reglas   = String(p.reglas_bot || '').toLowerCase();
      // Los agotados se venden a pedido, así que SÍ se muestran sus fotos.
      // Solo se excluye si el producto tiene una regla EXPLÍCITA de "no ofrecer".
      if (AGOT_RULE.test(reglas)) continue;

      // ¿producto EN JUEGO? su "modelo N" o una palabra distintiva de su nombre aparece en el texto
      const nombre = String(p.nombre || '').toLowerCase();
      const modelo = (nombre.match(/modelo\s*\d+/) || [])[0];
      const tokens = nombre.split(/\s+/).filter(w => w.length > 3 && !STOP.has(w));
      const enJuego = (modelo && text.includes(modelo)) || tokens.some(t => text.includes(t));
      if (!enJuego) continue;

      for (const img of normalizeProductImages(p)) {
        const desc = String(img.desc || '').toLowerCase();
        if (!desc) continue;
        // La etiqueta describe CUÁNDO enviarla. Extraer el disparador (lo que viene tras "cuando (te/les) pidan/pregunten...").
        const trig = (desc.match(/cuando\s+(?:te\s+|les\s+)?(?:pidan|pida|pregunten(?:\s+por)?|quieran\s+ver|mostrala|mostrar)\s+(.+)/) || [,''])[1] || desc;
        const trigWords = trig.split(/[^a-záéíóúñ0-9]+/i).filter(w => w.length > 3 && !STOP.has(w));
        // Se dispara si se están hablando medidas EN EL MENSAJE DEL CLIENTE O EN LA RESPUESTA DEL BOT
        // (ej: cliente dice "modelo 1" y el bot responde "el modelo 1 MIDE 60x45x38").
        const medidas = /medida|mide|tama|dimensi|cu[aá]nto\s+mide/.test(text) && /medida/.test(desc);
        const isVideo = VIDEO_EXT.test(img.url);
        // Los videos disparan SOLO con lo que dice el CLIENTE (para no mandarlos cuando
        // el bot los ofrece); las fotos, con el mensaje del cliente o del bot.
        const scope = isVideo ? clientMsg : text;
        const overlap = trigWords.some(w => scope.includes(w));
        if ((medidas && !isVideo) || overlap) (isVideo ? videos : urls).push(img.url);
      }
    }

    // También escanear TARJETAS (documents) con media etiquetada (foto o video).
    // Se dispara por coincidencia de la etiqueta con el mensaje (videos solo con el cliente).
    try {
      const docs = await db.all("SELECT * FROM documents");
      for (const d of docs) {
        for (const img of normalizeDocImages(d)) {
          const desc = String(img.desc || '').toLowerCase();
          if (!desc) continue;
          const trig = (desc.match(/cuando\s+(?:te\s+|les\s+)?(?:pidan|pida|pregunten(?:\s+por)?|quieran\s+ver|mostrala|mostrar)\s+(.+)/) || [, ''])[1] || desc;
          const trigWords = trig.split(/[^a-záéíóúñ0-9]+/i).filter(w => w.length > 3 && !STOP.has(w));
          const isVideo = VIDEO_EXT.test(img.url);
          const scope = isVideo ? clientMsg : text;
          if (trigWords.some(w => scope.includes(w))) (isVideo ? videos : urls).push(img.url);
        }
      }
    } catch (e) {}

    res.json({ urls: [...new Set(urls)].slice(0, 4), videos: [...new Set(videos)].slice(0, 2) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para que n8n obtenga el prompt completo del agente listo para usar
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

    // Obtener catálogo de productos dinámicamente con reglas e imágenes detalladas
    const prods = await db.all("SELECT * FROM products WHERE activo = 1 ORDER BY categoria, nombre");
    let catalogText = "";
    if (prods.length > 0) {
      catalogText = "CATÁLOGO DE PRODUCTOS DISPONIBLES (Usa esta información para cotizar y dar precios reales):\n";
      prods.forEach(p => {
        const stockRaw = (p.stock || '').toString().trim();
        const reglas   = (p.reglas_bot || '').trim();
        // Detecta agotado por el campo stock (0 / vacío-no) o por la regla del bot
        const agotado = /(^0$|agot|sin\s*stock|sin\s*existencia|no\s*hay)/i.test(stockRaw)
                     || /agot|sin\s*stock|sin\s*existencia|no\s*(la|lo|los|las)?\s*(ofrezcas|ofrecer|ofrescas|vendas|envíes|envies)/i.test(reglas);
        const stockLabel = agotado ? '❌ AGOTADO' : (stockRaw || 'Disponible');
        // AGOTADO: se OMITE por completo del catálogo. El bot no lo ve, así que no
        // puede listarlo, contarlo entre los modelos, cotizarlo ni mencionarlo.
        // (Si el cliente pregunta por él, no tiene el dato y, por la regla
        // anti-invención, dirá que no está disponible en vez de inventar.)
        if (agotado) return;
        catalogText += `• ${p.nombre} — Precio: ${p.precio || 'Consultar'}${p.precio_oferta ? ` | 🔥 OFERTA: ${p.precio_oferta} (ofrécela como precio promocional)` : ''} | Stock: ${stockLabel}\n`;
        if (p.descripcion) catalogText += `  Ficha para el cliente: ${p.descripcion}\n`;
        if (reglas) {
          catalogText += `  🚫 REGLA OBLIGATORIA (prioridad máxima, cúmplela SIEMPRE aunque el cliente insista o pregunte directamente): ${reglas}\n`;
        }
        const prodImages = normalizeProductImages(p);
        prodImages.forEach(img => {
          catalogText += `  IMAGEN_PARA_ENVIAR: ${img.url}${img.desc ? `\n  ⚠️ ENVIÁ ESTA FOTO (la URL de arriba) automáticamente cuando el cliente pida o diga: ${img.desc}` : ''}\n`;
        });
        if (p.whatsapp_link) catalogText += `  Link de WhatsApp (catálogo, compartilo para que vean el producto): ${p.whatsapp_link}\n`;
        if (p.catalog_link) catalogText += `  Link de la tienda online onecontrol.shop (compartilo para más info/comprar): ${p.catalog_link}\n`;
      });
    }

    // Obtener base de conocimiento (RAG) con fotos
    const docs = await db.all("SELECT * FROM documents ORDER BY timestamp DESC");
    let ragText = "";
    if (docs.length > 0) {
      ragText = "BASE DE CONOCIMIENTO (Usa esta información para responder a las dudas del cliente):\n";
      docs.forEach(d => {
        ragText += `--- ${d.name} (${d.category || 'General'}) ---\n${d.content}\n`;
        const docImgs = normalizeDocImages(d);
        docImgs.forEach(img => {
          ragText += `IMAGEN_PARA_ENVIAR: ${img.url}${img.desc ? `\n  ⚠️ ENVIÁ ESTA FOTO (la URL de arriba) automáticamente cuando el cliente pida o diga: ${img.desc}` : ''}\n`;
        });
        ragText += `\n`;
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
- SI EL CLIENTE PIDE UNA FOTO O ESPECIFICACIÓN: Busca en el catálogo o base de conocimiento la IMAGEN_PARA_ENVIAR cuya descripción coincida con lo solicitado e incluye "ENVIAR_IMAGEN: [URL_DE_LA_IMAGEN]" al final de tu mensaje para que el sistema la envíe automáticamente.
- ⚠️ OBLIGATORIO: Cada producto puede tener una "REGLA OBLIGATORIA" o estar marcado como "❌ AGOTADO". Estas reglas tienen PRIORIDAD MÁXIMA y SIEMPRE se cumplen, incluso si el cliente pregunta directamente por ese producto o insiste. Si un producto está AGOTADO o su regla dice que no lo ofrezcas, NUNCA lo cotices, NUNCA des su precio y NUNCA envíes sus fotos: dile al cliente que por ahora no está disponible y ofrécele una alternativa.
- ⚠️ EL CATÁLOGO ACTUAL MANDA SOBRE LA MEMORIA: el catálogo de arriba es la ÚNICA verdad sobre qué hay disponible y a qué precio, AHORA. Aunque en mensajes anteriores de esta misma conversación vos hayas mencionado, ofrecido, cotizado o mandado foto de un producto, si ese producto YA NO aparece en el catálogo de arriba o está marcado como AGOTADO, NO lo vuelvas a ofrecer ni menciones su precio: decí que ya no está disponible y ofrecé una alternativa de las que SÍ están en el catálogo. Nunca uses precios o productos de tu memoria si contradicen el catálogo actual.
- ⚠️ NO INVENTES nombres, números ni etiquetas de modelo. Usa ÚNICAMENTE el nombre exacto que tiene cada producto en el catálogo. Si un producto no tiene un "modelo" definido, NO le asignes un número tú. Al listar varias opciones, identifícalas por su nombre o característica real (ej: "la de color caramelo", "la de puerta"), nunca con una numeración inventada por ti.

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
    const rows = await db.all("SELECT * FROM products ORDER BY categoria, nombre");
    rows.forEach(p => {
      const meta = normalizeProductImages(p);
      p.imagenes_meta = meta;
      p.imagenes = meta.map(m => m.url);
      p.imagen = meta[0]?.url || p.imagen || '';
    });
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', async (req, res) => {
  try {
    const { nombre, descripcion, reglas_bot, precio, precio_oferta, categoria, stock, imagen, imagenes, imagenes_meta, catalog_link, whatsapp_link } = req.body;
    if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
    const meta = (Array.isArray(imagenes_meta) ? imagenes_meta : (Array.isArray(imagenes) ? imagenes.map(img => typeof img === 'string' ? { url: img, desc: '' } : img) : (imagen ? [{ url: imagen, desc: '' }] : []))).filter(Boolean).slice(0, 5);
    const urls = meta.map(m => m.url || m);
    const ts = new Date().toLocaleString();
    const r = await db.run(
      "INSERT INTO products (nombre, descripcion, reglas_bot, precio, precio_oferta, categoria, stock, imagen, imagenes, imagenes_meta, catalog_link, whatsapp_link, timestamp) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      nombre, descripcion || '', reglas_bot || '', precio || '', precio_oferta || '', categoria || 'General', stock ?? '', urls[0] || imagen || '', JSON.stringify(urls), JSON.stringify(meta), catalog_link || '', whatsapp_link || '', ts
    );
    res.json({ success: true, id: r.lastID });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { nombre, descripcion, reglas_bot, precio, precio_oferta, categoria, stock, activo, imagen, imagenes, imagenes_meta, catalog_link, whatsapp_link } = req.body;
    const meta = (Array.isArray(imagenes_meta) ? imagenes_meta : (Array.isArray(imagenes) ? imagenes.map(img => typeof img === 'string' ? { url: img, desc: '' } : img) : (imagen ? [{ url: imagen, desc: '' }] : []))).filter(Boolean).slice(0, 5);
    const urls = meta.map(m => m.url || m);
    await db.run(
      "UPDATE products SET nombre=?, descripcion=?, reglas_bot=?, precio=?, precio_oferta=?, categoria=?, stock=?, activo=?, imagen=?, imagenes=?, imagenes_meta=?, catalog_link=?, whatsapp_link=? WHERE id=?",
      nombre, descripcion, reglas_bot ?? '', precio, precio_oferta ?? '', categoria, stock ?? '', activo ?? 1, urls[0] || imagen || '', JSON.stringify(urls), JSON.stringify(meta), catalog_link ?? '', whatsapp_link ?? '', req.params.id
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
app.post('/api/products/upload-image', productImagesUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se subió ninguna imagen" });
    // Comprimir/redimensionar para que WhatsApp la acepte (máx 5MB; dejamos < 1MB)
    const filePath = join('uploads', req.file.filename);
    try {
      const img = await Jimp.read(filePath);
      if (img.bitmap.width > 1600) img.resize(1600, Jimp.AUTO);
      img.quality(80);
      await img.writeAsync(filePath);
      console.log(`🖼️ Imagen comprimida: ${req.file.filename} (${(fs.statSync(filePath).size/1024).toFixed(0)} KB)`);
    } catch (e) {
      console.error('⚠️ No se pudo comprimir la imagen (se usa la original):', e.message);
    }
    const host = req.get('host');
    const protocol = req.protocol;
    const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    res.json({ success: true, imageUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recomprimir imágenes existentes del catálogo (para las que ya se subieron pesadas >5MB)
app.get('/api/products/recompress-images', async (req, res) => {
  try {
    const prods = await db.all("SELECT imagen, imagenes FROM products");
    const urls = new Set();
    prods.forEach(p => normalizeProductImages(p).forEach(u => urls.add(u)));
    let comprimidas = 0, saltadas = 0;
    for (const u of urls) {
      const m = String(u).match(/\/uploads\/([^/?]+)/);
      if (!m) { saltadas++; continue; }
      const fp = join('uploads', m[1]);
      try {
        if (!fs.existsSync(fp) || fs.statSync(fp).size <= 1200000) { saltadas++; continue; }
        const img = await Jimp.read(fp);
        if (img.bitmap.width > 1600) img.resize(1600, Jimp.AUTO);
        img.quality(80);
        await img.writeAsync(fp);
        comprimidas++;
      } catch (e) { saltadas++; }
    }
    res.json({ success: true, comprimidas, saltadas });
  } catch (err) { res.status(500).json({ error: err.message }); }
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
          if (p.precio_oferta) context += ` 🔥 OFERTA: ${p.precio_oferta}`;
          if (p.stock) context += ` (${p.stock})`;
          context += '\n';
          if (p.descripcion) context += `  ${p.descripcion}\n`;
          normalizeProductImages(p).forEach(u => { context += `  IMAGEN_PARA_ENVIAR: ${u}\n`; });
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
        let extra = '';
        // Avisar a la IA si la tarjeta tiene VIDEO, para que ofrezca mandarlo y NO diga "no tengo video".
        try {
          const vid = normalizeDocImages(d).find(im => /\.(mp4|mov|webm|avi|m4v)(\?|$)/i.test(im.url || ''));
          if (vid) extra = `\n[TIENE VIDEO (${vid.desc || 'de cómo funciona'}): si el cliente pregunta por eso, decí que SÍ y que ya se lo mandás (el sistema lo envía solo). NUNCA digas que no tenés video.]`;
        } catch (e) {}
        context += `--- ${d.name} (${d.category || 'General'}) ---\n${d.content}${extra}\n\n`;
      });
    }

    if (!context) return res.json({ context: "", found: false });
    
    res.json({ context: context.trim(), found: true, total: rows.length + docs.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ─────────────────────────────────────────────────────────────────────────────

// Endpoint para que n8n actualice datos del contacto (nombre, email, etc.)
// 📇 Guarda el nombre del cliente en su contacto de YCloud (remarkName).
// Aparece en el inbox de YCloud; en la app del teléfono depende de la sincronización de coexistencia.
async function guardarNombreEnYcloud(channelPhone, clientPhone, nombre) {
  try {
    if (!nombre || !clientPhone) return;
    const GEN = ['', 'cliente', 'cliente nuevo', 'agente'];
    if (GEN.includes(String(nombre).trim().toLowerCase())) return;
    const channel = await getChannelConfig(channelPhone);
    const apiKey = channel ? channel.api_key : await getDynamicSetting('ycloud_api_key', process.env.YCLOUD_API_KEY);
    if (!apiKey) return;
    let clean = String(clientPhone).replace(/[^\d+]/g, '');
    if (!clean.startsWith('+')) clean = '+' + clean;
    const q = await fetch(`https://api.ycloud.com/v2/contact/contacts?filter.phoneNumber=${encodeURIComponent(clean)}&limit=1`,
      { headers: { 'X-API-Key': apiKey, 'Accept': 'application/json' } });
    const cj = await q.json();
    const c = (cj.items || [])[0];
    if (!c || !c.id) return;
    await fetch(`https://api.ycloud.com/v2/contact/contacts/${c.id}`, {
      method: 'PATCH',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ remarkName: String(nombre).slice(0, 60) })
    });
    console.log(`📇 Nombre "${nombre}" guardado en el contacto YCloud ${clean}`);
  } catch (e) { console.error('⚠️ No se pudo guardar nombre en YCloud:', e.message); }
}

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

    // 🔔 RED DE SEGURIDAD: avisar apenas el lead esté calificado (nombre + zona/dirección),
    // aunque el bot no cierre con #PEDIDO_LISTO. Se avisa UNA sola vez por lead.
    try {
      const l = await db.get("SELECT nombre, phone, zona, direccion, motor, falla, channel_phone, lead_alertado FROM leads WHERE id = ?", id);
      const GENERIC = ['', 'cliente', 'cliente nuevo', 'agente'];
      const tieneNombre = l && l.nombre && !GENERIC.includes(String(l.nombre).trim().toLowerCase());
      const tieneUbicacion = l && (l.zona || l.direccion);
      // 📇 Si en esta actualización vino un nombre, guardarlo también en el contacto de YCloud
      if (nombre && tieneNombre) { guardarNombreEnYcloud(l.channel_phone, l.phone, l.nombre); }
      if (tieneNombre && tieneUbicacion && !l.lead_alertado) {
        await db.run("UPDATE leads SET lead_alertado = 1 WHERE id = ?", id);
        const alerta = `🔔 *LEAD LISTO PARA CONTACTAR*\n\n👤 ${l.nombre}\n📱 ${l.phone || ''}\n📍 ${l.zona || l.direccion}${l.motor && l.motor !== 'N/A' ? `\n⚙️ ${l.motor}` : ''}${l.falla && l.falla !== 'N/A' ? `\n🔧 ${l.falla}` : ''}\n\n👉 Ya tenés sus datos. Entrá al dashboard y contactalo con la cotización.`;
        await notificarDueno(alerta, l.channel_phone || null);
        console.log(`🔔 Lead ${id} calificado — alerta enviada al dueño`);
      }
    } catch (e) { console.error('⚠️ No se pudo evaluar/avisar lead calificado:', e.message); }

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
    const prodRows = await db.all("SELECT nombre, categoria, COALESCE(descripcion,'') as descripcion, COALESCE(precio,'Consultar') as precio, COALESCE(precio_oferta,'') as precio_oferta, COALESCE(imagen,'') as imagen, COALESCE(catalog_link,'') as catalog_link, COALESCE(stock,'') as stock, COALESCE(reglas_bot,'') as reglas_bot FROM products WHERE activo = 1");
    // Detecta agotado (sin stock inmediato). Los muebles se fabrican a pedido en ~4 días.
    // 3 estados de stock:
    //  - AGOTADO  → no se ofrece; solo aparece (a pedido) si el cliente lo nombra específicamente.
    //  - A PEDIDO / FABRICACIÓN → SÍ se ofrece, pero aclarando que es a pedido (~4 días).
    //  - DISPONIBLE (en stock / número) → se ofrece normal, como disponible.
    const AGOT_STOCK = /(^0$|agot|sin\s*stock|sin\s*existencia|no\s*hay)/i;
    const AGOT_RULE  = /agot|sin\s*stock|sin\s*existencia|no\s*(la|lo|los|las)?\s*(ofrezcas|ofrecer|ofrescas|vendas|env[ií]es)/i;
    const APEDIDO    = /a\s*pedido|bajo\s*pedido|por\s*encargo|encargo|fabricaci|producci/i;
    const prods = prodRows.map(p => {
      const stockStr = String(p.stock || '').trim();
      const agotado  = AGOT_STOCK.test(stockStr) || AGOT_RULE.test(String(p.reglas_bot));
      const aPedido  = !agotado && APEDIDO.test(stockStr);
      // Formato IDÉNTICO al anterior para los disponibles (no rompe nada).
      let content = p.descripcion + ' - Precio: ' + p.precio + (p.precio_oferta ? ' - OFERTA: ' + p.precio_oferta : '') + ' - Imagen: ' + p.imagen + (p.whatsapp_link ? ' - Link WhatsApp (compartilo para que vean el producto): ' + p.whatsapp_link : '') + (p.catalog_link ? ' - Link tienda onecontrol.shop (compartilo para más info): ' + p.catalog_link : '');
      // Avisar a la IA si el producto tiene VIDEO, para que ofrezca mandarlo y NO diga "no tengo video".
      try {
        const vid = normalizeProductImages(p).find(im => /\.(mp4|mov|webm|avi|m4v)(\?|$)/i.test(im.url || ''));
        if (vid) content += ` - TIENE VIDEO (${vid.desc || 'de cómo funciona'}): si el cliente pregunta por eso, decí que SÍ y que ya se lo mandás (el sistema lo envía solo). NUNCA digas que no tenés video.`;
      } catch (e) {}
      if (agotado) {
        // Vendemos SIEMPRE: el agotado se ofrece igual, aclarando que se fabrica según disponibilidad de material.
        content = 'ESTADO: SIN STOCK — este modelo se FABRICA y el plazo DEPENDE de la disponibilidad de material. OFRECELO igual (lo vendemos), presentándolo junto a los demás, pero dejando CLARO que este hay que FABRICARLO según disponibilidad de material: NUNCA digas que hay en stock, ni prometas entrega inmediata, ni una fecha fija. ' + content;
      } else if (aPedido) {
        // A pedido / fabricación: se ofrece, aclarando que es a pedido (~4 días).
        content = 'ESTADO: A PEDIDO / FABRICACION — no hay stock inmediato, pero se fabrica A PEDIDO, listo en ~4 dias aprox. OFRECELO aclarando que es a pedido (~4 dias); NUNCA prometas entrega inmediata ni digas que hay stock. ' + content;
      }
      return { name: p.nombre, category: p.categoria, content };
    }).filter(Boolean);

    const allKnowledge = [...docs, ...prods];

    if (allKnowledge.length === 0) return res.json({ context: "No hay información en la base de datos", found: false, sources: [] });

    // Búsqueda simple por palabras clave (Mejorada para plurales)
    const normalizeKw = (k) => k.replace(/es$/, '').replace(/s$/, '');
    const keywords = q.toLowerCase()
                      .replace(/[¿?¡!.,;:()"'*\n]/g, ' ')   // quitar puntuación: "visacuotas?" → "visacuotas"
                      .split(/\s+/)
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

// ─── MÓDULO DE ENTRENAMIENTO IA SUPERVISADO ───────────────────────────────────

// 1. Listar reglas de entrenamiento
app.get('/api/training/rules', async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = "SELECT * FROM training_rules WHERE 1=1";
    const params = [];

    if (status && status !== 'all') {
      query += " AND status = ?";
      params.push(status);
    }
    if (type && type !== 'all') {
      query += " AND type = ?";
      params.push(type);
    }

    query += " ORDER BY (CASE WHEN status = 'pending' THEN 0 ELSE 1 END) ASC, id DESC";
    const rows = await db.all(query, ...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Métricas de entrenamiento
app.get('/api/training/stats', async (_req, res) => {
  try {
    const total = await db.get("SELECT COUNT(*) as c FROM training_rules");
    const pending = await db.get("SELECT COUNT(*) as c FROM training_rules WHERE status = 'pending'");
    const approved = await db.get("SELECT COUNT(*) as c FROM training_rules WHERE status = 'approved'");
    const rejected = await db.get("SELECT COUNT(*) as c FROM training_rules WHERE status = 'rejected'");
    const prohibidas = await db.get("SELECT COUNT(*) as c FROM training_rules WHERE type = 'prohibido' AND status = 'approved'");
    const permitidas = await db.get("SELECT COUNT(*) as c FROM training_rules WHERE type != 'prohibido' AND status = 'approved'");

    res.json({
      total: total.c,
      pending: pending.c,
      approved: approved.c,
      rejected: rejected.c,
      prohibidas: prohibidas.c,
      permitidas: permitidas.c
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Crear regla de entrenamiento manual
app.post('/api/training/rules', async (req, res) => {
  try {
    const {
      type, title, rule,
      what_learned, what_not_to_say, prompt_instruction,
      example_question, example_response,
      source_lead_id, source_context, status
    } = req.body;

    if (!title || (!rule && !prompt_instruction && !what_not_to_say)) {
      return res.status(400).json({ error: "Título e instrucciones de regla son requeridos" });
    }

    const finalStatus = status || 'approved';
    const finalType = type || 'permitido';
    const finalRule = rule || prompt_instruction || what_not_to_say || title;

    const result = await db.run(
      `INSERT INTO training_rules (
        type, title, rule, what_learned, what_not_to_say, prompt_instruction,
        example_question, example_response, source_lead_id, source_context, status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      finalType, title, finalRule,
      what_learned || null, what_not_to_say || null, prompt_instruction || null,
      example_question || null, example_response || null,
      source_lead_id || null, source_context || 'Creado manualmente', finalStatus
    );

    res.json({ success: true, id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Actualizar o aprobar/rechazar regla
app.put('/api/training/rules/:id', async (req, res) => {
  try {
    const {
      type, title, rule,
      what_learned, what_not_to_say, prompt_instruction,
      example_question, example_response, status
    } = req.body;

    const existing = await db.get("SELECT * FROM training_rules WHERE id = ?", req.params.id);
    if (!existing) return res.status(404).json({ error: "Regla no encontrada" });

    const newType = type !== undefined ? type : existing.type;
    const newTitle = title !== undefined ? title : existing.title;
    const newRule = rule !== undefined ? rule : (prompt_instruction || existing.rule);
    const newWhatLearned = what_learned !== undefined ? what_learned : existing.what_learned;
    const newWhatNotToSay = what_not_to_say !== undefined ? what_not_to_say : existing.what_not_to_say;
    const newPromptInstruction = prompt_instruction !== undefined ? prompt_instruction : existing.prompt_instruction;
    const newQ = example_question !== undefined ? example_question : existing.example_question;
    const newR = example_response !== undefined ? example_response : existing.example_response;
    const newStatus = status !== undefined ? status : existing.status;

    await db.run(
      `UPDATE training_rules SET
        type=?, title=?, rule=?, what_learned=?, what_not_to_say=?, prompt_instruction=?,
        example_question=?, example_response=?, status=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
      newType, newTitle, newRule, newWhatLearned, newWhatNotToSay, newPromptInstruction,
      newQ, newR, newStatus, req.params.id
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Eliminar regla
app.delete('/api/training/rules/:id', async (req, res) => {
  try {
    await db.run("DELETE FROM training_rules WHERE id = ?", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Analizador de Conversaciones con IA (Auto-aprendizaje Estructurado)
app.post('/api/training/analyze', async (_req, res) => {
  try {
    // Traer los últimos 200 mensajes agrupados por lead
    const msgs = await db.all(
      `SELECT m.id, m.lead_id, m.sender, m.text, m.timestamp, l.nombre, l.phone, l.estado, l.handoff_reason
       FROM messages m
       INNER JOIN leads l ON m.lead_id = l.id
       ORDER BY m.id DESC LIMIT 200`
    );

    // Agrupar por lead_id
    const leadsMap = {};
    for (const m of msgs.reverse()) {
      if (!leadsMap[m.lead_id]) leadsMap[m.lead_id] = { lead: { id: m.lead_id, nombre: m.nombre, phone: m.phone, estado: m.estado, handoff_reason: m.handoff_reason }, messages: [] };
      leadsMap[m.lead_id].messages.push(m);
    }

    const suggestions = [];

    for (const [leadId, group] of Object.entries(leadsMap)) {
      const messages = group.messages;
      const clientMsgs = messages.filter(m => m.sender === 'client');
      const agentMsgs = messages.filter(m => m.sender === 'agent');

      // Patrón 1: El asesor humano intervino para dar una aclaración de experto
      if (agentMsgs.length > 0 && clientMsgs.length > 0) {
        const lastClient = clientMsgs[clientMsgs.length - 1];
        const lastAgent = agentMsgs[agentMsgs.length - 1];
        const tClient = (lastClient.text || '').toLowerCase();
        const tAgent = lastAgent.text || '';

        if (tAgent.length > 15 && !tAgent.toLowerCase().includes('hola') && tAgent.length < 400) {
          let tema = 'Respuesta de asesor humano';
          let whatLearned = `El asesor intervino para responder con precisión al cliente ${group.lead.nombre || group.lead.phone}.`;
          let whatNotToSay = `NO dejar la pregunta sin respuesta técnica ni dar información genérica.`;
          let promptInst = `Responder con la estructura probada por el asesor: "${tAgent.slice(0, 250)}"`;

          if (tClient.includes('precio') || tClient.includes('cuanto') || tClient.includes('costo')) {
            tema = 'Cotización y Precios Claros';
            whatLearned = 'El cliente requería conocer el precio exacto y qué incluye.';
            whatNotToSay = 'NO dar precios sin especificar la moneda (Quetzales) ni omitir si incluye impuestos o accesorios.';
            promptInst = `Indicar el precio exacto y detallar lo que incluye: "${tAgent.slice(0, 200)}"`;
          } else if (tClient.includes('envio') || tClient.includes('zona') || tClient.includes('departamento')) {
            tema = 'Cobertura y Costo de Envíos';
            whatLearned = 'El cliente consultó sobre envíos a su municipio o departamento.';
            whatNotToSay = 'NO prometer envío gratis a zonas no cubiertas sin verificar antes.';
            promptInst = `Consultar la zona o municipio exacto y confirmar tiempo de entrega: "${tAgent.slice(0, 200)}"`;
          } else if (tClient.includes('medida') || tClient.includes('mide') || tClient.includes('alto') || tClient.includes('ancho')) {
            tema = 'Medidas y Especificaciones Técnicas';
            whatLearned = 'El cliente necesita saber las dimensiones exactas antes de comprar.';
            whatNotToSay = 'NO inventar medidas ni suponer dimensiones sin consultar el catálogo.';
            promptInst = `Dar las medidas exactas en centímetros (Alto x Ancho x Fondo).`;
          } else if (tClient.includes('armad') || tClient.includes('caja')) {
            tema = 'Entrega Armada sin Costo Adicional';
            whatLearned = 'Los clientes dudan si deben armar el mueble o contratar a alguien.';
            whatNotToSay = 'PROHIBIDO decir que los muebles vienen desarmados o en piezas.';
            promptInst = `Aclarar enfáticamente que todos los muebles se entregan 100% armados y listos para usar.`;
          }

          suggestions.push({
            type: 'permitido',
            title: `Lección: ${tema}`,
            what_learned: whatLearned,
            what_not_to_say: whatNotToSay,
            prompt_instruction: promptInst,
            rule: promptInst,
            example_question: lastClient.text?.slice(0, 150) || '',
            example_response: tAgent.slice(0, 250),
            source_lead_id: Number(leadId),
            source_context: `Aprendido de la conversación con ${group.lead.nombre || group.lead.phone}.`
          });
        }
      }

      // Patrón 2: Detección de Confusiones / Objeciones / Lo que NO debe decir
      for (const cm of clientMsgs) {
        const txt = (cm.text || '').toLowerCase();

        // 1. Confusión de precio por el par
        if (txt.includes('el par') || txt.includes('las dos') || txt.includes('los dos') || txt.includes('vienen dos')) {
          suggestions.push({
            type: 'prohibido',
            title: 'No asumir que el precio es por el par de muebles',
            what_learned: 'Muchos clientes ven la foto con dos mesas y asumen que el precio publicado de Q550 es por ambas.',
            what_not_to_say: 'PROHIBIDO decir o dejar que el cliente crea que Q550 es por el par.',
            prompt_instruction: 'Aclarar SIEMPRE: "El precio es de Q550 por unidad (1 mesita); si desea el par completo le queda en Q1,100 con envío incluido."',
            rule: 'PROHIBIDO decir que Q550 es por el par. Siempre aclarar que Q550 es por unidad y el par sale en Q1,100.',
            example_question: cm.text.slice(0, 150),
            example_response: 'El precio es de Q550 por unidad (1 mesita); el par completo le sale en Q1,100 con envío gratis.',
            source_lead_id: Number(leadId),
            source_context: 'Detección automática de confusión de precios en catálogo.'
          });
        }

        // 2. Duda de muebles desarmados
        if (txt.includes('desarmad') || txt.includes('para armar') || txt.includes('vienen armadas')) {
          suggestions.push({
            type: 'prohibido',
            title: 'No decir que los muebles vienen desarmados',
            what_learned: 'Clientes temen recibir cajas con tornillos difíciles de armar.',
            what_not_to_say: 'PROHIBIDO decir que vienen desarmados o que el cliente debe armarlos.',
            prompt_instruction: 'Responder con tranquilidad que todos los muebles de OneControl se entregan 100% armados, embalados y listos para usar.',
            rule: 'PROHIBIDO decir que vienen desarmados. Se entregan completamente armados y listos para usar.',
            example_question: cm.text.slice(0, 150),
            example_response: 'Se entregan completamente armadas y listas para usar, no tiene que armar nada.',
            source_lead_id: Number(leadId),
            source_context: 'Pregunta recurrente sobre armado de producto.'
          });
        }

        // 3. Manejo de solicitud de rebaja o descuento
        if (txt.includes('descuento') || txt.includes('menos') || txt.includes('rebaja') || txt.includes('ultimo precio') || txt.includes('lo menos')) {
          suggestions.push({
            type: 'objecion',
            title: 'Manejo de objeción: Solicitud de descuento',
            what_learned: 'El cliente busca rebaja antes de comprometerse a comprar.',
            what_not_to_say: 'NO prometer descuentos no autorizados ni rechazar al cliente de forma cortante.',
            prompt_instruction: 'Explicar el valor de la melamina y calidad, y ofrecer que si lleva 2 o más unidades un asesor le revisará una atención especial.',
            rule: 'No prometer descuentos directos sin autorización. Explicar la alta calidad o consultar con asesor por compras de 2 o más unidades.',
            example_question: cm.text.slice(0, 150),
            example_response: 'Nuestros precios ya incluyen la mejor calidad de melamina y armado. Si te interesan 2 o más unidades, con gusto le pido a nuestro asesor una opción especial.',
            source_lead_id: Number(leadId),
            source_context: 'Negociación de precio detectada en chat.'
          });
        }

        // 4. Trato respetuoso neutro
        if (txt.includes('señor') || txt.includes('señora') || txt.includes('doña') || txt.includes('don')) {
          suggestions.push({
            type: 'prohibido',
            title: 'Trato personalizado respetuoso (Evitar asumir género)',
            what_learned: 'Asumir señor/señora puede generar incomodidad si el perfil no lo especifica.',
            what_not_to_say: 'PROHIBIDO usar títulos como "señora" o "señor" sin confirmación.',
            prompt_instruction: 'Tratar de usted de forma cálida y profesional utilizando el nombre del cliente.',
            rule: 'PROHIBIDO usar señor/señora si no se conoce con certeza. Tratar con el nombre propio del cliente de forma respetuosa.',
            example_question: cm.text.slice(0, 150),
            example_response: '¡Con mucho gusto! ¿En qué le puedo apoyar hoy?',
            source_lead_id: Number(leadId),
            source_context: 'Protocolo de cortesía y atención.'
          });
        }
      }
    }

    // Insertar sugerencias detectadas sin duplicar
    let nuevas = 0;
    for (const s of suggestions) {
      const existing = await db.get(
        "SELECT id FROM training_rules WHERE title = ? OR rule = ?",
        s.title, s.rule
      );
      if (!existing) {
        await db.run(
          `INSERT INTO training_rules (
            type, title, rule, what_learned, what_not_to_say, prompt_instruction,
            example_question, example_response, source_lead_id, source_context, status, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
          s.type, s.title, s.rule, s.what_learned || null, s.what_not_to_say || null, s.prompt_instruction || null,
          s.example_question, s.example_response, s.source_lead_id, s.source_context
        );
        nuevas++;
      }
    }

    const totalPending = await db.get("SELECT COUNT(*) as c FROM training_rules WHERE status = 'pending'");
    res.json({
      success: true,
      nuevas,
      totalPending: totalPending.c,
      analizados: msgs.length
    });
  } catch (err) {
    console.error('Error en /api/training/analyze:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Probador / Simulador en Vivo de Respuestas
app.post('/api/training/test', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) return res.status(400).json({ error: "Falta la pregunta" });

    const approvedRules = await db.all("SELECT * FROM training_rules WHERE status = 'approved'");
    const qClean = question.toLowerCase();

    // 1. Buscar en catálogo de productos con scoring inteligente
    const products = await db.all("SELECT * FROM products WHERE activo = 1");
    const docs = await db.all("SELECT name, category, COALESCE(content, '') as content FROM documents");

    const normalizeKw = (k) => k.replace(/es$/, '').replace(/s$/, '');
    const keywords = qClean
      .replace(/[¿?¡!.,;:()"'*\n]/g, ' ')
      .split(/\s+/)
      .filter(k => k.length > 2)
      .map(normalizeKw);

    const scoredProducts = products.map(p => {
      const fullText = `${p.nombre} ${p.categoria || ''} ${p.descripcion || ''}`.toLowerCase();
      let score = 0;
      keywords.forEach(kw => {
        if (fullText.includes(kw)) {
          score += 2;
          if ((p.nombre || '').toLowerCase().includes(kw)) score += 6;
        }
      });
      return { ...p, score };
    }).filter(p => p.score > 0).sort((a, b) => b.score - a.score);

    // 2. Encontrar reglas de entrenamiento aplicables
    const matchingRules = approvedRules.filter(r => {
      const matchQ = r.example_question && keywords.some(kw => (r.example_question || '').toLowerCase().includes(kw));
      const matchTitle = r.title && keywords.some(kw => (r.title || '').toLowerCase().includes(kw));
      const matchRule = r.rule && keywords.some(kw => (r.rule || '').toLowerCase().includes(kw));
      return matchQ || matchTitle || matchRule;
    });

    let simulatedReply = "";
    if (scoredProducts.length > 0) {
      const topProd = scoredProducts[0];
      simulatedReply = `¡Hola! Sí, contamos con **${topProd.nombre}**.\n\n💰 Precio: **Q${topProd.precio}** (por unidad).\n📦 Estado: ${topProd.stock || 'En stock'}.\n${topProd.descripcion ? `✨ ${topProd.descripcion}\n\n` : '\n'}Se entrega **completamente armado y listo para usar**. ¿Te gustaría ver fotos o que tomemos tus datos para coordinar el envío?`;
    } else if (qClean.includes('mesa') || qClean.includes('mueble') || qClean.includes('noche')) {
      simulatedReply = "¡Con gusto! Nuestras mesitas de noche estándar tienen un precio de **Q550 cada una** (el par sale en Q1,100) y se entregan **completamente armadas**. ¿Te gustaría ver las fotos de los modelos disponibles?";
    } else if (qClean.includes('envio') || qClean.includes('costo') || qClean.includes('zona')) {
      simulatedReply = "El costo de envío varía según tu ubicación (en varias zonas está incluido y en otras tiene un costo de Q50). ¿En qué zona o municipio te encuentras para confirmarte?";
    } else if (qClean.includes('pago') || qClean.includes('tarjeta') || qClean.includes('visacuotas')) {
      simulatedReply = "Aceptamos pago contra entrega, transferencia bancaria y Visacuotas. ¿Cuál forma de pago te resulta más cómoda?";
    } else {
      simulatedReply = "¡Hola! Con mucho gusto te apoyo con información de nuestros productos y servicios. ¿Qué modelo o producto estás buscando?";
    }

    // Si hay una regla aprobada de tipo 'prohibido' u 'objecion', aplicarla al texto
    if (matchingRules.some(r => r.type === 'prohibido' && (r.title || '').toLowerCase().includes('par'))) {
      if (!simulatedReply.includes('por unidad')) {
        simulatedReply += "\n\n*(Aclaración: El precio indicado es por unidad; el par tiene su valor correspondiente).*";
      }
    }

    // 3. Detectar si enviará imágenes o videos (Media auto-attachment)
    const mediaInfo = {
      willSendImage: false,
      willSendVideo: false,
      images: [],
      videos: [],
      summary: "📝 Solo mensaje de texto (no enviará fotos ni videos)"
    };

    const VIDEO_EXT = /\.(mp4|mov|webm|avi|m4v)(\?|$)/i;

    if (scoredProducts.length > 0) {
      const topProd = scoredProducts[0];
      const prodImages = normalizeProductImages(topProd);
      
      // Extraer imágenes y videos del producto
      for (const im of prodImages) {
        if (VIDEO_EXT.test(im.url)) {
          mediaInfo.videos.push({ url: im.url, desc: im.desc || 'Video demostrativo' });
          mediaInfo.willSendVideo = true;
        } else if (im.url) {
          mediaInfo.images.push({ url: im.url, desc: im.desc || topProd.nombre });
          mediaInfo.willSendImage = true;
        }
      }
    }

    // Escanear también si alguna tarjeta de conocimiento (documents) tiene media
    try {
      for (const d of docs) {
        const dImages = normalizeDocImages(d);
        for (const im of dImages) {
          const desc = String(im.desc || '').toLowerCase();
          if (desc && keywords.some(kw => desc.includes(kw))) {
            if (VIDEO_EXT.test(im.url)) {
              mediaInfo.videos.push({ url: im.url, desc: im.desc || d.name });
              mediaInfo.willSendVideo = true;
            } else if (im.url) {
              mediaInfo.images.push({ url: im.url, desc: im.desc || d.name });
              mediaInfo.willSendImage = true;
            }
          }
        }
      }
    } catch (e) {}

    // Resumen legible
    if (mediaInfo.willSendImage && mediaInfo.willSendVideo) {
      mediaInfo.summary = `📸 Enviará ${mediaInfo.images.length} imagen(es) + 🎬 ${mediaInfo.videos.length} video(s) demostrativo(s)`;
    } else if (mediaInfo.willSendImage) {
      mediaInfo.summary = `📸 Enviará ${mediaInfo.images.length} imagen(es) del producto adjunta(s)`;
    } else if (mediaInfo.willSendVideo) {
      mediaInfo.summary = `🎬 Enviará ${mediaInfo.videos.length} video(s) demostrativo(s) adjunto(s)`;
    }

    res.json({
      success: true,
      question,
      reply: simulatedReply,
      mediaInfo,
      appliedRules: matchingRules.map(r => ({ id: r.id, title: r.title, type: r.type, rule: r.rule })),
      productsFound: scoredProducts.slice(0, 3).map(p => `${p.nombre} (Q${p.precio})`)
    });
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

// ─── META INTEGRATION (Facebook Page, Instagram & Comentarios) ───────────────
// Helper para clasificar si un comentario o mensaje es DELICADO (queja/reclamo)
function comentarioEsDelicado(text) {
  const t = normalize(text || '');
  const claves = ['queja','reclamo','pesimo','malo','horrible','estafa','engan','engañ','fraude',
    'denunci','no sirve','no funciona','roto','defectuoso','devoluc','reembolso','garantia',
    'demora','tarda','molest','enojad','indignad','decepcion','verguenza','vergüenza','robo',
    'ladron','ladrón','no llego','no llegó','nunca llego','pesima','malisimo','malísimo'];
  return claves.some(k => t.includes(k));
}

// Obtener nombre del perfil de Facebook o Instagram vía Graph API
async function fetchMetaUserName(userId, platform = 'facebook') {
  try {
    const { token } = await getMetaConfig();
    if (!token || !userId) return null;
    const r = await fetch(`${META_GRAPH}/${userId}?fields=name,first_name,last_name,username&access_token=${token}`);
    const data = await r.json().catch(() => ({}));
    if (data && !data.error) {
      if (data.name) return data.name;
      if (data.username) return `@${data.username}`;
      if (data.first_name) return `${data.first_name} ${data.last_name || ''}`.trim();
    }
  } catch(e) {}
  return null;
}

// Responder comentario en Facebook o Instagram
async function replyToComment(commentId, message, platform = 'instagram') {
  const { token } = await getMetaConfig();
  if (!token) throw new Error('No hay token de Meta configurado (META_PAGE_TOKEN)');
  const endpoint = platform === 'facebook'
    ? `${META_GRAPH}/${commentId}/comments`
    : `${META_GRAPH}/${commentId}/replies`;
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, access_token: token })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) throw new Error(`Meta ${r.status}: ${(data.error?.message || JSON.stringify(data)).slice(0, 200)}`);
  return data;
}

// Endpoint para obtener métricas e insights de Meta (Likes, Seguidores, Posts populares de IG & FB)
app.get('/api/meta/insights', async (req, res) => {
  try {
    const { token, igUserId, fbPageId } = await getMetaConfig();
    if (!token) {
      return res.json({
        configured: false,
        instagram: null,
        facebook: null,
        posts: [],
        stats: { totalFollowers: 0, totalLikes: 0, totalComments: 0 }
      });
    }

    let instagram = null;
    let igPosts = [];
    let facebook = null;

    // 1. Fetch Instagram Profile & Media
    try {
      const igRes = await fetch(`${META_GRAPH}/${igUserId}?fields=id,username,name,followers_count,follows_count,media_count,profile_picture_url&access_token=${token}`);
      const igData = await igRes.json();
      if (igData && !igData.error) {
        instagram = igData;
      }

      const igMediaRes = await fetch(`${META_GRAPH}/${igUserId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=12&access_token=${token}`);
      const igMediaData = await igMediaRes.json();
      if (igMediaData && Array.isArray(igMediaData.data)) {
        igPosts = igMediaData.data.map(p => ({
          id: p.id,
          platform: 'instagram',
          caption: p.caption || '',
          media_type: p.media_type,
          thumbnail: p.thumbnail_url || p.media_url,
          permalink: p.permalink,
          timestamp: p.timestamp,
          like_count: p.like_count || 0,
          comments_count: p.comments_count || 0
        }));
      }
    } catch (e) {
      console.warn("Error fetching IG insights:", e.message);
    }

    // 2. Fetch Facebook Page
    try {
      const fbRes = await fetch(`${META_GRAPH}/${fbPageId}?fields=id,name,fan_count,followers_count,link,picture&access_token=${token}`);
      const fbData = await fbRes.json();
      if (fbData && !fbData.error) {
        facebook = {
          id: fbData.id,
          name: fbData.name,
          fan_count: fbData.fan_count || 0,
          followers_count: fbData.followers_count || 0,
          link: fbData.link || `https://facebook.com/${fbPageId}`,
          picture: fbData.picture?.data?.url || ''
        };
      }
    } catch (e) {
      console.warn("Error fetching FB insights:", e.message);
    }

    // 3. Seguidores ganados (Tracking historico y diario)
    const now = new Date();
    const guateTime = new Date(now.getTime() - (6 * 60 * 60 * 1000));
    const todayStr = guateTime.toISOString().slice(0, 10);
    const timeStr = horaGuate();

    let igFollowers = Number(instagram?.followers_count || 0);
    let igGainedToday = 0;
    let igGainedTotal = 0;

    if (igFollowers > 0) {
      const igFirstToday = await db.get("SELECT followers_count FROM social_followers_log WHERE platform = 'instagram' AND date_str = ? ORDER BY id ASC LIMIT 1", todayStr);
      const igEarliest = await db.get("SELECT followers_count FROM social_followers_log WHERE platform = 'instagram' ORDER BY id ASC LIMIT 1");
      const igLastPrev = await db.get("SELECT followers_count FROM social_followers_log WHERE platform = 'instagram' AND date_str < ? ORDER BY id DESC LIMIT 1", todayStr);
      
      const baselineToday = igLastPrev?.followers_count || igFirstToday?.followers_count || igFollowers;
      igGainedToday = Math.max(0, igFollowers - baselineToday);
      igGainedTotal = Math.max(0, igFollowers - (igEarliest?.followers_count || igFollowers));

      const igLatest = await db.get("SELECT followers_count FROM social_followers_log WHERE platform = 'instagram' ORDER BY id DESC LIMIT 1");
      if (!igLatest || igLatest.followers_count !== igFollowers) {
        await db.run("INSERT INTO social_followers_log (platform, followers_count, date_str, timestamp) VALUES ('instagram', ?, ?, ?)", igFollowers, todayStr, timeStr);
      }
    }

    let fbFollowers = Number(facebook?.followers_count || facebook?.fan_count || 0);
    let fbGainedToday = 0;
    let fbGainedTotal = 0;

    if (fbFollowers > 0) {
      const fbFirstToday = await db.get("SELECT followers_count FROM social_followers_log WHERE platform = 'facebook' AND date_str = ? ORDER BY id ASC LIMIT 1", todayStr);
      const fbEarliest = await db.get("SELECT followers_count FROM social_followers_log WHERE platform = 'facebook' ORDER BY id ASC LIMIT 1");
      const fbLastPrev = await db.get("SELECT followers_count FROM social_followers_log WHERE platform = 'facebook' AND date_str < ? ORDER BY id DESC LIMIT 1", todayStr);

      const baselineToday = fbLastPrev?.followers_count || fbFirstToday?.followers_count || fbFollowers;
      fbGainedToday = Math.max(0, fbFollowers - baselineToday);
      fbGainedTotal = Math.max(0, fbFollowers - (fbEarliest?.followers_count || fbFollowers));

      const fbLatest = await db.get("SELECT followers_count FROM social_followers_log WHERE platform = 'facebook' ORDER BY id DESC LIMIT 1");
      if (!fbLatest || fbLatest.followers_count !== fbFollowers) {
        await db.run("INSERT INTO social_followers_log (platform, followers_count, date_str, timestamp) VALUES ('facebook', ?, ?, ?)", fbFollowers, todayStr, timeStr);
      }
    }

    // 4. Comments count from CRM database
    const dbCommentsCount = await db.get("SELECT COUNT(*) as c FROM redes_comments");
    const totalLikes = igPosts.reduce((acc, p) => acc + (p.like_count || 0), 0);
    const totalComments = igPosts.reduce((acc, p) => acc + (p.comments_count || 0), 0) + (dbCommentsCount?.c || 0);
    const totalFollowers = igFollowers + fbFollowers;
    const totalGainedToday = igGainedToday + fbGainedToday;
    const totalGainedAllTime = igGainedTotal + fbGainedTotal;

    res.json({
      configured: true,
      instagram: instagram ? { ...instagram, gained_today: igGainedToday, gained_total: igGainedTotal } : null,
      facebook: facebook ? { ...facebook, gained_today: fbGainedToday, gained_total: fbGainedTotal } : null,
      posts: igPosts,
      stats: {
        totalFollowers,
        totalGainedToday,
        totalGainedAllTime,
        totalLikes,
        totalComments,
        igMediaCount: instagram?.media_count || igPosts.length,
        fbFans: facebook?.fan_count || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para obtener el historial registrado de seguidores y crecimiento
app.get('/api/meta/followers-history', async (_req, res) => {
  try {
    const rows = await db.all("SELECT * FROM social_followers_log ORDER BY id DESC LIMIT 100");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper para generar respuesta directa a mensajes de Messenger / Instagram con RAG
async function generateDirectMessageReply(customerMsg, leadId, platform = 'Facebook Messenger') {
  const qClean = (customerMsg || '').toLowerCase();
  
  // 1. Catálogo RAG de productos
  const products = await db.all("SELECT * FROM products WHERE activo = 1");
  const normalizeKw = (k) => k.replace(/es$/, '').replace(/s$/, '');
  const keywords = qClean.replace(/[¿?¡!.,;:()"'*\n]/g, ' ').split(/\s+/).filter(k => k.length > 2).map(normalizeKw);

  const scoredProducts = products.map(p => {
    const fullText = `${p.nombre} ${p.categoria || ''} ${p.descripcion || ''}`.toLowerCase();
    let score = 0;
    keywords.forEach(kw => {
      if (fullText.includes(kw)) {
        score += 2;
        if ((p.nombre || '').toLowerCase().includes(kw)) score += 6;
      }
    });
    return { ...p, score };
  }).filter(p => p.score > 0).sort((a, b) => b.score - a.score);

  let replyText = "";
  let mediaUrl = null;

  if (scoredProducts.length > 0) {
    const topProd = scoredProducts[0];
    replyText = `¡Hola! 👋 Sí, contamos con **${topProd.nombre}**.\n\n💰 Precio: **Q${topProd.precio}** (por unidad).\n📦 Estado: ${topProd.stock || 'En stock'}.\n${topProd.descripcion ? `✨ ${topProd.descripcion}\n\n` : '\n'}Se entrega **completamente armado y listo para usar** con pago contra entrega 🚚. ¿Te gustaría que coordinemos tu envío o que te compartamos más fotos?`;
    
    const prodImages = normalizeProductImages(topProd);
    if (prodImages.length > 0 && prodImages[0].url) {
      mediaUrl = prodImages[0].url;
    }
  } else if (qClean.includes('mesa') || qClean.includes('mueble') || qClean.includes('noche')) {
    replyText = "¡Hola! 👋 Nuestras mesitas de noche estándar tienen un precio de **Q550 cada una** (el par sale en Q1,100) y modelos especiales como One Night en **Q1,000**. Se entregan armadas con opción de pago contra entrega 🚚. ¿Qué modelo te gustaría conocer?";
  } else if (qClean.includes('envio') || qClean.includes('costo') || qClean.includes('zona') || qClean.includes('departamento')) {
    replyText = "Contamos con envíos a toda Guatemala 🚚. ¿En qué zona o municipio te encuentras para confirmarte cobertura y tiempo de entrega?";
  } else if (qClean.includes('pago') || qClean.includes('tarjeta') || qClean.includes('visacuotas')) {
    replyText = "Aceptamos pago contra entrega en efectivo, transferencia bancaria y Visacuotas 💳. ¿Cuál forma de pago te resulta más cómoda?";
  } else {
    replyText = "¡Hola! Con mucho gusto te apoyo con información, precios y detalles de nuestros productos de OneControl. ¿En qué te podemos asesorar hoy? 😊";
  }

  return { text: replyText, mediaUrl, mediaType: 'image' };
}

// Procesador universal de Webhooks de Meta (Facebook Messenger, Instagram Direct & Comentarios)
async function processIncomingMetaWebhook(body) {
  const { token, igUserId, fbPageId } = await getMetaConfig();
  const time = horaGuate();
  const entries = body?.entry || [];

  for (const entry of entries) {
    const entryId = String(entry.id || '');
    const isInstagramEntry = body.object === 'instagram' || body.object === 'instagram_business_account' || entryId === String(igUserId);

    // 1. Mensajes Directos (Messenger / Instagram Direct)
    const messagingList = entry.messaging || entry.standby || [];
    for (const event of messagingList) {
      const isEcho = !!event.message?.is_echo ||
        String(event.sender?.id) === entryId ||
        String(event.sender?.id) === String(igUserId) ||
        String(event.sender?.id) === String(fbPageId);

      const customerId = isEcho ? String(event.recipient?.id || '') : String(event.sender?.id || '');
      const channelId = isEcho ? String(event.sender?.id || '') : String(event.recipient?.id || '');
      if (!customerId) continue;

      const platform = isInstagramEntry ? 'Instagram Direct' : 'Facebook Messenger';
      const text = event.message?.text || event.postback?.title || '';

      let mediaUrl = null;
      let mediaType = null;
      const att = event.message?.attachments?.[0];
      if (att) {
        mediaUrl = att.payload?.url || null;
        mediaType = att.type || (mediaUrl ? 'image' : null);
      }

      const sender = isEcho ? 'agent' : 'client';

      // Buscar lead existente
      let existingLead = await db.get(
        "SELECT id, nombre, estado, score, botActive, origen FROM leads WHERE (whatsapp_id = ? OR phone = ?) AND (origen LIKE '%Instagram%' OR origen LIKE '%Facebook%')",
        customerId, customerId
      );
      if (!existingLead) {
        existingLead = await db.get(
          "SELECT id, nombre, estado, score, botActive, origen FROM leads WHERE whatsapp_id = ? OR phone = ?",
          customerId, customerId
        );
      }

      let leadId;
      if (existingLead) {
        leadId = existingLead.id;
        const updates = [];
        const params = [];

        if (isEcho) {
          updates.push("botActive = 0");
          updates.push("priority = 'normal'");
          updates.push("handoff_reason = NULL");
          if (existingLead.estado === 'Nuevo' || existingLead.estado === 'Intervención Requerida') {
            updates.push("estado = 'En Seguimiento'");
          }
        }

        if (updates.length > 0) {
          params.push(leadId);
          await db.run(`UPDATE leads SET ${updates.join(", ")} WHERE id = ?`, ...params);
        }
      } else {
        // Obtener nombre del perfil desde Meta API si está disponible
        let userName = await fetchMetaUserName(customerId, isInstagramEntry ? 'instagram' : 'facebook');
        if (!userName) {
          userName = isInstagramEntry ? `Cliente Instagram (${customerId.slice(-4)})` : `Cliente Facebook (${customerId.slice(-4)})`;
        }

        const initialEstado = isEcho ? 'En Seguimiento' : 'Nuevo';
        const initialBotActive = isEcho ? 0 : 1;

        const result = await db.run(
          `INSERT INTO leads (nombre, phone, whatsapp_id, score, estado, origen, botActive, channel_phone, priority)
           VALUES (?, ?, ?, 50, ?, ?, ?, ?, 'normal')`,
          userName, customerId, customerId, initialEstado, platform, initialBotActive, channelId || entryId
        );
        leadId = result.lastID;
        console.log(`🆕 [${platform}] Creado nuevo lead ID ${leadId} (${userName} - ${customerId})`);
      }

      // Guardar mensaje en el historial
      if (text || mediaUrl) {
        await saveSmartMessage(leadId, sender, text, time, mediaUrl, mediaType);
        console.log(`💾 [${platform}] Mensaje guardado para lead ${leadId} (${sender}): "${(text || mediaUrl)?.slice(0, 60)}"`);
      }

      // Handoff automático si el cliente pide ayuda
      if (!isEcho && (await detectHandoff(text))) {
        const handoffReason = await detectHandoff(text);
        await db.run(
          "UPDATE leads SET botActive = 0, priority = 'urgent', handoff_reason = ?, estado = 'Intervención Requerida' WHERE id = ?",
          handoffReason, leadId
        );
        try {
          const l = await db.get("SELECT nombre, phone FROM leads WHERE id = ?", leadId);
          const alerta = `🙋 *SOLICITUD DE AYUDA (${platform})*\n\nUn cliente necesita atención humana.\n\n👤 ${l?.nombre || 'Cliente'}\n📱 ID: ${customerId}\n📝 ${handoffReason}${text ? `\n💬 "${text.slice(0, 120)}"` : ''}\n\n👉 Entrá al dashboard para responderle.`;
          await notificarDueno(alerta);
        } catch(e) {}
      } else if (!isEcho && text) {
        // Auto-respuesta inteligente del bot para Facebook Messenger / Instagram Direct
        const leadCheck = await db.get("SELECT botActive, priority FROM leads WHERE id = ?", leadId);
        if (leadCheck?.botActive === 1 && leadCheck?.priority !== 'urgent') {
          try {
            const reply = await generateDirectMessageReply(text, leadId, platform);
            if (reply.text) {
              await sendMetaMessage(customerId, reply.text, reply.mediaUrl, reply.mediaType || 'image');
              await saveSmartMessage(leadId, 'bot', reply.text, horaGuate(), reply.mediaUrl, reply.mediaType || 'image');
              console.log(`🤖 [Bot Meta Auto-Reply] Respondido a lead ${leadId} por ${platform}: "${reply.text.slice(0, 60)}"`);
            }
          } catch (botErr) {
            console.error(`Error en auto-respuesta bot Meta (${platform}):`, botErr.message);
          }
        }
      }
    }

    // 2. Comentarios en Publicaciones (Feed & Comments)
    const changes = entry.changes || [];
    for (const ch of changes) {
      if (ch.field !== 'comments' && ch.field !== 'feed') continue;
      const v = ch.value || {};
      if (!v.id && !v.comment_id) continue;
      const commentId = v.comment_id || v.id;
      const fromId = v.from?.id || '';
      if (fromId && (fromId === String(igUserId) || fromId === String(fbPageId) || fromId === entryId)) continue;

      const text = v.message || v.text || '';
      if (!text) continue;

      const delicado = comentarioEsDelicado(text) ? 1 : 0;
      const commentPlatform = (ch.field === 'feed' || !isInstagramEntry) ? 'facebook' : 'instagram';
      const fromName = v.from?.name || v.from?.username || 'Usuario';
      const mediaId = v.media?.id || v.post_id || '';
      const parentId = v.parent_id || null;

      try {
        const r = await db.run(
          "INSERT OR IGNORE INTO redes_comments (platform, comment_id, media_id, parent_id, from_id, from_name, text, status, is_delicate, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, 'nuevo', ?, ?)",
          commentPlatform, commentId, mediaId, parentId, fromId, fromName, text, delicado, time
        );
        console.log(`💬 Comentario ${commentPlatform.toUpperCase()} de ${fromName}: "${text.slice(0, 60)}" (delicado: ${delicado})`);

        // Si la auto-respuesta del bot está habilitada y NO es un comentario delicado:
        if (r.changes) {
          const sRow = await db.get("SELECT value FROM settings WHERE key = 'bot_comments_enabled'");
          if (sRow?.value === '1' && !delicado) {
            try {
              const autoReply = await generateCommentReply(text, fromName, commentPlatform);
              await replyToComment(commentId, autoReply, commentPlatform);
              await db.run("UPDATE redes_comments SET bot_reply = ?, status = 'respondido' WHERE comment_id = ?", autoReply, commentId);
              console.log(`🤖 [Auto-Respuesta Bot Comentarios] Respondido a ${fromName}: "${autoReply.slice(0, 60)}"`);
            } catch (replyErr) {
              console.error('Error enviando auto-respuesta a comentario:', replyErr.message);
            }
          }
        }
      } catch(e) {
        console.error('Error guardando comentario:', e.message);
      }
    }
  }
}

// Handlers de Webhook Meta: Verificación GET
const handleMetaWebhookGet = async (req, res) => {
  const { verifyToken } = await getMetaConfig();
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === verifyToken) {
    console.log('✅ Webhook de Meta verificado');
    return res.status(200).send(req.query['hub.challenge']);
  }
  return res.sendStatus(403);
};

// Handlers de Webhook Meta: Recepción POST
const handleMetaWebhookPost = async (req, res) => {
  res.sendStatus(200); // Responder 200 rápido a Meta
  try {
    await processIncomingMetaWebhook(req.body);
  } catch (err) {
    console.error('❌ Error en webhook Meta:', err.message);
  }
};

// Endpoints Webhook de Meta (Compatibilidad con múltiples rutas)
app.get('/webhooks/instagram', handleMetaWebhookGet);
app.post('/webhooks/instagram', handleMetaWebhookPost);
app.get('/webhooks/facebook', handleMetaWebhookGet);
app.post('/webhooks/facebook', handleMetaWebhookPost);
app.get('/webhooks/meta', handleMetaWebhookGet);
app.post('/webhooks/meta', handleMetaWebhookPost);

app.get('/api/webhook/instagram', handleMetaWebhookGet);
app.post('/api/webhook/instagram', handleMetaWebhookPost);
app.get('/api/webhook/facebook', handleMetaWebhookGet);
app.post('/api/webhook/facebook', handleMetaWebhookPost);
app.get('/api/webhook/meta', handleMetaWebhookGet);
app.post('/api/webhook/meta', handleMetaWebhookPost);

// Helper para generar respuesta inteligente a comentarios con RAG y Reglas
async function generateCommentReply(commentText, fromName = '', platform = 'instagram') {
  const qClean = (commentText || '').toLowerCase();
  const nameTag = fromName ? `@${fromName.replace(/^@/, '')}` : '';

  // 1. Obtener número de WhatsApp y configuraciones
  const sRows = await db.all("SELECT key, value FROM settings WHERE key IN ('owner_phone', 'comments_wa_phone', 'bot_comments_prompt')");
  const sMap = {};
  sRows.forEach(r => sMap[r.key] = r.value);
  const waPhone = sMap.comments_wa_phone || sMap.owner_phone || '35154362';

  // 2. Búsqueda en catálogo de productos con scoring inteligente
  const products = await db.all("SELECT * FROM products WHERE activo = 1");
  const normalizeKw = (k) => k.replace(/es$/, '').replace(/s$/, '');
  const keywords = qClean.replace(/[¿?¡!.,;:()"'*\n]/g, ' ').split(/\s+/).filter(k => k.length > 2).map(normalizeKw);

  const scoredProducts = products.map(p => {
    const fullText = `${p.nombre} ${p.categoria || ''} ${p.descripcion || ''}`.toLowerCase();
    let score = 0;
    keywords.forEach(kw => {
      if (fullText.includes(kw)) {
        score += 2;
        if ((p.nombre || '').toLowerCase().includes(kw)) score += 6;
      }
    });
    return { ...p, score };
  }).filter(p => p.score > 0).sort((a, b) => b.score - a.score);

  let reply = '';
  if (scoredProducts.length > 0) {
    const topProd = scoredProducts[0];
    reply = `¡Hola ${nameTag}! 👋 Con gusto, ${topProd.nombre} tiene un precio de Q${topProd.precio} (por unidad). Se entrega completamente armado y listo para usar 🚚. Escribinos a nuestro WhatsApp al ${waPhone} para enviarte fotos y coordinar tu envío con pago contra entrega 😊`;
  } else if (qClean.includes('precio') || qClean.includes('costo') || qClean.includes('cuanto') || qClean.includes('cuánto')) {
    reply = `¡Hola ${nameTag}! 👋 Nuestras mesitas de noche estándar tienen un precio de Q550 cada una (el par sale en Q1,100) y modelos especiales como One Night en Q1,000. Se entregan armadas 🚚. ¿Te gustaría ver fotos por WhatsApp? Escribinos al ${waPhone} 🙌`;
  } else if (qClean.includes('envio') || qClean.includes('envío') || qClean.includes('entrega') || qClean.includes('zona') || qClean.includes('departamento')) {
    reply = `¡Hola ${nameTag}! 👋 Contamos con envíos a toda Guatemala y opción de pago contra entrega 🚚. Escribinos a nuestro WhatsApp al ${waPhone} indicándonos tu zona o municipio para confirmarte disponibilidad y detalles 😊`;
  } else if (qClean.includes('medida') || qClean.includes('tama') || qClean.includes('dimension')) {
    reply = `¡Hola ${nameTag}! 👋 Con gusto te compartimos las medidas exactas y fotos detalladas. Escribinos a nuestro WhatsApp al ${waPhone} para enviarte la ficha técnica completa 🙌`;
  } else {
    reply = `¡Hola ${nameTag}! 👋 Con mucho gusto te apoyamos con información, precios y fotos. Escribinos a nuestro WhatsApp al ${waPhone} para atenderte de inmediato 🙌`;
  }

  return reply.trim();
}

// Configuración de Auto-Respuesta a comentarios
app.get('/api/comments/settings', async (req, res) => {
  try {
    const rows = await db.all("SELECT key, value FROM settings WHERE key IN ('bot_comments_enabled', 'comments_wa_phone', 'bot_comments_prompt')");
    const s = { bot_comments_enabled: '0', comments_wa_phone: '35154362', bot_comments_prompt: '' };
    rows.forEach(r => s[r.key] = r.value);
    res.json(s);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/comments/settings', async (req, res) => {
  try {
    const { bot_comments_enabled, comments_wa_phone, bot_comments_prompt } = req.body;
    if (bot_comments_enabled !== undefined) await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('bot_comments_enabled', ?)", String(bot_comments_enabled));
    if (comments_wa_phone !== undefined) await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('comments_wa_phone', ?)", String(comments_wa_phone));
    if (bot_comments_prompt !== undefined) await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('bot_comments_prompt', ?)", String(bot_comments_prompt));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Listar comentarios (para el dashboard)
app.get('/api/comments', async (req, res) => {
  try {
    const { platform } = req.query;
    let query = "SELECT * FROM redes_comments";
    const params = [];
    if (platform && platform !== 'todos') {
      query += " WHERE platform = ?";
      params.push(platform);
    }
    query += " ORDER BY id DESC LIMIT 200";
    const rows = await db.all(query, ...params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Responder un comentario desde el dashboard (manual)
app.post('/api/comments/:id/reply', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Falta el mensaje' });
    const c = await db.get("SELECT * FROM redes_comments WHERE id = ?", req.params.id);
    if (!c) return res.status(404).json({ error: 'Comentario no encontrado' });
    await replyToComment(c.comment_id, message, c.platform || 'instagram');
    await db.run("UPDATE redes_comments SET bot_reply = ?, status = 'manual' WHERE id = ?", message, req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Generar / Enviar respuesta con IA para un comentario
app.post('/api/comments/:id/ai-reply', async (req, res) => {
  try {
    const c = await db.get("SELECT * FROM redes_comments WHERE id = ?", req.params.id);
    if (!c) return res.status(404).json({ error: 'Comentario no encontrado' });
    const generatedReply = await generateCommentReply(c.text, c.from_name, c.platform || 'instagram');

    if (req.body.preview) {
      return res.json({ success: true, reply: generatedReply });
    }

    await replyToComment(c.comment_id, generatedReply, c.platform || 'instagram');
    await db.run("UPDATE redes_comments SET bot_reply = ?, status = 'respondido' WHERE id = ?", generatedReply, req.params.id);
    res.json({ success: true, reply: generatedReply });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Cambiar estado de un comentario (visto/resuelto)
app.post('/api/comments/:id/status', async (req, res) => {
  try {
    await db.run("UPDATE redes_comments SET status = ? WHERE id = ?", req.body.status || 'visto', req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Sincronizar comentarios desde Instagram y Facebook Page (pull)
app.post('/api/comments/sync', async (_req, res) => {
  try {
    const { token, igUserId, fbPageId } = await getMetaConfig();
    if (!token) return res.status(400).json({ error: 'No hay token de Meta configurado (META_PAGE_TOKEN).' });

    let nuevos = 0, total = 0, posts = 0;

    // 1. Sincronizar Instagram
    if (igUserId) {
      try {
        let selfUser = '';
        try {
          const u = await (await fetch(`${META_GRAPH}/${igUserId}?fields=username&access_token=${token}`)).json();
          selfUser = (u.username || '').toLowerCase();
        } catch (e) {}

        const mediaResp = await (await fetch(`${META_GRAPH}/${igUserId}/media?fields=id&limit=25&access_token=${token}`)).json();
        const media = mediaResp.data || [];
        posts += media.length;
        for (const m of media) {
          const cResp = await (await fetch(`${META_GRAPH}/${m.id}/comments?fields=id,text,username,timestamp,from&limit=50&access_token=${token}`)).json();
          for (const c of (cResp.data || [])) {
            total++;
            const uname = (c.username || '').toLowerCase();
            const fromId = c.from?.id || '';
            if ((selfUser && uname === selfUser) || (fromId && String(fromId) === String(igUserId))) continue;
            const delicado = comentarioEsDelicado(c.text) ? 1 : 0;
            const r = await db.run(
              "INSERT OR IGNORE INTO redes_comments (platform, comment_id, media_id, from_id, from_name, text, status, is_delicate, timestamp) VALUES ('instagram', ?, ?, ?, ?, ?, 'nuevo', ?, ?)",
              c.id, m.id, fromId, c.username || '', c.text || '', delicado, horaGuate()
            );
            if (r.changes) nuevos++;
          }
        }
      } catch (err) {
        console.error('Error sincronizando Instagram:', err.message);
      }
    }

    // 2. Sincronizar Facebook Page
    if (fbPageId) {
      try {
        const feedResp = await (await fetch(`${META_GRAPH}/${fbPageId}/feed?fields=id,message,comments{id,message,from,created_time}&limit=25&access_token=${token}`)).json();
        const feedPosts = feedResp.data || [];
        posts += feedPosts.length;
        for (const post of feedPosts) {
          const comments = post.comments?.data || [];
          for (const c of comments) {
            total++;
            const fromId = c.from?.id || '';
            if (fromId && String(fromId) === String(fbPageId)) continue;
            const delicado = comentarioEsDelicado(c.message) ? 1 : 0;
            const r = await db.run(
              "INSERT OR IGNORE INTO redes_comments (platform, comment_id, media_id, from_id, from_name, text, status, is_delicate, timestamp) VALUES ('facebook', ?, ?, ?, ?, ?, 'nuevo', ?, ?)",
              c.id, post.id, fromId, c.from?.name || 'Usuario Facebook', c.message || '', delicado, horaGuate()
            );
            if (r.changes) nuevos++;
          }
        }
      } catch (err) {
        console.error('Error sincronizando Facebook Feed:', err.message);
      }
    }

    res.json({ success: true, nuevos, revisados: total, posts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Endpoint para probar generación de respuesta a comentarios en vivo
app.post('/api/comments/test-reply', async (req, res) => {
  try {
    const { text, fromName, platform } = req.body;
    if (!text) return res.status(400).json({ error: 'Falta el texto a evaluar' });
    const reply = await generateCommentReply(text, fromName || 'Usuario Prueba', platform || 'instagram');
    res.json({ success: true, reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper para suscribir la Página de Facebook y cuenta de Instagram a la App Webhook de Meta
async function ensureMetaSubscribedApps() {
  try {
    const { token, igUserId, fbPageId } = await getMetaConfig();
    if (!token) {
      return { success: false, error: 'No hay META_PAGE_TOKEN configurado' };
    }

    const results = {};

    // 1. Suscribir Facebook Page
    if (fbPageId) {
      try {
        const pageSubUrl = `${META_GRAPH}/${fbPageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,feed,mention&access_token=${token}`;
        const pRes = await fetch(pageSubUrl, { method: 'POST' });
        const pData = await pRes.json().catch(() => ({}));
        results.facebookPage = pData;
        if (pRes.ok && pData.success) {
          console.log(`✅ [Meta] Página de Facebook ${fbPageId} suscrita con éxito a webhooks de mensajes`);
        } else {
          console.warn(`⚠️ [Meta] Advertencia suscripción Facebook Page:`, pData.error?.message || pData);
        }
      } catch (pe) {
        results.facebookPage = { error: pe.message };
      }
    }

    // 2. Suscribir Instagram Account
    if (igUserId) {
      try {
        const igSubUrl = `${META_GRAPH}/${igUserId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,comments,mentions,story_insights&access_token=${token}`;
        const igRes = await fetch(igSubUrl, { method: 'POST' });
        const igData = await igRes.json().catch(() => ({}));
        results.instagramAccount = igData;
        if (igRes.ok && igData.success) {
          console.log(`✅ [Meta] Cuenta de Instagram ${igUserId} suscrita con éxito a webhooks de mensajes`);
        } else {
          console.warn(`⚠️ [Meta] Advertencia suscripción Instagram:`, igData.error?.message || igData);
        }
      } catch (ige) {
        results.instagramAccount = { error: ige.message };
      }
    }

    return { success: true, results };
  } catch (err) {
    console.error('❌ Error en ensureMetaSubscribedApps:', err.message);
    return { success: false, error: err.message };
  }
}

// Endpoint para suscribir / activar webhooks de Meta bajo demanda
app.post('/api/meta/subscribe-page', async (_req, res) => {
  const result = await ensureMetaSubscribedApps();
  res.json(result);
});

// Endpoint para probar generación de respuesta a Mensajes Directos (DMs) en vivo
app.post('/api/meta/test-direct-message', async (req, res) => {
  try {
    const { text, platform } = req.body;
    if (!text) return res.status(400).json({ error: 'Falta el texto a evaluar' });
    const reply = await generateDirectMessageReply(text, null, platform || 'Instagram Direct');
    res.json({ success: true, reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── META PUBLISHER & CONTENT CALENDAR (Instagram & Facebook) ────────────────
async function publishToInstagram({ mediaUrl, caption, isVideo = false, postType = 'post' }) {
  const { token, igUserId } = await getMetaConfig();
  if (!token || !igUserId) throw new Error('Falta META_PAGE_TOKEN o IG_USER_ID');
  if (!mediaUrl) throw new Error('Instagram requiere una URL de imagen o video');
  if (postType === 'reel' && !isVideo) throw new Error('Un reel necesita un video (.mp4)');

  const cap = `caption=${encodeURIComponent(caption || '')}`;
  const media = isVideo ? `video_url=${encodeURIComponent(mediaUrl)}` : `image_url=${encodeURIComponent(mediaUrl)}`;
  // 1. Crear contenedor de media según el tipo elegido
  let containerUrl;
  if (postType === 'historia') {
    // Las historias NO llevan caption
    containerUrl = `${META_GRAPH}/${igUserId}/media?media_type=STORIES&${media}&access_token=${token}`;
  } else if (postType === 'reel' || (postType === 'post' && isVideo)) {
    // Un video en el feed va como REEL
    containerUrl = `${META_GRAPH}/${igUserId}/media?media_type=REELS&${media}&${cap}&access_token=${token}`;
  } else {
    containerUrl = `${META_GRAPH}/${igUserId}/media?${media}&${cap}&access_token=${token}`;
  }

  const cRes = await fetch(containerUrl, { method: 'POST' });
  const cData = await cRes.json();
  if (!cRes.ok || cData.error) throw new Error(`Error en IG Media Container: ${cData.error?.message || JSON.stringify(cData)}`);
  const creationId = cData.id;

  // Esperar a que Meta procese el contenedor
  await new Promise(r => setTimeout(r, isVideo ? 6000 : 2500));

  // 2. Publicar contenedor
  const pubUrl = `${META_GRAPH}/${igUserId}/media_publish?creation_id=${creationId}&access_token=${token}`;
  const pRes = await fetch(pubUrl, { method: 'POST' });
  const pData = await pRes.json();
  if (!pRes.ok || pData.error) throw new Error(`Error en IG Media Publish: ${pData.error?.message || JSON.stringify(pData)}`);

  return { success: true, id: pData.id, platform: 'instagram' };
}

async function publishToFacebook({ mediaUrl, caption, isVideo = false, postType = 'post' }) {
  const { token, fbPageId } = await getMetaConfig();
  if (!token || !fbPageId) throw new Error('Falta META_PAGE_TOKEN o FB_PAGE_ID');
  if (postType === 'historia') throw new Error('Las historias por ahora solo van a Instagram, no a Facebook.');

  let endpoint = '';
  if (isVideo && mediaUrl) {
    endpoint = `${META_GRAPH}/${fbPageId}/videos?file_url=${encodeURIComponent(mediaUrl)}&description=${encodeURIComponent(caption || '')}&access_token=${token}`;
  } else if (mediaUrl) {
    endpoint = `${META_GRAPH}/${fbPageId}/photos?url=${encodeURIComponent(mediaUrl)}&caption=${encodeURIComponent(caption || '')}&access_token=${token}`;
  } else {
    endpoint = `${META_GRAPH}/${fbPageId}/feed?message=${encodeURIComponent(caption || '')}&access_token=${token}`;
  }

  const res = await fetch(endpoint, { method: 'POST' });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`Error en FB Publish: ${data.error?.message || JSON.stringify(data)}`);

  return { success: true, id: data.id || data.post_id, platform: 'facebook' };
}

async function publishPostDirectly({ platform, mediaUrl, mediaType, caption, postType = 'post' }) {
  const isVideo = mediaType === 'video' || /\.(mp4|mov|webm|avi|m4v)(\?|$)/i.test(mediaUrl || '');
  const results = { instagram: null, facebook: null, errors: [] };

  if (platform === 'instagram' || platform === 'both') {
    try {
      results.instagram = await publishToInstagram({ mediaUrl, caption, isVideo, postType });
    } catch (e) {
      results.errors.push(`Instagram: ${e.message}`);
    }
  }

  if (platform === 'facebook' || platform === 'both') {
    try {
      results.facebook = await publishToFacebook({ mediaUrl, caption, isVideo, postType });
    } catch (e) {
      results.errors.push(`Facebook: ${e.message}`);
    }
  }

  return results;
}

// Endpoint para publicar al instante en Instagram y/o Facebook
app.post('/api/meta/publish', async (req, res) => {
  try {
    const { platform = 'both', mediaUrl, mediaType = 'image', caption, postType = 'post' } = req.body;
    if (!caption && !mediaUrl) return res.status(400).json({ error: 'Se requiere al menos texto o imagen' });

    const results = await publishPostDirectly({ platform, mediaUrl, mediaType, caption, postType });
    
    // Guardar registro en historial
    const time = horaGuate();
    const hasSuccess = results.instagram?.success || results.facebook?.success;
    const status = hasSuccess ? 'published' : 'failed';
    const errorMsg = results.errors.length > 0 ? results.errors.join(' | ') : null;

    const dbRes = await db.run(
      `INSERT INTO scheduled_posts (platform, post_type, media_type, media_url, caption, scheduled_time, status, published_at, post_id_ig, post_id_fb, error_msg)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      platform, postType, mediaType, mediaUrl || null, caption, time, status, time, results.instagram?.id || null, results.facebook?.id || null, errorMsg
    );

    res.json({
      success: hasSuccess,
      id: dbRes.lastID,
      results,
      status,
      errors: results.errors
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para programar una publicación con fecha y hora
app.post('/api/meta/schedule', async (req, res) => {
  try {
    const { platform = 'both', mediaUrl, mediaType = 'image', caption, scheduledTime, postType = 'post' } = req.body;
    if (!caption && !mediaUrl) return res.status(400).json({ error: 'Se requiere texto o imagen' });
    if (!scheduledTime) return res.status(400).json({ error: 'Se requiere fecha y hora programada (scheduledTime)' });

    // Normalizar scheduledTime a formato 'YYYY-MM-DD HH:mm'
    const cleanScheduledTime = scheduledTime.replace('T', ' ').trim();

    const result = await db.run(
      `INSERT INTO scheduled_posts (platform, post_type, media_type, media_url, caption, scheduled_time, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      platform, postType, mediaType, mediaUrl || null, caption, cleanScheduledTime
    );

    res.json({ success: true, id: result.lastID, scheduledTime: cleanScheduledTime });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar publicaciones programadas e historial
app.get('/api/meta/scheduled', async (_req, res) => {
  try {
    const rows = await db.all("SELECT * FROM scheduled_posts ORDER BY id DESC LIMIT 150");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Forzar publicación inmediata o reintentar post programado
app.post('/api/meta/scheduled/:id/publish-now', async (req, res) => {
  try {
    const post = await db.get("SELECT * FROM scheduled_posts WHERE id = ?", req.params.id);
    if (!post) return res.status(404).json({ error: 'Publicación no encontrada' });

    console.log(`🚀 [Manual Publish] Publicando post #${post.id} (${post.post_type || 'post'}) para ${post.platform}...`);
    const results = await publishPostDirectly({
      platform: post.platform,
      mediaUrl: post.media_url,
      mediaType: post.media_type,
      caption: post.caption,
      postType: post.post_type || 'post'
    });

    const hasSuccess = results.instagram?.success || results.facebook?.success;
    const status = hasSuccess ? 'published' : 'failed';
    const errorMsg = results.errors.length > 0 ? results.errors.join(' | ') : null;

    const time = horaGuate();
    await db.run(
      "UPDATE scheduled_posts SET status = ?, published_at = ?, post_id_ig = ?, post_id_fb = ?, error_msg = ? WHERE id = ?",
      status, time, results.instagram?.id || null, results.facebook?.id || null, errorMsg, post.id
    );

    res.json({
      success: hasSuccess,
      status,
      results,
      error_msg: errorMsg
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancelar o eliminar publicación programada
app.delete('/api/meta/scheduled/:id', async (req, res) => {
  try {
    await db.run("DELETE FROM scheduled_posts WHERE id = ?", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Worker en segundo plano que revisa y publica posts programados cada 20 segundos
setInterval(async () => {
  try {
    if (!db) return;
    const d = new Date();
    const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' }); // YYYY-MM-DD
    const timeStr = d.toLocaleTimeString('en-GB', { timeZone: 'America/Guatemala', hour12: false, hour: '2-digit', minute: '2-digit' }); // HH:mm
    const nowGuate = `${dateStr} ${timeStr}`;

    const pendingPosts = await db.all(
      "SELECT * FROM scheduled_posts WHERE status = 'pending' AND scheduled_time <= ?",
      nowGuate
    );

    for (const post of pendingPosts) {
      console.log(`⏰ [Scheduler] Ejecutando publicación #${post.id} (${post.post_type || 'post'}) programada para ${post.scheduled_time}...`);
      try {
        const results = await publishPostDirectly({
          platform: post.platform,
          mediaUrl: post.media_url,
          mediaType: post.media_type,
          caption: post.caption,
          postType: post.post_type || 'post'
        });
        const hasSuccess = results.instagram?.success || results.facebook?.success;
        const status = hasSuccess ? 'published' : 'failed';
        const errorMsg = results.errors.length > 0 ? results.errors.join(' | ') : null;

        await db.run(
          "UPDATE scheduled_posts SET status = ?, published_at = ?, post_id_ig = ?, post_id_fb = ?, error_msg = ? WHERE id = ?",
          status, `${nowGuate} (${horaGuate()})`, results.instagram?.id || null, results.facebook?.id || null, errorMsg, post.id
        );
        console.log(`✅ [Scheduler] Post #${post.id} completado con estado: ${status}`);
      } catch (err) {
        console.error(`❌ [Scheduler] Error en post #${post.id}:`, err.message);
        await db.run("UPDATE scheduled_posts SET status = 'failed', error_msg = ? WHERE id = ?", err.message, post.id);
      }
    }
  } catch (e) {
    // Silencioso si la BD aún está arrancando
  }
}, 20000);

// ─── WEB CHATBOT PARA WORDPRESS (onecontrol.shop) ────────────────────────────
app.post('/api/webchat/message', async (req, res) => {
  try {
    const { message, sessionId = 'web_' + Date.now(), visitorName, phone } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Mensaje requerido' });

    const qClean = message.trim();
    const time = horaGuate();

    // 1. Buscar o crear lead en CRM para este visitante web
    let lead = await db.get("SELECT id, nombre, botActive FROM leads WHERE whatsapp_id = ? OR phone = ?", sessionId, phone || sessionId);
    let leadId;
    if (lead) {
      leadId = lead.id;
    } else {
      const ins = await db.run(
        `INSERT INTO leads (nombre, phone, whatsapp_id, score, estado, origen, botActive, priority)
         VALUES (?, ?, ?, 60, 'Nuevo', 'Web Chat (onecontrol.shop)', 1, 'normal')`,
        visitorName || 'Visitante Web', phone || sessionId, sessionId
      );
      leadId = ins.lastID;
    }

    // 2. Guardar mensaje del visitante
    await saveSmartMessage(leadId, 'client', qClean, time);

    // 3. Generar respuesta con Catálogo RAG de Productos y Reglas de Entrenamiento
    const reply = await generateDirectMessageReply(qClean, leadId, 'Web Chat');

    // 4. Guardar respuesta del bot
    await saveSmartMessage(leadId, 'bot', reply.text, horaGuate(), reply.mediaUrl, reply.mediaType);

    // 5. Detectar pedido automáticamente
    await detectAndCreatePedidoFromMessage(leadId, phone || sessionId, visitorName || 'Visitante Web', qClean, reply.text, null);

    res.json({
      success: true,
      sessionId,
      leadId,
      reply: reply.text,
      mediaUrl: reply.mediaUrl
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Servir el Widget JS embebible para WordPress
app.get('/api/webchat/widget.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(join(__dirname, 'public/widget.js'));
});

// ─── ARCHIVOS / MEDIA (subir y copiar links, para campañas de Claude/Hermes) ──
app.post('/api/media/upload', productImagesUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Falta el archivo' });
    const url = `https://${req.get('host')}/uploads/${req.file.filename}`;
    const name = req.file.originalname || req.file.filename;
    const r = await db.run(
      "INSERT INTO media_files (name, url, mimetype, size) VALUES (?, ?, ?, ?)",
      name, url, req.file.mimetype || '', req.file.size || 0
    );
    res.json({ success: true, id: r.lastID, name, url, mimetype: req.file.mimetype, size: req.file.size });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/media/upload-base64', async (req, res) => {
  try {
    const { base64, filename = 'story_image.jpg' } = req.body || {};
    if (!base64) return res.status(400).json({ error: 'Falta base64' });
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer;
    let mimetype = 'image/jpeg';
    if (matches && matches.length === 3) {
      mimetype = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64, 'base64');
    }
    const ext = mimetype.includes('png') ? '.png' : '.jpg';
    const cleanName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${filename.replace(/\s+/g, '_')}${ext.startsWith('.') ? '' : '.'}${ext}`;
    const uploadsDir = join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filePath = join(uploadsDir, cleanName);
    fs.writeFileSync(filePath, buffer);
    const url = `https://${req.get('host')}/uploads/${cleanName}`;
    const r = await db.run(
      "INSERT INTO media_files (name, url, mimetype, size) VALUES (?, ?, ?, ?)",
      filename, url, mimetype, buffer.length
    );
    res.json({ success: true, id: r.lastID, name: filename, url, mimetype, size: buffer.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/media/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') return res.status(400).send('URL requerida');
    const response = await fetch(url);
    if (!response.ok) return res.status(response.status).send('Error al obtener la imagen');
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) {
    res.status(500).send(`Error proxy: ${err.message}`);
  }
});

app.get('/api/media', async (_req, res) => {
  try {
    const rows = await db.all("SELECT * FROM media_files ORDER BY id DESC LIMIT 300");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/media/:id', async (req, res) => {
  try {
    await db.run("DELETE FROM media_files WHERE id = ?", req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
  setup().then(async () => {
    console.log("🎊 Sistema de base de datos listo.");
    // Auto-suscribir webhooks de Meta (Facebook Page & Instagram Direct)
    try {
      await ensureMetaSubscribedApps();
    } catch(e) {}
  }).catch(err => {
    console.error("❌ ERROR CRÍTICO EN SETUP:", err);
  });
});

server.on('error', (err) => {
  console.error("❌ ERROR AL INICIAR SERVIDOR:", err);
  process.exit(1);
});

