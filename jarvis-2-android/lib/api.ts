import * as SecureStore from 'expo-secure-store';

const API_URL_KEY = 'jarvis_api_url';
const API_TOKEN_KEY = 'jarvis_api_token';
const DEFAULT_API_URL = 'http://10.0.2.2:8787';

export type Health = {
  status: string;
  service?: string;
  version?: string;
  database?: string;
  ai?: string;
};

export async function getApiUrl(): Promise<string> {
  return (await SecureStore.getItemAsync(API_URL_KEY)) || DEFAULT_API_URL;
}

export async function setApiUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(API_URL_KEY, url.trim().replace(/\/$/, ''));
}

export async function setApiToken(token: string): Promise<void> {
  if (token) await SecureStore.setItemAsync(API_TOKEN_KEY, token.trim());
  else await SecureStore.deleteItemAsync(API_TOKEN_KEY);
}

async function request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const base = await getApiUrl();
  const token = await SecureStore.getItemAsync(API_TOKEN_KEY);
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  if (!response.ok) {
    let detail = '';
    try { detail = String((await response.json())?.error || ''); } catch { /* ignore */ }
    throw new Error(`API ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<Health>('/api/health'),
  agents: () => request('/api/agents'),
  tasks: () => request('/api/tasks'),
  approvals: () => request('/api/approvals'),
  memory: () => request('/api/memory'),
  automations: () => request('/api/automations'),
  chat: (text: string, history: Array<{ role: string; content: string }> = []) =>
    request('/api/chat', { method: 'POST', body: JSON.stringify({ text, history }) }),
  createTask: (title: string, priority = 'medium') =>
    request('/api/tasks', { method: 'POST', body: JSON.stringify({ title, priority }) }),
  remember: (text: string) =>
    request('/api/memory', { method: 'POST', body: JSON.stringify({ text }) }),
  createAutomation: (name: string, agent: string, schedule: string) =>
    request('/api/automations', { method: 'POST', body: JSON.stringify({ name, agent, schedule }) }),
  updateAutomation: (id: string, patch: Record<string, unknown>) =>
    request(`/api/automations/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  decideApproval: (id: string, status: 'approved' | 'rejected') =>
    request(`/api/approvals/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

export async function transcribe(uri: string): Promise<{ text?: string }> {
  const base = await getApiUrl();
  const token = await SecureStore.getItemAsync(API_TOKEN_KEY);
  const form = new FormData();
  form.append('file', { uri, name: 'voice.m4a', type: 'audio/m4a' } as unknown as Blob);
  const headers = new Headers();
  if (token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(`${base}/api/transcribe`, { method: 'POST', headers, body: form });
  if (!response.ok) {
    let detail = '';
    try { detail = String((await response.json())?.error || ''); } catch { /* ignore */ }
    throw new Error(`API ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  return response.json() as Promise<{ text?: string }>;
}
