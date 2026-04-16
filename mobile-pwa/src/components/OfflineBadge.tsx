'use client';
import { useEffect, useState } from 'react';
import { initOfflineSync, subscribeOffline, syncPendingMutations } from '@/lib/sync';

export default function OfflineBadge() {
  const [state, setState] = useState({ online: true, pending: 0, syncing: false });

  useEffect(() => {
    initOfflineSync();
    const unsub = subscribeOffline(setState);
    return () => unsub();
  }, []);

  if (state.online && state.pending === 0) return null;

  const label = !state.online
    ? state.pending > 0
      ? `Offline · ${state.pending} pend.`
      : 'Offline'
    : state.syncing
    ? `Sincronizando ${state.pending}…`
    : `${state.pending} pendientes`;

  const bg = !state.online ? 'bg-amber-600' : 'bg-slate-700';

  return (
    <button
      onClick={() => {
        if (navigator.onLine) void syncPendingMutations();
      }}
      className={
        'fixed top-2 right-2 z-50 text-xs text-white rounded-full px-3 py-1 shadow ' + bg
      }
      title="Toca para reintentar sincronizacion"
    >
      {label}
    </button>
  );
}
