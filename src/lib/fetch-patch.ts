/**
 * Wrapper around fetch that auto-prepends the Next.js basePath for API calls.
 * Usage: import { apiFetch } from '@/lib/api';
 *        const res = await apiFetch('/api/auth');
 */
const BASE_PATH = '/starrocks-manager';

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = path.startsWith('/api/') ? BASE_PATH + path : path;
  return fetch(url, init);
}
