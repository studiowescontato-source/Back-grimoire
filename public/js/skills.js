// skills.js — gerenciamento de skills/.md

window.SkillsManager = (() => {
  let allSkills = [];
  let activeSkills = new Set(); // filenames ativos

  async function loadSkills() {
    try {
      const res = await fetch('/api/skills');
      allSkills = await res.json();
      renderSkillsList();
      renderActiveBar();
      updateCounter();
    } catch (e) {
      console.error('Erro ao carregar skills:', e);
    }
  }

  function renderSkillsList() {
    const container = document.getElementById('skills-list');
    if (!container) return;

    if (allSkills.length === 0) {
      container.innerHTML = `<div class="empty-state">Nenhuma skill forjada ainda.<br>Faça upload de um .md ou cole o conteúdo.</div>`;
      return;
    }

    container.innerHTML = allSkills.map(skill => {
      const isActive = activeSkills.has(skill.filename);
      const kb = (skill.size / 1024).toFixed(1);
      return `
        <div class="skill-card ${isActive ? 'active-skill' : ''}" id="card-${CSS.escape(skill.filename)}">
          <div class="skill-info">
            <div class="skill-name">${escHtml(skill.name)}</div>
            <div class="skill-desc">${escHtml(skill.description)}</div>
            <div class="skill-meta">${escHtml(skill.filename)} — ${kb}kb</div>
          </div>
          <div class="skill-btns">
            <button class="skill-toggle ${isActive ? 'on' : ''}"
              onclick="SkillsManager.toggle('${escHtml(skill.filename)}')">
              ${isActive ? 'ON &#10003;' : 'OFF'}
            </button>
            <button class="skill-del" onclick="SkillsManager.del('${escHtml(skill.filename)}')">DEL</button>
          </div>
        </div>`;
    }).join('');
  }

  function renderActiveBar() {
    const bar = document.getElementById('active-skills-bar');
    if (!bar) return;
    if (activeSkills.size === 0) { bar.innerHTML = ''; return; }

    bar.innerHTML = [...activeSkills].map(f => {
      const skill = allSkills.find(s => s.filename === f);
      const name = skill ? skill.name : f;
      return `<div class="skill-chip">
        &#9670; ${escHtml(name)}
        <span class="skill-chip-remove" onclick="SkillsManager.toggle('${escHtml(f)}')" title="Remover">&#10005;</span>
      </div>`;
    }).join('');
  }

  function updateCounter() {
    const el = document.getElementById('active-skills-count');
    if (el) el.textContent = activeSkills.size;
  }

  function toggle(filename) {
    if (activeSkills.has(filename)) {
      activeSkills.delete(filename);
      addOmen(`Skill desativada: ${filename}`, 'warn');
    } else {
      activeSkills.add(filename);
      addOmen(`Skill ativa: ${filename}`, 'good');
    }
    renderSkillsList();
    renderActiveBar();
    updateCounter();
    addLog('SKILLS', `${filename} ${activeSkills.has(filename) ? 'ON' : 'OFF'}`);
  }

  async function del(filename) {
    if (!confirm(`Deletar a skill "${filename}"?`)) return;
    try {
      await fetch(`/api/skills/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      activeSkills.delete(filename);
      await loadSkills();
      addLog('SKILLS', `${filename} deletada`);
    } catch (e) {
      alert('Erro ao deletar: ' + e.message);
    }
  }

  async function uploadFile(file) {
    const fd = new FormData();
    fd.append('skill', file);
    try {
      const res = await fetch('/api/skills/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await loadSkills();
      addLog('SKILLS', `${data.filename} forjada`);
      addOmen(`Nova skill: ${data.filename}`, 'good');
    } catch (e) {
      alert('Erro no upload: ' + e.message);
    }
  }

  async function saveText(filename, content) {
    try {
      const res = await fetch('/api/skills/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await loadSkills();
      addLog('SKILLS', `${data.filename} gravada`);
      addOmen(`Skill criada: ${data.filename}`, 'good');
      return true;
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
      return false;
    }
  }

  function getActive() {
    return [...activeSkills];
  }

  return { loadSkills, toggle, del, uploadFile, saveText, getActive };
})();

// helpers globais usados por outros módulos
function escHtml(t) {
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addLog(who, action) {
  const panel = document.getElementById('log-panel');
  if (!panel) return;
  const now = new Date();
  const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const div = document.createElement('div');
  div.className = 'tome-log';
  div.innerHTML = `<span class="log-time">${t}</span> <span class="log-who">[${who}]</span> ${escHtml(action)}`;
  panel.appendChild(div);
  while (panel.children.length > 10) panel.removeChild(panel.children[0]);
}

function addOmen(text, type = '') {
  const panel = document.getElementById('omens-panel');
  if (!panel) return;
  const now = new Date();
  const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const cls = type === 'good' ? 'good-omen' : type === 'warn' ? 'warn-omen' : '';
  const div = document.createElement('div');
  div.className = `omen ${cls}`;
  div.innerHTML = `<div class="omen-txt">${escHtml(text)}</div><div class="omen-time">${t}</div>`;
  panel.insertBefore(div, panel.firstChild);
  while (panel.children.length > 5) panel.removeChild(panel.lastChild);
}
