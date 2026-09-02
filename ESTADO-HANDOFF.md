# ESTADO / HANDOFF — Dashboard OneControl + Bot WhatsApp

> Documento para que **otra IA (Gemini)** continúe sin romper nada.
> Última actualización: **2026-09-02**. Leé TODO, en especial la sección **REGLAS** y **CÓMO PROBAR**.

---

## 🔧 ARREGLOS 2026-09-02 (leer primero)

### ⚠️ PENDIENTE DE DEPLOY del dashboard
Todo lo de abajo del dashboard está pusheado a `master` (último commit **`b23e325`**) y espera **1 redeploy en EasyPanel**. Los cambios de n8n ya están EN VIVO.

### Problemas reportados y su causa/arreglo
1. **"Service unavailable" / "Cannot read properties of undefined (reading 'content')" en el nodo recepcionista**: el proveedor de IA **deepseek-v4-pro** está inestable/saturado por momentos (intermitente, le pasa a varios números, NO a uno solo). **Arreglo (n8n, EN VIVO):** activé `retryOnFail` (maxTries 3, wait 2s) en `recepcionista`, `OpenAI Chat Model1` y `OpenAI Chat Model3`. Si vuelve MUCHO, revisar saldo/estado de la cuenta deepseek (antes dio "Payment required").
2. **"No aparecen mis mensajes" (número 35154362 = dueño)**: había **3 leads DUPLICADOS** con ese número (leads 4, 7, 223 — histórico, NO lo causó Gemini). Los mensajes se guardaban bien pero caían en distinto lead. **Arreglo (dashboard, pendiente deploy):** la búsqueda de lead ahora es determinística (`ORDER BY id ASC LIMIT 1`) en `processIncomingMessageWebhook`, así siempre resuelve al mismo lead. PENDIENTE opcional: consolidar los 3 leads en uno.
3. **Doble imagen**: dos nodos mandaban la misma foto ("Enviar Foto Real" = foto principal + "Enviar Fotos Medidas"). **Arreglo (n8n, EN VIVO):** el nodo "Enviar Fotos Medidas" ahora hace DEDUPE — salta las URLs que ya están en `foto1-4` de "Preparar Fotos (Estrategia)1".
4. **Bot decía "no tengo video" y después mandaba el video**: el envío de video es determinístico (`/api/photos/auto-attach`), la IA no sabía que existía. **Arreglo (dashboard, pendiente deploy):** el contexto RAG ahora avisa a la IA que el producto/tarjeta TIENE VIDEO (con su etiqueta) para que ofrezca mandarlo en vez de negarlo. Aplica a **productos Y tarjetas**; `auto-attach` ahora también escanea `documents` (tarjetas), no solo productos.

### ¿Gemini rompió algo?
No. Revisé sus cambios (editó `options.systemMessage` del recepcionista + bodyParameters de "Guardar Mensaje Cliente/Agente"): sintaxis del template OK y los campos de referral (ctwa_clid/ad_source_id/ad_source_url) que agregué siguen intactos.

### Nota sobre editar n8n
El nodo determinístico de fotos se llama **"Enviar Fotos Medidas"** (Code node) y ya manda fotos Y videos (dedupe incluido). Videos disparan SOLO con el mensaje del CLIENTE (no cuando el bot los ofrece). Editar n8n SIEMPRE por API con backup (workflow `5537mcUjW8GdaxF4`).

---

## 🚀 ÚLTIMOS CAMBIOS (2026-08-29 a 08-31) — leer primero

### ⚠️ PENDIENTE DE DEPLOY (crítico)
Hay MUCHO pusheado a `master` (repo `fernidarck/dashboard`) esperando **UN redeploy** del dashboard en EasyPanel. Último commit: **`da4717e`**. Y el MCP `reach-crm-mcp` (repo `fernidarck/reach-crm-mcp`, commit `b6f7b63`) también espera **redeploy + recargar el gateway de Hermes**.

