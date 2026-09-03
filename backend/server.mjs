import http from 'node:http';
import fs from 'node:fs/promises';

const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.JARVIS_API_TOKEN || '';
const STATE_FILE = process.env.JARVIS_STATE_FILE || './jarvis-state.json';

const defaultState = { tasks: [], memory: [], approvals: [], automations: [], audit: [] };

async function readState() {
  try { return { ...defaultState, ...JSON.parse(await fs.readFile(STATE_FILE, 'utf8')) }; }
  catch { return structuredClone(defaultState); }
}

async function writeState(state) {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' });
  res.end(JSON.stringify(body));
}

async function body(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function authorized(req) {
  if (!TOKEN) return true;
  return req.headers.authorization === `Bearer ${TOKEN}`;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (!authorized(req)) return json(res, 401, { error: 'unauthorized' });
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const state = await readState();

  try {
    if (url.pathname === '/api/health' && req.method === 'GET') {
      return json(res, 200, { status: 'ok', service: 'JARVIS 2.0 backend', version: '1.1.0', database: process.env.DATABASE_URL ? 'configured' : 'not-configured' });
    }
    if (url.pathname === '/api/agents' && req.method === 'GET') {
      return json(res, 200, { agents: [{ id: 'core', name: 'JARVIS Core', status: 'online' }, { id: 'research', name: 'Research', status: 'ready' }, { id: 'automation', name: 'Automation', status: 'ready' }] });
    }
    if (url.pathname === '/api/tasks' && req.method === 'GET') return json(res, 200, state.tasks);
    if (url.pathname === '/api/memory' && req.method === 'GET') return json(res, 200, state.memory);
    if (url.pathname === '/api/approvals' && req.method === 'GET') return json(res, 200, state.approvals);
    if (url.pathname === '/api/automations' && req.method === 'GET') return json(res, 200, state.automations);

    if (url.pathname === '/api/tasks' && req.method === 'POST') {
      const data = await body(req); const item = { id: crypto.randomUUID(), title: String(data.title || 'Untitled task'), status: 'pending', createdAt: new Date().toISOString() };
      state.tasks.push(item); await writeState(state); return json(res, 201, item);
    }
    if (url.pathname === '/api/memory' && req.method === 'POST') {
      const data = await body(req); const item = { id: crypto.randomUUID(), content: String(data.content || ''), createdAt: new Date().toISOString() };
      state.memory.push(item); await writeState(state); return json(res, 201, item);
    }
    if (url.pathname === '/api/chat' && req.method === 'POST') {
      const data = await body(req); const message = String(data.message || '').trim();
      if (!message) return json(res, 400, { error: 'message required' });
      const item = { id: crypto.randomUUID(), role: 'assistant', content: `JARVIS received: ${message}`, createdAt: new Date().toISOString() };
      state.audit.push({ event: 'chat', message, createdAt: item.createdAt }); await writeState(state);
      return json(res, 200, item);
    }
    return json(res, 404, { error: 'not_found' });
  } catch (error) {
    console.error(error); return json(res, 500, { error: 'internal_error' });
  }
});

server.listen(PORT, () => console.log(`JARVIS backend listening on :${PORT}`));
