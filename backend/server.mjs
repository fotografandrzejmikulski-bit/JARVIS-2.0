import http from 'node:http';
import fs from 'node:fs/promises';
import Busboy from 'busboy';

const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.JARVIS_API_TOKEN || '';
const STATE_FILE = process.env.JARVIS_STATE_FILE || './jarvis-state.json';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-terra';
const FAST_MODEL = process.env.OPENAI_MODEL_FAST || 'gpt-5.6-luna';
const COMPLEX_MODEL = process.env.OPENAI_MODEL_COMPLEX || 'gpt-5.6-sol';
const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe';

const defaultState = { tasks: [], memory: [], approvals: [], automations: [], audit: [] };
async function readState() { try { return { ...defaultState, ...JSON.parse(await fs.readFile(STATE_FILE, 'utf8')) }; } catch { return structuredClone(defaultState); } }
async function writeState(state) { await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8'); }
function json(res, status, payload) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' }); res.end(JSON.stringify(payload)); }
async function body(req) { let raw = ''; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
function authorized(req) { return !TOKEN || req.headers.authorization === `Bearer ${TOKEN}`; }
function chooseModel(text) { if (/(research|analy[sz]e|compare|architecture|code|deep|plan|strategy)/i.test(text) || text.length > 900) return COMPLEX_MODEL; if (text.length < 100) return FAST_MODEL; return MODEL; }

async function openaiChat(text, history = []) {
  if (!OPENAI_KEY) return { content: 'OPENAI_API_KEY is not configured on the JARVIS backend.', model: null };
  const model = chooseModel(text);
  const input = [...history.slice(-12).map(x => ({ role: x.role === 'assistant' ? 'assistant' : 'user', content: String(x.content) })), { role: 'user', content: text }];
  const r = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, instructions: 'You are JARVIS 2.0, a precise personal AI assistant. Be concise, actionable, and explicit about uncertainty. Never claim an action was completed unless the backend actually completed it. Treat external side effects as approval-gated.', input }) });
  const data = await r.json(); if (!r.ok) throw new Error(data?.error?.message || `OpenAI ${r.status}`);
  return { content: data.output_text || 'No response.', model, responseId: data.id };
}

