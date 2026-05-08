const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const regex = /\/\/ ─── RAG: BÚSQUEDA SEMÁNTICA POR KEYWORDS ────────────────────────────────────[\s\S]+?\/\/ Mantener \/api\/rag\/query como alias para compatibilidad/;

const newCode = `// ─── RAG: BÚSQUEDA SEMÁNTICA O CONTEXTO GLOBAL ────────────────────────────────────
// GET /api/rag/context?q=texto_del_cliente&maxChars=2500
app.get('/api/rag/context', async (req, res) => {
  try {
    const { maxChars = 2500 } = req.query;
    
    // Cargar todos los documentos
    const docs = await db.all("SELECT name, category, content FROM documents ORDER BY timestamp DESC");
    
    let context = "";
    const sources = [];
    
    if (docs.length > 0) {
      docs.forEach(d => {
        context += "--- " + d.name + " (" + (d.category || "General") + ") ---\\n" + d.content + "\\n\\n";
        sources.push(d.name);
      });
    }

    // Incluir catálogo de productos siempre en esta ruta para que n8n no pierda los productos
    const prods = await db.all("SELECT * FROM products WHERE activo = 1 ORDER BY categoria, nombre");
    if (prods.length > 0) {
      let prodContext = "\\n\\nCATÁLOGO DE PRODUCTOS:\\n";
      for (const p of prods) {
        prodContext += "• " + p.nombre;
        if (p.precio) prodContext += " — " + p.precio;
        if (p.stock) prodContext += " (" + p.stock + ")";
        if (p.descripcion) prodContext += "\\n  " + p.descripcion;
        prodContext += "\\n";
      }
      context += prodContext;
      sources.push("Catálogo de Productos");
    }

    if (context.length > maxChars) {
      context = context.substring(0, maxChars) + "...";
    }

    console.log("📚 RAG query full context → " + sources.length + " fuente(s)");
    res.json({ context: context.trim(), found: context.trim().length > 0, sources });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mantener /api/rag/query como alias para compatibilidad`;

code = code.replace(regex, newCode);
fs.writeFileSync('server.js', code);
console.log('Done!');
