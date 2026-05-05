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
  console.log("📦 Inicializando Base de Datos...");
  const dataDir = process.env.DATA_DIR || './data';

  if (!fs.existsSync(dataDir)) {
    console.log(`📂 Creando carpeta de datos en: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbFile = join(dataDir, 'database.sqlite');
  const isNew = !fs.existsSync(dbFile);

  if (isNew && fs.existsSync('./database.sqlite')) {
    console.log("🚚 Migrando base de datos del root a la carpeta de datos...");
    fs.copyFileSync('./database.sqlite', dbFile);
  }

  db = await open({
    filename: dbFile,
    driver: sqlite3.Database
  });

  console.log("✅ Conexión a SQLite establecida.");

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
    zona TEXT
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
    timestamp TEXT
  )`);

  await db.exec(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  const defaultPrompts = {
    'prompt_recepcionista': 'Eres el Agente Recepcionista de OneControl. Tu objetivo es saludar cordialmente, identificar la necesidad del cliente y derivarlo al departamento correcto o agendar una cita básica.',
    'prompt_ventas': 'Eres el Agente de Ventas de OneControl. Eres experto en portones eléctricos y motores. Tu objetivo es cerrar ventas, dar precios y convencer al cliente con beneficios técnicos.',
    'prompt_soporte': 'Eres el Agente de Soporte Técnico de OneControl. Ayudas a los clientes con fallas en sus motores o dudas de instalación de forma paciente y técnica.'
  };

  for (const [key, value] of Object.entries(defaultPrompts)) {
    const check = await db.get("SELECT value FROM settings WHERE key = ?", key);
    if (!check) {
      await db.run("INSERT INTO settings (key, value) VALUES (?, ?)", key, value);
    }
  }

  const leadCount = await db.get("SELECT COUNT(*) as count FROM leads");
  if (leadCount.count === 0) {
    await db.run("INSERT INTO leads (nombre, phone, email, score, estado, origen, time, botActive, motor, falla, zona) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
      'Erik Manuel Taveras', '15613744309', 'eriktaveras@gmail.com', 20, 'Nuevo', 'WhatsApp', '10:30 AM', 1, 'N/A', 'N/A', 'N/A');
    await db.run("INSERT INTO leads (nombre, phone, email, score, estado, origen, time, botActive, motor, falla, zona) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
      'Carlos Ruiz', '19362242209', 'Gasperic.r@gmail.com', 55, 'Interesado', 'Facebook Ads', '09:15 AM', 1, 'FAAC 740', 'No abre', 'Mixco');
    await db.run("INSERT INTO leads (nombre, phone, email, score, estado, origen, time, botActive, motor, falla, zona) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
      'Luis Méndez', '+502 4433 1122', 'luis@construcciones.gt', 92, 'Calificado', 'Facebook Ads', 'Ayer', 1, 'Liftmaster', 'Mantenimiento', 'Zona 10');

    await db.run("INSERT INTO messages (lead_id, sender, text, timestamp) VALUES (?, ?, ?, ?)", 2, 'client', 'Hola buenas, tengo un portón FAAC 740 que no abre', '09:15 AM');
    await db.run("INSERT INTO messages (lead_id, sender, text, timestamp) VALUES (?, ?, ?, ?)", 2, 'bot', 'Hola! Soy Eryum, asistente de OneControl. Entiendo que tu motor FAAC 740 no está funcionando. ¿Cuándo fue la última vez que funcionó correctamente?', '09:15 AM');
    await db.run("INSERT INTO messages (lead_id, sender, text, timestamp) VALUES (?, ?, ?, ?)", 2, 'client', 'Ayer en la noche funcionaba bien, hoy en la mañana ya no abrió', '09:16 AM');
  }

  console.log("✅ Base de datos lista");
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
  const botActive = data.bot_apagado ? 0 : 1;
  const motor = data.motor || "N/A";
  const falla = data.falla || "N/A";
  const zona = data.zona || "N/A";

  try {
    const existingLead = await db.get("SELECT id FROM leads WHERE phone = ?", data.phone);
    let leadId;

    if (existingLead) {
      await db.run("UPDATE leads SET estado = ?, time = ?, botActive = ? WHERE id = ?", estado, time, botActive, existingLead.id);
      leadId = existingLead.id;
    } else {
      const result = await db.run(`INSERT INTO leads (nombre, phone, email, score, estado, origen, botActive, motor, falla, zona) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        nombre, data.phone, email, score, estado, origen, botActive, motor, falla, zona);
      leadId = result.lastID;
    }

    const normalize = (t) => t ? String(t).replace(/\s+/g, ' ').trim().toLowerCase() : "";

    const saveSmartMessage = async (lId, sndr, txt, tm) => {
      if (!txt || txt === "undefined" || txt === "null" || String(txt).trim() === "" || txt === "N/A") return;
      const cleanTxt = String(txt).trim();
      const currentNormalized = normalize(cleanTxt);

      const recent = await db.all("SELECT text FROM messages WHERE lead_id = ? ORDER BY id DESC LIMIT 5", lId);
      if (recent.some(m => normalize(m.text) === currentNormalized)) {
        console.log(`🚫 DUPLICADO BLOQUEADO para lead ${lId}: ${cleanTxt.substring(0, 30)}...`);
        return;
      }

      console.log(`💾 Guardando mensaje (${sndr}) para lead ${lId}: ${cleanTxt.substring(0, 40)}...`);
      await db.run("INSERT INTO messages (lead_id, sender, text, timestamp) VALUES (?, ?, ?, ?)", lId, sndr, cleanTxt, tm);
    };

    const mensajePrincipal = data.mensaje || data.respuesta_cliente || data.mensaje_cliente || data.texto_cliente || data.client_message;
    const mensajeSecundario = data.respuesta_bot || data.texto_limpio || data.bot_response || data.output;
    const senderPrincipal = data.sender || 'client';

    console.log(`📩 Procesando Webhook - Lead ID: ${leadId}`);
    
    if (mensajePrincipal) {
      await saveSmartMessage(leadId, senderPrincipal, mensajePrincipal, time);
    }

    if (mensajeSecundario && normalize(mensajeSecundario) !== normalize(mensajePrincipal)) {
      await saveSmartMessage(leadId, 'bot', mensajeSecundario, time);
    }

    res.json({ success: true, action: existingLead ? "updated" : "created" });
  } catch (err) {
    console.error("❌ Error procesando webhook:", err);
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
    await db.run("UPDATE leads SET botActive = ? WHERE id = ?", enabled ? 1 : 0, leadId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    const rows = await db.all("SELECT id, name, category, timestamp FROM documents ORDER BY id DESC");
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

app.delete('/api/rag/documents/:id', async (req, res) => {
  try {
    await db.run("DELETE FROM documents WHERE id = ?", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rag/query', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ context: "" });
    const rows = await db.all("SELECT content FROM documents WHERE content LIKE ? LIMIT 3", `%${q}%`);
    const context = rows.map(r => r.content).join("\n\n---\n\n");
    res.json({ context });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(join(__dirname, 'dist')));
app.use((_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

setup().then(() => {
  app.listen(port, () => {
    console.log(`🚀 Backend del Dashboard escuchando en http://localhost:${port}`);
  });
});