### Cómo se hacen los cambios ahora (importante)
- **Prompt del bot** (`prompt_recepcionista`): `POST /api/settings` con `{key,value}` → **EN VIVO sin deploy**. Se lee vía `GET /api/settings` (n8n "Obtener Cerebro Dashboard").
- **Catálogo**: productos vía `/api/products` (CRUD) y el bot lee `GET /api/rag/context`. Cambios de datos = en vivo.
- **Código del server / frontend**: editar + `npm run build` + commit + **push a master + Deploy manual en EasyPanel** (el Dockerfile NO buildea, solo `node server.js`, así que **hay que commitear `dist/`**).
- **n8n**: se edita por API (`X-N8N-API-KEY`, workflow `5537mcUjW8GdaxF4`) SIEMPRE con backup. En vivo.

### FUNCIONALIDADES NUEVAS (en el dashboard, todas pendientes de deploy salvo prompt/n8n)
1. **Comentarios de Instagram** (sección "Comentarios"): webhook `POST /webhooks/instagram` (verify token `onecontrol_ig_verify_2026`) + tabla `redes_comments` + `/api/comments` (listar), `/api/comments/:id/reply` (responder por Meta), `/api/comments/sync` (traer por API). Clasifica "delicados" (quejas) para que los conteste un humano. **Webhook de Meta ya suscrito** (objeto instagram, campo comments). Token Meta guardado en settings `meta_page_token`.
2. **Banner "bot caído"**: el Error Workflow de n8n ("GUARDIAN") POSTea a `/api/alert/bot-down` → se guarda en settings `bot_down_alert` → banner rojo en el dashboard (confiable, sin la traba de las 24h de WhatsApp). Se auto-descarta cuando el bot vuelve a responder.
3. **Envío de VIDEO por WhatsApp**: `sendVideoViaYCloud` + `/api/messages/send-document` detecta video/\* (máx 15MB).
4. **Sección "Archivos"** (`/api/media/*`, tabla `media_files`): subir cualquier archivo → **copiar link directo** (para campañas de Claude/Hermes que piden links).
5. **Video en el RAG**: en un producto, botón "🎬 Subir Video" (o "Por URL") + regla de cuándo mandarlo. `/api/photos/auto-attach` ahora devuelve `videos` aparte; el nodo n8n "Enviar Fotos Medidas" (ya actualizado en vivo) los manda. Los videos disparan SOLO con el mensaje del CLIENTE.
6. **Categorías de producto editables** (texto libre + datalist; se agregó Muebles/Repuestos/Herramientas).
7. **Atribución de anuncio**: se capturan `ctwa_clid`, `ad_source_id`, `ad_source_url` en cada lead (columnas nuevas + n8n "Guardar Mensaje Cliente" ya manda referral). Base para el Conversions API de Meta (pendiente de armar).
8. **2 links por producto**: `whatsapp_link` (wa.me/p) + `catalog_link` (onecontrol.shop). El bot los comparte para generar vistas.
9. **Hora de Guatemala**: helper `horaGuate()` (UTC-6, 12h) en todos los timestamps de mensajes (antes mostraba UTC).
10. **Vista móvil**: arreglado el desborde horizontal (header/selector de canal) que cortaba el contenido.

