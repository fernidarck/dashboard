(function() {
  if (window.__ONECONTROL_CHAT_INIT__) return;
  window.__ONECONTROL_CHAT_INIT__ = true;

  var currentScript = document.currentScript || Array.from(document.getElementsByTagName('script')).pop();
  var primaryColor = (currentScript && currentScript.getAttribute('data-color')) || '#FF6B00';
  var botName = (currentScript && currentScript.getAttribute('data-bot-name')) || 'Asistente OneControl';
  var waPhone = (currentScript && currentScript.getAttribute('data-whatsapp')) || '35154362';
  var welcomeMsg = (currentScript && currentScript.getAttribute('data-welcome')) || '¡Hola! 👋 Bienvenido a OneControl. ¿En qué te podemos asesorar hoy? Tenemos mesitas de noche modernas, cajones ocultos NFC y más.';
  var apiUrl = (currentScript && currentScript.src ? new URL(currentScript.src).origin : window.location.origin) + '/api/webchat/message';

  var sessionId = localStorage.getItem('oc_chat_session') || ('web_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
  localStorage.setItem('oc_chat_session', sessionId);

  var style = document.createElement('style');
  style.innerHTML = 
    '.oc-chat-btn { position: fixed; bottom: 24px; right: 24px; width: 60px; height: 60px; border-radius: 50%; background: ' + primaryColor + '; color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(255,107,0,0.4); cursor: pointer; z-index: 999999; transition: transform 0.2s, box-shadow 0.2s; border: none; outline: none; }' +
    '.oc-chat-btn:hover { transform: scale(1.08); box-shadow: 0 14px 30px rgba(255,107,0,0.5); }' +
    '.oc-chat-box { position: fixed; bottom: 95px; right: 24px; width: 360px; max-width: calc(100vw - 32px); height: 520px; max-height: calc(100vh - 120px); background: #ffffff; border-radius: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.18); display: none; flex-direction: column; overflow: hidden; z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; border: 1px solid rgba(0,0,0,0.08); }' +
    '.oc-chat-header { background: ' + primaryColor + '; color: #fff; padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; }' +
    '.oc-chat-header-title { font-weight: 800; font-size: 15px; margin: 0; }' +
    '.oc-chat-header-sub { font-size: 11px; opacity: 0.9; margin: 2px 0 0 0; }' +
    '.oc-chat-close { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; padding: 0 4px; }' +
    '.oc-chat-msgs { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; background: #f8fafc; }' +
    '.oc-msg { max-width: 82%; padding: 10px 14px; border-radius: 16px; font-size: 13px; line-height: 1.45; word-wrap: break-word; }' +
    '.oc-msg-bot { align-self: flex-start; background: #ffffff; color: #1e293b; border: 1px solid #e2e8f0; border-bottom-left-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.02); }' +
    '.oc-msg-user { align-self: flex-end; background: ' + primaryColor + '; color: #ffffff; border-bottom-right-radius: 4px; font-weight: 500; }' +
    '.oc-msg-img { width: 100%; max-height: 160px; object-fit: cover; border-radius: 12px; margin-top: 6px; display: block; }' +
    '.oc-chat-footer { padding: 12px 14px; background: #ffffff; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; align-items: center; }' +
    '.oc-chat-input { flex: 1; border: 1px solid #cbd5e1; border-radius: 20px; padding: 10px 16px; font-size: 13px; outline: none; }' +
    '.oc-chat-send { background: ' + primaryColor + '; color: #fff; border: none; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }' +
    '.oc-chat-wa { display: block; text-align: center; font-size: 11px; font-weight: 700; color: #16a34a; padding: 6px; background: #f0fdf4; border-top: 1px solid #dcfce7; text-decoration: none; }';
  document.head.appendChild(style);

  var container = document.createElement('div');
  container.innerHTML = 
    '<button class="oc-chat-btn" id="ocChatBtn" aria-label="Abrir chat">' +
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' +
    '</button>' +
    '<div class="oc-chat-box" id="ocChatBox">' +
      '<div class="oc-chat-header">' +
        '<div>' +
          '<div class="oc-chat-header-title">' + botName + '</div>' +
          '<div class="oc-chat-header-sub">🟢 En línea · Asesor Inteligente</div>' +
        '</div>' +
        '<button class="oc-chat-close" id="ocChatClose">&times;</button>' +
      '</div>' +
      '<a href="https://wa.me/502' + waPhone + '?text=Hola,%20vengo%20de%20la%20p%C3%A1gina%20onecontrol.shop" target="_blank" class="oc-chat-wa">' +
        '💬 ¿Preferís WhatsApp? Tocá aquí para abrir chat directo' +
      '</a>' +
      '<div class="oc-chat-msgs" id="ocChatMsgs">' +
        '<div class="oc-msg oc-msg-bot">' + welcomeMsg + '</div>' +
      '</div>' +
      '<div class="oc-chat-footer">' +
        '<input type="text" class="oc-chat-input" id="ocChatInput" placeholder="Escribe tu consulta..." />' +
        '<button class="oc-chat-send" id="ocChatSend">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>' +
        '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(container);

  var btn = document.getElementById('ocChatBtn');
  var box = document.getElementById('ocChatBox');
  var close = document.getElementById('ocChatClose');
  var msgs = document.getElementById('ocChatMsgs');
  var input = document.getElementById('ocChatInput');
  var send = document.getElementById('ocChatSend');

  var isOpen = false;
  function toggle() {
    isOpen = !isOpen;
    box.style.display = isOpen ? 'flex' : 'none';
    if (isOpen) input.focus();
  }

  btn.onclick = toggle;
  close.onclick = toggle;

  async function sendMsg() {
    var text = input.value.trim();
    if (!text) return;
    input.value = '';

    var uDiv = document.createElement('div');
    uDiv.className = 'oc-msg oc-msg-user';
    uDiv.innerText = text;
    msgs.appendChild(uDiv);
    msgs.scrollTop = msgs.scrollHeight;

    var lDiv = document.createElement('div');
    lDiv.className = 'oc-msg oc-msg-bot';
    lDiv.innerText = 'Escribiendo...';
    msgs.appendChild(lDiv);
    msgs.scrollTop = msgs.scrollHeight;

    try {
      var res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: sessionId })
      });
      var data = await res.json();
      lDiv.innerText = data.reply || 'Disculpa, ocurrió un error.';
      if (data.mediaUrl) {
        var img = document.createElement('img');
        img.src = data.mediaUrl;
        img.className = 'oc-msg-img';
        lDiv.appendChild(img);
      }
    } catch (e) {
      lDiv.innerText = 'Disculpa, ocurrió un error de conexión.';
    }
    msgs.scrollTop = msgs.scrollHeight;
  }

  send.onclick = sendMsg;
  input.onkeydown = function(e) { if (e.key === 'Enter') sendMsg(); };
})();
