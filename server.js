import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// Initialize SQLite DB
console.log("📦 Inicializando Base de Datos...");
const dbFile = join(__dirname, 'database.sqlite');
let db;

try {
  db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
      console.error("❌ ERROR CRÍTICO al abrir SQLite:", err.message);
    } else {
      console.log("✅ Conexión a SQLite exitosa");
    }
  });
} catch (error) {
  console.error("❌ EXCEPCIÓN al crear instancia de SQLite:", error);
}

console.log(`📂 Archivo de DB: ${dbFile}`);

if (db) {
  try {
    db.serialize(() => {
      // Create tables if they don't exist
      db.run(`CREATE TABLE IF NOT EXISTS leads (
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

      db.run(`CREATE TABLE IF NOT EXISTS agenda (
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

      db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER,
        sender TEXT,
        text TEXT,
        timestamp TEXT
      )`);

      // Insert mock data if empty
      db.get("SELECT COUNT(*) as count FROM leads", (err, row) => {
        if (row && row.count === 0) {
          const stmt = db.prepare("INSERT INTO leads (nombre, phone, email, score, estado, origen, time, botActive, motor, falla, zona) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
          stmt.run('Erik Manuel Taveras', '15613744309', 'eriktaveras@gmail.com', 20, 'Nuevo', 'WhatsApp', '10:30 AM', 1, 'N/A', 'N/A', 'N/A');
          stmt.run('Carlos Ruiz', '19362242209', 'Gasperic.r@gmail.com', 55, 'Interesado', 'Facebook Ads', '09:15 AM', 1, 'FAAC 740', 'No abre', 'Mixco');
          stmt.run('Luis Méndez', '+502 4433 1122', 'luis@construcciones.gt', 92, 'Calificado', 'Facebook Ads', 'Ayer', 1, 'Liftmaster', 'Mantenimiento', 'Zona 10');
          stmt.finalize();
        }
      });

      db.get("SELECT COUNT(*) as count FROM agenda", (err, row) => {
        if (row && row.count === 0) {
          const stmt = db.prepare("INSERT INTO agenda (fecha, hora, cliente, phone, servicio, duracion, estado, day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
          stmt.run('2026-05-12', '10:00 AM', 'Carlos Ruiz', '19362242209', 'Instalación Motor', '2 horas', 'Pendiente', 12);
          stmt.run('2026-05-13', '03:30 PM', 'Marta Estrada', '50244332211', 'Mantenimiento', '45 min', 'Confirmado', 13);
          stmt.finalize();
        }
      });
    });
  } catch (err) {
    console.error("❌ ERROR durante la inicialización de tablas:", err);
  }
}

// GET endpoints
app.get('/api/leads', (req, res) => {
  db.all(`
    SELECT leads.*, 
           (SELECT text FROM messages WHERE lead_id = leads.id ORDER BY id DESC LIMIT 1) as lastMessage 
    FROM leads ORDER BY leads.id DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // Parse boolean and JSON fields
    const parsedRows = rows.map(r => ({
      ...r, 
      botActive: !!r.botActive,
      captura: { motor: r.motor, falla: r.falla, zona: r.zona }
    }));
    res.json(parsedRows);
  });
});

app.get('/api/agenda', (req, res) => {
  db.all("SELECT * FROM agenda ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// WEBHOOK endpoint for n8n
app.post('/webhook/n8n', (req, res) => {
  const data = req.body;
  console.log("Recibido webhook de n8n:", data);
  
  // Basic validation
  if (!data.phone) {
    return res.status(400).json({ error: "Falta el campo 'phone'" });
  }

  // Si tiene etiqueta #PEDIDO_LISTO o #SOPORTE, etc, actualizar o crear lead
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

  db.get("SELECT id FROM leads WHERE phone = ?", [data.phone], (err, row) => {
    if (row) {
      // Update existing
      db.run(`UPDATE leads SET estado = ?, time = ?, botActive = ? WHERE id = ?`, 
        [estado, time, botActive, row.id], (updateErr) => {
          if (updateErr) console.error(updateErr);
          
          if (data.mensaje) {
             db.run("INSERT INTO messages (lead_id, sender, text, timestamp) VALUES (?, ?, ?, ?)", [row.id, 'client', data.mensaje, time]);
          }
          if (data.respuesta_bot) {
             db.run("INSERT INTO messages (lead_id, sender, text, timestamp) VALUES (?, ?, ?, ?)", [row.id, 'bot', data.respuesta_bot, time]);
          }

          res.json({ success: true, action: "updated" });
      });
    } else {
      // Insert new
      db.run(`INSERT INTO leads (nombre, phone, email, score, estado, origen, time, botActive, motor, falla, zona) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        [nombre, data.phone, email, score, estado, origen, time, botActive, motor, falla, zona], function(insertErr) {
          if (insertErr) console.error(insertErr);
          const newLeadId = this.lastID;
          
          if (data.mensaje) {
             db.run("INSERT INTO messages (lead_id, sender, text, timestamp) VALUES (?, ?, ?, ?)", [newLeadId, 'client', data.mensaje, time]);
          }
          if (data.respuesta_bot) {
             db.run("INSERT INTO messages (lead_id, sender, text, timestamp) VALUES (?, ?, ?, ?)", [newLeadId, 'bot', data.respuesta_bot, time]);
          }

          res.json({ success: true, action: "created" });
      });
    }
  });
});

app.get('/api/messages/:leadId', (req, res) => {
  const { leadId } = req.params;
  db.all("SELECT * FROM messages WHERE lead_id = ? ORDER BY id ASC", [leadId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Toggle Bot Endpoint
app.post('/api/bot/toggle', (req, res) => {
  const { leadId, enabled } = req.body;
  db.run("UPDATE leads SET botActive = ? WHERE id = ?", [enabled ? 1 : 0, leadId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Send Message Endpoint (Dashboard -> n8n -> YCloud)
app.post('/api/messages/send', (req, res) => {
  const { leadId, text } = req.body;
  const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

  // Primero obtenemos el telefono del lead
  db.get("SELECT phone FROM leads WHERE id = ?", [leadId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Lead no encontrado" });

    const phone = row.phone;

    // Guardar en base de datos local como remitente "agent"
    db.run("INSERT INTO messages (lead_id, sender, text, timestamp) VALUES (?, ?, ?, ?)", [leadId, 'agent', text, time], function(insertErr) {
      if (insertErr) return res.status(500).json({ error: insertErr.message });
      
      const savedMessage = { id: this.lastID, lead_id: leadId, sender: 'agent', text, timestamp: time };

      // Opcional: Enviar el webhook a n8n para que dispare YCloud
      // Si la URL está configurada, hacemos el fetch (no bloqueamos la respuesta al frontend)
      if (N8N_OUTBOUND_WEBHOOK) {
        fetch(N8N_OUTBOUND_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, text })
        }).catch(err => console.error("Error enviando a n8n:", err));
      }

      res.json({ success: true, message: savedMessage });
    });
  });
});

// Serve React App in production
app.use(express.static(join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Backend del Dashboard escuchando en http://localhost:${port}`);
});