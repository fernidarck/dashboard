// MCP REMOTO de OneControl (montado dentro del dashboard, en /mcp).
// Permite conectar Claude (app de escritorio y teléfono) como CONECTOR por URL,
// igual que reach-crm-mcp. Da acceso de solo lectura al contexto de anuncios +
// una herramienta para registrar el gasto de cada anuncio (cerrar el ROI).
//
// URL del conector:  https://panel.onecontrol.shop/mcp/<ONECONTROL_MCP_KEY>
// La llave se configura con la variable de entorno ONECONTROL_MCP_KEY en EasyPanel.
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema, isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

const INSTR = `Herramientas de OneControl para crear y controlar la publicidad del negocio
(venta de productos por WhatsApp en Guatemala). Usá 'contexto_para_anuncio' antes de
redactar un anuncio: te da precio, qué se ha vendido, cómo convirtieron los anuncios
anteriores, de qué zonas compran y la voz real del cliente. 'reporte_publicidad' da el
ROI por anuncio (necesita que el gasto esté registrado con 'registrar_gasto_anuncio').`;

const TOOLS = [
  {
    name: 'catalogo',
    description: 'Lista los productos activos de OneControl (nombre, precio, categoría, stock).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'contexto_para_anuncio',
    description: 'Dado un producto (ej. "palos de trekking"), devuelve TODO el contexto del dashboard para un buen anuncio: info y precio, ventas que lleva, rendimiento de sus anuncios anteriores (leads→ventas→%), zonas que compran y la "voz del cliente" (mensajes reales, para el copy y anticipar objeciones).',
    inputSchema: { type: 'object', properties: { producto: { type: 'string', description: 'Producto o tema del anuncio.' } }, required: ['producto'], additionalProperties: false }
  },
  {
    name: 'rendimiento_anuncios',
    description: 'Rendimiento de TODOS los anuncios rastreados: leads, ventas y conversión (%) por anuncio, mapeado a su producto.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'reporte_publicidad',
    description: 'Reporte de control de publicidad: por cada anuncio su gasto registrado, leads, ventas, costo por lead y costo por venta, más los totales. Sirve para ver qué campaña da ganancia.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'registrar_gasto_anuncio',
    description: 'Registra (o actualiza) el GASTO de un anuncio para calcular su ROI. Pasá el ad_source_id del anuncio (el mismo que ves en rendimiento_anuncios) y el gasto total en quetzales. Usalo cuando leas el gasto desde Meta.',
    inputSchema: {
      type: 'object',
      properties: {
        ad_source_id: { type: 'string', description: 'ID del anuncio (ad_source_id).' },
        gasto: { type: 'number', description: 'Gasto total del anuncio en Q.' },
        campaign: { type: 'string', description: 'Nombre de la campaña (opcional).' },
        notas: { type: 'string', description: 'Nota opcional.' }
      },
      required: ['ad_source_id', 'gasto'], additionalProperties: false
    }
  }
];

export function mountAdsMcp(app, deps) {
  const { listCatalog, buildAdContext, adPerformanceRows, buildAdReport, upsertAdSpend } = deps;
  const MCP_KEY = process.env.ONECONTROL_MCP_KEY || '';
  if (!MCP_KEY) console.warn('⚠️  ONECONTROL_MCP_KEY no configurada → el conector /mcp queda ABIERTO. Configurala en EasyPanel.');

  async function handleTool(name, args = {}) {
    let result;
    if (name === 'catalogo') result = await listCatalog();
    else if (name === 'contexto_para_anuncio') result = await buildAdContext(args.producto);
    else if (name === 'rendimiento_anuncios') result = { ok: true, anuncios: await adPerformanceRows() };
    else if (name === 'reporte_publicidad') result = { ok: true, ...(await buildAdReport()) };
    else if (name === 'registrar_gasto_anuncio') result = await upsertAdSpend(args);
    else throw new Error('Herramienta desconocida: ' + name);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  function buildServer() {
    const server = new Server({ name: 'onecontrol-mcp', version: '1.0.0' }, { capabilities: { tools: {} }, instructions: INSTR });
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
    server.setRequestHandler(CallToolRequestSchema, async (req) => {
      try { return await handleTool(req.params.name, req.params.arguments || {}); }
      catch (e) { return { content: [{ type: 'text', text: 'Error: ' + e.message }], isError: true }; }
    });
    return server;
  }

  const transports = new Map();
  const cors = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id, mcp-protocol-version');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');
  };
  const authOk = (req) => !MCP_KEY || req.params.key === MCP_KEY || req.headers['x-onecontrol-key'] === MCP_KEY;

  const postHandler = async (req, res) => {
    cors(res);
    if (!authOk(req)) return res.status(401).json({ error: 'no autorizado' });
    try {
      const sid = req.headers['mcp-session-id'];
      let transport;
      if (sid && transports.has(sid)) {
        transport = transports.get(sid);
      } else if (!sid && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => transports.set(id, transport)
        });
        transport.onclose = () => { if (transport.sessionId) transports.delete(transport.sessionId); };
        await buildServer().connect(transport);
      } else {
        return res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: sesión inválida o falta initialize' }, id: null });
      }
      await transport.handleRequest(req, res, req.body);
    } catch (e) { if (!res.headersSent) res.status(500).json({ error: e.message }); }
  };
  const sessionHandler = async (req, res) => {
    cors(res);
    if (!authOk(req)) return res.status(401).end();
    const sid = req.headers['mcp-session-id'];
    if (!sid || !transports.has(sid)) return res.status(400).send('sesión inválida');
    await transports.get(sid).handleRequest(req, res);
  };

  for (const base of ['/mcp', '/mcp/:key']) {
    app.options(base, (_req, res) => { cors(res); res.sendStatus(200); });
    app.post(base, postHandler);
    app.get(base, sessionHandler);
    app.delete(base, sessionHandler);
  }
  console.log('🔌 MCP de publicidad montado en /mcp y /mcp/:key');
}
