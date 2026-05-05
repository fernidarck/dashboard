import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
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

console.log("📦 Inicializando Base de Datos...");
// Asegurar que la carpeta de datos existe para el volumen persistente
const dataDir = join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const dbFile = join(dataDir, 'database.sqlite');
const db = new Database(dbFile);
console.log(`📂 Archivo de DB Persistente: ${dbFile}`);

db.exec(`CREATE TABLE IF NOT EXISTS leads (
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

db.exec(`CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  category TEXT,
  content TEXT,
  timestamp TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS agenda (
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

db.exec(`CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER,
  sender TEXT,
  text TEXT,
  timestamp TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
)`);

const defaultPrompts = {
  'prompt_recepcionista': 'Eres el Agente Recepcionista de OneControl. Tu objetivo es saludar cordialmente, identificar la necesidad del cliente y derivarlo al departamento correcto o agendar una cita básica.',
  'prompt_ventas': 'Eres el Agente de Ventas de OneControl. Eres experto en portones eléctricos y motores. Tu objetivo es cerrar ventas, dar precios y convencer al cliente con beneficios técnicos.',
  'prompt_soporte': 'Eres el Agente de Soporte Técnico de OneControl. Ayudas a los clientes con fallas en sus motores o dudas de instalación de forma paciente y técnica.'
};

for (const [key, value] of Object.entries(defaultPrompts)) {
  const check = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  if (!check) {
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(key, value);
  }
}

const leadCount = db.prepare("SELECT COUNT(*) as count FROM leads").get();
if (leadCount.count === 0) {
  const stmt = db.prepare("INSERT INTO leads (nombre, phone, email, score, estado, origen, time, botActive, motor, falla, zona) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  stmt.run('Erik Manuel Taveras', '15613744309', 'eriktaveras@gmail.com', 20, 'Nuevo', 'WhatsApp', '10:30 AM', 1, 'N/A', 'N/A', 'N/A');
  stmt.run('Carlos Ruiz', '19362242209', 'Gasperic.r@gmail.com', 55, 'Interesado', 'Facebook Ads', '09:15 AM', 1, 'FAAC 740', 'No abre', 'Mixco');
  stmt.run('Luis Méndez', '+502 4433 1122', 'luis@construcciones.gt', 92, 'Calificado', 'Facebook Ads', 'Ayer', 1, 'Liftmaster', 'Mantenimiento', 'Zona 10');
}

const agendaCount = db.prepare("SELECT COUNT(*) as count FROM agenda").get();
if (agendaCount.count === 0) {
  const stmt = db.prepare("INSERT INTO agenda (fecha, hora, cliente, phone, servicio, duracion, estado, day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  stmt.run('2026-05-12', '10:00 AM', 'Carlos Ruiz', '19362242209', 'Instalación Motor', '2 horas', 'Pendiente', 12);
  stmt.run('2026-05-13', '03:30 PM', 'Marta Estrada', '50244332211', 'Mantenimiento', '45 min', 'Confirmado', 13);
}

console.log("✅ Base de datos lista");

app.get('/api/leads', (_req, res) => {
  try {
    const rows = db.prepare(`
      SELECT leads.*,
             (SELECT text FROM messages WHERE lead_id = leads.id ORDER BY id DESC LIMIT 1) as lastMessage
      FROM leads ORDER BY leads.id DESC
    `).all();
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

app.get('/api/agenda', (_req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM agenda ORDER BY id DESC").all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/webhook/n8n', (req, res) => {
  const data = req.body;
  console.log("Recibido webhook de n8n:", data);

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
    const existingLead = db.prepare("SELECT id FROM leads WHERE phone = ?").get(data.phone);

    if (existingLead) {
      db.prepare("UPDATE leads SET estado = ?, time = ?, botActive = ? WHERE id = ?")
        .run(estado, time, botActive, existingLead.id);
      if (data.mensaje) {
        db.prepare("INSERT INTO messages (lead_id, sender, text, timestamp) VALUES (?, ?, ?, ?)")
          .run(existingLead.id, 'client', data.mensaje, time);
      }
      if (data.respuesta_bot) {
        db.prepare("INSERT INTO messages (lead_id, sender, text, timestamp) VALUES (?, ?, ?, ?)")
          .run(existingLead.id, 'bot', data.respuesta_bot, time);
      }
      res.json({ success: true, action: "updated" });
    } else {
      const result = db.prepare(`INSERT INTO leads (nombre, phone, email, score, estado, origen, time, botActive, motor, falla, zona) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(nombre, data.phone, email, score, estado, origen, time, botActive, motor, falla, zona);
      const newLeadId = result.lastInsertRowid;
      if (data.mensaje) {
        db.prepare("INSERT INTO messages (lead_id, sender, text, timestamp) VALUES (?, ?, ?, ?)")
          .run(newLeadId, 'client', data.mensaje, time);
      }
      if (data.respuesta_bot) {
        db.prepare("INSERT INTO messages (lead_id, sender, text, timestamp) VALUES (?, ?, ?, ?)")
          .run(newLeadId, 'bot', data.respuesta_bot, time);
      }
      res.json({ success: true, action: "created" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/messages/:leadId', (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM messages WHERE lead_id = ? ORDER BY id ASC").all(req.params.leadId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bot/toggle', (req, res) => {
  try {
    const { leadId, enabled } = req.body;
    db.prepare("UPDATE leads SET botActive = ? WHERE id = ?").run(enabled ? 1 : 0, leadId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings', (_req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM settings").all();
    const settings = {};
    rows.forEach(row => settings[row.key] = row.value);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) throw new Error("Key is required");
    console.log(`💾 Guardando ajuste: ${key}`);
    const stmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
    stmt.run(key, value || "");
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error en POST /api/settings:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages/send', async (req, res) => {
  try {
    const { leadId, text, sender, phone } = req.body;
    if (!leadId || !text) return res.status(400).json({ error: "Faltan datos" });

    // Si no viene sender, asumimos que es el humano desde el dashboard ('agent')
    const msgSender = sender || 'agent';
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    // 1. Guardar en BD
    const stmt = db.prepare("INSERT INTO messages (lead_id, sender, text, timestamp) VALUES (?, ?, ?, ?)");
    const info = stmt.run(leadId, msgSender, text, time);
    
    const savedMessage = { id: info.lastInsertRowid, lead_id: leadId, sender: msgSender, text, timestamp: time };

    // 2. Solo si es el HUMANO escribiendo en el dashboard, enviamos a n8n
    // Si el mensaje ya viene de n8n (sender = 'client' o 'agent' vía API), NO lo re-enviamos a n8n para evitar bucles.
    if (!sender && msgSender === 'agent' && N8N_OUTBOUND_WEBHOOK) {
      const targetPhone = phone || db.prepare("SELECT phone FROM leads WHERE id = ?").get(leadId)?.phone;
      
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
    console.error("❌ Error en /api/messages/send:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- RAG SYSTEM ---
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
const upload = multer({ dest: 'uploads/' });

app.get('/api/rag/documents', (_req, res) => {
  try {
    const rows = db.prepare("SELECT id, name, category, timestamp FROM documents ORDER BY id DESC").all();
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

    db.prepare("INSERT INTO documents (name, category, content, timestamp) VALUES (?, ?, ?, ?)")
      .run(name || req.file.originalname, category || 'General', content, new Date().toLocaleString());

    fs.unlinkSync(filePath); // Delete temp file
    res.json({ success: true });
  } catch (err) {
    console.error("❌ RAG Upload Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/rag/documents/:id', (req, res) => {
  try {
    db.prepare("DELETE FROM documents WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rag/query', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ context: "" });
    const rows = db.prepare("SELECT content FROM documents WHERE content LIKE ? LIMIT 3").all(`%${q}%`);
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

app.listen(port, () => {
  console.log(`🚀 Backend del Dashboard escuchando en http://localhost:${port}`);
});
