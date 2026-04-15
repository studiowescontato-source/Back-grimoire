import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;
const SKILLS_DIR = path.join(__dirname, 'skills');

if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true });

// Multer: upload de .md para pasta skills/
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, SKILLS_DIR),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.md')) cb(null, true);
    else cb(new Error('Apenas arquivos .md são aceitos'));
  },
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// ─── Listar skills disponíveis ───────────────────────────────────────────────
app.get('/api/skills', (req, res) => {
  const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md'));
  const skills = files.map(f => {
    const content = fs.readFileSync(path.join(SKILLS_DIR, f), 'utf8');
    const nameMatch = content.match(/^#\s+(.+)/m);
    const descMatch = content.match(/^>\s*(.+)/m);
    return {
      filename: f,
      name: nameMatch ? nameMatch[1] : f.replace('.md', ''),
      description: descMatch ? descMatch[1] : 'Skill personalizada',
      size: content.length,
    };
  });
  res.json(skills);
});

// ─── Upload de skill ─────────────────────────────────────────────────────────
app.post('/api/skills/upload', upload.single('skill'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  res.json({ success: true, filename: req.file.filename });
});

// ─── Salvar skill colada como texto ──────────────────────────────────────────
app.post('/api/skills/save', (req, res) => {
  const { filename, content } = req.body;
  if (!filename || !content) return res.status(400).json({ error: 'filename e content são obrigatórios' });
  const safe = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/\.md$/, '') + '.md';
  fs.writeFileSync(path.join(SKILLS_DIR, safe), content, 'utf8');
  res.json({ success: true, filename: safe });
});

// ─── Ler conteúdo de uma skill ────────────────────────────────────────────────
app.get('/api/skills/:filename', (req, res) => {
  const filePath = path.join(SKILLS_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Skill não encontrada' });
  res.json({ content: fs.readFileSync(filePath, 'utf8') });
});

// ─── Deletar skill ────────────────────────────────────────────────────────────
app.delete('/api/skills/:filename', (req, res) => {
  const filePath = path.join(SKILLS_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Skill não encontrada' });
  fs.unlinkSync(filePath);
  res.json({ success: true });
});

// ─── Converte histórico para o formato Gemini ─────────────────────────────────
function toGeminiHistory(messages) {
  return messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

// ─── Chat com agente (Google Gemini — grátis) ─────────────────────────────────
app.post('/api/chat', async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor' });
  }

  const { messages, systemPrompt, skillFiles = [] } = req.body;

  if (!messages || !systemPrompt) {
    return res.status(400).json({ error: 'messages e systemPrompt são obrigatórios' });
  }

  // Injeta conteúdo das skills selecionadas no system prompt
  let fullSystem = systemPrompt;
  if (skillFiles.length > 0) {
    const skillBlocks = skillFiles.map(filename => {
      const filePath = path.join(SKILLS_DIR, filename);
      if (!fs.existsSync(filePath)) return null;
      const content = fs.readFileSync(filePath, 'utf8');
      return `\n\n---\n## SKILL ATIVA: ${filename}\n\n${content}`;
    }).filter(Boolean);

    if (skillBlocks.length > 0) {
      fullSystem += '\n\n# SKILLS E INSTRUÇÕES ATIVAS\n\nAs seguintes skills definem comportamento, estilo visual e regras específicas que você DEVE seguir nesta conversa:' + skillBlocks.join('');
    }
  }

  // Separa última mensagem do histórico
  const history = messages.slice(0, -1);
  const lastMessage = messages[messages.length - 1];

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: fullSystem }],
        },
        contents: [
          ...toGeminiHistory(history),
          { role: 'user', parts: [{ text: lastMessage.content }] },
        ],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.8,
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) return res.status(500).json({ error: 'Resposta vazia da API Gemini' });

    res.json({ reply, usage: data.usageMetadata });

  } catch (err) {
    res.status(500).json({ error: 'Falha ao contactar a API: ' + err.message });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'alive',
    model: 'gemini-2.0-flash',
    apiKey: GEMINI_API_KEY ? 'configurada' : 'AUSENTE',
    skills: fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md')).length,
  });
});

app.listen(PORT, () => {
  console.log(`\n⚔️  Grimoire Studio rodando em http://localhost:${PORT}`);
  console.log(`🤖 Modelo: gemini-2.0-flash (Google AI — grátis)`);
  console.log(`📜 Skills em: ${SKILLS_DIR}`);
  console.log(`🔑 API Key: ${GEMINI_API_KEY ? 'OK' : 'AUSENTE — defina GEMINI_API_KEY'}\n`);
});
