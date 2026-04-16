// chat.js — lógica de chat com memória por agente e injeção de skills

window.Chat = (() => {
  let curAgent = 'motion';
  let histories = {};
  let msgCount = 0;
  let isLoading = false;

  Object.keys(window.AGENTS).forEach(k => { histories[k] = []; });

  function init() {
    document.getElementById('send-btn').addEventListener('click', cast);
    document.getElementById('chat-in').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); cast(); }
    });
    renderHistory();
    updateSidebar();
  }

  function selectAgent(type) {
    curAgent = type;
    renderHistory();
    updateSidebar();
    addLog(window.AGENTS[type].shortName, 'selecionado');
  }

  function updateSidebar() {
    const ag = window.AGENTS[curAgent];
    const el = document.getElementById('cur-agent-lbl');
    if (el) el.textContent = ag.shortName;
    const bar = document.getElementById('status-bar');
    if (bar) bar.textContent = '\u25C6 ' + ag.shortName + ' PRONTO';
  }

  function renderHistory() {
    const msgs = document.getElementById('chat-msgs');
    const ag = window.AGENTS[curAgent];
    msgs.innerHTML = '';

    if (histories[curAgent].length === 0) {
      msgs.innerHTML = `
        <div class="msg">
          <div class="ava" style="color:${ag.col}">${ag.ava}</div>
          <div>
            <div class="msender">${ag.name}</div>
            <div class="bubble">Saudações! Sou ${ag.name}. Em que posso servir a Ordem hoje?</div>
          </div>
        </div>`;
    } else {
      histories[curAgent].forEach(m => {
        if (m.role === 'user') {
          msgs.innerHTML += `
            <div class="msg mine">
              <div class="ava">\u25C6</div>
              <div><div class="msender">WESLEY</div><div class="bubble">${escHtml(m.content)}</div></div>
            </div>`;
        } else {
          msgs.innerHTML += `
            <div class="msg">
              <div class="ava" style="color:${ag.col}">${ag.ava}</div>
              <div><div class="msender">${ag.name}</div><div class="bubble">${escHtml(m.content)}</div></div>
            </div>`;
        }
      });
    }
    msgs.scrollTop = msgs.scrollHeight;
  }

  async function cast() {
    if (isLoading) return;
    const inp = document.getElementById('chat-in');
    const val = inp.value.trim();
    if (!val) return;
    inp.value = '';

    const ag = window.AGENTS[curAgent];
    const msgs = document.getElementById('chat-msgs');
    const errBanner = document.getElementById('err-banner');
    errBanner.style.display = 'none';

    msgs.innerHTML += `
      <div class="msg mine">
        <div class="ava">\u25C6</div>
        <div><div class="msender">WESLEY</div><div class="bubble">${escHtml(val)}</div></div>
      </div>`;

    const typingId = 'typing-' + Date.now();
    msgs.innerHTML += `
      <div class="msg" id="${typingId}">
        <div class="ava" style="color:${ag.col}">${ag.ava}</div>
        <div>
          <div class="msender">${ag.name}</div>
          <div class="typing-bubble">
            <div class="typing-dots"><span></span><span></span><span></span></div>
          </div>
        </div>
      </div>`;
    msgs.scrollTop = msgs.scrollHeight;

    histories[curAgent].push({ role: 'user', content: val });
    msgCount++;
    const cntEl = document.getElementById('msg-count');
    if (cntEl) cntEl.textContent = msgCount;

    setLoading(true);
    addLog(ag.shortName, 'conjurando...');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: histories[curAgent],
          systemPrompt: ag.system,
          skillFiles: window.SkillsManager.getActive(),
        }),
      });

      const data = await res.json();
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();

      if (data.error) throw new Error(data.error);

      histories[curAgent].push({ role: 'assistant', content: data.reply });

      msgs.innerHTML += `
        <div class="msg">
          <div class="ava" style="color:${ag.col}">${ag.ava}</div>
          <div><div class="msender">${ag.name}</div><div class="bubble">${escHtml(data.reply)}</div></div>
        </div>`;
      msgs.scrollTop = msgs.scrollHeight;

      addLog(ag.shortName, 'respondeu');
      addOmen(`${ag.shortName} respondeu`, 'good');

    } catch (err) {
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();
      histories[curAgent].pop();
      errBanner.textContent = 'Falha na conjuração: ' + err.message;
      errBanner.style.display = 'block';
      addLog('ERRO', err.message.slice(0, 40));
      addOmen('Falha: ' + err.message.slice(0, 30), 'warn');
    }

    setLoading(false);
  }

  function setLoading(on) {
    isLoading = on;
    const btn = document.getElementById('send-btn');
    const inp = document.getElementById('chat-in');
    const bar = document.getElementById('status-bar');
    if (btn) btn.disabled = on;
    if (inp) inp.disabled = on;
    if (bar) {
      bar.textContent = on ? '\u25C6 CONJURANDO...' : '\u25C6 AGUARDANDO';
      bar.style.color = on ? 'var(--ember2)' : 'var(--dim)';
    }
  }

  return { init, selectAgent };
})();
