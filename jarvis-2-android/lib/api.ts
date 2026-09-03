import * as SecureStore from 'expo-secure-store';

const API_URL_KEY = 'jarvis_api_url';
const API_TOKEN_KEY = 'jarvis_api_token';
const DEFAULT_API_URL = 'http://10.0.2.2:8787';

export type Health = { status: string; service?: string; version?: string };

async function config() {
  const baseUrl = (await SecureStore.getItemAsync(API_URL_KEY)) || DEFAULT_API_URL;
  const token = await SecureStore.getItemAsync(API_TOKEN_KEY);
  return { baseUrl: baseUrl.replace(/\/$/, ''), token };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { baseUrl, token } = await config();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  if (!response.ok) throw new Error(`JARVIS API ${response.status}`);
  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<Health>('/api/health'),
  agents: () => request('/api/agents'),
  tasks: () => request('/api/tasks'),
  approvals: () => request('/api/approvals'),
  memory: () => request('/api/memory'),
  automations: () => request('/api/automations'),
  chat: (message: string) => request('/api/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  remember: (content: string) => request('/api/memory', { method: 'POST', body: JSON.stringify({ content }) }),
  createTask: (title: string) => request('/api/tasks', { method: 'POST', body: JSON.stringify({ title }) }),
};
