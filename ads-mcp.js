// MCP REMOTO de OneControl (montado dentro del dashboard, en /mcp).
// Conector por URL para Claude (app de escritorio y teléfono), igual que reach-crm-mcp.
// Da acceso de solo lectura al contexto de anuncios + registrar el gasto (cerrar el ROI).
//
// Claude exige OAuth para los conectores remotos. Implementamos un OAuth mínimo,
// SIN login de usuario: en la pantalla de autorización se pide la LLAVE
// (ONECONTROL_MCP_KEY). Si coincide, se emite el token. Así queda protegido.
//
// URL del conector (SIN la llave):  https://panel.onecontrol.shop/mcp
import crypto from 'node:crypto';
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

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const s256 = (v) => b64url(crypto.createHash('sha256').update(v).digest());
const rand = (n = 32) => crypto.randomBytes(n).toString('hex');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function mountAdsMcp(app, deps) {
  const { listCatalog, buildAdContext, adPerformanceRows, buildAdReport, upsertAdSpend, oauthSaveToken, oauthHasToken } = deps;
  const MCP_KEY = process.env.ONECONTROL_MCP_KEY || '';
  if (!MCP_KEY) console.warn('⚠️  ONECONTROL_MCP_KEY no configurada → el conector /mcp queda ABIERTO. Configurala en EasyPanel.');

  const base = (req) => `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const cors = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id, mcp-protocol-version');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id, WWW-Authenticate');
  };

  // ── Herramientas ────────────────────────────────────────────────────────────
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

  // ── OAuth mínimo (sin login; se autoriza con la llave) ───────────────────────
  const clients = new Map();  // client_id -> meta
  const codes = new Map();    // code -> { code_challenge, redirect_uri, exp }

  async function tokenValido(req) {
    const h = req.headers['authorization'] || '';
    if (h.startsWith('Bearer ')) {
      const t = h.slice(7);
      if (MCP_KEY && t === MCP_KEY) return true;
      if (await oauthHasToken(t)) return true;
    }
    if (MCP_KEY && (req.params.key === MCP_KEY || req.headers['x-onecontrol-key'] === MCP_KEY)) return true;
    if (!MCP_KEY) return true; // sin llave configurada → abierto
    return false;
  }

  const prMeta = (req, res) => {
    cors(res);
    res.json({
      resource: `${base(req)}/mcp`,
      authorization_servers: [base(req)],
      scopes_supported: ['mcp'],
      bearer_methods_supported: ['header']
    });
  };
  const asMeta = (req, res) => {
    cors(res);
    const B = base(req);
    res.json({
      issuer: B,
      authorization_endpoint: `${B}/oauth/authorize`,
      token_endpoint: `${B}/oauth/token`,
      registration_endpoint: `${B}/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: ['mcp']
    });
  };
  app.get('/.well-known/oauth-protected-resource', prMeta);
  app.get('/.well-known/oauth-protected-resource/mcp', prMeta);
  app.get('/.well-known/oauth-authorization-server', asMeta);
  app.get('/.well-known/oauth-authorization-server/mcp', asMeta);
  app.get('/.well-known/openid-configuration', asMeta);

  // Registro dinámico de cliente (DCR)
  app.post('/oauth/register', (req, res) => {
    cors(res);
    const body = req.body || {};
    const client_id = 'oc_client_' + rand(8);
    clients.set(client_id, { redirect_uris: body.redirect_uris || [] });
    res.status(201).json({
      client_id,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: body.redirect_uris || [],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: 'mcp'
    });
  });

  // Pantalla de autorización: pide la LLAVE (no hay login de usuario)
  app.get('/oauth/authorize', (req, res) => {
    const { redirect_uri, state = '', code_challenge = '', code_challenge_method = '', step, k } = req.query;
    if (!redirect_uri) return res.status(400).send('Falta redirect_uri');

    if (step === 'approve') {
      if (MCP_KEY && k !== MCP_KEY) {
        return res.status(401).send(formHtml(req.query, 'Llave incorrecta. Probá de nuevo.'));
      }
      const code = rand(24);
      codes.set(code, { code_challenge, code_challenge_method, redirect_uri, exp: Date.now() + 10 * 60 * 1000 });
      const sep = String(redirect_uri).includes('?') ? '&' : '?';
      return res.redirect(`${redirect_uri}${sep}code=${code}&state=${encodeURIComponent(state)}`);
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(formHtml(req.query, ''));
  });

  function formHtml(q, errorMsg) {
    const hidden = ['client_id', 'redirect_uri', 'state', 'code_challenge', 'code_challenge_method', 'scope', 'response_type']
      .map(k => `<input type="hidden" name="${k}" value="${esc(q[k])}">`).join('');
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Conectar OneControl</title></head>
<body style="margin:0;font-family:system-ui,Segoe UI,Roboto,sans-serif;background:#f8fafc;color:#0f172a;display:flex;min-height:100vh;align-items:center;justify-content:center">
<form method="get" action="/oauth/authorize" style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;max-width:360px;width:90%;box-shadow:0 6px 24px rgba(0,0,0,.06)">
  ${hidden}<input type="hidden" name="step" value="approve">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
    <div style="width:34px;height:52px;border:6px solid #F7941E;border-radius:26px"></div>
    <div><div style="font-weight:800;font-size:18px">OneControl</div><div style="font-size:12px;color:#64748b">Conector de publicidad</div></div>
  </div>
  <p style="font-size:13px;color:#475569;margin:14px 0 6px">Ingresá la <b>llave de acceso</b> para conectar Claude con tu dashboard.</p>
  ${errorMsg ? `<p style="color:#e11d48;font-size:12px;font-weight:700;margin:0 0 8px">${esc(errorMsg)}</p>` : ''}
  <input name="k" type="password" placeholder="Llave de acceso" autofocus required
    style="width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:14px;margin-bottom:12px">
  <button type="submit" style="width:100%;padding:11px;background:#0f172a;color:#fff;border:0;border-radius:10px;font-weight:800;font-size:14px;cursor:pointer">Conectar</button>
</form></body></html>`;
  }

  // Intercambio de code por token
  app.post('/oauth/token', async (req, res) => {
    cors(res);
    res.setHeader('Cache-Control', 'no-store');
    const b = req.body || {};
    if (b.grant_type !== 'authorization_code') return res.status(400).json({ error: 'unsupported_grant_type' });
    const rec = codes.get(b.code);
    if (!rec || rec.exp < Date.now()) return res.status(400).json({ error: 'invalid_grant' });
    if (rec.code_challenge) {
      if (!b.code_verifier || s256(b.code_verifier) !== rec.code_challenge) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE' });
      }
    }
    codes.delete(b.code);
    const access_token = 'oct_' + rand(32);
    await oauthSaveToken(access_token);
    res.json({ access_token, token_type: 'Bearer', expires_in: 31536000, scope: 'mcp' });
  });

  // ── Endpoint MCP (Streamable HTTP) ───────────────────────────────────────────
  const transports = new Map();
  const unauthorized = (req, res) => {
    cors(res);
    res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${base(req)}/.well-known/oauth-protected-resource"`);
    return res.status(401).json({ error: 'no autorizado' });
  };

  const postHandler = async (req, res) => {
    if (!(await tokenValido(req))) return unauthorized(req, res);
    cors(res);
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
    if (!(await tokenValido(req))) return unauthorized(req, res);
    cors(res);
    const sid = req.headers['mcp-session-id'];
    if (!sid || !transports.has(sid)) return res.status(400).send('sesión inválida');
    await transports.get(sid).handleRequest(req, res);
  };

  for (const route of ['/mcp', '/mcp/:key']) {
    app.options(route, (_req, res) => { cors(res); res.sendStatus(200); });
    app.post(route, postHandler);
    app.get(route, sessionHandler);
    app.delete(route, sessionHandler);
  }
  console.log('🔌 MCP de publicidad montado en /mcp (+ OAuth)');
}
