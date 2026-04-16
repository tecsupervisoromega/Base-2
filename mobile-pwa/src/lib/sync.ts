// Replay de mutations pendientes a la API cuando hay red
import { API_URL, getToken } from './api';
import {
  cacheGet,
  cacheSet,
  countQueued,
  getQueuedMutations,
  queueMutation,
  removeQueuedMutation,
  updateQueuedMutation,
  type OfflineMutation,
} from './db';

type Listener = (info: { online: boolean; pending: number; syncing: boolean }) => void;

const listeners = new Set<Listener>();
let syncing = false;

export function subscribeOffline(cb: Listener) {
  listeners.add(cb);
  emit();
  return () => {
    listeners.delete(cb);
  };
}

async function emit() {
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;
  const pending = await countQueued().catch(() => 0);
  for (const l of listeners) l({ online, pending, syncing });
}

// GET con fallback a cache: si la red falla, devuelve la ultima respuesta cacheada
export async function getWithCache<T>(path: string): Promise<T> {
  const token = getToken();
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = (await res.json()) as T;
    await cacheSet(`GET ${path}`, data);
    return data;
  } catch (err) {
    const cached = await cacheGet<T>(`GET ${path}`);
    if (cached !== null) return cached;
    throw err;
  }
}

// Ejecuta una mutation o la encola si hay red caida.
// Devuelve true si se pudo ejecutar online, false si quedo encolada.
export async function mutateOrQueue(
  method: OfflineMutation['method'],
  path: string,
  body?: any,
): Promise<{ ok: boolean; queued: boolean; response?: any }> {
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;
  if (!online) {
    await queueMutation({ method, path, body });
    await emit();
    return { ok: true, queued: true };
  }
  try {
    const token = getToken();
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      // Si el servidor no responde o hay error de red, encolamos
      if (res.status >= 500) {
        await queueMutation({ method, path, body });
        await emit();
        return { ok: true, queued: true };
      }
      throw new Error(`${res.status} ${await res.text()}`);
    }
    const json = res.status === 204 ? undefined : await res.json().catch(() => undefined);
    return { ok: true, queued: false, response: json };
  } catch (err) {
    // Error de red → encolar
    await queueMutation({ method, path, body });
    await emit();
    return { ok: true, queued: true };
  }
}

export async function syncPendingMutations(): Promise<{ ok: number; failed: number }> {
  if (syncing) return { ok: 0, failed: 0 };
  syncing = true;
  await emit();
  let ok = 0;
  let failed = 0;
  try {
    const queue = await getQueuedMutations();
    for (const m of queue) {
      if (!m.id) continue;
      try {
        const token = getToken();
        const res = await fetch(`${API_URL}${m.path}`, {
          method: m.method,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: m.body !== undefined ? JSON.stringify(m.body) : undefined,
        });
        if (res.ok) {
          await removeQueuedMutation(m.id);
          ok++;
        } else if (res.status >= 400 && res.status < 500) {
          // Error del cliente: descartamos para no bloquear la cola
          await removeQueuedMutation(m.id);
          failed++;
        } else {
          await updateQueuedMutation({ ...m, tries: m.tries + 1, lastError: `${res.status}` });
          failed++;
        }
      } catch (e: any) {
        await updateQueuedMutation({ ...m, tries: m.tries + 1, lastError: e?.message ?? 'error' });
        failed++;
      }
    }
  } finally {
    syncing = false;
    await emit();
  }
  return { ok, failed };
}

// Inicializa listeners online/offline y sync periodico
export function initOfflineSync() {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    void syncPendingMutations();
  });
  window.addEventListener('offline', () => {
    void emit();
  });
  // Intento inicial
  if (navigator.onLine) {
    void syncPendingMutations();
  }
  // Reintento cada 30s por si qued mutaciones con error 5xx
  setInterval(() => {
    if (navigator.onLine) void syncPendingMutations();
  }, 30000);
}
