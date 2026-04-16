// app.js — bootstrap principal, wiring de UI

document.addEventListener('DOMContentLoaded', async () => {

  // ─── Render sidebar de agentes ──────────────────────────────────────────────
  const agentList = document.getElementById('agent-list');
  Object.entries(window.AGENTS).forEach(([key, ag], i) => {
    const dotClass = ag.status === 'alive' ? 'dot-alive' : ag.status === 'busy' ? 'dot-cast' : 'dot-rest';
    const chosen = i === 0 ? 'chosen' : '';
    agentList.innerHTML += `
      <div class="agent-row ${chosen}" id="row-${key}" onclick="selectAgentUI('${key}')">
        <canvas class="asp" id="sp-${key}" width="24" height="24"></canvas>
        <div class="ainfo">
          <div class="aname">${ag.name}</div>
          <div class="arole">${ag.role}</div>
        </div>
        <div class="adot ${dotClass}"></div>
      </div>`;
  });

  // ─── Render about agents ────────────────────────────────────────────────────
  const aboutContainer = document.getElementById('agents-about');
  Object.entries(window.AGENTS).forEach(([key, ag]) => {
    const card = document.createElement('div');
    card.className = 'agent-about-card';
    card.style.borderLeft = `3px solid ${ag.col}`;
    card.innerHTML = `
      <div class="agent-about-name" style="color:${ag.col}">${ag.name}</div>
      <div class="agent-about-desc">${ag.desc}</div>`;
    card.addEventListener('click', () => selectAgentUI(key));
    aboutContainer.appendChild(card);
  });

  // ─── Draw sprites ───────────────────────────────────────────────────────────
  window.drawAllSprites();

  // ─── Init chat ──────────────────────────────────────────────────────────────
  window.Chat.init();

  // ─── Tabs ───────────────────────────────────────────────────────────────────
  document.querySelectorAll('.scroll-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab;
      document.querySelectorAll('.scroll-tab').forEach(t => t.classList.remove('lit'));
      tab.classList.add('lit');
      document.querySelectorAll('.tab-panel').forEach(p => {
        p.style.display = 'none';
        p.classList.remove('active');
      });
      const target = document.getElementById('tab-' + name);
      if (target) {
        target.style.display = name === 'chat' ? 'flex' : 'block';
        target.classList.add('active');
      }
    });
  });

  // ─── Skills: upload ─────────────────────────────────────────────────────────
  document.getElementById('btn-upload-skill').addEventListener('click', () => {
    document.getElementById('file-input').click();
  });
  document.getElementById('file-input').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (file) {
      await window.SkillsManager.uploadFile(file);
      e.target.value = '';
    }
  });

  // ─── Skills: paste modal ─────────────────────────────────────────────────────
  const pasteModal = document.getElementById('paste-modal');
  document.getElementById('btn-paste-skill').addEventListener('click', () => {
    pasteModal.style.display = pasteModal.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('btn-cancel-skill').addEventListener('click', () => {
    pasteModal.style.display = 'none';
    document.getElementById('skill-name-in').value = '';
    document.getElementById('skill-content-in').value = '';
  });
  document.getElementById('btn-save-skill').addEventListener('click', async () => {
    const name = document.getElementById('skill-name-in').value.trim();
    const content = document.getElementById('skill-content-in').value.trim();
    if (!name || !content) { alert('Preencha nome e conteúdo'); return; }
    const ok = await window.SkillsManager.saveText(name, content);
    if (ok) {
      pasteModal.style.display = 'none';
      document.getElementById('skill-name-in').value = '';
      document.getElementById('skill-content-in').value = '';
    }
  });

  // ─── Carregar skills do servidor ────────────────────────────────────────────
  await window.SkillsManager.loadSkills();

  // ─── Health check ───────────────────────────────────────────────────────────
  checkHealth();
  setInterval(checkHealth, 30000);
});

// ─── Global: selecionar agente ──────────────────────────────────────────────
window.selectAgentUI = function(type) {
  document.querySelectorAll('.agent-row').forEach(r => r.classList.remove('chosen'));
  const row = document.getElementById('row-' + type);
  if (row) row.classList.add('chosen');
  window.Chat.selectAgent(type);

  // volta para aba chat
  document.querySelectorAll('.scroll-tab').forEach(t => {
    t.classList.toggle('lit', t.dataset.tab === 'chat');
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.style.display = 'none';
    p.classList.remove('active');
  });
  const chatTab = document.getElementById('tab-chat');
  chatTab.style.display = 'flex';
  chatTab.classList.add('active');
};

// ─── Health check ───────────────────────────────────────────────────────────
async function checkHealth() {
  const serverEl = document.getElementById('server-status');
  const apiEl = document.getElementById('api-status');
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (serverEl) {
      serverEl.textContent = 'ONLINE';
      serverEl.className = 'sval alive';
    }
    if (apiEl) {
      const ok = data.apiKey === 'configurada';
      apiEl.textContent = ok ? 'OK' : 'AUSENTE';
      apiEl.className = 'sval ' + (ok ? 'alive' : 'dead');
    }
  } catch {
    if (serverEl) { serverEl.textContent = 'OFFLINE'; serverEl.className = 'sval dead'; }
    if (apiEl) { apiEl.textContent = '—'; apiEl.className = 'sval'; }
  }
}
