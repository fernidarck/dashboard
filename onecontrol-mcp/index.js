#!/usr/bin/env node
// MCP local de OneControl: expone a Claude (Claude Code) el contexto REAL del dashboard
// para crear anuncios con cabeza. Solo lectura. Llama a la API del dashboard con el token.
//
// Config por variables de entorno (se pasan al registrar el MCP):
//   ONECONTROL_API    (default https://panel.onecontrol.shop)
//   ONECONTROL_TOKEN  (Bearer token del dashboard)
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const API = (process.env.ONECONTROL_API || "https://panel.onecontrol.shop").replace(/\/+$/, "");
const TOKEN = process.env.ONECONTROL_TOKEN || "";

async function apiGet(path) {
  const res = await fetch(`${API}${path}`, {
    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}: ${typeof data === 'string' ? data.slice(0, 200) : JSON.stringify(data).slice(0, 200)}`);
  return data;
}

const TOOLS = [
  {
    name: "catalogo",
    description: "Lista los productos activos del catálogo de OneControl (nombre, precio, categoría, stock). Útil para saber qué productos existen antes de hacer un anuncio.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "contexto_para_anuncio",
    description: "Dado un producto (ej. 'palos de trekking'), devuelve TODO el contexto del dashboard para crear un buen anuncio: info y precio del producto, cuántas ventas lleva, cómo convirtieron los anuncios anteriores de ese producto (leads→ventas→%), de qué zonas compran, y la 'voz del cliente' (mensajes reales que escriben sobre ese producto, para el copy y para anticipar objeciones).",
    inputSchema: {
      type: "object",
      properties: { producto: { type: "string", description: "Producto o tema del anuncio, ej. 'palos de trekking', 'mesa de noche', 'motor LiftMaster'." } },
      required: ["producto"],
      additionalProperties: false
    }
  },
  {
    name: "rendimiento_anuncios",
    description: "Rendimiento de TODOS los anuncios rastreados: por cada anuncio, cuántos leads trajo, cuántas ventas y la conversión (%), mapeado a su producto. Sirve para ver qué hemos probado y qué funciona antes de gastar más.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  }
];

const server = new Server(
  { name: "onecontrol-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    let result;
    if (name === "catalogo") {
      const prods = await apiGet("/api/products");
      const list = (Array.isArray(prods) ? prods : prods.products || [])
        .filter(p => p.activo === undefined || p.activo)
        .map(p => ({ nombre: p.nombre, precio: p.precio, categoria: p.categoria, stock: p.stock }));
      result = { total: list.length, productos: list };
    } else if (name === "contexto_para_anuncio") {
      const q = String(args.producto || "").trim();
      if (!q) throw new Error("Falta el argumento 'producto'.");
      result = await apiGet(`/api/insights/ad-context?q=${encodeURIComponent(q)}`);
    } else if (name === "rendimiento_anuncios") {
      result = await apiGet("/api/ads/performance");
    } else {
      throw new Error(`Herramienta desconocida: ${name}`);
    }
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("onecontrol-mcp listo (API:", API, ")");