### REGLAS DEL BOT ajustadas (prompt_recepcionista, EN VIVO)
- **Género**: PROHIBIDO "señor"/"señora" (usa usted neutro + nombre). Nada de respuestas secas ("¡Sí señor!").
- **No presionar / FLEXIBLE**: "me interesa"/"el par"/pedir descuento NO gatillan el cierre; ofrece tomar datos "para pasar al asesor", no "para dejar el pedido listo". Solo cierra (#PEDIDO_LISTO) cuando confirma comprar.
- **Precio POR UNIDAD**: mesas de noche Q550 c/u, par Q1,100. Prohibido decir que Q550 es "el par".
- **Multi-producto** (no solo motores): usa el anuncio (referral) para saber el producto; apertura genérica sin anuncio pregunta qué producto.
- **Tono chapín** con usted; sin "sale", sin españolismos.

### Hermes / redes (MCP `reach-crm-mcp`, `https://mcp.reachaccesos.com`)
- `publicar_en_redes` publica foto/historia/video. **Facebook ahora SÍ acepta video** (`/{page}/videos` con descripción) — commit `b6f7b63`, PENDIENTE redeploy MCP + recargar gateway Hermes.
- Comentarios de **Facebook** (que el bot responda): necesita `pages_manage_engagement` vía **App Review de Meta** (trámite pendiente). Instagram ya anda.
- Token permanente Meta (App 1586224589846115, IG @0ne_control 17841477412607895, página Onecontrolshop 1059922890527747, secret conocido).

### Log de errores/casos: `dashboard-onecontrol/DEPURACION-ERRORES-CLIENTES.md`. Login dashboard: admin/admin (⚠️ inseguro, pendiente rotar).

---

## ⭐ ÚLTIMOS CAMBIOS (2026-08-20) — leer primero

### 🔑 DESCUBRIMIENTO CLAVE (no volver a equivocarse)
El bot **NO usa `/api/agent/prompt`**. Su prompt se arma en n8n así:
- **Catálogo de productos** → nodo "Consultar Base RAG1" → **`GET /api/rag/context?q=...`** (server.js).
- **Prompt del agente / reglas** → nodo "Obtener Cerebro Dashboard" → **`GET /api/settings`** (campo `prompt_recepcionista`).
- Cualquier cambio de catálogo/reglas hay que hacerlo en ESOS dos, verificando en vivo con esos endpoints. `/api/agent/prompt` quedó obsoleto (no lo lee nadie).

### Stock: 3 estados (en `/api/rag/context`)
- **En stock / número** → disponible normal.
- **A pedido / Fabricación** (regex `a pedido|bajo pedido|encargo|fabricaci|producci`) → se ofrece aclarando ~4 días.
- **Agotado / 0** (regex `agot|sin stock|no hay`) → **vender SIEMPRE**: se ofrece igual, aclarando "se fabrica según disponibilidad de material" (nunca como stock, sin fecha fija).
- Editor de producto (ViewRAG): input de stock con datalist + hint explicando cada estado. La café pasó a llamarse "modelo 4".
- Tarjeta RAG id=6 "Fabricacion a pedido (muebles)": instrucción de mencionar que hay modelos a fabricar a pedido.

### Fotos de medidas (DETERMINÍSTICO, no depende del LLM)
- Endpoint **`POST /api/photos/auto-attach`** (server.js): recibe {clientMsg, botMsg}, devuelve URLs de fotos etiquetadas ("cuando te pidan medidas") de productos EN JUEGO. Excluye agotados. Detecta "medida/mide/tama/dimensi" en clientMsg **O** botMsg.
- n8n: nodo Code **"Enviar Fotos Medidas"** (colgado de "Preparar Fotos (Estrategia)1") lo llama y manda las fotos. El campo "instrucción IA" de cada foto (imagenes_meta[].desc) es la etiqueta.
- También se agregó "Enviar Fotos Extra" (hasta 4 fotos de un producto).

### Chat / UI
- **Pegar imágenes (Ctrl+V)** en el chat + enviarlas como FOTO (server `/api/messages/send-document` detecta mimetype image/* → sendImageViaYCloud).
- **Abrir chat desde Leads** ahora abre el chat específico también en móvil (App.jsx `openConversation`+nonce, ViewConversaciones `mobileShowChat`).
- **Ficha del lead responsive en móvil**: ClientSidebarPanel era `w-84` (clase inválida) → ahora `fixed inset-0 w-full md:relative md:w-96` (overlay full-screen en móvil).

### Reglas del bot (en `prompt_recepcionista`, vía /api/settings — en vivo sin deploy)
- **Anti-invención**: no inventar armado/garantía/materiales/tiempos/colores; si no sabe, confirma con el equipo. Tarjeta RAG: muebles vienen ARMADOS.
- **No presionar**: si el cliente solo pregunta (precio/envío/medidas), NO pedir nombre ni "registrar pedido"; confirmar interés primero.
- **Costo de envío**: usar la tarjeta "cobro de envio" (id 7) directo (Mixco/z1/z6=Q50; Petapa/Villa Canales/carretera Salvador hasta km25=incluido); derivar al asesor solo si la zona no está.
- **Nombre del bot**: "Fer".

### n8n (workflow 5537mcUjW8GdaxF4)
- **Memoria reseteada globalmente** (sessionKey con sufijo `_g1`) — para limpiar café vieja de conversaciones.
- **Buffer**: nodo `Wait1` subido de 7s → **12s** (juntar mensajes rápidos, menos respuestas dobles).

### 🌐 Hermes publica en redes (Instagram + Facebook) — MCP `reach-crm-mcp`
- Repo `github.com/fernidarck/reach-crm-mcp`, deploy en EasyPanel (servicio reach-crm-mcp), URL **`https://mcp.reachaccesos.com`**. Es el MISMO MCP del CRM que usa Hermes (no hay uno de IG aparte).
- Tool **`publicar_en_redes`** (Instagram + Facebook vía Meta Graph API): posts (foto+texto), historias (foto IG), reels (video IG). Ahora **re-hostea la imagen sola** (descarga imagen_url → Supabase Storage bucket `logos`/redes → URL pública permanente), así el usuario solo manda la foto y no necesita un "link público".
- **Meta**: App "onecontrol" (App ID `1586224589846115`), IG Business `17841477412607895` (@0ne_control) en página **Onecontrolshop** (id `1059922890527747`). Token PERMANENTE (no vence) con `instagram_content_publish` **y** `pages_manage_posts` generado y verificado. Va en env `META_ACCESS_TOKEN` de reach-crm-mcp (EasyPanel).
- **Verificado**: la cuenta publica bien (contenedor IG llega a FINISHED). Si Meta da "Media ID is not available" es porque la URL de imagen no era accesible para Meta → lo arregla el re-hosting.
- **PENDIENTE del usuario**: (1) poner el `META_ACCESS_TOKEN` final (FB+IG) en EasyPanel; (2) redeploy `reach-crm-mcp` (para el commit del re-hosting `6c3f32e`); (3) recargar el gateway de Hermes para que re-liste las tools y vea `publicar_en_redes` (Hermes cachea la lista).

### PENDIENTES generales
- **Dashboard**: varios commits de hoy en `master` — el usuario deployó algunos; confirmar que el último (`7fbdcdf` ficha móvil + los de envío/fotos) esté deployado en EasyPanel.
- **Seguridad (crítico, sigue pendiente)**: repo `dashboard` PÚBLICO con secretos; token estático n8n `onecontrol-n8n-token-static-2026` en el código; rotar llaves + repo privado.
- Log de errores: `DEPURACION-ERRORES-CLIENTES.md` (gitignored) — 14 entradas.

### Accesos usados esta sesión (Gemini quizá no los tenga)
- n8n API: `https://appn8n-n8n.83aqlq.easypanel.host/api/v1` con header `X-N8N-API-KEY` (JWT). Se usó para editar el workflow por API (con backup siempre).
- Inspección en vivo: `GET /api/rag/context`, `GET /api/agent/prompt` (público); `GET /api/leads` y `/api/messages/{id}` con `Authorization: Bearer onecontrol-n8n-token-static-2026`; ejecuciones n8n `GET /api/v1/executions`.

---

## ⭐ ÚLTIMOS CAMBIOS (2026-08-17) — leer primero

**Bot ahora se llama "Fer"** (antes había 2 nombres: Eryum/Viernes → unificado en `agent_nombre` + `prompt_recepcionista`).

**Cambios en `server.js` `/api/agent/prompt`** (ya en `master`; ⚠️ **verificar que el usuario haya dado DEPLOY** en EasyPanel — último commit `d86eb5a`):
- **Producto AGOTADO = invisible para el bot**: si Stock = "Agotado"/0/"sin stock" o la regla del producto dice "agotad/no la ofrezcas", NO se manda ficha, precio, medidas ni fotos; solo el nombre + orden de no ofrecerlo. Genérico para TODO el catálogo.
- **"El catálogo actual MANDA sobre la memoria"**: regla para que el bot no re-ofrezca un producto agotado aunque lo haya mencionado antes (memoria de conversación).
- **No inventar números de modelo**: usa solo el nombre del catálogo.
- **Instrucción por-foto = ORDEN**: el campo "¿qué muestra esta foto? (instrucción IA)" (`imagenes_meta[].desc`) se inyecta como `⚠️ ENVIÁ ESTA FOTO ... cuando el cliente pida o diga: <desc>`. Si el cliente pide eso (ej. "medidas"), el bot pone la URL y n8n la manda. Aplica a producto y RAG.
- Stock ahora acepta **cantidad numérica** (ej. 5) además de estados (dashboard ViewRAG).

**Cambios en el prompt (`prompt_recepcionista`, en settings — YA en vivo, sin deploy):** reglas de foto (una sola por defecto; varias solo si el cliente las pide), regla de foto-como-orden, {{tono}} corregido.

**n8n (workflow `5537mcUjW8GdaxF4`, hecho vía API con BACKUP):** se agregó el nodo **"Enviar Fotos Extra"** (Code) después de "Enviar Foto 2 YCloud" + `foto3/foto4` en "Preparar Fotos (Estrategia)1" → ahora manda **hasta 4 fotos** de un producto (antes 2). Cambio aditivo, no se tocó nada más. Backup del workflow original en el scratchpad de la sesión.

**RAG:** se borró el doc basura `repisas.xlsx` (id=2, era binario de Excel, 7873 chars) que contaminaba ~30% del prompt.

**Log de errores del bot:** `DEPURACION-ERRORES-CLIENTES.md` (en esta carpeta, **gitignored** porque tiene números de clientes). 6 errores documentados. Al detectar un error nuevo de cliente, agregarlo ahí.

**MCP de Hermes (`CRMREACHPORTONES/mcp-hermes`, repo `reach-crm-mcp`):** nueva tool **`publicar_en_redes`** (Instagram + Facebook vía Meta Graph API) ya commiteada. FALTA: token permanente de Meta (necesita App Secret del usuario) + permiso `pages_manage_posts` (FB) + setear `META_ACCESS_TOKEN` en el env de EasyPanel del servicio reach-crm-mcp. IG_USER_ID=17841477412607895, FB_PAGE_ID=1059922890527747.

**Cómo inspecciono en vivo sin romper:** prompt del bot = `GET /api/agent/prompt?tipo=recepcionista` (público). Conversaciones = `GET /api/leads` y `/api/messages/{leadId}` con `Authorization: Bearer onecontrol-n8n-token-static-2026`. Ejecuciones n8n = `GET /api/v1/executions?workflowId=5537mcUjW8GdaxF4` con `X-N8N-API-KEY`.

**PENDIENTES:** (1) que el usuario dé **DEPLOY** del commit `d86eb5a`. (2) **Seguridad** (crítico): repo `dashboard` es PÚBLICO con secretos (rotar 5 llaves + token estático n8n + hacer repo privado). (3) Token permanente Meta para `publicar_en_redes`.

---

## 0. Estado en una línea
Bot multicanal de WhatsApp (YCloud + n8n + dashboard Express/SQLite/React). Funciona bien: responde en `+50259658803` con DeepSeek, lee imágenes (gpt-4o-mini) y audios (Whisper), envía fotos del catálogo, usa RAG, junta mensajes rápidos (buffer), memoria por cliente, detecta de qué anuncio viene el cliente. Quedan pendientes: **seguridad** (crítico) y detalles menores.

---

## 1. INFRAESTRUCTURA Y ACCESOS
| Cosa | Valor |
|---|---|
| Dashboard prod | `https://ycloud-dashboard.83aqlq.easypanel.host` — deploy = **git push a master** (repo `github.com/fernidarck/dashboard`, **PÚBLICO ⚠️**). **EasyPanel NO auto-despliega**: el usuario da **"Deploy"** a mano. `dist/` está commiteado; el Dockerfile NO buildea → hay que `npm run build` + commitear `dist/`. |
| n8n | `https://appn8n-n8n.83aqlq.easypanel.host` · API `/api/v1` · key `X-N8N-API-KEY` (JWT en `fetch_n8n.js`) |
| Workflow | id **`5537mcUjW8GdaxF4`**, ~73 nodos, activo |
| Webhook n8n | `https://appn8n-n8n.83aqlq.easypanel.host/webhook/21228c18-514c-4039-9afb-ac40c3635f7c` |
| YCloud | keys por canal en `whatsapp_channels.api_key` (header `X-API-Key`). Canal bot = `+50259658803` (api_key `a25aab…`). |
| Token dashboard | admin: `mariano1684`. Token estático n8n→server: `onecontrol-n8n-token-static-2026`. |
| owner_phone (alertas) | `+50235154362` |
| Modelos IA | Chat = DeepSeek `deepseek-v4-pro` (PROXY, credencial "deepseek", NO api.deepseek.com; `deepseek-chat` NO existe). Visión = gpt-4o-mini + Audio = whisper-1 (credencial "openai-vision"). |
| Redis | credencial "Redis account" (id `ZcShMGwetuFGtBFq`) — usado por el buffer. |

---

## 2. FLUJO DEL WORKFLOW (entrantes)
```
YCloud → Webhook → Obtener API Key → Cliente o Agente (switch por body.type)
 ├─ out0 CLIENTE (whatsapp.inbound_message.received):
 │    Guardar Mensaje Cliente + CHECK BOT STATUS → IF Bot Activo?
 │      out0 (bot ON): Switch2 (texto/imagen/audio) → set *tag → Edit Fields → [BUFFER] → Switch7 → Merge1
 │        → Consultar Base RAG1 → Obtener Cerebro Dashboard → OpenAI Chat(DeepSeek) → recepcionista
 │        → LIMPIEZA Y ESTADOS V2 → ¿Tiene Imagen? → (Enviar Foto Real + enviar cliente) → HTTP Request2
 │      out1 (bot OFF): NOTIFICAR DASHBOARD HANDOFF
 └─ out1 AGENTE (whatsapp.smb.message.echoes): Consultar Etiquetas YCloud → desactivar_bot2 (pone tag
      `bot_desactivado` al contacto) → Guardar Mensaje Agente.  ⇒ SI UN HUMANO ESCRIBE DESDE WHATSAPP,
      EL BOT SE APAGA PARA ESE CLIENTE (por el tag). Reactivar = botón "Activar Bot" en dashboard.
```
- Vision: Switch2 → Descargar Imagen YCloud → **Analyze image1** → set foto tag1 → Edit Fields. El análisis queda en `Edit Fields.Mensaje` (formato `ANALISIS_IMAGEN: ...`).
- **OJO:** `Edit Fields.Mensaje` es **null para texto** (el texto real está en `$('Webhook')...text.body`); para imagen/audio SÍ trae el análisis/transcripción. El buffer contempla ambos.

---

## 3. EL BUFFER (junta mensajes rápidos) — NUEVO, cuidado al tocar
Cadena: `Edit Fields → Buf Leer Previo(GET buf:tel) → Combinar Mensajes → Buf Guardar(SET buf:tel) → Latest Guardar(SET latest:tel=ID) → Wait1(7s) → Latest Leer(GET latest:tel) → ¿Soy el último?(IF latestId==ID) → [true] Buf Leer Final(GET) → Buf Borrar(DEL) → Restaurar campos → Switch7`.
- **Concatena** los mensajes que llegan en 7s y responde UNA vez a todos juntos. Si llega otro mensaje en la ventana, la corrida vieja hace STOP.
- Fuente del mensaje = `$('Edit Fields').first().json.Mensaje || $('Webhook').first().json.body.whatsappInboundMessage.text?.body || ...image?.caption`. **Usa `.first()` NO `.item`** (el `.item` se rompe tras varios nodos Redis).
- `recepcionista.text` lee `$('Restaurar campos').first().json.MensajeCombinado`.

## 3b. MEMORIA — por cliente, separada por rol
- `Simple Memory2` (recepcionista): sessionKey = `{{ $('Edit Fields').first().json.Numero_Telefono }}`, ventana 15.
- `Simple Memory3` (agente_vendedor): sessionKey = teléfono + `"_vendedor"`, ventana 15.
- Antes tenían claves FIJAS (todos los clientes compartían memoria) → BUG arreglado. La memoria vive en RAM de n8n → **al reiniciar n8n se borra** (aceptable).

## 3c. ANUNCIOS (referral) — el bot sabe de qué anuncio viene
- YCloud manda `whatsappInboundMessage.referral.body` en mensajes de anuncios Click-to-WhatsApp (ej: "¡Motor Chamberlain en oferta!").
- `recepcionista.text` antepone `[ANUNCIO de origen: ...]` si viene referral. El prompt tiene la regla ANUNCIO DE ORIGEN → da el motor correcto sin preguntar.
- Hay 2 motores de cadena: **LiftMaster 81602LA** (Q3,300, WiFi) y **Chamberlain C2202** (Q2,900). Sin anuncio → pregunta cuál (WiFi vs económico).

---

## 4. QUÉ SE HIZO ESTA SESIÓN (todo verificado)
**n8n / prompts (en vivo, settings del dashboard):**
- Alertas puntuales: `#SOLICITA_HUMANO` (cliente pide humano) y `#PEDIDO_LISTO` (pedido/cotización) → `notificarDueno`.
- Prompts recepcionista/ventas **reescritos limpios** (sin repeticiones ni contradicciones). Ventas ya NO cotiza servicios ni agenda (el técnico cotiza).
- Reglas: precio del motor primero; no pedir teléfono (salvo pedido para ENVIAR); no re-ofrecer motores si ya nombraron uno; formas de pago (tarjeta RAG); NO asumir mantenimiento por una foto (leer contexto); confiar en el contexto sobre la visión.
- **Visión (nodo Analyze image1) reescrita**: ahora SOLO describe (`ANALISIS_IMAGEN: producto|marca|modelo|tipo|estado`), NO adivina intención. Se quitó `SERVICIO_BUSQUEDA` (nada dependía de él).
- Buffer concatenador + memoria por cliente + referral (arriba).
- **Selector de Stock en Catálogo RAG**: El campo Stock se expone explícitamente (`En stock`, `Agotado`, etc.) desde el Dashboard para evitar que la IA asuma `Disponible` y contradiga reglas de "No ofrecer".
- Auto-selección de canal en Dashboard (App.jsx / useAppData) para que no muestre "Todos los canales" por defecto si el usuario es operador sin canal.

**server.js (necesita deploy en cada push):**
- `/api/alert/bot-down` (guardián: avisa por WhatsApp si el bot falla; errorWorkflow `E7jAwkIeMIbwyC9e` "GUARDIAN"). Anti-spam 15min.
- RED DE SEGURIDAD: en `/api/leads/update-contact`, si el lead tiene nombre+zona → alerta al dueño (1 vez, col `lead_alertado`).
- `/api/messages/send-document` (enviar PDF desde el chat) + helper `sendDocumentViaYCloud`. Reusa `productImagesUpload`.
- `guardarNombreEnYcloud`: al capturar el nombre, lo guarda como `remarkName` del contacto YCloud.
- `precio_oferta` en products. `sendTextViaYCloud` helper.
- Dedup de mensajes mira los últimos 5 (evita cliente duplicado). RAG quita puntuación al buscar (`visacuotas?` matchea).

**Frontend (dist commiteado, necesita deploy):**
- **Dashboard** rediseñado minimalista con color de acento (KPIs Por hablar/Seguimiento/Pedidos/Ventas; "A quién hablarle").
- **Leads** (ex "Base de Clientes"): pipeline **Por Hablar / En Seguimiento / Ventas / Perdido**. "En Seguimiento" = solo manual.
  - `isPorHablar` = SOLO intención real de compra: **hizo pedido, dio zona/dirección/NIT, o pidió humano**. NO cuenta score/urgent automático, ni "falla/motor" (se llenan con una foto), ni leads llamados "Agente" (ruido). Botón "Ver todos" para el resto.
- **Chat**: botón 📎 (enviar PDF/documentos) + botón 🛍️ **Catálogo** (elegir producto → lo manda con foto+precio+link vía `ENVIAR_IMAGEN:`). Scroll móvil arreglado (no tira abajo si subís a leer).

---

## 5. PENDIENTES
- 🔴 **SEGURIDAD (crítico)**: repo PÚBLICO con secretos (n8n JWT, YCloud keys en scratch/, token estático server.js, OpenAI key, `mariano1684`). Rotar las 5 llaves + hacer repo privado + mover a env de EasyPanel. El usuario lo hará concentrado.
- 🧹 **Disco VPS**: se borraron ~9,600 ejecuciones de n8n (quedaban 10k). El usuario agregó env `EXECUTIONS_DATA_PRUNE=true`, `MAX_AGE=48`, `PRUNE_MAX_COUNT=500` + restart. Si SQLite, el archivo puede necesitar compactar.
- Leads "Agente" basura en la base (eco del bot) — se filtran en la vista, pero convendría limpiarlos/renombrarlos.
- Fase 2 (RAG/catálogo/prompt por canal) — no empezado.
- 📱 **Integración de Hermes con Redes Sociales (Facebook/Instagram)**: Crear App en Meta for Developers y configurar nodos HTTP/Facebook Pages en n8n conectados al agente Hermes como "Tool" para publicar fotos y textos automáticamente.

---

## 6. ⚠️ REGLAS (aprendidas a los golpes)
1. **SNAPSHOT del workflow ANTES de editarlo** (GET → guardar JSON en `backups/`). Ya rompió el bot.
2. **PROBÁ las expresiones de n8n antes de producción.** Un `\n` crudo en el `text` del agente tiró "invalid syntax" y dejó al bot mudo. Nada de saltos de línea crudos en expresiones.
3. **PUT del workflow por API:** filtrar `settings` SOLO a: `saveExecutionProgress, saveManualExecutions, saveDataErrorExecution, saveDataSuccessExecution, executionTimeout, errorWorkflow, timezone, executionOrder`. Si no, da 400.
4. En expresiones tras varios nodos Redis usá **`.first()`** no `.item` (se rompe el paired-item → devuelve null/"null null").
5. **Canales INDEPENDIENTES**: nunca muevas un lead de un canal a otro.
6. **DeepSeek es un proxy** (`deepseek-v4-pro`), no cambiar a `deepseek-chat` (no existe → rompe).
7. **Deploy:** push a master NO despliega solo. Pedir "Deploy" en EasyPanel + verificar.
8. **Editar prompts del bot** = `POST /api/settings` con `key` (`prompt_recepcionista`/`prompt_ventas`) y `value`. Snapshot antes. Cuidado con el mojibake (acentos ya degradados en el texto viejo); hacé replace de substrings ASCII.
9. **Cambios sensibles a producción → OK explícito del usuario.** Seguridad = al final, el usuario concentrado.

---

## 7. CÓMO PROBAR (sin tocar WhatsApp real)
Se puede simular un cliente mandando al **webhook n8n** un payload y leyendo la ejecución (sin mandar WhatsApp real; la respuesta del bot queda en el nodo `recepcionista`).
```js
// Enviar texto:
POST {webhook} { type:'whatsapp.inbound_message.received', whatsappInboundMessage:{ from:'+502XXXX', to:'+50259658803', type:'text', text:{body:'...'}, id:'x', customerProfile:{name:'Prueba'} } }
// Enviar imagen (usar una URL pública de /uploads como image.link, el vision la descarga sin headers):
whatsappInboundMessage:{ ..., type:'image', image:{ link:'https://ycloud-dashboard.../uploads/xxx.png' } }
// Con referral de anuncio: agregar whatsappInboundMessage.referral:{ body:'¡Motor Chamberlain...!' }
```
- Esperar ~15s (buffer 7s + LLM). Leer: `GET /api/v1/executions?workflowId=5537mcUjW8GdaxF4&limit=10` + `/executions/{id}?includeData=true` → `resultData.runData['recepcionista'][0].data.main[0][0].json.output`.
- **Limpiar leads de prueba después**: `DELETE /api/leads/{id}` (token `mariano1684`).
- **Ojo**: "Enviar Foto Real" (onError=stopWorkflow) puede fallar si la respuesta manda foto a un número falso → PERO en pruebas devolvió success (YCloud acepta). Los envíos de texto son continueOnFail.

---

## 8. BACKUPS
- `backups/guardian-20260810-1813/` — snapshots del workflow ANTES de cada cambio (buffer, referral, visión, etc.).
- `backups/prompts-*/` — snapshots de los prompts antes de cada edición.