function parseUpload(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers }); let chunks = []; let filename = 'audio.m4a'; let mime = 'audio/mp4';
    bb.on('file', (_name, file, info) => { filename = info.filename || filename; mime = info.mimeType || mime; file.on('data', c => chunks.push(c)); });
    bb.on('error', reject); bb.on('finish', () => resolve({ buffer: Buffer.concat(chunks), filename, mime })); req.pipe(bb);
  });
}
async function transcribe(buffer, filename, mime) {
  if (!OPENAI_KEY) throw new Error('OPENAI_API_KEY is not configured');
  const form = new FormData(); form.append('file', new Blob([buffer], { type: mime }), filename); form.append('model', TRANSCRIBE_MODEL); form.append('response_format', 'json');
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${OPENAI_KEY}` }, body: form });
  const data = await r.json(); if (!r.ok) throw new Error(data?.error?.message || `OpenAI ${r.status}`); return data.text || '';
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (!authorized(req)) return json(res, 401, { error: 'unauthorized' });
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`); const state = await readState();
  try {
    if (url.pathname === '/api/health' && req.method === 'GET') return json(res, 200, { status: 'ok', service: 'JARVIS 2.0 backend', version: '2.0.1', database: process.env.DATABASE_URL ? 'configured' : 'not-configured', ai: OPENAI_KEY ? 'configured' : 'not-configured' });
    if (url.pathname === '/api/agents' && req.method === 'GET') return json(res, 200, { agents: [{ id: 'core', name: 'JARVIS Core', status: 'online' }, { id: 'research', name: 'Research', status: 'ready' }, { id: 'automation', name: 'Automation', status: 'ready' }] });
    if (url.pathname === '/api/tasks' && req.method === 'GET') return json(res, 200, state.tasks);
    if (url.pathname === '/api/memory' && req.method === 'GET') return json(res, 200, state.memory);
    if (url.pathname === '/api/approvals' && req.method === 'GET') return json(res, 200, state.approvals);
    if (url.pathname === '/api/automations' && req.method === 'GET') return json(res, 200, state.automations);
    if (url.pathname === '/api/tasks' && req.method === 'POST') { const d = await body(req); const item = { id: crypto.randomUUID(), title: String(d.title || 'Untitled task'), priority: String(d.priority || 'medium'), status: 'pending', createdAt: new Date().toISOString() }; state.tasks.push(item); await writeState(state); return json(res, 201, item); }
    if (url.pathname.startsWith('/api/tasks/') && req.method === 'PATCH') { const item = state.tasks.find(x => x.id === url.pathname.split('/').pop()); if (!item) return json(res, 404, { error: 'not_found' }); Object.assign(item, await body(req)); await writeState(state); return json(res, 200, item); }
    if (url.pathname === '/api/memory' && req.method === 'POST') { const d = await body(req); const content = String(d.content ?? d.text ?? '').trim(); if (!content) return json(res, 400, { error: 'content required' }); const item = { id: crypto.randomUUID(), content, createdAt: new Date().toISOString() }; state.memory.push(item); await writeState(state); return json(res, 201, item); }
    if (url.pathname === '/api/approvals' && req.method === 'POST') { const d = await body(req); const item = { id: crypto.randomUUID(), action: String(d.action || ''), status: 'pending', createdAt: new Date().toISOString() }; state.approvals.push(item); await writeState(state); return json(res, 201, item); }
    if (url.pathname.startsWith('/api/approvals/') && req.method === 'PATCH') { const item = state.approvals.find(x => x.id === url.pathname.split('/').pop()); if (!item) return json(res, 404, { error: 'not_found' }); const d = await body(req); if (!['approved', 'rejected'].includes(d.status)) return json(res, 400, { error: 'invalid status' }); item.status = d.status; item.updatedAt = new Date().toISOString(); await writeState(state); return json(res, 200, item); }
    if (url.pathname === '/api/automations' && req.method === 'POST') { const d = await body(req); const item = { id: crypto.randomUUID(), name: String(d.name || 'Automation'), agent: String(d.agent || 'core'), schedule: String(d.schedule || ''), enabled: true, createdAt: new Date().toISOString() }; state.automations.push(item); await writeState(state); return json(res, 201, item); }
    if (url.pathname.startsWith('/api/automations/') && req.method === 'PATCH') { const item = state.automations.find(x => x.id === url.pathname.split('/').pop()); if (!item) return json(res, 404, { error: 'not_found' }); Object.assign(item, await body(req)); await writeState(state); return json(res, 200, item); }
    if (url.pathname === '/api/chat' && req.method === 'POST') { const d = await body(req); const message = String(d.message ?? d.text ?? '').trim(); if (!message) return json(res, 400, { error: 'message required' }); const ai = await openaiChat(message, Array.isArray(d.history) ? d.history : []); const item = { id: crypto.randomUUID(), role: 'assistant', content: ai.content, model: ai.model, createdAt: new Date().toISOString() }; state.audit.push({ event: 'chat', message, responseId: ai.responseId || null, createdAt: item.createdAt }); await writeState(state); return json(res, 200, item); }
    if (url.pathname === '/api/transcribe' && req.method === 'POST') { const upload = await parseUpload(req); const text = await transcribe(upload.buffer, upload.filename, upload.mime); return json(res, 200, { text }); }
    if (url.pathname === '/api/audit' && req.method === 'GET') return json(res, 200, state.audit.slice(-200).reverse());
    if (url.pathname === '/api/integrations' && req.method === 'GET') return json(res, 200, { openai: Boolean(OPENAI_KEY), postgres: Boolean(process.env.DATABASE_URL), telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN), google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) });
    return json(res, 404, { error: 'not_found' });
  } catch (error) { console.error(error); return json(res, 500, { error: error instanceof Error ? error.message : 'internal_error' }); }
});
server.listen(PORT, () => console.log(`JARVIS backend listening on :${PORT}`));
