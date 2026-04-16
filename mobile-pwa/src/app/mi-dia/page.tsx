'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getWithCache } from '@/lib/sync';

type Odt = {
  id: string;
  numero: string;
  estado: string;
  horaInicioBloqueo?: string;
  esDesinsectacion?: boolean;
  esDesratizacion?: boolean;
  esDesinfeccion?: boolean;
  cliente: { razonSocial: string; telefono?: string };
  sede: { nombre: string; direccion: string; lat?: number; lng?: number };
};

export default function MiDia() {
  const router = useRouter();
  const [odts, setOdts] = useState<Odt[]>([]);
  const [loading, setLoading] = useState(true);
  const [fecha] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const token = localStorage.getItem('base2.token');
    if (!token) {
      router.push('/');
      return;
    }
    getWithCache<Odt[]>(`/api/v1/ordenes-trabajo/mi-dia?fecha=${fecha}`)
      .then((data) => setOdts(Array.isArray(data) ? data : []))
      .catch(() => setOdts([]))
      .finally(() => setLoading(false));
  }, [router, fecha]);

  function logout() {
    localStorage.clear();
    router.push('/');
  }

  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-400">Mi dia</div>
          <div className="font-bold">
            {new Date(fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <button onClick={logout} className="text-sm text-red-400">Salir</button>
      </header>

      <div className="p-4 space-y-3">
        {loading && <div className="text-slate-400">Cargando…</div>}
        {!loading && odts.length === 0 && (
          <div className="text-center text-slate-400 py-10">
            Sin OTs para hoy.
          </div>
        )}
        {odts.map((o) => (
          <Link
            key={o.id}
            href={`/ot/${o.id}`}
            className="block bg-slate-800 rounded-lg p-4 border border-slate-700 active:bg-slate-700"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-slate-400">OT {o.numero}</div>
                <div className="font-semibold">{o.cliente.razonSocial}</div>
                <div className="text-sm text-slate-300">{o.sede.nombre}</div>
                <div className="text-xs text-slate-400">{o.sede.direccion}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">{o.horaInicioBloqueo || '—'}</div>
                <div
                  className={
                    'text-xs px-2 py-1 rounded mt-1 ' +
                    (o.estado === 'asignada'
                      ? 'bg-blue-700'
                      : o.estado === 'en_curso'
                      ? 'bg-yellow-700'
                      : 'bg-slate-600')
                  }
                >
                  {o.estado}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              {o.esDesinsectacion && <span className="text-xs bg-amber-900 px-2 py-1 rounded">Desinsectacion</span>}
              {o.esDesratizacion && <span className="text-xs bg-red-900 px-2 py-1 rounded">Desratizacion</span>}
              {o.esDesinfeccion && <span className="text-xs bg-cyan-900 px-2 py-1 rounded">Desinfeccion</span>}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
